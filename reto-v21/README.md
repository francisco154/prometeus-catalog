# reto-v21 — alineación del flag "en emisión" con la revisión del dueño

> **Qué es esto.** El dueño revisó **las 385 series** del catálogo una por
> una (estados al 21/10/2026, `series_estado.md`) y pidió verificar que el
> **actualizador automático de Pandora** no le falte ninguna serie en
> emisión. La verificación encontró 57 series en emisión que el sistema
> **no estaba actualizando**. **Sin shows nuevos, sin rebuild del APK.**
> Bump v20 → v21: llega solo por la descarga cifrada de siempre
> (TTL 6 h o botón "Actualizar catálogo").

## El problema

`PandoraActualizador` pasea cada 9 días **solo** las series con `em=1`:

```kotlin
val enEmision = PandoraApi.shows().filter { it.emision && it.esSerie }
```

El cruce contra la revisión manual dio:

| Hallazgo | Antes | Ahora |
|---|---|---|
| Series en emisión **sin campo `em`** (no se actualizaban) | 49 | 0 |
| Series en emisión con **`em=0`** (no se actualizaban) | 8 | 0 |
| Series en emisión cubiertas correctamente (`em=1`) | 100 | **175** |
| `em` como string `"1"` (funcionaba por `asInt`, pero inconsistente) | 34 | 0 (todo int) |
| Series **finalizadas/canceladas** que seguían paseándose cada 9 días | 16 | 0 |
| Rail **"En emisión"** de la UI | 114 (con 14 muertas) | **175** (exactas) |

Las 57 series en emisión que quedaban fuera del actualizador incluían, por
ejemplo: *1899, Anne Rice's Mayfair Witches, Harley Quinn, Mentes
Criminales, NCIS, Taboo, Scrubs, Alien: Earth, Deli Boys, P-Valley,
Selling Sunset, Wonder Egg Priority, Vampirina*… y 8 mal marcadas `em=0`
(*All Her Fault, Atrapados, Good American Family, La voz ausente, Long
Bright River, Suits LA, Vientos de agua, División Palermo*).

Las 16 **demociones** (dejan de gastar un paseo cada 9 días, ya no emiten):
*Boruto, Euphoria, Hacks, Ley y Orden: Crimen Organizado, Long Story Short,
Margarita, Mid-Century Modern, Power Book III: Raising Kanan, Primos,
Shaque, Soy Luna: Volver a rodar, The Comeback, The Couple Next Door,
Twilight of the Gods, Vuelven los magos de Waverly Place, Yellowjackets*.

## Qué cambia exactamente

- `em: 1` (int) en las **175 series en emisión** según la revisión.
- `em: 0` en las 16 demociones.
- Normalización `em` string → int en todo el manifiesto.
- `rails.enEmision` reconstruido: las 75 que faltaban primero, luego las
  100 ya presentes en su orden original. 114 → 175, sin finalizadas.
- **Nada más**: 873 shows, pósters, fuentes, sinopsis, géneros y los otros
  rieles quedan byte a byte igual que v20 (verificado por diff).

## Verificación final

- 175/175 series en emisión con `em=1` + última temporada con fuente
  jugable + presentes en el rail. 0 faltantes, 0 falsos positivos.
- Las 190 finalizadas y 20 canceladas de la revisión: ninguna con `em=1`.
- Roundtrip PENC1 íntegro tras el cifrado.
