import { describe, it, expect } from 'vitest';
import { roomScreen } from './roomScreen.js';
import { createGame, sendWarning, applyMove, getMissionControlView } from '../../../realtime/engineAdapter.js';
import { MOVES } from '../../../shared/contract.js';
import { ICONS } from '../../components/pixel/sprites.js';

// Plays a whole level, sending a warning and making a move each wave, and returns the screen on each wave
function playLevel(world) {
  let state = createGame({ mode: 'split', world, moonStars: 3 });
  const screens = [];
  while (state.status === 'playing') {
    screens.push(roomScreen(getMissionControlView(state)));
    state = applyMove(sendWarning(state, 'shelterNow'), 'shelter');
  }
  return screens;
}

describe('roomScreen: the big wall screen', () => {
  it('on the Moon: the flare, then the particles arrive, then the storm fades', () => {
    const screens = playLevel('moon');
    expect(screens.map((s) => s.now.look)).toEqual(['flare', 'peak', 'fading']);
    expect(screens.map((s) => s.next)).toEqual(['peak', 'fading', null]);
    for (const s of screens) expect(s.now).toMatchObject({ world: 'moon', dust: false, blackout: false, delayTurns: 0 });
  });

  it('on Mars: dust on the first wave and the blackout on the last', () => {
    const screens = playLevel('mars');
    expect(screens.map((s) => s.now.look)).toEqual(['flare', 'peak', 'fading']);
    expect(screens.map((s) => s.now.dust)).toEqual([true, false, false]);
    expect(screens.map((s) => s.now.blackout)).toEqual([false, false, true]);
    for (const s of screens) expect(s.now).toMatchObject({ world: 'mars', delayTurns: 1 });
  });

  it('has no next picture on the last wave (forecast is null)', () => {
    const view = { ...getMissionControlView(createGame({ mode: 'split', world: 'moon' })), forecast: null };
    expect(roomScreen(view).next).toBeNull();
  });
});

describe('roomScreen: the crew monitor', () => {
  it("shows no move before Nova's first move", () => {
    const view = getMissionControlView(createGame({ mode: 'split', world: 'moon' }));
    expect(roomScreen(view).crew).toEqual({ icon: null, health: 100 });
  });

  it("shows Nova's last move as an icon, and crew health", () => {
    for (const move of MOVES) {
      const state = applyMove(sendWarning(createGame({ mode: 'split', world: 'moon' }), 'stormComing'), move);
      const { crew } = roomScreen(getMissionControlView(state));
      expect(ICONS[crew.icon], move).toBeTruthy();
      expect(crew.health).toBe(state.meters.crewHealth);
    }
  });

  it('keeps health between 0 and 100', () => {
    const view = getMissionControlView(createGame({ mode: 'split', world: 'moon' }));
    expect(roomScreen({ ...view, crewHealth: 140 }).crew.health).toBe(100);
    expect(roomScreen({ ...view, crewHealth: -5 }).crew.health).toBe(0);
  });
});
