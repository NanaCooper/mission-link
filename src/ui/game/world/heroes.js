// The characters you walk around the maps, as pixel sprites (one letter = one square).
// Colours come from PALETTE in components/pixel/sprites.js.
// Each character has a front (walking down), a back (walking up), a side (walking right;
// the map mirrors it for walking left), and three pairs of legs for the front and back and three
// for the side: standing, and two steps that take turns while walking.
import { PIECES } from '../../components/pixel/sprites.js';

const LEG_ROWS = 3;

// Nova, the Astronaut, in her white space suit (10 x 14)
export const NOVA = {
  name: 'Nova',
  sprites: {
    front: PIECES.novaBody.slice(0, -LEG_ROWS),
    back: [
      '..KKKKKK..',
      '.KWWWWWWK.',
      'KWWWWWWWWK',
      'KWWWWWWWWK',
      'KWWWWWWWGK',
      'KWWWWWWWGK',
      '.KWWWWWWK.',
      'KKOGGGGOKK',
      'KWKGggGKWK',
      'KWKGGGGKWK',
      '.KKWWWWKK.'
    ],
    legs: {
      stand: PIECES.novaBody.slice(-LEG_ROWS),
      stepLeft: ['..KWKKWK..', '.KKK.KWK..', '.....KKKK.'],
      stepRight: ['..KWKKWK..', '..KWK.KKK.', '.KKKK.....']
    },
    // Facing right: the visor on the right, the air pack on her back (left)
    side: [
      '..KKKKKK..',
      '.KWWWWWWK.',
      'KWWWWGGGK.',
      'KWWWGSSGK.',
      'KWWWGHSGK.',
      'KWWWWGGWK.',
      '.KWWWWWK..',
      'KKKWWWWOK.',
      'KGKWWWCWK.',
      'KGKWWWWWK.',
      '.KKWWWWK..'
    ],
    sideLegs: {
      stand: ['...KWWK...', '...KWWK...', '..KKKKKK..'],
      stepLeft: ['..KWK.WK..', '.KWK..KWK.', '.KKK..KKK.'],
      stepRight: ['...KWWK...', '..KWKKWK..', '.KKK.KKK..']
    }
  }
};

// Commander Sola, Mission Control, in a blue jacket with a headset (10 x 14)
export const SOLA = {
  name: 'Commander Sola',
  sprites: {
    front: [
      '..KKKKKK..',
      '.KHHHHHHK.',
      'KHHUUUUHHK',
      'KHUKUUKUHK',
      'KbUUUUUUbK',
      '.KUUffUUK.',
      '..KKUUKK..',
      'KKBBBBBBKK',
      'KBKBBWBKBK',
      'KUKBBBBKUK',
      '.KKDDDDKK.'
    ],
    back: [
      '..KKKKKK..',
      '.KHHHHHHK.',
      'KHHHHHHHHK',
      'KHHHhHHHHK',
      'KbHHHHHHbK',
      '.KHHHHHHK.',
      '..KKUUKK..',
      'KKBBBBBBKK',
      'KBKBBBBKBK',
      'KUKBBBBKUK',
      '.KKDDDDKK.'
    ],
    legs: {
      stand: ['..KDKKDK..', '..KDKKDK..', '.KKKKKKKK.'],
      stepLeft: ['..KDKKDK..', '.KKK.KDK..', '.....KKKK.'],
      stepRight: ['..KDKKDK..', '..KDK.KKK.', '.KKKK.....']
    },
    // Facing right: her face to the right, the headset over her ear
    side: [
      '..KKKKKK..',
      '.KHHHHHHK.',
      'KHHHHUUUK.',
      'KHHHUUKUK.',
      'KbHHUUUUUK',
      '.KHHUUfUK.',
      '..KKUUKK..',
      '.KBBBBBBK.',
      '.KBBBBWBK.',
      '.KBBUUBBK.',
      '..KDDDDK..'
    ],
    sideLegs: {
      stand: ['...KDDK...', '...KDDK...', '..KKKKKK..'],
      stepLeft: ['..KDK.DK..', '.KDK..KDK.', '.KKK..KKK.'],
      stepRight: ['...KDDK...', '..KDKKDK..', '.KKK.KKK..']
    }
  }
};
