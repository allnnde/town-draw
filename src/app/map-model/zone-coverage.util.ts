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
