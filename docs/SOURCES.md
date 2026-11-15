# Sources

Space Apps requires every resource to be cited, even open source ones.
Last full check: 15 Nov 2026 (Dev 4). Every NASA fact or number a player sees is listed
below with the file it comes from and the page it was checked against.

## NASA data

| Source | What we used it for | Link |
|---|---|---|
| DONKI (Space Weather Database Of Notifications, Knowledge, Information) | The real storm in Levels 1 and 2. Tool home page, from the challenge's Resources tab. | https://ccmc.gsfc.nasa.gov/tools/DONKI/ |
| NASA Open APIs (DONKI SEP and CME endpoints) | Fetched the SEP and CME records once, on 14 Nov 2026 | https://api.nasa.gov |
| DONKI web service at CCMC (FLR endpoint) | Fetched the flare record once (the api.nasa.gov FLR endpoint returned 404) | https://ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR |
| DONKI SEP event 2024-05-11T02:10 | Particles detected by GOES at 02:10 UTC. The storm credit link in the game. | https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30714/-1 |
| DONKI SEP event 2024-05-11T04:07 | "More particles were spotted at 04:07" (Mission Control, wave 3: storm fading). Linked from the flare record. | https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30711/-1 |
| DONKI flare 2024-05-11T01:10 | Flare class X5.8, its times, and sunspot region 13664 | https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30711/-1 |
| DONKI CME 2024-05-11T01:36 | Cloud launch time, speed 1,263 km/s, and the model's Mars arrival on 13 May 2024 | https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30719/-1 |
| DONKI web service at CCMC (FLR, CME, SEP) | Fetched the second storm's records once, on 15 Nov 2026 (no key needed) | https://ccmc.gsfc.nasa.gov/DONKI/WS/get/SEP |
| DONKI flare 2025-05-30T23:31 | Second storm: flare class M8.1, its times, and sunspot region 14100 | https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/39182/-1 |
| DONKI CME 2025-05-31T00:15 | Second storm: cloud launch time, leading-edge speed 1,302 km/s (the most accurate leading-edge analysis, as for May 2024), and the model's Mars arrival on 4 June 2025 | https://ccmc.gsfc.nasa.gov/DONKI/view/CME/39185/-1 |
| DONKI SEP event 2025-05-31T17:10 | Second storm: particles detected by GOES (>10 MeV) at 17:10 UTC. The storm credit link in the game. | https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/39201/-1 |
| DONKI SEP event 2025-06-01T06:51 | Second storm: "More particles were spotted the next morning at 06:51" (wave 3). Linked from the flare record. | https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/39182/-1 |

The records are saved in `docs/data/donki-2024-05-11.json` (saved on 14 Nov 2026), and the
game labels them "Archived NASA data, saved on 14 Nov 2026". Levels 1 and 2 never call
DONKI while the game runs. `src/ui/flow/storm.test.js` checks the storm file against the
saved records.

The second storm (30 to 31 May 2025) is saved in `docs/data/donki-2025-05-31.json` (saved on
15 Nov 2026) and labelled the same way; `src/ui/flow/storm2025.test.js` checks it against its
records. Checked by hand: the flare's DONKI page shows M8.1 and region 14100. The CME and SEP
pages load their data with JavaScript, so their values were checked against the same records
from the DONKI web service (the `link` fields in those records point to those pages). A new game
picks one of the two storms at random. Each storm's strongest wave follows its real flare class
(M-class 30, X1 to X9.9 40, X10 or more 50) and its fading wave the cloud's speed (under 1,000
km/s 10, under 2,000 km/s 20, faster 24); the test checks both storms follow this.

## Facts shown to players

All checked against the linked page on 14 Nov 2026.

| Fact | Where it shows | File | Source |
|---|---|---|---|
| Timely alerts so the crew can seek shelter are essential for crew safety | How to play ("Talk!") and Data sources. The 3-wave levels skip the Quiet Sun stage, so it is no longer a fun fact in the game | `src/engine/storms/storm-2024-05-11.json`, `src/ui/flow/facts.js` | [NASA-STD-3001 Technical Brief OCHMO-TB-020, Design for Ionizing Radiation Protection, Rev G (2025)](https://www.nasa.gov/sites/default/files/atoms/files/radiation_protection_technical_brief_ochmo.pdf) |
| A solar flare is a burst of light and energy from the Sun | Mission Control, wave 1 (flare spotted) | `storm-2024-05-11.json` | [NASA Science, Solar Storms and Flares (updated 24 Jun 2025)](https://science.nasa.gov/sun/solar-storms-and-flares/): "an intense burst of radiation, or light, on the Sun" |
| A CME is a giant cloud of gas thrown out by the Sun | "What really happened" on the end screen ("a giant cloud of gas"). The 3-wave levels skip the Cloud launched stage | `storm-2024-05-11.json` | [NASA Science, Solar Storms and Flares](https://science.nasa.gov/sun/solar-storms-and-flares/): "an enormous cloud of electrically charged gas, called plasma, that erupts from the Sun" |
| Big solar flares are recorded in DONKI, and this flare is | Fun fact (BLIP), wave 1 (flare spotted) | `storm-2024-05-11.json`, `storm-2025-05-31.json` | [DONKI flare record, May 2024](https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30711/-1); [DONKI flare record, May 2025](https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/39182/-1) |
| A message from Earth reaches the Moon in 3 to 14 seconds | How to play ("Moon, then Mars") and Data sources. The 3-wave levels skip the Cloud launched stage | `storm-2024-05-11.json`, `src/ui/flow/facts.js` | [Karasinski et al., Assessment of the State of Communication Delay Research, NASA NTRS (2025)](https://ntrs.nasa.gov/citations/20250000703) |
| NASA has a limit for the dose from one solar particle event | Fun fact (BLIP), wave 2 (particles arrive, the peak) | `storm-2024-05-11.json` | [NASA-STD-3001 Technical Brief OCHMO-TB-020, Rev G (2025)](https://www.nasa.gov/sites/default/files/atoms/files/radiation_protection_technical_brief_ochmo.pdf) |
| A message from Earth to Mars can take up to 22 minutes | Fun fact (BLIP), wave 3 (storm fading) | `storm-2024-05-11.json` | [McBrayer, Chai and Judd, Communication Delays, Disruptions, and Blackouts for Crewed Mars Missions, NASA NTRS](https://ntrs.nasa.gov/api/citations/20220013418/downloads/ASCEND-Communication%20Delays%2C%20Disruptions%2C%20and%20Blackouts%20for%20Crewed%20Mars%20Missions.pdf) |
| NASA keeps an astronaut's career dose under a set limit | Data sources. The 3-wave levels skip the All clear stage, so it is no longer a fun fact in the game | `storm-2024-05-11.json` | [NASA-STD-3001 Technical Brief OCHMO-TB-020, Rev G (2025)](https://www.nasa.gov/sites/default/files/atoms/files/radiation_protection_technical_brief_ochmo.pdf) |
| The storm's times, flare class, sunspot number, cloud speed and the model's Mars arrival date | Mission Control text on the 3 waves, and "What really happened" (cloud speed and Mars arrival only there) | `storm-2024-05-11.json` | The DONKI records in the table above |
| About every two years Earth and Mars are on opposite sides of the Sun, and for a few weeks the Sun can block signals | How to play and Data sources | `src/ui/flow/facts.js` | [NASA JPL, Mars in a Minute: What Happens When the Sun Blocks Our Signal? (18 Sept 2024)](https://www.jpl.nasa.gov/edu/resources/video/mars-in-a-minute-what-happens-when-the-sun-blocks-our-signal/) |
| In a different storm, on 20 May 2024 (an X12 flare, not the 11 May storm the game plays), an astronaut next to Curiosity would have got about 30 chest X-rays' worth of radiation (8,100 micrograys) | Mars end screen. The text says "a different solar storm" so players do not mix it up with the storm they just played | `src/ui/flow/facts.js` | [NASA Watches Mars Light Up During Epic Solar Storm (10 Jun 2024)](https://www.nasa.gov/solar-system/planets/mars/nasa-watches-mars-light-up-during-epic-solar-storm/) |

## Our own design, not NASA facts

These are game rules. The game never presents them as real numbers.

| What | Where | How the game says so |
|---|---|---|
| Meter numbers and the storm radiation budget (40) | Astronaut screen | "This bar counts game points for one storm. It is not a real dose." and the end screen's scaling note |
| Incoming radiation per stage (May 2024: 0, 5, 10, 40, 20, 0; May 2025: 0, 5, 10, 30, 20, 0; a level plays stages 1, 3 and 4) | Engine, set by the real flare class and cloud speed | Scaling note on the end screen and Data sources |
| Mars starts with 15 less power | Engine | Not explained to players (no NASA source yet) |
| Dust covers the solar panels on one Mars turn | Engine log, "Dust storm" badge | Shown as a game event only |
| The signal blackout on Mars wave 3 (stage 4) | Mission Control | The real effect is sourced above; which turn it hits is ours |
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
| Claude Code (Anthropic) | Super Intelligence (SI) coding assistant: code, tests and the pixel art drawn in code; the team played and tested the game | https://claude.com/claude-code |
| Claude (Anthropic) | Super Intelligence (SI) assistant: planning, documentation, draft text and help checking facts | https://claude.ai |

SI use, as Space Apps asks: see "Use of Super Intelligence (SI)" in the README. No SI-generated
images, video or audio are used. Every NASA fact was checked against its source page, with SI help.
