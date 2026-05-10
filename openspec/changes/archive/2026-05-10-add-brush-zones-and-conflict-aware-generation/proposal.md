## Why

Las zonas rectangulares del MVP son demasiado rígidas para dibujar regiones naturales o urbanas detalladas. Además, la generación actual no resuelve conflictos entre regiones, ríos y caminos, lo que produce mezclas incoherentes como casas sobre ríos, bosques mezclados con poblados o caminos sin lógica al cruzar agua.

## What Changes

- Cambiar las herramientas de zona para pintar regiones con un pincel/aerosol redondo en tiempo real, en lugar de crear rectángulos.
- Representar la cobertura de zonas como trazos/pinceladas semánticas editables, manteniendo el enfoque de objetos semánticos y no de pintura de píxeles.
- Añadir soporte para zonas industriales como nueva categoría de zona generable.
- Evitar mezclas entre zonas incompatibles: cuando una región se pinta sobre otra, la cobertura efectiva debe pertenecer a una sola zona/tipo según reglas determinísticas de prioridad/orden.
- Evitar generación de casas, árboles, puestos o industria sobre ríos u otras áreas bloqueantes.
- Ocultar el relleno/área de las zonas en la vista generada, dejando visibles los elementos generados, sin borrar los objetos de boceto.
- Generar poblados, mercados e industria con distribución orgánica, coherente y no en grillas perfectas.
- Generar calles internas entre casas/puestos/edificios industriales cuando corresponda.
- Resolver cruces camino/agua según orden de dibujo: camino sobre agua genera puente; agua sobre camino corta el camino.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `semantic-map-editor`: cambia la creación y renderizado de zonas para usar pincel redondo/aerosol, preview en tiempo real y categorías de zona ampliadas.
- `basic-map-generation`: cambia la generación para usar cobertura efectiva de zonas, resolver conflictos con ríos/caminos, ocultar áreas de zona generadas y crear distribución orgánica con calles internas.

## Impact

- Afecta modelos de mapa (`ZoneSketch`, tipos de zona y objetos generados), herramientas de zona, estado/renderizado de boceto, hit testing de zonas, generación procedural y renderizado generado.
- Puede requerir nuevos tipos generados para puentes, calles internas y estructuras industriales.
- No introduce backend ni persistencia remota; JSON import/export deberá seguir guardando el proyecto completo usando el modelo actualizado.
- Debe mantener compilación estricta de Angular/TypeScript y no romper los proyectos JSON existentes del MVP cuando sea razonable migrarlos en memoria.
