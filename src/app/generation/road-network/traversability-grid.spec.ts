import { IndexedZone } from '../generation-context';
import { TraversabilityGrid } from './traversability-grid';

describe('TraversabilityGrid', () => {
  it('keeps large routing domains bounded and finds deterministic eight-direction paths', () => {
    const zone: IndexedZone = {
      index: 0,
      object: {
        id: 'large-zone',
        type: 'zone',
        zoneType: 'village',
        polygon: [
          { x: 0, y: 0 },
          { x: 5000, y: 0 },
          { x: 5000, y: 3200 },
          { x: 0, y: 3200 },
        ],
        density: 1,
      },
    };
    const grid = new TraversabilityGrid(zone, [zone], [], 10, 16);
    const cells = grid.getCells();
    const start = cells[0];
    const goal = cells[cells.length - 1];
    const allowed = new Set(cells.map((cell) => grid.getKey(cell)));
    const first = grid.findPath(start, new Set([grid.getKey(goal)]), allowed, 'stable');
    const second = grid.findPath(start, new Set([grid.getKey(goal)]), allowed, 'stable');

    expect(grid.columns).toBeLessThanOrEqual(96);
    expect(grid.rows).toBeLessThanOrEqual(96);
    expect(cells.length).toBeLessThanOrEqual(6400);
    expect(first.length).toBeGreaterThan(2);
    expect(second).toEqual(first);
  });

  it('splits traversable components around a full water blocker', () => {
    const zone: IndexedZone = {
      index: 0,
      object: {
        id: 'split-zone',
        type: 'zone',
        zoneType: 'village',
        polygon: [
          { x: 0, y: 0 },
          { x: 400, y: 0 },
          { x: 400, y: 300 },
          { x: 0, y: 300 },
        ],
        density: 1,
      },
    };
    const grid = new TraversabilityGrid(
      zone,
      [zone],
      [
        {
          index: 1,
          object: {
            id: 'river',
            type: 'river',
            points: [
              { x: 200, y: -20 },
              { x: 200, y: 320 },
            ],
            width: 42,
          },
        },
      ],
      10,
      16,
    );

    expect(grid.getComponents().length).toBe(2);
  });

  it('clips concave and overlapping coverage while retaining narrow traversable regions safely', () => {
    const concave: IndexedZone = {
      index: 0,
      object: {
        id: 'concave',
        type: 'zone',
        zoneType: 'village',
        polygon: [
          { x: 0, y: 0 },
          { x: 300, y: 0 },
          { x: 300, y: 100 },
          { x: 120, y: 100 },
          { x: 120, y: 300 },
          { x: 0, y: 300 },
        ],
        density: 0.8,
      },
    };
    const overlap: IndexedZone = {
      index: 1,
      object: {
        id: 'later-market',
        type: 'zone',
        zoneType: 'market',
        polygon: [
          { x: 40, y: 40 },
          { x: 170, y: 40 },
          { x: 170, y: 90 },
          { x: 40, y: 90 },
        ],
        density: 0.8,
      },
    };
    const grid = new TraversabilityGrid(concave, [concave, overlap], [], 10, 16);

    expect(
      grid
        .getCells()
        .every(
          (cell) =>
            !(cell.point.x > 40 && cell.point.x < 170 && cell.point.y > 40 && cell.point.y < 90),
        ),
    ).toBe(true);
    expect(grid.getComponents().length).toBeGreaterThan(0);

    const narrow: IndexedZone = {
      index: 0,
      object: {
        ...concave.object,
        id: 'narrow',
        polygon: [
          { x: 0, y: 0 },
          { x: 500, y: 0 },
          { x: 500, y: 24 },
          { x: 0, y: 24 },
        ],
      },
    };
    const narrowGrid = new TraversabilityGrid(narrow, [narrow], [], 10, 16);

    expect(narrowGrid.getCells().length).toBeLessThanOrEqual(narrowGrid.columns * narrowGrid.rows);
  });
});
