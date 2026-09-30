import { Point } from './point.model';

export type GeneratedNonRoadObject =
  | GeneratedRiver
  | GeneratedTree
  | GeneratedBuilding
  | GeneratedMarketStall
  | GeneratedIndustrialStructure;

export interface GeneratedRiver {
  id: string;
  type: 'generated-river';
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
