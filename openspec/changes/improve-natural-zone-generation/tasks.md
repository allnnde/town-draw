## 1. Model and Compatibility Updates

- [x] 1.1 Add optional visual variation fields such as `rotation` and `variant` to generated buildings, market stalls, industrial structures, and trees where useful.
- [x] 1.2 Update generated object import validation to accept the new optional fields while preserving compatibility with older JSON projects.
- [x] 1.3 Update generated renderers to apply rotation/variant defaults safely for old and new generated objects.

## 2. Layout Parameterization

- [x] 2.1 Define per-zone-type layout parameters for count density, minimum spacing, spacing variance, object sizes, road clearance, and water clearance.
- [x] 2.2 Refactor `MapGeneratorService` so spacing rules do not scale directly from the painted zone bounding box size.
- [x] 2.3 Add deterministic seed helpers for per-object rotation, variant, size jitter, and placement decisions.

## 3. Organic Object Placement

- [x] 3.1 Replace current random placement with deterministic Poisson-style candidate rejection over effective zone coverage.
- [x] 3.2 Ensure large zones add more eligible objects without making normal neighbor spacing excessively large.
- [x] 3.3 Ensure small zones reduce object count rather than over-compressing structures below type-specific spacing.
- [x] 3.4 Add property-style tests that compare spacing behavior between small and large zones with the same density.
- [x] 3.5 Add tests or helpers to detect obvious row/column grid alignment for generated village buildings where practical.

## 4. Organic Internal Circulation

- [x] 4.1 Replace straight cross-like internal path generation with deterministic organic path axes made of multi-point polylines.
- [x] 4.2 Generate partial branches/gaps so streets, aisles, and service roads structure the area without connecting every generated object one-to-one.
- [x] 4.3 Clip or split internal path chunks so they stay inside effective non-blocked zone coverage.
- [x] 4.4 Ensure generated structures avoid internal path footprints with appropriate clearance.
- [x] 4.5 Add tests that internal street count is not tied one-to-one to building count and that paths stay inside valid coverage.

## 5. Existing Road and River Integration

- [x] 5.1 Add helpers to compute distance and orientation relative to existing generated/sketch roads and rivers.
- [x] 5.2 Use nearby existing roads as optional access guides for internal circulation and structure orientation.
- [x] 5.3 Preserve river blockers and water clearance for structures and internal paths, including near bridge/cut conflict results.
- [x] 5.4 Add tests for zones overlapping roads/rivers so layouts organize around infrastructure without placing content over blocked water.

## 6. Verification

- [x] 6.1 Run `npm test -- --watch=false` and fix failures.
- [x] 6.2 Run `npm run build` and fix strict TypeScript, Angular template, or bundle budget issues.
- [x] 6.3 Run Prettier check for touched files and format as needed.
- [ ] 6.4 Manually verify large and small village zones keep believable house spacing.
- [ ] 6.5 Manually verify generated houses, stalls, and industrial structures look less grid-like and include visible rotation/variation.
- [ ] 6.6 Manually verify internal roads/aisles feel like area circulation rather than direct house-to-house connectors.
- [ ] 6.7 Manually verify zones near existing rivers and roads organize content around those features while respecting blockers.
