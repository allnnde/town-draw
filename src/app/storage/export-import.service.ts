import { Injectable } from '@angular/core';
import {
  GENERATED_MAP_SCHEMA_VERSION,
  GeneratedMap,
  cloneGeneratedMap,
  emptyGeneratedMap,
} from '../map-model/generated-map.model';
import { GeneratedNonRoadObject } from '../map-model/generated-object.model';
import { MAP_PROJECT_VERSION, MapProject } from '../map-model/map-project.model';
import { Point } from '../map-model/point.model';
import { RoadBridge, RoadEdge, RoadNetwork, RoadNode } from '../map-model/road-network.model';
import { SketchObject, ZoneSketch } from '../map-model/sketch-object.model';
import { deriveZonePolygonFromBrushStamps } from '../map-model/brush-zone-polygon.util';
import { RoadNetworkValidator } from '../generation/road-network/road-network-validator';

@Injectable({ providedIn: 'root' })
export class ExportImportService {
  private readonly roadValidator = new RoadNetworkValidator();

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

    if (!this.isProjectShell(parsed)) {
      throw new Error('El archivo no tiene el formato de proyecto TownDraw esperado.');
    }

    const normalized = parsed.sketchObjects.map((object) =>
      this.normalizeSketchObject(object, parsed.width, parsed.height),
    );
    const coverageChanged = normalized.some((result) => result.changed);
    const generatedResult = this.normalizeGeneratedMap(parsed);
    const mustRegenerate = coverageChanged || generatedResult.changed;
    const notices = [
      ...(coverageChanged ? ['La geometria de zonas fue normalizada.'] : []),
      ...(generatedResult.notice ? [generatedResult.notice] : []),
    ];

    return {
      id: parsed.id,
      name: parsed.name,
      version: MAP_PROJECT_VERSION,
      width: parsed.width,
      height: parsed.height,
      sketchObjects: normalized.map((result) => result.object),
      generatedMap: mustRegenerate ? emptyGeneratedMap() : generatedResult.map,
      createdAt: parsed.createdAt,
      updatedAt: parsed.updatedAt,
      ...(notices.length > 0
        ? {
            migrationNotice: `${notices.join(' ')} Pulsa Generar mapa para reconstruir el resultado.`,
          }
        : {}),
    };
  }

  private normalizeGeneratedMap(project: ProjectShell): {
    map: GeneratedMap;
    changed: boolean;
    notice?: string;
  } {
    const value = project.generatedMap;

    if (this.isGeneratedMap(value)) {
      const violations = this.roadValidator.validate(value.roadNetwork, value.objects);

      if (violations.length === 0) {
        return { map: cloneGeneratedMap(value), changed: false };
      }

      return {
        map: emptyGeneratedMap(),
        changed: true,
        notice: 'La red generada guardada no cumple las invariantes actuales.',
      };
    }

    if (Array.isArray(project.generatedObjects)) {
      return {
        map: emptyGeneratedMap(),
        changed: true,
        notice: 'Los objetos generados del formato anterior fueron descartados.',
      };
    }

    return {
      map: emptyGeneratedMap(),
      changed: true,
      notice: 'La version de datos generados no es compatible.',
    };
  }

  private toFileName(name: string): string {
    const normalized = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    return normalized || 'town-draw-project';
  }

  private isProjectShell(value: unknown): value is ProjectShell {
    if (!this.isRecord(value)) {
      return false;
    }

    const sketchObjects = value['sketchObjects'];
    return (
      typeof value['id'] === 'string' &&
      typeof value['name'] === 'string' &&
      typeof value['version'] === 'number' &&
      typeof value['width'] === 'number' &&
      value['width'] > 0 &&
      typeof value['height'] === 'number' &&
      value['height'] > 0 &&
      Array.isArray(sketchObjects) &&
      sketchObjects.every((object) => this.isSketchObject(object)) &&
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
          this.hasValidZoneCoverage(value) &&
          (value['zoneType'] === 'village' ||
            value['zoneType'] === 'market' ||
            value['zoneType'] === 'forest' ||
            value['zoneType'] === 'industrial') &&
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

  private isGeneratedMap(value: unknown): value is GeneratedMap {
    if (
      !this.isRecord(value) ||
      value['schemaVersion'] !== GENERATED_MAP_SCHEMA_VERSION ||
      !this.isRoadNetwork(value['roadNetwork']) ||
      !Array.isArray(value['objects']) ||
      !value['objects'].every((object) => this.isGeneratedObject(object))
    ) {
      return false;
    }

    return true;
  }

  private isRoadNetwork(value: unknown): value is RoadNetwork {
    return (
      this.isRecord(value) &&
      Array.isArray(value['nodes']) &&
      value['nodes'].every((node) => this.isRoadNode(node)) &&
      Array.isArray(value['edges']) &&
      value['edges'].every((edge) => this.isRoadEdge(edge))
    );
  }

  private isRoadNode(value: unknown): value is RoadNode {
    return (
      this.isRecord(value) &&
      typeof value['id'] === 'string' &&
      this.isPoint(value['position']) &&
      (value['kind'] === 'endpoint' ||
        value['kind'] === 'junction' ||
        value['kind'] === 'portal' ||
        value['kind'] === 'bridge-endpoint') &&
      (value['districtId'] === undefined || typeof value['districtId'] === 'string')
    );
  }

  private isRoadEdge(value: unknown): value is RoadEdge {
    if (
      !this.isRecord(value) ||
      typeof value['id'] !== 'string' ||
      typeof value['fromNodeId'] !== 'string' ||
      typeof value['toNodeId'] !== 'string' ||
      !Array.isArray(value['points']) ||
      value['points'].length < 2 ||
      !value['points'].every((point) => this.isPoint(point)) ||
      typeof value['width'] !== 'number' ||
      !this.isRoadClass(value['roadClass']) ||
      !this.isRecord(value['source']) ||
      (value['source']['kind'] !== 'sketch' && value['source']['kind'] !== 'district') ||
      typeof value['source']['id'] !== 'string' ||
      (value['districtId'] !== undefined && typeof value['districtId'] !== 'string')
    ) {
      return false;
    }

    return (
      value['bridges'] === undefined ||
      (Array.isArray(value['bridges']) && value['bridges'].every((bridge) => this.isBridge(bridge)))
    );
  }

  private isBridge(value: unknown): value is RoadBridge {
    return (
      this.isRecord(value) &&
      typeof value['riverId'] === 'string' &&
      this.isPoint(value['position']) &&
      typeof value['width'] === 'number' &&
      typeof value['height'] === 'number' &&
      typeof value['angle'] === 'number'
    );
  }

  private isRoadClass(value: unknown): boolean {
    return (
      value === 'main' ||
      value === 'secondary' ||
      value === 'path' ||
      value === 'street' ||
      value === 'aisle' ||
      value === 'service-road'
    );
  }

  private isGeneratedObject(value: unknown): value is GeneratedNonRoadObject {
    if (
      !this.isRecord(value) ||
      typeof value['id'] !== 'string' ||
      typeof value['type'] !== 'string'
    ) {
      return false;
    }

    switch (value['type']) {
      case 'generated-river':
        return (
          Array.isArray(value['points']) &&
          value['points'].every((point) => this.isPoint(point)) &&
          typeof value['width'] === 'number'
        );
      case 'generated-tree':
        return this.isPoint(value['position']) && this.hasValidGeneratedVariation(value);
      case 'generated-building':
      case 'generated-market-stall':
      case 'generated-industrial-structure':
        return (
          this.isPoint(value['position']) &&
          typeof value['width'] === 'number' &&
          typeof value['height'] === 'number' &&
          this.hasValidGeneratedVariation(value)
        );
      default:
        return false;
    }
  }

  private isPoint(value: unknown): value is Point {
    return this.isRecord(value) && typeof value['x'] === 'number' && typeof value['y'] === 'number';
  }

  private normalizeSketchObject(
    object: SketchObject,
    mapWidth: number,
    mapHeight: number,
  ): { object: SketchObject; changed: boolean } {
    if (object.type !== 'zone') {
      return { object, changed: false };
    }

    return this.normalizeZoneCoverage(object, mapWidth, mapHeight);
  }

  private normalizeZoneCoverage(
    zone: ZoneSketch,
    mapWidth: number,
    mapHeight: number,
  ): { object: ZoneSketch; changed: boolean } {
    const sourcePolygon =
      zone.polygon && zone.polygon.length >= 3
        ? zone.polygon
        : deriveZonePolygonFromBrushStamps(zone.brushStamps ?? []);
    const polygon = sourcePolygon.map((point) => this.clampPointToMap(point, mapWidth, mapHeight));
    const changed =
      zone.brushStamps !== undefined ||
      sourcePolygon !== zone.polygon ||
      polygon.some(
        (point, index) => point.x !== sourcePolygon[index].x || point.y !== sourcePolygon[index].y,
      );
    return {
      object: {
        id: zone.id,
        type: 'zone',
        zoneType: zone.zoneType,
        polygon,
        density: zone.density,
      },
      changed,
    };
  }

  private clampPointToMap(point: Point, mapWidth: number, mapHeight: number): Point {
    return {
      x: Math.max(0, Math.min(mapWidth, point.x)),
      y: Math.max(0, Math.min(mapHeight, point.y)),
    };
  }

  private hasValidZoneCoverage(value: Record<string, unknown>): boolean {
    const polygon = value['polygon'];
    const brushStamps = value['brushStamps'];
    const hasPolygon =
      Array.isArray(polygon) &&
      polygon.length >= 3 &&
      polygon.every((point) => this.isPoint(point));
    const hasBrushStamps =
      Array.isArray(brushStamps) &&
      brushStamps.length > 0 &&
      brushStamps.every(
        (stamp) =>
          this.isRecord(stamp) &&
          this.isPoint(stamp['position']) &&
          typeof stamp['radius'] === 'number',
      );
    return hasPolygon || hasBrushStamps;
  }

  private hasValidGeneratedVariation(value: Record<string, unknown>): boolean {
    return (
      (value['rotation'] === undefined || typeof value['rotation'] === 'number') &&
      (value['variant'] === undefined || typeof value['variant'] === 'number')
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}

interface ProjectShell {
  id: string;
  name: string;
  version: number;
  width: number;
  height: number;
  sketchObjects: SketchObject[];
  generatedMap?: unknown;
  generatedObjects?: unknown;
  createdAt: string;
  updatedAt: string;
}
