import PixelSprite from './pixel/PixelSprite.jsx';
import { ICONS } from './pixel/sprites.js';

// A small pixel-art icon, by name (see ICONS in pixel/sprites.js).
//
// Props:
//   name   'power' | 'oxygen' | 'radiation' | 'health' | 'shield' | 'shelter' | 'battery' |
//          'science' | 'storm' | 'clear' | 'signal' | 'noSignal' | 'wind' | 'next' | 'star'
//   size   height in screen pixels
//   label  words for screen readers. Leave out when words sit next to the icon.
export default function PixelIcon({ name, size = 30, label }) {
  const map = ICONS[name];
  if (!map) return null;
  return <PixelSprite className="pixel-icon" map={map} scale={size / map.length} label={label} />;
}
