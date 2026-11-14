import { describe, it, expect } from 'vitest';
import { soundFor, SOUNDS, HIT_SOUND_MIN } from './sound.js';
import { fakeAstronautView, fakeMissionControlView } from '../fakeState.js';

const astro = (changes = {}) => ({ ...fakeAstronautView, ...changes });
const nextTurn = (view, changes = {}) => ({ ...view, turn: view.turn + 1, ...changes });

describe('soundFor', () => {
  it('plays nothing on the first view or when nothing changed', () => {
    expect(soundFor(null, astro())).toEqual([]);
    expect(soundFor(astro(), astro())).toEqual([]);
    expect(soundFor(astro(), { ...astro() })).toEqual([]);
  });

  it('plays the move sound when a turn is played', () => {
    const before = astro({ inbox: [] });
    expect(soundFor(before, nextTurn(before, { lastMove: 'doScience' }))).toEqual(['move']);
  });

  it('plays the shield sound when the shield went up', () => {
    const before = astro({ inbox: [] });
    expect(soundFor(before, nextTurn(before, { lastMove: 'raiseShield' }))).toEqual(['shield']);
  });

  it('plays the hit sound when radiation jumps', () => {
    const before = astro({ inbox: [] });
    const meters = { ...before.meters, radiationDose: before.meters.radiationDose + HIT_SOUND_MIN };
    expect(soundFor(before, nextTurn(before, { lastMove: 'doScience', meters }))).toEqual(['move', 'hit']);

    const small = { ...before.meters, radiationDose: before.meters.radiationDose + HIT_SOUND_MIN - 1 };
    expect(soundFor(before, nextTurn(before, { lastMove: 'doScience', meters: small }))).toEqual(['move']);
  });

  it('plays the warning sound when a warning arrives this turn (Moon)', () => {
    const before = astro({ inbox: [] });
    const after = { ...before, inbox: [{ turn: before.turn, warning: 'shelterNow' }] };
    expect(soundFor(before, after)).toEqual(['warning']);
  });

  it('plays the warning sound again when the warning is changed this turn', () => {
    const before = astro({ inbox: [{ turn: 3, warning: 'stormComing' }] });
    const after = { ...before, inbox: [{ turn: 3, warning: 'shelterNow' }] };
    expect(soundFor(before, after)).toEqual(['warning']);
  });

  it('plays the move and then the warning when a late Mars warning arrives with the new turn', () => {
    const before = astro({ world: 'mars', inbox: [] });
    const after = nextTurn(before, {
      lastMove: 'savePower',
      inbox: [{ turn: before.turn + 1, turnSent: before.turn, warning: 'shelterNow' }]
    });
    expect(soundFor(before, after)).toEqual(['move', 'warning']);
  });

  it('does not replay an old warning on a new turn', () => {
    const before = astro({ inbox: [{ turn: 3, warning: 'shelterNow' }] });
    expect(soundFor(before, nextTurn(before, { lastMove: 'shelter' }))).toEqual(['move']);
  });

  it('plays the win or lose sound when the level ends', () => {
    const before = astro({ inbox: [] });
    expect(soundFor(before, nextTurn(before, { lastMove: 'shelter', status: 'won' }))).toEqual(['move', 'win']);
    expect(soundFor(before, nextTurn(before, { lastMove: 'shelter', status: 'lost' }))).toEqual(['move', 'lose']);
  });

  it('stays quiet when a new game starts', () => {
    const end = astro({ turn: 6, status: 'won' });
    expect(soundFor(end, astro({ turn: 0, status: 'playing', inbox: [] }))).toEqual([]);
  });

  it('works with the Mission Control view (no meters, no inbox)', () => {
    const before = fakeMissionControlView;
    expect(soundFor(before, nextTurn(before, { lastMove: 'raiseShield' }))).toEqual(['shield']);
    expect(soundFor(before, nextTurn(before, { lastMove: 'doScience', status: 'lost' }))).toEqual(['move', 'lose']);
  });

  it('only asks for sounds that exist', () => {
    for (const name of ['move', 'shield', 'hit', 'warning', 'win', 'lose']) {
      expect(SOUNDS[name].length).toBeGreaterThan(0);
    }
  });
});
