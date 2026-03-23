# magic_engine

Experimento estático para iterar el `magic engine` y sus `spells` fuera de `losdoschinos`.

## Qué hay acá

- `index.html`: shell del laboratorio.
- `styles.css`: UI del sandbox.
- `js/main.js`: bootstrap.
- `js/app.js`: UI, estado y acciones del laboratorio.
- `js/log-store.js`: persistencia local y export de logs.
- `js/engine/`: core del engine, spellbook y portal OpenRouter.
- `research/`: material movido desde `losdoschinos/explorations/magic-engine/`.
- `tests/magic_engine.spec.js`: smoke E2E del experimento.

## Uso local

1. Abrir `/magic_engine/` servido desde el root del repo.
2. Pegar una `OpenRouter API key` en la UI.
3. Ejecutar casts del spell `ascii-note-title`.
4. Mirar resultados, modelos, errores y exportar logs JSONL.

## Publicación

La web publicada no lleva secretos. La key se guarda sólo en `localStorage` del navegador de quien la use.
