import { isPointInZoneCoverage, isSegmentInZoneCoverage } from './zone-coverage.util';
import { ZoneSketch } from './sketch-object.model';

describe('zone coverage utilities', () => {
  it('treats overlapping brush stamps as one continuous coverage shape', () => {
    const zone: ZoneSketch = {
      id: 'zone-1',
      type: 'zone',
      zoneType: 'village',
      brushStamps: [
        { position: { x: 50, y: 50 }, radius: 28 },
        { position: { x: 96, y: 50 }, radius: 28 },
      ],
      density: 0.5,
    };

    expect(isPointInZoneCoverage({ x: 73, y: 50 }, zone)).toBe(true);
    expect(isSegmentInZoneCoverage({ x: 50, y: 50 }, { x: 96, y: 50 }, zone, 8)).toBe(true);
  });
});
