import { Meter, BigButton, Panel, WhyCard, InfoTip } from '../components/index.js';
import {
  MOVE_INFO,
  WARNING_INFO,
  WORLD_NAMES,
  RADIATION_EXPLAINER,
  turnText,
} from './labels.js';
import './AstronautScreen.css';

// The Astronaut's screen: base meters, the newest message from Mission Control,
// the four move buttons, and what happened last turn.
// It only shows the view it is given. The engine decides everything.
//
// Props: { view, onMove }  view = getAstronautView(state), onMove(moveKey)
export default function AstronautScreen({ view, onMove }) {
  const { meters } = view;
  const isPlaying = view.status === 'playing';

  const newest = view.inbox.length > 0 ? view.inbox[view.inbox.length - 1] : null;
  const warning = newest ? WARNING_INFO[newest.warning] : null;

  const lastLog = view.log.length > 0 ? view.log[view.log.length - 1] : null;

  return (
    <div className={`astronaut-screen world-${view.world}`}>
      <header className="astronaut-screen__header">
        <h1 className="astronaut-screen__title">{WORLD_NAMES[view.world]}</h1>
        <p className="astronaut-screen__turn">{turnText(view)}</p>
      </header>

      <Panel className="astronaut-screen__meters">
        <Meter icon="⚡" label="Power" tone="power" value={meters.power} max={100} />
        <Meter icon="🫁" label="Oxygen" tone="oxygen" value={meters.oxygen} max={100} />
        <div className="astronaut-screen__radiation">
          <Meter
            icon="☢️"
            label="Storm radiation budget"
            tone="radiation"
            value={meters.radiationDose}
            max={view.radiationLimit}
            alertWhen="high"
          />
          <InfoTip>{RADIATION_EXPLAINER}</InfoTip>
        </div>
        <Meter icon="❤️" label="Crew health" tone="health" value={meters.crewHealth} max={100} />
      </Panel>

      <section
        className={`astronaut-screen__message${warning ? ' has-warning' : ''}`}
        role="status"
        aria-live="polite"
      >
        {warning ? (
          <>
            <p className="astronaut-screen__message-from">
              <span aria-hidden="true">📡</span> Mission Control says:
            </p>
            <p className="astronaut-screen__message-text">
              <span className="astronaut-screen__message-icon" aria-hidden="true">
                {warning.icon}
              </span>{' '}
              {warning.label}
            </p>
          </>
        ) : (
          <p className="astronaut-screen__message-empty">
            <span aria-hidden="true">📡</span> No message from Mission Control yet
          </p>
        )}
      </section>

      <section className="astronaut-screen__moves" aria-label="Pick your move">
        <h2 className="astronaut-screen__moves-title">Pick your move</h2>
        <div className="astronaut-screen__buttons">
          {Object.entries(MOVE_INFO).map(([moveKey, info]) => (
            <BigButton
              key={moveKey}
              icon={info.icon}
              label={info.label}
              hint={info.hint}
              disabled={!isPlaying}
              onClick={() => onMove(moveKey)}
            />
          ))}
        </div>
      </section>

      <div className="astronaut-screen__result">
        {lastLog && (
          <p className="astronaut-screen__log">
            <span aria-hidden="true">📝</span> {lastLog.text}
          </p>
        )}
        <WhyCard fact={view.lastFact} />
      </div>
    </div>
  );
}
