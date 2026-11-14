// Pixel art for Mission Link, drawn as text. No image files.
//
// How it works: every sprite is a list of rows. One letter is one square
// ("pixel") and stands for a colour in PALETTE. A dot is see-through.
// PixelSprite.jsx turns these rows into crisp squares at any size.
//
// To change a drawing, edit the letters. Every row in a sprite must have the
// same length (sprites.test.js checks this).

export const PALETTE = {
  K: '#1a1c2c', // ink (outlines)
  k: '#333c57', // dark slate
  g: '#566c86', // slate
  G: '#94b0c2', // light slate
  W: '#f4f4f4', // white
  R: '#b13e53', // dark red
  r: '#f25c6b', // bright red
  O: '#ef7d57', // orange
  Y: '#ffcd75', // yellow
  L: '#a7f070', // light green
  N: '#38b764', // green
  T: '#257179', // teal
  D: '#29366f', // navy
  B: '#3b5dc9', // blue
  b: '#41a6f6', // sky blue
  C: '#73eff7', // cyan
  P: '#5d275d', // plum
  p: '#b57bff', // bright purple
  S: '#b9763f', // Nova's skin
  s: '#93552a', // Nova's skin, shade
  e: '#d98a5f', // Nova's cheeks
  U: '#8a5230', // Sola's skin
  u: '#6b3d22', // Sola's skin, shade
  f: '#a65d3c', // Sola's cheeks
  H: '#2a1a14', // hair
  h: '#4a2f22'  // hair highlight
};

// Swap some rows of a sprite, to make a new face from the same head.
function withRows(base, changes) {
  return base.map((row, index) => changes[index] ?? row);
}

// ---------- Portraits (16 x 16) ----------

const novaHappy = [
  '....KKKKKKKK....',
  '..KKWWWWWWWWKK..',
  '.KWWWWWWWWWWWGK.',
  '.KWWKKKKKKKKWGK.',
  'KWWKHHHHHHHHKWGK',
  'KWWKHSKSSKSHKWGK',
  'KWWKSSKSSKSSKWGK',
  'KWWKSeSSSSeSKWGK',
  'KWWKSKSSSSKSKWGK',
  'KWWKSSKKKKSSKWGK',
  'KWWKsSSSSSSsKWGK',
  '.KWWKKKKKKKKWGK.',
  '..KKWWWWWWGGKK..',
  '.KKOOOOOOOOOOKK.',
  '.KWWWWKCCKWWWGK.',
  'KKWWWWKKKKWWWGKK'
];

const novaWorried = withRows(novaHappy, {
  6: 'KWWKSSKSSKSCKWGK',
  7: 'KWWKSSSSSSSbKWGK',
  8: 'KWWKSSKKKKSSKWGK',
  9: 'KWWKSKSSSSKSKWGK'
});

const novaHurt = withRows(novaHappy, {
  5: 'KWWKHSSSSSSHKWGK',
  6: 'KWWKSKKSSKKSKWGK',
  7: 'KWWKSeSSSSeSKWGK',
  8: 'KWWKSSSKKSSSKWGK',
  9: 'KWWKSSSKKSSSKWGK'
});

const solaCalm = [
  '....HHHHHHHH....',
  '..HHHhHHHHhHHH..',
  '.HHhHHHHHHHHhHH.',
  '.HHHHHHHHHHHHHH.',
  '.HHHUUUUUUUUHHH.',
  '.HHHUUKUUKUUHHH.',
  '.KGKUUKUUKUUKGK.',
  '.KGKUfUUUUfUKGK.',
  '.KGKUKUUUUKUKGK.',
  '.HKHUUKKKKUUHHH.',
  '..HKGUUUUUUUHH..',
  '...HHuUUUUuHH...',
  '.....BuUUuB.....',
  '...BBBBuuBBBB...',
  '..BBBBBBBBBYBB..',
  '.BBBBBBBBBBBBBB.'
];

const solaAlert = withRows(solaCalm, {
  8: '.KGKUUUKKUUUKGK.',
  9: '.HKHUUUKKUUUHHH.'
});

const solaHappy = withRows(solaCalm, {
  8: '.KGKUKKKKKKUKGK.',
  9: '.HKHUUKWWKUUHHH.'
});

const blipIdle = [
  '.......CC.......',
  '.......KK.......',
  '....KKKKKKKK....',
  '...KGGGGGGGGK...',
  '..KGGGGGGGGGGK..',
  '.KKGKKKKKKKKGKK.',
  'KgKGKCCKKCCKGKgK',
  'KgKGKCCKKCCKGKgK',
  '.KKGKKKKKKKKGKK.',
  '..KGKKCKKCKKGK..',
  '..KGKKKCCKKKGK..',
  '..KGGGGGGGGGGK..',
  '...KKKKKKKKKK...',
  '.....KggggK.....',
  '...KKGGYGGGKK...',
  '...KGGGGGGGGK...'
];

// who -> faces. "blink" is a small patch drawn over the eyes for a moment.
export const PORTRAITS = {
  nova: {
    fallback: 'happy',
    frames: { happy: novaHappy, worried: novaWorried, hurt: novaHurt },
    blink: { x: 4, y: 5, map: ['HSSSSSSH', 'SKKSSKKS'], skip: ['hurt'] }
  },
  sola: {
    fallback: 'calm',
    frames: { calm: solaCalm, alert: solaAlert, happy: solaHappy },
    blink: { x: 4, y: 5, map: ['UUUUUUUU', 'UKKUUKKU'], skip: [] }
  },
  blip: {
    fallback: 'idle',
    frames: { idle: blipIdle },
    blink: { x: 5, y: 6, map: ['KKKKKK'], skip: [] }
  }
};

// ---------- Icons (about 10 x 10) ----------

export const ICONS = {
  // Meters
  power: [
    '....KKKK..',
    '...KYYK...',
    '..KYYK....',
    '.KYYKKKK..',
    '.KYYYYYK..',
    '..KKKYYK..',
    '...KYYK...',
    '..KYYK....',
    '.KYK......',
    '.KK.......'
  ],
  oxygen: [
    '...KKKK...',
    '..KbbbbK..',
    '.KbWbbbbK.',
    '.KbWbbbbK.',
    '.KbbbbbbK.',
    '.KbbbbbbK.',
    '..KbbbbK..',
    '...KKKK.KK',
    '.......KbK',
    '........KK'
  ],
  radiation: [
    '.............',
    '...p.....p...',
    '..pp.....pp..',
    '.pppp...pppp.',
    'ppppp...ppppp',
    'pppp.ppp.pppp',
    'pppp.ppp.pppp',
    '.....ppp.....',
    '.............',
    '.....ppp.....',
    '....ppppp....',
    '....ppppp....',
    '....ppppp....'
  ],
  health: [
    '.KKK..KKK.',
    'KrrrKKrrrK',
    'KrWrrrrrrK',
    'KrrrrrrrRK',
    'KrrrrrrrRK',
    '.KrrrrrRK.',
    '..KrrrRK..',
    '...KrRK...',
    '....KK....',
    '..........'
  ],
  // Moves
  shield: [
    'KKKKKKKKKK',
    'KbbbbCCCCK',
    'KbbbbCCCCK',
    'KbbbbCCCCK',
    'KbbbbCCCCK',
    'KbbbbCCCCK',
    '.KbbbCCCK.',
    '.KbbbCCCK.',
    '..KbbCCK..',
    '...KKKK...'
  ],
  shelter: [
    '...KKKK...',
    '..KGGGGK..',
    '.KGGGGGGK.',
    'KGGGGGGGGK',
    'KGGKKKKGGK',
    'KGGKYYKGGK',
    'KGGKYYKGGK',
    'KGGKYYKGGK',
    'KKKKKKKKKK',
    '..........'
  ],
  battery: [
    '...KKKK...',
    '..KKKKKK..',
    '..KLLLLK..',
    '..KLLLLK..',
    '..KKKKKK..',
    '..KNNNNK..',
    '..KNNNNK..',
    '..KKKKKK..',
    '..KNNNNK..',
    '..KKKKKK..'
  ],
  science: [
    '...KKKK...',
    '...KWWK...',
    '...KWWK...',
    '..KWWWWK..',
    '..KWLLWK..',
    '.KWLLLLWK.',
    '.KLLWLLLK.',
    'KLLLLLWLLK',
    'KKKKKKKKKK',
    '..........'
  ],
  // Warnings
  storm: [
    '....YY....',
    '.Y..YY..Y.',
    '..Y....Y..',
    '...OOOO...',
    'YY.OYYO.YY',
    'YY.OYYO.YY',
    '...OOOO...',
    '..Y....Y..',
    '.Y..YY..Y.',
    '....YY....'
  ],
  clear: [
    '..........',
    '........KK',
    '.......KLK',
    '......KLLK',
    'KK...KLLK.',
    'KLK.KLLK..',
    'KLLKLLK...',
    '.KLLLK....',
    '..KLK.....',
    '...K......'
  ],
  // Notes and badges
  signal: [
    '.C......C.',
    'C..C..C..C',
    'C.C....C.C',
    'C.C.WW.C.C',
    'C.C.WW.C.C',
    'C.C....C.C',
    'C..C..C..C',
    '.C..GG..C.',
    '....GG....',
    '...GGGG...'
  ],
  noSignal: [
    'rg......gr',
    'gr.g..g.rg',
    'g.r....r.g',
    'g.grGGrg.g',
    'g.g.rr.g.g',
    'g.g.rr.g.g',
    'g..r..r..g',
    '.gr.GG.rg.',
    '.r..GG..r.',
    'r..GGGG..r'
  ],
  wind: [
    '....OOO...',
    '.......O..',
    'OOOOOOO...',
    '..........',
    'YYYYYYYYY.',
    '..........',
    'OOOOO.....',
    '.....O....',
    '..OOO.....',
    '..........'
  ],
  next: [
    'K...K.....',
    'KK..KK....',
    'KCK.KCK...',
    'KCCKKCCK..',
    'KCCCKCCCK.',
    'KCCKKCCK..',
    'KCK.KCK...',
    'KK..KK....',
    'K...K.....',
    '..........'
  ],
  star: [
    '....KK....',
    '...KYYK...',
    '...KYYK...',
    'KKKKYYKKKK',
    'KYYYYYYYYK',
    '.KYYYYYYK.',
    '..KYYYYK..',
    '.KYYKKYYK.',
    '.KYK..KYK.',
    '.KK....KK.'
  ]
};

// ---------- Scene pieces ----------

export const PIECES = {
  // Nova, standing (10 x 14)
  novaBody: [
    '..KKKKKK..',
    '.KWWWWWWK.',
    'KWGGGGGGWK',
    'KWGSSSSGWK',
    'KWGHSSHGWK',
    'KWWGGGGWWK',
    '.KWWWWWWK.',
    'KKOWWWWOKK',
    'KWKWWCWKWK',
    'KWKWWWWKWK',
    '.KKWWWWKK.',
    '..KWKKWK..',
    '..KWKKWK..',
    '.KKKKKKKK.'
  ],
  // The base: a dome home (24 x 13). Windows are dark; lights are drawn on top.
  dome: [
    '.........KKKKKK.........',
    '.......KKWWWWWWKK.......',
    '.....KKWWWWWWWWWWKK.....',
    '....KWWWWWWWWWWWWWWK....',
    '...KWWWWWWWWWWWWWWWGK...',
    '..KWWWKKKKWWWWKKKKWWGK..',
    '..KWWWKkkKWWWWKkkKWWGK..',
    '.KWWWWKkkKWWWWKkkKWWWGK.',
    '.KWWWWKKKKWWWWKKKKWWWGK.',
    'KWWWWWWWWWKKKKWWWWWWWWGK',
    'KGGGGGGGGGKbbKGGGGGGGGgK',
    'KGGGGGGGGGKbbKGGGGGGGGgK',
    'KKKKKKKKKKKKKKKKKKKKKKKK'
  ],
  mast: [
    '.r.',
    '.K.',
    '.K.',
    'KKK'
  ],
  solarPanel: [
    'KKKKKKKKKKKK',
    'KBBbKBBbKBBK',
    'KBbBKBbBKBbK',
    'KbBBKbBBKbBK',
    'KKKKKKKKKKKK',
    '.....KK.....',
    '.....KK.....',
    '....KKKK....'
  ],
  // A small science robot car
  rover: [
    '...r....',
    '...K....',
    '.KKKKKK.',
    'KGGbbGGK',
    'KKKKKKKK',
    '.KK..KK.'
  ],
  earth: [
    '..bbbb..',
    '.bNNbbb.',
    'bNNNbbWb',
    'bbNbbbbb',
    'bbbbNNbb',
    'bWbbNNNb',
    '.bbbbNb.',
    '..bbbb..'
  ],
  // A cloud of hot gas from the Sun
  gasCloud: [
    '....OOOO....',
    '..OOYYYYOO..',
    '.OYYYYWWYYO.',
    'OYYWWWWWYYYO',
    'OYYYWWWYYYYO',
    '.OYYYYYYYYO.',
    '..OOYYYYOO..',
    '....OOOO....'
  ],
  flare: [
    '....W....',
    '.W..W..W.',
    '..W.Y.W..',
    '...YWY...',
    'WWYWWWYWW',
    '...YWY...',
    '..W.Y.W..',
    '.W..W..W.',
    '....W....'
  ],
  // The base as a tiny dot on the Moon or Mars, seen from far away
  tinyBase: [
    '.KKK.',
    'KWCWK',
    'KKKKK'
  ]
};
