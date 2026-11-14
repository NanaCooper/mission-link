import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import BaseMap from './BaseMap.jsx';
import { BASE_MAP, BASE_START, PLACE_MOVES, PLACE_NAMES, BIG_HIT } from './baseMapData.js';
import { NOVA, SOLA } from './heroes.js';
import { canStand, placeNearHero, DIRECTIONS } from './worldMap.js';
import { MOVES } from '../../../shared/contract.js';
import { PALETTE } from '../../components/pixel/sprites.js';
import { fakeAstronautView, fakeMarsAstronautView } from '../../fakeState.js';

const noop = () => {};
const render = (view, props = {}) => renderToStaticMarkup(<BaseMap view={view} onMove={noop} {...props} />);
const moonAt = (lastMove, changes = {}) => ({ ...fakeAstronautView, lastMove, ...changes });

// Every square Nova can reach from the start, walking only on free squares.
function reachable() {
  const seen = new Set([`${BASE_START.x},${BASE_START.y}`]);
  const queue = [[BASE_START.x, BASE_START.y]];
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of Object.values(DIRECTIONS)) {
      const key = `${x + dx},${y + dy}`;
      if (!seen.has(key) && canStand(BASE_MAP, x + dx, y + dy)) {
        seen.add(key);
        queue.push([x + dx, y + dy]);
      }
    }
  }
  return [...seen].map((key) => key.split(',').map(Number));
}

describe('the base map', () => {
  it('has one place for each of the four moves, each with a name', () => {
    const moves = BASE_MAP.places.map((place) => PLACE_MOVES[place.id]);
    expect(moves.sort()).toEqual([...MOVES].sort());
    for (const place of BASE_MAP.places) expect(PLACE_NAMES[place.id]).toBeTruthy();
  });

  it('starts Nova on a free square', () => {
    expect(canStand(BASE_MAP, BASE_START.x, BASE_START.y)).toBe(true);
  });

  it('lets Nova reach every place from the start', () => {
    const squares = reachable();
    for (const place of BASE_MAP.places) {
      const canUse = squares.some(([x, y]) =>
        Object.keys(DIRECTIONS).some((facing) => placeNearHero(BASE_MAP, { x, y, facing })?.id === place.id)
      );
      expect(canUse, `${place.id} cannot be reached`).toBe(true);
    }
  });
});

describe('BaseMap (what the Astronaut sees)', () => {
  it('says in words what the picture shows, for each move', () => {
    expect(render(moonAt(null))).toContain('aria-label="Picture: the Moon base. Nova stands by the base."');
    expect(render(moonAt('raiseShield'))).toContain('The shield is up over the base.');
    expect(render(moonAt('shelter'))).toContain('The crew is safe inside the shelter.');
    expect(render(moonAt('savePower'))).toContain('The lights are off to save power.');
    expect(render(moonAt('doScience'))).toContain('Nova is doing science outside.');
  });

  it('names Mars on the Mars level', () => {
    expect(render(fakeMarsAstronautView)).toContain('Picture: the Mars base.');
  });

  it('draws the shield only after "Raise shield"', () => {
    expect(render(moonAt('raiseShield'))).toContain('scene__shield');
    expect(render(moonAt('savePower'))).not.toContain('scene__shield');
    expect(render(moonAt(null))).not.toContain('scene__shield');
  });

  it('makes the base lights flicker when power is low, and turns them off to save power', () => {
    const low = { ...fakeAstronautView.meters, power: 10 };
    expect(render(moonAt(null, { meters: low }))).toContain('px-flicker');
    expect(render(moonAt(null))).not.toContain('px-flicker');
    expect(render(moonAt('savePower', { meters: low }))).not.toContain('px-flicker');
  });

  it('flashes when radiation hits the base: faintly for a small hit, strongly for a big one', () => {
    expect(render(moonAt(null), { hit: 0 })).not.toContain('scene__hit');
    const small = render(moonAt(null), { hit: BIG_HIT - 1 });
    expect(small).toContain('class="scene__hit"');
    expect(small).toContain('Radiation hit the base.');
    expect(render(moonAt(null), { hit: BIG_HIT })).toContain('scene__hit--big');
  });

  it('never shows the storm: no flying particles, no flare, no gas cloud, no dust', () => {
    for (const lastMove of [null, ...MOVES]) {
      const html = render({ ...fakeMarsAstronautView, lastMove }, { hit: 40 });
      expect(html).not.toContain('px-fly');
      expect(html).not.toContain('scene__flare');
      expect(html).not.toContain('scene__cloud');
      expect(html.toLowerCase()).not.toContain('dust');
    }
  });

  // Changed on purpose (dev3/controls): the USE button now pops in only next to a place, so at
  // the start it is not there; the joystick is new. WorldMap.test.jsx checks the action button.
  it('shows the joystick, the arrows and the words it is given', () => {
    const html = render(moonAt(null), { overlay: <p>Turn 2 of 6</p> });
    for (const name of ['Walk up', 'Walk down', 'Walk left', 'Walk right']) expect(html).toContain(`aria-label="${name}"`);
    expect(html).toContain('world__joystick');
    expect(html).toContain('Turn 2 of 6');
    expect(html).toContain('Walk Nova to a place, then press USE.');
  });
});

describe('the characters', () => {
  it('have a front, a back and three pairs of legs, all the same width, in known colours', () => {
    for (const hero of [NOVA, SOLA]) {
      const { front, back, legs } = hero.sprites;
      const width = front[0].length;
      const all = [...front, ...back, ...legs.stand, ...legs.stepLeft, ...legs.stepRight];
      expect(back).toHaveLength(front.length);
      for (const frame of [legs.stand, legs.stepLeft, legs.stepRight]) expect(frame).toHaveLength(3);
      for (const row of all) {
        expect(row).toHaveLength(width);
        for (const letter of row) expect(letter === '.' || letter in PALETTE, `${hero.name}: ${letter}`).toBe(true);
      }
      expect(front.length + legs.stand.length).toBe(14);
    }
  });
});
