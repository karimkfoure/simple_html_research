# Metodología General del Repo

## Fuente de verdad

- `README.md` es la fuente de verdad operativa del proyecto.
- `AGENTS.md` define criterios metodológicos de trabajo y no debe duplicar instrucciones de uso.
- Si cambia el flujo de uso, testing o deploy, primero se actualiza `README.md`; `AGENTS.md` solo se ajusta si cambia la metodología.

## Metodología de trabajo

- Idioma de trabajo: español, salvo pedido explícito en otro idioma.
- Antes de editar archivos, explicitar en una frase el objetivo técnico del cambio.
- Priorizar soluciones simples, estáticas y portables, evitando complejidad o build innecesario.
- Hacer cambios chicos, trazables y acotados por bloque funcional.
- Validar localmente de forma mínima después de cada cambio relevante.
- No reescribir historial de commits salvo pedido explícito.

## Validación y testing

- La validación local es el camino por defecto.
- El nivel de test se elige según impacto y riesgo del cambio.
- Para cambios solo de docs o metadata, alcanza validación mínima.
- Para cambios acotados y de bajo riesgo, usar una suite rápida.
- Para cambios funcionales o de riesgo medio/alto, usar la suite completa.
- Ante la duda, elegir siempre el camino seguro: validación más completa.
- Si la suite falla, corregir y reintentar; no hacer push en rojo.
- La validación manual complementa, pero no reemplaza, la automatizada.
- En cambios visuales relevantes, validar desktop y mobile.

## Git y commits

- Hacer un commit por bloque de cambio relevante.
- Los bloques típicos son: `feature`, `fix`, `docs`, `refactor`.
- Después de cada commit, hacer push.
- Mantener `main` deployable en todo momento.
- No reescribir historial ni hacer amend salvo pedido explícito.

## Deploy

- El deploy debe correr por GitHub Actions.
- La rama principal debe poder publicarse de forma estable en GitHub Pages.
- El índice raíz y cualquier cambio dentro de un directorio de experimento publicado deben disparar deploy.
- Cambios sólo en documentación o metadata general del root no necesitan publish automático.
- Debe existir la opción de deploy manual con `workflow_dispatch`.
- La configuración de Pages debe usar `Source: GitHub Actions`.

## Mejora continua

- Si aparece una falla no cubierta por tests, agregar una cobertura determinística general, no un parche puntual.
- Si aparece fricción repetida en el flujo, proponer una simplificación y documentarla.
- Mantener `AGENTS.md` metodológico y `README.md` operativo.
- Priorizar mejoras incrementales de alto impacto y bajo costo.
- Este `AGENTS.md` debe auto-actualizarse cuando mejore la metodología de trabajo del repo.
