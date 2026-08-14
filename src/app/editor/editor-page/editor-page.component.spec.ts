import { TestBed } from '@angular/core/testing';
import { MapGeneratorService } from '../../generation/map-generator.service';
import { emptyGeneratedMap } from '../../map-model/generated-map.model';
import { ExportImportService } from '../../storage/export-import.service';
import { EditorStateService } from '../services/editor-state.service';
import { EditorPageComponent } from './editor-page.component';

describe('EditorPageComponent generation publishing', () => {
  it('keeps the previous generated map when candidate generation fails', () => {
    const state = new EditorStateService();
    const previous = emptyGeneratedMap();
    previous.objects.push({ id: 'tree', type: 'generated-tree', position: { x: 10, y: 10 } });
    state.setGeneratedMap(previous);
    TestBed.configureTestingModule({
      providers: [
        { provide: EditorStateService, useValue: state },
        {
          provide: MapGeneratorService,
          useValue: {
            generate: () => {
              throw new Error('invalid candidate');
            },
          },
        },
        { provide: ExportImportService, useValue: {} },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new EditorPageComponent());

    component.generateMap();

    expect(component.generationError).toBe('invalid candidate');
    expect(state.generatedMap()).toEqual(previous);
  });
});
