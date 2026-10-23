# reto-v26 — Séptimo ingreso incremental vía cuevanae.ink + flms (956 → 963)

**La v26** (palabra del dueño): *"vamos por una v26"* con 8 URLs — seis de
`cuevanae.ink` (el frente integrado en v25) y dos de `ww1.123flmsfree.com`
(el frente `flms` de la red NovelHD). Instrucciones: extraer título,
sinopsis, temporadas, pósters "y todo lo que pueda ser extraíble",
enriquecer con **Cinemeta y TVMaze** (carátulas de capítulos, pósters en
buena calidad si es necesario, lo que la web no tenga), ingreso
**incremental** sin borrar nada, y scrapping de "temporadas posteriores y
anteriores".

## Qué se integró — +7 shows (23 temporadas, 353 episodios)

| Show | Años | Temporadas | Notas |
|---|---|---|---|
| **Silo** | 2023– | T1-T3 (10+10+10) | Apple TV+, `em=1` |
| **Ted Lasso** | 2020– | T1-T4 (10+12+12+10) | la T4 (2026) existe en la fuente, `em=1` |
| **Terapia alternativa** | 2021–2024 | T1 (10) | comedia española (Ended). La T2 real (2024) NO está hospedada — ver limitaciones |
| **Terapia sin filtro** (*Shrinking*) | 2023– | T1-T3 (10+12+11) | `em=1` |
| **The Blacklist** | 2013–2023 | T1-T10 (218 eps) | frente `flms`, T7 con 19 eps (como la real, recorte COVID) |
| **Prefiero la muerte** | 2026– | T1 (8) | en emisión AHORA (estreno 02/10/2026), `em=1` |
| **La maldición de Widow's Bay** (*Widow's Bay*) | 2026– | T1 (10) | `em=1` |

**Duplicado descartado: *Rooster*** — ya vive en el catálogo con el MISMO
websiteParam (`YiO48vnGfqrXimofIyVrU-Untitled-College-Project`, T1 q=10,
latino+base). El walk fresh confirmó cero cambios (mismas 2 fuentes, mismos
10 episodios): quedó byte-identical, sin tocar.

## La técnica

- **cuevanae.ink (6 shows)** — la técnica v25, ahora multi-temporada: el wp
  codifica la temporada (`cvne1-serie-silo-2023` … `cvne3-serie-silo-2023`)
  y la app (TV 3.30.39+ / Móvil 1.0.8+) resuelve cada episodio con el player
  determinista `videoapp.mov/e/tv/{tmdb}/{temp}/{ep}`. Títulos de episodios
  es-LatAm de la fuente ("Día de la libertad"…), sinopsis, géneros y score
  de la fuente; `tt` publicado por la propia fuente en `external_ids` →
  póster + background metahub y **carátulas de capítulos in-app** (TvmazeArts
  matchea por tt). Hero = backdrop TMDB w1280 de la fuente.
- **The Blacklist (flms)** — paseo BFS por los hubs `seasons[]` del relay:
  las 10 temporadas × variante [Audio Latino]. El relay no trae años ni
  nombres → **TVMaze** aportó años (2013–2023), estado (Ended) y los 218
  nombres de episodio (218/218); el `tt2741602` (externals de TVMaze) habilita
  póster metahub + carátulas de capítulos + reparto in-app. Hero de la fuente.
- **Enriquecimiento Cruzado (Cinemeta)** — verificación de años/estado para
  *Terapia alternativa* (2021–2024, Ended, T2 real de 7 eps según Cinemeta)
  y *The Blacklist* (2013–2023). *Prefiero la muerte* venía SIN géneros en
  la fuente → TVMaze aportó Comedia/Aventura/Horror.
- **Sin imdb.com como fuente** (regla del dueño): los tt salen de la propia
  fuente (cuevanae) o de los externals de TVMaze (Blacklist); años y estados
  de TVMaze/Cinemeta.

## Verificación en vivo (23/10/2026)

- **cuevanae 135/135 episodios jugables** — cadena completa episodio por
  episodio: `videoapp.mov` (Referer cuevanae.ink) → iframe `vimeos.net` →
  `stream_urls` → `master.m3u8` HTTP **200 sin headers** (480p+720p).
- **Blacklist 10/10 temporadas**: relay fresco → `mediaInfoList` con m3u8
  HTTP 200 (3 calidades por temp), eps 22/22/23/22/22/22/19/22/22/22.
- **Arte 21/21** (póster + background + hero de los 7 shows) HTTP 200 sin
  Referer.
- **QA de catálogo**: 956 shows previos byte-identical (dict equality),
  963 ids únicos, 0 wps superpuestos, wps 100% ASCII, x≤q, `em` solo con
  fuente (5 nuevas), rails `enEmision` 206→211 y `estrenos2026` 79→81 con
  las nuevas al frente, géneros append-only (sin claves nuevas).

## Rails y actualizador

- `enEmision` 205→**211**: silo, ted-lasso, terapia-sin-filtro,
  prefiero-la-muerte y maldicion-widows-bay al frente. El actualizador las
  pasea cada 4 días por su fuente preferida (la última temporada).
- `estrenos2026` 79→**81**: prefiero-la-muerte y maldicion-widows-bay.
- Detección de temporadas futuras: los `seasons[]` de la fuente — para
  cuevanae, `cvne{n}-serie-{slug}` con la MISMA lógica que la red; para
  Blacklist (Ended), nada que esperar.

## Limitaciones documentadas

- **Terapia alternativa T2**: la temporada 2 real (2024, 7 eps según
  Cinemeta) no está hospedada en cuevanae.ink — solo T1. Si la suben, el
  actualizador la detectará solo (`cvne2-serie-terapia-alternativa-2021`).
- **Blacklist sin variantes sub/doblaje**: los 10 nodos del hub son
  [Audio Latino]; no hay fuentes base/sub en la red para este show.
- Requiere **TV 3.30.39+ / Móvil 1.0.8+** para reproducir los 6 shows de
  cuevanae (la integración del sitio). Blacklist funciona en cualquier
  versión (frente `flms` clásico del relay).

## Archivos

- [`lote_v26.json`](lote_v26.json) — las 7 fichas tal como entraron al
  catálogo + verificación completa (jugabilidad 135/135 + 10/10, arte,
  enriquecimiento, QA).
