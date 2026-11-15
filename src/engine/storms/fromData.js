// How a real NASA storm becomes game numbers (used to make every storm file, checked by the tests,
// and explained to players on the Data sources screen). One place, so the three never disagree.
//
// The strongest wave (stage 4, "Particles arrive") follows the flare class.
// The fading wave (stage 5, "Storm fading") follows the speed of the cloud of gas (the CME).
// These are game points, not real radiation doses: a simple, fair rule, inside STORM_LIMITS.

export const PEAK_RULE = [
  { flare: 'M class (or weaker)', points: 30 },
  { flare: 'X1 to X9.9', points: 40 },
  { flare: 'X10 or bigger', points: 50 }
];

export const FADE_RULE = [
  { speed: 'under 1,000 km a second', points: 10 },
  { speed: '1,000 to 2,000 km a second', points: 20 },
  { speed: 'faster than 2,000 km a second', points: 24 }
];

/** Points for the strongest wave, from a flare class like 'X5.8' or 'M8.1'. */
export function peakFor(flareClass) {
  const letter = String(flareClass)[0];
  const size = Number(String(flareClass).slice(1));
  if (letter === 'X') return size >= 10 ? PEAK_RULE[2].points : PEAK_RULE[1].points;
  return PEAK_RULE[0].points;
}

/** Points for the fading wave, from the cloud's speed in km per second. */
export function fadeFor(kmPerSec) {
  if (kmPerSec < 1000) return FADE_RULE[0].points;
  if (kmPerSec < 2000) return FADE_RULE[1].points;
  return FADE_RULE[2].points;
}
