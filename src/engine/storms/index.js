// All storms the game knows about.
// Shared file: Dev 4 adds one import and one line per real storm, then tells Dev 1.
import placeholder from './placeholder.json';
import may2024 from './storm-2024-05-11.json';

export const STORMS = {
  [placeholder.id]: placeholder,
  [may2024.id]: may2024
};

export const DEFAULT_STORM_ID = may2024.id;

// Returns the storm with this id, or the default storm if the id is unknown.
export function getStorm(id) {
  return STORMS[id] ?? STORMS[DEFAULT_STORM_ID];
}
