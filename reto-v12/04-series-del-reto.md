# 04 · Las 3 series del reto — datos completos y entradas v12

Las 3 series elegidas por el usuario (zip de posters, filemail
`zszuaqvuvrsagfy`), identificadas y indexadas a metadatos completos.

## A Shop for Killers — `a-shop-for-killers`

| Campo | Valor |
|---|---|
| tt | tt26450613 |
| Años | 2024–2026 |
| Rating (IMDb) | 8.0 |
| Géneros | Acción, Drama, Misterio |
| Temporadas | 2 (8 + 8 episodios) |
| En emisión | No (rango cerrado 2024–2026) |
| Sinopsis ES | Una joven es arrastrada a un peligroso submundo de asesinos y sindicatos criminales tras descubrir el pasado oculto de su tío, lo que la obliga a luchar por sobrevivir en la tienda más letal del planeta. |

## Too Much — `too-much`

| Campo | Valor |
|---|---|
| tt | tt30406366 |
| Años | 2025 |
| Rating (IMDb) | 6.3 |
| Géneros | Comedia, Romance |
| Temporadas | 1 (10 episodios) |
| En emisión | No (Ended) |
| Sinopsis ES | Tras una ruptura, Jessica, una workaholic de Nueva York, se muda a Londres con la intención de estar sola. Allí conoce a Felix, que la hace replantearse volver a enamorarse. |

## Special Ops: Lioness — `special-ops-lioness`

| Campo | Valor |
|---|---|
| tt | tt13111078 |
| Años | 2023– (TBD) |
| Rating (IMDb) | 7.8 |
| Géneros | Acción, Drama, Suspense |
| Temporadas | 3 (8 + 8 + 8 episodios) |
| En emisión | **Sí** (`em=1` → riel "en emisión" + actualizador) |
| Sinopsis ES | La agente de la CIA Joe McNamara y su equipo intentan equilibrar sus vidas personales y profesionales como punta de lanza en la guerra contra el terror de la agencia. |

## Formato exacto en `catalog.json` v12

```jsonc
{
  "i": "special-ops-lioness",
  "t": "Special Ops: Lioness",
  "k": "serie",
  "tt": "tt13111078",
  "p": "https://images.metahub.space/poster/medium/tt13111078/img",
  "b": "https://images.metahub.space/background/medium/tt13111078/img",
  "s": "La agente de la CIA Joe McNamara y su equipo…",
  "a": 2023, "f": null, "r": "7.8",
  "g": ["Acción", "Drama", "Suspense"],
  "em": 1,
  "e": [
    { "n": 1, "q": 8, "x": ["…", "…"] },
    { "n": 2, "q": 8, "x": ["…", "…"] },
    { "n": 3, "q": 8, "x": ["…", "…"] }
  ]
}
```

Póster/fondo por metahub (como el resto del catálogo); el horizontal `h`
de la plataforma se completa junto con las fuentes (ver abajo).

## Pendiente: la capa jugable (`w` por temporada)

Las 3 entradas quedaron a nivel datos. Para ser jugables en la app cada
temporada necesita sus fuentes:

```jsonc
"e": [
  { "n": 1, "q": 8, "x": […],
    "w": [
      { "w": "<paramId>-<Slug>", "v": "doblaje", "y": "<frente>" },
      { "w": "<paramId>-<Slug>", "v": "sub",     "y": "<frente>" }
    ] }
]
```

Ese `<websiteParam>` se obtiene de la ficha en la plataforma (ver
`03-algoritmo-busqueda.md` — vías para cerrarlo). En cuanto entre, el merge
por id añade `w` a las temporadas existentes y la serie aparece en el
catálogo de la app como el resto (hub de temporadas, servidores por
versión, subtítulos VTT por episodio, streams m3u8).

## Rieles actualizados en v12

- `imperdibles` += las 3 slugs (showcase del reto)
- `enEmision` += `special-ops-lioness` (única con `em=1`)
- `generos`: las 3 entradas mapeadas a sus géneros
