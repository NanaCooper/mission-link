// Dev-only test page for src/realtime. Not product UI (that is Dev 3's src/ui).
// Open http://localhost:5173/src/realtime/dev.html in two windows (one normal, one private),
// create a room in one and join it in the other. Open a NEW tab, not "Duplicate tab".

import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MOVES, ROLES, WARNINGS } from '../shared/contract.js';
import { hasSupabase } from './supabaseClient.js';
import { createRoom, joinRoom, openRoom } from './room.js';
import { useGameSession } from './useGameSession.js';

const box = { border: '1px solid #8886', borderRadius: 8, padding: 12, margin: '12px 0' };
const btn = { minHeight: 44, padding: '0 14px', margin: '0 8px 8px 0', fontSize: 16 };

function RoomPicker({ onPick }) {
  const [typed, setTyped] = useState('');
  const [world, setWorld] = useState('moon');
  const cleaned = joinRoom(typed);
  return (
    <div style={box}>
      <p>
        World for new rooms and split:{' '}
        <select value={world} onChange={(e) => setWorld(e.target.value)} style={{ fontSize: 16 }}>
          <option value="moon">Moon</option>
          <option value="mars">Mars</option>
        </select>
      </p>
      <button style={btn} onClick={() => onPick({ test: 'game', mode: 'split', world })}>
        Split test (one device, no network)
      </button>
      <hr />
      <button style={btn} onClick={() => onPick({ test: 'game', mode: 'online', role: ROLES.ASTRONAUT, code: createRoom(), world })}>
        Create room: game test (Astronaut)
      </button>
      <button style={btn} onClick={() => onPick({ test: 'ping', role: ROLES.ASTRONAUT, code: createRoom() })}>
        Create room: ping test
      </button>
      <div style={{ marginTop: 12 }}>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="MOON-4821"
          style={{ fontSize: 16, minHeight: 40, marginRight: 8 }}
        />
        <button
          style={btn}
          disabled={!cleaned}
          onClick={() => onPick({ test: 'game', mode: 'online', role: ROLES.MISSION_CONTROL, code: cleaned })}
        >
          Join: game test (Mission Control)
        </button>
        <button
          style={btn}
          disabled={!cleaned}
          onClick={() => onPick({ test: 'ping', role: ROLES.MISSION_CONTROL, code: cleaned })}
        >
          Join: ping test
        </button>
        {typed && !cleaned && <span> That code does not look right.</span>}
      </div>
    </div>
  );
}

function PingTest({ role, code }) {
  const [status, setStatus] = useState('connecting');
  const [presence, setPresence] = useState({ partnerConnected: false, full: false });
  const [log, setLog] = useState([]);
  const roomRef = useRef(null);

  useEffect(() => {
    const room = openRoom({ code, role });
    roomRef.current = room;
    const offs = [
      room.onStatus(setStatus),
      room.onPresence(setPresence),
      room.on('ping', (p) =>
        setLog((l) => [`${new Date().toLocaleTimeString()}: ping from ${p.from} (${p.n})`, ...l].slice(0, 20)),
      ),
    ];
    return () => {
      offs.forEach((off) => off());
      room.close();
      roomRef.current = null;
    };
  }, [code, role]);

  const sendPing = () => {
    const ok = roomRef.current?.send('ping', { from: role, n: Math.floor(Math.random() * 1000) });
    if (!ok) setLog((l) => ['(not connected yet, ping not sent)', ...l]);
  };

  return (
    <div style={box}>
      <h2 style={{ marginTop: 0 }}>Ping test</h2>
      <p>
        Room <b>{code}</b> as <b>{role}</b>
      </p>
      <p>
        Channel: <b>{status}</b> · Partner: <b>{presence.partnerConnected ? 'here' : 'not here'}</b>
        {presence.full && <b> · ROOM FULL</b>}
      </p>
      <button style={btn} onClick={sendPing}>
        Send ping
      </button>
      <ul>
        {log.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

function GameTest({ mode, role, code, world }) {
  const { state, sendMove, sendWarning, restart, connected, partnerConnected, error } = useGameSession({
    mode,
    role,
    code,
    world,
  });
  const split = mode === 'split';
  const canMove = split || role === ROLES.ASTRONAUT;
  const canWarn = split || role === ROLES.MISSION_CONTROL;
  const playing = state.status === 'playing';

  return (
    <div style={box}>
      <h2 style={{ marginTop: 0 }}>Game test ({split ? 'split' : `online, ${role}`})</h2>
      {!split && (
        <p>
          Room <b>{code}</b> · Connected: <b>{String(connected)}</b> · Partner connected:{' '}
          <b>{String(partnerConnected)}</b>
        </p>
      )}
      {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}
      {!split && !partnerConnected && !error && <p>Waiting for your partner...</p>}
      <p>
        Status: <b>{state.status}</b> · World: <b>{state.world}</b> · Turn: <b>{state.turn}</b> of {state.maxTurns} ·
        Stage: {state.stormStage} · Science: {state.science} · Stars: {state.stars}
        {state.lostReason && <> · Lost: {state.lostReason}</>}
      </p>
      <p>
        Power {state.meters.power} · Oxygen {state.meters.oxygen} · Radiation dose {state.meters.radiationDose} · Crew
        health {state.meters.crewHealth}
      </p>
      {canWarn && (
        <div>
          <b>Mission Control warnings:</b>
          <br />
          {WARNINGS.map((w) => (
            <button key={w} style={btn} disabled={!playing} onClick={() => sendWarning(w)}>
              {w}
            </button>
          ))}
        </div>
      )}
      {canMove && (
        <div>
          <b>Astronaut moves:</b>
          <br />
          {MOVES.map((m) => (
            <button key={m} style={btn} disabled={!playing} onClick={() => sendMove(m)}>
              {m}
            </button>
          ))}
        </div>
      )}
      {canMove ? (
        <div>
          <b>Restart (same room):</b>
          <br />
          <button style={btn} onClick={restart}>
            Play again (same level)
          </button>
          <button style={btn} onClick={() => restart({ world: 'mars', moonStars: state.stars })}>
            Fly to Mars ({state.stars} {state.stars === 1 ? 'star' : 'stars'})
          </button>
          <button style={btn} onClick={() => restart({ world: 'moon' })}>
            Back to the Moon
          </button>
        </div>
      ) : (
        <p>Only the Astronaut can restart. This screen follows the Astronaut's level.</p>
      )}
      <p>
        Inbox: {state.inbox.map((w) => `t${w.turn} ${w.warning}`).join(', ') || 'empty'} · Outbox (Mars):{' '}
        {state.outbox.map((w) => `t${w.turnSent} ${w.warning}`).join(', ') || 'empty'} · Last move:{' '}
        {state.lastMove ?? 'none'}
      </p>
      <ul>
        {state.log.map((line, i) => (
          <li key={i}>{line.text}</li>
        ))}
      </ul>
    </div>
  );
}

function DevHarness() {
  const [pick, setPick] = useState(null);
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 760, margin: '0 auto', padding: 16 }}>
      <h1>Realtime test page</h1>
      {!hasSupabase && <p style={{ color: 'crimson' }}>No Supabase keys in .env, so online tests cannot run.</p>}
      {pick ? (
        <>
          <button style={btn} onClick={() => setPick(null)}>
            Leave
          </button>
          {pick.test === 'ping' ? <PingTest {...pick} /> : <GameTest {...pick} />}
        </>
      ) : (
        <RoomPicker onPick={setPick} />
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DevHarness />
  </StrictMode>,
);
