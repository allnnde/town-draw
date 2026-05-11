## MODIFIED Requirements

### Requirement: Generator maps sketch types to MVP visual objects

The generator SHALL map each supported sketch type and effective polygonal brush-zone coverage to coherent generated visual objects.

#### Scenario: Rivers and roads generate visual lines

- **WHEN** the sketch contains `RiverSketch` and `RoadSketch` objects that do not conflict by order or geometry
- **THEN** the result includes `GeneratedRiver` objects with thicker widths and `GeneratedRoad` objects with renderable widths

#### Scenario: Forest zones generate trees

- **WHEN** the effective polygonal zone coverage contains a `ZoneSketch` with `zoneType` `forest`
- **THEN** the result includes multiple `GeneratedTree` objects placed inside the effective non-blocked forest coverage

#### Scenario: Village zones generate buildings and streets

- **WHEN** the effective polygonal zone coverage contains a `ZoneSketch` with `zoneType` `village`
- **THEN** the result includes `GeneratedBuilding` objects and internal generated road/street segments placed inside the effective non-blocked village coverage

#### Scenario: Market zones generate stalls and aisles

- **WHEN** the effective polygonal zone coverage contains a `ZoneSketch` with `zoneType` `market`
- **THEN** the result includes `GeneratedMarketStall` objects and coherent aisle/path segments placed inside the effective non-blocked market coverage

#### Scenario: Industrial zones generate industrial structures and service roads

- **WHEN** the effective polygonal zone coverage contains a `ZoneSketch` with `zoneType` `industrial`
- **THEN** the result includes generated industrial structures and service-road segments placed inside the effective non-blocked industrial coverage

### Requirement: Generation resolves overlapping zone coverage

The generator SHALL resolve overlapping brush-painted zones into a single effective zone type per generated sample location using polygonal zone coverage before placing objects.

#### Scenario: Forest is painted over village

- **WHEN** forest polygonal coverage overlaps existing village polygonal coverage
- **THEN** the overlapped area generates forest content only and MUST NOT generate village buildings in the same sample locations

#### Scenario: Village is painted over forest

- **WHEN** village polygonal coverage overlaps existing forest polygonal coverage
- **THEN** the overlapped area generates village content only and MUST NOT generate forest trees in the same sample locations

#### Scenario: Market and industrial zones overlap

- **WHEN** market and industrial polygonal coverage overlap
- **THEN** the overlapped area uses the deterministic zone conflict rule and generates content for only the winning zone type

## ADDED Requirements

### Requirement: Polygonal zone coverage is memory bounded

The generator SHALL use polygonal zone coverage as the primary geometry for completed zones and SHALL avoid algorithms that scale rendering or generation work directly with every brush stamp when polygon coverage exists.

#### Scenario: Large painted zone generation avoids stamp explosion

- **WHEN** a completed zone contains a large number of brush stamps and a derived polygon
- **THEN** generation samples and bounds the zone from the polygonal coverage and MUST NOT iterate through all stamps for every candidate point

#### Scenario: Legacy brush-only zones remain compatible

- **WHEN** an imported project contains a zone with `brushStamps` but no polygon
- **THEN** generation derives or uses bounded polygonal coverage before placing generated content

#### Scenario: Dense overlapping stamps do not multiply generation cost

- **WHEN** many repeated brush stamps cover the same area
- **THEN** generated object counts and path counts are based on effective polygonal area rather than the number of stored stamps
