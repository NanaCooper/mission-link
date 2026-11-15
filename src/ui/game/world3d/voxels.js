// Turns the game's pixel sprites into blocks of little cubes ("voxels") for the 3D view.
// One letter of a sprite = one pixel = one cube, with the same colour from PALETTE.
// Pure functions, no three.js: they return plain number arrays, so they are easy to test.
// scene.js turns the arrays into three.js meshes.
//
// Every builder returns { positions, normals, colors, faces, size }:
//   positions, normals, colors   Float32Array, 3 numbers per corner, 6 corners per square face
//   faces                        how many square faces were kept (faces between two cubes are skipped)
//   size                         [width, height, depth] of the block
// The block stands on y = 0 and is centred on x = 0, z = 0.
import { PALETTE } from '../../components/pixel/sprites.js';

// The six faces of a cube: which way it points, and its four corners in counter-clockwise order
// seen from outside (so the graphics card draws the outside).
export const FACES = [
  { normal: [1, 0, 0], corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  { normal: [-1, 0, 0], corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { normal: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { normal: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { normal: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { normal: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] }
];
const RIGHT = 0;
const LEFT = 1;
const TOP = 2;
const FRONT = 4;
const BACK = 5;

// A little baked shade per face, so the blocks read well even in flat light: tops brightest.
const SHADE = [0.9, 0.9, 1, 0.7, 0.96, 0.84];
const TWO_TRIANGLES = [0, 1, 2, 0, 2, 3];
const MISSING = [1, 0, 1]; // magenta: easy to spot if a letter has no colour

const rgbCache = new Map();
// '#ffcd75' -> [1, 0.80, 0.46]
export function hexToRgb(hex) {
  if (rgbCache.has(hex)) return rgbCache.get(hex);
  const match = /^#([0-9a-f]{6})$/i.exec(hex ?? '');
  const n = match ? parseInt(match[1], 16) : null;
  const rgb = n === null ? MISSING : [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  rgbCache.set(hex, rgb);
  return rgb;
}

// The core: walks a grid of nx * ny * nz cells and keeps every face that is not hidden by a
// neighbour.
//   solid(x, y, z)          true if that cell has a cube (must be false outside the grid)
//   color(x, y, z, face)    the colour of that face, '#rrggbb'
//   unit                    the size of one cube
//   offsetY                 moves the whole block up or down
export function voxelBlock(nx, ny, nz, solid, color, { unit = 1, offsetY = 0 } = {}) {
  const positions = [];
  const normals = [];
  const colors = [];
  const shiftX = (-nx * unit) / 2;
  const shiftZ = (-nz * unit) / 2;
  for (let x = 0; x < nx; x += 1) {
    for (let y = 0; y < ny; y += 1) {
      for (let z = 0; z < nz; z += 1) {
        if (!solid(x, y, z)) continue;
        for (let face = 0; face < 6; face += 1) {
          const [dx, dy, dz] = FACES[face].normal;
          if (solid(x + dx, y + dy, z + dz)) continue;
          const [r, g, b] = hexToRgb(color(x, y, z, face));
          const shade = SHADE[face];
          const { corners } = FACES[face];
          for (const i of TWO_TRIANGLES) {
            const [cx, cy, cz] = corners[i];
            positions.push((x + cx) * unit + shiftX, (y + cy) * unit + offsetY, (z + cz) * unit + shiftZ);
            normals.push(dx, dy, dz);
            colors.push(r * shade, g * shade, b * shade);
          }
        }
      }
    }
  }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    colors: new Float32Array(colors),
    faces: positions.length / 18,
    size: [nx * unit, ny * unit, nz * unit]
  };
}

// The letter at row r, column c of a sprite ('.' outside it, '.' = see-through)
export function letterAt(sprite, r, c) {
  if (r < 0 || r >= sprite.length || c < 0 || c >= sprite[0].length) return '.';
  return sprite[r][c];
}

const colorOf = (palette, letter) => palette[letter] ?? '#ff00ff';

// A flat sprite pushed out into a block `depth` cubes deep (crates, the lander, desks).
// The front keeps the sprite as drawn. The sides show the colour just inside the black outline,
// so a block is not all black from the side.
export function extrude(sprite, depth, palette = PALETTE) {
  const height = sprite.length;
  const width = sprite[0].length;
  const solid = (x, y, z) => z >= 0 && z < depth && letterAt(sprite, height - 1 - y, x) !== '.';
  return voxelBlock(width, height, depth, solid, (x, y, z, face) => {
    const r = height - 1 - y;
    let letter = letterAt(sprite, r, x);
    if (letter === 'K' && face !== FRONT && face !== BACK) {
      const [dx, dy] = FACES[face].normal;
      const inner = letterAt(sprite, r + dy, x - dx); // one step back inside the sprite
      if (inner !== '.') letter = inner;
    }
    return colorOf(palette, letter);
  });
}

// Round things (the dome, the shield tower, plants): the right half of the sprite spun round
// its middle, like a pot on a potter's wheel.
export function lathe(sprite, palette = PALETTE) {
  const height = sprite.length;
  const width = sprite[0].length;
  const middle = (width - 1) / 2;
  const column = (x, z) => Math.round(middle + Math.hypot(x - middle, z - middle));
  const solid = (x, y, z) => x >= 0 && x < width && z >= 0 && z < width && letterAt(sprite, height - 1 - y, column(x, z)) !== '.';
  return voxelBlock(width, height, width, solid, (x, y, z) => {
    const r = height - 1 - y;
    const c = column(x, z);
    let letter = letterAt(sprite, r, c);
    // The black outline would make the whole outside black: use the colour just inside it.
    for (let k = 1; letter === 'K' && k < 3; k += 1) {
      const inner = letterAt(sprite, r, c - k);
      if (inner !== '.' && inner !== 'K') letter = inner;
    }
    if (letter === 'K') {
      const below = letterAt(sprite, r + 1, c);
      if (below !== '.' && below !== 'K') letter = below;
    }
    return colorOf(palette, letter);
  });
}

// A character carved from three views: a cube is kept only if the front, the side and the back
// sprites all have a pixel there. Each face takes its colour from the view that looks at it.
//   front   seen from the front (the character looks at you)
//   side    seen from their right side, facing right (as in heroes.js)
//   back    seen from behind
// The character faces +z (towards the camera).
export function hull(front, side, back, palette = PALETTE) {
  const height = front.length;
  const width = front[0].length;
  const depth = side[0].length;
  const solid = (x, y, z) => {
    if (x < 0 || x >= width || y < 0 || y >= height || z < 0 || z >= depth) return false;
    const r = height - 1 - y;
    return front[r][x] !== '.' && side[r][z] !== '.' && back[r][width - 1 - x] !== '.';
  };
  return voxelBlock(width, height, depth, solid, (x, y, z, face) => {
    const r = height - 1 - y;
    if (face === FRONT) return colorOf(palette, front[r][x]);
    if (face === BACK) return colorOf(palette, back[r][width - 1 - x]);
    if (face === RIGHT || face === LEFT) return colorOf(palette, side[r][z]);
    return colorOf(palette, z >= depth / 2 ? front[r][x] : back[r][width - 1 - x]);
  });
}

// A ball `n` cubes wide, painted with a square sprite seen from the front (Earth in the sky).
export function ball(sprite, n, palette = PALETTE) {
  const middle = (n - 1) / 2;
  const scale = sprite.length / n;
  const solid = (x, y, z) =>
    x >= 0 && y >= 0 && z >= 0 && x < n && y < n && z < n && Math.hypot(x - middle, y - middle, z - middle) <= n / 2;
  return voxelBlock(n, n, n, solid, (x, y) => {
    const letter = letterAt(sprite, Math.floor((n - 1 - y) * scale), Math.floor(x * scale));
    return colorOf(palette, letter === '.' || letter === 'K' ? 'B' : letter);
  });
}

// A small fixed "random" number in 0..1 for a cell, so the ground looks the same every time.
export function cellNoise(x, z) {
  let n = Math.imul(x + 101, 374761393) ^ Math.imul(z + 7, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

// The ground the map stands on: a thick slab like a floating piece of the Moon (or a room floor).
// Row 0 of the map (sky or wall) is left out; rows 1 to the end are the walkable ground.
// Each map square is `cells` x `cells` cubes of `unit` size, plus a rim of `margin` cubes.
//   rows       the map's rows of letters
//   look       { ground, light, dark, crater, side, deep, checker? } colours
//                checker: true gives a floor of tiles (ground and dark, square by square)
//   depthMax   how thick the slab gets in the middle (in cubes)
// The walkable top is at y = 0. Craters ('o') dip one cube. A few rocks stand on the rim.
export function island(rows, look, { depthMax = 9, cells = 4, unit = 3, margin = 2, rocks = true } = {}) {
  const across = rows[0].length;
  const deep = rows.length - 1;
  const nx = across * cells + margin * 2;
  const nz = deep * cells + margin * 2;
  const top = 12;
  const tile = (x, z) => {
    const tx = Math.floor((x - margin) / cells);
    const ty = Math.floor((z - margin) / cells) + 1;
    if (x < margin || z < margin || tx >= across || ty > deep) return null;
    return { letter: rows[ty][tx], tx, ty };
  };
  const inCrater = (x, z) => {
    const t = tile(x, z);
    if (!t || t.letter !== 'o') return false;
    const lx = (x - margin) % cells;
    const lz = (z - margin) % cells;
    return lx > 0 && lx < cells - 1 && lz > 0 && lz < cells - 1;
  };
  const surface = (x, z) => {
    if (inCrater(x, z)) return top - 1;
    if (rocks && !tile(x, z) && cellNoise(x, z) > 0.86) return top + 1;
    return top;
  };
  const thickness = (x, z) => {
    const edge = Math.min(x, z, nx - 1 - x, nz - 1 - z);
    return Math.min(depthMax, 2 + Math.floor(edge * 0.9 + cellNoise(z, x) * 2));
  };
  const solid = (x, y, z) => x >= 0 && z >= 0 && x < nx && z < nz && y <= surface(x, z) && y >= top - thickness(x, z);
  const color = (x, y, z, face) => {
    if (face === TOP && y === surface(x, z)) {
      const t = tile(x, z);
      if (inCrater(x, z)) return look.crater;
      if (t && t.letter === 'o') return look.dark;
      if (look.checker && t) return (t.tx + t.ty) % 2 ? look.ground : look.dark;
      if (t && t.letter === ',') return look.dark;
      return cellNoise(x, z) > 0.82 ? look.light : look.ground;
    }
    const below = top - y;
    if (below <= 0) return look.dark;
    return below < 3 ? look.side : look.deep;
  };
  return voxelBlock(nx, top + 2, nz, solid, color, { unit, offsetY: -(top + 1) * unit });
}
