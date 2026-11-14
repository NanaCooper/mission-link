// Kid-facing words used by more than one flow screen. Change wording here, once.

export const WORLD_NAMES = {
  moon: { icon: '🌕', name: 'Moon base', level: 'Level 1' },
  mars: { icon: '🔴', name: 'Mars base', level: 'Level 2' }
};

// Why a game was lost, in kid words. Keys are the engine's lostReason values.
export const LOST_REASON_TEXT = {
  oxygen: 'The crew ran out of oxygen.',
  health: 'The crew got too sick.',
  radiation: 'Too much radiation.',
  time: 'No message came in time.' // the signal clock ran out before Mission Control sent a warning
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// '2026-11-14' -> '14 Nov 2026'. Read from the string, so the time zone never shifts the day.
export function formatDate(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate ?? ''));
  if (!match) return null;
  const [, year, month, day] = match;
  const name = MONTHS[Number(month) - 1];
  return name ? `${Number(day)} ${name} ${year}` : null;
}

// The badge that keeps saved data from looking live.
export function archivedLabel(savedOn) {
  const date = formatDate(savedOn);
  return date ? `Archived NASA data, saved on ${date}` : 'Archived NASA data';
}

// "1 supply crate" / "3 supply crates"
export function crates(count) {
  return `${count} supply crate${count === 1 ? '' : 's'}`;
}
