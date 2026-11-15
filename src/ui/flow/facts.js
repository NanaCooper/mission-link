// Real facts shown outside the storm stages. Each one needs a matching line
// in docs/SOURCES.md, and its url must point to the page the fact came from.

// Shown on the Mars end screen as "This really happened on Mars".
// Checked against the page on 2026-11-14.
export const MARS_FACT = {
  text: 'In May 2024 a real solar storm hit Mars. An astronaut standing next to the Curiosity rover would have received about as much radiation as 30 chest X-rays.',
  source: { name: 'NASA: Mars lights up during epic solar storm', url: 'https://www.nasa.gov/solar-system/planets/mars/nasa-watches-mars-light-up-during-epic-solar-storm/' }
};

// Explains the Mars signal blackout (Dev 1's blackout stage). Shown on How to play
// and Data sources. Checked against the page on 2026-11-14.
export const BLACKOUT_FACT = {
  text: 'About every two years, Earth and Mars end up on opposite sides of the Sun. For a few weeks, the Sun can block messages between them.',
  source: { name: 'NASA JPL: Mars in a Minute, when the Sun blocks our signal', url: 'https://www.jpl.nasa.gov/edu/resources/video/mars-in-a-minute-what-happens-when-the-sun-blocks-our-signal/' }
};

// Two of the storm's stage facts that a 3-wave level never reaches (stages 0 and 2 are
// skipped, see WAVES in the contract). How to play shows them instead. Same words and
// sources as in storm-2024-05-11.json; flow.test.jsx checks they stay the same.
export const ALERTS_FACT = {
  text: 'NASA says warning the crew in time, so they can take shelter, is essential for keeping them safe.',
  source: { name: 'NASA radiation protection standard', url: 'https://www.nasa.gov/sites/default/files/atoms/files/radiation_protection_technical_brief_ochmo.pdf' }
};

export const MOON_DELAY_FACT = {
  text: 'A message from Earth reaches the Moon in just 3 to 14 seconds.',
  source: { name: 'NASA communication delay research', url: 'https://ntrs.nasa.gov/citations/20250000703' }
};

// Every fact this folder shows that is not already a storm stage fact, for the Data sources
// screen (it lists the storm's stage facts itself, so ALERTS_FACT and MOON_DELAY_FACT are there).
export const FLOW_FACTS = [MARS_FACT, BLACKOUT_FACT];
