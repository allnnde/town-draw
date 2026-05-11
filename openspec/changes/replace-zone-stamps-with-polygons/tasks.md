## 1. Polygon Coverage Model

- [x] 1.1 Audit current `ZoneSketch`, import/export, zone tool, rendering, hit testing, and generation paths to identify all direct `brushStamps` dependencies.
- [x] 1.2 Implement a bounded brush-stroke-to-polygon utility with configurable sampling/simplification limits and deterministic output.
- [x] 1.3 Update `ZoneToolService` so completed zones receive polygonal coverage derived from the brush stroke.
- [x] 1.4 Ensure legacy zones with `brushStamps` but no polygon derive polygonal coverage on import or first coverage use.

## 2. Runtime Geometry Usage

- [x] 2.1 Update zone coverage utilities so `polygon` is the primary coverage source and `brushStamps` are only fallback/draft input.
- [x] 2.2 Update sketch rendering so completed zones render one polygonal area and do not render every brush stamp circle.
- [x] 2.3 Update hit testing and erase/select behavior to use polygonal coverage for completed zones.
- [x] 2.4 Update generation bounds, point sampling, overlap resolution, and path planning to use polygonal coverage when available.

## 3. Memory Safety

- [x] 3.1 Add maximum polygon point count and simplification tolerance to prevent excessive geometry.
- [x] 3.2 Add safeguards so dense repeated brush stamps do not increase render or generation work linearly after polygon derivation.
- [x] 3.3 Avoid retaining or exporting excessive transient draft data if it is no longer needed for completed-zone behavior.

## 4. Regression Tests

- [x] 4.1 Add unit tests for polygon derivation from simple, long, dense, and overlapping brush strokes.
- [x] 4.2 Add rendering/hit-testing tests proving completed zones use polygonal coverage, not individual circles.
- [x] 4.3 Add generation tests proving large brush-painted zones generate from polygon area and do not multiply content by stamp count.
- [x] 4.4 Add import compatibility tests for legacy brush-only zone JSON.

## 5. Verification

- [x] 5.1 Run targeted Prettier checks for changed files.
- [x] 5.2 Run `npm test -- --watch=false` and fix failures.
- [x] 5.3 Run `npm run build` and confirm only known Pixi/CommonJS warnings remain.
- [ ] 5.4 Manually verify a large painted zone renders as a single region and no longer triggers Out of Memory behavior in normal use.
