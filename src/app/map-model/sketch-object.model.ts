import { Point } from './point.model';

export type RoadType = 'main' | 'secondary' | 'path';
export type ZoneType = 'village' | 'market' | 'forest' | 'industrial';
export type MarkerType = 'bridge' | 'gate' | 'tower' | 'poi';

export type SketchObject = RiverSketch | RoadSketch | ZoneSketch | MarkerSketch;

export interface RiverSketch {
  id: string;
  type: 'river';
  points: Point[];
  width: number;
}

export interface RoadSketch {
  id: string;
  type: 'road';
  points: Point[];
  roadType: RoadType;
}

export interface ZoneSketch {
  id: string;
  type: 'zone';
  zoneType: ZoneType;
  polygon?: Point[];
  brushStamps?: ZoneBrushStamp[];
  density: number;
}

export interface ZoneBrushStamp {
  position: Point;
  radius: number;
}

export interface MarkerSketch {
  id: string;
  type: 'marker';
  markerType: MarkerType;
  position: Point;
}
