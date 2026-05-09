## Context

TownDraw now has a working Angular/PixiJS MVP with semantic sketch objects, generated objects, live draft rendering, JSON import/export, and basic generation. Zone tools currently create rectangular `ZoneSketch` objects, and generation places content inside simple zone bounds without understanding overlaps, waterways, internal streets, or draw-order terrain intent.

This change upgrades zones from rectangles to brush-painted semantic regions and makes generation conflict-aware. The implementation touches models, tools, rendering, hit testing, generation, and storage validation, so it needs a coordinated design rather than isolated fixes.

## Goals / Non-Goals

**Goals:**

- Let users paint village, market, forest, and industrial zones with a round brush/aerosol workflow.
- Preserve semantic editability: brush regions are saved as map data, not flattened pixels.
- Render zone brush previews in real time while painting.
- Resolve overlapping zone coverage deterministically so generated content does not mix in the same effective area.
- Exclude generated buildings, trees, stalls, industry, and internal paths from river-covered areas.
- Hide zone planning fills in generated view while preserving sketch objects for editing/export.
- Generate organic-but-stable object placement and internal streets/aisles/service roads.
- Resolve road/water intersections using sketch order: road over water creates bridge, water over road cuts road.

**Non-Goals:**

- No full GIS boolean geometry engine or high-precision polygon clipping requirement.
- No advanced brush UI such as pressure sensitivity, custom brush textures, undo/redo, or per-stroke editing.
- No realistic city planning simulation; generated layouts only need to be coherent and visibly less grid-like.
- No backend or cloud persistence.

## Decisions

### 1. Store zone coverage as semantic brush stamps

Extend `ZoneSketch` with brush coverage data, for example `brushStrokes`/`stamps` containing `{ position, radius }`, while keeping or migrating legacy `polygon` data for imported MVP projects.

Rationale: round stamps are simple to create during pointer movement, easy to render as circles, easy to hit-test, and can be sampled by the generator without heavy geometry dependencies.

Alternative considered: convert brush strokes into polygon unions. That could produce cleaner boundaries, but it adds complex clipping/union logic that is unnecessary for this stage.

### 2. Use sampling masks for generation conflicts

Generation should derive a working grid/sample field from sketch objects. Each sample can know whether it is inside river coverage, effective zone coverage, road coverage, or a bridge/cut area.

Rationale: sampling is adequate for procedural placement and conflict checks, keeps the implementation deterministic, and avoids expensive geometric unions. The sample resolution can be tuned independently from render quality.

Alternative considered: exact vector intersections for all zone/river/road relationships. This is more precise but much more work and fragile for freehand input.

### 3. Resolve zones by deterministic order

When multiple zones cover the same sample point, the later zone in `sketchObjects` order wins for that sample. This matches the user mental model of painting one region over another.

Rationale: users asked that forest painted over village should not mix. Draw order provides a predictable override without adding a layer-management UI.

Alternative considered: fixed priority by zone type. That is deterministic but less expressive and would make it hard to intentionally overwrite forest with village or vice versa.

### 4. Treat rivers as blockers for zone-generated content

River coverage should be inflated by river width and used as blocked space for buildings, trees, stalls, industry, and internal circulation paths.

Rationale: this directly prevents houses/trees/stalls from appearing in water and creates a clear terrain hierarchy for generation.

Alternative considered: allow some zone types to occupy water. That can be added later for docks/harbors, but it is out of scope here.

### 5. Use sketch order for road/water bridge versus cut behavior

Road/river crossings should compare object order. If the road is later, generate a bridge/crossing representation. If the river is later, split or suppress the road segment at the crossing.

Rationale: it matches the requested behavior and avoids adding explicit bridge tools before they are needed.

Alternative considered: always create bridges where roads meet water. That fails the “water over road cuts road” requirement.

### 6. Generate organic layouts with deterministic jitter

Use deterministic pseudo-random placement seeded from project/sketch object ids and sample indices. For villages/markets/industry, start from eligible samples, enforce minimum spacing, then add jitter and derive internal paths through nearby clusters or rough centerlines.

Rationale: this avoids perfect rows while keeping regeneration stable for the same sketch, which helps testing and iteration.

Alternative considered: true randomness every click. It may look organic but makes testing and user expectations worse.

### 7. Hide zone fills in generated view without deleting sketch zones

Rendering should support a mode where zone planning fills are hidden after generation while generated objects remain visible. Selection/editing can still use the sketch data, and future UI can expose a toggle if needed.

Rationale: the user wants the area overlay to disappear and only the generated content to remain, while the architecture still requires sketch data to remain separate and editable.

Alternative considered: remove zone sketches after generation. That violates the semantic editor model and would break regeneration/export expectations.

## Risks / Trade-offs

- [Risk] Brush-stamp arrays can grow large on long strokes → Mitigation: throttle stamps by minimum distance and cap/merge near-identical stamps.
- [Risk] Sampling masks can miss tiny details if resolution is too coarse → Mitigation: choose a resolution tied to brush radius and document/tune constants.
- [Risk] Organic generation may still look too random or too uniform → Mitigation: make spacing/jitter constants explicit and keep output deterministic.
- [Risk] Backward compatibility with polygon zones can complicate guards/renderers → Mitigation: support legacy polygon zones by converting rectangles to equivalent stamps or by a compatibility coverage helper.
- [Risk] Hidden zone fills may make selected zones hard to find after generation → Mitigation: keep selection highlighting visible and consider a future “show sketch overlay” toggle.
- [Risk] Bridge/cut detection may be approximate for curved strokes → Mitigation: use segment distance/intersection checks with river-width tolerance and keep behavior predictable.

## Migration Plan

1. Extend models and storage guards for brush zones, industrial zones, bridge/internal street generated objects, and legacy polygon compatibility.
2. Update toolbar/tool models with `zone-industrial`.
3. Replace rectangular zone drawing with round-brush stroke capture and draft preview.
4. Update zone rendering and hit testing to use brush coverage.
5. Add generation helpers for effective zone masks, river blockers, order-aware road/water conflict resolution, and organic placement.
6. Update generated rendering to show bridges/internal streets/industrial structures and hide zone fills in generated mode.
7. Verify build/tests and manually check overlap, water exclusion, bridges/cuts, organic placement, JSON export/import.

Rollback strategy: keep the previous archived MVP as a reference; if brush generation becomes unstable, revert to polygon-compatible rendering while keeping the new specs for a follow-up implementation split.

## Open Questions

- Should brush radius be fixed for this change, or should the toolbar expose radius controls immediately?
- Should generated-view hiding of zone fills be automatic after any generation, or should the UI include a “mostrar boceto” toggle now?
- Should industrial output reuse `GeneratedBuilding` with a subtype, or introduce a dedicated `GeneratedIndustrialStructure` type?
