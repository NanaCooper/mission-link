import { useCallback, useState } from 'react';

/**
 * Open or closed, and which tab, for one player's menu.
 * Returns { isOpen, tab, open(tab?), close(), toggle(), setTab(tab) }.
 */
export function useGameMenu(firstTab) {
  const [isOpen, setOpen] = useState(false);
  const [tab, setTab] = useState(firstTab);

  const open = useCallback((nextTab) => {
    if (typeof nextTab === 'string') setTab(nextTab);
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((wasOpen) => !wasOpen), []);

  return { isOpen, tab, open, close, toggle, setTab };
}
