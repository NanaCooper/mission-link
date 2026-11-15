import { describe, it, expect } from 'vitest';
import {
  gridToWorld, placeCentre, letterCentre, letterSpots, drawingToWorld, FACING_ANGLE, turnToward, moveToward, frameCamera, walkFeel, TILE3,
  edgeLights, PLANET_MARGIN, CAMERA_FOV, LOOK_3D
} from './layout.js';
import { roundWorld } from './voxels.js';
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

// Where a point lands in the picture for a camera from frameCamera: x and y from -1 to 1 are in view
function onScreen(view, aspect, point) {
  const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
  const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
  const unit = (v) => {
    const length = Math.hypot(v.x, v.y, v.z);
    return { x: v.x / length, y: v.y / length, z: v.z / length };
  };
  const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
  const forward = unit(sub(view.target, view.position));
  const right = unit(cross(forward, { x: 0, y: 1, z: 0 }));
  const up = cross(right, forward);
  const to = sub(point, view.position);
  const depth = dot(to, forward);
  const tan = Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180);
  return { x: dot(to, right) / (depth * tan * aspect), y: dot(to, up) / (depth * tan) };
}

describe('the camera on the round planet (the base)', () => {
  const corners = [[-60, -36], [60, -36], [-60, 36], [60, 36]].map(([x, z]) => ({ x, y: 0, z }));
  const { flatRadius } = roundWorld(BASE_MAP.rows, LOOK_3D.moon).planet;
  const planetView = (aspect, hero = { x: 0, z: 0 }) => frameCamera({ aspect, map: BASE_MAP, hero, margin: PLANET_MARGIN });

  it('still keeps the whole walkable area in view on wide and square screens', () => {
    for (const aspect of [1, 4 / 3, 16 / 9, 2.2, 3]) {
      const view = planetView(aspect);
      for (const corner of corners) {
        const spot = onScreen(view, aspect, corner);
        expect(Math.abs(spot.x)).toBeLessThan(0.95);
        expect(Math.abs(spot.y)).toBeLessThan(0.95);
      }
    }
  });

  it('stands further back than the control room camera, so the planet and space fit in', () => {
    const close = frameCamera({ aspect: 16 / 9, map: BASE_MAP, hero: { x: 0, z: 0 } });
    expect(planetView(16 / 9).position.z).toBeGreaterThan(close.position.z + 30);
  });

  it('shows the curve against space: the flat top ends inside the picture, with sky above the horizon', () => {
    const aspect = 16 / 9;
    const view = planetView(aspect);
    // Left and right: the ground is seen curving down beside the flat top
    for (const x of [-flatRadius, flatRadius]) {
      expect(Math.abs(onScreen(view, aspect, { x, y: 0, z: 0 }).x)).toBeLessThan(0.8);
    }
    // Behind the base: the horizon is in the top half, with space above it
    const horizon = onScreen(view, aspect, { x: 0, y: 0, z: -flatRadius });
    expect(horizon.y).toBeGreaterThan(0);
    expect(horizon.y).toBeLessThan(0.6);
  });

  it('a narrow screen (a phone held upright) still follows Nova and stops at the edge of the map', () => {
    const edge = planetView(0.46, { x: -54, z: 0 });
    expect(edge.target.x).toBeLessThan(0);
    expect(edge.target.x).toBeGreaterThan(-54);
    // Nova is in view there
    expect(Math.abs(onScreen(edge, 0.46, { x: -54, y: 0, z: 0 }).x)).toBeLessThan(0.95);
  });

  it('the control room is framed as before (its own small rim)', () => {
    const room = frameCamera({ aspect: 16 / 9, map: ROOM_MAP, hero: { x: 0, z: 0 }, lookHeight: 12 });
    const distance = Math.hypot(room.position.y - room.target.y, room.position.z - room.target.z);
    const tanH = Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180) * (16 / 9);
    expect(distance).toBeCloseTo((((ROOM_MAP.width * TILE3) / 2 + 6) / tanH) * 1.1);
  });
});

describe('the dotted line of lights round the walking area (edgeLights)', () => {
  const lights = edgeLights(BASE_MAP);

  it('runs just outside the walkable squares, never on them', () => {
    for (const light of lights) {
      expect(Math.max(Math.abs(light.x) - 60, Math.abs(light.z) - 36)).toBeCloseTo(3);
    }
  });

  it('goes all the way round, with small even gaps and no light twice', () => {
    for (let i = 0; i < lights.length; i += 1) {
      const next = lights[(i + 1) % lights.length];
      const gap = Math.hypot(next.x - lights[i].x, next.z - lights[i].z);
      expect(gap).toBeGreaterThan(4);
      expect(gap).toBeLessThan(8);
    }
    expect(new Set(lights.map((light) => `${light.x},${light.z}`)).size).toBe(lights.length);
  });

  it('a wider gap gives fewer lights', () => {
    expect(edgeLights(BASE_MAP, { gap: 12 }).length).toBeLessThan(lights.length);
  });
});

describe('how the character moves (walkFeel)', () => {
  it('on Earth: a quick walk, no hop, about the old speed', () => {
    const earth = walkFeel({ stepMs: 170 });
    expect(earth.hopTime).toBe(0);
    expect(earth.hopHeight).toBe(0);
    expect(earth.speed).toBeGreaterThan(70);
  });

  it('on the Moon and Mars: slow hops, highest and slowest on the Moon', () => {
    const moon = walkFeel({ stepMs: 420, world: 'moon' });
    const mars = walkFeel({ stepMs: 300, world: 'mars' });
    expect(moon.hopTime).toBeGreaterThan(mars.hopTime);
    expect(moon.hopHeight).toBeGreaterThan(mars.hopHeight);
    expect(moon.speed).toBeLessThan(mars.speed);
    expect(moon.dustTime).toBeGreaterThan(mars.dustTime);
  });

  it('slides one square a little faster than the pace, so a held key never falls behind', () => {
    const moon = walkFeel({ stepMs: 420, world: 'moon' });
    const secondsPerSquare = TILE3 / moon.speed;
    expect(secondsPerSquare).toBeLessThan(0.42);
    expect(moon.hopTime).toBeCloseTo(secondsPerSquare); // in the air for the whole slide
  });
});
