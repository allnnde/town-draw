import { Point } from './point.model';
import { ZoneBrushStamp, ZoneSketch } from './sketch-object.model';

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const DEFAULT_ZONE_BRUSH_RADIUS = 56;
export const ZONE_BRUSH_MIN_DISTANCE = 24;

export function getZoneBrushStamps(zone: ZoneSketch): readonly ZoneBrushStamp[] {
  return zone.brushStamps ?? [];
}

export function hasBrushCoverage(zone: ZoneSketch): boolean {
  return getZoneBrushStamps(zone).length > 0;
}

export function isPointInZoneCoverage(point: Point, zone: ZoneSketch): boolean {
  const brushStamps = getZoneBrushStamps(zone);

  if (brushStamps.length > 0) {
    return brushStamps.some((stamp) => distance(point, stamp.position) <= stamp.radius);
  }

  return zone.polygon ? isPointInsidePolygon(point, zone.polygon) : false;
}

export function isSegmentInZoneCoverage(
  start: Point,
  end: Point,
  zone: ZoneSketch,
  step = DEFAULT_ZONE_BRUSH_RADIUS / 3,
): boolean {
  const length = distance(start, end);
  const steps = Math.max(1, Math.ceil(length / Math.max(1, step)));

  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;

    if (
      !isPointInZoneCoverage(
        {
          x: start.x + (end.x - start.x) * t,
          y: start.y + (end.y - start.y) * t,
        },
        zone,
      )
    ) {
      return false;
    }
  }

  return true;
}

export function getZoneCoverageCenter(zone: ZoneSketch): Point | null {
  const brushStamps = getZoneBrushStamps(zone);

  if (brushStamps.length > 0) {
    const weighted = brushStamps.reduce(
      (sum, stamp) => ({
        x: sum.x + stamp.position.x * stamp.radius,
        y: sum.y + stamp.position.y * stamp.radius,
        weight: sum.weight + stamp.radius,
      }),
      { x: 0, y: 0, weight: 0 },
    );

    return weighted.weight > 0
      ? { x: weighted.x / weighted.weight, y: weighted.y / weighted.weight }
      : null;
  }

  if (zone.polygon && zone.polygon.length > 0) {
    const total = zone.polygon.reduce(
      (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }),
      { x: 0, y: 0 },
    );

    return { x: total.x / zone.polygon.length, y: total.y / zone.polygon.length };
  }

  return null;
}

export function getZoneBounds(zone: ZoneSketch): Bounds | null {
  const brushStamps = getZoneBrushStamps(zone);

  if (brushStamps.length > 0) {
    return brushStamps.reduce<Bounds>(
      (bounds, stamp) => ({
        minX: Math.min(bounds.minX, stamp.position.x - stamp.radius),
        minY: Math.min(bounds.minY, stamp.position.y - stamp.radius),
        maxX: Math.max(bounds.maxX, stamp.position.x + stamp.radius),
        maxY: Math.max(bounds.maxY, stamp.position.y + stamp.radius),
      }),
      emptyBounds(),
    );
  }

  if (zone.polygon && zone.polygon.length > 0) {
    return getPointBounds(zone.polygon);
  }

  return null;
}

export function getPointBounds(points: readonly Point[]): Bounds {
  return points.reduce<Bounds>(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxX: Math.max(bounds.maxX, point.x),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    emptyBounds(),
  );
}

export function isPointInsidePolygon(point: Point, polygon: readonly Point[]): boolean {
  let inside = false;

  for (
    let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index, index += 1
  ) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const crossesY = currentPoint.y > point.y !== previousPoint.y > point.y;
    const intersectionX =
      ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
        (previousPoint.y - currentPoint.y) +
      currentPoint.x;

    if (crossesY && point.x < intersectionX) {
      inside = !inside;
    }
  }

  return inside;
}

export function distance(first: Point, second: Point): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function emptyBounds(): Bounds {
  return {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };
}
