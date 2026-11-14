# Shared contract

Build this as `src/shared/contract.js` together, before anyone starts their part.

```js
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
```

## Engine functions (owned by Dev 1, used by everyone)
- `createGame({ mode, world, stormId })` returns a new state with status 'playing'
- `sendWarning(state, warning)` returns new state
- `applyMove(state, move)` resolves the whole turn and returns new state
- `getAstronautView(state)` meters, inbox, log, science. No storm data.
- `getMissionControlView(state)` storm stage, storm info, next-stage forecast,
  lastMove, crewHealth only. No other meters.

All engine functions are pure: same input gives same output. No randomness.

## Online messages (owned by Dev 2)
Channel name: `room:<CODE>`, codes look like `MOON-4821`.

| Event          | From  | To    | Payload              |
|----------------|-------|-------|----------------------|
| `requestState` | guest | host  | `{}`                 |
| `stateUpdate`  | host  | guest | `{ state }`          |
| `sendWarning`  | guest | host  | `{ turn, warning }`  |

Host = Astronaut device, runs the engine. Guest = Mission Control, never runs the engine.

## Session hook (owned by Dev 2, used by Dev 3)
`useGameSession({ mode, role, code })` returns
`{ state, sendMove, sendWarning, connected, partnerConnected, error }`
It works the same in split and online mode, so the UI never cares which mode it is in.
