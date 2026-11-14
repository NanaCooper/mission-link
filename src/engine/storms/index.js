// All storms the game knows about.
// Shared file: Dev 4 adds one import and one line per real storm, then tells Dev 1.
import placeholder from './placeholder.json';

export const STORMS = {
  [placeholder.id]: placeholder
};

export const DEFAULT_STORM_ID = placeholder.id;

// Returns the storm with this id, or the default storm if the id is unknown.
export function getStorm(id) {
  return STORMS[id] ?? STORMS[DEFAULT_STORM_ID];
}
