// The one door to the engine for src/realtime and the screens (docs/CONTRACT.md).
// Screens import the view functions and getStorm from here, never from src/engine/ directly.
// If the real engine ever breaks online play, point the first line at './fakeEngine.js' for a quick test
// (the fake has no views or storms, so only the realtime test page works then).
export { createGame, sendWarning, applyMove } from '../engine/index.js';
export { getAstronautView, getMissionControlView, getStorm } from '../engine/index.js';
