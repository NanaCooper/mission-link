import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import SplitScreen from './SplitScreen.jsx';
import {
  fakeAstronautView,
  fakeMissionControlView,
  fakeMarsAstronautView,
  fakeMarsMissionControlView,
  fakeMarsBlackoutMissionControlView,
  fakeWonAstronautView
} from '../fakeState.js';

const noop = () => {};

function render(astronautView, missionControlView) {
  return renderToStaticMarkup(
    <SplitScreen
      astronautView={astronautView}
      missionControlView={missionControlView}
      onMove={noop}
      onWarn={noop}
    />
  );
}

// The two tab buttons, as HTML strings: [Mission Control, Astronaut]
const tabs = (html) => html.match(/<button type="button" class="split-screen__tab[^"]*"[^>]*>/g) || [];

describe('SplitScreen', () => {
  it('shows both player screens', () => {
    const html = render(fakeAstronautView, fakeMissionControlView);
    expect(html).toContain('Mission Control, Earth');
    expect(html).toContain('Moon base');
  });

  it('puts Mission Control first, so it is on the left on wide screens', () => {
    const html = render(fakeAstronautView, fakeMissionControlView);
    expect(html.indexOf('Mission Control, Earth')).toBeLessThan(html.indexOf('Moon base'));
  });

  it('has a labelled divider so each kid knows their half', () => {
    const html = render(fakeAstronautView, fakeMissionControlView);
    expect(html).toContain('role="separator"');
    expect(html).toContain('Mission Control on the left, Astronaut on the right');
  });

  it('works on Mars too', () => {
    const html = render(fakeMarsAstronautView, fakeMarsMissionControlView);
    expect(html).toContain('Mars base');
    expect(html).toContain('split-screen world-mars');
  });
});

describe('SplitScreen on a phone: one half at a time', () => {
  it('has two tabs and starts on Mission Control, who plays first each turn', () => {
    const html = render(fakeAstronautView, { ...fakeMissionControlView, warningThisTurn: null });
    const [missionControl, astronaut] = tabs(html);
    expect(tabs(html)).toHaveLength(2);
    expect(missionControl).toContain('is-active');
    expect(missionControl).toContain('aria-pressed="true"');
    expect(astronaut).toContain('aria-pressed="false"');
  });

  it('marks only the Mission Control half as the one to show', () => {
    const html = render(fakeAstronautView, fakeMissionControlView);
    expect(html).toContain('split-screen__half split-screen__half--mission-control is-active');
    expect(html).toContain('class="split-screen__half split-screen__half--astronaut"');
  });

  it('flashes the Astronaut tab once a warning is sent', () => {
    const waiting = render(fakeAstronautView, { ...fakeMissionControlView, warningThisTurn: null });
    expect(waiting).not.toContain('is-nudged');

    const sent = render(fakeAstronautView, { ...fakeMissionControlView, warningThisTurn: 'shelterNow' });
    const [missionControl, astronaut] = tabs(sent);
    expect(astronaut).toContain('is-nudged');
    expect(missionControl).not.toContain('is-nudged');
    expect(sent).toContain('(your turn)');
  });

  it('flashes the Astronaut tab during a signal blackout, when no warning can be sent', () => {
    const html = render(fakeMarsAstronautView, fakeMarsBlackoutMissionControlView);
    expect(tabs(html)[1]).toContain('is-nudged');
  });

  it('stops flashing when the game is over', () => {
    const html = render(fakeWonAstronautView, { ...fakeMissionControlView, status: 'won' });
    expect(html).not.toContain('is-nudged');
  });

  it('has a button in each half to pass the phone to the other player', () => {
    const html = render(fakeAstronautView, fakeMissionControlView);
    expect(html).toContain('Pass to the Astronaut');
    expect(html).toContain('Pass to Mission Control');
    expect(html.indexOf('Pass to the Astronaut')).toBeLessThan(html.indexOf('Pass to Mission Control'));
  });
});
