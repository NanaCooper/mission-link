// A small top-down map, like an old pixel role-playing game.
// The character walks one square at a time and can use the place in front of them.
// Pure functions only (no React), so both maps share them and they are easy to test.
// A map is a picture and a way to choose a move. It never changes the game rules.

export const TILE = 12; // one square of the map, in squares of the drawing

export const DIRECTIONS = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0]
};

// Keyboard keys for walking and for "use".
export const KEY_TO_DIRECTION = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
  W: 'up',
  S: 'down',
  A: 'left',
  D: 'right'
};
export const USE_KEYS = [' ', 'Enter', 'e', 'E'];

// Builds a map from rows of letters.
//   rows      one string per row, all the same length
//   blocked   letters you cannot walk on (sky, rocks, walls)
//   places    letter -> place id. Places are solid; you use them from the square next to them.
// Returns { width, height, rows, blocked: Set('x,y'), places: [{ id, tiles: [[x, y]] }] }
export function buildMap(rows, { blocked = '', places = {} } = {}) {
  const height = rows.length;
  const width = rows[0].length;
  const solid = new Set();
  const byId = new Map();

  rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`Map row ${y} is ${row.length} long, expected ${width}`);
    [...row].forEach((letter, x) => {
      const id = places[letter];
      if (id) {
        if (!byId.has(id)) byId.set(id, { id, tiles: [] });
        byId.get(id).tiles.push([x, y]);
        solid.add(`${x},${y}`);
      } else if (blocked.includes(letter)) {
        solid.add(`${x},${y}`);
      }
    });
  });

  return { width, height, rows, blocked: solid, places: [...byId.values()] };
}

export function canStand(map, x, y) {
  return x >= 0 && y >= 0 && x < map.width && y < map.height && !map.blocked.has(`${x},${y}`);
}

// One step. The character always turns to face the way they pressed,
// and moves only if that square is free.
export function stepHero(map, hero, direction) {
  const delta = DIRECTIONS[direction];
  if (!delta) return hero;
  const x = hero.x + delta[0];
  const y = hero.y + delta[1];
  if (canStand(map, x, y)) return { x, y, facing: direction };
  return hero.facing === direction ? hero : { ...hero, facing: direction };
}

function placeAt(map, x, y) {
  return map.places.find((place) => place.tiles.some(([px, py]) => px === x && py === y)) ?? null;
}

// The place the character can use: the one they face first, otherwise any place right next to them.
export function placeNearHero(map, hero) {
  const [dx, dy] = DIRECTIONS[hero.facing] ?? DIRECTIONS.down;
  const ahead = placeAt(map, hero.x + dx, hero.y + dy);
  if (ahead) return ahead;
  for (const [nx, ny] of Object.values(DIRECTIONS)) {
    const next = placeAt(map, hero.x + nx, hero.y + ny);
    if (next) return next;
  }
  return null;
}

// The top-left corner of a place, in squares of the drawing (for drawing its sprite).
export function placeCorner(place) {
  const xs = place.tiles.map(([x]) => x);
  const ys = place.tiles.map(([, y]) => y);
  return { x: Math.min(...xs) * TILE, y: Math.min(...ys) * TILE };
}

// The middle top of a place, in squares of the drawing (for the "you can use this" arrow).
export function placeTop(place) {
  const xs = place.tiles.map(([x]) => x);
  const ys = place.tiles.map(([, y]) => y);
  const left = Math.min(...xs) * TILE;
  const right = (Math.max(...xs) + 1) * TILE;
  return { x: Math.round((left + right) / 2), y: Math.min(...ys) * TILE };
}
