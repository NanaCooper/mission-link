// Rooms for online play: Supabase Realtime broadcast + presence. No database tables.
// Channel name: room:<CODE>. Codes look like MOON-4821.
// Host = Astronaut (runs the engine). Guest = Mission Control (never runs the engine).
// One room per browser tab.

import { ROLES } from '../shared/contract.js';
import { getSupabase } from './supabaseClient.js';

const CODE_PREFIX = 'MOON-';

/** Events a room carries. The first three are from docs/CONTRACT.md. 'ping' is only for the dev test page. */
export const EVENTS = ['requestState', 'stateUpdate', 'sendWarning', 'ping'];

/** A new room code like MOON-4821. The Astronaut's Lobby screen shows it. (Name from docs/CONTRACT.md.) */
export function makeRoomCode(random = Math.random) {
  return CODE_PREFIX + String(1000 + Math.floor(random() * 9000));
}

/** Same as makeRoomCode(). Kept so older code keeps working. */
export const createRoom = makeRoomCode;

/**
 * Clean up what a player typed: "4821", "moon 4821" and "MOON-4821" all give "MOON-4821".
 * Returns null if it is not exactly 4 digits, so the screen can say the code looks wrong.
 */
export function joinRoom(input) {
  const digits = String(input ?? '').replace(/\D/g, '');
  return digits.length === 4 ? CODE_PREFIX + digits : null;
}

/**
 * Who is in the room, from Supabase's presence state ({ [key]: [{ role, joinedAt }, ...] }).
 * There is one seat per role. The first person (by joinedAt, then key) to take a role keeps it.
 *   full: true if someone else already has my seat (a third player, or a second Astronaut).
 *   partnerConnected: true if someone with the other role is here.
 * Every device sees the same presence data, so they all agree on who got the seat.
 */
export function readPresence(presenceState, myKey, myRole) {
  const people = Object.entries(presenceState ?? {})
    .map(([key, metas]) => ({
      key,
      role: metas?.[0]?.role,
      joinedAt: Math.min(...(metas ?? []).map((m) => Number(m?.joinedAt) || 0)),
    }))
    .filter((p) => p.role === ROLES.ASTRONAUT || p.role === ROLES.MISSION_CONTROL)
    .sort((a, b) => a.joinedAt - b.joinedAt || (a.key < b.key ? -1 : 1));

  const otherRole = myRole === ROLES.ASTRONAUT ? ROLES.MISSION_CONTROL : ROLES.ASTRONAUT;
  const seat = people.find((p) => p.role === myRole);
  return {
    full: Boolean(seat && seat.key !== myKey),
    partnerConnected: people.some((p) => p.role === otherRole),
  };
}

// One id per browser tab. It survives a reload of that tab, so a reload is not mistaken for a third player.
let memoryTabId = null;
const makeId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
function getTabId() {
  try {
    let id = sessionStorage.getItem('missionlink:tab');
    if (!id) {
      id = makeId();
      sessionStorage.setItem('missionlink:tab', id);
    }
    return id;
  } catch {
    memoryTabId ??= makeId();
    return memoryTabId;
  }
}

// topic -> Promise that settles once the old channel for that topic is fully gone.
// Supabase hands back the old channel if one with the same topic still exists, so a quick
// close + reopen (React StrictMode does this) must wait for the close to finish first.
const closing = new Map();

/**
 * Join room:<code> as `role`. Returns right away; the channel connects in the background.
 *   send(event, payload)  broadcast to the other device (returns false if not connected yet)
 *   on(event, cb)         cb(payload) for one of EVENTS; returns an unsubscribe function
 *   onPresence(cb)        cb({ partnerConnected, full }) whenever presence changes
 *   onStatus(cb)          cb('SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED')
 *   close()
 * `tabId` and `client` are only for tests (two players in one process need two clients).
 */
export function openRoom({ code, role, tabId = getTabId(), client = null }) {
  const topic = `room:${code}`;
  const key = `${role}:${tabId}`;
  const joinedAt = Date.now();
  const listeners = new Map(EVENTS.map((event) => [event, new Set()]));
  const presenceListeners = new Set();
  const statusListeners = new Set();
  let channel = null;
  let subscribed = false;
  let closed = false;

  const emit = (set, value) => {
    for (const cb of [...set]) cb(value);
  };
  const add = (set, cb) => {
    set.add(cb);
    return () => set.delete(cb);
  };

  const ready = (closing.get(topic) ?? Promise.resolve())
    .then(async () => {
      if (closed) return;
      const supabase = client ?? getSupabase();
      const stale = supabase.getChannels().find((c) => c.topic === `realtime:${topic}`);
      if (stale) await supabase.removeChannel(stale);
      if (closed) return;

      channel = supabase.channel(topic, {
        config: { broadcast: { self: false }, presence: { key } },
      });
      for (const event of EVENTS) {
        channel.on('broadcast', { event }, (msg) => emit(listeners.get(event), msg?.payload ?? {}));
      }
      channel.on('presence', { event: 'sync' }, () => {
        if (!closed) emit(presenceListeners, readPresence(channel.presenceState(), key, role));
      });
      // Tell the room we are here. track() reports 'timed out' or 'error' instead of throwing,
      // and if it fails the partner never sees us, so keep trying while connected.
      let tracking = false;
      const trackSelf = async () => {
        if (tracking) return;
        tracking = true;
        while (!closed && subscribed) {
          const result = await channel.track({ role, joinedAt }).catch(() => 'error');
          if (result === 'ok') break;
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        tracking = false;
      };
      channel.subscribe((status) => {
        if (closed) return;
        subscribed = status === 'SUBSCRIBED';
        if (subscribed) trackSelf();
        emit(statusListeners, status);
      });
    })
    .catch(() => {
      if (!closed) emit(statusListeners, 'CHANNEL_ERROR');
    });

  return {
    code,
    role,
    key,
    send(event, payload = {}) {
      if (closed || !subscribed || !channel) return false;
      channel.send({ type: 'broadcast', event, payload }).catch(() => {});
      return true;
    },
    on(event, cb) {
      const set = listeners.get(event);
      if (!set) throw new Error(`Unknown room event: ${event}`);
      return add(set, cb);
    },
    onPresence: (cb) => add(presenceListeners, cb),
    onStatus: (cb) => add(statusListeners, cb),
    close() {
      if (closed) return;
      closed = true;
      subscribed = false;
      listeners.forEach((set) => set.clear());
      presenceListeners.clear();
      statusListeners.clear();
      const done = ready
        .then(async () => {
          if (channel) await (client ?? getSupabase()).removeChannel(channel);
        })
        .catch(() => {});
      closing.set(topic, done);
      done.then(() => {
        if (closing.get(topic) === done) closing.delete(topic);
      });
    },
  };
}
