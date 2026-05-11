## Why

La generación actual todavía se percibe demasiado recta, cuadrada y dependiente del tamaño de la zona pintada: zonas grandes producen contenido excesivamente separado y zonas pequeñas demasiado condensado. Además, las estructuras y caminos internos no aprovechan ríos/caminos existentes como parte del diseño, por lo que el resultado se siente artificial en lugar de un barrio, mercado, bosque o industria organizado alrededor del terreno.

## What Changes

- Mejorar la generación procedural dentro de zonas para usar densidad y espaciado por tipo de contenido, no una separación derivada directamente del tamaño de la zona dibujada.
- Generar edificios, puestos, industria y árboles con rotación, variación de tamaño y jitter espacial más natural.
- Evitar patrones visibles de grilla o alineación perfecta en casas, puestos e industrias.
- Reemplazar caminos internos rectos/en cruz por circulación orgánica: calles o pasillos curvos, quebrados o parciales que estructuren áreas, no líneas obligatorias de conexión entre cada objeto.
- Integrar caminos y ríos existentes como condicionantes del layout: orientar accesos, dejar retiros, respetar cruces/puentes/cortes ya generados y organizar contenido alrededor de ellos.
- Mantener generación determinística para que regenerar sin editar produzca resultados estables.
- Mantener separación semántica entre `sketchObjects` y `generatedObjects`; no se agregan herramientas nuevas ni persistencia remota.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `basic-map-generation`: refina los requisitos de distribución orgánica, circulación interna e integración con ríos/caminos existentes.

## Impact

- Afecta principalmente `MapGeneratorService`, modelos/renderizado de objetos generados si se agregan campos visuales como rotación, y pruebas focalizadas de generación.
- Puede requerir ampliar generated objects con `rotation`/variantes opcionales para edificios, puestos, estructuras industriales y posiblemente árboles.
- Puede requerir helpers geométricos para muestrear distancia a caminos/ríos, generar curvas/polilíneas internas y evaluar distribución sin depender del tamaño global de la zona.
- No requiere cambios de UI ni backend; JSON import/export debe seguir aceptando proyectos anteriores y preservar nuevos campos opcionales.
