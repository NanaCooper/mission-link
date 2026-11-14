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

// Every fact this folder shows, for the Data sources screen.
export const FLOW_FACTS = [MARS_FACT, BLACKOUT_FACT];
