# AGENTS.md

## Repo Snapshot
- Single Angular CLI app `town-draw`; work in this project and do not recreate it.
- Angular 21 standalone bootstrap: `src/main.ts` calls `bootstrapApplication(App, appConfig)`; there is no `AppModule`.
- Root app is `src/app/app.ts`; routes live in `src/app/app.routes.ts` and are currently empty.
- `src/app/app.html` is still the Angular starter template; if replacing it, update `src/app/app.spec.ts` because it asserts `Hello, town-draw`.
- Global styles are `src/styles.css`; Tailwind 4 is imported there with `@import 'tailwindcss';` and there is no Tailwind/PostCSS config file.

## Commands
- Use npm only; `packageManager` is `npm@11.11.0` and `package-lock.json` is committed.
- Install dependencies with `npm install`; install PixiJS with `npm install pixi.js` if `pixi.js` is absent from `package.json`.
- Dev server: `npm start` (`ng serve`) at `http://localhost:4200/`.
- Production build: `npm run build`; this uses the production config by default and enforces the `initial` bundle budget (`500kB` warning, `1MB` error).
- Unit tests: `npm test` (`ng test`) using Angular's unit-test builder and Vitest globals from `tsconfig.spec.json`.
- No lint script or CI workflow is configured; use build/test plus `npx prettier --check .` when formatting matters.

## TypeScript / Angular Constraints
- `tsconfig.json` is strict: `strict`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `isolatedModules`, and Angular `strictTemplates` are enabled.
- Prefer standalone components/services with explicit `imports`; do not add NgModules unless there is a concrete need.
- `.prettierrc` uses single quotes and `printWidth: 100`; HTML is formatted with the Angular parser.

## TownDraw MVP Direction
- The editor is semantic: tools create editable map objects, not pixel paint.
- Keep `sketchObjects` separate from `generatedObjects`; `Generar mapa` should populate generated data without mutating the sketch.
- Initial tools are exactly `select`, `river`, `road`, `zone-village`, `zone-market`, `zone-forest`, and `erase`.
- Core sketch types are rivers (`points`, `width`), roads (`points`, `roadType`), zones (`polygon`, `zoneType`, `density`), and markers (`position`, `markerType`).
- Generated map types are generated rivers/roads, trees, buildings, and market stalls.
- JSON import/export is local-file based: use `Blob`, `URL.createObjectURL`, a standard file input, and replace state through `EditorStateService.replaceProject`.

## Suggested MVP Layout
- Put editor UI under `src/app/editor/`: `editor-page`, `components/pixi-viewport`, `components/toolbar`, `components/inspector-panel`, and editor services.
- Put semantic models under `src/app/map-model/`; put interaction services under `src/app/tools/`.
- Put generation under `src/app/generation/`, Pixi drawing under `src/app/rendering/`, and JSON storage under `src/app/storage/`.
- `EditorStateService` should use Angular Signals for `activeTool`, `selectedObjectId`, `sketchObjects`, `generatedObjects`, `mapWidth`, and `mapHeight`.
- `PixiViewportComponent` owns the PixiJS lifecycle, creates `sketchLayer`, `generatedLayer`, and `uiLayer`, listens to pointer down/move/up, and delegates tool behavior to `ToolDispatcherService`.
- Render through services: `SketchRendererService` for sketch objects plus selection, and `GeneratedMapRendererService` for generated visual objects.
