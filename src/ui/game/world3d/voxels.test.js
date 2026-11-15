import { describe, it, expect } from 'vitest';
import { voxelBlock, extrude, lathe, hull, ball, island, roundWorld, hexToRgb, letterAt, FACES } from './voxels.js';
import { PALETTE, PIECES } from '../../components/pixel/sprites.js';
import { NOVA, SOLA } from '../world/heroes.js';
import * as PROPS from '../world/props.js';
import { BASE_MAP } from '../world/baseMapData.js';
import { ROOM_MAP } from '../world/controlRoomData.js';
import { LOOK_3D, gridToWorld } from './layout.js';

// The highest and lowest value of every 3rd number, starting at `axis` (0 = x, 1 = y, 2 = z)
function range(positions, axis) {
  let low = Infinity;
  let high = -Infinity;
  for (let i = axis; i < positions.length; i += 3) {
    low = Math.min(low, positions[i]);
    high = Math.max(high, positions[i]);
  }
  return [low, high];
}

const heroFrame = (sprites) =>
  hull(
    sprites.front.concat(sprites.legs.stand),
    sprites.side.concat(sprites.sideLegs.stand),
    sprites.back.concat(sprites.legs.stand.map((row) => [...row].reverse().join('')))
  );

describe('voxelBlock', () => {
  it('one cube has 6 faces of 2 triangles each', () => {
    const block = voxelBlock(1, 1, 1, (x, y, z) => x === 0 && y === 0 && z === 0, () => '#ffffff');
    expect(block.faces).toBe(6);
    expect(block.positions).toHaveLength(6 * 6 * 3);
    expect(block.normals).toHaveLength(block.positions.length);
    expect(block.colors).toHaveLength(block.positions.length);
  });

  it('skips the faces two cubes share', () => {
    // 2 cubes side by side: 12 faces, minus the 2 that touch
    const block = voxelBlock(2, 1, 1, (x, y, z) => x >= 0 && x < 2 && y === 0 && z === 0, () => '#ffffff');
    expect(block.faces).toBe(10);
  });

  it('stands on y = 0 and is centred on x and z', () => {
    const block = voxelBlock(4, 2, 6, (x, y, z) => x >= 0 && x < 4 && y >= 0 && y < 2 && z >= 0 && z < 6, () => '#ffffff', { unit: 3 });
    expect(range(block.positions, 0)).toEqual([-6, 6]);
    expect(range(block.positions, 1)).toEqual([0, 6]);
    expect(range(block.positions, 2)).toEqual([-9, 9]);
    expect(block.size).toEqual([12, 6, 18]);
  });

  it('each face points out of the cube (the normal matches the corners)', () => {
    for (const { normal, corners } of FACES) {
      const [a, b, c] = corners;
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      // (+ 0 turns -0 into 0)
      const cross = [u[1] * v[2] - u[2] * v[1] + 0, u[2] * v[0] - u[0] * v[2] + 0, u[0] * v[1] - u[1] * v[0] + 0];
      expect(cross).toEqual(normal);
    }
  });
});

describe('colours', () => {
  it('turns #rrggbb into 0..1 numbers, and a bad colour into magenta', () => {
    expect(hexToRgb('#ff0000')).toEqual([1, 0, 0]);
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
    expect(hexToRgb('nope')).toEqual([1, 0, 1]);
  });

  it('every colour stays between 0 and 1', () => {
    const block = extrude(PIECES.rover, 6);
    for (const value of block.colors) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('letterAt is see-through outside the sprite', () => {
    expect(letterAt(['KW'], 0, 1)).toBe('W');
    expect(letterAt(['KW'], 0, 2)).toBe('.');
    expect(letterAt(['KW'], -1, 0)).toBe('.');
  });
});

describe('models from the game sprites', () => {
  it('extrude keeps the sprite size and the depth', () => {
    const block = extrude(PIECES.solarPanel, 4);
    expect(block.size).toEqual([PIECES.solarPanel[0].length, PIECES.solarPanel.length, 4]);
    expect(block.faces).toBeGreaterThan(0);
  });

  it('extrude never shows the "missing colour" magenta for the game sprites', () => {
    const sprites = [PIECES.dome, PIECES.solarPanel, PIECES.rover, PIECES.earth, ...Object.values(PROPS)];
    for (const sprite of sprites) {
      const { colors } = extrude(sprite, 2);
      for (let i = 0; i < colors.length; i += 3) {
        const magenta = colors[i] > 0.6 && colors[i + 1] === 0 && colors[i + 2] > 0.6;
        expect(magenta).toBe(false);
      }
    }
  });

  it('lathe makes a round block as wide as it is deep', () => {
    const block = lathe(PIECES.dome);
    const width = PIECES.dome[0].length;
    expect(block.size).toEqual([width, PIECES.dome.length, width]);
    expect(range(block.positions, 0)).toEqual(range(block.positions, 2));
  });

  it('Nova and Sola become solid 3D characters, 10 wide and 14 tall', () => {
    for (const hero of [NOVA, SOLA]) {
      const block = heroFrame(hero.sprites);
      expect(block.size).toEqual([10, 14, 10]);
      expect(block.faces).toBeGreaterThan(100);
      expect(range(block.positions, 1)).toEqual([0, 14]);
    }
  });

  it('a character looks at the camera: its front face uses the front sprite colours', () => {
    const block = heroFrame(NOVA.sprites);
    const front = NOVA.sprites.front;
    // Faces pointing +z: pick their colours, they must come from the front sprite (or its shades)
    const shade = 0.96; // the front face's baked shade
    const letters = new Set([...front.join(''), ...NOVA.sprites.legs.stand.join('')].filter((l) => l !== '.'));
    const allowed = [...letters].map((l) => hexToRgb(PALETTE[l]).map((v) => v * shade));
    const close = (a, b) => a.every((v, k) => Math.abs(v - b[k]) < 1e-4);
    let checked = 0;
    for (let i = 0; i < block.normals.length; i += 3) {
      if (block.normals[i + 2] !== 1) continue;
      const rgb = [block.colors[i], block.colors[i + 1], block.colors[i + 2]];
      expect(allowed.some((c) => close(c, rgb))).toBe(true);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('Earth becomes a ball', () => {
    const block = ball(PIECES.earth, 16);
    expect(block.size).toEqual([16, 16, 16]);
    expect(block.faces).toBeGreaterThan(200);
  });
});

describe('the ground', () => {
  it('the base ground: walkable top at y = 0, the same size as the map plus a rim', () => {
    const block = island(BASE_MAP.rows, LOOK_3D.moon);
    expect(range(block.positions, 0)).toEqual([-66, 66]); // 10 squares of 12, plus 6 each side
    expect(range(block.positions, 2)).toEqual([-42, 42]); // 6 walkable rows of 12, plus 6 each side
    // Rocks on the rim stand 3 above the ground; the walkable top is at 0
    expect(range(block.positions, 1)[1]).toBe(3);
  });

  it('craters dip below the ground', () => {
    const block = island(BASE_MAP.rows, LOOK_3D.moon);
    let craterTop = false;
    for (let i = 0; i < block.positions.length; i += 3) {
      if (block.normals[i + 1] === 1 && block.positions[i + 1] === -3) craterTop = true;
    }
    expect(craterTop).toBe(true);
  });

  it('the control room floor is flat (no rocks, no craters)', () => {
    const block = island(ROOM_MAP.rows, LOOK_3D.room, { depthMax: 3, rocks: false });
    expect(range(block.positions, 1)[1]).toBe(0);
  });
});

// The middle of every face that points up: [{ x, y, z }]
function topFaces(block) {
  const list = [];
  for (let i = 0; i < block.positions.length; i += 18) {
    if (block.normals[i + 1] !== 1) continue;
    const xs = [];
    const zs = [];
    for (let k = 0; k < 18; k += 3) {
      xs.push(block.positions[i + k]);
      zs.push(block.positions[i + k + 2]);
    }
    list.push({
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: block.positions[i + 1],
      z: (Math.min(...zs) + Math.max(...zs)) / 2
    });
  }
  return list;
}

describe('the round planet under the base (roundWorld)', () => {
  const moon = roundWorld(BASE_MAP.rows, LOOK_3D.moon);
  const tops = topFaces(moon);
  // The walkable squares: 10 across and 6 deep, 12 units each, centred on 0
  const onSquares = (p, extra = 0) => Math.abs(p.x) < 60 + extra && Math.abs(p.z) < 36 + extra;
  const average = (list) => list.reduce((sum, p) => sum + p.y, 0) / list.length;
  const ring = (from, to) => tops.filter((p) => !onSquares(p) && Math.hypot(p.x, p.z) >= from && Math.hypot(p.x, p.z) < to);

  it('the walkable top is at y = 0, and every walkable square is there', () => {
    const walkable = tops.filter((p) => onSquares(p));
    expect(walkable).toHaveLength(10 * 6 * 16); // each square is 4 x 4 cubes
    const craterSquares = BASE_MAP.rows.join('').split('o').length - 1;
    expect(walkable.filter((p) => p.y === -3)).toHaveLength(craterSquares * 4); // craters dip one cube
    expect(walkable.filter((p) => p.y === 0)).toHaveLength(10 * 6 * 16 - craterSquares * 4);
  });

  it('is flat inside the walkable area: nothing sticks up, also not just outside it (the edge lights)', () => {
    let highest = -Infinity;
    for (let i = 0; i < moon.positions.length; i += 3) {
      const p = { x: moon.positions[i], y: moon.positions[i + 1], z: moon.positions[i + 2] };
      if (onSquares(p, 6)) highest = Math.max(highest, p.y);
    }
    expect(highest).toBe(0);
  });

  it('the craters are where the 2D map has them', () => {
    BASE_MAP.rows.forEach((row, y) => [...row].forEach((letter, x) => {
      if (letter !== 'o') return;
      const middle = gridToWorld(BASE_MAP, x, y);
      const dips = tops.filter((p) => p.y === -3 && Math.abs(p.x - middle.x) < 3 && Math.abs(p.z - middle.z) < 3);
      expect(dips).toHaveLength(4);
    }));
  });

  it('stays flat for a little way past the corners, then curves down more and more', () => {
    const { flatRadius, radius } = moon.planet;
    expect(flatRadius).toBeGreaterThan(Math.hypot(60, 36));
    expect(Math.abs(average(ring(0, flatRadius)))).toBeLessThan(1);
    const near = average(ring(flatRadius + 5, flatRadius + 15));
    const mid = average(ring(flatRadius + 20, flatRadius + 30));
    const far = average(ring(radius - 12, radius - 2));
    expect(near).toBeLessThan(-1);
    expect(mid).toBeLessThan(near - 5);
    expect(far).toBeLessThan(mid - 15);
    // It gets steeper on the way out, like a ball
    expect(mid - far).toBeGreaterThan(near - mid);
  });

  it('everything is inside the planet (give or take two cubes), all the way round to the underside', () => {
    const { radius, centre } = moon.planet;
    let furthest = 0;
    let lowest = 0;
    for (let i = 0; i < moon.positions.length; i += 3) {
      const d = Math.hypot(moon.positions[i] - centre[0], moon.positions[i + 1] - centre[1], moon.positions[i + 2] - centre[2]);
      furthest = Math.max(furthest, d);
      lowest = Math.min(lowest, moon.positions[i + 1]);
    }
    expect(furthest).toBeLessThanOrEqual(radius + 6);
    expect(centre[1]).toBeLessThan(0); // the middle of the ball is under the base
    expect(lowest).toBeLessThan(centre[1] - radius + 6); // the ball is whole: it has an underside
    expect(range(moon.positions, 0)[1]).toBeGreaterThan(radius - 6); // and it is as wide as the ball
  });

  it('keeps the map colours: ground, light, dark patches and craters, on the Moon and on Mars', () => {
    for (const look of [LOOK_3D.moon, LOOK_3D.mars]) {
      const block = roundWorld(BASE_MAP.rows, look);
      const allowed = [look.ground, look.light, look.dark, look.crater].map(hexToRgb);
      const close = (a, b) => a.every((v, k) => Math.abs(v - b[k]) < 1e-4);
      const used = new Set();
      let wrong = 0;
      for (let i = 0; i < block.positions.length; i += 18) {
        if (block.normals[i + 1] !== 1) continue; // tops have a shade of 1, so the colour is as written
        const rgb = [block.colors[i], block.colors[i + 1], block.colors[i + 2]];
        const which = allowed.findIndex((c) => close(c, rgb));
        if (which < 0) wrong += 1;
        used.add(which);
      }
      expect(wrong).toBe(0);
      expect(used.size).toBe(4);
    }
  });

  it('has rocks and a few more craters beyond the map, and none with rocks: false', () => {
    expect(range(moon.positions, 1)[1]).toBe(3); // a rock stands one cube above the flat ground
    const bare = roundWorld(BASE_MAP.rows, LOOK_3D.moon, { rocks: false });
    expect(range(bare.positions, 1)[1]).toBe(0);
    // With no rocks and no extra craters, the flat ground beyond the map is all at y = 0
    const flatBeyond = topFaces(bare).filter((p) => !onSquares(p) && Math.hypot(p.x, p.z) < bare.planet.flatRadius - 3);
    expect(flatBeyond.length).toBeGreaterThan(100);
    expect(flatBeyond.filter((p) => p.y !== 0)).toHaveLength(0);
  });

  it('is light enough for a phone: far under 200 000 triangles', () => {
    expect(moon.faces * 2).toBeLessThan(120000);
    expect(roundWorld(BASE_MAP.rows, LOOK_3D.mars).faces).toBe(moon.faces); // same shape, other colours
  });
});
