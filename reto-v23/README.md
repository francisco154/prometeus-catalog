# reto-v23/ — ingreso de 49 series nuevas (873 → 922)

Lista del dueño (TransferNow, 22/10/2026): 54 series con URL → **5 duplicadas
descartadas** (ya estaban: The Last of Us, Beef, Poker Face "Cara de póker",
3 Body Problem "El problema de los 3 cuerpos", The Sympathizer "El
simpatizante") y **49 ingresadas como nuevas**, sin superposición de shows
(verificado por websiteParam y por título contra las 873 existentes).

## Qué se extrajo DE LA FUENTE (relay /v1/pandora/detalle)

- **Paseo de temporadas** por los hubs de la URL (seasons[]): anteriores y
  siguientes — BFS temporadas × variantes de audio (dubbingList): 89
  temporadas, 227 fuentes (latino / sub / base / doblaje) — 88/224 del lote
  original + 1/3 del parche de Bastard!! S2.
- **Póster + hero horizontal** del CDN de la red (98/98 URLs verificadas 200).
- **Sinopsis** en español de la plataforma (2 curadas a mano: Los hermanos
  Sun, Hotel Costiera — la fuente solo tenía inglés).
- **Géneros** (tagNameList, ya en español) y **score** de la plataforma.
- **Título español latinoamericano** de la plataforma, con curación donde la
  red tituló raro (X-man → X-Men '97, Hechos polvo → Obliterated,
  Tripulación perdida → Star Wars: Skeleton Crew, Juegos sexuales → Cruel
  Intentions, My Life With the Walter Boys → Mi vida con los chicos Walter,
  The Brothers Sun → Los hermanos Sun, F Is for Family → F es por familia).

## Enriquecimiento externo (lo que la fuente NO tiene) — SIN IMDb

- **TVMaze** (API pública): años (a/f), estado → `em` (Running/TBD → 1,
  Ended → 0) y **nombres de episodios** (campo x: 86/88 temporadas).
- Nota: "Forever" de la lista es la de **2014 (ABC, Henry Morgan, 22 eps)** —
  la que hospeda la URL del dueño; NO la de Netflix 2025.

## Rails

- `enEmision`: 175 → **199** (24 nuevas al frente).
- `generos`: append de los ids nuevos (todas las claves ya existían).
- El resto de los rails: intactos.

## Emisión (24 nuevas con em=1, caminadas cada 4 días por el actualizador)

Espíritus en la escuela · Samurái de ojos azules · Mr. & Mrs. Smith ·
Will Trent: Agente Especial · TWD: Dead City · Avatar: La leyenda de Aang
(live-action) · Star Wars: Skeleton Crew · Matlock · High Potential ·
X-Men '97 · Tracker · TWD: Daryl Dixon · Elsbeth · Mi vida con los chicos
Walter · Tires · La lista terminal: Lobo negro · The Girlfriend ·
Sakamoto Days · Kaiju No. 8 · Dandadan · Spy x Family · Bastard!! ·
Only Murders in the Building · La residencia (renovada S2, TVMaze
desactualizado).

## Limitaciones documentadas

- **Goosebumps / Watson**: la fuente dada solo hospeda T1 (Goosebumps) y
  T1 (Watson, S2 no está en playspelis) — se ingresa lo que hay.
- Plataformas a veces van detrás de TVMaze en eps (Elsbeth T3 10/20,
  Only Murders T2 9/10): el actualizador las trae al día solo.

## Parche (post-publicación): Bastard!! S2 COMPLETA

**Resuelto.** En el lote original S2 quedó afuera porque los wps de esa
temporada llevan "‼" (U+203C) y el relay los rechaza (HTTP 400, mismo caso
que Alien³ en v19). La solución: **el sitio resuelve el websiteParam por
el ID** (prefijo de 20 chars antes del primer "-") — el mismo wp SIN "‼"
pasa la validación del relay y devuelve el detalle íntegro. Al catálogo
entra el wp saneado, jugable por relay y por directo.

- T2 agregada: **q=15 (completa, coincide con TVMaze id 61213/Netflix)**,
  3 fuentes — latino `JARtvIg…Season-2[Audio-L`, sub `ebAaBY…Season-2`,
  base/pt-BR `d41Tjk…Season-2` (todas en peliculaplay).
- Jugabilidad verificada por relay: ep 1 y ep 15 con `mediaInfoList`
  (m3u8 720P/540P/360P) en las 3 variantes; la variante sub tiene SRT
  es/en/ar por episodio.
- Sin bump de versión (v sigue 23): para verlo en un dispositivo que ya
  tenía v23 aplicada, usar "⟳ Actualizar catálogo"; instalaciones nuevas
  lo reciben al primer check.
- Detalle técnico para el futuro: si aparece una T3 con "‼" en el wp, el
  actualizador no podrá auto-descubrirla por relay (el wp canónico del
  seasons[] también lleva "‼") — aplicar la misma cirugía de saneado.

## Archivos

- `walk_v23.json` — paseo del lote original (49 shows).
- `enrich_v23.json` — enriquecimiento TVMaze.
- `cambios_v23.json` — cambios del lote original.
- `parche_bastard_s2.json` — detalle del parche (fuentes S2 saneadas +
  canónicas, técnica, QA).
