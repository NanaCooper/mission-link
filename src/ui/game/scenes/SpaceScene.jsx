import SceneFrame, { SCENE_WIDTH, SCENE_HEIGHT } from './SceneFrame.jsx';
import { spriteRects, diskRects } from '../../components/pixel/spriteRects.jsx';
import { PIECES, PALETTE } from '../../components/pixel/sprites.js';
import { stormLook } from './stormLook.js';

// Mission Control's picture: the Sun on the left, the base far away on the right,
// and Earth in between. The storm grows and fades with the turns.
// Only Mission Control sees this. The Astronaut's picture never shows the storm.
//
// Props:
//   world      'moon' | 'mars'
//   turn       the turn number, counted from 0 (it picks how wild the Sun looks)
//   stageName  the storm stage in words, for screen readers
//   dust       true on the Mars dust stage: a dust haze covers Mars
//   blackout   true when the Sun blocks the signal: the line from Earth is cut
//   messageSent  true once Mission Control has sent a warning this turn: the line lights up
//                and a message packet travels from Earth to the base
//   overlay    optional: HTML shown on top of the picture (title, tags)

// The message packet that travels along the line (3 x 3)
const MESSAGE_PACKET = ['CCC', 'CWC', 'CCC'];

// How many particles fly for each look of the storm (see stormLook.js)
const PARTICLE_COUNT = { quiet: 0, flare: 3, cloud: 6, peak: 18, fading: 7, clear: 0 };
const CLOUD_X = { cloud: 15, peak: 24, fading: 36 };

const SUN_X = -4;
const SUN_Y = 16;
const PLANET_X = 86;
const PLANET_Y = 16;
const SIGNAL_ROW = 23;   // the row the message from Earth travels along
const BASE_X = 68;       // where the base sits, on the edge of the Moon or Mars

const PLANET = {
  moon: { name: 'Moon', fill: PALETTE.G, shade: PALETTE.g, earthX: 46 },
  mars: { name: 'Mars', fill: PALETTE.O, shade: '#b0553a', earthX: 22 }
};

const STARS = [
  [18, 3, 'G', 0], [25, 28, 'W', 1], [31, 6, 'W', 0], [38, 2, 'G', 2], [43, 29, 'G', 0],
  [52, 4, 'W', 1], [58, 11, 'G', 0], [63, 2, 'C', 2], [66, 29, 'W', 0], [36, 14, 'G', 0]
];

// A fixed spread that looks random but is the same every time.
function particle(index) {
  return {
    y: 4 + ((index * 7) % 24),
    duration: 1.3 + ((index * 5) % 7) * 0.2,
    delay: -(((index * 11) % 20) / 8),
    fill: [PALETTE.W, PALETTE.Y, PALETTE.C][index % 3]
  };
}

export default function SpaceScene({
  world = 'moon',
  turn = 0,
  stageName = '',
  dust = false,
  blackout = false,
  messageSent = false,
  overlay
}) {
  const planet = PLANET[world] ?? PLANET.moon;
  const sending = messageSent && !blackout;
  const signalTiming = world === 'mars' ? '3.2s' : '0.9s';
  const look = stormLook(turn);
  const particles = Array.from({ length: PARTICLE_COUNT[look] }, (_, index) => particle(index));
  const cloudX = CLOUD_X[look];

  const signalStart = planet.earthX + 10;
  const signalDots = [];
  for (let x = signalStart; x < BASE_X - 1; x += 2) signalDots.push(x);

  const label = [
    `Picture: the Sun on the left, Earth in the middle, and the ${planet.name} base on the right.`,
    stageName,
    sending ? 'A message is on its way to the base.' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <SceneFrame label={label} className={`scene--space scene--${world}`} overlay={overlay}>
      <rect width={SCENE_WIDTH} height={SCENE_HEIGHT} fill={PALETTE.K} />
      {STARS.map(([x, y, letter, twinkle]) => (
        <rect
          key={`star-${x}-${y}`}
          x={x}
          y={y}
          width={1}
          height={1}
          fill={PALETTE[letter]}
          className={twinkle === 1 ? 'px-twinkle' : twinkle === 2 ? 'px-twinkle px-twinkle--late' : undefined}
        />
      ))}

      {/* The Sun: three circles, one inside the other, with dark sunspots */}
      {diskRects(SUN_X, SUN_Y, 17, PALETTE.O, 'sun-a')}
      {diskRects(SUN_X, SUN_Y, 14, PALETTE.Y, 'sun-b')}
      {diskRects(SUN_X - 1, SUN_Y, 10, '#ffe9a8', 'sun-c')}
      <rect x={6} y={12} width={2} height={1} fill={PALETTE.O} />
      <rect x={7} y={20} width={2} height={2} fill={PALETTE.O} />
      <rect x={14} y={10} width={1} height={1} fill={PALETTE.Y} className="px-twinkle" />
      <rect x={14} y={22} width={1} height={1} fill={PALETTE.Y} className="px-twinkle px-twinkle--late" />
      <rect x={15} y={16} width={1} height={1} fill={PALETTE.O} className="px-twinkle" />

      {/* A flare: a bright flash on the Sun */}
      {look === 'flare' && (
        <g className="scene__flare px-blink-fast">{spriteRects(PIECES.flare, { x: 8, y: 9, id: 'flare' })}</g>
      )}

      {/* The cloud of hot gas, moving away from the Sun */}
      {cloudX !== undefined && (
        <g className="scene__cloud px-drift">{spriteRects(PIECES.gasCloud, { x: cloudX, y: 9, id: 'cloud' })}</g>
      )}

      {/* Earth, and the message line from Earth to the base */}
      <g>{spriteRects(PIECES.earth, { x: planet.earthX, y: SIGNAL_ROW - 4, id: 'earth' })}</g>
      {signalDots.map((x) => (
        <rect
          key={`dot-${x}`}
          x={x}
          y={SIGNAL_ROW}
          width={1}
          height={1}
          fill={blackout ? PALETTE.R : sending ? PALETTE.b : PALETTE.g}
        />
      ))}
      {blackout && (
        <g className="scene__cut px-blink-slow">
          {spriteRects(['r.r', '.r.', 'r.r'], { x: Math.round((signalStart + BASE_X) / 2) - 1, y: SIGNAL_ROW - 1, id: 'cut' })}
        </g>
      )}
      {/* No warning sent yet: a small dot shows the line is open. */}
      {!blackout && !sending && (
        <rect
          x={signalStart}
          y={SIGNAL_ROW}
          width={2}
          height={1}
          fill={PALETTE.C}
          className="px-signal"
          style={{ '--fly': `${BASE_X - signalStart - 2}px`, '--dur': signalTiming }}
        />
      )}
      {/* Warning sent: a bigger message packet travels to the base. Slowly to Mars. */}
      {sending && (
        <g
          className="px-signal scene__message"
          style={{ '--fly': `${BASE_X - signalStart - 3}px`, '--dur': signalTiming }}
        >
          {spriteRects(MESSAGE_PACKET, { x: signalStart, y: SIGNAL_ROW - 1, id: 'message' })}
        </g>
      )}

      {/* The Moon or Mars, with the tiny base on its edge */}
      {diskRects(PLANET_X, PLANET_Y, 16, planet.fill, 'planet')}
      <rect x={74} y={9} width={3} height={1} fill={planet.shade} />
      <rect x={76} y={15} width={2} height={2} fill={planet.shade} />
      <rect x={73} y={26} width={4} height={1} fill={planet.shade} />
      <rect x={78} y={21} width={2} height={1} fill={planet.shade} />
      {world === 'mars' && <rect x={77} y={2} width={3} height={1} fill={PALETTE.W} />}
      {dust && (
        <g className="scene__haze px-drift">
          <rect x={69} y={7} width={11} height={1} fill="#e8b07a" />
          <rect x={71} y={11} width={9} height={1} fill="#ffcd75" />
          <rect x={70} y={14} width={8} height={1} fill="#e8b07a" />
          <rect x={72} y={18} width={8} height={1} fill="#ffcd75" />
          <rect x={69} y={26} width={10} height={1} fill="#e8b07a" />
          <rect x={72} y={29} width={8} height={1} fill="#ffcd75" />
        </g>
      )}
      <g>{spriteRects(PIECES.tinyBase, { x: BASE_X, y: SIGNAL_ROW - 2, id: 'base' })}</g>
      <rect x={BASE_X + 2} y={SIGNAL_ROW - 1} width={1} height={1} fill={PALETTE.W} className="px-blink-slow" />

      {/* Particles from the Sun fly toward the base. More of them when the storm is strong. */}
      {particles.map((item, index) => (
        <rect
          key={`particle-${index}`}
          x={14}
          y={item.y}
          width={2}
          height={1}
          fill={item.fill}
          className="px-fly"
          style={{ '--dur': `${item.duration}s`, '--delay': `${item.delay}s` }}
        />
      ))}

      {/* At the peak, the base is being hit */}
      {look === 'peak' && (
        <g className="px-blink-fast">
          <rect x={BASE_X - 2} y={SIGNAL_ROW - 4} width={1} height={1} fill={PALETTE.r} />
          <rect x={BASE_X - 1} y={SIGNAL_ROW + 2} width={1} height={1} fill={PALETTE.r} />
          <rect x={BASE_X + 1} y={SIGNAL_ROW - 5} width={1} height={1} fill={PALETTE.Y} />
          <rect x={BASE_X - 3} y={SIGNAL_ROW - 1} width={1} height={1} fill={PALETTE.Y} />
        </g>
      )}
    </SceneFrame>
  );
}
