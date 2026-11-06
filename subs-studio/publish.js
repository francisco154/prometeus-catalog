// Publicar 3.30.52 · la disciplina de publicación al catálogo remoto.
//
// Pasos (orden exacto para que NUNCA quede algo a medias):
//   1. SRT   → subs/<slug>/S03E06.es.srt          (repo público, raw.githubusercontent)
//   2. ÍNDICE→ subs/subs-index.json                (el relay lo lee EN VIVO — hermana sintética)
//   3. ÍNDICE→ subs/estudio.json (flag de subs del show)
//   4. CATALOGO: desencriptar (PENC1) → hermana 'sub' en la temporada → v+1 →
//      verificación byte a byte de TODO lo demás → re-encriptar → roundtrip → PUT
//
// La regla del dueño se respeta: la hermana solo entra si la temporada tiene
// el wp REAL que se transcribió (identidad del contenido, no suposiciones).
// LA APP NO SE TOCA: conSubsDeHermanaSub (3.30.1) presta la pista ES solo.

import { extraerMitades, claveDesdeMitades, desencriptar, encriptar, roundtrip, RUTA_KT } from './penc1.js';
import { leerArchivo, subirArchivo, shaDe } from './github.js';

export const OWNER = 'francisco154';
export const REPO_CATALOGO = 'prometeus-catalog';
export const REPO_TV = 'prometeus-prime-3.28.15';
export const RAW_BASE = `https://raw.githubusercontent.com/${OWNER}/${REPO_CATALOGO}/main`;

/** wp sintético único: prefijo inexistente en el sitio + slug legible. */
export function wpSintetico(slug, temporada) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  const tag = h.toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
  const guion = slug.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `SUBES${tag}-${guion}-S${String(temporada).padStart(2, '0')}`;
}

export function nombreSrt(temporada, episodio, idioma) {
  const t = String(temporada).padStart(2, '0');
  const e = String(episodio).padStart(2, '0');
  return `S${t}E${e}.${idioma}.srt`;
}

export async function claveCatalogo(token) {
  const kt = await leerArchivo(OWNER, REPO_TV, RUTA_KT, token);
  const m = extraerMitades(kt);
  if (!m) throw new Error('no pude extraer ENC_A/ENC_B del repo TV (¿ruta?)');
  return claveDesdeMitades(m.encA, m.encB);
}

/** ¿La temporada ya tiene hermana 'sub'? (v29 usaba otro hash de wp — lo
 *  que importa es que exista UNA hermana, no cuál). Devuelve su wp. */
function hermanaExistente(show, temporada) {
  const temp = (show.e || []).find(t => t.n === temporada);
  const her = (temp?.w || []).find(f => f.v === 'sub');
  return her?.w || null;
}

/**
 * El paso del catálogo. Entrada:
 *   catalogoTxt: contenido ACTUAL de catalog.json (raw)
 *   clave: CryptoKey PENC1
 *   slug, temporada: el show y su temporada (n)
 *   wpReal, site: la fuente REAL que se transcribió (validación de identidad)
 * Devuelve { nuevoTxt, verificacion } — NO sube nada (la llama publicar()).
 */
export async function parchearCatalogo(catalogoTxt, clave, slug, temporada, wpReal, site, langs) {
  const claro = await desencriptar(catalogoTxt, clave);
  const cat = JSON.parse(claro);

  // serialización canónica idéntica a la original (JSON.parse preserva el
  // orden de inserción — la disciplina "todo lo demás byte-identical")
  const canon = (o) => JSON.stringify(o);
  const antes = cat.shows.map(canon);

  const show = cat.shows.find(s => s.i === slug);
  if (!show) throw new Error(`el show "${slug}" no está en el catálogo`);
  const temp = (show.e || []).find(t => t.n === temporada);
  if (!temp) throw new Error(`la temporada ${temporada} de "${slug}" no está en el catálogo`);

  const fuentes = temp.w || [];
  if (!fuentes.some(f => f.w === wpReal && f.y === site)) {
    throw new Error(`la temporada ${temporada} no tiene la fuente ${wpReal} de ${site} — elegí la temporada correcta`);
  }

  const existente = fuentes.find(f => f.v === 'sub')?.w || null;
  const sintetico = existente || wpSintetico(slug, temporada);
  if (existente) {
    return { yaEstaba: true, sintetico, v: cat.v };
  }
  fuentes.push({ w: sintetico, v: 'sub', y: site });

  const vAnterior = cat.v;
  cat.v = vAnterior + 1;

  const despues = cat.shows.map(canon);
  let cambiados = 0;
  for (let i = 0; i < despues.length; i++) {
    if (antes[i] !== despues[i]) cambiados++;
  }
  if (cambiados !== 1) {
    throw new Error(`disciplina rota: ${cambiados} shows cambiaron (debía ser 1)`);
  }

  const nuevoJson = JSON.stringify(cat);
  const verificacion = {
    vAnterior, vNueva: cat.v, shows: cat.shows.length, cambiados,
    roundtrip: await roundtrip(nuevoJson, clave),
    sintetico,
  };
  if (!verificacion.roundtrip) throw new Error('roundtrip PENC1 falló');
  return { yaEstaba: false, nuevoTxt: await encriptar(nuevoJson, clave), verificacion };
}

/**
 * Publicación completa. onPaso({ paso, ok, detalle }) por cada uno.
 * Opciones: { token, slug, temporada, episodio, idioma, srtTxt, wpReal, site,
 *             tituloShow, duracionS, modelo, sobreescribir }
 */
export async function publicar(opts, onPaso) {
  const {
    token, slug, temporada, episodio, idioma, srtTxt,
    wpReal, site, tituloShow, duracionS, modelo, sobreescribir,
  } = opts;
  const log = (paso, ok, detalle) => { onPaso?.({ paso, ok, detalle }); return ok; };

  // 1 · SRT
  const rutaSrt = `subs/${slug}/${nombreSrt(temporada, episodio, idioma)}`;
  const shaSrt = await shaDe(OWNER, REPO_CATALOGO, rutaSrt, token);
  if (shaSrt && !sobreescribir) {
    throw new Error(`ya existe ${rutaSrt} — marcá "sobrescribir" para pisarlo`);
  }
  const subida = await subirArchivo(OWNER, REPO_CATALOGO, rutaSrt, srtTxt, token,
    `subs: ${slug} ${nombreSrt(temporada, episodio, idioma)} (${idioma}) vía Sub Studio`, shaSrt);
  log('srt', true, `${rutaSrt} (${(srtTxt.length / 1024).toFixed(1)} KB)`);

  // 2 · subs-index.json (el relay lee esto EN VIVO)
  const rutaIdx = 'subs/subs-index.json';
  const idxTxt = await leerArchivo(OWNER, REPO_CATALOGO, rutaIdx, token);
  const idx = JSON.parse(idxTxt);
  idx.v = (idx.v || 0) + 1;
  idx.hermanas = idx.hermanas || [];
  // el catálogo manda: si la temporada ya tiene hermana, esa ES la clave
  const catTxt0 = await leerArchivo(OWNER, REPO_CATALOGO, 'catalog.json', token);
  const clave0 = await claveCatalogo(token);
  const cat0 = JSON.parse(await desencriptar(catTxt0, clave0));
  const show0 = cat0.shows.find(s => s.i === slug);
  const hermana0 = show0 ? hermanaExistente(show0, temporada) : null;
  const claveH = `${site}|drama|${hermana0 || wpSintetico(slug, temporada)}`;
  let her = idx.hermanas.find(h => h.clave === claveH);
  if (!her) {
    her = {
      clave: claveH,
      realWp: wpReal,
      name: `[Sub Español]${tituloShow || slug}`,
      subsBase: `${RAW_BASE}/subs/${slug}/`,
      temporadas: [{ n: temporada, eps: episodio }],
      idiomas: [],
      slug,
      site, tipo: 'drama',
    };
    idx.hermanas.push(her);
  } else {
    // ya existía: ampliar eps si el episodio es mayor
    const t = her.temporadas.find(x => x.n === temporada);
    if (t) t.eps = Math.max(t.eps || 0, episodio);
  }
  if (!her.idiomas.includes(idioma)) her.idiomas.push(idioma);
  const shaIdx = await shaDe(OWNER, REPO_CATALOGO, rutaIdx, token);
  await subirArchivo(OWNER, REPO_CATALOGO, rutaIdx, JSON.stringify(idx, null, 1), token,
    `subs-index v${idx.v}: ${slug} S${String(temporada).padStart(2, '0')} (${idioma})`, shaIdx);
  log('indice', true, `${idx.hermanas.length} hermanas registradas (v${idx.v})`);

  // 3 · estudio.json (flag informativo para el buscador del estudio)
  try {
    const rutaEst = 'subs/estudio.json';
    const estTxt = await leerArchivo(OWNER, REPO_CATALOGO, rutaEst, token);
    const est = JSON.parse(estTxt);
    est.generado = new Date().toISOString().slice(0, 10);
    const shaEst = await shaDe(OWNER, REPO_CATALOGO, rutaEst, token);
    await subirArchivo(OWNER, REPO_CATALOGO, rutaEst, JSON.stringify(est), token,
      `estudio: subs de ${slug}`, shaEst);
    log('estudio', true, 'flag actualizado');
  } catch (e) { log('estudio', false, String(e.message || e).slice(0, 120)); }

  // 4 · catálogo PENC1 (hermana sintética + v+1)
  const catTxt = await leerArchivo(OWNER, REPO_CATALOGO, 'catalog.json', token);
  const clave = await claveCatalogo(token);
  const r = await parchearCatalogo(catTxt, clave, slug, temporada, wpReal, site, [idioma]);
  if (r.yaEstaba) {
    log('catalogo', true, `la hermana ${r.sintetico} ya estaba (v${r.v}) — sin bump`);
  } else {
    const shaCat = await shaDe(OWNER, REPO_CATALOGO, 'catalog.json', token);
    await subirArchivo(OWNER, REPO_CATALOGO, 'catalog.json', r.nuevoTxt, token,
      `v${r.verificacion.vNueva}: hermana sub de ${slug} T${temporada} (subs propios)`, shaCat);
    log('catalogo', true,
      `v${r.verificacion.vAnterior}→${r.verificacion.vNueva} · ${r.verificacion.shows} shows · ` +
      `${r.verificacion.cambiados} cambiado · roundtrip OK`);
  }

  return {
    srt: `${RAW_BASE}/${rutaSrt}`,
    hermana: claveH,
    verificacion: r.verificacion,
    commit: subida.commit?.sha?.slice(0, 8) || '?',
  };
}
