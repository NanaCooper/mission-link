import { BigButton, Panel } from '../components/index.js';
import { PEAK_RULE, FADE_RULE } from '../../realtime/engineAdapter.js';
import { FLOW_FACTS } from './facts.js';
import { archivedLabel } from './text.js';
import './flow.css';

// Where every fact in the game comes from, and how the real NASA numbers became game points.
// Judges and teachers can check each one.
//
// Props: { storm, storms, onBack }
//   storm   the storm this game plays (from inside a game), or
//   storms  every real storm the game can pick (from Home)
export default function DataSourcesScreen({ storm, storms, onBack }) {
  const shown = (storms?.length ? storms : [storm]).filter(Boolean);
  // Each fact once, even when two storms share it
  const seen = new Set();
  const facts = [...shown.flatMap((s) => (s.stages ?? []).map((stage) => stage.fact)), ...FLOW_FACTS].filter(
    (fact) => fact?.text && !seen.has(fact.text) && seen.add(fact.text)
  );

  return (
    <main className="flow-screen">
      <h1 className="flow-title">Where our facts come from</h1>
      <p className="flow-lead">
        Everything real in this game comes from NASA. We saved the data once, so the game does not
        use live data while you play.
      </p>

      {shown.length > 0 && (
        <Panel title={shown.length > 1 ? 'The real storms' : 'The storm'}>
          <p className="flow-badge">
            <span aria-hidden="true">🗄️</span> {archivedLabel(shown[0].savedOn)}
          </p>
          {shown.length > 1 && <p>Every new game picks one of these real storms.</p>}
          <ul className="flow-list">
            {shown.map((s) => (
              <li key={s.id}>
                <strong>{s.title}</strong> ({s.realDates}).{' '}
                {s.source?.url && (
                  <a href={s.source.url} target="_blank" rel="noopener noreferrer">
                    See it in {s.source.name}
                  </a>
                )}
              </li>
            ))}
          </ul>
          {shown[0].scalingNote && <p className="flow-small">{shown[0].scalingNote}</p>}
        </Panel>
      )}

      <Panel title="From NASA data to the game" className="flow-from-data">
        <p>NASA measured the real storm. We turned some of its numbers into game points. Here is how.</p>
        <dl className="flow-rules">
          <dt>How big the flare was</dt>
          <dd>
            NASA gives each flare a class, like M8.1 or X5.8. X flares are the strongest. In the game, the class
            sets how hard the strongest wave hits:{' '}
            {PEAK_RULE.map((r) => `${r.flare}: ${r.points} points`).join(', ')}.
          </dd>
          <dd className="flow-rules__note">
            Simplified: the class tells how big the flash was. It is not the radiation an astronaut gets.
          </dd>

          <dt>How fast the cloud of gas flew</dt>
          <dd>
            NASA measured its speed in km per second. In the game, the speed sets how hard the last wave hits:{' '}
            {FADE_RULE.map((r) => `${r.speed}: ${r.points} points`).join(', ')}.
          </dd>
          <dd className="flow-rules__note">
            Simplified: in real life the radiation depends on much more than speed, like where the cloud goes.
          </dd>

          <dt>When the fast particles arrived</dt>
          <dd>
            Satellites saw them at real times. The game uses them for the order of the waves, and shows them in
            &quot;What really happened&quot;.
          </dd>
          <dd className="flow-rules__note">Real: these times are exactly as NASA recorded them.</dd>

          <dt>The radiation bar</dt>
          <dd>
            It counts game points for one storm, out of 40. Real doses are measured in a unit called millisieverts.
          </dd>
          <dd className="flow-rules__note">Made up for the game, to keep it fair. Not a real dose.</dd>

          <dt>Mars</dt>
          <dd>
            The Mars level replays the same real storm as a &quot;what if&quot;. About every two years the Sun
            really blocks messages to Mars for a few weeks. The game puts that on wave 3, so you can feel it.
          </dd>
          <dd className="flow-rules__note">The blackout is real. When it happens in the game is our choice.</dd>
        </dl>
      </Panel>

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
          The other meters (power, oxygen, crew health) and what each move costs are game rules we made
          up to keep the game fair and short. They are not real NASA numbers.
        </p>
      </Panel>

      <BigButton icon="⬅️" label="Back" onClick={onBack} />
    </main>
  );
}
