import { Component, inject } from '@angular/core';
import { MapGeneratorService } from '../../generation/map-generator.service';
import { ExportImportService } from '../../storage/export-import.service';
import { InspectorPanelComponent } from '../components/inspector-panel/inspector-panel.component';
import { PixiViewportComponent } from '../components/pixi-viewport/pixi-viewport.component';
import { ToolbarComponent } from '../components/toolbar/toolbar.component';
import { EditorStateService } from '../services/editor-state.service';

@Component({
  selector: 'app-editor-page',
  imports: [ToolbarComponent, PixiViewportComponent, InspectorPanelComponent],
  templateUrl: './editor-page.component.html',
  styleUrl: './editor-page.component.css',
})
export class EditorPageComponent {
  readonly state = inject(EditorStateService);
  private readonly generator = inject(MapGeneratorService);
  private readonly exportImport = inject(ExportImportService);
  importError = '';

  generateMap(): void {
    const generatedObjects = this.generator.generate(this.state.sketchObjects());
    this.state.setGeneratedObjects(generatedObjects);
  }

  exportJson(): void {
    this.exportImport.exportProject(this.state.exportProject());
  }

  async importJson(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);

    if (!file) {
      return;
    }

    try {
      const project = await this.exportImport.importProject(file);
      this.state.replaceProject(project);
      this.importError = '';
    } catch (error) {
      this.importError = error instanceof Error ? error.message : 'No se pudo importar el JSON.';
    } finally {
      input.value = '';
    }
  }

  clearMap(): void {
    this.state.clearMap();
    this.importError = '';
  }
}
