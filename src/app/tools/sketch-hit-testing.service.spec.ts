import { SketchObject } from '../map-model/sketch-object.model';
import { SketchHitTestingService } from './sketch-hit-testing.service';

describe('SketchHitTestingService', () => {
  const service = new SketchHitTestingService();

  it('selects brush-painted zones by stamp coverage', () => {
    const zone: SketchObject = {
      id: 'zone-1',
      type: 'zone',
      zoneType: 'forest',
      brushStamps: [{ position: { x: 50, y: 50 }, radius: 20 }],
      density: 0.7,
    };

    expect(service.findObjectAt({ x: 60, y: 50 }, [zone])?.id).toBe('zone-1');
    expect(service.findObjectAt({ x: 90, y: 50 }, [zone])).toBeNull();
  });

  it('selects brush-painted zones across merged adjacent stamps', () => {
    const zone: SketchObject = {
      id: 'zone-merged',
      type: 'zone',
      zoneType: 'village',
      brushStamps: [
        { position: { x: 50, y: 50 }, radius: 24 },
        { position: { x: 94, y: 50 }, radius: 24 },
      ],
      density: 0.5,
    };

    expect(service.findObjectAt({ x: 72, y: 50 }, [zone])?.id).toBe('zone-merged');
  });

  it('keeps legacy polygon zone hit testing compatible', () => {
    const zone: SketchObject = {
      id: 'zone-legacy',
      type: 'zone',
      zoneType: 'village',
      polygon: [
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        { x: 40, y: 40 },
        { x: 0, y: 40 },
      ],
      density: 0.5,
    };

    expect(service.findObjectAt({ x: 20, y: 20 }, [zone])?.id).toBe('zone-legacy');
    expect(service.findObjectAt({ x: 60, y: 20 }, [zone])).toBeNull();
  });

  it('uses polygon coverage before retained brush stamps for completed zones', () => {
    const zone: SketchObject = {
      id: 'zone-polygon-first',
      type: 'zone',
      zoneType: 'market',
      polygon: [
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        { x: 40, y: 40 },
        { x: 0, y: 40 },
      ],
      brushStamps: [{ position: { x: 200, y: 200 }, radius: 80 }],
      density: 0.5,
    };

    expect(service.findObjectAt({ x: 20, y: 20 }, [zone])?.id).toBe('zone-polygon-first');
    expect(service.findObjectAt({ x: 200, y: 200 }, [zone])).toBeNull();
  });
});
