## Context

The current brush-zone implementation still keeps and uses every round brush stamp as first-class geometry. Even when coverage helpers treat stamps as one conceptual area, rendering and generation can still traverse or draw many circles. This keeps the visual result circle-based and creates scaling risk: long strokes or repeated overpainting can produce very large stamp arrays, excessive Pixi graphics commands, and possible browser/GPU Out of Memory failures.

The desired model is: brush input is an editing gesture, but a completed zone is a single region. The region should be stored or derived as a simplified polygon/outline that all systems can reuse.

## Goals / Non-Goals

**Goals:**

- Create one polygonal coverage shape for each completed brush-painted zone.
- Render zones from the polygonal shape, not from all brush circles.
- Prefer polygon coverage for hit testing, bounds, generation sampling, and overlap resolution.
- Preserve backward compatibility with existing exports that contain only `brushStamps`.
- Add memory guardrails: simplify polygons, cap point counts, and avoid unbounded per-stamp drawing/generation loops.

**Non-Goals:**

- Adding a full computational-geometry dependency.
- Adding manual polygon editing tools.
- Perfect boolean union for every pathological brush pattern.
- Changing generated object schemas unrelated to zones.

## Decisions

### Store a derived polygon on completed zones

On pointer up, the zone tool should derive a polygon/outline from the brush stroke and store it in `ZoneSketch.polygon`. `brushStamps` can remain for compatibility/debugging at first, but runtime systems should prefer `polygon` when present. If memory remains an issue, implementation can later omit or truncate `brushStamps` after polygon derivation.

Alternatives considered:

- **Only change rendering to fill all circles once:** simpler, but it still creates per-circle geometry and does not solve memory pressure.
- **Only derive polygon at render time:** avoids schema changes but repeats expensive work and still keeps each subsystem doing its own conversion.

### Use bounded raster/contour or hull-style derivation without external dependencies

Implement an in-repo converter that samples the brush coverage into a bounded grid and extracts/simplifies an outline, or a hull/alpha-shape approximation if simpler. The converter must enforce maximum grid resolution and maximum output vertices.

The important contract is not mathematical perfection; it is stable, bounded, organic region coverage.

### Normalize legacy imports lazily or during import

Existing JSON may only have `brushStamps`. Import/coverage utilities should derive a polygon when missing and enough stamps exist, then use that polygon for downstream operations. This avoids breaking old saved maps.

### Treat polygon as primary coverage

Coverage utilities should check `polygon` first. `brushStamps` become fallback input for old data or draft strokes. Draft strokes may still render as circles during drawing, but completed zones should render polygonally.

## Risks / Trade-offs

- **Risk: Polygon derivation loses small details.** → Mitigate with configurable sampling step and simplification tolerance tests.
- **Risk: Concave painted areas become too convex if using hull-only approximation.** → Prefer contour extraction if feasible; otherwise document the approximation and use tests for common concave strokes.
- **Risk: Existing generated outputs differ after regeneration.** → Acceptable; generated objects are replaceable and sketch data remains semantic.
- **Risk: Large legacy files still contain many stamps.** → Mitigate by deriving/caching polygon and ensuring render/generation no longer iterate stamps once polygon exists.

## Migration Plan

- Existing projects remain importable.
- On import or first coverage use, zones without polygon coverage can derive a polygon from `brushStamps`.
- New brush-created zones store polygon coverage immediately.
- No destructive migration is required; `brushStamps` can remain optional backward-compatible metadata.
