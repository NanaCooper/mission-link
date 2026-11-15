import { useEffect, useRef, useState } from 'react';
import AstronautScreen from './AstronautScreen.jsx';
import MissionControlScreen from './MissionControlScreen.jsx';
import SwitchButton from './hud/SwitchButton.jsx';
import PassCard from './hud/PassCard.jsx';
import './SplitScreen.css';

// Both players on one device, for two kids sharing it. One full screen at a time, on every size.
//   The switch button in the top bar ("Switch to Astronaut") flashes when it is the other
//   player's turn. Tapping it shows a full-screen "Pass the device to Nova" card with one big
//   button, so the second kid knows it is their turn.
//   Both screens stay mounted (so things like where Nova stands are kept), but only the one that
//   shows is `active`: it alone gets the keyboard, and its pop-ups wait until it shows.
//
//   The signal clock is paused (onPauseChange(true)) while a menu is open, and whenever Mission
//   Control does not hold the device: the Astronaut's screen or the hand-over card shows.
//   The Astronaut moves once Mission Control has sent this wave's warning (the engine's
//   waitingForMissionControl), so the device goes back and forth: one warning, one move.
//
// Props: { astronautView, missionControlView, onMove, onWarn, onPauseChange, onShowingChange }
//   onShowingChange(player)  whose screen shows now ('missionControl' | 'astronaut'), for the music.
//                            It changes when the next player takes the device, not at the hand-over card.
export default function SplitScreen({ astronautView, missionControlView, onMove, onWarn, onPauseChange, onShowingChange }) {
  // Whose menu is open. Only the screen that shows can have one open (GameHud reports a hidden
  // screen as closed), so handing the device over always un-pauses.
  const [menuOpen, setMenuOpen] = useState({ missionControl: false, astronaut: false });
  // Whose screen shows, and the turn number when it was opened. Mission Control plays first each turn.
  const [showing, setShowing] = useState({ tab: 'missionControl', sinceTurn: astronautView.turn });
  // While the "Pass the device" card shows: who gets the device next.
  const [passingTo, setPassingTo] = useState(null);
  // The signal clock is Mission Control's: it only runs while Mission Control holds the device
  // (their screen shows, no hand-over card, no menu open). Handing over never costs them time.
  const paused =
    menuOpen.missionControl || menuOpen.astronaut || showing.tab !== 'missionControl' || passingTo !== null;
  const report = useRef(onPauseChange);
  useEffect(() => {
    report.current = onPauseChange; // always call the newest one
  });
  useEffect(() => {
    report.current?.(paused);
  }, [paused]);
  const menuChange = (player) => (open) =>
    setMenuOpen((now) => (now[player] === open ? now : { ...now, [player]: open }));

  const { tab } = showing;
  const reportShowing = useRef(onShowingChange);
  useEffect(() => {
    reportShowing.current = onShowingChange;
  });
  useEffect(() => {
    reportShowing.current?.(tab);
  }, [tab]);

  const takeOver = () => {
    setShowing({ tab: passingTo, sinceTurn: astronautView.turn });
    setPassingTo(null);
  };

  // Whose turn is it to hold the device? This only makes a button flash. It changes no rules.
  const playing = astronautView.status === 'playing';
  const warningDone = Boolean(missionControlView.warningThisTurn) || Boolean(missionControlView.stage?.blackout);
  const moveDone = astronautView.turn !== showing.sinceTurn;
  const nudgeAstronaut = playing && tab === 'missionControl' && warningDone;
  // The Astronaut moved, or is waiting for the next warning: back to Mission Control.
  const nudgeMissionControl = playing && tab === 'astronaut' && (moveDone || Boolean(astronautView.waitingForMissionControl));

  const shows = (player) => tab === player;
  const isActive = (player) => shows(player) && !passingTo;

  return (
    <div className={`split-screen world-${astronautView.world}`}>
      <div className="split-screen__player" data-player="missionControl" hidden={!shows('missionControl')} inert={!shows('missionControl')}>
        <MissionControlScreen
          view={missionControlView}
          onWarn={onWarn}
          active={isActive('missionControl')}
          pauses
          onMenuChange={menuChange('missionControl')}
          switchButton={<SwitchButton to="astronaut" nudged={nudgeAstronaut} onClick={() => setPassingTo('astronaut')} />}
        />
      </div>

      <div className="split-screen__player" data-player="astronaut" hidden={!shows('astronaut')} inert={!shows('astronaut')}>
        <AstronautScreen
          view={astronautView}
          onMove={onMove}
          active={isActive('astronaut')}
          pauses
          onMenuChange={menuChange('astronaut')}
          switchButton={
            <SwitchButton to="missionControl" nudged={nudgeMissionControl} onClick={() => setPassingTo('missionControl')} />
          }
        />
      </div>

      {passingTo && <PassCard role={passingTo} onReady={takeOver} onBack={() => setPassingTo(null)} />}
    </div>
  );
}
