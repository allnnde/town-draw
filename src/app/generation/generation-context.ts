import { Point } from '../map-model/point.model';
import { RiverSketch, ZoneSketch } from '../map-model/sketch-object.model';
import {
  Bounds,
  getZoneBounds,
  getZoneCoverageArea,
  isPointInZoneCoverage,
} from '../map-model/zone-coverage.util';
import { distanceToPolyline } from './road-network/road-geometry';

export interface IndexedRiver {
  object: RiverSketch;
  index: number;
}

export interface IndexedZone {
  object: ZoneSketch;
  index: number;
}

export function getEffectiveZoneAt(
  point: Point,
  zones: readonly IndexedZone[],
): IndexedZone | null {
  let winner: IndexedZone | null = null;

  for (const zone of zones) {
    if (isPointInZoneCoverage(point, zone.object)) {
      winner = zone;
    }
  }

  return winner;
}

export function isEffectiveZonePoint(
  point: Point,
  zone: IndexedZone,
  zones: readonly IndexedZone[],
): boolean {
  return getEffectiveZoneAt(point, zones)?.object.id === zone.object.id;
}

export function isPointBlockedByRivers(
  point: Point,
  rivers: readonly IndexedRiver[],
  clearance: number,
): boolean {
  return rivers.some(
    (river) => distanceToPolyline(point, river.object.points) <= river.object.width / 2 + clearance,
  );
}

export function getEffectiveZoneArea(zone: IndexedZone, zones: readonly IndexedZone[]): number {
  const bounds = getZoneBounds(zone.object);

  if (!bounds) {
    return 0;
  }

  const step = getSampleStep(bounds);
  let count = 0;

  for (let x = bounds.minX + step / 2; x <= bounds.maxX; x += step) {
    for (let y = bounds.minY + step / 2; y <= bounds.maxY; y += step) {
      if (isEffectiveZonePoint({ x, y }, zone, zones)) {
        count += 1;
      }
    }
  }

  return count > 0 ? count * step * step : getZoneCoverageArea(zone.object);
}

export function getSampleStep(bounds: Bounds): number {
  return Math.max(
    12,
    Math.min(28, Math.hypot(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) / 36),
  );
}
