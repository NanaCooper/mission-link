import { describe, it, expect } from 'vitest';
import { MOVES, WARNINGS } from '../../shared/contract.js';
import {
  MOVE_INFO,
  WARNING_INFO,
  WORLD_NAMES,
  RADIATION_EXPLAINER,
  MARS_DELAY_NOTE,
  turnText
} from './labels.js';

describe('screen labels', () => {
  it('MOVE_INFO has exactly one entry per move in the contract', () => {
    expect(Object.keys(MOVE_INFO).sort()).toEqual([...MOVES].sort());
  });

  it('WARNING_INFO has exactly one entry per warning in the contract', () => {
    expect(Object.keys(WARNING_INFO).sort()).toEqual([...WARNINGS].sort());
  });

  it('every move has an icon, a label and a hint', () => {
    for (const info of Object.values(MOVE_INFO)) {
      expect(info.icon).toBeTruthy();
      expect(info.label).toBeTruthy();
      expect(info.hint).toBeTruthy();
    }
  });

  it('every warning has an icon and a label', () => {
    for (const info of Object.values(WARNING_INFO)) {
      expect(info.icon).toBeTruthy();
      expect(info.label).toBeTruthy();
    }
  });

  it('names both worlds and has the explainer texts', () => {
    expect(WORLD_NAMES).toEqual({ moon: 'Moon base', mars: 'Mars base' });
    expect(RADIATION_EXPLAINER).toMatch(/not a real dose/);
    expect(MARS_DELAY_NOTE).toMatch(/next turn/);
  });

  it('turnText counts from 1 and never goes past maxTurns', () => {
    expect(turnText({ turn: 0, maxTurns: 6 })).toBe('Turn 1 of 6');
    expect(turnText({ turn: 3, maxTurns: 6 })).toBe('Turn 4 of 6');
    expect(turnText({ turn: 6, maxTurns: 6 })).toBe('Turn 6 of 6');
  });
});
