import { MapGeneratorService } from './map-generator.service';
import { GeneratedMapObject } from '../map-model/generated-object.model';
import { SketchObject } from '../map-model/sketch-object.model';

const service = new MapGeneratorService();

describe('MapGeneratorService', () => {
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

  it('keeps village neighbor spacing comparable across different zone sizes', () => {
    const smallBuildings = buildingsForZone('small-village', 120);
    const largeBuildings = buildingsForZone('large-village', 230);
    const smallMedian = medianNearestDistance(smallBuildings);
    const largeMedian = medianNearestDistance(largeBuildings);

    expect(largeBuildings.length).toBeGreaterThan(smallBuildings.length);
    expect(Math.abs(largeMedian - smallMedian)).toBeLessThan(18);
  });

  it('reduces count instead of over-compressing small village zones', () => {
    const buildings = buildingsForZone('tiny-village', 58);
    const nearestDistances = nearestDistancesFor(buildings);

    expect(buildings.length).toBeLessThan(9);
    expect(Math.min(...nearestDistances)).toBeGreaterThan(27);
  });

  it('adds deterministic visual variation to generated structures', () => {
    const firstPass = service.generate([
      {
        id: 'village-zone',
        type: 'zone',
        zoneType: 'village',
        brushStamps: [{ position: { x: 200, y: 200 }, radius: 180 }],
        density: 1,
      },
    ]);
    const secondPass = service.generate([
      {
        id: 'village-zone',
        type: 'zone',
        zoneType: 'village',
        brushStamps: [{ position: { x: 200, y: 200 }, radius: 180 }],
        density: 1,
      },
    ]);
    const buildings = firstPass.filter((object) => object.type === 'generated-building');
    const rotations = new Set(buildings.map((building) => building.rotation?.toFixed(2)));
    const variants = new Set(buildings.map((building) => building.variant));

    expect(buildings.every((building) => typeof building.rotation === 'number')).toBe(true);
    expect(buildings.every((building) => typeof building.variant === 'number')).toBe(true);
    expect(rotations.size).toBeGreaterThan(1);
    expect(variants.size).toBeGreaterThan(1);
    expect(firstPass).toEqual(secondPass);
  });

  it('avoids obvious row and column alignment for village buildings', () => {
    const buildings = buildingsForZone('organic-village', 220);
    const uniqueRoundedX = new Set(
      buildings.map((building) => Math.round(building.position.x / 12)),
    );
    const uniqueRoundedY = new Set(
      buildings.map((building) => Math.round(building.position.y / 12)),
    );

    expect(uniqueRoundedX.size).toBeGreaterThan(Math.floor(buildings.length / 3));
    expect(uniqueRoundedY.size).toBeGreaterThan(Math.floor(buildings.length / 3));
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
    expect(streets.some((street) => street.points.length > 2)).toBe(true);
    expect(
      streets.every((street) =>
        buildings.every((building) =>
          street.points.every((point) => distance(point, building.position) > 1),
        ),
      ),
    ).toBe(true);
  });

  it('keeps internal streets inside brush coverage', () => {
    const radius = 170;
    const center = { x: 200, y: 200 };
    const generated = service.generate([
      {
        id: 'village-zone',
        type: 'zone',
        zoneType: 'village',
        brushStamps: [{ position: center, radius }],
        density: 1,
      },
    ]);
    const streets = generated.filter(
      (object): object is Extract<GeneratedMapObject, { type: 'generated-internal-path' }> =>
        object.type === 'generated-internal-path' && object.pathType === 'street',
    );

    expect(streets.length).toBeGreaterThan(0);
    expect(
      streets.every((street) => street.points.every((point) => distance(point, center) <= radius)),
    ).toBe(true);
  });

  it('avoids drawing generated internal paths on top of each other', () => {
    const generated = service.generate([
      {
        id: 'village-zone',
        type: 'zone',
        zoneType: 'village',
        brushStamps: [{ position: { x: 240, y: 180 }, radius: 190 }],
        density: 1,
      },
    ]);
    const streets = generated.filter(
      (object): object is Extract<GeneratedMapObject, { type: 'generated-internal-path' }> =>
        object.type === 'generated-internal-path' && object.pathType === 'street',
    );

    for (let first = 0; first < streets.length; first += 1) {
      for (let second = first + 1; second < streets.length; second += 1) {
        expect(pathDistance(streets[first].points, streets[second].points)).toBeGreaterThan(7);
      }
    }
  });

  it('uses existing roads as layout guides while keeping buildings clear of the road', () => {
    const generated = service.generate([
      {
        id: 'road-1',
        type: 'road',
        points: [
          { x: 0, y: 200 },
          { x: 420, y: 200 },
        ],
        roadType: 'secondary',
      },
      {
        id: 'village-zone',
        type: 'zone',
        zoneType: 'village',
        brushStamps: [{ position: { x: 210, y: 200 }, radius: 180 }],
        density: 1,
      },
    ]);
    const buildings = generated.filter((object) => object.type === 'generated-building');
    const streets = generated.filter(
      (object): object is Extract<GeneratedMapObject, { type: 'generated-internal-path' }> =>
        object.type === 'generated-internal-path' && object.pathType === 'street',
    );

    expect(buildings.every((building) => Math.abs(building.position.y - 200) > 20)).toBe(true);
    expect(
      streets.some((street) => street.points.some((point) => Math.abs(point.y - 200) < 20)),
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
    expectBridgesOnRivers(generated);
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

function buildingsForZone(
  id: string,
  radius: number,
): Extract<GeneratedMapObject, { type: 'generated-building' }>[] {
  return service
    .generate([
      {
        id,
        type: 'zone',
        zoneType: 'village',
        brushStamps: [{ position: { x: 260, y: 260 }, radius }],
        density: 1,
      },
    ])
    .filter(
      (object): object is Extract<GeneratedMapObject, { type: 'generated-building' }> =>
        object.type === 'generated-building',
    );
}

function nearestDistancesFor(
  objects: readonly { id: string; position: { x: number; y: number } }[],
): number[] {
  return objects.map((object) =>
    Math.min(
      ...objects
        .filter((other) => other.id !== object.id)
        .map((other) => distance(object.position, other.position)),
    ),
  );
}

function medianNearestDistance(
  objects: readonly { id: string; position: { x: number; y: number } }[],
): number {
  const distances = nearestDistancesFor(objects).sort((first, second) => first - second);
  return distances[Math.floor(distances.length / 2)];
}

function expectBridgesOnRivers(generated: readonly GeneratedMapObject[]): void {
  const rivers = generated.filter((object) => object.type === 'generated-river');
  const bridges = generated.filter((object) => object.type === 'generated-bridge');

  expect(
    bridges.every((bridge) =>
      rivers.some((river) => distanceToPolyline(bridge.position, river.points) <= river.width / 2),
    ),
  ).toBe(true);
}

function pathDistance(
  first: readonly { x: number; y: number }[],
  second: readonly { x: number; y: number }[],
): number {
  let minDistance = Number.POSITIVE_INFINITY;

  for (let firstIndex = 0; firstIndex < first.length - 1; firstIndex += 1) {
    for (let secondIndex = 0; secondIndex < second.length - 1; secondIndex += 1) {
      minDistance = Math.min(
        minDistance,
        segmentDistance(
          first[firstIndex],
          first[firstIndex + 1],
          second[secondIndex],
          second[secondIndex + 1],
        ),
      );
    }
  }

  return minDistance;
}

function distanceToPolyline(
  point: { x: number; y: number },
  points: readonly { x: number; y: number }[],
): number {
  let minDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < points.length - 1; index += 1) {
    minDistance = Math.min(minDistance, distanceToSegment(point, points[index], points[index + 1]));
  }

  return minDistance;
}

function segmentDistance(
  firstStart: { x: number; y: number },
  firstEnd: { x: number; y: number },
  secondStart: { x: number; y: number },
  secondEnd: { x: number; y: number },
): number {
  if (segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd)) {
    return 0;
  }

  return Math.min(
    distanceToSegment(firstStart, secondStart, secondEnd),
    distanceToSegment(firstEnd, secondStart, secondEnd),
    distanceToSegment(secondStart, firstStart, firstEnd),
    distanceToSegment(secondEnd, firstStart, firstEnd),
  );
}

function segmentsIntersect(
  firstStart: { x: number; y: number },
  firstEnd: { x: number; y: number },
  secondStart: { x: number; y: number },
  secondEnd: { x: number; y: number },
): boolean {
  const d1 = direction(secondStart, secondEnd, firstStart);
  const d2 = direction(secondStart, secondEnd, firstEnd);
  const d3 = direction(firstStart, firstEnd, secondStart);
  const d4 = direction(firstStart, firstEnd, secondEnd);

  return d1 * d2 < 0 && d3 * d4 < 0;
}

function direction(
  start: { x: number; y: number },
  end: { x: number; y: number },
  point: { x: number; y: number },
): number {
  return (point.x - start.x) * (end.y - start.y) - (point.y - start.y) * (end.x - start.x);
}

function distanceToSegment(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return distance(point, start);
  }

  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared),
  );

  return distance(point, { x: start.x + t * dx, y: start.y + t * dy });
}

function distance(first: { x: number; y: number }, second: { x: number; y: number }): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}
