// Host and guest logic for online play, plus the split-mode reducer.
// No React and no Supabase here, so it can be unit tested with a fake room.
//
// Host  = Astronaut device. Runs the engine. Single source of truth.
// Guest = Mission Control device. Never runs the engine. Shows what the host sends.
//
// `room` is anything shaped like openRoom() in room.js: { send, on, onPresence, onStatus }.
// `engine` is { createGame, sendWarning, applyMove, tick } (see engineAdapter.js).
// The signal clock: whoever runs the engine calls tick once a second (see useGameSession.js).

import { initialState, MOVES, WARNINGS, WORLDS } from '../shared/contract.js';

/** What players see before a game starts. */
export function lobbyState({ mode = 'online', world = 'moon', moonStars = 0, storm = null } = {}) {
  return { ...initialState, mode, world, moonStars, storm };
}

// A ready-made storm travels inside every stateUpdate, so keep it well under Supabase's message size limit.
export const MAX_STORM_BYTES = 64 * 1024;

/** True if a ready-made storm can be sent over the network. The engine does the full game check (isValidStorm). */
export function canSendStorm(storm) {
  if (!storm || typeof storm !== 'object' || !Array.isArray(storm.stages) || storm.stages.length === 0) return false;
  try {
    return JSON.stringify(storm).length <= MAX_STORM_BYTES;
  } catch {
    return false;
  }
}

/**
 * The level that restart() starts: the current one, changed by `{ world, moonStars, storm }` if given.
 * Bad values are ignored (so `onClick={restart}`, which passes a click event, just replays).
 * moonStars is kept to 0-3.
 * Storm (Level 3: Live Sun):
 *   { storm: liveStorm }  play this ready-made storm (if it is unusable, the saved storm plays)
 *   { storm: null }       play the saved storm again (for example "back to level 2")
 *   no `storm` key        keep the current storm when the world stays the same (Play again),
 *                         drop it when the world changes (a live storm never follows you to another world)
 */
export function nextLevel(current, options = {}) {
  const { world, moonStars } = options ?? {};
  const nextWorld = WORLDS.includes(world) ? world : current.world;
  const askedStorm = options != null && Object.prototype.hasOwnProperty.call(options, 'storm');

  let storm = null;
  if (askedStorm && options.storm != null) {
    if (canSendStorm(options.storm)) storm = options.storm;
    else console.warn('Mission Link: this storm is too big or has no stages, so the saved storm plays instead.');
  } else if (!askedStorm && nextWorld === current.world) {
    storm = current.storm ?? null;
  }

  return {
    world: nextWorld,
    // A live storm's id means nothing without the storm, so drop it with the storm.
    stormId: !storm && current.storm ? null : (current.stormId ?? null),
    moonStars: Number.isInteger(moonStars) ? Math.min(3, Math.max(0, moonStars)) : (current.moonStars ?? 0),
    // Only passed when there is one, so createGame sees exactly the old arguments for levels 1 and 2.
    ...(storm ? { storm } : {}),
  };
}

/**
 * The Astronaut's side.
 * - Waits in the lobby until Mission Control shows up, then starts the game.
 * - Sends `stateUpdate { state }` after every change, when the partner (re)joins,
 *   and whenever Mission Control asks with `requestState`.
 * - Applies `sendWarning { turn, warning }` only if it is for the current turn.
 * - restart() replays the level, restart({ world: 'mars', moonStars }) starts the next one,
 *   restart({ world, moonStars, storm }) starts a level with a ready-made storm (Level 3).
 *   Same room, and Mission Control follows through the usual `stateUpdate` (the storm is in the state).
 * `storm` starts the first level with a ready-made storm (Level 3 picked on Home).
 * `restored` is a saved state (for example after a page reload) to continue instead of starting over.
 */
export function createHostSession({
  room,
  engine,
  world = 'moon',
  stormId = null,
  moonStars = 0,
  storm = null,
  restored = null,
  onChange = () => {},
}) {
  let level = restored
    ? nextLevel(restored)
    : nextLevel({ world: 'moon', stormId, moonStars: 0 }, { world, moonStars, ...(storm ? { storm } : {}) });
  let state = restored ?? lobbyState({ mode: 'online', ...level });
  let partnerHere = false;
  const start = () => engine.createGame({ mode: 'online', ...level });

  const publish = () => room.send('stateUpdate', { state });
  const update = (next) => {
    if (!next || next === state) return;
    state = next;
    onChange(state);
    publish();
  };

  const offs = [
    room.onPresence(({ partnerConnected }) => {
      const justJoined = partnerConnected && !partnerHere;
      partnerHere = partnerConnected;
      if (!justJoined) return;
      if (state.status === 'lobby') update(start());
      else publish();
    }),
    room.on('requestState', () => publish()),
    room.on('sendWarning', ({ turn, warning } = {}) => {
      if (!WARNINGS.includes(warning)) return;
      // Old (or future) turn, or the game is over: Mission Control is showing an old state,
      // probably because a stateUpdate got lost. Ignore the warning, but send the state again.
      if (state.status !== 'playing' || turn !== state.turn) {
        publish();
        return;
      }
      update(engine.sendWarning(state, warning));
    }),
  ];

  return {
    getState: () => state,
    sendMove(move) {
      if (state.status !== 'playing' || !MOVES.includes(move)) return;
      update(engine.applyMove(state, move));
    },
    /** The signal clock: `seconds` passed. Mission Control sees it through the usual stateUpdate. */
    tick(seconds) {
      if (state.status !== 'playing' || typeof engine.tick !== 'function') return;
      update(engine.tick(state, seconds));
    },
    restart(options) {
      level = nextLevel(level, options);
      // Mission Control is not here yet: stay in the lobby, the new level starts when they join.
      if (state.status === 'lobby') update(lobbyState({ mode: 'online', ...level }));
      else update(start());
    },
    close() {
      offs.forEach((off) => off());
    },
  };
}

/**
 * Mission Control's side.
 * - Sends `requestState` when it connects (and reconnects) and when the Astronaut shows up.
 * - Shows every `stateUpdate`. The host is the only sender and is always right, so the guest
 *   does not drop "older" states (that would freeze the guest if the host starts a new game).
 * - Sends warnings as `sendWarning { turn, warning }`.
 * - Asks again every `resyncEveryMs` (and when resync() is called), because Supabase broadcast
 *   can lose a message. Without this, a lost stateUpdate leaves Mission Control on an old turn
 *   until the next move. Replies that change nothing do not call onChange. 0 turns it off.
 */
export function createGuestSession({ room, onChange = () => {}, resyncEveryMs = 3000 }) {
  let state = lobbyState({ mode: 'online' });
  let shown = JSON.stringify(state);
  let hostHere = false;
  const ask = () => room.send('requestState', {});
  const timer = resyncEveryMs > 0 ? setInterval(ask, resyncEveryMs) : null;

  const offs = [
    room.onStatus((status) => {
      if (status === 'SUBSCRIBED') ask();
    }),
    room.onPresence(({ partnerConnected }) => {
      if (partnerConnected && !hostHere) ask();
      hostHere = partnerConnected;
    }),
    room.on('stateUpdate', ({ state: next } = {}) => {
      if (!next || typeof next !== 'object') return;
      const text = JSON.stringify(next);
      if (text === shown) return; // a resync reply with nothing new
      shown = text;
      state = next;
      onChange(state);
    }),
  ];

  return {
    getState: () => state,
    sendWarning(warning) {
      if (state.status !== 'playing' || !WARNINGS.includes(warning)) return;
      room.send('sendWarning', { turn: state.turn, warning });
    },
    /** Ask the host for the latest state now (for example when the tab becomes visible again). */
    resync: ask,
    close() {
      if (timer) clearInterval(timer);
      offs.forEach((off) => off());
    },
  };
}

/**
 * Split mode: both players on one device.
 * Actions: { type: 'move', move }, { type: 'warning', warning }, { type: 'restart', options },
 *          { type: 'tick', seconds } (the signal clock).
 * Restart works at any time, including after the game ends.
 */
export function splitReducer(engine) {
  return (state, action) => {
    if (action?.type === 'restart') return engine.createGame({ mode: 'split', ...nextLevel(state, action.options) });
    if (state.status !== 'playing') return state;
    if (action?.type === 'move' && MOVES.includes(action.move)) return engine.applyMove(state, action.move);
    if (action?.type === 'warning' && WARNINGS.includes(action.warning)) {
      return engine.sendWarning(state, action.warning);
    }
    if (action?.type === 'tick' && typeof engine.tick === 'function') return engine.tick(state, action.seconds);
    return state;
  };
}
