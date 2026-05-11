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

The generator SHALL map each supported sketch type and effective brush-zone coverage to coherent generated visual objects.

#### Scenario: Rivers and roads generate visual lines

- **WHEN** the sketch contains `RiverSketch` and `RoadSketch` objects that do not conflict by order or geometry
- **THEN** the result includes `GeneratedRiver` objects with thicker widths and `GeneratedRoad` objects with renderable widths

#### Scenario: Forest zones generate trees

- **WHEN** the effective zone coverage contains a `ZoneSketch` with `zoneType` `forest`
- **THEN** the result includes multiple `GeneratedTree` objects placed inside the effective non-blocked forest coverage

#### Scenario: Village zones generate buildings and streets

- **WHEN** the effective zone coverage contains a `ZoneSketch` with `zoneType` `village`
- **THEN** the result includes `GeneratedBuilding` objects and internal generated road/street segments placed inside the effective non-blocked village coverage

#### Scenario: Market zones generate stalls and aisles

- **WHEN** the effective zone coverage contains a `ZoneSketch` with `zoneType` `market`
- **THEN** the result includes `GeneratedMarketStall` objects and coherent aisle/path segments placed inside the effective non-blocked market coverage

#### Scenario: Industrial zones generate industrial structures and service roads

- **WHEN** the effective zone coverage contains a `ZoneSketch` with `zoneType` `industrial`
- **THEN** the result includes generated industrial structures and service-road segments placed inside the effective non-blocked industrial coverage

### Requirement: Generated rendering is isolated from sketch rendering

Generated objects SHALL be rendered through `GeneratedMapRendererService` on the generated layer, and generated-view zone fills SHALL be hidden by default so the visible result emphasizes generated objects instead of painted planning areas.

#### Scenario: Generated objects are visible without zone fill clutter

- **WHEN** generated objects exist for a painted zone
- **THEN** generated rivers, roads, trees, buildings, market stalls, industrial structures, bridges, and internal streets are visible while the zone's semi-transparent planning fill is not shown as part of the generated result

#### Scenario: Sketch data remains editable after generation

- **WHEN** generated-view zone fills are hidden
- **THEN** the underlying zone sketch objects remain in `sketchObjects` and can still be selected, edited, erased, exported, or regenerated

### Requirement: Regeneration replaces previous generated output

Running generation again SHALL replace the generated output with a fresh result for the current sketch.

#### Scenario: User regenerates after editing

- **WHEN** the user changes the sketch and clicks `Generar mapa` again
- **THEN** `generatedObjects` is replaced with the new generated result instead of appending stale objects

### Requirement: Generation resolves overlapping zone coverage

The generator SHALL resolve overlapping brush-painted zones into a single effective zone type per generated sample location before placing objects.

#### Scenario: Forest is painted over village

- **WHEN** forest coverage overlaps existing village coverage
- **THEN** the overlapped area generates forest content only and MUST NOT generate village buildings in the same sample locations

#### Scenario: Village is painted over forest

- **WHEN** village coverage overlaps existing forest coverage
- **THEN** the overlapped area generates village content only and MUST NOT generate forest trees in the same sample locations

#### Scenario: Market and industrial zones overlap

- **WHEN** market and industrial coverage overlap
- **THEN** the overlapped area uses the deterministic zone conflict rule and generates content for only the winning zone type

### Requirement: Generation respects waterways as blockers

The generator SHALL treat river coverage as blocked space for generated buildings, houses, trees, market stalls, industrial structures, and internal streets unless a road-over-water bridge rule explicitly applies.

#### Scenario: Village is painted over a river

- **WHEN** village coverage overlaps river coverage
- **THEN** generated buildings and internal streets are excluded from the river-covered area

#### Scenario: Forest is painted over a river

- **WHEN** forest coverage overlaps river coverage
- **THEN** generated trees are excluded from the river-covered area

#### Scenario: Market is painted over a river

- **WHEN** market coverage overlaps river coverage
- **THEN** generated market stalls and aisles are excluded from the river-covered area

### Requirement: Generated placement is organic and coherent

The generator SHALL place zone-generated objects using deterministic organic distributions that avoid perfect rows, visible grids, and spacing that scales directly from the total zone size.

#### Scenario: Village generation avoids perfect grids

- **WHEN** a village zone generates buildings
- **THEN** the generated buildings have varied positions and spacing and MUST NOT appear in perfectly aligned rows or columns

#### Scenario: Organic output remains coherent

- **WHEN** the same sketch is generated repeatedly without edits
- **THEN** generated placement remains stable enough for predictable editing and testing

#### Scenario: Zone size does not dictate object spacing

- **WHEN** two village zones use the same density and have different painted sizes
- **THEN** the normal spacing between neighboring buildings remains within the same configured range while the larger zone can contain more buildings

#### Scenario: Small zones do not over-compress structures

- **WHEN** a painted zone is too small for the requested density and type-specific spacing
- **THEN** the generator reduces the number of generated objects instead of placing them closer than the type-specific minimum spacing

### Requirement: Settlements and activity zones generate internal circulation

The generator SHALL add internal circulation paths for populated zone types where generated objects need access. For village, market, and industrial zones, circulation SHALL be derived from generated object placement and any reachable nearby main road, SHALL route through non-blocked accessible gaps, and MUST NOT be generated as detached arbitrary segments that ignore the generated objects.

#### Scenario: Village generates streets between houses

- **WHEN** a village zone generates multiple buildings
- **THEN** generated road/street segments connect, pass between, or pass near groups of buildings while maintaining clearance from generated building footprints

#### Scenario: Market generates aisles between stalls

- **WHEN** a market zone generates multiple stalls
- **THEN** generated aisle/path segments keep visible gaps between stall groups and maintain clearance from generated stall footprints

#### Scenario: Industrial zone generates service roads

- **WHEN** an industrial zone generates multiple structures
- **THEN** generated service-road segments connect, pass between, or pass near industrial structures while maintaining clearance from generated structure footprints

#### Scenario: Populated district connects to a nearby main road

- **WHEN** a village, market, or industrial zone generates internal circulation and a user-drawn main road is within the district road-connection range with an unobstructed route
- **THEN** the generated circulation includes an access path with one endpoint on or within the visible width of that generated road and another endpoint connected to the internal district circulation

#### Scenario: Blocked road access is not forced

- **WHEN** the nearest main road would require crossing water or another blocked area without an explicit bridge rule
- **THEN** generated district circulation MUST NOT add a connector across that blocker

#### Scenario: District circulation remains deterministic

- **WHEN** the same sketch is generated repeatedly without edits
- **THEN** generated streets, aisles, service roads, and road-access connectors remain stable for that sketch

### Requirement: Road and water conflicts are order-aware

The generator SHALL resolve road/river intersections according to sketch order so later strokes can intentionally override earlier terrain relationships.

#### Scenario: Road drawn over existing water creates a bridge

- **WHEN** a road sketch is ordered after an intersecting river sketch
- **THEN** the generated map keeps the road crossing and adds a bridge representation at the water crossing

#### Scenario: Water drawn over existing road cuts the road

- **WHEN** a river sketch is ordered after an intersecting road sketch
- **THEN** the generated map interrupts or splits the generated road at the river crossing and MUST NOT add a bridge automatically

### Requirement: Generated structures include deterministic visual variation

The generator SHALL provide deterministic visual variation for generated structures so repeated content does not look copied or axis-aligned.

#### Scenario: Buildings have varied rotation and size

- **WHEN** a village zone generates multiple buildings
- **THEN** generated buildings include varied sizes and renderable rotations while remaining stable across regeneration without sketch edits

#### Scenario: Markets and industry vary by type

- **WHEN** market or industrial zones generate stalls or structures
- **THEN** generated objects include type-appropriate size, rotation, or variant differences without breaking import of older generated data

### Requirement: Generation integrates existing roads and rivers into zone layouts

The generator SHALL use existing roads and rivers as layout constraints when placing zone content and internal circulation.

#### Scenario: Existing roads guide settlement access

- **WHEN** a village, market, or industrial zone overlaps or approaches an existing road sketch
- **THEN** generated internal circulation can connect near that road or orient nearby structures toward it while preserving valid spacing and road clearance

#### Scenario: Rivers shape nearby layouts

- **WHEN** a zone overlaps or approaches a river sketch
- **THEN** generated structures and internal paths keep water clearance and organize around the blocked river coverage rather than ignoring it

#### Scenario: Road and river conflict results remain respected

- **WHEN** road/river conflicts generate bridges or cut roads
- **THEN** zone-generated structures and internal paths respect those generated conflict results and MUST NOT place content over blocked water crossings

