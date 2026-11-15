// All storms the game knows about.
// Shared file: Dev 4 adds one import and one line per real storm, then tells Dev 1.
import placeholder from './placeholder.json';
import may2024 from './storm-2024-05-11.json';
import may2025 from './storm-2025-05-31.json';

export const STORMS = {
  [placeholder.id]: placeholder,
  [may2024.id]: may2024,
  [may2025.id]: may2025
};

export const DEFAULT_STORM_ID = may2024.id;

// The real storms from NASA DONKI (not the placeholder). A new game picks one of them at random.
export const REAL_STORM_IDS = [may2024.id, may2025.id];

// Returns the storm with this id, or the default storm if the id is unknown.
export function getStorm(id) {
  return STORMS[id] ?? STORMS[DEFAULT_STORM_ID];
}
