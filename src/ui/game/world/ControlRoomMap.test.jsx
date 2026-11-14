import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ControlRoomMap from './ControlRoomMap.jsx';
import { ROOM_MAP, ROOM_START, ROOM_PLACE_NAMES, ROOM_PLACE_USE } from './controlRoomData.js';
import { canStand, placeNearHero, DIRECTIONS } from './worldMap.js';
import { fakeMissionControlView } from '../../fakeState.js';

const render = (view) => renderToStaticMarkup(<ControlRoomMap view={view} onWarn={() => {}} />);

describe('the control room map', () => {
  it('has a radio desk, a telescope and a crew monitor, each with a name and a USE text', () => {
    expect(ROOM_MAP.places.map((p) => p.id).sort()).toEqual(['monitor', 'radio', 'telescope']);
    for (const place of ROOM_MAP.places) {
      expect(ROOM_PLACE_NAMES[place.id]).toBeTruthy();
      expect(ROOM_PLACE_USE[place.id].label).toBeTruthy();
    }
  });

  it('starts Commander Sola on a free square, and every place can be reached', () => {
    expect(canStand(ROOM_MAP, ROOM_START.x, ROOM_START.y)).toBe(true);
    const seen = new Set([`${ROOM_START.x},${ROOM_START.y}`]);
    const queue = [[ROOM_START.x, ROOM_START.y]];
    while (queue.length) {
      const [x, y] = queue.shift();
      for (const [dx, dy] of Object.values(DIRECTIONS)) {
        const key = `${x + dx},${y + dy}`;
        if (!seen.has(key) && canStand(ROOM_MAP, x + dx, y + dy)) {
          seen.add(key);
          queue.push([x + dx, y + dy]);
        }
      }
    }
    for (const place of ROOM_MAP.places) {
      const reached = [...seen].some((key) => {
        const [x, y] = key.split(',').map(Number);
        return Object.keys(DIRECTIONS).some((facing) => placeNearHero(ROOM_MAP, { x, y, facing })?.id === place.id);
      });
      expect(reached, `${place.id} cannot be reached`).toBe(true);
    }
  });
});

describe('ControlRoomMap', () => {
  // Changed on purpose (dev3/controls): the USE button pops in only next to a place, and the
  // text box is now `world__textbox` over the bottom of the map.
  it('shows the room, the joystick and the arrows, with no text box until a place is used', () => {
    const html = render(fakeMissionControlView);
    expect(html).toContain('Picture: the control room on Earth.');
    expect(html).toContain('aria-label="Walk up"');
    expect(html).toContain('world__joystick');
    expect(html).not.toContain('world__textbox');
    expect(html).toContain('Walk Commander Sola to a place, then press USE.');
  });

  it('never shows the base meters: no power, oxygen or radiation', () => {
    const html = render(fakeMissionControlView).toLowerCase();
    expect(html).not.toContain('power:');
    expect(html).not.toContain('oxygen');
    expect(html).not.toContain('radiation budget');
  });

  it('says in words when a warning was sent this turn', () => {
    expect(render({ ...fakeMissionControlView, warningThisTurn: 'shelterNow' })).toContain('A warning was sent this turn.');
    expect(render({ ...fakeMissionControlView, warningThisTurn: null })).not.toContain('A warning was sent');
  });
});
