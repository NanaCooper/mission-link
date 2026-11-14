# Shared contract

The shapes all four devs build against. Matches the Four-Person Build Guide.
Code lives in `src/shared/contract.js` (owned by Dev 1). Never change it alone:
tell the other three what changes, then update it in its own small commit.

```js
// The two player roles
export const ROLES = { ASTRONAUT: 'astronaut', MISSION_CONTROL: 'missionControl' };

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
```

Mars inbox entries also carry `turnSent`: `{ turn, turnSent, warning }`, where `turn`
is the turn the warning arrived. After the first move the state also has `lastFact`.

## Engine (Dev 1): `src/engine/index.js`

All engine functions are pure: same input gives same output. No randomness.
They never change the input state.

```js
createGame({ mode, world, stormId, moonStars, storm })
  // world: 'moon' | 'mars'. moonStars: 0-3, only used on Mars.
  // storm: optional ready-made storm object (Level 3: Live Sun). Kept in state.storm
  //   if isValidStorm(storm); otherwise ignored and the saved storm plays.
  // Returns a new state with status 'playing'.
sendWarning(state, warning)   // returns new state
applyMove(state, move)        // resolves the whole turn, returns new state
getAstronautView(state)
  // { status, turn, maxTurns, world, meters, radiationLimit, science, inbox, log,
  //   lastMove, lastFact, lostReason, stars }
getMissionControlView(state)
  // { status, turn, maxTurns, world, delayTurns,
  //   stage: { label, missionControlSees, dust, blackout }, forecast,
  //   lastMove, lastFact, crewHealth, warningThisTurn, lostReason, stars }
getStorm(id)
  // { id, title, realDates, savedOn, source, stages, whatReallyHappened, scalingNote }
  // each stage: { label, missionControlSees, incoming, realData, fact: { text, source } }
  // Unknown id returns the default storm.
getGameStorm(state)   // the storm this game plays: state.storm, or getStorm(state.stormId).
                      // Use this for the end screen.
isValidStorm(storm)   // true if a ready-made storm is safe to play (see STORM_LIMITS)
```

- `meters` is `{ power, oxygen, radiationDose, crewHealth }`, each 0–100.
- `radiationLimit` is the storm radiation budget (40 for now). Screens show the
  radiation bar out of `radiationLimit` and never hard-code the number.
- `lastFact` is the fact from the stage just played, `{ text, source: { name, url } }`,
  or `null` before the first move.
- `delayTurns` is 0 on the Moon and 1 on Mars. Mission Control uses it to say
  "Your message arrives next turn".
- `stage.dust` is true on the Mars dust stage (Save power gives less).
- `stage.blackout` is true on the Mars signal blackout stage (no warning gets through).
- The Astronaut view never includes storm data, `dust` or `blackout`.
- `forecast` is the next stage's label, or `null` on the last turn.
- Screens import the engine view functions through `src/realtime/engineAdapter.js`,
  never from `src/engine/` directly.

### Storms: `src/engine/storms/index.js`

Exports `STORMS` (by id), `DEFAULT_STORM_ID` and `getStorm(id)`. Shared file:
Dev 4 adds one line per real storm and tells Dev 1. Every storm keeps 6 stages with
`incoming` 0, 5, 10, 40, 20, 0 so the balance stays the same.

A ready-made (live) storm has the same shape. Its `incoming` per stage must stay inside
`STORM_LIMITS` in `src/engine/balance.js`: min 0, 0, 0, 30, 10, 0 and max 0, 10, 15, 50, 30, 0.
The engine tests check every corner of that range stays winnable on both levels.

## Realtime (Dev 2): `src/realtime/`

```js
makeRoomCode()  // 'MOON-4821'
useGameSession({ mode, role, code, world, moonStars })
  // { state, sendMove, sendWarning, restart, connected, partnerConnected, error }
  // restart() replays the same level.
  // restart({ world: 'mars', moonStars }) starts the next level in the same room.
  // restart({ world, moonStars, storm }) starts a level with a ready-made storm (Level 3).
```

It works the same in split and online mode, so the UI never cares which mode it is in.
In online mode only the host (Astronaut) can restart. Mission Control takes the
level from the host's state.

### Online messages

Channel name: `room:<CODE>`, codes look like `MOON-4821`.

| Event          | From  | To    | Payload              |
|----------------|-------|-------|----------------------|
| `requestState` | guest | host  | `{}`                 |
| `stateUpdate`  | host  | guest | `{ state }`          |
| `sendWarning`  | guest | host  | `{ turn, warning }`  |

Host = Astronaut device, runs the engine. Guest = Mission Control, never runs the engine.
The host applies `sendWarning` only if `turn` equals the current turn.
