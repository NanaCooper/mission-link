// Placeholder engine so src/realtime is not blocked while Dev 1 builds the real one.
// Same function names and state shape as docs/CONTRACT.md. Pure: no randomness, no dates.
// The numbers loosely follow src/engine/CLAUDE.md. They are NOT the real game rules.

import { initialState } from '../shared/contract.js';

const INCOMING = [0, 5, 10, 40, 20, 0];
const MOVE = {
  raiseShield: { power: -20, shield: 0.3 },
  shelter: { power: -5, shield: 0.1, health: -5 },
  savePower: { power: 15, shield: 1 },
  doScience: { power: -10, shield: 1, science: 1 },
};
const clamp = (n) => Math.max(0, Math.min(100, n));

export function createGame({ mode = 'split', world = 'moon', stormId = null } = {}) {
  return {
    ...initialState,
    meters: { ...initialState.meters },
    mode,
    world,
    stormId: stormId ?? 'fake-storm',
    status: 'playing',
  };
}

// Moon: the warning shows in the inbox right away. Mars: it waits in the outbox until next turn.
export function sendWarning(state, warning) {
  if (state.status !== 'playing') return state;
  if (state.world === 'mars') {
    if (state.outbox.some((w) => w.turnSent === state.turn)) return state;
    return { ...state, outbox: [...state.outbox, { turnSent: state.turn, warning }] };
  }
  if (state.inbox.some((w) => w.turn === state.turn)) return state;
  return { ...state, inbox: [...state.inbox, { turn: state.turn, warning }] };
}

export function applyMove(state, move) {
  const effect = MOVE[move];
  if (state.status !== 'playing' || !effect) return state;

  const radiation = Math.round((INCOMING[state.stormStage] ?? 0) * effect.shield);
  let { power, oxygen, radiationDose, crewHealth } = state.meters;
  power = clamp(power + effect.power - 10);
  if (power === 0) oxygen = clamp(oxygen - 25);
  radiationDose = clamp(radiationDose + radiation);
  crewHealth = clamp(crewHealth + (effect.health ?? 0) - Math.floor(radiation / 4));

  const turn = state.turn + 1;
  const science = state.science + (effect.science ?? 0);
  const arrived = state.outbox.filter((w) => w.turnSent < turn);
  const next = {
    ...state,
    turn,
    stormStage: Math.min(state.stormStage + 1, INCOMING.length - 1),
    meters: { power, oxygen, radiationDose, crewHealth },
    science,
    lastMove: move,
    inbox: [...state.inbox, ...arrived.map((w) => ({ turn, warning: w.warning }))],
    outbox: state.outbox.filter((w) => w.turnSent >= turn),
    log: [...state.log, { turn: state.turn, text: `Fake turn ${turn}: ${move}, radiation +${radiation}.` }],
  };

  const lostReason =
    oxygen === 0 ? 'oxygen' : crewHealth === 0 ? 'health' : radiationDose >= 100 ? 'radiation' : null;
  if (lostReason) return { ...next, status: 'lost', lostReason, stars: 0 };
  if (turn >= state.maxTurns) {
    return { ...next, status: 'won', stars: crewHealth >= 60 ? (science >= 2 ? 3 : 2) : 1 };
  }
  return next;
}
