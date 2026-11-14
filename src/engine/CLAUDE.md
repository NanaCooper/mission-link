# Dev 1: Rules and levels

You own `src/engine/` (except real storm files, which Dev 4 adds) and `src/shared/`.
Edit nothing outside them. Read @../../docs/CONTRACT.md first.
The Four-Person Build Guide wins where it differs from older notes.

## Rules for this folder
- Pure functions only. No React, no network, no Math.random, no Date.now.
- Never change the input state. Always return a new object.
- Every number lives in `balance.js`. Change numbers only there.
- Clamp power, oxygen and crewHealth to 0–100.

## Files
- `balance.js`: all numbers, plus `LEVELS` (moon / mars differences).
- `storms/placeholder.json`: 6-stage practice storm.
- `storms/index.js`: `STORMS`, `DEFAULT_STORM_ID`, `getStorm(id)`. Shared: Dev 4 adds
  one line per real storm and tells Dev 1.
- `index.js`: `createGame`, `sendWarning`, `applyMove`, `getAstronautView`,
  `getMissionControlView`, `getStorm`, `getGameStorm`, `isValidStorm`.
- `engine.test.js`: rules and balance tests.

## Levels (balance.js LEVELS)
| Rule            | Moon        | Mars                                    |
|-----------------|-------------|-----------------------------------------|
| delayTurns      | 0           | 1 (warnings arrive next turn)           |
| Starting power  | 100         | 100 - 15, then +5 per Moon star (0-3)   |
| Save power      | +15         | +15, but +5 on dust stages ([1])        |
| Signal blackout | none        | blackoutStages [4]: no warning gets through |

## createGame({ mode, world = 'moon', stormId = DEFAULT_STORM_ID, moonStars = 0, storm = null })
initialState with status 'playing', mode, world, stormId, moonStars, lastFact null,
and a first log line. On Mars it says how many supply crates were waiting.
`storm` is an optional ready-made storm object (Level 3: Live Sun). If `isValidStorm(storm)`,
it is kept in `state.storm` and `stormId` becomes `storm.id`. Otherwise `state.storm` is null
and the saved storm from `stormId` plays, so a bad live storm never breaks the game.

## Ready-made storms
- `isValidStorm(storm)`: id and title text, exactly 6 stages, each with label,
  missionControlSees and a whole-number `incoming` inside `STORM_LIMITS` in balance.js
  (min 0, 0, 0, 30, 10, 0; max 0, 10, 15, 50, 30, 0).
- `getGameStorm(state)`: `state.storm` or `getStorm(state.stormId)`. Use this for the end
  screen, not `getStorm(state.stormId)`, which cannot find a live storm.
- The engine never calls DONKI and never picks at random. Dev 4's code builds the storm.
- Tests check all 16 corners of STORM_LIMITS on both levels: careless play loses and a
  3-star plan exists.

## sendWarning(state, warning)
Ignored if not 'playing' or not in WARNINGS. One per turn: a new one replaces the old.
On a blackout stage the warning is not stored; one log line says the Sun is blocking
the signal (only once per turn).
Moon: `{ turn, warning }` into inbox. Mars: `{ turnSent: turn, warning }` into outbox.

## applyMove(state, move), in this order
Ignored if not 'playing' or not in MOVES.
1. Move effect:
   | Move        | Power                         | Multiplier | Other                         |
   |-------------|-------------------------------|------------|-------------------------------|
   | raiseShield | -20 (needs >= 20, else fails) | 0.3 (1 if failed) |                        |
   | shelter     | -5                            | 0.1        | crewHealth -10                |
   | savePower   | +15 (+5 on Mars dust stage)   | 1          |                               |
   | doScience   | -10                           | 1          | science +1, +2 if incoming 0  |
2. radiationThisTurn = Math.round(stage.incoming × multiplier), added to radiationDose.
3. Base needs: power -10. If power is now <= 0, oxygen -25.
4. crewHealth -= floor(radiationThisTurn / 4).
5. Clamp meters.
6. lastMove, lastFact = stage.fact or null, one kid-friendly log line `{ turn, text }`.
7. turn +1, stormStage +1.
8. Mars: everything in outbox moves to inbox as `{ turn, turnSent, warning }`.
9. End check: oxygen 0 → lost 'oxygen'; crewHealth 0 → 'health';
   radiationDose >= RADIATION_LIMIT (40) → 'radiation'. Else turn reaching maxTurns → won.
   Stars: 1, 2 if crewHealth >= 60, 3 if also science >= 2. Lost = 0 stars.

## Views
- `getAstronautView`: `{ status, turn, maxTurns, world, meters, radiationLimit, science,
  inbox, log, lastMove, lastFact, lostReason, stars }`. No storm data, no dust.
- `getMissionControlView`: `{ status, turn, maxTurns, world, delayTurns,
  stage: { label, missionControlSees, dust, blackout }, forecast, lastMove, lastFact, crewHealth,
  warningThisTurn, lostReason, stars }`. forecast is the next stage label or null.

## Storm file: storms/<id>.json
```json
{
  "id": "storm-YYYY-MM-DD",
  "title": "Kid-friendly name",
  "realDates": "...",
  "savedOn": "YYYY-MM-DD",
  "source": { "name": "NASA DONKI", "url": "..." },
  "scalingNote": "Game numbers are simplified, not real doses",
  "stages": [
    { "label": "Quiet Sun", "incoming": 0, "missionControlSees": "...", "realData": {},
      "fact": { "text": "...", "source": { "name": "...", "url": "..." } } }
  ],
  "whatReallyHappened": ["Short line", "Short line"]
}
```
6 stages, incoming 0, 5, 10, 40, 20, 0. The app never calls DONKI live.

## Balance check
The full-game tests are the balance check: careless play loses, smart play wins,
on both levels. Current numbers: Moon 1660/4096 plans win, Mars 1519/4096.
