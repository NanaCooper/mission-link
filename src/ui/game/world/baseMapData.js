// The Astronaut's map: where things are on the Moon or Mars base, and what using them does.
// BaseMap.jsx draws it.
import { buildMap } from './worldMap.js';

//  ~ sky   . ground   , dark ground   o crater (blocked)
//  P solar panel   H shelter (two squares)   T shield tower   R science rover
//  Just there to look at (blocked): a radio dish, f flag, L lander (two squares), c supply crates
const ROWS = [
  '~~~~~~~~~~',
  '.........a',
  '.P..HH..T.',
  '..........',
  '.o.,...R..',
  'f...,....o',
  '..,..LL.c.'
];

export const BASE_MAP = buildMap(ROWS, {
  blocked: '~oafLc',
  places: { P: 'solarPanel', H: 'shelter', T: 'shieldTower', R: 'rover' }
});

// Which move each place makes
export const PLACE_MOVES = {
  solarPanel: 'savePower',
  shelter: 'shelter',
  shieldTower: 'raiseShield',
  rover: 'doScience'
};

export const PLACE_NAMES = {
  solarPanel: 'Solar panel',
  shelter: 'Shelter',
  shieldTower: 'Shield tower',
  rover: 'Science rover'
};

export const BASE_START = { x: 5, y: 4, facing: 'down' };

// Low gravity: Nova cannot walk fast on the Moon or Mars. Milliseconds per step (Sola on Earth
// takes WALK_REPEAT_MS, 170). The Moon pulls about 1/6 as hard as Earth and Mars about 3/8, so
// the Moon is the slowest. These are not real speeds, just the feel. The farthest place is
// still about 2 seconds of walking away (lowGravity.test.js checks it).
export const BASE_STEP_MS = { moon: 420, mars: 300 };

// A radiation hit this big or bigger flashes the picture three times. Smaller hits flash once, faintly.
export const BIG_HIT = 10;
