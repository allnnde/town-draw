import { Injectable } from '@angular/core';
import { GeneratedMapObject } from '../map-model/generated-object.model';
import { clonePoint, Point } from '../map-model/point.model';
import { SketchObject, ZoneSketch } from '../map-model/sketch-object.model';

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

@Injectable({ providedIn: 'root' })
export class MapGeneratorService {
  generate(sketchObjects: readonly SketchObject[]): GeneratedMapObject[] {
    const generated: GeneratedMapObject[] = [];

    for (const object of sketchObjects) {
      switch (object.type) {
        case 'river':
          generated.push({
            id: `generated-${object.id}`,
            type: 'generated-river',
            points: object.points.map(clonePoint),
            width: object.width + 8,
          });
          break;
        case 'road':
          generated.push({
            id: `generated-${object.id}`,
            type: 'generated-road',
            points: object.points.map(clonePoint),
            width: object.roadType === 'main' ? 10 : object.roadType === 'secondary' ? 7 : 4,
          });
          break;
        case 'zone':
          generated.push(...this.generateZoneObjects(object));
          break;
        case 'marker':
          break;
      }
    }

    return generated;
  }

  private generateZoneObjects(zone: ZoneSketch): GeneratedMapObject[] {
    const bounds = this.getBounds(zone.polygon);
    const area = Math.max(1, (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY));

    switch (zone.zoneType) {
      case 'forest':
        return this.distributePoints(bounds, this.getCount(area, zone.density, 900, 6, 42)).map(
          (position, index) => ({
            id: `generated-${zone.id}-tree-${index}`,
            type: 'generated-tree',
            position,
          }),
        );
      case 'village':
        return this.distributePoints(bounds, this.getCount(area, zone.density, 1800, 3, 24)).map(
          (position, index) => ({
            id: `generated-${zone.id}-building-${index}`,
            type: 'generated-building',
            position,
            width: 26,
            height: 20,
          }),
        );
      case 'market':
        return this.distributePoints(bounds, this.getCount(area, zone.density, 1200, 4, 30)).map(
          (position, index) => ({
            id: `generated-${zone.id}-stall-${index}`,
            type: 'generated-market-stall',
            position,
            width: 20,
            height: 14,
          }),
        );
    }
  }

  private getBounds(points: readonly Point[]): Bounds {
    return points.reduce(
      (bounds, point) => ({
        minX: Math.min(bounds.minX, point.x),
        minY: Math.min(bounds.minY, point.y),
        maxX: Math.max(bounds.maxX, point.x),
        maxY: Math.max(bounds.maxY, point.y),
      }),
      {
        minX: Number.POSITIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
      },
    );
  }

  private getCount(
    area: number,
    density: number,
    divisor: number,
    min: number,
    max: number,
  ): number {
    return Math.max(min, Math.min(max, Math.round((area * density) / divisor)));
  }

  private distributePoints(bounds: Bounds, count: number): Point[] {
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
    const rows = Math.max(1, Math.ceil(count / columns));
    const points: Point[] = [];

    for (let index = 0; index < count; index += 1) {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = bounds.minX + ((column + 0.5) / columns) * width;
      const y = bounds.minY + ((row + 0.5) / rows) * height;
      points.push({ x, y });
    }

    return points;
  }
}
