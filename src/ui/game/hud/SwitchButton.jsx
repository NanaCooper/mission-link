import { Portrait } from '../../components/index.js';
import { CHARACTERS, ROLE_NAMES, SWITCH_PREFIX, YOUR_TURN_TEXT } from '../labels.js';

// One device: the top-bar button that hands the device to the other player.
// It flashes when it is the other player's turn (that only changes the look, never the rules).
//
// Props:
//   to       who gets the device: 'astronaut' | 'missionControl'
//   nudged   true = flash, "your turn"
//   onClick  () => start the hand-over
export default function SwitchButton({ to, nudged = false, onClick }) {
  const who = to === 'astronaut' ? CHARACTERS.astronaut.who : CHARACTERS.director.who;
  return (
    <button type="button" className={`hud-switch${nudged ? ' is-nudged' : ''}`} onClick={onClick}>
      <Portrait who={who} size={28} />
      <span className="hud-switch__words">
        <span className="hud-switch__prefix">{SWITCH_PREFIX}</span>{' '}
        <span className="hud-switch__name">{ROLE_NAMES[to]}</span>
        {nudged && <span className="visually-hidden"> {YOUR_TURN_TEXT}</span>}
      </span>
      {nudged && (
        <span className="hud-badge" aria-hidden="true">
          !
        </span>
      )}
    </button>
  );
}
