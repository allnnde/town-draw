import { Injectable, inject } from '@angular/core';
import { EditorStateService } from '../editor/services/editor-state.service';
import { SketchHitTestingService } from './sketch-hit-testing.service';
import { ToolPointerEvent } from './tool-pointer-event.model';

@Injectable({ providedIn: 'root' })
export class SelectToolService {
  private readonly state = inject(EditorStateService);
  private readonly hitTesting = inject(SketchHitTestingService);

  onPointerDown(event: ToolPointerEvent): void {
    const object = this.hitTesting.findObjectAt(event.position, this.state.sketchObjects());
    this.state.selectObject(object?.id ?? null);
  }
}
