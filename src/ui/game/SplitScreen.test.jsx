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

// The wrapper around one player's screen, as an HTML string
const player = (html, who) => html.match(new RegExp(`<div class="split-screen__player" data-player="${who}"[^>]*>`))?.[0];

// The two switch buttons, as HTML strings: [in Mission Control's top bar, in the Astronaut's top bar]
const switches = (html) => html.match(/<button type="button" class="hud-switch[^"]*">.*?<\/button>/g) || [];

describe('SplitScreen: one full screen at a time', () => {
  it('keeps both player screens mounted, so each keeps its state', () => {
    const html = render(fakeAstronautView, fakeMissionControlView);
    expect(html).toContain('Mission Control, Earth');
    expect(html).toContain('Moon base');
  });

  it('starts on Mission Control, who plays first each turn, and hides the Astronaut', () => {
    const html = render(fakeAstronautView, { ...fakeMissionControlView, warningThisTurn: null });
    expect(player(html, 'missionControl')).not.toContain('hidden');
    expect(player(html, 'missionControl')).not.toContain('inert');
    // Hidden and inert: out of sight, and no keyboard or taps reach it.
    expect(player(html, 'astronaut')).toContain('hidden=""');
    expect(player(html, 'astronaut')).toContain('inert=""');
  });

  it('never shows both screens side by side any more', () => {
    const html = render(fakeAstronautView, fakeMissionControlView);
    expect(html).not.toContain('role="separator"');
    expect(html.match(/hidden=""/g)?.length).toBeGreaterThanOrEqual(1);
  });

  it('puts a switch button in each top bar, with the other player\'s face and name', () => {
    const html = render(fakeAstronautView, fakeMissionControlView);
    const [onMissionControl, onAstronaut] = switches(html);
    expect(switches(html)).toHaveLength(2);
    expect(onMissionControl).toContain('portrait--nova');
    expect(onMissionControl).toContain('Switch to</span> <span class="hud-switch__name">Astronaut');
    expect(onAstronaut).toContain('portrait--sola');
    expect(onAstronaut).toContain('Switch to</span> <span class="hud-switch__name">Mission Control');
  });

  it('shows no "Pass the device" card until a switch button is tapped', () => {
    expect(render(fakeAstronautView, fakeMissionControlView)).not.toContain('Pass the device');
  });

  it('works on Mars too', () => {
    const html = render(fakeMarsAstronautView, fakeMarsMissionControlView);
    expect(html).toContain('Mars base');
    expect(html).toContain('split-screen world-mars');
  });
});

describe('SplitScreen: the "your turn" nudge', () => {
  it('flashes "Switch to Astronaut" once a warning is sent', () => {
    const waiting = render(fakeAstronautView, { ...fakeMissionControlView, warningThisTurn: null });
    expect(waiting).not.toContain('is-nudged');

    const sent = render(fakeAstronautView, { ...fakeMissionControlView, warningThisTurn: 'shelterNow' });
    const [onMissionControl, onAstronaut] = switches(sent);
    expect(onMissionControl).toContain('is-nudged');
    expect(onMissionControl).toContain('(your turn)');
    expect(onMissionControl).toContain('>!</span>'); // a "!" as well, so it is not colour alone
    expect(onAstronaut).not.toContain('is-nudged');
  });

  it('flashes during a signal blackout, when no warning can be sent', () => {
    const html = render(fakeMarsAstronautView, fakeMarsBlackoutMissionControlView);
    expect(switches(html)[0]).toContain('is-nudged');
  });

  it('stops flashing when the game is over', () => {
    const html = render(fakeWonAstronautView, { ...fakeMissionControlView, status: 'won' });
    expect(html).not.toContain('is-nudged');
  });
});
