## 1. Unified Zone Coverage

- [x] 1.1 Audit current zone coverage utilities, renderer usage, hit testing, and generator sampling for direct per-stamp assumptions.
- [x] 1.2 Add or refine zone coverage helpers so point checks, bounds, and sampled segment checks treat `brushStamps` as one merged organic coverage shape.
- [x] 1.3 Update sketch rendering to draw each brush-painted zone as one continuous typed area rather than visibly separate overlapping circles where possible within the current renderer.
- [x] 1.4 Update select/erase hit testing to use merged zone coverage semantics for brush-painted zones.

## 2. Branch-Based District Circulation

- [x] 2.1 Refactor populated zone generation so village, market, and industrial circulation is planned before generated objects are placed.
- [x] 2.2 Implement connected branch-network planning from unified zone coverage: choose a valid main spine, attach bounded branches, and reject detached path chunks.
- [x] 2.3 Ensure larger populated districts produce a small coherent network with at least three meaningful connected internal branches when coverage supports it.
- [x] 2.4 Keep road-access connectors optional and attach them to the internal network instead of using them as the only district circulation.
- [x] 2.5 Place buildings, stalls, and industrial structures around the planned network while maintaining type-specific path and footprint clearance.

## 3. Regression Tests

- [x] 3.1 Add tests proving repeated overlapping brush stamps behave as one zone coverage area and do not multiply generated content by overlap count.
- [x] 3.2 Add editor/service tests for merged zone hit testing and rendered coverage expectations where applicable.
- [x] 3.3 Add generation tests proving all non-access internal paths in a populated district are connected directly or indirectly to the same network.
- [x] 3.4 Add large-district regression tests requiring at least three connected internal branches and buildings placed clear of and around those branches.
- [x] 3.5 Add or update a regression fixture based on `D:\Repositorios\untitled-towndraw-map.json` to cover the reported visual issue.

## 4. Verification

- [x] 4.1 Run `npx prettier --check .` or format changed files and re-check them.
- [x] 4.2 Run `npm test -- --watch=false` and fix failures.
- [x] 4.3 Run `npm run build` and confirm only known Pixi/CommonJS warnings remain.
- [x] 4.4 Manually verify a regenerated map has blob-like zones, connected internal branches, and neighborhoods placed around those branches.
