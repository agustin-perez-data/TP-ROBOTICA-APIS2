# Origen de las skills de diseño

Skills de terceros copiadas a este proyecto el 2026-10-07, tras descargar cada repositorio y revisar su contenido.
Se instalaron solo en este proyecto (alcance de proyecto), no en toda la cuenta.

| Origen | Licencia | Commit | Skills copiadas | Contenido |
|---|---|---|---|---|
| https://github.com/emilkowalski/skill (Emil Kowalski) | MIT | e8a175d | emil-design-eng, animate, animation-vocabulary, find-animation-opportunities, improve-animations, review-animations, break-ui, prototype, pick-ui-library | Solo texto (Markdown) |
| https://github.com/Leonxlnx/taste-skill (Leonxlnx) | MIT | b482f7a | taste-skill, redesign-skill, minimalist-skill, soft-skill, output-skill | Solo texto (Markdown) |
| https://github.com/pbakaus/impeccable (Paul Bakaus) | Apache 2.0 | ffeda44 (motor 0.1.11) | impeccable | Texto, más scripts de apoyo y un lanzador que descarga un motor |

No se copió el material de React Native, Swift y Expo, ni las skills de generación de imágenes (brandkit, imagegen, image-to-code, stitch), ni la variante brutalista.

## Impeccable: qué ejecuta y cuándo

Se instaló **sin los hooks** de su plugin (los que corren en cada edición y al cerrar cada respuesta). Mientras no se invoque la skill, no se ejecuta nada.

- Al invocarla por primera vez (`/impeccable ...`), su lanzador `scripts/impeccable` baja el motor desde `https://github.com/pbakaus/impeccable/releases` a `~/.impeccable/bin/`, con verificación sha256. Ese directorio queda a nivel de usuario.
- Los scripts de la skill solo hablan con `localhost` (el modo `live`, que levanta un servidor local para iterar sobre la página) y con GitHub (la descarga del motor).
- Para habilitar los hooks más adelante, hay que hacerlo de forma explícita, solo en este proyecto.
- Pide crear `PRODUCT.md` y `DESIGN.md` en la raíz del proyecto con `/impeccable init`.

Las licencias están en `_licencias/`. Para actualizar, volver a copiar desde el repo de origen y cambiar el commit de esta tabla.
