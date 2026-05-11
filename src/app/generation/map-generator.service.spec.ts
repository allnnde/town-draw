import { MapGeneratorService } from './map-generator.service';
import { GeneratedMapObject } from '../map-model/generated-object.model';
import { SketchObject } from '../map-model/sketch-object.model';
import { UNTITLED_TOWN_MAP_REGRESSION_SKETCH } from './fixtures/untitled-town-map-regression.fixture';

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

  it('treats repeated overlapping brush stamps as one zone coverage area', () => {
    const baseZone: SketchObject = {
      id: 'overlap-village-zone',
      type: 'zone',
      zoneType: 'village',
      brushStamps: [{ position: { x: 180, y: 180 }, radius: 150 }],
      density: 0.85,
    };
    const repeatedZone: SketchObject = {
      ...baseZone,
      brushStamps: [
        { position: { x: 180, y: 180 }, radius: 150 },
        { position: { x: 180, y: 180 }, radius: 150 },
        { position: { x: 180, y: 180 }, radius: 150 },
      ],
    };
    const baseGenerated = service.generate([baseZone]);
    const repeatedGenerated = service.generate([repeatedZone]);

    expect(countType(repeatedGenerated, 'generated-building')).toBe(
      countType(baseGenerated, 'generated-building'),
    );
    expect(internalPaths(repeatedGenerated, 'street').length).toBe(
      internalPaths(baseGenerated, 'street').length,
    );
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
        if (pathsTouchOrCross(streets[first].points, streets[second].points)) {
          continue;
        }

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

  it('routes village streets through gaps between generated buildings', () => {
    const generated = service.generate([
      {
        id: 'village-zone',
        type: 'zone',
        zoneType: 'village',
        brushStamps: [{ position: { x: 260, y: 220 }, radius: 190 }],
        density: 1,
      },
    ]);
    const buildings = generated.filter((object) => object.type === 'generated-building');
    const streets = internalPaths(generated, 'street');

    expect(streets.length).toBeGreaterThan(0);
    expect(streets.some((street) => hasObjectsOnBothSides(street.points, buildings, 86))).toBe(
      true,
    );
    expect(
      streets.every((street) =>
        buildings.every(
          (building) =>
            distanceToPolyline(building.position, street.points) >
            Math.min(building.width, building.height) / 2 + street.width / 2,
        ),
      ),
    ).toBe(true);
  });

  it('generates multiple internal streets for large districts instead of only one access line', () => {
    const generated = service.generate([
      {
        id: 'large-village-zone',
        type: 'zone',
        zoneType: 'village',
        brushStamps: [
          { position: { x: 340, y: 190 }, radius: 64 },
          { position: { x: 460, y: 230 }, radius: 72 },
          { position: { x: 600, y: 300 }, radius: 78 },
          { position: { x: 760, y: 370 }, radius: 82 },
          { position: { x: 920, y: 410 }, radius: 78 },
          { position: { x: 1040, y: 430 }, radius: 66 },
          { position: { x: 900, y: 500 }, radius: 72 },
          { position: { x: 720, y: 455 }, radius: 78 },
          { position: { x: 560, y: 380 }, radius: 78 },
          { position: { x: 420, y: 300 }, radius: 72 },
        ],
        density: 0.8,
      },
    ]);
    const buildings = generated.filter((object) => object.type === 'generated-building');
    const internalStreets = internalPaths(generated, 'street').filter(
      (street) => !street.id.includes('road-access'),
    );

    expect(buildings.length).toBeGreaterThan(20);
    expect(internalStreets.length).toBeGreaterThanOrEqual(3);
    expect(totalPathLength(internalStreets)).toBeGreaterThan(420);
    expect(pathsAreConnected(internalStreets)).toBe(true);
    expect(
      internalStreets.some((street) => hasObjectsOnBothSides(street.points, buildings, 95)),
    ).toBe(true);
    expect(pathsAreClearOfObjects(internalStreets, buildings)).toBe(true);
  });

  it('keeps reported exported districts on connected branch networks', () => {
    const generated = service.generate(UNTITLED_TOWN_MAP_REGRESSION_SKETCH);
    const districtIds = [
      'generated-zone-village-35bc44ae-69b2-4e88-937e-106ba117d5b6',
      'generated-zone-village-3edd9747-0e5d-4c74-a764-c5b054a4391e',
    ];

    for (const districtId of districtIds) {
      const streets = internalPaths(generated, 'street').filter(
        (street) => street.id.startsWith(districtId) && !street.id.includes('road-access'),
      );
      const buildings = generated.filter(
        (object): object is Extract<GeneratedMapObject, { type: 'generated-building' }> =>
          object.type === 'generated-building' && object.id.startsWith(districtId),
      );

      expect(streets.length).toBeGreaterThanOrEqual(3);
      expect(pathsAreConnected(streets)).toBe(true);
      expect(pathsAreClearOfObjects(streets, buildings)).toBe(true);
    }
  });

  it('connects populated district circulation to a nearby main road', () => {
    const generated = service.generate([
      {
        id: 'main-road',
        type: 'road',
        points: [
          { x: 40, y: 64 },
          { x: 380, y: 64 },
        ],
        roadType: 'main',
      },
      {
        id: 'village-zone',
        type: 'zone',
        zoneType: 'village',
        brushStamps: [{ position: { x: 210, y: 205 }, radius: 118 }],
        density: 1,
      },
    ]);
    const roads = generated.filter((object) => object.type === 'generated-road');
    const streets = internalPaths(generated, 'street');

    expect(roads.length).toBeGreaterThan(0);
    expect(
      streets.some((street) =>
        street.points.some((point) =>
          roads.some((road) => distanceToPolyline(point, road.points) <= road.width / 2 + 1),
        ),
      ),
    ).toBe(true);
  });

  it('does not force district road access across a river blocker', () => {
    const generated = service.generate([
      {
        id: 'main-road',
        type: 'road',
        points: [
          { x: 40, y: 46 },
          { x: 380, y: 46 },
        ],
        roadType: 'main',
      },
      {
        id: 'river-1',
        type: 'river',
        points: [
          { x: 40, y: 104 },
          { x: 380, y: 104 },
        ],
        width: 32,
      },
      {
        id: 'village-zone',
        type: 'zone',
        zoneType: 'village',
        brushStamps: [{ position: { x: 210, y: 222 }, radius: 112 }],
        density: 1,
      },
    ]);
    const roads = generated.filter((object) => object.type === 'generated-road');
    const streets = internalPaths(generated, 'street');

    expect(
      streets.some((street) =>
        street.points.some((point) =>
          roads.some((road) => distanceToPolyline(point, road.points) <= road.width / 2 + 1),
        ),
      ),
    ).toBe(false);
  });

  it('keeps market aisles and industrial service roads clear of generated objects', () => {
    const market = service.generate([
      {
        id: 'market-zone',
        type: 'zone',
        zoneType: 'market',
        brushStamps: [{ position: { x: 220, y: 220 }, radius: 170 }],
        density: 1,
      },
    ]);
    const industrial = service.generate([
      {
        id: 'industrial-zone',
        type: 'zone',
        zoneType: 'industrial',
        brushStamps: [{ position: { x: 260, y: 240 }, radius: 190 }],
        density: 1,
      },
    ]);
    const stalls = market.filter((object) => object.type === 'generated-market-stall');
    const aisles = internalPaths(market, 'aisle');
    const structures = industrial.filter(
      (object) => object.type === 'generated-industrial-structure',
    );
    const serviceRoads = internalPaths(industrial, 'service-road');

    expect(aisles.length).toBeGreaterThan(0);
    expect(serviceRoads.length).toBeGreaterThan(0);
    expect(pathsAreClearOfObjects(aisles, stalls)).toBe(true);
    expect(pathsAreClearOfObjects(serviceRoads, structures)).toBe(true);
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

function internalPaths(
  generated: readonly GeneratedMapObject[],
  pathType: Extract<GeneratedMapObject, { type: 'generated-internal-path' }>['pathType'],
): Extract<GeneratedMapObject, { type: 'generated-internal-path' }>[] {
  return generated.filter(
    (object): object is Extract<GeneratedMapObject, { type: 'generated-internal-path' }> =>
      object.type === 'generated-internal-path' && object.pathType === pathType,
  );
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

function pathsShareEndpoint(
  first: readonly { x: number; y: number }[],
  second: readonly { x: number; y: number }[],
): boolean {
  const firstEndpoints = [first[0], first[first.length - 1]];
  const secondEndpoints = [second[0], second[second.length - 1]];

  return firstEndpoints.some((firstPoint) =>
    secondEndpoints.some((secondPoint) => distance(firstPoint, secondPoint) < 0.01),
  );
}

function pathsIntersect(
  first: readonly { x: number; y: number }[],
  second: readonly { x: number; y: number }[],
): boolean {
  for (let firstIndex = 0; firstIndex < first.length - 1; firstIndex += 1) {
    for (let secondIndex = 0; secondIndex < second.length - 1; secondIndex += 1) {
      if (
        segmentsIntersect(
          first[firstIndex],
          first[firstIndex + 1],
          second[secondIndex],
          second[secondIndex + 1],
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

function pathsAreConnected(
  paths: readonly Extract<GeneratedMapObject, { type: 'generated-internal-path' }>[],
): boolean {
  if (paths.length <= 1) {
    return true;
  }

  const connected = new Set<number>([0]);
  let changed = true;

  while (changed) {
    changed = false;

    for (let index = 0; index < paths.length; index += 1) {
      if (connected.has(index)) {
        continue;
      }

      for (const connectedIndex of connected) {
        if (pathsTouchOrCross(paths[index].points, paths[connectedIndex].points)) {
          connected.add(index);
          changed = true;
          break;
        }
      }
    }
  }

  return connected.size === paths.length;
}

function pathsTouchOrCross(
  first: readonly { x: number; y: number }[],
  second: readonly { x: number; y: number }[],
): boolean {
  return (
    pathsShareEndpoint(first, second) ||
    pathsIntersect(first, second) ||
    pathDistance(first, second) < 0.01
  );
}

function totalPathLength(
  paths: readonly Extract<GeneratedMapObject, { type: 'generated-internal-path' }>[],
): number {
  return paths.reduce((total, path) => {
    let pathLength = 0;

    for (let index = 0; index < path.points.length - 1; index += 1) {
      pathLength += distance(path.points[index], path.points[index + 1]);
    }

    return total + pathLength;
  }, 0);
}

function hasObjectsOnBothSides(
  path: readonly { x: number; y: number }[],
  objects: readonly { position: { x: number; y: number } }[],
  maxDistance: number,
): boolean {
  for (let index = 0; index < path.length - 1; index += 1) {
    const start = path[index];
    const end = path[index + 1];
    let hasLeft = false;
    let hasRight = false;

    for (const object of objects) {
      if (distanceToSegment(object.position, start, end) > maxDistance) {
        continue;
      }

      const side = direction(start, end, object.position);

      if (side > 0) {
        hasLeft = true;
      } else if (side < 0) {
        hasRight = true;
      }
    }

    if (hasLeft && hasRight) {
      return true;
    }
  }

  return false;
}

function pathsAreClearOfObjects(
  paths: readonly Extract<GeneratedMapObject, { type: 'generated-internal-path' }>[],
  objects: readonly { position: { x: number; y: number }; width: number; height: number }[],
): boolean {
  return paths.every((path) =>
    objects.every(
      (object) =>
        distanceToPolyline(object.position, path.points) >
        Math.min(object.width, object.height) / 2 + path.width / 2,
    ),
  );
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
