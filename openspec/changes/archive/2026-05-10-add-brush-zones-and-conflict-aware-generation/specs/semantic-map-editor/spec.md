## MODIFIED Requirements

### Requirement: Tool selection uses the initial tool set

The editor SHALL allow the user to choose the MVP drawing and editing tools: `select`, `river`, `road`, `zone-village`, `zone-market`, `zone-forest`, `zone-industrial`, and `erase`.

#### Scenario: User changes active tool

- **WHEN** the user clicks a tool in the toolbar
- **THEN** `EditorStateService.activeTool` is updated to that tool and the active tool is visibly indicated

#### Scenario: Industrial zone tool is available

- **WHEN** the toolbar is visible
- **THEN** the user can select an industrial zone tool that creates industrial zone sketches

### Requirement: Semantic sketch objects are created by drawing tools

Drawing tools SHALL create semantic map objects in `sketchObjects` rather than painting pixels directly, and zone tools SHALL create editable brush-based region coverage rather than rigid rectangles.

#### Scenario: User draws a river

- **WHEN** the active tool is `river` and the user drags across the viewport then releases
- **THEN** the editor adds a `RiverSketch` with accumulated `points` and a default `width`

#### Scenario: User draws a road

- **WHEN** the active tool is `road` and the user drags across the viewport then releases
- **THEN** the editor adds a `RoadSketch` with accumulated `points` and a default `roadType`

#### Scenario: User paints a zone with a round brush

- **WHEN** the active tool is one of `zone-village`, `zone-market`, `zone-forest`, or `zone-industrial` and the user drags across the viewport
- **THEN** the editor records a `ZoneSketch` whose `zoneType` matches the selected zone tool and whose coverage is defined by round brush stamps or equivalent semantic brush strokes

#### Scenario: Zone brush preview is visible in real time

- **WHEN** the user is painting a zone brush stroke
- **THEN** the viewport shows the growing region coverage before the user releases the pointer

#### Scenario: Painted zones remain semantic objects

- **WHEN** a brush-painted zone is completed
- **THEN** the saved sketch data represents editable zone coverage and MUST NOT be flattened into generated pixels

### Requirement: Sketch rendering reflects semantic state

The editor SHALL render sketch objects from `sketchObjects` using distinct visual styles for rivers, roads, and brush-painted zones.

#### Scenario: Sketch objects render after creation

- **WHEN** a river, road, or brush-painted zone is added to `sketchObjects`
- **THEN** `SketchRendererService` renders it respectively as a blue line, gray/brown line, or semi-transparent typed area following the zone's painted coverage

#### Scenario: Zone selection uses painted coverage

- **WHEN** the active tool is `select` or `erase` and the user clicks inside a brush-painted zone's effective coverage
- **THEN** hit testing treats the zone as selected or erased even if the click is outside any old rectangular bounds

## ADDED Requirements

### Requirement: Brush zones support detailed editing density

The editor SHALL allow zone tools to paint detailed organic coverage with a round brush/aerosol style suitable for forests, settlements, markets, and industrial areas.

#### Scenario: User paints an irregular forest edge

- **WHEN** the user paints a forest zone with multiple overlapping brush passes
- **THEN** the resulting zone coverage can form an irregular non-rectangular boundary

#### Scenario: User paints a narrow region detail

- **WHEN** the user paints a small detail with the zone brush
- **THEN** the saved zone coverage preserves that detail well enough for generation to include or exclude it
