import { useState } from 'react';
import { BigButton, Portrait } from '../components/index.js';
import AstronautScreen from './AstronautScreen.jsx';
import MissionControlScreen from './MissionControlScreen.jsx';
import { CHARACTERS } from './labels.js';
import './SplitScreen.css';

const scrollToTop = () => {
  try {
    window.scrollTo(0, 0);
  } catch {
    // Not in a browser (tests): nothing to scroll.
  }
};

// Both player screens on one device, for two kids sharing it.
//   Wider than 900px: both halves side by side, with a labelled divider.
//   Phones: one half at a time. Two big tabs at the top switch between them,
//   and a "Pass to ..." button at the bottom hands the phone to the other player.
//
// Props: { astronautView, missionControlView, onMove, onWarn }
export default function SplitScreen({ astronautView, missionControlView, onMove, onWarn }) {
  // Which half a phone shows, and the turn number when that half was opened.
  const [showing, setShowing] = useState({ tab: 'missionControl', sinceTurn: astronautView.turn });
  const { tab } = showing;

  const open = (nextTab) => {
    setShowing({ tab: nextTab, sinceTurn: astronautView.turn });
    scrollToTop();
  };

  // Whose turn is it to hold the phone? This only makes a tab flash. It changes no rules.
  const playing = astronautView.status === 'playing';
  const warningDone = Boolean(missionControlView.warningThisTurn) || Boolean(missionControlView.stage?.blackout);
  const moveDone = astronautView.turn !== showing.sinceTurn;
  const nudgeAstronaut = playing && tab === 'missionControl' && warningDone;
  const nudgeMissionControl = playing && tab === 'astronaut' && moveDone;

  const { astronaut, director } = CHARACTERS;

  return (
    <div className={`split-screen world-${astronautView.world}`}>
      <div className="split-screen__tabs" role="group" aria-label="Who is holding the screen?">
        <TabButton
          who={director.who}
          label="Mission Control"
          active={tab === 'missionControl'}
          nudged={nudgeMissionControl}
          onClick={() => open('missionControl')}
        />
        <TabButton
          who={astronaut.who}
          label="Astronaut"
          active={tab === 'astronaut'}
          nudged={nudgeAstronaut}
          onClick={() => open('astronaut')}
        />
      </div>

      <section
        className={`split-screen__half split-screen__half--mission-control${tab === 'missionControl' ? ' is-active' : ''}`}
        aria-label="Mission Control's half"
      >
        <MissionControlScreen view={missionControlView} onWarn={onWarn} />
        <div className="split-screen__pass">
          <BigButton
            icon={<Portrait who={astronaut.who} size={32} />}
            label="Pass to the Astronaut"
            hint={`Now ${astronaut.name} picks a move.`}
            onClick={() => open('astronaut')}
          />
        </div>
      </section>

      <div className="split-screen__divider" role="separator" aria-label="Mission Control on the left, Astronaut on the right">
        <span aria-hidden="true">&lt; Mission Control &nbsp;|&nbsp; Astronaut &gt;</span>
      </div>

      <section
        className={`split-screen__half split-screen__half--astronaut${tab === 'astronaut' ? ' is-active' : ''}`}
        aria-label="Astronaut's half"
      >
        <AstronautScreen view={astronautView} onMove={onMove} />
        <div className="split-screen__pass">
          <BigButton
            icon={<Portrait who={director.who} size={32} />}
            label="Pass to Mission Control"
            hint="The next turn starts with them."
            onClick={() => open('missionControl')}
          />
        </div>
      </section>
    </div>
  );
}

// One of the two big tabs on a phone. A flashing tab means "your turn".
function TabButton({ who, label, active, nudged, onClick }) {
  const classes = ['split-screen__tab'];
  if (active) classes.push('is-active');
  if (nudged) classes.push('is-nudged');

  return (
    <button type="button" className={classes.join(' ')} aria-pressed={active} onClick={onClick}>
      <Portrait who={who} size={28} />
      <span className="split-screen__tab-name">
        {label}
        {nudged && <span className="visually-hidden"> (your turn)</span>}
      </span>
    </button>
  );
}
