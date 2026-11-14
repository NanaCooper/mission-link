// The characters you walk around the maps, as pixel sprites (one letter = one square).
// Colours come from PALETTE in components/pixel/sprites.js.
// Each character has a front (walking down, left or right), a back (walking up),
// and three pairs of legs: standing, and two steps that take turns while walking.
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
    }
  }
};
