import PixelSprite from './pixel/PixelSprite.jsx';
import { ICONS, PALETTE } from './pixel/sprites.js';

// An empty star is the same drawing with the yellow swapped for dark grey.
const EMPTY_STAR = { ...PALETTE, Y: PALETTE.k };

// Filled and empty pixel stars, plus a text label like "2 of 3 stars".
//
// Props: { count, max = 3 }
export default function Stars({ count, max = 3 }) {
  const filled = Math.max(0, Math.min(max, Math.round(Number(count) || 0)));

  return (
    <p className="stars">
      <span className="stars__icons" aria-hidden="true">
        {Array.from({ length: max }, (_, index) => {
          const on = index < filled;
          return (
            <span key={index} className={`stars__star ${on ? 'is-on' : 'is-off'}`}>
              <PixelSprite map={ICONS.star} scale={4} palette={on ? undefined : EMPTY_STAR} />
            </span>
          );
        })}
      </span>
      <span className="stars__label">
        {filled} of {max} stars
      </span>
    </p>
  );
}
