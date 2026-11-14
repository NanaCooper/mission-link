import { useState } from 'react';

// Remembers the numbers from the turn before, so a screen can show how much
// each one changed after a move ("+15", "-20").
//
//   turn    the turn number from the view
//   values  an object of numbers, e.g. { power: 45, oxygen: 90 }
//
// Returns an object with the same keys holding the change since last turn,
// or null before the first move and right after a restart.
export function useMeterDeltas(turn, values) {
  const [memory, setMemory] = useState({ turn, values, deltas: null });

  // A new turn: compare with what we remembered, then remember the new numbers.
  // (Updating state while rendering is React's way to react to a changed prop.)
  if (memory.turn !== turn) {
    const deltas = turn === memory.turn + 1 ? difference(memory.values, values) : null;
    setMemory({ turn, values, deltas });
    return deltas;
  }

  return memory.deltas;
}

function difference(before, after) {
  const result = {};
  for (const key of Object.keys(after)) {
    result[key] = typeof before[key] === 'number' ? after[key] - before[key] : 0;
  }
  return result;
}
