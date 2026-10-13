# reto-v14 — El lote del usuario: de 104 fichas a 103 títulos jugables

> **Qué es esto.** La v14 incorpora el lote de enlaces recolectado por el
> usuario (93 líneas parseadas a 104 fichas tras corregir un bug del parser
> de dominios con guión: `latino.solo-latino.com`). Todo el trabajo duro se
> hizo sobre esos enlaces: BFS por el grafo de Hubs, variantes de
> audio/doblaje, temporadas consecutivas con enlaces por episodio, pósters
> latinos, landscape para el Hero, sinopsis con reparto, años, géneros y
> nombres de capítulos.

## Pipeline (5 fases, reproducible)

1. **Fichas** — 104 URLs de detalle (10 frentes de la red) bajadas vía relay
   (`/v1/pandora/detalle`): `fichas/*.json`.
2. **BFS** — grafo por título: `seasons[]` + `refList[]` (temporadas de la
   misma variante) + `dubbingList[]` (otras variantes de audio). 401 fuentes
   jugables verificadas con `mediaInfoList` (m3u8 firmado). En películas
   `seasons[]` es la FRANQUICIA (Infinity War → los 4 Vengadores), así que
   solo cuentan la ficha propia + su `dubbingList`.
3. **Metadatos** — IMDb id + año + título internacional (sugerencias IMDb,
   verificación de sinopsis con Cinemeta); series: TVMaze (premiered/ended/
   status + nombres de episodios). Coincidencias dudosas verificadas una a
   una contra la sinopsis de la ficha.
4. **Ensamblado** — 103 altas + 1 ya cubierto: `p` = póster vertical LATINO
   de la plataforma, `h` = landscape de la plataforma para el Hero,
   `b` = backdrop metahub (tt), `s` = sinopsis de la plataforma (incluye
   reparto), `g` = géneros en español de la plataforma, `r` = score,
   `al` = título original/internacional (buscador), `e[].x` = nombres de
   capítulos (TVMaze, recortados a los episodios hospedados).
5. **Cifrado** — `PENC1` compacto: 936 KB claro → 1,25 MB (v13: 1,07 MB).

## Inventario

- **399 títulos** en v13 → **502** (+44 series, +59 películas).
- **Fuentes por variante** (como en v13): `doblaje` → `sub` → `base`, todas
  jugables; `q` = episodios hospedados de la temporada (máx. entre variantes).
- **Rieles**: +59 peliculas · +15 enEmision · +20 mejores (r≥8,5) · +33
  imperdibles (r≥8,0) · +31 heroes · +1 estrenos2026 · +307 pares
  género→título.

## Hallazgos del trabajo duro (QA)

- **La caída de la casa Usher** (link del usuario) estaba MAL ETIQUETADA por
  la plataforma: el contenido real es el anime **Good Night World** (12 eps,
  intro del juego "Planet" / familia Akabane). Se incorporó con su identidad
  real; falta el link de la serie de Netflix para una futura versión.
- **Spider-Man (2002)** (link del usuario) es realmente **la serie animada
  de 1994** (5 temporadas, 65 eps — 13/14/14/11/13, coincide 1:1 con los
  episodios hospedados). Incorporada como tal (a=1994, f=1998).
- **The Boys** ya estaba 100 % cubierta en v13 (los 20 websiteParam del
  grafo ya existían): sin cambios, no se generó update.
- **La pareja perfecta** = *Perfect Match* (realidad, 12+10 eps), **Presunta
  inocente** = *Detained* (2024), **La quietud en la tormenta** = *La
  quietud* (Coixet, San Sebastián), **La Compensación** = *Redress* (2024,
  chef Michelin), **A ciegas** = *See for Me* (2022) — todas verificadas por
  sinopsis exacta contra IMDb/Cinemeta.
- **El suplente**: la plataforma puntuó la ficha 1,0 (glitch); se fijó a 6,3
  (IMDb) para no hundir el riel.
- **Pájaros de verano**: el websiteParam lleva acento (`Pájaros`) y el relay
  lo rechaza; en el catálogo viaja transliterado (`Pajaros`) — el frente lo
  resuelve igual (verificado).

## Formato (sin cambios respecto a v13)

`{ "i", "t", "al", "k", "tt", "p", "b", "h", "s", "a", "f", "r", "g", "em",
"e": [{ "n", "q", "x": [], "w": [{ "w", "v", "y" }] }], "w" (pelis) }` —
la app aplica el manifiesto con `fusionarCatalogo` (nunca borra; anexa
rieles; unifica fuentes por `websiteParam` y `q` máxima por temporada).
