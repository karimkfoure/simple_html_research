# OpenRouter Free Landscape For The Magic Engine

Purpose: registrar research puntual sobre como aprovechar OpenRouter gratis para la caja de magia sin acoplarla a un modelo o vendor puntual.
Kind: research
Audience: contributors
Owns: notas temporales sobre modelos gratis, routing y criterios de adopcion
Last reviewed: 2026-03-23

## Contexto

Queremos spells baratos, rapidos y abundantes.

La pregunta no es solo "que modelo gratis usamos".

La pregunta correcta es:

- como usar la capa gratis actual de OpenRouter sin casarnos con ella;
- como extraer valor de su routing y sus features;
- como aceptar que los modelos gratis van a rotar, caer y mutar.

## Lo que OpenRouter ofrece hoy

Al 23 de marzo de 2026, OpenRouter mantiene una coleccion oficial de modelos gratis y la presenta como una superficie activa de experimentacion. La pagina de la coleccion dice que sus rankings de free models fueron actualizados en marzo de 2026 y que siguen expandiendo capacidad gratuita, aunque sin garantizar el futuro.

Tambien ofrecen un router especifico, `openrouter/free`, publicado el 1 de febrero de 2026, con ventana de contexto de 200k y costo `0/M` tanto en input como en output. Segun la pagina oficial, ese router elige modelos gratis "at random" y filtra automaticamente por las features requeridas del request, incluyendo structured outputs y tool calling.

## Muestra del landscape gratis actual

Ejemplos visibles en la coleccion oficial al 23 de marzo de 2026:

- `stepfun/step-3.5-flash` (free)
- `nvidia/nemotron-3-super` (free)
- `arcee-ai/trinity-large-preview` (free)
- `z-ai/glm-4.5-air` (free)
- `qwen/qwen3-next-80b-a3b-instruct` (free)
- `minimax/minimax-m2.5` (free)
- `qwen/qwen3-coder-480b-a35b` (free)
- `openai/gpt-oss-120b` (free)
- `meta-llama/llama-3.3-70b-instruct` (free)
- `openai/gpt-oss-20b` (free)
- `mistralai/mistral-small-3.1-24b` (free)

Esto no significa que todos convengan para todos los spells.

La inferencia correcta es otra:

- hay suficiente variedad gratis como para no arrancar con un solo modelo;
- el paisaje cambia rapido;
- nos conviene pensar en clases de magia y politicas de routing, no en una tabla fija de "modelo oficial del sitio".

## Features de OpenRouter que nos sirven mucho

### 1. `openrouter/free`

Sirve como carril inicial para spells `wild`.

Valor:

- cero costo directo por token;
- no hay que elegir un modelo puntual para arrancar;
- el router ya filtra por features del request.

Limite:

- la propia descripcion oficial deja claro que la seleccion es variable;
- eso lo vuelve buen laboratorio, no contrato estable de producto.

## 2. Provider selection

OpenRouter deja controlar routing por request con `provider`.

Segun la documentacion oficial, podemos tocar:

- `order`
- `allow_fallbacks`
- `require_parameters`
- `data_collection`
- `zdr`
- `sort` por `price`, `throughput` o `latency`

Eso sirve muchisimo para el motor porque nos permite una postura intermedia:

- libre para explorar;
- concreta cuando una feature exige forma o privacidad.

## 3. Structured outputs

OpenRouter soporta structured outputs con `response_format.type = "json_schema"` en modelos compatibles.

Esto es clave para spells `stable` que devuelven forma y no solo tono.

No deberiamos asumir soporte universal.

La combinacion correcta para ese carril parece ser:

- spells que piden JSON;
- `require_parameters: true`;
- output validation propia igualmente.

## 4. Prompt caching

OpenRouter documenta prompt caching y sticky routing para maximizar cache hits.

Eso puede servirnos mucho en spells donde la parte fija del prompt pesa mas que el input variable.

Casos claros:

- voces o personajes;
- spells con worldbuilding fijo;
- spells con instrucciones largas y output corto.

No es la palanca principal para los sparks mas chicos, pero si para magia con contexto repetido.

## 5. ZDR y politicas de datos

OpenRouter soporta Zero Data Retention por request o por routing policy.

Eso no vuelve automaticamente privado a cualquier request, pero si nos deja subir el piso de cuidado cuando el spell maneja contexto sensible.

## 6. Models API

OpenRouter expone `/api/v1/models` y documenta un Models API con metadata estandarizada de modelos.

Inferencia nuestra a partir de esa documentacion:

- podemos inspeccionar pricing y capacidades programaticamente;
- podemos construir una vista local de "modelos gratis hoy";
- podemos evitar hardcodear demasiado una lista manual.

Esa parte conviene tratarla como automatizacion util, no como verdad eterna.

## Recomendacion de arquitectura

### Carril 1: `wild`

Usar `openrouter/free` como default.

Ideal para:

- descubrimiento;
- micro-magia;
- laboratorio de tono;
- surfaces donde el fallback local ya es suficientemente digno.

Politica sugerida:

- timeout corto;
- cache chica;
- fallback local siempre;
- observabilidad fuerte;
- posibilidad de overrides server-side.

### Carril 2: `stable`

No usar el router gratis totalmente abierto como unico contrato.

Mejor:

- curated model hints o allowlists;
- `require_parameters: true` cuando haga falta structured output;
- `sort` por `latency` o `throughput` segun el tipo de spell;
- fallback local o templated.

### Carril 3: evolucion automatica

Cuando el motor madure, convendria sumar una tarea periodica que relea el Models API y reconstruya una shortlist de candidatos gratis por clase.

No para autopilot total.

Si para evitar que la capa gratis quede congelada en una decision vieja.

## Criterio practico

La decision no deberia ser:

- "todo gratis"
- o "todo estable y curado"

La decision correcta parece ser:

- gratis y cambiante para descubrir;
- mas curado para consolidar;
- siempre con fallback local;
- siempre con ability to bail out.

## Riesgos reales

- churn de modelos gratis;
- capacidad o cuota variable;
- latencia inestable;
- diferencias de calidad muy fuertes entre clases de spell;
- soporte desigual para structured outputs o tools;
- politicas de datos distintas entre providers.

## Conclusion operativa

OpenRouter gratis si sirve para esta idea.

No como roca fundacional.

Si como cielo experimental muy valioso arriba de una arquitectura propia que:

- abstrae por `spell`;
- separa `wild` y `stable`;
- valida outputs;
- usa routing configurable;
- no muere si el vendor del dia se cae.

## Fuentes

- https://openrouter.ai/collections/free-models
- https://openrouter.ai/openrouter/free
- https://openrouter.ai/docs/guides/routing/provider-selection
- https://openrouter.ai/docs/guides/features/structured-outputs
- https://openrouter.ai/docs/guides/best-practices/prompt-caching
- https://openrouter.ai/docs/guides/features/zdr
- https://openrouter.ai/docs/api-reference/models/get-models
