## MODIFIED Requirements

### Requirement: Semantic sketch objects are created by drawing tools

Drawing tools SHALL create semantic map objects in `sketchObjects` rather than painting pixels directly, and zone tools SHALL create editable brush-based region coverage that is finalized as a single polygonal region rather than stored only as many independent round brush circles.

#### Scenario: User draws a river

- **WHEN** the active tool is `river` and the user drags across the viewport then releases
- **THEN** the editor adds a `RiverSketch` with accumulated `points` and a default `width`

#### Scenario: User draws a road

- **WHEN** the active tool is `road` and the user drags across the viewport then releases
- **THEN** the editor adds a `RoadSketch` with accumulated `points` and a default `roadType`

#### Scenario: User paints a zone with a round brush

- **WHEN** the active tool is one of `zone-village`, `zone-market`, `zone-forest`, or `zone-industrial` and the user drags across the viewport
- **THEN** the editor records a `ZoneSketch` whose `zoneType` matches the selected zone tool and whose completed coverage includes a simplified polygonal region derived from the brush stroke

#### Scenario: Zone brush preview is visible in real time

- **WHEN** the user is painting a zone brush stroke
- **THEN** the viewport shows the growing region coverage before the user releases the pointer

#### Scenario: Painted zones remain semantic objects

- **WHEN** a brush-painted zone is completed
- **THEN** the saved sketch data represents editable zone coverage and MUST NOT be flattened into generated pixels

#### Scenario: Completed zone is not circle-only geometry

- **WHEN** the user completes a brush-painted zone stroke
- **THEN** the resulting zone has polygonal coverage that downstream rendering, hit testing, and generation can use without drawing or sampling every brush stamp circle

### Requirement: Sketch rendering reflects semantic state

The editor SHALL render sketch objects from `sketchObjects` using distinct visual styles for rivers, roads, and brush-painted zones, and completed zone rendering SHALL use the zone polygon/outline instead of issuing one rendered circle per brush stamp.

#### Scenario: Sketch objects render after creation

- **WHEN** a river, road, or completed brush-painted zone is added to `sketchObjects`
- **THEN** `SketchRendererService` renders it respectively as a blue line, gray/brown line, or semi-transparent typed polygonal area following the zone's painted coverage

#### Scenario: Zone selection uses painted coverage

- **WHEN** the active tool is `select` or `erase` and the user clicks inside a brush-painted zone's effective polygonal coverage
- **THEN** hit testing treats the zone as selected or erased even if the click is outside any old rectangular bounds

#### Scenario: Large zones render with bounded geometry

- **WHEN** a completed zone was painted with many brush stamps
- **THEN** rendering uses bounded polygon geometry and MUST NOT create one Pixi circle command for every stored stamp

### Requirement: Brush zones support detailed editing density

The editor SHALL allow zone tools to paint detailed organic coverage with a round brush/aerosol style suitable for forests, settlements, markets, and industrial areas, and completed strokes SHALL be simplified into bounded polygonal coverage suitable for rendering and generation.

#### Scenario: User paints an irregular forest edge

- **WHEN** the user paints a forest zone with multiple overlapping brush passes
- **THEN** the resulting zone coverage can form an irregular non-rectangular polygonal boundary

#### Scenario: User paints a narrow region detail

- **WHEN** the user paints a small detail with the zone brush
- **THEN** the saved zone coverage preserves that detail well enough for generation to include or exclude it

#### Scenario: Very dense strokes are simplified

- **WHEN** a user paints a zone with dense overlapping or repeated brush stamps
- **THEN** the completed zone polygon is simplified to a bounded number of points while preserving the approximate painted area
