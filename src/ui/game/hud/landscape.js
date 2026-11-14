// Full screen and sideways, on touch devices, when the browser allows it.
// Android browsers usually allow both. iPhones allow neither, so the
// "Turn your phone sideways" card (RotateCard.jsx) is the fallback there.
// Nothing here may ever throw: a missing API just means "skip it".
import { useEffect } from 'react';

// What happened so far on this page. A browser only allows full screen right after a tap,
// so the first try (when a game starts) may fail; then the next tap tries again.
const progress = { entered: false, locked: false };

/** For tests only: forget earlier tries. */
export function resetLandscape() {
  progress.entered = false;
  progress.locked = false;
}

/** True on a touch screen (a finger, not a mouse). */
export function isTouchDevice(win = globalThis.window) {
  try {
    return Boolean(win?.matchMedia?.('(pointer: coarse)')?.matches);
  } catch {
    return false;
  }
}

function lockSideways(win) {
  if (progress.locked) return;
  try {
    const result = win.screen?.orientation?.lock?.('landscape');
    if (result && typeof result.then === 'function') {
      result.then(
        () => {
          progress.locked = true;
        },
        () => {} // not allowed here (desktop, iPhone): the rotate card helps instead
      );
    }
  } catch {
    // Not supported. The rotate card helps instead.
  }
}

/**
 * Try to go full screen, then lock the screen sideways. Touch devices only.
 * After the player leaves full screen on purpose, it does not force it back.
 * Returns true if it asked the browser, false if it skipped.
 */
export function tryLandscape({ win = globalThis.window, doc = globalThis.document } = {}) {
  try {
    if (!win || !doc || !isTouchDevice(win)) return false;
    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      lockSideways(win);
      return true;
    }
    if (progress.entered) return false;

    const root = doc.documentElement;
    const request = root?.requestFullscreen ?? root?.webkitRequestFullscreen;
    if (typeof request !== 'function') return false;

    const result = request.call(root, { navigationUI: 'hide' });
    Promise.resolve(result).then(
      () => {
        progress.entered = true;
        lockSideways(win);
      },
      () => {} // no tap yet, or not allowed: the next tap tries again
    );
    return true;
  } catch {
    return false;
  }
}

/** Tries once when the screen shows. The screen also calls tryLandscape() on a tap. */
export function useLandscape(active) {
  useEffect(() => {
    if (active) tryLandscape();
  }, [active]);
}
