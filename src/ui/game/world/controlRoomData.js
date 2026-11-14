// Mission Control's map: the control room on Earth, and what each place does.
// ControlRoomMap.jsx draws it.
import { buildMap } from './worldMap.js';

//  # wall (with the big screen)   . floor   p plant (blocked)
//  T telescope   M crew monitor   R radio desk (two squares)
const ROWS = [
  '##########',
  '.T......M.',
  '..........',
  '...RR.....',
  '..........',
  'p........p',
  '..........'
];

export const ROOM_MAP = buildMap(ROWS, {
  blocked: '#p',
  places: { T: 'telescope', M: 'monitor', R: 'radio' }
});

export const ROOM_PLACE_NAMES = {
  telescope: 'Telescope',
  monitor: 'Crew monitor',
  radio: 'Radio desk'
};

// What USE says at each place
export const ROOM_PLACE_USE = {
  telescope: { label: 'Look at the Sun', hint: 'See what the storm is doing, and what comes next.' },
  monitor: { label: 'Check on Nova', hint: "See Nova's last move and how the crew feels." },
  radio: { label: 'Send a warning', hint: 'Pick a warning to send to the base.' }
};

export const ROOM_START = { x: 4, y: 5, facing: 'up' };
