## MODIFIED Requirements

### Requirement: Settlements and activity zones generate internal circulation

The generator SHALL add internal circulation paths for populated zone types where generated objects need access. For village, market, and industrial zones, circulation SHALL be derived from generated object placement and any reachable nearby main road, SHALL route through non-blocked accessible gaps, and MUST NOT be generated as detached arbitrary segments that ignore the generated objects.

#### Scenario: Village generates streets between houses

- **WHEN** a village zone generates multiple buildings
- **THEN** generated road/street segments connect, pass between, or pass near groups of buildings while maintaining clearance from generated building footprints

#### Scenario: Market generates aisles between stalls

- **WHEN** a market zone generates multiple stalls
- **THEN** generated aisle/path segments keep visible gaps between stall groups and maintain clearance from generated stall footprints

#### Scenario: Industrial zone generates service roads

- **WHEN** an industrial zone generates multiple structures
- **THEN** generated service-road segments connect, pass between, or pass near industrial structures while maintaining clearance from generated structure footprints

#### Scenario: Populated district connects to a nearby main road

- **WHEN** a village, market, or industrial zone generates internal circulation and a user-drawn main road is within the district road-connection range with an unobstructed route
- **THEN** the generated circulation includes an access path with one endpoint on or within the visible width of that generated road and another endpoint connected to the internal district circulation

#### Scenario: Blocked road access is not forced

- **WHEN** the nearest main road would require crossing water or another blocked area without an explicit bridge rule
- **THEN** generated district circulation MUST NOT add a connector across that blocker

#### Scenario: District circulation remains deterministic

- **WHEN** the same sketch is generated repeatedly without edits
- **THEN** generated streets, aisles, service roads, and road-access connectors remain stable for that sketch
