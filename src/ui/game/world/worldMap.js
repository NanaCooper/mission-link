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

// Holding a key, an arrow button or the joystick takes one step this often (milliseconds).
export const WALK_REPEAT_MS = 170;

// The joystick: how far (in screen pixels) the thumb must move before Nova walks.
export const JOYSTICK_DEAD_ZONE = 12;

// Which way the joystick points. The map is a grid, so only up, down, left or right:
// the longer of the two pulls wins. Inside the dead zone it points nowhere (null).
// dx grows to the right, dy grows downwards (screen directions).
export function joystickDirection(dx, dy, deadZone = JOYSTICK_DEAD_ZONE) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null;
  if (Math.hypot(dx, dy) < deadZone) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

const TYPING_TAGS = ['INPUT', 'TEXTAREA', 'SELECT'];

// What a key press on the page should do to the map. Pure, so it is easy to test.
//   key, repeat    from the keyboard event (repeat = the OS repeating a held key)
//   modifier       true if Ctrl, Alt or Meta is held (leave shortcuts to the browser)
//   target         where the key press happened:
//                    tag         its tag name ('BUTTON', 'INPUT', ...)
//                    editable    true for contenteditable
//                    control     true for a button, link or tab (it has its own Enter / Space)
//                    inDialog    true if it is inside this map's text box
//                    inModal     true if it is inside some other full-screen dialog
//   dialogOpen     true while this map's text box (e.g. the radio menu) is open
// Returns null (leave the key alone) or one of:
//   { type: 'walk', direction }   start walking (held keys keep walking at WALK_REPEAT_MS)
//   { type: 'held' }              the OS repeating a key we already handle: swallow it
//   { type: 'use' }               use the place in front
//   { type: 'menu', step }        text box open: move to the previous (-1) or next (+1) choice
//   { type: 'pick' }              text box open: choose (highlights the first choice if none is)
//   { type: 'close' }             text box open: close it
export function mapKeyCommand({ key, repeat = false, modifier = false, target = {}, dialogOpen = false }) {
  if (modifier) return null;
  if (TYPING_TAGS.includes(target.tag) || target.editable) return null;
  if (target.inModal) return null;

  const direction = KEY_TO_DIRECTION[key];
  const isUse = USE_KEYS.includes(key);

  if (dialogOpen) {
    if (key === 'Escape') return { type: 'close' };
    if (direction) return { type: 'menu', step: direction === 'up' || direction === 'left' ? -1 : 1 };
    if (key === 'Enter' || key === ' ') {
      // A focused choice in the text box presses itself (the browser does it).
      if (target.inDialog && target.control) return null;
      return repeat ? { type: 'held' } : { type: 'pick' };
    }
    return null;
  }

  if (direction) return repeat ? { type: 'held' } : { type: 'walk', direction };
  if (isUse) {
    // Space or Enter on a focused button belongs to that button, not to the map.
    if (target.control) return null;
    return repeat ? { type: 'held' } : { type: 'use' };
  }
  return null;
}

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
