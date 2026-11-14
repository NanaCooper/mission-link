// Shared contract. Source of truth: docs/CONTRACT.md
// All three folders (engine, realtime, ui) depend on this file.
// Never change it alone: tell the team, agree, then update it in its own small commit.

// The two player roles
export const ROLES ={ ASTRONAUT: 'astronaut', MISSION_CONTROL: 'missionControl' };

// The game state before createGame() fills it in
export const initialState = {
  status: 'lobby',     // 'lobby' | 'playing' | 'won' | 'lost'
  mode: 'split',       // 'split' | 'online'
  world: 'moon',       // 'moon' | 'mars'
  turn: 0,
  maxTurns: 6,
  meters: { power: 100, oxygen: 100, radiationDose: 0, crewHealth: 100 },
  science: 0,
  stormId: null,
  storm: null,         // ready-made storm object (Level 3: Live Sun), or null to use stormId
  stormStage: 0,
  inbox: [],           // warnings delivered to the Astronaut: { turn, warning }
  outbox: [],          // warnings not yet delivered (Mars delay): { turnSent, warning }
  lastMove: null,
  log: [],             // { turn, text } short kid-friendly lines
  lostReason: null,    // 'oxygen' | 'health' | 'radiation'
  stars: 0,
  moonStars: 0         // 0-3 stars won on the Moon, used for Mars supply crates
};

// The two levels: the Moon (level 1) and Mars (level 2)
export const WORLDS = ['moon', 'mars'];

// Astronaut: exactly one move per turn
export const MOVES = ['raiseShield', 'shelter', 'savePower', 'doScience'];

// Mission Control: up to one warning per turn (optional)
export const WARNINGS = ['stormComing', 'shelterNow', 'savePower', 'allClear'];
