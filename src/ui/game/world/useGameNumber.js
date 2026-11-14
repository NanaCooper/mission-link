import { useState } from 'react';

// Counts games: goes up when the turn goes back (Play again, Fly to Mars),
// so a map can put its character back at the start.
// (Updating state while drawing is React's way to follow a changed prop.)
export function useGameNumber(turn) {
  const [game, setGame] = useState({ turn, number: 0 });
  if (turn !== game.turn) {
    const next = { turn, number: turn < game.turn ? game.number + 1 : game.number };
    setGame(next);
    return next.number;
  }
  return game.number;
}
