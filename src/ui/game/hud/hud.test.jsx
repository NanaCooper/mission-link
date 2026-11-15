import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import GameMenu from './GameMenu.jsx';
import RotateCard from './RotateCard.jsx';
import PassCard from './PassCard.jsx';
import { HUD_ICONS } from './hudIcons.js';
import { isTouchDevice, resetLandscape, tryLandscape } from './landscape.js';
import AstronautScreen from '../AstronautScreen.jsx';
import MissionControlScreen from '../MissionControlScreen.jsx';
import { ROTATE_TITLE } from '../labels.js';
import {
  fakeAstronautView,
  fakeMissionControlView,
  fakeMarsBlackoutMissionControlView,
  fakeWonAstronautView
} from '../../fakeState.js';

const noop = () => {};
const astronaut = (view) => renderToStaticMarkup(<AstronautScreen view={view} onMove={noop} />);
const missionControl = (view) => renderToStaticMarkup(<MissionControlScreen view={view} onWarn={noop} />);

// The tab buttons of a menu, as HTML strings
const tabButtons = (html) => html.match(/<button[^>]*role="tab"[^>]*>.*?<\/button>/g) || [];
// What pops up over the map (outside the menu)
const popups = (html) => html.match(/<div class="hud-popups"[^>]*>(.*?)<\/div><div class="game-hud__map">/)?.[1] ?? '';
// The menu panel's opening tag
const menuTag = (html) => html.match(/<div id="[^"]*" class="game-menu"[^>]*>/)?.[0];

describe('the menu: a side panel with tabs', () => {
  const tabs = [
    { id: 'one', label: 'Status', sprite: 'health', content: <p>First tab</p> },
    { id: 'two', label: 'Moves', sprite: 'shield', badge: true, content: <p>Second tab</p> }
  ];
  const render = (props) =>
    renderToStaticMarkup(<GameMenu id="m" label="Test menu" tabs={tabs} tab="one" open onTab={noop} onClose={noop} {...props} />);

  it('has one tab button per tab, with an icon and a word, and the open tab marked', () => {
    const html = render();
    expect(html).toContain('role="tablist"');
    const buttons = tabButtons(html);
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toContain('aria-selected="true"');
    expect(buttons[0]).toContain('Status');
    expect(buttons[0]).toContain('pixel-icon');
    expect(buttons[1]).toContain('aria-selected="false"');
  });

  it('shows only the open tab, but keeps the others in the page', () => {
    const html = render();
    expect(html).toMatch(/role="tabpanel"[^>]*class="game-menu__panel game-menu__panel--one">/);
    expect(html).toMatch(/role="tabpanel"[^>]*class="game-menu__panel game-menu__panel--two" hidden="">/);
    expect(html).toContain('Second tab');
  });

  it('has a Close button and a "New" tag on a tab with something new', () => {
    const html = render();
    expect(html).toMatch(/<button type="button" class="game-menu__close">.*Close<\/span><\/button>/);
    expect(tabButtons(html)[1]).toContain('<span class="hud-badge">New</span>');
    expect(tabButtons(html)[0]).not.toContain('hud-badge');
  });

  it('is hidden when closed', () => {
    expect(render({ open: false })).toMatch(/<div id="m" class="game-menu" role="dialog" aria-label="Test menu" hidden="">/);
  });

  it('Astronaut: Options, Messages and Moves; the menu starts closed with the map in view', () => {
    const html = astronaut(fakeAstronautView);
    expect(tabButtons(html).map((b) => b.replace(/<[^>]+>/g, ''))).toEqual(['Options', 'MessagesNew', 'Moves']);
    expect(menuTag(html)).toContain('hidden=""');
    expect(html).toContain('world__view');
    expect(html).toMatch(/<button type="button" class="hud-menu-button" aria-expanded="false"[^>]*>.*Menu<\/span>/);
  });

  it('Astronaut: sound is in Options and the quick moves in Moves', () => {
    const html = astronaut(fakeAstronautView);
    expect(html).toMatch(/game-menu__panel--options" hidden="">.*Sound on/);
    expect(html).toMatch(/game-menu__panel--moves" hidden="">.*Quick moves/);
  });

  it('Mission Control: Options, Big screen, Crew and Warnings', () => {
    const html = missionControl(fakeMissionControlView);
    expect(tabButtons(html).map((b) => b.replace(/<[^>]+>/g, ''))).toEqual(['Options', 'Big screen', 'Crew', 'Warnings']);
    expect(html).toMatch(/game-menu__panel--bigScreen">.*scene--space/);
    expect(html).toMatch(/game-menu__panel--warnings" hidden="">.*Quick warnings/);
  });
});

// The top bar, up to where the pop-ups start
const topBar = (html) => html.match(/<header class="hud-top">(.*?)<\/header>/)?.[1] ?? '';

describe("the crew's meters stay in the top bar, outside the menu", () => {
  it('Astronaut: Nova and all four meters are in the top bar', () => {
    const bar = topBar(astronaut(fakeAstronautView));
    expect(bar).toContain('class="vitals vitals--4"');
    for (const name of ['Crew health', 'Power', 'Oxygen', 'Storm radiation budget']) {
      expect(bar).toContain(`aria-label="${name}"`);
    }
    expect(bar).toContain('aria-label="Nova looks happy"');
  });

  it('Astronaut: the meters are not in the menu any more', () => {
    const html = astronaut(fakeAstronautView);
    const menu = html.slice(html.indexOf('class="game-menu"'));
    expect(menu).not.toContain('role="meter"');
  });

  it('Mission Control: only Nova and crew health, never power, oxygen or radiation', () => {
    const bar = topBar(missionControl(fakeMissionControlView));
    expect(bar).toContain('class="vitals vitals--1"');
    expect(bar).toContain('aria-label="Crew health"');
    expect(bar).not.toContain('Power');
    expect(bar).not.toContain('Oxygen');
    expect(bar).not.toContain('Radiation');
  });

  it('marks a low meter with a "!" and words for screen readers, not only colour', () => {
    const low = { ...fakeAstronautView, meters: { ...fakeAstronautView.meters, oxygen: 10 } };
    const bar = topBar(astronaut(low));
    expect(bar).toContain('vitals__meter vitals__meter--oxygen is-alert');
    expect(bar).toContain('aria-valuetext="10 of 100, Low!"');
    expect(bar).toContain('<span class="vitals__alert" aria-hidden="true">!</span>');
  });

  it('marks a nearly used-up radiation budget as High!', () => {
    const high = { ...fakeAstronautView, meters: { ...fakeAstronautView.meters, radiationDose: 35 } };
    expect(topBar(astronaut(high))).toContain('aria-valuetext="35 of 40, High!"');
  });
});

describe('the menu: Options and pause', () => {
  it('Options has Sound and explains only the bars this player can see', () => {
    const astro = astronaut(fakeAstronautView);
    expect(astro).toContain('What do the bars mean?');
    expect(astro).toContain('Oxygen: air to breathe.');
    const mc = missionControl(fakeMissionControlView);
    expect(mc).toContain('Crew health: how well the crew feels.');
    expect(mc).not.toContain('Oxygen: air to breathe.');
    expect(mc).not.toContain('Power: runs the base.');
  });

  it('says "Game paused" on one device, and that online games keep going', () => {
    const oneDevice = renderToStaticMarkup(<AstronautScreen view={fakeAstronautView} onMove={noop} pauses />);
    expect(oneDevice).toContain('Game paused');
    expect(oneDevice).toContain('The signal clock is stopped.');
    const online = renderToStaticMarkup(<AstronautScreen view={fakeAstronautView} onMove={noop} pauses={false} />);
    expect(online).toContain('Online games keep going');
    expect(online).not.toContain('Game paused');
    expect(astronaut(fakeAstronautView)).not.toContain('game-menu__note');
  });

  it('is not paused while the menu is closed', () => {
    const html = renderToStaticMarkup(<AstronautScreen view={fakeAstronautView} onMove={noop} pauses />);
    expect(html).toContain('class="game-hud"');
    expect(html).not.toContain('is-paused');
  });

  it('keeps Sound and Read to me out of the top bar', () => {
    expect(topBar(astronaut(fakeAstronautView))).not.toContain('screen-tools');
    expect(topBar(missionControl(fakeMissionControlView))).not.toContain('screen-tools');
  });
});

describe('the "Turn your phone sideways" card', () => {
  it('says what to do, with a pixel rotate icon', () => {
    const html = renderToStaticMarkup(<RotateCard />);
    expect(html).toContain(ROTATE_TITLE);
    expect(html).toContain('hud-icon');
  });

  it('sits on top of each player screen, so the game keeps going underneath', () => {
    for (const html of [astronaut(fakeAstronautView), missionControl(fakeMissionControlView)]) {
      expect(html).toContain('class="rotate-card"');
      expect(html).toContain('world__view'); // the map is still there
    }
  });

  it('every pixel icon of the top bar has rows of the same length', () => {
    for (const [name, rows] of Object.entries(HUD_ICONS)) {
      expect(rows.length, name).toBeGreaterThan(0);
      for (const row of rows) expect(row.length, name).toBe(rows[0].length);
    }
  });
});

describe('pop-ups over the map', () => {
  it('a new warning from Commander Sola pops up by itself, outside the menu', () => {
    // No BLIP line this turn, so Sola's message shows big
    const shown = popups(astronaut({ ...fakeAstronautView, log: [] })); // shelterNow arrived this turn
    expect(shown).toContain('hud-popup--message is-fresh');
    expect(shown).toContain('Commander Sola');
    expect(shown).toContain('<span class="visually-hidden">Shelter now!</span>');
    expect(shown).toContain('<span class="speech__tag">New</span>');
  });

  it('no pop-up for last turn\'s message', () => {
    const shown = popups(astronaut({ ...fakeAstronautView, turn: 4 }));
    expect(shown).not.toContain('Shelter now');
    expect(shown).not.toContain('hud-popup--message');
  });

  it("BLIP's line about the last turn pops up too, and Sola's message folds to one line meanwhile", () => {
    const view = fakeAstronautView;
    const shown = popups(astronaut(view));
    expect(shown).toContain(view.log[view.log.length - 1].text);
    expect(shown).toContain('hud-popup--message is-folded');
    expect(shown).toContain('<span class="visually-hidden">Shelter now!</span>');
  });

  it('after a move, BLIP says what it cost instead of the plain log line', () => {
    const view = { ...fakeAstronautView, lastResult: { turn: fakeAstronautView.turn, move: 'raiseShield', radiation: 12, shieldFailed: false, dust: false, powerOut: false } };
    const shown = popups(astronaut(view));
    expect(shown).toContain('Shield up! Only 12 radiation got through, but it cost 20 power.');
    expect(shown).not.toContain(view.log[view.log.length - 1].text);
  });

  it("Mission Control: BLIP coaches on the last warning", () => {
    const view = { ...fakeMissionControlView, lastWarningCheck: { turn: fakeMissionControlView.turn, sent: 'allClear', best: 'shelterNow', delayTurns: 0 } };
    const shown = popups(missionControl(view));
    expect(shown).toContain('Not quite. You sent &quot;All clear&quot;');
    expect(popups(missionControl(fakeMissionControlView))).not.toContain('Not quite');
  });

  it('the level end pops up', () => {
    expect(popups(astronaut(fakeWonAstronautView))).toContain('Level complete!');
    expect(popups(missionControl({ ...fakeMissionControlView, status: 'lost' }))).toContain('The mission is over.');
  });

  it('Mission Control: the new storm stage, a blackout, and the warning just sent', () => {
    expect(popups(missionControl(fakeMissionControlView))).toContain('New on the big screen: Particles arrive.');
    expect(popups(missionControl(fakeMissionControlView))).toContain('Sent: Shelter now! Nova gets it now.');
    const blackout = popups(missionControl(fakeMarsBlackoutMissionControlView));
    expect(blackout).toContain('blocking the signal');
    expect(blackout).not.toContain('Sent:');
  });
});

describe('the "Pass the device" card (one device)', () => {
  it('names the next player and has one big button', () => {
    const html = renderToStaticMarkup(<PassCard role="astronaut" onReady={noop} onBack={noop} />);
    expect(html).toContain('Pass the device to Nova');
    expect(html).toContain('role="dialog"');
    expect(html.match(/class="big-button"/g)).toHaveLength(1);
    expect(html).toContain('I&#x27;m ready');
    expect(html).toContain('Go back');
  });

  it('works for Mission Control too', () => {
    const html = renderToStaticMarkup(<PassCard role="missionControl" onReady={noop} onBack={noop} />);
    expect(html).toContain('Pass the device to Commander Sola');
    expect(html).toContain('portrait--sola');
  });
});

describe('full screen and sideways (touch devices only)', () => {
  beforeEach(() => resetLandscape());

  const touchWindow = (lock) => ({
    matchMedia: () => ({ matches: true }),
    screen: { orientation: { lock } }
  });
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('never throws when the browser has none of the APIs', () => {
    expect(tryLandscape({ win: undefined, doc: undefined })).toBe(false);
    expect(tryLandscape({ win: {}, doc: {} })).toBe(false);
    expect(tryLandscape({ win: touchWindow(undefined), doc: { documentElement: {} } })).toBe(false);
    const broken = { matchMedia: () => { throw new Error('no'); } };
    expect(isTouchDevice(broken)).toBe(false);
    expect(tryLandscape({ win: broken, doc: {} })).toBe(false);
  });

  it('asks for full screen, then locks the screen sideways', async () => {
    const lock = vi.fn(() => Promise.resolve());
    const requestFullscreen = vi.fn(() => Promise.resolve());
    expect(tryLandscape({ win: touchWindow(lock), doc: { documentElement: { requestFullscreen } } })).toBe(true);
    await flush();
    expect(requestFullscreen).toHaveBeenCalledTimes(1);
    expect(lock).toHaveBeenCalledWith('landscape');
  });

  it('leaves a mouse device alone', () => {
    const requestFullscreen = vi.fn(() => Promise.resolve());
    const win = { matchMedia: () => ({ matches: false }), screen: {} };
    expect(tryLandscape({ win, doc: { documentElement: { requestFullscreen } } })).toBe(false);
    expect(requestFullscreen).not.toHaveBeenCalled();
  });

  it('a "no" from the browser is fine (iPhone, no tap yet), and the next try asks again', async () => {
    const lock = vi.fn(() => {
      throw new Error('not supported');
    });
    const requestFullscreen = vi.fn(() => Promise.reject(new Error('needs a tap')));
    const args = { win: touchWindow(lock), doc: { documentElement: { requestFullscreen } } };
    expect(tryLandscape(args)).toBe(true);
    await flush();
    expect(lock).not.toHaveBeenCalled();
    expect(tryLandscape(args)).toBe(true);
    expect(requestFullscreen).toHaveBeenCalledTimes(2);
  });

  it('does not force full screen back after the player left it', async () => {
    const requestFullscreen = vi.fn(() => Promise.resolve());
    const args = { win: touchWindow(vi.fn(() => Promise.reject(new Error('no')))), doc: { documentElement: { requestFullscreen } } };
    tryLandscape(args);
    await flush();
    expect(tryLandscape(args)).toBe(false); // not in full screen any more: the player left it
    expect(requestFullscreen).toHaveBeenCalledTimes(1);
  });
});
