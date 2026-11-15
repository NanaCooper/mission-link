import { describe, it, expect } from 'vitest';
import { ROLES, initialState, MOVES, WARNINGS, WORLDS, WAVES } from './contract.js';

describe('shared contract', () => {
  it('has the two roles', () => {
    expect(ROLES).toEqual({ ASTRONAUT: 'astronaut', MISSION_CONTROL: 'missionControl' });
  });

  it('has exactly the 4 Astronaut moves', () => {
    expect(MOVES).toEqual(['raiseShield', 'shelter', 'savePower', 'doScience']);
  });

  it('has exactly the 4 Mission Control warnings', () => {
    expect(WARNINGS).toEqual(['stormComing', 'shelterNow', 'savePower', 'allClear']);
  });

  it('starts in the lobby with a 3-wave game and full meters', () => {
    expect(initialState.status).toBe('lobby');
    expect(initialState.maxTurns).toBe(3);
    expect(WAVES).toHaveLength(initialState.maxTurns);
    expect(initialState.meters).toEqual({
      power: 100,
      oxygen: 100,
      radiationDose: 0,
      crewHealth: 100
    });
  });

  it('has every field the docs promise', () => {
    expect(Object.keys(initialState).sort()).toEqual(
      [
        'status', 'mode', 'world', 'turn', 'maxTurns', 'meters', 'science',
        'stormId', 'storm', 'solo', 'stormStage', 'inbox', 'outbox', 'lastMove', 'lastResult', 'lastWarningCheck', 'log',
        'lostReason', 'stars', 'moonStars', 'signalSecondsLeft'
      ].sort()
    );
  });

  it('has the two worlds, Moon first', () => {
    expect(WORLDS).toEqual(['moon', 'mars']);
    expect(initialState.world).toBe('moon');
    expect(initialState.moonStars).toBe(0);
  });
});
