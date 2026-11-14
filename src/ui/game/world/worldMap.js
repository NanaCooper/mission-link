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

// The kinds of text box a map can open (see WorldMap's `dialog` prop).
//   confirm  "Raise shield? [Yes] [No]"     arrows move the highlight, Space / E / Enter picks
//   menu     the radio desk's warnings      arrows move the highlight, Space / E / Enter picks
//   info     the telescope, the monitor     Space / E / Enter closes; an arrow closes it and walks
export const DIALOG_KINDS = ['confirm', 'menu', 'info'];

// What a key press on the page should do to the map. Pure, so it is easy to test.
//   key, repeat    from the keyboard event (repeat = the OS repeating a held key)
//   modifier       true if Ctrl, Alt or Meta is held (leave shortcuts to the browser)
//   target         where the key press happened:
//                    tag           its tag name ('BUTTON', 'INPUT', ...)
//                    editable      true for contenteditable
//                    control       true for a button, link or tab (it has its own Enter / Space)
//                    focusVisible  true if that control was reached with the keyboard (Tab).
//                                  A button that only has focus because it was clicked does not
//                                  keep Space and Enter: the map takes them.
//                    inModal       true if it is inside some other full-screen dialog
//   dialog         null, or the kind of text box that is open: 'confirm' | 'menu' | 'info'
// Returns null (leave the key alone) or one of:
//   { type: 'walk', direction }          start walking (held keys keep walking at WALK_REPEAT_MS)
//   { type: 'held' }                     the OS repeating a key: swallow it. A held key never
//                                        uses, picks or closes anything twice.
//   { type: 'use' }                      use the place in front
//   { type: 'highlight', step }          move the highlight to the previous (-1) or next (+1) choice
//   { type: 'pick' }                     choose the highlighted choice
//   { type: 'close' }                    close the text box
//   { type: 'closeAndWalk', direction }  info box: close it and start walking
export function mapKeyCommand({ key, repeat = false, modifier = false, target = {}, dialog = null }) {
  if (modifier) return null;
  if (TYPING_TAGS.includes(target.tag) || target.editable) return null;
  if (target.inModal) return null;

  const direction = KEY_TO_DIRECTION[key];
  const isUse = USE_KEYS.includes(key);
  // Space and Enter press a button the player reached with Tab. E is never a button key.
  if ((key === ' ' || key === 'Enter') && target.control && target.focusVisible) return null;

  if (dialog === 'info') {
    if (key === 'Escape' || isUse) return repeat ? { type: 'held' } : { type: 'close' };
    if (direction) return repeat ? { type: 'held' } : { type: 'closeAndWalk', direction };
    return null;
  }

  if (dialog) {
    if (key === 'Escape') return { type: 'close' };
    if (direction) return repeat ? { type: 'held' } : { type: 'highlight', step: direction === 'up' || direction === 'left' ? -1 : 1 };
    if (isUse) return repeat ? { type: 'held' } : { type: 'pick' };
    return null;
  }

  if (direction) return repeat ? { type: 'held' } : { type: 'walk', direction };
  if (isUse) return repeat ? { type: 'held' } : { type: 'use' };
  return null;
}

// The next choice to highlight, skipping choices that cannot be picked. Wraps round.
// Returns `from` if nothing else can be picked.
export function nextChoice(choices, from, step) {
  const count = choices.length;
  for (let i = 1; i <= count; i += 1) {
    const index = (((from + step * i) % count) + count) % count;
    if (!choices[index]?.disabled) return index;
  }
  return from;
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

// Which way the character must face to look at a place right next to them (null if none).
// Used when they press USE, so they turn to the thing they use.
export function facingToward(hero, place) {
  if (!place) return null;
  for (const [direction, [dx, dy]] of Object.entries(DIRECTIONS)) {
    if (place.tiles.some(([x, y]) => x === hero.x + dx && y === hero.y + dy)) return direction;
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
