// Host and guest logic for online play, plus the split-mode reducer.
// No React and no Supabase here, so it can be unit tested with a fake room.
//
// Host  = Astronaut device. Runs the engine. Single source of truth.
// Guest = Mission Control device. Never runs the engine. Shows what the host sends.
//
// `room` is anything shaped like openRoom() in room.js: { send, on, onPresence, onStatus }.
// `engine` is { createGame, sendWarning, applyMove } (see engineSource.js).

import { initialState, MOVES, WARNINGS } from '../shared/contract.js';

/** What players see before a game starts. */
export function lobbyState({ mode = 'online', world = 'moon' } = {}) {
  return { ...initialState, mode, world };
}

/**
 * The Astronaut's side.
 * - Waits in the lobby until Mission Control shows up, then starts the game.
 * - Sends `stateUpdate { state }` after every change, when the partner (re)joins,
 *   and whenever Mission Control asks with `requestState`.
 * - Applies `sendWarning { turn, warning }` only if it is for the current turn.
 * `restored` is a saved state (for example after a page reload) to continue instead of starting over.
 */
export function createHostSession({ room, engine, world = 'moon', stormId = null, restored = null, onChange = () => {} }) {
  let state = restored ?? lobbyState({ mode: 'online', world });
  let partnerHere = false;

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
      if (state.status === 'lobby') update(engine.createGame({ mode: 'online', world, stormId }));
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

/** Split mode: both players on one device. Actions: { type: 'move', move } and { type: 'warning', warning }. */
export function splitReducer(engine) {
  return (state, action) => {
    if (state.status !== 'playing') return state;
    if (action?.type === 'move' && MOVES.includes(action.move)) return engine.applyMove(state, action.move);
    if (action?.type === 'warning' && WARNINGS.includes(action.warning)) {
      return engine.sendWarning(state, action.warning);
    }
    return state;
  };
}
