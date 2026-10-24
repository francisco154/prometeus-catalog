# reto-v29/ — Prefiero la Muerte: servidor nuevo + póster latino + subtítulos ES propios

**El primer show del catálogo con subtítulos del dueño servidos por la
propia infraestructura.** *Prefiero la muerte* (Prime Video 2026, México,
1×8) estaba en cuevanae (v26); el dueño pidió mudarla al frente **123
Película** (más estable), ponerle el **póster latino** y **incorporar los
subtítulos en español** que él mismo tradujo (del pack EN de subdl que se
le entregó antes). v 28 → 29: **973 shows, 972 byte-identical, 1 show con
exactamente 2 campos cambiados (`p` y `e[0].w`)**.

## Qué cambió en el catálogo

| Campo | Antes (v28) | Ahora (v29) |
|---|---|---|
| `p` (póster) | metahub `tt31841438` — arte internacional en inglés ("I WOULD RATHER DIE") | **CDN de la fuente** `img.123pelicula.com/cover/20261008/1791439718195_…webp` — **arte latino** ("PREFIERO LA MUERTE", mismo key art: camioneta roja + manos zombi + fondo amarillo). Verificado visualmente; patrón pedido del dueño ya usado en v27 |
| `e[0].w[0]` | `cvne1-serie-prefiero-la-muerte-2026` · latino · **cuevanae** (wp de la API de cuevanae.ink) | `UINycRxjfab5o7S547Enc-I-Would-Rather-Die` · latino · **pelicula** (la URL exacta del dueño, `ver.123pelicula.com/es/detail/drama/…/1`) |
| `e[0].w[1]` | — | **NUEVO**: `PLMSUBES0001-Prefiero-La-Muerte` · **sub** · pelicula — la hermana sintética (ver abajo) |

Todo lo demás queda intacto: `b`/`h` (metahub + TMDB), sinopsis, `x` (los
8 títulos de episodios curados en v26), `q`=8, `em`=1, `tt`, `r`, `g`.

## La fuente nueva (walk verificado)

`ver.123pelicula.com` = **123 Película**, el frente `pelicula` del relay
(allowlist). Detalle del wp latino vía relay: 1 temporada "not_season" con
**8/8 episodios** (ids 1845777-1845784), `mediaInfoList` con 3 calidades
(GROOT_SD 720P / LD 540P / FD 360P) — **m3u8 probado HTTP 200**. Variante
hermana del dubbingList: `[Audio Portugués-BR]` (pt, sin subs) — NO se
incorpora (el público es es-latino; el dueño pidió "este" servidor, el de
su URL).

## Subtítulos ES propios — la técnica "hermana sintética"

**El problema**: el catálogo no tiene campo de subtítulos (el esquema es
`w/v/y` por fuente) y la app solo conoce los SRT que el SITIO sirve en
`episodeVo[].subtitlingList`. 123 Película no tiene pista ES de esta
serie, y no se puede tocar el sitio.

**La solución (cero cambios en las apps — TV 3.30.43 / Móvil 1.0.11)**:

1. **SRT del dueño → repo público del catálogo**: [`subs/prefiero-la-muerte/`](../subs/prefiero-la-muerte/)
   (`S01E01.es.srt`…`S01E08.es.srt`, 24-35 KB c/u, UTF-8+CRLF, 346-492
   cues — **conteo idéntico a los EN originales**, la traducción respeta
   los tiempos). Servidos por `raw.githubusercontent.com` — el mismo host
   del que la app ya baja `catalog.json`.
2. **Hermana sintética**: el catálogo suma la fuente
   `PLMSUBES0001-Prefiero-La-Muerte` (v=`sub`, y=`pelicula`). Ese wp **no
   existe en el sitio** (prefijo de ID inexistente — ojo: el sitio
   resuelve por prefijo de ID, técnica Bastard!! S2, así que el prefijo
   elegido NO puede chocar con un ID real).
3. **Relay que inyecta** (Render `prometeus-server` v1.10 + worker CF
   `pr-relay` v2, parche 1:1): cuando la app pide el detalle del wp
   sintético, el relay sirve un **clon del detalle REAL** (misma cascada,
   fresco) con `name="[Sub Español]Prefiero la Muerte"` y
   `episodeVo[n].subtitlingList = [{languageAbbr:"es", subtitlingUrl:
   <SRT ep n>}]`. El detalle del wp REAL queda **intacto**.
4. **La app hace el resto sola** (mecanismo 3.30.1 existente):
   el player juega la fuente latino → sin pista ES propia →
   `conSubsDeHermanaSub` busca la hermana `sub` de la temporada → pide su
   detalle → el directo al sitio **404** (no existe) → cae al relay →
   detalle sintético → le **presta** la pista ES → `subsCompartidas=true`
   → **los subtítulos se encienden solos** (autoSubEs). Si el usuario
   elige la hermana directamente, también juega (mismo m3u8) con subs.

**Por qué el relay y no la app**: la app prueba el DIRECTO al sitio antes
que el relay; el detalle real vendría del sitio sin subs. El wp sintético
rompe esa ruta a propósito: 404 en el sitio (verificado: `PLMSUBES0001…`
y cualquier ID inexistente devuelven pageProps vacío/404) → la cascada
cae al relay, que es infra propia. La app TV/móvil NO se toca ("fuera de
eso está todo perfecto" — dueño).

**A prueba de fallos**: si el relay (ambos) cayera, el préstamo falla
silencioso y la reproducción sigue sin subs (mismo comportamiento que
cualquier variante sin hermana sub). El m3u8 nunca pasa por el relay.

### Rollout / transición

- La fusión de la app es aditiva (`union` de fuentes por wp): una sesión
  larga que ya tenía v28 cargado convive con [cuevanae, pelicula-latino,
  pelicula-sub] hasta reiniciar. Tras el reinicio la base es el seed
  (la serie NO está en el seed v11) y la fusión con v29 da solo las
  fuentes nuevas. En installs frescos: directo a v29.
- El préstamo de subs se pide una vez por sesión (`cacheSubsCompartidas`,
  clave `sitio:wp:ep`).

## QA

- 973 shows, mismo orden; **972 byte-identical**; diff exacto de 1 show en
  2 campos (`p`, `e[0].w`); `q`/`x`/`n` de la temporada intactos.
- Wps nuevos 100% ASCII y sin colisión global (5.408 wps).
- PENC1: roundtrip byte a byte verificado.
- Relay: 5 tests nuevos de unidad (clon, no-mutación, fuera de rango,
  conservación de mediaInfoList/dubbingList) + 4 de humo del worker
  (21/21) + integración viva post-deploy (sintético 200 con 8/8 pistas,
  m3u8 200, SRT raw 200, wp real intacto).
- Póster: verificado visualmente (VLM) — cover del CDN con título en
  español; HTTP 200 sin Referer (lección v23: el CDN de la red rechaza
  Referer externo, la app no manda).

## Archivos

- [`cambios_v29.json`](cambios_v29.json) — diff estructurado del show.
- [`subs/`](../subs/prefiero-la-muerte/) — los 8 SRT ES del dueño.
- Relay Render: `prometeus-server` commit "v1.10 · SUBS PROPIAS"
  (`src/routes/pandora-routes.js` + `tests/subs-propias.test.js`).
- Worker CF: `prometeus-relay-worker` commit "v2 · SUBS PROPIAS"
  (`src/worker.js` + `test/smoke.mjs`).
