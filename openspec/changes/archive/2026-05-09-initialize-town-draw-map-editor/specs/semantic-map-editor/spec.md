## ADDED Requirements

### Requirement: Editor screen replaces starter app

The application SHALL load a main TownDraw editor screen instead of the Angular starter content.

#### Scenario: Editor shell is visible

- **WHEN** the user opens the application
- **THEN** the UI shows a toolbar, a central PixiJS viewport, an inspector panel, and actions for `Generar mapa`, `Exportar JSON`, `Importar JSON`, and `Limpiar mapa`

#### Scenario: Starter test expectations are updated

- **WHEN** the starter template is replaced
- **THEN** affected unit tests are updated so they assert the new editor shell instead of `Hello, town-draw`

### Requirement: Tool selection uses the initial tool set

The editor SHALL allow the user to choose exactly the initial MVP tools: `select`, `river`, `road`, `zone-village`, `zone-market`, `zone-forest`, and `erase`.

#### Scenario: User changes active tool

- **WHEN** the user clicks a tool in the toolbar
- **THEN** `EditorStateService.activeTool` is updated to that tool and the active tool is visibly indicated

### Requirement: Semantic sketch objects are created by drawing tools

Drawing tools SHALL create semantic map objects in `sketchObjects` rather than painting pixels directly.

#### Scenario: User draws a river

- **WHEN** the active tool is `river` and the user drags across the viewport then releases
- **THEN** the editor adds a `RiverSketch` with accumulated `points` and a default `width`

#### Scenario: User draws a road

- **WHEN** the active tool is `road` and the user drags across the viewport then releases
- **THEN** the editor adds a `RoadSketch` with accumulated `points` and a default `roadType`

#### Scenario: User draws a zone

- **WHEN** the active tool is one of `zone-village`, `zone-market`, or `zone-forest` and the user drags a rectangle then releases
- **THEN** the editor adds a `ZoneSketch` whose `zoneType` matches the selected zone tool and whose `polygon` contains the rectangle corners

### Requirement: PixiJS viewport owns interaction lifecycle

The PixiJS viewport component SHALL initialize PixiJS, create `sketchLayer`, `generatedLayer`, and `uiLayer`, listen to pointer events, and delegate tool behavior to `ToolDispatcherService`.

#### Scenario: Viewport initializes and disposes cleanly

- **WHEN** the editor viewport component is mounted and later destroyed
- **THEN** the PixiJS app and its layers are created on mount and destroyed on component cleanup without leaking DOM canvases

#### Scenario: Pointer interaction is delegated

- **WHEN** the user triggers `pointerdown`, `pointermove`, or `pointerup` in the viewport
- **THEN** the viewport converts the event to map coordinates and delegates it to the tool dispatcher

### Requirement: Sketch rendering reflects semantic state

The editor SHALL render sketch objects from `sketchObjects` using distinct visual styles for rivers, roads, and zones.

#### Scenario: Sketch objects render after creation

- **WHEN** a river, road, or zone is added to `sketchObjects`
- **THEN** `SketchRendererService` renders it respectively as a blue line, gray/brown line, or semi-transparent typed area

### Requirement: Object selection updates state and inspector

The select tool SHALL select a nearby sketch object and show its basic data in the inspector.

#### Scenario: User selects an object

- **WHEN** the active tool is `select` and the user clicks near a sketch object
- **THEN** `selectedObjectId` is set to that object's id, the object is visually highlighted, and the inspector shows its type and basic properties

#### Scenario: User clicks empty space with select

- **WHEN** the active tool is `select` and the user clicks where no object is close enough
- **THEN** `selectedObjectId` is set to `null`

### Requirement: Erase and clear remove editor data predictably

The editor SHALL support removing individual sketch objects and clearing the current map.

#### Scenario: User erases an object

- **WHEN** the active tool is `erase` and the user clicks near a sketch object
- **THEN** that object is removed from `sketchObjects` and selection is cleared if it referenced the removed object

#### Scenario: User clears the map

- **WHEN** the user clicks `Limpiar mapa`
- **THEN** the editor clears sketch objects, generated objects, and selection while preserving valid map dimensions
