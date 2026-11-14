import { describe, it, expect } from 'vitest';
import { PALETTE, PORTRAITS, ICONS, PIECES } from './sprites.js';

// Every sprite, with a name for the error message
const allSprites = [
  ...Object.entries(ICONS).map(([name, map]) => [`icon ${name}`, map]),
  ...Object.entries(PIECES).map(([name, map]) => [`piece ${name}`, map]),
  ...Object.entries(PORTRAITS).flatMap(([who, character]) => [
    ...Object.entries(character.frames).map(([mood, map]) => [`portrait ${who} ${mood}`, map]),
    [`portrait ${who} blink`, character.blink.map]
  ])
];

describe('pixel sprites', () => {
  it.each(allSprites)('%s is a full rectangle', (_name, map) => {
    expect(map.length).toBeGreaterThan(0);
    const widths = new Set(map.map((row) => row.length));
    expect([...widths]).toEqual([map[0].length]);
  });

  it.each(allSprites)('%s only uses letters from the palette', (_name, map) => {
    const letters = new Set(map.join('').replaceAll('.', ''));
    for (const letter of letters) expect(PALETTE).toHaveProperty(letter);
  });

  it('every portrait is 16 x 16 and its blink patch fits inside', () => {
    for (const character of Object.values(PORTRAITS)) {
      for (const map of Object.values(character.frames)) {
        expect(map).toHaveLength(16);
        expect(map[0]).toHaveLength(16);
      }
      const { x, y, map } = character.blink;
      expect(x + map[0].length).toBeLessThanOrEqual(16);
      expect(y + map.length).toBeLessThanOrEqual(16);
      expect(character.frames).toHaveProperty(character.fallback);
    }
  });

  it('every palette colour is a hex colour', () => {
    for (const colour of Object.values(PALETTE)) expect(colour).toMatch(/^#[0-9a-f]{6}$/);
  });
});
