// What the 3D base acts out, from the Astronaut view only (getAstronautView).
// Pure, no three.js, so it is easy to test.
//
// The Astronaut must never see the storm before the move. So this reads only what the Astronaut
// already knows: Commander Sola's newest message (it shows what Sola SAID, right or wrong), and
// after the move what really happened (lastResult). Never stage, forecast, dust or blackout from
// the Mission Control view.
//
// Returns
//   warning      'stormComing' | 'shelterNow' | 'savePower' | 'allClear' | null
//                Sola's message, only on the wave it reached Nova (on Mars, one wave after it was sent)
//   warningKey   changes with each new message, so the base can start the cue again
//   shield       'up' after Raise shield, 'failed' if the shield had no power, null otherwise
//   dust         true if dust covered the solar panel during Save power (Mars)
//   powerOut     true if the power ran out
//   saving, sheltering, science   the last move (as the 2D map shows it)
//   lowPower     power under 25: the dome lights flicker
//   world, turn

const WARNINGS = ['stormComing', 'shelterNow', 'savePower', 'allClear'];
const LOW_POWER = 25;

export function baseCues(view) {
  const { turn, lastMove } = view;
  const inbox = view.inbox ?? [];
  const newest = inbox.length > 0 ? inbox[inbox.length - 1] : null;
  // Same rule as the "new message" pop-up on the Astronaut screen: it arrived this wave
  const arrived = newest && newest.turn === turn && WARNINGS.includes(newest.warning) ? newest.warning : null;

  // What the move just made did. lastResult.turn is the wave after the move, so it only counts
  // until the next move.
  const result = view.lastResult && view.lastResult.turn === turn ? view.lastResult : null;
  const shielded = lastMove === 'raiseShield';

  return {
    world: view.world,
    turn,
    warning: arrived,
    warningKey: arrived ? `${turn}:${arrived}` : null,
    shield: shielded ? (result?.shieldFailed ? 'failed' : 'up') : null,
    dust: Boolean(result?.dust),
    powerOut: Boolean(result?.powerOut),
    saving: lastMove === 'savePower',
    sheltering: lastMove === 'shelter',
    science: lastMove === 'doScience',
    lowPower: (view.meters?.power ?? 100) < LOW_POWER
  };
}
