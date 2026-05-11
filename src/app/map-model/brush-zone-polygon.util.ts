import { Point } from './point.model';
import { ZoneBrushStamp } from './sketch-object.model';

export interface BrushStrokePolygonOptions {
  sampleCount?: number;
  maxPoints?: number;
  simplifyTolerance?: number;
}

export const DEFAULT_ZONE_POLYGON_SAMPLE_COUNT = 96;
export const DEFAULT_ZONE_POLYGON_MAX_POINTS = 96;
export const DEFAULT_ZONE_POLYGON_SIMPLIFY_TOLERANCE = 4;

const MIN_POLYGON_POINTS = 3;
const MIN_CELL_SIZE = 4;

interface GridPoint {
  x: number;
  y: number;
}

interface BoundaryEdge {
  start: GridPoint;
  end: GridPoint;
}

export function deriveZonePolygonFromBrushStamps(
  brushStamps: readonly ZoneBrushStamp[],
  options: BrushStrokePolygonOptions = {},
): Point[] {
  const stamps = brushStamps.filter((stamp) => Number.isFinite(stamp.radius) && stamp.radius > 0);

  if (stamps.length === 0) {
    return [];
  }

  const gridSize = Math.max(
    16,
    Math.min(
      options.sampleCount ?? DEFAULT_ZONE_POLYGON_SAMPLE_COUNT,
      DEFAULT_ZONE_POLYGON_MAX_POINTS,
    ),
  );
  const maxPoints = Math.max(
    MIN_POLYGON_POINTS,
    options.maxPoints ?? DEFAULT_ZONE_POLYGON_MAX_POINTS,
  );
  const simplifyTolerance = Math.max(
    0,
    options.simplifyTolerance ?? DEFAULT_ZONE_POLYGON_SIMPLIFY_TOLERANCE,
  );
  const outline = traceAdditiveBrushOutline(stamps, gridSize);
  const simplified = simplifyClosedPolygon(outline, simplifyTolerance);

  return limitPolygonPoints(
    simplified.length >= MIN_POLYGON_POINTS ? simplified : outline,
    maxPoints,
  ).map(cloneRoundedPoint);
}

function traceAdditiveBrushOutline(stamps: readonly ZoneBrushStamp[], gridSize: number): Point[] {
  const bounds = getBrushBounds(stamps);
  const width = Math.max(MIN_CELL_SIZE, bounds.maxX - bounds.minX);
  const height = Math.max(MIN_CELL_SIZE, bounds.maxY - bounds.minY);
  const cellSize = Math.max(MIN_CELL_SIZE, Math.max(width, height) / gridSize);
  const columns = Math.max(1, Math.ceil(width / cellSize));
  const rows = Math.max(1, Math.ceil(height / cellSize));
  const filled = Array.from({ length: rows }, () => Array.from({ length: columns }, () => false));

  for (const stamp of stamps) {
    const minColumn = clampIndex(
      Math.floor((stamp.position.x - stamp.radius - bounds.minX) / cellSize),
      columns,
    );
    const maxColumn = clampIndex(
      Math.ceil((stamp.position.x + stamp.radius - bounds.minX) / cellSize),
      columns,
    );
    const minRow = clampIndex(
      Math.floor((stamp.position.y - stamp.radius - bounds.minY) / cellSize),
      rows,
    );
    const maxRow = clampIndex(
      Math.ceil((stamp.position.y + stamp.radius - bounds.minY) / cellSize),
      rows,
    );

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let column = minColumn; column <= maxColumn; column += 1) {
        const center = getCellCenter(bounds.minX, bounds.minY, cellSize, column, row);

        if (distance(center, stamp.position) <= stamp.radius) {
          filled[row][column] = true;
        }
      }
    }
  }

  const loops = traceBoundaryLoops(getBoundaryEdges(filled, bounds.minX, bounds.minY, cellSize));

  if (loops.length === 0) {
    return [];
  }

  if (loops.length === 1) {
    return loops[0];
  }

  return getConvexHull(loops.flat());
}

function getBoundaryEdges(
  filled: readonly (readonly boolean[])[],
  minX: number,
  minY: number,
  cellSize: number,
): BoundaryEdge[] {
  const edges: BoundaryEdge[] = [];
  const rows = filled.length;
  const columns = filled[0]?.length ?? 0;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (!filled[row][column]) {
        continue;
      }

      const x0 = minX + column * cellSize;
      const y0 = minY + row * cellSize;
      const x1 = x0 + cellSize;
      const y1 = y0 + cellSize;

      if (!isCellFilled(filled, column, row - 1)) {
        edges.push({ start: { x: x0, y: y0 }, end: { x: x1, y: y0 } });
      }

      if (!isCellFilled(filled, column + 1, row)) {
        edges.push({ start: { x: x1, y: y0 }, end: { x: x1, y: y1 } });
      }

      if (!isCellFilled(filled, column, row + 1)) {
        edges.push({ start: { x: x1, y: y1 }, end: { x: x0, y: y1 } });
      }

      if (!isCellFilled(filled, column - 1, row)) {
        edges.push({ start: { x: x0, y: y1 }, end: { x: x0, y: y0 } });
      }
    }
  }

  return edges;
}

function traceBoundaryLoops(edges: readonly BoundaryEdge[]): Point[][] {
  const edgesByStart = new Map<string, BoundaryEdge[]>();

  for (const edge of edges) {
    const key = getGridPointKey(edge.start);
    edgesByStart.set(key, [...(edgesByStart.get(key) ?? []), edge]);
  }

  const loops: Point[][] = [];

  for (const edge of edges) {
    if (!removeEdge(edgesByStart, edge)) {
      continue;
    }

    const startKey = getGridPointKey(edge.start);
    const points = [edge.start, edge.end];
    let currentKey = getGridPointKey(edge.end);

    while (currentKey !== startKey) {
      const next = edgesByStart.get(currentKey)?.[0];

      if (!next || !removeEdge(edgesByStart, next)) {
        break;
      }

      points.push(next.end);
      currentKey = getGridPointKey(next.end);
    }

    if (currentKey === startKey && points.length >= MIN_POLYGON_POINTS + 1) {
      loops.push(points.slice(0, -1));
    }
  }

  return loops.sort(
    (first, second) => Math.abs(getSignedArea(second)) - Math.abs(getSignedArea(first)),
  );
}

function simplifyClosedPolygon(points: readonly Point[], tolerance: number): Point[] {
  if (points.length <= MIN_POLYGON_POINTS || tolerance === 0) {
    return [...points];
  }

  const simplified: Point[] = [];

  for (let index = 0; index < points.length; index += 1) {
    const previous = points[(index - 1 + points.length) % points.length];
    const current = points[index];
    const next = points[(index + 1) % points.length];

    if (distanceToSegment(current, previous, next) > tolerance) {
      simplified.push(current);
    }
  }

  if (simplified.length >= points.length || simplified.length < MIN_POLYGON_POINTS) {
    return [...points];
  }

  return simplifyClosedPolygon(simplified, tolerance);
}

function limitPolygonPoints(points: readonly Point[], maxPoints: number): Point[] {
  if (points.length <= maxPoints) {
    return [...points];
  }

  const limited: Point[] = [];

  for (let index = 0; index < maxPoints; index += 1) {
    limited.push(points[Math.floor((index * points.length) / maxPoints)]);
  }

  return limited;
}

function getBrushBounds(stamps: readonly ZoneBrushStamp[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  return stamps.reduce(
    (bounds, stamp) => ({
      minX: Math.min(bounds.minX, stamp.position.x - stamp.radius),
      minY: Math.min(bounds.minY, stamp.position.y - stamp.radius),
      maxX: Math.max(bounds.maxX, stamp.position.x + stamp.radius),
      maxY: Math.max(bounds.maxY, stamp.position.y + stamp.radius),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );
}

function getConvexHull(points: readonly Point[]): Point[] {
  const sorted = [...points].sort((first, second) => first.x - second.x || first.y - second.y);

  if (sorted.length <= 1) {
    return sorted;
  }

  const lower: Point[] = [];

  for (const point of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0
    ) {
      lower.pop();
    }

    lower.push(point);
  }

  const upper: Point[] = [];

  for (const point of [...sorted].reverse()) {
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0
    ) {
      upper.pop();
    }

    upper.push(point);
  }

  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function getCellCenter(
  minX: number,
  minY: number,
  cellSize: number,
  column: number,
  row: number,
): Point {
  return {
    x: minX + (column + 0.5) * cellSize,
    y: minY + (row + 0.5) * cellSize,
  };
}

function isCellFilled(
  filled: readonly (readonly boolean[])[],
  column: number,
  row: number,
): boolean {
  return row >= 0 && row < filled.length && column >= 0 && column < filled[row].length
    ? filled[row][column]
    : false;
}

function clampIndex(value: number, size: number): number {
  return Math.max(0, Math.min(size - 1, value));
}

function removeEdge(edgesByStart: Map<string, BoundaryEdge[]>, edge: BoundaryEdge): boolean {
  const key = getGridPointKey(edge.start);
  const edges = edgesByStart.get(key);
  const index = edges?.indexOf(edge) ?? -1;

  if (!edges || index < 0) {
    return false;
  }

  edges.splice(index, 1);

  if (edges.length === 0) {
    edgesByStart.delete(key);
  }

  return true;
}

function getGridPointKey(point: GridPoint): string {
  return `${roundCoordinate(point.x)},${roundCoordinate(point.y)}`;
}

function getSignedArea(polygon: readonly Point[]): number {
  let area = 0;

  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    area += current.x * next.y - next.x * current.y;
  }

  return area / 2;
}

function cross(origin: Point, first: Point, second: Point): number {
  return (
    (first.x - origin.x) * (second.y - origin.y) - (first.y - origin.y) * (second.x - origin.x)
  );
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared),
  );

  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

function distance(first: Point, second: Point): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function cloneRoundedPoint(point: Point): Point {
  return {
    x: roundCoordinate(point.x),
    y: roundCoordinate(point.y),
  };
}

function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}
