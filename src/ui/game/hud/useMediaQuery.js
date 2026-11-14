import { useCallback, useSyncExternalStore } from 'react';

/** True while a CSS media query matches, e.g. useMediaQuery('(max-width: 900px)'). False without a browser. */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      try {
        const list = window.matchMedia(query);
        list.addEventListener('change', onChange);
        return () => list.removeEventListener('change', onChange);
      } catch {
        return () => {};
      }
    },
    [query]
  );
  const get = () => {
    try {
      return window.matchMedia(query).matches;
    } catch {
      return false;
    }
  };
  return useSyncExternalStore(subscribe, get, () => false);
}
