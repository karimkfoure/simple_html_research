# simple_html_research

Repo de experimentos HTML estáticos, simples y deployables.

## Experimentos

- `index`: [karimkfoure.github.io/simple_html_research/](https://karimkfoure.github.io/simple_html_research/)
- `perfect_notes`: [karimkfoure.github.io/simple_html_research/perfect_notes/](https://karimkfoure.github.io/simple_html_research/perfect_notes/)
  - UI de notas personales inspirada en Apple Notes a nivel interacción, pero resuelta con HTML, CSS mínimo y JavaScript nativo.
  - Código fuente: [perfect_notes/index.html](./perfect_notes/index.html)
  - Spec local: [perfect_notes/AGENTS.md](./perfect_notes/AGENTS.md)
  - Tests locales: [perfect_notes/tests/perfect_notes.spec.js](./perfect_notes/tests/perfect_notes.spec.js)

## Deploy

- El sitio se publica con GitHub Pages vía GitHub Actions.
- El deploy publica el root del repo como sitio estático.
- El índice raíz vive en [index.html](./index.html).
- Cada experimento publicado vive en su propio directorio, por ejemplo [perfect_notes/index.html](./perfect_notes/index.html).
- Un push a `main` con cambios en el índice o en cualquier directorio de experimento dispara deploy automático.
- También existe deploy manual con `workflow_dispatch`.
- En GitHub Settings > Pages, la opción `Source` debe estar en `GitHub Actions`.

## Desarrollo local

- Abrir el índice raíz en [index.html](./index.html) o un experimento puntual como [perfect_notes/index.html](./perfect_notes/index.html).
- Para simular el sitio publicado completo, servir el root del repo con un servidor estático mínimo.
- No hay build step.
- No hay dependencias de runtime.

## Testing

- La suite E2E usa Playwright.
- Instalar dependencias de desarrollo con `npm install`.
- Instalar browsers locales con `npx playwright install chromium webkit`.
- Correr toda la suite con `npm run test:e2e`.
- Hay variantes opcionales: `npm run test:e2e:headed` y `npm run test:e2e:ui`.
- La suite levanta el root del repo como sitio estático local y cubre desktop + WebKit mobile.
- Los tests de `perfect_notes` viven dentro de [perfect_notes/tests/perfect_notes.spec.js](./perfect_notes/tests/perfect_notes.spec.js).

## Notas

- `README.md` concentra el uso operativo del repo.
- `AGENTS.md` raíz concentra metodología de trabajo.
