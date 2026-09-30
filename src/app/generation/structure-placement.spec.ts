import { isPointInsidePolygon } from '../map-model/zone-coverage.util';
import { IndexedZone } from './generation-context';
import { distanceToPolyline, orientedRectCorners } from './road-network/road-geometry';
import { StructurePlacementService } from './structure-placement';

describe('StructurePlacementService', () => {
  const service = new StructurePlacementService();

  it('places village footprints deterministically on both sides of eligible frontage', () => {
    const zone = rectangleZone('village', 0, 0, 600, 300);
    const network = {
      nodes: [
        { id: 'a', position: { x: 60, y: 150 }, kind: 'endpoint' as const },
        { id: 'b', position: { x: 540, y: 150 }, kind: 'endpoint' as const },
      ],
      edges: [
        {
          id: 'street',
          fromNodeId: 'a',
          toNodeId: 'b',
          points: [
            { x: 60, y: 150 },
            { x: 540, y: 150 },
          ],
          width: 10,
          roadClass: 'street' as const,
          source: { kind: 'district' as const, id: zone.object.id },
          districtId: `${zone.object.id}:region-0`,
        },
      ],
    };
    const first = service.generateForZone(zone, [zone], [], network);
    const second = service.generateForZone(zone, [zone], [], network);
    const buildings = first.filter((object) => object.type === 'generated-building');

    expect(second).toEqual(first);
    expect(buildings.some((building) => building.position.y < 150)).toBe(true);
    expect(buildings.some((building) => building.position.y > 150)).toBe(true);

    for (const building of buildings) {
      expect(
        orientedRectCorners({
          position: building.position,
          width: building.width,
          height: building.height,
          rotation: building.rotation ?? 0,
        }).every((corner) => isPointInsidePolygon(corner, zone.object.polygon!)),
      ).toBe(true);
      expect(distanceToPolyline(building.position, network.edges[0].points)).toBeGreaterThan(
        network.edges[0].width / 2,
      );
      expect(Math.abs(Math.sin(building.rotation ?? 0))).toBeLessThan(0.2);
    }
  });

  it('reduces requested density when a complete footprint cannot fit', () => {
    const zone = rectangleZone('constrained', 0, 0, 120, 38);
    const network = {
      nodes: [
        { id: 'a', position: { x: 10, y: 19 }, kind: 'endpoint' as const },
        { id: 'b', position: { x: 110, y: 19 }, kind: 'endpoint' as const },
      ],
      edges: [
        {
          id: 'street',
          fromNodeId: 'a',
          toNodeId: 'b',
          points: [
            { x: 10, y: 19 },
            { x: 110, y: 19 },
          ],
          width: 10,
          roadClass: 'street' as const,
          source: { kind: 'district' as const, id: zone.object.id },
          districtId: `${zone.object.id}:region-0`,
        },
      ],
    };

    expect(service.generateForZone(zone, [zone], [], network).length).toBeLessThan(3);
  });
});

function rectangleZone(
  id: string,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): IndexedZone {
  return {
    index: 0,
    object: {
      id,
      type: 'zone',
      zoneType: 'village',
      polygon: [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
      ],
      density: 1,
    },
  };
}
