# reto-v32/ — SUB STUDIO: subtítulos por IA sin la TV + Lab Rats T3E6

**La respuesta al reporte del dueño** ("el audio no se decodificó en esta TV"
— el decoder AAC de MediaCodec de su TV rechaza el HE-AAC del stream): la
generación de subtítulos **se muda del televisor al resto del ecosistema**,
con cero coste y en español e inglés.

## Qué entra en esta publicación

| Pieza | Qué es |
|---|---|
| [`subs-studio/`](../subs-studio/) | **Prometeus Sub Studio** — web app (GitHub Pages de ESTE repo) que transcribe desde el celular/PC: resuelve el enlace por el relay, baja el audio del CDN, corre la IA (Whisper local WebGPU/WASM **o** Groq turbo gratis) y publica acá |
| [`subs/lab-rats/S03E06.es.srt`](../subs/lab-rats/S03E06.es.srt) | El SRT del episodio reportado (doblaje latino, 292 cues, `faster-whisper small` sobre el audio REAL del CDN — verificado contra el diálogo de referencia) |
| [`subs/subs-index.json`](../subs/subs-index.json) | **Manifiesto de hermanas sintéticas** — el relay lo lee EN VIVO (cache 5 min): registrar una hermana nueva NO vuelve a requerir redeploy |
| [`subs/estudio.json`](../subs/estudio.json) | Índice público de shows (1039 — solo títulos/años) para el buscador del Studio |
| `catalog.json` v31 → 32 | La hermana `sub` de Lab Rats T3: `SUBES25BD2E-lab-rats-S03` (1039 shows, **1038 byte-identical**, 1 show con 1 fuente nueva) |

## El ecosistema completo (cero coste)

```
┌─ TV (SIN cómputo) ──────────────────────────────────────────────┐
│ reproduce doblaje → sin pista ES → conSubsDeHermanaSub (3.30.1) │
│      pide el detalle de la hermana → sitio 404 → relay →        │
│      subtitlingList = SRT de raw.githubusercontent →           │
│      subsCompartidas → LOS SUBTÍTULOS SE ENCIENDEN SOLOS        │
└─────────────────────────────────────────────────────────────────┘
        ▲ raw.githubusercontent (este repo)      ▲ relay v1.11/v3
        │                                        │
┌─ Sub Studio (celular/PC, GitHub Pages) ───────┴─────────────────┐
│ 1. enlace de la serie → relay → episodios + calidades           │
│ 2. audio del CDN (mismo .ts que ve la TV — UA móvil pasa sola;  │
│    escritorio → proxy del worker CF con demux ADTS: ~30× menos) │
│ 3. IA: Whisper local (WebGPU/WASM, modelo de HF) o Groq turbo   │
│    (whisper-large-v3-turbo, capa gratis: 2 h de audio por hora) │
│ 4. revisa las líneas → publica: SRT + subs-index + hermana en   │
│    el catálogo cifrado (PENC1 en el navegador, token del dueño)  │
└─────────────────────────────────────────────────────────────────┘
```

- **GitHub** (repo + Pages + Contents API) — gratis
- **Cloudflare Worker** (`pr-relay` v3) — 100k req/día gratis, siempre despierto
- **Hugging Face CDN** (modelos Whisper) — gratis, sin clave
- **Groq** (turbo) — capa gratuita sin tarjeta (la clave del dueño viaja solo
  por HTTPS a SU worker; api.groq.com rechaza navegador directo — preflight
  403 medido — por eso el passthrough `/v1/pandora/groq`)

## Por qué la TV no puede (medido, no supuesto)

- El CDN filtra por **User-Agent**: UA móvil/TV → 200, UA escritorio → 403
  (Referer/Origin irrelevantes — matriz medida desde el entorno de build).
  El navegador del CELULAR baja los segmentos directo; el de escritorio
  no puede cambiar su UA → `/v1/pandora/proxy`.
- El decoder AAC de la TV del dueño no produce PCM del HE-AAC del stream
  (reporte 3.30.51: el diagnóstico honesto lo dice). El NAVEGADOR trae
  decoder propio: `decodeAudioData` sobre el ADTS demuxado resamplea a
  16 kHz gratis (verificado con .ts REAL: 14,30 s de audio de un segmento
  de 14,26 s declarados, RMS 0,041).
- Los .ts son MUXADOS (video ~95% de los bytes): el demuxer TS→ADTS (port
  1:1 del `TsAac` de la app) corre en el navegador o en el worker
  (`proxy?audio=1`) — el audio completo de un cap de 22 min pesa ~10 MB.

## QA de esta publicación

- `catalog.json`: v31 → 32 · 1039 shows · **1038 byte-identical** · 1 show
  (lab-rats) con 1 fuente hermana nueva · PENC1 roundtrip byte a byte.
- wp sintético `SUBES25BD2E-lab-rats-S03`: sin colisión entre los 3.687 wps
  del catálogo · el sitio 404 (prefijo inexistente — misma técnica v29).
- SRT: transcrito sobre el audio REAL del CDN (media-limit-xr8a2,
  HE-AAC 22050-core/44100-SBR) · 292 cues · 22:03 · diálogo de referencia
  coincidente ("Voy a abrir una cuenta de ahorros…" — el mismo del bench
  del commit 3.30.51).
- Relays: Render v1.11 y worker CF v3 — **14/14** y **40/40** tests (los
  6 de subs-propias reescritos al formato genérico + 24 nuevos: manifiesto,
  multi-temporada/multi-idioma, CORS, proxy allowlist, demux sobre .ts REAL,
  passthrough Groq con validaciones).
- Studio: demux JS verificado contra el mismo .ts REAL (19/19 frames con
  PID heredado en fronteras sin PAT) · `decodeAudioData` verificado en
  Chromium headless con el ADTS real de la red.

## El flujo del dueño (2 minutos por episodio)

1. Abrir el Studio en el celular (`francisco154.github.io/prometeus-catalog/subs-studio/`).
2. Pegar el enlace de la serie (p.ej. `peliculaplay.com/es/detail/drama/…-Lab-Rats-Season-3`)
   → tocar el episodio → Generar (Turbo Groq recomendado; clave gratis).
3. Revisar las líneas → Publicar (token de GitHub scope repo, una vez).
4. En la TV: "Actualizar catálogo" (o esperar ≤6 h) → reproducir el doblaje
   → subtítulos ES solos.

La app TV **no se toca**: la entrega sigue siendo 3.30.51 (el botón
"Generar subtítulos por IA (en esta TV)" queda como camino alternativo
para TVs cuyo decoder AAC sí funciona — con su diagnóstico honesto).
