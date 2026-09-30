import { SketchObject } from '../../map-model/sketch-object.model';
import { RoadNetworkValidator } from './road-network-validator';
import { RoadSketchNormalizer } from './road-sketch-normalizer';

describe('RoadSketchNormalizer', () => {
  const normalizer = new RoadSketchNormalizer();
  const validator = new RoadNetworkValidator();

  it('preserves hierarchy and shared vertices in a multi-segment road', () => {
    const network = normalizer.normalize([
      road(
        'main',
        [
          { x: 0, y: 0 },
          { x: 80, y: 20 },
          { x: 160, y: 0 },
        ],
        'main',
      ),
      road(
        'path',
        [
          { x: 80, y: 20 },
          { x: 80, y: 100 },
        ],
        'path',
      ),
    ]);

    expect(new Set(network.edges.map((edge) => edge.roadClass))).toEqual(new Set(['main', 'path']));
    expect(network.nodes.some((node) => node.kind === 'junction')).toBe(true);
    expect(validator.validate(network)).toEqual([]);
  });

  it('creates explicit T-junctions and four-way junctions', () => {
    const network = normalizer.normalize([
      road('base', [
        { x: 0, y: 50 },
        { x: 200, y: 50 },
      ]),
      road('tee', [
        { x: 100, y: 0 },
        { x: 100, y: 54 },
      ]),
      road('cross', [
        { x: 150, y: 0 },
        { x: 150, y: 100 },
      ]),
    ]);
    const degrees = network.nodes.map(
      (node) =>
        network.edges.filter((edge) => edge.fromNodeId === node.id || edge.toNodeId === node.id)
          .length,
    );

    expect(degrees).toContain(3);
    expect(degrees).toContain(4);
    expect(validator.validate(network)).toEqual([]);
  });

  it('keeps close misses and parallel roads as separate components', () => {
    const network = normalizer.normalize([
      road('one', [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ]),
      road('miss', [
        { x: 107, y: 0 },
        { x: 107, y: 100 },
      ]),
      road('parallel', [
        { x: 0, y: 8 },
        { x: 100, y: 8 },
      ]),
    ]);
    const sources = (id: string) =>
      new Set(
        network.edges
          .filter((edge) => edge.source.id === id)
          .flatMap((edge) => [edge.fromNodeId, edge.toNodeId]),
      );

    expect([...sources('one')].some((nodeId) => sources('miss').has(nodeId))).toBe(false);
    expect([...sources('one')].some((nodeId) => sources('parallel').has(nodeId))).toBe(false);
  });

  it('resolves bridge and river-cut behavior according to sketch order', () => {
    const river: SketchObject = {
      id: 'river',
      type: 'river',
      points: [
        { x: 100, y: -30 },
        { x: 100, y: 130 },
      ],
      width: 24,
    };
    const crossingRoad = road('road', [
      { x: 0, y: 50 },
      { x: 200, y: 50 },
    ]);
    const bridged = normalizer.normalize([river, crossingRoad]);
    const cut = normalizer.normalize([crossingRoad, river]);

    expect(bridged.edges.flatMap((edge) => edge.bridges ?? [])).toHaveLength(1);
    expect(cut.edges).toHaveLength(2);
    expect(cut.edges.flatMap((edge) => edge.bridges ?? [])).toEqual([]);
  });
});

function road(
  id: string,
  points: { x: number; y: number }[],
  roadType: 'main' | 'secondary' | 'path' = 'secondary',
): SketchObject {
  return { id, type: 'road', points, roadType };
}
