## Purpose

Defines a deterministic, topologically valid road network that joins user-drawn roads and generated district circulation without accidental crossings, detached segments, or hidden proximity-based connections.

## ADDED Requirements

### Requirement: Generated roads form an explicit graph

The generator SHALL represent every generated road network as explicit nodes joined by edges, and each edge MUST reference existing endpoint nodes rather than relying on coincident coordinates to imply connectivity.

#### Scenario: Connected edges share a node

- **WHEN** two road edges meet as part of the same route or junction
- **THEN** both edges reference the same endpoint node at that connection

#### Scenario: Nearby geometry is not treated as connected

- **WHEN** two edge geometries pass within visual tolerance but do not share a node
- **THEN** the network reports them as disconnected

### Requirement: Road sketches normalize into the generated network

The generator SHALL convert valid user-drawn road sketches into the same road graph used by generated district circulation while preserving their semantic road hierarchy.

#### Scenario: Crossing road sketches create a junction

- **WHEN** two same-level road sketches cross at a valid traversable position
- **THEN** generation creates one shared junction node and splits the participating road edges at that node

#### Scenario: Road endpoint meets an existing edge

- **WHEN** a road-sketch endpoint reaches another road within the configured snapping tolerance
- **THEN** generation projects the endpoint onto that road and represents the connection with a shared node

#### Scenario: Separate roads remain separate

- **WHEN** road sketches neither intersect nor fall within endpoint snapping tolerance
- **THEN** generation MUST NOT infer a connection between them

### Requirement: Populated districts generate connected circulation graphs

Each village, market, and industrial district SHALL generate at most one connected internal circulation component for each connected traversable district region, beginning with a meaningful trunk and adding only branches or loops that attach through explicit nodes.

#### Scenario: Large village receives a connected network

- **WHEN** a large traversable village region has enough space for multiple streets
- **THEN** every generated village street edge is reachable from every other village street edge through shared nodes

#### Scenario: Small or constrained district degrades safely

- **WHEN** a district cannot fit the desired branch count without violating coverage or clearance constraints
- **THEN** generation emits a smaller connected network instead of detached or invalid fallback strokes

#### Scenario: Market and industrial circulation preserve their semantics

- **WHEN** market or industrial circulation is added to the graph
- **THEN** its edges retain aisle or service-road semantics while obeying the same connectivity rules as village streets

### Requirement: Reachable districts join existing roads through explicit portals

The generator SHALL connect a populated district to a nearby reachable user road through an explicit access portal that splits or terminates on the existing road graph.

#### Scenario: District reaches a nearby road

- **WHEN** a compatible road edge is within access range and a blocker-free route exists
- **THEN** the district access edge and the existing road share a portal node located on that road edge

#### Scenario: No reachable external road exists

- **WHEN** every nearby road would require crossing blocked water or invalid coverage
- **THEN** the district remains internally connected and the generator MUST NOT fabricate an external connection

### Requirement: Road crossings are topologically explicit or absent

The generated network MUST NOT contain two same-level edge interiors that cross without a shared junction node. A candidate crossing SHALL be normalized into a valid junction or rejected and rerouted.

#### Scenario: Permitted crossing becomes a junction

- **WHEN** two compatible road candidates cross with valid clearance and intersection geometry
- **THEN** the result splits both candidates at one shared junction node

#### Scenario: Invalid crossing is not emitted

- **WHEN** a candidate edge would cross another edge at a blocked position or with invalid intersection geometry
- **THEN** the generator rejects or reroutes the candidate and the final network contains no such crossing

#### Scenario: No implicit road overpasses

- **WHEN** two road candidates cross at the same level
- **THEN** the generator MUST NOT represent them as an unconnected overpass

### Requirement: Network edges respect traversability and clearance

Every generated road edge SHALL remain within its allowed traversable region, preserve required clearance from waterways and generated structure footprints, and leave that region only through a validated access or bridge rule.

#### Scenario: Internal edge stays inside district coverage

- **WHEN** an internal street, aisle, or service-road edge is emitted
- **THEN** its full visible width remains inside effective non-blocked district coverage

#### Scenario: Edge avoids generated structures

- **WHEN** structures are placed around a validated road network
- **THEN** no structure footprint overlaps the visible width and configured clearance of any road edge

#### Scenario: District edge encounters water

- **WHEN** a district route candidate would cross blocked water without an explicit bridge rule
- **THEN** the candidate is rejected or routed around the water

### Requirement: Network generation is deterministic

The generator SHALL produce stable node ids, edge ids, topology, and geometry for identical semantic sketch input.

#### Scenario: Unchanged sketch regenerates identically

- **WHEN** the same sketch is generated repeatedly without edits
- **THEN** the road network contains the same nodes, edges, semantic classes, and coordinates in deterministic order

### Requirement: Invalid network output is not published

Before generated output replaces the current map, the network SHALL be checked for dangling references, accidental crossings, disconnected district components, invalid blockers, and structure overlaps.

#### Scenario: Candidate network violates an invariant

- **WHEN** planned output contains an edge with missing endpoints or another invalid topological invariant
- **THEN** generation MUST NOT publish that invalid network as the current generated map

#### Scenario: Optional branch violates an invariant

- **WHEN** removing an invalid optional branch leaves the required district network valid and connected
- **THEN** generation may omit that branch and publish the reduced valid network
