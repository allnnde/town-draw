## Why

Painted zones are still effectively represented and rendered as many separate circles, which makes regions look fragmented and can create excessive geometry work. In large or repeated strokes this may contribute to browser/GPU memory pressure and reported Out of Memory errors.

Zones need a single derived polygon/outline representation so the editor and generator work with one bounded region instead of thousands of circular stamp primitives.

## What Changes

- Convert completed brush-painted zone strokes into a simplified polygon/outline representation for the zone region.
- Render zone sketches from the polygon/outline rather than drawing every brush stamp as a separate circle.
- Use the polygon/outline as the primary geometry for hit testing, effective coverage checks, bounds, and generation sampling.
- Keep import compatibility for older JSON files that only contain `brushStamps` by deriving polygon coverage on load or at first use.
- Add guardrails for memory safety: cap/simplify outline points, avoid unbounded per-stamp rendering, and prevent repeated overlapping stamps from expanding render/generation cost linearly.

## Capabilities

### New Capabilities

### Modified Capabilities

- `semantic-map-editor`: Brush-painted zones must be represented and rendered as a single simplified polygonal region instead of many visible circles.
- `basic-map-generation`: Generation must use polygonal zone coverage as the primary region geometry and avoid per-stamp loops that scale toward Out of Memory behavior.

## Impact

- Affects `ZoneSketch` coverage handling, zone tool finalization, import normalization, sketch rendering, hit testing, and map generation.
- Adds tests around polygon derivation, legacy `brushStamps` compatibility, memory/complexity bounds, and generation with large painted zones.
- No external geometry dependency is expected; implementation should use bounded in-repo geometry utilities.
