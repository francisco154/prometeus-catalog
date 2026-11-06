// TsDemux 3.30.52 · port 1:1 de TsAac.kt (app TV) — MPEG-TS → AAC ADTS.
// Todo determinista y sin estado: entra Uint8Array de UN segmento (o la
// concatenación de varios), salen frames ADTS. Verificado contra .ts REALES
// de la red (PAT 0x0F AAC ADTS, HE-AAC 22050-core/44100-SBR — Lab Rats T3E6).

export const ST_AAC_ADTS = 0x0f;
export const ST_AAC_LATM = 0x11;

const FREQS = [
  96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050,
  16000, 12000, 11025, 8000, 7350, 0, 0, 0,
];

// ─── capa 1: paquetes TS (188 B) → payloads de UN PID ───
function* paquetesDe(ts, pidBuscado) {
  let i = 0;
  const n = ts.length;
  while (i + 188 <= n) {
    if (ts[i] !== 0x47) { i++; continue; }             // re-sincroniza
    const pid = ((ts[i + 1] & 0x1f) << 8) | ts[i + 2];
    const adapCtrl = (ts[i + 3] >> 4) & 0x3;
    let off = i + 4;
    if (adapCtrl === 2) { i += 188; continue; }        // solo adaptación
    if (adapCtrl === 3) off = i + 5 + ts[i + 4];
    if ((adapCtrl & 1) === 1 && off < i + 188) {
      if (pid === pidBuscado) {
        yield { payload: ts.subarray(off, i + 188), pusi: (ts[i + 1] & 0x40) !== 0 };
      }
    }
    i += 188;
  }
}

// ─── capa 2: PAT → PMT → PID del audio ───
function tablaDe(ts, pid) {
  let primera = null;
  for (const p of paquetesDe(ts, pid)) {
    if (primera === null) primera = p;
    if (p.pusi) { primera = p; break; }
  }
  if (!primera) return null;
  const ptr = primera.payload[0];
  if (ptr >= primera.payload.length) return null;
  return primera.payload.subarray(1 + ptr);
}

/** PID del PMT (tabla PAT) — null si el segmento no trae PAT. */
export function pidPmt(ts) {
  const pat = tablaDe(ts, 0);
  if (!pat || pat.length < 12) return null;
  let off = 8;
  while (off + 4 <= pat.length - 4) {
    const programa = (pat[off] << 8) | pat[off + 1];
    if (programa === 0) { off += 4; continue; }        // NIT
    return ((pat[off + 2] & 0x1f) << 8) | pat[off + 3];
  }
  return null;
}

/** { st, pid } del audio según el PMT — el PRIMERO AAC ADTS/LATM/MP3. */
export function pidAudio(ts) {
  const pmtPid = pidPmt(ts);
  if (pmtPid == null) return null;
  const pmt = tablaDe(ts, pmtPid);
  if (!pmt || pmt.length < 16) return null;
  const progInfoLen = ((pmt[10] & 0x0f) << 8) | pmt[11];
  let off = 12 + progInfoLen;
  while (off + 5 <= pmt.length) {
    const st = pmt[off];
    const pid = ((pmt[off + 1] & 0x1f) << 8) | pmt[off + 2];
    const esLen = ((pmt[off + 3] & 0x0f) << 8) | pmt[off + 4];
    if (st === ST_AAC_ADTS || st === ST_AAC_LATM || st === 0x03 || st === 0x04) {
      return { st, pid };
    }
    off += 5 + esLen;
  }
  return null;
}

// ─── capa 3: PES → bytes de audio crudos ───
export function payloadAudio(ts, pid) {
  const chunks = [];
  for (const p of paquetesDe(ts, pid)) {
    let d = p.payload;
    if (p.pusi && d.length >= 9 && d[0] === 0 && d[1] === 0 && d[2] === 1 &&
        (d[3] & 0xe0) === 0xc0) {                       // audio stream id
      const fin = 9 + d[8];
      d = fin < d.length ? d.subarray(fin) : new Uint8Array(0);
    }
    if (d.length) chunks.push(d);
  }
  if (!chunks.length) return new Uint8Array(0);
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

// ─── capa 4: split por syncword ADTS ───
/** { frames: Uint8Array[], resto: Uint8Array } — resto = trozo final incompleto. */
export function splitAdts(buf) {
  const frames = [];
  const n = buf.length;
  let i = 0;
  while (i + 7 <= n) {
    if (buf[i] !== 0xff || (buf[i + 1] & 0xf6) !== 0xf0) { i++; continue; }
    const largo = ((buf[i + 3] & 0x03) << 11) | (buf[i + 4] << 3) | ((buf[i + 5] & 0xe0) >> 5);
    if (largo < 7 || i + largo > n) break;             // frame cortado al final
    frames.push(buf.subarray(i, i + largo));
    i += largo;
  }
  return { frames, resto: buf.subarray(i, n) };
}

function concat(a, b) {
  if (!a.length) return b;
  if (!b.length) return a;
  const out = new Uint8Array(a.length + b.length);
  out.set(a); out.set(b, a.length);
  return out;
}

/** Frames ADTS + sobrante (para coser la frontera entre segmentos .ts).
 *  [pidConocido]: si el segmento NO trae PAT (algunos CDNs solo lo mandan
 *  en el primero), se reusa el PID del segmento anterior. */
export function extraerAdtsConSobrante(ts, previo, pidConocido) {
  let info = pidAudio(ts);
  let st = info?.st;
  const pid = info?.pid ?? (pidConocido != null && pidConocido >= 0 ? pidConocido : null);
  if (pid == null) return { frames: [], sobrante: previo, st: null, pid: null };
  if (st == null) st = ST_AAC_ADTS;               // PID heredado: era ADTS
  if (st !== ST_AAC_ADTS) return { frames: [], sobrante: previo, st, pid };
  const r = splitAdts(concat(previo, payloadAudio(ts, pid)));
  return { frames: r.frames, sobrante: r.resto, st, pid };
}

/** Bytes que YA vienen como ADTS (proxy audio=1 del worker): coser con el
 *  sobrante de la frontera y devolver frames completos + resto. */
export function coserAdts(adts, previo) {
  const r = splitAdts(concat(previo, adts));
  return { frames: r.frames, sobrante: r.resto };
}

/** ¿Estos bytes son un .ts (0x47) o ADTS crudo (0xFFF)? */
export function tipoBytes(b) {
  if (b.length > 0 && b[0] === 0x47) return 'ts';
  if (b.length > 1 && b[0] === 0xff && (b[1] & 0xf6) === 0xf0) return 'adts';
  return '?';
}

/** { sampleRate, canales } del primer frame ADTS (HE-AAC: rate del CORE). */
export function adtsInfo(frame) {
  if (frame.length < 7) return null;
  if (frame[0] !== 0xff || (frame[1] & 0xf6) !== 0xf0) return null;
  const rateIdx = (frame[2] >> 2) & 0x0f;
  const ch = ((frame[2] & 0x01) << 2) | ((frame[3] >> 6) & 0x03);
  const rate = FREQS[rateIdx];
  if (!rate || !ch) return null;
  return { sampleRate: rate, canales: ch };
}
