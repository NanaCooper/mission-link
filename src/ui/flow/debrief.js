// The mission debrief on the end screen, in three parts plus the team:
//   Why your mission succeeded (or ended)   built from what really happened this level
//   Mission Control                          how many warnings were just right (a score of its own)
//   What you learned                         the trade-offs the game teaches, in plain words
//   Try this next time                       one question, picked from how the level was played
// Built only from the views (docs/CONTRACT.md): crew = getAstronautView(state),
// missionControl = getMissionControlView(state). No game rules here; every number comes from a view.
import { MOVE_INFO, WARNING_INFO } from '../game/labels.js';

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
const DANGER = ['stormComing', 'shelterNow'];

export const LEARNED = {
  radiation: 'Solar storms send out invisible radiation that can hurt astronauts.',
  cost: 'Every protection costs something: the shield uses power, and the shelter tires the crew.',
  power: 'Power keeps the air flowing. When it runs out, the oxygen drops.',
  team: 'Mission Control can see the storm and the Astronaut can act. The mission needs both.',
  solo: 'Mission Control watches the Sun, so the crew knows when to protect itself.',
  mars: 'On Mars, messages take minutes to arrive, so Mission Control must warn early.'
};

export const TRY_NEXT = {
  radiation: 'What if you raised the shield or took shelter on the strongest wave?',
  oxygen: 'What if you saved power before the batteries ran empty?',
  health: 'What if you used the shield on the weaker waves, and saved the shelter for the strongest one?',
  time: 'How could Mission Control send its warning sooner?',
  toMars: 'Ready for Mars? There, your warnings arrive one wave late. How will you plan ahead?',
  otherStorm: 'Play again with the other real storm. Does the same plan still work?',
  healthier: 'What if you used the shield instead of the shelter on a weaker wave, to keep the crew healthier?',
  firstScience: 'What if you did science on the first wave, when only a little radiation is coming?',
  oneMoreScience: 'One more science point earns the third star. Which wave is the safest for science?'
};

const LOST_REASON = {
  radiation: (m, limit) => `Radiation reached ${m.radiationDose} of ${limit} points, so the storm budget ran out.`,
  oxygen: () => 'The power ran out, and then the oxygen ran out too.',
  health: () => 'Crew health reached 0. Radiation and the cramped shelter wore the crew out.',
  time: () => 'Mission Control did not send a warning before the clock ran out.'
};

/**
 * Mission Control's score: how its warnings compared with the best one, wave by wave.
 * Returns null in Play alone (Commander Sola sent them) or when there is nothing to score.
 *   { great, close, total, line, rating, linked }   linked: a wave where a missed warning hurt
 */
export function missionControlScore(missionControl, crew) {
  const checks = missionControl?.warningChecks ?? [];
  if (crew?.solo || checks.length === 0) return null;
  const great = checks.filter((c) => c.sent === c.best).length;
  const close = checks.filter((c) => c.sent !== c.best && DANGER.includes(c.sent) && DANGER.includes(c.best)).length;
  const total = checks.length;

  let line = `${great} of ${total} warnings were just right`;
  if (close > 0) line += `, and ${close} ${close === 1 ? 'was' : 'were'} close`;
  line += '.';

  let rating;
  if (great === total) rating = 'Perfect warnings! A real Mission Control team.';
  else if (great + close > total / 2) rating = 'Good teamwork: most warnings helped the crew.';
  else rating = 'Keep practising: look at what is coming, and warn before it arrives.';

  // A warning that was not right, and on the wave it was meant for the crew was left unprotected
  // (no shield, no shelter, or a shield with no power) and hit hard: the warning may have misled them.
  // On Mars a warning helps the next wave, so that is the wave to look at.
  let linked = null;
  for (const c of checks) {
    if (c.sent === c.best || (DANGER.includes(c.sent) && DANGER.includes(c.best))) continue;
    const wave = c.turn + (c.delayTurns ?? 0);
    const hit = (crew?.moveResults ?? []).find((r) => r.turn === wave);
    const unprotected = hit && (hit.move === 'savePower' || hit.move === 'doScience' || hit.shieldFailed);
    if (unprotected && hit.radiation >= 10) {
      const sent = c.sent ? `the warning was "${WARNING_INFO[c.sent]?.label}"` : 'no warning was sent';
      linked = `Wave ${wave}: ${sent}, and ${hit.radiation} radiation hit the crew.`;
      break;
    }
  }
  return { great, close, total, line, rating, linked };
}

/**
 * The whole debrief, or null without the crew view.
 *   { won, whyTitle, why: [..], team, learned: [..], tryNext }
 */
export function missionDebrief({ crew, missionControl = null } = {}) {
  if (!crew?.meters) return null;
  const m = crew.meters;
  const limit = crew.radiationLimit;
  const won = crew.status === 'won';
  const results = crew.moveResults ?? [];

  const why = [];
  if (won) {
    why.push(`The crew took ${m.radiationDose} of ${limit} radiation points, so they stayed under the limit.`);
    why.push(
      m.oxygen >= 100
        ? `You kept ${m.power} power, so the air pumps never stopped.`
        : `The power ran out once, so the oxygen dropped to ${m.oxygen}. Close call!`
    );
    why.push(`Crew health ended at ${m.crewHealth} of 100${m.crewHealth < 60 ? ': under 60, so no second star' : ''}.`);
    why.push(`You earned ${plural(crew.science, 'science point')}${crew.science < 2 && m.crewHealth >= 60 ? ': 2 earn the third star' : ''}.`);
  } else {
    why.push((LOST_REASON[crew.lostReason] ?? LOST_REASON.radiation)(m, limit));
    const biggest = results.reduce((top, r) => (r.radiation > (top?.radiation ?? 0) ? r : top), null);
    if (biggest) {
      why.push(`The biggest hit was wave ${biggest.turn}: ${biggest.radiation} radiation got through after "${MOVE_INFO[biggest.move]?.label}".`);
    }
    why.push(`You ended with ${m.power} power and ${m.oxygen} oxygen.`);
  }

  const learned = [LEARNED.radiation, LEARNED.cost, LEARNED.power];
  if (crew.world === 'mars') learned.push(LEARNED.mars);
  else learned.push(crew.solo ? LEARNED.solo : LEARNED.team);

  let tryNext;
  if (!won) tryNext = TRY_NEXT[crew.lostReason] ?? TRY_NEXT.radiation;
  else if (crew.stars >= 3) tryNext = crew.world === 'mars' ? TRY_NEXT.otherStorm : TRY_NEXT.toMars;
  else if (m.crewHealth < 60) tryNext = TRY_NEXT.healthier;
  else if (crew.science === 0) tryNext = TRY_NEXT.firstScience;
  else tryNext = TRY_NEXT.oneMoreScience;

  return {
    won,
    whyTitle: won ? 'Why your mission succeeded' : 'Why your mission ended',
    why,
    team: missionControlScore(missionControl, crew),
    learned,
    tryNext
  };
}
