// The keyboard for a walkable map: listens on the whole page (no click on the map needed),
// but only while the map is active. In one-device mode only the map on show is active.
// Kept apart from WorldMap.jsx so it can be tested without a browser.

import { mapKeyCommand } from './worldMap.js';

// What a key press happened on, for mapKeyCommand().
//   byKeyboard(element) -> true if that element got its focus from the keyboard (Tab).
//   (Not the browser's :focus-visible: Chrome turns that on for a clicked button as soon as
//   any key is pressed, so a clicked Sound button would keep Space.)
export function describeTarget(element, byKeyboard = () => true) {
  if (typeof Element === 'undefined' || !(element instanceof Element)) return {};
  const control = Boolean(element.closest('button, a[href], [role="button"], [role="tab"], summary'));
  return {
    tag: element.tagName,
    editable: Boolean(element.isContentEditable),
    control,
    focusVisible: control && byKeyboard(element),
    inModal: Boolean(element.closest('[aria-modal="true"]'))
  };
}

const WALKS = ['walk', 'closeAndWalk'];

// Start listening on `target` (the window). Returns a function that stops listening.
//   active     false: listen to nothing at all
//   dialog     () => null, or the kind of text box that is open ('confirm' | 'menu' | 'info')
//   onCommand  (command) => do it (see mapKeyCommand). 'walk' and 'closeAndWalk' mean
//              "walk this way until onStop": held keys keep walking.
//   onStop     () => stop walking (every walking key let go, or the window lost focus)
export function bindMapKeys(target, { active = true, dialog = () => null, onCommand, onStop }) {
  if (!active || !target?.addEventListener) return () => {};
  const held = []; // walking keys held down, newest last: [{ code, direction }]

  // How did each element get its focus? Only one reached with the keyboard keeps Space / Enter.
  let lastInput = 'pointer';
  const keyboardFocused = new WeakSet();
  const onPointer = () => {
    lastInput = 'pointer';
  };
  const onFocusIn = (event) => {
    if (lastInput === 'keyboard') keyboardFocused.add(event.target);
    else keyboardFocused.delete(event.target);
  };
  const noteKeyboard = () => {
    lastInput = 'keyboard';
  };

  const onKeyDown = (event) => {
    if (event.defaultPrevented) return;
    const where = describeTarget(event.target, (element) => keyboardFocused.has(element));
    const command = mapKeyCommand({
      key: event.key,
      repeat: Boolean(event.repeat),
      modifier: Boolean(event.ctrlKey || event.altKey || event.metaKey),
      target: where,
      dialog: dialog()
    });
    if (!command) return;
    event.preventDefault();
    // A button that only had focus from a mouse click lets go of it, so the next key is ours too.
    if (where.control && !where.focusVisible) event.target.blur?.();
    if (command.type === 'held') return; // the OS repeating a key: our own timer sets the pace
    if (WALKS.includes(command.type)) {
      const code = event.code || event.key;
      const at = held.findIndex((h) => h.code === code);
      if (at >= 0) held.splice(at, 1);
      held.push({ code, direction: command.direction });
    }
    onCommand(command);
  };

  const onKeyUp = (event) => {
    const at = held.findIndex((h) => h.code === (event.code || event.key));
    if (at < 0) return;
    held.splice(at, 1);
    // Another walking key is still down: walk that way instead.
    if (held.length) onCommand({ type: 'walk', direction: held.at(-1).direction });
    else onStop();
  };

  const letGo = () => {
    held.length = 0;
    onStop();
  };

  // Capture: these see every press first, even ones another part of the page stops.
  target.addEventListener('pointerdown', onPointer, true);
  target.addEventListener('keydown', noteKeyboard, true);
  target.addEventListener('focusin', onFocusIn, true);
  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('blur', letGo);
  return () => {
    target.removeEventListener('pointerdown', onPointer, true);
    target.removeEventListener('keydown', noteKeyboard, true);
    target.removeEventListener('focusin', onFocusIn, true);
    target.removeEventListener('keydown', onKeyDown);
    target.removeEventListener('keyup', onKeyUp);
    target.removeEventListener('blur', letGo);
    letGo();
  };
}
