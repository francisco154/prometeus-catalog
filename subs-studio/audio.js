// Audio 3.30.52 · playlist → segmentos → ADTS → PCM 16 kHz mono (en el navegador).
//
// POR QUÉ ACÁ Y NO EN LA TV: el decoder AAC de MediaCodec falla en varias TVs
// (reporte del dueño: "el audio no se decodificó en esta TV"). El navegador
// trae el suyo propio (decodeAudioData) y además resamplea a 16 kHz gratis
// (OfflineAudioContext @16k). Verificado con .ts REALES de la red:
// 14,30 s de audio de un segmento de 14,26 s declarados, RMS 0,041.
//
// TRANSPORTE: la red filtra por User-Agent (medido: UA móvil/TV → 200, UA
// desktop → 403, Referer/Origin irrelevantes). En el CELULAR el fetch directo
// funciona; en el navegador de ESCRITORIO el CDN niega → conmuta al proxy del
// worker de Cloudflare (le pega con la UA de TV). Modo "ahorro de datos":
// el worker demuxa el .ts y devuelve SOLO el audio ADTS (~30× menos bytes).

import { extraerAdtsConSobrante, adtsInfo, ST_AAC_LATM } from './tsdemux.js';

export const SR = 16000;          // 16 kHz mono — requisito de Whisper

export class Playlist {
  constructor(segmentos, duracionS, viva, cifrada, fmp4, targetDurS) {
    this.segmentos = segmentos;   // [{ url, durS, offsetMs }]
    this.duracionS = duracionS;
    this.viva = viva;
    this.cifrada = cifrada;
    this.fmp4 = fmp4;
    this.targetDurS = targetDurS;
  }
}

function resolver(base, u) {
  return new URL(u, base).toString();
}

/** Media playlist → segmentos con offsets acumulados (#EXTINF). */
export function parseMedia(txt, baseUrl) {
  const durs = [...txt.matchAll(/#EXTINF:([0-9.]+)/g)].map(m => parseFloat(m[1]));
  const urls = txt.split('\n').map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));
  let acumMs = 0;
  const segs = urls.map((u, i) => {
    const d = durs[i] || 0;
    const s = { url: resolver(baseUrl, u), durS: d, offsetMs: acumMs };
    acumMs += Math.round(d * 1000);
    return s;
  });
  const target = parseFloat((txt.match(/#EXT-X-TARGETDURATION:(\d+)/) || [])[1]) || 10;
  const total = durs.reduce((a, b) => a + b, 0);
  return new Playlist(
    segs, total > 0 ? total : null,
    !txt.includes('#EXT-X-ENDLIST'),
    txt.includes('#EXT-X-KEY'),
    txt.includes('#EXT-X-MAP'),
    target,
  );
}

/** master o media → Playlist (master: variante de MENOR bandwidth — audio igual). */
export async function resolverPlaylist(url, pedir) {
  const txt = await pedir(url, 'text');
  if (txt.includes('#EXT-X-STREAM-INF')) {
    const variantes = [...txt.matchAll(/#EXT-X-STREAM-INF:([^\n]*)\n([^\n]+)/g)];
    if (!variantes.length) return null;
    const mejor = variantes.reduce((min, m) => {
      const bw = parseInt((m[1].match(/BANDWIDTH=(\d+)/) || [])[1] || '999999999', 10);
      return !min || bw < min.bw ? { bw, url: m[2].trim() } : min;
    }, null);
    const mediaUrl = resolver(url, mejor.url);
    return parseMedia(await pedir(mediaUrl, 'text'), mediaUrl);
  }
  return parseMedia(txt, url);
}

// ─────────────────── transporte: directo → proxy del worker ───────────────────

export class Transporte {
  constructor(workerBase) {
    this.workerBase = workerBase?.replace(/\/$/, '') || '';
    this.modo = 'auto';          // auto | directo | proxy
    this.razon = '';
    this.bytes = 0;
    this.audioSolo = false;      // proxy con demux ADTS (ahorro de datos)
  }

  proxyUrl(url, audioSolo) {
    return `${this.workerBase}/v1/pandora/proxy?u=${encodeURIComponent(url)}` +
      (audioSolo ? '&audio=1' : '');
  }

  /** GET de texto (m3u8). */
  async texto(url) {
    const modos = this.modo === 'proxy' ? ['proxy'] :
      this.modo === 'directo' ? ['directo'] : ['directo', 'proxy'];
    let ultimoError = null;
    for (const modo of modos) {
      try {
        const r = await fetch(modo === 'proxy' ? this.proxyUrl(url, false) : url);
        if (!r.ok) { ultimoError = `HTTP ${r.status}`; continue; }
        const t = await r.text();
        if (this.modo === 'auto' && modo === 'proxy') { this.modo = 'proxy'; this.razon = 'CDN 403 (UA escritorio)'; }
        if (this.modo === 'auto' && modo === 'directo') this.modo = 'directo';
        return t;
      } catch (e) { ultimoError = String(e); }
    }
    throw new Error(`no pude leer el playlist (${ultimoError})`);
  }

  /** GET binario de UN segmento → Uint8Array. Decide transporte solo. */
  async segmento(url) {
    const intentos = this.modo === 'auto'
      ? [{ m: 'directo' }, { m: 'proxy' }, { m: 'proxy', audioSolo: true }]
      : this.modo === 'proxy'
        ? [{ m: 'proxy', audioSolo: this.audioSolo }, { m: 'proxy', audioSolo: false }]
        : [{ m: 'directo' }];
    let ultimoError = null;
    for (const it of intentos) {
      try {
        const r = await fetch(it.m === 'proxy' ? this.proxyUrl(url, it.audioSolo) : url);
        if (!r.ok) { ultimoError = `HTTP ${r.status}`; continue; }
        const buf = new Uint8Array(await r.arrayBuffer());
        if (!buf.length) { ultimoError = 'vacío'; continue; }
        this.bytes += buf.length;
        if (this.modo === 'auto') {
          if (it.m === 'directo') this.modo = 'directo';
          else { this.modo = 'proxy'; this.razon = 'CDN 403 (UA escritorio)'; }
        }
        if (it.m === 'proxy' && it.audioSolo) this.audioSolo = true;
        return buf;
      } catch (e) { ultimoError = String(e); }
    }
    throw new Error(`segmento falló (${ultimoError})`);
  }
}

// ─────────────────── ADTS → PCM 16 kHz mono ───────────────────

/** Decodifica un lote de frames ADTS → Float32Array 16 kHz mono. */
export async function decodificarAdts(adtsBytes) {
  if (!adtsBytes.length) return new Float32Array(0);
  const ctx = new OfflineAudioContext(1, SR, SR);
  const buf = await ctx.decodeAudioData(adtsBytes.buffer.slice(
    adtsBytes.byteOffset, adtsBytes.byteOffset + adtsBytes.length));
  const chs = [];
  for (let c = 0; c < buf.numberOfChannels; c++) chs.push(buf.getChannelData(c));
  if (chs.length === 1) return new Float32Array(chs[0]);
  const mono = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i++) {
    let s = 0;
    for (const ch of chs) s += ch[i];
    mono[i] = s / chs.length;
  }
  return mono;
}

/**
 * Descarga y decodifica TODO el audio de la playlist.
 * onProgreso({ segHechos, segTotal, mb, fase })
 * Devuelve { pcm, duracionS, segOk, segTotal, streamType, adtsInfo } o lanza
 * con un mensaje humano.
 */
export async function bajarAudio(playlist, transporte, onProgreso, signal) {
  const segs = playlist.segmentos;
  if (!segs.length) throw new Error('playlist sin segmentos');
  if (playlist.cifrada) throw new Error('playlist cifrado — no soportado');
  if (playlist.fmp4) throw new Error('segmentos fMP4 — no soportado');

  // descarga paralela (pool de 4) — el orden lo impone el array
  const POOL = 4;
  const datos = new Array(segs.length).fill(null);
  const errores = new Array(segs.length).fill(null);
  let cursor = 0;
  let segOk = 0;

  async function trabajador() {
    while (cursor < segs.length) {
      if (signal?.aborted) throw new Error('cancelado');
      const i = cursor++;
      try {
        datos[i] = await transporte.segmento(segs[i].url);
        segOk++;
      } catch (e) {
        errores[i] = String(e);
        // reintento corto (403 transitorio del CDN — medido en la red real)
        await new Promise(r => setTimeout(r, 400));
        try { datos[i] = await transporte.segmento(segs[i].url); segOk++; errores[i] = null; }
        catch { /* queda el hueco */ }
      }
      onProgreso?.({
        segHechos: datos.filter(Boolean).length, segTotal: segs.length,
        mb: transporte.bytes / 1e6, fase: 'descarga',
      });
    }
  }
  await Promise.all(Array.from({ length: POOL }, trabajador));

  if (segOk === 0) {
    throw new Error('no pude bajar NINGÚN segmento del stream (red o CDN)');
  }

  // demux + decodificación por LOTES de ~120 s (offsets por #EXTINF — la
  // misma regla de duración del merge de la app)
  const LOTE_S = 120;
  const pcmLotes = [];           // { pcm, offsetMs }
  let sobrante = new Uint8Array(0);
  let streamType = null;
  let infoAdts = null;
  let pidAudioConocido = null;         // segmentos sin PAT: PID heredado
  let loteBytes = [];
  let loteDesdeMs = 0;
  let loteHastaMs = 0;

  function cerrarLote(offsetMs) {
    if (!loteBytes.length) return;
    const total = loteBytes.reduce((a, b) => a + b.length, 0);
    const uno = new Uint8Array(total);
    let o = 0;
    for (const b of loteBytes) { uno.set(b, o); o += b.length; }
    loteBytes = [];
    return { adts: uno, offsetMs };
  }

  const pendientes = [];
  for (let i = 0; i < segs.length; i++) {
    const ts = datos[i];
    if (!ts) { sobrante = new Uint8Array(0); continue; }  // hueco: no mentir tiempos
    if (loteBytes.length === 0) loteDesdeMs = segs[i].offsetMs;
    const r = extraerAdtsConSobrante(ts, sobrante, pidAudioConocido);
    sobrante = r.sobrante;
    if (r.pid != null) pidAudioConocido = r.pid;
    if (r.st != null) streamType = r.st;
    if (r.frames.length) {
      if (!infoAdts) infoAdts = adtsInfo(r.frames[0]);
      for (const f of r.frames) loteBytes.push(f);
    }
    loteHastaMs = segs[i].offsetMs + Math.round(segs[i].durS * 1000);
    if (loteHastaMs - loteDesdeMs >= LOTE_S * 1000 || i === segs.length - 1) {
      const lote = cerrarLote(loteDesdeMs);
      if (lote) pendientes.push(lote);
    }
    onProgreso?.({ segHechos: segOk, segTotal: segs.length, mb: transporte.bytes / 1e6, fase: 'demux' });
  }

  for (let j = 0; j < pendientes.length; j++) {
    if (signal?.aborted) throw new Error('cancelado');
    const pcm = await decodificarAdts(pendientes[j].adts);
    pcmLotes.push({ pcm, offsetMs: pendientes[j].offsetMs });
    onProgreso?.({
      segHechos: segOk, segTotal: segs.length, mb: transporte.bytes / 1e6,
      fase: 'decodificar', lote: j + 1, lotes: pendientes.length,
    });
  }

  if (streamType === ST_AAC_LATM) {
    throw new Error('el audio del stream es AAC-LATM (no soportado todavía)');
  }
  const totalMuestras = pcmLotes.reduce((a, l) => a + l.pcm.length, 0);
  const pcmSegundos = totalMuestras / SR;
  if (pcmSegundos < 5) {
    throw new Error('el audio no se decodificó en este navegador (codec AAC)');
  }

  // PCM único continuo (los lotes ya vienen en orden con sus offsets — la
  // duración decodificada respeta los EXTINF de la red)
  const pcm = new Float32Array(totalMuestras);
  let o = 0;
  for (const l of pcmLotes) { pcm.set(l.pcm, o); o += l.pcm.length; }

  return {
    pcm,
    duracionS: playlist.duracionS ?? pcmSegundos,
    pcmDuracionS: pcmSegundos,
    segOk, segTotal: segs.length,
    streamType, adtsInfo: infoAdts,
    lotes: pcmLotes.map(l => ({ offsetMs: l.offsetMs, n: l.pcm.length })),
  };
}

// ─────────────────── WAV (para el motor Groq y la preview) ───────────────────

export function wavBlob(pcm, desdeMuestra = 0, hastaMuestra = pcm.length) {
  const n = hastaMuestra - desdeMuestra;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE');
  w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, SR, true); v.setUint32(28, SR * 2, true); v.setUint16(32, 2, true);
  v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  const o8 = 44;
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, pcm[desdeMuestra + i]));
    v.setInt16(o8 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

/** RMS en dBFS por ventana — para el VAD de energía (anti-alucinación). */
export function hayVoz(pcm, desde = 0, hasta = pcm.length) {
  const FRAME = SR / 10;
  let frames = 0, conVoz = 0;
  for (let i = desde; i + FRAME <= hasta; i += FRAME) {
    let suma = 0;
    for (let j = i; j < i + FRAME; j++) suma += pcm[j] * pcm[j];
    const db = 20 * Math.log10(Math.max(Math.sqrt(suma / FRAME), 1e-9));
    frames++;
    if (db > -37) conVoz++;
  }
  return frames > 0 && conVoz / frames >= 0.10;
}
