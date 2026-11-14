import { describe, it, expect } from 'vitest';
import * as PROPS from './props.js';
import { NOVA, SOLA } from './heroes.js';
import { BASE_MAP, BASE_START } from './baseMapData.js';
import { ROOM_MAP, ROOM_START } from './controlRoomData.js';
import { PALETTE } from '../../components/pixel/sprites.js';
import { canStand, facingToward, stepHero } from './worldMap.js';

const inPalette = (rows, name) => {
  for (const row of rows) for (const letter of row) expect(letter === '.' || letter in PALETTE, `${name}: ${letter}`).toBe(true);
};

describe('map props', () => {
  it.each(Object.entries(PROPS))('%s has rows of the same length in known colours', (name, rows) => {
    expect(new Set(rows.map((r) => r.length)).size).toBe(1);
    inPalette(rows, name);
  });

  it('the base has a radio dish, a flag, a lander and crates, all solid', () => {
    for (const letter of ['a', 'f', 'L', 'c']) {
      const y = BASE_MAP.rows.findIndex((row) => row.includes(letter));
      expect(y, letter).toBeGreaterThanOrEqual(0);
      expect(canStand(BASE_MAP, BASE_MAP.rows[y].indexOf(letter), y)).toBe(false);
    }
    expect(canStand(BASE_MAP, BASE_START.x, BASE_START.y)).toBe(true);
  });

  it('the control room has a water cooler, a computer rack and the engineer, all solid', () => {
    for (const letter of ['c', 'S', 'E']) {
      const y = ROOM_MAP.rows.findIndex((row) => row.includes(letter));
      expect(y, letter).toBeGreaterThanOrEqual(0);
      expect(canStand(ROOM_MAP, ROOM_MAP.rows[y].indexOf(letter), y)).toBe(false);
    }
    expect(canStand(ROOM_MAP, ROOM_START.x, ROOM_START.y)).toBe(true);
  });
});

describe('the characters face the way they walk', () => {
  it('Nova and Sola have a side view (10 wide, as tall as the front) and side legs', () => {
    for (const hero of [NOVA, SOLA]) {
      const { side, sideLegs, front } = hero.sprites;
      expect(side).toHaveLength(front.length);
      for (const frame of [side, sideLegs.stand, sideLegs.stepLeft, sideLegs.stepRight]) {
        for (const row of frame) expect(row).toHaveLength(10);
        inPalette(frame, hero.name);
      }
      for (const frame of [sideLegs.stand, sideLegs.stepLeft, sideLegs.stepRight]) expect(frame).toHaveLength(3);
    }
  });

  it('a step turns the character the way it went', () => {
    const start = { x: 5, y: 4, facing: 'down' };
    expect(stepHero(BASE_MAP, start, 'left').facing).toBe('left');
    expect(stepHero(BASE_MAP, start, 'right').facing).toBe('right');
  });

  it('facingToward turns the character to the place it uses', () => {
    const rover = BASE_MAP.places.find((p) => p.id === 'rover'); // at (7, 4)
    expect(facingToward({ x: 6, y: 4, facing: 'down' }, rover)).toBe('right');
    expect(facingToward({ x: 8, y: 4, facing: 'down' }, rover)).toBe('left');
    expect(facingToward({ x: 7, y: 3, facing: 'left' }, rover)).toBe('down');
    expect(facingToward({ x: 7, y: 5, facing: 'left' }, rover)).toBe('up');
    expect(facingToward({ x: 2, y: 2, facing: 'left' }, rover)).toBeNull();
    expect(facingToward({ x: 2, y: 2, facing: 'left' }, null)).toBeNull();
  });
});
