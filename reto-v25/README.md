# reto-v25 — CuevanaE.ink en la red Pandora: Matabot (955 → 956)

**El reto de la v25** (palabra del dueño): *"lograr hacer que el URL de
Matabot se sume a la red Pandora"* — `https://cuevanae.ink/serie/matabot-2025`.
En v24 el show quedó excluido porque cuevanae.ink NO es un frente de la red
de dramas (el relay solo sirve los 10 sitios NovelHD). Esta versión lo
resuelve de raíz: **la app aprende a leer cuevanae.ink** (TV 3.30.39 /
Móvil 1.0.8) y el catálogo trae la ficha.

## Qué se integró

**+1 show: *Matabot* (Murderbot 2025, Apple TV+)** — T1 completa (10/10
episodios jugables, verificados uno por uno), **audio latino doblado**
(verificado por transcripción ASR de segmentos reales: el monólogo de
Matabot está en español), títulos de episodios es-LatAm de la fuente
("LibreComercio", "Contacto visual", … "El perímetro"), sinopsis de la
fuente, `em=1` (la fuente declara `status: "Returning Series"` — S2
renovada: el actualizador la pasea cada 4 días y detectará la S2 por
`seasons[]` sola). Rail `enEmision` 205 → 206 (al frente) + géneros
Comedia / Drama / Ciencia ficción. `v` 24 → 25. **Los 955 shows previos
quedan byte-identical** (QA con asserts).

## La técnica (patrón "argento" 3.30.25, aplicado a una plataforma nueva)

cuevanae.ink corre sobre **videoapi.la** (React, tema "playnest") y sirve
todo por una API REST limpia + un player en cascada — un mundo distinto de
la red NovelHD (`__NEXT_DATA__` + relay). La cadena, verificada en vivo
(23/10/2026, 10/10 episodios):

1. **API**: `GET https://cuevanae.ink/api/rest/v1/content/serie/matabot-2025`
   → `item` (título, sinopsis, `tmdb_id`, `poster_path`, géneros, estado) +
   `episode_seasons[]` (temporadas con `playable_count`). Sin auth, sin CF
   agresivo. Episodios: `GET /api/rest/v1/episodes?item_id=…&season=1`.
2. **Player**: `GET https://videoapp.mov/e/tv/241554/1/{ep}` con
   `Referer: https://cuevanae.ink/` (sin Referer → "Player no disponible") →
   HTML con `<iframe src="https://vimeos.net/embed-{file}.html?cf={jwt}">`.
3. **Stream pre-resuelto**: el HTML del embed trae
   `window.VIDAPI_CF_STREAM_RESPONSE = {"data":{…"stream_urls":["…master.m3u8…"]}}`
   (modo CF bridge — no hace falta llamar al `/vp/source`).
4. **El m3u8** (480p+720p, token en query) responde a CUALQUIER IP sin
   Referer ni UA → ExoPlayer lo reproduce directo, como los de la red.

**wp**: la temporada vive en el websiteParam — `cvne1-serie-matabot-2025`
(series) / `cvne-movie-{slug}` (pelis). Así el actualizador detecta la S2
por `seasons[]` (`cvne2-serie-…`) con la MISMA lógica que usa con la red, y
la app resuelve cada episodio sin llamadas extra (el player URL es
determinístico: `videoapp.mov/e/tv/{tmdb}/{n}/{ep}`).

**Arte**: póster y background metahub con el `tt30444310` **publicado por
la propia fuente** en `external_ids` (mismo estilo que 945 de los 955 shows
del catálogo); hero = backdrop TMDB w1280 de la fuente. **Sin IMDb** como
fuente de datos (regla del dueño): todo salió de la API de cuevanae.ink.

## Requisito de versión

- **Para reproducir Matabot hace falta la TV 3.30.39 o el Móvil 1.0.8**
  (nuevas en `prometeus-prime-3.28.15/releases` y
  `prometeus-prime-mobil/releases`). En versiones anteriores la ficha
  aparece en el catálogo pero el play falla (`sitio("cuevanae")` no existía).
- Instalaciones nuevas: v25 + app nueva = todo funciona de una.

## Archivos

- [`matabot_v25.json`](matabot_v25.json) — la ficha tal como entró al
  catálogo + la verificación completa de la cadena (10/10 episodios con su
  m3u8 resuelto y el conteo de variantes HLS).
