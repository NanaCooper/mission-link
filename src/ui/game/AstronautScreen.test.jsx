import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import AstronautScreen, { MoveButtons } from './AstronautScreen.jsx';
import { MOVE_INFO, PREDICTION } from './labels.js';
import {
  fakeAstronautView,
  fakeMarsAstronautView,
  fakeWonAstronautView,
  fakeLostAstronautView,
} from '../fakeState.js';

const noop = () => {};
const render = (view) => renderToStaticMarkup(<AstronautScreen view={view} onMove={noop} />);

describe('AstronautScreen: characters and the base picture', () => {
  it('marks a message that arrived this turn as new, spoken by Commander Sola', () => {
    const html = render(fakeAstronautView); // turn 3, message arrived on turn 3
    expect(html).toContain('Commander Sola');
    expect(html).toContain('<span class="speech__tag">New</span>');
    expect(html).toContain('<span class="visually-hidden">Shelter now!</span>');
  });

  it('shows an older message quietly, so it is not mistaken for a fresh warning', () => {
    const html = render({ ...fakeAstronautView, turn: 4 }); // the message is from turn 3
    expect(html).toContain('No new message this turn.');
    expect(html).toContain('Last message: Shelter now');
    expect(html).not.toContain('Mission Control says:');
    expect(html).not.toContain('speech__tag');
  });

  it('counts a late Mars message as new on the turn it arrives', () => {
    const html = render(fakeMarsAstronautView); // sent on turn 2, arrived on turn 3
    expect(html).toContain('<span class="speech__tag">New</span>');
  });

  it('tells the Astronaut to ask Mission Control when there is no message', () => {
    const html = render({ ...fakeAstronautView, inbox: [] });
    expect(html).toContain('Ask what the Sun is doing!');
  });

  it('shows the base picture with what Nova did last turn', () => {
    const html = render(fakeAstronautView); // lastMove: raiseShield
    expect(html).toContain('Picture: the Moon base. The shield is up over the base.');
    expect(html).toContain('Shield up!');
    expect(html).toContain('scene__shield');
  });

  it('shows no move tag before the first move', () => {
    const html = render({ ...fakeAstronautView, turn: 0, lastMove: null });
    expect(html).not.toContain('scene__tag--move');
    expect(html).toContain('Nova stands by the base.');
  });

  it("shows Nova's face, and it changes when things get bad", () => {
    expect(render(fakeAstronautView)).toContain('aria-label="Nova looks happy"');
    expect(render(fakeLostAstronautView)).toContain('aria-label="Nova looks hurt"'); // radiation budget used up
    const lowPower = { ...fakeAstronautView, meters: { ...fakeAstronautView.meters, power: 10 } };
    expect(render(lowPower)).toContain('aria-label="Nova looks worried"');
  });

  it('lets BLIP the robot say what happened', () => {
    const html = render(fakeAstronautView);
    expect(html).toContain('speech--blip');
    expect(html).toContain('BLIP');
  });

  it('uses pixel icons on the move buttons, not emoji', () => {
    const html = render(fakeAstronautView);
    for (const info of Object.values(MOVE_INFO)) expect(html).not.toContain(info.icon);
    expect(html.match(/pixel-icon/g).length).toBeGreaterThanOrEqual(8); // 4 meters + 4 moves
  });
});

describe('AstronautScreen', () => {
  it('shows the Moon base, the turn and the Moon theme', () => {
    const html = render(fakeAstronautView);
    expect(html).toContain('Moon base');
    expect(html).toContain('Wave 2 of 3');
    expect(html).toContain('class="astronaut-screen world-moon"');
  });

  it('shows the Mars base with the Mars theme', () => {
    const html = render(fakeMarsAstronautView);
    expect(html).toContain('Mars base');
    expect(html).toContain('class="astronaut-screen world-mars"');
  });

  it('uses radiationLimit as the radiation max, not a fixed number', () => {
    const html = render({ ...fakeAstronautView, radiationLimit: 50 });
    // The radiation bar in the top bar is named in full for screen readers, out of radiationLimit.
    expect(html).toContain('aria-label="Storm radiation budget" aria-valuemin="0" aria-valuemax="50"');
  });

  it('shows the newest warning from the inbox', () => {
    const html = render(fakeAstronautView);
    expect(html).toContain('Mission Control says:');
    expect(html).toContain('Shelter now');
  });

  it('shows the newest warning when there are several', () => {
    const view = {
      ...fakeAstronautView,
      inbox: [
        { turn: 1, warning: 'stormComing' },
        { turn: 3, warning: 'allClear' },
      ],
    };
    const html = render(view);
    expect(html).toContain('All clear');
    expect(html).not.toContain('Storm coming');
  });

  it('says there is no message when the inbox is empty', () => {
    const html = render({ ...fakeAstronautView, inbox: [] });
    expect(html).toContain('No message from Mission Control yet');
    expect(html).not.toContain('Mission Control says:');
  });

  it('shows all four move buttons, enabled while playing', () => {
    const html = render(fakeAstronautView);
    for (const info of Object.values(MOVE_INFO)) {
      expect(html).toContain(info.label);
      expect(html).toContain(info.hint);
    }
    expect(html.match(/class="big-button"/g)).toHaveLength(4);
    // Only the move buttons: the map's USE button is off until Nova stands next to a place.
    expect(html).not.toMatch(/class="big-button"[^>]*disabled/);
  });

  it('disables every move button when the game is won or lost', () => {
    for (const view of [fakeWonAstronautView, fakeLostAstronautView]) {
      const html = render(view);
      expect(html.match(/<button type="button" class="big-button" disabled=""/g)).toHaveLength(4);
    }
  });

  it('shows the latest log line', () => {
    const html = render(fakeAstronautView);
    expect(html).toContain(fakeAstronautView.log[fakeAstronautView.log.length - 1].text);
    expect(html).not.toContain(fakeAstronautView.log[0].text);
  });

  it('shows the Why? card below the map controls when there is a fact', () => {
    const html = render(fakeAstronautView);
    expect(html).toContain(fakeAstronautView.lastFact.text);
    expect(html.indexOf('why-card')).toBeGreaterThan(html.indexOf('world__use'));
  });

  it('hides the Why? card when there is no fact', () => {
    const html = render({ ...fakeAstronautView, lastFact: null });
    expect(html).not.toContain('why-card');
    expect(html).not.toContain(fakeAstronautView.lastFact.text);
  });

  it('never shows dust (that is Mission Control only)', () => {
    for (const view of [
      fakeAstronautView,
      fakeMarsAstronautView,
      fakeWonAstronautView,
      fakeLostAstronautView,
    ]) {
      expect(render(view).toLowerCase()).not.toContain('dust');
    }
  });

  it('calls onMove with the move key when a button is clicked', () => {
    const moves = [];
    // MoveButtons, not AstronautScreen: the screen now uses hooks (sounds, the guess),
    // and hooks cannot run when a component is called as a plain function.
    const element = MoveButtons({ disabled: false, onMove: (m) => moves.push(m) });
    const buttons = findAll(element, (el) => el.props && typeof el.props.onClick === 'function' && 'hint' in el.props);
    buttons.forEach((button) => button.props.onClick());
    expect(moves).toEqual(Object.keys(MOVE_INFO));
  });
});

// Walk a React element tree (without rendering) and collect matching elements.
function findAll(node, test, found = []) {
  if (Array.isArray(node)) {
    node.forEach((child) => findAll(child, test, found));
  } else if (node && typeof node === 'object' && node.props) {
    if (test(node)) found.push(node);
    findAll(node.props.children, test, found);
  }
  return found;
}

describe('AstronautScreen: sound, read-aloud and the prediction prompt', () => {
  it('shows the sound button; Read to me is hidden when the browser cannot speak', () => {
    const html = render(fakeAstronautView);
    expect(html).toContain('Sound on');
    expect(html).not.toContain('Read to me'); // tests run without speechSynthesis
  });

  it('asks the prediction question on the peak turn (Wave 2 of 3) without locking the moves', () => {
    const html = render(fakeAstronautView); // view.turn 3
    expect(html).toContain('Wave 2 of 3');
    expect(html).toContain('The storm may be about to peak.');
    for (const answer of PREDICTION.answers) expect(html).toContain(answer);
    expect(html).not.toMatch(/class="big-button"[^>]*disabled/);
  });

  it('does not ask on other turns or after the game ends', () => {
    expect(render({ ...fakeAstronautView, turn: 2 })).not.toContain('about to peak');
    expect(render({ ...fakeAstronautView, turn: 4 })).not.toContain('about to peak');
    expect(render({ ...fakeWonAstronautView, turn: 3 })).not.toContain('about to peak');
  });
});

describe('AstronautScreen, Play alone', () => {
  it('tags Commander Sola\'s message "Automatic" and shows no signal clock', () => {
    const solo = render({ ...fakeAstronautView, solo: true, clockRunning: false });
    expect(solo).toContain('Automatic');
    expect(solo).not.toContain('role="timer"'); // the clock itself (the empty slot in the bar stays)
  });

  it('keeps the "New" tag and the clock when two people play', () => {
    const pair = render({ ...fakeAstronautView, solo: false });
    expect(pair).not.toContain('Automatic');
    expect(pair).toContain('role="timer"');
  });
});
