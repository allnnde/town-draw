## Context

TownDraw is currently a single Angular CLI application using Angular 21 standalone bootstrap (`bootstrapApplication(App, appConfig)`) with an Angular starter template. The MVP should transform this starter into a semantic map editor: tools create editable map objects, generation derives visual objects, and JSON import/export stays local to the browser.

Key constraints:

- Use the existing project; do not recreate the Angular app.
- Prefer standalone Angular components and services; do not introduce NgModules.
- Use Angular Signals for editor state.
- Install and use PixiJS only if `pixi.js` is absent from `package.json`.
- Keep `sketchObjects` separate from `generatedObjects`; `Generar mapa` must not mutate the sketch.
- Respect strict TypeScript and Angular strict templates.

## Goals / Non-Goals

**Goals:**

- Provide a functional editor shell with toolbar, PixiJS viewport, inspector, and project action buttons.
- Model rivers, roads, zones, markers, generated objects, and complete map projects with TypeScript interfaces.
- Centralize editor state in `EditorStateService` with Angular Signals and explicit state mutation methods.
- Route pointer interactions from PixiJS to tool services via `ToolDispatcherService`.
- Render sketch and generated objects through separate renderer services.
- Generate basic visual output from the semantic sketch.
- Export and import projects as local JSON files.

**Non-Goals:**

- No backend, accounts, cloud sync, routing persistence, or database storage.
- No advanced editing such as vertex manipulation, undo/redo, snapping, zoom/pan, or layer management beyond MVP layers.
- No realistic procedural generation; output should be clear and deterministic enough for a first MVP.
- No marker creation tool in this change, even though the model supports markers.

## Decisions

### 1. Use the suggested feature-oriented Angular structure

Create the editor under `src/app/editor/`, models under `src/app/map-model/`, tools under `src/app/tools/`, generation under `src/app/generation/`, rendering under `src/app/rendering/`, and storage under `src/app/storage/`.

Rationale: this mirrors the project guidance and keeps UI, state, interaction, rendering, generation, and persistence responsibilities separated.

Alternative considered: place everything under a single editor feature folder. That is simpler initially, but it would blur model/rendering/storage boundaries as the editor grows.

### 2. Keep EditorStateService as the single state owner

`EditorStateService` should expose signals for `activeTool`, `selectedObjectId`, `sketchObjects`, `generatedObjects`, `mapWidth`, and `mapHeight`, plus explicit methods for all mutations.

Rationale: signals fit Angular 21 and make UI/render subscriptions straightforward while keeping state transitions discoverable.

Alternative considered: RxJS BehaviorSubjects. They work, but introduce more boilerplate and are less aligned with the requested Angular Signals direction.

### 3. Make PixiViewportComponent own PixiJS lifecycle only

`PixiViewportComponent` initializes/destroys the Pixi app, creates `generatedLayer`, `sketchLayer`, and `uiLayer`, listens to pointer events, converts coordinates, delegates tool behavior, and asks renderer services to redraw.

Rationale: Pixi setup is DOM/lifecycle-heavy and belongs in the component, while drawing logic and interaction behavior remain testable services.

Alternative considered: a `PixiAppService` owning the lifecycle entirely. This can still be introduced as a helper, but the component should remain the lifecycle boundary because it owns the canvas host element.

### 4. Implement tools as semantic object creators

Tool services should track pointer state and create semantic objects on completion. River and road accumulate drag points; zone tools create MVP rectangles; select and erase use hit testing against sketch objects.

Rationale: this preserves the central concept that users edit map semantics rather than raw pixels.

Alternative considered: direct Pixi drawing during interaction with later reverse-mapping to data. That would make persistence and selection harder.

### 5. Split sketch and generated renderers

`SketchRendererService` renders editable sketch objects and selection highlights. `GeneratedMapRendererService` renders generated visual objects. The Pixi layers preserve visual separation.

Rationale: separate renderers reinforce the state separation and make regeneration safe.

Alternative considered: a single renderer for all objects. That would be acceptable for a tiny prototype, but less clear once generated data grows.

### 6. Use local-file JSON storage only

`ExportImportService` should create downloads with `Blob` and `URL.createObjectURL`, and import through a standard file input plus `FileReader`/text parsing before calling `replaceProject`.

Rationale: it satisfies MVP persistence without adding backend scope.

Alternative considered: localStorage. It is simpler for autosave, but does not meet the explicit local-file import/export requirement.

## Risks / Trade-offs

- PixiJS may increase the production bundle size and trigger Angular budget warnings → keep initial rendering minimal and run `npm run build` after installing.
- Pointer coordinates can be wrong if canvas CSS size differs from renderer size → centralize coordinate conversion in the viewport and account for bounding rect scaling.
- Hit testing for freehand lines and rectangles can feel imprecise → use simple distance/bounds thresholds for MVP and document limitations.
- Importing unvalidated JSON can break strict assumptions → add lightweight runtime guards before `replaceProject`.
- Generation with random positions can produce inconsistent tests → prefer deterministic placement patterns or seeded/simple distribution for MVP.

## Migration Plan

1. Install `pixi.js` if missing.
2. Add models and editor state service.
3. Replace the starter app shell with the editor page and update tests that assert starter content.
4. Integrate PixiJS viewport and renderers.
5. Add tool dispatcher and MVP tools.
6. Wire generation and JSON import/export actions.
7. Run build/tests and adjust for strict TypeScript, templates, formatting, and bundle budgets.

Rollback strategy: revert the change branch or remove the new editor wiring and restore the starter root component/template if the MVP cannot compile.

## Open Questions

- Should map dimensions default to a fixed 1200x800 canvas, or derive from the viewport size on first load?
- Should generated objects be deterministic across repeated `Generar mapa` clicks for the same sketch, or is non-deterministic placement acceptable for the MVP?
- Should imported invalid JSON surface errors as inline inspector text, a simple alert, or a non-blocking status message?
