# reto-v31 — Noveno ingreso incremental: 66 series nuevas (973 → 1039)

**El pedido del dueño:** ingresar las series nuevas del TXT de Filemail
(`oexoihuxkhsnqwa`, 78 fichas) de manera **incremental** sobre el contenido
preexistente — sin borrar nada, sin shows repetidos — obteniendo de cada URL
los **distintos doblajes** (hubs/botones de cada página: sub español, audio
latino, doblaje español, castellano…), **portadas y sinopsis en español**,
**fondo landscape para el Hero**, **nombres de capítulos** y todo lo que la
arquitectura absorbe (fotos y sinopsis de capítulo viajan por TVMaze en
runtime). Solo catálogo remoto: `v` 30 → 31.

## Qué entró

**+66 series · 125 temporadas · 288 fuentes** (latino / sub / doblaje /
base por temporada, la app las muestra en el selector con su cascada 3.30.44).
Los 973 shows previos quedan **byte-identical** (QA con asserts). Rails:
`enEmision` 213 → **226** (13 nuevas al frente) + `generos` append-only.

El lote es prácticamente la cosecha 2022-2026 de la red: The Bear (T1-T5),
Bleach: Thousand-Year Blood War (T1-T4), The Legend of Vox Machina (T1-T4),
Star Trek: Strange New Worlds (T1-T4), Entrevías (T1-T4), Fire Country
(T1-T4), Tulsa King (T1-T4), The Lincoln Lawyer (T1-T4), The Cleaning Lady
(T1-T4), How I Met Your Father (T1-T2), Bel-Air (T1-T3), Heartstopper
(T1-T3), Big Boys (T1-T3), The Summer I Turned Pretty (T1-T3), 1923 (T1-T2),
Tokyo Vice (T1-T2), Halo (T1-T2), LOTR: The Rings of Power (T1-T2), Severance
(T1-T2, cuevanae), Cyberpunk: Edgerunners (T1-T2), The Terminal List (T1-T2),
Winning Time, Extraordinary Attorney Woo, Chainsaw Man, All of Us Are Dead,
Moon Knight, Pantheon, Alchemy of Souls, The Glory, las coreanas (Bad
Prosecutor, Cheer Up, Ghost Doctor, Island, My Liberation Notes, The Sound of
Magic, Under the Queen's Umbrella), las españolas (Bienvenidos a Edén, El
secreto de la familia Greco, Feria, Las de la última fila, El rey Vicente
Fernández), las latinas (42 días en la oscuridad, El primero de nosotros,
Narcosantos, Santa Evita) y las miniseries yanquis (The Offer, The Patient,
The Dropout, Inventing Anna, Pam & Tommy, Pistol, Paper Girls, We Own This
City, The Staircase, The First Lady, The Old Man, Shining Vale, The
Afterparty, Blockbuster, Big Mouth animado, Obi-Wan, Tales of the Jedi, Man
vs Bee, This Is Going to Hurt).

## La técnica (misma línea de v23/v24, con 3 extensiones)

1. **Fase 0** — parse del TXT + dedupe contra v30 por wp / ID de plataforma
   / título normalizado → **12 duplicados descartados** (House of the Dragon,
   Wednesday, Andor, Peacemaker, The Sandman, 1899, The Peripheral, A League
   of Their Own, El encargado, She-Hulk, The Gilded Age, The Serpent Queen —
   todos ya jugables en el catálogo).
2. **Fase 1+2** — BFS temporadas×variantes por relay con caché (los
   "hubs/botones" = `seasons[]` + `dubbingList`). Extensiones:
   - **URLs truncadas del TXT** (LOTR ROP y Winning Time cortadas en
     "Season-1[" / "…Season"): el ID queda intacto → fetch por ID (técnica
     Bastard!! S2). Ambas resolvieron completas.
   - **Tope `m` automático** (campo introducido en v30): si una variante
     hospeda menos caps que el total de la temporada (Fire Country T1 latino
     14/22, Shining Vale T1 6/8 y T2 7/8, The Staircase base 4/8, Bleach
     T3/T4, The Offer, Halo, The Glory…), `m` se fija solito para que la
     cascada de la app caiga a la siguiente variante en esos caps.
   - **Severance por la API de cuevanae.ink** (patrón matabot v25): S1 9/9 +
     S2 10/10 jugables vía videoapp.mov→vimeos, audio **Español (latino) +
     English** en el master (dual), wp `cvne1/cvne2-serie-severance-2022`,
     nombres de capítulo **en español de la fuente**.
3. **Fase 3** — enriquecimiento TVMaze ( IMDb **no se toca** ): años a/f,
   estado → `em`, nombres de capítulos (x) y **`tt` desde
   `externals.imdb` de TVMaze** (63/66) — el tt de los 3 restantes salió de
   Cinemeta/Stremio keyless (Feria tt13323004, My Liberation Notes
   tt15146130, El primero de nosotros tt14680796; misma técnica que Pa'
   Quererte en v24).

## Por qué el `tt` importa ahora (fotos y sinopsis de cada capítulo)

La app carga el arte de episodios con `TvmazeArts` (3.28.28): matchea TVMaze
por **IMDb id exacto** (pasada 1) o título+año (pasada 2, solo sin tt). Con
el `tt` puesto Y un `t` buscable en TVMaze, el match es 100 % y la app trae
sola: **still de cada capítulo, sinopsis de capítulo y reparto con fotos**.
Por eso los títulos nuevos llevan `t` = nombre original buscable (The Bear,
Chainsaw Man…) y `al` = es-LatAm cuando difiere (Caballero Luna, Estamos
muertos…). 66/66 con tt.

## Limpieza de cross-links (la red siempre intenta colar contenido ajeno)

- **The Afterparty**: el dubbingList de la página cross-linkeaba *Party Down*
  ("Fiesta hasta el final" T1-T3). El walk real es **T1 (seed, 8 caps) +
  T2 (10 caps)** — las fuentes de Party Down quedaron fuera.
- **Big Mouth**: la URL del dueño (`flixlat …Big-Mouth-Season-1`) **es el
  animado de Netflix** (8 temporadas, sinopsis de la pubertad, arte propio),
  NO el coreano *Big Mouse* (2022, 16 caps). Se ingresa con su identidad
  real (T1-T8 × 3 audios). Si el dueño quiere el coreano, hace falta su URL.
- **Slow Horses**: vino **sin URL** en el TXT y el endpoint de búsqueda de la
  red está caído (`buscar` devuelve vacío en los 10 sitios, relay y worker) —
  los IDs son aleatorios, no se puede adivinar. Excluido y documentado; con
  la URL entra en cualquier parche.

## Curaturas a mano

- **16 sinopsis re-escritas** (traducciones rotas del sitio): The Offer,
  Tokyo Vice, This Is Going to Hurt, The Cleaning Lady, The Summer I Turned
  Pretty, Big Mouth, Blockbuster (la del sitio era un delirio con nombres
  inventados), We Own This City, Obi-Wan, The Dropout, Bel-Air, Heartstopper
  ("un exceso de húmedo"…), Pam & Tommy, Shining Vale, El rey Vicente
  Fernández y The Staircase.
- **El rey, Vicente Fernández**: TVMaze dice "Running" pero la biografía
  está cerrada (36/36 caps hospedados) → `em=0` curado a mano.
- Títulos es-LatAm curados (Woo, una abogada extraordinaria · Rey Tulsa ·
  Historias de los Jedi · Tiempo de victoria…).

## QA

- 973 previos **byte-identical** (assert), 1039 ids únicos, 0 wps en
  colisión, wps 100 % ASCII (relay-safe).
- `x ≤ q` en las 125 temporadas; `m` solo en variantes con menos caps que
  la temporada; `em=1` siempre con fuente en la última temporada.
- Rails intactos salvo `enEmision` (213→226) y `generos` (append-only).
- **Spot-checks en vivo**: arte 132/132 HTTP 200 (póster + hero landscape de
  los 66); jugabilidad 26/26 por relay (1er y último cap de 16 shows, m3u8
  200 + `currentEpisodeNumber` correcto); Severance 3/3 (S1E1, S1E9, S2E1,
  master dual Español/English).
- PENC1 + roundtrip verificado.

## Rollout

`v` 30 → 31: las apps absorben el manifiesto en ≤6 h o con "Actualizar
catálogo". La fusión es aditiva — nada de lo existente cambia. Severance
requiere TV 3.30.39+ / Móvil 1.0.8+ (soporte cuevanae); el resto funciona
en cualquier versión reciente (los topes `m` los aprovecha la 3.30.44 pero
las apps viejas los ignoran sin romperse).

## Archivos

- [`cambios_v31.json`](cambios_v31.json) — los 66 shows con sus temporadas,
  fuentes, topes m, tt y estado.
- [`walk_v31.json`](walk_v31.json) — el walk completo de la red (65 series).
- [`enrich_v31.json`](enrich_v31.json) — TVMaze/Cinemeta por show.
- [`duplicados_v31.json`](duplicados_v31.json) — los 12 ya presentes + los
  casos no estándar (Slow Horses sin URL, URLs truncadas).
