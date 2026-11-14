import { useState } from 'react';
import { BigButton, Panel } from '../components/index.js';
import { joinRoom } from '../../realtime/room.js';
import { WORLD_NAMES, crates } from './text.js';
import './flow.css';

// Tapping the title this many times unlocks Mars, for judges and the demo.
const TAPS_TO_UNLOCK = 5;

// The first screen: pick a level, then play on one device, create a room or join one.
//
// Props:
//   marsUnlocked, moonStars          from App state (Mars opens after winning the Moon)
//   onPlaySplit(world)               play on one device
//   onCreateRoom(world)              I'm the Astronaut
//   onJoinRoom(code)                 I'm Mission Control; code is already cleaned, e.g. 'MOON-4821'
//   onHowToPlay(), onDataSources()   small links
//   onUnlockMars()                   called after 5 taps on the title
export default function HomeScreen({
  marsUnlocked = false,
  moonStars = 0,
  onPlaySplit,
  onCreateRoom,
  onJoinRoom,
  onHowToPlay,
  onDataSources,
  onUnlockMars
}) {
  const [picked, setPicked] = useState('moon');
  const [typed, setTyped] = useState('');
  const [taps, setTaps] = useState(0);

  const world = picked === 'mars' && !marsUnlocked ? 'moon' : picked;
  const code = joinRoom(typed);
  const showCodeHelp = typed.trim() !== '' && !code;
  const theme = WORLD_NAMES[world];

  function tapTitle() {
    const next = taps + 1;
    setTaps(next);
    if (next >= TAPS_TO_UNLOCK && !marsUnlocked) onUnlockMars?.();
  }

  const marsHint = !marsUnlocked
    ? 'Locked. Win the Moon first.'
    : moonStars > 0
      ? `${crates(moonStars)} from the Moon waiting`
      : 'Ready for launch';

  return (
    <main className={`flow-screen world-${world}`}>
      <header className="flow-hero">
        <h1 className="flow-title" onClick={tapTitle}>
          <span aria-hidden="true">🚀</span> Mission Link
        </h1>
        <p className="flow-lead">
          Two players, one solar storm. Mission Control on Earth can see the storm coming. The
          Astronaut can protect the base. Talk to each other to survive!
        </p>
      </header>

      <Panel title="1. Pick a level">
        <div className="flow-stack" role="group" aria-label="Pick a level">
          <BigButton
            icon={WORLD_NAMES.moon.icon}
            label={`${WORLD_NAMES.moon.level}: ${WORLD_NAMES.moon.name}`}
            hint="Messages from Earth arrive straight away."
            selected={world === 'moon'}
            onClick={() => setPicked('moon')}
          />
          <BigButton
            icon={marsUnlocked ? WORLD_NAMES.mars.icon : '🔒'}
            label={`${WORLD_NAMES.mars.level}: ${WORLD_NAMES.mars.name}`}
            hint={marsHint}
            selected={world === 'mars'}
            disabled={!marsUnlocked}
            onClick={() => setPicked('mars')}
          />
        </div>
      </Panel>

      <Panel title={`2. Play on the ${theme.name}`}>
        <div className="flow-stack">
          <BigButton
            icon="📱"
            label="Play on one device"
            hint="Sit together and share the screen."
            onClick={() => onPlaySplit?.(world)}
          />
          <BigButton
            icon="👩‍🚀"
            label="Create a room (I'm the Astronaut)"
            hint="You get a code to give Mission Control."
            onClick={() => onCreateRoom?.(world)}
          />
        </div>

        <form
          className="flow-join"
          onSubmit={(event) => {
            event.preventDefault();
            if (code) onJoinRoom?.(code);
          }}
        >
          <label className="flow-join__label" htmlFor="room-code">
            Got a code? Type it here.
          </label>
          <input
            id="room-code"
            className="flow-join__input"
            inputMode="numeric"
            autoComplete="off"
            placeholder="MOON-4821"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            aria-describedby={showCodeHelp ? 'room-code-help' : undefined}
            aria-invalid={showCodeHelp ? 'true' : undefined}
          />
          {showCodeHelp && (
            <p id="room-code-help" className="flow-join__help">
              A room code has 4 numbers, like MOON-4821.
            </p>
          )}
          <BigButton
            icon="🌍"
            label="Join a room (I'm Mission Control)"
            hint={code ? `Joining ${code}` : 'Type the code first.'}
            disabled={!code}
            onClick={() => code && onJoinRoom?.(code)}
          />
        </form>
      </Panel>

      <nav className="flow-links" aria-label="More">
        <button type="button" className="flow-link" onClick={onHowToPlay}>
          <span aria-hidden="true">📖</span> How to play
        </button>
        <button type="button" className="flow-link" onClick={onDataSources}>
          <span aria-hidden="true">🛰️</span> Data sources
        </button>
      </nav>
    </main>
  );
}
