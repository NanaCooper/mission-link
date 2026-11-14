// The Astronaut's map: where things are on the Moon or Mars base, and what using them does.
// BaseMap.jsx draws it.
import { buildMap } from './worldMap.js';

//  ~ sky   . ground   , dark ground   o crater (blocked)
//  P solar panel   H shelter (two squares)   T shield tower   R science rover
const ROWS = [
  '~~~~~~~~~~',
  '..........',
  '.P..HH..T.',
  '..........',
  '.o.,...R..',
  '....,....o',
  '..,.......'
];

export const BASE_MAP = buildMap(ROWS, {
  blocked: '~o',
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

// A radiation hit this big or bigger flashes the picture three times. Smaller hits flash once, faintly.
export const BIG_HIT = 10;
