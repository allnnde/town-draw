## 1. Prerequisites and Regression Baseline

- [x] 1.1 Confirm polygonal zone coverage is the primary runtime geometry and complete the pending large-zone manual verification before changing road generation.
- [x] 1.2 Add focused regression fixtures that reproduce disconnected streets, accidental crossings, false proximity connections, blocked road access, and the reported large-district layouts.
- [x] 1.3 Record the current generated-map and import/export behaviors that will intentionally break so later test failures can be classified as migration work rather than regressions.

## 2. Generated Map and Road Graph Models

- [x] 2.1 Define the versioned generated-map aggregate with a `RoadNetwork` and separate non-road generated objects.
- [x] 2.2 Define road node kinds, edge semantic classes, source metadata, bridge metadata, and deterministic node/edge ordering contracts.
- [x] 2.3 Replace editor-state generated-object storage APIs with atomic generated-map get/set/clear operations and update compile-time consumers.
- [x] 2.4 Add model-level tests for valid endpoint references, stable serialization, semantic road classes, and separation from sketch data.

## 3. Road Geometry and Graph Validation Kernel

- [x] 3.1 Extract reusable point, segment, polyline, projection, oriented-footprint, polygon-clearance, and water-clearance operations from the current generator.
- [x] 3.2 Implement deterministic graph construction helpers for adding, splitting, merging, removing, and sorting nodes and edges with stable ids.
- [x] 3.3 Implement spatial bucketing for bounded crossing, overlap, snapping, and clearance queries.
- [x] 3.4 Implement intersection normalization for shared endpoints, projected endpoints, valid interior junctions, and rejected collinear or invalid crossings.
- [x] 3.5 Implement structured graph validation for references, endpoint geometry, duplicate ids, connectivity, implicit crossings, overlaps, blockers, and deterministic order.
- [x] 3.6 Add focused unit tests proving that geometric proximity and raw segment crossing do not imply graph connectivity.

## 4. User Road and Water Normalization

- [x] 4.1 Convert user road sketches into road nodes and edges while preserving main, secondary, and path hierarchy.
- [x] 4.2 Split crossing road sketches at deterministic shared junction nodes and snap eligible endpoints onto existing road edges.
- [x] 4.3 Keep separate and near-parallel roads disconnected when they do not satisfy crossing or endpoint-snapping rules.
- [x] 4.4 Integrate order-aware road/river resolution so bridges remain graph edges with bridge metadata and later rivers remove blocked spans with explicit terminals.
- [x] 4.5 Add normalization tests for multi-segment roads, T-junctions, four-way crossings, close misses, parallel roads, bridges, and river cuts.

## 5. District Traversability and Routing

- [x] 5.1 Build a bounded per-district traversability lattice from effective polygon coverage eroded by road half-width and configured clearance.
- [x] 5.2 Enforce adaptive cell sizing plus maximum row, column, and total-cell limits for large or narrow districts.
- [x] 5.3 Implement deterministic eight-direction A\* routing with distance, turn, boundary, water, and seeded variation costs.
- [x] 5.4 Select deterministic district cores, separated demand anchors, and reachable road-portal candidates.
- [x] 5.5 Build a required trunk first, then connect accepted branches to existing network nodes and add only validated useful loops.
- [x] 5.6 Simplify routed lattice paths into centerlines without moving endpoints or junctions and without violating coverage or blocker clearance.
- [x] 5.7 Degrade constrained districts by reducing optional branches rather than emitting detached or invalid fallback paths.
- [x] 5.8 Add routing tests for convex, concave, narrow, large, water-split, overlapping-zone, and isolated district coverage.

## 6. Global Network Assembly and District Access

- [x] 6.1 Merge each district subgraph into the normalized user-road graph while retaining district and semantic-class ownership.
- [x] 6.2 Create explicit access portals by splitting reachable existing road edges and attaching district access edges to the shared portal node.
- [x] 6.3 Normalize valid district/base-road crossings and reject or reroute candidates that create invalid angles, blockers, or overlaps.
- [x] 6.4 Validate that every emitted district contains one connected internal component and that every emitted external access is graph-reachable through its portal.
- [x] 6.5 Add multi-district tests for shared main roads, adjacent zones, unreachable roads, accidental inter-district crossings, and deterministic assembly order.

## 7. Network-Driven Structure Placement

- [x] 7.1 Implement deterministic frontage sampling along eligible street, aisle, and service-road edge intervals.
- [x] 7.2 Place and orient village buildings, market stalls, and industrial structures from local edge tangents and type-specific setbacks.
- [x] 7.3 Validate complete oriented footprints against effective zone polygons, water, road widths, and previously accepted structures.
- [x] 7.4 Reduce structure count when requested density cannot fit without violating network or footprint invariants.
- [x] 7.5 Preserve forest generation as non-frontage placement while moving shared blocker and footprint checks into the new geometry layer.
- [x] 7.6 Add tests for frontage reachability, both-side distribution, orientation, full-footprint containment, road clearance, spacing, and deterministic density reduction.

## 8. Generation, Rendering, and Legacy Removal

- [x] 8.1 Rebuild map generation as an ordered orchestrator for terrain resolution, road normalization, district planning, graph validation, structure placement, and final-map validation.
- [x] 8.2 Make generation return a complete validated candidate and replace editor state only after all required invariants pass.
- [x] 8.3 Update generated rendering to draw road-network edges, semantic styles, continuous shared junctions, and bridge metadata from the graph.
- [x] 8.4 Update viewport and editor flows to consume the generated-map aggregate while preserving sketch selection and generated-view zone hiding.
- [x] 8.5 Delete legacy generated-road/internal-path models, organic-path helpers, object-aware-path helpers, duplicate access logic, and geometry-inferred connectivity tests.
- [x] 8.6 Add renderer and orchestration tests for junction continuity, atomic failure behavior, regeneration replacement, and sketch immutability.

## 9. Project JSON Migration

- [x] 9.1 Add explicit project and generated-map schema versions and validators for road nodes, road edges, bridge metadata, and non-road objects.
- [x] 9.2 Export the generated-map aggregate and preserve semantic sketches in the versioned project JSON.
- [x] 9.3 Import valid current-version networks only after graph validation.
- [x] 9.4 Detect legacy generated polylines, preserve compatible sketches, clear incompatible generated data, and surface a regeneration-required indication.
- [x] 9.5 Add current round-trip, legacy migration, invalid-network, unsupported-version, and sketch-preservation fixtures and tests.

## 10. Verification and Visual Acceptance

- [x] 10.1 Run targeted model, geometry, normalization, routing, placement, rendering, and storage tests.
- [x] 10.2 Add deterministic stress cases over varied polygon shapes and assert graph invariants rather than exact incidental path coordinates.
- [x] 10.3 Run `npm test -- --watch=false`, `npm run build`, and targeted `npx prettier --check` for every changed file.
- [x] 10.4 Manually verify representative village, market, and industrial maps with nearby roads, multiple districts, rivers, concave zones, and no external road.
- [x] 10.5 Confirm visually and through graph inspection that streets connect only at shared junctions, never cross accidentally, stay clear of structures and water, and remain stable across regeneration.
