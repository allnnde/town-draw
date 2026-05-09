## 1. Project Setup and App Shell

- [x] 1.1 Check whether `pixi.js` is present in `package.json`; if absent, install it with `npm install pixi.js`.
- [x] 1.2 Replace the Angular starter root content with the TownDraw editor entry point using standalone components.
- [x] 1.3 Update `src/app/app.spec.ts` so tests assert the editor shell instead of the starter `Hello, town-draw` text.
- [x] 1.4 Add the editor folder structure under `src/app/editor`, `src/app/map-model`, `src/app/tools`, `src/app/generation`, `src/app/rendering`, and `src/app/storage`.

## 2. Models and State

- [x] 2.1 Create map model files for `Point`, `EditorTool`, `SketchObject`, `GeneratedMapObject`, and `MapProject`.
- [x] 2.2 Implement `EditorStateService` with Angular Signals for active tool, selected object id, sketch objects, generated objects, map width, and map height.
- [x] 2.3 Add state mutation methods: `setActiveTool`, `addSketchObject`, `removeSketchObject`, `selectObject`, `clearMap`, `setGeneratedObjects`, `replaceProject`, and `exportProject`.
- [x] 2.4 Ensure state updates preserve separation between `sketchObjects` and `generatedObjects` and work under strict TypeScript.

## 3. Editor UI Components

- [x] 3.1 Create `EditorPageComponent` with toolbar, central viewport, inspector panel, and action buttons for generation, export, import, and clearing.
- [x] 3.2 Create `ToolbarComponent` that displays exactly the MVP tools and updates the active tool in state.
- [x] 3.3 Create `InspectorPanelComponent` that shows selected object details or an empty-selection state.
- [x] 3.4 Style the editor layout so the viewport is central and usable within the browser window.

## 4. PixiJS Viewport and Rendering

- [x] 4.1 Create `PixiViewportComponent` and initialize/destroy the PixiJS application in the Angular component lifecycle.
- [x] 4.2 Create `generatedLayer`, `sketchLayer`, and `uiLayer` inside the Pixi stage.
- [x] 4.3 Listen for `pointerdown`, `pointermove`, and `pointerup`, convert events to map coordinates, and delegate them to `ToolDispatcherService`.
- [x] 4.4 Implement `SketchRendererService` for rivers, roads, zones, and selected-object highlighting.
- [x] 4.5 Implement `GeneratedMapRendererService` for generated rivers, roads, trees, buildings, and market stalls.
- [x] 4.6 Redraw sketch and generated layers when the relevant editor state changes.

## 5. Tool Interaction Services

- [x] 5.1 Implement `ToolDispatcherService` to route pointer events to the active tool service.
- [x] 5.2 Implement reusable hit-testing helpers for selecting and erasing nearby sketch objects.
- [x] 5.3 Implement `SelectToolService` to select nearby objects or clear selection on empty clicks.
- [x] 5.4 Implement `RiverToolService` to accumulate drag points and create `RiverSketch` objects on pointer release.
- [x] 5.5 Implement `RoadToolService` to accumulate drag points and create `RoadSketch` objects on pointer release.
- [x] 5.6 Implement `ZoneToolService` to create rectangular `ZoneSketch` objects for village, market, and forest tools.
- [x] 5.7 Implement `EraseToolService` to remove nearby sketch objects and clear affected selection.

## 6. Generation and JSON Storage

- [x] 6.1 Implement `MapGeneratorService.generate(sketchObjects)` with MVP mappings for generated rivers, roads, trees, buildings, and market stalls.
- [x] 6.2 Wire `Generar mapa` to generate from the current sketch and replace `generatedObjects` without mutating `sketchObjects`.
- [x] 6.3 Implement `ExportImportService` export using `Blob`, `URL.createObjectURL`, and the current `MapProject` from state.
- [x] 6.4 Implement JSON import through a standard file input, parse/validate the file, and call `EditorStateService.replaceProject` for valid projects.
- [x] 6.5 Wire `Exportar JSON`, `Importar JSON`, and `Limpiar mapa` buttons in the editor page.

## 7. Verification

- [x] 7.1 Run `npm run build` and fix compile, strict template, or bundle budget issues.
- [x] 7.2 Run `npm test` and update or add unit tests for changed app shell behavior and core services where practical.
- [x] 7.3 Optionally run `npx prettier --check .` and format touched files if needed.
- [x] 7.4 Manually verify drawing a river, road, and zone; selecting and erasing objects; generating a map; exporting JSON; and importing JSON.
