import { describe, it, expect, vi, afterEach } from 'vitest';
import { initialState, MOVES, WARNINGS } from '../shared/contract.js';
import { LEVELS } from '../engine/balance.js'; // read-only: Dev 1's numbers, so this test never hard-codes them
import * as engine from './fakeEngine.js';
import * as realEngine from './engineAdapter.js';
import { createHostSession, createGuestSession, splitReducer } from './session.js';

// Two linked fake rooms. Messages only arrive while both sides are connected, like the real thing.
// drop(side, event) makes the next `event` that side sends get lost on the way (Supabase can do that).
function memoryRooms() {
  const side = () => ({ events: new Map(), presence: new Set(), status: new Set(), connected: false, lose: new Set(), sent: [] });
  const host = side();
  const guest = side();
  const otherOf = (me) => (me === host ? guest : host);
  const room = (me) => ({
    send(event, payload = {}) {
      const other = otherOf(me);
      if (!me.connected || !other.connected) return false;
      me.sent.push(event);
      if (me.lose.delete(event)) return true; // sent, but lost on the way
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
  const drop = (s, event) => s.lose.add(event);
  return { hostRoom: room(host), guestRoom: room(guest), host, guest, join, leave, drop };
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
  const guest = createGuestSession({ room: net.guestRoom, resyncEveryMs: 0 });
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

describe('healing a lost stateUpdate (Mission Control stuck on an old turn)', () => {
  afterEach(() => vi.useRealTimers());

  const started = (resyncEveryMs) => {
    const net = memoryRooms();
    const host = createHostSession({ room: net.hostRoom, engine });
    const changes = [];
    const guest = createGuestSession({ room: net.guestRoom, resyncEveryMs, onChange: (s) => changes.push(s) });
    net.join(net.host);
    net.join(net.guest);
    return { net, host, guest, changes };
  };

  it('a lost update is fixed by the next resync, within 3 seconds', () => {
    vi.useFakeTimers();
    const { net, host, guest } = started(3000);
    net.drop(net.host, 'stateUpdate');
    host.sendMove('shelter'); // this update is lost
    expect(host.getState().turn).toBe(1);
    expect(guest.getState().turn).toBe(0);

    vi.advanceTimersByTime(3000);
    expect(guest.getState()).toEqual(host.getState());
    guest.close();
  });

  it('a warning from an old turn makes the host send its state again right away', () => {
    const { net, host, guest } = started(0);
    net.drop(net.host, 'stateUpdate');
    host.sendMove('shelter'); // lost: guest still thinks it is turn 0
    guest.sendWarning('shelterNow'); // tagged turn 0, host is on turn 1
    expect(host.getState().inbox).toEqual([]); // refused, as the contract says
    expect(guest.getState()).toEqual(host.getState()); // but the guest caught up at once

    guest.sendWarning('shelterNow'); // the kid taps again, now on the right turn
    expect(host.getState().inbox).toEqual([{ turn: 1, warning: 'shelterNow' }]);
  });

  it('resync replies that change nothing do not cause a re-render', () => {
    vi.useFakeTimers();
    const { guest, changes } = started(3000);
    const before = changes.length;
    vi.advanceTimersByTime(3000 * 5);
    expect(changes.length).toBe(before);
    guest.close();
  });

  it('resync() asks right away; after close() the timer sends nothing', () => {
    vi.useFakeTimers();
    const { net, guest } = started(3000);
    const asked = () => net.guest.sent.filter((e) => e === 'requestState').length;
    const n = asked();
    guest.resync();
    expect(asked()).toBe(n + 1);
    guest.close();
    vi.advanceTimersByTime(3000 * 5);
    expect(asked()).toBe(n + 1);
  });
});

describe('with the real engine (engineAdapter.js)', () => {
  for (const world of ['moon', 'mars']) {
    it(`plays a full ${world} game in sync and stops at the end`, () => {
      const net = memoryRooms();
      const host = createHostSession({ room: net.hostRoom, engine: realEngine, world });
      const guest = createGuestSession({ room: net.guestRoom, resyncEveryMs: 0 });
      net.join(net.host);
      net.join(net.guest);
      expect(host.getState().status).toBe('playing');
      expect(host.getState().world).toBe(world);

      for (let i = 0; i < 6 && host.getState().status === 'playing'; i++) {
        guest.sendWarning('shelterNow');
        expect(guest.getState()).toEqual(host.getState());
        host.sendMove('shelter');
        expect(guest.getState()).toEqual(host.getState());
      }
      expect(['won', 'lost']).toContain(host.getState().status);
      expect(host.getState().inbox.length).toBeGreaterThan(0);
    });
  }
});

describe('restart (replay, and "Fly to Mars")', () => {
  const online = ({ world = 'moon', moonStars = 0, restored = null } = {}) => {
    const net = memoryRooms();
    const host = createHostSession({ room: net.hostRoom, engine: realEngine, world, moonStars, restored });
    const guest = createGuestSession({ room: net.guestRoom, resyncEveryMs: 0 });
    return { net, host, guest };
  };
  const playOut = (host) => {
    for (let i = 0; i < 6 && host.getState().status === 'playing'; i++) host.sendMove('shelter');
  };

  it('online: after the Moon, the host flies to Mars in the same room and Mission Control follows', () => {
    const { net, host, guest } = online();
    net.join(net.host);
    net.join(net.guest);
    playOut(host);
    const moonEnd = host.getState();
    expect(['won', 'lost']).toContain(moonEnd.status);

    host.restart({ world: 'mars', moonStars: 2 });
    expect(host.getState()).toEqual(
      realEngine.createGame({ mode: 'online', world: 'mars', stormId: moonEnd.stormId, moonStars: 2 }),
    );
    expect(guest.getState().world).toBe('mars');
    expect(guest.getState().turn).toBe(0);
    expect(guest.getState().status).toBe('playing');
    expect(guest.getState()).toEqual(host.getState());
  });

  it('online: a warning left over from the old game is ignored after restart', () => {
    const { net, host } = online();
    net.join(net.host);
    net.join(net.guest);
    for (let i = 0; i < 3; i++) host.sendMove('shelter'); // now turn 3
    host.restart({ world: 'mars', moonStars: 1 });
    net.guestRoom.send('sendWarning', { turn: 3, warning: 'shelterNow' }); // sent before the restart arrived
    expect(host.getState().inbox).toEqual([]);
    expect(host.getState().outbox).toEqual([]);
  });

  it('online: Moon stars give the Mars base extra power (real engine)', () => {
    const marsPower = (moonStars) => {
      const { net, host } = online();
      net.join(net.host);
      net.join(net.guest);
      host.restart({ world: 'mars', moonStars });
      return host.getState().meters.power;
    };
    const { powerPenalty, powerPerStar } = LEVELS.mars;
    expect(marsPower(0)).toBe(initialState.meters.power - powerPenalty);
    expect(marsPower(2)).toBe(initialState.meters.power - powerPenalty + 2 * powerPerStar);
  });

  it('online: restart() replays the same level from turn 0', () => {
    const { net, host, guest } = online({ world: 'mars', moonStars: 1 });
    net.join(net.host);
    net.join(net.guest);
    host.sendMove('savePower');
    host.sendMove('shelter');

    host.restart();
    expect(host.getState().turn).toBe(0);
    expect(host.getState().status).toBe('playing');
    expect(host.getState().world).toBe('mars');
    expect(host.getState().moonStars).toBe(1);
    expect(guest.getState()).toEqual(host.getState());
  });

  it('online: restart in the lobby picks the level, and the game starts when Mission Control joins', () => {
    const { net, host, guest } = online();
    net.join(net.host);
    host.restart({ world: 'mars', moonStars: 3 });
    expect(host.getState().status).toBe('lobby');
    expect(host.getState().world).toBe('mars');

    net.join(net.guest);
    expect(host.getState().status).toBe('playing');
    expect(host.getState().world).toBe('mars');
    expect(host.getState().moonStars).toBe(3);
    expect(guest.getState()).toEqual(host.getState());
  });

  it('a restored host replays the level it was on, not the one it was created with', () => {
    const first = online({ world: 'mars', moonStars: 2 });
    first.net.join(first.net.host);
    first.net.join(first.net.guest);
    first.host.sendMove('shelter');

    const second = online({ world: 'moon', restored: first.host.getState() });
    second.net.join(second.net.host);
    second.net.join(second.net.guest);
    second.host.restart();
    expect(second.host.getState().world).toBe('mars');
    expect(second.host.getState().moonStars).toBe(2);
    expect(second.host.getState().turn).toBe(0);
  });

  it('ignores bad options: unknown world, out-of-range stars, a click event', () => {
    const { net, host } = online();
    net.join(net.host);
    net.join(net.guest);
    host.restart({ world: 'jupiter', moonStars: 9 });
    expect(host.getState().world).toBe('moon');
    expect(host.getState().moonStars).toBe(3);

    host.restart({ type: 'click', target: {} }); // what onClick={restart} passes
    expect(host.getState().world).toBe('moon');
    expect(host.getState().moonStars).toBe(3);
  });

  it('split: restart works after the game ends, and can switch to Mars', () => {
    const reduce = splitReducer(realEngine);
    let s = realEngine.createGame({ mode: 'split' });
    for (let i = 0; i < 6 && s.status === 'playing'; i++) s = reduce(s, { type: 'move', move: 'shelter' });
    expect(['won', 'lost']).toContain(s.status);

    const again = reduce(s, { type: 'restart' });
    expect(again).toEqual(realEngine.createGame({ mode: 'split', stormId: s.stormId }));

    const mars = reduce(s, { type: 'restart', options: { world: 'mars', moonStars: 3 } });
    expect(mars).toEqual(realEngine.createGame({ mode: 'split', world: 'mars', stormId: s.stormId, moonStars: 3 }));
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
