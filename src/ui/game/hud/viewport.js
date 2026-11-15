// The game fills the screen. Some phone browsers (Samsung Internet, apps that open links inside
// themselves) count their own toolbars in 100vh and 100dvh, so a full-screen game runs off the
// bottom: the joystick and the action button end up under the toolbar.
// So we measure the part of the screen the player can really see and give it to the CSS as
// --app-height and --app-width (hud.css uses them, and falls back to 100dvh without them).
// Nothing here may ever throw: a missing API just means "keep the CSS fallback".
import { useEffect } from 'react';

/** The size the player can really see, in CSS pixels, or 0 when unknown. */
export function visibleSize(win = globalThis.window) {
  try {
    const vv = win?.visualViewport;
    // A pinch-zoomed page has a smaller visual viewport: then the window size is the better guess.
    const zoomed = vv && typeof vv.scale === 'number' && Math.abs(vv.scale - 1) > 0.01;
    const height = (!zoomed && vv?.height) || win?.innerHeight || 0;
    const width = (!zoomed && vv?.width) || win?.innerWidth || 0;
    return { width: Math.round(width), height: Math.round(height) };
  } catch {
    return { width: 0, height: 0 };
  }
}

/**
 * Keep --app-height and --app-width on <html> up to date while the game shows.
 * Measures now, on resize and rotation (the browser bars come and go), and once more a moment
 * after a rotation, because some phones report the old size at first.
 * Returns a function that stops watching and removes the two values.
 */
// One device mounts both players' screens, so two watchers can run at once. The sizes are only
// removed when the last one stops.
let watching = 0;

export function watchViewport({ win = globalThis.window, doc = globalThis.document } = {}) {
  try {
    const root = doc?.documentElement;
    if (!win || !root?.style) return () => {};
    watching += 1;
    const timers = [];
    const apply = () => {
      const { width, height } = visibleSize(win);
      if (height > 0) root.style.setProperty('--app-height', `${height}px`);
      if (width > 0) root.style.setProperty('--app-width', `${width}px`);
    };
    const afterRotate = () => {
      apply();
      timers.push(win.setTimeout?.(apply, 350));
    };
    apply();
    win.addEventListener?.('resize', apply);
    win.addEventListener?.('orientationchange', afterRotate);
    win.visualViewport?.addEventListener?.('resize', apply);
    let stopped = false;
    return () => {
      if (stopped) return;
      stopped = true;
      watching -= 1;
      try {
        win.removeEventListener?.('resize', apply);
        win.removeEventListener?.('orientationchange', afterRotate);
        win.visualViewport?.removeEventListener?.('resize', apply);
        timers.forEach((t) => win.clearTimeout?.(t));
        if (watching === 0) {
          root.style.removeProperty('--app-height');
          root.style.removeProperty('--app-width');
        }
      } catch {
        // Nothing to undo.
      }
    };
  } catch {
    return () => {};
  }
}

/** Watches the visible screen size while the game shows. */
export function useViewport() {
  useEffect(() => watchViewport(), []);
}
