import { useState } from 'react';
import WorldMap from './WorldMap.jsx';
import { useGameNumber } from './useGameNumber.js';
import { moveConfirm } from './dialogs.jsx';
import { placeCorner, TILE } from './worldMap.js';
import { BASE_MAP, BASE_START, PLACE_MOVES, PLACE_NAMES, BIG_HIT } from './baseMapData.js';
import { NOVA } from './heroes.js';
import { spriteRects } from '../../components/pixel/spriteRects.jsx';
import { PIECES, PALETTE } from '../../components/pixel/sprites.js';
import { PixelIcon } from '../../components/index.js';
import { MOVE_INFO } from '../labels.js';

// The Astronaut's map: the Moon or Mars base, seen from above like an old role-playing game.
// Nova walks to a place and uses it to make her move:
//   Solar panel -> Save power   Shelter -> Shelter   Shield tower -> Raise shield   Science rover -> Do science
// The picture also shows what happened last turn (shield up, lights off, Nova inside, radiation flash).
// It never shows the storm: the Astronaut cannot see it. Only Mission Control can.
//
// Props:
//   view     the Astronaut view (getAstronautView)
//   onMove   called with a move key, e.g. onMove('savePower')
//   hit      how much the storm radiation budget went up this turn (0 = no hit)
//   overlay  HTML on top of the picture (name, turn, tags)
//   active   true (default) if this map listens to the keyboard (only the screen on show)

// Where things are, and what each place does, live in baseMapData.js.

const LOOK = {
  moon: { ground: PALETTE.g, light: PALETTE.G, dark: PALETTE.k, name: 'Moon' },
  mars: { ground: '#b0553a', light: PALETTE.O, dark: '#7d3626', name: 'Mars' }
};

const WHAT_HAPPENED = {
  raiseShield: 'The shield is up over the base.',
  shelter: 'The crew is safe inside the shelter.',
  savePower: 'The lights are off to save power.',
  doScience: 'Nova is doing science outside.'
};

// A tall tower with a dish on top: it switches the shield on (6 x 18)
const SHIELD_TOWER = [
  '..rr..',
  '..KK..',
  '.KCCK.',
  '.KCCK.',
  '..KK..',
  '..KK..',
  '..KK..',
  '.KGgK.',
  '.KGgK.',
  '.KGgK.',
  '.KGgK.',
  '.KGgK.',
  'KKGgKK',
  'KGGggK',
  'KGGggK',
  'KGGggK',
  'KGGggK',
  'KKKKKK'
];

const STARS = [
  [4, 3], [15, 8], [27, 2], [38, 6], [52, 3], [63, 9], [71, 2], [84, 7], [104, 9], [110, 3], [116, 7]
];

// Points of half an oval, for the shield over the base
function arc(centerX, centerY, radiusX, radiusY, every = 1) {
  const seen = new Set();
  const points = [];
  for (let degrees = 180; degrees <= 360; degrees += 2) {
    const angle = (degrees * Math.PI) / 180;
    const x = Math.round(centerX + radiusX * Math.cos(angle));
    const y = Math.round(centerY + radiusY * Math.sin(angle));
    const key = `${x},${y}`;
    if (!seen.has(key) && y >= TILE) {
      seen.add(key);
      points.push([x, y]);
    }
  }
  return points.filter((_, index) => index % every === 0);
}

// Centred on the shelter (squares 4 and 5 of row 2)
const SHIELD_OUTER = arc(60, 38, 40, 26);
const SHIELD_INNER = arc(60, 38, 37, 23, 3);

const place = (id) => placeCorner(BASE_MAP.places.find((p) => p.id === id));

export default function BaseMap({ view, onMove, hit = 0, overlay, active = true }) {
  const look = LOOK[view.world] ?? LOOK.moon;
  const { lastMove, turn } = view;
  const gameNumber = useGameNumber(turn);
  const saving = lastMove === 'savePower';
  const sheltering = lastMove === 'shelter';
  const shielded = lastMove === 'raiseShield';
  const science = lastMove === 'doScience';
  const lowPower = view.meters.power < 25;

  const panel = place('solarPanel');
  const dome = place('shelter');
  const tower = place('shieldTower');
  const rover = place('rover');

  const label =
    `Picture: the ${look.name} base. ${WHAT_HAPPENED[lastMove] ?? 'Nova stands by the base.'}` +
    (hit > 0 ? ' Radiation hit the base.' : '');

  // "Raise shield? [Yes] [No]": which place is asking, and on which turn. A new turn, a step,
  // Yes or No closes it.
  const [asking, setAsking] = useState(null); // { place, turn }
  const close = () => setAsking(null);
  const askingPlace = asking && asking.turn === turn && view.status === 'playing' ? asking.place : null;
  const dialog = askingPlace
    ? moveConfirm(askingPlace, {
        turn,
        onNo: close,
        onYes: (move) => {
          close();
          onMove(move);
        }
      })
    : null;

  const describeUse = (spot) => {
    const info = MOVE_INFO[PLACE_MOVES[spot.id]];
    // "Shelter: Costs 5 power...", not "Shelter: Shelter. Costs 5 power..."
    const sameName = PLACE_NAMES[spot.id] === info.label;
    return {
      label: info.label,
      hint: sameName ? info.hint : `${info.label}. ${info.hint}`,
      icon: <PixelIcon name={info.sprite} size={20} />
    };
  };

  return (
    <WorldMap
      map={BASE_MAP}
      label={label}
      overlay={overlay}
      hero={NOVA}
      start={BASE_START}
      resetKey={gameNumber}
      hiddenKey={sheltering ? `shelter-${turn}` : null}
      placeNames={PLACE_NAMES}
      describeUse={describeUse}
      onUse={(spot) => setAsking({ place: spot.id, turn })}
      dialog={dialog}
      onDialogClose={close}
      onStep={close}
      canUse={view.status === 'playing'}
      active={active}
      ground={look.ground}
      foreground={
        <>
          {/* The shield: a glowing dome over the base */}
          {shielded && (
            <g key={`shield-${turn}`} className="scene__shield">
              {SHIELD_OUTER.map(([x, y]) => (
                <rect key={`so-${x}-${y}`} x={x} y={y} width={1} height={1} fill={PALETTE.C} />
              ))}
              {SHIELD_INNER.map(([x, y]) => (
                <rect key={`si-${x}-${y}`} x={x} y={y} width={1} height={1} fill={PALETTE.b} />
              ))}
            </g>
          )}
          {/* A radiation hit: the whole picture flashes purple */}
          {hit > 0 && (
            <rect
              key={`hit-${turn}`}
              className={hit >= BIG_HIT ? 'scene__hit scene__hit--big' : 'scene__hit'}
              width={BASE_MAP.width * TILE}
              height={BASE_MAP.height * TILE}
              fill={PALETTE.p}
            />
          )}
        </>
      }
    >
      {/* Sky: stars and Earth. Never the storm. */}
      <rect width={BASE_MAP.width * TILE} height={TILE} fill={PALETTE.K} />
      {STARS.map(([x, y], index) => (
        <rect
          key={`star-${x}`}
          x={x}
          y={y}
          width={1}
          height={1}
          fill={index % 3 === 0 ? PALETTE.W : PALETTE.G}
          className={index % 4 === 0 ? 'px-twinkle' : undefined}
        />
      ))}
      {view.world === 'mars' ? (
        <rect x={94} y={4} width={1} height={1} fill={PALETTE.b} className="px-twinkle" />
      ) : (
        <g>{spriteRects(PIECES.earth, { x: 92, y: 2, id: 'earth' })}</g>
      )}

      {/* Ground, with dark patches and craters */}
      <rect y={TILE} width={BASE_MAP.width * TILE} height={(BASE_MAP.height - 1) * TILE} fill={look.ground} />
      <rect y={TILE} width={BASE_MAP.width * TILE} height={1} fill={look.light} />
      {BASE_MAP.rows.flatMap((row, y) =>
        [...row].map((letter, x) => {
          const left = x * TILE;
          const top = y * TILE;
          if (letter === ',') {
            return (
              <g key={`patch-${x}-${y}`}>
                <rect x={left + 2} y={top + 4} width={7} height={2} fill={look.dark} />
                <rect x={left + 4} y={top + 7} width={5} height={1} fill={look.dark} />
              </g>
            );
          }
          if (letter === 'o') {
            return (
              <g key={`crater-${x}-${y}`}>
                <rect x={left + 1} y={top + 3} width={10} height={7} fill={look.dark} />
                <rect x={left + 2} y={top + 2} width={8} height={1} fill={look.dark} />
                <rect x={left + 2} y={top + 4} width={8} height={4} fill={PALETTE.K} opacity={0.35} />
                <rect x={left + 2} y={top + 10} width={8} height={1} fill={look.light} />
              </g>
            );
          }
          return null;
        })
      )}

      {/* Solar panel. It sparkles when Nova saves power. */}
      <g>{spriteRects(PIECES.solarPanel, { x: panel.x, y: panel.y + 4, id: 'panel' })}</g>
      {saving && (
        <g key={`sparkle-${turn}`}>
          <rect x={panel.x + 2} y={panel.y + 5} width={1} height={1} fill={PALETTE.W} className="px-twinkle" />
          <rect x={panel.x + 6} y={panel.y + 6} width={1} height={1} fill={PALETTE.W} className="px-twinkle px-twinkle--late" />
          <rect x={panel.x + 10} y={panel.y + 5} width={1} height={1} fill={PALETTE.W} className="px-blink-fast" />
        </g>
      )}

      {/* The shelter: the dome home. Its lights go off to save power and flicker when power is low. */}
      <g>{spriteRects(PIECES.dome, { x: dome.x, y: dome.y + TILE - 13, id: 'dome' })}</g>
      {!saving && (
        <g className={lowPower ? 'px-flicker' : undefined}>
          <rect x={dome.x + 7} y={dome.y + 5} width={2} height={2} fill={PALETTE.Y} />
          <rect x={dome.x + 15} y={dome.y + 5} width={2} height={2} fill={PALETTE.Y} />
        </g>
      )}
      {sheltering && (
        <g key={`door-${turn}`}>
          <rect x={dome.x + 11} y={dome.y + 9} width={2} height={2} fill={PALETTE.k} />
          <rect x={dome.x + 11} y={dome.y + 7} width={2} height={1} fill={PALETTE.L} className="px-blink-slow" />
        </g>
      )}

      {/* Shield tower */}
      <g>{spriteRects(SHIELD_TOWER, { x: tower.x + 3, y: tower.y + TILE - SHIELD_TOWER.length, id: 'tower' })}</g>
      <rect x={tower.x + 5} y={tower.y + TILE - SHIELD_TOWER.length} width={2} height={1} fill={PALETTE.r} className="px-blink-slow" />

      {/* Science rover. Sparks rise when Nova does science. */}
      <g>{spriteRects(PIECES.rover, { x: rover.x + 2, y: rover.y + 5, id: 'rover' })}</g>
      {science && (
        <g key={`science-${turn}`}>
          <rect x={rover.x + 3} y={rover.y + 2} width={1} height={1} fill={PALETTE.L} className="px-rise" />
          <rect x={rover.x + 6} y={rover.y + 1} width={1} height={1} fill={PALETTE.C} className="px-rise px-rise--late" />
          <rect x={rover.x + 9} y={rover.y + 2} width={1} height={1} fill={PALETTE.Y} className="px-rise px-rise--later" />
        </g>
      )}
    </WorldMap>
  );
}
