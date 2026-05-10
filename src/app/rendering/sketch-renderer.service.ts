import { Injectable } from '@angular/core';
import type { Container, Graphics } from 'pixi.js';
import { Point } from '../map-model/point.model';
import {
  MarkerSketch,
  RoadSketch,
  RiverSketch,
  SketchObject,
  ZoneSketch,
} from '../map-model/sketch-object.model';
import { getZoneBrushStamps, hasBrushCoverage } from '../map-model/zone-coverage.util';

type GraphicsConstructor = new () => Graphics;

@Injectable({ providedIn: 'root' })
export class SketchRendererService {
  render(
    layer: Container,
    graphicsConstructor: GraphicsConstructor,
    objects: readonly SketchObject[],
    selectedObjectId: string | null,
    hideZoneFills = false,
  ): void {
    layer.removeChildren();

    for (const object of objects) {
      const isSelected = object.id === selectedObjectId;
      const isDraft = object.id.startsWith('draft-');
      const shouldHideZoneFill = hideZoneFills && object.type === 'zone' && !isSelected && !isDraft;

      if (!shouldHideZoneFill) {
        layer.addChild(this.createObjectGraphic(graphicsConstructor, object, false));
      }

      if (isSelected) {
        layer.addChild(this.createObjectGraphic(graphicsConstructor, object, true));
      }
    }
  }

  private createObjectGraphic(
    graphicsConstructor: GraphicsConstructor,
    object: SketchObject,
    selected: boolean,
  ): Graphics {
    switch (object.type) {
      case 'river':
        return this.createRiverGraphic(graphicsConstructor, object, selected);
      case 'road':
        return this.createRoadGraphic(graphicsConstructor, object, selected);
      case 'zone':
        return this.createZoneGraphic(graphicsConstructor, object, selected);
      case 'marker':
        return this.createMarkerGraphic(graphicsConstructor, object, selected);
    }
  }

  private createRiverGraphic(
    graphicsConstructor: GraphicsConstructor,
    river: RiverSketch,
    selected: boolean,
  ): Graphics {
    const graphics = new graphicsConstructor();
    this.drawPolyline(graphics, river.points);
    graphics.stroke({
      width: selected ? river.width + 8 : river.width,
      color: selected ? 0xfacc15 : 0x3182ce,
      alpha: selected ? 0.9 : 0.85,
      cap: 'round',
      join: 'round',
    });

    return graphics;
  }

  private createRoadGraphic(
    graphicsConstructor: GraphicsConstructor,
    road: RoadSketch,
    selected: boolean,
  ): Graphics {
    const graphics = new graphicsConstructor();
    this.drawPolyline(graphics, road.points);
    graphics.stroke({
      width: selected ? 12 : 6,
      color: selected ? 0xfacc15 : 0x72543a,
      alpha: selected ? 0.9 : 0.9,
      cap: 'round',
      join: 'round',
    });

    return graphics;
  }

  private createZoneGraphic(
    graphicsConstructor: GraphicsConstructor,
    zone: ZoneSketch,
    selected: boolean,
  ): Graphics {
    const colors = {
      forest: 0x2f855a,
      industrial: 0x4a5568,
      market: 0xc05621,
      village: 0x805ad5,
    } as const;
    const graphics = new graphicsConstructor();

    if (hasBrushCoverage(zone)) {
      for (const stamp of getZoneBrushStamps(zone)) {
        graphics.circle(
          stamp.position.x,
          stamp.position.y,
          selected ? stamp.radius + 3 : stamp.radius,
        );

        if (selected) {
          graphics.stroke({ width: 3, color: 0xfacc15, alpha: 0.8 });
        } else {
          graphics.fill({ color: colors[zone.zoneType], alpha: 0.2 });
        }
      }

      return graphics;
    }

    const polygon = this.flattenPoints(zone.polygon ?? []);

    if (polygon.length === 0) {
      return graphics;
    }

    graphics.poly(polygon, true);
    graphics.fill({ color: colors[zone.zoneType], alpha: selected ? 0.38 : 0.22 });
    graphics.stroke({
      width: selected ? 5 : 2,
      color: selected ? 0xfacc15 : colors[zone.zoneType],
      alpha: 0.95,
      join: 'round',
    });

    return graphics;
  }

  private createMarkerGraphic(
    graphicsConstructor: GraphicsConstructor,
    marker: MarkerSketch,
    selected: boolean,
  ): Graphics {
    const graphics = new graphicsConstructor();
    graphics.circle(marker.position.x, marker.position.y, selected ? 10 : 7);
    graphics.fill({ color: selected ? 0xfacc15 : 0x1a202c, alpha: 0.95 });

    return graphics;
  }

  private drawPolyline(graphics: Graphics, points: readonly Point[]): void {
    if (points.length === 0) {
      return;
    }

    graphics.moveTo(points[0].x, points[0].y);

    for (const point of points.slice(1)) {
      graphics.lineTo(point.x, point.y);
    }
  }

  private flattenPoints(points: readonly Point[]): number[] {
    return points.flatMap((point) => [point.x, point.y]);
  }
}
