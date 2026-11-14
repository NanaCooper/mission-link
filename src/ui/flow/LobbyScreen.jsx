import { BigButton, Panel } from '../components/index.js';
import './flow.css';

// Waiting room for online play.
// Astronaut: shows the code very big while waiting for Mission Control.
// Mission Control: shows "Connecting..." until the Astronaut's game arrives.
// Either side shows an error from the session hook (for example "This room already has two players.").
//
// Props: { code, role = 'astronaut', error, onBack }
export default function LobbyScreen({ code, role = 'astronaut', error, onBack }) {
  const isAstronaut = role === 'astronaut';

  return (
    <main className="flow-screen">
      <Panel title={isAstronaut ? 'Your room code' : 'Joining a room'}>
        <p className="flow-code" aria-label={`Room code ${code}`}>
          {code}
        </p>

        {error ? (
          <p className="flow-error" role="alert">
            <span aria-hidden="true">⚠️</span> {error}
          </p>
        ) : (
          <p className="flow-waiting" role="status">
            <span className="flow-waiting__dot" aria-hidden="true" />
            {isAstronaut
              ? 'Waiting for Mission Control to join...'
              : 'Connecting to the Astronaut...'}
          </p>
        )}

        {isAstronaut && !error && (
          <p className="flow-note">
            Tell Mission Control this code. They tap Join a room on their device and type it in.
          </p>
        )}
      </Panel>

      {onBack && (
        <BigButton icon="🏠" label="Back to home" onClick={onBack} />
      )}
    </main>
  );
}
