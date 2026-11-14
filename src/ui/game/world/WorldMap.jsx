import { useEffect, useRef, useState } from 'react';
import { spriteRects } from '../../components/pixel/spriteRects.jsx';
import { PALETTE } from '../../components/pixel/sprites.js';
import {
  TILE,
  KEY_TO_DIRECTION,
  USE_KEYS,
  stepHero,
  placeNearHero,
  placeTop
} from './worldMap.js';
import '../scenes/scenes.css';
import './world.css';

// A walkable pixel map, like an old role-playing game.
// The character walks one square at a time (on-screen arrows, arrow keys or WASD)
// and uses the place in front of them (the USE button, Space or Enter).
// It is only a way to pick a move: the screen decides what "use" does, and the engine
// decides what happens.
//
// Props:
//   map         from buildMap() in worldMap.js
//   label       words for screen readers, saying what the picture shows
//   overlay     HTML shown on top of the picture (title, turn, tags)
//   children    SVG drawn under the character (ground, places)
//   foreground  SVG drawn over the character (shield, flashes)
//   hero        { sprites: { front, back, legs: { stand, stepLeft, stepRight } }, name }
//   start       { x, y, facing } where the character starts
//   resetKey    when this changes (a new game), the character goes back to the start
//   hiddenKey   when this changes to a new value, the character is hidden (inside the shelter)
//               until they take their next step
//   placeNames  place id -> name ("Solar panel")
//   describeUse (place) -> { label, hint, icon } what the USE button does there
//   onUse       (place) -> called when the character uses a place
//   canUse      false when the game is over: walking still works, using does not
//   dialog      optional HTML shown under the map, like the text box in a role-playing game
//               (for example the radio menu). The screen decides when to show it.
//   onStep      optional: called after every step (the screen can close its dialog)

const HERO_W = 10;
const HERO_H = 14;
const REPEAT_MS = 170;

// A solid triangle pointing up. The other arrows are this one turned round (world.css).
const ARROW = ['.......', '...K...', '..KWK..', '.KWWWK.', 'KWWWWWK', 'KKKKKKK', '.......'];

export default function WorldMap({
  map,
  label,
  overlay,
  children,
  foreground,
  hero,
  start,
  resetKey,
  hiddenKey = null,
  placeNames = {},
  describeUse,
  onUse,
  canUse = true,
  dialog = null,
  onStep
}) {
  const [position, setPosition] = useState(start);
  const [steps, setSteps] = useState(0);
  const [lastReset, setLastReset] = useState(resetKey);
  const [revealedKey, setRevealedKey] = useState(hiddenKey);

  // A new game: back to the start. (Updating state while drawing is React's way to follow a prop.)
  if (lastReset !== resetKey) {
    setLastReset(resetKey);
    setPosition(start);
  }

  const hidden = hiddenKey !== null && hiddenKey !== revealedKey;
  // Still works while hidden: from inside the shelter you can shelter again.
  const near = placeNearHero(map, position);
  const use = near ? describeUse(near) : null;
  const usable = Boolean(near && use && canUse);

  // hiddenKey only changes after USE, never while an arrow is held, so this value is never stale.
  const walk = (direction) => {
    setPosition((current) => stepHero(map, current, direction));
    setSteps((count) => count + 1);
    setRevealedKey(hiddenKey);
    onStep?.();
  };
  const act = () => {
    if (usable) onUse(near);
  };

  // Holding an arrow keeps walking.
  const timer = useRef(null);
  const stopWalking = () => {
    clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stopWalking, []);
  const startWalking = (direction) => {
    stopWalking();
    walk(direction);
    timer.current = setInterval(() => walk(direction), REPEAT_MS);
  };

  const onMapKey = (event) => {
    const direction = KEY_TO_DIRECTION[event.key];
    if (direction) {
      event.preventDefault();
      walk(direction);
    } else if (USE_KEYS.includes(event.key)) {
      event.preventDefault();
      act();
    }
  };

  const width = map.width * TILE;
  const height = map.height * TILE;
  const heroX = position.x * TILE + (TILE - HERO_W) / 2;
  const heroY = position.y * TILE + TILE - HERO_H;
  const body = position.facing === 'up' ? hero.sprites.back : hero.sprites.front;
  const legsY = body.length;
  const arrowAt = near ? placeTop(near) : null;
  const nearName = near ? placeNames[near.id] ?? near.id : null;

  return (
    <div className="world">
      <div
        className="world__view scene pixel-box"
        tabIndex={0}
        role="group"
        aria-label={`Map. Walk with the arrow keys. Press Space to use the place in front of ${hero.name}.`}
        onKeyDown={onMapKey}
      >
        <svg
          className="scene__art"
          viewBox={`0 0 ${width} ${height}`}
          shapeRendering="crispEdges"
          role="img"
          aria-label={label}
          focusable="false"
        >
          {children}

          {/* The character */}
          {!hidden && (
            <g className="world__hero" style={{ transform: `translate(${heroX}px, ${heroY}px)` }}>
              {spriteRects(body, { id: 'hero' })}
              {steps === 0 ? (
                <g>{spriteRects(hero.sprites.legs.stand, { y: legsY, id: 'legs' })}</g>
              ) : (
                <g key={steps}>
                  <g className="world__legs-moving">
                    {spriteRects(steps % 2 ? hero.sprites.legs.stepLeft : hero.sprites.legs.stepRight, {
                      y: legsY,
                      id: 'step'
                    })}
                  </g>
                  <g className="world__legs-still">{spriteRects(hero.sprites.legs.stand, { y: legsY, id: 'legs' })}</g>
                </g>
              )}
            </g>
          )}

          {foreground}

          {/* "You can use this": a bouncing arrow over the place */}
          {arrowAt && !hidden && (
            <g className="px-bob" aria-hidden="true">
              <rect x={arrowAt.x - 3} y={arrowAt.y - 7} width={7} height={5} fill={PALETTE.K} />
              <rect x={arrowAt.x - 2} y={arrowAt.y - 6} width={5} height={1} fill={PALETTE.Y} />
              <rect x={arrowAt.x - 1} y={arrowAt.y - 5} width={3} height={1} fill={PALETTE.Y} />
              <rect x={arrowAt.x} y={arrowAt.y - 4} width={1} height={1} fill={PALETTE.Y} />
            </g>
          )}
        </svg>
        {overlay && <div className="scene__overlay">{overlay}</div>}
      </div>

      <p className="world__prompt" aria-live="polite">
        {hidden ? (
          `${hero.name} is inside. Take a step to go back out.`
        ) : near && use ? (
          <>
            <strong>{nearName}:</strong> {use.hint}
          </>
        ) : (
          `Walk ${hero.name} to a place, then press USE.`
        )}
      </p>

      {dialog && <div className="world__dialog pixel-box">{dialog}</div>}

      <div className="world__controls">
        <div className="world__pad" role="group" aria-label="Walk">
          {[
            ['up', 'Walk up'],
            ['left', 'Walk left'],
            ['right', 'Walk right'],
            ['down', 'Walk down']
          ].map(([direction, name]) => (
            <button
              key={direction}
              type="button"
              className={`world__arrow world__arrow--${direction}`}
              aria-label={name}
              onPointerDown={(event) => {
                event.preventDefault();
                startWalking(direction);
              }}
              onPointerUp={stopWalking}
              onPointerLeave={stopWalking}
              onPointerCancel={stopWalking}
              onContextMenu={(event) => event.preventDefault()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  event.stopPropagation();
                  walk(direction);
                }
              }}
            >
              <svg viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
                {spriteRects(ARROW, { id: `arrow-${direction}` })}
              </svg>
            </button>
          ))}
        </div>

        <button type="button" className="world__use" disabled={!usable} onClick={act}>
          <span className="world__use-key" aria-hidden="true">
            USE
          </span>
          {usable ? (
            <span className="world__use-text">
              {use.icon && <span aria-hidden="true">{use.icon}</span>}
              <span>{use.label}</span>
            </span>
          ) : (
            <span className="world__use-text">{near && !canUse ? 'Game over' : 'Nothing here'}</span>
          )}
        </button>
      </div>
    </div>
  );
}
