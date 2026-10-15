# reto-v16 — +8 series Marvel/Avatar al catálogo (lote del usuario)

> **Qué es esto.** La v16 incorpora al catálogo de Pandora las series que
> el usuario pasó como enlaces de ficha, recorriendo el **mini hub**
> interno de cada una (el grafo `seasons[]` × `dubbingList` — temporadas
> × variantes de audio) con un BFS vía relay. **502 → 510 títulos**, sin
> rebuild: el manifiesto viaja cifrado en `catalog.json` (PENC1) y la app
> lo fusiona incrementalmente (nunca degrada).

## El lote

| Serie | id | Temporadas | Fuentes jugables | Emisión |
|---|---|---|---|---|
| WandaVision | `wandavision` | T1 (9 eps) | latino + sub + 2 base | — |
| Ojo de Halcón | `hawkeye` | T1 (6 eps) | doblaje + sub + base | — |
| She-Hulk: Abogada Hulka | `she-hulk` | T1 (9 eps) | doblaje + base | — |
| Agatha, ¿quién si no? | `agatha-quien-si-no` | T1 (9 eps) | doblaje + sub + base | — |
| VisionQuest | `visionquest` | T1 (2 eps y subiendo) | doblaje + sub + 2 base | **em=1** |
| Avatar: La leyenda de Aang (animada 2005) | `avatar-leyenda-de-aang` | T1-T3 (20/20/21) | doblaje, doblaje, latino | — |
| La leyenda de Korra | `korra` | T1-T4 (12/14/13/13) | 3 fuentes por temporada | — |
| Avatar: Los Siete Refugios | `avatar-siete-refugios` | T1 (3 eps y subiendo) | doblaje + sub + base | **em=1** |

**Loki** (el noveno link del usuario) ya estaba en el catálogo desde la
v13 — se verificó completo vía relay: las 6 fuentes (latino/sub/base ×
T1-T2) responden con `mediaInfoList` jugable y los websiteParam son
idénticos a los publicados. No necesitó cambios.

## Qué se hizo por serie (pipeline v16)

1. **Detalle por relay** de cada ficha (`/v1/pandora/detalle`): nombre,
   póster vertical (`coverVerticalUrl`), **landscape para el hero**
   (`coverHorizontalUrl`), sinopsis, géneros ES (`tagNameList`), score y
   `mediaInfoList` (verificación de jugabilidad del capítulo 1).
2. **BFS del mini hub**: `seasons[]` revela los websiteParam de las otras
   temporadas y `dubbingList` las variantes de audio de la misma
   temporada. Se clasifican por nombre: `[Audio Latino]` → latino,
   `[Doblaje Español]` → doblaje, `[Sub Español]` → sub, resto (PT-BR) →
   base. Cada nodo visitado se re-verifica jugable. **34 detalles, 34
   jugables.**
3. **Metadatos**: IMDb id + años + nombres de capítulos desde TVMaze
   (con corrección para Aang: TVMaze devuelve primero la live action de
   Netflix 2024 — se seleccionó la **animada original 2005-2008**, tt0417299,
   20/20/21 eps). Los dos estrenos de 2026 (VisionQuest tt23112594,
   Seven Havens tt35854736) se confirmaron también contra la API de
   sugerencias de IMDb. Pósters/fondos vía metahub (`poster/medium` y
   `background/medium` por tt); para los dos estrenos que metahub aún no
   tiene (307) se usa el arte propio de la plataforma. Sinopsis: la ES de
   la plataforma, con corrección manual de las traducciones rotas
   (p. ej. *"Una agatadia de Hechizos de hechizo"*).
4. **Series en emisión**: VisionQuest (estrenada 2026-10-13, la plataforma
   lleva 2 de 8 capítulos) y Seven Havens (2026-10-09, 3 de 13) quedan
   con `em=1` y en el riel `enEmision`: **el actualizador las pasea cada
   9 días y los capítulos nuevos aparecen solos** apenas la plataforma
   los sube. Los nombres TVMaze de TODOS los capítulos ya van incluidos
   en el manifiesto (`x`), así que cada capítulo nuevo aparece con su
   nombre real (la UI lista `1..q` y toma `nombres[e-1]`).
5. **Rieles** (anexados con dedupe, nunca se saca nada): las 8 a
   `heroes` e `imperdibles`; las 5 mejores puntuadas a `mejores`
   (Aang 9.3, Seven Havens 9, Agatha 9, VisionQuest 8.6, Korra 8.3);
   los dos estrenos 2026 a `estrenos2026`; y cada una a sus rieles de
   género según los tagNameList de la plataforma.

## Por qué el manifiesto es cumulativo (y no solo las 8 nuevas)

El cliente persiste **el último manifiesto descargado** y lo re-aplica
en frío sobre la semilla del APK (`aplicarPersistido` →
`fusionarCatalogo`). La semilla del APK vigente (v3.30.28) es **v11 con
396 shows**, mientras que el catálogo publicado iba por **v14 con 502**:
un manifiesto con solo las 8 nuevas haría que, tras un reinicio, un
usuario pierda las 106 adiciones de v12-v14. Por eso `catalog.json` v16
viaja **completo** (510 shows): la fusión resultante es idempotente para
los 502 existentes (verificado en simulación de `fusionarCatalogo`:
+8 nuevos, 0 actualizaciones) y restauradora para clientes con semillas
viejas.

## Verificación

- Roundtrip PENC1 (cifrar → descifrar → comparar) exacto.
- Fusión simulada contra el estado v14: **+8 nuevos, 0 side-effects**.
- Los 34 websiteParam del lote responden jugables vía relay (spot-check
  del `mediaInfoList.m3u8` del capítulo 1 en cada nodo del BFS).
- Los rieles quedan: heroes 104→112, imperdibles 77→85, mejores 55→60,
  estrenos2026 72→74, enEmision 109→111, géneros +33 asignaciones.

`nuevas_series.json` en este directorio contiene solo las 8 fichas
nuevas (formato seed v2) como referencia del lote.
