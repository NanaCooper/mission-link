import { WAVES } from '../../../shared/contract.js';

// Which picture Mission Control sees on each wave.
//
// Every storm in the game has the same 6 stages in this order (docs/CONTRACT.md):
// quiet Sun, flare, gas cloud launched, particles arrive, storm fading, all clear.
// A level plays 3 of them, one per wave (WAVES in the contract): flare, particles arrive, fading.
// This only picks the picture. The words and the rules always come from the engine.
const LOOKS = ['quiet', 'flare', 'cloud', 'peak', 'fading', 'clear'];

// The picture for one of the storm's 6 stages (0-5).
export function stageLook(stage) {
  const index = Math.max(0, Math.min(LOOKS.length - 1, Math.floor(Number(stage) || 0)));
  return LOOKS[index];
}

// The picture for a turn (counted from 0): the stage its wave plays.
// After the last wave (the level is over) the picture stays on the last wave's stage.
export function stormLook(turn) {
  const wave = Math.max(0, Math.min(WAVES.length - 1, Math.floor(Number(turn) || 0)));
  return stageLook(WAVES[wave]);
}

// Commander Sola's face for each picture
export function solaMoodForLook(look) {
  if (look === 'quiet' || look === 'clear') return 'calm';
  return 'alert';
}
