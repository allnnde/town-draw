import { Injectable, signal } from '@angular/core';
import { EditorTool } from '../../map-model/editor-tool.model';
import {
  GeneratedMap,
  cloneGeneratedMap,
  emptyGeneratedMap,
} from '../../map-model/generated-map.model';
import { createId } from '../../map-model/id.util';
import { MAP_PROJECT_VERSION, MapProject } from '../../map-model/map-project.model';
import { SketchObject } from '../../map-model/sketch-object.model';

const DEFAULT_MAP_WIDTH = 1200;
const DEFAULT_MAP_HEIGHT = 800;

@Injectable({ providedIn: 'root' })
export class EditorStateService {
  private readonly activeToolSignal = signal<EditorTool>('select');
  private readonly selectedObjectIdSignal = signal<string | null>(null);
  private readonly sketchObjectsSignal = signal<SketchObject[]>([]);
  private readonly draftSketchObjectSignal = signal<SketchObject | null>(null);
  private readonly generatedMapSignal = signal<GeneratedMap>(emptyGeneratedMap());
  private readonly mapWidthSignal = signal(DEFAULT_MAP_WIDTH);
  private readonly mapHeightSignal = signal(DEFAULT_MAP_HEIGHT);
  private readonly projectIdSignal = signal(createId('project'));
  private readonly projectNameSignal = signal('Untitled TownDraw Map');
  private readonly createdAtSignal = signal(new Date().toISOString());

  readonly activeTool = this.activeToolSignal.asReadonly();
  readonly selectedObjectId = this.selectedObjectIdSignal.asReadonly();
  readonly sketchObjects = this.sketchObjectsSignal.asReadonly();
  readonly draftSketchObject = this.draftSketchObjectSignal.asReadonly();
  readonly generatedMap = this.generatedMapSignal.asReadonly();
  readonly mapWidth = this.mapWidthSignal.asReadonly();
  readonly mapHeight = this.mapHeightSignal.asReadonly();

  setActiveTool(tool: EditorTool): void {
    this.activeToolSignal.set(tool);
    this.draftSketchObjectSignal.set(null);
  }

  addSketchObject(object: SketchObject): void {
    this.sketchObjectsSignal.update((objects) => [...objects, object]);
  }

  removeSketchObject(id: string): void {
    this.sketchObjectsSignal.update((objects) => objects.filter((object) => object.id !== id));

    if (this.selectedObjectIdSignal() === id) {
      this.selectedObjectIdSignal.set(null);
    }
  }

  selectObject(id: string | null): void {
    this.selectedObjectIdSignal.set(id);
  }

  clearMap(): void {
    this.sketchObjectsSignal.set([]);
    this.draftSketchObjectSignal.set(null);
    this.generatedMapSignal.set(emptyGeneratedMap());
    this.selectedObjectIdSignal.set(null);
  }

  setDraftSketchObject(object: SketchObject | null): void {
    this.draftSketchObjectSignal.set(object);
  }

  setGeneratedMap(map: GeneratedMap): void {
    this.generatedMapSignal.set(cloneGeneratedMap(map));
  }

  clearGeneratedMap(): void {
    this.generatedMapSignal.set(emptyGeneratedMap());
  }

  replaceProject(project: MapProject): void {
    this.projectIdSignal.set(project.id);
    this.projectNameSignal.set(project.name);
    this.createdAtSignal.set(project.createdAt);
    this.mapWidthSignal.set(Math.max(1, project.width));
    this.mapHeightSignal.set(Math.max(1, project.height));
    this.sketchObjectsSignal.set([...project.sketchObjects]);
    this.draftSketchObjectSignal.set(null);
    this.generatedMapSignal.set(cloneGeneratedMap(project.generatedMap));
    this.selectedObjectIdSignal.set(null);
  }

  exportProject(): MapProject {
    return {
      id: this.projectIdSignal(),
      name: this.projectNameSignal(),
      version: MAP_PROJECT_VERSION,
      width: this.mapWidthSignal(),
      height: this.mapHeightSignal(),
      sketchObjects: [...this.sketchObjectsSignal()],
      generatedMap: cloneGeneratedMap(this.generatedMapSignal()),
      createdAt: this.createdAtSignal(),
      updatedAt: new Date().toISOString(),
    };
  }
}
