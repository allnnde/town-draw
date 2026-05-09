import { Component, computed, inject } from '@angular/core';
import { EditorStateService } from '../../services/editor-state.service';
import { SketchObject } from '../../../map-model/sketch-object.model';

interface DetailRow {
  label: string;
  value: string;
}

@Component({
  selector: 'app-inspector-panel',
  imports: [],
  templateUrl: './inspector-panel.component.html',
  styleUrl: './inspector-panel.component.css',
})
export class InspectorPanelComponent {
  readonly state = inject(EditorStateService);
  readonly selectedObject = computed(() => {
    const selectedId = this.state.selectedObjectId();

    if (!selectedId) {
      return null;
    }

    return this.state.sketchObjects().find((object) => object.id === selectedId) ?? null;
  });
  readonly selectedTitle = computed(() => this.getObjectTitle(this.selectedObject()));
  readonly details = computed(() => this.getDetails(this.selectedObject()));

  private getObjectTitle(object: SketchObject | null): string {
    if (!object) {
      return 'Sin seleccion';
    }

    switch (object.type) {
      case 'river':
        return 'Rio';
      case 'road':
        return 'Carretera';
      case 'zone':
        return `Zona ${object.zoneType}`;
      case 'marker':
        return `Marcador ${object.markerType}`;
    }
  }

  private getDetails(object: SketchObject | null): DetailRow[] {
    if (!object) {
      return [];
    }

    const baseRows: DetailRow[] = [
      { label: 'ID', value: object.id },
      { label: 'Tipo', value: object.type },
    ];

    switch (object.type) {
      case 'river':
        return [
          ...baseRows,
          { label: 'Puntos', value: String(object.points.length) },
          { label: 'Ancho', value: String(object.width) },
        ];
      case 'road':
        return [
          ...baseRows,
          { label: 'Puntos', value: String(object.points.length) },
          { label: 'Tipo de camino', value: object.roadType },
        ];
      case 'zone':
        return [
          ...baseRows,
          { label: 'Tipo de zona', value: object.zoneType },
          { label: 'Vertices', value: String(object.polygon.length) },
          { label: 'Densidad', value: String(object.density) },
        ];
      case 'marker':
        return [
          ...baseRows,
          { label: 'Tipo de marcador', value: object.markerType },
          {
            label: 'Posicion',
            value: `${Math.round(object.position.x)}, ${Math.round(object.position.y)}`,
          },
        ];
    }
  }
}
