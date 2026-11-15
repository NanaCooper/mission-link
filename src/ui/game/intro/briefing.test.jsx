import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import MissionBriefing from './MissionBriefing.jsx';
import {
  BRIEFING_PAGES,
  WARNING_FACT,
  fillStorm
} from './briefingText.js';
import { getStorm } from '../../../engine/storms/index.js';

const storm = getStorm(null);
const render = (props = {}) => renderToStaticMarkup(<MissionBriefing storm={storm} onDone={() => {}} {...props} />);

describe('the mission briefing', () => {
  it('has 4 pages: the danger, why it matters, the mission, the two jobs', () => {
    expect(BRIEFING_PAGES.map((p) => p.id)).toEqual(['danger', 'why', 'mission', 'team']);
  });

  it('opens on the first page with Commander Sola, a Skip button and page dots', () => {
    const html = render();
    expect(html).toContain('A storm is coming');
    expect(html).toContain('Commander Sola');
    expect(html).toContain('>Skip</button>');
    expect(html).toContain('aria-label="Page 1 of 4"');
    expect(html).toContain('scene--space');
  });

  it('names the real storm that will be played', () => {
    const html = render();
    expect(html).toContain(`A real one is on the way: ${storm.title}, from ${storm.realDates}.`);
    expect(fillStorm('{storm} / {date}', null)).toBe('a real solar storm / NASA records');
  });

  it('says the mission objective: 3 waves, wave 2 strongest, and how to win stars', () => {
    const mission = BRIEFING_PAGES.find((p) => p.id === 'mission');
    expect(mission.text).toMatch(/3 waves/);
    expect(mission.text).toMatch(/Wave 2 is the strongest/);
    expect(mission.goals).toHaveLength(3);
  });

  it('explains both jobs and that the players must talk', () => {
    const team = BRIEFING_PAGES.find((p) => p.id === 'team');
    expect(team.text).toMatch(/talk to each other/);
    expect(team.roles.map((r) => r.name)).toEqual(['Mission Control', 'Astronaut']);
  });

  it('every NASA fact in it has a NASA source link', () => {
    expect(WARNING_FACT.source.url).toMatch(/^https:\/\/www\.nasa\.gov\//);
    expect(BRIEFING_PAGES.find((p) => p.id === 'why').fact).toBe(true);
  });
});
