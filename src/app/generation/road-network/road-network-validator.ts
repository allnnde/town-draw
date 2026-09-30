import { GeneratedNonRoadObject } from '../../map-model/generated-object.model';
import { Point } from '../../map-model/point.model';
import { RoadEdge, RoadNetwork } from '../../map-model/road-network.model';
import {
  isEffectiveZonePoint,
  isPointBlockedByRivers,
  IndexedRiver,
  IndexedZone,
} from '../generation-context';
import {
  distance,
  distanceToPolyline,
  orientedRectCorners,
  sampleSegment,
  segmentIntersection,
  segmentsCollinearOverlap,
  SpatialSegmentIndex,
} from './road-geometry';

export type RoadNetworkViolationCode =
  | 'duplicate-node-id'
  | 'duplicate-edge-id'
  | 'missing-endpoint'
  | 'degenerate-edge'
  | 'endpoint-mismatch'
  | 'implicit-crossing'
  | 'collinear-overlap'
  | 'disconnected-district'
  | 'invalid-portal'
  | 'unsorted-nodes'
  | 'unsorted-edges'
  | 'district-coverage'
  | 'river-blocker'
  | 'road-structure-overlap';

export interface RoadNetworkViolation {
  code: RoadNetworkViolationCode;
  message: string;
  edgeIds?: string[];
  districtId?: string;
}

export interface RoadNetworkValidationContext {
  zones: readonly IndexedZone[];
  rivers: readonly IndexedRiver[];
}

export class RoadNetworkValidator {
  validate(
    network: RoadNetwork,
    objects: readonly GeneratedNonRoadObject[] = [],
    context?: RoadNetworkValidationContext,
  ): RoadNetworkViolation[] {
    const violations: RoadNetworkViolation[] = [];
    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();
    const nodeById = new Map(network.nodes.map((node) => [node.id, node]));

    for (const node of network.nodes) {
      if (nodeIds.has(node.id)) {
        violations.push({ code: 'duplicate-node-id', message: `Duplicate node ${node.id}` });
      }

      nodeIds.add(node.id);
    }

    for (const edge of network.edges) {
      if (edgeIds.has(edge.id)) {
        violations.push({ code: 'duplicate-edge-id', message: `Duplicate edge ${edge.id}` });
      }

      edgeIds.add(edge.id);
      const from = nodeById.get(edge.fromNodeId);
      const to = nodeById.get(edge.toNodeId);

      if (!from || !to) {
        violations.push({
          code: 'missing-endpoint',
          message: `Edge ${edge.id} references a missing endpoint`,
          edgeIds: [edge.id],
        });
        continue;
      }

      if (edge.points.length < 2 || from.id === to.id || this.edgeLength(edge) < 0.01) {
        violations.push({
          code: 'degenerate-edge',
          message: `Edge ${edge.id} is degenerate`,
          edgeIds: [edge.id],
        });
      }

      if (
        distance(edge.points[0], from.position) > 0.01 ||
        distance(edge.points[edge.points.length - 1], to.position) > 0.01
      ) {
        violations.push({
          code: 'endpoint-mismatch',
          message: `Edge ${edge.id} geometry does not end at its referenced nodes`,
          edgeIds: [edge.id],
        });
      }
    }

    if (!this.isSorted(network.nodes.map((node) => node.id))) {
      violations.push({ code: 'unsorted-nodes', message: 'Road nodes are not in stable id order' });
    }

    if (!this.isSorted(network.edges.map((edge) => edge.id))) {
      violations.push({ code: 'unsorted-edges', message: 'Road edges are not in stable id order' });
    }

    violations.push(...this.validateCrossings(network));
    violations.push(...this.validateDistrictConnectivity(network));
    violations.push(...this.validatePortals(network));

    if (context) {
      violations.push(...this.validateTraversability(network, context));
    }

    violations.push(...this.validateStructureClearance(network, objects));
    return violations;
  }

  assertValid(
    network: RoadNetwork,
    objects: readonly GeneratedNonRoadObject[] = [],
    context?: RoadNetworkValidationContext,
  ): void {
    const violations = this.validate(network, objects, context);

    if (violations.length > 0) {
      throw new Error(`Generated road network is invalid: ${violations[0].message}`);
    }
  }

  areEdgesConnected(network: RoadNetwork, edgeIds: readonly string[]): boolean {
    if (edgeIds.length <= 1) {
      return true;
    }

    const selected = network.edges.filter((edge) => edgeIds.includes(edge.id));
    const byNode = new Map<string, RoadEdge[]>();

    for (const edge of selected) {
      byNode.set(edge.fromNodeId, [...(byNode.get(edge.fromNodeId) ?? []), edge]);
      byNode.set(edge.toNodeId, [...(byNode.get(edge.toNodeId) ?? []), edge]);
    }

    const visited = new Set<string>([selected[0]?.id ?? '']);
    const queue = selected.length > 0 ? [selected[0]] : [];

    while (queue.length > 0) {
      const edge = queue.shift();

      if (!edge) {
        continue;
      }

      for (const nodeId of [edge.fromNodeId, edge.toNodeId]) {
        for (const neighbor of byNode.get(nodeId) ?? []) {
          if (!visited.has(neighbor.id)) {
            visited.add(neighbor.id);
            queue.push(neighbor);
          }
        }
      }
    }

    return visited.size === selected.length;
  }

  private validateCrossings(network: RoadNetwork): RoadNetworkViolation[] {
    const violations: RoadNetworkViolation[] = [];
    const index = new SpatialSegmentIndex<{ edge: RoadEdge; segmentIndex: number }>();

    for (const edge of network.edges) {
      for (let segmentIndex = 0; segmentIndex < edge.points.length - 1; segmentIndex += 1) {
        const start = edge.points[segmentIndex];
        const end = edge.points[segmentIndex + 1];

        for (const candidate of index.query(start, end)) {
          if (candidate.value.edge.id === edge.id) {
            continue;
          }

          const other = candidate.value.edge;
          const sharedNodeIds = [edge.fromNodeId, edge.toNodeId].filter((nodeId) =>
            [other.fromNodeId, other.toNodeId].includes(nodeId),
          );

          if (segmentsCollinearOverlap(start, end, candidate.start, candidate.end)) {
            violations.push({
              code: 'collinear-overlap',
              message: `Edges ${other.id} and ${edge.id} overlap`,
              edgeIds: [other.id, edge.id],
            });
            continue;
          }

          const intersection = segmentIntersection(start, end, candidate.start, candidate.end);

          if (!intersection) {
            continue;
          }

          const isSharedEndpoint = sharedNodeIds.some((nodeId) => {
            const node = network.nodes.find((candidateNode) => candidateNode.id === nodeId);
            return Boolean(node && distance(node.position, intersection.point) <= 0.01);
          });

          if (!isSharedEndpoint) {
            violations.push({
              code: 'implicit-crossing',
              message: `Edges ${other.id} and ${edge.id} cross without a shared node`,
              edgeIds: [other.id, edge.id],
            });
          }
        }

        index.insert({ start, end, value: { edge, segmentIndex } });
      }
    }

    return this.uniqueViolations(violations);
  }

  private validateDistrictConnectivity(network: RoadNetwork): RoadNetworkViolation[] {
    const violations: RoadNetworkViolation[] = [];
    const districtIds = new Set(
      network.edges.flatMap((edge) => (edge.districtId ? [edge.districtId] : [])),
    );

    for (const districtId of districtIds) {
      const edgeIds = network.edges
        .filter((edge) => edge.districtId === districtId)
        .map((edge) => edge.id);

      if (!this.areEdgesConnected(network, edgeIds)) {
        violations.push({
          code: 'disconnected-district',
          message: `District ${districtId} has disconnected road edges`,
          districtId,
          edgeIds,
        });
      }
    }

    return violations;
  }

  private validatePortals(network: RoadNetwork): RoadNetworkViolation[] {
    const violations: RoadNetworkViolation[] = [];

    for (const node of network.nodes.filter((candidate) => candidate.kind === 'portal')) {
      const incident = network.edges.filter(
        (edge) => edge.fromNodeId === node.id || edge.toNodeId === node.id,
      );

      if (
        !incident.some((edge) => edge.source.kind === 'sketch') ||
        !incident.some((edge) => edge.source.kind === 'district')
      ) {
        violations.push({
          code: 'invalid-portal',
          message: `Portal ${node.id} does not join a district to a sketch road`,
          edgeIds: incident.map((edge) => edge.id),
        });
      }
    }

    return violations;
  }

  private validateTraversability(
    network: RoadNetwork,
    context: RoadNetworkValidationContext,
  ): RoadNetworkViolation[] {
    const violations: RoadNetworkViolation[] = [];
    const nodeById = new Map(network.nodes.map((node) => [node.id, node]));

    for (const edge of network.edges) {
      const sourceZone =
        edge.source.kind === 'district'
          ? context.zones.find((zone) => zone.object.id === edge.source.id)
          : undefined;
      const isAccess =
        nodeById.get(edge.fromNodeId)?.kind === 'portal' ||
        nodeById.get(edge.toNodeId)?.kind === 'portal';

      for (let index = 0; index < edge.points.length - 1; index += 1) {
        const start = edge.points[index];
        const end = edge.points[index + 1];
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const normal = { x: Math.cos(angle + Math.PI / 2), y: Math.sin(angle + Math.PI / 2) };

        for (const point of sampleSegment(start, end, Math.max(3, edge.width / 2))) {
          if (sourceZone && !isAccess) {
            const halfWidth = edge.width / 2;
            const visibleSamples = [
              point,
              { x: point.x + normal.x * halfWidth, y: point.y + normal.y * halfWidth },
              { x: point.x - normal.x * halfWidth, y: point.y - normal.y * halfWidth },
            ];

            if (
              !visibleSamples.every((sample) =>
                isEffectiveZonePoint(sample, sourceZone, context.zones),
              )
            ) {
              violations.push({
                code: 'district-coverage',
                message: `District edge ${edge.id} leaves its effective zone coverage`,
                edgeIds: [edge.id],
                districtId: edge.districtId,
              });
            }
          }

          const blockedRiver = context.rivers.find((river) =>
            isPointBlockedByRivers(
              point,
              [river],
              edge.source.kind === 'district' ? edge.width / 2 + 8 : 0.5,
            ),
          );

          if (
            blockedRiver &&
            !edge.bridges?.some(
              (bridge) =>
                bridge.riverId === blockedRiver.object.id &&
                distance(point, bridge.position) <= bridge.width / 2,
            )
          ) {
            violations.push({
              code: 'river-blocker',
              message: `Road edge ${edge.id} crosses ${blockedRiver.object.id} without a bridge`,
              edgeIds: [edge.id],
              districtId: edge.districtId,
            });
          }
        }
      }
    }

    return this.uniqueViolations(violations);
  }

  private validateStructureClearance(
    network: RoadNetwork,
    objects: readonly GeneratedNonRoadObject[],
  ): RoadNetworkViolation[] {
    const violations: RoadNetworkViolation[] = [];

    for (const object of objects) {
      if (
        object.type !== 'generated-building' &&
        object.type !== 'generated-market-stall' &&
        object.type !== 'generated-industrial-structure'
      ) {
        continue;
      }

      const corners = orientedRectCorners({
        position: object.position,
        width: object.width,
        height: object.height,
        rotation: object.rotation ?? 0,
      });

      for (const edge of network.edges) {
        const required = edge.width / 2 + 1;

        if (
          distanceToPolyline(object.position, edge.points) <= edge.width / 2 ||
          corners.some((corner) => distanceToPolyline(corner, edge.points) <= required)
        ) {
          violations.push({
            code: 'road-structure-overlap',
            message: `${object.id} overlaps road edge ${edge.id}`,
            edgeIds: [edge.id],
          });
          break;
        }
      }
    }

    return violations;
  }

  private edgeLength(edge: RoadEdge): number {
    let result = 0;

    for (let index = 0; index < edge.points.length - 1; index += 1) {
      result += distance(edge.points[index], edge.points[index + 1]);
    }

    return result;
  }

  private uniqueViolations(violations: readonly RoadNetworkViolation[]): RoadNetworkViolation[] {
    const seen = new Set<string>();
    return violations.filter((violation) => {
      const key = `${violation.code}:${[...(violation.edgeIds ?? [])].sort().join(':')}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  private isSorted(values: readonly string[]): boolean {
    return values.every(
      (value, index) => index === 0 || values[index - 1].localeCompare(value) <= 0,
    );
  }
}
