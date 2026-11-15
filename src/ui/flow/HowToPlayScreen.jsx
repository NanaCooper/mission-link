import { BigButton, Panel } from '../components/index.js';
import { ALERTS_FACT, BLACKOUT_FACT, MOON_DELAY_FACT } from './facts.js';
import './flow.css';

// Four short steps, one idea each, then why Mars is harder.
//
// Props: { onBack }
const STEPS = [
  {
    icon: '🌍',
    title: 'Mission Control',
    text: 'You are on Earth. You can see the solar storm coming, but you cannot touch the base.'
  },
  {
    icon: '👩‍🚀',
    title: 'Astronaut',
    text: 'You are at the base. You pick one move each turn, but you cannot see the storm.'
  },
  {
    icon: '🗣️',
    title: 'Talk!',
    text: 'Mission Control sends a warning. Say it out loud too. Then the Astronaut picks a move.',
    fact: ALERTS_FACT
  },
  {
    icon: '🌕',
    title: 'Moon, then Mars',
    text: 'The Moon is your practice. On Mars, messages take longer, so Mission Control must warn early.',
    fact: MOON_DELAY_FACT
  }
];

export default function HowToPlayScreen({ onBack }) {
  return (
    <main className="flow-screen">
      <h1 className="flow-title">How to play</h1>

      <ol className="flow-steps">
        {STEPS.map((step) => (
          <li key={step.title} className="flow-step">
            <span className="flow-step__icon" aria-hidden="true">{step.icon}</span>
            <span>
              <strong className="flow-step__title">{step.title}</strong>
              <span className="flow-step__text">{step.text}</span>
              {step.fact && (
                <span className="flow-step__fact flow-small">
                  Real fact: {step.fact.text}{' '}
                  <a href={step.fact.source.url} target="_blank" rel="noopener noreferrer">
                    {step.fact.source.name}
                  </a>
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>

      <Panel title="Survive 3 waves">
        <p>
          The storm comes in 3 waves, and the second is the strongest. Keep power, oxygen and crew
          health up, and keep radiation under the storm budget. Win stars by keeping the crew healthy
          and doing science.
        </p>
      </Panel>

      <Panel title="Why can Mars go quiet?">
        <p>{BLACKOUT_FACT.text}</p>
        <p className="flow-small">
          Source:{' '}
          <a href={BLACKOUT_FACT.source.url} target="_blank" rel="noopener noreferrer">
            {BLACKOUT_FACT.source.name}
          </a>
        </p>
      </Panel>

      <BigButton icon="⬅️" label="Back" onClick={onBack} />
    </main>
  );
}
