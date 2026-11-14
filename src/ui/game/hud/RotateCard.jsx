import { useId } from 'react';
import HudIcon from './HudIcon.jsx';
import { ROTATE_TEXT, ROTATE_TITLE } from '../labels.js';

// "Turn your phone sideways": covers the game on a touch phone held upright.
// Only CSS decides when it shows (hud.css: pointer coarse + portrait), so the game
// underneath keeps going and keeps its state. Turning the phone makes it go away.
export default function RotateCard() {
  const titleId = useId();
  return (
    <div className="rotate-card" aria-labelledby={titleId}>
      <div className="rotate-card__box pixel-box">
        <span className="rotate-card__icon">
          <HudIcon name="rotate" size={88} />
        </span>
        <h2 id={titleId} className="rotate-card__title">
          {ROTATE_TITLE}
        </h2>
        <p className="rotate-card__text">{ROTATE_TEXT}</p>
      </div>
    </div>
  );
}
