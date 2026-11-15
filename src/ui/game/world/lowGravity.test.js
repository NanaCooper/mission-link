import { describe, it, expect } from 'vitest';
import { BASE_MAP, BASE_START, BASE_STEP_MS } from './baseMapData.js';
import { WALK_REPEAT_MS, DIRECTIONS, canStand, stepWait, celebrationFor } from './worldMap.js';

// The fewest steps from the start to stand next to a place (walking round craters and machines)
function stepsToPlace(map, start, placeId) {
  const place = map.places.find((p) => p.id === placeId);
  const next = (x, y) => Object.values(DIRECTIONS).some(([dx, dy]) => place.tiles.some(([px, py]) => px === x + dx && py === y + dy));
  const seen = new Set([`${start.x},${start.y}`]);
  let ring = [[start.x, start.y]];
  for (let steps = 0; ring.length; steps += 1) {
    if (ring.some(([x, y]) => next(x, y))) return steps;
    const after = [];
    for (const [x, y] of ring) {
      for (const [dx, dy] of Object.values(DIRECTIONS)) {
        const key = `${x + dx},${y + dy}`;
        if (!seen.has(key) && canStand(map, x + dx, y + dy)) {
          seen.add(key);
          after.push([x + dx, y + dy]);
        }
      }
    }
    ring = after;
  }
  return Infinity;
}

describe('low gravity: Nova walks slowly on the Moon and Mars', () => {
  it('the Moon is slowest, Mars a bit faster, and both slower than Earth', () => {
    expect(BASE_STEP_MS.moon).toBeGreaterThan(BASE_STEP_MS.mars);
    expect(BASE_STEP_MS.mars).toBeGreaterThan(WALK_REPEAT_MS);
  });

  it('every place is still close: at most about 3 seconds of walking from the start', () => {
    for (const place of BASE_MAP.places) {
      const steps = stepsToPlace(BASE_MAP, BASE_START, place.id);
      expect(steps, place.id).toBeLessThan(Infinity);
      // The first step goes at once, the others wait for the pace
      const ms = Math.max(0, steps - 1) * BASE_STEP_MS.moon;
      expect(ms, place.id).toBeLessThanOrEqual(3000);
    }
  });

  it('tapping fast cannot beat the pace: the next step waits until the pace has passed', () => {
    expect(stepWait(-Infinity, 1000, 420)).toBe(0); // the very first step goes at once
    expect(stepWait(1000, 1100, 420)).toBe(320); // tapped 100 ms after a step: wait 320 ms more
    expect(stepWait(1000, 1420, 420)).toBe(0);
    expect(stepWait(1000, 2000, 420)).toBe(0);
  });
});

describe('using a place', () => {
  const shelter = BASE_MAP.places.find((p) => p.id === 'shelter');

  it('celebrates (hop and sparkles) by default, as in the control room', () => {
    expect(celebrationFor({ count: 1, place: shelter })).toEqual({ hop: true, sparkle: shelter });
    expect(celebrationFor({ count: 1, place: shelter }, true)).toEqual({ hop: true, sparkle: shelter });
  });

  it('shows nothing on the Moon and Mars bases (celebrate off)', () => {
    expect(celebrationFor({ count: 3, place: shelter }, false)).toEqual({ hop: false, sparkle: null });
  });

  it('shows nothing before anything was used', () => {
    expect(celebrationFor({ count: 0, place: null })).toEqual({ hop: false, sparkle: null });
  });
});
