import { describe, it, expect } from 'vitest';
import { bindMapKeys } from './mapKeys.js';

// The page, as far as the map's keyboard cares: something that sends key events.
const key = (type, k, more = {}) => Object.assign(new Event(type, { cancelable: true }), { key: k, code: more.code ?? k, ...more });

function setup(options = {}) {
  const page = new EventTarget();
  const commands = [];
  let stops = 0;
  const unbind = bindMapKeys(page, {
    onCommand: (command) => commands.push(command),
    onStop: () => {
      stops += 1;
    },
    ...options
  });
  return { page, commands, stops: () => stops, unbind };
}

describe('bindMapKeys', () => {
  it('an inactive map ignores every key (only the map on show listens)', () => {
    const { page, commands } = setup({ active: false });
    const down = key('keydown', 'ArrowUp');
    page.dispatchEvent(down);
    page.dispatchEvent(key('keydown', ' '));
    expect(commands).toEqual([]);
    expect(down.defaultPrevented).toBe(false); // the page may still scroll as usual
  });

  it('an active map walks and uses without a click first', () => {
    const { page, commands } = setup();
    const down = key('keydown', 'ArrowRight');
    page.dispatchEvent(down);
    page.dispatchEvent(key('keydown', 'e'));
    expect(commands).toEqual([{ type: 'walk', direction: 'right' }, { type: 'use' }]);
    expect(down.defaultPrevented).toBe(true); // arrow keys do not scroll the page
  });

  it('keeps walking while a key is held and stops when it is let go', () => {
    const { page, commands, stops } = setup();
    page.dispatchEvent(key('keydown', 'ArrowUp'));
    page.dispatchEvent(key('keydown', 'ArrowUp', { repeat: true })); // the OS repeat is ignored
    page.dispatchEvent(key('keydown', 'ArrowUp', { repeat: true }));
    expect(commands).toEqual([{ type: 'walk', direction: 'up' }]);
    page.dispatchEvent(key('keyup', 'ArrowUp'));
    expect(stops()).toBe(1);
  });

  it('with two walking keys down, letting go of the newest walks the other way again', () => {
    const { page, commands, stops } = setup();
    page.dispatchEvent(key('keydown', 'ArrowUp'));
    page.dispatchEvent(key('keydown', 'ArrowLeft'));
    page.dispatchEvent(key('keyup', 'ArrowLeft'));
    expect(commands.at(-1)).toEqual({ type: 'walk', direction: 'up' });
    expect(stops()).toBe(0);
  });

  it('stops walking when the window loses focus or the map stops listening', () => {
    const { page, stops, unbind, commands } = setup();
    page.dispatchEvent(key('keydown', 'ArrowDown'));
    page.dispatchEvent(new Event('blur'));
    expect(stops()).toBe(1);
    unbind();
    page.dispatchEvent(key('keydown', 'ArrowDown'));
    expect(commands).toHaveLength(1);
  });

  it('sends menu, pick and close while the text box is open', () => {
    const { page, commands } = setup({ isTalking: () => true });
    page.dispatchEvent(key('keydown', 'ArrowDown'));
    page.dispatchEvent(key('keydown', 'Enter'));
    page.dispatchEvent(key('keydown', 'Escape'));
    expect(commands).toEqual([{ type: 'menu', step: 1 }, { type: 'pick' }, { type: 'close' }]);
  });

  it('leaves a key alone when something else already handled it', () => {
    const { page, commands } = setup();
    const down = key('keydown', 'ArrowUp');
    down.preventDefault();
    page.dispatchEvent(down);
    expect(commands).toEqual([]);
  });
});
