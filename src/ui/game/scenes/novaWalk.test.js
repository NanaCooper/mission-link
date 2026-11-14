import { describe, it, expect } from 'vitest';
import { MOVES } from '../../../shared/contract.js';
import { PIECES, PALETTE } from '../../components/pixel/sprites.js';
import { SCENE_WIDTH } from './SceneFrame.jsx';
import {
  STATIONS,
  STEP_SECONDS,
  stationFor,
  walkPlan,
  nextWalkMemo,
  NOVA_BODY,
  NOVA_LEGS,
  NOVA_LEGS_Y
} from './novaWalk.js';

const NOVA_WIDTH = PIECES.novaBody[0].length;

describe('where Nova stands', () => {
  it('has a different spot for every move, and a home spot', () => {
    const spots = MOVES.map(stationFor);
    expect(new Set([...spots, STATIONS.home]).size).toBe(MOVES.length + 1);
  });

  it('uses the home spot before the first move and for unknown moves', () => {
    expect(stationFor(null)).toBe(STATIONS.home);
    expect(stationFor('dance')).toBe(STATIONS.home);
  });

  it('keeps Nova inside the picture at every spot', () => {
    for (const x of Object.values(STATIONS)) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x + NOVA_WIDTH).toBeLessThanOrEqual(SCENE_WIDTH);
    }
  });
});

describe('walkPlan', () => {
  it('does not walk when she is already there', () => {
    expect(walkPlan(47, 47)).toEqual({ offset: 0, steps: 0, cycles: 0, seconds: 0 });
  });

  it('moves one square per step, starting from where she was', () => {
    const left = walkPlan(STATIONS.home, STATIONS.savePower);
    expect(left.steps).toBe(STATIONS.home - STATIONS.savePower);
    expect(left.offset).toBe(STATIONS.home - STATIONS.savePower); // starts to the right of the panel

    const right = walkPlan(STATIONS.savePower, STATIONS.doScience);
    expect(right.offset).toBe(STATIONS.savePower - STATIONS.doScience); // starts to the left
  });

  it('takes longer for longer walks, in whole leg swaps, and never more than 3 seconds', () => {
    const short = walkPlan(STATIONS.home, STATIONS.doScience);
    const long = walkPlan(STATIONS.savePower, STATIONS.doScience);
    expect(short.seconds).toBeGreaterThan(0);
    expect(long.seconds).toBeGreaterThan(short.seconds);
    expect(long.seconds).toBeLessThanOrEqual(3);
    for (const plan of [short, long]) {
      expect(Number.isInteger(plan.cycles)).toBe(true);
      expect(plan.seconds).toBeCloseTo(plan.cycles * STEP_SECONDS);
    }
  });
});

describe('nextWalkMemo', () => {
  it('does not walk on the first picture, even in the middle of a game', () => {
    const memo = nextWalkMemo(null, 3, 'savePower');
    expect(memo).toEqual({ turn: 3, from: STATIONS.savePower, at: STATIONS.savePower });
  });

  it('keeps the same memo while the turn stays the same', () => {
    const memo = nextWalkMemo(null, 0, null);
    expect(nextWalkMemo(memo, 0, null)).toBe(memo);
  });

  it('walks from the last spot to the new one when a turn is played', () => {
    let memo = nextWalkMemo(null, 0, null);
    memo = nextWalkMemo(memo, 1, 'doScience');
    expect(memo).toEqual({ turn: 1, from: STATIONS.home, at: STATIONS.doScience });
    memo = nextWalkMemo(memo, 2, 'shelter');
    expect(memo).toEqual({ turn: 2, from: STATIONS.doScience, at: STATIONS.shelter });
  });

  it('stays put when the same move is played twice', () => {
    let memo = nextWalkMemo(null, 1, 'shelter');
    memo = nextWalkMemo(memo, 2, 'shelter');
    expect(walkPlan(memo.from, memo.at).seconds).toBe(0);
  });

  it('does not walk when a new game starts', () => {
    const end = nextWalkMemo(null, 6, 'doScience');
    expect(nextWalkMemo(end, 0, null)).toEqual({ turn: 0, from: STATIONS.home, at: STATIONS.home });
  });
});

describe("Nova's walking sprite", () => {
  it('splits the standing sprite into a body and legs without losing a row', () => {
    expect([...NOVA_BODY, ...NOVA_LEGS.stand]).toEqual(PIECES.novaBody);
    expect(NOVA_LEGS_Y).toBe(NOVA_BODY.length);
  });

  it('has step frames the same size as the standing legs, using known colours', () => {
    for (const frame of [NOVA_LEGS.stepLeft, NOVA_LEGS.stepRight]) {
      expect(frame).toHaveLength(NOVA_LEGS.stand.length);
      for (const row of frame) {
        expect(row).toHaveLength(NOVA_WIDTH);
        for (const letter of row) expect(letter === '.' || letter in PALETTE).toBe(true);
      }
    }
    expect(NOVA_LEGS.stepLeft).not.toEqual(NOVA_LEGS.stepRight);
  });
});
