import { BigButton, Panel } from '../components/index.js';
import './flow.css';

// For teachers and club leaders: what the game teaches, how to run it with a group, and questions
// to talk about afterwards. Plain text only: no game rules, no new facts (the facts live in facts.js
// and the storm files, each with its NASA source).
//
// Props: { onBack, onDataSources }

export const TEACHES = [
  'Every choice costs something: protecting the crew uses power or wears them out.',
  'Resources are linked: when the power runs out, the air runs low too.',
  'Mission Control and astronauts depend on each other: one sees, the other acts.',
  'Distance changes everything: on Mars, messages arrive late, so you must plan ahead.',
  'The storms are real: two solar storms recorded by NASA, with every source linked.'
];

export const HOW_TO_RUN = [
  'Pair the players. One is Mission Control, one is the Astronaut. One device or two both work.',
  'Play the Moon level first (about 5 minutes). It is the practice round.',
  'Swap jobs, then fly to Mars. Now the warnings arrive one wave late.',
  'Read the Mission debrief together at the end, then talk (questions below).',
  'Short on devices? Play alone: Commander Sola sends the warnings, and the group can advise the player.'
];

export const QUESTIONS = [
  'Mission Control could see the storm but not act. The Astronaut could act but not see. How did you share what you knew?',
  'Which move did you use most? What did it cost you?',
  'Was there a wave where a move looked safe but caused trouble later?',
  'Why was Mars harder? What did Mission Control have to do differently?',
  'If you planned a real Moon base, what would you protect first: power, air or the crew? Why?'
];

export default function TeacherScreen({ onBack, onDataSources }) {
  return (
    <main className="flow-screen">
      <h1 className="flow-title">For teachers</h1>
      <p className="flow-lead">
        Mission Link is a short game for ages 7 to 12. Two players keep a Moon base, then a Mars base, safe during
        a real solar storm. No accounts, nothing to install.
      </p>

      <Panel title="What it teaches">
        <ul className="flow-list">
          {TEACHES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Panel>

      <Panel title="How to run it (about 20 minutes)">
        <ol className="flow-list">
          {HOW_TO_RUN.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </Panel>

      <Panel title="Questions to talk about">
        <ol className="flow-list">
          {QUESTIONS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </Panel>

      <Panel title="Where the science comes from">
        <p>
          The storms come from NASA&apos;s space weather database, DONKI. Every fact in the game links to the NASA
          page it came from. The meters are simplified game points, not real radiation doses.
        </p>
        {onDataSources && (
          <button type="button" className="flow-link" onClick={onDataSources}>
            <span aria-hidden="true">🛰️</span> See every source
          </button>
        )}
      </Panel>

      <BigButton icon="⬅️" label="Back" onClick={onBack} />
    </main>
  );
}
