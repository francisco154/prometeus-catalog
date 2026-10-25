# reto-v30 — Apples Never Fall: reemplazo por la versión Sub Español + tope de audio parcial (v 29 → 30)

**El pedido del dueño:** reemplazar *completamente* Apples Never Fall por la
versión **sub español** — la versión en español latino está "incompleta y
media rota" — manteniendo el **audio latino solamente en los primeros 3
capítulos**; del cap 4 en adelante, únicamente sub español. Además, la app
Prometeus TV 3.30.44 trae los **desplegables CATEGORÍAS y AÑO** del tab
Catálogo (ver README del repo TV, `docs/55-RELEASE-3.30.44.md`).

## Diagnóstico — por qué el latino estaba "medio roto"

Walk por relay de las tres variantes de la red (matriz completa en los
JSON de esta carpeta de trabajo, resumen abajo). `cur` =
`currentEpisodeNumber` que el sitio declara cuando se le pide el cap `ep`
(el que **realmente** sirve el video):

| fuente | variante | pedido E2 | E6 | E7 | subs ES |
|---|---|---|---|---|---|
| `flixlat` `a0mpdhN7BOq4gdkIg453V-…` | **[Sub Español]** | cur=2 | cur=6 | cur=7 | **7/7** |
| `sololatino` `h9Zfv4JWRikD67p2cMmnq-…` | [Audio Latino] | **cur=1** | **cur=1** | **cur=1** | 0 |
| `sololatino` `X5VY3jk5O41gAA36nXtlA-…` | [Audio Portugués-BR] | cur=2 | cur=6 | cur=7 | 0 |

La subida **[Audio Latino]** declara `episodeVo = [1,3,4,5]`: el cap 2 no
existe y pedir el 2/6/7 **sirve el video del cap 1** (clamping del sitio —
de ahí el "media rota"). La **[Sub Español]** de flixlat — el link exacto
del dueño — trae los 7 capítulos sanos, con `currentEpisodeNumber`
correcto y una pista ES por episodio. La [Audio Portugués-BR] está 7/7
sana pero es portugués: **fuera** ("reemplazarla completamente").

## El cambio (973 shows, 972 byte-identical)

Solo `apples-never-fall` cambia, 2 campos de show (`e`, `em`) y 3 de la
temporada 1 (`q`, `w`, `x`):

```
w: [latino(sololatino), base(sololatino)]  →  [latino(sololatino, m=3), sub(flixlat)]
q: 4  →  7        (los 7 capítulos, extraídos de la fuente sub)
x: —  →  [The Delaneys, Logan, Amy, Brooke, Troy, Stan, Joy]   (TVMaze 60411)
em: 1 → 0        (miniserie terminada 2024 — fuera del paseo de 4 días)
rails.enEmision: 214 → 213 (apples fuera; el resto de los rails intacto)
```

**`m` es un campo nuevo** = tope de episodios de la variante ("el latino
solo llegó al cap 3"). Lo lee la **TV 3.30.44 / Móvil 1.0.12** (campo
`hastaEp`): la cascada de `resolverStreamPans` no elige esa variante para
un cap superior — el cap 4 va directo a sub español. Apps viejas lo
**ignoran sin romperse** (JSON tolerant: campo desconocido = no leído).

## Por qué las apps tenían que cambiar (cascada 3.30.44)

Antes `resolverStreamPans` probaba **una sola** fuente (la preferida del
usuario o la de mayor prioridad) y si no tenía el cap, el cap quedaba
muerto. La 3.30.44 (TV) / 1.0.12 (móvil) trae:

- **`fuentesCandidatas()`** — ordena las fuentes de la temporada para el
  cap pedido: la preferida primero (si aplica), después por prioridad
  (latino > doblaje > sub > base); las fuentes con tope `m` solo entran
  si el cap no lo supera.
- **`resolverStreamPans()`** recorre la cascada y se queda con la
  **primera fuente que resuelva** el capítulo.
- **Episodio equivocado** (`streamDe`): si el detalle declara un
  `currentEpisodeNumber` distinto del pedido, la fuente está clampeando
  (el caso E2/E6/E7 del latino) → null → cae a la siguiente variante.
  Nunca más se reproduce un video que no es el cap pedido.

Con la 3.30.43 vieja + catálogo v30 el latino seguiría ganando por
prioridad y clampeando en 2/6/7 — por eso **el fix viaja en las dos
partes**: catálogo (fuentes + tope) y apps (cascada + validación).

## QA

- 973 shows, los otros 972 byte-identical (asserts del build).
- `q=7`, `x` con 7 nombres ≤ q, wps 100% ASCII sin colisión (el de flixlat
  es nuevo en el catálogo).
- Roundtrip PENC1 verificado; decrypt(catalog.json) = v30.
- Tests: TV **241/241** (`CascadaFuentes33044Test` 14 + `CategoriasFiltrosTest`
  extendido), móvil **223/223** (test de cascada diff 0 con la TV).
- Jugabilidad por relay: sub flixlat 7/7 m3u8 200 (matriz arriba).

## rollout

`v` 29→30: las apps absorben el manifiesto en ≤6 h o con "Actualizar
catálogo". La fusión es aditiva (la temporada suma la fuente sub y el tope
`m` fresco — 3.30.44 manda: las fuentes del manifiesto ganan sobre las
viejas en memoria). Instaladas **antes** de la 3.30.44: los caps 1–3
latino andan igual, el resto queda jugable por el sub **solo** con la app
nueva — actualización recomendada.
