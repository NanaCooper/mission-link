import { spriteRects } from '../components/pixel/spriteRects.jsx';
import { clockFace } from './clock.js';
import './MissionClock.css';

// The signal clock: how long Mission Control has left to send a warning this turn.
// Shows the time, the words, and a note. Colour is never the only signal: the note says
// "Hurry!", "Signal sent", "Signal blocked" or "Clock stopped".
// Shows nothing when no game is being played.
//
// Props: { view, who }   who: 'missionControl' | 'astronaut'

const CLOCK_ICON = [
  '..KKKK..',
  '.KWWWWK.',
  'KWWKWWWK',
  'KWWKWWWK',
  'KWWKKKWK',
  'KWWWWWWK',
  '.KWWWWK.',
  '..KKKK..'
];

const CHECK_ICON = ['......KK', '.....KLK', 'KK..KLK.', 'KLKKLK..', '.KLLK...', '..KK....'];

export default function MissionClock({ view, who }) {
  const face = clockFace(view, who);
  if (!face) return null;

  return (
    <div className={`mission-clock mission-clock--${face.mode}`} role="timer" aria-label={`${face.title}: ${face.time}`}>
      <svg className="mission-clock__icon" viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
        {spriteRects(CLOCK_ICON, { id: 'clock' })}
      </svg>
      <span className="mission-clock__time">{face.time}</span>
      <span className="mission-clock__words">
        <span className="mission-clock__title">{face.title}</span>
        {face.note && (
          <span className="mission-clock__note">
            {face.mode === 'sent' && (
              <svg viewBox="0 0 8 6" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
                {spriteRects(CHECK_ICON, { id: 'check' })}
              </svg>
            )}
            {face.note}
          </span>
        )}
      </span>
    </div>
  );
}
