import { Component, inject } from '@angular/core';
import packageJson from '../../../../package.json';
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
  readonly appVersion = packageJson.version;
  readonly state = inject(EditorStateService);
  private readonly generator = inject(MapGeneratorService);
  private readonly exportImport = inject(ExportImportService);
  importError = '';
  generationError = '';
  importNotice = '';

  generateMap(): void {
    try {
      const generatedMap = this.generator.generate(this.state.sketchObjects());
      this.state.setGeneratedMap(generatedMap);
      this.generationError = '';
    } catch (error) {
      this.generationError =
        error instanceof Error ? error.message : 'No se pudo generar una red vial valida.';
    }
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
      this.importNotice = project.migrationNotice ?? '';
    } catch (error) {
      this.importError = error instanceof Error ? error.message : 'No se pudo importar el JSON.';
    } finally {
      input.value = '';
    }
  }

  clearMap(): void {
    this.state.clearMap();
    this.importError = '';
    this.importNotice = '';
    this.generationError = '';
  }
}
