// Whisper local 3.30.52 · subtítulos por IA EN EL NAVEGADOR (transformers.js).
//
// Cero coste, cero servidores: el modelo baja del CDN de Hugging Face (público)
// y la inferencia corre en el dispositivo (WebGPU si hay, WASM si no). Para
// audio doblado/latino el idioma se fija a "es"; para audio original "en"; o
// detección automática. Ventanas de 60 s con solapa de 2 s (la misma técnica
// del motor on-device de la app) → cues progresivas + RTF real medido.

import { SR, hayVoz } from './audio.js';

const CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5';

export const MODELOS = [
  { id: 'Xenova/whisper-tiny', nombre: 'Whisper Tiny (rápido, ~75 MB)', mb: 75 },
  { id: 'Xenova/whisper-base', nombre: 'Whisper Base (equilibrado, ~140 MB)', mb: 140 },
  { id: 'Xenova/whisper-small', nombre: 'Whisper Small (mejor calidad, ~250 MB)', mb: 250 },
];

let pipeCache = null;
let pipeCacheKey = '';

export function soportaWebGPU() {
  return typeof navigator !== 'undefined' && !!navigator.gpu;
}

async function cargarPipeline(modeloId) {
  const { pipeline, env } = await import(/* @vite-ignore */ CDN);
  env.allowLocalModels = false;
  env.useBrowserCache = true;

  const webgpu = soportaWebGPU();
  const intentos = webgpu
    ? [
        { device: 'webgpu', dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' } },
        { device: 'webgpu', dtype: 'fp32' },
        { device: 'wasm', dtype: 'q8' },
      ]
    : [{ device: 'wasm', dtype: 'q8' }];

  let ultimoError = null;
  for (const it of intentos) {
    try {
      const pipe = await pipeline('automatic-speech-recognition', modeloId, {
        device: it.device, dtype: it.dtype,
        progress_callback: (p) => {
          if (p?.status === 'progress' && p.file && p.total) {
            self.postMessage?.({ tipo: 'modelo', archivo: p.file, pct: Math.round(p.progress) });
          }
        },
      });
      return { pipe, device: it.device, dtype: String(it.dtype) };
    } catch (e) { ultimoError = e; }
  }
  throw new Error(`el modelo no cargó (${String(ultimoError).slice(0, 160)})`);
}

/**
 * Transcribe TODO el pcm con el motor local.
 * onEvento({ tipo: 'modelo'|'ventana'|'cues'|'fin', ... })
 */
export async function transcribirLocal(pcm, modeloId, idioma, onEvento, signal) {
  const clave = `${modeloId}`;
  if (pipeCacheKey !== clave) {
    onEvento?.({ tipo: 'modelo', fase: 'cargando' });
    const { pipe, device, dtype } = await cargarPipeline(modeloId);
    pipeCache = pipe; pipeCacheKey = clave;
    onEvento?.({ tipo: 'modelo', fase: 'listo', device, dtype });
  }

  const VENTANA_S = 60;      // 60 s por ventana
  const SOLAPA_S = 2;        // contexto de la ventana anterior
  const vent = VENTANA_S * SR;
  const solapa = SOLAPA_S * SR;

  const ventanas = [];
  for (let i = 0; i < pcm.length; i += vent) {
    const desde = Math.max(0, i - (ventanas.length ? solapa : 0));
    ventanas.push({ desde: i, hasta: Math.min(pcm.length, i + vent), pcmDesde: desde });
  }

  const cues = [];
  let tAudio = 0, tCalc = 0;
  let ultimoTexto = null;

  for (let w = 0; w < ventanas.length; w++) {
    if (signal?.aborted) throw new Error('cancelado');
    const v = ventanas[w];
    const trozo = pcm.subarray(v.pcmDesde, v.hasta);
    const offsetS = v.pcmDesde / SR;

    // VAD de energía: silencio/música → ni cómputo ni alucinación
    if (!hayVoz(trozo)) {
      onEvento?.({ tipo: 'ventana', w: w + 1, total: ventanas.length, rtf: tAudio > 1 ? tCalc / tAudio : 0, silencio: true });
      continue;
    }

    const t0 = performance.now();
    const out = await pipeCache(trozo, {
      language: idioma === 'auto' ? null : idioma,
      task: 'transcribe',
      return_timestamps: true,
      chunk_length_s: 30,
      stride_length_s: 5,
      condition_on_previous_text: false,
    });
    tCalc += (performance.now() - t0) / 1000;
    tAudio += trozo.length / SR;

    const chunks = out?.chunks || [];
    const limiteSolapaS = (v.pcmDesde - v.desde) / SR;   // cues que caen en el contexto re-oído
    for (const c of chunks) {
      const [ini, fin] = c.timestamp || [];
      const texto = (c.text || '').trim();
      if (ini == null || fin == null || !texto) continue;
      // cue dentro del solapamiento y eco de la última emitida → fuera
      if (fin <= limiteSolapaS + 0.25) continue;
      const norm = texto.toLowerCase().replace(/[¡!¿?.,;:…«»"']/g, ' ').replace(/\s+/g, ' ').trim();
      if (ultimoTexto && norm === ultimoTexto) continue;
      ultimoTexto = norm;
      cues.push({
        desdeMs: Math.round((offsetS + ini) * 1000),
        hastaMs: Math.round((offsetS + Math.min(fin, (v.hasta - v.pcmDesde) / SR)) * 1000),
        texto,
      });
    }
    onEvento?.({
      tipo: 'ventana', w: w + 1, total: ventanas.length,
      rtf: tCalc / tAudio, cues: cues.length,
    });
  }

  onEvento?.({ tipo: 'fin', cues: cues.length, rtf: tAudio > 1 ? tCalc / tAudio : 0, tAudio });
  return cues;
}
