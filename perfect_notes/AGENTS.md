# Proyecto

Web local personal de notas, extremadamente simple.

La referencia es Apple Notes en interacción, no en estética.

La meta es lograr una experiencia que se entienda sola, funcione perfecto en desktop y mobile, y siga sintiéndose casi como HTML crudo.

# Regla principal

Mantenerlo simple.

Si algo agrega sensación de “app”, complejidad visual, controles redundantes o interacción escondida, está mal salvo prueba clara de lo contrario.

# Stack y límites

- HTML.
- CSS mínimo.
- JavaScript nativo.
- Sin frameworks.
- Sin dependencias.
- Sin persistencia por ahora.
- Sin integraciones por ahora.

# Dirección visual

- Casi HTML crudo.
- Rectángulos simples para notas.
- Sin sombras, ornamentos, overlays ni barras pesadas.
- Sin copy decorativo ni helpers verbosos.
- El CSS existe sólo para layout, legibilidad, foco, touch targets y responsive.

# Modelo de producto

La interfaz es un listado vertical de notas.

Cada nota:

- es un rectángulo simple;
- tiene una primera línea opcional que actúa como título;
- tiene un cuerpo continuo;
- mezcla texto normal y checklist dentro de la misma nota.

El feed de notas se lee en orden inverso:

- las notas nuevas aparecen arriba;
- las notas pineadas viven siempre por encima del feed normal.
- la creación de notas pertenece al feed, no al cuerpo de cada nota.

No pensar esto como una app de tareas.

Pensarlo como una nota escrita libremente, donde en algunos puntos del documento se convierten líneas en checklist.

# Hallazgos de referencia Apple Notes

Basado en documentación oficial de Apple para Mac e iPhone/iPad:

- la primera línea de una nota se usa como título;
- ese título puede vivir visualmente en un `fieldset > legend` sin depender de placeholders;
- la nota es un documento continuo;
- el texto normal es el modo por defecto;
- el checklist se inserta en el punto actual o convierte líneas existentes;
- un subitem no es un tipo distinto: es un item ya existente con más indentación;
- continuar una lista crea más items del mismo tipo;
- salir de una lista vuelve a párrafo normal;
- en desktop la indentación se hace después sobre el item;
- en mobile Apple usa controles de formato y gestos, no una UI separada por “subitem”.

# Decisiones de MVP

Estas decisiones quedan activas para el MVP salvo cambio explícito:

- No existe botón `+ subitem`.
- La acción visible principal dentro de la nota es contextual.
- Desde texto normal debe leerse como `+ checklist`.
- Desde un item de checklist debe leerse como `+ item`.
- Esa acción inserta checklist debajo de la línea actual y, si la línea actual está vacía, crea el checklist en esa misma línea.
- La indentación es una acción posterior sobre un item ya creado.
- La nota debe sentirse como documento primero, checklist después.

# Qué debe poder hacer el MVP

## A nivel lista de notas

- mostrar varias notas en columna;
- agregar una nota nueva en la parte superior del feed no pineado;
- permitir pinear y despinear una nota;
- abrir y editar cualquier nota sin navegación compleja.

## A nivel nota

- editar el título en la primera línea;
- editar texto libre en el cuerpo;
- insertar checklist en la línea actual o debajo de la línea actual;
- continuar un checklist creando otro item debajo;
- indentar un item existente;
- sacar nivel a un item existente;
- marcar y desmarcar items;
- borrar líneas o items vacíos;
- convivir texto normal y checklist en la misma nota.

# Modelo mental de interacción

La unidad principal de edición es la nota completa, no una fila.

El usuario debería sentir:

1. Estoy escribiendo una nota normal.
2. En esta línea quiero que empiece un checklist.
3. Sigo escribiendo items.
4. Si uno necesita ser hijo de otro, recién ahí lo indento.
5. Si termino el checklist, sigo con texto normal.

# Interacciones visibles mínimas

Para la línea activa dentro de la nota:

- `+ checklist` cuando la línea activa es texto normal
- `+ item` cuando la línea activa ya pertenece a un checklist

Para la nota:

- el footer queda reservado para metadata, no para estados artificiales ni acciones
- editor y timestamp viven solos en el footer
- las acciones de nota viven inline dentro del `legend`, al lado del título
- dentro del `legend`, el título queda a la izquierda con ancho auto y las acciones quedan alineadas al extremo derecho de la nota
- esas acciones deben sentirse como micro-controles icónicos, no como links de texto
- el pin debe ser un toggle con estado visual claramente distinto entre pineada y no pineada
- pinear o despinear una nota debe pedir confirmación nativa del navegador antes de ejecutarse
- junto a esa acción existe `borrar` como icono secundario para eliminar la nota
- el borrado de nota debe pedir confirmación nativa del navegador antes de ejecutarse

Para un item de checklist activo, inline:

- flecha derecha para indentar
- flecha izquierda para sacar nivel

Estas acciones deben ser:

- visibles;
- locales;
- obvias;
- táctiles;
- discretas.

# Interacciones que NO deben ser centrales

- Atajos complejos de teclado.
- Toolbars globales cargadas.
- Controles separados para cada variante estructural.
- Múltiples botones que expliquen demasiado el modelo.

El teclado puede ayudar, pero no puede ser requisito para entender el sistema.

# Requisitos de UX

- La primera lectura de la pantalla debe sugerir “esto es una nota”.
- La segunda lectura debe dejar claro cómo meter checklist.
- El flujo principal en mobile debe ser tan claro como en desktop.
- Los controles deben ser grandes para tocar, pero visualmente livianos.
- El foco activo debe ser claro sin meter UI aparatosa.
- El usuario nunca debería sentir que “cambió de editor”.

# Requisitos de implementación

- DOM chico.
- Estado simple.
- Semántica clara.
- Responsive natural.
- Sin dependencia en rich text pesado si no es estrictamente necesario.
- Cada decisión técnica debe justificarse por robustez de edición y claridad de UX.

# Riesgos a evitar

- Convertir toda la nota en una grilla de bloques con feeling de formulario.
- Que cada línea tenga demasiados botones.
- Que la UI explique demasiado y rompa la crudeza del documento.
- Que mobile quede peor por intentar imitar desktop.
- Que la estructura interna del documento complique edición básica.

# Spec funcional del MVP

## Nota nueva

- Una nota nueva aparece como un rectángulo simple.
- La primera línea editable es un título opcional.
- El título idealmente vive en un `fieldset > legend`.
- El título puede tener un placeholder sutil en gris claro.
- Ese placeholder funciona como identificador liviano de la nota cuando no hay título escrito.
- El placeholder del título se compone de emojis ASCII aleatorios, memorables y discretos.
- El placeholder del título debe salir de una fuente dedicada de hints para poder reemplazarla más adelante por un provider externo.
- El ancho visual del título debe ajustarse a su contenido.
- El título no debe reservar ancho fijo innecesario.
- El título puede medir desde un carácter visible hasta un máximo de media nota.
- Debajo empieza el cuerpo.
- El cuerpo arranca con una línea de texto normal vacía.
- Si el cuerpo completo de una nota está vacío, esa primera línea debe mostrar un placeholder sutil `hola?`.
- Ese placeholder del cuerpo debe salir de una fuente dedicada e independiente de la del título, para poder reemplazarla más adelante por otro provider.
- Al crear una nota nueva, el foco debe caer en el cuerpo, no en el título.
- Cada nota muestra un footer mínimo alineado abajo a la derecha con el editor y la fecha/hora de última edición en hora argentina.

## Texto normal

- Es el estado por defecto.
- Se puede escribir sin elegir ningún modo.
- Desde una línea de texto normal, `+ checklist` inserta un checklist debajo.
- Si la línea actual está vacía, `+ checklist` crea el checklist en esa misma línea.
- Una vez dentro de un checklist, esa misma acción pasa a leerse como `+ item`.
- `Enter` inserta salto de línea dentro del mismo bloque de texto.
- Dos `Enter` seguidos al final del bloque crean un nuevo párrafo debajo.
- `Shift+Enter` queda disponible para salto de línea dentro del bloque.
- En web, `ArrowUp` y `ArrowDown` deben poder recorrer el documento cuando el cursor ya está en el borde superior o inferior del bloque actual.

## Checklist

- Un item de checklist tiene checkbox, texto e indentación opcional.
- Un item indentado es un subitem.
- Un item vacío puede borrarse fácilmente.
- El borrado de bloques vacíos debe recorrer la nota en el orden visible real del documento, incluyendo subitems antes que su padre superior.
- Un checklist puede coexistir entre párrafos normales.
- `Enter` en un item no vacío crea otro item debajo.
- `Enter` en un item vacío no debe saltar directo al texto base si todavía hay niveles de indentación.
- En un item vacío anidado, cada `Enter` debe sacar un solo nivel por vez.
- Sólo al llegar al nivel base, `Enter` en item vacío vuelve esa línea a texto normal.
- Si un item vacío de nivel base tiene hijos, esos hijos deben conservarse y reacomodarse sin perderse al salir del checklist.

## Indentación

- Se aplica sólo sobre items de checklist.
- No se ofrece como acción para texto normal.
- Si un item no puede cambiar de nivel, la acción no aparece.
- En web, `Tab` debe indentar el item actual bajo el checklist anterior cuando eso sea válido.
- En web, `Shift+Tab` debe sacar un nivel al item actual.

## Fin de checklist

- Debe existir una forma natural de volver de checklist a texto normal.
- Para el MVP puede resolverse con una acción contextual simple si todavía no está resuelto de forma impecable con teclado.

## Nueva nota

- La acción `+ nota` vive entre notas, no dentro de una nota.
- Crear una nota nueva no debe requerir contexto adicional.
- La nota nueva aparece arriba del tramo no pineado del feed.
- Debe existir un botón `+ nota nueva` más visible justo debajo del bloque de pineadas para crear la nueva nota principal del feed.
- No debe haber acciones `+ nota` entre notas.

## Notas pineadas

- Una nota puede marcarse como pineada.
- Las notas pineadas siempre quedan por encima de las no pineadas.
- Pinear una nota la sube al inicio de la lista.
- Despinearla la devuelve al inicio del tramo no pineado.
- El pin es una acción de nota, no una estructura aparte.
- El pin debe leerse como una acción del encabezado de la nota.
- Una nota pineada debe diferenciarse con un borde claramente más grueso que el normal.

## Título

- La primera línea actúa como título.
- El título sigue siendo opcional.
- Si queda vacío, el placeholder ASCII debe verse lindo y suficiente como identificador informal.
- `Enter` en el título baja al cuerpo de la nota.

# Estado actual

El prototipo actual ya debería respetar estas decisiones:

- no exponer `+ subitem`;
- usar `+ item` desde texto normal o checklist;
- usar flechas inline para la indentación;
- mostrar las notas nuevas arriba;
- mantener las notas pineadas arriba del resto.

# Mantenimiento

Este archivo es el contrato vivo del producto.

Debe actualizarse cada vez que cambien:

- el modelo mental;
- las interacciones visibles;
- el alcance del MVP;
- o las decisiones ya validadas.
