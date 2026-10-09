# 01 · Auditoría del catálogo y de la red Pandora

Auditoría realizada para la v12 (2026-10-09). Base: catálogo v11
(396 títulos, 245 series + 151 películas) publicado en
`catalog.json` (sobre `PENC1`, AES-256-GCM).

## 1. El catálogo — estructura exacta

```jsonc
{
  "v": 12,                          // versión del manifiesto
  "actualizado": "2026-10-09",
  "shows": [
    {
      "i": "smallville",            // slug — id interno y clave del merge
      "t": "Smallville",            // título
      "k": "serie" | "peli",        // tipo
      "tt": "tt0279600",            // IMDb id (metahub + cinemeta)
      "p": "…metahub…/poster/medium/ttXXXX/img",      // póster
      "b": "…metahub…/background/medium/ttXXXX/img",  // fondo
      "h": "https://img.<frente>.com/cover/…",        // horizontal de la plataforma
      "s": "sinopsis en español",
      "a": 2001,  "f": 2011,        // año inicio / fin
      "r": "7.5",                   // rating
      "g": ["Aventura", …],         // géneros (ES)
      "al": "título alternativo",
      "rt": 84,                     // Rotten (opcional)
      "em": 1,                      // en emisión (alimenta el riel y el actualizador)
      "e": [                        // TEMPORADAS (series)
        {
          "n": 1,                   // nº temporada
          "q": 21,                  // nº episodios
          "x": ["Pilot", …],        // nombres de episodios (EN)
          "w": [                    // FUENTES JUGABLES de la temporada
            { "w": "<websiteParam>", "v": "doblaje|sub|base", "y": "<frente>" }
          ]
        }
      ],
      "w": [ … ]                    // pelis: fuentes jugables al nivel raíz
    }
  ],
  "rails": { "heroes": […], "topRT": […], "mejores": […], "estrenos2026": […],
             "enEmision": […], "imperdibles": […], "peliculas": […],
             "generos": { "Acción": […], … } }
}
```

**Reglas de fusión de la app** (verificadas en `PandoraApi.kt` de la v3.30.08):

- El manifiesto se baja de `raw.githubusercontent.com/…/main/catalog.json`
  cada 6 h (o a demanda con "Actualizar catálogo"), se descifra, se compara
  `v` y se fusiona con `fusionarCatalogo` — nunca borra: agrega shows y
  anexa rieles.
- Una temporada nueva entra solo si trae `w` (fuentes jugables).
- Una serie nueva entra solo si tiene al menos una temporada jugable.
  → una entrada sin `w` queda a nivel datos (visible en el repo, pendiente
  de fuentes para ser jugable). El merge por `i` completa después.

## 2. La red Pandora — 10 frentes, una sola plataforma

| key | frente | API (vestData.baseUrl) | play domain |
|---|---|---|---|
| flms | ww1.123flmsfree.com | ww1-api.123flmsfree.com | vod-limit-media.123flmsfree.com |
| playspelis | video.playspelis.com | video-api.playspelis.com | vod-limit-02.playspelis.com |
| pelicula | ver.123pelicula.com | ver-api.123pelicula.com | delivery-limit-c.123pelicula.com |
| sololatino | latino.solo-latino.com | latino-api.solo-latino.com | — |
| dramas | www3.dramasfree.com | www3-api.dramasfree.com | vod-limit-stream.dramasfree.com |
| flixlat | flixlat.com | api.flixlat.com | r-limit.flixlat.com |
| peliculaplay | peliculaplay.com | api.peliculaplay.com | media-limit-xr8a2.peliculaplay.com |
| cuevana4br | es.cuevana4br.com | es-api.cuevana4br.com | — |
| cuevana19 | play.cuevana19.com | play-api.cuevana19.com | — |
| movies321 | ww20.321moviesfree.com | ww20-api.321moviesfree.com | stream-limit-vid.321moviesfree.com |

**Un solo tenant.** Todos comparten `pid = f7vkagmqwq@fcb59c9dc9af1f3`
(vestData) y el mismo buildId de Next.js → misma base de contenido, IDs
globales: **el `websiteParam` de un título sirve en cualquiera de los 10
frentes** (verificado en vivo desde la 3.28.18).

## 3. Contrato SSR (extraído de `__NEXT_DATA__`)

- `GET /<lang>/` → `pageProps{ searchResults[], filterData[], vestData }`
- `GET /<lang>/search?keyword=q` → `pageProps{ searchRes[] }`
- `GET /<lang>/detail/<movie|drama>/<websiteParam>[/<ep>]` →
  `pageProps{ name, score, category, tagNameList[], introduction,
  episodeVo[], dubbingList[], refList[], mediaInfoList[], seasons[],
  seasonText, updateStatus, updatePeriod, dubMode, subtitleLang,
  subtitlingList, coverVerticalUrl, coverHorizontalUrl, websiteParam }`
- Idiomas: en, zh_CN, zh_TW, in_ID, ms, th, vi, **es**, pt, fr, ar, tr.
- Sin sitemap (`robots.txt` = `User-agent: * Allow: /`); sin API pública
  documentada (los subdominios `*-api` responden Spring 404 en rutas
  desconocidas); assets en `static.<frente>` abiertos a cualquier IP.

## 4. Transporte — lo que funciona y lo que no (evidencia v12)

El mismo frente se comporta distinto según el tipo de página y la IP:

| Superficie | Desde IP datacenter (sandbox/relay) |
|---|---|
| **DETALLE** `/es/detail/…` | ✅ **SIEMPRE SIRVE** (lo necesitan abierto para SEO). Verificado por relay (egreso AWS) y por allorigins. |
| **LISTA** home / search / categoría | ❌ **VACÍA** — la plataforma entrega `searchResults: []` / `searchRes: []` aunque Cloudflare haya pasado. Filtro a nivel aplicación, no de CF. |
| m3u8 (`vod-limit-*`) e imágenes (`img.*`) | ✅ cualquier IP, sin Referer especial. |
| `static.<frente>` (JS/CSS) | ✅ cualquier IP. |

Matriz de transporte probada para LISTAS (todas vacías):

| Transporte | Resultado |
|---|---|
| Directo desde el sandbox | HTTP 403 (CF duro) |
| Relay Render (`/v1/pandora/buscar`, `/home`, `/categoria`) — egress AWS | HTTP 200, listas vacías |
| allorigins | 200 con listas vacías / 5xx intermitente |
| codetabs | 522 |
| jina (`r.jina.ai`) | 403 (reputación IP) |
| Google Translate (`*.translate.goog`) | **pasa CF** (HTTP 200, 48 KB de página) **pero listas vacías** |
| Navegador headless real | "Attention Required" (CF) |
| `/v1/pandora/raw` (passthrough v1.8.0, cascada directo→allorigins→codetabs) | detalle OK · robots OK · sitemap 404 · listas vacías |

> Conclusión de la auditoría: **el único dato inalcanzable desde
> infraestructura de datacenter es la LISTA** (y de ahí, el
> `websiteParam` de contenido nuevo). Todo lo demás — detalles, streams,
> imágenes, metadatos — sirve a cualquier IP. La app de la TV del usuario
> (IP residencial) sí recibe listas completas: por eso su búsqueda en vivo
> encuentra estas series hoy.

## 5. De dónde salieron históricamente los websiteParams

Reconstruido con los artefactos de las sesiones anteriores: los
`websiteParam` de las 396 entradas v11 entraron por **notebooks del
usuario** (filemail → onlinenotepad con URLs tipo
`https://flixlat.com/es/detail/drama/<wp>/1`). El flujo era:
notebook → wp semilla → `detalle` (relay) → `seasons[]` (todas las
temporadas, cada una con su wp) → `dubbingList` (todas las versiones
doblaje/sub) → detalle por temporada → episodios y fuentes por temporada.

La v12 es el primer lote que intenta el alta **sin ese insumo**: de ahí el
reto y la documentación de 03.
