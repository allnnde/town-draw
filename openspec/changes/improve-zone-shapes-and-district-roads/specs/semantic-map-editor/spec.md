## MODIFIED Requirements

### Requirement: Semantic sketch objects are created by drawing tools

Drawing tools SHALL create semantic map objects in `sketchObjects` rather than painting pixels directly, and zone tools SHALL create editable brush-based region coverage that behaves as one merged organic shape rather than multiple independent circles.

#### Scenario: User draws a river

- **WHEN** the active tool is `river` and the user drags across the viewport then releases
- **THEN** the editor adds a `RiverSketch` with accumulated `points` and a default `width`

#### Scenario: User draws a road

- **WHEN** the active tool is `road` and the user drags across the viewport then releases
- **THEN** the editor adds a `RoadSketch` with accumulated `points` and a default `roadType`

#### Scenario: User paints a zone with a round brush

- **WHEN** the active tool is one of `zone-village`, `zone-market`, `zone-forest`, or `zone-industrial` and the user drags across the viewport
- **THEN** the editor records a `ZoneSketch` whose `zoneType` matches the selected zone tool and whose coverage is defined by a merged organic brush stroke shape

#### Scenario: Zone brush preview is visible in real time

- **WHEN** the user is painting a zone brush stroke
- **THEN** the viewport shows the growing merged region coverage before the user releases the pointer

#### Scenario: Painted zones remain semantic objects

- **WHEN** a brush-painted zone is completed
- **THEN** the saved sketch data represents editable zone coverage and MUST NOT be flattened into generated pixels

#### Scenario: Overlapping brush stamps merge into one zone shape

- **WHEN** the user paints overlapping or adjacent brush stamps as part of one zone stroke
- **THEN** selection, rendering, and generation coverage treat the result as a single continuous zone shape instead of separate circular islands per stamp

### Requirement: Sketch rendering reflects semantic state

The editor SHALL render sketch objects from `sketchObjects` using distinct visual styles for rivers, roads, and brush-painted zones, and zone rendering SHALL display each painted zone as a continuous filled organic area following its merged coverage.

#### Scenario: Sketch objects render after creation

- **WHEN** a river, road, or brush-painted zone is added to `sketchObjects`
- **THEN** `SketchRendererService` renders it respectively as a blue line, gray/brown line, or semi-transparent typed area following the zone's merged painted coverage

#### Scenario: Zone selection uses painted coverage

- **WHEN** the active tool is `select` or `erase` and the user clicks inside a brush-painted zone's effective merged coverage
- **THEN** hit testing treats the zone as selected or erased even if the click is outside any individual brush stamp center or old rectangular bounds

### Requirement: Brush zones support detailed editing density

The editor SHALL allow zone tools to paint detailed organic coverage with a round brush/aerosol style suitable for forests, settlements, markets, and industrial areas, while preserving the painted stroke as one coherent zone blob for downstream behavior.

#### Scenario: User paints an irregular forest edge

- **WHEN** the user paints a forest zone with multiple overlapping brush passes
- **THEN** the resulting zone coverage can form an irregular non-rectangular boundary

#### Scenario: User paints a narrow region detail

- **WHEN** the user paints a small detail with the zone brush
- **THEN** the saved zone coverage preserves that detail well enough for generation to include or exclude it

#### Scenario: Dense brush overlap does not create duplicate zone semantics

- **WHEN** the user paints repeatedly over the same zone area
- **THEN** the editor keeps one semantic zone coverage result for that area rather than multiplying generation or hit-test effects by the number of overlapping stamps
