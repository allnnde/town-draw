import { RoadNetwork } from '../../map-model/road-network.model';
import { RoadNetworkBuilder } from './road-network-builder';
import { RoadNetworkValidator } from './road-network-validator';

describe('RoadNetworkValidator', () => {
  const validator = new RoadNetworkValidator();

  it('does not treat a raw geometric crossing as connectivity', () => {
    const network: RoadNetwork = {
      nodes: [
        { id: 'a', position: { x: 0, y: 50 }, kind: 'endpoint' },
        { id: 'b', position: { x: 100, y: 50 }, kind: 'endpoint' },
        { id: 'c', position: { x: 50, y: 0 }, kind: 'endpoint' },
        { id: 'd', position: { x: 50, y: 100 }, kind: 'endpoint' },
      ],
      edges: [
        edge('horizontal', 'a', 'b', [
          { x: 0, y: 50 },
          { x: 100, y: 50 },
        ]),
        edge('vertical', 'c', 'd', [
          { x: 50, y: 0 },
          { x: 50, y: 100 },
        ]),
      ],
    };

    expect(validator.areEdgesConnected(network, ['horizontal', 'vertical'])).toBe(false);
    expect(
      validator.validate(network).some((violation) => violation.code === 'implicit-crossing'),
    ).toBe(true);
  });

  it('accepts edges joined through an explicit shared node', () => {
    const builder = new RoadNetworkBuilder();
    const start = builder.addNode({ x: 0, y: 0 }, 'endpoint', 'start');
    const junction = builder.addNode({ x: 100, y: 0 }, 'junction', 'junction');
    const end = builder.addNode({ x: 100, y: 100 }, 'endpoint', 'end');
    builder.addEdge({
      idHint: 'one',
      fromNodeId: start.id,
      toNodeId: junction.id,
      width: 8,
      roadClass: 'street',
      source: { kind: 'district', id: 'zone' },
      districtId: 'zone:region-0',
    });
    builder.addEdge({
      idHint: 'two',
      fromNodeId: junction.id,
      toNodeId: end.id,
      width: 8,
      roadClass: 'street',
      source: { kind: 'district', id: 'zone' },
      districtId: 'zone:region-0',
    });
    const network = builder.toNetwork();

    expect(validator.validate(network)).toEqual([]);
    expect(
      validator.areEdgesConnected(
        network,
        network.edges.map((candidate) => candidate.id),
      ),
    ).toBe(true);
  });

  it('reports disconnected edges that claim the same district', () => {
    const network: RoadNetwork = {
      nodes: [
        { id: 'a', position: { x: 0, y: 0 }, kind: 'endpoint' },
        { id: 'b', position: { x: 50, y: 0 }, kind: 'endpoint' },
        { id: 'c', position: { x: 100, y: 0 }, kind: 'endpoint' },
        { id: 'd', position: { x: 150, y: 0 }, kind: 'endpoint' },
      ],
      edges: [
        {
          ...edge('one', 'a', 'b', [
            { x: 0, y: 0 },
            { x: 50, y: 0 },
          ]),
          districtId: 'd',
        },
        {
          ...edge('two', 'c', 'd', [
            { x: 100, y: 0 },
            { x: 150, y: 0 },
          ]),
          districtId: 'd',
        },
      ],
    };

    expect(
      validator.validate(network).some((violation) => violation.code === 'disconnected-district'),
    ).toBe(true);
  });

  it('reports unstable ordering and portals that do not join both graph sources', () => {
    const network: RoadNetwork = {
      nodes: [
        { id: 'z', position: { x: 0, y: 0 }, kind: 'portal' },
        { id: 'a', position: { x: 50, y: 0 }, kind: 'endpoint' },
      ],
      edges: [
        edge('only-sketch', 'z', 'a', [
          { x: 0, y: 0 },
          { x: 50, y: 0 },
        ]),
      ],
    };
    const codes = validator.validate(network).map((violation) => violation.code);

    expect(codes).toContain('unsorted-nodes');
    expect(codes).toContain('invalid-portal');
  });

  it('validates full district width and river blockers when generation context is supplied', () => {
    const zone = {
      index: 0,
      object: {
        id: 'zone',
        type: 'zone' as const,
        zoneType: 'village' as const,
        polygon: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
          { x: 0, y: 100 },
        ],
        density: 1,
      },
    };
    const network: RoadNetwork = {
      nodes: [
        { id: 'a', position: { x: 4, y: 4 }, kind: 'endpoint' },
        { id: 'b', position: { x: 96, y: 4 }, kind: 'endpoint' },
      ],
      edges: [
        {
          ...edge('district', 'a', 'b', [
            { x: 4, y: 4 },
            { x: 96, y: 4 },
          ]),
          width: 10,
          roadClass: 'street',
          source: { kind: 'district', id: 'zone' },
          districtId: 'zone:region-0',
        },
      ],
    };
    const codes = validator
      .validate(network, [], {
        zones: [zone],
        rivers: [
          {
            index: 1,
            object: {
              id: 'river',
              type: 'river',
              points: [
                { x: 50, y: 0 },
                { x: 50, y: 100 },
              ],
              width: 12,
            },
          },
        ],
      })
      .map((violation) => violation.code);

    expect(codes).toContain('district-coverage');
    expect(codes).toContain('river-blocker');
  });
});

function edge(
  id: string,
  fromNodeId: string,
  toNodeId: string,
  points: { x: number; y: number }[],
) {
  return {
    id,
    fromNodeId,
    toNodeId,
    points,
    width: 8,
    roadClass: 'secondary' as const,
    source: { kind: 'sketch' as const, id },
  };
}
