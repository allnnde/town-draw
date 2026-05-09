import { Injectable, signal } from '@angular/core';
import { EditorTool } from '../../map-model/editor-tool.model';
import { GeneratedMapObject } from '../../map-model/generated-object.model';
import { createId } from '../../map-model/id.util';
import { MapProject } from '../../map-model/map-project.model';
import { SketchObject } from '../../map-model/sketch-object.model';

const DEFAULT_MAP_WIDTH = 1200;
const DEFAULT_MAP_HEIGHT = 800;

@Injectable({ providedIn: 'root' })
export class EditorStateService {
  private readonly activeToolSignal = signal<EditorTool>('select');
  private readonly selectedObjectIdSignal = signal<string | null>(null);
  private readonly sketchObjectsSignal = signal<SketchObject[]>([]);
  private readonly draftSketchObjectSignal = signal<SketchObject | null>(null);
  private readonly generatedObjectsSignal = signal<GeneratedMapObject[]>([]);
  private readonly mapWidthSignal = signal(DEFAULT_MAP_WIDTH);
  private readonly mapHeightSignal = signal(DEFAULT_MAP_HEIGHT);
  private readonly projectIdSignal = signal(createId('project'));
  private readonly projectNameSignal = signal('Untitled TownDraw Map');
  private readonly createdAtSignal = signal(new Date().toISOString());

  readonly activeTool = this.activeToolSignal.asReadonly();
  readonly selectedObjectId = this.selectedObjectIdSignal.asReadonly();
  readonly sketchObjects = this.sketchObjectsSignal.asReadonly();
  readonly draftSketchObject = this.draftSketchObjectSignal.asReadonly();
  readonly generatedObjects = this.generatedObjectsSignal.asReadonly();
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
    this.generatedObjectsSignal.set([]);
    this.selectedObjectIdSignal.set(null);
  }

  setDraftSketchObject(object: SketchObject | null): void {
    this.draftSketchObjectSignal.set(object);
  }

  setGeneratedObjects(objects: GeneratedMapObject[]): void {
    this.generatedObjectsSignal.set([...objects]);
  }

  replaceProject(project: MapProject): void {
    this.projectIdSignal.set(project.id);
    this.projectNameSignal.set(project.name);
    this.createdAtSignal.set(project.createdAt);
    this.mapWidthSignal.set(Math.max(1, project.width));
    this.mapHeightSignal.set(Math.max(1, project.height));
    this.sketchObjectsSignal.set([...project.sketchObjects]);
    this.draftSketchObjectSignal.set(null);
    this.generatedObjectsSignal.set([...project.generatedObjects]);
    this.selectedObjectIdSignal.set(null);
  }

  exportProject(): MapProject {
    return {
      id: this.projectIdSignal(),
      name: this.projectNameSignal(),
      version: 1,
      width: this.mapWidthSignal(),
      height: this.mapHeightSignal(),
      sketchObjects: [...this.sketchObjectsSignal()],
      generatedObjects: [...this.generatedObjectsSignal()],
      createdAt: this.createdAtSignal(),
      updatedAt: new Date().toISOString(),
    };
  }
}
