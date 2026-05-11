## MODIFIED Requirements

### Requirement: Generator maps sketch types to MVP visual objects

The generator SHALL map each supported sketch type and effective merged brush-zone coverage to coherent generated visual objects.

#### Scenario: Rivers and roads generate visual lines

- **WHEN** the sketch contains `RiverSketch` and `RoadSketch` objects that do not conflict by order or geometry
- **THEN** the result includes `GeneratedRiver` objects with thicker widths and `GeneratedRoad` objects with renderable widths

#### Scenario: Forest zones generate trees

- **WHEN** the effective merged zone coverage contains a `ZoneSketch` with `zoneType` `forest`
- **THEN** the result includes multiple `GeneratedTree` objects placed inside the effective non-blocked forest coverage

#### Scenario: Village zones generate buildings and streets

- **WHEN** the effective merged zone coverage contains a `ZoneSketch` with `zoneType` `village`
- **THEN** the result includes `GeneratedBuilding` objects and connected internal generated road/street branches placed inside the effective non-blocked village coverage

#### Scenario: Market zones generate stalls and aisles

- **WHEN** the effective merged zone coverage contains a `ZoneSketch` with `zoneType` `market`
- **THEN** the result includes `GeneratedMarketStall` objects and coherent connected aisle/path segments placed inside the effective non-blocked market coverage

#### Scenario: Industrial zones generate industrial structures and service roads

- **WHEN** the effective merged zone coverage contains a `ZoneSketch` with `zoneType` `industrial`
- **THEN** the result includes generated industrial structures and connected service-road segments placed inside the effective non-blocked industrial coverage

### Requirement: Settlements and activity zones generate internal circulation

The generator SHALL add internal circulation paths for populated zone types where generated objects need access. For village, market, and industrial zones, circulation SHALL be planned from the unified zone coverage before object placement, SHALL form a connected branch network with a bounded number of meaningful internal paths, SHALL keep clear of blocked areas, and MUST NOT be generated as detached arbitrary segments that ignore the district shape.

#### Scenario: Village generates streets between houses

- **WHEN** a village zone generates multiple buildings
- **THEN** generated road/street segments connect, pass between, or pass near groups of buildings while maintaining clearance from generated building footprints

#### Scenario: Market generates aisles between stalls

- **WHEN** a market zone generates multiple stalls
- **THEN** generated aisle/path segments keep visible gaps between stall groups and maintain clearance from generated stall footprints

#### Scenario: Industrial zone generates service roads

- **WHEN** an industrial zone generates multiple structures
- **THEN** generated service-road segments connect, pass between, or pass near industrial structures while maintaining clearance from generated structure footprints

#### Scenario: Larger populated district creates a small branch network

- **WHEN** a large village, market, or industrial zone has enough valid coverage to support internal circulation
- **THEN** generation creates a connected internal network with a main spine and at least three meaningful branch or street segments before placing populated district objects

#### Scenario: Internal branches connect to each other

- **WHEN** a populated district generates more than one internal circulation path
- **THEN** every non-access internal path is connected directly or indirectly to the same internal circulation network

#### Scenario: Buildings are placed around planned streets

- **WHEN** village generation creates an internal circulation network
- **THEN** generated buildings are placed around the planned streets while maintaining clearance from street widths and building footprints

#### Scenario: Populated district connects to a nearby main road

- **WHEN** a village, market, or industrial zone generates internal circulation and a user-drawn main road is within the district road-connection range with an unobstructed route
- **THEN** the generated circulation includes an access path with one endpoint on or within the visible width of that generated road and another endpoint connected to the internal district circulation

#### Scenario: Blocked road access is not forced

- **WHEN** the nearest main road would require crossing water or another blocked area without an explicit bridge rule
- **THEN** generated district circulation MUST NOT add a connector across that blocker

#### Scenario: District circulation remains deterministic

- **WHEN** the same sketch is generated repeatedly without edits
- **THEN** generated streets, aisles, service roads, and road-access connectors remain stable for that sketch

## ADDED Requirements

### Requirement: Unified zone coverage drives generation sampling

The generator SHALL evaluate each brush-painted zone as one effective merged coverage shape when sampling placement candidates, path candidates, overlap winners, and blockers.

#### Scenario: Overlapping stamps do not multiply generated content

- **WHEN** a zone contains repeated overlapping brush stamps in the same area
- **THEN** generation treats the overlap as one covered area and MUST NOT increase object count or path count solely because multiple stamps cover the same point

#### Scenario: Continuous painted stroke supports continuous paths

- **WHEN** adjacent brush stamps form a continuous painted zone stroke
- **THEN** internal path planning can route through the connected stroke as one district shape rather than stopping at individual stamp boundaries
