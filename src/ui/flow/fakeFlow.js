// Fake end-of-level views for building and testing the flow screens.
// Shapes match getAstronautView in docs/CONTRACT.md. Live screens must not use these.

const base = {
  turn: 6,
  maxTurns: 6,
  meters: { power: 35, oxygen: 100, radiationDose: 18, crewHealth: 72 },
  radiationLimit: 40,
  science: 2,
  inbox: [],
  log: [],
  lastMove: 'doScience',
  lastFact: null
};

export const fakeMoonWin = { ...base, status: 'won', world: 'moon', lostReason: null, stars: 3 };

export const fakeMarsWin = { ...base, status: 'won', world: 'mars', lostReason: null, stars: 2 };

export const fakeMoonLost = {
  ...base,
  status: 'lost',
  world: 'moon',
  meters: { ...base.meters, radiationDose: 41 },
  lostReason: 'radiation',
  stars: 0
};
