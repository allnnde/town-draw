# project-json-storage Specification

## Purpose
TBD - created by archiving change initialize-town-draw-map-editor. Update Purpose after archive.
## Requirements
### Requirement: Editor state exports as a MapProject JSON file

The editor SHALL export the current project as a local `.json` file containing project metadata, dimensions, sketch objects, and generated objects.

#### Scenario: User exports JSON

- **WHEN** the user clicks `Exportar JSON`
- **THEN** the app creates a `MapProject` through `EditorStateService.exportProject()` and downloads it with `Blob` and `URL.createObjectURL`

### Requirement: JSON import replaces editor state

The editor SHALL import a local JSON project file and replace the current state through `EditorStateService.replaceProject`.

#### Scenario: User imports a valid project

- **WHEN** the user selects a valid `.json` file representing a `MapProject`
- **THEN** the app replaces map dimensions, sketch objects, generated objects, and selection according to the imported project

### Requirement: Imported data preserves semantic object separation

Imported projects SHALL preserve separate sketch and generated object arrays.

#### Scenario: Imported project includes generated output

- **WHEN** an imported project contains both `sketchObjects` and `generatedObjects`
- **THEN** the editor stores and renders sketch data as editable sketch objects and generated data as generated visual objects

### Requirement: Invalid imports do not corrupt current state

The import flow SHALL avoid replacing current editor state when the selected JSON cannot be parsed as a usable map project.

#### Scenario: User imports invalid JSON

- **WHEN** the user selects a file that is not valid JSON or lacks required `MapProject` fields
- **THEN** the current editor state remains unchanged and the user receives a basic error indication

