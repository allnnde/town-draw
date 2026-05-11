import { Injectable, inject } from '@angular/core';
import { EditorStateService } from '../editor/services/editor-state.service';
import { EditorTool } from '../map-model/editor-tool.model';
import { createId } from '../map-model/id.util';
import { clonePoint, Point } from '../map-model/point.model';
import { ZoneSketch, ZoneType } from '../map-model/sketch-object.model';
import { deriveZonePolygonFromBrushStamps } from '../map-model/brush-zone-polygon.util';
import {
  DEFAULT_ZONE_BRUSH_RADIUS,
  ZONE_BRUSH_MIN_DISTANCE,
  distance,
} from '../map-model/zone-coverage.util';
import { ToolPointerEvent } from './tool-pointer-event.model';

@Injectable({ providedIn: 'root' })
export class ZoneToolService {
  private readonly state = inject(EditorStateService);
  private brushStamps: { position: Point; radius: number }[] = [];
  private drawingPointerId: number | null = null;
  private zoneType: ZoneType = 'village';
  private readonly brushRadius = DEFAULT_ZONE_BRUSH_RADIUS;

  onPointerDown(event: ToolPointerEvent, tool: EditorTool): void {
    this.zoneType = this.getZoneType(tool);
    this.drawingPointerId = event.pointerId;
    this.brushStamps = [];
    this.addStamp(event.position, 0);
    this.updateDraft();
  }

  onPointerMove(event: ToolPointerEvent): void {
    if (this.drawingPointerId !== event.pointerId) {
      return;
    }

    if (this.addStamp(event.position)) {
      this.updateDraft();
    }
  }

  onPointerUp(event: ToolPointerEvent): void {
    if (this.drawingPointerId !== event.pointerId) {
      return;
    }

    this.addStamp(event.position, 0);
    this.state.setDraftSketchObject(null);

    if (this.brushStamps.length > 0) {
      const polygon = deriveZonePolygonFromBrushStamps(this.brushStamps);
      const zone: ZoneSketch = {
        id: createId(`zone-${this.zoneType}`),
        type: 'zone',
        zoneType: this.zoneType,
        polygon,
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
      case 'zone-industrial':
        return 'industrial';
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
      case 'industrial':
        return 0.45;
      case 'village':
        return 0.5;
    }
  }

  private reset(): void {
    this.brushStamps = [];
    this.drawingPointerId = null;
  }

  private updateDraft(): void {
    this.state.setDraftSketchObject({
      id: `draft-zone-${this.zoneType}`,
      type: 'zone',
      zoneType: this.zoneType,
      brushStamps: this.brushStamps.map((stamp) => ({
        position: clonePoint(stamp.position),
        radius: stamp.radius,
      })),
      density: this.getDefaultDensity(this.zoneType),
    });
  }

  private addStamp(point: Point, minimumDistance = ZONE_BRUSH_MIN_DISTANCE): boolean {
    const effectiveMinimumDistance = Math.max(1, minimumDistance);

    if (
      this.brushStamps.some((stamp) => distance(point, stamp.position) < effectiveMinimumDistance)
    ) {
      return false;
    }

    this.brushStamps.push({ position: clonePoint(point), radius: this.brushRadius });
    return true;
  }
}
