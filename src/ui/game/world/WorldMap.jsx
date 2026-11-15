import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { spriteRects } from '../../components/pixel/spriteRects.jsx';
import { PALETTE } from '../../components/pixel/sprites.js';
import { TILE, WALK_REPEAT_MS, stepHero, placeNearHero, placeTop, nextChoice, facingToward } from './worldMap.js';
import { bindMapKeys } from './mapKeys.js';
import Joystick from './Joystick.jsx';
import { canUse3D } from '../world3d/support.js';
import Boundary3D from '../world3d/Boundary3D.jsx';
import '../scenes/scenes.css';
import './world.css';

// The 3D picture (and three.js with it) only loads on devices that show it
const World3D = lazy(() => import('../world3d/World3D.jsx'));

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
//   hero          { sprites: { front, back, legs: { stand, stepLeft, stepRight }, side?, sideLegs? }, name }
//                 side faces right; walking left shows it mirrored. Without side, the front is used.
//   stepPuff      optional: a colour. Each step kicks up a little puff in that colour.
//   start         { x, y, facing } where the character starts
//   resetKey      when this changes (a new game), the character goes back to the start
//   hiddenKey     when this changes to a new value, the character is hidden (inside the shelter)
//                 until they take their next step
//   placeNames    place id -> name ("Solar panel")
//   describeUse   (place) -> { label, hint, icon } what the action button does there
//   onUse         (place) -> called when the character uses a place
//   canUse        false when the game is over, or while waiting: walking still works, using does not
//   blockedText   optional: why using is off (default "the game is over.")
//   active        true (default) if this map listens to the keyboard. In one-device mode only
//                 the map on show is active, so only that character moves.
//   ground        colour of the bars around the map when the box has another shape
//   dialog        optional text box over the bottom of the map, like a role-playing game.
//                 The map component decides when it is open; WorldMap draws it and runs it:
//                   { id, kind, title, icon?, body?, choices, highlight?, layout?, onChoose }
//                   id         changes when a new box opens (the highlight starts again)
//                   kind       'confirm' (Yes / No), 'menu' (a list to pick from) or 'info'
//                   choices    [{ id, label, icon?, disabled? }]; info boxes have one, "OK"
//                   highlight  the choice highlighted when it opens (default 0, the first)
//                   layout     'row' | 'grid' | 'list' how the choices sit
//                   onChoose   (choiceId) => the map does it and closes the box
//                 Keys: arrows move the highlight, Space / E / Enter picks it, Escape closes.
//                 In an info box Space / E / Enter closes it, and an arrow closes it and walks.
//   onDialogClose optional: called to close the box (Escape, or the info box's keys)
//   onStep        optional: called after every step (the screen can close its text box)
//   scene3d       optional: { kind: 'base' | 'room', ... } turns on the 3D picture (world3d/) on
//                 devices that can show it. Everything else (walking, the text boxes, the
//                 controls) stays the same. Without it, or if 3D cannot run, the 2D picture shows.

const HERO_W = 10;
const HERO_H = 14;

// A solid triangle pointing up. The other arrows are this one turned round (world.css).
const ARROW = ['.......', '...K...', '..KWK..', '.KWWWK.', 'KWWWWWK', 'KKKKKKK', '.......'];

const KEYS_HINT = 'Arrow keys to walk, Space to use';
const BOX_HINT = {
  confirm: 'Arrow keys to choose, Space to pick',
  menu: 'Arrow keys to choose, Space to pick',
  info: 'Space to close'
};
const DEFAULT_LAYOUT = { confirm: 'row', menu: 'grid', info: 'row' };

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
  blockedText = 'the game is over.',
  active = true,
  ground = PALETTE.K,
  dialog = null,
  onDialogClose,
  onStep,
  stepPuff = null,
  scene3d = null
}) {
  const [position, setPosition] = useState(start);
  // Set if the 3D picture broke: this map then stays 2D
  const [failed3d, setFailed3d] = useState(false);
  const [steps, setSteps] = useState(0);
  // Each USE: the character hops and the place sparkles. { count, place }
  const [used, setUsed] = useState({ count: 0, place: null });
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

  // Which choice of the text box is highlighted. A new box (new id) starts on its own highlight.
  const dialogId = dialog?.id ?? null;
  const startAt = dialog?.highlight ?? 0;
  const [highlight, setHighlight] = useState({ id: dialogId, index: startAt });
  if (highlight.id !== dialogId) setHighlight({ id: dialogId, index: startAt });
  const chosen = highlight.id === dialogId ? highlight.index : startAt;
  const choose = (index) => {
    const choice = dialog?.choices[index];
    if (choice && !choice.disabled) dialog.onChoose(choice.id);
  };

  // hiddenKey only changes after USE, never while walking, so this value is never stale.
  const walk = (direction) => {
    setPosition((current) => stepHero(map, current, direction));
    setSteps((count) => count + 1);
    setRevealedKey(hiddenKey);
    onStep?.();
  };
  const act = () => {
    if (!usable) return;
    // Turn to face the place, hop, and make it sparkle, then let the screen do the rest.
    const facing = facingToward(position, near);
    if (facing && facing !== position.facing) setPosition((current) => ({ ...current, facing }));
    setUsed((now) => ({ count: now.count + 1, place: near }));
    onUse(near);
  };

  // The latest handlers, for the timer and the window listeners (which outlive one render).
  const box = {
    kind: dialog?.kind ?? null,
    pick: () => choose(chosen),
    move: (step) => dialog && setHighlight({ id: dialogId, index: nextChoice(dialog.choices, chosen, step) }),
    close: () => onDialogClose?.()
  };
  const latest = useRef({ walk, act, box });
  useEffect(() => {
    latest.current = { walk, act, box };
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

  // The keyboard, on the whole page, but only while this map is active (see mapKeys.js).
  // The text box keeps its highlight itself, so the keys never get lost in the browser's focus.
  useEffect(
    () =>
      bindMapKeys(typeof window === 'undefined' ? null : window, {
        active,
        dialog: () => latest.current.box.kind,
        onCommand: (command) => {
          const { box: current } = latest.current;
          if (command.type === 'walk') startWalking(command.direction);
          else if (command.type === 'use') latest.current.act();
          else if (command.type === 'highlight') current.move(command.step);
          else if (command.type === 'pick') current.pick();
          else if (command.type === 'close') current.close();
          else if (command.type === 'closeAndWalk') {
            current.close();
            startWalking(command.direction);
          }
        },
        onStop: stopWalking
      }),
    // startWalking and stopWalking only read refs, so `active` is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active]
  );

  const width = map.width * TILE;
  const height = map.height * TILE;
  const heroX = position.x * TILE + (TILE - HERO_W) / 2;
  const heroY = position.y * TILE + TILE - HERO_H;
  // Which way the character looks: back when walking up, the side view (mirrored for left)
  // when walking left or right, the front when walking down.
  const sideways = (position.facing === 'left' || position.facing === 'right') && Boolean(hero.sprites.side);
  const body = position.facing === 'up' ? hero.sprites.back : sideways ? hero.sprites.side : hero.sprites.front;
  const legs = sideways && hero.sprites.sideLegs ? hero.sprites.sideLegs : hero.sprites.legs;
  const mirror = sideways && position.facing === 'left' ? `translate(${HERO_W} 0) scale(-1 1)` : undefined;
  const legsY = body.length;
  const sparkleAt = used.place ? placeTop(used.place) : null;
  const arrowAt = near ? placeTop(near) : null;
  const nearName = near ? placeNames[near.id] ?? near.id : null;

  // What the bubble says, and which kind it is (world.css hides some kinds on short phone screens:
  // there the action button already names the place and the Yes / No box shows the cost).
  let bubble;
  let bubbleKind;
  if (hidden) {
    bubble = `${hero.name} is inside. Take a step to go back out.`;
    bubbleKind = 'inside';
  } else if (near && !canUse) {
    bubble = `${nearName}: ${blockedText}`;
    bubbleKind = 'over';
  } else if (near && use) {
    bubble = (
      <>
        <strong>{nearName}:</strong> {use.hint}
      </>
    );
    bubbleKind = 'place';
  } else {
    bubble = `Walk ${hero.name} to a place, then press USE.`;
    bubbleKind = 'walk';
  }
  const bubbleClass = `world__bubble world__bubble--${position.x < map.width / 3 ? 'right' : 'left'} world__bubble--${bubbleKind}${
    steps > 0 ? ' is-started' : ''
  }`;

  // The picture: 3D on devices that can show it (scene3d given), otherwise the 2D pixel drawing.
  const show3d = Boolean(scene3d) && !failed3d && canUse3D();
  const picture2d = (
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

      {/* A small puff where the character lands after a step */}
      {stepPuff && steps > 0 && !hidden && (
        <g key={`puff-${steps}`} className="world__puff" aria-hidden="true">
          <rect x={heroX + 1} y={heroY + HERO_H - 1} width={2} height={1} fill={stepPuff} />
          <rect x={heroX + HERO_W - 3} y={heroY + HERO_H - 1} width={2} height={1} fill={stepPuff} />
          <rect x={heroX - 1} y={heroY + HERO_H - 2} width={1} height={1} fill={stepPuff} />
          <rect x={heroX + HERO_W} y={heroY + HERO_H - 2} width={1} height={1} fill={stepPuff} />
        </g>
      )}

      {/* The character: slides one square per step; bobs while walking, breathes while standing,
          hops when using a place. Walking left shows the side view mirrored. */}
      {!hidden && (
        <g className="world__hero" style={{ transform: `translate(${heroX}px, ${heroY}px)` }}>
          <g key={`use-${used.count}`} className={used.count > 0 ? 'world__hop' : undefined}>
            <g transform={mirror}>
              <g key={`step-${steps}`} className={steps > 0 ? 'world__bob' : undefined}>
                <g className="world__breathe">{spriteRects(body, { id: 'hero' })}</g>
              </g>
              {steps === 0 ? (
                <g>{spriteRects(legs.stand, { y: legsY, id: 'legs' })}</g>
              ) : (
                <g key={steps}>
                  <g className="world__legs-moving">
                    {spriteRects(steps % 2 ? legs.stepLeft : legs.stepRight, { y: legsY, id: 'step' })}
                  </g>
                  <g className="world__legs-still">{spriteRects(legs.stand, { y: legsY, id: 'legs' })}</g>
                </g>
              )}
            </g>
          </g>
        </g>
      )}

      {/* Using a place: a burst of sparkles over it */}
      {sparkleAt && (
        <g key={`sparkle-${used.count}`} className="world__sparkle" aria-hidden="true">
          <rect x={sparkleAt.x - 1} y={sparkleAt.y - 4} width={2} height={2} fill={PALETTE.Y} />
          <rect x={sparkleAt.x - 6} y={sparkleAt.y - 1} width={1} height={1} fill={PALETTE.W} />
          <rect x={sparkleAt.x + 5} y={sparkleAt.y - 1} width={1} height={1} fill={PALETTE.W} />
          <rect x={sparkleAt.x - 4} y={sparkleAt.y - 6} width={1} height={1} fill={PALETTE.C} />
          <rect x={sparkleAt.x + 3} y={sparkleAt.y - 6} width={1} height={1} fill={PALETTE.C} />
          <rect x={sparkleAt.x} y={sparkleAt.y - 9} width={1} height={1} fill={PALETTE.W} />
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
  );

  return (
    <div className={`world${talking ? ' world--talking' : ''}`}>
      <div
        className="world__view scene pixel-box"
        style={{ background: ground }}
        tabIndex={0}
        role="group"
        aria-label={`Map. Walk with the arrow keys. Press Space to use the place in front of ${hero.name}.`}
      >
        {show3d ? (
          <Boundary3D fallback={picture2d} onError={() => setFailed3d(true)}>
            <Suspense fallback={picture2d}>
              <World3D
                map={map}
                hero={hero}
                position={position}
                steps={steps}
                hidden={hidden}
                used={used}
                near={near}
                scene={scene3d}
                label={label}
                puff={stepPuff}
                onFail={() => setFailed3d(true)}
              />
            </Suspense>
          </Boundary3D>
        ) : (
          picture2d
        )}
        {overlay && <div className="scene__overlay">{overlay}</div>}

        {!talking && (
          // Top left of the map, or top right when the character is in the left third, so it
          // never covers them. (Top right is where the screen's pop-ups appear, so only then.)
          <p className={bubbleClass} aria-live="polite">
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
        <div className={`world__textbox world__textbox--${dialog.kind} pixel-box`} role="dialog" aria-label={dialog.title}>
          <p className={dialog.kind === 'confirm' ? 'world__ask' : 'world__dialog-title'}>
            {dialog.icon && (
              <span className="world__ask-icon" aria-hidden="true">
                {dialog.icon}
              </span>
            )}
            {dialog.title}
          </p>
          {dialog.body}
          <div className={`world__choices world__choices--${dialog.layout ?? DEFAULT_LAYOUT[dialog.kind]}`}>
            {dialog.choices.map((choice, index) => (
              <button
                key={choice.id}
                type="button"
                className={`world__choice${index === chosen ? ' is-highlighted' : ''}`}
                aria-current={index === chosen ? 'true' : undefined}
                disabled={choice.disabled}
                // A click never leaves the focus on the button, so the next key goes to the map.
                onMouseDown={(event) => event.preventDefault()}
                onPointerEnter={() => !choice.disabled && setHighlight({ id: dialogId, index })}
                onClick={() => choose(index)}
              >
                <span className="world__choice-marker" aria-hidden="true">
                  {index === chosen ? '▶' : ''}
                </span>
                {choice.icon && (
                  <span className="world__choice-icon" aria-hidden="true">
                    {choice.icon}
                  </span>
                )}
                <span>{choice.label}</span>
              </button>
            ))}
          </div>
          <p className="world__box-hint" aria-hidden="true">
            {BOX_HINT[dialog.kind]}
          </p>
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
                  // A click never leaves the focus on the arrow, so Space still means "use".
                  onMouseDown={(event) => event.preventDefault()}
                  onContextMenu={(event) => event.preventDefault()}
                  // Reached with Tab: holding Space or Enter walks at the same steady pace.
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      if (!event.repeat) startWalking(direction);
                    }
                  }}
                  onKeyUp={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') stopWalking();
                  }}
                  onBlur={stopWalking}
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
            <button
              key={near.id}
              type="button"
              className="world__action"
              onMouseDown={(event) => event.preventDefault()}
              onClick={act}
            >
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
