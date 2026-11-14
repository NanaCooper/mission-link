// Shared contract. Source of truth: docs/CONTRACT.md
// All three folders (engine, realtime, ui) depend on this file.
// Never change it alone: tell the team, agree, then update it in its own small commit.

export const ROLES = { ASTRONAUT: 'astronaut', MISSION_CONTROL: 'missionControl' };

export const initialState = {
  status: 'lobby',     // 'lobby' | 'playing' | 'won' | 'lost'
  mode: 'split',       // 'split' | 'online'
  world: 'moon',       // 'moon' | 'mars'
  turn: 0,
  maxTurns: 6,
  meters: { power: 100, oxygen: 100, radiationDose: 0, crewHealth: 100 },
  science: 0,
  stormId: null,
  stormStage: 0,
  inbox: [],           // warnings delivered to the Astronaut: { turn, warning }
  outbox: [],          // warnings not yet delivered (Mars delay): { turnSent, warning }
  lastMove: null,
  log: [],             // { turn, text } short kid-friendly lines
  lostReason: null,    // 'oxygen' | 'health' | 'radiation'
  stars: 0
};

// Astronaut: exactly one move per turn
export const MOVES = ['raiseShield', 'shelter', 'savePower', 'doScience'];

// Mission Control: up to one warning per turn (optional)
export const WARNINGS = ['stormComing', 'shelterNow', 'savePower', 'allClear'];
