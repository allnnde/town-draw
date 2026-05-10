## 1. Model and Compatibility Updates

- [x] 1.1 Extend `EditorTool` with `zone-industrial` and update toolbar labels/icons for the new tool.
- [x] 1.2 Extend zone models with brush coverage data, including round brush stamps or strokes with position and radius.
- [x] 1.3 Extend zone types to include `industrial` and update type guards/import validation accordingly.
- [x] 1.4 Extend generated-object models for bridges, internal streets/paths, and industrial structures or add equivalent typed fields to existing generated objects.
- [x] 1.5 Add compatibility helpers so legacy rectangular/polygon zones from existing JSON projects can still render, hit-test, and generate.

## 2. Brush-Based Zone Interaction

- [x] 2.1 Replace rectangular zone drag behavior with continuous round-brush stamp capture for village, market, forest, and industrial tools.
- [x] 2.2 Throttle brush stamps by minimum distance/radius so long strokes remain performant and semantically compact.
- [x] 2.3 Update draft preview so zone coverage appears in real time while painting.
- [x] 2.4 Ensure completed brush zones are saved in `sketchObjects` as semantic data and draft coverage is cleared after pointer release/cancel.
- [x] 2.5 Update tool selection and active-tool display to include the industrial zone tool.

## 3. Zone Rendering and Hit Testing

- [x] 3.1 Update `SketchRendererService` to render brush-zone coverage as overlapping round stamps or an equivalent filled region.
- [x] 3.2 Update selected-zone highlighting to follow brush coverage rather than rectangular bounds.
- [x] 3.3 Update `SketchHitTestingService` so select and erase operate on painted zone coverage.
- [x] 3.4 Add or update tests/helpers for brush coverage hit testing and legacy polygon compatibility where practical.

## 4. Conflict Mask and Effective Coverage Generation

- [x] 4.1 Add generation helpers to sample brush zone coverage, river coverage, and road coverage into deterministic working masks.
- [x] 4.2 Resolve overlapping zones by deterministic sketch order so only one zone type wins per sample location.
- [x] 4.3 Treat river coverage, including river width, as blocked space for zone-generated content.
- [x] 4.4 Ensure village, forest, market, and industrial generation uses only effective non-blocked coverage.

## 5. Organic Zone Content Generation

- [x] 5.1 Replace row/grid placement with deterministic pseudo-random organic placement using spacing and jitter.
- [x] 5.2 Generate village buildings with varied positions and stable regeneration for unchanged sketches.
- [x] 5.3 Generate market stalls with varied positions and aisle gaps.
- [x] 5.4 Generate industrial structures with varied positions and service-road access.
- [x] 5.5 Generate internal streets/aisles/service roads for village, market, and industrial zones.

## 6. Road and Water Conflict Resolution

- [x] 6.1 Detect road/river intersections using segment geometry and river-width tolerance.
- [x] 6.2 Generate bridge representations when road sketches are ordered after intersecting river sketches.
- [x] 6.3 Split or suppress generated road segments at crossings when river sketches are ordered after intersecting road sketches.
- [x] 6.4 Render generated bridges and cut-road results clearly in `GeneratedMapRendererService`.

## 7. Generated View and Persistence

- [x] 7.1 Hide zone planning fills in the generated view while preserving sketch objects for selection, editing, export, and regeneration.
- [x] 7.2 Keep JSON export/import working with brush zones, industrial zones, bridges, internal streets, and legacy polygon zones.
- [x] 7.3 Ensure `clearMap`, regeneration, selection, and erase behavior still work with brush zones and generated conflict results.

## 8. Verification

- [x] 8.1 Run `npm run build` and fix strict TypeScript, Angular template, Pixi, or bundle budget issues.
- [x] 8.2 Run `npm test` and update/add focused tests where practical.
- [x] 8.3 Run Prettier check for touched files and format as needed.
- [x] 8.4 Manually verify brush-painted village, forest, market, and industrial zones.
- [x] 8.5 Manually verify forest-over-village and village-over-forest do not mix generated content.
- [x] 8.6 Manually verify no houses, trees, stalls, industrial structures, or internal streets generate over rivers.
- [x] 8.7 Manually verify road-over-water creates a bridge and water-over-road cuts the road.
- [x] 8.8 Manually verify generated zone fills disappear while generated objects remain visible and sketch data remains editable/exportable.
