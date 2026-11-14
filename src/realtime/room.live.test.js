// Live check against the real Supabase project. Skipped in a normal `npm test`.
// Run it when online play acts up (PowerShell):
//   $env:LIVE_REALTIME=1; npx vitest run src/realtime/room.live.test.js; Remove-Item Env:LIVE_REALTIME

import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { ROLES } from '../shared/contract.js';
import { createRoom, openRoom } from './room.js';
import * as engine from './engineAdapter.js';
import { createGuestSession, createHostSession } from './session.js';

const url = import.meta.env?.VITE_SUPABASE_URL;
const key = import.meta.env?.VITE_SUPABASE_ANON_KEY;
const live = Boolean(process.env.LIVE_REALTIME && url && key);

// Each player gets its own client, like two separate devices.
const newClient = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

function waitFor(check, what, ms = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(() => {
      if (check()) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - start > ms) {
        clearInterval(timer);
        reject(new Error(`Timed out waiting for: ${what}`));
      }
    }, 50);
  });
}

function player(code, role, tabId) {
  const seen = { status: null, presence: null, pings: [] };
  const room = openRoom({ code, role, tabId, client: newClient() });
  room.onStatus((s) => (seen.status = s));
  room.onPresence((p) => (seen.presence = p));
  room.on('ping', (p) => seen.pings.push(p));
  return { room, seen };
}

describe.skipIf(!live)('live Supabase room', () => {
  it('two players connect, see each other, pass a message both ways; a third is told the room is full', async () => {
    const code = createRoom();
    const host = player(code, ROLES.ASTRONAUT, 'host');
    const guest = player(code, ROLES.MISSION_CONTROL, 'guest');
    try {
      await waitFor(() => host.seen.status === 'SUBSCRIBED' && guest.seen.status === 'SUBSCRIBED', 'both SUBSCRIBED');
      await waitFor(
        () => host.seen.presence?.partnerConnected && guest.seen.presence?.partnerConnected,
        'both see the partner',
      );

      expect(guest.room.send('ping', { from: 'guest' })).toBe(true);
      await waitFor(() => host.seen.pings.length === 1, 'host gets the ping');
      expect(host.room.send('ping', { from: 'host' })).toBe(true);
      await waitFor(() => guest.seen.pings.length === 1, 'guest gets the ping');
      expect(host.seen.pings[0]).toEqual({ from: 'guest' });
      expect(guest.seen.pings[0]).toEqual({ from: 'host' });

      const third = player(code, ROLES.MISSION_CONTROL, 'third');
      try {
        await waitFor(() => third.seen.presence?.full === true, 'third player sees room full');
        expect(guest.seen.presence.full).toBe(false);
        expect(host.seen.presence.full).toBe(false);
      } finally {
        third.room.close();
      }

      guest.room.close();
      await waitFor(() => host.seen.presence?.partnerConnected === false, 'host sees the guest leave');
    } finally {
      host.room.close();
      guest.room.close();
    }
  }, 45000);

  it('plays a whole game over the network: game starts on join, warnings and moves stay in sync', async () => {
    const code = createRoom();
    const hostRoom = openRoom({ code, role: ROLES.ASTRONAUT, tabId: 'host2', client: newClient() });
    const guestRoom = openRoom({ code, role: ROLES.MISSION_CONTROL, tabId: 'guest2', client: newClient() });
    const host = createHostSession({ room: hostRoom, engine });
    const guest = createGuestSession({ room: guestRoom });
    const same = () => JSON.stringify(host.getState()) === JSON.stringify(guest.getState());
    try {
      await waitFor(() => guest.getState().status === 'playing' && same(), 'game starts on both');

      for (let turn = 0; turn < 6 && host.getState().status === 'playing'; turn++) {
        guest.sendWarning('stormComing');
        await waitFor(() => host.getState().inbox.length === turn + 1, `warning ${turn} reaches host`);
        host.sendMove('shelter');
        await waitFor(() => guest.getState().turn === turn + 1 && same(), `move ${turn} reaches guest`);
      }
      expect(['won', 'lost']).toContain(guest.getState().status);
      expect(same()).toBe(true);

      // "Fly to Mars" in the same room: Mission Control follows the host.
      host.restart({ world: 'mars', moonStars: host.getState().stars });
      await waitFor(
        () => guest.getState().world === 'mars' && guest.getState().turn === 0 && same(),
        'guest follows the restart to Mars',
      );
      expect(guest.getState().status).toBe('playing');
    } finally {
      host.close();
      guest.close();
      hostRoom.close();
      guestRoom.close();
    }
  }, 60000);
});
