import { useState } from 'react';
import WorldMap from './WorldMap.jsx';
import { placeCorner, TILE } from './worldMap.js';
import { ROOM_MAP, ROOM_START, ROOM_PLACE_NAMES, ROOM_PLACE_USE } from './controlRoomData.js';
import { SOLA } from './heroes.js';
import { useGameNumber } from './useGameNumber.js';
import { roomDialog } from './dialogs.jsx';
import { spriteRects, diskRects } from '../../components/pixel/spriteRects.jsx';
import { PALETTE } from '../../components/pixel/sprites.js';
import { PixelIcon } from '../../components/index.js';
import { COOLER, SERVER, DESK, SCREEN_BACK, ENGINEER, TELESCOPE, MONITOR, RADIO_DESK, PLANT } from './props.js';

// Mission Control's map: the control room on Earth, seen from above like an old role-playing game.
// Commander Sola walks to a place and uses it:
//   Radio desk -> pick a warning to send   Telescope -> what the storm is doing   Crew monitor -> how Nova is
// Mission Control still sees nothing of the base but Nova's last move and crew health.
//
// Props:
//   view    the Mission Control view (getMissionControlView)
//   onWarn  called with a warning key, e.g. onWarn('shelterNow')

const place = (id) => placeCorner(ROOM_MAP.places.find((p) => p.id === id));

// Where each letter of the room first appears, in squares of the drawing: { x, y } or null
function corner(letter) {
  for (let y = 0; y < ROOM_MAP.rows.length; y += 1) {
    const x = ROOM_MAP.rows[y].indexOf(letter);
    if (x >= 0) return { x: x * TILE, y: y * TILE };
  }
  return null;
}
const COOLER_AT = corner('c');
const SERVER_AT = corner('S');
const DESK_AT = corner('E');

export default function ControlRoomMap({ view, onWarn, active = true }) {
  const gameNumber = useGameNumber(view.turn);
  const playing = view.status === 'playing';
  const blackout = Boolean(view.stage.blackout);

  // Which text box is open, and on which turn. A new turn, a step or a choice closes it.
  const [open, setOpen] = useState(null); // { id, turn }
  const openId = open && open.turn === view.turn && playing ? open.id : null;
  const close = () => setOpen(null);

  // Sending a warning closes the box. The screen's own pop-up then says "Sent: ...".
  const dialog =
    openId &&
    roomDialog(openId, view, {
      close,
      onWarn: (warning) => {
        close();
        onWarn(warning);
      }
    });

  const telescope = place('telescope');
  const monitor = place('monitor');
  const radio = place('radio');
  const width = ROOM_MAP.width * TILE;

  const describeUse = (spot) => ({
    label: ROOM_PLACE_USE[spot.id].label,
    hint: ROOM_PLACE_USE[spot.id].hint,
    icon:
      spot.id === 'radio' ? (
        <PixelIcon name={blackout ? 'noSignal' : 'signal'} size={20} />
      ) : spot.id === 'monitor' ? (
        <PixelIcon name="health" size={20} />
      ) : (
        <PixelIcon name="storm" size={20} />
      )
  });

  // No title on top of the map: the screen already says "Mission Control, Earth", and the wall's big screen shows.
  const label = `Picture: the control room on Earth. Commander Sola can use the telescope, the crew monitor and the radio desk.${
    view.warningThisTurn ? ' A warning was sent this wave.' : ''
  }`;

  return (
    <WorldMap
      map={ROOM_MAP}
      label={label}
      hero={SOLA}
      start={ROOM_START}
      resetKey={gameNumber}
      placeNames={ROOM_PLACE_NAMES}
      describeUse={describeUse}
      onUse={(spot) => setOpen({ id: spot.id, turn: view.turn })}
      canUse={playing}
      active={active}
      ground={PALETTE.k}
      stepPuff={PALETTE.g}
      onStep={close}
      onDialogClose={close}
      dialog={dialog || null}
      // The 3D picture shows the same things as the 2D one below (world3d/scene.js).
      // radio: the light on the radio desk (red in the blackout, cyan once a warning is sent)
      scene3d={{ kind: 'room', radio: blackout ? 'blackout' : view.warningThisTurn ? 'sent' : 'idle' }}
    >
      {/* Floor tiles */}
      <rect width={width} height={ROOM_MAP.height * TILE} fill={PALETTE.k} />
      {ROOM_MAP.rows.flatMap((row, y) =>
        [...row].map((_, x) => (
          <g key={`tile-${x}-${y}`}>
            <rect x={x * TILE} y={y * TILE} width={TILE} height={1} fill={PALETTE.D} />
            <rect x={x * TILE} y={y * TILE} width={1} height={TILE} fill={PALETTE.D} />
          </g>
        ))
      )}

      {/* The wall, with the big screen showing the Sun and Earth */}
      <rect width={width} height={TILE} fill={PALETTE.D} />
      <rect y={TILE - 1} width={width} height={1} fill={PALETTE.g} />
      <rect x={34} y={1} width={52} height={10} fill={PALETTE.K} />
      <rect x={34} y={1} width={52} height={1} fill={PALETTE.b} />
      <rect x={34} y={10} width={52} height={1} fill={PALETTE.b} />
      {diskRects(41, 6, 3, PALETTE.Y, 'wall-sun')}
      {[48, 52, 56, 60, 64, 68, 72].map((x) => (
        <rect key={`wall-dot-${x}`} x={x} y={6} width={1} height={1} fill={PALETTE.g} />
      ))}
      <rect x={78} y={5} width={3} height={3} fill={PALETTE.b} className="px-twinkle" />
      <rect x={8} y={3} width={6} height={6} fill={PALETTE.W} />
      <rect x={10} y={4} width={1} height={3} fill={PALETTE.K} />
      <rect x={11} y={6} width={2} height={1} fill={PALETTE.K} />

      {/* On the wall: a clock (its hand ticks), a Moon poster, a Mars poster, status lights */}
      {diskRects(24, 6, 4, PALETTE.W, 'clock')}
      <rect x={24} y={3} width={1} height={3} fill={PALETTE.K} className="world__frame-a" />
      <rect x={24} y={6} width={3} height={1} fill={PALETTE.K} className="world__frame-b" />
      <rect x={24} y={6} width={1} height={1} fill={PALETTE.r} />
      <rect x={92} y={2} width={9} height={8} fill={PALETTE.K} />
      {diskRects(96, 6, 3, PALETTE.G, 'poster-moon')}
      <rect x={95} y={5} width={1} height={1} fill={PALETTE.g} />
      <rect x={104} y={2} width={9} height={8} fill={PALETTE.K} />
      {diskRects(108, 6, 3, PALETTE.O, 'poster-mars')}
      <rect x={107} y={7} width={2} height={1} fill="#b0553a" />
      {[[2, 'px-blink-slow'], [5, 'px-twinkle'], [114, 'px-blink-fast'], [117, 'px-twinkle px-twinkle--late']].map(([x, className]) => (
        <rect key={`light-${x}`} x={x} y={9} width={2} height={1} fill={x < 60 ? PALETTE.L : PALETTE.C} className={className} />
      ))}

      {/* A rug under the radio desk */}
      <rect x={radio.x - 4} y={radio.y + TILE - 1} width={2 * TILE + 8} height={4} fill={PALETTE.P} opacity={0.6} />

      {/* The water cooler, the computer rack (lights blink) and the flight engineer at the desk (typing) */}
      {COOLER_AT && <g>{spriteRects(COOLER, { x: COOLER_AT.x + 2, y: COOLER_AT.y + TILE - COOLER.length, id: 'cooler' })}</g>}
      {SERVER_AT && (
        <g>
          {spriteRects(SERVER, { x: SERVER_AT.x + 1, y: SERVER_AT.y + TILE - SERVER.length, id: 'server' })}
          {[1, 3, 5, 7, 9, 11].map((row, i) => (
            <rect
              key={`server-light-${row}`}
              x={SERVER_AT.x + 3 + (i % 3) * 2}
              y={SERVER_AT.y + TILE - SERVER.length + row}
              width={1}
              height={1}
              fill={i % 2 ? PALETTE.L : PALETTE.C}
              className={['px-blink-fast', 'px-twinkle', 'px-blink-slow'][i % 3]}
            />
          ))}
        </g>
      )}
      {DESK_AT && (
        <g>
          {spriteRects(ENGINEER, { x: DESK_AT.x + 12, y: DESK_AT.y + TILE - DESK.length - ENGINEER.length + 3, id: 'engineer' })}
          {spriteRects(DESK, { x: DESK_AT.x, y: DESK_AT.y + TILE - DESK.length, id: 'desk' })}
          {spriteRects(SCREEN_BACK, { x: DESK_AT.x + 3, y: DESK_AT.y + TILE - DESK.length - SCREEN_BACK.length, id: 'screen' })}
          <rect x={DESK_AT.x + 4} y={DESK_AT.y + TILE - DESK.length - 4} width={4} height={1} fill={PALETTE.b} className="px-flicker" />
          {/* Hands on the keyboard: they go up and down */}
          <rect x={DESK_AT.x + 13} y={DESK_AT.y + TILE - DESK.length - 1} width={2} height={1} fill={PALETTE.U} className="world__typing" />
          <rect x={DESK_AT.x + 19} y={DESK_AT.y + TILE - DESK.length - 1} width={2} height={1} fill={PALETTE.U} className="world__frame-b world__frame-b--fast" />
        </g>
      )}

      {/* Telescope, crew monitor, radio desk, plants */}
      <g>{spriteRects(TELESCOPE, { x: telescope.x + 1, y: telescope.y, id: 'telescope' })}</g>
      <g>{spriteRects(MONITOR, { x: monitor.x, y: monitor.y + 2, id: 'monitor' })}</g>
      <rect x={monitor.x + 2} y={monitor.y + 4} width={1} height={1} fill={PALETTE.L} className="px-blink-slow" />
      <g>{spriteRects(RADIO_DESK, { x: radio.x, y: radio.y + 2, id: 'radio' })}</g>
      <rect
        x={radio.x + 14}
        y={radio.y + 2}
        width={1}
        height={1}
        fill={blackout ? PALETTE.r : view.warningThisTurn ? PALETTE.C : PALETTE.g}
        className={view.warningThisTurn || blackout ? 'px-blink-fast' : undefined}
      />
      {ROOM_MAP.rows.flatMap((row, y) =>
        [...row].map((letter, x) =>
          letter === 'p' ? <g key={`plant-${x}-${y}`}>{spriteRects(PLANT, { x: x * TILE + 2, y: y * TILE + 1, id: `plant-${x}` })}</g> : null
        )
      )}
    </WorldMap>
  );
}
