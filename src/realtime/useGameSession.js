// The ONE hook the screens use (docs/CONTRACT.md):
//   const { state, sendMove, sendWarning, restart, connected, partnerConnected, error } =
//     useGameSession({ mode, role, code, world, moonStars })
//
// mode 'split':  both players on one device. No network. Always works.
// mode 'online': role 'astronaut' is the host (runs the engine), role 'missionControl' is the guest.
// `world` ('moon' | 'mars'), `moonStars` (0-3) and `storm` (a ready-made storm for Level 3: Live Sun,
// or null for the saved one) pick the FIRST level only. After that:
//   restart()                                 replays the same level (same storm)
//   restart({ world: 'mars', moonStars })     starts the next level in the same room ("Fly to Mars")
//   restart({ world, moonStars, storm })      starts a level with a ready-made storm (Level 3)
//   restart({ world: 'mars', storm: null })   goes back to the saved storm
// Changing these props later does nothing; use restart(). In online mode only the host (Astronaut)
// can restart; Mission Control follows the host's state, and the storm travels inside it.
// `stormId` is an optional extra (not in the contract). `state` is never null: before the game
// starts it has status 'lobby'.

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { ROLES } from '../shared/contract.js';
import * as engine from './engineAdapter.js';
import { hasSupabase } from './supabaseClient.js';
import { openRoom } from './room.js';
import { createGuestSession, createHostSession, lobbyState, nextLevel, splitReducer } from './session.js';

// Kid-facing messages the screens can show as they are.
export const SESSION_TEXT = {
  noSetup: 'Online play is not set up here. Try Play on one device.',
  lostLink: 'We lost the radio link. Check the internet, or play on one device.',
  roomFull: 'This room already has two players.',
};

const reduceSplit = splitReducer(engine);

// How often the signal clock moves on (it moves 1 second each time).
export const CLOCK_MS = 1000;

// The host saves the game in this tab, so a page reload continues it instead of starting over.
const saveKey = (code) => `missionlink:${code}`;
function loadSaved(code) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(saveKey(code)));
    return saved && typeof saved.turn === 'number' && saved.meters ? saved : null;
  } catch {
    return null;
  }
}
function save(code, state) {
  try {
    sessionStorage.setItem(saveKey(code), JSON.stringify(state));
  } catch {
    // Storage blocked (private mode, etc.): a reload will start a new game. Play still works.
  }
}

const blankOnline = (key, world) => ({
  key,
  state: lobbyState({ mode: 'online', world }),
  connected: false,
  partnerConnected: false,
  error: null,
});

export function useGameSession({ mode, role, code, world = 'moon', moonStars = 0, storm = null, stormId = null }) {
  const online = mode === 'online';
  const isHost = role === ROLES.ASTRONAUT;
  // The level is not part of the key: a level change must not reconnect the room.
  const key = online ? `${role}|${code}` : null;

  const [splitState, dispatch] = useReducer(reduceSplit, null, () =>
    engine.createGame({
      mode: 'split',
      ...nextLevel({ world: 'moon', stormId, moonStars: 0 }, { world, moonStars, ...(storm ? { storm } : {}) }),
    }),
  );
  const [net, setNet] = useState(null);
  const sessionRef = useRef(null);

  // Latest first-level props, read when a room opens (without making the room reconnect on change).
  const firstLevel = useRef({ world, moonStars, storm, stormId });
  useEffect(() => {
    firstLevel.current = { world, moonStars, storm, stormId };
  }, [world, moonStars, storm, stormId]);

  useEffect(() => {
    if (!online || !code || !hasSupabase) return undefined;
    const first = firstLevel.current;

    // Only keep values that belong to this room + role (ignore leftovers from an older one).
    const patch = (p) => setNet((n) => ({ ...(n?.key === key ? n : blankOnline(key, first.world)), ...p }));

    const room = openRoom({ code, role });
    const session = isHost
      ? createHostSession({
          room,
          engine,
          ...first,
          restored: loadSaved(code),
          onChange: (s) => {
            save(code, s);
            patch({ state: s });
          },
        })
      : createGuestSession({ room, onChange: (s) => patch({ state: s }) });
    sessionRef.current = session;
    patch({ state: session.getState() });

    let offs = [];
    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      offs.forEach((off) => off());
      session.close();
      room.close();
      if (sessionRef.current === session) sessionRef.current = null;
    };

    offs = [
      room.onStatus((status) => {
        if (status === 'SUBSCRIBED') patch({ connected: true, error: null });
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          patch({ connected: false, error: SESSION_TEXT.lostLink }); // Supabase keeps retrying
        } else if (status === 'CLOSED') patch({ connected: false });
      }),
      room.onPresence(({ partnerConnected, full }) => {
        if (full) {
          patch({ connected: false, partnerConnected: false, error: SESSION_TEXT.roomFull });
          stop();
        } else {
          patch({ partnerConnected });
        }
      }),
    ];

    // Mission Control: ask for the latest state as soon as the tab is visible or back online.
    // A hidden tab can miss messages, and phones pause background tabs.
    if (!isHost && typeof window !== 'undefined' && typeof document !== 'undefined') {
      const onVisible = () => {
        if (document.visibilityState === 'visible') session.resync();
      };
      const onOnline = () => session.resync();
      document.addEventListener('visibilitychange', onVisible);
      window.addEventListener('online', onOnline);
      offs.push(
        () => document.removeEventListener('visibilitychange', onVisible),
        () => window.removeEventListener('online', onOnline),
      );
    }
    return stop;
  }, [online, isHost, role, code, key]);

  // The signal clock: the device that runs the engine moves it on once a second while a game is on.
  // Split mode always; online only the host (Astronaut), and only while Mission Control is in the room,
  // so a dropped connection does not eat Mission Control's time. Mission Control never runs it.
  const onlineView = net?.key === key ? net : null;
  const clockOn = online
    ? isHost && onlineView?.state?.status === 'playing' && Boolean(onlineView?.partnerConnected)
    : splitState.status === 'playing';
  useEffect(() => {
    if (!clockOn) return undefined;
    const timer = setInterval(() => {
      if (!online) dispatch({ type: 'tick', seconds: 1 });
      else sessionRef.current?.tick?.(1);
    }, CLOCK_MS);
    return () => clearInterval(timer);
  }, [clockOn, online]);

  // Astronaut only: one move per turn.
  const sendMove = useCallback(
    (move) => {
      if (!online) dispatch({ type: 'move', move });
      else if (isHost) sessionRef.current?.sendMove(move);
    },
    [online, isHost],
  );

  // Mission Control only: up to one warning per turn.
  const sendWarning = useCallback(
    (warning) => {
      if (!online) dispatch({ type: 'warning', warning });
      else if (role === ROLES.MISSION_CONTROL) sessionRef.current?.sendWarning(warning);
    },
    [online, role],
  );

  // restart() replays the level; restart({ world: 'mars', moonStars }) starts the next one.
  // Online: Astronaut (host) only. Mission Control's call does nothing.
  const restart = useCallback(
    (options) => {
      if (!online) dispatch({ type: 'restart', options });
      else if (isHost) sessionRef.current?.restart(options);
    },
    [online, isHost],
  );

  if (!online) {
    return { state: splitState, sendMove, sendWarning, restart, connected: true, partnerConnected: true, error: null };
  }
  const view = net?.key === key ? net : blankOnline(key, world);
  return {
    state: view.state,
    sendMove,
    sendWarning,
    restart,
    connected: view.connected,
    partnerConnected: view.partnerConnected,
    error: hasSupabase ? view.error : SESSION_TEXT.noSetup,
  };
}
