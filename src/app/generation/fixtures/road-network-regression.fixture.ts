import { SketchObject } from '../../map-model/sketch-object.model';

export const ROAD_NETWORK_REGRESSION_SKETCHES = {
  disconnectedStreets: [
    road('disconnected-a', 20, 80, 170, 80),
    road('disconnected-b', 180, 80, 330, 80),
  ],
  accidentalCrossing: [
    road('crossing-horizontal', 40, 180, 360, 180),
    road('crossing-vertical', 200, 40, 200, 340),
  ],
  falseProximityConnection: [
    road('proximity-horizontal', 20, 120, 170, 120),
    road('proximity-vertical', 178, 120, 178, 260),
  ],
  blockedRoadAccess: [
    road('blocked-main', 40, 40, 560, 40, 'main'),
    {
      id: 'blocking-river',
      type: 'river',
      points: [
        { x: 20, y: 105 },
        { x: 580, y: 105 },
      ],
      width: 32,
    },
    {
      id: 'blocked-village',
      type: 'zone',
      zoneType: 'village',
      polygon: [
        { x: 120, y: 160 },
        { x: 480, y: 160 },
        { x: 480, y: 430 },
        { x: 120, y: 430 },
      ],
      density: 0.8,
    },
  ],
} satisfies Record<string, readonly SketchObject[]>;

function road(
  id: string,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  roadType: 'main' | 'secondary' | 'path' = 'secondary',
): SketchObject {
  return {
    id,
    type: 'road',
    points: [
      { x: startX, y: startY },
      { x: endX, y: endY },
    ],
    roadType,
  };
}
