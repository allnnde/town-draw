## Why

District road generation currently produces arbitrary-looking line segments that do not behave like usable circulation. Streets should run between generated buildings/stalls/structures and should connect to nearby main roads so generated districts feel integrated with the drawn map.

## What Changes

- Replace random internal district road segments with circulation paths derived from generated object placement.
- Ensure village, market, and industrial district paths pass between or near their generated objects with readable access spacing.
- Connect internal district circulation to nearby user-drawn/generated main roads when a reasonable connection is available.
- Keep generation deterministic for the same sketch input, and keep generated data separate from sketch data.
- Do not introduce breaking changes to JSON import/export or sketch object formats.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `basic-map-generation`: Tighten district internal circulation requirements so generated streets/aisles/service roads are object-aware and connect to nearby main roads.

## Impact

- Affects district generation logic under `src/app/generation/`, especially internal road/path placement for village, market, and industrial zones.
- May affect generated map models or renderer styling only if existing generated road/path metadata is insufficient.
- Requires unit coverage for deterministic placement, object-aware circulation, and nearby main-road connection behavior.
