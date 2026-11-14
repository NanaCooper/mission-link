import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import MissionControlScreen from './MissionControlScreen.jsx';
import {
  fakeMissionControlView,
  fakeMarsMissionControlView,
  fakeMarsBlackoutMissionControlView
} from '../fakeState.js';

const noop = () => {};
const render = (view) => renderToStaticMarkup(<MissionControlScreen view={view} onWarn={noop} />);

describe('MissionControlScreen: Mars signal blackout', () => {
  it('shows the "Signal blocked" badge and the blackout note', () => {
    const html = render(fakeMarsBlackoutMissionControlView);
    expect(html).toContain('Signal blocked');
    expect(html).toContain("The Sun is blocking the signal. Your warning can&#x27;t get through this turn.");
  });

  it('disables all four warning buttons during a blackout', () => {
    const html = render(fakeMarsBlackoutMissionControlView);
    expect(html.match(/<button[^>]*disabled/g)).toHaveLength(4);
  });

  it('hides the delay note during a blackout, since no message is sent at all', () => {
    expect(render(fakeMarsBlackoutMissionControlView)).not.toContain('Mars is far away');
  });

  it('shows no blackout badge or note when blackout is false', () => {
    for (const view of [fakeMissionControlView, fakeMarsMissionControlView]) {
      const html = render(view);
      expect(html).not.toContain('Signal blocked');
      expect(html).not.toContain('blocking the signal');
    }
  });

  it('still works if an older view has no blackout field', () => {
    const stageWithoutBlackout = { ...fakeMissionControlView.stage };
    delete stageWithoutBlackout.blackout;
    const html = render({ ...fakeMissionControlView, stage: stageWithoutBlackout });
    expect(html).not.toContain('Signal blocked');
    expect(html).not.toContain('disabled');
  });
});

describe('MissionControlScreen', () => {
  it('shows the header, turn, storm stage and forecast', () => {
    const html = render(fakeMissionControlView);
    expect(html).toContain('Mission Control, Earth');
    expect(html).toContain('Turn 4 of 6');
    expect(html).toContain('Particles arrive');
    expect(html).toContain('Coming next: Storm fading');
  });

  it('uses the world class for Moon and Mars', () => {
    expect(render(fakeMissionControlView)).toContain('world-moon');
    expect(render(fakeMarsMissionControlView)).toContain('world-mars');
    expect(render(fakeMarsMissionControlView)).not.toContain('world-moon');
  });

  it('shows the Mars delay note only when delayTurns is 1', () => {
    expect(render(fakeMarsMissionControlView)).toContain('Mars is far away.');
    expect(render(fakeMissionControlView)).not.toContain('Mars is far away.');
  });

  it('puts the Mars delay note above the buttons', () => {
    const html = render(fakeMarsMissionControlView);
    expect(html.indexOf('Mars is far away.')).toBeLessThan(html.indexOf('big-button'));
  });

  it('shows the dust badge only when stage.dust is true', () => {
    expect(render(fakeMarsMissionControlView)).toContain('Dust storm');
    expect(render(fakeMissionControlView)).not.toContain('Dust storm');
  });

  it('marks "Shelter now" as the selected warning', () => {
    const html = render({ ...fakeMissionControlView, warningThisTurn: 'shelterNow' });
    const pressed = html.match(/<button[^>]*aria-pressed="true"[^>]*>.*?<\/button>/g) || [];
    expect(pressed).toHaveLength(1);
    expect(pressed[0]).toContain('Shelter now');
  });

  it('shows all four warning buttons, none selected when no warning sent', () => {
    const html = render({ ...fakeMissionControlView, warningThisTurn: null });
    expect(html.match(/<button/g)).toHaveLength(4);
    expect(html).not.toContain('aria-pressed="true"');
  });

  it('says it is the last turn when there is no forecast', () => {
    const html = render({ ...fakeMissionControlView, forecast: null });
    expect(html).toContain('This is the last turn');
    expect(html).not.toContain('Coming next');
  });

  it('says "No move yet" before the first move', () => {
    expect(render({ ...fakeMissionControlView, lastMove: null })).toContain('No move yet');
    expect(render(fakeMissionControlView)).toContain('Raise shield');
  });

  it('shows crew health but never power, oxygen or radiation', () => {
    for (const view of [fakeMissionControlView, fakeMarsMissionControlView]) {
      const html = render(view);
      expect(html).toContain('Crew health');
      expect(html).not.toContain('Power');
      expect(html).not.toContain('Oxygen');
      expect(html).not.toContain('radiation budget');
    }
  });

  it('disables every button when the game is won', () => {
    const html = render({ ...fakeMissionControlView, status: 'won' });
    const buttons = html.match(/<button[^>]*>/g) || [];
    expect(buttons).toHaveLength(4);
    for (const button of buttons) expect(button).toContain('disabled');
  });

  it('enables the buttons while playing', () => {
    const html = render(fakeMissionControlView);
    expect(html).not.toMatch(/<button[^>]*disabled/);
  });

  it('shows the Why? card from lastFact', () => {
    expect(render(fakeMissionControlView)).toContain('Why?');
    expect(render({ ...fakeMissionControlView, lastFact: null })).not.toContain('Why?');
  });
});
