import { useEffect, useRef, useState } from 'react';

// How long a pop-up stays before it folds away.
export const POPUP_MS = 4500;

/**
 * A pop-up that shows itself for a few seconds, then folds away.
 *   key     what the pop-up is about, e.g. 'hit:4'. null = nothing to show.
 *           A new key shows the pop-up again.
 *   active  false while this screen is hidden (one device). The clock only runs while the
 *           player can see it, so a hidden screen never "uses up" a pop-up nobody saw.
 *           A pop-up that was seen and then switched away from does not come back.
 * Returns true while the pop-up should show.
 */
export function usePopup(key, active = true, ms = POPUP_MS) {
  const [seen, setSeen] = useState({ key, done: false });
  const shownKey = useRef(null); // the key last shown on screen

  // A new key: show again. (Updating state while drawing is React's way to follow a prop.)
  if (seen.key !== key) setSeen({ key, done: false });
  const done = seen.key === key && seen.done;

  useEffect(() => {
    if (key == null || done) return undefined;
    if (!active) {
      // Switched away after seeing it: it has had its moment.
      if (shownKey.current === key) setSeen({ key, done: true });
      return undefined;
    }
    shownKey.current = key;
    const timer = setTimeout(() => setSeen((now) => (now.key === key ? { key, done: true } : now)), ms);
    return () => clearTimeout(timer);
  }, [key, active, done, ms]);

  return key != null && !done;
}
