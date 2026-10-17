# reto-v18 — el lote de las 98 fichas: +92 títulos de una sola pasada

> **Qué es esto.** La v18 incorpora el lote de enlaces recolectado por el
> usuario (98 fichas de detalle sobre los 10 frentes de la red). Sobre esos
> links se recorrió el **grafo de Hubs** de cada una (`seasons[]` ×
> `dubbingList[]` — temporadas × variantes de audio) vía relay, extrayendo
> episodios hospedados, variantes de doblaje/sub/base, pósters y arte
> landscape para el Hero. **610 → 702 títulos.** Sin rebuild del APK.

## Qué viaja en el manifiesto v18

- **92 shows nuevos** (84 series + 8 películas) + **4 refrescados** que ya
  estaban en la v17 con las MISMAS fuentes (The Penguin, Dune: La profecía,
  Dept. Q, The Continental → ids idénticos, merge de metadatos).
- **98 fichas → 96 shows**: Run the World (T1+T2, dos URLs del usuario) y
  Big Shot (T1 flixlat + T2 solo-latino) se fusionaron en un solo show cada
  una.
- **201 temporadas · 2.060 episodios · 486 websiteParams verificados
  jugables** (episodeVo + mediaInfoList presentes, spot-check 12/12 OK vía
  relay).
- **Variantes de audio del lote**: 162 [Audio Latino] · 114 [Sub Español] ·
  210 base — que en este lote incluye [Audio en inglés], [Audio en
  Portugués-BR], [Audio en turco] y **3 [Audio Castellano]** (español
  España: Virtual Hero T1/T2 y Lucrecia: A Murder in Madrid) como fuentes
  alternas por capítulo. Los SRT de la variante sub se prestan a las demás
  versiones (mecanismo 3.30.1 de la app).
- **Metadatos**: sinopsis (es), año de inicio/fin, score de la red, géneros
  mapeados a los rieles canónicos, título alternativo original y **91/92
  con IMDb tt** (póster metahub + backdrop; el único sin tt — la peli china
  *El último zombi* — usa el arte vertical/horizontal del propio sitio).
- **Hero**: cada show nuevo trae `h` (coverHorizontalUrl del frente) para el
  carrusel de heroes de Pandora.
- **Nombres de capítulos** (TVMaze, `x[]`) en 78 shows, solo donde el
  conteo cuadra con los episodios hospedados (QA: se descartaron los
  desacoplados — The Circle, Milo Murphy, Inhumans, DBS Beerus, etc.).
- **En emisión (`em=1`)**: Department Q (ya estaba), **Hollywood Arts**
  (updateStatus 3), **Dragon Ball Super: Beerus** (miniserie 2026, 1 ep
  rodando) y **Dune: La profecía** (S2 2026 en camino) → el actualizador
  las pasea cada 9 días.
- **QA de fichas**: "Mucho más que listos" es *Pretty Smart* (2021) según
  la propia plataforma (el wp dice Pretty-Smart); "Dragon Ball Super:
  Beerus" es el recut mejorado 2026 (IMDb tt39395275, miniserie); "Dare Me"
  = *Rétame*; "Kevin Can F\*\*k Himself" = *Que te den, Kevin*; las 5
  sinopsis que viajaban en inglés se reemplazaron por las variantes latinas
  de la misma red (Cloak & Dagger traducida).

## Rieles (append con dedupe, nada se saca)

| Riel | Antes | Ahora |
|---|---|---|
| peliculas | 310 | **318** (+8) |
| heroes | 112 | **149** (+37 series score ≥ 7.5 con arte landscape) |
| imperdibles | 85 | **107** (+22 score ≥ 8.0) |
| mejores | 60 | **72** (+12 top del lote) |
| enEmision | 111 | **114** (+3) |
| estrenos2026 | 74 | **75** (+DBS Beerus) |
| topRT | 10 | 10 (intacto, curado a mano) |
| géneros | 26 claves | 26 claves (ids anexados) |

## Compatibilidad

El manifiesto viaja **cumulativo** (los 610 shows de la v17 intactos, ids
idénticos; la fusión del cliente nunca borra). Los clientes aplican cuando
`v > v_aplicada`: descarga cifrada cada 6 h o "Actualizar catálogo" →
`+92 títulos nuevos · 4 actualizados`. Reproducción por el camino de
siempre: `/es/detail/{drama|movie}/{websiteParam}` → relay/directo →
`mediaInfoList` → ExoPlayer.

## Pipeline reproducible

1. Descifrar `catalog.json` (PENC1, v17, 610 shows).
2. Parsear la lista del usuario (98 URLs → siteKey/tipo/wp, wps
   URL-decodeados a la forma canónica con corchetes).
3. BFS por ficha vía relay (`detalle?site=&tipo=&wp=&ep=`): pageProps →
   `seasons[]` (todas las temporadas) → por temporada `dubbingList` (todas
   las variantes de audio) → verificación de `episodeVo`/`mediaInfoList`
   por websiteParam (cache en disco, reintentos con backoff).
4. Enriquecimiento: IMDb suggestions (tt/años/título original) + TVMaze
   (nombres de episodios, premiered/ended) + verificación manual de los tt
   ambiguos (The Dig, The Strays, Sister Death, Varsity Blues, Stolen
   Vacation, Death's Roulette, DBS Beerus…).
5. Construcción del manifiesto cumulativo v18 + rieles + géneros mapeados.
6. QA automatizado (esquema, fusión simulada, sin shows v17 perdidos, rieles
   sin ids fantasma, spot-check de jugabilidad y de imágenes 54/54 OK).
7. `v=18`, cifrado PENC1, roundtrip verificado, push + tag.

Listado de los 96 shows del lote (92 nuevos + 4 refrescados):
[`lote_v18.json`](lote_v18.json) (extraído del manifiesto publicado).
