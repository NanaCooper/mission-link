// Host and guest logic for online play, plus the split-mode reducer.
// No React and no Supabase here, so it can be unit tested with a fake room.
//
// Host  = Astronaut device. Runs the engine. Single source of truth.
// Guest = Mission Control device. Never runs the engine. Shows what the host sends.
//
// `room` is anything shaped like openRoom() in room.js: { send, on, onPresence, onStatus }.
// `engine` is { createGame, sendWarning, applyMove } (see engineAdapter.js).

import { initialState, MOVES, WARNINGS, WORLDS } from '../shared/contract.js';

/** What players see before a game starts. */
export function lobbyState({ mode = 'online', world = 'moon', moonStars = 0 } = {}) {
  return { ...initialState, mode, world, moonStars };
}

/**
 * The level that restart() starts: the current one, changed by `{ world, moonStars }` if given.
 * Bad values are ignored (so `onClick={restart}`, which passes a click event, just replays).
 * moonStars is kept to 0-3. The storm stays the same.
 */
export function nextLevel(current, { world, moonStars } = {}) {
  return {
    world: WORLDS.includes(world) ? world : current.world,
    stormId: current.stormId ?? null,
    moonStars: Number.isInteger(moonStars) ? Math.min(3, Math.max(0, moonStars)) : (current.moonStars ?? 0),
  };
}

/**
 * The Astronaut's side.
 * - Waits in the lobby until Mission Control shows up, then starts the game.
 * - Sends `stateUpdate { state }` after every change, when the partner (re)joins,
 *   and whenever Mission Control asks with `requestState`.
 * - Applies `sendWarning { turn, warning }` only if it is for the current turn.
 * - restart() replays the level, restart({ world: 'mars', moonStars }) starts the next one.
 *   Same room, and Mission Control follows through the usual `stateUpdate`.
 * `restored` is a saved state (for example after a page reload) to continue instead of starting over.
 */
export function createHostSession({
  room,
  engine,
  world = 'moon',
  stormId = null,
  moonStars = 0,
  restored = null,
  onChange = () => {},
}) {
  let level = restored ? nextLevel(restored) : nextLevel({ world: 'moon', stormId, moonStars: 0 }, { world, moonStars });
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
      if (state.status !== 'playing') return;
      if (turn !== state.turn) return; // old (or future) turn: ignore
      if (!WARNINGS.includes(warning)) return;
      update(engine.sendWarning(state, warning));
    }),
  ];

  return {
    getState: () => state,
    sendMove(move) {
      if (state.status !== 'playing' || !MOVES.includes(move)) return;
      update(engine.applyMove(state, move));
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
 */
export function createGuestSession({ room, onChange = () => {} }) {
  let state = lobbyState({ mode: 'online' });
  let hostHere = false;
  const ask = () => room.send('requestState', {});

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
    close() {
      offs.forEach((off) => off());
    },
  };
}

/**
 * Split mode: both players on one device.
 * Actions: { type: 'move', move }, { type: 'warning', warning }, { type: 'restart', options }.
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
    return state;
  };
}
