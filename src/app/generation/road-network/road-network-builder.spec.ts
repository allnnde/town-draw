import { RoadNetworkBuilder } from './road-network-builder';

describe('RoadNetworkBuilder', () => {
  it('merges and removes nodes while maintaining valid endpoint geometry', () => {
    const builder = new RoadNetworkBuilder();
    const start = builder.addNode({ x: 0, y: 0 }, 'endpoint', 'start');
    const duplicate = builder.addNode({ x: 100, y: 1 }, 'junction', 'duplicate');
    const target = builder.addNode({ x: 100, y: 0 }, 'endpoint', 'target');
    builder.addEdge({
      idHint: 'edge',
      fromNodeId: start.id,
      toNodeId: duplicate.id,
      width: 8,
      roadClass: 'secondary',
      source: { kind: 'sketch', id: 'road' },
    });

    expect(builder.mergeNodes(target.id, duplicate.id)?.kind).toBe('junction');
    expect(builder.getEdges()[0].toNodeId).toBe(target.id);
    expect(builder.getEdges()[0].points.at(-1)).toEqual(target.position);

    builder.removeNode(start.id);
    expect(builder.getEdges()).toEqual([]);
  });

  it('keeps bridge metadata on only the split half that contains the bridge', () => {
    const builder = new RoadNetworkBuilder();
    const start = builder.addNode({ x: 0, y: 0 }, 'endpoint', 'start');
    const end = builder.addNode({ x: 100, y: 0 }, 'endpoint', 'end');
    const edge = builder.addEdge({
      idHint: 'bridged',
      fromNodeId: start.id,
      toNodeId: end.id,
      width: 8,
      roadClass: 'secondary',
      source: { kind: 'sketch', id: 'road' },
      bridges: [{ riverId: 'river', position: { x: 25, y: 0 }, width: 24, height: 12, angle: 0 }],
    });

    expect(edge).not.toBeNull();
    builder.splitEdge(edge!.id, { x: 70, y: 0 }, 'junction', 'split');
    expect(builder.getEdges().flatMap((candidate) => candidate.bridges ?? [])).toHaveLength(1);
    expect(builder.toNetwork().edges.map((candidate) => candidate.id)).toEqual(
      [...builder.toNetwork().edges.map((candidate) => candidate.id)].sort(),
    );
  });
});
