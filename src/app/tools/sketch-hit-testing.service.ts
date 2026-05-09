import { Injectable } from '@angular/core';
import { Point } from '../map-model/point.model';
import { SketchObject } from '../map-model/sketch-object.model';

const DEFAULT_TOLERANCE = 12;

@Injectable({ providedIn: 'root' })
export class SketchHitTestingService {
  findObjectAt(
    point: Point,
    objects: readonly SketchObject[],
    tolerance = DEFAULT_TOLERANCE,
  ): SketchObject | null {
    for (let index = objects.length - 1; index >= 0; index -= 1) {
      const object = objects[index];

      if (this.isPointNearObject(point, object, tolerance)) {
        return object;
      }
    }

    return null;
  }

  private isPointNearObject(point: Point, object: SketchObject, tolerance: number): boolean {
    switch (object.type) {
      case 'river':
        return this.isPointNearPolyline(point, object.points, tolerance + object.width / 2);
      case 'road':
        return this.isPointNearPolyline(point, object.points, tolerance + 4);
      case 'zone':
        return (
          this.isPointInsidePolygon(point, object.polygon) ||
          this.isPointNearPolyline(point, [...object.polygon, object.polygon[0]], tolerance)
        );
      case 'marker':
        return this.distance(point, object.position) <= tolerance;
    }
  }

  private isPointNearPolyline(point: Point, points: readonly Point[], tolerance: number): boolean {
    if (points.length === 0) {
      return false;
    }

    if (points.length === 1) {
      return this.distance(point, points[0]) <= tolerance;
    }

    for (let index = 0; index < points.length - 1; index += 1) {
      if (this.distanceToSegment(point, points[index], points[index + 1]) <= tolerance) {
        return true;
      }
    }

    return false;
  }

  private isPointInsidePolygon(point: Point, polygon: readonly Point[]): boolean {
    let inside = false;

    for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index) {
      const currentPoint = polygon[index];
      const previousPoint = polygon[previous];
      const crossesY = currentPoint.y > point.y !== previousPoint.y > point.y;
      const intersectionX =
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
        currentPoint.x;

      if (crossesY && point.x < intersectionX) {
        inside = !inside;
      }
    }

    return inside;
  }

  private distanceToSegment(point: Point, start: Point, end: Point): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
      return this.distance(point, start);
    }

    const t = Math.max(
      0,
      Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared),
    );

    return this.distance(point, { x: start.x + t * dx, y: start.y + t * dy });
  }

  private distance(first: Point, second: Point): number {
    return Math.hypot(first.x - second.x, first.y - second.y);
  }
}
