// Fake views for building and testing screens before the real game is wired up.
// Shapes match the agreed views in src/ui/DEV3_PLAN.md (and getAstronautView /
// getMissionControlView in src/engine/index.js). Variants are built by spreading
// the base objects, never by changing them.

const placeholderFact = {
  text: 'Placeholder fact for the Why? card.',
  source: { name: 'Placeholder source', url: '' }
};

// What the Astronaut sees on the Moon, halfway through the storm
export const fakeAstronautView = {
  status: 'playing',
  turn: 3,
  maxTurns: 6,
  world: 'moon',
  meters: { power: 45, oxygen: 90, radiationDose: 22, crewHealth: 81 },
  radiationLimit: 40,
  science: 2,
  inbox: [{ turn: 3, warning: 'shelterNow' }],
  log: [
    { turn: 0, text: 'You did science. The Sun is quiet today.' },
    { turn: 1, text: 'A solar flare! You saved power.' },
    { turn: 2, text: 'You raised the shield. It blocked most radiation.' }
  ],
  lastMove: 'raiseShield',
  lastFact: placeholderFact,
  lostReason: null,
  stars: 0
};

// What Mission Control sees on the Moon at the same moment
export const fakeMissionControlView = {
  status: 'playing',
  turn: 3,
  maxTurns: 6,
  world: 'moon',
  delayTurns: 0,
  stage: {
    label: 'Particles arrive',
    missionControlSees: 'Fast particles from the Sun are hitting the base right now!',
    dust: false,
    blackout: false
  },
  forecast: 'Storm fading',
  lastMove: 'raiseShield',
  lastFact: placeholderFact,
  crewHealth: 81,
  warningThisTurn: 'shelterNow',
  lostReason: null,
  stars: 0
};

// Mars: warnings arrive one turn late, so the inbox item also says when it was sent
export const fakeMarsAstronautView = {
  ...fakeAstronautView,
  world: 'mars',
  inbox: [{ turn: 3, turnSent: 2, warning: 'shelterNow' }]
};

export const fakeMarsMissionControlView = {
  ...fakeMissionControlView,
  world: 'mars',
  delayTurns: 1,
  stage: {
    ...fakeMissionControlView.stage,
    missionControlSees: 'Dust is covering the solar panels. Saving power gives less today.',
    dust: true
  }
};

// Mars signal blackout: the Sun blocks the signal, so no warning can be sent this turn
export const fakeMarsBlackoutMissionControlView = {
  ...fakeMarsMissionControlView,
  turn: 4,
  stage: {
    label: 'Storm fading',
    missionControlSees: 'The storm is getting weaker, but the Sun is now between Earth and Mars.',
    dust: false,
    blackout: true
  },
  forecast: 'All clear',
  warningThisTurn: null
};

// End of game, for testing disabled buttons and the end states
export const fakeWonAstronautView = {
  ...fakeAstronautView,
  status: 'won',
  turn: 6,
  stars: 2
};

export const fakeLostAstronautView = {
  ...fakeAstronautView,
  status: 'lost',
  meters: { ...fakeAstronautView.meters, radiationDose: 40 },
  lostReason: 'radiation',
  stars: 0
};
