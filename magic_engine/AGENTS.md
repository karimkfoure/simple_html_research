# Proyecto

Laboratorio estático para iterar `spells`, prompts, logging y UX del `magic engine` sin contaminar otros repos en migración.

# Regla principal

Todo debe poder abrirse como HTML estático y entenderse rápido.

El experimento puede usar OpenRouter desde el browser sólo para debug local, nunca con secrets embebidos en el código.

# Stack y límites

- HTML estático.
- CSS.
- JavaScript nativo ESM.
- Sin frameworks.
- Sin build step.
- Sin backend propio.
- La API key se pega manualmente y vive sólo en `localStorage` del navegador del usuario.

# Objetivo del experimento

- Probar spells concretos.
- Ajustar prompts y constraints.
- Ver payloads, salidas y errores.
- Guardar logs exportables.
- Separar exploración, research y prototipado del repo de producto.

# Reglas de implementación

- Mantener el core del engine reusable y desacoplado de la UI.
- Toda telemetría de debug debe ser visible y exportable desde la interfaz.
- No commitear keys.
- Si una mejora es claramente reusable para producto, dejarla encapsulada para poder portarla después.
