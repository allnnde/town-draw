import { GeneratedMap } from './generated-map.model';
import { SketchObject } from './sketch-object.model';

export const MAP_PROJECT_VERSION = 2;

export interface MapProject {
  id: string;
  name: string;
  version: number;
  width: number;
  height: number;
  sketchObjects: SketchObject[];
  generatedMap: GeneratedMap;
  createdAt: string;
  updatedAt: string;
  migrationNotice?: string;
}
