// Pixel icons for the full-screen game's top bar and cards, drawn as text like
// ui/components/pixel/sprites.js. One letter is one square, a dot is see-through.
// The letters are colours from PALETTE in sprites.js.

// Three bars, like the menu button of a game
const menu = [
  'KKKKKKKKK',
  'KWWWWWWWK',
  'KKKKKKKKK',
  'KWWWWWWWK',
  'KKKKKKKKK',
  'KWWWWWWWK',
  'KKKKKKKKK'
];

// A cross, for Close
const close = [
  'WW....WW',
  'WWW..WWW',
  '.WWWWWW.',
  '..WWWW..',
  '..WWWW..',
  '.WWWWWW.',
  'WWW..WWW',
  'WW....WW'
];

// A phone standing up, an arrow, and the same phone lying on its side.
// Each row is three parts (upright phone, arrow, sideways phone) joined by a gap.
const rotateRows = [
  ['KKKKKK', '......', '...........'],
  ['KGGGGK', '......', '...........'],
  ['KGbbGK', '......', '...........'],
  ['KGbbGK', '...Y..', 'KKKKKKKKKKK'],
  ['KGbbGK', '...YY.', 'KGGGGGGGGGK'],
  ['KGbbGK', 'YYYYYY', 'KGbbbbbbbWK'],
  ['KGbbGK', '...YY.', 'KGbbbbbbbWK'],
  ['KGbbGK', '...Y..', 'KGGGGGGGGGK'],
  ['KGGGGK', '......', 'KKKKKKKKKKK'],
  ['KGWWGK', '......', '...........'],
  ['KKKKKK', '......', '...........']
];
const rotate = rotateRows.map((parts) => parts.join('.'));

export const HUD_ICONS = { menu, close, rotate };
