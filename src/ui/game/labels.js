// Shared screen text: names, labels, icons and hints for moves and warnings.
// Screens import from here so nobody writes these strings twice.
//
// The hint numbers ("Costs 20 power", "Gets back 15 power", ...) mirror
// src/engine/balance.js (MOVE_EFFECTS). If Dev 1 changes balance.js,
// update the hints here too. The UI never uses these numbers for game rules.

// The three characters. Change a name here and it changes on every screen.
//   who = which pixel face to draw (see ui/components/pixel/sprites.js)
export const CHARACTERS = {
  astronaut: { who: 'nova', name: 'Nova' },           // the Astronaut on the base
  director: { who: 'sola', name: 'Commander Sola' },  // Mission Control on Earth
  robot: { who: 'blip', name: 'BLIP' }                // the base robot: says what happened, shares facts
};

// One entry per move in MOVES (src/shared/contract.js)
//   icon = emoji (kept as a fallback), sprite = pixel icon name
export const MOVE_INFO = {
  raiseShield: { icon: '🛡️', sprite: 'shield', label: 'Raise shield', hint: 'Costs 20 power. Blocks most radiation.' },
  shelter: { icon: '🏠', sprite: 'shelter', label: 'Shelter', hint: 'Costs 5 power and some health. Blocks almost all radiation.' },
  savePower: { icon: '🔋', sprite: 'battery', label: 'Save power', hint: 'Gets back 15 power. No protection.' },
  doScience: { icon: '🔬', sprite: 'science', label: 'Do science', hint: 'Costs 10 power. Earns science points.' }
};

// Short words shown on the Astronaut's picture after a move
export const MOVE_SCENE_TAG = {
  raiseShield: 'Shield up!',
  shelter: 'In the shelter',
  savePower: 'Saving power',
  doScience: 'Doing science'
};

// One entry per warning in WARNINGS (src/shared/contract.js)
export const WARNING_INFO = {
  stormComing: { icon: '🌩️', sprite: 'storm', label: 'Storm coming' },
  shelterNow: { icon: '🏠', sprite: 'shelter', label: 'Shelter now' },
  savePower: { icon: '🔋', sprite: 'battery', label: 'Save power' },
  allClear: { icon: '✅', sprite: 'clear', label: 'All clear' }
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

// The Astronaut cannot see the storm. Only Mission Control can.
export const NO_MESSAGE_TEXT = 'No message from Mission Control yet';
export const NO_MESSAGE_HINT = "You can't see the storm from here. Ask what the Sun is doing!";
export const NO_NEW_MESSAGE_TEXT = 'No new message this turn.';

// The engine counts turns from 0, and turn reaches maxTurns when the game ends.
export function turnText(view) {
  return `Turn ${Math.min(view.turn + 1, view.maxTurns)} of ${view.maxTurns}`;
}

// ---------- Faces ----------
// These only pick which face to draw. They never change the game.

// Nova looks happy, worried or hurt, from the meters the screen can see.
export function novaMood({ crewHealth, radiationDose = 0, radiationLimit = 0, power = 100 }) {
  const radiationShare = radiationLimit > 0 ? radiationDose / radiationLimit : 0;
  if (crewHealth < 35 || radiationShare >= 0.85) return 'hurt';
  if (crewHealth < 65 || radiationShare >= 0.6 || power < 25) return 'worried';
  return 'happy';
}

// Commander Sola's face when a warning arrives
export function solaMoodForWarning(warning) {
  if (warning === 'allClear') return 'happy';
  if (warning === 'savePower') return 'calm';
  return 'alert';
}
