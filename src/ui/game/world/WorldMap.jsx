import { useEffect, useRef, useState } from 'react';
import { spriteRects } from '../../components/pixel/spriteRects.jsx';
import { PALETTE } from '../../components/pixel/sprites.js';
import { TILE, WALK_REPEAT_MS, stepHero, placeNearHero, placeTop } from './worldMap.js';
import { bindMapKeys } from './mapKeys.js';
import Joystick from './Joystick.jsx';
import '../scenes/scenes.css';
import './world.css';

// A walkable pixel map, like an old role-playing game.
// It fills the box it is put in and keeps the whole map in view (bars of ground colour at the
// sides if the box has another shape). The controls sit on top of the map, like a mobile game:
//   - computer: arrow keys or WASD walk, Space / Enter / E use (no click needed while active)
//   - phone or tablet: a thumb joystick bottom left (the four arrow buttons stay for keyboards
//     and screen readers)
//   - an action button pops in bottom right when the character stands next to a place
//   - a speech bubble at the top says what is here
// It is only a way to pick a move: the screen decides what "use" does, and the engine
// decides what happens.
//
// Props:
//   map           from buildMap() in worldMap.js
//   label         words for screen readers, saying what the picture shows
//   overlay       HTML shown on top of the picture (tags)
//   children      SVG drawn under the character (ground, places)
//   foreground    SVG drawn over the character (shield, flashes)
//   hero          { sprites: { front, back, legs: { stand, stepLeft, stepRight } }, name }
//   start         { x, y, facing } where the character starts
//   resetKey      when this changes (a new game), the character goes back to the start
//   hiddenKey     when this changes to a new value, the character is hidden (inside the shelter)
//                 until they take their next step
//   placeNames    place id -> name ("Solar panel")
//   describeUse   (place) -> { label, hint, icon } what the action button does there
//   onUse         (place) -> called when the character uses a place
//   canUse        false when the game is over: walking still works, using does not
//   active        true (default) if this map listens to the keyboard. In one-device mode only
//                 the map on show is active, so only that character moves.
//   ground        colour of the bars around the map when the box has another shape
//   dialog        optional HTML for the text box over the bottom of the map, like the text box
//                 in a role-playing game (for example the radio menu). The screen decides when.
//                 While it is open the arrow keys move between its buttons, Enter picks and
//                 Escape closes.
//   onDialogClose optional: called when Escape closes the text box
//   onStep        optional: called after every step (the screen can close its text box)

const HERO_W = 10;
const HERO_H = 14;

// A solid triangle pointing up. The other arrows are this one turned round (world.css).
const ARROW = ['.......', '...K...', '..KWK..', '.KWWWK.', 'KWWWWWK', 'KKKKKKK', '.......'];

const KEYS_HINT = 'Arrow keys to walk, Space to use';

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
  active = true,
  ground = PALETTE.K,
  dialog = null,
  onDialogClose,
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
  const talking = Boolean(dialog);

  // hiddenKey only changes after USE, never while walking, so this value is never stale.
  const walk = (direction) => {
    setPosition((current) => stepHero(map, current, direction));
    setSteps((count) => count + 1);
    setRevealedKey(hiddenKey);
    onStep?.();
  };
  const act = () => {
    if (usable) onUse(near);
  };

  // The latest handlers, for the timer and the window listeners (which outlive one render).
  const latest = useRef({ walk, act, talking, onDialogClose });
  useEffect(() => {
    latest.current = { walk, act, talking, onDialogClose };
  });

  // Walking while a key, an arrow button or the joystick is held: one step now, then one
  // step every WALK_REPEAT_MS. The same pace for all three.
  const timer = useRef(null);
  const stopWalking = () => {
    clearInterval(timer.current);
    timer.current = null;
  };
  const startWalking = (direction) => {
    stopWalking();
    latest.current.walk(direction);
    timer.current = setInterval(() => latest.current.walk(direction), WALK_REPEAT_MS);
  };
  useEffect(() => stopWalking, []);

  // The text box: arrow keys move between its buttons, Enter picks.
  const textBox = useRef(null);
  const choices = () => [...(textBox.current?.querySelectorAll('button:not([disabled])') ?? [])];
  const moveInTextBox = (step) => {
    const list = choices();
    if (!list.length) return;
    const index = list.indexOf(document.activeElement);
    const next = index < 0 ? (step > 0 ? 0 : list.length - 1) : (index + step + list.length) % list.length;
    list.at(next).focus();
  };
  const pickInTextBox = () => {
    const list = choices();
    const index = list.indexOf(document.activeElement);
    // Nothing chosen yet: show the first choice, so one key press never sends a warning by accident.
    if (index < 0) list.at(0)?.focus();
    else list.at(index).click();
  };

  // The keyboard, on the whole page, but only while this map is active (see mapKeys.js).
  useEffect(
    () =>
      bindMapKeys(typeof window === 'undefined' ? null : window, {
        active,
        isTalking: () => latest.current.talking,
        textBox: () => textBox.current,
        onCommand: (command) => {
          if (command.type === 'walk') startWalking(command.direction);
          else if (command.type === 'use') latest.current.act();
          else if (command.type === 'menu') moveInTextBox(command.step);
          else if (command.type === 'pick') pickInTextBox();
          else if (command.type === 'close') latest.current.onDialogClose?.();
        },
        onStop: stopWalking
      }),
    // startWalking, stopWalking and the text box helpers only read refs, so `active` is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active]
  );

  const width = map.width * TILE;
  const height = map.height * TILE;
  const heroX = position.x * TILE + (TILE - HERO_W) / 2;
  const heroY = position.y * TILE + TILE - HERO_H;
  const body = position.facing === 'up' ? hero.sprites.back : hero.sprites.front;
  const legsY = body.length;
  const arrowAt = near ? placeTop(near) : null;
  const nearName = near ? placeNames[near.id] ?? near.id : null;

  let bubble;
  if (hidden) bubble = `${hero.name} is inside. Take a step to go back out.`;
  else if (near && !canUse) bubble = `${nearName}: the game is over.`;
  else if (near && use) {
    bubble = (
      <>
        <strong>{nearName}:</strong> {use.hint}
      </>
    );
  } else bubble = `Walk ${hero.name} to a place, then press USE.`;

  return (
    <div className={`world${talking ? ' world--talking' : ''}`}>
      <div
        className="world__view scene pixel-box"
        style={{ background: ground }}
        tabIndex={0}
        role="group"
        aria-label={`Map. Walk with the arrow keys. Press Space to use the place in front of ${hero.name}.`}
      >
        <svg
          className="scene__art"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
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

        {!talking && (
          // Top left of the map, or top right when the character is in the left third, so it
          // never covers them. (Top right is where the screen's pop-ups appear, so only then.)
          <p className={`world__bubble world__bubble--${position.x < map.width / 3 ? 'right' : 'left'}`} aria-live="polite">
            {bubble}
          </p>
        )}
        {!talking && (
          <p className="world__keys-hint" aria-hidden="true">
            {KEYS_HINT}
          </p>
        )}
      </div>

      {talking && (
        <div ref={textBox} className="world__textbox pixel-box">
          {dialog}
        </div>
      )}

      {!talking && (
        <div className="world__controls">
          <div className="world__stick">
            <Joystick onDirection={(direction) => (direction ? startWalking(direction) : stopWalking())} />
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
          </div>

          {/* Pops in next to a place, hides when nothing is near. Space / Enter / E do the same. */}
          {usable && (
            <button key={near.id} type="button" className="world__action" onClick={act}>
              {use.icon && (
                <span className="world__action-icon" aria-hidden="true">
                  {use.icon}
                </span>
              )}
              <span className="world__action-label">{use.label}</span>
              <span className="world__action-key" aria-hidden="true">
                USE
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
