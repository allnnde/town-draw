## Why

Generated streets can currently satisfy local distance and intersection checks while still forming chaotic, disconnected, or illegally crossing layouts. The generator needs a topological road-network model and validation pipeline rather than additional heuristics over independent polylines.

## What Changes

- Introduce a semantic generated road graph whose explicit nodes and edges are the source of truth for main roads, district streets, market aisles, and industrial service roads.
- Normalize user-drawn road sketches into the graph, snapping endpoints and splitting edges at permitted intersections.
- Replace the current independent-stroke district algorithm with deterministic graph planning: access portal, trunk, connected branches, blocker-aware routing, topology normalization, and validation.
- Place buildings, stalls, and industrial structures from the validated circulation network so structures face and remain clear of reachable streets.
- Reject or reroute accidental edge crossings; every same-level crossing that remains in the result must be represented by a shared junction node.
- Separate road planning, geometry, validation, district layout, rendering projection, and generation orchestration instead of keeping them in one generator service.
- Replace proximity-based street tests with graph invariants and regression fixtures for connectivity, crossings, blockers, clearance, and determinism.
- **BREAKING** Replace `GeneratedRoad` and `GeneratedInternalPath` as independent render polylines with a unified generated road-network representation.
- **BREAKING** Change generated project state and JSON so legacy generated road output is discarded and regenerated from preserved sketch data instead of being treated as current network data.
- Remove the superseded organic-path, object-aware-path, and duplicate road-access implementations after the new planner is integrated.

## Capabilities

### New Capabilities

- `road-network-generation`: Defines the topology, planning, normalization, routing, intersection, and validation rules for generated road networks.

### Modified Capabilities

- `basic-map-generation`: Makes validated road-network generation precede populated-zone placement and changes generated output from independent paths to a coherent network.
- `project-json-storage`: Stores the new generated-map representation and regenerates incompatible legacy generated road data while preserving semantic sketches.

## Impact

- Affects generated and project models, `EditorStateService`, `MapGeneratorService`, road/zone generation, river conflict handling, render services, JSON import/export, fixtures, and generation tests.
- The ongoing polygon-zone change is a prerequisite for reliable traversable-zone geometry; this change consumes polygon coverage rather than reintroducing brush-stamp planning.
- No external pathfinding dependency is required: the planner can use bounded in-repo spatial sampling and deterministic graph search.
- Existing sketch roads and zones remain semantic inputs, but previously saved generated output will not retain its old ids or geometry after import/regeneration.
