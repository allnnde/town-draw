import { MapProject } from '../map-model/map-project.model';
import { ExportImportService } from './export-import.service';

describe('ExportImportService', () => {
  const service = new ExportImportService();

  it('normalizes legacy brush-only zones to polygon coverage on import', async () => {
    const project: MapProject = {
      id: 'project-1',
      name: 'Legacy Project',
      version: 1,
      width: 800,
      height: 600,
      sketchObjects: [
        {
          id: 'legacy-zone',
          type: 'zone',
          zoneType: 'village',
          brushStamps: [
            { position: { x: 80, y: 80 }, radius: 40 },
            { position: { x: 120, y: 80 }, radius: 40 },
          ],
          density: 0.5,
        },
      ],
      generatedObjects: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    const imported = await service.importProject(
      new File([JSON.stringify(project)], 'legacy-project.json', { type: 'application/json' }),
    );
    const zone = imported.sketchObjects[0];

    expect(zone.type).toBe('zone');

    if (zone.type === 'zone') {
      expect(zone.polygon?.length).toBeGreaterThanOrEqual(3);
      expect(zone.brushStamps).toBeUndefined();
    }
  });

  it('clamps corrupted imported zone polygons to map bounds and clears stale generation', async () => {
    const project: MapProject = {
      id: 'project-1',
      name: 'Corrupted Project',
      version: 1,
      width: 1200,
      height: 800,
      sketchObjects: [
        {
          id: 'corrupted-zone',
          type: 'zone',
          zoneType: 'village',
          polygon: [
            { x: 900, y: 100 },
            { x: 1674, y: -54 },
            { x: 1300, y: 857 },
            { x: 894, y: 434 },
          ],
          density: 0.5,
        },
      ],
      generatedObjects: [
        {
          id: 'generated-corrupted-zone-street-branch-0',
          type: 'generated-internal-path',
          points: [
            { x: 900, y: 100 },
            { x: 1674, y: -54 },
          ],
          width: 10,
          pathType: 'street',
        },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    const imported = await service.importProject(
      new File([JSON.stringify(project)], 'corrupted-project.json', { type: 'application/json' }),
    );
    const zone = imported.sketchObjects[0];

    expect(imported.generatedObjects).toEqual([]);
    expect(zone.type).toBe('zone');

    if (zone.type === 'zone') {
      expect(zone.polygon?.every((point) => point.x >= 0 && point.x <= 1200)).toBe(true);
      expect(zone.polygon?.every((point) => point.y >= 0 && point.y <= 800)).toBe(true);
    }
  });
});
