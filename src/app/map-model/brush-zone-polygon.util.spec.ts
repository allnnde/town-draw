import { isPointInsidePolygon } from './zone-coverage.util';
import {
  DEFAULT_ZONE_POLYGON_MAX_POINTS,
  deriveZonePolygonFromBrushStamps,
} from './brush-zone-polygon.util';
import { ZoneBrushStamp } from './sketch-object.model';

describe('deriveZonePolygonFromBrushStamps', () => {
  it('derives polygon coverage for a simple brush stamp', () => {
    const polygon = deriveZonePolygonFromBrushStamps([{ position: { x: 50, y: 50 }, radius: 24 }]);

    expect(polygon.length).toBeGreaterThanOrEqual(3);
    expect(polygon.length).toBeLessThanOrEqual(DEFAULT_ZONE_POLYGON_MAX_POINTS);
    expect(isPointInsidePolygon({ x: 50, y: 50 }, polygon)).toBe(true);
  });

  it('keeps long brush strokes bounded by the configured maximum point count', () => {
    const stamps = Array.from(
      { length: 80 },
      (_, index): ZoneBrushStamp => ({
        position: { x: index * 18, y: Math.sin(index / 3) * 18 },
        radius: 34,
      }),
    );
    const polygon = deriveZonePolygonFromBrushStamps(stamps, { maxPoints: 32 });

    expect(polygon.length).toBeLessThanOrEqual(32);
    expect(isPointInsidePolygon({ x: 0, y: 0 }, polygon)).toBe(true);
    expect(isPointInsidePolygon({ x: 18 * 79, y: Math.sin(79 / 3) * 18 }, polygon)).toBe(true);
  });

  it('does not increase output complexity for dense repeated brush stamps', () => {
    const stamps = Array.from(
      { length: 300 },
      (): ZoneBrushStamp => ({
        position: { x: 120, y: 90 },
        radius: 48,
      }),
    );
    const polygon = deriveZonePolygonFromBrushStamps(stamps, { maxPoints: 24 });

    expect(polygon.length).toBeLessThanOrEqual(24);
    expect(isPointInsidePolygon({ x: 120, y: 90 }, polygon)).toBe(true);
  });

  it('produces deterministic output for overlapping strokes', () => {
    const stamps: ZoneBrushStamp[] = [
      { position: { x: 50, y: 50 }, radius: 30 },
      { position: { x: 80, y: 52 }, radius: 32 },
      { position: { x: 108, y: 68 }, radius: 28 },
      { position: { x: 80, y: 88 }, radius: 30 },
    ];

    expect(deriveZonePolygonFromBrushStamps(stamps)).toEqual(
      deriveZonePolygonFromBrushStamps(stamps),
    );
  });

  it('keeps self-overlapping strokes additive instead of collapsing the outline', () => {
    const stamps: ZoneBrushStamp[] = [
      { position: { x: 100, y: 100 }, radius: 38 },
      { position: { x: 160, y: 100 }, radius: 38 },
      { position: { x: 160, y: 160 }, radius: 38 },
      { position: { x: 100, y: 160 }, radius: 38 },
      { position: { x: 100, y: 100 }, radius: 38 },
      { position: { x: 220, y: 160 }, radius: 38 },
      { position: { x: 220, y: 220 }, radius: 38 },
      { position: { x: 160, y: 220 }, radius: 38 },
      { position: { x: 160, y: 160 }, radius: 38 },
    ];
    const polygon = deriveZonePolygonFromBrushStamps(stamps);

    for (const stamp of stamps) {
      expect(isPointInsidePolygon(stamp.position, polygon)).toBe(true);
    }
  });
});
