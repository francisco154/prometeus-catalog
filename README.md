# Prometeus / Pandora — Catálogo remoto

Manifiesto incremental del catálogo de Prometeus (Android TV). La app lo
consulta y **fusiona sin rebuild** (v3.28.23+):

- URL: [`catalog.json`](catalog.json) · raw: `https://raw.githubusercontent.com/francisco154/prometeus-catalog/main/catalog.json`
- Formato: igual al seed del APK (`v`, `shows[]`, `rails{}`) — solo el DELTA nuevo
- `v` crece con cada actualización; la app aplica cuando `v` > última aplicada
- Reglas: nunca borra — agrega shows nuevos, actualiza existentes, anexa rieles
