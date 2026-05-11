## Why

Painted zones currently behave too much like independent overlapping circles. This makes generation read brush strokes as scattered samples instead of one continuous district shape, and internal streets can appear as detached segments that do not form a coherent neighborhood network.

We need zone coverage to become a unified semantic blob and use that blob to plan a small connected street skeleton first, then place buildings around the resulting branches.

## What Changes

- Treat each brush-painted zone as a single merged coverage shape for selection, rendering, hit testing, and generation sampling.
- Preserve brush-driven organic boundaries while avoiding behavior that treats every brush stamp as a separate micro-zone.
- Generate populated district circulation as a connected branch network derived from the unified zone shape before placing buildings, stalls, or industrial structures.
- Prefer a small number of coherent branches, typically 3-4 meaningful internal paths for larger villages, rather than many disconnected arbitrary segments.
- Place generated neighborhood objects around and clear of the connected circulation network.
- Keep nearby road access as an optional connector into the internal network, not as a replacement for the network.

## Capabilities

### New Capabilities

### Modified Capabilities

- `semantic-map-editor`: Painted zone tools must produce and interact with unified organic zone coverage rather than exposing brush stamps as separate circles.
- `basic-map-generation`: Zone generation must use unified coverage and connected branch-based internal circulation before placing populated district objects.

## Impact

- Affects zone coverage utilities, sketch rendering, hit testing, and zone generation sampling.
- Affects `MapGeneratorService` district path planning and object placement ordering.
- Affects tests for brush-zone selection/rendering, effective coverage, internal street connectivity, and building placement around branches.
- No new runtime dependencies are expected.
