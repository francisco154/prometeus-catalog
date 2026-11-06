// GitHub 3.30.52 · cliente Contents API (api.github.com — CORS habilitado).
// El token del dueño viaja SOLO en el header Authorization y se guarda en
// localStorage del navegador (nunca en el repo ni en URLs).

const API = 'https://api.github.com';

async function gh(ruta, token, opts = {}) {
  const r = await fetch(`${API}${ruta}`, {
    ...opts,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.body && !(opts.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.headers || {}),
    },
  });
  return r;
}

export async function usuario(token) {
  const r = await gh('/user', token);
  if (!r.ok) throw new Error(`token inválido (HTTP ${r.status})`);
  return r.json();
}

/** Lee un archivo de texto (repo público o privado con token). */
export async function leerArchivo(owner, repo, ruta, token, rama = 'main') {
  const r = await gh(`/repos/${owner}/${repo}/contents/${ruta}?ref=${rama}`, token,
    { headers: { Accept: 'application/vnd.github.raw' } });
  if (!r.ok) throw new Error(`leer ${ruta}: HTTP ${r.status}`);
  return r.text();
}

/** PUT de un archivo de texto (crea o actualiza con sha). */
export async function subirArchivo(owner, repo, ruta, contenido, token, mensaje, sha, rama = 'main') {
  const body = JSON.stringify({
    message: mensaje,
    content: btoa(unescape(encodeURIComponent(contenido))),
    ...(sha ? { sha } : {}),
    branch: rama,
  });
  const r = await gh(`/repos/${owner}/${repo}/contents/${ruta}`, token, { method: 'PUT', body });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(`subir ${ruta}: HTTP ${r.status} ${d.message || ''}`.trim());
  }
  return r.json();
}

/** GET sha del archivo (null si no existe). */
export async function shaDe(owner, repo, ruta, token, rama = 'main') {
  const r = await gh(`/repos/${owner}/${repo}/contents/${ruta}?ref=${rama}`, token);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`sha ${ruta}: HTTP ${r.status}`);
  return (await r.json()).sha;
}

export async function repoInfo(owner, repo, token) {
  const r = await gh(`/repos/${owner}/${repo}`, token);
  if (!r.ok) throw new Error(`repo ${repo}: HTTP ${r.status}`);
  return r.json();
}
