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
});
