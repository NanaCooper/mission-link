import { describe, it, expect } from 'vitest';
import { buildMap, canStand, stepHero, placeNearHero, placeCorner, placeTop, TILE, KEY_TO_DIRECTION } from './worldMap.js';

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
