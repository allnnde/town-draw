## MODIFIED Requirements

### Requirement: Generated data is derived from sketch data

The map generator SHALL create a generated map containing a semantic road network and non-road generated objects from current sketch data without mutating the sketch objects.

#### Scenario: User generates a map

- **WHEN** the user clicks `Generar mapa`
- **THEN** the generator returns a complete generated map and editor state stores it separately from the sketch data

#### Scenario: Sketch remains unchanged after generation

- **WHEN** generation completes
- **THEN** existing sketch objects keep their ids, geometry, and type-specific properties unchanged

### Requirement: Generator maps sketch types to MVP visual objects

The generator SHALL map each supported sketch type and effective polygonal zone coverage to a coherent generated map whose roads share one validated network.

#### Scenario: Rivers and roads generate visual lines

- **WHEN** the sketch contains river and road objects
- **THEN** the result includes rendered river geometry and normalized road-network edges with their semantic road classes

#### Scenario: Forest zones generate trees

- **WHEN** the effective zone coverage contains a forest zone
- **THEN** the result includes multiple trees placed inside the effective non-blocked forest coverage

#### Scenario: Village zones generate buildings and streets

- **WHEN** the effective zone coverage contains a village zone
- **THEN** the result includes buildings placed around a connected village street subgraph inside the effective non-blocked coverage

#### Scenario: Market zones generate stalls and aisles

- **WHEN** the effective zone coverage contains a market zone
- **THEN** the result includes stalls placed around connected aisle edges inside the effective non-blocked coverage

#### Scenario: Industrial zones generate industrial structures and service roads

- **WHEN** the effective zone coverage contains an industrial zone
- **THEN** the result includes industrial structures placed around connected service-road edges inside the effective non-blocked coverage

### Requirement: Generated rendering is isolated from sketch rendering

Generated map content SHALL be rendered on the generated layer from non-road objects and the validated road network, while generated-view zone fills SHALL be hidden by default.

#### Scenario: Generated objects are visible without zone fill clutter

- **WHEN** generated content exists for a painted zone
- **THEN** rivers, road-network edges, trees, buildings, stalls, industrial structures, and bridges are visible while the zone planning fill is not shown as part of the generated result

#### Scenario: Junction rendering follows graph topology

- **WHEN** multiple rendered road edges share a junction node
- **THEN** their visible centerlines meet at the same node position without a gap or accidental overpass

#### Scenario: Sketch data remains editable after generation

- **WHEN** generated-view zone fills are hidden
- **THEN** the underlying zone and road sketches remain editable semantic objects

### Requirement: Regeneration replaces previous generated output

Running generation again SHALL atomically replace the complete generated map, including its road network, with a fresh validated result for the current sketch.

#### Scenario: User regenerates after editing

- **WHEN** the user changes the sketch and clicks `Generar mapa` again
- **THEN** the complete previous generated result is replaced instead of retaining stale nodes, edges, or objects

#### Scenario: New result fails validation

- **WHEN** a newly planned road network cannot satisfy required validity invariants
- **THEN** the editor does not publish a partially replaced generated map

### Requirement: Settlements and activity zones generate internal circulation

The generator SHALL plan validated circulation before placing populated-zone objects. Village streets, market aisles, and industrial service roads SHALL belong to connected district subgraphs, route through accessible polygonal coverage, and attach to reachable existing roads through explicit graph nodes.

#### Scenario: Village generates streets between houses

- **WHEN** a village generates buildings and streets
- **THEN** buildings are distributed along reachable street frontage while maintaining footprint and road clearance

#### Scenario: Market generates aisles between stalls

- **WHEN** a market generates stalls and aisles
- **THEN** stall groups are organized around reachable aisle edges while preserving pedestrian gaps

#### Scenario: Industrial zone generates service roads

- **WHEN** an industrial district generates structures and service roads
- **THEN** structures are organized around reachable service-road edges while maintaining type-specific clearance

#### Scenario: Populated district connects to a nearby main road

- **WHEN** a populated district has a reachable road within access range
- **THEN** its internal subgraph shares an explicit portal node with that road

#### Scenario: Blocked road access is not forced

- **WHEN** every possible road access route crosses blocked space without an explicit bridge rule
- **THEN** no external connector is generated and the internal district subgraph remains connected

#### Scenario: District circulation remains deterministic

- **WHEN** the same sketch is generated repeatedly without edits
- **THEN** generated circulation topology and structure placement remain stable

### Requirement: Road and water conflicts are order-aware

The generator SHALL resolve user-road and river intersections according to sketch order and record the surviving result in the road graph.

#### Scenario: Road drawn over existing water creates a bridge

- **WHEN** a road sketch is ordered after an intersecting river sketch
- **THEN** the road graph keeps the crossing, splits the road at explicit bridge endpoints as needed, and includes a bridge representation

#### Scenario: Water drawn over existing road cuts the road

- **WHEN** a river sketch is ordered after an intersecting road sketch
- **THEN** the road graph excludes the blocked crossing span and MUST NOT add a bridge automatically

#### Scenario: District circulation does not invent bridges

- **WHEN** a generated district edge encounters water
- **THEN** it routes around the water or is omitted unless an explicit bridge rule authorizes the crossing

### Requirement: Generation integrates existing roads and rivers into zone layouts

The generator SHALL use the normalized road graph and river blockers as constraints when planning district circulation and placing zone content.

#### Scenario: Existing roads guide settlement access

- **WHEN** a populated zone overlaps or approaches an existing road
- **THEN** the district planner evaluates explicit access portals on that road and uses a reachable portal when one exists

#### Scenario: Rivers shape nearby layouts

- **WHEN** a zone overlaps or approaches a river
- **THEN** generated structures and road edges maintain water clearance and organize around the blocked coverage

#### Scenario: Road and river conflict results remain respected

- **WHEN** normalization creates bridges or cuts road edges at water conflicts
- **THEN** district generation uses the normalized result and MUST NOT place content over blocked water spans
