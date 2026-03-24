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
3. Elegir una variante de `one-line ascii art` o correr todas en batch.
4. Ajustar cantidad de opciones, seed y frase semilla cuando aplique.
5. Mirar resultados por escenario, modelos, errores y exportar logs JSONL.

## Qué vale la pena retener

- La unidad útil no es un prompt suelto sino un `spell` con contrato, constraints y routing propios.
- `openrouter/free` funciona mejor como portal dinámico primario que como lista dura de modelos en código.
- La interfaz de laboratorio necesita mostrar tanto el output limpio como el payload/log de cada cast para depurar modelos gratis inestables.
- Todo esto conviene iterarlo en sandbox estático antes de decidir qué vuelve al repo de producto.

## Publicación

La web publicada no lleva secretos. La key se guarda sólo en `localStorage` del navegador de quien la use.
