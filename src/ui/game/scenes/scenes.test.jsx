import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import BaseScene, { BIG_HIT } from './BaseScene.jsx';
import SpaceScene from './SpaceScene.jsx';
import { stormLook, solaMoodForLook } from './stormLook.js';

const count = (html, text) => html.split(text).length - 1;
const particles = (html) => count(html, 'class="px-fly"');

describe('stormLook', () => {
  it('follows the 6 storm stages in order', () => {
    expect([0, 1, 2, 3, 4, 5].map(stormLook)).toEqual(['quiet', 'flare', 'cloud', 'peak', 'fading', 'clear']);
  });

  it('never goes past the first or the last stage', () => {
    expect(stormLook(-1)).toBe('quiet');
    expect(stormLook(6)).toBe('clear');
    expect(stormLook(undefined)).toBe('quiet');
  });

  it('gives Commander Sola a calm face only when the Sun is calm', () => {
    expect(solaMoodForLook('quiet')).toBe('calm');
    expect(solaMoodForLook('clear')).toBe('calm');
    expect(solaMoodForLook('peak')).toBe('alert');
  });
});

describe('BaseScene (what the Astronaut sees)', () => {
  it('says in words what the picture shows, for each move', () => {
    const label = (lastMove) => renderToStaticMarkup(<BaseScene world="moon" lastMove={lastMove} />);
    expect(label(null)).toContain('aria-label="Picture: the Moon base. Nova stands by the base."');
    expect(label('raiseShield')).toContain('The shield is up over the base.');
    expect(label('shelter')).toContain('The crew is safe inside the shelter.');
    expect(label('savePower')).toContain('The lights are off to save power.');
    expect(label('doScience')).toContain('Nova is doing science outside.');
  });

  it('names Mars on the Mars level', () => {
    expect(renderToStaticMarkup(<BaseScene world="mars" />)).toContain('Picture: the Mars base.');
  });

  it('draws the shield only after "Raise shield"', () => {
    expect(renderToStaticMarkup(<BaseScene lastMove="raiseShield" />)).toContain('scene__shield');
    expect(renderToStaticMarkup(<BaseScene lastMove="savePower" />)).not.toContain('scene__shield');
    expect(renderToStaticMarkup(<BaseScene />)).not.toContain('scene__shield');
  });

  it('hides Nova inside the shelter', () => {
    expect(renderToStaticMarkup(<BaseScene />)).toContain('px-bob');
    expect(renderToStaticMarkup(<BaseScene lastMove="shelter" />)).not.toContain('px-bob');
  });

  it('does not make Nova walk on the first picture (she is already at her spot)', () => {
    for (const lastMove of [null, 'raiseShield', 'shelter', 'savePower', 'doScience']) {
      const html = renderToStaticMarkup(<BaseScene lastMove={lastMove} turn={3} />);
      expect(html).toContain('scene__walker');
      expect(html).not.toContain('is-walking');
      expect(html).toContain('--walk:0s');
    }
  });

  it('waits for Nova before showing the shield, the open door and the dark windows', () => {
    expect(renderToStaticMarkup(<BaseScene lastMove="raiseShield" />)).toMatch(/scene__after-walk[^>]*><g class="scene__shield"/);
    expect(renderToStaticMarkup(<BaseScene lastMove="shelter" />)).toContain('scene__after-walk');
    expect(renderToStaticMarkup(<BaseScene lastMove="savePower" />)).toContain('scene__until-walk');
    expect(renderToStaticMarkup(<BaseScene />)).not.toContain('scene__until-walk');
  });

  it('flashes when radiation hits the base: faintly for a small hit, strongly for a big one', () => {
    const none = renderToStaticMarkup(<BaseScene hit={0} />);
    expect(none).not.toContain('scene__hit');
    expect(none).not.toContain('Radiation hit the base.');

    const small = renderToStaticMarkup(<BaseScene hit={BIG_HIT - 1} />);
    expect(small).toContain('class="scene__hit"');
    expect(small).toContain('Radiation hit the base.');

    expect(renderToStaticMarkup(<BaseScene hit={BIG_HIT} />)).toContain('scene__hit--big');
  });

  it('makes the base lights flicker when power is low', () => {
    expect(renderToStaticMarkup(<BaseScene lowPower />)).toContain('px-flicker');
    expect(renderToStaticMarkup(<BaseScene />)).not.toContain('px-flicker');
  });

  it('never shows the storm: no flying particles, no flare, no gas cloud', () => {
    for (const lastMove of [null, 'raiseShield', 'shelter', 'savePower', 'doScience']) {
      const html = renderToStaticMarkup(<BaseScene world="mars" lastMove={lastMove} lowPower hit={40} />);
      expect(particles(html)).toBe(0);
      expect(html).not.toContain('scene__flare');
      expect(html).not.toContain('scene__cloud');
      expect(html.toLowerCase()).not.toContain('dust');
    }
  });

  it('shows the words it is given on top of the picture', () => {
    const html = renderToStaticMarkup(<BaseScene overlay={<p>Turn 2 of 6</p>} />);
    expect(html).toContain('Turn 2 of 6');
  });
});

describe('SpaceScene (what Mission Control sees)', () => {
  const scene = (props) => renderToStaticMarkup(<SpaceScene world="moon" {...props} />);

  it('shows no particles on a quiet Sun, the most at the peak, and none when it is all clear', () => {
    const perTurn = [0, 1, 2, 3, 4, 5].map((turn) => particles(scene({ turn })));
    expect(perTurn[0]).toBe(0);
    expect(perTurn[5]).toBe(0);
    expect(Math.max(...perTurn)).toBe(perTurn[3]);
    expect(perTurn[3]).toBeGreaterThan(perTurn[2]);
    expect(perTurn[3]).toBeGreaterThan(perTurn[4]);
    expect(perTurn[4]).toBeGreaterThan(0);
  });

  it('shows the flare on the flare turn only', () => {
    expect(scene({ turn: 1 })).toContain('scene__flare');
    expect(scene({ turn: 0 })).not.toContain('scene__flare');
    expect(scene({ turn: 3 })).not.toContain('scene__flare');
  });

  it('shows the gas cloud from the launch until the storm fades', () => {
    expect([0, 1, 2, 3, 4, 5].map((turn) => scene({ turn }).includes('scene__cloud'))).toEqual([
      false, false, true, true, true, false
    ]);
  });

  it('shows the dust haze only when told to', () => {
    expect(scene({ world: 'mars', turn: 1, dust: true })).toContain('scene__haze');
    expect(scene({ world: 'mars', turn: 1 })).not.toContain('scene__haze');
  });

  it('cuts the message line during a blackout', () => {
    const blocked = scene({ world: 'mars', turn: 4, blackout: true });
    expect(blocked).toContain('scene__cut');
    expect(blocked).not.toContain('px-signal');

    const open = scene({ world: 'mars', turn: 4 });
    expect(open).toContain('px-signal');
    expect(open).not.toContain('scene__cut');
  });

  it('shows a message packet on its way once a warning is sent', () => {
    const idle = scene({ world: 'moon' });
    expect(idle).not.toContain('scene__message');
    expect(idle).not.toContain('A message is on its way');

    const sent = scene({ world: 'moon', messageSent: true });
    expect(sent).toContain('scene__message');
    expect(sent).toContain('A message is on its way to the base.');
    expect(sent).toContain('--dur:0.9s');
    expect(scene({ world: 'mars', messageSent: true })).toContain('--dur:3.2s');
  });

  it('sends no message packet during a blackout, even if one was asked for', () => {
    const blocked = scene({ world: 'mars', turn: 4, blackout: true, messageSent: true });
    expect(blocked).toContain('scene__cut');
    expect(blocked).not.toContain('scene__message');
    expect(blocked).not.toContain('px-signal');
  });

  it('sends the message slowly to Mars and quickly to the Moon', () => {
    expect(scene({ world: 'moon' })).toContain('--dur:0.9s');
    expect(scene({ world: 'mars' })).toContain('--dur:3.2s');
  });

  it('says in words what the picture shows', () => {
    const html = scene({ world: 'mars', turn: 3, stageName: 'Particles arrive' });
    expect(html).toContain('the Mars base on the right. Particles arrive');
  });

  it('draws the same picture every time (nothing random)', () => {
    expect(scene({ turn: 3 })).toBe(scene({ turn: 3 }));
  });
});
