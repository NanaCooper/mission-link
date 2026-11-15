// Small pure helpers for src/App.jsx: which game screen to show, and saved progress.
// Kept here (not in App.jsx) so they can be tested without a browser.

import { ROLES } from '../../shared/contract.js';

/**
 * Which screen a running session should show.
 *   'briefing'  the mission briefing, before Play again or the next level (briefing: true).
 *               Every new game starts with it; the level waits behind it.
 *   'lobby'     waiting for the game (or, for the online Astronaut, for Mission Control to join)
 *   'end'       the level is won or lost
 *   'game'      playing
 * Once the first move is made, a partner who drops out gets a banner, not the lobby.
 */
export function pickGameScreen({ mode, role, state, partnerConnected, briefing = false }) {
  if (briefing) return 'briefing';
  const status = state?.status ?? 'lobby';
  if (status === 'won' || status === 'lost') return 'end';
  if (status === 'lobby') return 'lobby';
  const waitingForFirstPartner =
    mode === 'online' && role === ROLES.ASTRONAUT && !partnerConnected && !state.lastMove;
  return waitingForFirstPartner ? 'lobby' : 'game';
}

/** The banner shown on top of an online game, or null. Kid words. */
export function gameBanner({ mode, screen, partnerConnected, error }) {
  if (mode !== 'online' || screen === 'lobby') return null;
  if (error) return error;
  if (!partnerConnected) return 'Waiting for your partner...';
  return null;
}

// Mars unlock and best Moon stars, kept in this browser.
const PROGRESS_KEY = 'missionlink:progress';
export const NO_PROGRESS = { marsUnlocked: false, moonStars: 0 };

const clampStars = (n) => (Number.isInteger(n) ? Math.min(3, Math.max(0, n)) : 0);

export function loadProgress(storage = globalThis.localStorage) {
  try {
    const saved = JSON.parse(storage.getItem(PROGRESS_KEY));
    if (!saved || typeof saved !== 'object') return NO_PROGRESS;
    return { marsUnlocked: saved.marsUnlocked === true, moonStars: clampStars(saved.moonStars) };
  } catch {
    return NO_PROGRESS;
  }
}

export function saveProgress(progress, storage = globalThis.localStorage) {
  try {
    storage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Storage blocked (private mode, etc.): progress lasts until the tab closes. Play still works.
  }
}

/** Progress after a level ends. Winning the Moon unlocks Mars and keeps the best star count. */
export function progressAfter(progress, { status, world, stars }) {
  if (status !== 'won' || world !== 'moon') return progress;
  const moonStars = Math.max(progress.moonStars, clampStars(stars));
  if (progress.marsUnlocked && moonStars === progress.moonStars) return progress;
  return { marsUnlocked: true, moonStars };
}

/**
 * Which real storm a game plays. A new game picks one at random; "Play again" passes the storm
 * just played as `current`, so it gets a different one when there is more than one.
 *   ids      the real storm ids (REAL_STORM_IDS)
 *   current  the storm to avoid, or null
 *   random   () => a number in [0, 1), Math.random by default (tests pass their own)
 */
export function pickStorm(ids, current = null, random = Math.random) {
  if (!ids?.length) return null;
  const others = ids.filter((id) => id !== current);
  const pool = others.length ? others : ids;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}
