# reto-v15 — Integración elvideoclubargento.com.ar → HUB de Pandora

> **Qué es esto.** La v15 integra **75 películas argentinas** del sitio
> `elvideoclubargento.com.ar` al catálogo existente de Pandora, como un
> **nuevo sitioKey "argento"** dentro de `PandoraApi.SITIOS`. Las pelis
> se ven junto al resto del catálogo (series y películas de los 10
> frentes de la red) y se reproducen vía **OK.ru** resolviendo en tiempo
> real con `OkruExtractor` (sin WebView sniffer, sin Cuevana iframe).

## Investigación del sitio (fase 1)

- **NO es WordPress.** Es una SPA vanilla JS — el catálogo completo
  (**3176 películas**) viene **inline como JSON dentro del homepage**
  (`const MOVIES = [...]` — 3.4 MB de HTML/JS en un solo archivo).
- **No hay páginas por película.** Cada entrada del JSON tiene un
  campo `l` con la URL de stream (OK.ru, Google Drive, o YTS).
- **Distribución de hosts:**
  - `https://ok.ru/video/{id}` — **3145 películas (99.0%)** ✅
  - `https://drive.google.com/file/d/{id}/view` — 29 (0.9%) ❌ (necesita
    resolver GDrive dedicado)
  - `https://yts.mx/movies/{slug}` — 2 (0.06%) ❌ (NXDOMAIN, yts.mx dejó
    de existir)

## Investigación del formato de stream (fase 2)

Para cada película con URL de OK.ru, se hace un HTTP GET a
`https://ok.ru/video/{id}`. La página contiene un atributo
`data-options="..."` (JSON HTML-escaped). Al HTML-unescapear y parsear,
se obtiene `flashvars.metadata` con:

- `hlsManifestUrl` — **HLS m3u8 master playlist** (adaptive bitrate,
  variantes a 1.8 / 1.1 / 0.6 Mbps). Retorna
  `application/x-mpegURL` + segmentos `.ts` válidos.
- `videos[]` — **5 calidades MP4 directas**: mobile/lowest/low/sd/hd,
  cada una `video/mp4` con `Accept-Ranges: bytes` (HTTP 206
  range-supported).

**Ambos formatos (HLS m3u8 + MP4) son reproducidos nativamente por
ExoPlayer** — `HlsMediaSource.Factory` para el m3u8 (adaptive) y
`DefaultMediaSource.Factory` para MP4 progresivo. **NO hace falta
WebView, no hace falta iframe, no hace falta JS engine**.

Las URLs devueltas tienen `srcIp=...` (la IP que pidió la página de
OK.ru) y `expires=...` (≈ 1 año, sin problema de expiración a corto
plazo). OK.ru no enforce estrictamente el srcIp (comunidad CloudStream /
AnimeXStream / Stremio addons lo confirman), pero por seguridad el
fetch se hace DESDE el dispositivo del usuario, así que el srcIp es el
de su red.

## Implementación (fase 3 — app v3.30.25)

### 1. `argento_seed.json` — 75 pelis en formato Pandora v1

Archivo: `reto-v15/argento_seed.json` (78 KB). En la app v3.30.25 se
_bundlea_ como `assets/argento_seed.json`.

Formato de cada card:

```json
{
  "w": "okru-10093463079666",   // websiteParam (clave routing)
  "n": "En compañía",            // name (título)
  "t": "movie",                  // tipo (siempre movie para pelis)
  "c": "https://image.tmdb.org/...",  // coverVerticalUrl (poster)
  "s": 6.5,                      // score (default 6.0)
  "y": "argento",                // sitioKey (sintético)
  "g": ["Documental", "Drama"],  // géneros
  "imdb_id": "tt14336374",
  "tmdb_id": "763664",
  "year": 2021,
  "sinopsis": "...",
  "direccion": "Ada Frontini",
  "elenco": ["Ada Frontini", "Liliana Paolinelli"],
  "duracion": "63 min",
  "pais": "Argentina",
  "okru_url": "https://ok.ru/video/10093463079666",
  "okru_id": "10093463079666"
}
```

### 2. `OkruExtractor.kt` — resolvedor de URLs OK.ru

Archivo: `app/src/main/java/com/prometeus/stream/data/OkruExtractor.kt`.

```
OkruExtractor.resolve(okruUrl: String) : List<Variant>
  1. extractOkruId(url) → "10093463079666"
  2. fetchPage("https://ok.ru/video/{id}") → HTML (UA desktop)
  3. extractDataOptions(html) → JSON HTML-escaped
  4. htmlUnescape → JSON parse → flashvars.metadata
  5. buildVariants(metadata) → [
       Variant("HLS", "Adaptive (HLS)", m3u8Url, isHls=true),
       Variant("HD", "HD 720p", mp4Url, isHls=false),
       Variant("SD", "SD 480p", mp4Url, isHls=false),
       Variant("LOW", "LOW 360p", mp4Url, isHls=false),
       Variant("MOBILE", "MOBILE 240p", mp4Url, isHls=false),
       Variant("LOWEST", "LOWEST 144p", mp4Url, isHls=false),
     ]
```

Implementación de referencia: CloudStream `OkruExtractor.kt` (~50 LOC),
AnimeXStream, Stremio addons.

### 3. `PandoraApi.kt` — modificaciones

**`SITIOS`** — agrega entrada para "argento" con dominio placeholder
(`argento.local` — nunca se le pide HTTP):

```kotlin
Sitio("argento", "El Video Club Argento", "argento.local", "argento.local"),
```

**`argentoExtras`** — `MutableMap<String, MutableMap<String, String>>`
que preserva los metadatos extra (okru_url, sinopsis, year, direccion,
elenco, etc.) por websiteParam. Lo llena `cargarSemillaJson()`.

**`inicializar(ctx)`** — después de cargar `pandora_seed.json`, también
carga `argento_seed.json` (con `sumar=true` para no reemplazar la
semilla principal).

**`detalle(ref)`** — detecta `ref.sitioKey == "argento"` y despacha a
`detalleArgento(ref)`, que:

  1. Busca `argentoExtras[ref.wp]` para obtener `okru_url`.
  2. Llama `OkruExtractor.resolve(okru_url)` → lista de variantes.
  3. Mapea a `PanMediaInfo(currentDefinition, mediaUrl)` para cada
     variante (HLS + 5 MP4).
  4. Construye `PanDetalle` sintético (sitioKey="argento", category=0
     =película, mediaInfoList poblado con las URLs resueltas).

El player (`Player.kt`) ya maneja `PanDetalle.mediaInfoList` con
`streamDe()` — la función que elige la mejor calidad. Por lo tanto, NO
se necesita modificar el Player para que entienda el contenido argento:
recibe el PanDetalle sintético y lo reproduce igual que cualquier
contenido de la red Pandora.

## Primeras 5 pelis del lote (de 75)

| Título | Año | OK.ru ID | Póster |
|---|---|---|---|
| En compañía | 2021 | 10093463079666 | sí (TMDB) |
| Las tres claves | 1953 | 10658769537778 | sí (TMDB) |
| La mujer del Eternauta | 2011 | 10278636358386 | sí (TMDB) |
| Oro en la mano | 1943 | 9794905180914 | sí (TMDB) |
| Las luces de Buenos Aires | 1931 | 10484451511026 | sí (TMDB) |

Lista completa: ver `argento_seed.json`.

## Verificación de ExoPlayer — tipos MIME confirmados

| URL pattern | HTTP status | Content-Type | ExoPlayer source |
|---|---|---|---|
| `vdNNN.okcdn.ru/video.m3u8?cmd=videoPlayerCdn&...` | 200 | `application/x-mpegURL` | `HlsMediaSource.Factory` |
| `vdNNN.okcdn.ru/?type=4...` (mobile MP4) | 200 + HTTP 206 | `video/mp4` | `DefaultMediaSource.Factory` (progressive) |
| `vdNNN.okcdn.ru/?type=3...` (hd MP4) | 200 + HTTP 206 | `video/mp4` | `DefaultMediaSource.Factory` (progressive) |

`Accept-Ranges: bytes` confirmado en cada MP4 (range-supported → seek
funciona). HLS master playlist tiene 3 variantes (1.8/1.1/0.6 Mbps) →
ExoPlayer hace adaptive bitrate automáticamente.

## Decisión: ¿actualizar el catálogo o crear nueva versión de Prometeus?

**Decisión: crear nueva versión de Prometeus (v3.30.25).**

Motivo: el catálogo `catalog.json` del repo `prometeus-catalog` es un
payload **AES-256-GCM cifrado** (formato `PENC1.<iv>.<ct>`) generado
por un pipeline privado — no tengo la clave para re-cifrarlo.

En cambio, la app lee `assets/pandora_seed.json` (JSON plano) al
arrancar, y se le puede agregar `assets/argento_seed.json` con `sumar=
true` para extender el catálogo semilla. **Esto requiere rebuild del
APK** (los assets viajan dentro del APK), por eso v3.30.25.

Como bonus, esta versión también trae el `OkruExtractor.kt` — el código
que resuelve `ok.ru/video/{id}` → HLS m3u8 + MP4 URLs en runtime. Sin
este código, el PanDetalle sintético no podría construirse y las 75
pelis no reproducirían.

## Pipeline reproducible (4 pasos)

1. **Scrape** — `curl https://elvideoclubargento.com.ar/` → extraer
   `const MOVIES = [...]` (regex) → JSON parse → 3176 películas.
2. **Filtro** — solo las 3145 con `m.l` matching
   `ok\.ru/video/(\d+)`. Descartar 29 GDrive + 2 YTS (no reproducibles
   sin resolver dedicado). Quedarse con las 75 primeras que tengan
   sinopsis + poster + año (los 3 campos mínimos para una buena card).
3. **Mapeo a Pandora v1** — para cada peli, construir card con
   `w="okru-{id}"`, `n=title`, `t="movie"`, `c=poster_url`,
   `s=score (default 6.0)`, `y="argento"`, `g=generos`,
   `okru_url=m.l`, `okru_id`, `year`, `sinopsis`, `direccion`,
   `elenco`, `imdb_id`, `tmdb_id`, `pais`, `duracion`.
4. **Bundle en APK** — guardar como `assets/argento_seed.json`,
   modificar `PandoraApi.inicializar()` para cargarlo, agregar
   `OkruExtractor.kt`, modificar `detalle()` para detectar "argento".
   Build APK → firmar con `prometeus.jks` → release.

## Futuras extensiones

- **+3098 pelis más** — el mismo flujo funciona para las 3098 restantes
  con OK.ru URL. Solo hay que ampliar el script de selección.
- **GDrive resolver** — para las 29 pelis de Google Drive, implementar
  un `GdriveExtractor.kt` (reusar el código de MegaCliente.kt o
  CloudStream's `GdriveExtractor`).
- **Auto-enriquecimiento de pósters** — si una peli no trae póster,
  usar el sistema existente de `Store.posterResuelto(ctx, titulos,
  anioCard)` con el año de la ficha (igual que hace PosterCardLite
  al focusear).

## Formato final

Archivo bundle: `argento_seed.json` — 75 PanCard con sitioKey="argento".
Tamaño: 78 KB.
Aplicación: requiere Prometeus v3.30.25+ (que tiene OkruExtractor).
Repositorio: este `reto-v15/` documenta la integración.
