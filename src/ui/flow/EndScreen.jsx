import { BigButton, Panel, Stars } from '../components/index.js';
import { MARS_FACT } from './facts.js';
import { LOST_REASON_TEXT, WORLD_NAMES, archivedLabel, crates } from './text.js';
import { missionDebrief } from './debrief.js';
import './flow.css';

// The end of a level: win or lose, stars, what really happened, and what to do next.
//
// Props:
//   view          an engine view (Astronaut or Mission Control): needs status, world, lostReason, stars
//   storm         getStorm(state.stormId): title, whatReallyHappened, scalingNote, savedOn, source
//   canContinue   true for the player who chooses next (the Astronaut online, anyone in split mode)
//   crew          optional: getAstronautView(state), for the mission debrief (both players get it,
//                 so Mission Control also sees what the Astronaut's choices did)
//   missionControl optional: getMissionControlView(state), for Mission Control's score in the debrief
//   onNextLevel(stars)   Fly to Mars, passing the Moon stars won
//   onPlayAgain(), onHome(), onDataSources()
export default function EndScreen({
  view,
  storm,
  canContinue = true,
  crew,
  missionControl = null,
  onNextLevel,
  onPlayAgain,
  onHome,
  onDataSources
}) {
  const won = view.status === 'won';
  const onMars = view.world === 'mars';
  const world = WORLD_NAMES[view.world] ?? WORLD_NAMES.moon;

  let headline;
  if (won && onMars) headline = 'Mission complete: Earth, Moon and Mars!';
  else if (won) headline = `You kept the ${world.name} safe!`;
  else headline = `The ${world.name} did not make it.`;

  const reason = !won ? LOST_REASON_TEXT[view.lostReason] : null;
  const flyToMars = won && !onMars && canContinue;
  const debrief = missionDebrief({ crew, missionControl });

  return (
    <main className={`flow-screen world-${view.world ?? 'moon'}`}>
      <Panel className={`flow-result ${won ? 'flow-result--won' : 'flow-result--lost'}`}>
        <p className="flow-result__icon" aria-hidden="true">{won ? '🏆' : '💥'}</p>
        <h1 className="flow-result__title">{headline}</h1>
        {reason && <p className="flow-result__reason">{reason}</p>}
        <Stars count={won ? view.stars : 0} />
        {flyToMars && view.stars > 0 && (
          <p className="flow-note">
            Your {view.stars === 1 ? 'star becomes' : 'stars become'} {crates(view.stars)} waiting
            for you on Mars.
          </p>
        )}
      </Panel>

      <div className="flow-stack">
        {canContinue ? (
          <>
            {flyToMars && (
              <BigButton
                icon="🔴"
                label="Fly to Mars"
                hint="Level 2: messages from Earth arrive one wave late."
                onClick={() => onNextLevel?.(view.stars)}
              />
            )}
            <BigButton
              icon="🔁"
              label={`Play the ${world.name} again`}
              onClick={onPlayAgain}
            />
          </>
        ) : (
          <p className="flow-waiting" role="status">
            <span className="flow-waiting__dot" aria-hidden="true" />
            Waiting for the Astronaut to choose what is next...
          </p>
        )}
        <BigButton icon="🏠" label="Back to home" onClick={onHome} />
      </div>

      {debrief && (
        <Panel title="Mission debrief" className="flow-debrief">
          <h3 className="flow-debrief__title">{debrief.whyTitle}</h3>
          <ul className="flow-list">
            {debrief.why.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>

          {debrief.team && (
            <>
              <h3 className="flow-debrief__title">Mission Control</h3>
              <p>
                <strong>{debrief.team.rating}</strong> {debrief.team.line}
              </p>
              {debrief.team.linked && <p>{debrief.team.linked}</p>}
            </>
          )}

          <h3 className="flow-debrief__title">What you learned</h3>
          <ul className="flow-list">
            {debrief.learned.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>

          <h3 className="flow-debrief__title">Try this next time</h3>
          <p className="flow-debrief__try">{debrief.tryNext}</p>
        </Panel>
      )}

      {storm && (
        <Panel title="What really happened">
          <p className="flow-badge">
            <span aria-hidden="true">🗄️</span> {archivedLabel(storm.savedOn)}
          </p>
          <h2 className="flow-subtitle">{storm.title}</h2>
          <ul className="flow-list">
            {storm.whatReallyHappened.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {storm.scalingNote && <p className="flow-small">{storm.scalingNote}</p>}
          <p className="flow-small">
            Storm data:{' '}
            {storm.source?.url ? (
              <a href={storm.source.url} target="_blank" rel="noopener noreferrer">
                {storm.source.name}
              </a>
            ) : (
              storm.source?.name
            )}
          </p>
        </Panel>
      )}

      {onMars && (
        <Panel title="This really happened on Mars">
          <p>{MARS_FACT.text}</p>
          <p className="flow-small">
            Source:{' '}
            <a href={MARS_FACT.source.url} target="_blank" rel="noopener noreferrer">
              {MARS_FACT.source.name}
            </a>
          </p>
        </Panel>
      )}

      {onDataSources && (
        <nav className="flow-links" aria-label="More">
          <button type="button" className="flow-link" onClick={onDataSources}>
            <span aria-hidden="true">🛰️</span> Data sources
          </button>
        </nav>
      )}
    </main>
  );
}
