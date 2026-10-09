# 02 · Parámetros y estado en común de todo el contenido de la red

Segundo objetivo del reto: **encontrar los parámetros que comparte todo el
contenido** y **el estado en común**. Extraído de 500+ detalles reales
(cache de sesiones anteriores + verificaciones en vivo de esta sesión).

## 1. Parámetros en común (el contrato de cada ficha)

Todo título de la plataforma — película o serie, en cualquiera de los 10
frentes — se describe con el MISMO conjunto:

### websiteParam (wp) — la identidad jugable
```
<paramId>-<Slug>
   · paramId: 21 caracteres [A-Za-z0-9], aleatorio (496 muestras analizadas:
     correlación con el id numérico = 0; no derivable)
   · Slug: título en inglés con guiones ("Stranger-Things-Season-1"),
     a veces con sufijos de versión ("…Season-1[Audio-Latino]")
   · GLOBAL: el mismo wp funciona en los 10 frentes
```
Ejemplo real: `AUk2ZT5yzt1LVRajd5jCd-Stranger-Things-Season-1`

### dubbingList — todas las versiones de audio del MISMO título
Cada versión es una entrada propia de la plataforma (su propio wp). Para
`Stranger Things S1` en flixlat el detalle devuelve 4:
```
[Doblaje Español] …  o2BWePWkfHHiR8Fyf6ibt-Stranger-Things-Season-1
[Doblaje Español] …  AUk2ZT5yzt1LVRajd5jCd-Stranger-Things-Season-1  (la actual)
…                   4WbXiNQ07PchiKKvA0P1A-Stranger-Things-Season-1
[Sub Español] …     iMAi3JS8COlY5F121MDrc-Stranger-Things-Season-1
```
→ es el mecanismo con el que el catálogo arma las fuentes múltiples por
temporada: `{ "w": …, "v": "doblaje"|"sub"|"base", "y": "<frente>" }`.

### refList — el "hub" de familia
- **Series**: las demás TEMPORADAS de la misma serie (cada una con su wp).
- **Películas**: los demás títulos de la FRANQUICIA (p. ej. el detalle de
  `Toy Story 1` trae los 5 Toy Story con sus wps).
→ así se construyen los hubs de la app: una ficha abre y el hub ofrece el
resto de la familia sin búsqueda.

### seasons[] — una entrada por temporada
`{ name, seriesNo, websiteParam, active, episodes[] }` — cada temporada de
la misma serie tiene SU PROPIO websiteParam. `seasonText` define el
template ("Temporada {{n}}", "Parte {{n}}").

### episodeVo + subtitlingList — episodios y subtítulos
`episodeVo[] = { seriesNo, movieNo, active, subtitlingList[] }` con
`subtitlingList[] = { language, languageAbbr, url }` (VTT por episodio;
`subtitleLang: "es"` y `subtitlesType` a nivel ficha).

### mediaInfoList — los streams
URLs m3u8 (`vod-limit-*`, `r-limit`) con `auth_key` temporal (expira):
```
https://vs7z-limit.dramasfree.com/<hash>/<hash>-sd.m3u8?auth_key=<ts>-<h>-0-<h>&exp=<ts>
```
Sirven a cualquier IP — ExoPlayer los reproduce directo.

### Portadas
`coverVerticalUrl` / `coverHorizontalUrl` bajo `img.<frente>` (dominio
abierto) — es el `h` del catálogo. Los nombres de archivo de la plataforma
traen marcas del equipo de contenido (p. ej. `…墨西哥西班牙语_海报_….jpg`
"español de México_póster").

## 2. Estado en común (los campos de estado que comparten los títulos)

| Campo | Valores | Para qué sirve en Prometeus |
|---|---|---|
| `updateStatus` / `updatePeriod` | estado/periodo de actualización de la plataforma | alimentan el riel "en emisión" y el actualizador (badge NUEVO, ventana 9 días) |
| `dubMode` | "1" … | versión de audio activa de la ficha |
| `subtitleLang` / `subtitlesType` | "es" / tipo | pista de subtítulos por defecto |
| `category` / `domainType` | 0=película, 1=serie | tipo del lado de la plataforma |
| `score` | 0–10 | rating (`r`) |
| `status` (tvmaze) / rango de años (cinemeta) | Running / TBD / Ended; "2023–" | deriva `em` (en emisión) y `f` (año fin) del catálogo |

**La regla de estado que usa el catálogo:**
`em = 1` ⇔ el rango de años queda abierto ("2023–") o el estado es
Running/TBD. Eso mete la serie en el riel "en emisión" y la deja bajo el
"micro-algoritmo" que refresca capítulos nuevos cada ciclo (9 días + 12 h).
En las 3 series del reto: `Special Ops: Lioness` quedó `em=1` (TBD, "2023–");
`A Shop for Killers` (2024–2026, cerrado) y `Too Much` (2025, Ended) quedaron
sin `em`.

## 3. "Pasear" temporadas / doblajes / subtítulos (procedimiento canónico)

Una vez que se conoce UN wp (de cualquier temporada), todo lo demás se
deriva sin búsqueda:

1. `detalle?site=X&tipo=drama&wp=<wp>` → ficha completa.
2. `seasons[]` → **todas** las temporadas con sus wps (el hub de la serie).
3. `dubbingList` → todas las versiones doblaje/sub de ESA temporada
   (se repiten por temporada).
4. `detalle` por temporada → `episodeVo` (números, activos) y
   `subtitlingList` (VTT por episodio).
5. `mediaInfoList` (por episodio con `&ep=`) → m3u8 con auth_key.
6. Con eso se arma la entrada del catálogo: `e[].w = [{w, v, y}, …]`.

Ese es exactamente el circuito que históricamente cerraban los notebooks
del usuario (wp semilla) — y el que la v12 documenta como pendiente para
las 3 series nuevas (ver `03-algoritmo-busqueda.md`).
