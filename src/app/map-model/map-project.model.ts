import { GeneratedMapObject } from './generated-object.model';
import { SketchObject } from './sketch-object.model';

export interface MapProject {
  id: string;
  name: string;
  version: number;
  width: number;
  height: number;
  sketchObjects: SketchObject[];
  generatedObjects: GeneratedMapObject[];
  createdAt: string;
  updatedAt: string;
}
