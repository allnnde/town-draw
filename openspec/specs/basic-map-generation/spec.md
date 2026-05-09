# basic-map-generation Specification

## Purpose
TBD - created by archiving change initialize-town-draw-map-editor. Update Purpose after archive.
## Requirements
### Requirement: Generated data is derived from sketch data

The map generator SHALL create `GeneratedMapObject[]` from current `SketchObject[]` without mutating the sketch objects.

#### Scenario: User generates a map

- **WHEN** the user clicks `Generar mapa`
- **THEN** `MapGeneratorService.generate(sketchObjects)` returns generated objects and `EditorStateService.setGeneratedObjects` stores them separately from `sketchObjects`

#### Scenario: Sketch remains unchanged after generation

- **WHEN** generation completes
- **THEN** existing `sketchObjects` keep their ids, geometry, and type-specific properties unchanged

### Requirement: Generator maps sketch types to MVP visual objects

The generator SHALL map each supported sketch type to basic generated visual objects.

#### Scenario: Rivers and roads generate visual lines

- **WHEN** the sketch contains `RiverSketch` and `RoadSketch` objects
- **THEN** the result includes `GeneratedRiver` objects with thicker widths and `GeneratedRoad` objects with renderable widths

#### Scenario: Forest zones generate trees

- **WHEN** the sketch contains a `ZoneSketch` with `zoneType` `forest`
- **THEN** the result includes multiple `GeneratedTree` objects positioned inside or within the MVP bounds of the zone

#### Scenario: Village zones generate buildings

- **WHEN** the sketch contains a `ZoneSketch` with `zoneType` `village`
- **THEN** the result includes multiple `GeneratedBuilding` objects positioned inside or within the MVP bounds of the zone

#### Scenario: Market zones generate stalls

- **WHEN** the sketch contains a `ZoneSketch` with `zoneType` `market`
- **THEN** the result includes multiple `GeneratedMarketStall` objects positioned inside or within the MVP bounds of the zone

### Requirement: Generated rendering is isolated from sketch rendering

Generated objects SHALL be rendered through `GeneratedMapRendererService` on the generated layer and SHALL NOT replace the sketch rendering.

#### Scenario: Generated objects are visible with sketch overlay

- **WHEN** generated objects exist
- **THEN** generated rivers, roads, trees, buildings, and market stalls are visible while sketch objects remain renderable and selectable

### Requirement: Regeneration replaces previous generated output

Running generation again SHALL replace the generated output with a fresh result for the current sketch.

#### Scenario: User regenerates after editing

- **WHEN** the user changes the sketch and clicks `Generar mapa` again
- **THEN** `generatedObjects` is replaced with the new generated result instead of appending stale objects

