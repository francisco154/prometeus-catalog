# reto-v24 — 33 shows nuevos (922 → 955)

Ingreso incremental de la lista del dueño (47 URLs, TXT
`Ingreso_Pandora_catálogo`): **32 series + 1 película**, con paseo de
temporadas × variantes de audio por los hubs de cada URL, póster / hero /
sinopsis / géneros / score de la fuente original, años + estado + nombres
de episodios vía TVMaze (sin IMDb; año de *Pa' Quererte* vía Cinemeta y el
de la película *Invasión* verificado en la web). **77 temporadas, 192
fuentes**, todas jugables y con arte verificado (99/99 URLs HTTP 200, 20/20
m3u8 de muestra con token fresco). Rail `enEmision` 199 → 205 (6 nuevas),
rail `peliculas` 488 → 489. `v` 23 → 24. Sin borrar ni mutar nada: los 922
shows previos quedan byte-identical y en el mismo orden (QA con asserts).

Archivos: [`cambios_v24.json`](cambios_v24.json) (reporte por show),
[`walk_v24.json`](walk_v24.json) (paseo completo), [`enrich_v24.json`](enrich_v24.json)
(TVMaze), [`duplicados_v24.json`](duplicados_v24.json) (descartes).

## Duplicados descartados (12) — cero superposición

Detectados por wp / ID de plataforma / título normalizado contra las 4.666
fuentes del catálogo v23: *Deadly Class, Resident Alien, Chucky,
Yellowjackets, Wednesday (Merlina), Gen V, Bodies, Mrs. Davis, Fallout,
3 Body Problem (El problema de los 3 cuerpos), The Acolyte, Alien: Earth*.
Todas ya estaban ingresadas (la mayoría desde la v23 con las mismas URLs).

## Excluidos con causa documentada

- **Murderbot (2025)** — la URL del dueño apunta a `cuevanae.ink`, un sitio
  que NO pertenece a la red Pandora (la app solo reproduce los 9 sitios
  soportados por el relay: flms, playspelis, pelicula, sololatino, dramas,
  flixlat, peliculaplay, cuevana4br, cuevana19, movies321). Se buscó
  "murderbot/matabot/robot asesino" en los 9 sitios vía `/v1/pandora/buscar`
  sin resultados → no hay forma de alojarlo jugable.
- **Doctor Who "Season 14"** — la segunda URL del dueño
  (`dkWUuSYhq…Doctor-Who-Season-14`) resulta ser la **T1 2005 mal
  etiquetada**: se verificó descargando los subtítulos de la página
  (E1 = "Rose" — "Wilson, I've got the lottery money", E13 = "Bad Wolf").
  Como el show ya tiene la T1 con 3 audios, la ficha se descarta para no
  duplicar contenido. El Doctor Who ingresado es el del primer seed:
  **T1-T13 completas** (la revival 2005-2022, 40 fuentes: latino / sub /
  pt-BR por temporada) descubiertas a través del hub latino
  "Doctor Who Temporada 1" enlazado por dubbingList.
- **Snowpiercer T4** — las 2 fuentes de la "temporada 4" del sitio son en
  realidad páginas de *El Senyor dels Anells: Els anells de poder 2* (LOTR:
  Los Anillos del Poder S2, cross-link de la red). Temporada descartada;
  Snowpiercer queda con sus T1-T3 reales.
- **Day of the Dead, fuente "base"** — la página `QczWEBtp…Day-of-the-Dead`
  es en realidad *My top secret career* (serie china, 38 eps, cross-link).
  Queda con sus fuentes latino y sub reales (10 eps).

## Detalles del paseo

- **Doctor Who** es la joya: del seed S12 (solo sub) se expandió por
  dubbingList al hub latino y de ahí a **13 temporadas × 3 audios**. Los
  q varían por variante (p. ej. T7: latino 15 / sub 13 — la red mete
  especiales sueltos en algunas páginas); el q publicado es el de la
  fuente preferida por la app (latino > doblaje > sub > base).
- **Georgie & Mandy**: T1 (22 eps), T2 (latino 10 / sub 22) y **T3 con 2
  eps** (S3 en emisión, TVMaze Running) — el actualizador irá sumando caps.
- **La primera vez** (Eva Lasting): T1-T4 (13/10/10/12) — coincide exacto
  con TVMaze (la T4 final de 2026 sí existe).
- **La película Invasión** (España, 2024, Prime Video): el wp lleva "ó" y el
  relay lo rechaza → se guarda saneado por ID
  (`IMlkZGNc9ZuuEEDawNjOo-Invasion`, técnica del parche Bastard!! S2). El
  dubbingList de sololatino cross-linkea una película distinta (*Invasive*)
  — descartada por comparación de sinopsis/cover; queda con su fuente sub.
- Temporadas placeholder del sitio (Doctor Who S1-S11/S13 desde el seed
  sub, con 0 eps) se filtran: solo se hornean temporadas con episodios.
- Variantes "[Audio Portugués-BR]" y "[Audio Castellano]" se clasifican
  como `base`/`doblaje`-según-app: la app prioriza latino > doblaje > sub >
  base, y las páginas pt-BR quedan como base (igual que el precedente
  "[Audio-pt-BR]" de Bridgerton ya existente en el catálogo).

## Títulos curados (es-LatAm)

*La rueda del tiempo* (al: The Wheel of Time), *Georgie y Mandy: Su primer
matrimonio* (al: Georgie & Mandy's First Marriage), *La primera vez* (al:
Eva Lasting), *Alice in Borderland* (al: Alicia en el país de las
fronteras), *The Stand* (al: La danza de la muerte), *Snowpiercer* (al:
Snowpiercer: Rompenieves), *Warrior Nun* (al: La monja guerrera), *Doom
Patrol* (al: La patrulla condenada), *The Devil's Hour* (al: La hora del
diablo), *The Ark* (al: El Arca), *Parasyte: The Grey* (al: Parasyte: Los
grises), *The Peripheral* (al: La periferia), *Another Life* (al: Otra
vida), *Ojitos de huevo* (2023-Running, S2 en 2024), *Sweet Home* (al:
Dulce hogar). Sinopsis curadas a mano en 4 casos donde la fuente tenía
traducciones rotas (Doctor Who, Doom Patrol, La primera vez, La rueda del
tiempo).

## em (en emisión) — 6 nuevas

Running/TBD según TVMaze: *Ojitos de huevo, Georgie y Mandy, The Devil's
Hour, The Ark (TBD), Twisted Metal, Moving (TBD)*. El resto terminadas.
Doctor Who queda `em=0` (el bloque 2005-2022 hospedado está completo; la
era Disney+ no está en la red). Wheel of Time `em=0` (TVMaze Ended; la
T4 final no está en la fuente).
