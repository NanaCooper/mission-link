// Shared components (owned by Dev 3). Dev 4 may import these but should not change them.
export { default as Meter } from './Meter.jsx';
export { default as BigButton } from './BigButton.jsx';
export { default as Panel } from './Panel.jsx';
export { default as Stars } from './Stars.jsx';
export { default as WhyCard } from './WhyCard.jsx';
export { default as InfoTip } from './InfoTip.jsx';

// Pixel art: characters, icons and speech boxes
export { default as Portrait } from './Portrait.jsx';       // <Portrait who="nova" mood="happy" />
export { default as PixelIcon } from './PixelIcon.jsx';     // <PixelIcon name="shield" />
export { default as SpeechBox } from './SpeechBox.jsx';     // <SpeechBox who="sola" name="Commander Sola" text="..." />
export { default as PixelSprite } from './pixel/PixelSprite.jsx';
