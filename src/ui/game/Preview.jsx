// TEMPORARY: a page for checking Dev 3's screens with fake data. Not used by the real app.
// Every game screen is full screen now, so this shows one at a time. Pick one in the box at the bottom.
import { useState } from 'react';
import AstronautScreen from './AstronautScreen.jsx';
import MissionControlScreen from './MissionControlScreen.jsx';
import SplitScreen from './SplitScreen.jsx';
import {
  fakeAstronautView,
  fakeMissionControlView,
  fakeMarsAstronautView,
  fakeMarsMissionControlView,
  fakeMarsBlackoutMissionControlView,
  fakeWonAstronautView,
  fakeLostAstronautView
} from '../fakeState.js';

const onMove = (move) => console.log('move:', move);
const onWarn = (warning) => console.log('warning:', warning);

const SCREENS = {
  moonAstronaut: { name: 'Moon: Astronaut', show: () => <AstronautScreen view={fakeAstronautView} onMove={onMove} /> },
  moonMissionControl: {
    name: 'Moon: Mission Control',
    show: () => <MissionControlScreen view={fakeMissionControlView} onWarn={onWarn} />
  },
  marsAstronaut: { name: 'Mars: Astronaut', show: () => <AstronautScreen view={fakeMarsAstronautView} onMove={onMove} /> },
  marsMissionControl: {
    name: 'Mars: Mission Control (late messages + dust)',
    show: () => <MissionControlScreen view={fakeMarsMissionControlView} onWarn={onWarn} />
  },
  marsBlackout: {
    name: 'Mars: Mission Control, signal blackout',
    show: () => <MissionControlScreen view={fakeMarsBlackoutMissionControlView} onWarn={onWarn} />
  },
  splitMoon: {
    name: 'One device (Moon)',
    show: () => (
      <SplitScreen astronautView={fakeAstronautView} missionControlView={fakeMissionControlView} onMove={onMove} onWarn={onWarn} />
    )
  },
  splitMars: {
    name: 'One device (Mars)',
    show: () => (
      <SplitScreen
        astronautView={fakeMarsAstronautView}
        missionControlView={fakeMarsMissionControlView}
        onMove={onMove}
        onWarn={onWarn}
      />
    )
  },
  won: { name: 'Game over: won', show: () => <AstronautScreen view={fakeWonAstronautView} onMove={onMove} /> },
  lost: { name: 'Game over: lost', show: () => <AstronautScreen view={fakeLostAstronautView} onMove={onMove} /> }
};

export default function Preview() {
  const [picked, setPicked] = useState('moonAstronaut');
  const screen = SCREENS[picked] ?? SCREENS.moonAstronaut;

  return (
    <div>
      {/* key: a new pick starts that screen fresh */}
      <div key={picked}>{screen.show()}</div>
      <label
        style={{
          position: 'fixed',
          right: 8,
          bottom: 8,
          zIndex: 100,
          display: 'grid',
          gap: 4,
          padding: 8,
          fontSize: 14,
          background: 'var(--ink)',
          border: '2px solid var(--focus)'
        }}
      >
        Dev 3 preview (fake data)
        <select value={picked} onChange={(event) => setPicked(event.target.value)} style={{ fontSize: 16, minHeight: 32 }}>
          {Object.entries(SCREENS).map(([id, { name }]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
