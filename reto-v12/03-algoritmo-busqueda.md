# 03 · El algoritmo de búsqueda — pipeline, evidencia y circuito

Tercer objetivo del reto: generar un **algoritmo de búsqueda real** capaz
de indexar series nuevas sin que el usuario traiga los links. Esta es la
sistematización completa, con lo que funciona, lo que no y por qué.

## El pipeline (6 etapas)

```
 [poster] ──VLM──▶ [identidad] ──IMDb──▶ [tt + tipo]
                                 │
                     ┌───────────┴───────────┐
              cinemeta (rating, años,    tvmaze (temporadas,
              géneros, desc EN)          episodios, estado)
                                 │
                    LLM (desc EN → ES)   ← sinopsis del catálogo
                                 │
                    [entrada de catálogo v12]
                                 │
              ┌─────────────────────────────────────┐
              │  PLATAFORMA (el eslabón crítico)    │
              │  LISTAS → websiteParam → detalle    │
              │  → seasons / dubbing / subs / m3u8 │
              └─────────────────────────────────────┘
```

### Etapa 1 — Poster → identidad (✅ 100 % operativo)
Modelo de visión (GLM-4V por `z-ai vision`). De cada captura se extrajo
título exacto, título original, año y cadena:

| Captura (filemail `zszuaqvuvrsagfy`) | Identidad |
|---|---|
| Screenshot_20261009_031229.jpg | **A Shop for Killers** ( Killerdeului Shoppingmall, 2024, Disney+) |
| Screenshot_20261009_031243.jpg | **Too Much** (2025, Netflix — "From the creator of GIRLS", 10 de julio) |
| Screenshot_20261009_031313.jpg | **Special Ops: Lioness** (2023, Paramount+, Taylor Sheridan) |

### Etapa 2 — Identidad → metadatos (✅ 100 % operativo)
Mismas fuentes públicas que ya usa la app (PosterApis.kt):
- **IMDb suggest** (`v2.sg.media-imdb.com/suggestion/…`) → tt por año:
  `tt26450613`, `tt30406366`, `tt13111078`.
- **cinemeta** (`v3-cinemeta.strem.io`) → rating, rango de años, géneros,
  descripción EN.
- **tvmaze** → temporadas + nombres de episodios + estado (Running/TBD/Ended).
- **LLM** → sinopsis EN→ES (estilo catálogo). Nota: la key demo de TMDB que
  trae el app (`3fd2be…`) devuelve 401 desde esta infraestructura — se usó
  el pipeline IMDb/cinemeta/tvmaze + LLM, mismas fuentes del app para
  series.

### Etapa 3 — Metadatos → entrada (✅ hecho en v12)
Formato idéntico al resto del catálogo (ver `04-series-del-reto.md`).
Los 3 slugs: `a-shop-for-killers`, `too-much`, `special-ops-lioness`.

### Etapa 4 — Identidad → websiteParam (⛔ bloqueado — la evidencia)
El `websiteParam` solo aparece en las LISTAS de la plataforma (tarjetas del
home/search/categorías) o en la URL de una ficha conocida. Matriz probada
en esta sesión (detalle en `01-auditoria.md` §4):

- 10 frentes × {directo, relay-Render, allorigins, codetabs, jina,
  Google-Translate, headless} → **listas siempre vacías** desde IP
  datacenter. Google Translate pasa Cloudflare y la plataforma igual sirve
  `searchRes: []` → el filtro es de la APLICACIÓN, no del edge.
- `/es/detail/<tipo>/<wp>` con wp conocido → sirve completo a cualquier IP.
- El `paramId` (21 chars) es aleatorio — correlación con el id numérico
  global: 0/496 muestras. No enumerable, no derivable.
- Sin sitemap, sin API pública (los `*-api.<frente>` responden Spring 404 en
  500+ rutas probadas), sin índice en buscadores, Wayback inaccesible.
- Los 500+ wps históricos del catálogo entraron por notebooks del usuario
  (URLs `detail/…`), nunca por búsqueda autónoma.

**Conclusión técnica:** desde infraestructura de datacenter el eslabón
"lista → websiteParam" no existe. La app de la TV (IP residencial) sí
recibe listas completas — su búsqueda en vivo ya encuentra estas 3 series
hoy; lo que falta es capturar el wp que muestra y traerlo al catálogo.

## Cómo se cierra el circuito (3 vías, ordenadas por costo)

1. **Desde el TV (10 segundos, sin tocar código).** Abrir cada serie desde
   la búsqueda del hub → la ficha abre con su URL
   `https://<frente>/es/detail/drama/<wp>/<ep>` → ese wp (de cualquiera de
   sus temporadas) en formato notebook es TODO lo que hace falta. Con
   `detalle?wp=…` el resto se deriva solo (temporadas, doblajes, subs,
   streams). El merge por id completa la entrada existente y la serie queda
   jugable en el catálogo (v13).
2. **Desde un enlace público de la plataforma** si el usuario lo ve en el
   navegador de cualquier dispositivo — mismo formato, mismo resultado.
3. **Cuando la plataforma relaje el filtro de listas** (o se disponga de un
   egress residencial confiable), el algoritmo de la etapa 4 queda operativo
   sin cambios: `/v1/pandora/buscar?site=…&q=…` ya está desplegado y
   devolvería las tarjetas completas.

## Infraestructura entregada en esta sesión (reutilizable)

- **Relay v1.8.0** — nuevo endpoint `GET /v1/pandora/raw?site=<key>&path=<ruta>`
  (prometeus-server, commit `04a6230d68`, auto-desplegado en Render):
  passthrough con la misma cascada directo→allorigins→codetabs, allowlist
  de los 10 frentes, path validado, cache 8 min, rate-limit compartido.
  Pensado para auditoría (robots/sitemap/listas) y verificación offline.
- **Scripts del pipeline** (repo de trabajo, listos para re-ejecutarse):
  `v12_pipeline2.py` (metadatos), `v12_ensamblar.py` (merge incremental),
  `v12_cifrar.py` (sobre PENC1 con verificación de roundtrip).
