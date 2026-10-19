# reto-v20 — parche del póster de Barbie (2023)

> **Qué es esto.** Corrección mínima de UN campo del manifiesto: el póster
> vertical `p` del show `barbie`. **Sin shows nuevos, sin rebuild del APK.**
> Bump v19 → v20 para que los clientes lo apliquen al verificar el catálogo
> remoto (TTL de 6 h o botón "Actualizar catálogo").

## El problema

La cover vertical que traía la red (cuevana4br) para *Barbie* (2023) no era
el póster de la película: es el arte de la **Barbie de Toy Story 3** (la
muñeca "Great Shape Barbie" de Bonnie, render de Pixar). El usuario lo
reportó y subió el póster correcto a Catbox, ya verificado:

- **Antes:** `https://img.cuevana4br.com/cover/20250717/1752737660931_b588c6e75138fad29e1a1bac61121dd6fNtqD4BTFj0Bgo9lyoAtmNFzxHN.webp`
- **Ahora:** `https://files.catbox.moe/m31ef3.jpg` — teaser oficial "B"
  (Margot Robbie + Ryan Gosling, *"She's everything. He's just Ken."*,
  250×375, vertical 2:3).

## Qué NO cambia

- El **hero** `h` y el backdrop `b` quedan intactos (el horizontal estaba
  bien — orden explícita del dueño: *"el hero está bien, ese dejalo"*).
- Las 4 fuentes jugables (`w`), sinopsis, géneros, score y año quedan
  exactamente como en v19.
- Los otros **872 shows** no se tocan (verificado por diff campo a campo
  contra la v19 publicada).

## Aplicación en los clientes

`PandoraCatalogoRemoto` compara `v` del manifiesto contra la aplicada: al
subir a **v20** la próxima verificación (TTL 6 h) o el "Actualizar catálogo"
manual del buscador baja, descifra y **actualiza** el show existente — la
fusión de metadatos ya soporta parches de `p`/`h`/`s`/`r` sobre shows
existentes (desde 3.28.26). El OSD informa *"Catálogo v20: 1 título
actualizado"*.

Script reproducible: `scripts/parche_v20_barbie.py` (repo de trabajo).
