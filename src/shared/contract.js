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
  maxTurns: 3,         // one turn per wave (see WAVES)
  meters: { power: 100, oxygen: 100, radiationDose: 0, crewHealth: 100 },
  science: 0,
  stormId: null,
  storm: null,         // ready-made storm object (Level 3: Live Sun), or null to use stormId
  solo: false,         // Play alone: Commander Sola sends the warnings herself, no signal clock
  stormStage: 0,      // which of the storm's 6 stages is playing now (WAVES[turn] during a game)
  inbox: [],           // warnings delivered to the Astronaut: { turn, warning }
  outbox: [],          // warnings not yet delivered (Mars delay): { turnSent, warning }
  lastMove: null,
  lastResult: null,    // what the last move did (Astronaut only): { turn, move, radiation, shieldFailed, dust, powerOut }
  lastWarningCheck: null, // Mission Control's last warning next to Commander Sola's pick: { turn, sent, best, delayTurns }
  log: [],             // { turn, text } short kid-friendly lines
  lostReason: null,    // 'oxygen' | 'health' | 'radiation' | 'time'
  signalSecondsLeft: 0, // the signal clock: seconds left for Mission Control to send a warning this turn
  stars: 0,
  moonStars: 0         // 0-3 stars won on the Moon, used for Mars supply crates
};

// The waves of a level. Every storm has 6 stages (quiet Sun, flare spotted, cloud launched,
// particles arrive, storm fading, all clear); a level plays 3 of them, one per turn:
//   wave 1 = stage 1 (flare spotted), wave 2 = stage 3 (particles arrive: the peak),
//   wave 3 = stage 4 (storm fading). The Mars dust (stage 1) and blackout (stage 4) stay in.
export const WAVES = [1, 3, 4];

// The two levels: the Moon (level 1) and Mars (level 2)
export const WORLDS = ['moon', 'mars'];

// Astronaut: exactly one move per turn
export const MOVES = ['raiseShield', 'shelter', 'savePower', 'doScience'];

// Mission Control: up to one warning per turn (optional)
export const WARNINGS = ['stormComing', 'shelterNow', 'savePower', 'allClear'];
