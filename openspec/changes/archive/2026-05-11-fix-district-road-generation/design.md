## Context

TownDraw generation already creates semantic generated roads, internal paths, buildings, stalls, and industrial structures without mutating sketch data. The current district path algorithm is path-first: it creates organic path lines from zone bounds and then places objects around those paths. This can make streets look like arbitrary strokes because they are not derived from the final building/stall/structure layout. The existing road-access logic also starts from a nearest road guide but can fail to visibly join the road when the road sits just outside the district coverage.

This change keeps the MVP model intact and improves `MapGeneratorService` so village streets, market aisles, and industrial service roads are driven by generated object placement and reachable road connections.

## Goals / Non-Goals

**Goals:**

- Generate district circulation that visually passes between or near generated buildings, market stalls, and industrial structures.
- Add deterministic access connectors from district circulation to nearby user-drawn/generated roads when the route is reachable and not blocked by water.
- Preserve existing constraints: deterministic output, sketch/generated separation, water blocking, effective zone precedence, and road-clearance rules.
- Cover the behavior with focused unit tests in the generation service.

**Non-Goals:**

- Introduce a full city-planning simulation, navigation mesh dependency, or global road network optimizer.
- Change sketch object JSON formats or require new user tools.
- Connect every generated object individually; paths should serve groups of objects and remain readable.
- Auto-build bridges for district connectors across water; existing road-over-water bridge rules remain the authority.

## Decisions

### Placement-first district layout

Generate placements for populated zones before finalizing internal circulation. The circulation builder uses the completed placement set as input, then optionally performs a light clearance validation so paths do not overlap generated objects.

- **Rationale:** The user's core issue is that roads look random and are not between buildings. Object-aware paths require knowing where buildings/stalls/structures are.
- **Alternative considered:** Keep the current path-first algorithm and tune random angles/spacing. Rejected because it can still produce plausible-looking lines that are unrelated to object placement.

### Build a deterministic local circulation graph

Represent each generated object as a footprint plus clearance, then create candidate circulation nodes from district center, object cluster centers, object frontage/access points, and any reachable road-entry point. Connect candidates with straight or gently bent segments only when sampled points remain in effective zone coverage, avoid rivers, and preserve object clearance. Prefer a small nearest-neighbor/MST-style graph over many one-off connections, then simplify/prune short or duplicate segments.

- **Rationale:** A compact graph gives readable streets/aisles/service roads without connecting every object or drawing noisy random strokes.
- **Alternative considered:** Use a coarse A* grid or external pathfinding package for all routing. Rejected for MVP scope and dependency weight; a deterministic geometric graph should be enough for district-scale circulation.

### Treat nearby roads as explicit access anchors

Search existing generated road segments for reachable road guides near the district. Score candidates by distance to the district coverage and object clusters, not only by distance to the zone bounds center. When a road guide is within the configured access range and no river/zone blocker prevents the route, create a connector whose outer endpoint reaches the road guide and whose inner endpoint joins the district circulation graph.

- **Rationale:** A connector must visibly touch the nearby road; clipping the first points to zone coverage can leave an obvious gap.
- **Alternative considered:** Only align internal paths parallel to nearby roads. Rejected because alignment is not a connection.

### Keep model changes optional

Use existing `generated-internal-path` objects for streets, aisles, service roads, and road-access connectors unless implementation proves a small metadata addition is necessary. If metadata is needed, keep it generated-only and compatible with current import/export behavior.

- **Rationale:** The renderer already understands generated internal paths, and the requested fix is behavioral rather than a user-facing data model change.
- **Alternative considered:** Add a new generated object type for district connectors. Rejected unless tests expose a renderer/model limitation.

## Risks / Trade-offs

- Object-aware paths may reduce the number of valid placements in dense or tiny zones → Mitigate by limiting connector count, preserving minimum object spacing, and allowing graceful fallback to a short central path when no full graph is possible.
- Road connectors could cross water or leave the intended district too aggressively → Mitigate with sampled river checks, effective-zone checks for the internal portion, and a narrowly scoped outside-zone allowance only for the short access segment to the nearby road.
- A graph-based algorithm can be harder to tune than simple random lines → Mitigate with small helper methods and tests for geometric invariants instead of exact coordinates.
- Existing visual tests may assume all internal path points are inside brush coverage → Mitigate by updating expectations so only the road-access connector may extend to a nearby road; normal internal circulation remains inside effective non-blocked coverage.

## Migration Plan

- Implement behind the existing `MapGeneratorService.generate` flow with no new user-visible migration step.
- Keep generated output deterministic for identical sketch input so existing save/load behavior remains stable.
- If the new layout underperforms, rollback is limited to the generation service and its tests because no persistent sketch schema changes are planned.

## Open Questions

- What exact access range should count as “nearby” for road connectors? Start with layout-specific constants and tune from tests/visual review.
- Should very low-density districts always get at least one connector when a road is nearby, or only when at least two generated objects exist?
