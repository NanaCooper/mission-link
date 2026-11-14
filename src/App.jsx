import { useEffect, useState } from 'react';
import { ROLES } from './shared/contract.js';
import { useGameSession } from './realtime/useGameSession.js';
import { getAstronautView, getMissionControlView, getGameStorm, getStorm } from './realtime/engineAdapter.js';
import { makeRoomCode } from './realtime/room.js';
import SplitScreen from './ui/game/SplitScreen.jsx';
import AstronautScreen from './ui/game/AstronautScreen.jsx';
import MissionControlScreen from './ui/game/MissionControlScreen.jsx';
import HomeScreen from './ui/flow/HomeScreen.jsx';
import LobbyScreen from './ui/flow/LobbyScreen.jsx';
import EndScreen from './ui/flow/EndScreen.jsx';
import HowToPlayScreen from './ui/flow/HowToPlayScreen.jsx';
import DataSourcesScreen from './ui/flow/DataSourcesScreen.jsx';
import { gameBanner, loadProgress, pickGameScreen, progressAfter, saveProgress } from './ui/flow/appFlow.js';

// Screen switching with React state, no router.
//   home -> play on one device -> game -> end
//   home -> create room -> lobby -> Astronaut game -> end
//   home -> join room -> Mission Control game -> end
//   home <-> How to play, home/end <-> Data sources

const scrollToTop = () => {
  try {
    window.scrollTo(0, 0);
  } catch {
    // Not in a browser (tests): nothing to scroll.
  }
};

export default function App() {
  const [page, setPage] = useState('home'); // 'home' | 'howTo' | 'sources' | 'game'
  const [session, setSession] = useState(null); // { id, mode, role, code, world, moonStars }
  const [progress, setProgress] = useState(() => loadProgress());

  useEffect(scrollToTop, [page]);

  const updateProgress = (next) => {
    setProgress((old) => {
      const merged = typeof next === 'function' ? next(old) : next;
      if (merged !== old) saveProgress(merged);
      return merged;
    });
  };

  const start = (options) => {
    setSession({ id: Date.now(), ...options });
    setPage('game');
  };
  const goHome = () => {
    setSession(null); // unmounting the game closes the room
    setPage('home');
  };
  const starsFor = (world) => (world === 'mars' ? progress.moonStars : 0);

  if (page === 'game' && session) {
    return (
      <Game
        key={session.id}
        session={session}
        onLevelEnd={(result) => updateProgress((old) => progressAfter(old, result))}
        onHome={goHome}
      />
    );
  }
  if (page === 'howTo') return <HowToPlayScreen onBack={() => setPage('home')} />;
  if (page === 'sources') return <DataSourcesScreen storm={getStorm(null)} onBack={() => setPage('home')} />;

  return (
    <HomeScreen
      marsUnlocked={progress.marsUnlocked}
      moonStars={progress.moonStars}
      onPlaySplit={(world) => start({ mode: 'split', role: ROLES.ASTRONAUT, world, moonStars: starsFor(world) })}
      onCreateRoom={(world) =>
        start({ mode: 'online', role: ROLES.ASTRONAUT, code: makeRoomCode(), world, moonStars: starsFor(world) })
      }
      onJoinRoom={(code) => start({ mode: 'online', role: ROLES.MISSION_CONTROL, code })}
      onHowToPlay={() => setPage('howTo')}
      onDataSources={() => setPage('sources')}
      onUnlockMars={() => updateProgress((old) => (old.marsUnlocked ? old : { ...old, marsUnlocked: true }))}
    />
  );
}

// One running session. Lives as long as the room, so Data sources opens inside it
// (leaving would close an online room).
function Game({ session, onLevelEnd, onHome }) {
  const { mode, role, code, world, moonStars } = session;
  const { state, sendMove, sendWarning, restart, partnerConnected, error } = useGameSession({
    mode,
    role,
    code,
    world,
    moonStars,
  });
  const [showSources, setShowSources] = useState(false);

  const screen = pickGameScreen({ mode, role, state, partnerConnected });
  const banner = gameBanner({ mode, screen, partnerConnected, error });
  const isMissionControl = mode === 'online' && role === ROLES.MISSION_CONTROL;

  // Remember a Moon win (unlocks Mars, keeps the best stars). The level comes from
  // state.world, not the home choice, so Mission Control follows the Astronaut to Mars.
  const ended = screen === 'end';
  useEffect(() => {
    if (ended) onLevelEnd({ status: state.status, world: state.world, stars: state.stars });
    // Only when a level ends, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended, state.world, state.status]);

  useEffect(scrollToTop, [screen, state.world, showSources]);

  if (showSources) {
    return <DataSourcesScreen storm={getGameStorm(state)} onBack={() => setShowSources(false)} />;
  }

  if (screen === 'lobby') {
    return <LobbyScreen code={code} role={role} error={error} onBack={onHome} />;
  }

  let body;
  if (screen === 'end') {
    const view = isMissionControl ? getMissionControlView(state) : getAstronautView(state);
    body = (
      <EndScreen
        view={view}
        storm={getGameStorm(state)}
        canContinue={!isMissionControl}
        onNextLevel={(stars) => restart({ world: 'mars', moonStars: stars })}
        onPlayAgain={() => restart()}
        onHome={onHome}
        onDataSources={() => setShowSources(true)}
      />
    );
  } else if (mode === 'split') {
    body = (
      <SplitScreen
        astronautView={getAstronautView(state)}
        missionControlView={getMissionControlView(state)}
        onMove={sendMove}
        onWarn={sendWarning}
      />
    );
  } else if (isMissionControl) {
    body = <MissionControlScreen view={getMissionControlView(state)} onWarn={sendWarning} />;
  } else {
    body = <AstronautScreen view={getAstronautView(state)} onMove={sendMove} />;
  }

  return (
    <>
      {banner && (
        <p className="flow-banner" role="status">
          {banner}
        </p>
      )}
      {body}
    </>
  );
}
