import { Injectable } from '@angular/core';
import { GeneratedMapObject } from '../map-model/generated-object.model';
import { clonePoint, Point } from '../map-model/point.model';
import {
  RoadSketch,
  RiverSketch,
  SketchObject,
  ZoneSketch,
} from '../map-model/sketch-object.model';
import { Bounds, getZoneBounds, isPointInZoneCoverage } from '../map-model/zone-coverage.util';

interface IndexedRiver {
  object: RiverSketch;
  index: number;
}

interface IndexedRoad {
  object: RoadSketch;
  index: number;
}

interface IndexedZone {
  object: ZoneSketch;
  index: number;
}

type GeneratedInternalPathObject = Extract<GeneratedMapObject, { type: 'generated-internal-path' }>;

interface SpacedPoint {
  position: Point;
  spacing: number;
}

interface BridgeCandidate {
  position: Point;
  angle: number;
}

@Injectable({ providedIn: 'root' })
export class MapGeneratorService {
  generate(sketchObjects: readonly SketchObject[]): GeneratedMapObject[] {
    const generated: GeneratedMapObject[] = [];
    const rivers = this.getIndexedRivers(sketchObjects);
    const roads = this.getIndexedRoads(sketchObjects);
    const zones = this.getIndexedZones(sketchObjects);

    for (const river of rivers) {
      generated.push({
        id: `generated-${river.object.id}`,
        type: 'generated-river',
        points: river.object.points.map(clonePoint),
        width: river.object.width + 8,
      });
    }

    for (const road of roads) {
      generated.push(...this.generateRoadObjects(road, rivers));
    }

    for (const zone of zones) {
      generated.push(...this.generateZoneObjects(zone, zones, rivers));
    }

    return generated;
  }

  private getIndexedRivers(sketchObjects: readonly SketchObject[]): IndexedRiver[] {
    return sketchObjects.flatMap((object, index) =>
      object.type === 'river' ? [{ object, index }] : [],
    );
  }

  private getIndexedRoads(sketchObjects: readonly SketchObject[]): IndexedRoad[] {
    return sketchObjects.flatMap((object, index) =>
      object.type === 'road' ? [{ object, index }] : [],
    );
  }

  private getIndexedZones(sketchObjects: readonly SketchObject[]): IndexedZone[] {
    return sketchObjects.flatMap((object, index) =>
      object.type === 'zone' ? [{ object, index }] : [],
    );
  }

  private generateRoadObjects(
    road: IndexedRoad,
    rivers: readonly IndexedRiver[],
  ): GeneratedMapObject[] {
    const generated: GeneratedMapObject[] = [];
    const earlierRivers = rivers.filter((river) => river.index < road.index);
    const laterRivers = rivers.filter((river) => river.index > road.index);
    const roadChunks = this.splitRoadByLaterRivers(road.object, laterRivers);

    for (const [index, points] of roadChunks.entries()) {
      if (points.length < 2) {
        continue;
      }

      generated.push({
        id: `generated-${road.object.id}-${index}`,
        type: 'generated-road',
        points: points.map(clonePoint),
        width: road.object.roadType === 'main' ? 10 : road.object.roadType === 'secondary' ? 7 : 4,
      });
    }

    for (const [index, bridge] of this.findBridgeCandidates(road.object, earlierRivers).entries()) {
      generated.push({
        id: `generated-${road.object.id}-bridge-${index}`,
        type: 'generated-bridge',
        position: bridge.position,
        width: 32,
        height: 14,
        angle: bridge.angle,
      });
    }

    return generated;
  }

  private generateZoneObjects(
    zone: IndexedZone,
    zones: readonly IndexedZone[],
    rivers: readonly IndexedRiver[],
  ): GeneratedMapObject[] {
    const bounds = getZoneBounds(zone.object);

    if (!bounds) {
      return [];
    }

    const area = Math.max(1, (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY));

    switch (zone.object.zoneType) {
      case 'forest': {
        const trees = this.getOrganicPoints(
          zone,
          zones,
          rivers,
          this.getCount(area, zone.object.density, 950, 8, 58),
          20,
        ).map((position, index) => ({
          id: `generated-${zone.object.id}-tree-${index}`,
          type: 'generated-tree' as const,
          position,
        }));

        return trees;
      }
      case 'village': {
        const streets = this.generateAreaPaths(zone, zones, rivers, 'street');
        const buildings = this.getOrganicPoints(
          zone,
          zones,
          rivers,
          this.getCount(area, zone.object.density, 1850, 4, 30),
          38,
          streets,
          18,
        ).map((position, index) => ({
          id: `generated-${zone.object.id}-building-${index}`,
          type: 'generated-building' as const,
          position,
          width: 22 + (index % 3) * 4,
          height: 18 + (index % 2) * 5,
        }));

        return [...streets, ...buildings];
      }
      case 'market': {
        const aisles = this.generateAreaPaths(zone, zones, rivers, 'aisle');
        const stalls = this.getOrganicPoints(
          zone,
          zones,
          rivers,
          this.getCount(area, zone.object.density, 1350, 5, 34),
          26,
          aisles,
          12,
        ).map((position, index) => ({
          id: `generated-${zone.object.id}-stall-${index}`,
          type: 'generated-market-stall' as const,
          position,
          width: 17 + (index % 2) * 4,
          height: 12 + (index % 3) * 2,
        }));

        return [...aisles, ...stalls];
      }
      case 'industrial': {
        const serviceRoads = this.generateAreaPaths(zone, zones, rivers, 'service-road');
        const structures = this.getOrganicPoints(
          zone,
          zones,
          rivers,
          this.getCount(area, zone.object.density, 2600, 3, 18),
          44,
          serviceRoads,
          24,
        ).map((position, index) => ({
          id: `generated-${zone.object.id}-industrial-${index}`,
          type: 'generated-industrial-structure' as const,
          position,
          width: 34 + (index % 3) * 8,
          height: 24 + (index % 2) * 8,
        }));

        return [...serviceRoads, ...structures];
      }
    }
  }

  private getOrganicPoints(
    zone: IndexedZone,
    zones: readonly IndexedZone[],
    rivers: readonly IndexedRiver[],
    count: number,
    minimumSpacing: number,
    blockedPaths: readonly GeneratedInternalPathObject[] = [],
    pathClearance = 0,
  ): Point[] {
    const bounds = getZoneBounds(zone.object);

    if (!bounds) {
      return [];
    }

    const random = this.createRandom(`${zone.object.id}:${zone.index}:${zone.object.zoneType}`);
    const points: SpacedPoint[] = [];
    const spacingPasses = [1, 0.78, 0.62];

    for (const spacingScale of spacingPasses) {
      const maxAttempts = Math.max(120, count * 100);

      for (let attempt = 0; attempt < maxAttempts && points.length < count; attempt += 1) {
        const candidate = {
          x: bounds.minX + random() * (bounds.maxX - bounds.minX),
          y: bounds.minY + random() * (bounds.maxY - bounds.minY),
        };
        const candidateSpacing = minimumSpacing * spacingScale * (0.78 + random() * 0.72);

        if (
          this.isEligibleZonePoint(candidate, zone, zones, rivers) &&
          this.isPointClearOfPaths(candidate, blockedPaths, pathClearance) &&
          points.every(
            (point) =>
              this.distance(point.position, candidate) >=
              Math.max(minimumSpacing * 0.7, Math.min(point.spacing, candidateSpacing)),
          )
        ) {
          points.push({ position: candidate, spacing: candidateSpacing });
        }
      }
    }

    return points.map((point) => point.position);
  }

  private isEligibleZonePoint(
    point: Point,
    zone: IndexedZone,
    zones: readonly IndexedZone[],
    rivers: readonly IndexedRiver[],
  ): boolean {
    return (
      this.getEffectiveZoneAt(point, zones)?.object.id === zone.object.id &&
      !this.isPointInRiverCoverage(point, rivers)
    );
  }

  private getEffectiveZoneAt(point: Point, zones: readonly IndexedZone[]): IndexedZone | null {
    let winner: IndexedZone | null = null;

    for (const zone of zones) {
      if (isPointInZoneCoverage(point, zone.object)) {
        winner = zone;
      }
    }

    return winner;
  }

  private generateAreaPaths(
    zone: IndexedZone,
    zones: readonly IndexedZone[],
    rivers: readonly IndexedRiver[],
    pathType: GeneratedInternalPathObject['pathType'],
  ): GeneratedInternalPathObject[] {
    const bounds = getZoneBounds(zone.object);

    if (!bounds) {
      return [];
    }

    const random = this.createRandom(`${zone.object.id}:${zone.index}:${pathType}:area-paths`);
    const paths: GeneratedInternalPathObject[] = [];
    const width = this.getInternalPathWidth(pathType);
    const spacing = this.getInternalPathSpacing(pathType);
    const scanStep = Math.max(10, width + 4);
    const minLength = pathType === 'street' ? 44 : pathType === 'service-road' ? 52 : 32;
    const horizontalLines = this.getAreaLineCount(bounds.maxY - bounds.minY, spacing, 4);
    const verticalLines = this.getAreaLineCount(bounds.maxX - bounds.minX, spacing * 1.15, 3);

    for (let index = 0; index < horizontalLines; index += 1) {
      if (index > 0 && random() < 0.28) {
        continue;
      }

      const y = this.getAreaLineCoordinate(
        bounds.minY,
        bounds.maxY,
        index,
        horizontalLines,
        random,
      );
      paths.push(
        ...this.createPathObjectsFromChunks(
          zone.object.id,
          pathType,
          paths.length,
          this.getAreaPathChunks(zone, zones, rivers, bounds, 'horizontal', y, scanStep, minLength),
          width,
        ),
      );
    }

    for (let index = 0; index < verticalLines; index += 1) {
      if (index > 0 && random() < 0.42) {
        continue;
      }

      const x = this.getAreaLineCoordinate(bounds.minX, bounds.maxX, index, verticalLines, random);
      paths.push(
        ...this.createPathObjectsFromChunks(
          zone.object.id,
          pathType,
          paths.length,
          this.getAreaPathChunks(zone, zones, rivers, bounds, 'vertical', x, scanStep, minLength),
          width,
        ),
      );
    }

    if (paths.length === 0) {
      const y = (bounds.minY + bounds.maxY) / 2;
      paths.push(
        ...this.createPathObjectsFromChunks(
          zone.object.id,
          pathType,
          0,
          this.getAreaPathChunks(zone, zones, rivers, bounds, 'horizontal', y, scanStep, minLength),
          width,
        ),
      );
    }

    return paths;
  }

  private createPathObjectsFromChunks(
    zoneId: string,
    pathType: GeneratedInternalPathObject['pathType'],
    startIndex: number,
    chunks: readonly Point[][],
    width: number,
  ): GeneratedInternalPathObject[] {
    return chunks.map((points, index) => ({
      id: `generated-${zoneId}-${pathType}-${startIndex + index}`,
      type: 'generated-internal-path',
      points: points.map(clonePoint),
      width,
      pathType,
    }));
  }

  private getAreaPathChunks(
    zone: IndexedZone,
    zones: readonly IndexedZone[],
    rivers: readonly IndexedRiver[],
    bounds: Bounds,
    axis: 'horizontal' | 'vertical',
    fixedCoordinate: number,
    scanStep: number,
    minLength: number,
  ): Point[][] {
    const chunks: Point[][] = [];
    let chunk: Point[] = [];
    const start = axis === 'horizontal' ? bounds.minX : bounds.minY;
    const end = axis === 'horizontal' ? bounds.maxX : bounds.maxY;

    for (let value = start; value <= end; value += scanStep) {
      const point =
        axis === 'horizontal' ? { x: value, y: fixedCoordinate } : { x: fixedCoordinate, y: value };

      if (this.isEligibleZonePoint(point, zone, zones, rivers)) {
        chunk.push(point);
      } else {
        this.addPathChunk(chunks, chunk, minLength, rivers);
        chunk = [];
      }
    }

    this.addPathChunk(chunks, chunk, minLength, rivers);

    return chunks;
  }

  private addPathChunk(
    chunks: Point[][],
    chunk: readonly Point[],
    minLength: number,
    rivers: readonly IndexedRiver[],
  ): void {
    if (chunk.length < 2) {
      return;
    }

    const start = chunk[0];
    const end = chunk[chunk.length - 1];

    if (
      this.distance(start, end) < minLength ||
      this.isSegmentBlockedByRivers(start, end, rivers)
    ) {
      return;
    }

    chunks.push([clonePoint(start), clonePoint(end)]);
  }

  private getAreaLineCount(length: number, spacing: number, maxLines: number): number {
    return Math.max(1, Math.min(maxLines, Math.floor(length / spacing)));
  }

  private getAreaLineCoordinate(
    min: number,
    max: number,
    index: number,
    count: number,
    random: () => number,
  ): number {
    const band = (max - min) / (count + 1);

    return min + band * (index + 1) + (random() - 0.5) * band * 0.55;
  }

  private getInternalPathWidth(pathType: GeneratedInternalPathObject['pathType']): number {
    switch (pathType) {
      case 'street':
        return 10;
      case 'aisle':
        return 6;
      case 'service-road':
        return 10;
    }
  }

  private getInternalPathSpacing(pathType: GeneratedInternalPathObject['pathType']): number {
    switch (pathType) {
      case 'street':
        return 58;
      case 'aisle':
        return 42;
      case 'service-road':
        return 72;
    }
  }

  private isPointClearOfPaths(
    point: Point,
    paths: readonly GeneratedInternalPathObject[],
    clearance: number,
  ): boolean {
    return paths.every(
      (path) => this.distanceToPolyline(point, path.points) > path.width / 2 + clearance,
    );
  }

  private splitRoadByLaterRivers(
    road: RoadSketch,
    laterRivers: readonly IndexedRiver[],
  ): Point[][] {
    if (road.points.length < 2) {
      return [];
    }

    const chunks: Point[][] = [];
    let currentChunk: Point[] = [clonePoint(road.points[0])];

    for (let index = 0; index < road.points.length - 1; index += 1) {
      const start = road.points[index];
      const end = road.points[index + 1];

      if (this.isSegmentBlockedByRivers(start, end, laterRivers)) {
        if (currentChunk.length >= 2) {
          chunks.push(currentChunk);
        }

        currentChunk = [clonePoint(end)];
      } else {
        currentChunk.push(clonePoint(end));
      }
    }

    if (currentChunk.length >= 2) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  private findBridgeCandidates(
    road: RoadSketch,
    earlierRivers: readonly IndexedRiver[],
  ): BridgeCandidate[] {
    const candidates: BridgeCandidate[] = [];

    for (let roadIndex = 0; roadIndex < road.points.length - 1; roadIndex += 1) {
      const start = road.points[roadIndex];
      const end = road.points[roadIndex + 1];

      for (const river of earlierRivers) {
        if (!this.isRoadSegmentNearRiver(start, end, river.object)) {
          continue;
        }

        const position = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };

        if (candidates.every((candidate) => this.distance(candidate.position, position) > 28)) {
          candidates.push({
            position,
            angle: Math.atan2(end.y - start.y, end.x - start.x),
          });
        }
      }
    }

    return candidates;
  }

  private isSegmentBlockedByRivers(
    start: Point,
    end: Point,
    rivers: readonly IndexedRiver[],
  ): boolean {
    return rivers.some((river) => this.isRoadSegmentNearRiver(start, end, river.object));
  }

  private isRoadSegmentNearRiver(start: Point, end: Point, river: RiverSketch): boolean {
    for (let index = 0; index < river.points.length - 1; index += 1) {
      const riverStart = river.points[index];
      const riverEnd = river.points[index + 1];
      const tolerance = river.width / 2 + 5;

      if (this.segmentToSegmentDistance(start, end, riverStart, riverEnd) <= tolerance) {
        return true;
      }
    }

    return false;
  }

  private isPointInRiverCoverage(point: Point, rivers: readonly IndexedRiver[]): boolean {
    return rivers.some(
      (river) => this.distanceToPolyline(point, river.object.points) <= river.object.width / 2 + 6,
    );
  }

  private distanceToPolyline(point: Point, points: readonly Point[]): number {
    if (points.length === 0) {
      return Number.POSITIVE_INFINITY;
    }

    if (points.length === 1) {
      return this.distance(point, points[0]);
    }

    let closest = Number.POSITIVE_INFINITY;

    for (let index = 0; index < points.length - 1; index += 1) {
      closest = Math.min(closest, this.distanceToSegment(point, points[index], points[index + 1]));
    }

    return closest;
  }

  private segmentToSegmentDistance(
    firstStart: Point,
    firstEnd: Point,
    secondStart: Point,
    secondEnd: Point,
  ): number {
    if (this.segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd)) {
      return 0;
    }

    return Math.min(
      this.distanceToSegment(firstStart, secondStart, secondEnd),
      this.distanceToSegment(firstEnd, secondStart, secondEnd),
      this.distanceToSegment(secondStart, firstStart, firstEnd),
      this.distanceToSegment(secondEnd, firstStart, firstEnd),
    );
  }

  private segmentsIntersect(
    firstStart: Point,
    firstEnd: Point,
    secondStart: Point,
    secondEnd: Point,
  ): boolean {
    const d1 = this.direction(secondStart, secondEnd, firstStart);
    const d2 = this.direction(secondStart, secondEnd, firstEnd);
    const d3 = this.direction(firstStart, firstEnd, secondStart);
    const d4 = this.direction(firstStart, firstEnd, secondEnd);

    return d1 * d2 < 0 && d3 * d4 < 0;
  }

  private direction(start: Point, end: Point, point: Point): number {
    return (point.x - start.x) * (end.y - start.y) - (point.y - start.y) * (end.x - start.x);
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

  private getCount(
    area: number,
    density: number,
    divisor: number,
    min: number,
    max: number,
  ): number {
    return Math.max(min, Math.min(max, Math.round((area * density) / divisor)));
  }

  private createRandom(seedText: string): () => number {
    let seed = this.hashString(seedText);

    return () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
  }

  private hashString(value: string): number {
    let hash = 2166136261;

    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
  }
}
