## Context

TownDraw ya genera contenido semanticamente separado para zonas pintadas con pincel, con resolución básica de conflictos entre zonas, ríos y caminos. Sin embargo, la distribución todavía depende demasiado de muestreos dentro del bounding box de la zona y de líneas internas simples, lo que produce patrones rectos, cruces obvios y spacing que cambia de manera no deseada cuando el usuario pinta una zona más grande o más pequeña.

Este cambio mejora el motor procedural sin añadir nuevas herramientas. La zona pintada sigue siendo la intención semántica del usuario; el generador debe transformar esa intención en una composición más natural, organizada por tipo de zona y por la infraestructura existente.

## Goals / Non-Goals

**Goals:**

- Hacer que el espaciado de casas, puestos, árboles e industria dependa de reglas por tipo y densidad, no del tamaño total de la zona.
- Reducir la apariencia de grilla mediante jitter, rotación, variación de tamaño y distribución tipo Poisson/relajada.
- Generar calles internas y pasillos como estructura de barrio/área, con segmentos quebrados o suaves y conexiones parciales, no como líneas directas entre cada estructura.
- Usar ríos y caminos existentes como condicionantes del layout: retiros, accesos, orientación y organización alrededor de ellos.
- Mantener determinismo: la misma entrada debe regenerar una salida estable.
- Preservar compatibilidad JSON con generated objects anteriores.

**Non-Goals:**

- No introducir simulación urbana realista completa ni un motor GIS/boolean avanzado.
- No crear UI nueva para editar manualmente calles internas, rotación o reglas de generación.
- No cambiar el modelo semántico de sketch ni fusionar `sketchObjects` con `generatedObjects`.
- No añadir dependencias externas pesadas de geometría salvo que sea imprescindible y se justifique durante implementación.

## Decisions

### 1. Separar “intensidad de contenido” de “tamaño de zona”

El generador deberá calcular candidatos sobre la cobertura efectiva de zona usando parámetros por tipo: separación mínima/base, separación variable, tamaño de objeto, margen a agua, margen a caminos y límite de intentos. El área de la zona puede afectar el conteo total, pero no debe escalar el espaciado base entre estructuras.

Rationale: pintar una zona grande debe permitir más casas, no hacer que todas queden absurdamente separadas. Pintar una zona chica debe limitar cantidad si no hay espacio, no comprimir casas hasta tocarse.

Alternative considered: derivar spacing como porcentaje del bounding box. Es simple, pero reproduce el problema actual.

### 2. Usar muestreo azul/Poisson determinístico con relajación ligera

Para edificios, puestos, industria y árboles, usar una estrategia determinística inspirada en Poisson-disc: candidatos pseudoaleatorios dentro de cobertura efectiva, rechazo por distancia variable y una relajación/orden estable para evitar filas perfectas. Cada candidato puede tener `rotation`, tamaño y variante derivados del seed.

Rationale: evita grillas visibles y permite “vecinos” cercanos junto con separaciones mayores sin depender del tamaño global.

Alternative considered: grillas con jitter. Aunque es fácil, el patrón de filas/columnas sigue apareciendo en zonas grandes.

### 3. Generar circulación interna desde ejes orgánicos, no desde objetos

Las calles/pasillos internos deben generarse como una red parcial dentro de la cobertura efectiva: ejes curvos o polilíneas quebradas, ramas opcionales, cul-de-sacs simples y tramos omitidos. Las estructuras se colocan con relación a esa red, pero la red no debe conectar obligatoriamente cada casa o puesto.

Rationale: en barrios reales las casas ocupan lotes alrededor de calles; no hay un camino individual conectando cada casa con la siguiente.

Alternative considered: conectar vecinos por distancia o MST. Produce una red técnica pero visualmente parece “cables” entre casas.

### 4. Integrar caminos y ríos existentes como guías y blockers

Los ríos siguen bloqueando estructuras y caminos internos salvo reglas de puente. Los caminos existentes deben actuar como accesos o bordes organizadores: cerca de un camino, las estructuras pueden orientarse hacia él y la circulación interna puede conectarse parcialmente o alinearse suavemente, manteniendo margen visual.

Rationale: si el usuario dibuja una zona sobre/near un camino o río, espera que la generación entienda esa infraestructura como parte del mapa, no como ruido independiente.

Alternative considered: solo bloquear ríos y ignorar caminos. Mantiene seguridad mínima, pero no mejora organización ni composición.

### 5. Campos visuales opcionales para generated objects

Ampliar modelos generados con campos opcionales como `rotation` y `variant` para edificios, puestos, estructuras industriales y posiblemente árboles. Renderers deben usar valores por defecto si el campo falta.

Rationale: permite compatibilidad con JSON anterior y mejora visual sin romper imports existentes.

Alternative considered: crear nuevos tipos generados por variante. Aumentaría complejidad del modelo sin necesidad.

## Risks / Trade-offs

- [Risk] Poisson/rechazo puede ser lento en zonas grandes o densas → Mitigation: limitar intentos por tipo, cachear cobertura/máscaras y degradar conteo si no hay espacio.
- [Risk] Redes orgánicas pueden salirse de zonas irregulares → Mitigation: cortar/snapear cada tramo contra cobertura efectiva mediante muestreo y descartar tramos cortos.
- [Risk] Demasiada aleatoriedad puede dificultar tests/manual QA → Mitigation: seeds determinísticos por sketch id, tipo y parámetros; tests sobre propiedades, no coordenadas exactas frágiles.
- [Risk] Añadir rotación puede requerir cambios en render/import/export → Mitigation: campos opcionales con defaults y validación tolerante.
- [Risk] Integrar caminos existentes puede generar conexiones visuales raras cerca de ríos → Mitigation: priorizar blockers de agua y validar bridges/cuts antes de añadir accesos internos.

## Migration Plan

1. Añadir helpers determinísticos de sampling/spacing independientes del tamaño de zona.
2. Extender modelos generados con campos opcionales de rotación/variante y actualizar render/import/export.
3. Reemplazar colocación de objetos por distribución orgánica con separación variable por tipo.
4. Reemplazar caminos internos rectos por redes orgánicas cortadas por cobertura efectiva y ríos.
5. Integrar caminos/ríos existentes como guías de orientación, acceso y margen.
6. Agregar tests de propiedades: spacing estable, no-grilla, rotación presente, caminos no conectan cada estructura, blockers respetados.

Rollback: conservar el generador actual como referencia; si la red orgánica falla, volver temporalmente a paths internos simples mientras se mantiene la distribución Poisson de objetos.

## Open Questions

- ¿Las calles internas deben conectarse visualmente a caminos existentes siempre que haya proximidad, o solo algunas veces para mantener variedad?
- ¿Conviene exponer parámetros de densidad/organicidad en UI más adelante, o mantenerlos internos por ahora?
- ¿Árboles deberían tener rotación visual real o basta con tamaño/tono/offset de copa?
