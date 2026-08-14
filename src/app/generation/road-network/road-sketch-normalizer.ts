import { Point } from '../../map-model/point.model';
import { RoadBridge, RoadClass, RoadNetwork } from '../../map-model/road-network.model';
import { RiverSketch, RoadSketch, SketchObject } from '../../map-model/sketch-object.model';
import {
  clonePoint,
  closestPointOnSegment,
  distance,
  distanceToPolyline,
  roundPoint,
  sampleSegment,
  segmentIntersection,
  segmentsCollinearOverlap,
} from './road-geometry';
import { RoadNetworkBuilder } from './road-network-builder';

interface IndexedRiver {
  object: RiverSketch;
  index: number;
}

interface IndexedRoad {
  object: RoadSketch;
  index: number;
}

interface SegmentCandidate {
  id: string;
  road: IndexedRoad;
  start: Point;
  end: Point;
  isRoadStart: boolean;
  isRoadEnd: boolean;
  splitPoints: { point: Point; t: number }[];
}

const ROAD_ENDPOINT_SNAP_TOLERANCE = 6;
const WATER_SAMPLE_STEP = 5;

export class RoadSketchNormalizer {
  normalize(sketchObjects: readonly SketchObject[]): RoadNetwork {
    const rivers = sketchObjects.flatMap((object, index) =>
      object.type === 'river' ? [{ object, index }] : [],
    );
    const roads = sketchObjects.flatMap((object, index) =>
      object.type === 'road' ? [{ object, index }] : [],
    );
    const candidates = roads.flatMap((road) => this.getRoadCandidates(road, rivers));
    this.addCrossingSplitPoints(candidates);
    this.addEndpointSnaps(candidates);
    return this.buildNetwork(candidates, rivers);
  }

  private getRoadCandidates(
    road: IndexedRoad,
    rivers: readonly IndexedRiver[],
  ): SegmentCandidate[] {
    const laterRivers = rivers.filter((river) => river.index > road.index);
    const chunks = this.splitRoadByLaterRivers(road.object, laterRivers);
    const candidates: SegmentCandidate[] = [];

    for (const [chunkIndex, chunk] of chunks.entries()) {
      for (let index = 0; index < chunk.length - 1; index += 1) {
        const start = roundPoint(chunk[index]);
        const end = roundPoint(chunk[index + 1]);

        if (distance(start, end) < 0.01) {
          continue;
        }

        candidates.push({
          id: `${road.object.id}-${chunkIndex}-${index}`,
          road,
          start,
          end,
          isRoadStart: chunkIndex === 0 && index === 0,
          isRoadEnd: chunkIndex === chunks.length - 1 && index === chunk.length - 2,
          splitPoints: [
            { point: start, t: 0 },
            { point: end, t: 1 },
          ],
        });
      }
    }

    return candidates;
  }

  private splitRoadByLaterRivers(
    road: RoadSketch,
    laterRivers: readonly IndexedRiver[],
  ): Point[][] {
    if (road.points.length < 2) {
      return [];
    }

    const chunks: Point[][] = [];
    let chunk: Point[] = [];

    for (let index = 0; index < road.points.length - 1; index += 1) {
      const samples = sampleSegment(road.points[index], road.points[index + 1], WATER_SAMPLE_STEP);

      for (let sampleIndex = index === 0 ? 0 : 1; sampleIndex < samples.length; sampleIndex += 1) {
        const point = samples[sampleIndex];
        const blocked = laterRivers.some(
          (river) => distanceToPolyline(point, river.object.points) <= river.object.width / 2 + 0.5,
        );

        if (!blocked) {
          chunk.push(point);
        } else if (chunk.length > 1) {
          chunks.push(this.removeCollinearPoints(chunk));
          chunk = [];
        } else {
          chunk = [];
        }
      }
    }

    if (chunk.length > 1) {
      chunks.push(this.removeCollinearPoints(chunk));
    }

    return chunks.filter((candidate) => candidate.length > 1);
  }

  private removeCollinearPoints(points: readonly Point[]): Point[] {
    if (points.length <= 2) {
      return points.map(clonePoint);
    }

    const result = [clonePoint(points[0])];

    for (let index = 1; index < points.length - 1; index += 1) {
      const previous = result[result.length - 1];
      const current = points[index];
      const next = points[index + 1];
      const firstAngle = Math.atan2(current.y - previous.y, current.x - previous.x);
      const secondAngle = Math.atan2(next.y - current.y, next.x - current.x);
      const difference = Math.abs(
        Math.atan2(Math.sin(secondAngle - firstAngle), Math.cos(secondAngle - firstAngle)),
      );

      if (difference > 0.03) {
        result.push(clonePoint(current));
      }
    }

    result.push(clonePoint(points[points.length - 1]));
    return result;
  }

  private addCrossingSplitPoints(candidates: SegmentCandidate[]): void {
    for (let firstIndex = 0; firstIndex < candidates.length; firstIndex += 1) {
      const first = candidates[firstIndex];

      for (let secondIndex = firstIndex + 1; secondIndex < candidates.length; secondIndex += 1) {
        const second = candidates[secondIndex];

        if (first.road.object.id === second.road.object.id) {
          continue;
        }

        if (segmentsCollinearOverlap(first.start, first.end, second.start, second.end)) {
          continue;
        }

        const intersection = segmentIntersection(first.start, first.end, second.start, second.end);

        if (!intersection) {
          continue;
        }

        first.splitPoints.push({ point: intersection.point, t: intersection.firstT });
        second.splitPoints.push({ point: intersection.point, t: intersection.secondT });
      }
    }
  }

  private addEndpointSnaps(candidates: SegmentCandidate[]): void {
    for (const candidate of candidates) {
      for (const endpoint of [
        ...(candidate.isRoadStart ? [{ point: candidate.start, atStart: true }] : []),
        ...(candidate.isRoadEnd ? [{ point: candidate.end, atStart: false }] : []),
      ]) {
        let nearest:
          | { target: SegmentCandidate; point: Point; distance: number; targetT: number }
          | undefined;

        for (const target of candidates) {
          if (target.road.object.id === candidate.road.object.id) {
            continue;
          }

          const projected = closestPointOnSegment(endpoint.point, target.start, target.end);
          const targetLength = distance(target.start, target.end);
          const targetT = targetLength === 0 ? 0 : distance(target.start, projected) / targetLength;
          const candidateDistance = distance(endpoint.point, projected);

          if (
            targetT > 0.001 &&
            targetT < 0.999 &&
            candidateDistance <= ROAD_ENDPOINT_SNAP_TOLERANCE &&
            (!nearest || candidateDistance < nearest.distance)
          ) {
            nearest = {
              target,
              point: roundPoint(projected),
              distance: candidateDistance,
              targetT,
            };
          }
        }

        if (!nearest) {
          continue;
        }

        if (endpoint.atStart) {
          candidate.start = nearest.point;
          candidate.splitPoints = candidate.splitPoints.filter((split) => split.t > 0.001);
          candidate.splitPoints.push({ point: nearest.point, t: 0 });
        } else {
          candidate.end = nearest.point;
          candidate.splitPoints = candidate.splitPoints.filter((split) => split.t < 0.999);
          candidate.splitPoints.push({ point: nearest.point, t: 1 });
        }

        nearest.target.splitPoints.push({ point: nearest.point, t: nearest.targetT });
      }
    }
  }

  private buildNetwork(
    candidates: readonly SegmentCandidate[],
    rivers: readonly IndexedRiver[],
  ): RoadNetwork {
    const builder = new RoadNetworkBuilder();
    const acceptedSegments: { start: Point; end: Point }[] = [];

    for (const candidate of candidates) {
      const splitPoints = this.uniqueSplitPoints(candidate.splitPoints).sort(
        (first, second) => first.t - second.t,
      );

      for (let index = 0; index < splitPoints.length - 1; index += 1) {
        const start = splitPoints[index].point;
        const end = splitPoints[index + 1].point;

        if (
          distance(start, end) < 0.01 ||
          acceptedSegments.some((segment) =>
            segmentsCollinearOverlap(start, end, segment.start, segment.end),
          )
        ) {
          continue;
        }

        const from = builder.addNode(start, 'endpoint', `${candidate.id}-${index}-from`);
        const to = builder.addNode(end, 'endpoint', `${candidate.id}-${index}-to`);
        const bridges = this.getBridges(candidate.road, start, end, rivers);
        builder.addEdge({
          idHint: `${candidate.id}-${index}`,
          fromNodeId: from.id,
          toNodeId: to.id,
          width: this.getRoadWidth(candidate.road.object),
          roadClass: candidate.road.object.roadType,
          source: { kind: 'sketch', id: candidate.road.object.id },
          bridges,
        });
        acceptedSegments.push({ start, end });
      }
    }

    return builder.toNetwork();
  }

  private uniqueSplitPoints(
    splitPoints: readonly { point: Point; t: number }[],
  ): { point: Point; t: number }[] {
    const result: { point: Point; t: number }[] = [];

    for (const split of splitPoints) {
      if (!result.some((existing) => distance(existing.point, split.point) <= 0.01)) {
        result.push({ point: roundPoint(split.point), t: split.t });
      }
    }

    return result;
  }

  private getBridges(
    road: IndexedRoad,
    start: Point,
    end: Point,
    rivers: readonly IndexedRiver[],
  ): RoadBridge[] {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    return rivers
      .filter((river) => river.index < road.index)
      .flatMap((river) =>
        river.object.points.slice(0, -1).flatMap((riverStart, index) => {
          const intersection = segmentIntersection(
            start,
            end,
            riverStart,
            river.object.points[index + 1],
          );
          return intersection
            ? [
                {
                  riverId: river.object.id,
                  position: intersection.point,
                  width: Math.max(24, river.object.width + 12),
                  height: this.getRoadWidth(road.object) + 7,
                  angle,
                },
              ]
            : [];
        }),
      );
  }

  private getRoadWidth(road: RoadSketch): number {
    switch (road.roadType) {
      case 'main':
        return 10;
      case 'secondary':
        return 7;
      case 'path':
        return 4;
    }
  }
}
