// Every game number lives here so we can tune after the playtest.
// Meter numbers are game points, not real radiation doses.

// Storm radiation budget for one storm. Reaching it loses the game.
export const RADIATION_LIMIT = 40;

// Power the base uses every turn, and oxygen lost when power runs out.
export const BASE_POWER_USE = 10;
export const NO_POWER_OXYGEN_LOSS = 25;

// crewHealth drops by floor(radiationThisTurn / HEALTH_DIVISOR).
export const HEALTH_DIVISOR = 4;

// Meters are always clamped to this range.
export const METER_MIN = 0;
export const METER_MAX = 100;

// What each Astronaut move does.
export const MOVE_EFFECTS = {
  raiseShield: { power: -20, minPower: 20, multiplier: 0.3, failedMultiplier: 1 },
  shelter: { power: -5, multiplier: 0.1, crewHealth: -10 },
  savePower: { power: 15, dustPower: 5, multiplier: 1 },
  doScience: { power: -10, multiplier: 1, science: 1, quietScience: 2 }
};

// Stars when the crew survives: 1, 2 if healthy, 3 if also did enough science.
export const STARS = { healthForTwo: 60, scienceForThree: 2 };

// What changes between the two levels. dustStages holds stage indexes.
export const LEVELS = {
  moon: { delayTurns: 0, dustStages: [], powerPenalty: 0, powerPerStar: 0 },
  mars: { delayTurns: 1, dustStages: [1], powerPenalty: 15, powerPerStar: 5 }
};
