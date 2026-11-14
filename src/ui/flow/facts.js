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

// Space words for the live "The Sun right now" panel. Checked against the page on 2026-11-14:
// "A solar flare is an intense burst of radiation, or light, on the Sun." / "A coronal mass
// ejection (CME) is an enormous cloud of electrically charged gas, called plasma, that erupts
// from the Sun." / "a major disturbance in Earth's magnetic field, called a geomagnetic storm."
// / "X - the strongest flares".
const SOLAR_STORMS_PAGE = {
  name: 'NASA Science: Solar storms and flares',
  url: 'https://science.nasa.gov/sun/solar-storms-and-flares/'
};
export const SPACE_WEATHER_WORDS = {
  flare: { text: 'A flare is a strong burst of light from the Sun.', source: SOLAR_STORMS_PAGE },
  flareClass: { text: 'Flares get a letter. X flares are the strongest.', source: SOLAR_STORMS_PAGE },
  cme: { text: 'Scientists call them CMEs. They are made of electrically charged gas.', source: SOLAR_STORMS_PAGE },
  geomagneticStorm: { text: "That means Earth's magnetic field got a big shake-up.", source: SOLAR_STORMS_PAGE }
};

// Every fact this folder shows, for the Data sources screen.
export const FLOW_FACTS = [MARS_FACT, BLACKOUT_FACT, ...Object.values(SPACE_WEATHER_WORDS)];
