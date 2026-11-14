import SceneFrame, { SCENE_WIDTH, SCENE_HEIGHT } from '../scenes/SceneFrame.jsx';
import { spriteRects, diskRects } from '../../components/pixel/spriteRects.jsx';
import { PIECES, PALETTE } from '../../components/pixel/sprites.js';
import { SOLA } from '../world/heroes.js';

// A still pixel picture of the Moon base for the mission briefing.
//   shield  true: the shield glows over the base
//   team    true: Commander Sola waves from Earth (top right) while Nova stands at the base
const GROUND = 23;
const STARS = [[4, 4], [12, 9], [20, 3], [33, 6], [41, 2], [48, 8], [57, 3], [63, 11], [76, 5]];

function shieldPoints() {
  const points = [];
  const seen = new Set();
  for (let degrees = 180; degrees <= 360; degrees += 3) {
    const angle = (degrees * Math.PI) / 180;
    const x = Math.round(31 + 27 * Math.cos(angle));
    const y = Math.round(GROUND + 17 * Math.sin(angle));
    if (!seen.has(`${x},${y}`) && y < GROUND) {
      seen.add(`${x},${y}`);
      points.push([x, y]);
    }
  }
  return points;
}
const SHIELD = shieldPoints();

export default function BasePostcard({ shield = false, team = false }) {
  const label = team
    ? 'Picture: Commander Sola on Earth and Nova at the Moon base, working as one team.'
    : 'Picture: the Moon base, with Nova standing outside.';
  const solaStanding = [...SOLA.sprites.front, ...SOLA.sprites.legs.stand];

  return (
    <SceneFrame label={label} className="scene--base scene--moon">
      <rect width={SCENE_WIDTH} height={SCENE_HEIGHT} fill={PALETTE.K} />
      {STARS.map(([x, y], i) => (
        <rect key={`s${x}`} x={x} y={y} width={1} height={1} fill={PALETTE.W} className={i % 3 === 0 ? 'px-twinkle' : undefined} />
      ))}

      {/* Earth, top right. On the team page Sola stands on it and waves. */}
      {diskRects(70, 8, 6, PALETTE.b, 'earth')}
      <rect x={67} y={5} width={3} height={2} fill={PALETTE.N} />
      <rect x={71} y={9} width={3} height={2} fill={PALETTE.N} />
      {team && <g className="px-bob">{spriteRects(solaStanding, { x: 60, y: 0, id: 'sola' })}</g>}

      {/* Ground */}
      <rect y={GROUND} width={SCENE_WIDTH} height={SCENE_HEIGHT - GROUND} fill={PALETTE.g} />
      <rect y={GROUND} width={SCENE_WIDTH} height={1} fill={PALETTE.G} />
      <rect x={6} y={27} width={6} height={1} fill={PALETTE.k} />
      <rect x={44} y={29} width={7} height={1} fill={PALETTE.k} />
      <rect x={66} y={26} width={5} height={1} fill={PALETTE.k} />

      {/* The base: solar panel, dome, Nova, rover */}
      <g>{spriteRects(PIECES.solarPanel, { x: 5, y: GROUND - 8, id: 'panel' })}</g>
      <g>{spriteRects(PIECES.dome, { x: 20, y: GROUND - 13, id: 'dome' })}</g>
      <rect x={27} y={GROUND - 7} width={2} height={2} fill={PALETTE.Y} />
      <rect x={35} y={GROUND - 7} width={2} height={2} fill={PALETTE.Y} className="px-blink-slow" />
      <g className="px-bob">{spriteRects(PIECES.novaBody, { x: 47, y: GROUND - 14, id: 'nova' })}</g>
      <g>{spriteRects(PIECES.rover, { x: 64, y: GROUND - 6, id: 'rover' })}</g>

      {/* Team page: a message line from Earth to the base */}
      {team && (
        <rect x={52} y={10} width={2} height={1} fill={PALETTE.C} className="px-signal" style={{ '--fly': '-20px', '--dur': '1.2s' }} />
      )}

      {shield &&
        SHIELD.map(([x, y]) => <rect key={`sh${x},${y}`} x={x} y={y} width={1} height={1} fill={PALETTE.C} className="px-blink-slow" />)}
    </SceneFrame>
  );
}
