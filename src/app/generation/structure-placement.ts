import { GeneratedNonRoadObject } from '../map-model/generated-object.model';
import { Point } from '../map-model/point.model';
import { RoadEdge, RoadNetwork } from '../map-model/road-network.model';
import { ZoneType } from '../map-model/sketch-object.model';
import { getZoneBounds } from '../map-model/zone-coverage.util';
import {
  IndexedRiver,
  IndexedZone,
  getEffectiveZoneArea,
  isEffectiveZonePoint,
  isPointBlockedByRivers,
} from './generation-context';
import {
  createRandom,
  distance,
  distanceToPolyline,
  getPolylinePointAndAngle,
  orientedRectCorners,
  polylineLength,
} from './road-network/road-geometry';

interface PlacementParams {
  countDivisor: number;
  minCount: number;
  maxCount: number;
  spacing: number;
  width: readonly [number, number];
  height: readonly [number, number];
  setback: number;
  waterClearance: number;
  variantCount: number;
}

interface AcceptedFootprint {
  position: Point;
  radius: number;
}

const PARAMS: Record<ZoneType, PlacementParams> = {
  forest: {
    countDivisor: 900,
    minCount: 8,
    maxCount: 72,
    spacing: 18,
    width: [10, 16],
    height: [10, 16],
    setback: 8,
    waterClearance: 14,
    variantCount: 4,
  },
  village: {
    countDivisor: 1650,
    minCount: 3,
    maxCount: 38,
    spacing: 34,
    width: [18, 31],
    height: [16, 27],
    setback: 7,
    waterClearance: 22,
    variantCount: 5,
  },
  market: {
    countDivisor: 1280,
    minCount: 4,
    maxCount: 36,
    spacing: 28,
    width: [14, 24],
    height: [10, 17],
    setback: 5,
    waterClearance: 18,
    variantCount: 4,
  },
  industrial: {
    countDivisor: 2500,
    minCount: 2,
    maxCount: 20,
    spacing: 46,
    width: [30, 54],
    height: [22, 40],
    setback: 10,
    waterClearance: 26,
    variantCount: 4,
  },
};

export class StructurePlacementService {
  generateForZone(
    zone: IndexedZone,
    zones: readonly IndexedZone[],
    rivers: readonly IndexedRiver[],
    network: RoadNetwork,
  ): GeneratedNonRoadObject[] {
    const params = PARAMS[zone.object.zoneType];
    const targetCount = this.getCount(
      getEffectiveZoneArea(zone, zones),
      zone.object.density,
      params,
    );

    if (zone.object.zoneType === 'forest') {
      return this.generateForest(zone, zones, rivers, network, params, targetCount);
    }

    return this.generateFrontageObjects(zone, zones, rivers, network, params, targetCount);
  }

  private generateFrontageObjects(
    zone: IndexedZone,
    zones: readonly IndexedZone[],
    rivers: readonly IndexedRiver[],
    network: RoadNetwork,
    params: PlacementParams,
    targetCount: number,
  ): GeneratedNonRoadObject[] {
    const random = createRandom(`${zone.object.id}:${zone.index}:frontage`);
    const districtEdges = network.edges.filter(
      (edge) => edge.source.kind === 'district' && edge.source.id === zone.object.id,
    );
    const accepted: AcceptedFootprint[] = [];
    const objects: GeneratedNonRoadObject[] = [];

    for (const edge of districtEdges) {
      const length = polylineLength(edge.points);
      const interval = Math.max(params.spacing, 22);

      for (let along = interval * 0.45; along < length - interval * 0.25; along += interval) {
        const sample = getPolylinePointAndAngle(edge.points, along);

        if (!sample) {
          continue;
        }

        for (const side of random() > 0.5 ? [1, -1] : [-1, 1]) {
          if (objects.length >= targetCount) {
            return objects;
          }

          const width = this.randomRange(params.width, random);
          const height = this.randomRange(params.height, random);
          const offset = edge.width / 2 + height / 2 + params.setback;
          const position = {
            x: sample.point.x + Math.cos(sample.angle + Math.PI / 2) * offset * side,
            y: sample.point.y + Math.sin(sample.angle + Math.PI / 2) * offset * side,
          };
          const rotation = sample.angle + (random() - 0.5) * 0.28;

          if (
            !this.isFootprintValid(
              position,
              width,
              height,
              rotation,
              zone,
              zones,
              rivers,
              network.edges,
              accepted,
              params,
            )
          ) {
            continue;
          }

          const index = objects.length;
          objects.push(
            this.createPopulatedObject(
              zone.object.zoneType,
              zone.object.id,
              index,
              position,
              width,
              height,
              rotation,
              Math.floor(random() * params.variantCount),
            ),
          );
          accepted.push({ position, radius: Math.hypot(width / 2, height / 2) });
        }
      }
    }

    return objects;
  }

  private generateForest(
    zone: IndexedZone,
    zones: readonly IndexedZone[],
    rivers: readonly IndexedRiver[],
    network: RoadNetwork,
    params: PlacementParams,
    targetCount: number,
  ): GeneratedNonRoadObject[] {
    const bounds = getZoneBounds(zone.object);

    if (!bounds) {
      return [];
    }

    const random = createRandom(`${zone.object.id}:${zone.index}:forest`);
    const accepted: AcceptedFootprint[] = [];
    const trees: GeneratedNonRoadObject[] = [];
    const maxAttempts = Math.max(240, targetCount * 100);

    for (let attempt = 0; attempt < maxAttempts && trees.length < targetCount; attempt += 1) {
      const position = {
        x: bounds.minX + random() * (bounds.maxX - bounds.minX),
        y: bounds.minY + random() * (bounds.maxY - bounds.minY),
      };

      if (
        !isEffectiveZonePoint(position, zone, zones) ||
        isPointBlockedByRivers(position, rivers, params.waterClearance) ||
        network.edges.some(
          (edge) => distanceToPolyline(position, edge.points) <= edge.width / 2 + params.setback,
        ) ||
        accepted.some((footprint) => distance(position, footprint.position) < params.spacing)
      ) {
        continue;
      }

      trees.push({
        id: `generated-${zone.object.id}-tree-${trees.length}`,
        type: 'generated-tree',
        position,
        rotation: random() * Math.PI * 2,
        variant: Math.floor(random() * params.variantCount),
      });
      accepted.push({ position, radius: params.spacing / 2 });
    }

    return trees;
  }

  private isFootprintValid(
    position: Point,
    width: number,
    height: number,
    rotation: number,
    zone: IndexedZone,
    zones: readonly IndexedZone[],
    rivers: readonly IndexedRiver[],
    edges: readonly RoadEdge[],
    accepted: readonly AcceptedFootprint[],
    params: PlacementParams,
  ): boolean {
    const corners = orientedRectCorners({ position, width, height, rotation });
    const samples = [position, ...corners];

    if (
      !samples.every((point) => isEffectiveZonePoint(point, zone, zones)) ||
      samples.some((point) => isPointBlockedByRivers(point, rivers, params.waterClearance))
    ) {
      return false;
    }

    if (
      edges.some(
        (edge) =>
          distanceToPolyline(position, edge.points) <= edge.width / 2 ||
          corners.some((corner) => distanceToPolyline(corner, edge.points) <= edge.width / 2 + 2),
      )
    ) {
      return false;
    }

    const radius = Math.hypot(width / 2, height / 2);
    return accepted.every(
      (footprint) =>
        distance(position, footprint.position) >=
        Math.max(params.spacing * 0.72, radius + footprint.radius + 2),
    );
  }

  private createPopulatedObject(
    zoneType: ZoneType,
    zoneId: string,
    index: number,
    position: Point,
    width: number,
    height: number,
    rotation: number,
    variant: number,
  ): GeneratedNonRoadObject {
    const common = { position, width, height, rotation, variant };

    switch (zoneType) {
      case 'village':
        return {
          id: `generated-${zoneId}-building-${index}`,
          type: 'generated-building',
          ...common,
        };
      case 'market':
        return {
          id: `generated-${zoneId}-stall-${index}`,
          type: 'generated-market-stall',
          ...common,
        };
      case 'industrial':
        return {
          id: `generated-${zoneId}-industrial-${index}`,
          type: 'generated-industrial-structure',
          ...common,
        };
      case 'forest':
        throw new Error('Forest objects do not use road frontage placement.');
    }
  }

  private getCount(area: number, density: number, params: PlacementParams): number {
    return Math.max(
      params.minCount,
      Math.min(params.maxCount, Math.round((area / params.countDivisor) * Math.max(0.1, density))),
    );
  }

  private randomRange(range: readonly [number, number], random: () => number): number {
    return range[0] + random() * (range[1] - range[0]);
  }
}
