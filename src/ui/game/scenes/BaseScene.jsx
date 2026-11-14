import SceneFrame, { SCENE_WIDTH, SCENE_HEIGHT } from './SceneFrame.jsx';
import { spriteRects } from '../../components/pixel/spriteRects.jsx';
import { PIECES, PALETTE } from '../../components/pixel/sprites.js';

// The Astronaut's picture: the base on the Moon or on Mars, with Nova outside.
// The picture shows what Nova did last turn (shield up, lights off, ...).
// It never shows the storm: the Astronaut cannot see it. Only Mission Control can.
//
// Props:
//   world      'moon' | 'mars'
//   lastMove   the Astronaut's last move, or null before the first move
//   lowPower   true when power is low: the base lights flicker
//   turn       the turn number, so the shield "pops" again each time it is raised
//   overlay    optional: HTML shown on top of the picture (name, turn, tags)

const GROUND = 23; // the row where the ground starts

const LOOK = {
  moon: { groundTop: PALETTE.G, ground: PALETTE.g, groundDark: PALETTE.k, name: 'Moon' },
  mars: { groundTop: PALETTE.O, ground: '#b0553a', groundDark: '#7d3626', name: 'Mars' }
};

// [x, y, colour letter, twinkle?]
const STARS = [
  [3, 11, 'G', 0], [6, 3, 'W', 1], [14, 7, 'G', 0], [19, 2, 'W', 0], [27, 5, 'C', 2],
  [40, 8, 'G', 0], [45, 3, 'W', 1], [52, 6, 'G', 0], [60, 2, 'W', 2], [74, 14, 'G', 0], [77, 5, 'W', 1]
];

// Dark and light patches on the ground: [x, y, width, 'dark' | 'light']
const PATCHES = [
  [2, 26, 6, 'dark'], [3, 27, 4, 'dark'], [16, 29, 8, 'dark'], [44, 26, 5, 'dark'],
  [58, 28, 7, 'dark'], [59, 29, 5, 'dark'], [72, 25, 5, 'dark'], [30, 30, 6, 'dark'],
  [10, 25, 3, 'light'], [36, 27, 4, 'light'], [66, 30, 5, 'light'], [50, 30, 3, 'light']
];

// The points of half an oval, for the shield over the base
function arcPoints(centerX, centerY, radiusX, radiusY) {
  const seen = new Set();
  const points = [];
  for (let degrees = 180; degrees <= 360; degrees += 2) {
    const angle = (degrees * Math.PI) / 180;
    const x = Math.round(centerX + radiusX * Math.cos(angle));
    const y = Math.round(centerY + radiusY * Math.sin(angle));
    const key = `${x},${y}`;
    if (!seen.has(key) && y < GROUND && y >= 0) {
      seen.add(key);
      points.push([x, y]);
    }
  }
  return points;
}

const SHIELD_OUTER = arcPoints(31, GROUND, 29, 19);
const SHIELD_INNER = arcPoints(31, GROUND, 27, 17).filter((_, index) => index % 3 === 0);

const WHAT_HAPPENED = {
  raiseShield: 'The shield is up over the base.',
  shelter: 'The crew is safe inside the shelter.',
  savePower: 'The lights are off to save power.',
  doScience: 'Nova is doing science outside.'
};

export default function BaseScene({ world = 'moon', lastMove = null, lowPower = false, turn = 0, overlay }) {
  const look = LOOK[world] ?? LOOK.moon;
  const shielded = lastMove === 'raiseShield';
  const sheltering = lastMove === 'shelter';
  const saving = lastMove === 'savePower';
  const science = lastMove === 'doScience';
  const novaX = science ? 52 : 47;

  const label = `Picture: the ${look.name} base. ${WHAT_HAPPENED[lastMove] ?? 'Nova stands by the base.'}`;

  return (
    <SceneFrame label={label} className={`scene--base scene--${world}`} overlay={overlay}>
      {/* Sky */}
      <rect width={SCENE_WIDTH} height={SCENE_HEIGHT} fill={PALETTE.K} />
      {world === 'mars' && (
        <>
          <rect y={GROUND - 6} width={SCENE_WIDTH} height={3} fill="#2b1d33" />
          <rect y={GROUND - 3} width={SCENE_WIDTH} height={3} fill="#472243" />
        </>
      )}
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

      {/* Earth: big and blue from the Moon, a tiny dot from Mars */}
      {world === 'moon' ? (
        <g>{spriteRects(PIECES.earth, { x: 70, y: 8, id: 'earth' })}</g>
      ) : (
        <>
          <rect x={72} y={10} width={1} height={1} fill={PALETTE.b} className="px-twinkle" />
          <rect x={10} y={9} width={2} height={2} fill={PALETTE.g} />
          <rect x={11} y={9} width={1} height={1} fill={PALETTE.G} />
        </>
      )}

      {/* Ground */}
      <rect y={GROUND} width={SCENE_WIDTH} height={SCENE_HEIGHT - GROUND} fill={look.ground} />
      <rect y={GROUND} width={SCENE_WIDTH} height={1} fill={look.groundTop} />
      {PATCHES.map(([x, y, width, kind]) => (
        <rect
          key={`patch-${x}-${y}`}
          x={x}
          y={y}
          width={width}
          height={1}
          fill={kind === 'dark' ? look.groundDark : look.groundTop}
        />
      ))}

      {/* Solar panel. It sparkles when Nova saves power. */}
      <g>{spriteRects(PIECES.solarPanel, { x: 5, y: GROUND - 8, id: 'panel' })}</g>
      {saving && (
        <>
          <rect x={7} y={GROUND - 7} width={1} height={1} fill={PALETTE.W} className="px-twinkle" />
          <rect x={11} y={GROUND - 6} width={1} height={1} fill={PALETTE.W} className="px-twinkle px-twinkle--late" />
          <rect x={15} y={GROUND - 7} width={1} height={1} fill={PALETTE.W} className="px-blink-fast" />
        </>
      )}

      {/* The base */}
      <g>{spriteRects(PIECES.mast, { x: 31, y: GROUND - 17, id: 'mast' })}</g>
      <rect x={32} y={GROUND - 17} width={1} height={1} fill={PALETTE.K} className="px-blink-slow" />
      <g>{spriteRects(PIECES.dome, { x: 20, y: GROUND - 13, id: 'dome' })}</g>
      {!saving && (
        <g className={lowPower ? 'px-flicker' : undefined}>
          <rect x={27} y={GROUND - 7} width={2} height={2} fill={PALETTE.Y} />
          <rect x={35} y={GROUND - 7} width={2} height={2} fill={PALETTE.Y} />
        </g>
      )}
      {sheltering && (
        <>
          <rect x={31} y={GROUND - 3} width={2} height={2} fill={PALETTE.k} />
          <rect x={31} y={GROUND - 5} width={2} height={1} fill={PALETTE.L} className="px-blink-slow" />
        </>
      )}

      {/* Nova. Inside the shelter she cannot be seen. */}
      {!sheltering && <g className="px-bob">{spriteRects(PIECES.novaBody, { x: novaX, y: GROUND - 14, id: 'nova' })}</g>}

      {/* The science robot car */}
      <g>{spriteRects(PIECES.rover, { x: 64, y: GROUND - 6, id: 'rover' })}</g>
      {science && (
        <>
          <rect x={66} y={GROUND - 9} width={1} height={1} fill={PALETTE.L} className="px-rise" />
          <rect x={69} y={GROUND - 10} width={1} height={1} fill={PALETTE.C} className="px-rise px-rise--late" />
          <rect x={64} y={GROUND - 10} width={1} height={1} fill={PALETTE.Y} className="px-rise px-rise--later" />
        </>
      )}

      {/* The shield: a glowing dome over everything */}
      {shielded && (
        <g key={turn} className="scene__shield">
          {SHIELD_OUTER.map(([x, y]) => (
            <rect key={`so-${x}-${y}`} x={x} y={y} width={1} height={1} fill={PALETTE.C} />
          ))}
          {SHIELD_INNER.map(([x, y]) => (
            <rect key={`si-${x}-${y}`} x={x} y={y} width={1} height={1} fill={PALETTE.b} />
          ))}
        </g>
      )}
    </SceneFrame>
  );
}
