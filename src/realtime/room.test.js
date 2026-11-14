import { describe, it, expect } from 'vitest';
import { ROLES } from '../shared/contract.js';
import { createRoom, joinRoom, makeRoomCode, readPresence } from './room.js';
import * as adapter from './engineAdapter.js';

const A = ROLES.ASTRONAUT;
const MC = ROLES.MISSION_CONTROL;
const meta = (role, joinedAt) => [{ role, joinedAt, presence_ref: 'x' }];

describe('room codes', () => {
  it('look like MOON-4821', () => {
    expect(makeRoomCode()).toMatch(/^MOON-\d{4}$/);
    expect(makeRoomCode(() => 0.4821)).toBe('MOON-5338');
    expect(createRoom).toBe(makeRoomCode);
    expect(createRoom()).toMatch(/^MOON-\d{4}$/);
    expect(createRoom(() => 0)).toBe('MOON-1000');
    expect(createRoom(() => 0.9999)).toBe('MOON-9999');
  });

  it('accept sloppy typing', () => {
    expect(joinRoom('MOON-4821')).toBe('MOON-4821');
    expect(joinRoom('moon 4821')).toBe('MOON-4821');
    expect(joinRoom(' 4821 ')).toBe('MOON-4821');
  });

  it('reject codes that are not 4 digits', () => {
    expect(joinRoom('48')).toBeNull();
    expect(joinRoom('482100')).toBeNull();
    expect(joinRoom('')).toBeNull();
    expect(joinRoom(undefined)).toBeNull();
  });
});

describe('engineAdapter (what screens import)', () => {
  it('has every engine function from docs/CONTRACT.md', () => {
    for (const name of ['createGame', 'sendWarning', 'applyMove', 'getAstronautView', 'getMissionControlView', 'getStorm']) {
      expect(typeof adapter[name]).toBe('function');
    }
  });
});

describe('readPresence', () => {
  it('alone in the room: no partner, not full', () => {
    const state = { 'a:1': meta(A, 100) };
    expect(readPresence(state, 'a:1', A)).toEqual({ partnerConnected: false, full: false });
  });

  it('before my own presence arrives: still not full', () => {
    expect(readPresence({}, 'a:1', A)).toEqual({ partnerConnected: false, full: false });
  });

  it('both players here: each sees the partner', () => {
    const state = { 'a:1': meta(A, 100), 'mc:2': meta(MC, 200) };
    expect(readPresence(state, 'a:1', A)).toEqual({ partnerConnected: true, full: false });
    expect(readPresence(state, 'mc:2', MC)).toEqual({ partnerConnected: true, full: false });
  });

  it('a third player who joined last sees the room is full', () => {
    const state = { 'a:1': meta(A, 100), 'mc:2': meta(MC, 200), 'mc:3': meta(MC, 300) };
    expect(readPresence(state, 'mc:3', MC).full).toBe(true);
    expect(readPresence(state, 'mc:2', MC).full).toBe(false);
  });

  it('a third player sees full even before their own presence arrives', () => {
    const state = { 'a:1': meta(A, 100), 'mc:2': meta(MC, 200) };
    expect(readPresence(state, 'mc:3', MC).full).toBe(true);
  });

  it('two people joining at the same moment: the key decides, the same way on both devices', () => {
    const state = { 'mc:b': meta(MC, 200), 'mc:a': meta(MC, 200) };
    expect(readPresence(state, 'mc:a', MC).full).toBe(false);
    expect(readPresence(state, 'mc:b', MC).full).toBe(true);
  });

  it('a reconnecting tab with two entries under one key counts once, at its earliest time', () => {
    const state = {
      'mc:2': [{ role: MC, joinedAt: 500 }, { role: MC, joinedAt: 150 }],
      'mc:3': meta(MC, 300),
    };
    expect(readPresence(state, 'mc:2', MC).full).toBe(false);
    expect(readPresence(state, 'mc:3', MC).full).toBe(true);
  });

  it('ignores presence entries with no known role', () => {
    const state = { junk: [{}], 'a:1': meta(A, 100) };
    expect(readPresence(state, 'mc:2', MC)).toEqual({ partnerConnected: true, full: false });
  });
});
