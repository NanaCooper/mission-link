// Nova walks to where each move happens, like a character in a role-playing game.
// This file only decides WHERE she stands and HOW LONG the walk takes (pure, tested).
// It is a picture only: it never changes the game.
import { PIECES } from '../../components/pixel/sprites.js';

// Where Nova stands (her left edge, in squares of the drawing) for each move.
export const STATIONS = {
  home: 47, // beside the base, before the first move
  savePower: 14, // at the solar panel
  shelter: 27, // at the base door
  raiseShield: 38, // at the shield switch on the base wall
  doScience: 53 // next to the science robot car
};

export function stationFor(move) {
  return STATIONS[move] ?? STATIONS.home;
}

const SQUARES_PER_SECOND = 16;
export const STEP_SECONDS = 0.25; // one left-right leg swap

// The walk from one spot to another.
//   offset   where she starts, compared with where she ends (negative = starts to the left)
//   steps    one small jump per square, like old games
//   cycles   how many leg swaps
//   seconds  how long the walk takes (0 = no walk)
export function walkPlan(from, to) {
  const distance = Math.abs(to - from);
  if (distance === 0) return { offset: 0, steps: 0, cycles: 0, seconds: 0 };
  const cycles = Math.max(1, Math.round(distance / SQUARES_PER_SECOND / STEP_SECONDS));
  return { offset: from - to, steps: distance, cycles, seconds: cycles * STEP_SECONDS };
}

// Remembers where Nova was, so she can walk from there when a new turn is played.
// memo = { turn, from, at }. A new game (the turn goes back) or the first picture: no walk.
export function nextWalkMemo(memo, turn, lastMove) {
  const at = stationFor(lastMove);
  if (!memo) return { turn, from: at, at };
  if (memo.turn === turn) return memo;
  return { turn, from: turn > memo.turn ? memo.at : at, at };
}

// Nova's sprite, split so her legs can step: the body, then three pairs of legs.
const BODY_ROWS = 11;
export const NOVA_BODY = PIECES.novaBody.slice(0, BODY_ROWS);
export const NOVA_LEGS_Y = BODY_ROWS;
export const NOVA_LEGS = {
  stand: PIECES.novaBody.slice(BODY_ROWS),
  stepLeft: ['..KWKKWK..', '.KKK.KWK..', '.....KKKK.'],
  stepRight: ['..KWKKWK..', '..KWK.KKK.', '.KKKK.....']
};
