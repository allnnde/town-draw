import { Injectable } from '@angular/core';
import { GeneratedMapObject } from '../map-model/generated-object.model';
import { MapProject } from '../map-model/map-project.model';
import { Point } from '../map-model/point.model';
import { SketchObject } from '../map-model/sketch-object.model';

@Injectable({ providedIn: 'root' })
export class ExportImportService {
  exportProject(project: MapProject): void {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${this.toFileName(project.name)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async importProject(file: File): Promise<MapProject> {
    const contents = await file.text();
    const parsed = JSON.parse(contents) as unknown;

    if (!this.isMapProject(parsed)) {
      throw new Error('El archivo no tiene el formato de proyecto TownDraw esperado.');
    }

    return parsed;
  }

  private toFileName(name: string): string {
    const normalized = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    return normalized || 'town-draw-project';
  }

  private isMapProject(value: unknown): value is MapProject {
    if (!this.isRecord(value)) {
      return false;
    }

    const sketchObjects = value['sketchObjects'];
    const generatedObjects = value['generatedObjects'];

    return (
      typeof value['id'] === 'string' &&
      typeof value['name'] === 'string' &&
      typeof value['version'] === 'number' &&
      typeof value['width'] === 'number' &&
      typeof value['height'] === 'number' &&
      Array.isArray(sketchObjects) &&
      sketchObjects.every((object) => this.isSketchObject(object)) &&
      Array.isArray(generatedObjects) &&
      generatedObjects.every((object) => this.isGeneratedObject(object)) &&
      typeof value['createdAt'] === 'string' &&
      typeof value['updatedAt'] === 'string'
    );
  }

  private isSketchObject(value: unknown): value is SketchObject {
    if (
      !this.isRecord(value) ||
      typeof value['id'] !== 'string' ||
      typeof value['type'] !== 'string'
    ) {
      return false;
    }

    switch (value['type']) {
      case 'river':
        return (
          Array.isArray(value['points']) &&
          value['points'].every((point) => this.isPoint(point)) &&
          typeof value['width'] === 'number'
        );
      case 'road':
        return (
          Array.isArray(value['points']) &&
          value['points'].every((point) => this.isPoint(point)) &&
          (value['roadType'] === 'main' ||
            value['roadType'] === 'secondary' ||
            value['roadType'] === 'path')
        );
      case 'zone':
        return (
          Array.isArray(value['polygon']) &&
          value['polygon'].every((point) => this.isPoint(point)) &&
          (value['zoneType'] === 'village' ||
            value['zoneType'] === 'market' ||
            value['zoneType'] === 'forest') &&
          typeof value['density'] === 'number'
        );
      case 'marker':
        return (
          this.isPoint(value['position']) &&
          (value['markerType'] === 'bridge' ||
            value['markerType'] === 'gate' ||
            value['markerType'] === 'tower' ||
            value['markerType'] === 'poi')
        );
      default:
        return false;
    }
  }

  private isGeneratedObject(value: unknown): value is GeneratedMapObject {
    if (
      !this.isRecord(value) ||
      typeof value['id'] !== 'string' ||
      typeof value['type'] !== 'string'
    ) {
      return false;
    }

    switch (value['type']) {
      case 'generated-river':
      case 'generated-road':
        return (
          Array.isArray(value['points']) &&
          value['points'].every((point) => this.isPoint(point)) &&
          typeof value['width'] === 'number'
        );
      case 'generated-tree':
        return this.isPoint(value['position']);
      case 'generated-building':
      case 'generated-market-stall':
        return (
          this.isPoint(value['position']) &&
          typeof value['width'] === 'number' &&
          typeof value['height'] === 'number'
        );
      default:
        return false;
    }
  }

  private isPoint(value: unknown): value is Point {
    return this.isRecord(value) && typeof value['x'] === 'number' && typeof value['y'] === 'number';
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
