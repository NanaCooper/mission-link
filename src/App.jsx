import { useEffect, useState } from 'react';
import { ROLES } from './shared/contract.js';
import { useGameSession } from './realtime/useGameSession.js';
import {
  getAstronautView,
  getMissionControlView,
  getGameStorm,
  getStorm,
  REAL_STORM_IDS
} from './realtime/engineAdapter.js';
import { makeRoomCode } from './realtime/room.js';
import SplitScreen from './ui/game/SplitScreen.jsx';
import AstronautScreen from './ui/game/AstronautScreen.jsx';
import MissionControlScreen from './ui/game/MissionControlScreen.jsx';
import HomeScreen from './ui/flow/HomeScreen.jsx';
import LobbyScreen from './ui/flow/LobbyScreen.jsx';
import EndScreen from './ui/flow/EndScreen.jsx';
import HowToPlayScreen from './ui/flow/HowToPlayScreen.jsx';
import DataSourcesScreen from './ui/flow/DataSourcesScreen.jsx';
import MissionBriefing from './ui/game/intro/MissionBriefing.jsx';
import { hasSeenBriefing, markBriefingSeen } from './ui/game/intro/briefingText.js';
import { gameBanner, loadProgress, pickGameScreen, pickStorm, progressAfter, saveProgress } from './ui/flow/appFlow.js';

// Screen switching with React state, no router.
//   home -> play on one device -> game -> end
//   home -> create room -> lobby -> Astronaut game -> end
//   home -> join room -> Mission Control game -> end
//   home <-> How to play, home/end <-> Data sources
//   the first mission on this device starts with the mission briefing (also: home -> Mission briefing)

const scrollToTop = () => {
  try {
    window.scrollTo(0, 0);
  } catch {
    // Not in a browser (tests): nothing to scroll.
  }
};

export default function App() {
  const [page, setPage] = useState('home'); // 'home' | 'howTo' | 'sources' | 'briefing' | 'game'
  const [session, setSession] = useState(null); // { id, mode, role, code, world, moonStars, stormId, solo }
  const [progress, setProgress] = useState(() => loadProgress());
  // The mission waiting behind the briefing (the first time), or null when it was opened from home.
  const [afterBriefing, setAfterBriefing] = useState(null);

  useEffect(scrollToTop, [page]);

  const updateProgress = (next) => {
    setProgress((old) => {
      const merged = typeof next === 'function' ? next(old) : next;
      if (merged !== old) saveProgress(merged);
      return merged;
    });
  };

  const startNow = (options) => {
    setSession({ id: Date.now(), ...options });
    setPage('game');
  };
  // The first mission on this device opens the briefing first, so everyone knows the goal.
  // Every new game plays one of the real NASA storms, picked at random (chosen here, so the
  // briefing can name it). Mission Control joining a room never picks: it follows the Astronaut.
  const start = (options) => {
    const game = options.role === ROLES.MISSION_CONTROL ? options : { ...options, stormId: pickStorm(REAL_STORM_IDS) };
    if (hasSeenBriefing()) return startNow(game);
    setAfterBriefing(game);
    setPage('briefing');
  };
  const briefingDone = () => {
    markBriefingSeen();
    if (afterBriefing) startNow(afterBriefing);
    else setPage('home');
    setAfterBriefing(null);
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
  if (page === 'briefing') {
    return (
      <MissionBriefing
        storm={getStorm(afterBriefing?.stormId ?? null)}
        onDone={briefingDone}
        startLabel={afterBriefing ? undefined : 'Back to home'}
      />
    );
  }
  if (page === 'howTo') return <HowToPlayScreen onBack={() => setPage('home')} />;
  if (page === 'sources') return <DataSourcesScreen storm={getStorm(null)} onBack={() => setPage('home')} />;

  return (
    <HomeScreen
      marsUnlocked={progress.marsUnlocked}
      moonStars={progress.moonStars}
      onPlayAlone={(world) => start({ mode: 'split', role: ROLES.ASTRONAUT, world, moonStars: starsFor(world), solo: true })}
      onPlaySplit={(world) => start({ mode: 'split', role: ROLES.ASTRONAUT, world, moonStars: starsFor(world) })}
      onCreateRoom={(world) =>
        start({ mode: 'online', role: ROLES.ASTRONAUT, code: makeRoomCode(), world, moonStars: starsFor(world) })
      }
      onJoinRoom={(code) => start({ mode: 'online', role: ROLES.MISSION_CONTROL, code })}
      onHowToPlay={() => setPage('howTo')}
      onBriefing={() => setPage('briefing')}
      onDataSources={() => setPage('sources')}
      onUnlockMars={() => updateProgress((old) => (old.marsUnlocked ? old : { ...old, marsUnlocked: true }))}
    />
  );
}

// One running session. Lives as long as the room, so Data sources opens inside it
// (leaving would close an online room).
function Game({ session, onLevelEnd, onHome }) {
  const { mode, role, code, world, moonStars, stormId = null, solo = false } = session;
  // One device: a player opened the Menu, so the game (the signal clock) is paused.
  const [paused, setPaused] = useState(false);
  const { state, sendMove, sendWarning, restart, partnerConnected, error } = useGameSession({
    mode,
    role,
    code,
    world,
    moonStars,
    paused: mode === 'split' && paused,
    // Play alone: Commander Sola sends the warnings (one device only)
    solo,
    // The real storm this game plays (picked at random when it started)
    stormId,
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
        crew={getAstronautView(state)}
        canContinue={!isMissionControl}
        onNextLevel={(stars) => restart({ world: 'mars', moonStars: stars })}
        // Play again: the same level with another real storm, so it plays differently
        onPlayAgain={() => restart({ stormId: pickStorm(REAL_STORM_IDS, state.stormId) })}
        onHome={onHome}
        onDataSources={() => setShowSources(true)}
      />
    );
  } else if (mode === 'split' && state.solo) {
    // Play alone: only the Astronaut's screen. Commander Sola's warnings arrive by themselves.
    body = <AstronautScreen view={getAstronautView(state)} onMove={sendMove} pauses onMenuChange={setPaused} />;
  } else if (mode === 'split') {
    body = (
      <SplitScreen
        astronautView={getAstronautView(state)}
        missionControlView={getMissionControlView(state)}
        onMove={sendMove}
        onWarn={sendWarning}
        onPauseChange={setPaused}
      />
    );
  } else if (isMissionControl) {
    // Online: the menu cannot pause the other player, so it says the game keeps going.
    body = <MissionControlScreen view={getMissionControlView(state)} onWarn={sendWarning} pauses={false} />;
  } else {
    body = <AstronautScreen view={getAstronautView(state)} onMove={sendMove} pauses={false} />;
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
