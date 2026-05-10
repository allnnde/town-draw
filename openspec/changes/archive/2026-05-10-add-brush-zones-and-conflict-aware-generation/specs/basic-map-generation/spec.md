## MODIFIED Requirements

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

## ADDED Requirements

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

The generator SHALL place zone-generated objects using a deterministic organic distribution that avoids perfect rows while preserving readable spacing and organization.

#### Scenario: Village generation avoids perfect grids

- **WHEN** a village zone generates buildings
- **THEN** the generated buildings have varied positions and spacing and MUST NOT appear in perfectly aligned rows or columns

#### Scenario: Organic output remains coherent

- **WHEN** the same sketch is generated repeatedly without edits
- **THEN** generated placement remains stable enough for predictable editing and testing

### Requirement: Settlements and activity zones generate internal circulation

The generator SHALL add internal circulation paths for populated zone types where generated objects need access.

#### Scenario: Village generates streets between houses

- **WHEN** a village zone generates multiple buildings
- **THEN** generated road/street segments connect or pass near groups of buildings

#### Scenario: Market generates aisles between stalls

- **WHEN** a market zone generates multiple stalls
- **THEN** generated aisle/path segments keep visible gaps between stall groups

#### Scenario: Industrial zone generates service roads

- **WHEN** an industrial zone generates multiple structures
- **THEN** generated service-road segments connect or pass near industrial structures

### Requirement: Road and water conflicts are order-aware

The generator SHALL resolve road/river intersections according to sketch order so later strokes can intentionally override earlier terrain relationships.

#### Scenario: Road drawn over existing water creates a bridge

- **WHEN** a road sketch is ordered after an intersecting river sketch
- **THEN** the generated map keeps the road crossing and adds a bridge representation at the water crossing

#### Scenario: Water drawn over existing road cuts the road

- **WHEN** a river sketch is ordered after an intersecting road sketch
- **THEN** the generated map interrupts or splits the generated road at the river crossing and MUST NOT add a bridge automatically
