# Reto v12 — Descubrimiento e indexación de series nuevas sin links

> **Qué es esto.** En la v12 del catálogo se subieron 3 series nuevas
> (`A Shop for Killers`, `Too Much`, `Special Ops: Lioness`) elegidas por el
> usuario mediante un zip con 3 capturas de pantalla — **sin links, sin
> listas, sin notebooks**. Este folder documenta cómo se obtuvo cada pieza:
> la auditoría del catálogo, los parámetros que comparte todo el contenido de
> la plataforma, el estado común, el algoritmo de búsqueda y el resultado.

## Contenido

| Archivo | Contenido |
|---|---|
| [`01-auditoria.md`](01-auditoria.md) | Auditoría completa: catálogo, red de 10 frentes, contrato SSR, transporte y evidencia del filtro anti-datacenter |
| [`02-parametros-y-estado.md`](02-parametros-y-estado.md) | Los parámetros que comparte TODO el contenido de la red (websiteParam, dubbingList, refList, seasons, subtitlingList, mediaInfoList) y el estado común |
| [`03-algoritmo-busqueda.md`](03-algoritmo-busqueda.md) | El algoritmo de búsqueda real: pipeline completo poster→identidad→metadatos→plataforma, qué funciona, qué está bloqueado y cómo se cierra el circuito |
| [`04-series-del-reto.md`](04-series-del-reto.md) | Las 3 series: datos completos, temporadas/episodios, estado de emisión y el formato exacto de las entradas en `catalog.json` |

## Resumen ejecutivo

1. **Identificación (100 % lograda).** Las 3 capturas del usuario se
   analizaron con un modelo de visión (VLM): cada poster devolvió título,
   año, cadena y arte → `A Shop for Killers` (2024, Disney+), `Too Much`
   (2025, Netflix) y `Special Ops: Lioness` (2023, Paramount+).

2. **Metadatos (100 % logrados).** Con las mismas fuentes públicas que usa
   la app (IMDb suggest → cinemeta → tvmaze) se construyeron las 3 entradas
   completas: sinopsis en español, géneros, rating, años, temporadas con
   nombres de episodios y estado de emisión (`em`).

3. **websiteParams de la plataforma (bloqueado — documentado).** El eslabón
   que convierte una entrada en *jugable* dentro de la app son los
   `websiteParam` de la red Pandora (10 frentes). Ese dato solo sale de las
   LISTAS de la plataforma (home / search / categorías) y la plataforma
   **sirve esas listas vacías a toda IP de datacenter** — se verificó con 15+
   combinaciones de transporte (directo, relay Render, allorigins, codetabs,
   jina, Google Translate, navegador headless). Los DETALLES, en cambio,
   sirven a cualquier IP. La evidencia completa está en
   [`01-auditoria.md`](01-auditoria.md) y el camino para cerrar el circuito en
   [`03-algoritmo-busqueda.md](03-algoritmo-busqueda.md).

4. **Entrega.** `catalog.json` v12: 399 títulos (+3), cifrado con el mismo
   sobre `PENC1` de siempre. Las 3 entradas quedan a nivel datos; en cuanto
   se conozca el `websiteParam` de cualquiera de sus temporadas, el merge por
   id añade las fuentes y las series se vuelven jugables sin tocar el APK.

## Cómo probarlo en la app

- **Búsqueda del hub:** buscar "A Shop for Killers" / "Too Much" /
  "Special Ops: Lioness" en el hub — la búsqueda en vivo de la app consulta
  los 10 frentes desde la IP residencial del TV y las encuentra (ese es hoy
  el "algoritmo de búsqueda" operativo del sistema).
- **Catálogo:** "Actualizar catálogo" aplica v12 (+3 títulos). Las fichas
  aparecen en el catálogo con póster, sinopsis y temporadas; la capa jugable
  queda pendiente de los `websiteParam` (ver 03).
