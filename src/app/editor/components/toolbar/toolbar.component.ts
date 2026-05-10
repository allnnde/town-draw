import { Component, inject } from '@angular/core';
import { EditorStateService } from '../../services/editor-state.service';
import { EditorTool } from '../../../map-model/editor-tool.model';

interface ToolButton {
  id: EditorTool;
  label: string;
}

@Component({
  selector: 'app-toolbar',
  imports: [],
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.css',
})
export class ToolbarComponent {
  readonly state = inject(EditorStateService);
  readonly tools: readonly ToolButton[] = [
    { id: 'select', label: 'Seleccionar' },
    { id: 'river', label: 'Rio' },
    { id: 'road', label: 'Carretera' },
    { id: 'zone-village', label: 'Poblado' },
    { id: 'zone-market', label: 'Mercado' },
    { id: 'zone-forest', label: 'Bosque' },
    { id: 'zone-industrial', label: 'Industria' },
    { id: 'erase', label: 'Borrar' },
  ];

  setTool(tool: EditorTool): void {
    this.state.setActiveTool(tool);
  }
}
