# Dev 1: Game engine and storm data

You own `src/engine/`. Edit nothing outside it. Read @../../docs/CONTRACT.md first.

## Rules for this folder
- Pure functions only. No React, no network, no Math.random, no Date.now.
- Keep every number in `balance.js` so we can tune after playtesting.
- Clamp all meters to 0–100.

## Turn order inside applyMove(state, move)
1. Deliver warnings. Moon: warnings sent this turn go to inbox now.
   Mars: warnings sent on the previous turn go to inbox now.
2. Apply the move effect (table below).
3. Apply the storm stage: radiation this turn = stage.incoming × move multiplier.
   Add it to radiationDose.
4. Base needs: power -10. If power is 0, oxygen -25.
5. crewHealth -= floor(radiation this turn / 4).
6. Add one short kid-friendly line to the log.
7. turn +1, stormStage +1, then check the end.

## Move effects (starting values, tune later)
| Move        | Power | Radiation multiplier | Other                          |
|-------------|-------|----------------------|--------------------------------|
| raiseShield | -20   | 0.3                  |                                |
| shelter     | -5    | 0.1                  | crewHealth -5 (cramped)        |
| savePower   | +15   | 1                    |                                |
| doScience   | -10   | 1                    | science +1, +2 if no radiation |

## End of game
- Lost if oxygen = 0 ('oxygen'), crewHealth = 0 ('health'), or radiationDose ≥ 100 ('radiation').
- Won after maxTurns.
- Stars: 1 for surviving, 2 if crewHealth ≥ 60, 3 if also science ≥ 2.

## Storm data: src/engine/storms/<id>.json
Pick a real event in DONKI that has a solar flare, a CME and a solar energetic
particle (SEP) event linked together. DONKI is on api.nasa.gov (FLR, CME and
SEP endpoints). Save it as JSON. The app must NOT call DONKI live during the demo.

```json
{
  "id": "storm-YYYY-MM-DD",
  "title": "Kid-friendly name",
  "realDates": "...",
  "source": { "name": "NASA DONKI", "url": "..." },
  "scalingNote": "How real values were turned into game values",
  "stages": [
    { "label": "Quiet Sun", "incoming": 0, "missionControlSees": "...", "realData": {} }
  ],
  "whatReallyHappened": ["Short line", "Short line"]
}
```
Use 6 stages. Suggested shape: quiet, flare spotted, CME launched, particles
arrive (peak), storm fading, all clear. Suggested incoming: 0, 5, 10, 40, 20, 0.
Start with a placeholder storm so others are not blocked.

## Tests (Vitest), write them first
- Each move changes meters as the table says
- Turn order, including Mars one-turn delay
- Each lose reason, the win, and star counts
- Meters never go below 0 or above 100
- A full playthrough from start to end
