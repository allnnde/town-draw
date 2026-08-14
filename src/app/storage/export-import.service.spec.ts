import { GENERATED_MAP_SCHEMA_VERSION, emptyGeneratedMap } from '../map-model/generated-map.model';
import { MAP_PROJECT_VERSION, MapProject } from '../map-model/map-project.model';
import { ExportImportService } from './export-import.service';

describe('ExportImportService', () => {
  const service = new ExportImportService();

  it('round-trips a current project with an explicit road network', async () => {
    const project: MapProject = {
      ...baseProject(),
      generatedMap: {
        schemaVersion: GENERATED_MAP_SCHEMA_VERSION,
        roadNetwork: {
          nodes: [
            { id: 'a', position: { x: 10, y: 20 }, kind: 'endpoint' },
            { id: 'b', position: { x: 100, y: 20 }, kind: 'endpoint' },
          ],
          edges: [
            {
              id: 'edge',
              fromNodeId: 'a',
              toNodeId: 'b',
              points: [
                { x: 10, y: 20 },
                { x: 100, y: 20 },
              ],
              width: 7,
              roadClass: 'secondary',
              source: { kind: 'sketch', id: 'road' },
            },
          ],
        },
        objects: [],
      },
    };

    const imported = await importValue(project);

    expect(imported).toEqual(project);
    expect(imported.migrationNotice).toBeUndefined();
  });

  it('preserves legacy sketches and discards independent generated polylines', async () => {
    const legacy = {
      ...baseProject(),
      version: 1,
      generatedMap: undefined,
      generatedObjects: [
        {
          id: 'legacy-street',
          type: 'generated-internal-path',
          points: [
            { x: 10, y: 10 },
            { x: 100, y: 100 },
          ],
          width: 10,
          pathType: 'street',
        },
      ],
    };

    const imported = await importValue(legacy);

    expect(imported.version).toBe(MAP_PROJECT_VERSION);
    expect(imported.sketchObjects).toEqual(legacy.sketchObjects);
    expect(imported.generatedMap).toEqual(emptyGeneratedMap());
    expect(imported.migrationNotice).toContain('formato anterior');
  });

  it('normalizes legacy brush-only zones and clears stale generation', async () => {
    const legacy = {
      ...baseProject(),
      version: 1,
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
      generatedMap: undefined,
      generatedObjects: [],
    };
    const imported = await importValue(legacy);
    const zone = imported.sketchObjects[0];

    expect(zone.type).toBe('zone');

    if (zone.type === 'zone') {
      expect(zone.polygon?.length).toBeGreaterThanOrEqual(3);
      expect(zone.brushStamps).toBeUndefined();
    }

    expect(imported.generatedMap).toEqual(emptyGeneratedMap());
    expect(imported.migrationNotice).toContain('normalizada');
  });

  it('clears a current generated map whose graph references missing nodes', async () => {
    const invalid = {
      ...baseProject(),
      generatedMap: {
        schemaVersion: GENERATED_MAP_SCHEMA_VERSION,
        roadNetwork: {
          nodes: [{ id: 'a', position: { x: 10, y: 20 }, kind: 'endpoint' }],
          edges: [
            {
              id: 'invalid',
              fromNodeId: 'a',
              toNodeId: 'missing',
              points: [
                { x: 10, y: 20 },
                { x: 100, y: 20 },
              ],
              width: 7,
              roadClass: 'secondary',
              source: { kind: 'sketch', id: 'road' },
            },
          ],
        },
        objects: [],
      },
    };
    const imported = await importValue(invalid);

    expect(imported.sketchObjects).toEqual(invalid.sketchObjects);
    expect(imported.generatedMap).toEqual(emptyGeneratedMap());
    expect(imported.migrationNotice).toContain('invariantes');
  });

  it('clears an unsupported generated schema while retaining semantic sketches', async () => {
    const unsupported = {
      ...baseProject(),
      generatedMap: { schemaVersion: 999, roadNetwork: { nodes: [], edges: [] }, objects: [] },
    };
    const imported = await importValue(unsupported);

    expect(imported.sketchObjects).toEqual(unsupported.sketchObjects);
    expect(imported.generatedMap).toEqual(emptyGeneratedMap());
    expect(imported.migrationNotice).toContain('no es compatible');
  });

  it('rejects invalid project shells without replacing editor state', async () => {
    await expect(importValue({ name: 'not-a-project' })).rejects.toThrow(
      'formato de proyecto TownDraw',
    );
  });

  function importValue(value: unknown): Promise<MapProject> {
    return service.importProject(
      new File([JSON.stringify(value)], 'project.json', { type: 'application/json' }),
    );
  }
});

function baseProject(): MapProject {
  return {
    id: 'project-1',
    name: 'Test Project',
    version: MAP_PROJECT_VERSION,
    width: 800,
    height: 600,
    sketchObjects: [
      {
        id: 'road',
        type: 'road',
        points: [
          { x: 20, y: 50 },
          { x: 300, y: 50 },
        ],
        roadType: 'secondary',
      },
    ],
    generatedMap: emptyGeneratedMap(),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}
