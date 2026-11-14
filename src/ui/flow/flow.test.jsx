import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { getStorm } from '../../engine/storms/index.js';
import HomeScreen from './HomeScreen.jsx';
import LobbyScreen from './LobbyScreen.jsx';
import EndScreen from './EndScreen.jsx';
import HowToPlayScreen from './HowToPlayScreen.jsx';
import DataSourcesScreen from './DataSourcesScreen.jsx';
import { ALERTS_FACT, BLACKOUT_FACT, MARS_FACT, MOON_DELAY_FACT } from './facts.js';
import { DEBRIEF_TIPS, debriefLines } from './debrief.js';
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

describe('What your choices meant', () => {
  it('turns the Astronaut view into plain sentences, with every number from the view', () => {
    expect(debriefLines(fakeMoonWin)).toEqual([
      'You used 18 of your 40 radiation points.',
      'You ended with 35 power and 100 oxygen.',
      'Crew health: 72 out of 100.',
      'You earned 2 science points.',
      DEBRIEF_TIPS.perfect
    ]);
  });

  it('says when the radiation budget ran out, and gives the tip for how the game was lost', () => {
    const lines = debriefLines(fakeMoonLost);
    expect(lines[0]).toBe('Radiation reached 41 of your 40 points, so the storm budget ran out.');
    expect(lines.at(-1)).toBe(DEBRIEF_TIPS.radiation);
    for (const reason of ['oxygen', 'health', 'time']) {
      expect(debriefLines({ ...fakeMoonLost, lostReason: reason }).at(-1)).toBe(DEBRIEF_TIPS[reason]);
    }
  });

  it('suggests more stars when the win was not perfect, and says 1 science point, not 1 points', () => {
    const lines = debriefLines({ ...fakeMarsWin, science: 1 });
    expect(lines).toContain('You earned 1 science point.');
    expect(lines.at(-1)).toBe(DEBRIEF_TIPS.moreStars);
  });

  it('shows on the end screen when the crew view is passed, and not without it', () => {
    expect(html(<EndScreen view={fakeMoonWin} storm={storm} crew={fakeMoonWin} />)).toContain('What your choices meant');
    expect(html(<EndScreen view={fakeMoonWin} storm={storm} />)).not.toContain('What your choices meant');
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
    expect(out).toContain('not real radiation doses');
  });
});
