import { describe, it, expect } from 'vitest';
import { NO_PROGRESS, gameBanner, loadProgress, pickGameScreen, progressAfter, saveProgress } from './appFlow.js';

const playing = { status: 'playing', lastMove: null };

describe('pickGameScreen', () => {
  it('shows the lobby before the game arrives', () => {
    expect(pickGameScreen({ mode: 'online', role: 'missionControl', state: { status: 'lobby' } })).toBe('lobby');
  });

  it('keeps the online Astronaut in the lobby until Mission Control joins', () => {
    expect(pickGameScreen({ mode: 'online', role: 'astronaut', state: playing, partnerConnected: false })).toBe('lobby');
    expect(pickGameScreen({ mode: 'online', role: 'astronaut', state: playing, partnerConnected: true })).toBe('game');
  });

  it('does not send the Astronaut back to the lobby mid-game', () => {
    const midGame = { status: 'playing', lastMove: 'shelter' };
    expect(pickGameScreen({ mode: 'online', role: 'astronaut', state: midGame, partnerConnected: false })).toBe('game');
  });

  it('plays split mode straight away and ends on won or lost', () => {
    expect(pickGameScreen({ mode: 'split', role: 'astronaut', state: playing, partnerConnected: true })).toBe('game');
    expect(pickGameScreen({ mode: 'split', state: { status: 'won' } })).toBe('end');
    expect(pickGameScreen({ mode: 'online', state: { status: 'lost' } })).toBe('end');
  });
});

describe('gameBanner', () => {
  it('only shows online, outside the lobby', () => {
    expect(gameBanner({ mode: 'split', screen: 'game', partnerConnected: false })).toBeNull();
    expect(gameBanner({ mode: 'online', screen: 'lobby', partnerConnected: false })).toBeNull();
    expect(gameBanner({ mode: 'online', screen: 'game', partnerConnected: true })).toBeNull();
  });

  it('says the partner is missing, or shows the session error', () => {
    expect(gameBanner({ mode: 'online', screen: 'game', partnerConnected: false })).toBe('Waiting for your partner...');
    expect(gameBanner({ mode: 'online', screen: 'end', partnerConnected: true, error: 'Oops.' })).toBe('Oops.');
  });
});

describe('progress', () => {
  const memory = () => {
    const data = {};
    return { getItem: (k) => data[k] ?? null, setItem: (k, v) => (data[k] = v) };
  };

  it('round-trips through storage and survives broken storage', () => {
    const storage = memory();
    expect(loadProgress(storage)).toEqual(NO_PROGRESS);
    saveProgress({ marsUnlocked: true, moonStars: 2 }, storage);
    expect(loadProgress(storage)).toEqual({ marsUnlocked: true, moonStars: 2 });

    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(loadProgress(broken)).toEqual(NO_PROGRESS);
    expect(() => saveProgress(NO_PROGRESS, broken)).not.toThrow();
    expect(loadProgress({ getItem: () => '{"marsUnlocked":true,"moonStars":9}' })).toEqual({ marsUnlocked: true, moonStars: 3 });
  });

  it('unlocks Mars on a Moon win and keeps the best stars', () => {
    const after = progressAfter(NO_PROGRESS, { status: 'won', world: 'moon', stars: 2 });
    expect(after).toEqual({ marsUnlocked: true, moonStars: 2 });
    expect(progressAfter(after, { status: 'won', world: 'moon', stars: 1 })).toBe(after);
    expect(progressAfter(after, { status: 'lost', world: 'moon', stars: 0 })).toBe(after);
    expect(progressAfter(after, { status: 'won', world: 'mars', stars: 3 })).toBe(after);
  });
});
