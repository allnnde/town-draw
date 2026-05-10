import { Injectable, inject } from '@angular/core';
import { EraseToolService } from '../../tools/erase-tool.service';
import { RiverToolService } from '../../tools/river-tool.service';
import { RoadToolService } from '../../tools/road-tool.service';
import { SelectToolService } from '../../tools/select-tool.service';
import { ToolPointerEvent } from '../../tools/tool-pointer-event.model';
import { ZoneToolService } from '../../tools/zone-tool.service';
import { EditorStateService } from './editor-state.service';

@Injectable({ providedIn: 'root' })
export class ToolDispatcherService {
  private readonly state = inject(EditorStateService);
  private readonly selectTool = inject(SelectToolService);
  private readonly riverTool = inject(RiverToolService);
  private readonly roadTool = inject(RoadToolService);
  private readonly zoneTool = inject(ZoneToolService);
  private readonly eraseTool = inject(EraseToolService);

  handlePointerDown(event: ToolPointerEvent): void {
    const activeTool = this.state.activeTool();

    switch (activeTool) {
      case 'select':
        this.selectTool.onPointerDown(event);
        return;
      case 'river':
        this.riverTool.onPointerDown(event);
        return;
      case 'road':
        this.roadTool.onPointerDown(event);
        return;
      case 'zone-village':
      case 'zone-market':
      case 'zone-forest':
      case 'zone-industrial':
        this.zoneTool.onPointerDown(event, activeTool);
        return;
      case 'erase':
        this.eraseTool.onPointerDown(event);
        return;
    }
  }

  handlePointerMove(event: ToolPointerEvent): void {
    switch (this.state.activeTool()) {
      case 'river':
        this.riverTool.onPointerMove(event);
        return;
      case 'road':
        this.roadTool.onPointerMove(event);
        return;
      case 'zone-village':
      case 'zone-market':
      case 'zone-forest':
      case 'zone-industrial':
        this.zoneTool.onPointerMove(event);
        return;
      case 'select':
      case 'erase':
        return;
    }
  }

  handlePointerUp(event: ToolPointerEvent): void {
    switch (this.state.activeTool()) {
      case 'river':
        this.riverTool.onPointerUp(event);
        return;
      case 'road':
        this.roadTool.onPointerUp(event);
        return;
      case 'zone-village':
      case 'zone-market':
      case 'zone-forest':
      case 'zone-industrial':
        this.zoneTool.onPointerUp(event);
        return;
      case 'select':
      case 'erase':
        return;
    }
  }
}
