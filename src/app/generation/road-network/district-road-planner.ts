import { Point } from '../../map-model/point.model';
import { RoadClass, RoadEdge } from '../../map-model/road-network.model';
import { ZoneType } from '../../map-model/sketch-object.model';
import { IndexedRiver, IndexedZone } from '../generation-context';
import { distance, segmentToSegmentDistance } from './road-geometry';
import { NearestRoadEdge, RoadNetworkBuilder } from './road-network-builder';
import { GridCell, TraversabilityGrid } from './traversability-grid';

interface DistrictRoadParams {
  roadClass: Extract<RoadClass, 'street' | 'aisle' | 'service-road'>;
  width: number;
  waterClearance: number;
  maxBranches: number;
  minRouteLength: number;
  accessRange: number;
}

interface PortalCandidate extends NearestRoadEdge {
  cell: GridCell;
}

const PARAMS: Record<Exclude<ZoneType, 'forest'>, DistrictRoadParams> = {
  village: {
    roadClass: 'street',
    width: 10,
    waterClearance: 16,
    maxBranches: 4,
    minRouteLength: 34,
    accessRange: 180,
  },
  market: {
    roadClass: 'aisle',
    width: 6,
    waterClearance: 14,
    maxBranches: 2,
    minRouteLength: 26,
    accessRange: 150,
  },
  industrial: {
    roadClass: 'service-road',
    width: 11,
    waterClearance: 20,
    maxBranches: 3,
    minRouteLength: 42,
    accessRange: 200,
  },
};

export class DistrictRoadPlanner {
  plan(
    zone: IndexedZone,
    zones: readonly IndexedZone[],
    rivers: readonly IndexedRiver[],
    builder: RoadNetworkBuilder,
  ): void {
    if (zone.object.zoneType === 'forest') {
      return;
    }

    const params = PARAMS[zone.object.zoneType];
    const grid = new TraversabilityGrid(zone, zones, rivers, params.width, params.waterClearance);
    const components = grid.getComponents().filter((component) => component.length >= 3);

    for (const [componentIndex, component] of components.entries()) {
      this.planComponent(zone, rivers, builder, grid, component, componentIndex, params);
    }
  }

  private planComponent(
    zone: IndexedZone,
    rivers: readonly IndexedRiver[],
    builder: RoadNetworkBuilder,
    grid: TraversabilityGrid,
    component: readonly GridCell[],
    componentIndex: number,
    params: DistrictRoadParams,
  ): void {
    const componentKeys = new Set(component.map((cell) => grid.getKey(cell)));
    const districtId = `${zone.object.id}:region-${componentIndex}`;
    const portal = this.getPortalCandidate(component, builder, rivers, params);
    const endpoints = this.getTrunkEndpoints(component, portal?.cell ?? null);

    if (!endpoints) {
      return;
    }

    const [start, goal] = endpoints;
    const trunk = grid.findPath(
      start,
      new Set([grid.getKey(goal)]),
      componentKeys,
      `${districtId}:trunk`,
    );

    if (this.pathLength(trunk) < params.minRouteLength) {
      return;
    }

    const nodeByCell = new Map<string, string>();

    if (
      !this.addRoute(trunk, zone.object.id, districtId, params, grid, builder, nodeByCell, 'trunk')
    ) {
      return;
    }

    const desiredBranches = Math.min(
      params.maxBranches,
      Math.max(0, Math.floor(component.length / Math.max(7, 18 - zone.object.density * 6))),
    );

    for (let branchIndex = 0; branchIndex < desiredBranches; branchIndex += 1) {
      const networkKeys = new Set(nodeByCell.keys());
      const anchor = this.getFarthestAnchor(component, networkKeys, grid);

      if (!anchor || networkKeys.has(grid.getKey(anchor))) {
        break;
      }

      const branch = grid.findPath(
        anchor,
        networkKeys,
        componentKeys,
        `${districtId}:branch-${branchIndex}`,
      );

      if (this.pathLength(branch) < params.minRouteLength * 0.65) {
        continue;
      }

      this.addRoute(
        branch,
        zone.object.id,
        districtId,
        params,
        grid,
        builder,
        nodeByCell,
        `branch-${branchIndex}`,
      );
    }

    if (portal) {
      this.connectPortal(portal, zone.object.id, districtId, params, grid, builder, nodeByCell);
    }
  }

  private addRoute(
    rawPath: readonly GridCell[],
    zoneId: string,
    districtId: string,
    params: DistrictRoadParams,
    grid: TraversabilityGrid,
    builder: RoadNetworkBuilder,
    nodeByCell: Map<string, string>,
    idHint: string,
  ): boolean {
    const points = this.getRoutePoints(rawPath, grid);
    const existingNodeIds = new Set(
      rawPath.flatMap((cell) => {
        const nodeId = nodeByCell.get(grid.getKey(cell));
        return nodeId ? [nodeId] : [];
      }),
    );

    if (!builder.canAddPolyline(points, existingNodeIds)) {
      const rawPoints = rawPath.map((cell) => cell.point);

      if (!builder.canAddPolyline(rawPoints, existingNodeIds)) {
        return false;
      }

      points.splice(0, points.length, ...rawPoints);
    }

    const nodes = points.map((point, index) => {
      const cell = grid.getNearestCell(point);
      const cellKey = cell ? grid.getKey(cell) : '';
      const existingId = cellKey ? nodeByCell.get(cellKey) : undefined;
      const existing = existingId ? builder.getNode(existingId) : undefined;

      if (existing) {
        return existing;
      }

      const node = builder.addNode(
        point,
        index > 0 && index < points.length - 1 ? 'junction' : 'endpoint',
        `${districtId}-${idHint}-${index}`,
        districtId,
      );

      if (cellKey) {
        nodeByCell.set(cellKey, node.id);
      }

      return node;
    });

    for (let index = 0; index < nodes.length - 1; index += 1) {
      builder.addEdge({
        idHint: `${districtId}-${idHint}-${index}`,
        fromNodeId: nodes[index].id,
        toNodeId: nodes[index + 1].id,
        width: params.width,
        roadClass: params.roadClass,
        source: { kind: 'district', id: zoneId },
        districtId,
      });
    }

    return nodes.length > 1;
  }

  private connectPortal(
    portal: PortalCandidate,
    zoneId: string,
    districtId: string,
    params: DistrictRoadParams,
    grid: TraversabilityGrid,
    builder: RoadNetworkBuilder,
    nodeByCell: ReadonlyMap<string, string>,
  ): void {
    const internalNodeId = nodeByCell.get(grid.getKey(portal.cell));
    const internalNode = internalNodeId ? builder.getNode(internalNodeId) : undefined;

    if (!internalNode || !builder.getEdge(portal.edge.id)) {
      return;
    }

    const portalNode = builder.splitEdge(
      portal.edge.id,
      portal.point,
      'junction',
      `${districtId}-portal`,
    );

    if (!portalNode) {
      return;
    }

    const points = [internalNode.position, portalNode.position];
    const allowedNodes = new Set([internalNode.id, portalNode.id]);

    if (!builder.canAddPolyline(points, allowedNodes)) {
      return;
    }

    builder.setNodeKind(portalNode.id, 'portal');
    builder.addEdge({
      idHint: `${districtId}-access`,
      fromNodeId: internalNode.id,
      toNodeId: portalNode.id,
      width: params.width,
      roadClass: params.roadClass,
      source: { kind: 'district', id: zoneId },
      districtId,
    });
  }

  private getPortalCandidate(
    component: readonly GridCell[],
    builder: RoadNetworkBuilder,
    rivers: readonly IndexedRiver[],
    params: DistrictRoadParams,
  ): PortalCandidate | null {
    let best: PortalCandidate | null = null;
    const stride = Math.max(1, Math.floor(component.length / 500));

    for (let index = 0; index < component.length; index += stride) {
      const cell = component[index];
      const nearest = builder.findNearestEdge(cell.point, (edge) => edge.source.kind === 'sketch');

      if (
        !nearest ||
        nearest.distance > params.accessRange ||
        (best && nearest.distance >= best.distance) ||
        this.isSegmentBlockedByRivers(cell.point, nearest.point, rivers, params.waterClearance)
      ) {
        continue;
      }

      best = { ...nearest, cell };
    }

    return best;
  }

  private getTrunkEndpoints(
    component: readonly GridCell[],
    preferredStart: GridCell | null,
  ): [GridCell, GridCell] | null {
    if (component.length < 2) {
      return null;
    }

    const start = preferredStart ?? component[0];
    let first = start;
    let second = component[0];

    if (!preferredStart) {
      first = component.reduce((best, cell) => (cell.point.x < best.point.x ? cell : best));
    }

    second = component.reduce((best, cell) =>
      distance(cell.point, first.point) > distance(best.point, first.point) ? cell : best,
    );

    if (distance(first.point, second.point) < 1) {
      return null;
    }

    return [first, second];
  }

  private getFarthestAnchor(
    component: readonly GridCell[],
    networkKeys: ReadonlySet<string>,
    grid: TraversabilityGrid,
  ): GridCell | null {
    const networkCells = component.filter((cell) => networkKeys.has(grid.getKey(cell)));

    if (networkCells.length === 0) {
      return null;
    }

    return component.reduce<GridCell | null>((best, cell) => {
      const nearestDistance = Math.min(
        ...networkCells.map((networkCell) => distance(cell.point, networkCell.point)),
      );
      const bestDistance = best
        ? Math.min(...networkCells.map((networkCell) => distance(best.point, networkCell.point)))
        : -1;
      return nearestDistance > bestDistance ? cell : best;
    }, null);
  }

  private isSegmentBlockedByRivers(
    start: Point,
    end: Point,
    rivers: readonly IndexedRiver[],
    clearance: number,
  ): boolean {
    return rivers.some((river) =>
      river.object.points
        .slice(0, -1)
        .some(
          (riverStart, index) =>
            segmentToSegmentDistance(start, end, riverStart, river.object.points[index + 1]) <=
            river.object.width / 2 + clearance,
        ),
    );
  }

  private pathLength(path: readonly GridCell[]): number {
    let result = 0;

    for (let index = 0; index < path.length - 1; index += 1) {
      result += distance(path[index].point, path[index + 1].point);
    }

    return result;
  }

  private getRoutePoints(rawPath: readonly GridCell[], grid: TraversabilityGrid): Point[] {
    if (rawPath.length <= 2) {
      return rawPath.map((cell) => cell.point);
    }

    const points: Point[] = [rawPath[0].point];
    let anchor = 0;

    while (anchor < rawPath.length - 1) {
      let next = Math.min(rawPath.length - 1, anchor + 5);

      while (
        next > anchor + 1 &&
        !grid.isSegmentTraversable(rawPath[anchor].point, rawPath[next].point)
      ) {
        next -= 1;
      }

      points.push(rawPath[next].point);
      anchor = next;
    }

    return points;
  }
}
