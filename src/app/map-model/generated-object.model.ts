import { Point } from './point.model';

export type GeneratedMapObject =
  | GeneratedRiver
  | GeneratedRoad
  | GeneratedTree
  | GeneratedBuilding
  | GeneratedMarketStall;

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
}

export interface GeneratedBuilding {
  id: string;
  type: 'generated-building';
  position: Point;
  width: number;
  height: number;
}

export interface GeneratedMarketStall {
  id: string;
  type: 'generated-market-stall';
  position: Point;
  width: number;
  height: number;
}
