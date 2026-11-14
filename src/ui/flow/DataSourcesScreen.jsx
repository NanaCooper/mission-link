import { BigButton, Panel } from '../components/index.js';
import { FLOW_FACTS } from './facts.js';
import { archivedLabel } from './text.js';
import SpaceWeatherPanel from './SpaceWeatherPanel.jsx';
import './flow.css';

// Where every fact in the game comes from. Judges and teachers can check each one.
//
// Props: { storm, onBack }   storm = getStorm(id)
export default function DataSourcesScreen({ storm, onBack }) {
  const facts = [...(storm?.stages ?? []).map((stage) => stage.fact).filter(Boolean), ...FLOW_FACTS];

  return (
    <main className="flow-screen">
      <h1 className="flow-title">Where our facts come from</h1>
      <p className="flow-lead">
        Everything real in this game comes from NASA. We saved the storm data once, so the game does
        not use live data while you play. Only the box below is live.
      </p>

      <SpaceWeatherPanel />

      {storm && (
        <Panel title="The storm">
          <p className="flow-badge">
            <span aria-hidden="true">🗄️</span> {archivedLabel(storm.savedOn)}
          </p>
          <p>
            <strong>{storm.title}</strong> ({storm.realDates}).{' '}
            {storm.source?.url && (
              <a href={storm.source.url} target="_blank" rel="noopener noreferrer">
                See it in {storm.source.name}
              </a>
            )}
          </p>
          {storm.scalingNote && <p className="flow-small">{storm.scalingNote}</p>}
        </Panel>
      )}

      <Panel title="Facts in the game">
        <ul className="flow-sources">
          {facts.map((fact) => (
            <li key={fact.text}>
              <p>{fact.text}</p>
              <p className="flow-small">
                {fact.source?.url ? (
                  <a href={fact.source.url} target="_blank" rel="noopener noreferrer">
                    {fact.source.name}
                  </a>
                ) : (
                  fact.source?.name
                )}
              </p>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Game numbers">
        <p className="flow-small">
          The meters and the radiation budget are game points we made up to keep the game fair. They
          are not real radiation doses.
        </p>
      </Panel>

      <BigButton icon="⬅️" label="Back" onClick={onBack} />
    </main>
  );
}
