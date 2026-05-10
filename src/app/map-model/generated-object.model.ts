import { Point } from './point.model';

export type GeneratedMapObject =
  | GeneratedRiver
  | GeneratedRoad
  | GeneratedTree
  | GeneratedBuilding
  | GeneratedMarketStall
  | GeneratedIndustrialStructure
  | GeneratedInternalPath
  | GeneratedBridge;

export interface GeneratedRiver {
  id: string;
  type: 'generated-river';
  points: Point[];
  width: number;
}

export interface GeneratedRoad {
  id: string;
  type: 'generated-road';
  points: Point[];
  width: number;
}

export interface GeneratedTree {
  id: string;
  type: 'generated-tree';
  position: Point;
  rotation?: number;
  variant?: number;
}

export interface GeneratedBuilding {
  id: string;
  type: 'generated-building';
  position: Point;
  width: number;
  height: number;
  rotation?: number;
  variant?: number;
}

export interface GeneratedMarketStall {
  id: string;
  type: 'generated-market-stall';
  position: Point;
  width: number;
  height: number;
  rotation?: number;
  variant?: number;
}

export interface GeneratedIndustrialStructure {
  id: string;
  type: 'generated-industrial-structure';
  position: Point;
  width: number;
  height: number;
  rotation?: number;
  variant?: number;
}

export interface GeneratedInternalPath {
  id: string;
  type: 'generated-internal-path';
  points: Point[];
  width: number;
  pathType: 'street' | 'aisle' | 'service-road';
}

export interface GeneratedBridge {
  id: string;
  type: 'generated-bridge';
  position: Point;
  width: number;
  height: number;
  angle: number;
}
