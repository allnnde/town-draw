import { Point } from '../../map-model/point.model';

const EPSILON = 0.0001;

export interface SegmentIntersection {
  point: Point;
  firstT: number;
  secondT: number;
}

export interface OrientedRect {
  position: Point;
  width: number;
  height: number;
  rotation: number;
}

export interface SegmentRecord<T> {
  start: Point;
  end: Point;
  value: T;
}

export function distance(first: Point, second: Point): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

export function clonePoint(point: Point): Point {
  return { x: point.x, y: point.y };
}

export function roundPoint(point: Point, precision = 1000): Point {
  return {
    x: Math.round(point.x * precision) / precision,
    y: Math.round(point.y * precision) / precision,
  };
}

export function closestPointOnSegment(point: Point, start: Point, end: Point): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared <= EPSILON) {
    return clonePoint(start);
  }

  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
  return { x: start.x + dx * t, y: start.y + dy * t };
}

export function distanceToSegment(point: Point, start: Point, end: Point): number {
  return distance(point, closestPointOnSegment(point, start, end));
}

export function distanceToPolyline(point: Point, points: readonly Point[]): number {
  if (points.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  if (points.length === 1) {
    return distance(point, points[0]);
  }

  let result = Number.POSITIVE_INFINITY;

  for (let index = 0; index < points.length - 1; index += 1) {
    result = Math.min(result, distanceToSegment(point, points[index], points[index + 1]));
  }

  return result;
}

export function polylineLength(points: readonly Point[]): number {
  let length = 0;

  for (let index = 0; index < points.length - 1; index += 1) {
    length += distance(points[index], points[index + 1]);
  }

  return length;
}

export function segmentIntersection(
  firstStart: Point,
  firstEnd: Point,
  secondStart: Point,
  secondEnd: Point,
): SegmentIntersection | null {
  const firstDx = firstEnd.x - firstStart.x;
  const firstDy = firstEnd.y - firstStart.y;
  const secondDx = secondEnd.x - secondStart.x;
  const secondDy = secondEnd.y - secondStart.y;
  const denominator = firstDx * secondDy - firstDy * secondDx;

  if (Math.abs(denominator) <= EPSILON) {
    return null;
  }

  const offsetX = secondStart.x - firstStart.x;
  const offsetY = secondStart.y - firstStart.y;
  const firstT = (offsetX * secondDy - offsetY * secondDx) / denominator;
  const secondT = (offsetX * firstDy - offsetY * firstDx) / denominator;

  if (firstT < -EPSILON || firstT > 1 + EPSILON || secondT < -EPSILON || secondT > 1 + EPSILON) {
    return null;
  }

  return {
    point: roundPoint({ x: firstStart.x + firstDx * firstT, y: firstStart.y + firstDy * firstT }),
    firstT: clamp(firstT, 0, 1),
    secondT: clamp(secondT, 0, 1),
  };
}

export function segmentsHaveInteriorIntersection(
  firstStart: Point,
  firstEnd: Point,
  secondStart: Point,
  secondEnd: Point,
): boolean {
  const intersection = segmentIntersection(firstStart, firstEnd, secondStart, secondEnd);
  return Boolean(
    intersection &&
    intersection.firstT > EPSILON &&
    intersection.firstT < 1 - EPSILON &&
    intersection.secondT > EPSILON &&
    intersection.secondT < 1 - EPSILON,
  );
}

export function segmentsCollinearOverlap(
  firstStart: Point,
  firstEnd: Point,
  secondStart: Point,
  secondEnd: Point,
  tolerance = 0.01,
): boolean {
  if (
    Math.abs(cross(firstStart, firstEnd, secondStart)) > tolerance ||
    Math.abs(cross(firstStart, firstEnd, secondEnd)) > tolerance
  ) {
    return false;
  }

  const useX = Math.abs(firstEnd.x - firstStart.x) >= Math.abs(firstEnd.y - firstStart.y);
  const firstMin = Math.min(useX ? firstStart.x : firstStart.y, useX ? firstEnd.x : firstEnd.y);
  const firstMax = Math.max(useX ? firstStart.x : firstStart.y, useX ? firstEnd.x : firstEnd.y);
  const secondMin = Math.min(
    useX ? secondStart.x : secondStart.y,
    useX ? secondEnd.x : secondEnd.y,
  );
  const secondMax = Math.max(
    useX ? secondStart.x : secondStart.y,
    useX ? secondEnd.x : secondEnd.y,
  );
  return Math.min(firstMax, secondMax) - Math.max(firstMin, secondMin) > tolerance;
}

export function segmentToSegmentDistance(
  firstStart: Point,
  firstEnd: Point,
  secondStart: Point,
  secondEnd: Point,
): number {
  if (segmentIntersection(firstStart, firstEnd, secondStart, secondEnd)) {
    return 0;
  }

  return Math.min(
    distanceToSegment(firstStart, secondStart, secondEnd),
    distanceToSegment(firstEnd, secondStart, secondEnd),
    distanceToSegment(secondStart, firstStart, firstEnd),
    distanceToSegment(secondEnd, firstStart, firstEnd),
  );
}

export function sampleSegment(start: Point, end: Point, step: number): Point[] {
  const length = distance(start, end);
  const count = Math.max(1, Math.ceil(length / Math.max(1, step)));
  return Array.from({ length: count + 1 }, (_, index) => {
    const t = index / count;
    return { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t };
  });
}

export function isSegmentValid(
  start: Point,
  end: Point,
  predicate: (point: Point) => boolean,
  step: number,
): boolean {
  return sampleSegment(start, end, step).every(predicate);
}

export function getPolylinePointAndAngle(
  points: readonly Point[],
  distanceAlong: number,
): { point: Point; angle: number } | null {
  if (points.length < 2) {
    return null;
  }

  let remaining = clamp(distanceAlong, 0, polylineLength(points));

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const length = distance(start, end);

    if (remaining <= length || index === points.length - 2) {
      const t = length <= EPSILON ? 0 : remaining / length;
      return {
        point: { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t },
        angle: Math.atan2(end.y - start.y, end.x - start.x),
      };
    }

    remaining -= length;
  }

  return null;
}

export function orientedRectCorners(rect: OrientedRect): Point[] {
  const cos = Math.cos(rect.rotation);
  const sin = Math.sin(rect.rotation);
  const halfWidth = rect.width / 2;
  const halfHeight = rect.height / 2;
  const rotate = (x: number, y: number): Point => ({
    x: rect.position.x + x * cos - y * sin,
    y: rect.position.y + x * sin + y * cos,
  });

  return [
    rotate(-halfWidth, -halfHeight),
    rotate(halfWidth, -halfHeight),
    rotate(halfWidth, halfHeight),
    rotate(-halfWidth, halfHeight),
  ];
}

export function distanceToPolygonBoundary(point: Point, polygon: readonly Point[]): number {
  if (polygon.length < 2) {
    return 0;
  }

  let result = Number.POSITIVE_INFINITY;

  for (let index = 0; index < polygon.length; index += 1) {
    result = Math.min(
      result,
      distanceToSegment(point, polygon[index], polygon[(index + 1) % polygon.length]),
    );
  }

  return result;
}

export function simplifyPolyline(
  points: readonly Point[],
  canConnect: (start: Point, end: Point) => boolean,
): Point[] {
  if (points.length <= 2) {
    return points.map(clonePoint);
  }

  const result: Point[] = [clonePoint(points[0])];
  let anchor = 0;

  while (anchor < points.length - 1) {
    let next = points.length - 1;

    while (next > anchor + 1 && !canConnect(points[anchor], points[next])) {
      next -= 1;
    }

    result.push(clonePoint(points[next]));
    anchor = next;
  }

  return result;
}

export class SpatialSegmentIndex<T> {
  private readonly buckets = new Map<string, SegmentRecord<T>[]>();

  constructor(private readonly cellSize = 96) {}

  insert(record: SegmentRecord<T>): void {
    for (const key of this.getKeys(record.start, record.end)) {
      this.buckets.set(key, [...(this.buckets.get(key) ?? []), record]);
    }
  }

  query(start: Point, end: Point): SegmentRecord<T>[] {
    const matches = new Set<SegmentRecord<T>>();

    for (const key of this.getKeys(start, end)) {
      for (const record of this.buckets.get(key) ?? []) {
        matches.add(record);
      }
    }

    return [...matches];
  }

  private getKeys(start: Point, end: Point): string[] {
    const minColumn = Math.floor(Math.min(start.x, end.x) / this.cellSize);
    const maxColumn = Math.floor(Math.max(start.x, end.x) / this.cellSize);
    const minRow = Math.floor(Math.min(start.y, end.y) / this.cellSize);
    const maxRow = Math.floor(Math.max(start.y, end.y) / this.cellSize);
    const keys: string[] = [];

    for (let column = minColumn; column <= maxColumn; column += 1) {
      for (let row = minRow; row <= maxRow; row += 1) {
        keys.push(`${column}:${row}`);
      }
    }

    return keys;
  }
}

export function hashString(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function createRandom(seed: string): () => number {
  let state = hashString(seed) || 1;
  return () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

function cross(start: Point, end: Point, point: Point): number {
  return (end.x - start.x) * (point.y - start.y) - (end.y - start.y) * (point.x - start.x);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
