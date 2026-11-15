import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { getStorm, REAL_STORM_IDS } from '../../engine/storms/index.js';
import { peakFor, fadeFor } from '../../engine/storms/fromData.js';
import HomeScreen from './HomeScreen.jsx';
import LobbyScreen from './LobbyScreen.jsx';
import EndScreen from './EndScreen.jsx';
import HowToPlayScreen from './HowToPlayScreen.jsx';
import DataSourcesScreen from './DataSourcesScreen.jsx';
import TeacherScreen, { HOW_TO_RUN, QUESTIONS, TEACHES } from './TeacherScreen.jsx';
import { ALERTS_FACT, BLACKOUT_FACT, MARS_FACT, MOON_DELAY_FACT } from './facts.js';
import { LEARNED, TRY_NEXT, missionControlScore, missionDebrief } from './debrief.js';
import { fakeMarsWin, fakeMoonLost, fakeMoonWin } from './fakeFlow.js';
import { archivedLabel, crates, formatDate } from './text.js';

const storm = getStorm('storm-2024-05-11');
const html = (element) => renderToStaticMarkup(element);

describe('text helpers', () => {
  it('formats a saved date without time zone shifts', () => {
    expect(formatDate('2026-11-14')).toBe('14 Nov 2026');
    expect(formatDate(null)).toBeNull();
  });

  it('labels saved data as archived, never live', () => {
    expect(archivedLabel('2026-11-14')).toBe('Archived NASA data, saved on 14 Nov 2026');
    expect(archivedLabel(null)).toBe('Archived NASA data');
  });

  it('counts crates in plain English', () => {
    expect(crates(1)).toBe('1 supply crate');
    expect(crates(3)).toBe('3 supply crates');
  });
});

describe('HomeScreen', () => {
  it('offers Play alone when the app passes it, and says what it means', () => {
    const out = html(<HomeScreen onPlayAlone={() => {}} />);
    expect(out).toContain('Play alone');
    expect(out).toContain('Commander Sola sends the warnings for you.');
    expect(html(<HomeScreen />)).not.toContain('>Play alone<');
  });

  it('locks Mars until the Moon is won', () => {
    const out = html(<HomeScreen marsUnlocked={false} />);
    expect(out).toContain('Level 2: Mars base');
    expect(out).toContain('Locked. Win the Moon first.');
    expect(out).toContain('Play on one device');
    expect(out).toContain('Create a room');
    expect(out).toContain('Join a room');
  });

  it('shows Moon stars as supply crates once Mars is open', () => {
    const out = html(<HomeScreen marsUnlocked moonStars={2} />);
    expect(out).toContain('2 supply crates from the Moon waiting');
    expect(out).not.toContain('Locked.');
  });

  it('keeps Join disabled until a code is typed', () => {
    expect(html(<HomeScreen />)).toContain('Type the code first.');
  });
});

describe('LobbyScreen', () => {
  it('shows the code big while the Astronaut waits', () => {
    const out = html(<LobbyScreen code="MOON-4821" />);
    expect(out).toContain('MOON-4821');
    expect(out).toContain('Waiting for Mission Control to join...');
  });

  it('shows Connecting for Mission Control and any error', () => {
    expect(html(<LobbyScreen code="MOON-4821" role="missionControl" />)).toContain(
      'Connecting to the Astronaut...'
    );
    const out = html(<LobbyScreen code="MOON-4821" error="This room already has two players." />);
    expect(out).toContain('This room already has two players.');
    expect(out).not.toContain('Waiting for Mission Control');
  });
});

describe('EndScreen', () => {
  it('offers Fly to Mars after a Moon win, with the stars as crates', () => {
    const out = html(<EndScreen view={fakeMoonWin} storm={storm} />);
    expect(out).toContain('You kept the Moon base safe!');
    expect(out).toContain('3 of 3 stars');
    expect(out).toContain('Fly to Mars');
    expect(out).toContain('3 supply crates');
  });

  it('says when the crew was lost because no message came in time', () => {
    const out = html(<EndScreen view={{ ...fakeMoonLost, lostReason: 'time' }} storm={storm} />);
    expect(out).toContain('No message came in time.');
  });

  it('gives the lose reason in kid words and no Fly to Mars', () => {
    const out = html(<EndScreen view={fakeMoonLost} storm={storm} />);
    expect(out).toContain('Too much radiation.');
    expect(out).toContain('0 of 3 stars');
    expect(out).not.toContain('Fly to Mars');
  });

  it('shows the real storm, the archived badge and the DONKI credit', () => {
    const out = html(<EndScreen view={fakeMoonWin} storm={storm} />);
    expect(out).toContain('What really happened');
    expect(out).toContain(storm.whatReallyHappened[0]);
    expect(out).toContain('Archived NASA data, saved on 14 Nov 2026');
    expect(out).toContain(`href="${storm.source.url}"`);
  });

  it('celebrates Mars and shows the real Mars storm fact', () => {
    const out = html(<EndScreen view={fakeMarsWin} storm={storm} />);
    expect(out).toContain('Mission complete: Earth, Moon and Mars!');
    expect(out).toContain('This really happened on Mars');
    expect(out).toContain(`href="${MARS_FACT.source.url}"`);
  });

  it('makes Mission Control wait for the Astronaut online', () => {
    const out = html(<EndScreen view={fakeMoonWin} storm={storm} canContinue={false} />);
    expect(out).toContain('Waiting for the Astronaut to choose');
    expect(out).not.toContain('Fly to Mars');
    expect(out).not.toContain('again');
  });
});

describe('HowToPlayScreen', () => {
  it('explains both roles and the sourced Mars blackout', () => {
    const out = html(<HowToPlayScreen />);
    expect(out).toContain('Mission Control');
    expect(out).toContain('Astronaut');
    expect(out).toContain(`href="${BLACKOUT_FACT.source.url}"`);
  });

  it('shows the two facts the 3 waves skip (timely alerts, the Moon delay), with their sources', () => {
    const out = html(<HowToPlayScreen />);
    for (const fact of [ALERTS_FACT, MOON_DELAY_FACT]) {
      expect(out).toContain(fact.text);
      expect(out).toContain(`href="${fact.source.url}"`);
    }
  });

  it('uses exactly the same words and sources as the storm file, so the two never drift apart', () => {
    expect(storm.stages[0].fact).toEqual(ALERTS_FACT);
    expect(storm.stages[2].fact).toEqual(MOON_DELAY_FACT);
  });
});

describe('the mission debrief', () => {
  it('a win: why it worked, what you learned, and one question to try next, every number from the view', () => {
    const d = missionDebrief({ crew: fakeMoonWin });
    expect(d.whyTitle).toBe('Why your mission succeeded');
    expect(d.why).toEqual([
      'The crew took 18 of 40 radiation points, so they stayed under the limit.',
      'You kept 35 power, so the air pumps never stopped.',
      'Crew health ended at 72 of 100.',
      'You earned 2 science points.'
    ]);
    expect(d.learned).toEqual([LEARNED.radiation, LEARNED.cost, LEARNED.power, LEARNED.team]);
    expect(d.tryNext).toBe(TRY_NEXT.toMars); // 3 stars on the Moon: next, Mars
    expect(d.team).toBeNull(); // no warning checks in this view
  });

  it('a loss: why it ended, the biggest hit, and the question for that reason', () => {
    const crew = {
      ...fakeMoonLost,
      moveResults: [
        { turn: 1, move: 'raiseShield', radiation: 2 },
        { turn: 2, move: 'doScience', radiation: 40 }
      ]
    };
    const d = missionDebrief({ crew });
    expect(d.whyTitle).toBe('Why your mission ended');
    expect(d.why[0]).toBe('Radiation reached 41 of 40 points, so the storm budget ran out.');
    expect(d.why[1]).toBe('The biggest hit was wave 2: 40 radiation got through after "Do science".');
    expect(d.tryNext).toBe(TRY_NEXT.radiation);
    for (const reason of ['oxygen', 'health', 'time']) {
      expect(missionDebrief({ crew: { ...fakeMoonLost, lostReason: reason } }).tryNext).toBe(TRY_NEXT[reason]);
    }
  });

  it('picks the question from how the level was played, and says 1 science point, not 1 points', () => {
    expect(missionDebrief({ crew: { ...fakeMarsWin, stars: 3 } }).tryNext).toBe(TRY_NEXT.otherStorm);
    expect(missionDebrief({ crew: { ...fakeMarsWin, meters: { ...fakeMarsWin.meters, crewHealth: 50 } } }).tryNext).toBe(TRY_NEXT.healthier);
    expect(missionDebrief({ crew: { ...fakeMarsWin, science: 0 } }).tryNext).toBe(TRY_NEXT.firstScience);
    const one = missionDebrief({ crew: { ...fakeMarsWin, science: 1 } });
    expect(one.tryNext).toBe(TRY_NEXT.oneMoreScience);
    expect(one.why).toContain('You earned 1 science point: 2 earn the third star.');
    expect(one.learned).toContain(LEARNED.mars);
  });

  it("scores Mission Control's warnings, kindly, and links a missed warning to the hit it caused", () => {
    const crew = { ...fakeMoonWin, moveResults: [{ turn: 1, move: 'raiseShield', radiation: 2 }, { turn: 2, move: 'raiseShield', radiation: 40 }] };
    const missionControl = {
      warningChecks: [
        { turn: 1, sent: 'stormComing', best: 'stormComing', delayTurns: 0 },
        { turn: 2, sent: 'allClear', best: 'shelterNow', delayTurns: 0 },
        { turn: 3, sent: 'shelterNow', best: 'stormComing', delayTurns: 0 }
      ]
    };
    const team = missionControlScore(missionControl, crew);
    expect(team).toMatchObject({ great: 1, close: 1, total: 3 });
    expect(team.line).toBe('1 of 3 warnings were just right, and 1 was close.');
    expect(team.rating).toBe('Good teamwork: most warnings helped the crew.');
    expect(team.linked).toBe('Wave 2: the warning was "All clear", and 40 radiation hit the crew.');
    const perfect = { warningChecks: [{ turn: 1, sent: 'stormComing', best: 'stormComing', delayTurns: 0 }] };
    expect(missionControlScore(perfect, crew).rating).toMatch(/^Perfect warnings!/);
  });

  it('on Mars, a missed warning is linked to the next wave (the one it was meant for)', () => {
    const crew = { ...fakeMarsWin, moveResults: [{ turn: 1, move: 'shelter', radiation: 1 }, { turn: 2, move: 'doScience', radiation: 30 }] };
    const missionControl = { warningChecks: [{ turn: 1, sent: null, best: 'shelterNow', delayTurns: 1 }] };
    expect(missionControlScore(missionControl, crew).linked).toBe('Wave 2: no warning was sent, and 30 radiation hit the crew.');
  });

  it('no Mission Control score in Play alone, and no debrief without the crew view', () => {
    const checks = { warningChecks: [{ turn: 1, sent: 'allClear', best: 'stormComing', delayTurns: 0 }] };
    expect(missionControlScore(checks, { ...fakeMoonWin, solo: true })).toBeNull();
    expect(missionDebrief({ crew: { ...fakeMoonWin, solo: true } }).learned).toContain(LEARNED.solo);
    expect(missionDebrief({})).toBeNull();
  });

  it('shows on the end screen with all its parts when the crew view is passed, and not without it', () => {
    const missionControl = { warningChecks: [{ turn: 1, sent: 'stormComing', best: 'stormComing', delayTurns: 0 }] };
    const out = html(<EndScreen view={fakeMoonWin} storm={storm} crew={fakeMoonWin} missionControl={missionControl} />);
    for (const part of ['Mission debrief', 'Why your mission succeeded', 'Mission Control', 'What you learned', 'Try this next time']) {
      expect(out).toContain(part);
    }
    expect(html(<EndScreen view={fakeMoonWin} storm={storm} />)).not.toContain('Mission debrief');
  });
});

describe('DataSourcesScreen', () => {
  it('lists every storm fact and flow fact with its link', () => {
    const out = html(<DataSourcesScreen storm={storm} />);
    expect(out).toContain('Archived NASA data, saved on 14 Nov 2026');
    for (const stage of storm.stages) {
      expect(out).toContain(`href="${stage.fact.source.url}"`);
    }
    expect(out).toContain(`href="${MARS_FACT.source.url}"`);
    expect(out).toContain(`href="${BLACKOUT_FACT.source.url}"`);
    expect(out).toContain('Not a real dose.');
  });

  it('explains how the real NASA numbers became game points, with the same rule the storm files follow', () => {
    const out = html(<DataSourcesScreen storm={storm} />);
    expect(out).toContain('From NASA data to the game');
    // The numbers on screen are the ones the rule gives for the real storms
    expect(out).toContain(`X1 to X9.9: ${peakFor('X5.8')} points`);
    expect(out).toContain(`M class (or weaker): ${peakFor('M8.1')} points`);
    expect(out).toContain(`1,000 to 2,000 km a second: ${fadeFor(1263)} points`);
    // ...and every storm file really follows it
    for (const id of REAL_STORM_IDS) {
      const s = getStorm(id);
      const flare = s.stages[1].realData.flareClass;
      const speed = s.stages[2].realData.cmeSpeedKmPerSec;
      expect([s.stages[3].incoming, s.stages[4].incoming]).toEqual([peakFor(flare), fadeFor(speed)]);
    }
    expect(out).toContain('Simplified: the class tells how big the flash was.');
  });

  it('from Home: lists both real storms, and each fact only once', () => {
    const storms = REAL_STORM_IDS.map((id) => getStorm(id));
    const out = html(<DataSourcesScreen storms={storms} />);
    expect(out).toContain('The real storms');
    for (const s of storms) expect(out).toContain(s.title);
    const alerts = out.split(ALERTS_FACT.text).length - 1;
    expect(alerts).toBe(1);
  });
});

describe('TeacherScreen', () => {
  it('says what the game teaches, how to run it, and what to talk about, in short lines', () => {
    const out = html(<TeacherScreen onBack={() => {}} onDataSources={() => {}} />);
    for (const line of [...TEACHES, ...HOW_TO_RUN, ...QUESTIONS]) {
      expect(out).toContain(line.replace(/'/g, '&#x27;'));
      expect(line.split(/\s+/).length).toBeLessThanOrEqual(25);
    }
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(4);
    expect(out).toContain('See every source');
  });

  it('is linked from Home only when the app passes the link', () => {
    expect(html(<HomeScreen onTeachers={() => {}} />)).toContain('For teachers');
    expect(html(<HomeScreen />)).not.toContain('For teachers');
  });
});
