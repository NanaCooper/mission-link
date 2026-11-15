import { describe, it, expect } from 'vitest';
import * as engine from './engineAdapter.js';
import { createGuestSession, createHostSession, splitReducer } from './session.js';

// Two players: each wave is one warning from Mission Control, then one move from the Astronaut.
// The Astronaut cannot play on into the next waves alone. Play alone never waits.
const moon = (extra = {}) => engine.createGame({ mode: 'split', world: 'moon', stormId: 'storm-2024-05-11', ...extra });
const waiting = (s) => engine.getAstronautView(s).waitingForMissionControl;

describe('the Astronaut waits for Mission Control', () => {
  it('waits at the start of every wave until a warning is sent', () => {
    let s = moon();
    expect(waiting(s)).toBe(true);
    s = engine.sendWarning(s, 'stormComing');
    expect(waiting(s)).toBe(false);
    s = engine.applyMove(s, 'raiseShield');
    expect(waiting(s)).toBe(true); // wave 2: a new warning first
  });

  it('on Mars a sent warning counts even though it arrives next wave, and the blackout never makes anyone wait', () => {
    let s = engine.createGame({ mode: 'split', world: 'mars', stormId: 'storm-2024-05-11' });
    s = engine.sendWarning(s, 'shelterNow');
    expect(waiting(s)).toBe(false);
    expect(engine.getAstronautView(s).inbox).toHaveLength(0); // still on its way
    s = engine.applyMove(engine.sendWarning(engine.applyMove(s, 'raiseShield'), 'stormComing'), 'shelter');
    expect(engine.getMissionControlView(s).stage.blackout).toBe(true);
    expect(waiting(s)).toBe(false);
  });

  it('never waits in Play alone or after the game', () => {
    expect(waiting(moon({ solo: true }))).toBe(false);
    expect(waiting({ ...moon(), status: 'won' })).toBe(false);
  });

  it('one device: a move before the warning is ignored', () => {
    const reduce = splitReducer(engine);
    const start = moon();
    expect(reduce(start, { type: 'move', move: 'raiseShield' })).toBe(start);
    const warned = reduce(start, { type: 'warning', warning: 'stormComing' });
    const moved = reduce(warned, { type: 'move', move: 'raiseShield' });
    expect(moved.turn).toBe(1);
    // A second move straight away is ignored too: back to Mission Control first
    expect(reduce(moved, { type: 'move', move: 'raiseShield' })).toBe(moved);
  });

  it('online: the host ignores a move until Mission Control has warned', () => {
    const handlers = { host: {}, guest: {} };
    const presence = { host: [], guest: [] };
    const room = (me, other) => ({
      send: (event, payload) => handlers[other][event]?.(payload),
      on: (event, fn) => {
        handlers[me][event] = fn;
        return () => {};
      },
      onPresence: (fn) => {
        presence[me].push(fn);
        return () => {};
      },
      onStatus: () => () => {},
    });
    const host = createHostSession({ room: room('host', 'guest'), engine, world: 'moon', stormId: 'storm-2024-05-11' });
    const guest = createGuestSession({ room: room('guest', 'host'), resyncEveryMs: 0 });
    presence.host.forEach((fn) => fn({ partnerConnected: true }));
    presence.guest.forEach((fn) => fn({ partnerConnected: true }));
    expect(host.getState().status).toBe('playing');

    host.sendMove('shelter');
    expect(host.getState().turn).toBe(0);
    guest.sendWarning('shelterNow');
    host.sendMove('shelter');
    expect(host.getState().turn).toBe(1);
    host.sendMove('shelter');
    expect(host.getState().turn).toBe(1);
    guest.close();
    host.close();
  });

  it('Play alone plays straight on', () => {
    const reduce = splitReducer(engine);
    let s = moon({ solo: true });
    for (let i = 0; i < 3; i++) s = reduce(s, { type: 'move', move: 'shelter' });
    expect(s.status).not.toBe('playing');
  });
});
