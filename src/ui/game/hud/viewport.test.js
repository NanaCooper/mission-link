import { describe, it, expect, vi } from 'vitest';
import { visibleSize, watchViewport } from './viewport.js';

// A pretend window: an S21 held sideways (800 x 360) with browser bars covering some of it.
function fakeWindow({ width = 800, height = 300, vv = { width: 800, height: 256, scale: 1 } } = {}) {
  const listeners = {};
  const vvListeners = {};
  const on = (store) => (type, fn) => {
    (store[type] ??= new Set()).add(fn);
  };
  const off = (store) => (type, fn) => store[type]?.delete(fn);
  const win = {
    innerWidth: width,
    innerHeight: height,
    visualViewport: vv && { ...vv, addEventListener: on(vvListeners), removeEventListener: off(vvListeners) },
    addEventListener: on(listeners),
    removeEventListener: off(listeners),
    setTimeout: (fn) => {
      win.later.push(fn);
      return win.later.length;
    },
    clearTimeout: () => {},
    later: [],
    fire: (type) => listeners[type]?.forEach((fn) => fn()),
    fireViewport: (type) => vvListeners[type]?.forEach((fn) => fn()),
    count: () => Object.values(listeners).reduce((n, s) => n + s.size, 0) + Object.values(vvListeners).reduce((n, s) => n + s.size, 0),
  };
  return win;
}
function fakeDoc() {
  const props = {};
  return {
    props,
    documentElement: {
      style: {
        setProperty: (k, v) => (props[k] = v),
        removeProperty: (k) => delete props[k],
      },
    },
  };
}

describe('visibleSize', () => {
  it('uses what the player really sees (the visual viewport), not the full screen', () => {
    expect(visibleSize(fakeWindow())).toEqual({ width: 800, height: 256 });
  });

  it('falls back to the window size without a visual viewport, or when the page is zoomed', () => {
    expect(visibleSize(fakeWindow({ vv: null }))).toEqual({ width: 800, height: 300 });
    expect(visibleSize(fakeWindow({ vv: { width: 400, height: 128, scale: 2 } }))).toEqual({ width: 800, height: 300 });
  });

  it('never throws', () => {
    expect(visibleSize(undefined)).toEqual({ width: 0, height: 0 });
    expect(visibleSize({ get visualViewport() { throw new Error('no'); } })).toEqual({ width: 0, height: 0 });
  });
});

describe('watchViewport', () => {
  it('gives the CSS the visible size, follows the browser bars, and cleans up', () => {
    const win = fakeWindow();
    const doc = fakeDoc();
    const stop = watchViewport({ win, doc });
    expect(doc.props).toEqual({ '--app-height': '256px', '--app-width': '800px' });

    win.visualViewport.height = 304; // the bottom toolbar slid away
    win.fireViewport('resize');
    expect(doc.props['--app-height']).toBe('304px');

    win.visualViewport.height = 360;
    win.fire('orientationchange');
    expect(doc.props['--app-height']).toBe('360px');
    expect(win.later).toHaveLength(1); // measured again a moment after turning the phone

    stop();
    expect(doc.props).toEqual({});
    expect(win.count()).toBe(0);
  });

  it('keeps the size while another screen still watches (one device mounts both)', () => {
    const win = fakeWindow();
    const doc = fakeDoc();
    const stopA = watchViewport({ win, doc });
    const stopB = watchViewport({ win, doc });
    stopA();
    stopA(); // stopping twice changes nothing
    expect(doc.props['--app-height']).toBe('256px');
    stopB();
    expect(doc.props).toEqual({});
  });

  it('does nothing without a window or document', () => {
    const stop = watchViewport({ win: null, doc: null });
    expect(() => stop()).not.toThrow();
    const spy = vi.fn();
    expect(() => watchViewport({ win: { addEventListener: spy }, doc: {} })()).not.toThrow();
  });
});
