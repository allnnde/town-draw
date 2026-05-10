import { Injectable } from '@angular/core';
import { GeneratedMapObject } from '../map-model/generated-object.model';
import { clonePoint, Point } from '../map-model/point.model';
import {
  RoadSketch,
  RiverSketch,
  SketchObject,
  ZoneSketch,
  ZoneType,
} from '../map-model/sketch-object.model';
import { Bounds, getZoneBounds, isPointInZoneCoverage } from '../map-model/zone-coverage.util';

type GeneratedInternalPathObject = Extract<GeneratedMapObject, { type: 'generated-internal-path' }>;
type GeneratedRoadObject = Extract<GeneratedMapObject, { type: 'generated-road' }>;

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

interface BridgeCandidate {
  position: Point;
  angle: number;
}

interface LayoutParams {
  countDivisor: number;
  minCount: number;
  maxCount: number;
  minSpacing: number;
  spacingVariance: number;
  objectWidth: readonly [number, number];
  objectHeight: readonly [number, number];
  pathWidth: number;
  pathSpacing: number;
  pathClearance: number;
  roadClearance: number;
  waterClearance: number;
  maxMainPaths: number;
  maxBranches: number;
  minPathLength: number;
  rotationVariance: number;
  variantCount: number;
}

interface GeneratedPlacement {
  position: Point;
  width: number;
  height: number;
  rotation: number;
  variant: number;
  spacing: number;
}

interface RoadGuide {
  point: Point;
  distance: number;
  angle: number;
  width: number;
}

const LAYOUT_PARAMS: Record<ZoneType, LayoutParams> = {
  forest: {
    countDivisor: 900,
    minCount: 8,
    maxCount: 72,
    minSpacing: 18,
    spacingVariance: 0.65,
    objectWidth: [10, 16],
    objectHeight: [10, 16],
    pathWidth: 0,
    pathSpacing: 0,
    pathClearance: 0,
    roadClearance: 8,
    waterClearance: 14,
    maxMainPaths: 0,
    maxBranches: 0,
    minPathLength: 0,
    rotationVariance: Math.PI,
    variantCount: 4,
  },
  village: {
    countDivisor: 1650,
    minCount: 3,
    maxCount: 38,
    minSpacing: 34,
    spacingVariance: 0.55,
    objectWidth: [18, 31],
    objectHeight: [16, 27],
    pathWidth: 10,
    pathSpacing: 62,
    pathClearance: 16,
    roadClearance: 18,
    waterClearance: 22,
    maxMainPaths: 4,
    maxBranches: 3,
    minPathLength: 42,
    rotationVariance: 0.55,
    variantCount: 5,
  },
  market: {
    countDivisor: 1280,
    minCount: 4,
    maxCount: 36,
    minSpacing: 28,
    spacingVariance: 0.45,
    objectWidth: [14, 24],
    objectHeight: [10, 17],
    pathWidth: 6,
    pathSpacing: 58,
    pathClearance: 16,
    roadClearance: 12,
    waterClearance: 18,
    maxMainPaths: 2,
    maxBranches: 1,
    minPathLength: 30,
    rotationVariance: 0.7,
    variantCount: 4,
  },
  industrial: {
    countDivisor: 2500,
    minCount: 2,
    maxCount: 20,
    minSpacing: 46,
    spacingVariance: 0.4,
    objectWidth: [30, 54],
    objectHeight: [22, 40],
    pathWidth: 11,
    pathSpacing: 78,
    pathClearance: 22,
    roadClearance: 22,
    waterClearance: 26,
    maxMainPaths: 3,
    maxBranches: 2,
    minPathLength: 52,
    rotationVariance: 0.35,
    variantCount: 4,
  },
};

@Injectable({ providedIn: 'root' })
export class MapGeneratorService {
  generate(sketchObjects: readonly SketchObject[]): GeneratedMapObject[] {
    const generated: GeneratedMapObject[] = [];
    const rivers = this.getIndexedRivers(sketchObjects);
    const roads = this.getIndexedRoads(sketchObjects);
    const zones = this.getIndexedZones(sketchObjects);
    const generatedRoads: GeneratedRoadObject[] = [];

    for (const river of rivers) {
      generated.push({
        id: `generated-${river.object.id}`,
        type: 'generated-river',
        points: river.object.points.map(clonePoint),
        width: river.object.width + 8,
      });
    }

    for (const road of roads) {
      const roadObjects = this.generateRoadObjects(road, rivers);
      generated.push(...roadObjects);
      generatedRoads.push(
        ...roadObjects.filter(
          (object): object is GeneratedRoadObject => object.type === 'generated-road',
        ),
      );
    }

    for (const zone of zones) {
      generated.push(...this.generateZoneObjects(zone, zones, rivers, generatedRoads));
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
    roads: readonly GeneratedRoadObject[],
  ): GeneratedMapObject[] {
    const bounds = getZoneBounds(zone.object);

    if (!bounds) {
      return [];
    }

    const params = LAYOUT_PARAMS[zone.object.zoneType];
    const area = Math.max(1, (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY));

    if (zone.object.zoneType === 'forest') {
      return this.getOrganicPlacements(
        zone,
        zones,
        rivers,
        roads,
        this.getCount(area, zone.object.density, params),
        params,
        [],
      ).map((placement, index) => ({
        id: `generated-${zone.object.id}-tree-${index}`,
        type: 'generated-tree' as const,
        position: placement.position,
        rotation: placement.rotation,
        variant: placement.variant,
      }));
    }

    const paths = this.generateOrganicPaths(zone, zones, rivers, roads, params);
    const placements = this.getOrganicPlacements(
      zone,
      zones,
      rivers,
      roads,
      this.getCount(area, zone.object.density, params),
      params,
      paths,
    );

    switch (zone.object.zoneType) {
      case 'village':
        return [
          ...paths,
          ...placements.map((placement, index) => ({
            id: `generated-${zone.object.id}-building-${index}`,
            type: 'generated-building' as const,
            position: placement.position,
            width: placement.width,
            height: placement.height,
            rotation: placement.rotation,
            variant: placement.variant,
          })),
        ];
      case 'market':
        return [
          ...paths,
          ...placements.map((placement, index) => ({
            id: `generated-${zone.object.id}-stall-${index}`,
            type: 'generated-market-stall' as const,
            position: placement.position,
            width: placement.width,
            height: placement.height,
            rotation: placement.rotation,
            variant: placement.variant,
          })),
        ];
      case 'industrial':
        return [
          ...paths,
          ...placements.map((placement, index) => ({
            id: `generated-${zone.object.id}-industrial-${index}`,
            type: 'generated-industrial-structure' as const,
            position: placement.position,
            width: placement.width,
            height: placement.height,
            rotation: placement.rotation,
            variant: placement.variant,
          })),
        ];
    }
  }

  private getOrganicPlacements(
    zone: IndexedZone,
    zones: readonly IndexedZone[],
    rivers: readonly IndexedRiver[],
    roads: readonly GeneratedRoadObject[],
    count: number,
    params: LayoutParams,
    blockedPaths: readonly GeneratedInternalPathObject[],
  ): GeneratedPlacement[] {
    const bounds = getZoneBounds(zone.object);

    if (!bounds) {
      return [];
    }

    const random = this.createRandom(
      `${zone.object.id}:${zone.index}:${zone.object.zoneType}:objects`,
    );
    const placements: GeneratedPlacement[] = [];
    const maxAttempts = Math.max(280, count * 240);

    for (let attempt = 0; attempt < maxAttempts && placements.length < count; attempt += 1) {
      const candidate = {
        x: bounds.minX + random() * (bounds.maxX - bounds.minX),
        y: bounds.minY + random() * (bounds.maxY - bounds.minY),
      };
      const spacing = params.minSpacing * (1 + (random() - 0.5) * params.spacingVariance);

      if (
        !this.isEligibleZonePoint(candidate, zone, zones, rivers, params.waterClearance) ||
        !this.isPointClearOfRoads(candidate, roads, params.roadClearance) ||
        !this.isPointClearOfPaths(candidate, blockedPaths, params.pathClearance) ||
        !placements.every(
          (placement) =>
            this.distance(placement.position, candidate) >=
            Math.max(params.minSpacing * 0.82, Math.min(placement.spacing, spacing)),
        )
      ) {
        continue;
      }

      const guide = this.getNearestRoadGuide(candidate, roads);
      const variant = Math.floor(random() * params.variantCount);
      const rotation = this.getPlacementRotation(candidate, guide, variant, params, random);

      placements.push({
        position: candidate,
        width: this.getRandomRange(params.objectWidth, random),
        height: this.getRandomRange(params.objectHeight, random),
        rotation,
        variant,
        spacing,
      });
    }

    return placements;
  }

  private generateOrganicPaths(
    zone: IndexedZone,
    zones: readonly IndexedZone[],
    rivers: readonly IndexedRiver[],
    roads: readonly GeneratedRoadObject[],
    params: LayoutParams,
  ): GeneratedInternalPathObject[] {
    const bounds = getZoneBounds(zone.object);

    if (!bounds || params.maxMainPaths === 0) {
      return [];
    }

    const random = this.createRandom(
      `${zone.object.id}:${zone.index}:${zone.object.zoneType}:paths`,
    );
    const center = this.getBoundsCenter(bounds);
    const roadGuide = this.getNearestRoadGuide(center, roads);
    const baseAngle = roadGuide && roadGuide.distance < 180 ? roadGuide.angle : random() * Math.PI;
    const paths: GeneratedInternalPathObject[] = [];
    const pathType = this.getPathType(zone.object.zoneType);
    const pathCount = Math.max(
      1,
      Math.min(
        params.maxMainPaths,
        Math.floor(this.getBoundsDiagonal(bounds) / params.pathSpacing),
      ),
    );

    for (let index = 0; index < pathCount; index += 1) {
      if (index > 0 && random() < 0.25) {
        continue;
      }

      const angle = baseAngle + (index % 2 === 0 ? 0 : Math.PI / 2) + (random() - 0.5) * 0.75;
      const origin = this.offsetPoint(
        center,
        angle + Math.PI / 2,
        (index - (pathCount - 1) / 2) * params.pathSpacing * (0.65 + random() * 0.45),
      );

      this.appendNonOverlappingPaths(
        paths,
        this.createOrganicPathChunks(
          zone,
          zones,
          rivers,
          bounds,
          origin,
          angle,
          params,
          pathType,
          random,
          paths.length,
        ),
        params.pathWidth * 0.9,
      );
    }

    for (let index = 0; index < params.maxBranches; index += 1) {
      if (paths.length === 0 || random() < 0.36) {
        continue;
      }

      const sourcePath = paths[Math.floor(random() * paths.length)];
      const source = sourcePath.points[Math.floor(sourcePath.points.length / 2)];
      const angle = baseAngle + Math.PI / 2 + (random() - 0.5) * 1.2;

      this.appendNonOverlappingPaths(
        paths,
        this.createOrganicPathChunks(
          zone,
          zones,
          rivers,
          bounds,
          source,
          angle,
          params,
          pathType,
          random,
          paths.length,
          0.55,
        ),
        params.pathWidth,
      );
    }

    if (roadGuide && roadGuide.distance < 150) {
      this.appendNonOverlappingPaths(
        paths,
        this.createRoadAccessPath(
          zone,
          zones,
          rivers,
          roadGuide,
          center,
          params,
          pathType,
          paths.length,
        ),
        params.pathWidth,
      );
    }

    return paths;
  }

  private appendNonOverlappingPaths(
    paths: GeneratedInternalPathObject[],
    candidates: readonly GeneratedInternalPathObject[],
    minSeparation: number,
  ): void {
    for (const candidate of candidates) {
      if (
        paths.every((path) => this.getPathDistance(path.points, candidate.points) > minSeparation)
      ) {
        paths.push({ ...candidate, id: `${candidate.id}-${paths.length}` });
      }
    }
  }

  private createOrganicPathChunks(
    zone: IndexedZone,
    zones: readonly IndexedZone[],
    rivers: readonly IndexedRiver[],
    bounds: Bounds,
    origin: Point,
    angle: number,
    params: LayoutParams,
    pathType: GeneratedInternalPathObject['pathType'],
    random: () => number,
    startIndex: number,
    lengthScale = 1,
  ): GeneratedInternalPathObject[] {
    const chunks: Point[][] = [];
    let chunk: Point[] = [];
    const halfLength = (this.getBoundsDiagonal(bounds) * lengthScale) / 2;
    const step = Math.max(12, params.pathWidth + 5);
    const curveAmplitude = params.pathSpacing * (0.08 + random() * 0.16);
    const curvePhase = random() * Math.PI * 2;
    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
    const perpendicular = { x: -direction.y, y: direction.x };
    const gapStart = -halfLength + random() * halfLength * 2;
    const gapRadius = random() < 0.45 ? step * (1.5 + random() * 2.5) : 0;

    for (let distance = -halfLength; distance <= halfLength; distance += step) {
      const curve = Math.sin(distance / 58 + curvePhase) * curveAmplitude;
      const point = {
        x: origin.x + direction.x * distance + perpendicular.x * curve,
        y: origin.y + direction.y * distance + perpendicular.y * curve,
      };
      const inOptionalGap = gapRadius > 0 && Math.abs(distance - gapStart) < gapRadius;

      if (
        !inOptionalGap &&
        this.isEligibleZonePoint(point, zone, zones, rivers, params.waterClearance)
      ) {
        chunk.push(point);
      } else {
        this.addPathChunk(chunks, chunk, params.minPathLength, rivers, params.waterClearance);
        chunk = [];
      }
    }

    this.addPathChunk(chunks, chunk, params.minPathLength, rivers, params.waterClearance);

    return chunks.map((points, index) => ({
      id: `generated-${zone.object.id}-${pathType}-${startIndex + index}`,
      type: 'generated-internal-path',
      points: points.map(clonePoint),
      width: params.pathWidth,
      pathType,
    }));
  }

  private getPathDistance(first: readonly Point[], second: readonly Point[]): number {
    let minDistance = Number.POSITIVE_INFINITY;

    for (let firstIndex = 0; firstIndex < first.length - 1; firstIndex += 1) {
      for (let secondIndex = 0; secondIndex < second.length - 1; secondIndex += 1) {
        minDistance = Math.min(
          minDistance,
          this.segmentToSegmentDistance(
            first[firstIndex],
            first[firstIndex + 1],
            second[secondIndex],
            second[secondIndex + 1],
          ),
        );
      }
    }

    return minDistance;
  }

  private createRoadAccessPath(
    zone: IndexedZone,
    zones: readonly IndexedZone[],
    rivers: readonly IndexedRiver[],
    guide: RoadGuide,
    center: Point,
    params: LayoutParams,
    pathType: GeneratedInternalPathObject['pathType'],
    startIndex: number,
  ): GeneratedInternalPathObject[] {
    const points: Point[] = [];
    const steps = 12;

    for (let index = 0; index <= steps; index += 1) {
      const t = index / steps;
      const point = {
        x: guide.point.x + (center.x - guide.point.x) * t,
        y: guide.point.y + (center.y - guide.point.y) * t,
      };

      if (this.isEligibleZonePoint(point, zone, zones, rivers, params.waterClearance)) {
        points.push(point);
      } else if (points.length > 0) {
        break;
      }
    }

    if (points.length < 2 || this.getPathLength(points) < params.minPathLength * 0.6) {
      return [];
    }

    return [
      {
        id: `generated-${zone.object.id}-${pathType}-access-${startIndex}`,
        type: 'generated-internal-path',
        points: points.map(clonePoint),
        width: params.pathWidth,
        pathType,
      },
    ];
  }

  private isEligibleZonePoint(
    point: Point,
    zone: IndexedZone,
    zones: readonly IndexedZone[],
    rivers: readonly IndexedRiver[],
    waterClearance: number,
  ): boolean {
    return (
      this.getEffectiveZoneAt(point, zones)?.object.id === zone.object.id &&
      !this.isPointInRiverCoverage(point, rivers, waterClearance)
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

  private addPathChunk(
    chunks: Point[][],
    chunk: readonly Point[],
    minLength: number,
    rivers: readonly IndexedRiver[],
    waterClearance: number,
  ): void {
    if (chunk.length < 2 || this.getPathLength(chunk) < minLength) {
      return;
    }

    for (let index = 0; index < chunk.length - 1; index += 1) {
      if (this.isSegmentBlockedByRivers(chunk[index], chunk[index + 1], rivers, waterClearance)) {
        return;
      }
    }

    chunks.push(chunk.map(clonePoint));
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

      if (this.isSegmentBlockedByRivers(start, end, laterRivers, 5)) {
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
        for (let riverIndex = 0; riverIndex < river.object.points.length - 1; riverIndex += 1) {
          const riverStart = river.object.points[riverIndex];
          const riverEnd = river.object.points[riverIndex + 1];
          const tolerance = river.object.width / 2 + 5;

          if (this.segmentToSegmentDistance(start, end, riverStart, riverEnd) > tolerance) {
            continue;
          }

          const position = this.getBridgePositionOnRiver(start, end, riverStart, riverEnd);

          if (candidates.every((candidate) => this.distance(candidate.position, position) > 28)) {
            candidates.push({
              position,
              angle: Math.atan2(end.y - start.y, end.x - start.x),
            });
          }
        }
      }
    }

    return candidates;
  }

  private getBridgePositionOnRiver(
    roadStart: Point,
    roadEnd: Point,
    riverStart: Point,
    riverEnd: Point,
  ): Point {
    const intersection = this.getSegmentIntersection(roadStart, roadEnd, riverStart, riverEnd);

    if (intersection) {
      return intersection;
    }

    const riverCandidates = [
      riverStart,
      riverEnd,
      this.closestPointOnSegment(roadStart, riverStart, riverEnd),
      this.closestPointOnSegment(roadEnd, riverStart, riverEnd),
    ];

    return riverCandidates.reduce((best, candidate) => {
      const bestDistance = this.distanceToSegment(best, roadStart, roadEnd);
      const candidateDistance = this.distanceToSegment(candidate, roadStart, roadEnd);

      return candidateDistance < bestDistance ? candidate : best;
    }, riverCandidates[0]);
  }

  private isSegmentBlockedByRivers(
    start: Point,
    end: Point,
    rivers: readonly IndexedRiver[],
    waterClearance: number,
  ): boolean {
    return rivers.some((river) =>
      this.isRoadSegmentNearRiver(start, end, river.object, waterClearance),
    );
  }

  private isRoadSegmentNearRiver(
    start: Point,
    end: Point,
    river: RiverSketch,
    waterClearance: number,
  ): boolean {
    for (let index = 0; index < river.points.length - 1; index += 1) {
      const riverStart = river.points[index];
      const riverEnd = river.points[index + 1];
      const tolerance = river.width / 2 + waterClearance;

      if (this.segmentToSegmentDistance(start, end, riverStart, riverEnd) <= tolerance) {
        return true;
      }
    }

    return false;
  }

  private isPointInRiverCoverage(
    point: Point,
    rivers: readonly IndexedRiver[],
    waterClearance: number,
  ): boolean {
    return rivers.some(
      (river) =>
        this.distanceToPolyline(point, river.object.points) <=
        river.object.width / 2 + waterClearance,
    );
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

  private isPointClearOfRoads(
    point: Point,
    roads: readonly GeneratedRoadObject[],
    clearance: number,
  ): boolean {
    return roads.every(
      (road) => this.distanceToPolyline(point, road.points) > road.width / 2 + clearance,
    );
  }

  private getNearestRoadGuide(
    point: Point,
    roads: readonly GeneratedRoadObject[],
  ): RoadGuide | null {
    let nearest: RoadGuide | null = null;

    for (const road of roads) {
      for (let index = 0; index < road.points.length - 1; index += 1) {
        const start = road.points[index];
        const end = road.points[index + 1];
        const closest = this.closestPointOnSegment(point, start, end);
        const distance = this.distance(point, closest);

        if (!nearest || distance < nearest.distance) {
          nearest = {
            point: closest,
            distance,
            angle: Math.atan2(end.y - start.y, end.x - start.x),
            width: road.width,
          };
        }
      }
    }

    return nearest;
  }

  private getPlacementRotation(
    point: Point,
    guide: RoadGuide | null,
    variant: number,
    params: LayoutParams,
    random: () => number,
  ): number {
    const jitter = (random() - 0.5) * params.rotationVariance;

    if (guide && guide.distance < params.roadClearance + 90) {
      const facesRoad = variant % 2 === 0 ? Math.PI / 2 : 0;
      return guide.angle + facesRoad + jitter;
    }

    return Math.atan2(point.y, point.x) * 0.12 + (random() - 0.5) * Math.PI + jitter;
  }

  private getPathType(zoneType: ZoneType): GeneratedInternalPathObject['pathType'] {
    switch (zoneType) {
      case 'market':
        return 'aisle';
      case 'industrial':
        return 'service-road';
      case 'forest':
      case 'village':
        return 'street';
    }
  }

  private getCount(area: number, density: number, params: LayoutParams): number {
    return Math.max(
      params.minCount,
      Math.min(params.maxCount, Math.round((area * density) / params.countDivisor)),
    );
  }

  private getRandomRange(range: readonly [number, number], random: () => number): number {
    return range[0] + random() * (range[1] - range[0]);
  }

  private getBoundsCenter(bounds: Bounds): Point {
    return {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    };
  }

  private getBoundsDiagonal(bounds: Bounds): number {
    return Math.hypot(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  }

  private offsetPoint(point: Point, angle: number, distance: number): Point {
    return {
      x: point.x + Math.cos(angle) * distance,
      y: point.y + Math.sin(angle) * distance,
    };
  }

  private getPathLength(points: readonly Point[]): number {
    let length = 0;

    for (let index = 0; index < points.length - 1; index += 1) {
      length += this.distance(points[index], points[index + 1]);
    }

    return length;
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

  private getSegmentIntersection(
    firstStart: Point,
    firstEnd: Point,
    secondStart: Point,
    secondEnd: Point,
  ): Point | null {
    if (!this.segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd)) {
      return null;
    }

    const firstDx = firstEnd.x - firstStart.x;
    const firstDy = firstEnd.y - firstStart.y;
    const secondDx = secondEnd.x - secondStart.x;
    const secondDy = secondEnd.y - secondStart.y;
    const determinant = firstDx * secondDy - firstDy * secondDx;

    if (determinant === 0) {
      return null;
    }

    const t =
      ((secondStart.x - firstStart.x) * secondDy - (secondStart.y - firstStart.y) * secondDx) /
      determinant;

    return {
      x: firstStart.x + t * firstDx,
      y: firstStart.y + t * firstDy,
    };
  }

  private direction(start: Point, end: Point, point: Point): number {
    return (point.x - start.x) * (end.y - start.y) - (point.y - start.y) * (end.x - start.x);
  }

  private distanceToSegment(point: Point, start: Point, end: Point): number {
    return this.distance(point, this.closestPointOnSegment(point, start, end));
  }

  private closestPointOnSegment(point: Point, start: Point, end: Point): Point {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
      return clonePoint(start);
    }

    const t = Math.max(
      0,
      Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared),
    );

    return { x: start.x + t * dx, y: start.y + t * dy };
  }

  private distance(first: Point, second: Point): number {
    return Math.hypot(first.x - second.x, first.y - second.y);
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
