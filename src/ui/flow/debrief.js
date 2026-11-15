// "What your choices meant" on the end screen: plain sentences built only from the
// Astronaut view (docs/CONTRACT.md). No game rules and no fixed numbers: every number
// comes from the view, and the tip only says which choice matters.

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

// One tip, after the numbers: what to try next time.
export const DEBRIEF_TIPS = {
  radiation: 'Next time: shield or shelter when the strongest wave comes. Mission Control can see it coming.',
  oxygen: 'Next time: when the power runs out, the oxygen goes down. Save power before the batteries are empty.',
  health: 'Next time: the shelter keeps radiation out but tires the crew. Use it when the storm is strongest.',
  time: 'Next time: Mission Control has to send a warning before the clock runs out.',
  moreStars: 'Next time: a healthy crew and more science points earn more stars.',
  perfect: 'A perfect mission!'
};

// view: getAstronautView(state) at the end of a level. Returns the sentences, in order.
export function debriefLines(view) {
  if (!view?.meters) return [];
  const { power, oxygen, radiationDose, crewHealth } = view.meters;
  const limit = view.radiationLimit;
  const lines = [
    radiationDose >= limit
      ? `Radiation reached ${radiationDose} of your ${limit} points, so the storm budget ran out.`
      : `You used ${radiationDose} of your ${limit} radiation points.`,
    `You ended with ${power} power and ${oxygen} oxygen.`,
    `Crew health: ${crewHealth} out of 100.`,
    `You earned ${plural(view.science, 'science point')}.`
  ];
  if (view.status === 'lost') lines.push(DEBRIEF_TIPS[view.lostReason] ?? DEBRIEF_TIPS.radiation);
  else if (view.status === 'won') lines.push(view.stars >= 3 ? DEBRIEF_TIPS.perfect : DEBRIEF_TIPS.moreStars);
  return lines;
}
