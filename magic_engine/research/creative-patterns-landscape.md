# Creative Patterns For A Personal Magic Engine

Purpose: capturar usos creativos y patrones de internet que pueden ayudar a sentar las bases de la caja de magia sin convertirla en una lista cerrada de features.
Kind: research
Audience: contributors
Owns: patrones de inspiracion, no contratos normativos
Last reviewed: 2026-03-23

## Pregunta

Si vamos a construir una caja de magia generativa para una web personal, que vale mas la pena copiar:

- features;
- o patrones de uso?

La respuesta que surge del research es clara:

No conviene copiar features.
Conviene copiar formas de relacion.

## Patron 1: explorar por seleccion, no solo por prompting

`SerendipityLM` es una muy buena pista. No trata al prompt como interfaz final. Convierte la exploracion en un loop de seleccion, critica y mutacion. Los usuarios eligen favoritos, agregan pequeñas observaciones, y el sistema usa eso para empujar la siguiente tanda.

Lo valioso no es "generar arte".

Lo valioso es este principio:

- el modelo tira propuestas;
- la persona cura;
- la siguiente ronda aprende de esa curaduria;
- la sorpresa aparece por iteracion, no por prompt perfecto.

Base que nos deja:

- spells que puedan trabajar por tandas;
- memoria corta de picks/rechazos;
- outputs multiples y comparables;
- curation como primitive de primer nivel.

## Patron 2: el sitio puede ponerse una mascara distinta cada dia

Nicholas Carlini hizo un experimento donde dejaba que distintos modelos reescribieran su homepage y bio cada dia, con un procedimiento fijo y despues comentario humano sobre lo que fallaban.

La idea interesante no es "dejar que la IA haga tu web".

La idea interesante es:

- usar modelos como lentes o mascaras temporales;
- hacer visible la diferencia entre voces;
- mostrar error, rareza o delirio como parte del encanto.

Base que nos deja:

- spells que no buscan verdad sino interpretacion;
- surfaces mutantes por visita, dia o temporada;
- archivo de variantes, no solo ultimo resultado.

## Patron 3: personajes y roleplay funcionan mejor cuando expanden, no reemplazan

`ORIBA` explora chat de roleplay para artistas de personajes originales. El aporte no es producir la obra final, sino ayudar a imaginar atributos, backstories y la relacion afectiva con el personaje, dejando la exposicion visual al creador.

Eso sugiere una regla de oro para nuestra caja:

- la magia sirve mejor cuando empuja imaginacion;
- sirve peor cuando intenta cerrar la obra por la persona.

Base que nos deja:

- spells de roleplay, voz y mundo interior;
- personajes como herramientas de exploracion;
- no usar el engine para cerrar "la version final" de casi nada.

## Patron 4: la IA puede envolver una creacion humana con capas de lectura

`ArtInsight` usa LLMs para describir artwork de niñes, sumar preguntas y ayudar a conversar alrededor de la obra, pero manteniendo central la voz de la persona que la hizo.

Ese patron es muy fertil:

- la IA no necesita inventar el objeto principal;
- puede agregar atmosfera, preguntas, reflejos o traducciones alrededor;
- puede volver mas vivible una pieza ya humana.

Base que nos deja:

- spells como "companions" de artefactos humanos;
- descripciones poeticas;
- preguntas de seguimiento;
- lecturas alternativas;
- pequeñas ceremonias alrededor de algo que ya existe.

## Patron 5: tiny generators compartibles ganan por especificidad

Plataformas como `Glif` muestran otra cosa importante: muchisimos workflows generativos no funcionan porque sean generales, sino porque son diminutos, publicos, remixables y con una sola promesa clara.

No "asistente creativo universal".

Si:

- generador de personaje;
- generador de meme;
- generador de una textura;
- un workflow con identidad clarisima.

Base que nos deja:

- los spells deben ser pequeños;
- tienen que tener promesa concreta;
- deberian ser remixables o combinables;
- el magic engine tiene que favorecer proliferacion de rituales chicos.

## Patron 6: guestbooks y objetos sociales tienen potencial raro

En `Thingfully`, la idea del `Enchanted Book` aparece expandida hacia LLMs: no como dashboard de productividad sino como guest book digital capaz de crecer en direcciones mas expresivas.

Esto importa porque conecta mejor con small web que con SaaS.

Base que nos deja:

- guestbooks encantados;
- respuestas de borde a mensajes;
- resumenes corales;
- reinterpretaciones de visitas;
- objetos sociales que acumulan memoria y tono.

## Patron 7: hay hambre cultural por anti-slop, no por mas relleno

Incluso los proyectos satiricos y anti-IA que se volvieron virales este mes muestran algo importante: mucha gente no quiere mas texto generico. Quiere rareza, autoria, humor, limites y friccion interesante.

No hace falta que nuestro engine sea anti-IA.

Pero si conviene que sea anti-slop.

Base que nos deja:

- output corto;
- output contextual;
- output con textura;
- no usar magia para inflar contenido muerto.

## Sintesis operativa

Si juntamos los patrones, la caja de magia deberia priorizar:

- curation sobre prompting puro;
- spells pequeños sobre asistentes generales;
- roleplay y companions sobre automatizacion total;
- variantes, temporadas y masks sobre una sola salida canonica;
- atmosfera alrededor de artefactos humanos;
- anti-slop como criterio de calidad.

## Implicaciones para la arquitectura

Esto empuja varias decisiones:

- el engine necesita soportar tandas, no solo una salida unica;
- conviene guardar metadata de picks, rechazos y favoritos;
- `wild spells` deben poder devolver varias opciones;
- el sistema deberia permitir spells encadenados;
- tenemos que separar fuerte entre "heuristica creativa" y "verdad del producto";
- el fallback local no deberia ser neutro: tambien puede tener tono.

## Ideas de base, no features cerradas

Patrones que conviene habilitar en el engine desde el dia uno:

- `multi-cast`: un spell puede devolver 3-5 variantes;
- `critique loop`: un cast puede recibir una reaccion corta y tirar otra ronda;
- `voice masks`: un spell puede variar tono o personaje sin cambiar contrato;
- `artifact companion`: un spell puede leer algo humano y responder alrededor;
- `seasonality`: un spell puede mutar por fecha, clima o contexto;
- `memory crumbs`: un spell puede recibir migas chicas de historia previa.

No son productos.
Son capacidades madre.

## Fuentes

- SerendipityLM: https://samim.ai/work/serendipityLM/
- Letting Language Models Write my Website: https://nicholas.carlini.com/writing/2025/llms-write-my-bio.html
- ORIBA: https://arxiv.org/abs/2512.12630
- ArtInsight: https://arxiv.org/abs/2502.19263
- Glif: https://glif.app/
- Thingfully guest book idea: https://thingfully.com/make-an-mml-from-an-interactive-guest-book/
