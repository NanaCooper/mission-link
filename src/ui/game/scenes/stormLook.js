// Which picture Mission Control sees on each turn.
//
// Every storm in the game has the same 6 stages in this order (docs/CONTRACT.md):
// quiet Sun, flare, gas cloud launched, particles arrive, storm fading, all clear.
// This only picks the picture. The words and the rules always come from the engine.
const LOOKS = ['quiet', 'flare', 'cloud', 'peak', 'fading', 'clear'];

// turn is counted from 0. Past the last stage, the picture stays on "clear".
export function stormLook(turn) {
  const index = Math.max(0, Math.min(LOOKS.length - 1, Math.floor(Number(turn) || 0)));
  return LOOKS[index];
}

// Commander Sola's face for each picture
export function solaMoodForLook(look) {
  if (look === 'quiet' || look === 'clear') return 'calm';
  return 'alert';
}
