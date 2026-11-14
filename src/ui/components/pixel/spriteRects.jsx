import { PALETTE } from './sprites.js';

// Turn a sprite (rows of letters) into SVG squares.
// Squares of the same colour that sit side by side in a row become one wide
// rectangle, so the page has fewer elements to draw.
//
//   map      the rows of letters
//   x, y     where to put the sprite inside a bigger picture (in pixels of the drawing)
//   palette  letter -> colour
//   id       a short name, so React can tell the squares of two sprites apart
export function spriteRects(map, { x = 0, y = 0, palette = PALETTE, id = 's' } = {}) {
  const rects = [];
  map.forEach((row, rowIndex) => {
    let start = 0;
    while (start < row.length) {
      const letter = row[start];
      let end = start + 1;
      while (end < row.length && row[end] === letter) end += 1;
      const fill = palette[letter];
      if (fill) {
        rects.push(
          <rect
            key={`${id}-${rowIndex}-${start}`}
            x={x + start}
            y={y + rowIndex}
            width={end - start}
            height={1}
            fill={fill}
          />
        );
      }
      start = end;
    }
  });
  return rects;
}

// A filled circle made of pixel rows, for the Sun, the Moon and Mars.
// Returns one rectangle per row.
export function diskRects(centerX, centerY, radius, fill, id = 'd') {
  const rects = [];
  for (let dy = -radius; dy <= radius; dy += 1) {
    const half = Math.round(Math.sqrt(radius * radius - dy * dy));
    if (half > 0) {
      rects.push(
        <rect key={`${id}-${dy}`} x={centerX - half} y={centerY + dy} width={half * 2} height={1} fill={fill} />
      );
    }
  }
  return rects;
}
