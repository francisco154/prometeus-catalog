# reto-v17 — Las 100 argentas entran al catálogo remoto

> **Qué es esto.** La v17 fusiona las **100 películas argentinas** de
> `elvideoclubargento.com.ar` (el lote de la v15, hasta ahora solo
> bundleado en el APK como `assets/argento_seed.json`) al **catálogo
> remoto PENC1**. A partir de esta versión, las argentas llegan por la
> misma vía que el resto del catálogo: descarga cifrada cada 6 horas +
> "Actualizar catálogo", **sin rebuild del APK**.

## Qué viaja en el manifiesto v17

- **100 shows nuevos** con `k="peli"` y sitioKey `y="argento"`
  (sitio sintético — el playback lo resuelve `OkruExtractor`).
- **Ids idénticos al seed del APK**: `argento-{okru_id}`. La fusión del
  cliente (`fusionarCatalogo`) dedupe por id → en dispositivos con el
  seed bundleado (≥ 3.30.27) **no se duplican**; en dispositivos viejos
  sin seed aparecen como altas nuevas.
- **websiteParam** `okru-{okru_id}` (mismo routing que el seed).
- **Póster vertical** desde TMDB (`p`) + **fondo landscape** de metahub
  por IMDb (`b`/`h`) cuando la peli tiene `imdb_id` (95 de 100).
- Sinopsis, año, score, géneros y título original por peli.
- **Riel `peliculas`**: 210 → **310 ids** (append dedupe).
- **Rieles de género**: las argentas se anexan a los géneros canónicos
  (`Documental`→`Documentales`, `Terror`→`Horror`, `Western`→
  `Occidentales`) — 26 claves, sin rieles duplicados.

## Compatibilidad

| Cliente | Comportamiento con v17 |
|---|---|
| TV ≥ 3.30.25 / Mobil ≥ 1.0.x | Argentas visibles; las del seed ya estaban (dedupe). Playback vía `OkruExtractor` |
| 3.30.27+ (seed de 100) | Igual que antes + metadatos refrescados (backdrop metahub) |
| Sin seed / futuro | Las argentas llegan completas por el catálogo remoto |

`v` pasa de 16 a 17; los clientes aplican cuando `v > v_aplicada` y la
fusión **nunca borra** contenido existente (verificado: los 510 shows de
la v16 quedan intactos, rieles topRT/mejores/estrenos/imperdibles/
heroes/enEmision sin alterar).

## Reproducción

`PandoraApi.detalle()` detecta `sitioKey=="argento"` → `detalleArgento()`:
resuelve `ok.ru/video/{id}` con `OkruExtractor` (HLS m3u8 adaptativo +
5 calidades MP4 range-supported, directo a ExoPlayer — sin WebView).

Los builds **3.30.30 (TV) y 1.0.5 (móvil)** agregan un fallback extra en
`detalleArgento`: si la peli vino del catálogo remoto y no está en
`argentoExtras` (seed bundleado), la URL de OK.ru se deriva directamente
del websiteParam (`okru-{id}` → `https://ok.ru/video/{id}`) — las
argentas quedan jugables incluso en dispositivos sin seed.

## Pipeline reproducible

1. Descifrar `catalog.json` (PENC1, v16, 510 shows).
2. Leer `reto-v15/argento_seed.json` (100 cards).
3. Mapear cada card → schema de peli del catálogo (ids `argento-{okru_id}`).
4. Anexar a `shows` + rieles `peliculas`/`generos` (dedupe).
5. `v=17`, cifrar PENC1, roundtrip de verificación, push + release.

Listado de las 100 pelis: [`argento_pelis.json`](argento_pelis.json)
(extraído del manifiesto publicado).
