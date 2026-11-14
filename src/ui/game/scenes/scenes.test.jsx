import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import SpaceScene from './SpaceScene.jsx';
import { stormLook, stageLook, solaMoodForLook } from './stormLook.js';

const count = (html, text) => html.split(text).length - 1;
const particles = (html) => count(html, 'class="px-fly"');

describe('stormLook', () => {
  it('has a picture for each of the 6 storm stages', () => {
    expect([0, 1, 2, 3, 4, 5].map(stageLook)).toEqual(['quiet', 'flare', 'cloud', 'peak', 'fading', 'clear']);
  });

  it('plays 3 waves: the flare, the peak, the storm fading', () => {
    expect([0, 1, 2].map(stormLook)).toEqual(['flare', 'peak', 'fading']);
  });

  it('never goes past the first or the last wave', () => {
    expect(stormLook(-1)).toBe('flare');
    expect(stormLook(3)).toBe('fading'); // the level is over: the last picture stays
    expect(stormLook(undefined)).toBe('flare');
  });

  it('gives Commander Sola a calm face only when the Sun is calm', () => {
    expect(solaMoodForLook('quiet')).toBe('calm');
    expect(solaMoodForLook('clear')).toBe('calm');
    expect(solaMoodForLook('peak')).toBe('alert');
  });
});

describe('SpaceScene (what Mission Control sees)', () => {
  const scene = (props) => renderToStaticMarkup(<SpaceScene world="moon" {...props} />);

  it('shows a few particles on wave 1, the most at the peak (wave 2), and fewer as it fades', () => {
    const perWave = [0, 1, 2].map((turn) => particles(scene({ turn })));
    expect(perWave[0]).toBeGreaterThan(0);
    expect(perWave[1]).toBeGreaterThan(perWave[0]);
    expect(perWave[1]).toBeGreaterThan(perWave[2]);
    expect(perWave[2]).toBeGreaterThan(0);
  });

  it('shows the flare on wave 1 only', () => {
    expect(scene({ turn: 0 })).toContain('scene__flare');
    expect(scene({ turn: 1 })).not.toContain('scene__flare');
    expect(scene({ turn: 2 })).not.toContain('scene__flare');
  });

  it('shows the gas cloud on waves 2 and 3', () => {
    expect([0, 1, 2].map((turn) => scene({ turn }).includes('scene__cloud'))).toEqual([false, true, true]);
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
