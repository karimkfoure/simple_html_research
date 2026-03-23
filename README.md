# simple_html_research

Repo de experimentos HTML estáticos, simples y deployables.

## Experimentos

- `perfect_notes`
  UI de notas personales inspirada en Apple Notes a nivel interacción, pero resuelta con HTML, CSS mínimo y JavaScript nativo.
  Código fuente: [perfect_notes/index.html](./perfect_notes/index.html)
  Spec local: [perfect_notes/AGENTS.md](./perfect_notes/AGENTS.md)
  URL pública esperada: `https://karimkfoure.github.io/simple_html_research/`

## Deploy

- El sitio se publica con GitHub Pages vía GitHub Actions.
- El deploy toma `perfect_notes/` como raíz del sitio publicado.
- Un push a `main` con cambios en runtime del sitio dispara deploy automático.
- También existe deploy manual con `workflow_dispatch`.
- En GitHub Settings > Pages, la opción `Source` debe estar en `GitHub Actions`.

## Desarrollo local

- Abrir el experimento directamente desde [perfect_notes/index.html](./perfect_notes/index.html), o servir el directorio con un servidor estático mínimo.
- No hay build step.
- No hay dependencias.

## Notas

- `README.md` concentra el uso operativo del repo.
- `AGENTS.md` raíz concentra metodología de trabajo.
