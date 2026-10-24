# reto-v28 — Parche del póster de Day of the Dead (973 shows, v 27 → 28)

## El problema

El dueño reporta que **Day of the Dead** (serie 2021 de Syfy, ingresada en
v24) es **el único póster que aparece vacío** en la app. Diagnóstico:

- El `p` del show apuntaba a
  `img.peliculaplay.com/cover/20250708/1751962892234_…webp` — HTTP 200,
  `image/webp`, PERO la imagen es un **placeholder vacío**: PNG RGBA
  1332×1865 con varianza de píxeles = 0 (todos los píxeles iguales —
  negro/transparente). El sitio subió un lienzo en blanco como carátula
  vertical el 2025-07-08 y la red la replica en todos sus frentes
  (`img.123flmsfree.com` sirve exactamente el mismo archivo).
- El `b`/`h` (backdrop/hero) SÍ tiene arte real (varianza 1730): manos de
  zombi emergiendo sobre cielo naranja — el key art oficial de la serie.

## El fix

`p` → `https://images.metahub.space/poster/medium/tt12052892/img`

- `tt12052892` = **Day of the Dead (2021, Syfy)**, verificado por TVMaze
  (id 46469, premiered 2021-10-15). Sin tocar imdb.com (regla del dueño).
- El póster de metahub fue **verificado visualmente**: es el póster oficial
  de la serie 2021 (título gótico + manos de zombi + cielo naranja +
  helicóptero) — **mismo key art que el backdrop existente**, así que
  póster y fondo quedan a juego.
- Alternativa descartada: la carátula vieja del `dubbingList` base
  (`…/20220803/…丧尸.jpg`, imagen real con contenido) es el arte de la
  película de 1985, no de la serie — visualmente distinta del resto del
  material del show.

## Qué NO cambió

- `b` y `h` intactos (arte real ya verificado).
- Sinopsis, géneros, score, años, fuentes (latino + sub en peliculaplay),
  episodios, rails: **byte-identical**.
- Los otros **972 shows: byte-identical** (QA con asserts — solo 1 show
  difiere y solo en `p`).

## Propagación

`v` 27 → 28. La app re-fusiona el manifiesto remoto automáticamente cada
6 h **solo si `v` sube** (si no, respondería "Catálogo al día" sin tocar
nada). Con el bump, todos los dispositivos reciben el póster nuevo solos;
`fusionarCatalogo` actualiza metadatos de shows existentes
(`poster = s.s("p") ?: existente.poster`), así que también llega a quien
ya tenía el show en el hub.

## Verificación

- Manifiesto v28: 973 shows, `v` 28, 1 diff (day-of-the-dead.p), rails
  idénticos. Cifrado PENC1 + roundtrip OK (2.273.095 bytes).
- Póster nuevo: HTTP 200, 58 KB webp, contenido verificado por modelo de
  visión (póster oficial 2021).
- End-to-end: `raw.githubusercontent.com/…/catalog.json` → descifra →
  v28 → `day-of-the-dead.p` = metahub tt12052892.

*Parche aplicado el 2026-10-24 junto a TV 3.30.43 (selector de servidores
oculto de la ficha). Script: `scripts/v28_parche_dotd.py` del entorno del
agente.*
