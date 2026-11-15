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

// The ground of the Moon or Mars base: a tiny round planet with the base on top.
// The map's walkable squares are flat, at y = 0, exactly where island() puts them. Around them
// the ground stays flat for a little way, then curves down and away like a ball, all the way
// round to the underside.
//   rows     the map's rows of letters (row 0, the sky, is left out, as in island())
//   look     { ground, light, dark, crater, side, deep } colours
//   options  cells, unit    cubes per map square, and the size of one cube (as in island())
//            flatMargin     flat ground kept beyond the corners of the walkable squares
//            radius         the planet's radius (default: 1.6 times the flat part)
//            blend          how softly the flat top turns into the curve (0 = a sharp edge)
//            rocks          false: no rocks and no extra craters outside the walkable squares
//            clear          cubes kept free of rocks around the walkable squares (for the edge lights)
// Returns the same things as the other builders, plus
//   planet: { radius, centre: [x, y, z], flatRadius }   the ball the ground is cut from
export function roundWorld(rows, look, {
  cells = 4, unit = 3, flatMargin = 5, radius = null, blend = 9, rocks = true, clear = 2
} = {}) {
  const across = rows[0].length;
  const deep = rows.length - 1;
  const halfX = (across * cells) / 2; // half the walkable squares, in cubes
  const halfZ = (deep * cells) / 2;
  const flatRadius = Math.hypot(halfX, halfZ) * unit + flatMargin;
  const R = Math.max(radius ?? Math.round(flatRadius * 1.6), flatRadius + unit);
  // The ball's middle is this far under the base. Its top is sliced off flat at y = 0.
  const drop = Math.sqrt(R * R - flatRadius * flatRadius) - blend;
  const half = Math.ceil(R / unit);
  const n = half * 2;
  const lowest = Math.floor((-drop - R) / unit); // the lowest row of cubes (cube i fills y = i*unit to (i+1)*unit)
  const ny = 1 - lowest; // rows of cubes from `lowest` up to 0 (a rock on the flat ground)

  // How high the smooth ground is at a point, or null past the planet's edge.
  // It is exactly 0 on the flat part, then eases into the ball.
  const heightAt = (wx, wz) => {
    const r2 = wx * wx + wz * wz;
    if (r2 >= R * R) return null;
    const ballTop = Math.sqrt(R * R - r2) - drop;
    const ease = blend > 0 ? Math.max(blend - Math.abs(ballTop), 0) ** 2 / (4 * blend) : 0;
    return Math.min(0, ballTop) - ease;
  };

  // One pass over the columns: the top and bottom cube of each, and how its top is painted.
  const GROUND = 0;
  const LIGHT = 1;
  const DARK = 2;
  const CRATER = 3;
  const tops = new Int16Array(n * n).fill(lowest - 1); // top below bottom = no column here
  const bottoms = new Int16Array(n * n);
  const paint = new Uint8Array(n * n);
  const isRock = new Uint8Array(n * n);
  const onMap = new Uint8Array(n * n);
  const middle = (cells - 1) / 2;
  for (let x = 0; x < n; x += 1) {
    for (let z = 0; z < n; z += 1) {
      const wx = (x - half + 0.5) * unit;
      const wz = (z - half + 0.5) * unit;
      const height = heightAt(wx, wz);
      if (height === null) continue;
      const k = x * n + z;
      let top = Math.round(height / unit) - 1;
      const gx = x - half + halfX; // cubes from the left edge of the walkable squares
      const gz = z - half + halfZ;
      const bx = Math.floor(gx / cells); // the map square (also counted on beyond the map)
      const bz = Math.floor(gz / cells);
      const lx = gx - bx * cells;
      const lz = gz - bz * cells;
      const inner = Math.abs(lx - middle) < middle && Math.abs(lz - middle) < middle; // not on the square's rim
      const speckle = cellNoise(x, z) > 0.82 ? LIGHT : GROUND;
      if (bx >= 0 && bx < across && bz >= 0 && bz < deep) {
        // On the map: the same craters and dark patches as the 2D map
        const letter = rows[bz + 1][bx];
        onMap[k] = 1;
        if (letter === 'o' && inner) {
          top -= 1;
          paint[k] = CRATER;
        } else paint[k] = letter === 'o' || letter === ',' ? DARK : speckle;
      } else {
        // Beyond the map: a few more craters, dark patches and rocks, so it looks like the Moon
        const outside = Math.max(-gx, gx - (across * cells - 1), -gz, gz - (deep * cells - 1));
        const patch = rocks && outside > clear + cells ? cellNoise(bx + 57, bz + 91) : 0;
        if (patch > 0.9 && inner) {
          top -= 1;
          paint[k] = CRATER;
        } else if (patch > 0.78) paint[k] = DARK;
        else if (rocks && outside > clear && cellNoise(x, z) > 0.95) {
          top += 1;
          isRock[k] = 1;
          paint[k] = LIGHT;
        } else paint[k] = speckle;
      }
      const bottom = Math.round((-drop - Math.sqrt(R * R - wx * wx - wz * wz)) / unit);
      if (bottom > top) continue;
      tops[k] = top;
      bottoms[k] = bottom;
    }
  }

  const PAINT = [look.ground, look.light, look.dark, look.crater];
  const equator = -drop / unit;
  const solid = (x, y, z) => {
    if (x < 0 || z < 0 || x >= n || z >= n || y < 0 || y >= ny) return false;
    const k = x * n + z;
    const i = y + lowest;
    return i <= tops[k] && i >= bottoms[k];
  };
  const color = (x, y, z, face) => {
    const k = x * n + z;
    const i = y + lowest;
    if (face === TOP && i === tops[k]) return PAINT[paint[k]];
    if (isRock[k] && i === tops[k]) return look.dark; // the sides of a rock
    if (onMap[k]) return look.dark; // the walls of a crater on the map
    // The steps of the curve: ground colour with a few dark stones, darker on the underside
    if (i < equator - half / 2) return look.deep;
    if (i < equator) return look.side;
    return cellNoise(x + i * 7, z - i * 3) > 0.85 ? look.dark : look.ground;
  };
  const block = voxelBlock(n, ny, n, solid, color, { unit, offsetY: lowest * unit });
  return { ...block, planet: { radius: R, centre: [0, -drop, 0], flatRadius } };
}
