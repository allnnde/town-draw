import { Container, Graphics } from 'pixi.js';
import { GeneratedMap } from '../map-model/generated-map.model';
import { GeneratedMapRendererService } from './generated-map-renderer.service';

class FakeGraphics {
  moves: { x: number; y: number }[] = [];
  lines: { x: number; y: number }[] = [];
  polyCalls = 0;

  moveTo(x: number, y: number): void {
    this.moves.push({ x, y });
  }

  lineTo(x: number, y: number): void {
    this.lines.push({ x, y });
  }

  poly(): void {
    this.polyCalls += 1;
  }

  circle(): void {}

  fill(): void {}

  stroke(): void {}
}

class FakeLayer {
  children: FakeGraphics[] = [];

  removeChildren(): void {
    this.children = [];
  }

  addChild(graphics: FakeGraphics): void {
    this.children.push(graphics);
  }
}

describe('GeneratedMapRendererService', () => {
  it('renders connected edge centerlines at the same explicit junction and draws bridge metadata', () => {
    const map: GeneratedMap = {
      schemaVersion: 2,
      roadNetwork: {
        nodes: [
          { id: 'a', position: { x: 0, y: 0 }, kind: 'endpoint' },
          { id: 'junction', position: { x: 100, y: 0 }, kind: 'junction' },
          { id: 'b', position: { x: 100, y: 100 }, kind: 'endpoint' },
        ],
        edges: [
          {
            id: 'one',
            fromNodeId: 'a',
            toNodeId: 'junction',
            points: [
              { x: 0, y: 0 },
              { x: 100, y: 0 },
            ],
            width: 8,
            roadClass: 'secondary',
            source: { kind: 'sketch', id: 'road' },
            bridges: [
              {
                riverId: 'river',
                position: { x: 50, y: 0 },
                width: 30,
                height: 14,
                angle: 0,
              },
            ],
          },
          {
            id: 'two',
            fromNodeId: 'junction',
            toNodeId: 'b',
            points: [
              { x: 100, y: 0 },
              { x: 100, y: 100 },
            ],
            width: 10,
            roadClass: 'street',
            source: { kind: 'district', id: 'zone' },
            districtId: 'zone:region-0',
          },
        ],
      },
      objects: [],
    };
    const layer = new FakeLayer();

    new GeneratedMapRendererService().render(
      layer as unknown as Container,
      FakeGraphics as unknown as new () => Graphics,
      map,
    );

    expect(layer.children).toHaveLength(3);
    expect(layer.children[0].lines.at(-1)).toEqual({ x: 100, y: 0 });
    expect(layer.children[1].moves[0]).toEqual({ x: 100, y: 0 });
    expect(layer.children[2].polyCalls).toBe(1);
  });
});
