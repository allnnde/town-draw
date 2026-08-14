import { cloneGeneratedMap, emptyGeneratedMap } from './generated-map.model';
import { SketchObject } from './sketch-object.model';

describe('GeneratedMap model', () => {
  it('creates isolated empty aggregates and deep clones network data', () => {
    const original = emptyGeneratedMap();
    original.roadNetwork.nodes.push({
      id: 'node',
      position: { x: 1, y: 2 },
      kind: 'endpoint',
    });
    const clone = cloneGeneratedMap(original);
    clone.roadNetwork.nodes[0].position.x = 99;

    expect(original.roadNetwork.nodes[0].position.x).toBe(1);
    expect(emptyGeneratedMap()).not.toBe(original);
  });

  it('serializes graph semantics stably without embedding semantic sketches', () => {
    const sketches: SketchObject[] = [
      {
        id: 'road-sketch',
        type: 'road',
        points: [
          { x: 0, y: 0 },
          { x: 20, y: 0 },
        ],
        roadType: 'path',
      },
    ];
    const map = emptyGeneratedMap();
    map.roadNetwork.nodes.push(
      { id: 'a', position: { x: 0, y: 0 }, kind: 'endpoint' },
      { id: 'b', position: { x: 20, y: 0 }, kind: 'endpoint' },
    );
    map.roadNetwork.edges.push({
      id: 'path',
      fromNodeId: 'a',
      toNodeId: 'b',
      points: [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
      ],
      width: 4,
      roadClass: 'path',
      source: { kind: 'sketch', id: sketches[0].id },
    });

    expect(JSON.stringify(cloneGeneratedMap(map))).toBe(JSON.stringify(map));
    expect(map.roadNetwork.edges[0].roadClass).toBe('path');
    expect(map).not.toHaveProperty('sketchObjects');
    expect(
      map.roadNetwork.edges.every((edge) =>
        map.roadNetwork.nodes.some((node) => node.id === edge.fromNodeId),
      ),
    ).toBe(true);
  });
});
