import { Injectable } from '@angular/core';
import type { Container, Graphics } from 'pixi.js';
import { GeneratedMapObject } from '../map-model/generated-object.model';
import { Point } from '../map-model/point.model';

type GraphicsConstructor = new () => Graphics;

@Injectable({ providedIn: 'root' })
export class GeneratedMapRendererService {
  render(
    layer: Container,
    graphicsConstructor: GraphicsConstructor,
    objects: readonly GeneratedMapObject[],
  ): void {
    layer.removeChildren();

    for (const object of objects) {
      layer.addChild(this.createObjectGraphic(graphicsConstructor, object));
    }
  }

  private createObjectGraphic(
    graphicsConstructor: GraphicsConstructor,
    object: GeneratedMapObject,
  ): Graphics {
    switch (object.type) {
      case 'generated-river':
        return this.createPolylineGraphic(
          graphicsConstructor,
          object.points,
          object.width,
          0x1e90ff,
          0.45,
        );
      case 'generated-road':
        return this.createPolylineGraphic(
          graphicsConstructor,
          object.points,
          object.width,
          0x8b6f47,
          0.75,
        );
      case 'generated-tree':
        return this.createTreeGraphic(graphicsConstructor, object.position);
      case 'generated-building':
        return this.createRectGraphic(
          graphicsConstructor,
          object.position,
          object.width,
          object.height,
          0x9f7aea,
        );
      case 'generated-market-stall':
        return this.createRectGraphic(
          graphicsConstructor,
          object.position,
          object.width,
          object.height,
          0xdd6b20,
        );
    }
  }

  private createPolylineGraphic(
    graphicsConstructor: GraphicsConstructor,
    points: readonly Point[],
    width: number,
    color: number,
    alpha: number,
  ): Graphics {
    const graphics = new graphicsConstructor();

    if (points.length > 0) {
      graphics.moveTo(points[0].x, points[0].y);

      for (const point of points.slice(1)) {
        graphics.lineTo(point.x, point.y);
      }

      graphics.stroke({ width, color, alpha, cap: 'round', join: 'round' });
    }

    return graphics;
  }

  private createTreeGraphic(graphicsConstructor: GraphicsConstructor, position: Point): Graphics {
    const graphics = new graphicsConstructor();
    graphics.circle(position.x, position.y, 7);
    graphics.fill({ color: 0x276749, alpha: 0.9 });
    graphics.circle(position.x - 2, position.y - 2, 3);
    graphics.fill({ color: 0x68d391, alpha: 0.75 });

    return graphics;
  }

  private createRectGraphic(
    graphicsConstructor: GraphicsConstructor,
    position: Point,
    width: number,
    height: number,
    color: number,
  ): Graphics {
    const graphics = new graphicsConstructor();
    graphics.rect(position.x - width / 2, position.y - height / 2, width, height);
    graphics.fill({ color, alpha: 0.82 });
    graphics.stroke({ width: 2, color: 0x2d3748, alpha: 0.5 });

    return graphics;
  }
}
