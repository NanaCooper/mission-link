// Shared screen text: names, labels, icons and hints for moves and warnings.
// Screens import from here so nobody writes these strings twice.
//
// The hint numbers ("Costs 20 power", "Gets back 15 power", ...) mirror
// src/engine/balance.js (MOVE_EFFECTS). If Dev 1 changes balance.js,
// update the hints here too. The UI never uses these numbers for game rules.
import { clockSentence } from './clock.js';

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

// ---------- Sound and read-aloud buttons ----------
export const SOUND_ON_LABEL = 'Sound on';
export const SOUND_OFF_LABEL = 'Sound off';
export const READ_ALOUD_LABEL = 'Read to me';
export const READ_ALOUD_STOP_LABEL = 'Stop reading';

// ---------- Prediction prompt (Astronaut only, never sent anywhere) ----------
// Asked on the turn the storm may peak. "Turn 4 of 6" on screen is view.turn 3.
// It only asks. It changes no rules and no score.
export const PREDICTION = {
  turn: 3,
  question: 'The storm may be about to peak. What do you think will happen if you do science now?',
  answers: ['Nothing much', 'The crew takes a lot of radiation', 'Not sure']
};

export function predictionResultText(answer) {
  return `You guessed "${answer}". Here is what happened.`;
}

// ---------- What "Read to me" says ----------
// Built only from what the screen already shows.

// Astronaut: Commander Sola's message, then BLIP's line about the last turn.
export function astronautReadText(view) {
  const { director, robot } = CHARACTERS;
  const newest = view.inbox.length > 0 ? view.inbox[view.inbox.length - 1] : null;
  const warning = newest ? WARNING_INFO[newest.warning] : null;
  const lastLog = view.log.length > 0 ? view.log[view.log.length - 1] : null;

  let sola;
  if (warning && newest.turn === view.turn) sola = `${director.name} says: ${warning.label}!`;
  else if (warning) sola = `${director.name} says: ${NO_NEW_MESSAGE_TEXT} Last message: ${warning.label}.`;
  else sola = `${director.name} says: ${NO_MESSAGE_TEXT}. ${NO_MESSAGE_HINT}`;

  const parts = [sola, clockSentence(view, 'astronaut')];
  if (lastLog) parts.push(`${robot.name} says: ${lastLog.text}`);
  return joinSentences(parts);
}

// Mission Control: Commander Sola's briefing and what comes next, then BLIP's fact.
export function missionControlReadText(view) {
  const { director, robot } = CHARACTERS;
  const parts = [`${director.name} says: ${view.stage.missionControlSees}`];
  parts.push(view.forecast ? `Coming next: ${view.forecast}` : 'This is the last turn');
  if (view.stage.blackout) parts.push(BLACKOUT_NOTE);
  else parts.push(clockSentence(view, 'missionControl'));
  if (view.lastFact?.text) parts.push(`${robot.name} says: ${view.lastFact.text}`);
  return joinSentences(parts);
}

function joinSentences(parts) {
  return parts
    .filter((part) => typeof part === 'string' && part.trim().length > 0)
    .map((part) => part.trim())
    .map((part) => (/[.!?]$/.test(part) ? part : `${part}.`))
    .join(' ');
}

// ---------- Full-screen game: top bar, menu, pop-ups (src/ui/game/hud/) ----------
export const MISSION_CONTROL_TITLE = 'Mission Control, Earth';
export const MENU_LABEL = 'Menu';
export const CLOSE_LABEL = 'Close';
export const NEW_TAG = 'New';

// The tabs of each player's menu, like the pause menu of a game.
//   sprite = pixel icon name (see ui/components/pixel/sprites.js)
//   The meters are NOT in the menu: they stay in the top bar (hud/Vitals.jsx), always in view.
//   The menu holds things like sound (the Options tab), messages and the quick buttons.
export const ASTRONAUT_TABS = {
  options: { label: 'Options', sprite: 'next' },
  messages: { label: 'Messages', sprite: 'signal' },
  moves: { label: 'Moves', sprite: 'shield' }
};
export const MISSION_CONTROL_TABS = {
  options: { label: 'Options', sprite: 'next' },
  bigScreen: { label: 'Big screen', sprite: 'storm' },
  crew: { label: 'Crew', sprite: 'health' },
  warnings: { label: 'Warnings', sprite: 'signal' }
};

// The Options tab of the menu
export const OPTIONS_TITLE = 'Options';
export const BARS_TITLE = 'What do the bars mean?';
export const BARS_TEXT = {
  health: 'Crew health: how well the crew feels. At 0 the mission is lost.',
  power: 'Power: runs the base. Shields and science use it up.',
  oxygen: 'Oxygen: air to breathe. It drops when the power runs out.'
};

// Pause: opening the menu on one device pauses the game (the signal clock stops).
// Online it cannot pause the other player, so the menu says the game keeps going.
export const PAUSED_TITLE = 'Game paused';
export const PAUSED_TEXT = 'The signal clock is stopped. Close the menu to play on.';
export const ONLINE_NO_PAUSE_TEXT = 'Online games keep going while the menu is open. The clock is still running!';

// Short names for the meters in the top bar (the full names stay in the menu and for screen readers)
export const VITALS_LABEL = "The crew's meters";
export const VITALS_SHORT = { crewHealth: 'Health', power: 'Power', oxygen: 'Oxygen', radiationDose: 'Radiation' };

// One device (split mode): one player's screen at a time, and handing the device over.
export const ROLE_NAMES = { astronaut: 'Astronaut', missionControl: 'Mission Control' };
export const SWITCH_PREFIX = 'Switch to';
export const YOUR_TURN_TEXT = '(your turn)';
export const PASS_READY_LABEL = "I'm ready";
export const PASS_BACK_LABEL = 'Go back';

// The full-screen card that tells the next kid it is their turn.
//   role = who gets the device: 'astronaut' | 'missionControl'
export function passCardText(role) {
  const { astronaut, director } = CHARACTERS;
  if (role === 'astronaut') {
    return {
      who: astronaut.who,
      title: `Pass the device to ${astronaut.name}`,
      text: `${astronaut.name} is the Astronaut on the base. Read the message, then pick a move.`,
      hint: "Show the Astronaut's screen."
    };
  }
  return {
    who: director.who,
    title: `Pass the device to ${director.name}`,
    text: `${director.name} is Mission Control on Earth. Look at the Sun, then send a warning.`,
    hint: "Show Mission Control's screen."
  };
}

// A phone held upright gets this card. The game waits underneath.
export const ROTATE_TITLE = 'Turn your phone sideways';
export const ROTATE_TEXT = 'This game needs a wide screen. Your game is safe. It waits for you.';

// Pop-ups: they show up on their own for a few seconds, then fold away.
export const MESSAGE_TITLE = 'Mission Control says:';
export const OPEN_MENU_HINT = 'Tap Menu to see more.';
export const BLIP_QUESTION_TEXT = 'I have a question for you! Tap Menu, then Messages.';
export const LEVEL_END_TEXT = {
  won: 'Level complete! The crew is safe.',
  lost: 'Oh no! The mission is over.'
};

export function radiationHitText(amount) {
  return `Radiation hit the base! +${amount}`;
}

export function newStageText(stageLabel) {
  return `New on the big screen: ${stageLabel}.`;
}

// After Mission Control sends a warning. On Mars it arrives one turn late.
export function sentText(warningLabel, delayTurns) {
  const name = CHARACTERS.astronaut.name;
  return delayTurns > 0
    ? `Sent: ${warningLabel}! It reaches ${name} next turn.`
    : `Sent: ${warningLabel}! ${name} gets it now.`;
}

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
