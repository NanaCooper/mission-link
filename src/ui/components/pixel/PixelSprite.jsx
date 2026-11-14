import { spriteRects } from './spriteRects.jsx';

// Draws one sprite as a crisp SVG picture.
//
// Props:
//   map       rows of letters (see sprites.js)
//   scale     how many screen pixels one square takes (4 = four times bigger)
//   label     words for screen readers. Leave out for decoration.
//   palette   optional: other colours for the letters
//   children  optional: extra SVG drawn on top (used for blinking eyes)
export default function PixelSprite({ map, scale = 4, label, palette, className = '', children }) {
  const width = map[0].length;
  const height = map.length;

  return (
    <svg
      className={`pixel-sprite ${className}`.trim()}
      viewBox={`0 0 ${width} ${height}`}
      width={width * scale}
      height={height * scale}
      shapeRendering="crispEdges"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      focusable="false"
    >
      {spriteRects(map, { palette })}
      {children}
    </svg>
  );
}
