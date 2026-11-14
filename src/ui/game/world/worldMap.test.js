import { describe, it, expect } from 'vitest';
import {
  buildMap,
  canStand,
  stepHero,
  placeNearHero,
  placeCorner,
  placeTop,
  TILE,
  KEY_TO_DIRECTION,
  joystickDirection,
  mapKeyCommand,
  nextChoice,
  JOYSTICK_DEAD_ZONE
} from './worldMap.js';

// . floor   # wall   A and B are places
const MAP = buildMap(['#####', '#A..#', '#..B#', '#####'], { blocked: '#', places: { A: 'alpha', B: 'beta' } });

describe('buildMap', () => {
  it('knows the size, the walls and the places', () => {
    expect(MAP.width).toBe(5);
    expect(MAP.height).toBe(4);
    expect(MAP.places.map((p) => p.id)).toEqual(['alpha', 'beta']);
    expect(MAP.places[0].tiles).toEqual([[1, 1]]);
  });

  it('refuses rows of different lengths', () => {
    expect(() => buildMap(['...', '..'])).toThrow();
  });
});

describe('walking', () => {
  it('cannot stand on walls, places or outside the map', () => {
    expect(canStand(MAP, 2, 1)).toBe(true);
    expect(canStand(MAP, 0, 0)).toBe(false); // wall
    expect(canStand(MAP, 1, 1)).toBe(false); // place
    expect(canStand(MAP, -1, 1)).toBe(false);
    expect(canStand(MAP, 9, 9)).toBe(false);
  });

  it('moves one square when the way is free', () => {
    expect(stepHero(MAP, { x: 2, y: 1, facing: 'down' }, 'right')).toEqual({ x: 3, y: 1, facing: 'right' });
  });

  it('turns to face a wall or a place but does not walk into it', () => {
    expect(stepHero(MAP, { x: 2, y: 1, facing: 'down' }, 'up')).toEqual({ x: 2, y: 1, facing: 'up' });
    expect(stepHero(MAP, { x: 2, y: 1, facing: 'down' }, 'left')).toEqual({ x: 2, y: 1, facing: 'left' });
  });

  it('returns the same object when nothing changes, and ignores unknown directions', () => {
    const hero = { x: 2, y: 1, facing: 'up' };
    expect(stepHero(MAP, hero, 'up')).toBe(hero);
    expect(stepHero(MAP, hero, 'jump')).toBe(hero);
  });

  it('walks with arrow keys and WASD', () => {
    expect(KEY_TO_DIRECTION.ArrowUp).toBe('up');
    expect(KEY_TO_DIRECTION.a).toBe('left');
    expect(KEY_TO_DIRECTION.D).toBe('right');
  });
});

describe('placeNearHero', () => {
  it('finds a place right next to the character', () => {
    expect(placeNearHero(MAP, { x: 2, y: 1, facing: 'down' }).id).toBe('alpha');
  });

  it('prefers the place the character is facing', () => {
    // Standing between two places: alpha on the left, beta on the right
    const between = buildMap(['A.B'], { places: { A: 'alpha', B: 'beta' } });
    expect(placeNearHero(between, { x: 1, y: 0, facing: 'right' }).id).toBe('beta');
    expect(placeNearHero(between, { x: 1, y: 0, facing: 'left' }).id).toBe('alpha');
  });

  it('finds nothing when no place is next to the character', () => {
    const open = buildMap(['....', '.A..', '....', '....'], { places: { A: 'alpha' } });
    expect(placeNearHero(open, { x: 3, y: 3, facing: 'up' })).toBeNull();
  });
});

describe('where to draw a place', () => {
  it('gives the top-left corner and the middle of the top edge', () => {
    const wide = buildMap(['....', '.AA.'], { places: { A: 'alpha' } }).places[0];
    expect(placeCorner(wide)).toEqual({ x: TILE, y: TILE });
    expect(placeTop(wide)).toEqual({ x: 2 * TILE, y: TILE });
  });
});

describe('joystickDirection', () => {
  it('points nowhere inside the dead zone', () => {
    expect(joystickDirection(0, 0)).toBeNull();
    expect(joystickDirection(JOYSTICK_DEAD_ZONE - 1, 0)).toBeNull();
    expect(joystickDirection(5, 5, 10)).toBeNull();
  });

  it('only walks up, down, left or right: the longer pull wins', () => {
    expect(joystickDirection(30, 0)).toBe('right');
    expect(joystickDirection(-30, 4)).toBe('left');
    expect(joystickDirection(3, -30)).toBe('up');
    expect(joystickDirection(-20, 25)).toBe('down');
  });

  it('ignores numbers that are not numbers', () => {
    expect(joystickDirection(NaN, 40)).toBeNull();
  });
});

describe('mapKeyCommand', () => {
  const press = (key, more = {}) => mapKeyCommand({ key, ...more });

  it('walks with the arrow keys and WASD, and uses with Space, Enter or E', () => {
    expect(press('ArrowUp')).toEqual({ type: 'walk', direction: 'up' });
    expect(press('d')).toEqual({ type: 'walk', direction: 'right' });
    for (const key of [' ', 'Enter', 'e', 'E']) expect(press(key)).toEqual({ type: 'use' });
    expect(press('x')).toBeNull();
  });

  it('swallows the key repeat of a held key, so our own timer sets the walking pace', () => {
    expect(press('ArrowLeft', { repeat: true })).toEqual({ type: 'held' });
    expect(press(' ', { repeat: true })).toEqual({ type: 'held' });
  });

  it('leaves typing, shortcuts and other dialogs alone', () => {
    expect(press('a', { target: { tag: 'INPUT' } })).toBeNull();
    expect(press('ArrowUp', { target: { tag: 'TEXTAREA' } })).toBeNull();
    expect(press('w', { target: { tag: 'DIV', editable: true } })).toBeNull();
    expect(press('ArrowUp', { modifier: true })).toBeNull();
    expect(press('ArrowUp', { target: { inModal: true } })).toBeNull();
  });

  // Changed on purpose: a button only keeps Space and Enter if it was reached with Tab.
  // A button that has focus because it was clicked (Sound, Menu...) no longer blocks the map.
  it('a button reached with Tab keeps its own Space and Enter; a clicked one does not', () => {
    const tabbed = { target: { tag: 'BUTTON', control: true, focusVisible: true } };
    const clicked = { target: { tag: 'BUTTON', control: true, focusVisible: false } };
    expect(press(' ', tabbed)).toBeNull();
    expect(press('Enter', tabbed)).toBeNull();
    expect(press(' ', clicked)).toEqual({ type: 'use' });
    expect(press('Enter', clicked)).toEqual({ type: 'use' });
    expect(press('ArrowDown', tabbed)).toEqual({ type: 'walk', direction: 'down' });
  });

  it('E always uses, even on a button reached with Tab (browsers never press buttons with E)', () => {
    expect(press('e', { target: { tag: 'BUTTON', control: true, focusVisible: true } })).toEqual({ type: 'use' });
  });

  // Changed on purpose: three kinds of text box instead of one.
  it('Yes / No box and warning menu: arrows move the highlight, Space / E / Enter pick, Escape closes', () => {
    for (const dialog of ['confirm', 'menu']) {
      expect(press('ArrowUp', { dialog })).toEqual({ type: 'highlight', step: -1 });
      expect(press('ArrowLeft', { dialog })).toEqual({ type: 'highlight', step: -1 });
      expect(press('ArrowRight', { dialog })).toEqual({ type: 'highlight', step: 1 });
      expect(press('s', { dialog })).toEqual({ type: 'highlight', step: 1 });
      for (const key of [' ', 'Enter', 'e']) expect(press(key, { dialog })).toEqual({ type: 'pick' });
      expect(press('Escape', { dialog })).toEqual({ type: 'close' });
    }
    expect(press('Escape')).toBeNull(); // nothing to close
  });

  it('a held key never picks: only a new press says Yes', () => {
    expect(press(' ', { dialog: 'confirm', repeat: true })).toEqual({ type: 'held' });
    expect(press('Enter', { dialog: 'menu', repeat: true })).toEqual({ type: 'held' });
    expect(press('ArrowRight', { dialog: 'confirm', repeat: true })).toEqual({ type: 'held' });
  });

  it('info box: the same key closes it, and an arrow closes it and walks on', () => {
    for (const key of [' ', 'Enter', 'e', 'E', 'Escape']) expect(press(key, { dialog: 'info' })).toEqual({ type: 'close' });
    expect(press('ArrowLeft', { dialog: 'info' })).toEqual({ type: 'closeAndWalk', direction: 'left' });
    expect(press(' ', { dialog: 'info', repeat: true })).toEqual({ type: 'held' });
  });

  it('a choice reached with Tab presses itself (the browser does it)', () => {
    expect(press('Enter', { dialog: 'confirm', target: { tag: 'BUTTON', control: true, focusVisible: true } })).toBeNull();
  });
});

describe('nextChoice', () => {
  const choices = [{ id: 'a' }, { id: 'b', disabled: true }, { id: 'c' }];

  it('moves to the next or previous choice and wraps round', () => {
    expect(nextChoice(choices, 0, 1)).toBe(2); // skips the disabled one
    expect(nextChoice(choices, 2, 1)).toBe(0); // wraps
    expect(nextChoice(choices, 0, -1)).toBe(2);
  });

  it('stays put when nothing else can be picked', () => {
    expect(nextChoice([{ id: 'only' }], 0, 1)).toBe(0);
  });
});
