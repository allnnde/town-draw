## MODIFIED Requirements

### Requirement: Editor state exports as a MapProject JSON file

The editor SHALL export the current project as a local `.json` file containing project metadata, dimensions, semantic sketch data, and the current generated map representation with its road network.

#### Scenario: User exports JSON

- **WHEN** the user clicks `Exportar JSON`
- **THEN** the app downloads a versioned project containing sketch data, generated non-road objects, road nodes, and road edges

### Requirement: JSON import replaces editor state

The editor SHALL import a local JSON project and replace current state only after validating or normalizing its versioned sketch and generated-map data.

#### Scenario: User imports a valid project

- **WHEN** the user selects a valid project using the current generated-map schema
- **THEN** the editor replaces dimensions, sketch data, generated map, and selection according to the imported project

#### Scenario: User imports legacy generated roads

- **WHEN** a structurally usable legacy project contains semantic sketches and generated road or internal-path polylines from the previous schema
- **THEN** the editor preserves the semantic sketches, discards the incompatible generated output, and leaves the project ready for regeneration

### Requirement: Imported data preserves semantic object separation

Imported projects SHALL keep editable sketch data separate from replaceable generated map data, and generated road topology SHALL remain separate from non-road generated objects.

#### Scenario: Imported project includes generated output

- **WHEN** an imported current-version project contains both sketch data and a generated map
- **THEN** the editor stores sketches as editable input and stores the road network and non-road objects as replaceable generated output

#### Scenario: Legacy output is discarded without losing sketches

- **WHEN** legacy generated data cannot represent the current road-network invariants
- **THEN** only generated data is cleared and compatible road, river, zone, and marker sketches remain available

## ADDED Requirements

### Requirement: Generated schema migration is explicit

The project format SHALL identify the generated-map schema version so import can distinguish current road-network data from legacy independent polylines.

#### Scenario: Current generated schema is recognized

- **WHEN** imported generated data declares the supported road-network schema version and passes validation
- **THEN** the editor may restore that generated map without regeneration

#### Scenario: Unsupported generated schema is encountered

- **WHEN** imported generated data uses an unsupported or missing generated-map schema version but contains usable semantic sketches
- **THEN** the editor clears generated data and informs the user that regeneration is required
