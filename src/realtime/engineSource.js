// The engine the session hook runs: Dev 1's real engine in src/engine/.
// If the real engine ever breaks online play, switch back to './fakeEngine.js' for a quick test.
export { createGame, sendWarning, applyMove } from '../engine/index.js';
