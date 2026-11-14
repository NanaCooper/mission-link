import PixelSprite from '../../components/pixel/PixelSprite.jsx';
import { HUD_ICONS } from './hudIcons.js';

// A pixel icon for the top bar and the cards: 'menu' | 'close' | 'rotate' (see hudIcons.js).
//   size   height in screen pixels
//   label  words for screen readers. Leave out when words sit next to the icon.
export default function HudIcon({ name, size = 20, label }) {
  const map = HUD_ICONS[name];
  if (!map) return null;
  return <PixelSprite className="pixel-icon hud-icon" map={map} scale={size / map.length} label={label} />;
}
