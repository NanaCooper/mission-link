import { useEffect, useRef, useState } from 'react';
import { spriteRects } from '../../components/pixel/spriteRects.jsx';
import { joystickDirection } from './worldMap.js';

// A thumb joystick for touch screens, like a mobile game.
// Put a thumb on it and drag: past a small dead zone the character walks up, down, left or
// right (the map is a grid), and keeps walking while the thumb stays there. Let go to stop.
// It is for fingers only (aria-hidden): the four arrow buttons stay in the page for keyboards
// and screen readers.
//
// Props:
//   onDirection  (direction | null) => called when the direction changes; null = stop

export const JOYSTICK_SIZE = 128; // the round base, in screen pixels (at least 120)
export const KNOB_SIZE = 52; // the knob under the thumb (at least 48)
const REACH = (JOYSTICK_SIZE - KNOB_SIZE) / 2; // how far the knob can move from the middle

// The base: a dark ring with four small arrows (16 x 16)
const BASE = [
  '.....KKKKKK.....',
  '...KKkkkkkkKK...',
  '..KkkkkGGkkkkK..',
  '.KkkkkGGGGkkkkK.',
  '.KkkkkkkkkkkkkK.',
  'KkkkkkkkkkkkkkkK',
  'KkGkkkkkkkkkkGkK',
  'KGGkkkkkkkkkkGGK',
  'KGGkkkkkkkkkkGGK',
  'KkGkkkkkkkkkkGkK',
  'KkkkkkkkkkkkkkkK',
  '.KkkkkkkkkkkkkK.',
  '.KkkkkGGGGkkkkK.',
  '..KkkkkGGkkkkK..',
  '...KKkkkkkkKK...',
  '.....KKKKKK.....'
];

// The knob: a light round button with a shine (8 x 8)
const KNOB = [
  '..KKKK..',
  '.KWWGGK.',
  'KWWGGGGK',
  'KWGGGGgK',
  'KGGGGGgK',
  'KGGGGggK',
  '.KggggK.',
  '..KKKK..'
];

export default function Joystick({ onDirection }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef(null); // { id, cx, cy, direction } while a thumb is down
  const report = useRef(onDirection);
  useEffect(() => {
    report.current = onDirection;
  });

  const update = (event) => {
    const d = drag.current;
    if (!d) return;
    const dx = event.clientX - d.cx;
    const dy = event.clientY - d.cy;
    const distance = Math.hypot(dx, dy);
    const scale = distance > REACH ? REACH / distance : 1;
    setOffset({ x: dx * scale, y: dy * scale });
    const direction = joystickDirection(dx, dy);
    if (direction !== d.direction) {
      d.direction = direction;
      report.current(direction);
    }
  };

  const end = () => {
    if (!drag.current) return;
    drag.current = null;
    setOffset({ x: 0, y: 0 });
    report.current(null);
  };

  // Lifting the page away (a new game, the other player's turn) must not leave Nova walking.
  useEffect(
    () => () => {
      if (drag.current) report.current(null);
    },
    []
  );

  return (
    <div
      className="world__joystick"
      aria-hidden="true"
      style={{ width: JOYSTICK_SIZE, height: JOYSTICK_SIZE }}
      onPointerDown={(event) => {
        event.preventDefault();
        const box = event.currentTarget.getBoundingClientRect();
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // Older browsers: the moves still arrive while the thumb stays on the joystick.
        }
        drag.current = { id: event.pointerId, cx: box.left + box.width / 2, cy: box.top + box.height / 2, direction: null };
        update(event);
      }}
      onPointerMove={(event) => {
        if (drag.current?.id === event.pointerId) update(event);
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onContextMenu={(event) => event.preventDefault()}
    >
      <svg className="world__joystick-base" viewBox="0 0 16 16" shapeRendering="crispEdges" focusable="false">
        {spriteRects(BASE, { id: 'stick-base' })}
      </svg>
      <svg
        className="world__joystick-knob"
        viewBox="0 0 8 8"
        shapeRendering="crispEdges"
        focusable="false"
        style={{
          width: KNOB_SIZE,
          height: KNOB_SIZE,
          transform: `translate(${offset.x}px, ${offset.y}px)`
        }}
      >
        {spriteRects(KNOB, { id: 'stick-knob' })}
      </svg>
    </div>
  );
}
