# Sources

Space Apps requires every resource to be cited, even open source ones.
Copy exact links from the challenge's Resources tab.

| Source | What we used it for | Link |
|---|---|---|
| NASA Open APIs | Access to DONKI data | https://api.nasa.gov |
| DONKI (Space Weather Database) | Tool home page, from the challenge's Resources tab | https://ccmc.gsfc.nasa.gov/tools/DONKI/ |
| DONKI SEP event 2024-05-11T02:10 | The real storm: particles detected by GOES at 02:10 UTC. Storm credit link in the game. | https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30714/-1 |
| DONKI flare 2024-05-11T01:10 | Flare class X5.8, its times, and sunspot region 13664 | https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30711/-1 |
| DONKI CME 2024-05-11T01:36 | Cloud launch time, speed 1,263 km/s, and the model's Mars arrival on 13 May 2024 | https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30719/-1 |
| OSDR | Astronaut health facts (if used) | |
| RadLab | Real ISS radiation numbers (if used) | |
| Mars Trek | Mars mode visuals (if used) | |

## Facts shown to players

All checked against the linked page on 14 Nov 2026. The archived DONKI records
are in `docs/data/donki-2024-05-11.json`, saved on 14 Nov 2026, and the game
says so. `src/ui/flow/storm.test.js` checks the storm file against them.

| Fact | Where it shows | Source |
|---|---|---|
| Timely alerts so the crew can seek shelter are essential for crew safety | Why? card, Quiet Sun stage | [NASA-STD-3001 Technical Brief OCHMO-TB-020, Design for Ionizing Radiation Protection, Rev G (2025)](https://www.nasa.gov/sites/default/files/atoms/files/radiation_protection_technical_brief_ochmo.pdf) |
| Big solar flares are recorded in DONKI, and this flare is | Why? card, Flare spotted stage | [DONKI flare record](https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30711/-1) |
| A message from Earth reaches the Moon in 3 to 14 seconds | Why? card, Cloud launched stage | [Karasinski et al., Assessment of the State of Communication Delay Research, NASA NTRS (2025)](https://ntrs.nasa.gov/citations/20250000703) |
| NASA limits the dose from one solar particle event (250 mSv) | Why? card, Particles arrive stage | [NASA-STD-3001 Technical Brief OCHMO-TB-020, Rev G (2025)](https://www.nasa.gov/sites/default/files/atoms/files/radiation_protection_technical_brief_ochmo.pdf) |
| A message from Earth to Mars can take up to 22 minutes | Why? card, Storm fading stage | [McBrayer, Chai and Judd, Communication Delays, Disruptions, and Blackouts for Crewed Mars Missions, NASA NTRS](https://ntrs.nasa.gov/api/citations/20220013418/downloads/ASCEND-Communication%20Delays%2C%20Disruptions%2C%20and%20Blackouts%20for%20Crewed%20Mars%20Missions.pdf) |
| NASA keeps an astronaut's career dose under a set limit (600 mSv) | Why? card, All clear stage | [NASA-STD-3001 Technical Brief OCHMO-TB-020, Rev G (2025)](https://www.nasa.gov/sites/default/files/atoms/files/radiation_protection_technical_brief_ochmo.pdf) |
| An astronaut next to Curiosity in May 2024 would have received about 30 chest X-rays' worth of radiation | Mars end screen (`src/ui/flow/facts.js`) | [NASA Watches Mars Light Up During Epic Solar Storm (10 Jun 2024)](https://www.nasa.gov/solar-system/planets/mars/nasa-watches-mars-light-up-during-epic-solar-storm/) |

## Tools

| Tool | What we used it for | Link |
|---|---|---|
| React, Vite, Vitest | App framework and tests | |
| Supabase Realtime | Syncing two devices | |
| Vercel | Hosting | |
| Claude Code | AI coding assistant | |
