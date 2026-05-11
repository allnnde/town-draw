import { Container, Graphics } from 'pixi.js';
import { ZoneSketch } from '../map-model/sketch-object.model';
import { SketchRendererService } from './sketch-renderer.service';

class FakeGraphics {
  circleCalls = 0;
  polyCalls = 0;

  circle(): void {
    this.circleCalls += 1;
  }

  poly(): void {
    this.polyCalls += 1;
  }

  fill(): void {}

  stroke(): void {}

  moveTo(): void {}

  lineTo(): void {}
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

describe('SketchRendererService', () => {
  const service = new SketchRendererService();

  it('renders completed zones with polygon geometry instead of stamp circles', () => {
    const layer = new FakeLayer();
    const zone: ZoneSketch = {
      id: 'zone-polygon-first',
      type: 'zone',
      zoneType: 'forest',
      polygon: [
        { x: 0, y: 0 },
        { x: 80, y: 0 },
        { x: 80, y: 80 },
        { x: 0, y: 80 },
      ],
      brushStamps: Array.from({ length: 200 }, (_, index) => ({
        position: { x: index, y: index },
        radius: 20,
      })),
      density: 0.8,
    };

    service.render(
      layer as unknown as Container,
      FakeGraphics as unknown as new () => Graphics,
      [zone],
      null,
    );

    expect(layer.children[0].polyCalls).toBe(1);
    expect(layer.children[0].circleCalls).toBe(0);
  });
});
