import { Injectable } from '@angular/core';
import type { Container, Graphics } from 'pixi.js';
import { GeneratedMap } from '../map-model/generated-map.model';
import { GeneratedNonRoadObject } from '../map-model/generated-object.model';
import { Point } from '../map-model/point.model';
import { RoadBridge, RoadEdge } from '../map-model/road-network.model';

type GraphicsConstructor = new () => Graphics;

@Injectable({ providedIn: 'root' })
export class GeneratedMapRendererService {
  render(layer: Container, graphicsConstructor: GraphicsConstructor, map: GeneratedMap): void {
    layer.removeChildren();
    const rivers = map.objects.filter((object) => object.type === 'generated-river');
    const structures = map.objects.filter((object) => object.type !== 'generated-river');

    for (const object of rivers) {
      layer.addChild(this.createObjectGraphic(graphicsConstructor, object));
    }

    for (const edge of map.roadNetwork.edges) {
      layer.addChild(this.createRoadEdgeGraphic(graphicsConstructor, edge));
    }

    for (const object of structures) {
      layer.addChild(this.createObjectGraphic(graphicsConstructor, object));
    }

    for (const bridge of map.roadNetwork.edges.flatMap((edge) => edge.bridges ?? [])) {
      layer.addChild(this.createBridgeGraphic(graphicsConstructor, bridge));
    }
  }

  private createObjectGraphic(
    graphicsConstructor: GraphicsConstructor,
    object: GeneratedNonRoadObject,
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
      case 'generated-tree':
        return this.createTreeGraphic(
          graphicsConstructor,
          object.position,
          object.rotation ?? 0,
          object.variant ?? 0,
        );
      case 'generated-building':
        return this.createRectGraphic(
          graphicsConstructor,
          object.position,
          object.width,
          object.height,
          0x9f7aea,
          object.rotation ?? 0,
          object.variant ?? 0,
        );
      case 'generated-market-stall':
        return this.createRectGraphic(
          graphicsConstructor,
          object.position,
          object.width,
          object.height,
          0xdd6b20,
          object.rotation ?? 0,
          object.variant ?? 0,
        );
      case 'generated-industrial-structure':
        return this.createRectGraphic(
          graphicsConstructor,
          object.position,
          object.width,
          object.height,
          0x4a5568,
          object.rotation ?? 0,
          object.variant ?? 0,
        );
    }
  }

  private createRoadEdgeGraphic(
    graphicsConstructor: GraphicsConstructor,
    edge: RoadEdge,
  ): Graphics {
    const colors = {
      aisle: 0xd6bc7f,
      main: 0x705239,
      path: 0xb89a72,
      secondary: 0x8b6f47,
      'service-road': 0x52525b,
      street: 0x8b7355,
    } as const;
    return this.createPolylineGraphic(
      graphicsConstructor,
      edge.points,
      edge.width,
      colors[edge.roadClass],
      0.84,
    );
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

  private createTreeGraphic(
    graphicsConstructor: GraphicsConstructor,
    position: Point,
    rotation: number,
    variant: number,
  ): Graphics {
    const graphics = new graphicsConstructor();
    const radius = 6 + (variant % 3);
    const highlight = this.rotateOffset(-2, -2, Math.cos(rotation), Math.sin(rotation), position);
    graphics.circle(position.x, position.y, radius);
    graphics.fill({ color: 0x276749, alpha: 0.9 });
    graphics.circle(highlight.x, highlight.y, 3);
    graphics.fill({ color: 0x68d391, alpha: 0.75 });
    return graphics;
  }

  private createRectGraphic(
    graphicsConstructor: GraphicsConstructor,
    position: Point,
    width: number,
    height: number,
    color: number,
    rotation: number,
    variant: number,
  ): Graphics {
    const graphics = new graphicsConstructor();
    const corners = this.getRotatedRectCorners(position, width, height, rotation);
    graphics.poly(
      corners.flatMap((corner) => [corner.x, corner.y]),
      true,
    );
    graphics.fill({ color, alpha: 0.82 });
    graphics.stroke({ width: 2, color: 0x2d3748, alpha: 0.5 });

    if (variant % 2 === 1) {
      const roofLine = this.getRotatedSegment(position, width * 0.28, rotation);
      graphics.moveTo(roofLine[0].x, roofLine[0].y);
      graphics.lineTo(roofLine[1].x, roofLine[1].y);
      graphics.stroke({ width: 2, color: 0xf7fafc, alpha: 0.35, cap: 'round' });
    }

    return graphics;
  }

  private createBridgeGraphic(
    graphicsConstructor: GraphicsConstructor,
    bridge: RoadBridge,
  ): Graphics {
    const graphics = new graphicsConstructor();
    const corners = this.getRotatedRectCorners(
      bridge.position,
      bridge.width,
      bridge.height,
      bridge.angle,
    );
    graphics.poly(
      corners.flatMap((corner) => [corner.x, corner.y]),
      true,
    );
    graphics.fill({ color: 0xc49a6c, alpha: 0.95 });
    graphics.stroke({ width: 2, color: 0x5a3b22, alpha: 0.9 });
    return graphics;
  }

  private rotateOffset(x: number, y: number, cos: number, sin: number, origin: Point): Point {
    return {
      x: origin.x + x * cos - y * sin,
      y: origin.y + x * sin + y * cos,
    };
  }

  private getRotatedRectCorners(
    position: Point,
    width: number,
    height: number,
    rotation: number,
  ): Point[] {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    return [
      this.rotateOffset(-halfWidth, -halfHeight, cos, sin, position),
      this.rotateOffset(halfWidth, -halfHeight, cos, sin, position),
      this.rotateOffset(halfWidth, halfHeight, cos, sin, position),
      this.rotateOffset(-halfWidth, halfHeight, cos, sin, position),
    ];
  }

  private getRotatedSegment(position: Point, halfLength: number, rotation: number): [Point, Point] {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    return [
      this.rotateOffset(-halfLength, 0, cos, sin, position),
      this.rotateOffset(halfLength, 0, cos, sin, position),
    ];
  }
}
