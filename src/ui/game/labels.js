// Shared screen text: labels, icons and hints for moves and warnings.
// Screens import from here so nobody writes these strings twice.
//
// The hint numbers ("Costs 20 power", "Gets back 15 power", ...) mirror
// src/engine/balance.js (MOVE_EFFECTS). If Dev 1 changes balance.js,
// update the hints here too. The UI never uses these numbers for game rules.

// One entry per move in MOVES (src/shared/contract.js)
export const MOVE_INFO = {
  raiseShield: { icon: '🛡️', label: 'Raise shield', hint: 'Costs 20 power. Blocks most radiation.' },
  shelter: { icon: '🏠', label: 'Shelter', hint: 'Costs 5 power and some health. Blocks almost all radiation.' },
  savePower: { icon: '🔋', label: 'Save power', hint: 'Gets back 15 power. No protection.' },
  doScience: { icon: '🔬', label: 'Do science', hint: 'Costs 10 power. Earns science points.' }
};

// One entry per warning in WARNINGS (src/shared/contract.js)
export const WARNING_INFO = {
  stormComing: { icon: '🌩️', label: 'Storm coming' },
  shelterNow: { icon: '🏠', label: 'Shelter now' },
  savePower: { icon: '🔋', label: 'Save power' },
  allClear: { icon: '✅', label: 'All clear' }
};

export const WORLD_NAMES = { moon: 'Moon base', mars: 'Mars base' };

export const RADIATION_EXPLAINER =
  'Invisible energy from the Sun that can hurt astronauts. This bar counts game points for one storm. It is not a real dose.';

export const MARS_DELAY_NOTE =
  'Mars is far away. Your message arrives next turn, so warn about what is coming next.';

// Mars signal blackout (stage.blackout): the Sun is between Earth and Mars
export const BLACKOUT_BADGE = 'Signal blocked';
export const BLACKOUT_NOTE =
  "The Sun is blocking the signal. Your warning can't get through this turn.";

// The engine counts turns from 0, and turn reaches maxTurns when the game ends.
export function turnText(view) {
  return `Turn ${Math.min(view.turn + 1, view.maxTurns)} of ${view.maxTurns}`;
}
