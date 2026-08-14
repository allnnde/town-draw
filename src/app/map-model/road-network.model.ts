import { Point } from './point.model';

export type RoadNodeKind = 'endpoint' | 'junction' | 'portal' | 'bridge-endpoint';

export type RoadClass = 'main' | 'secondary' | 'path' | 'street' | 'aisle' | 'service-road';

export interface RoadSource {
  kind: 'sketch' | 'district';
  id: string;
}

export interface RoadBridge {
  riverId: string;
  position: Point;
  width: number;
  height: number;
  angle: number;
}

export interface RoadNode {
  id: string;
  position: Point;
  kind: RoadNodeKind;
  districtId?: string;
}

export interface RoadEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  points: Point[];
  width: number;
  roadClass: RoadClass;
  source: RoadSource;
  districtId?: string;
  bridges?: RoadBridge[];
}

export interface RoadNetwork {
  nodes: RoadNode[];
  edges: RoadEdge[];
}

export function emptyRoadNetwork(): RoadNetwork {
  return { nodes: [], edges: [] };
}
