## MODIFIED Requirements

### Requirement: Generated placement is organic and coherent

The generator SHALL place zone-generated objects using deterministic organic distributions that avoid perfect rows, visible grids, and spacing that scales directly from the total zone size.

#### Scenario: Village generation avoids perfect grids

- **WHEN** a village zone generates buildings
- **THEN** the generated buildings have varied positions and spacing and MUST NOT appear in perfectly aligned rows or columns

#### Scenario: Organic output remains coherent

- **WHEN** the same sketch is generated repeatedly without edits
- **THEN** generated placement remains stable enough for predictable editing and testing

#### Scenario: Zone size does not dictate object spacing

- **WHEN** two village zones use the same density and have different painted sizes
- **THEN** the normal spacing between neighboring buildings remains within the same configured range while the larger zone can contain more buildings

#### Scenario: Small zones do not over-compress structures

- **WHEN** a painted zone is too small for the requested density and type-specific spacing
- **THEN** the generator reduces the number of generated objects instead of placing them closer than the type-specific minimum spacing

### Requirement: Settlements and activity zones generate internal circulation

The generator SHALL add internal circulation paths for populated zone types as an area layout structure, not as mandatory direct connections between every generated object.

#### Scenario: Village generates streets between houses

- **WHEN** a village zone generates multiple buildings
- **THEN** generated road/street segments form partial neighborhood circulation that passes near groups of buildings without connecting every building one-to-one

#### Scenario: Market generates aisles between stalls

- **WHEN** a market zone generates multiple stalls
- **THEN** generated aisle/path segments keep visible gaps between stall groups and MUST NOT form a rigid rectangular grid unless constrained by the painted area

#### Scenario: Industrial zone generates service roads

- **WHEN** an industrial zone generates multiple structures
- **THEN** generated service-road segments connect or pass near industrial structures as organized access routes with optional branches or gaps

#### Scenario: Internal circulation follows zone coverage

- **WHEN** an internal path is generated for an irregular brush-painted zone
- **THEN** the path stays inside effective non-blocked zone coverage or is clipped into valid path chunks

## ADDED Requirements

### Requirement: Generated structures include deterministic visual variation

The generator SHALL provide deterministic visual variation for generated structures so repeated content does not look copied or axis-aligned.

#### Scenario: Buildings have varied rotation and size

- **WHEN** a village zone generates multiple buildings
- **THEN** generated buildings include varied sizes and renderable rotations while remaining stable across regeneration without sketch edits

#### Scenario: Markets and industry vary by type

- **WHEN** market or industrial zones generate stalls or structures
- **THEN** generated objects include type-appropriate size, rotation, or variant differences without breaking import of older generated data

### Requirement: Generation integrates existing roads and rivers into zone layouts

The generator SHALL use existing roads and rivers as layout constraints when placing zone content and internal circulation.

#### Scenario: Existing roads guide settlement access

- **WHEN** a village, market, or industrial zone overlaps or approaches an existing road sketch
- **THEN** generated internal circulation can connect near that road or orient nearby structures toward it while preserving valid spacing and road clearance

#### Scenario: Rivers shape nearby layouts

- **WHEN** a zone overlaps or approaches a river sketch
- **THEN** generated structures and internal paths keep water clearance and organize around the blocked river coverage rather than ignoring it

#### Scenario: Road and river conflict results remain respected

- **WHEN** road/river conflicts generate bridges or cut roads
- **THEN** zone-generated structures and internal paths respect those generated conflict results and MUST NOT place content over blocked water crossings
