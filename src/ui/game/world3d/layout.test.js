import { describe, it, expect } from 'vitest';
import {
  gridToWorld, placeCentre, letterCentre, letterSpots, drawingToWorld, FACING_ANGLE, turnToward, moveToward, frameCamera, TILE3
} from './layout.js';
import { BASE_MAP, BASE_START } from '../world/baseMapData.js';
import { ROOM_MAP } from '../world/controlRoomData.js';

describe('map squares in 3D', () => {
  it('the walkable squares are centred on 0', () => {
    expect(gridToWorld(BASE_MAP, 0, 1)).toEqual({ x: -54, z: -30 });
    expect(gridToWorld(BASE_MAP, 9, 6)).toEqual({ x: 54, z: 30 });
  });

  it('neighbouring squares are one square apart', () => {
    const a = gridToWorld(BASE_MAP, BASE_START.x, BASE_START.y);
    const b = gridToWorld(BASE_MAP, BASE_START.x + 1, BASE_START.y);
    const c = gridToWorld(BASE_MAP, BASE_START.x, BASE_START.y + 1);
    expect(b.x - a.x).toBe(TILE3);
    expect(c.z - a.z).toBe(TILE3);
  });

  it('a place two squares wide sits between them (the shelter, the radio desk)', () => {
    const shelter = BASE_MAP.places.find((p) => p.id === 'shelter');
    expect(placeCentre(BASE_MAP, shelter)).toEqual({ x: 0, z: -18 });
    const radio = ROOM_MAP.places.find((p) => p.id === 'radio');
    expect(placeCentre(ROOM_MAP, radio).x).toBe(-12);
  });

  it('finds the things just there to look at, by their letter', () => {
    expect(letterCentre(BASE_MAP, 'L')).toEqual({ x: 12, z: 30 }); // the lander, two squares
    expect(letterCentre(BASE_MAP, 'Z')).toBeNull();
    expect(letterSpots(ROOM_MAP, 'p')).toHaveLength(2); // two plants
  });

  it('the 2D drawing and the 3D ground line up', () => {
    // The top left of row 1 in the drawing is (0, 12)
    expect(drawingToWorld(BASE_MAP, 0, 12)).toEqual({ x: -60, z: -36 });
    expect(drawingToWorld(BASE_MAP, 6, 18)).toEqual(gridToWorld(BASE_MAP, 0, 1));
  });
});

describe('turning and walking', () => {
  it('faces the camera when facing down, and away when facing up', () => {
    expect(FACING_ANGLE.down).toBe(0);
    expect(FACING_ANGLE.up).toBe(Math.PI);
  });

  it('turns the short way round', () => {
    const halfway = turnToward(-Math.PI / 2, Math.PI, 0.5); // from left to up: through the back
    expect(halfway).toBeCloseTo((-3 * Math.PI) / 4);
    expect(turnToward(0, Math.PI / 2, 1)).toBeCloseTo(Math.PI / 2);
  });

  it('slides towards the next square, and snaps on a big jump (a new game)', () => {
    const step = moveToward({ x: 0, z: 0 }, { x: 12, z: 0 }, 4);
    expect(step.x).toBe(4);
    expect(step.distance).toBe(12);
    const done = moveToward({ x: 10, z: 0 }, { x: 12, z: 0 }, 4);
    expect(done.x).toBe(12);
    const jump = moveToward({ x: 0, z: 0 }, { x: 60, z: 0 }, 4);
    expect(jump.x).toBe(60);
  });
});

describe('the camera', () => {
  it('is above and in front of what it looks at', () => {
    const view = frameCamera({ aspect: 16 / 9, map: BASE_MAP, hero: { x: 0, z: 0 } });
    expect(view.position.y).toBeGreaterThan(view.target.y);
    expect(view.position.z).toBeGreaterThan(view.target.z);
  });

  it('a wide screen keeps the whole base in view and hardly moves', () => {
    const left = frameCamera({ aspect: 16 / 9, map: BASE_MAP, hero: { x: -54, z: 0 } });
    expect(Math.abs(left.target.x)).toBeLessThan(10);
  });

  it('a narrow screen follows the character, but not past the edge of the map', () => {
    const near = frameCamera({ aspect: 0.5, map: BASE_MAP, hero: { x: -20, z: 0 } });
    expect(near.target.x).toBe(-20);
    const edge = frameCamera({ aspect: 0.5, map: BASE_MAP, hero: { x: -54, z: 0 } });
    expect(edge.target.x).toBeGreaterThan(-54);
  });

  it('never goes too close or too far', () => {
    for (const aspect of [0.3, 0.6, 1, 1.6, 2.4, 4]) {
      const view = frameCamera({ aspect, map: BASE_MAP, hero: { x: 0, z: 0 } });
      const distance = Math.hypot(view.position.y - view.target.y, view.position.z - view.target.z);
      expect(distance).toBeGreaterThanOrEqual(99.9);
      expect(distance).toBeLessThanOrEqual(240.1);
    }
  });
});
