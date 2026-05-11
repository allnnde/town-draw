## 1. Baseline and Geometry Helpers

- [x] 1.1 Add failing generation tests that capture object-aware district circulation and nearby main-road connection expectations.
- [x] 1.2 Add helper logic for generated object footprints and clearance checks for buildings, stalls, and industrial structures.
- [x] 1.3 Add reusable segment sampling checks for effective zone coverage, river blocking, and object-footprint clearance.

## 2. Placement-First District Flow

- [x] 2.1 Refactor non-forest zone generation so populated-zone placements are computed before internal circulation paths.
- [x] 2.2 Pass finalized placement data into the district circulation builder while preserving deterministic seeds and stable generated IDs.
- [x] 2.3 Validate generated paths against object clearance and preserve graceful fallback behavior for tiny or dense zones.

## 3. Object-Aware Circulation

- [x] 3.1 Build deterministic circulation candidates from district center, object cluster centers, object frontage/access points, and valid free-space gaps.
- [x] 3.2 Connect candidates with a compact nearest-neighbor/MST-style graph instead of detached random line generation.
- [x] 3.3 Convert the selected graph edges into `generated-internal-path` streets, aisles, or service roads with zone-specific widths.
- [x] 3.4 Prune duplicate, too-short, or overlapping path segments without removing the last useful district access route.

## 4. Nearby Main-Road Connections

- [x] 4.1 Improve road guide selection so nearby user-drawn/generated roads are scored against district coverage and generated object clusters.
- [x] 4.2 Add an access connector whose outer endpoint visibly reaches the selected road and whose inner endpoint joins district circulation.
- [x] 4.3 Prevent access connectors from crossing rivers or blocked areas unless an existing explicit bridge rule applies.
- [x] 4.4 Keep any outside-zone connector portion limited to the short access segment needed to reach the nearby road.

## 5. Verification

- [x] 5.1 Verify village streets pass between/near generated buildings and maintain clearance from building footprints.
- [x] 5.2 Verify market aisles and industrial service roads maintain clearance from their generated objects.
- [x] 5.3 Verify a nearby main road receives a connected district access path when unobstructed.
- [x] 5.4 Verify blocked road access is not forced across water and generation remains deterministic across repeated runs.
- [x] 5.5 Run `npm test` and `npm run build`, then fix any failures introduced by the generation changes.
