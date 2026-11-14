import PixelSprite from './pixel/PixelSprite.jsx';
import { spriteRects } from './pixel/spriteRects.jsx';
import { PORTRAITS } from './pixel/sprites.js';

// A character's face in a pixel frame. The face changes with "mood" and blinks.
//
// Props:
//   who    'nova' (the Astronaut) | 'sola' (Mission Control) | 'blip' (the robot)
//   mood   nova: 'happy' | 'worried' | 'hurt'   sola: 'calm' | 'alert' | 'happy'   blip: 'idle'
//   size   width and height in screen pixels (64 is a good default)
//   label  words for screen readers, e.g. "Nova looks worried". Leave out for decoration.
export default function Portrait({ who, mood, size = 64, label }) {
  const character = PORTRAITS[who];
  if (!character) return null;

  const face = character.frames[mood] ? mood : character.fallback;
  const map = character.frames[face];
  const { blink } = character;
  const canBlink = blink && !blink.skip.includes(face);

  return (
    <span className={`portrait portrait--${who}`} style={{ width: size, height: size }}>
      <PixelSprite map={map} scale={size / map.length} label={label}>
        {canBlink && (
          <g className="portrait__blink">{spriteRects(blink.map, { x: blink.x, y: blink.y, id: 'blink' })}</g>
        )}
      </PixelSprite>
    </span>
  );
}
