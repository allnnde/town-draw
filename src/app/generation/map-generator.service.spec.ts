import { MapGeneratorService } from './map-generator.service';
import { GeneratedMapObject } from '../map-model/generated-object.model';
import { SketchObject } from '../map-model/sketch-object.model';

describe('MapGeneratorService', () => {
  const service = new MapGeneratorService();

  it('lets later zone coverage win over earlier overlapping zones', () => {
    const sketchObjects: SketchObject[] = [
      {
        id: 'village-zone',
        type: 'zone',
        zoneType: 'village',
        brushStamps: [{ position: { x: 100, y: 100 }, radius: 80 }],
        density: 0.8,
      },
      {
        id: 'forest-zone',
        type: 'zone',
        zoneType: 'forest',
        brushStamps: [{ position: { x: 100, y: 100 }, radius: 80 }],
        density: 0.8,
      },
    ];

    const generated = service.generate(sketchObjects);

    expect(countType(generated, 'generated-building')).toBe(0);
    expect(countType(generated, 'generated-tree')).toBeGreaterThan(0);
  });

  it('does not place zone-generated content over rivers', () => {
    const sketchObjects: SketchObject[] = [
      {
        id: 'river-1',
        type: 'river',
        points: [
          { x: 0, y: 100 },
          { x: 220, y: 100 },
        ],
        width: 28,
      },
      {
        id: 'village-zone',
        type: 'zone',
        zoneType: 'village',
        brushStamps: [{ position: { x: 110, y: 100 }, radius: 95 }],
        density: 0.9,
      },
    ];

    const generated = service.generate(sketchObjects);
    const buildings = generated.filter((object) => object.type === 'generated-building');

    expect(buildings.length).toBeGreaterThan(0);
    expect(buildings.every((building) => Math.abs(building.position.y - 100) > 20)).toBe(true);
  });

  it('places village buildings with varied neighbor distances across the zone area', () => {
    const generated = service.generate([
      {
        id: 'village-zone',
        type: 'zone',
        zoneType: 'village',
        brushStamps: [{ position: { x: 200, y: 200 }, radius: 180 }],
        density: 1,
      },
    ]);
    const buildings = generated.filter((object) => object.type === 'generated-building');
    const nearestDistances = buildings.map((building) =>
      Math.min(
        ...buildings
          .filter((other) => other.id !== building.id)
          .map((other) => distance(building.position, other.position)),
      ),
    );

    expect(buildings.length).toBeGreaterThan(6);
    expect(Math.max(...nearestDistances) - Math.min(...nearestDistances)).toBeGreaterThan(8);
  });

  it('generates neighborhood streets from zone coverage instead of connecting every house', () => {
    const generated = service.generate([
      {
        id: 'village-zone',
        type: 'zone',
        zoneType: 'village',
        brushStamps: [{ position: { x: 200, y: 200 }, radius: 180 }],
        density: 1,
      },
    ]);
    const buildings = generated.filter((object) => object.type === 'generated-building');
    const streets = generated.filter(
      (object): object is Extract<GeneratedMapObject, { type: 'generated-internal-path' }> =>
        object.type === 'generated-internal-path' && object.pathType === 'street',
    );

    expect(streets.length).toBeGreaterThan(0);
    expect(streets.length).toBeLessThan(buildings.length);
    expect(
      streets.every((street) =>
        buildings.every((building) =>
          street.points.every((point) => distance(point, building.position) > 1),
        ),
      ),
    ).toBe(true);
  });

  it('creates bridges for roads drawn over water', () => {
    const generated = service.generate([
      {
        id: 'river-1',
        type: 'river',
        points: [
          { x: 100, y: 0 },
          { x: 100, y: 200 },
        ],
        width: 30,
      },
      {
        id: 'road-1',
        type: 'road',
        points: [
          { x: 0, y: 100 },
          { x: 200, y: 100 },
        ],
        roadType: 'secondary',
      },
    ]);

    expect(countType(generated, 'generated-bridge')).toBeGreaterThan(0);
    expect(countType(generated, 'generated-road')).toBeGreaterThan(0);
  });

  it('cuts roads when water is drawn over them', () => {
    const generated = service.generate([
      {
        id: 'road-1',
        type: 'road',
        points: [
          { x: 0, y: 100 },
          { x: 200, y: 100 },
        ],
        roadType: 'secondary',
      },
      {
        id: 'river-1',
        type: 'river',
        points: [
          { x: 100, y: 0 },
          { x: 100, y: 200 },
        ],
        width: 30,
      },
    ]);

    expect(countType(generated, 'generated-bridge')).toBe(0);
    expect(countType(generated, 'generated-road')).toBe(0);
  });
});

function countType(
  generated: readonly GeneratedMapObject[],
  type: GeneratedMapObject['type'],
): number {
  return generated.filter((object) => object.type === type).length;
}

function distance(first: { x: number; y: number }, second: { x: number; y: number }): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}
