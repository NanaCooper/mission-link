// The words of the mission briefing (the introduction before the first mission).
// Kid-facing: short sentences, simple words. Every NASA fact here comes from a page that is
// already checked and listed in docs/SOURCES.md:
//   - "warning the crew in time is essential": the storm's quiet-Sun fact (NASA radiation protection standard)
//   - the storm's name and date: the saved DONKI storm (src/engine/storms/)

export const BRIEFING_TITLE = 'Mission briefing';
export const BRIEFING_SKIP = 'Skip';
export const BRIEFING_BACK = 'Back';
export const BRIEFING_NEXT = 'Next';
export const BRIEFING_START = 'Start the mission';
export const BRIEFING_LINK = 'Mission briefing';

// The NASA fact on the "Why it matters" page, with its source (the same words and link as the
// storm's quiet-Sun stage, which a 3-wave level no longer plays).
export const WARNING_FACT = {
  text: 'NASA says a warning in time is a must. It lets the crew take shelter and stay safe.',
  source: {
    name: 'NASA radiation protection standard',
    url: 'https://www.nasa.gov/sites/default/files/atoms/files/radiation_protection_technical_brief_ochmo.pdf'
  }
};

// The pages, in order. {storm} and {date} are filled in from the storm being played.
//   picture: which pixel picture sits on the page ('sun' | 'base' | 'team' | 'waves')
export const BRIEFING_PAGES = [
  {
    id: 'danger',
    title: 'A storm is coming',
    picture: 'sun',
    who: 'sola',
    mood: 'alert',
    text: 'Hello! I am Commander Sola, at Mission Control on Earth. The Sun can send out storms of invisible energy that can hurt astronauts.',
    more: 'A real one is on the way: {storm}, from {date}.'
  },
  {
    id: 'why',
    title: 'Why it matters',
    picture: 'base',
    who: 'sola',
    mood: 'calm',
    text: 'Nova and her crew live on a base far from Earth. They cannot see the storm coming. We can.',
    fact: true
  },
  {
    id: 'mission',
    title: 'Your mission',
    picture: 'waves',
    who: 'blip',
    mood: 'idle',
    text: 'Keep the crew safe through 3 waves of the storm. Wave 2 is the strongest!',
    goals: [
      'Survive all 3 waves.',
      'Keep the crew healthy for a second star.',
      'Do science when it is calm for a third star.'
    ]
  },
  {
    id: 'team',
    title: 'Two jobs, one team',
    picture: 'team',
    who: 'nova',
    mood: 'happy',
    text: 'You must talk to each other. Mission Control sees the storm. The Astronaut keeps the base safe.',
    roles: [
      { who: 'sola', name: 'Mission Control', job: 'Watch the Sun and send a warning before the clock runs out.' },
      { who: 'nova', name: 'Astronaut', job: 'Walk to the shield, the shelter, the solar panel or the rover, and use it.' }
    ],
    after: 'Win on the Moon to fly to Mars, where messages take longer.'
  }
];

// "The May 2024 Storm", "11 May 2024" -> the page's extra line
export function fillStorm(text, storm) {
  return text
    .replace('{storm}', storm?.title || 'a real solar storm')
    .replace('{date}', storm?.realDates || 'NASA records');
}

// Remember that this device has seen the briefing, so it only opens on its own the first time.
const SEEN_KEY = 'missionlink:briefing-seen';

export function hasSeenBriefing(storage = globalThis.localStorage) {
  try {
    return storage?.getItem(SEEN_KEY) === 'yes';
  } catch {
    return false;
  }
}

export function markBriefingSeen(storage = globalThis.localStorage) {
  try {
    storage?.setItem(SEEN_KEY, 'yes');
  } catch {
    // Storage blocked (private mode): the briefing may show again next time. Play still works.
  }
}
