import { Point } from './point.model';
import { ZoneBrushStamp, ZoneSketch } from './sketch-object.model';
import { deriveZonePolygonFromBrushStamps } from './brush-zone-polygon.util';

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

export function getZoneCoveragePolygon(zone: ZoneSketch): readonly Point[] {
  if (zone.polygon && zone.polygon.length >= 3) {
    return zone.polygon;
  }

  const brushStamps = getZoneBrushStamps(zone);

  if (brushStamps.length === 0) {
    return [];
  }

  const polygon = deriveZonePolygonFromBrushStamps(brushStamps);

  if (polygon.length >= 3) {
    zone.polygon = polygon;
    return polygon;
  }

  return [];
}

export function isPointInZoneCoverage(point: Point, zone: ZoneSketch): boolean {
  const polygon = getZoneCoveragePolygon(zone);

  if (polygon.length >= 3) {
    return isPointInsidePolygon(point, polygon);
  }

  return getZoneBrushStamps(zone).some((stamp) => distance(point, stamp.position) <= stamp.radius);
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
  const polygon = getZoneCoveragePolygon(zone);

  if (polygon.length > 0) {
    const total = polygon.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), {
      x: 0,
      y: 0,
    });

    return { x: total.x / polygon.length, y: total.y / polygon.length };
  }

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

  return null;
}

export function getZoneBounds(zone: ZoneSketch): Bounds | null {
  const polygon = getZoneCoveragePolygon(zone);

  if (polygon.length > 0) {
    return getPointBounds(polygon);
  }

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

  return null;
}

export function getZoneCoverageArea(zone: ZoneSketch): number {
  const polygon = getZoneCoveragePolygon(zone);

  if (polygon.length >= 3) {
    return Math.abs(getPolygonSignedArea(polygon));
  }

  const bounds = getZoneBounds(zone);

  return bounds ? (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY) : 0;
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
  if (polygon.length < 3) {
    return false;
  }

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

function getPolygonSignedArea(polygon: readonly Point[]): number {
  let area = 0;

  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    area += current.x * next.y - next.x * current.y;
  }

  return area / 2;
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
