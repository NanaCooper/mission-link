// What the control room's big wall screen and crew monitor show in 3D, from the Mission Control
// view only (getMissionControlView). Pure, no three.js, so it is easy to test.
// The pictures are picked like the 2D SpaceScene (stormLook.js), so both always match.
//
// Returns
//   now    { look, world, dust, blackout, delayTurns }  what the storm is doing on this wave
//          look: 'quiet' | 'flare' | 'cloud' | 'peak' | 'fading' | 'clear' (see stormLook.js)
//   next   the look of the next wave, or null on the last wave
//   crew   { icon, health }  Nova's last move as an icon name from ICONS (null before the first
//          move), and crew health 0-100
import { stormLook } from '../scenes/stormLook.js';
import { MOVE_INFO } from '../labels.js';

export function roomScreen(view) {
  const health = Math.max(0, Math.min(100, Math.round(Number(view.crewHealth) || 0)));
  return {
    now: {
      look: stormLook(view.turn),
      world: view.world === 'mars' ? 'mars' : 'moon',
      dust: Boolean(view.stage?.dust),
      blackout: Boolean(view.stage?.blackout),
      delayTurns: view.delayTurns ?? 0
    },
    next: view.forecast ? stormLook(view.turn + 1) : null,
    crew: { icon: MOVE_INFO[view.lastMove]?.sprite ?? null, health }
  };
}
