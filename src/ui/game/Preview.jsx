// TEMPORARY: a page for checking Dev 3's screens with fake data. Not used by the real app.
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

function Section({ title, children }) {
  return (
    <section style={{ display: 'grid', gap: 16, marginBottom: 40 }}>
      <h2 style={{ borderBottom: '2px solid var(--panel-border)', paddingBottom: 8 }}>{title}</h2>
      {children}
    </section>
  );
}

export default function Preview() {
  return (
    <div>
      <h1>Dev 3 preview (fake data)</h1>

      <Section title="Moon: Astronaut">
        <AstronautScreen view={fakeAstronautView} onMove={onMove} />
      </Section>
      <Section title="Moon: Mission Control">
        <MissionControlScreen view={fakeMissionControlView} onWarn={onWarn} />
      </Section>

      <Section title="Mars: Astronaut">
        <AstronautScreen view={fakeMarsAstronautView} onMove={onMove} />
      </Section>
      <Section title="Mars: Mission Control (late messages + dust)">
        <MissionControlScreen view={fakeMarsMissionControlView} onWarn={onWarn} />
      </Section>

      <Section title="Mars: Mission Control during a signal blackout">
        <MissionControlScreen view={fakeMarsBlackoutMissionControlView} onWarn={onWarn} />
      </Section>

      <Section title="Split-screen (Moon)">
        <SplitScreen
          astronautView={fakeAstronautView}
          missionControlView={fakeMissionControlView}
          onMove={onMove}
          onWarn={onWarn}
        />
      </Section>
      <Section title="Split-screen (Mars)">
        <SplitScreen
          astronautView={fakeMarsAstronautView}
          missionControlView={fakeMarsMissionControlView}
          onMove={onMove}
          onWarn={onWarn}
        />
      </Section>

      <Section title="Game over: won and lost (buttons disabled)">
        <AstronautScreen view={fakeWonAstronautView} onMove={onMove} />
        <AstronautScreen view={fakeLostAstronautView} onMove={onMove} />
      </Section>
    </div>
  );
}
