import { Point } from '../../map-model/point.model';
import { getZoneBounds, getZoneCoveragePolygon } from '../../map-model/zone-coverage.util';
import {
  IndexedRiver,
  IndexedZone,
  isEffectiveZonePoint,
  isPointBlockedByRivers,
} from '../generation-context';
import {
  createRandom,
  distance,
  distanceToPolyline,
  distanceToPolygonBoundary,
  isSegmentValid,
} from './road-geometry';

export interface GridCell {
  column: number;
  row: number;
  point: Point;
}

interface SearchState {
  cell: GridCell;
  direction: number;
  cost: number;
  score: number;
  previousKey?: string;
}

interface OpenEntry {
  key: string;
  state: SearchState;
}

const DIRECTIONS = [
  { column: 1, row: 0 },
  { column: 1, row: 1 },
  { column: 0, row: 1 },
  { column: -1, row: 1 },
  { column: -1, row: 0 },
  { column: -1, row: -1 },
  { column: 0, row: -1 },
  { column: 1, row: -1 },
] as const;

export class TraversabilityGrid {
  readonly cellSize: number;
  readonly columns: number;
  readonly rows: number;
  private readonly cells = new Map<string, GridCell>();
  private readonly polygon: readonly Point[];
  private readonly minX: number;
  private readonly minY: number;

  constructor(
    private readonly zone: IndexedZone,
    private readonly zones: readonly IndexedZone[],
    private readonly rivers: readonly IndexedRiver[],
    private readonly roadWidth: number,
    private readonly waterClearance: number,
  ) {
    const bounds = getZoneBounds(zone.object);
    this.polygon = getZoneCoveragePolygon(zone.object);
    this.minX = bounds?.minX ?? 0;
    this.minY = bounds?.minY ?? 0;
    const width = Math.max(1, (bounds?.maxX ?? 0) - this.minX);
    const height = Math.max(1, (bounds?.maxY ?? 0) - this.minY);
    const baseSize = Math.max(roadWidth + 4, 12, Math.hypot(width, height) / 58);
    const boundedSize = Math.max(baseSize, Math.sqrt((width * height) / 6400));
    this.cellSize = Math.ceil(boundedSize);
    this.columns = Math.min(96, Math.max(1, Math.ceil(width / this.cellSize)));
    this.rows = Math.min(96, Math.max(1, Math.ceil(height / this.cellSize)));
    this.populate();
  }

  getCells(): GridCell[] {
    return [...this.cells.values()].sort(
      (first, second) => first.row - second.row || first.column - second.column,
    );
  }

  getComponents(): GridCell[][] {
    const remaining = new Map(this.cells);
    const components: GridCell[][] = [];

    while (remaining.size > 0) {
      const first = remaining.values().next().value as GridCell | undefined;

      if (!first) {
        break;
      }

      const component: GridCell[] = [];
      const queue = [first];
      remaining.delete(this.key(first.column, first.row));

      while (queue.length > 0) {
        const cell = queue.shift();

        if (!cell) {
          continue;
        }

        component.push(cell);

        for (const direction of DIRECTIONS) {
          const key = this.key(cell.column + direction.column, cell.row + direction.row);
          const neighbor = remaining.get(key);

          if (neighbor) {
            remaining.delete(key);
            queue.push(neighbor);
          }
        }
      }

      components.push(component);
    }

    return components.sort((first, second) => second.length - first.length);
  }

  getKey(cell: GridCell): string {
    return this.key(cell.column, cell.row);
  }

  getNearestCell(point: Point, allowed?: ReadonlySet<string>): GridCell | null {
    let nearest: GridCell | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const cell of this.cells.values()) {
      if (allowed && !allowed.has(this.getKey(cell))) {
        continue;
      }

      const candidateDistance = distance(point, cell.point);

      if (candidateDistance < nearestDistance) {
        nearest = cell;
        nearestDistance = candidateDistance;
      }
    }

    return nearest;
  }

  findPath(
    start: GridCell,
    goalKeys: ReadonlySet<string>,
    allowedKeys: ReadonlySet<string>,
    seed: string,
  ): GridCell[] {
    const random = createRandom(seed);
    const noise = new Map<string, number>();
    const open = new MinHeap<OpenEntry>(
      (first, second) =>
        first.state.score - second.state.score ||
        first.state.cost - second.state.cost ||
        first.key.localeCompare(second.key),
    );
    const closed = new Set<string>();
    const startState: SearchState = {
      cell: start,
      direction: -1,
      cost: 0,
      score: this.heuristic(start, goalKeys),
    };
    const startKey = this.stateKey(start, -1);
    open.push({ key: startKey, state: startState });
    const allStates = new Map<string, SearchState>([[startKey, startState]]);

    while (open.size > 0) {
      const currentEntry = open.pop();

      if (!currentEntry) {
        break;
      }

      const { key: currentKey, state: current } = currentEntry;

      if (closed.has(currentKey) || allStates.get(currentKey) !== current) {
        continue;
      }

      closed.add(currentKey);

      if (
        goalKeys.has(this.getKey(current.cell)) &&
        this.getKey(current.cell) !== this.getKey(start)
      ) {
        return this.reconstruct(currentKey, allStates);
      }

      for (let directionIndex = 0; directionIndex < DIRECTIONS.length; directionIndex += 1) {
        const direction = DIRECTIONS[directionIndex];
        const neighbor = this.cells.get(
          this.key(current.cell.column + direction.column, current.cell.row + direction.row),
        );

        if (!neighbor || !allowedKeys.has(this.getKey(neighbor))) {
          continue;
        }

        const diagonal = direction.column !== 0 && direction.row !== 0;
        const turn = current.direction >= 0 && current.direction !== directionIndex ? 0.28 : 0;
        const noiseKey = this.getKey(neighbor);

        if (!noise.has(noiseKey)) {
          noise.set(noiseKey, random() * 0.16);
        }

        const cost =
          current.cost +
          (diagonal ? Math.SQRT2 : 1) +
          turn +
          (noise.get(noiseKey) ?? 0) +
          this.clearancePenalty(neighbor.point);
        const stateKey = this.stateKey(neighbor, directionIndex);
        const existing = allStates.get(stateKey);

        if (existing && existing.cost <= cost) {
          continue;
        }

        const state: SearchState = {
          cell: neighbor,
          direction: directionIndex,
          cost,
          score: cost + this.heuristic(neighbor, goalKeys),
          previousKey: currentKey,
        };
        open.push({ key: stateKey, state });
        allStates.set(stateKey, state);
      }
    }

    return [];
  }

  isSegmentTraversable(start: Point, end: Point): boolean {
    return isSegmentValid(start, end, (point) => this.isPointTraversable(point), this.cellSize / 2);
  }

  private populate(): void {
    for (let row = 0; row < this.rows; row += 1) {
      for (let column = 0; column < this.columns; column += 1) {
        const point = {
          x: this.minX + (column + 0.5) * this.cellSize,
          y: this.minY + (row + 0.5) * this.cellSize,
        };

        if (this.isPointTraversable(point)) {
          this.cells.set(this.key(column, row), { column, row, point });
        }
      }
    }
  }

  private isPointTraversable(point: Point): boolean {
    return (
      isEffectiveZonePoint(point, this.zone, this.zones) &&
      distanceToPolygonBoundary(point, this.polygon) >= this.roadWidth / 2 + 1 &&
      !isPointBlockedByRivers(point, this.rivers, this.waterClearance + this.roadWidth / 2)
    );
  }

  private heuristic(cell: GridCell, goalKeys: ReadonlySet<string>): number {
    let result = 0;
    let found = false;

    for (const goalKey of goalKeys) {
      const goal = this.cells.get(goalKey);

      if (!goal) {
        continue;
      }

      const candidate = Math.hypot(goal.column - cell.column, goal.row - cell.row);

      if (!found || candidate < result) {
        result = candidate;
        found = true;
      }
    }

    return found ? result : 0;
  }

  private clearancePenalty(point: Point): number {
    const boundaryClearance = distanceToPolygonBoundary(point, this.polygon) - this.roadWidth / 2;
    const boundaryPenalty = Math.max(0, this.cellSize * 1.5 - boundaryClearance) / this.cellSize;
    const riverClearance = this.rivers.reduce(
      (result, river) =>
        Math.min(
          result,
          distanceToPolyline(point, river.object.points) -
            river.object.width / 2 -
            this.waterClearance -
            this.roadWidth / 2,
        ),
      Number.POSITIVE_INFINITY,
    );
    const waterPenalty = Number.isFinite(riverClearance)
      ? Math.max(0, this.cellSize * 1.5 - riverClearance) / this.cellSize
      : 0;
    return Math.min(0.55, (boundaryPenalty + waterPenalty) * 0.18);
  }

  private reconstruct(key: string, states: ReadonlyMap<string, SearchState>): GridCell[] {
    const result: GridCell[] = [];
    let currentKey: string | undefined = key;

    while (currentKey) {
      const state = states.get(currentKey);

      if (!state) {
        break;
      }

      result.push(state.cell);
      currentKey = state.previousKey;
    }

    return result.reverse();
  }

  private stateKey(cell: GridCell, direction: number): string {
    return `${this.getKey(cell)}:${direction}`;
  }

  private key(column: number, row: number): string {
    return `${column}:${row}`;
  }
}

class MinHeap<T> {
  private readonly values: T[] = [];

  constructor(private readonly compare: (first: T, second: T) => number) {}

  get size(): number {
    return this.values.length;
  }

  push(value: T): void {
    this.values.push(value);
    let index = this.values.length - 1;

    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);

      if (this.compare(this.values[parent], value) <= 0) {
        break;
      }

      this.values[index] = this.values[parent];
      index = parent;
    }

    this.values[index] = value;
  }

  pop(): T | undefined {
    const first = this.values[0];
    const last = this.values.pop();

    if (!first || !last || this.values.length === 0) {
      return first;
    }

    let index = 0;

    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;

      if (left >= this.values.length) {
        break;
      }

      const child =
        right < this.values.length && this.compare(this.values[right], this.values[left]) < 0
          ? right
          : left;

      if (this.compare(this.values[child], last) >= 0) {
        break;
      }

      this.values[index] = this.values[child];
      index = child;
    }

    this.values[index] = last;
    return first;
  }
}
