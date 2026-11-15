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

describe('MissionControlScreen: characters and the space picture', () => {
  it('lets Commander Sola say what Mission Control sees', () => {
    const html = render(fakeMissionControlView);
    expect(html).toContain('Commander Sola');
    expect(html).toContain('speech--sola');
    expect(html).toContain(`<span class="visually-hidden">${fakeMissionControlView.stage.missionControlSees}</span>`);
  });

  it('shows the space picture for this turn, with the stage in words', () => {
    const html = render(fakeMissionControlView); // turn 3: the peak
    expect(html).toContain('scene--space');
    expect(html).toContain('the Moon base on the right. Particles arrive');
    expect(html.match(/class="px-fly"/g).length).toBeGreaterThan(10);
  });

  it('shows the dust haze and the cut message line only when the view says so', () => {
    expect(render(fakeMarsMissionControlView)).toContain('scene__haze');
    expect(render(fakeMissionControlView)).not.toContain('scene__haze');
    expect(render(fakeMarsBlackoutMissionControlView)).toContain('scene__cut');
    expect(render(fakeMarsMissionControlView)).not.toContain('scene__cut');
  });

  it("shows Nova's face and her last move by name", () => {
    const html = render(fakeMissionControlView);
    expect(html).toContain('aria-label="Nova looks happy"');
    expect(html).toContain('Nova&#x27;s last move: Raise shield');
    expect(render({ ...fakeMissionControlView, crewHealth: 20 })).toContain('aria-label="Nova looks hurt"');
  });

  it('uses pixel icons on the warning buttons, not emoji', () => {
    const html = render(fakeMissionControlView);
    for (const emoji of ['🌩️', '🏠', '🔋', '✅']) expect(html).not.toContain(emoji);
  });
});

describe('MissionControlScreen: Mars signal blackout', () => {
  it('shows the "Signal blocked" badge and the blackout note', () => {
    const html = render(fakeMarsBlackoutMissionControlView);
    expect(html).toContain('Signal blocked');
    expect(html).toContain("The Sun is blocking the signal. Your warning can&#x27;t get through this wave.");
  });

  it('disables all four warning buttons during a blackout', () => {
    const html = render(fakeMarsBlackoutMissionControlView);
    // The warning buttons only: the control room's USE button has its own rule (Sola must be near a place).
    expect(html.match(/<button[^>]*class="big-button[^>]*disabled/g)).toHaveLength(4);
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
    expect(html).not.toMatch(/<button[^>]*class="big-button[^>]*disabled/);
  });
});

describe('MissionControlScreen', () => {
  it('shows the header, turn, storm stage and forecast', () => {
    const html = render(fakeMissionControlView);
    expect(html).toContain('Mission Control, Earth');
    expect(html).toContain('Wave 2 of 3');
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
    // Count the warning buttons only: the "Sound on/off" button is always there too.
    expect(html.match(/<button[^>]*class="big-button/g)).toHaveLength(4);
    expect(html).not.toContain('aria-pressed="true"');
  });

  it('says it is the last turn when there is no forecast', () => {
    const html = render({ ...fakeMissionControlView, forecast: null });
    expect(html).toContain('This is the last wave');
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

  it('disables every warning button when the game is won', () => {
    const html = render({ ...fakeMissionControlView, status: 'won' });
    // "Sound on/off" stays usable on purpose, so only the warning buttons are checked.
    const buttons = html.match(/<button[^>]*class="big-button[^>]*>/g) || [];
    expect(buttons).toHaveLength(4);
    for (const button of buttons) expect(button).toContain('disabled');
  });

  it('enables the warning buttons while playing', () => {
    const html = render(fakeMissionControlView);
    expect(html).not.toMatch(/<button[^>]*class="big-button[^>]*disabled/);
  });

  it('shows the Why? card from lastFact', () => {
    expect(render(fakeMissionControlView)).toContain('Why?');
    expect(render({ ...fakeMissionControlView, lastFact: null })).not.toContain('Why?');
  });
});

describe('MissionControlScreen: sound and read-aloud', () => {
  it('shows the sound button, which stays usable when the game is over', () => {
    const html = render({ ...fakeMissionControlView, status: 'won' });
    expect(html).toMatch(/<button type="button" class="screen-tools__button">/);
    expect(html).toContain('Sound on');
    expect(html).not.toContain('Read to me'); // tests run without speechSynthesis
  });
});

describe('MissionControlScreen: the picture', () => {
  it('keeps the dust and blackout tags in the bottom corner, not next to the title', () => {
    for (const view of [fakeMarsMissionControlView, fakeMarsBlackoutMissionControlView]) {
      const html = render(view);
      expect(html).toContain('scene__corner scene__corner--stack');
      expect(html).toMatch(/<div class="scene__top"><p class="scene__title">[^<]*<\/p><\/div>/);
    }
    expect(render(fakeMissionControlView)).not.toContain('scene__corner');
  });

  it('shows the message packet only after a warning is sent', () => {
    expect(render({ ...fakeMissionControlView, warningThisTurn: 'shelterNow' })).toContain('scene__message');
    expect(render({ ...fakeMissionControlView, warningThisTurn: null })).not.toContain('scene__message');
  });
});
