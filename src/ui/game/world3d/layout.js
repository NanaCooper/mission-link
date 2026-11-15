// Where things go in the 3D view, and how the camera looks at them.
// Pure functions, no three.js, so they are easy to test.
//
// The 3D world uses the same map as the 2D one (worldMap.js). One map square is TILE3 units wide.
// Row 0 of a map is the sky (base) or the wall (control room); the walkable rows start at row 1.
// The ground is centred on x = 0, z = 0: x grows to the right, z grows towards the camera
// (down the map), y grows up.

export const TILE3 = 12;

// Rim of ground around the walkable squares (island() in voxels.js: 2 cubes of 3 units)
export const RIM = 6;

// The middle of map square (x, y), on the ground
export function gridToWorld(map, x, y) {
  return {
    x: (x + 0.5) * TILE3 - (map.width * TILE3) / 2,
    z: (y + 0.5) * TILE3 - ((map.height + 1) * TILE3) / 2
  };
}

// The middle of a place (a place can cover several squares: the shelter, the radio desk)
export function placeCentre(map, place) {
  const points = place.tiles.map(([x, y]) => gridToWorld(map, x, y));
  return {
    x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
    z: points.reduce((sum, p) => sum + p.z, 0) / points.length
  };
}

// The middle of all the squares with this letter in the map, or null if there are none
export function letterCentre(map, letter) {
  const tiles = [];
  map.rows.forEach((row, y) => [...row].forEach((l, x) => l === letter && tiles.push([x, y])));
  return tiles.length ? placeCentre(map, { tiles }) : null;
}

// Every square with this letter, as ground points
export function letterSpots(map, letter) {
  const spots = [];
  map.rows.forEach((row, y) => [...row].forEach((l, x) => l === letter && spots.push(gridToWorld(map, x, y))));
  return spots;
}

// The 2D map's drawing squares (x right, y down, 12 per map square) to a 3D ground point
export function drawingToWorld(map, x, y) {
  return { x: x - (map.width * TILE3) / 2, z: y - TILE3 - ((map.height - 1) * TILE3) / 2 };
}

// Which way a character looks, as a turn round the up axis. They face the camera (+z) at 0.
export const FACING_ANGLE = { down: 0, up: Math.PI, right: Math.PI / 2, left: -Math.PI / 2 };

// Turns an angle part of the way (k: 0..1) towards another, the short way round
export function turnToward(current, target, k) {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + diff * Math.min(1, Math.max(0, k));
}

// Moves a point towards another by at most `step`. Far jumps (a new game) snap straight there.
export function moveToward(from, to, step, snapBeyond = 30) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const distance = Math.hypot(dx, dz);
  if (distance === 0 || distance > snapBeyond || distance <= step) return { x: to.x, z: to.z, distance };
  return { x: from.x + (dx / distance) * step, z: from.z + (dz / distance) * step, distance };
}

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

// The camera: above and in front of the map, like looking at a model base on a table.
// It keeps the whole width in view when the box is wide enough. In a narrow box (a phone held
// upright) it moves sideways with the character, but never past the edges of the map.
//   aspect      width / height of the box
//   fov         the camera's top-to-bottom view angle, in degrees
//   map         the map (for its width)
//   hero        { x, z } the character on the ground
//   lookHeight  how high the camera aims (higher for the control room, to show the wall)
// Returns { target: { x, y, z }, position: { x, y, z } }
export const CAMERA_FOV = 38;
const CAMERA_TILT = { y: 0.4, z: 1 }; // the way from the target to the camera (about 22 degrees up)

export function frameCamera({ aspect, fov = CAMERA_FOV, map, hero, lookHeight = 4 }) {
  const halfWidth = (map.width * TILE3) / 2 + RIM;
  const tanH = Math.tan(((fov / 2) * Math.PI) / 180) * Math.max(0.2, aspect);
  const distance = clamp((halfWidth / tanH) * 1.1, 100, 240);
  const visibleHalf = distance * tanH;
  const room = Math.max(0, halfWidth - visibleHalf);
  const x = room > 0 ? clamp(hero.x, -room, room) : hero.x * 0.15;
  const z = hero.z * 0.25;
  const length = Math.hypot(CAMERA_TILT.y, CAMERA_TILT.z);
  return {
    target: { x, y: lookHeight, z },
    position: { x, y: lookHeight + (CAMERA_TILT.y / length) * distance, z: z + (CAMERA_TILT.z / length) * distance }
  };
}

// The colours of the ground and the light, per world. Moon and Mars match the 2D map (BaseMap.jsx).
export const LOOK_3D = {
  moon: {
    ground: '#94b0c2', light: '#a9bdd0', dark: '#566c86', crater: '#333c57', side: '#566c86', deep: '#333c57',
    sky: 0xdfe8f0, low: 0x333c57, background: 0x05060d
  },
  mars: {
    ground: '#b0553a', light: '#ef7d57', dark: '#7d3626', crater: '#4a2418', side: '#7d3626', deep: '#5d275d',
    sky: 0xffd9b8, low: 0x5d275d, background: 0x120a12
  },
  room: {
    ground: '#29366f', light: '#29366f', dark: '#333c57', crater: '#333c57', side: '#333c57', deep: '#1a1c2c',
    checker: true, sky: 0xc9d6e8, low: 0x29366f, background: 0x10111f
  }
};
