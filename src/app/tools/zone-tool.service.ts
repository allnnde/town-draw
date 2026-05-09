import { Injectable, inject } from '@angular/core';
import { EditorStateService } from '../editor/services/editor-state.service';
import { EditorTool } from '../map-model/editor-tool.model';
import { createId } from '../map-model/id.util';
import { clonePoint, Point } from '../map-model/point.model';
import { ZoneSketch, ZoneType } from '../map-model/sketch-object.model';
import { ToolPointerEvent } from './tool-pointer-event.model';

@Injectable({ providedIn: 'root' })
export class ZoneToolService {
  private readonly state = inject(EditorStateService);
  private startPoint: Point | null = null;
  private drawingPointerId: number | null = null;
  private zoneType: ZoneType = 'village';

  onPointerDown(event: ToolPointerEvent, tool: EditorTool): void {
    this.zoneType = this.getZoneType(tool);
    this.drawingPointerId = event.pointerId;
    this.startPoint = clonePoint(event.position);
    this.updateDraft(event.position);
  }

  onPointerMove(event: ToolPointerEvent): void {
    if (!this.startPoint || this.drawingPointerId !== event.pointerId) {
      return;
    }

    this.updateDraft(event.position);
  }

  onPointerUp(event: ToolPointerEvent): void {
    if (!this.startPoint || this.drawingPointerId !== event.pointerId) {
      return;
    }

    this.state.setDraftSketchObject(null);
    const minX = Math.min(this.startPoint.x, event.position.x);
    const minY = Math.min(this.startPoint.y, event.position.y);
    const maxX = Math.max(this.startPoint.x, event.position.x);
    const maxY = Math.max(this.startPoint.y, event.position.y);

    if (maxX - minX >= 8 && maxY - minY >= 8) {
      const zone: ZoneSketch = {
        id: createId(`zone-${this.zoneType}`),
        type: 'zone',
        zoneType: this.zoneType,
        polygon: [
          { x: minX, y: minY },
          { x: maxX, y: minY },
          { x: maxX, y: maxY },
          { x: minX, y: maxY },
        ],
        density: this.getDefaultDensity(this.zoneType),
      };

      this.state.addSketchObject(zone);
      this.state.selectObject(zone.id);
    }

    this.reset();
  }

  private getZoneType(tool: EditorTool): ZoneType {
    switch (tool) {
      case 'zone-market':
        return 'market';
      case 'zone-forest':
        return 'forest';
      case 'zone-village':
      case 'select':
      case 'river':
      case 'road':
      case 'erase':
        return 'village';
    }
  }

  private getDefaultDensity(zoneType: ZoneType): number {
    switch (zoneType) {
      case 'forest':
        return 0.75;
      case 'market':
        return 0.55;
      case 'village':
        return 0.5;
    }
  }

  private reset(): void {
    this.startPoint = null;
    this.drawingPointerId = null;
  }

  private updateDraft(currentPoint: Point): void {
    if (!this.startPoint) {
      this.state.setDraftSketchObject(null);
      return;
    }

    const minX = Math.min(this.startPoint.x, currentPoint.x);
    const minY = Math.min(this.startPoint.y, currentPoint.y);
    const maxX = Math.max(this.startPoint.x, currentPoint.x);
    const maxY = Math.max(this.startPoint.y, currentPoint.y);

    if (maxX - minX < 2 || maxY - minY < 2) {
      this.state.setDraftSketchObject(null);
      return;
    }

    this.state.setDraftSketchObject({
      id: `draft-zone-${this.zoneType}`,
      type: 'zone',
      zoneType: this.zoneType,
      polygon: [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
      ],
      density: this.getDefaultDensity(this.zoneType),
    });
  }
}
