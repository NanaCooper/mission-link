import { useEffect, useId, useRef } from 'react';
import { BigButton, Portrait } from '../../components/index.js';
import RotateCard from './RotateCard.jsx';
import { PASS_BACK_LABEL, PASS_READY_LABEL, passCardText } from '../labels.js';
import './hud.css';

// One device: "Pass the device to Nova". Covers the whole screen, so the next kid
// knows it is their turn (and the other player's screen is out of sight).
//
// Props:
//   role     who gets the device: 'astronaut' | 'missionControl'
//   onReady  () => show that player's screen (the one big button)
//   onBack   () => tapped by mistake: stay on this screen
export default function PassCard({ role, onReady, onBack }) {
  const text = passCardText(role);
  const titleId = useId();
  const box = useRef(null);

  // The keyboard starts on the big button.
  useEffect(() => {
    box.current?.querySelector('.big-button')?.focus();
  }, []);

  return (
    <div className={`pass-card pass-card--${role}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div ref={box} className="pass-card__box pixel-box">
        <span className="pass-card__face">
          <Portrait who={text.who} size={96} />
        </span>
        <div className="pass-card__words">
          <h2 id={titleId} className="pass-card__title">
            {text.title}
          </h2>
          <p className="pass-card__text">{text.text}</p>
          <BigButton icon={<Portrait who={text.who} size={32} />} label={PASS_READY_LABEL} hint={text.hint} onClick={onReady} />
          <button type="button" className="screen-tools__button pass-card__back" onClick={onBack}>
            {PASS_BACK_LABEL}
          </button>
        </div>
      </div>
      <RotateCard />
    </div>
  );
}
