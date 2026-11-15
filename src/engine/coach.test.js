import { describe, it, expect } from 'vitest';
import { createGame, applyMove, sendWarning, getAstronautView, getMissionControlView } from './index.js';

// What BLIP needs to coach the players: lastResult (what the move did, Astronaut only) and
// lastWarningCheck (Mission Control's warning next to Commander Sola's pick, Mission Control only).
const moon = (extra = {}) => createGame({ mode: 'split', world: 'moon', stormId: 'storm-2024-05-11', ...extra });
const mars = (extra = {}) => createGame({ mode: 'split', world: 'mars', stormId: 'storm-2024-05-11', ...extra });

describe('lastResult', () => {
  it('is null before the first move', () => {
    expect(moon().lastResult).toBeNull();
    expect(getAstronautView(moon()).lastResult).toBeNull();
  });

  it('says what the move did and how much radiation got through', () => {
    const s = applyMove(moon(), 'raiseShield'); // wave 1 sends 5, the shield lets 30% through
    expect(s.lastResult).toEqual({ turn: 1, move: 'raiseShield', radiation: 2, shieldFailed: false, dust: false, powerOut: false });
    const science = applyMove(moon(), 'doScience');
    expect(science.lastResult).toMatchObject({ move: 'doScience', radiation: 5 });
  });

  it('marks a shield with no power', () => {
    const low = { ...moon(), meters: { ...moon().meters, power: 10 } };
    expect(applyMove(low, 'raiseShield').lastResult).toMatchObject({ shieldFailed: true, radiation: 5, powerOut: true });
  });

  it('marks the Mars dust wave when saving power', () => {
    expect(applyMove(mars(), 'savePower').lastResult.dust).toBe(true);
    expect(applyMove(moon(), 'savePower').lastResult.dust).toBe(false);
  });

  it('only the Astronaut sees it', () => {
    const s = applyMove(moon(), 'shelter');
    expect(getAstronautView(s).lastResult).toEqual(s.lastResult);
    expect(getMissionControlView(s)).not.toHaveProperty('lastResult');
  });
});

describe('lastWarningCheck', () => {
  it('compares the warning sent with Commander Sola\'s pick for the same wave', () => {
    // Moon wave 1: 5 radiation is coming, so Sola would say "Storm coming"
    const s = applyMove(sendWarning(moon(), 'allClear'), 'shelter');
    expect(s.lastWarningCheck).toEqual({ turn: 1, sent: 'allClear', best: 'stormComing', delayTurns: 0 });
    // Moon wave 2: the peak, so "Shelter now"
    const peak = applyMove(sendWarning(s, 'shelterNow'), 'shelter');
    expect(peak.lastWarningCheck).toMatchObject({ turn: 2, sent: 'shelterNow', best: 'shelterNow' });
  });

  it('records no warning sent as null', () => {
    expect(applyMove(moon(), 'shelter').lastWarningCheck).toMatchObject({ sent: null, best: 'stormComing' });
  });

  it('on Mars, judges the warning by the wave it arrives in (the next one)', () => {
    const s = applyMove(sendWarning(mars(), 'stormComing'), 'raiseShield');
    expect(s.lastWarningCheck).toEqual({ turn: 1, sent: 'stormComing', best: 'shelterNow', delayTurns: 1 });
  });

  it('skips the Mars blackout wave and Play alone', () => {
    let s = mars();
    s = applyMove(s, 'raiseShield');
    s = applyMove(s, 'raiseShield'); // now wave 3: the Sun blocks the signal
    expect(applyMove(s, 'shelter').lastWarningCheck).toBeNull();
    expect(applyMove(moon({ solo: true }), 'shelter').lastWarningCheck).toBeNull();
  });

  it('only Mission Control sees it', () => {
    const s = applyMove(sendWarning(moon(), 'stormComing'), 'shelter');
    expect(getMissionControlView(s).lastWarningCheck).toEqual(s.lastWarningCheck);
    expect(getAstronautView(s)).not.toHaveProperty('lastWarningCheck');
  });
});
