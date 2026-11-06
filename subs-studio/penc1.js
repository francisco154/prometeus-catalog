// PENC1 3.30.52 · cifrado del catálogo remoto (AES-256-GCM) en el navegador.
//
// El sobre "PENC1.<iv_b64>.<ct_b64>" es el MISMO de la app (PandoraCatalogoRemoto.kt):
// clave = XOR de dos mitades base64 que viven en el repo PRIVADO del app TV.
// El estudio NO embebe la clave: con el token del dueño lee el .kt del repo
// privado, extrae ENC_A/ENC_B y deriva la clave EN MEMORIA (WebCrypto). Sin
// token → la publicación de catálogo queda deshabilitada (el resto funciona).

const PREFIJO = 'PENC1.';
const RUTA_KT = 'app/src/main/java/com/prometeus/stream/data/PandoraCatalogoRemoto.kt';

function b64ToBytes(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(b) {
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s);
}

export function extraerMitades(fuenteKt) {
  const a = fuenteKt.match(/ENC_A\s*=\s*"([^"]+)"/);
  const b = fuenteKt.match(/ENC_B\s*=\s*"([^"]+)"/);
  if (!a || !b) return null;
  return { encA: a[1], encB: b[1] };
}

export async function claveDesdeMitades(encA, encB) {
  const a = b64ToBytes(encA);
  const b = b64ToBytes(encB);
  if (a.length !== 32 || b.length !== 32) throw new Error('mitades inválidas');
  const raw = new Uint8Array(32);
  for (let i = 0; i < 32; i++) raw[i] = a[i] ^ b[i];
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/** Descifra el sobre PENC1 (o pasa un JSON plano tal cual — compatibilidad). */
export async function desencriptar(contenido, clave) {
  const t = contenido.trim();
  if (t.startsWith('{')) return t;
  if (!t.startsWith(PREFIJO)) throw new Error('no es un sobre PENC1');
  const [ivB64, ctB64] = t.slice(PREFIJO.length).trim().split('.');
  const iv = b64ToBytes(ivB64);
  const ct = b64ToBytes(ctB64);
  if (iv.length !== 12 || ct.length <= 16) throw new Error('sobre inválido');
  const claro = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: 128 }, clave, ct);
  return new TextDecoder().decode(claro);
}

/** Cifra con la misma clave (IV aleatorio — simétrico del descifrador). */
export async function encriptar(jsonStr, clave) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 }, clave,
    new TextEncoder().encode(jsonStr));
  return PREFIJO + bytesToB64(iv) + '.' + bytesToB64(new Uint8Array(ct));
}

/** Roundtrip de sanidad: encriptar → desencriptar debe dar byte a byte igual. */
export async function roundtrip(jsonStr, clave) {
  const sobre = await encriptar(jsonStr, clave);
  const claro = await desencriptar(sobre, clave);
  return claro === jsonStr;
}

export { RUTA_KT };
