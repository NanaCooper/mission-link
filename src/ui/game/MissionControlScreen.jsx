import { Meter, BigButton, Panel, WhyCard } from '../components/index.js';
import { WARNING_INFO, MOVE_INFO, MARS_DELAY_NOTE, turnText } from './labels.js';
import './MissionControlScreen.css';

// Mission Control on Earth: sees the storm, cannot act, can only send a warning.
// Props only (no session hook, no engine): { view, onWarn }
//   view    the Mission Control view (see src/ui/DEV3_PLAN.md)
//   onWarn  called with a warning key, e.g. onWarn('shelterNow')
// Mission Control must NOT see power, oxygen or radiation. Only crew health.
export default function MissionControlScreen({ view, onWarn }) {
  const { stage } = view;
  const playing = view.status === 'playing';
  const lastMove = view.lastMove ? MOVE_INFO[view.lastMove] : null;

  return (
    <div className={`mission-control-screen world-${view.world}`}>
      <header className="mc-header">
        <h2 className="mc-header__title">
          <span aria-hidden="true">🌍</span> Mission Control, Earth
        </h2>
        <p className="mc-header__turn">{turnText(view)}</p>
      </header>

      <Panel className="mc-storm">
        <p className="mc-storm__kicker">
          <span aria-hidden="true">☀️</span> Storm right now
        </p>
        <div className="mc-storm__row">
          <p className="mc-storm__stage">{stage.label}</p>
          {stage.dust && (
            <span className="mc-badge">
              <span aria-hidden="true">🌪️</span> Dust storm
            </span>
          )}
        </div>
        <p className="mc-storm__sees">{stage.missionControlSees}</p>
        <p className="mc-storm__next">
          <span aria-hidden="true">🔭</span>{' '}
          {view.forecast ? `Coming next: ${view.forecast}` : 'This is the last turn'}
        </p>
      </Panel>

      <Panel className="mc-crew">
        <p className="mc-crew__move">
          <span aria-hidden="true">{lastMove ? lastMove.icon : '⏳'}</span>{' '}
          {lastMove ? `Astronaut's last move: ${lastMove.label}` : 'No move yet'}
        </p>
        <Meter icon="❤️" label="Crew health" tone="health" value={view.crewHealth} max={100} />
      </Panel>

      <section className="mc-warn" aria-label="Send a warning">
        <h3 className="mc-warn__title">Send a warning</h3>

        {view.delayTurns === 1 && (
          <p className="mc-delay" role="note">
            <span className="mc-delay__icon" aria-hidden="true">📡</span>
            <span>{MARS_DELAY_NOTE}</span>
          </p>
        )}

        <div className="mc-warn__buttons">
          {Object.entries(WARNING_INFO).map(([warningKey, info]) => (
            <BigButton
              key={warningKey}
              icon={info.icon}
              label={info.label}
              onClick={() => onWarn(warningKey)}
              disabled={!playing}
              selected={warningKey === view.warningThisTurn}
            />
          ))}
        </div>
      </section>

      <WhyCard fact={view.lastFact} />
    </div>
  );
}
