# reto-v19 — el lote de las sagas completas: +171 títulos, IMDb al bote

> **Qué es esto.** La v19 incorpora el lote de enlaces del usuario (102
> fichas de detalle) y **completa las sagas** recorriendo el grafo de Hubs
> (`refList[]` × `dubbingList[]` — secuelas/precuelas × variantes de audio)
> vía relay. **702 → 873 títulos.** Sin rebuild del APK.
>
> **IMDb quedó PROHIBIDO por el usuario para esta versión** (ni scraping ni
> metahub): los años y títulos originales salen de **TMDB web** (scraping
> del search server-rendered, sin API) y todo el resto (pósters reales,
> Heroes horizontales, sinopsis, scores, nombres en Español Latino) sale de
> **la propia red** vía relay. Los shows nuevos viajan **sin `tt`** — el
> póster vertical `p` y el hero `h` apuntan directo al CDN de cada frente.

## Qué viaja en el manifiesto v19

- **171 shows nuevos** (170 películas + 1 serie) con **1.036 websiteParams
  verificados jugables** (episodeVo + mediaInfoList en cada uno, spot-check
  14/14 OK vía relay).
- **Las 102 fichas del TXT** del usuario, todas incorporadas. El BFS de
  `refList` descubrió el resto de cada saga (69 shows extra).
- **Sagas completas** (el grafo las cierra solito):
  - **James Bond: LAS 25** — de *El satánico Dr. No* (1962) a *Sin tiempo
    para morir* (2021). Hasta 30 fuentes por película en 5 frentes.
  - **Insidious** 6 (de *La noche del demonio* a *Están entre nosotros*, 2026)
  - **El conjuro** 4 · **28 días/sem./años después** 4 (incluye *El templo
    de huesos*, 2026) · **Destino final** 6 · **Matrix** 4 · **Bourne** 5 ·
    **Planeta de los simios** (reboot) 4 · **Alien** 4 · **Mini espías** 5 ·
    **Scary Movie** 6 (incluye el reboot *Terroríficamente incorrecta*, 2026)
    · **Shrek** 4 · **Madagascar** 3 · **Kung Fu Panda** 4 · **Cómo entrenar
    a tu dragón** 3 · **Intensa-mente** 2 · **Zootopía** 2 · **Black Phone** 2
    · **Resacón** 3 · **Kingsman** 3 · **Pitch Perfect** 3 · **Anchorman** 2 ·
    **Bruce/Evan Almighty** 2 · **Quiero matar a mi jefe** 2 · **Chicas
    malas** 2 · **Jumanji** 2 · **Deadpool** 3 · **Rebel Moon** 2 (corte del
    director + theatrical fusionadas como fuentes) · **Jump Street** 2.
  - **Serie nueva**: *¿Quién es el topo?* (The Mole 2022, Netflix) — **T1+T2
    (10+10 eps, 3 fuentes por temporada)** con nombres de capítulos de
    TVMaze (IMDb prohibido).
- **Variantes de audio del lote**: 292 [Audio Latino] · 265 [Sub Español] ·
  479 base ([Audio en turco] / [Audio Portugués-BR] / [Audio en inglés] /
  sin prefijo). En este lote **no apareció ninguna variante [Castellano] ni
  [Doblaje Español]** — el selector las sigue mostrando como "Original /
  otros idiomas". Los SRT de la variante sub se prestan a las demás
  versiones (mecanismo 3.30.1 de la app).
- **Nombres en Español Latino** (los de la propia red): *Hermanos por
  pelotas*, *Como Dios*, *Quiero matar a mi jefe*, *El satánico Dr. No*,
  *Resacón en Las Vegas*, *Sonríe 2*, *Pecadores*, *Exterminio*…
  Correcciones de títulos erróneos evidentes: "Black Friday"→*Thanksgiving*,
  "Instintos ocultos"→*Voyagers*, "Extermínio"→*Exterminio*.
- **Pósters reales + Hero horizontal** del CDN de cada frente (41 URLs con
  espacios/paréntesis/CJK en el nombre de archivo quedaron percent-
  encodeadas — verificadas 12/12 con GET 200).
- **Metadatos**: sinopsis (es, de la red), año de estreno y título original
  (TMDB web), score de la red, géneros mapeados a los rieles canónicos.

## Rieles (append con dedupe, nada se saca)

| Riel | Antes | Ahora |
|---|---|---|
| peliculas | 318 | **488** (+170) |
| heroes | 149 | **200** (+51 score ≥ 7.5 con hero landscape) |
| imperdibles | 107 | **133** (+26 score ≥ 8.0) |
| mejores | 72 | **85** (+13 top del lote ≥ 8.5) |
| enEmision | 114 | 114 (sin series nuevas en emisión) |
| estrenos2026 | 75 | **79** (+Scary Movie 2026, Exterminio: El templo de huesos, La noche del demonio: Están entre nosotros, Proyecto Fin del mundo) |
| topRT | 10 | 10 (intacto, curado a mano) |
| géneros | 26 claves | 26 claves (ids anexados) |

## Exclusiones documentadas

- **Barbie animada** (43 fichas del hub de cuevana4br): franquicia distinta
  de *Barbie* (2023), no son secuelas/precuelas del título pedido.
- **Dune: Parte Tres**: ficha placeholder de la red **sin episodios
  hospedados** (no jugable) — se queda afuera hasta que tenga fuentes.
- **Alien³**: el relay rechaza el `³` del websiteParam ("wp inválido") y el
  acceso directo está tras Cloudflare — inaccesible por ahora. El resto de
  la saga Alien sí entró.
- **MaXXXine**: el hub de X (2022) no la lista y el buscador de la red no
  responde vía relay (búsqueda JS del lado cliente).
- **El Libro** y **Porno para principiantes**: sin año (títulos no listados
  en TMDB o con homónimos que no cuadran — la de la red es la argentina de
  Víctor X, no la estadounidense de 2019).

## Compatibilidad

El manifiesto viaja **cumulativo** (los 702 shows de la v18 intactos, ids
idénticos; la fusión del cliente nunca borra). Los clientes aplican cuando
`v > v_aplicada`: descarga cifrada cada 6 h o "Actualizar catálogo" →
`+171 títulos nuevos`. Reproducción por el camino de siempre:
`/es/detail/{movie|drama}/{websiteParam}` → relay/directo →
`mediaInfoList` → ExoPlayer. Los shows nuevos **sin `tt`** no usan metahub:
`p`/`h` apuntan al CDN del frente (mismo arte que ve el usuario en la web).

## Pipeline reproducible

1. Descifrar `catalog.json` (PENC1, v18, 702 shows) — clave XOR del repo
   principal, AES-256-GCM, roundtrip verificado.
2. Parsear el TXT del usuario (102 URLs → siteKey/tipo/wp).
3. Descargar las 102 fichas vía relay (`detalle?site=&tipo=&wp=`) con
   caché en disco.
4. **BFS de sagas**: frontera = `refList[]` (hubs) + `dubbingList[]`
   (variantes) de cada ficha → oleada 2 sobre lo descubierto → **1.041
   detalles cacheados**, todos validados (episodeVo + mediaInfoList).
5. Agrupar por slug canónico (prefijos numéricos de 4+ dígitos fuera;
   fusiones documentadas: Shrek/Shrek-1, Shrek-4/Forever-After,
   Rebel Moon DC/theatrical, Mean-Girls-Season-2/Mean-Girls-2…).
6. Enriquecimiento **TMDB web** (sin API, sin IMDb): año, título original,
   verificación de identidades ambiguas (Scary Movie 2000 vs reboot 2026,
   Joy Ride 2001 vs 2023, HTTYD 2010 vs remake 2025, Nosferatu 2024, The
   Mole TV). Nombres de episodios: TVMaze.
7. Construcción del manifiesto cumulativo v19 + rieles + géneros.
8. QA automatizado: esquema, ids únicos, shows v18 intactos bit a bit,
   rieles sin ids fantasma, roundtrip JSON, spot-check de jugabilidad
   (14/14) e imágenes (43/44 → fix de encoding → 12/12).
9. `v=19`, cifrado PENC1, roundtrip verificado, push + tag.

Listado de los 171 shows del lote: [`lote_v19.json`](lote_v19.json)
(extraído del manifiesto publicado).
