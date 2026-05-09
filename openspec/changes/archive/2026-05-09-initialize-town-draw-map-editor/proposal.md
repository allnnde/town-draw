## Why

TownDraw todavía es el proyecto Angular inicial y necesita una base funcional para convertirse en un editor semántico de mapas. Este cambio establece el MVP: dibujar bocetos editables, generar una visualización básica y persistir proyectos localmente como JSON.

## What Changes

- Reemplazar la pantalla inicial de Angular por una pantalla principal de editor con toolbar, viewport PixiJS, inspector y acciones de proyecto.
- Añadir PixiJS como dependencia si no está instalado.
- Crear modelos semánticos para puntos, herramientas, objetos de boceto, objetos generados y proyectos de mapa.
- Crear estado central con Angular Signals para herramienta activa, selección, dimensiones, boceto y resultado generado.
- Implementar herramientas iniciales: `select`, `river`, `road`, `zone-village`, `zone-market`, `zone-forest` y `erase`.
- Implementar renderizado separado para objetos de boceto, selección y objetos generados.
- Implementar generación básica de ríos/carreteras/árboles/edificios/puestos a partir del boceto sin mutarlo.
- Implementar exportación e importación local de proyectos mediante archivos JSON.
- Actualizar pruebas existentes afectadas por el reemplazo del starter template.

## Capabilities

### New Capabilities

- `semantic-map-editor`: pantalla del editor, herramientas activas, creación/selección/eliminación de objetos semánticos y renderizado del boceto en PixiJS.
- `basic-map-generation`: generación de objetos visuales básicos desde el boceto manteniendo separados `sketchObjects` y `generatedObjects`.
- `project-json-storage`: exportación e importación local de `MapProject` como JSON y reemplazo seguro del estado del editor.

### Modified Capabilities

- None.

## Impact

- Afecta la app Angular standalone existente (`src/app/app.*`, rutas/configuración si aplica) y añade nuevas carpetas bajo `src/app/editor`, `src/app/map-model`, `src/app/tools`, `src/app/generation`, `src/app/rendering` y `src/app/storage`.
- Añade `pixi.js` a `dependencies` cuando esté ausente.
- Requiere respetar TypeScript strict, Angular strict templates, componentes standalone y Angular Signals.
- Mantiene persistencia local únicamente; no introduce backend, autenticación ni almacenamiento remoto.
