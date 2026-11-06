// App 3.30.52 · Prometeus Sub Studio — orquestador de la UI.
// El flujo: enlace → relay → episodio → audio (CDN) → IA (local/Groq) → SRT
// → publicación al catálogo (repo + relay + PENC1). La TV NUNCA computa.

import { t } from './i18n.js';
import { resolverPlaylist, bajarAudio, wavBlob, SR, Transporte } from './audio.js';
import { transcribirLocal, MODELOS, soportaWebGPU } from './whisper.js';
import { transcribirGroq } from './groq.js';
import { srtDe, parseSrt, dosLineas } from './srt.js';
import { publicar, OWNER, REPO_CATALOGO } from './publish.js';
import { leerArchivo } from './github.js';

const WORKER = 'https://pr-relay.prometeus-edge.workers.dev';
const RENDER = 'https://prometeus-server.onrender.com';
const ESTUDIO_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO_CATALOGO}/main/subs/estudio.json`;

const SITIOS = {
  'peliculaplay.com': 'peliculaplay', 'ver.123pelicula.com': 'pelicula',
  'ww1.123flmsfree.com': 'flms', '123flmsfree.com': 'flms',
  'video.playspelis.com': 'playspelis', 'latino.solo-latino.com': 'sololatino',
  'www3.dramasfree.com': 'dramas', 'dramasfree.com': 'dramas',
  'flixlat.com': 'flixlat', 'es.cuevana4br.com': 'cuevana4br',
  'play.cuevana19.com': 'cuevana19', 'ww20.321moviesfree.com': 'movies321',
};
const IDIOMAS = [
  ['auto', '—'], ['es', 'Español'], ['en', 'English'], ['pt', 'Português'],
  ['fr', 'Français'], ['de', 'Deutsch'], ['it', 'Italiano'], ['ja', '日本語'],
  ['ko', '한국어'], ['ru', 'Русский'],
];

const S = {
  lang: localStorage.getItem('ps-lang') || 'es',
  fase: 'inicio',            // inicio|resolviendo|resuelto|audio|motor|revisar|publicando|hecho
  site: null, tipo: 'drama', wp: null, epElegido: null,
  detail: null, nombre: '', episodios: [], mediaInfoList: [],
  m3u8Directo: null,
  audio: null,
  cues: [],
  motor: localStorage.getItem('ps-motor') || 'groq',
  groqKey: localStorage.getItem('ps-groq') || '',
  modelo: localStorage.getItem('ps-modelo') || MODELOS[1].id,
  idioma: localStorage.getItem('ps-idioma') || 'es',
  token: localStorage.getItem('ps-token') || '',
  slug: '', tituloShow: '', temporada: 1, episodioPub: 1,
  estudioIdx: null,
  transporte: new Transporte(WORKER),
  ctrl: null,
  relayUsado: '',
  errores: '',
};

const $ = (id) => document.getElementById(id);

// ─────────────────── utilidades UI ───────────────────

function fmtMs(ms) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function setFase(f) { S.fase = f; render(); }

function toast(msj, error = false) {
  const el = $('toast');
  el.textContent = msj;
  el.className = `toast ${error ? 'error' : ''} show`;
  setTimeout(() => { el.className = 'toast'; }, 4200);
}

// ─────────────────── render ───────────────────

function render() {
  const L = S.lang;
  // textos estáticos
  document.querySelectorAll('[data-t]').forEach(el => {
    el.textContent = t(L, el.dataset.t);
  });
  document.querySelectorAll('[data-tp]').forEach(el => {
    el.placeholder = t(L, el.dataset.tp);
  });
  $('langBtn').textContent = L === 'es' ? 'EN' : 'ES';
  $('tituloApp').textContent = t(L, 'titulo');

  const resolverOn = S.fase === 'inicio' || S.fase === 'resolviendo' || S.fase === 'resuelto';
  $('btnResolver').disabled = !resolverOn || S.fase === 'resolviendo';
  $('btnResolver').textContent = S.fase === 'resolviendo' ? '…' : t(L, 'resolver');

  // episodios
  $('cardEps').style.display = S.episodios.length ? '' : 'none';
  if (S.episodios.length) renderEpisodios();

  // motor
  $('motorLocal').classList.toggle('sel', S.motor === 'local');
  $('motorGroq').classList.toggle('sel', S.motor === 'groq');
  $('groqBox').style.display = S.motor === 'groq' ? '' : 'none';
  $('localBox').style.display = S.motor === 'local' ? '' : 'none';
  $('gpuBadge').textContent = soportaWebGPU() ? t(L, 'webgpu') : t(L, 'wasmmodo');
  $('gpuBadge').className = soportaWebGPU() ? 'chip ok' : 'chip';

  // generar
  const puedeGenerar = (S.mediaInfoList.length || S.m3u8Directo) &&
    ['resuelto', 'revisar'].includes(S.fase);
  $('btnGenerar').disabled = !puedeGenerar || S.fase === 'audio' || S.fase === 'motor';
  $('btnGenerar').style.display = ['audio', 'motor'].includes(S.fase) ? 'none' : '';
  $('btnCancelar').style.display = ['audio', 'motor'].includes(S.fase) ? '' : 'none';

  // progreso
  $('cardProgreso').style.display = ['audio', 'motor'].includes(S.fase) ? '' : 'none';

  // revisar
  $('cardRevisar').style.display = (S.fase === 'revisar' || S.fase === 'publicando' || S.fase === 'hecho') ? '' : 'none';
  if (S.cues.length) renderStats();

  // publicar
  $('cardPublicar').style.display = S.fase === 'revisar' || S.fase === 'publicando' || S.fase === 'hecho' ? '' : 'none';
}

function renderEpisodios() {
  const L = S.lang;
  const cont = $('eps');
  cont.innerHTML = '';
  const defs = S.mediaInfoList.length
    ? `${S.mediaInfoList.length} ${t(L, 'calidad').toLowerCase()}` : '';
  $('epsTitulo').textContent =
    `${t(L, 'episodios')} · ${S.episodios.length} · ${S.nombre}`.slice(0, 80);
  S.episodios.forEach(ep => {
    const b = document.createElement('button');
    b.className = `ep ${S.epElegido === ep ? 'sel' : ''}`;
    b.textContent = ep;
    b.onclick = () => elegirEpisodio(ep);
    cont.appendChild(b);
  });
}

function renderStats() {
  const L = S.lang;
  const dur = S.audio?.duracionS;
  $('stats').innerHTML = `
    <span class="chip ok">${S.cues.length} ${t(L, 'cues')}</span>
    ${dur ? `<span class="chip">${t(L, 'duracion')}: ${Math.round(dur / 60)} min (${t(L, 'declarada')}) · ${Math.round((S.audio.pcmDuracionS || 0) / 60)} min (${t(L, 'descifrada')})</span>` : ''}
    ${S.audio?.segOk ? `<span class="chip">${S.audio.segOk}/${S.audio.segTotal} ${t(L, 'seg')}</span>` : ''}
    ${S.transporte.modo !== 'auto' ? `<span class="chip">${S.transporte.modo === 'proxy' ? 'proxy CF' : 'directo'}</span>` : ''}
    <span class="chip">${S.relayUsado ? 'relay: ' + S.relayUsado : 'm3u8 directo'}</span>
    ${S.rtf ? `<span class="chip">${t(L, 'rtf')}: ${S.rtf.toFixed(2)}×</span>` : ''}
  `;
}

function renderCues(hastaMs = null) {
  const cont = $('cues');
  if (cont.children.length !== S.cues.length) {
    cont.innerHTML = '';
    S.cues.forEach((c, i) => {
      const fila = document.createElement('div');
      fila.className = 'cue';
      fila.dataset.i = i;
      fila.innerHTML = `<span class="cue-t" contenteditable="false">${fmtMs(c.desdeMs)}</span>
        <span class="cue-x" contenteditable="true"></span>`;
      fila.querySelector('.cue-x').textContent = dosLineas(c.texto);
      fila.querySelector('.cue-x').addEventListener('input', (e) => {
        S.cues[i].texto = e.target.innerText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      });
      cont.appendChild(fila);
    });
  }
  // highlight de la cue activa en la preview
  const activa = S.cues.findIndex(c => c.desdeMs <= (hastaMs ?? -1) && c.hastaMs >= (hastaMs ?? -1));
  [...cont.children].forEach((el, i) => {
    el.classList.toggle('activa', i === activa);
    if (i === activa) el.scrollIntoView({ block: 'nearest' });
  });
}

// ─────────────────── paso 1 · resolver ───────────────────

function parsearEnlace(url) {
  try {
    const u = new URL(url.trim());
    const site = SITIOS[u.hostname.toLowerCase()];
    const m = u.pathname.match(/\/es\/detail\/(movie|drama)\/([^/]+)(?:\/(\d+))?/);
    if (site && m) {
      return { site, tipo: m[1], wp: m[2], ep: m[3] ? +m[3] : null };
    }
    if (/\.m3u8($|\?)/.test(u.pathname) || u.searchParams.toString() === '' && site) {
      return null;
    }
  } catch { /* no es URL */ }
  return null;
}

async function relayDetalle(site, tipo, wp, ep) {
  const qs = `site=${site}&tipo=${tipo}&wp=${encodeURIComponent(wp)}${ep ? `&ep=${ep}` : ''}`;
  const bases = [WORKER, RENDER];
  let ultimo = '';
  for (const b of bases) {
    try {
      const r = await fetch(`${b}/v1/pandora/detalle?${qs}`);
      if (!r.ok) { ultimo = `${b} → HTTP ${r.status}`; continue; }
      const d = await r.json();
      if (d && d.error) { ultimo = `${b} → ${d.error}`; continue; }
      S.relayUsado = b.includes('workers.dev') ? 'CF' : 'Render';
      return d;
    } catch (e) { ultimo = `${b} → ${String(e).slice(0, 80)}`; }
  }
  throw new Error(`${t(S.lang, 'estados.sinEps')} (${ultimo})`);
}

async function resolver() {
  const enlace = $('enlace').value.trim();
  S.errores = '';
  if (!enlace) return;
  const parsed = parsearEnlace(enlace);
  if (!parsed) {
    // ¿es un m3u8 directo?
    if (/^https?:\/\/.+/.test(enlace) && (/\.m3u8/i.test(enlace) || /media|vod|limit/i.test(enlace))) {
      S.m3u8Directo = enlace;
      S.site = null; S.wp = null; S.epElegido = null;
      S.episodios = []; S.mediaInfoList = []; S.nombre = 'm3u8';
      S.relayUsado = '';
      setFase('resuelto');
      toast('m3u8 directo — generá cuando quieras');
      return;
    }
    toast(t(S.lang, 'estados.sinEps'), true);
    return;
  }
  S.m3u8Directo = null;
  S.site = parsed.site; S.tipo = parsed.tipo; S.wp = parsed.wp;
  setFase('resolviendo');
  try {
    const d = await relayDetalle(S.site, S.tipo, S.wp, parsed.ep ?? undefined);
    S.detail = d;
    S.nombre = (d.name || '').replace(/^\[[^\]]*\]/, '');
    S.episodios = (d.episodeVo || []).map(e => e.seriesNo).filter(n => n > 0).sort((a, b) => a - b);
    S.mediaInfoList = (d.mediaInfoList || []).filter(m => m.mediaUrl);
    if (S.episodios.length && parsed.ep && S.episodios.includes(parsed.ep)) {
      S.epElegido = parsed.ep;
    } else if (S.episodios.length) {
      S.epElegido = S.episodios[0];
    }
    setFase('resuelto');
    toast(t(S.lang, 'estados.resuelto', { n: S.episodios.length, defs: S.mediaInfoList.length }));
  } catch (e) {
    S.errores = String(e.message || e);
    toast(S.errores, true);
    setFase('inicio');
  }
}

async function elegirEpisodio(ep) {
  S.epElegido = ep;
  setFase('resuelto');
  try {
    const d = await relayDetalle(S.site, S.tipo, S.wp, ep);
    S.detail = d;
    S.mediaInfoList = (d.mediaInfoList || []).filter(m => m.mediaUrl);
    S.episodios = (d.episodeVo || []).map(e => e.seriesNo).filter(n => n > 0).sort((a, b) => a - b);
    render();
  } catch (e) { toast(String(e.message || e), true); }
}

function urlMedia() {
  if (S.m3u8Directo) return S.m3u8Directo;
  // LD (540p) primero — el audio es idéntico y pesa la MITAD del SD
  const orden = { LD: 0, FD: 1, SD: 2 };
  const mis = S.mediaInfoList.slice().sort((a, b) =>
    (orden[a.currentDefinition] ?? 9) - (orden[b.currentDefinition] ?? 9));
  return mis[0]?.mediaUrl || null;
}

// ─────────────────── paso 3 · audio + IA ───────────────────

function progreso(p) {
  const L = S.lang;
  const bar = $('progBar');
  let pct = 0, fase = '';
  if (p.fase === 'descarga' || p.fase === 'demux') {
    pct = (p.segHechos / Math.max(1, p.segTotal)) * 100;
    fase = `${t(L, 'descargando')} ${p.segHechos}/${p.segTotal} ${t(L, 'seg')} · ${p.mb.toFixed(0)} MB`;
  } else if (p.fase === 'decodificar') {
    pct = (p.lote / Math.max(1, p.lotes)) * 100;
    fase = `${t(L, 'decod')} ${p.lote}/${p.lotes}`;
  }
  bar.style.width = `${Math.min(100, pct)}%`;
  $('progTxt').textContent = fase;
  $('progMeta').textContent = S.transporte.modo === 'proxy' ? 'proxy' : '';
}

async function generar() {
  const url = urlMedia();
  if (!url) { toast('sin m3u8 — resolvé el enlace primero', true); return; }
  S.ctrl = new AbortController();
  setFase('audio');
  $('progTxt').textContent = t(S.lang, 'descargando');
  $('progBar').style.width = '0%';
  $('progCues').textContent = '';
  try {
    // playlist (master → media de menor bandwidth)
    const pl = await resolverPlaylist(url, (u) => S.transporte.texto(u));
    if (!pl || !pl.segmentos.length) throw new Error('playlist sin segmentos');

    // audio completo 16k mono
    S.audio = await bajarAudio(pl, S.transporte, progreso, S.ctrl.signal);
    $('progTxt').textContent = t(S.lang, 'transcribiendo');
    $('progBar').style.width = '0%';

    // motor
    setFase('motor');
    const onEv = (e) => {
      if (e.tipo === 'ventana') {
        const pct = (e.w / Math.max(1, e.total)) * 100;
        $('progBar').style.width = `${pct}%`;
        $('progTxt').textContent =
          `${t(S.lang, 'transcribiendo')} ${e.w}/${e.total} ${t(S.lang, 'ventana')} ` +
          `${e.silencio ? t(S.lang, 'silencio') : `· ${t(S.lang, 'rtf')} ${(1 / Math.max(e.rtf, 0.01)).toFixed(1)}×`}`;
        $('progCues').textContent = `${e.cues || 0} ${t(S.lang, 'cues')}`;
        S.rtf = e.rtf;
      } else if (e.tipo === 'espera') {
        $('progTxt').textContent = `429 · esperando ${Math.round(e.ms / 1000)} s…`;
      } else if (e.tipo === 'modelo' && e.fase === 'cargando') {
        $('progTxt').textContent = `${t(S.lang, 'modelo')}…`;
      }
    };
    if (S.motor === 'groq') {
      if (!S.groqKey) throw new Error('poné tu clave de Groq (gratis) — console.groq.com/keys');
      S.cues = await transcribirGroq(S.audio.pcm, S.groqKey, WORKER, S.idioma, onEv, S.ctrl.signal);
    } else {
      S.cues = await transcribirLocal(S.audio.pcm, S.modelo, S.idioma, onEv, S.ctrl.signal);
    }
    if (!S.cues.length) throw new Error('terminó sin detectar diálogo');
    S.slug = S.slug || adivinarSlug();
    S.temporada = S.temporada || adivinarTemporada();
    S.episodioPub = S.epElegido || S.episodioPub || 1;
    prepararPublicacion();
    setFase('revisar');
  } catch (e) {
    const msj = String(e.message || e);
    if (msj === 'cancelado') { setFase('resuelto'); return; }
    toast(msj, true);
    $('progTxt').textContent = `${t(S.lang, 'error')}: ${msj.slice(0, 90)}`;
    setFase('resuelto');
  }
}

function adivinarSlug() {
  const n = (S.nombre || '').toLowerCase().replace(/season\s*\d+.*$/, '').trim();
  return n.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || '';
}

function adivinarTemporada() {
  const m = (S.nombre || '').match(/season\s*(\d+)/i) || (S.wp || '').match(/season[-_](\d+)/i);
  return m ? +m[1] : 1;
}

// ─────────────────── paso 4 · revisar/publicar ───────────────────

function prepararPublicacion() {
  renderCues();
  renderStats();
  // preview de audio
  if (S.audio?.pcm?.length) {
    const blob = wavBlob(S.audio.pcm);
    $('previewAudio').src = URL.createObjectURL(blob);
  }
  // índice del estudio (buscador de shows)
  if (!S.estudioIdx) {
    fetch(ESTUDIO_URL).then(r => r.ok ? r.json() : null).then(d => {
      S.estudioIdx = d;
      if (d?.shows?.length) {
        const ini = d.shows.find(s => s.i === S.slug);
        if (ini) { S.slug = ini.i; S.tituloShow = ini.n; $('showInput').value = ini.n; }
      }
    }).catch(() => {});
  }
  $('epPub').value = S.episodioPub;
  $('tempPub').value = S.temporada;
}

function buscarShows(q) {
  if (!S.estudioIdx?.shows) return [];
  const n = q.toLowerCase().trim();
  if (!n) return [];
  return S.estudioIdx.shows
    .filter(s => (s.n || '').toLowerCase().includes(n))
    .slice(0, 8);
}

async function publicarTodo() {
  if (!S.token) { toast('poné tu token de GitHub (scope repo)', true); return; }
  if (!S.slug) { toast('elegí el show del catálogo', true); return; }
  setFase('publicando');
  const log = $('pubLog');
  log.innerHTML = '';
  const pasos = {};
  const addLog = (paso, ok, detalle) => {
    pasos[paso] = { ok, detalle };
    const el = document.createElement('div');
    el.className = `paso ${ok ? 'ok' : 'mal'}`;
    el.textContent = `· ${t(S.lang, `tls.${paso}`)} — ${detalle}`;
    log.appendChild(el);
  };
  try {
    const r = await publicar({
      token: S.token,
      slug: S.slug,
      temporada: +$('tempPub').value || S.temporada,
      episodio: +$('epPub').value || S.episodioPub,
      idioma: S.idioma === 'auto' ? (S.cuesLangDetectada || 'es') : S.idioma,
      srtTxt: srtDe(S.cues),
      wpReal: S.wp,
      site: S.site,
      tituloShow: S.tituloShow || S.nombre,
      duracionS: S.audio?.duracionS,
      modelo: S.motor === 'groq' ? 'whisper-large-v3-turbo (Groq)' : S.modelo,
      sobreescribir: $('sobrescribir').checked,
    }, addLog);
    addLog('fin', true, t(S.lang, 'listo'));
    setFase('hecho');
    toast(t(S.lang, 'listo'));
    window.resultadoPub = r;
  } catch (e) {
    addLog('error', false, String(e.message || e).slice(0, 200));
    setFase('revisar');
    toast(String(e.message || e).slice(0, 140), true);
  }
}

// ─────────────────── eventos ───────────────────

function init() {
  $('langBtn').onclick = () => {
    S.lang = S.lang === 'es' ? 'en' : 'es';
    localStorage.setItem('ps-lang', S.lang);
    render();
  };
  $('btnResolver').onclick = resolver;
  $('enlace').addEventListener('keydown', e => { if (e.key === 'Enter') resolver(); });

  $('motorLocal').onclick = () => { S.motor = 'local'; localStorage.setItem('ps-motor', 'local'); render(); };
  $('motorGroq').onclick = () => { S.motor = 'groq'; localStorage.setItem('ps-motor', 'groq'); render(); };
  $('groqKey').value = S.groqKey;
  $('groqKey').oninput = (e) => { S.groqKey = e.target.value.trim(); localStorage.setItem('ps-groq', S.groqKey); };
  const selModelo = $('modeloSel');
  MODELOS.forEach(m => {
    const o = document.createElement('option');
    o.value = m.id; o.textContent = m.nombre;
    selModelo.appendChild(o);
  });
  selModelo.value = S.modelo;
  selModelo.onchange = (e) => { S.modelo = e.target.value; localStorage.setItem('ps-modelo', S.modelo); };
  const selIdioma = $('idiomaSel');
  IDIOMAS.forEach(([v, n]) => {
    const o = document.createElement('option');
    o.value = v; o.textContent = n;
    selIdioma.appendChild(o);
  });
  selIdioma.value = S.idioma;
  selIdioma.onchange = (e) => { S.idioma = e.target.value; localStorage.setItem('ps-idioma', S.idioma); };

  $('btnGenerar').onclick = generar;
  $('btnCancelar').onclick = () => { S.ctrl?.abort(); };

  $('tokenInput').value = S.token;
  $('tokenInput').oninput = (e) => { S.token = e.target.value.trim(); localStorage.setItem('ps-token', S.token); };
  $('showInput').oninput = (e) => {
    const q = e.target.value;
    const res = buscarShows(q);
    const lista = $('showSug');
    lista.innerHTML = '';
    res.forEach(s => {
      const el = document.createElement('div');
      el.className = 'sug';
      el.textContent = `${s.n} (${s.k === 'serie' ? 'serie' : 'peli'}${s.a ? ', ' + s.a : ''})`;
      el.onclick = () => {
        S.slug = s.i; S.tituloShow = s.n;
        $('showInput').value = s.n;
        lista.innerHTML = '';
        if (s.t?.length) $('tempPub').value = s.t[0][0];
      };
      lista.appendChild(el);
    });
  };
  $('btnDescargar').onclick = () => {
    const blob = new Blob([srtDe(S.cues)], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${S.slug || 'subs'}-S${String(S.temporada).padStart(2, '0')}E${String(S.episodioPub).padStart(2, '0')}.${S.idioma === 'auto' ? 'es' : S.idioma}.srt`;
    a.click();
  };
  $('btnPublicar').onclick = publicarTodo;

  // preview: highlight de la cue activa
  $('previewAudio').ontimeupdate = (e) => {
    renderCues(Math.round(e.target.currentTime * 1000));
  };

  // ?url=…&ep=…&lang=… (futuro handoff desde la app por QR)
  const q = new URLSearchParams(location.search);
  if (q.get('url')) { $('enlace').value = q.get('url'); resolver(); }
  if (q.get('lang')) { S.idioma = q.get('lang'); selIdioma.value = S.idioma; }
  if (q.get('motor')) { S.motor = q.get('motor'); }

  render();
}

document.addEventListener('DOMContentLoaded', init);
