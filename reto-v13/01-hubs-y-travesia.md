# 01 · Los Hubs de la plataforma y cómo se recorrieron

## 1. El punto de partida: 3 fichas

El usuario entregó la URL de detalle de cada serie (el punto exacto donde
la v12 quedó bloqueada):

| Serie | Frente | URL de la ficha |
|---|---|---|
| A Shop for Killers | Solo Latino (`sololatino`) | `latino.solo-latino.com/es/detail/drama/gXaEzoUws6zze8WWpDLbI-A-Shop-for-Killers-Season-1/1` |
| Too Much | PlaySpelis (`playspelis`) | `video.playspelis.com/es/detail/drama/P2QRFFA2pEiwYc8SGTcQK-Too-Much/1` |
| Special Ops: Lioness | FlixLat (`flixlat`) | `flixlat.com/es/detail/drama/Op7aDO5V0eUhkkBBsVOMb-Special-Ops-Lioness-Season-1/1` |

El dato clave que ya se conocía de la auditoría v12: **las páginas de
detalle sirven a cualquier IP** mientras que las listas (home/search/
categorías) se sirven vacías a IPs de datacenter. La ficha es la puerta
de entrada perfecta: contiene el grafo completo del título.

## 2. Transporte

- **Directo** desde el entorno de build: bloqueado (Cloudflare 403) —
  mismo comportamiento documentado en `reto-v12/01`.
- **Relay** `prometeus-server` (Render, egress AWS): endpoint
  `GET /v1/pandora/detalle?site=<frente>&tipo=drama&wp=<websiteParam>[&ep=N]`
  que pide la página al sitio, extrae el `__NEXT_DATA__` y devuelve el
  `pageProps` en JSON. Todas las fichas de este reto se obtuvieron así,
  con reintentos y caché en disco (un archivo `raw_*.json` por
  `websiteParam`, 19 en total).

## 3. Anatomía de una ficha (`pageProps`)

Campos que forman el grafo (los Hubs):

| Campo | Qué es | Cómo se usa |
|---|---|---|
| `websiteParam` | identidad de ESTA ficha (slug `id-título[-Season-N]`) | es el `w` del catálogo |
| `name` | nombre con prefijo de variante: `[Doblaje Español]…`, `[Sub Español]…` o sin prefijo | define la etiqueta `v` (`doblaje`/`sub`/`base`) |
| `seriesNo` | número de temporada de esta ficha (`null` en series de una sola temporada, que traen `seasons[0].name = "not_season"`) | asigna la fuente a la temporada del catálogo |
| `seasons[]` | **Hub de temporadas**: cada temporada de esta versión con su propio `websiteParam` | aristas del BFS (una por temporada) |
| `refList[]` | referencias (temporadas/franquicia) — en estas series duplica a `seasons[]` | aristas alternativas |
| `dubbingList[]` | **Hub de audios**: todas las variantes de doblaje/sub del mismo título, cada una con `websiteParam` propio | aristas del BFS (una por variante) |
| `episodeVo[]` | episodios hospedados: número, calidades (`definitionList` 720P/540P/360P), tamaños, foto representativa | `q` de la temporada (cantidad real) |
| `currentSeason.episodes[]` | número, descripción e `imageUrl` (foto representativa) de cada episodio | la app lo usa en runtime para la lista de episodios |
| `mediaInfoList[]` | m3u8 firmado por calidad (token de sesión) | prueba de jugabilidad (la app lo re-resuelve al reproducir) |
| `coverVerticalUrl` / `coverHorizontalUrl` | arte 2:3 y 16:9 de la plataforma | `h` del catálogo (Hero) |
| `updateStatus` / `introduction` / `tagNameList` / `score` | estado de emisión, sinopsis, géneros, nota | ya venían de la v12 vía IMDb/TVmaze |

## 4. El algoritmo (BFS en anchura)

```
para cada serie (slug, frente, ficha inicial):
    cola ← [ficha inicial]
    mientras cola no vacía:
        wp ← pop(cola)
        ficha ← relay(frente, wp)          # con caché y reintentos
        registrar: name → etiqueta v · seriesNo → temporada ·
                   episodeVo → q · mediaInfoList → jugable
        encolar todos los wp de ficha.seasons[]      # Hub de temporadas
        encolar todos los wp de ficha.dubbingList    # Hub de audios
```

- Visitados por `websiteParam` (el mismo wp aparece en varios `dubbingList`
  — el grafo es denso pero finito: 19 nodos en total).
- Poda natural: los `dubbingList` de las fichas de una serie referencian
  siempre variantes de la misma serie (mismo `id` de título); ningún
    salto salió del conjunto de la serie.
- Regla de asignación de temporada: `seriesNo` si existe; si es `null`
  (serie de una temporada) → temporada 1. Un caso especial: la variante
  base de Lioness T2 (`uHCZ96…-Lioness-Season-2`) trae `seriesNo: null`
  pero su nombre dice "Temporada 2" — se asigna por el nombre del wp.

## 5. Etiquetado de variantes (`v` del catálogo)

| Prefijo del `name` en la ficha | `v` | Etiqueta en la app |
|---|---|---|
| `[Doblaje Español]…` | `doblaje` | Español doblado |
| `[Sub Español]…` | `sub` | Sub español |
| sin prefijo | `base` | Original / otros idiomas |
| `…[Audio-pt-BR]` | `base` | Original / otros idiomas (portugués) |

El orden de las fuentes en `w[]` importa: la primera es la fuente
principal que la app elige por defecto → `doblaje` primero, `sub`
segundo, `base` después.

## 6. Por qué esto cierra el circuito de la v12

La v12 no podía descubrir `websiteParam`s porque las listas están
bloqueadas. La v13 demuestra que **con una sola ficha por serie basta**:
el grafo `seasons[]` × `dubbingList` expone desde ahí TODAS las
temporadas y TODAS las variantes de audio. Es más, el mismo algoritmo
sirve para cualquier serie futura: dado cualquier link de detalle, el
BFS indexa la serie completa en ~20 requests vía relay.
