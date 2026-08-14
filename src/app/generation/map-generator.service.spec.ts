import { SketchObject, ZoneSketch, ZoneType } from '../map-model/sketch-object.model';
import { RoadNetworkValidator } from './road-network/road-network-validator';
import { MapGeneratorService } from './map-generator.service';
import { ROAD_NETWORK_REGRESSION_SKETCHES } from './fixtures/road-network-regression.fixture';
import { UNTITLED_TOWN_MAP_REGRESSION_SKETCH } from './fixtures/untitled-town-map-regression.fixture';

describe('MapGeneratorService', () => {
  const service = new MapGeneratorService();
  const validator = new RoadNetworkValidator();

  it('normalizes crossing road sketches into one explicit four-way junction', () => {
    const generated = service.generate([
      road('horizontal', [
        { x: 40, y: 180 },
        { x: 360, y: 180 },
      ]),
      road('vertical', [
        { x: 200, y: 40 },
        { x: 200, y: 340 },
      ]),
    ]);
    const junction = generated.roadNetwork.nodes.find(
      (node) => Math.abs(node.position.x - 200) < 0.01 && Math.abs(node.position.y - 180) < 0.01,
    );

    expect(junction).toBeDefined();
    expect(
      generated.roadNetwork.edges.filter(
        (edge) => edge.fromNodeId === junction?.id || edge.toNodeId === junction?.id,
      ),
    ).toHaveLength(4);
    expect(validator.validate(generated.roadNetwork)).toEqual([]);
  });

  it('snaps a road endpoint to an existing edge but does not connect a close miss', () => {
    const snapped = service.generate([
      road('base', [
        { x: 20, y: 120 },
        { x: 360, y: 120 },
      ]),
      road('feeder', [
        { x: 180, y: 30 },
        { x: 180, y: 124 },
      ]),
    ]);
    const portal = snapped.roadNetwork.nodes.find(
      (node) => Math.abs(node.position.x - 180) < 0.01 && Math.abs(node.position.y - 120) < 0.01,
    );
    expect(portal).toBeDefined();
    expect(
      snapped.roadNetwork.edges.filter(
        (edge) => edge.fromNodeId === portal?.id || edge.toNodeId === portal?.id,
      ).length,
    ).toBe(3);

    const missed = service.generate([
      road('base', [
        { x: 20, y: 120 },
        { x: 170, y: 120 },
      ]),
      road('miss', [
        { x: 178, y: 120 },
        { x: 178, y: 260 },
      ]),
    ]);
    const baseNodeIds = new Set(
      missed.roadNetwork.edges
        .filter((edge) => edge.source.id === 'base')
        .flatMap((edge) => [edge.fromNodeId, edge.toNodeId]),
    );
    const missNodeIds = new Set(
      missed.roadNetwork.edges
        .filter((edge) => edge.source.id === 'miss')
        .flatMap((edge) => [edge.fromNodeId, edge.toNodeId]),
    );
    expect([...baseNodeIds].some((nodeId) => missNodeIds.has(nodeId))).toBe(false);
  });

  it('generates a connected district graph and places buildings from its frontage', () => {
    const zone = polygonZone('village-large', 'village', 100, 100, 520, 430, 0.9);
    const generated = service.generate([zone]);
    const districtEdges = generated.roadNetwork.edges.filter(
      (edge) => edge.source.kind === 'district' && edge.source.id === zone.id,
    );
    const buildings = generated.objects.filter((object) => object.type === 'generated-building');

    expect(districtEdges.length).toBeGreaterThanOrEqual(2);
    expect(
      validator.areEdgesConnected(
        generated.roadNetwork,
        districtEdges.map((edge) => edge.id),
      ),
    ).toBe(true);
    expect(buildings.length).toBeGreaterThan(0);
    expect(validator.validate(generated.roadNetwork, generated.objects)).toEqual([]);
  });

  it.each([
    ['market', 'aisle'],
    ['industrial', 'service-road'],
  ] as const)('preserves %s circulation semantics in the shared graph', (zoneType, roadClass) => {
    const generated = service.generate([
      polygonZone(`${zoneType}-zone`, zoneType, 80, 80, 480, 400, 0.9),
    ]);
    const edges = generated.roadNetwork.edges.filter((edge) => edge.roadClass === roadClass);

    expect(edges.length).toBeGreaterThan(0);
    expect(
      validator.areEdgesConnected(
        generated.roadNetwork,
        edges.map((edge) => edge.id),
      ),
    ).toBe(true);
  });

  it('connects a reachable district through a portal that is shared with the sketch road', () => {
    const generated = service.generate([
      road(
        'main-road',
        [
          { x: 40, y: 60 },
          { x: 560, y: 60 },
        ],
        'main',
      ),
      polygonZone('village', 'village', 120, 110, 480, 410, 0.8),
    ]);
    const portal = generated.roadNetwork.nodes.find((node) => node.kind === 'portal');

    expect(portal).toBeDefined();
    const incident = generated.roadNetwork.edges.filter(
      (edge) => edge.fromNodeId === portal?.id || edge.toNodeId === portal?.id,
    );
    expect(incident.some((edge) => edge.source.kind === 'sketch')).toBe(true);
    expect(incident.some((edge) => edge.source.kind === 'district')).toBe(true);
  });

  it('does not force district access across blocked water', () => {
    const generated = service.generate([
      road(
        'main-road',
        [
          { x: 40, y: 40 },
          { x: 560, y: 40 },
        ],
        'main',
      ),
      {
        id: 'blocking-river',
        type: 'river',
        points: [
          { x: 20, y: 105 },
          { x: 580, y: 105 },
        ],
        width: 32,
      },
      polygonZone('village', 'village', 120, 160, 480, 430, 0.8),
    ]);

    expect(generated.roadNetwork.nodes.some((node) => node.kind === 'portal')).toBe(false);
    expect(validator.validate(generated.roadNetwork, generated.objects)).toEqual([]);
  });

  it('records bridges for roads drawn after water', () => {
    const generated = service.generate([
      {
        id: 'river',
        type: 'river',
        points: [
          { x: 200, y: 20 },
          { x: 200, y: 300 },
        ],
        width: 28,
      },
      road('road', [
        { x: 40, y: 160 },
        { x: 360, y: 160 },
      ]),
    ]);

    expect(generated.roadNetwork.edges.flatMap((edge) => edge.bridges ?? [])).toHaveLength(1);
  });

  it('cuts roads when water is drawn later instead of inventing a bridge', () => {
    const generated = service.generate([
      road('road', [
        { x: 40, y: 160 },
        { x: 360, y: 160 },
      ]),
      {
        id: 'river',
        type: 'river',
        points: [
          { x: 200, y: 20 },
          { x: 200, y: 300 },
        ],
        width: 28,
      },
    ]);
    const roadEdges = generated.roadNetwork.edges.filter((edge) => edge.source.id === 'road');

    expect(roadEdges.length).toBe(2);
    expect(roadEdges.flatMap((edge) => edge.bridges ?? [])).toEqual([]);
    expect(
      roadEdges.every((edge) => edge.points.every((point) => Math.abs(point.x - 200) > 13)),
    ).toBe(true);
  });

  it('keeps generation deterministic and does not mutate semantic sketches', () => {
    const sketches: SketchObject[] = [
      road('road', [
        { x: 20, y: 70 },
        { x: 580, y: 70 },
      ]),
      polygonZone('village', 'village', 100, 120, 500, 430, 0.8),
    ];
    const before = structuredClone(sketches);
    const first = service.generate(sketches);
    const second = service.generate(sketches);

    expect(second).toEqual(first);
    expect(sketches).toEqual(before);
  });

  it('uses polygon coverage as primary geometry regardless of dense legacy stamps', () => {
    const zone = polygonZone('polygon-first', 'village', 100, 100, 430, 360, 0.8);
    const withStamps: ZoneSketch = {
      ...zone,
      brushStamps: Array.from({ length: 1000 }, () => ({
        position: { x: 260, y: 220 },
        radius: 60,
      })),
    };

    expect(service.generate([withStamps])).toEqual(service.generate([zone]));
  });

  it('keeps the reported exported-map regression fixture topologically valid', () => {
    const generated = service.generate(UNTITLED_TOWN_MAP_REGRESSION_SKETCH);

    expect(generated.roadNetwork.edges.length).toBeGreaterThan(0);
    expect(validator.validate(generated.roadNetwork, generated.objects)).toEqual([]);
  });

  it('generates forest objects without requiring road frontage', () => {
    const generated = service.generate([polygonZone('forest', 'forest', 80, 80, 430, 360, 0.9)]);

    expect(
      generated.objects.filter((object) => object.type === 'generated-tree').length,
    ).toBeGreaterThan(4);
    expect(generated.roadNetwork.edges).toEqual([]);
  });

  it('keeps all named road-system regression fixtures topologically explicit', () => {
    const disconnected = service.generate(ROAD_NETWORK_REGRESSION_SKETCHES.disconnectedStreets);
    const crossing = service.generate(ROAD_NETWORK_REGRESSION_SKETCHES.accidentalCrossing);
    const proximity = service.generate(ROAD_NETWORK_REGRESSION_SKETCHES.falseProximityConnection);
    const blocked = service.generate(ROAD_NETWORK_REGRESSION_SKETCHES.blockedRoadAccess);

    expect(
      validator.areEdgesConnected(
        disconnected.roadNetwork,
        disconnected.roadNetwork.edges.map((edge) => edge.id),
      ),
    ).toBe(false);
    expect(validator.validate(crossing.roadNetwork)).toEqual([]);
    expect(
      validator.areEdgesConnected(
        proximity.roadNetwork,
        proximity.roadNetwork.edges.map((edge) => edge.id),
      ),
    ).toBe(false);
    expect(blocked.roadNetwork.nodes.some((node) => node.kind === 'portal')).toBe(false);
  });

  it('assembles adjacent districts against a shared main road without cross-district leakage', () => {
    const sketches: SketchObject[] = [
      road(
        'shared-main',
        [
          { x: 30, y: 60 },
          { x: 760, y: 60 },
        ],
        'main',
      ),
      polygonZone('village-a', 'village', 80, 120, 350, 390, 0.8),
      polygonZone('market-b', 'market', 410, 120, 700, 390, 0.8),
    ];
    const first = service.generate(sketches);
    const second = service.generate(sketches);
    const districtSources = new Set(
      first.roadNetwork.edges
        .filter((edge) => edge.source.kind === 'district')
        .map((edge) => edge.source.id),
    );

    expect(districtSources).toEqual(new Set(['village-a', 'market-b']));
    expect(first.roadNetwork.nodes.filter((node) => node.kind === 'portal')).toHaveLength(2);
    expect(validator.validate(first.roadNetwork, first.objects)).toEqual([]);
    expect(second).toEqual(first);
  });

  it('does not leave a false portal when an overlapping district access candidate is rejected', () => {
    const generated = service.generate([
      road(
        'shared-main',
        [
          { x: 30, y: 80 },
          { x: 760, y: 80 },
        ],
        'main',
      ),
      polygonZone('market-first', 'market', 300, 130, 680, 430, 0.8),
      polygonZone('industrial-later', 'industrial', 420, 300, 760, 620, 0.8),
    ]);

    for (const portal of generated.roadNetwork.nodes.filter((node) => node.kind === 'portal')) {
      const incident = generated.roadNetwork.edges.filter(
        (edge) => edge.fromNodeId === portal.id || edge.toNodeId === portal.id,
      );
      expect(incident.some((edge) => edge.source.kind === 'sketch')).toBe(true);
      expect(incident.some((edge) => edge.source.kind === 'district')).toBe(true);
    }

    expect(validator.validate(generated.roadNetwork, generated.objects)).toEqual([]);
  });

  it.each([
    [
      'convex',
      [
        { x: 40, y: 40 },
        { x: 420, y: 40 },
        { x: 420, y: 320 },
        { x: 40, y: 320 },
      ],
    ],
    [
      'concave',
      [
        { x: 40, y: 40 },
        { x: 440, y: 40 },
        { x: 440, y: 140 },
        { x: 220, y: 140 },
        { x: 220, y: 380 },
        { x: 40, y: 380 },
      ],
    ],
    [
      'narrow',
      [
        { x: 40, y: 40 },
        { x: 600, y: 40 },
        { x: 600, y: 86 },
        { x: 40, y: 86 },
      ],
    ],
  ] as const)('degrades the %s stress polygon without invalid fallback roads', (_name, polygon) => {
    const generated = service.generate([
      {
        id: `stress-${_name}`,
        type: 'zone',
        zoneType: 'village',
        polygon: [...polygon],
        density: 1,
      },
    ]);

    expect(validator.validate(generated.roadNetwork, generated.objects)).toEqual([]);
  });
});

function road(
  id: string,
  points: { x: number; y: number }[],
  roadType: 'main' | 'secondary' | 'path' = 'secondary',
): SketchObject {
  return { id, type: 'road', points, roadType };
}

function polygonZone(
  id: string,
  zoneType: ZoneType,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  density: number,
): ZoneSketch {
  return {
    id,
    type: 'zone',
    zoneType,
    polygon: [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ],
    density,
  };
}
