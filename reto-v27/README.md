# reto-v27 — octavo ingreso incremental: 5 series + 5 pelis (963 → 973)

**Fecha:** 23/10/2026 · **Lista del dueño:** 11 URLs (Filemail
`letcewkwnwceckq`, `Cat_logo_v27_onlinenotepad.io.txt`). Todas de la red de
dramas (relay `prometeus-server`): flixlat · peliculaplay · 123pelicula ·
sololatino · cuevana4br · flms · playspelis · dramasfree.

## El lote

| show | tipo | año | fuente | temporadas/variantes |
|---|---|---|---|---|
| **La peor vuelta al mundo** (Disney+, Juanpa Zurita) | serie | 2025 | flixlat | T1 (8 eps, sub) · em=1 (renovada S2) |
| **Bajo la superficie**/*Below* (Netflix, Josh Hartnett) | serie | 2026 | peliculaplay | T1 (6 eps, **latino+sub+base**) |
| **City of Stars** (tailandesa iQiyi) | serie | 2024 | sololatino | T1 (12 eps, sub) |
| **Yaga** (HBO Max, mito de Baba Yaga) | serie | 2026 | cuevana4br | T1 (2/8 eps, sub) · **em=1** (estreno 23/10, caps cada ~5 días) |
| **Dead End** (polaca Netflix) | serie | 2022 | peliculaplay | T1 (6 eps, **latino+base**) |
| **Honey, la reina del baile** (Jessica Alba) | peli | 2003 | flms | **latino+base** |
| **Honey Don't!** (Ethan Coen) | peli | 2025 | playspelis | **latino+sub+base** |
| **El descendiente**/*Descendent* | peli | 2025 | cuevana4br | **latino+sub** |
| **The Man with the Black Umbrella** | peli | 2025 | dramas | sub |
| **The Man with the Answers** (griega) | peli | 2021 | sololatino | **latino** |

*The Boroughs* descartado por duplicado: el wp
`6fXNBDCGhUAZwbIOKiOG2-The-Boroughs-Season-1` ya vive en el catálogo.

**Doblajes** (pedido explícito del dueño): el walk recorre `dubbingList` +
`seasons[]` de cada show y registra TODAS las variantes hospedadas —
`latino` ([Audio Latino]), `doblaje` (castellano España), `sub` ([Sub
Español]) y `base` (original/portugués). Ninguna peli ni serie quedó con
variante única salvo las que la fuente solo sirve así (City of Stars, Yaga,
Umbrella, Answers).

## Pósters latinos (pedido explícito)

`p` (póster vertical) y `h` (hero horizontal) salen del **CDN de la propia
fuente** (img.flixlat.com, img.peliculaplay.com, …) — el arte con el que los
sitios latinos sirven cada ficha. `b` (background) metahub vía tt. Las URLs
con espacios o caracteres no-ASCII (City of Stars, Black Umbrella) quedan
crudas como los 81 precedentes del catálogo: la app las sanea con
`PandoraApi.sanarUrlImg` (verificado: las 4 responden 200 codificadas).

## Enriquecimiento — SIN imdb.com

- **TVMaze** (search + `/shows/{id}/episodes`): años, estado, tt
  (`externals.imdb`) y nombres de episodio — *Below* (6 reales: "Come Home
  Year"…), *Yaga* (los 2 emitidos: "The Burning Man", "Dark Solstice").
  *Dead End* polaca = la entrada TVMaze tt19723990 («Pewnego razu na
  krajowej jedynce», Netflix 2022-12-01).
- **Cinemeta**: el endpoint search está ROTO (devuelve trending aleatorio y
  504 — descartado y documentado); el endpoint `/meta/{tt}` funciona y se
  usó para (a) nombres reales de episodio de *La peor vuelta al mundo*
  ("Married in VEGAS Ft. Chingu Amiga", "Put to Shame in CUBA"…, 8/8) y
  (b) verificar los tt de City of Stars y Black Umbrella.
- **tt faltantes** por rutas legítimas: Wikipedia es/en (link imdb del
  artículo: Honey tt0322589, Honey Don't! tt30645201) y **Wikidata SPARQL**
  (P345: Descendent tt35521703, The Man with the Answers tt9320140).
  Ojo técnico: es.wikipedia 403-bloquea el fingerprint TLS de urllib pero
  acepta curl — el fetch va por subprocess.
- **Investigación web** para años/identidad (es.wikipedia, Deadline,
  Disney+/Apple TV MX, todotvnews, mydramalist, abandomoviez, filmaffinity):
  Below = miniserie canadiense Netflix 08/10/2026; Yaga = estreno HBO Max
  23/10/2026 con 2 eps; Worst Trip = renovada S2 (Deadline 16/12/2025);
  Dead End = polaca de los zlotys; Honey = 2003 Jessica Alba.
- Nombres genéricos ("Episode 1", "Odcinek 1", "Special episode") se
  DESCARTAN: City of Stars y Dead End viajan sin `x` (los stills de TVmaze
  por tt igual llegan in-app).

## QA (asserts del build)

- 963 previos **byte-identical** (dict equality), 973 ids únicos.
- 0 wps superpuestos, wps nuevos 100% ASCII (los `[Audio-Latino]` del slug
  de Dead End son ASCII, pasan el relay tal cual).
- `x` ≤ `q`; `em=1` siempre con fuente viva.
- Rails: `enEmision` 211→214 (3 nuevas al frente: worst-trip, yaga,
  dead-end), `estrenos2026` 81→83 (below, yaga), `peliculas` 489→494,
  géneros append-only (12 géneros existentes, 0 claves nuevas).
- `v` 26 → 27.

## Jugabilidad verificada (spot-checks en vivo)

- 5/5 series: relay fresco → `mediaInfoList` → m3u8 HTTP 200 (3 calidades
  c/u). Probe del ÚLTIMO episodio en las 2 más largas: City of Stars ep
  12/12 y La peor vuelta al mundo ep 8/8 → 200.
- 5/5 pelis: m3u8 200 por variante primaria (latino, salvo Umbrella=sub).
- Arte: 30/30 HTTP 200 sin Referer (con sanear URL a lo app).

## Limitaciones documentadas

- *Yaga*: la fuente sirve 2/8 eps (estreno de ayer); el actualizador la
  pasea cada 4 días y sumará caps solos (`em=1`).
- *La peor vuelta al mundo*: sinopsis curada a mano (la fuente la trae en
  inglés); el resto del lote usa sinopsis es de la fuente.
- *Dead End*: TVMaze la marca "To Be Determined" → `em=1` por precedente
  (Running/TBD→1); si Netflix/source suma S2, el actualizador la detecta.
