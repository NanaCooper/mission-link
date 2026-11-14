import AstronautScreen from './AstronautScreen.jsx';
import MissionControlScreen from './MissionControlScreen.jsx';
import './SplitScreen.css';

// Both player screens on one device, for two kids sharing it.
// Phones: stacked, Mission Control on top. Wider than 900px: side by side.
// A labelled divider shows each kid which half is theirs.
//
// Props: { astronautView, missionControlView, onMove, onWarn }
export default function SplitScreen({ astronautView, missionControlView, onMove, onWarn }) {
  return (
    <div className="split-screen">
      <section className="split-screen__half split-screen__half--mission-control" aria-label="Mission Control's half">
        <MissionControlScreen view={missionControlView} onWarn={onWarn} />
      </section>

      <div className="split-screen__divider" role="separator" aria-label="Mission Control on one side, Astronaut on the other">
        <span className="split-screen__divider-label split-screen__divider-label--stacked" aria-hidden="true">
          👆 Mission Control &nbsp;|&nbsp; 👇 Astronaut
        </span>
        <span className="split-screen__divider-label split-screen__divider-label--side" aria-hidden="true">
          👈 Mission Control &nbsp;|&nbsp; Astronaut 👉
        </span>
      </div>

      <section className="split-screen__half split-screen__half--astronaut" aria-label="Astronaut's half">
        <AstronautScreen view={astronautView} onMove={onMove} />
      </section>
    </div>
  );
}
