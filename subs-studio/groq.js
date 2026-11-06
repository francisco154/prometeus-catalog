// Groq 3.30.52 · motor TURBO (whisper-large-v3-turbo) con la capa gratuita de Groq.
//
// POR QUÉ: en el navegador el modelo local está limitado por el hardware del
// teléfono. Groq sirve whisper-large-v3-turbo (calidad cercana a large-v3) a
// velocidad absurdamente alta con capa gratuita SIN tarjeta: 2.000 req/día,
// 7.200 s de audio por hora (≈2 h de audio por cada hora de reloj) y 20
// req/min (medido en la documentación vigente). La clave API la crea el
// dueño gratis en console.groq.com/keys y viaja SOLO en el header
// Authorization (nunca en URLs ni logs).
//
// CORS: api.groq.com NO acepta llamadas directas de navegador (preflight 403,
// medido) → el audio se envía por el proxy del worker de Cloudflare del dueño
// (/v1/pandora/groq), que reenvía el POST a api.groq.com con la clave.

import { SR, wavBlob, hayVoz } from './audio.js';

const CHUNCK_S = 300;         // 5 min por chunk → WAV 16k mono ≈ 9,2 MB (límite Groq 25 MB)
const MODELO = 'whisper-large-v3-turbo';

export async function transcribirGroq(pcm, apiKey, workerBase, idioma, onEvento, signal) {
  const base = workerBase.replace(/\/$/, '');
  const total = Math.ceil(pcm.length / (CHUNCK_S * SR));
  const cues = [];
  let tAudio = 0, tCalc = 0;

  for (let i = 0; i < total; i++) {
    if (signal?.aborted) throw new Error('cancelado');
    const desde = i * CHUNCK_S * SR;
    const hasta = Math.min(pcm.length, desde + CHUNCK_S * SR);
    const trozo = pcm.subarray(desde, hasta);
    const offsetS = desde / SR;

    if (!hayVoz(trozo)) {
      onEvento?.({ tipo: 'ventana', w: i + 1, total, rtf: tAudio > 1 ? tCalc / tAudio : 0, silencio: true, groq: true });
      continue;
    }

    const blob = wavBlob(pcm, desde, hasta);
    const fd = new FormData();
    fd.append('file', blob, `chunk_${i}.wav`);
    fd.append('model', MODELO);
    fd.append('response_format', 'verbose_json');
    fd.append('temperature', '0');
    if (idioma && idioma !== 'auto') fd.append('language', idioma);

    const t0 = performance.now();
    let resp = null;
    // 429 → backoff (la capa gratis tiene 20 RPM; el header retry-after manda)
    for (let intento = 0; intento < 4; intento++) {
      if (signal?.aborted) throw new Error('cancelado');
      resp = await fetch(`${base}/v1/pandora/groq`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: fd,
      });
      if (resp.status !== 429) break;
      const espera = parseFloat(resp.headers.get('retry-after') || '') * 1000 || 8000;
      onEvento?.({ tipo: 'espera', ms: espera });
      await new Promise(r => setTimeout(r, Math.min(espera, 30000)));
    }
    if (!resp.ok) {
      const detalle = (await resp.text()).slice(0, 200);
      throw new Error(`Groq HTTP ${resp.status} — ${detalle}`);
    }
    const data = await resp.json();
    tCalc += (performance.now() - t0) / 1000;
    tAudio += trozo.length / SR;

    for (const s of data.segments || []) {
      const texto = (s.text || '').trim();
      if (!texto) continue;
      cues.push({
        desdeMs: Math.round((offsetS + s.start) * 1000),
        hastaMs: Math.round((offsetS + s.end) * 1000),
        texto,
      });
    }
    onEvento?.({
      tipo: 'ventana', w: i + 1, total,
      rtf: tCalc / tAudio, cues: cues.length, groq: true, idioma: data.language,
    });
  }

  onEvento?.({ tipo: 'fin', cues: cues.length, rtf: tAudio > 1 ? tCalc / tAudio : 0, tAudio, modelo: MODELO });
  return cues;
}
