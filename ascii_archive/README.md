# ascii_archive

Experimento de scraping y muestreo de `one-line ascii art` y `one-line text art`, sin web estática.

## Objetivo

- Recolectar catálogos existentes desde varias fuentes públicas.
- Consolidarlos en un `jsonl` reutilizable.
- Poder samplear ideas rápido sin depender de un modelo.
- Separar ASCII estricto de text art Unicode a nivel metadata.

## Fuentes actuales

- `https://www.asciiart.eu/one-line`
- `https://onelineasciiart.blogspot.com/`
- `https://www.asciiartcopy.com/one-line-ascii-art.html`
- `https://emotes.io/`
- `https://asky.lol/`
- `https://1lineart.kulaone.com/`
- `https://gist.github.com/jamiew/40c66061b666272462c17f65addb14d5`

## Archivos

- Scraper: [ascii_archive/scripts/scrape-oneline-art.mjs](./scripts/scrape-oneline-art.mjs)
- Limpiador a strings: [ascii_archive/scripts/clean-oneline-art.mjs](./scripts/clean-oneline-art.mjs)
- Sampler: [ascii_archive/scripts/sample-oneline-art.mjs](./scripts/sample-oneline-art.mjs)
- Dataset consolidado: [ascii_archive/data/oneline-art.jsonl](./data/oneline-art.jsonl)
- Array limpio de strings: [ascii_archive/data/oneline-art-strings.json](./data/oneline-art-strings.json)
- Resumen del scrape: [ascii_archive/data/oneline-art-summary.json](./data/oneline-art-summary.json)

## Uso

- Regenerar dataset: `npm run ascii:scrape`
- Generar array limpio de strings: `npm run ascii:clean`
- Samplear 12 piezas al azar: `npm run ascii:sample -- --count=12`
- Samplear solo ASCII estricto: `npm run ascii:sample -- --count=12 --ascii-only`
- Samplear por fuente: `npm run ascii:sample -- --source=asciiart.eu --count=8`
- Buscar por tema y deduplicar por art exacto: `npm run ascii:sample -- --query=rose --unique --count=20`

## Formato de salida

Cada línea del `jsonl` es un objeto JSON con campos como:

- `source`
- `source_type`
- `source_url`
- `source_category` o `source_section`
- `title`
- `art`
- `ascii_only`
- `has_placeholder`
- `line_count`
- `char_count`

## Limpieza

- `ascii_archive/scripts/clean-oneline-art.mjs` lee el `jsonl` consolidado.
- Extrae solo `art` como strings.
- Filtra entradas de menos de 11 caracteres.
- Deduplica preservando el primer orden de aparición.
- Escribe un JSON array listo para consumo directo.

## Notas

- El dataset mezcla ASCII estricto con Unicode / kaomoji / text art extendido.
- En `gist` se parsean líneas de bloques Markdown; puede haber algunos bordes decorativos o templates además de figuras.
- La salida queda pensada como corpus práctico para sampling y referencia, no como archivo “limpio” final.
