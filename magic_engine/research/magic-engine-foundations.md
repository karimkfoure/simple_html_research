# Magic Engine Foundations

Purpose: capturar la base exploratoria de la caja de magia generativa antes de bajarla a una propuesta tecnica concreta en `docs/`.
Kind: research
Audience: contributors
Owns: lenguaje, principios, contratos flexibles y carriles de experimentacion del motor de magia
Last reviewed: 2026-03-23

## North Star

Queremos una maquinita backstage que pueda tirar chispas, rarezas y pequeñas piezas de encanto a pedido.

No una capa de AI corporativa.
No un chatbot pegado por todos lados.
No prompts desperdigados como cables pelados.

La idea es una caja negra con muy buenos modales:

- recibe un pedido chiquito;
- sabe que forma debe tener la respuesta;
- elige un portal/modelo disponible;
- valida el resultado;
- si la nube falla, igual devuelve algo digno.

La web puede sentirse juguetona y viva.
La complejidad queda encerrada atras.

## Tesis

La unidad correcta no es "un prompt".

La unidad correcta es un `spell`: un hechizo versionado que describe una clase de salida, sus restricciones, su humor, su politica de routing y su forma de caer con gracia.

El producto nunca deberia saber:

- que prompt exacto se uso;
- que vendor esta detras;
- que modelo gratuito estaba vivo esa semana.

El producto solo deberia decir:

- "tirame este hechizo";
- "aca esta el contexto";
- "devolveme algo limpio".

## Decisiones cerradas

- Backend only. El browser no habla directo con modelos.
- `OpenRouter` puede ser el primer portal, pero no el centro conceptual del sistema.
- La politica es `free-first`, no fanatica de un vendor.
- Los hechizos viven en el repo y se versionan con git.
- No hay prompt box libre para el cliente en la primera version.
- Toda salida pasa por validacion y normalizacion server-side.
- Cada hechizo debe tener fallback.
- Esta caja de magia no toca auth, permisos, seguridad ni verdad canonica del sistema.

## Lo que no queremos

- Una feature factory de "metamos LLM aca tambien".
- Una dependencia fragil de modelos gratis del momento.
- Un engine que solo funcione cuando Internet y el vendor estan de buen humor.
- Un sistema donde cada consumer inventa su prompt y su parser.
- Una abstraccion tan seria que mate la gracia del sitio.

## Principio rector: hard shell, loose center

La caja de magia tiene que nacer con bordes firmes y centro flexible.

Bordes firmes:

- auth;
- allowlist de hechizos;
- rate limits;
- timeouts;
- privacidad;
- validacion de salida;
- fallback;
- observabilidad.

Centro flexible:

- prompts;
- ejemplos;
- mood;
- sampling;
- transforms;
- hints de provider;
- postprocesado;
- experimentos raros que todavia no entendemos del todo.

Si endurecemos tambien el centro, el engine se vuelve prolijo pero esteril.
Si aflojamos los bordes, se vuelve una bolsa de cables.
Queremos exactamente lo contrario: carcasa dura, interior vivo.

## Abstraccion central: `spell`

Un `spell` es un contratito para "generame una cosa y mantenete dentro de estas lineas".

Tiene que definir:

- que input acepta;
- que shape debe tener la salida;
- que constraints son duras y cuales son solo empujones suaves;
- que mood o energia busca;
- que clase de modelo necesita;
- como cachea;
- como degrada.

No todo `spell` debe nacer igual de encerrado.

Necesitamos dos carriles:

- `stable`: hechizos para superficies visibles y repetibles, con output bien cercado.
- `wild`: hechizos de laboratorio, mas porosos y exploratorios, utiles para descubrir rituales nuevos antes de endurecerlos.

Shape inicial sugerido:

```js
{
  id: "spark/example",
  version: 1,
  lane: "stable" | "wild",
  visibility: "public" | "private",
  contract: {
    mode: "text" | "json" | "hybrid",
    inputSchema: {
      type: "object"
    },
    outputSchema: {
      type: "string"
    }
  },
  prompt: {
    system: "template del repo",
    user: "template del repo",
    examples: []
  },
  mood: {
    energy: "soft" | "bright" | "odd",
    weirdness: 0.4,
    warmth: 0.7
  },
  constraints: {
    hard: {
      minChars: 1,
      maxChars: 120,
      maxLines: 3,
      asciiOnly: false,
      allowEmoji: true,
      maxEmoji: 2,
      forbiddenSubstrings: []
    },
    soft: {
      targetChars: 80,
      preferredShape: "short-bursty",
      preferredTexture: ["warm", "slightly odd"]
    }
  },
  routing: {
    class: "spark" | "shape" | "voice",
    timeoutMs: 2500,
    maxAttempts: 2,
    providerOrder: ["openrouter", "local-fallback"],
    modelHints: ["openrouter/free"],
    providerPreferences: {
      sort: "price",
      requireParameters: false
    }
  },
  cache: {
    strategy: "none" | "exact-input" | "time-window",
    ttlSeconds: 300
  },
  fallback: {
    kind: "pool" | "template" | "none"
  },
  lab: {
    allowSamplingOverrides: false,
    allowPromptFragmentsFromServer: false,
    allowModelHintsAtCallTime: false,
    debugVisible: false
  }
}
```

Punto importante:

- `contract` define el borde duro;
- `mood`, `soft`, `examples` y `lab` mantienen espacio para jugar;
- `wild` puede abrir knobs extra sin contaminar los hechizos `stable`.

## Vocabulario del sistema

- `spell`: la definicion versionada.
- `spellbook`: el registro de hechizos habilitados.
- `cast`: una ejecucion concreta de un hechizo.
- `portal`: un adapter a un proveedor externo.
- `local-fallback`: magia sin red, mas simple pero siempre disponible.

Podemos usar estos nombres en codigo o dejarlos como alias conceptuales.
Lo importante es que la arquitectura se sienta propia.

## Capas de la caja de magia

### 1. Spellbook (`registry`)

Un registro local, chico y tipado.

Responsabilidades:

- listar los hechizos existentes;
- versionarlos;
- validar sus schemas;
- marcar cuales son publicos y cuales no;
- evitar que el cliente invente hechizos por su cuenta.

### 2. Ritual runner (`orchestrator`)

Es el corazon real del sistema.

Responsabilidades:

- tomar un `spellId`;
- validar el input;
- armar el prompt final;
- elegir portal/modelo segun politica;
- correr timeout y retry corto;
- parsear y validar la salida;
- normalizar el resultado;
- cachear si aplica;
- caer al fallback si hace falta;
- dejar telemetria.

Tambien debe saber distinguir entre:

- casts `stable`, donde priorizamos consistencia;
- casts `wild`, donde priorizamos exploracion controlada.

### 3. Portals (`provider adapters`)

Cada portal habla con un proveedor concreto.

El primero puede ser `OpenRouter`.
El segundo deberia ser local.
Mas adelante puede haber otros.

Los consumers no deberian enterarse nunca.

### 4. Output bouncer (`validator + normalizer`)

La parte mas importante despues del orquestador.

No alcanza con pedirle algo lindo al modelo.
Hay que revisarlo en la puerta.

Chequeos base:

- schema;
- longitud;
- cantidad de lineas;
- charset;
- emojis;
- texto prohibido;
- JSON valido;
- trimming y limpieza de whitespace.

Si no pasa, se reintenta dentro de un limite corto o se degrada.

### 5. Memory drawer (`cache`)

No queremos pedirle al cielo lo mismo veinte veces.

La cache sirve para:

- bajar latencia;
- bajar dependencia de red;
- abaratar uso;
- hacer que ciertos pedidos se sientan estables un rato.

### 6. Telemetry

Sin esto la magia parece magia, pero operar seria ceguera.

Hay que registrar:

- spell;
- provider;
- modelo resuelto;
- latencia;
- cache hit;
- fallback;
- parse failures;
- constraints failures.

## Clases de magia

En vez de atar cada hechizo a un modelo puntual, conviene definir clases de capacidad:

- `spark`: salidas brevísimas, juguetonas, baratas y de alta rotacion.
- `shape`: salidas estructuradas que tienen que obedecer formato.
- `voice`: salidas un poco mas largas donde importa tono consistente.

La politica de routing resuelve el mejor candidato disponible para cada clase.

Orden de prioridad sugerido:

1. disponibilidad real;
2. costo;
3. latencia;
4. obediencia al formato;
5. calidad suficiente.

Eso evita enamorarnos del modelo gratis de turno.

## Stable lane vs wild lane

La arquitectura no deberia obligarnos a decidir demasiado pronto que forma final tiene cada uso.

Por eso conviene separar:

### `stable`

Para hechizos que ya demostraron valor y necesitan output confiable.

Reglas:

- output schema claro;
- hard constraints completas;
- fallback obligatorio;
- cache mas agresiva;
- menos knobs expuestos por request.

### `wild`

Para explorar comportamientos todavia nebulosos.

Reglas:

- puede tener output menos cercado;
- puede aceptar `mood`, `references`, `sampling` o `promptFragments` desde server;
- puede guardar metadata rica del cast para aprender;
- no entra en superficies criticas;
- se puede apagar facil si se pone baboso.

La idea es no matar la exploracion solo porque sabemos que mas adelante habra consumers serios.

## Constraints primero, prompt despues

La gracia real del sistema no esta en tener prompts ingeniosos.

Esta en poder decir con dureza:

- cuanto puede medir una salida;
- cuantos renglones puede ocupar;
- si acepta o no emoji;
- si debe ser ASCII;
- si puede devolver Markdown o HTML;
- si tiene que respetar un schema JSON;
- si hay palabras o formas prohibidas.

Sin esa capa esto seria solo un envoltorio coqueto para prompts sueltos.

Pero `constraints` no deben convertirse en un corset universal.

Regla util:

- `hard constraints` para proteger interfaz y UX;
- `soft constraints` para orientar tono, densidad o energia sin volver binario todo el sistema.

## Mood sin rigidez

Cada hechizo puede declarar `mood`.

No para volver la arquitectura poetica por capricho, sino para separar:

- formato duro;
- tono blando.

El tono puede cambiar.
El contrato no.

Eso nos deja construir magia con personalidad sin romper la interfaz tecnica.

## Parametros que vale la pena dejar abiertos

Para no empaquetar demasiado el motor, conviene aceptar desde el inicio algunos espacios opcionales de experimentacion server-side:

- `examples`: mini few-shots por hechizo;
- `references`: fragmentos de tono o textura;
- `sampling`: `temperature`, `top_p`, `top_k` u otros knobs equivalentes;
- `postprocessors`: transforms chicos encadenables;
- `modelHints`: sugerencias, no promesas;
- `promptFragments`: injertos locales y temporales para laboratorio;
- `castTags`: etiquetas para aprender despues que experimentos funcionaron.

Nada de esto deberia quedar expuesto como superficie libre al browser publico.
Pero si el backend no puede jugar con estas piezas, el engine nace demasiado cerrado.

## Fallbacks

La regla es simple:

No sad spinners.

Si el portal cae, si el modelo tarda demasiado o si la salida viene rota, cada hechizo ya tiene declarada una forma de caer:

- `pool`: elegir algo de una lista local;
- `template`: componer con piezas chicas locales;
- `none`: responder indisponible y dejar no-op elegante.

La web no deberia volverse gris solo porque un vendor externo amanecio caprichoso.

## OpenRouter fit

`OpenRouter` calza bien como primer portal porque nos deja:

- arrancar con modelos gratis o casi gratis;
- rutear por capacidades en vez de integraciones por vendor;
- cambiar de modelo sin reescribir la interfaz del producto;
- exigir features como structured outputs o tool use cuando hagan falta.

Pero el engine no debe asumir que "gratis" equivale a "siempre ahi".

La postura correcta es:

- `OpenRouter` como portal experimental fuerte;
- `openrouter/free` como carril rapido para spells `wild`;
- curated allowlists y `requireParameters` para spells `stable`;
- fallback local siempre presente.

## Seguridad y bordes

- Las claves viven solo en backend.
- El cliente no elige provider ni modelo.
- El cliente no manda prompt libre.
- Hay allowlist de `spellId`.
- Debe haber rate limit por sesion e IP.
- No se mandan secretos ni contenido sensible a un portal salvo necesidad explicita.
- El output siempre se trata como no confiable hasta pasar por el bouncer.
- Esta infraestructura no decide nada sensible del sistema.

## Persistencia recomendada

Mantener esto flaco al principio.

Conviene arrancar con:

- `spellbook` en codigo;
- cache chica en D1 con hash de `spell + version + input normalizado`;
- logs estructurados;
- tabla de eventos solo si los logs quedan cortos.

No hace falta una UI de admin de prompts desde el dia uno.

## API sugerida

Nombre posible:

- `POST /api/magic/:spellId`

Body:

```json
{
  "input": {},
  "seed": "optional",
  "preview": false
}
```

Respuesta normalizada:

```js
{
  ok: true,
  spellId: "spark/example",
  spellVersion: 1,
  output: "resultado ya limpio",
  source: {
    provider: "openrouter",
    model: "resolved-at-runtime",
    cacheHit: false,
    fallbackUsed: false
  },
  timings: {
    totalMs: 842
  }
}
```

El consumer pide magia.
No pide prompts.

Los casts `wild` pueden aceptar, solo desde server, un bloque opcional como:

```json
{
  "overrides": {
    "mood": { "weirdness": 0.8 },
    "sampling": { "temperature": 1.1 },
    "modelHints": ["openrouter/free"]
  }
}
```

Eso permite explorar sin ensuciar el contrato base del hechizo.

## Testing

Si esto no se testea bien, enseguida se vuelve una caja negra babosa.

Cobertura minima:

- unit tests del `spellbook`;
- unit tests del ritual runner con portals fake;
- tests de constraints y normalizacion;
- tests de fallback ante timeout, cuota o parse roto;
- tests HTTP de allowlist y input invalido;
- fixtures dorados por hechizo cuando el formato importe mucho.

## Plan por fases

### Fase A: Fake magic first

Objetivo:

Cerrar la abstraccion antes de depender de un proveedor real.

Entregables:

- `spellbook`;
- ritual runner;
- constraints validator;
- fallback local;
- endpoint `/api/magic/:spellId`;
- tests del motor.

Done:

- ya existe una caja negra consistente;
- los consumers hablan con una interfaz estable;
- la magia funciona incluso sin red.
- existe diferencia explicita entre carril `stable` y carril `wild`.

### Fase B: Open the first portal

Objetivo:

Conectar `OpenRouter` sin contaminar el resto de la arquitectura.

Entregables:

- `OpenRouterPortal`;
- config por env;
- timeout corto;
- retry acotado;
- logs estructurados;
- cache basica;
- soporte inicial para `openrouter/free`.

Done:

- alternar entre portal real y fallback local no rompe nada;
- el consumer sigue sin saber que modelo hay detras;
- los errores externos no salpican la UI.
- los spells `wild` pueden probar modelos gratis sin convertir eso en dependencia estructural.

### Fase C: Sharp shapes

Objetivo:

Hacer confiable el camino de salidas estructuradas o especialmente delicadas.

Entregables:

- soporte serio para `mode = "json"`;
- reparacion de parseo con un reintento maximo;
- limpieza comun de strings;
- enforcement real de constraints;
- fixtures dorados por hechizo;
- endurecimiento de `stable spells` sin ahogar la `wild lane`.

Done:

- el sistema puede exigir forma, no solo tono;
- los retries quedan bajo control;
- la tasa de fallback y parse failure queda medida.

### Fase D: Operable magic

Objetivo:

Volver la caja de magia una infraestructura querida, no un truco inestable.

Entregables:

- rate limits por hechizo;
- toggles para apagar hechizos o portals;
- metricas de latencia y fallas;
- politicas de cache por clase.

Done:

- una pieza rota se puede apagar sin drama;
- la dependencia de modelos gratis deja de ser fragil;
- sumar nuevos consumers ya no implica inventar infraestructura.
- el laboratorio sigue abierto sin contaminar el carril estable.

## Regla de adopcion

Un consumer nuevo solo deberia entrar a esta caja de magia si cumple esto:

- la salida no decide nada critico;
- existe fallback digno;
- sus constraints son expresables y testeables;
- la gracia que agrega justifica la complejidad backstage.

Si no pasa ese filtro, no entra.

## Criterio de exito

Esto estara bien hecho cuando:

- agregar un hechizo nuevo sea trabajo de configuracion, tono y tests;
- cambiar de provider no obligue a reescribir producto;
- la web se sienta mas viva sin sentirse mas pesada;
- la magia abunde adelante;
- el barro quede encerrado atras.
