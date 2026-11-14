# Sources

Space Apps requires every resource to be cited, even open source ones.
Last full check: 14 Nov 2026 (Dev 4). Every NASA fact or number a player sees is listed
below with the file it comes from and the page it was checked against.

## NASA data

| Source | What we used it for | Link |
|---|---|---|
| DONKI (Space Weather Database Of Notifications, Knowledge, Information) | The real storm in Levels 1 and 2. Tool home page, from the challenge's Resources tab. | https://ccmc.gsfc.nasa.gov/tools/DONKI/ |
| NASA Open APIs (DONKI SEP and CME endpoints) | Fetched the SEP and CME records once, on 14 Nov 2026 | https://api.nasa.gov |
| DONKI web service at CCMC (FLR endpoint) | Fetched the flare record once (the api.nasa.gov FLR endpoint returned 404) | https://ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR |
| DONKI SEP event 2024-05-11T02:10 | Particles detected by GOES at 02:10 UTC. The storm credit link in the game. | https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30714/-1 |
| DONKI SEP event 2024-05-11T04:07 | "More particles were spotted at 04:07" (Storm fading stage). Linked from the flare record. | https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30711/-1 |
| DONKI flare 2024-05-11T01:10 | Flare class X5.8, its times, and sunspot region 13664 | https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30711/-1 |
| DONKI CME 2024-05-11T01:36 | Cloud launch time, speed 1,263 km/s, and the model's Mars arrival on 13 May 2024 | https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30719/-1 |

The records are saved in `docs/data/donki-2024-05-11.json` (saved on 14 Nov 2026), and the
game labels them "Archived NASA data, saved on 14 Nov 2026". Levels 1 and 2 never call
DONKI while the game runs. `src/ui/flow/storm.test.js` checks the storm file against the
saved records.

## Facts shown to players

All checked against the linked page on 14 Nov 2026.

| Fact | Where it shows | File | Source |
|---|---|---|---|
| Timely alerts so the crew can seek shelter are essential for crew safety | Why? card, Quiet Sun stage | `src/engine/storms/storm-2024-05-11.json` | [NASA-STD-3001 Technical Brief OCHMO-TB-020, Design for Ionizing Radiation Protection, Rev G (2025)](https://www.nasa.gov/sites/default/files/atoms/files/radiation_protection_technical_brief_ochmo.pdf) |
| A solar flare is a burst of light and energy from the Sun | Mission Control, Flare spotted stage | `storm-2024-05-11.json` | [NASA Science, Solar Storms and Flares (updated 24 Jun 2025)](https://science.nasa.gov/sun/solar-storms-and-flares/): "an intense burst of radiation, or light, on the Sun" |
| A CME is a giant cloud of gas thrown out by the Sun | Mission Control, Cloud launched stage | `storm-2024-05-11.json` | [NASA Science, Solar Storms and Flares](https://science.nasa.gov/sun/solar-storms-and-flares/): "an enormous cloud of electrically charged gas, called plasma, that erupts from the Sun" |
| Big solar flares are recorded in DONKI, and this flare is | Why? card, Flare spotted stage | `storm-2024-05-11.json` | [DONKI flare record](https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30711/-1) |
| A message from Earth reaches the Moon in 3 to 14 seconds | Why? card, Cloud launched stage | `storm-2024-05-11.json` | [Karasinski et al., Assessment of the State of Communication Delay Research, NASA NTRS (2025)](https://ntrs.nasa.gov/citations/20250000703) |
| NASA has a limit for the dose from one solar particle event | Why? card, Particles arrive stage | `storm-2024-05-11.json` | [NASA-STD-3001 Technical Brief OCHMO-TB-020, Rev G (2025)](https://www.nasa.gov/sites/default/files/atoms/files/radiation_protection_technical_brief_ochmo.pdf) |
| A message from Earth to Mars can take up to 22 minutes | Why? card, Storm fading stage | `storm-2024-05-11.json` | [McBrayer, Chai and Judd, Communication Delays, Disruptions, and Blackouts for Crewed Mars Missions, NASA NTRS](https://ntrs.nasa.gov/api/citations/20220013418/downloads/ASCEND-Communication%20Delays%2C%20Disruptions%2C%20and%20Blackouts%20for%20Crewed%20Mars%20Missions.pdf) |
| NASA keeps an astronaut's career dose under a set limit | Why? card, All clear stage | `storm-2024-05-11.json` | [NASA-STD-3001 Technical Brief OCHMO-TB-020, Rev G (2025)](https://www.nasa.gov/sites/default/files/atoms/files/radiation_protection_technical_brief_ochmo.pdf) |
| The storm's times, flare class, sunspot number, cloud speed and the model's Mars arrival date | Mission Control stage text and "What really happened" | `storm-2024-05-11.json` | The DONKI records in the table above |
| About every two years Earth and Mars are on opposite sides of the Sun, and for a few weeks the Sun can block signals | How to play and Data sources | `src/ui/flow/facts.js` | [NASA JPL, Mars in a Minute: What Happens When the Sun Blocks Our Signal? (18 Sept 2024)](https://www.jpl.nasa.gov/edu/resources/video/mars-in-a-minute-what-happens-when-the-sun-blocks-our-signal/) |
| An astronaut next to Curiosity in May 2024 would have received about 30 chest X-rays' worth of radiation | Mars end screen | `src/ui/flow/facts.js` | [NASA Watches Mars Light Up During Epic Solar Storm (10 Jun 2024)](https://www.nasa.gov/solar-system/planets/mars/nasa-watches-mars-light-up-during-epic-solar-storm/) |

## Our own design, not NASA facts

These are game rules. The game never presents them as real numbers.

| What | Where | How the game says so |
|---|---|---|
| Meter numbers and the storm radiation budget (40) | Astronaut screen | "This bar counts game points for one storm. It is not a real dose." and the end screen's scaling note |
| Incoming radiation per turn (0, 5, 10, 40, 20, 0) | Engine | Scaling note on the end screen and Data sources |
| Mars starts with 15 less power | Engine | Not explained to players (no NASA source yet) |
| Dust covers the solar panels on one Mars turn | Engine log, "Dust storm" badge | Shown as a game event only |
| The signal blackout on Mars turn 5 | Mission Control | The real effect is sourced above; which turn it hits is ours |
| The 60-second signal clock | Both player screens | A game timer, not a real delay |
| Nova, Commander Sola and BLIP | All screens | Made-up characters |

## Open items

- **Radiation explainer** (`src/ui/game/labels.js`, Dev 3): "Invisible energy from the Sun
  that can hurt astronauts." It is a plain-words explanation with no source page yet.
  Either keep it as our own explanation or link it to a NASA page that says it.
- **Resources we did not use:** OSDR, RadLab and Mars Trek from the challenge's Resources
  tab were looked at but are not in the game.

## Tools

| Tool | What we used it for | Link |
|---|---|---|
| React 19 | User interface | https://react.dev |
| Vite 8 | Dev server and build | https://vite.dev |
| Vitest 5 | Tests | https://vitest.dev |
| oxlint | Linting | https://oxc.rs |
| Supabase Realtime (supabase-js 2) | Syncing two devices in online play | https://supabase.com/docs/guides/realtime |
| Vercel | Hosting | https://vercel.com |
| GitHub | Code and collaboration | https://github.com/NanaCooper/mission-link |
| Web Audio API | Sound effects, made in code (no audio files) | https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API |
| Web Speech API (speechSynthesis) | "Read to me" | https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis |
| Pixelify Sans font (SIL Open Font License 1.1) | Pixel look | https://github.com/eifetx/Pixelify-Sans |
| Press Start 2P font (SIL Open Font License 1.1) | Pixel look | https://fonts.google.com/specimen/Press+Start+2P |
| Playwright (local only, not in the repo) | Playing the game in a browser to test it at 360px | https://playwright.dev |
| Claude Code (Anthropic) | AI coding assistant used by all four devs | https://claude.com/claude-code |
| Claude (Anthropic) | AI assistant for planning, the build guide and writing | https://claude.ai |
