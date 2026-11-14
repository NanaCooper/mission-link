// Extra things on the two maps (not places you use, just there to make the world feel alive),
// as pixel sprites: one letter = one square, colours from PALETTE in components/pixel/sprites.js.
// Every row of a sprite has the same length (props.test.js checks it).

// ---------- On the Moon / Mars base ----------

// A radio dish that keeps the base in touch with Earth (10 x 11)
export const ANTENNA = [
  '.KKKKK....',
  'KGGGGGK...',
  'KGWWWGK...',
  '.KGGGK.K..',
  '..KKK.K...',
  '....KK....',
  '....KK....',
  '....KK....',
  '...KGGK...',
  '..KGGGGK..',
  '..KKKKKK..'
];

// A mission flag on a pole, in two frames so it waves (8 x 12)
export const FLAG_A = [
  'K.......',
  'KCCCCC..',
  'KCWWCCC.',
  'KCCCCC..',
  'K.......',
  'K.......',
  'K.......',
  'K.......',
  'K.......',
  'K.......',
  'KK......',
  'KKK.....'
];
export const FLAG_B = [
  'K.......',
  'KCCCC...',
  'KCWWCCCC',
  'KCCCCCC.',
  'K.......',
  'K.......',
  'K.......',
  'K.......',
  'K.......',
  'K.......',
  'KK......',
  'KKK.....'
];

// The little lander that brought the crew (24 x 12)
export const LANDER = [
  '.........KKKKKK.........',
  '........KYYYYYYK........',
  '.......KYOOYYOOYK.......',
  '.......KYYYYYYYYK.......',
  '......KKKKKKKKKKKK......',
  '.....KGGGGGGGGGGGGK.....',
  '.....KGkGGGGGGGGkGK.....',
  '.....KKKKKKKKKKKKKK.....',
  '....K.K..........K.K....',
  '...K...K........K...K...',
  '..K.....K......K.....K..',
  '.KKK...KKK....KKK...KKK.'
];

// Supply crates (12 x 10)
export const CRATES = [
  '...KKKKKK...',
  '...KOOOOK...',
  '...KOKKOK...',
  '...KOOOOK...',
  'KKKKKKKKKKKK',
  'KOOOOKKOOOOK',
  'KOKKOKKOKKOK',
  'KOOOOKKOOOOK',
  'KOOOOKKOOOOK',
  'KKKKKKKKKKKK'
];

// BLIP, the base robot, rolling around (8 x 9). Two frames for the wheels.
export const BLIP_BOT_A = [
  '...C....',
  '...K....',
  '.KKKKKK.',
  'KGGGGGGK',
  'KGCKKCGK',
  'KGGGGGGK',
  '.KKKKKK.',
  '.KgKKgK.',
  '..K..K..'
];
export const BLIP_BOT_B = [
  '...C....',
  '...K....',
  '.KKKKKK.',
  'KGGGGGGK',
  'KGCKKCGK',
  'KGGGGGGK',
  '.KKKKKK.',
  '.KKgKKg.',
  '...K..K.'
];

// A satellite crossing the sky (9 x 5)
export const SATELLITE = [
  'BB.....BB',
  'BBKKKKKBB',
  'BBKWWWKBB',
  'BBKKKKKBB',
  'BB.....BB'
];

// ---------- In the control room ----------

// A water cooler (8 x 12)
export const COOLER = [
  '..KKKK..',
  '.KbbbbK.',
  '.KbCbbK.',
  '.KbbbbK.',
  '..KKKK..',
  '.KWWWWK.',
  '.KWrbWK.',
  '.KWWWWK.',
  '.KWWWWK.',
  '.KWWWWK.',
  '.KWWWWK.',
  '.KKKKKK.'
];

// A computer rack (10 x 14). Its lights are drawn on top and blink.
export const SERVER = [
  'KKKKKKKKKK',
  'KkkkkkkkkK',
  'KkKKKKKKkK',
  'KkkkkkkkkK',
  'KkKKKKKKkK',
  'KkkkkkkkkK',
  'KkKKKKKKkK',
  'KkkkkkkkkK',
  'KkKKKKKKkK',
  'KkkkkkkkkK',
  'KkKKKKKKkK',
  'KkkkkkkkkK',
  'KKKKKKKKKK',
  '.KK....KK.'
];

// A desk, seen from the front (24 x 8)
export const DESK = [
  'KKKKKKKKKKKKKKKKKKKKKKKK',
  'KOOOOOOOOOOOOOOOOOOOOOOK',
  'KOOOOOOOOOOOOOOOOOOOOOOK',
  'KKKKKKKKKKKKKKKKKKKKKKKK',
  '.KK..................KK.',
  '.KK..................KK.',
  '.KK..................KK.',
  '.KK..................KK.'
];

// The back of a computer screen on the desk (6 x 5)
export const SCREEN_BACK = ['KKKKKK', 'KkkkkK', 'KkkkkK', 'KKKKKK', '..KK..'];

// The flight engineer at the desk, head and shoulders (10 x 8), in a green shirt
export const ENGINEER = [
  '..KKKKKK..',
  '.KhhhhhhK.',
  'KhhUUUUhhK',
  'KhUKUUKUhK',
  '.KUUUUUUK.',
  '..KKUUKK..',
  'KKLLLLLLKK',
  'KLLLLLLLLK'
];
