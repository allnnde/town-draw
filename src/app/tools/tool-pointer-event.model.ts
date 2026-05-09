import { Point } from '../map-model/point.model';

export interface ToolPointerEvent {
  position: Point;
  pointerId: number;
}
