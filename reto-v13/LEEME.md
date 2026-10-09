# Reto v13 — Los Hubs de la plataforma: de 3 fichas a 19 fuentes jugables

> **Qué es esto.** La v12 indexó 3 series nuevas (`A Shop for Killers`,
> `Too Much`, `Special Ops: Lioness`) a nivel metadatos, sin fuentes: el
> descubrimiento de `websiteParam` desde IP de datacenter estaba bloqueado
> por el filtro anti-bot de la plataforma (ver `reto-v12/03`). La v13 cierra
> ese circuito: el usuario entregó la **ficha** (URL de detalle) de cada
> serie y desde esas 3 URLs se recorrió **todo el grafo de Hubs** de la
> plataforma — temporadas, doblajes y subtítulos — hasta dejar cada
> episodio de las 3 series completamente reproducible.

## Contenido

| Archivo | Contenido |
|---|---|
| [`01-hubs-y-travesia.md`](01-hubs-y-travesia.md) | Cómo se recorrió el grafo: la ficha como puerta de entrada, `seasons[]`/`refList` (Hub de temporadas) y `dubbingList` (Hub de audios), el algoritmo BFS y el transporte vía relay |
| [`02-fuentes-por-temporada.md`](02-fuentes-por-temporada.md) | Inventario completo de las 19 fuentes: cada `websiteParam` con su variante (`doblaje`/`sub`/`base`), frente verificado, episodios y arte |

## Resumen ejecutivo

1. **La ficha como puerta de entrada.** Cada URL de detalle
   (`/es/detail/drama/<websiteParam>/1`) sirve a cualquier IP **vía relay**
   (egress de Render pasa Cloudflare) y en su `__NEXT_DATA__` trae el grafo
   completo: `seasons[]` (todas las temporadas, cada una con su propio
   `websiteParam`), `dubbingList` (todas las variantes de audio/sub del
   título) y `episodeVo` (episodios hospedados, con foto representativa y
   calidades).

2. **BFS sobre el grafo.** Desde cada ficha se exploran en anchura los
   Hubs: cada nodo es un `websiteParam`, y sus aristas son sus `seasons[]`
   + `dubbingList`. En total se exploraron **19 websiteParams** (6 de
   *A Shop for Killers*, 3 de *Too Much*, 10 de *Special Ops: Lioness*),
   cada uno verificado con `mediaInfoList` (m3u8 firmado) y `episodeVo`
   reales. **19/19 jugables.**

3. **Variantes de audio.** La plataforma publica cada versión como una
   ficha independiente con prefijo en el nombre: `[Doblaje Español]…` →
   `doblaje`, `[Sub Español]…` → `sub`, sin prefijo → `base` (original /
   otros idiomas, p. ej. el `[Audio-pt-BR]` de Lioness T2). Cada temporada
   referencia sus variantes en `dubbingList`, con `websiteParam` propio.

4. **Póster horizontal para el Hero.** Cada ficha expone
   `coverHorizontalUrl` (arte 16:9 de la plataforma, webp 1280×720). Las 3
   series ahora llevan `h` con ese arte, y entraron al riel `heroes` para
   la rotación del Hero de Pandora — el póster vertical ya no se estira.

5. **Entrega.** `catalog.json` **v13**: 399 títulos, las 3 series con
   2/1/3 temporadas y **19 fuentes jugables** (doblaje → sub → base en
   cada temporada), sobre `PENC1` de siempre. Los `q` de cada temporada
   coinciden con los episodios hospedados verificados.

## Cómo verificarlo en la app

- Abrir el hub Pandora → *Actualizar catálogo* → debe decir
  `Catálogo v13: 3 títulos actualizados`.
- Ficha de cada serie → selector de servidor: *Español doblado*,
  *Sub español* y *Original / otros idiomas* por temporada (Lioness T2
  suma la variante portugués).
- Reproducir cualquier episodio: la app resuelve el m3u8 firmado de esa
  ficha en el momento (token de sesión).
- Hero de Pandora: cuando roten estas series se ve el arte horizontal
  nuevo (`coverHorizontalUrl`), no el póster 2:3 estirado.
