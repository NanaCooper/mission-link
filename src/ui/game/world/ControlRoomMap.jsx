import { useState } from 'react';
import WorldMap from './WorldMap.jsx';
import { placeCorner, TILE } from './worldMap.js';
import { ROOM_MAP, ROOM_START, ROOM_PLACE_NAMES, ROOM_PLACE_USE } from './controlRoomData.js';
import { SOLA } from './heroes.js';
import { useGameNumber } from './useGameNumber.js';
import { spriteRects, diskRects } from '../../components/pixel/spriteRects.jsx';
import { PALETTE } from '../../components/pixel/sprites.js';
import { BigButton, PixelIcon, SpeechBox, Portrait } from '../../components/index.js';
import {
  CHARACTERS,
  WARNING_INFO,
  MOVE_INFO,
  MARS_DELAY_NOTE,
  BLACKOUT_NOTE,
  novaMood
} from '../labels.js';

// Mission Control's map: the control room on Earth, seen from above like an old role-playing game.
// Commander Sola walks to a place and uses it:
//   Radio desk -> pick a warning to send   Telescope -> what the storm is doing   Crew monitor -> how Nova is
// Mission Control still sees nothing of the base but Nova's last move and crew health.
//
// Props:
//   view    the Mission Control view (getMissionControlView)
//   onWarn  called with a warning key, e.g. onWarn('shelterNow')

const TELESCOPE = [
  '.......KK.',
  '......KWWK',
  '.....KWGWK',
  '....KWGKK.',
  '...KWGK...',
  '..KWGK....',
  '..KKK.....',
  '...KK.....',
  '..KgKg....',
  '..Kg.Kg...',
  '.Kg...Kg..',
  '.KK...KK..'
];

const MONITOR = [
  'KKKKKKKKKKKK',
  'KDDDDDDDDDDK',
  'KDDDDDDDDDDK',
  'KDLDDDLDDDDK',
  'KDDLDLDLDDDK',
  'KDDDLDDDLDLK',
  'KDDDDDDDDLDK',
  'KKKKKKKKKKKK',
  '....KggK....',
  '..KKKKKKKK..'
];

const RADIO_DESK = [
  '..............K.........',
  '..............K.....KK..',
  '...........KKKKKKK..KK..',
  '...........KgggggK...K..',
  '...........KgCgYgK...K..',
  'KKKKKKKKKKKKKKKKKKKKKKKK',
  'KOOOOOOOOOOOOOOOOOOOOOOK',
  'KssssssssssssssssssssssK',
  'KsK..................KsK',
  'KKK..................KKK'
];

const PLANT = ['..N..N..', '.NLN.N..', '..NLNLN.', '.NLNNLN.', '..NNLN..', '...NN...', '.KKKKKK.', '.KOOOOK.', '.KOOOOK.', '..KKKK..'];

const place = (id) => placeCorner(ROOM_MAP.places.find((p) => p.id === id));

export default function ControlRoomMap({ view, onWarn }) {
  const gameNumber = useGameNumber(view.turn);
  const playing = view.status === 'playing';
  const blackout = Boolean(view.stage.blackout);

  // Which text box is open, and on which turn. A new turn or a step closes it.
  const [open, setOpen] = useState(null); // { id, turn }
  const openId = open && open.turn === view.turn ? open.id : null;

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
    view.warningThisTurn ? ' A warning was sent this turn.' : ''
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
      onStep={() => setOpen(null)}
      dialog={openId && <RoomDialog id={openId} view={view} onWarn={onWarn} onClose={() => setOpen(null)} />}
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

// The text box for each place, like in a role-playing game.
function RoomDialog({ id, view, onWarn, onClose }) {
  const close = (
    <button type="button" className="screen-tools__button world__close" onClick={onClose}>
      Close
    </button>
  );

  if (id === 'telescope') {
    const director = CHARACTERS.director;
    return (
      <>
        <SpeechBox who={director.who} mood="alert" name={director.name} size={40} text={view.stage.missionControlSees}>
          <p>
            <PixelIcon name="next" size={16} /> {view.forecast ? `Coming next: ${view.forecast}` : 'This is the last turn'}
          </p>
        </SpeechBox>
        {close}
      </>
    );
  }

  if (id === 'monitor') {
    const astronaut = CHARACTERS.astronaut;
    const mood = novaMood({ crewHealth: view.crewHealth });
    const move = view.lastMove ? MOVE_INFO[view.lastMove] : null;
    return (
      <>
        <p className="world__dialog-title">Crew monitor</p>
        <div className="world__monitor">
          <Portrait who={astronaut.who} mood={mood} size={40} label={`${astronaut.name} looks ${mood}`} />
          <div>
            <p>{move ? `${astronaut.name}'s last move: ${move.label}` : `${astronaut.name} has not moved yet.`}</p>
            <p>Crew health: {view.crewHealth}</p>
          </div>
        </div>
        {close}
      </>
    );
  }

  // The radio desk
  const blackout = Boolean(view.stage.blackout);
  const sent = view.warningThisTurn ? WARNING_INFO[view.warningThisTurn] : null;
  return (
    <>
      <p className="world__dialog-title">Radio desk</p>
      {blackout ? (
        <p>{BLACKOUT_NOTE}</p>
      ) : (
        <>
          {view.delayTurns === 1 && <p>{MARS_DELAY_NOTE}</p>}
          <div className="world__menu">
            {Object.entries(WARNING_INFO).map(([key, info]) => (
              <BigButton
                key={key}
                icon={<PixelIcon name={info.sprite} size={24} />}
                label={info.label}
                selected={key === view.warningThisTurn}
                disabled={view.status !== 'playing'}
                onClick={() => onWarn(key)}
              />
            ))}
          </div>
          {sent && <p role="status">Sent: {sent.label}!</p>}
        </>
      )}
      {close}
    </>
  );
}
