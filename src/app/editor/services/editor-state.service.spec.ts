import { emptyGeneratedMap } from '../../map-model/generated-map.model';
import { EditorStateService } from './editor-state.service';

describe('EditorStateService generated map state', () => {
  it('replaces the generated aggregate atomically and keeps it separate from sketches', () => {
    const state = new EditorStateService();
    state.addSketchObject({
      id: 'road',
      type: 'road',
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      roadType: 'secondary',
    });
    const generated = emptyGeneratedMap();
    generated.roadNetwork.nodes.push(
      { id: 'a', position: { x: 0, y: 0 }, kind: 'endpoint' },
      { id: 'b', position: { x: 100, y: 0 }, kind: 'endpoint' },
    );
    generated.roadNetwork.edges.push({
      id: 'edge',
      fromNodeId: 'a',
      toNodeId: 'b',
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      width: 7,
      roadClass: 'secondary',
      source: { kind: 'sketch', id: 'road' },
    });

    state.setGeneratedMap(generated);
    generated.roadNetwork.nodes[0].position.x = 999;

    expect(state.generatedMap().roadNetwork.nodes[0].position.x).toBe(0);
    expect(state.sketchObjects()).toHaveLength(1);
  });

  it('exports the current schema and clears generated state with the map', () => {
    const state = new EditorStateService();
    const generated = emptyGeneratedMap();
    generated.objects.push({
      id: 'tree',
      type: 'generated-tree',
      position: { x: 10, y: 10 },
    });

    expect(state.exportProject().version).toBe(2);
    state.setGeneratedMap(generated);
    state.clearGeneratedMap();
    expect(state.generatedMap()).toEqual(emptyGeneratedMap());
    state.clearMap();
    expect(state.generatedMap()).toEqual(emptyGeneratedMap());
  });
});
