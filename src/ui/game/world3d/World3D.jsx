import { useEffect, useRef } from 'react';
import { createWorld } from './scene.js';
import './world3d.css';

// The 3D picture of a map. WorldMap shows it in place of the 2D drawing when the device can
// (support.js), and loads it only then, so three.js never slows down devices that keep 2D.
// It only draws what WorldMap tells it: where the character is, how many steps, what was used.
//
// Props (all from WorldMap):
//   map, hero              the map (worldMap.js) and the character (heroes.js)
//   position, steps        { x, y, facing } and the number of steps taken
//   hidden                 true while the character is inside the shelter
//   used                   { count, place } the last place used (hop and sparkles)
//   near                   the place the character can use now (bouncing arrow), or null
//   scene                  the map's scene3d prop: { kind: 'base' | 'room', ... } (see BaseMap, ControlRoomMap)
//   label                  words for screen readers, saying what the picture shows
//   puff                   colour of the little puff after each step, or null
//   stepMs                 milliseconds per step (slow on the Moon and Mars: low gravity)
//   celebrate              false: no hop or sparkles when a place is used (the Moon and Mars)
//   onFail                 called if 3D cannot run here after all: WorldMap then shows 2D
export default function World3D({
  map, hero, position, steps, hidden, used, near, scene, label, puff, stepMs, celebrate = true, onFail
}) {
  const boxRef = useRef(null);
  const latest = useRef({ position, steps, hidden, used, near, scene, puff, stepMs, celebrate, onFail });
  useEffect(() => {
    latest.current = { position, steps, hidden, used, near, scene, puff, stepMs, celebrate, onFail };
  });

  const kind = scene.kind;
  const world = scene.world ?? 'moon';

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;
    // A new canvas each time, so a fresh start never meets an old, closed drawing context
    const canvas = document.createElement('canvas');
    canvas.className = 'world3d__canvas';
    canvas.setAttribute('aria-hidden', 'true');
    box.prepend(canvas);
    const fail = () => latest.current.onFail?.();
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    let view;
    try {
      view = createWorld({ canvas, kind, map, hero, world, reducedMotion });
    } catch {
      canvas.remove();
      fail();
      return undefined;
    }

    const onLost = (event) => {
      event.preventDefault();
      fail();
    };
    canvas.addEventListener('webglcontextlost', onLost);

    const fit = () => view.resize(box.clientWidth, box.clientHeight);
    fit();
    const sizeWatch = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null;
    sizeWatch?.observe(box);

    // No drawing while the map is off screen or the tab is hidden
    let onScreen = true;
    const seen = typeof IntersectionObserver === 'function'
      ? new IntersectionObserver((entries) => {
          onScreen = entries[entries.length - 1].isIntersecting;
        })
      : null;
    seen?.observe(box);

    let frameId = 0;
    let last = performance.now();
    const loop = (now) => {
      frameId = requestAnimationFrame(loop);
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      if (!onScreen || document.hidden) return;
      try {
        view.frame(latest.current, dt, now / 1000);
      } catch {
        cancelAnimationFrame(frameId);
        fail();
      }
    };
    frameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameId);
      sizeWatch?.disconnect();
      seen?.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost);
      view.dispose();
      canvas.remove();
    };
  }, [kind, world, map, hero]);

  return (
    <div ref={boxRef} className="world3d" role="img" aria-label={label}>
      {/* A radiation hit: the picture flashes purple, as on the 2D map */}
      {scene.hit > 0 && (
        <div key={`hit-${scene.turn}`} className={`world3d__hit${scene.bigHit ? ' world3d__hit--big' : ''}`} aria-hidden="true" />
      )}
    </div>
  );
}
