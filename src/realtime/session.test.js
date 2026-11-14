import { describe, it, expect } from 'vitest';
import { MOVES, WARNINGS } from '../shared/contract.js';
import * as engine from './fakeEngine.js';
import { createHostSession, createGuestSession, splitReducer } from './session.js';

// Two linked fake rooms. Messages only arrive while both sides are connected, like the real thing.
function memoryRooms() {
  const side = () => ({ events: new Map(), presence: new Set(), status: new Set(), connected: false });
  const host = side();
  const guest = side();
  const otherOf = (me) => (me === host ? guest : host);
  const room = (me) => ({
    send(event, payload = {}) {
      const other = otherOf(me);
      if (!me.connected || !other.connected) return false;
      (other.events.get(event) ?? new Set()).forEach((cb) => cb(structuredClone(payload)));
      return true;
    },
    on(event, cb) {
      if (!me.events.has(event)) me.events.set(event, new Set());
      me.events.get(event).add(cb);
      return () => me.events.get(event).delete(cb);
    },
    onPresence(cb) {
      me.presence.add(cb);
      return () => me.presence.delete(cb);
    },
    onStatus(cb) {
      me.status.add(cb);
      return () => me.status.delete(cb);
    },
  });
  const syncPresence = () => {
    const both = host.connected && guest.connected;
    [host, guest].forEach((s) => s.connected && s.presence.forEach((cb) => cb({ partnerConnected: both, full: false })));
  };
  const join = (s) => {
    s.connected = true;
    s.status.forEach((cb) => cb('SUBSCRIBED'));
    syncPresence();
  };
  const leave = (s) => {
    s.connected = false;
    syncPresence();
  };
  return { hostRoom: room(host), guestRoom: room(guest), host, guest, join, leave };
}

function setup({ world = 'moon', restored = null } = {}) {
  const net = memoryRooms();
  const saved = [];
  const host = createHostSession({
    room: net.hostRoom,
    engine,
    world,
    restored,
    onChange: (s) => saved.push(s),
  });
  const guest = createGuestSession({ room: net.guestRoom });
  return { net, host, guest, saved };
}

describe('online session (host = Astronaut, guest = Mission Control)', () => {
  it('waits in the lobby until Mission Control joins, then both see the same new game', () => {
    const { net, host, guest } = setup();
    net.join(net.host);
    expect(host.getState().status).toBe('lobby');

    net.join(net.guest);
    expect(host.getState().status).toBe('playing');
    expect(host.getState().mode).toBe('online');
    expect(guest.getState()).toEqual(host.getState());
  });

  it('passes the chosen world to the engine', () => {
    const { net, host, guest } = setup({ world: 'mars' });
    net.join(net.host);
    net.join(net.guest);
    expect(host.getState().world).toBe('mars');
    expect(guest.getState().world).toBe('mars');
  });

  it("a warning from Mission Control reaches the Astronaut's inbox", () => {
    const { net, host, guest } = setup();
    net.join(net.host);
    net.join(net.guest);
    guest.sendWarning('stormComing');
    expect(host.getState().inbox).toEqual([{ turn: 0, warning: 'stormComing' }]);
    expect(guest.getState()).toEqual(host.getState());
  });

  it("the Astronaut's move updates Mission Control's screen", () => {
    const { net, host, guest } = setup();
    net.join(net.host);
    net.join(net.guest);
    host.sendMove('raiseShield');
    expect(host.getState().turn).toBe(1);
    expect(guest.getState().lastMove).toBe('raiseShield');
    expect(guest.getState()).toEqual(host.getState());
  });

  it('ignores a warning sent for an old turn', () => {
    const { net, host } = setup();
    net.join(net.host);
    net.join(net.guest);
    host.sendMove('savePower'); // now turn 1
    net.guestRoom.send('sendWarning', { turn: 0, warning: 'shelterNow' });
    expect(host.getState().inbox).toEqual([]);
  });

  it('ignores moves and warnings that are not in the contract', () => {
    const { net, host } = setup();
    net.join(net.host);
    net.join(net.guest);
    const before = host.getState();
    host.sendMove('flyHome');
    net.guestRoom.send('sendWarning', { turn: 0, warning: 'party' });
    net.guestRoom.send('sendWarning', {});
    expect(host.getState()).toBe(before);
  });

  it('plays a full 6-turn game in sync, and nothing changes after the end', () => {
    const { net, host, guest } = setup();
    net.join(net.host);
    net.join(net.guest);
    for (let i = 0; i < 6; i++) {
      guest.sendWarning(WARNINGS[i % WARNINGS.length]);
      host.sendMove(MOVES[i % MOVES.length]);
    }
    const end = host.getState();
    expect(['won', 'lost']).toContain(end.status);
    expect(guest.getState()).toEqual(end);

    host.sendMove('shelter');
    guest.sendWarning('allClear');
    expect(host.getState()).toBe(end);
  });

  it('keeps the game when Mission Control drops out, and catches them up when they come back', () => {
    const { net, host, guest } = setup();
    net.join(net.host);
    net.join(net.guest);
    host.sendMove('shelter');

    net.leave(net.guest);
    host.sendMove('raiseShield'); // guest misses this one
    expect(host.getState().turn).toBe(2);
    expect(guest.getState().turn).toBe(1);

    net.join(net.guest); // reconnect: guest asks with requestState and gets the latest
    expect(guest.getState()).toEqual(host.getState());
  });

  it('a restored host continues the saved game instead of starting over', () => {
    const first = setup();
    first.net.join(first.net.host);
    first.net.join(first.net.guest);
    first.host.sendMove('shelter');
    first.host.sendMove('raiseShield');
    const saved = first.saved.at(-1);

    const second = setup({ restored: saved });
    second.net.join(second.net.host);
    second.net.join(second.net.guest);
    expect(second.host.getState()).toEqual(saved);
    expect(second.guest.getState().turn).toBe(2);
  });

  it('the guest takes a new game from the host even if its turn is lower', () => {
    const { net, host, guest } = setup();
    net.join(net.host);
    net.join(net.guest);
    host.sendMove('shelter');
    host.sendMove('shelter');
    expect(guest.getState().turn).toBe(2);

    // The host's tab starts fresh (no saved game) in the same room.
    const freshHost = createHostSession({ room: net.hostRoom, engine });
    host.close();
    net.leave(net.host);
    net.join(net.host);
    expect(freshHost.getState().turn).toBe(0);
    expect(guest.getState()).toEqual(freshHost.getState());
  });

  it('reports every change to onChange so the host can save it', () => {
    const { net, host, saved } = setup();
    net.join(net.host);
    net.join(net.guest);
    host.sendMove('doScience');
    expect(saved.at(-1)).toEqual(host.getState());
  });
});

describe('split mode reducer', () => {
  const reduce = splitReducer(engine);
  const start = () => engine.createGame({ mode: 'split' });

  it('applies moves and warnings through the engine', () => {
    let s = reduce(start(), { type: 'warning', warning: 'shelterNow' });
    expect(s.inbox).toEqual([{ turn: 0, warning: 'shelterNow' }]);
    s = reduce(s, { type: 'move', move: 'shelter' });
    expect(s.turn).toBe(1);
    expect(s.lastMove).toBe('shelter');
  });

  it('ignores unknown actions and anything after the game ends', () => {
    const s = start();
    expect(reduce(s, { type: 'move', move: 'flyHome' })).toBe(s);
    expect(reduce(s, { type: 'dance' })).toBe(s);
    const over = { ...s, status: 'won' };
    expect(reduce(over, { type: 'move', move: 'shelter' })).toBe(over);
  });
});

describe('fake engine (placeholder for Dev 1)', () => {
  it('Mars warnings arrive one turn late', () => {
    let s = engine.createGame({ mode: 'split', world: 'mars' });
    s = engine.sendWarning(s, 'stormComing');
    expect(s.inbox).toEqual([]);
    s = engine.applyMove(s, 'savePower');
    expect(s.inbox).toEqual([{ turn: 1, warning: 'stormComing' }]);
    expect(s.outbox).toEqual([]);
  });
});
