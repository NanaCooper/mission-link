// The keyboard for a walkable map: listens on the whole page (no click on the map needed),
// but only while the map is active. In one-device mode only the map on show is active.
// Kept apart from WorldMap.jsx so it can be tested without a browser.

import { mapKeyCommand } from './worldMap.js';

// What a key press happened on, for mapKeyCommand().
export function describeTarget(element, textBox) {
  if (typeof Element === 'undefined' || !(element instanceof Element)) return {};
  return {
    tag: element.tagName,
    editable: Boolean(element.isContentEditable),
    control: Boolean(element.closest('button, a[href], [role="button"], [role="tab"], summary')),
    inDialog: Boolean(textBox?.contains(element)),
    inModal: Boolean(element.closest('[aria-modal="true"]'))
  };
}

// Start listening on `target` (the window). Returns a function that stops listening.
//   active     false: listen to nothing at all
//   isTalking  () => true while the map's text box is open
//   textBox    () => the text box element, or null
//   onCommand  (command) => do it: { type: 'walk', direction } | 'use' | 'menu' | 'pick' | 'close'
//              A 'walk' means "walk this way until onStop": held keys keep walking.
//   onStop     () => stop walking (every walking key let go, or the window lost focus)
export function bindMapKeys(target, { active = true, isTalking = () => false, textBox = () => null, onCommand, onStop }) {
  if (!active || !target?.addEventListener) return () => {};
  const held = []; // walking keys held down, newest last: [{ code, direction }]

  const onKeyDown = (event) => {
    if (event.defaultPrevented) return;
    const command = mapKeyCommand({
      key: event.key,
      repeat: Boolean(event.repeat),
      modifier: Boolean(event.ctrlKey || event.altKey || event.metaKey),
      target: describeTarget(event.target, textBox()),
      dialogOpen: isTalking()
    });
    if (!command) return;
    event.preventDefault();
    if (command.type === 'held') return; // the OS repeating a key: our own timer sets the pace
    if (command.type === 'walk') {
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

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('blur', letGo);
  return () => {
    target.removeEventListener('keydown', onKeyDown);
    target.removeEventListener('keyup', onKeyUp);
    target.removeEventListener('blur', letGo);
    letGo();
  };
}
