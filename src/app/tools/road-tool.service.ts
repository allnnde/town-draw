import { Injectable, inject } from '@angular/core';
import { EditorStateService } from '../editor/services/editor-state.service';
import { createId } from '../map-model/id.util';
import { clonePoint, Point } from '../map-model/point.model';
import { RoadSketch } from '../map-model/sketch-object.model';
import { ToolPointerEvent } from './tool-pointer-event.model';

@Injectable({ providedIn: 'root' })
export class RoadToolService {
  private readonly state = inject(EditorStateService);
  private points: Point[] = [];
  private drawingPointerId: number | null = null;

  onPointerDown(event: ToolPointerEvent): void {
    this.drawingPointerId = event.pointerId;
    this.points = [clonePoint(event.position)];
    this.updateDraft();
  }

  onPointerMove(event: ToolPointerEvent): void {
    if (this.drawingPointerId !== event.pointerId) {
      return;
    }

    this.addPointIfFarEnough(event.position);
    this.updateDraft();
  }

  onPointerUp(event: ToolPointerEvent): void {
    if (this.drawingPointerId !== event.pointerId) {
      return;
    }

    this.addPointIfFarEnough(event.position, 0);
    this.state.setDraftSketchObject(null);

    if (this.points.length >= 2) {
      const road: RoadSketch = {
        id: createId('road'),
        type: 'road',
        points: this.points.map(clonePoint),
        roadType: 'secondary',
      };

      this.state.addSketchObject(road);
      this.state.selectObject(road.id);
    }

    this.reset();
  }

  private addPointIfFarEnough(point: Point, minimumDistance = 3): void {
    const lastPoint = this.points.at(-1);

    if (!lastPoint || Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y) >= minimumDistance) {
      this.points.push(clonePoint(point));
    }
  }

  private reset(): void {
    this.points = [];
    this.drawingPointerId = null;
  }

  private updateDraft(): void {
    if (this.points.length < 2) {
      this.state.setDraftSketchObject(null);
      return;
    }

    this.state.setDraftSketchObject({
      id: 'draft-road',
      type: 'road',
      points: this.points.map(clonePoint),
      roadType: 'secondary',
    });
  }
}
