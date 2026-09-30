import { Point } from '../../map-model/point.model';
import {
  RoadBridge,
  RoadClass,
  RoadEdge,
  RoadNetwork,
  RoadNode,
  RoadNodeKind,
  RoadSource,
} from '../../map-model/road-network.model';
import {
  clonePoint,
  closestPointOnSegment,
  distance,
  distanceToSegment,
  roundPoint,
  segmentIntersection,
  segmentsCollinearOverlap,
} from './road-geometry';

export interface AddRoadEdgeInput {
  idHint: string;
  fromNodeId: string;
  toNodeId: string;
  points?: readonly Point[];
  width: number;
  roadClass: RoadClass;
  source: RoadSource;
  districtId?: string;
  bridges?: readonly RoadBridge[];
}

export interface NearestRoadEdge {
  edge: RoadEdge;
  point: Point;
  distance: number;
  segmentIndex: number;
}

export class RoadNetworkBuilder {
  private readonly nodes = new Map<string, RoadNode>();
  private readonly edges = new Map<string, RoadEdge>();

  constructor(network?: RoadNetwork) {
    for (const node of network?.nodes ?? []) {
      this.nodes.set(node.id, { ...node, position: clonePoint(node.position) });
    }

    for (const edge of network?.edges ?? []) {
      this.edges.set(edge.id, this.cloneEdge(edge));
    }
  }

  getNodes(): RoadNode[] {
    return [...this.nodes.values()];
  }

  getEdges(): RoadEdge[] {
    return [...this.edges.values()];
  }

  getNode(id: string): RoadNode | undefined {
    return this.nodes.get(id);
  }

  getEdge(id: string): RoadEdge | undefined {
    return this.edges.get(id);
  }

  addNode(
    point: Point,
    kind: RoadNodeKind,
    idHint: string,
    districtId?: string,
    mergeTolerance = 0.01,
  ): RoadNode {
    const rounded = roundPoint(point);
    const existing = [...this.nodes.values()].find(
      (node) => distance(node.position, rounded) <= mergeTolerance,
    );

    if (existing) {
      if (this.nodeKindPriority(kind) > this.nodeKindPriority(existing.kind)) {
        existing.kind = kind;
      }

      existing.districtId ??= districtId;
      return existing;
    }

    const baseId = `road-node-${this.safeId(idHint)}-${this.coordinateKey(rounded)}`;
    const id = this.uniqueId(baseId, this.nodes);
    const node: RoadNode = { id, position: rounded, kind, ...(districtId ? { districtId } : {}) };
    this.nodes.set(id, node);
    return node;
  }

  setNodeKind(nodeId: string, kind: RoadNodeKind): void {
    const node = this.nodes.get(nodeId);

    if (node) {
      node.kind = kind;
    }
  }

  addEdge(input: AddRoadEdgeInput): RoadEdge | null {
    const from = this.nodes.get(input.fromNodeId);
    const to = this.nodes.get(input.toNodeId);

    if (!from || !to || from.id === to.id || distance(from.position, to.position) < 0.01) {
      return null;
    }

    const interior = (input.points ?? []).slice(1, -1).map(clonePoint);
    const points = [clonePoint(from.position), ...interior, clonePoint(to.position)];
    const baseId = `road-edge-${this.safeId(input.idHint)}`;
    const id = this.uniqueId(baseId, this.edges);
    const edge: RoadEdge = {
      id,
      fromNodeId: from.id,
      toNodeId: to.id,
      points,
      width: input.width,
      roadClass: input.roadClass,
      source: { ...input.source },
      ...(input.districtId ? { districtId: input.districtId } : {}),
      ...(input.bridges?.length
        ? {
            bridges: input.bridges.map((bridge) => ({
              ...bridge,
              position: clonePoint(bridge.position),
            })),
          }
        : {}),
    };
    this.edges.set(id, edge);
    return edge;
  }

  removeEdge(edgeId: string): void {
    this.edges.delete(edgeId);
  }

  removeNode(nodeId: string): void {
    this.nodes.delete(nodeId);

    for (const edge of this.edges.values()) {
      if (edge.fromNodeId === nodeId || edge.toNodeId === nodeId) {
        this.edges.delete(edge.id);
      }
    }
  }

  mergeNodes(targetNodeId: string, sourceNodeId: string): RoadNode | null {
    const target = this.nodes.get(targetNodeId);
    const source = this.nodes.get(sourceNodeId);

    if (!target || !source || target.id === source.id) {
      return target ?? null;
    }

    for (const edge of [...this.edges.values()]) {
      const replacesFrom = edge.fromNodeId === source.id;
      const replacesTo = edge.toNodeId === source.id;

      if (!replacesFrom && !replacesTo) {
        continue;
      }

      edge.fromNodeId = replacesFrom ? target.id : edge.fromNodeId;
      edge.toNodeId = replacesTo ? target.id : edge.toNodeId;

      if (edge.fromNodeId === edge.toNodeId) {
        this.edges.delete(edge.id);
        continue;
      }

      if (replacesFrom) {
        edge.points[0] = clonePoint(target.position);
      }

      if (replacesTo) {
        edge.points[edge.points.length - 1] = clonePoint(target.position);
      }
    }

    if (this.nodeKindPriority(source.kind) > this.nodeKindPriority(target.kind)) {
      target.kind = source.kind;
    }

    target.districtId ??= source.districtId;
    this.nodes.delete(source.id);
    return target;
  }

  splitEdge(edgeId: string, point: Point, kind: RoadNodeKind, idHint: string): RoadNode | null {
    const edge = this.edges.get(edgeId);

    if (!edge) {
      return null;
    }

    const from = this.nodes.get(edge.fromNodeId);
    const to = this.nodes.get(edge.toNodeId);

    if (!from || !to) {
      return null;
    }

    if (distance(point, from.position) <= 0.01) {
      this.setNodeKind(from.id, kind);
      return from;
    }

    if (distance(point, to.position) <= 0.01) {
      this.setNodeKind(to.id, kind);
      return to;
    }

    let segmentIndex = 0;
    let closest = point;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < edge.points.length - 1; index += 1) {
      const candidate = closestPointOnSegment(point, edge.points[index], edge.points[index + 1]);
      const candidateDistance = distance(point, candidate);

      if (candidateDistance < closestDistance) {
        closestDistance = candidateDistance;
        closest = candidate;
        segmentIndex = index;
      }
    }

    const node = this.addNode(closest, kind, idHint, edge.districtId);
    const firstPoints = [...edge.points.slice(0, segmentIndex + 1), clonePoint(node.position)];
    const secondPoints = [clonePoint(node.position), ...edge.points.slice(segmentIndex + 1)];
    this.edges.delete(edge.id);
    this.addEdge({
      ...edge,
      idHint: `${edge.id}-a`,
      fromNodeId: edge.fromNodeId,
      toNodeId: node.id,
      points: firstPoints,
      bridges: this.bridgesOnPolyline(edge.bridges, firstPoints),
    });
    this.addEdge({
      ...edge,
      idHint: `${edge.id}-b`,
      fromNodeId: node.id,
      toNodeId: edge.toNodeId,
      points: secondPoints,
      bridges: this.bridgesOnPolyline(edge.bridges, secondPoints),
    });
    return node;
  }

  findNearestEdge(
    point: Point,
    predicate: (edge: RoadEdge) => boolean = () => true,
  ): NearestRoadEdge | null {
    let nearest: NearestRoadEdge | null = null;

    for (const edge of this.edges.values()) {
      if (!predicate(edge)) {
        continue;
      }

      for (let index = 0; index < edge.points.length - 1; index += 1) {
        const projected = closestPointOnSegment(point, edge.points[index], edge.points[index + 1]);
        const candidateDistance = distance(point, projected);

        if (!nearest || candidateDistance < nearest.distance) {
          nearest = { edge, point: projected, distance: candidateDistance, segmentIndex: index };
        }
      }
    }

    return nearest;
  }

  canAddPolyline(
    points: readonly Point[],
    allowedNodeIds: ReadonlySet<string> = new Set<string>(),
  ): boolean {
    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index];
      const end = points[index + 1];

      for (const edge of this.edges.values()) {
        for (let edgeIndex = 0; edgeIndex < edge.points.length - 1; edgeIndex += 1) {
          const edgeStart = edge.points[edgeIndex];
          const edgeEnd = edge.points[edgeIndex + 1];

          if (segmentsCollinearOverlap(start, end, edgeStart, edgeEnd)) {
            return false;
          }

          const intersection = segmentIntersection(start, end, edgeStart, edgeEnd);

          if (!intersection) {
            continue;
          }

          const sharedNode = [edge.fromNodeId, edge.toNodeId].some(
            (nodeId) =>
              allowedNodeIds.has(nodeId) &&
              distance(
                this.nodes.get(nodeId)?.position ?? { x: Number.NaN, y: Number.NaN },
                intersection.point,
              ) < 0.01,
          );

          if (!sharedNode) {
            return false;
          }
        }
      }
    }

    return true;
  }

  toNetwork(): RoadNetwork {
    const degree = new Map<string, number>();

    for (const edge of this.edges.values()) {
      degree.set(edge.fromNodeId, (degree.get(edge.fromNodeId) ?? 0) + 1);
      degree.set(edge.toNodeId, (degree.get(edge.toNodeId) ?? 0) + 1);
    }

    const nodes: RoadNode[] = [...this.nodes.values()]
      .filter((node) => (degree.get(node.id) ?? 0) > 0)
      .map((node) => {
        const kind: RoadNodeKind =
          node.kind === 'portal' || node.kind === 'bridge-endpoint'
            ? node.kind
            : (degree.get(node.id) ?? 0) > 2
              ? 'junction'
              : 'endpoint';
        return { ...node, position: clonePoint(node.position), kind };
      })
      .sort((first, second) => first.id.localeCompare(second.id));
    const edges = [...this.edges.values()]
      .map((edge) => this.cloneEdge(edge))
      .sort((first, second) => first.id.localeCompare(second.id));
    return { nodes, edges };
  }

  private cloneEdge(edge: RoadEdge): RoadEdge {
    return {
      ...edge,
      points: edge.points.map(clonePoint),
      source: { ...edge.source },
      ...(edge.bridges
        ? {
            bridges: edge.bridges.map((bridge) => ({
              ...bridge,
              position: clonePoint(bridge.position),
            })),
          }
        : {}),
    };
  }

  private bridgesOnPolyline(
    bridges: readonly RoadBridge[] | undefined,
    points: readonly Point[],
  ): RoadBridge[] {
    return (bridges ?? []).filter((bridge) =>
      points
        .slice(0, -1)
        .some(
          (start, index) => distanceToSegment(bridge.position, start, points[index + 1]) <= 0.01,
        ),
    );
  }

  private uniqueId<T>(baseId: string, collection: Map<string, T>): string {
    let id = baseId;
    let suffix = 1;

    while (collection.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }

    return id;
  }

  private safeId(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]+/g, '-');
  }

  private coordinateKey(point: Point): string {
    return `${Math.round(point.x * 100)}-${Math.round(point.y * 100)}`;
  }

  private nodeKindPriority(kind: RoadNodeKind): number {
    switch (kind) {
      case 'endpoint':
        return 0;
      case 'junction':
        return 1;
      case 'bridge-endpoint':
        return 2;
      case 'portal':
        return 3;
    }
  }
}
