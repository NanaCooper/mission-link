# Mission Link

**One sees the storm. One saves the base.**

A two-player browser game for kids aged 7-12 (one player can play alone too), built for the 2026 NASA Space Apps Challenge
("Build a Junior Astronaut Mission Trainer"). Mission Control on Earth guides an Astronaut through a
real solar storm recorded by NASA, first on a Moon base, then on a Mars base.

**Play it: [LIVE LINK]** · no download, no account · best on a phone held sideways, a tablet or a laptop

## The idea

Mission Control can see the storm coming but cannot touch the base. The Astronaut can protect the
crew but cannot see the storm. They have to talk to survive, and every move costs something. On Mars,
Mission Control's warnings arrive one wave late, the way real messages take minutes to reach Mars, so
kids feel the communication delay instead of reading about it.

## How to play

- **Play alone:** you are the Astronaut and Commander Sola sends the warnings by herself. On Mars her
  messages still arrive a wave late, and the blackout still blocks them. No signal clock.
- **One device:** two players share a phone or laptop and pass it at each turn ("Pass the device to
  Nova").
- **Two devices:** the Astronaut creates a room and reads out the code; Mission Control joins with it.

A level is one storm in **3 waves**: the flare, the peak, and the fading storm. Each wave:

1. **Mission Control** reads the storm on the big screen and sends one warning (Storm coming, Shelter
   now, Save power or All clear) before the 60-second signal clock runs out.
2. **The Astronaut** walks Nova to a place on the base and picks one move. The game asks first and
   shows the cost: "Raise shield? Costs 20 power. Blocks most radiation."
3. The storm hits, and both players see what happened and a "Why?" card with a real NASA fact.

| Move | Protects | Costs |
| --- | --- | --- |
| Raise shield | Blocks most radiation | 20 power, and it fails when the batteries are low |
| Shelter | Blocks almost all radiation | Some power and crew health |
| Save power | Refills the batteries | No protection |
| Do science | Science points for more stars | Power |

The base uses power every wave, and when the power runs out the oxygen drops. Too much radiation, no
oxygen or no crew health ends the mission. Surviving earns 1 star, a healthy crew 2, and science on top
of that 3. The end screen explains what your choices meant and what really happened in the real storm.

**Moon, then Mars.** The Moon is the training level. On Mars, warnings arrive a wave late, dust covers
the solar panels on one wave, and on another the Sun blocks the radio signal completely, as it really
does when Earth and Mars are on opposite sides of the Sun. Stars won on the Moon become supply crates
waiting on Mars.

## The NASA data, and why we used it

The storm is the real solar storm of **11 May 2024**, from NASA's Space Weather Database (**DONKI**):

| DONKI record | What it drives in the game |
| --- | --- |
| Solar flare, class **X5.8**, sunspot region **13664**, 01:10 UTC | Wave 1: what Mission Control sees |
| Coronal mass ejection (a cloud of gas) at **1,263 km/s** | "What really happened" on the end screen |
| Solar energetic particles detected by the GOES satellite at **02:10 UTC** | Wave 2, the peak |
| More particles at **04:07 UTC** | Wave 3, the fading storm |
| NASA's model of the cloud reaching Mars on **13 May 2024** | "What really happened" on the end screen |

DONKI is the database NASA uses to track the flares, CMEs and particle events that drive radiation risk
for astronauts, which is exactly the trade-off the game teaches.

**Honest by design:**

- We saved the DONKI records once (`docs/data/donki-2024-05-11.json`) and the game labels them
  "Archived NASA data, saved on 14 Nov 2026". It never presents them as live.
- An automated test checks the storm file against the saved records.
- The radiation meter counts game points, not real doses, and the game says so in plain words.
- Every fact shown to players links to the NASA page it came from. The full list, with the file each
  fact lives in, is in [`docs/SOURCES.md`](docs/SOURCES.md), and the in-game "Data sources" screen
  lists them too.

## Built for kids

- Short sentences and plain words; space words are explained where they appear.
- Four meters (power, oxygen, crew health, a storm radiation budget) and four moves. The challenge
  advises two or three core systems for young players, so we left out food on purpose.
- Keyboard, touch joystick or on-screen arrows; "Read to me" reads the messages aloud; sound can be
  turned off.
- Losing ends with an explanation and one tap to try again, not a scolding.

## Run it locally

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # the automated tests
npm run build
```

Online play (two devices) needs a Supabase project: copy `.env.example` to `.env` and fill in
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Playing on one device needs nothing.

## How it is built

| Folder | What lives there |
| --- | --- |
| `src/engine/` | The game rules: pure functions, the same choices always give the same result, fully tested |
| `src/engine/storms/` | The real storm, turned into game stages |
| `src/realtime/` | Two-device play with Supabase Realtime; the Astronaut's device runs the game |
| `src/ui/game/` | The player screens, the walkable pixel maps, sounds and read-aloud |
| `src/ui/flow/` | Home, lobby, end screen, How to play, Data sources |
| `docs/` | The shared contract between the parts, the archived NASA data, and every source |

React, Vite, Vitest, Supabase Realtime and Vercel. No other libraries; the pixel art is drawn in code.

## Team and tools

- **Team:** [names and roles]
- **Tools:** React, Vite, Vitest, oxlint, Supabase Realtime, Vercel, GitHub, the Web Audio and Web
  Speech browser features, and the Pixelify Sans and Press Start 2P fonts (SIL Open Font License).
- **AI tools:** we used Claude Code (Anthropic) as a coding assistant and Claude for planning and
  writing. Every NASA fact in the game was checked by a team member against its source page.

## What's next

- **Live Sun:** a bonus level built from what DONKI recorded on the Sun this month.
- **Food:** a greenhouse as a later resource, using the Canadian Space Agency's food production toolkit.
- **More NASA data:** dose readings from the ISS (RadLab), astronaut health findings (OSDR), and a real
  Mars site from Mars Trek.
- **A teacher mode** with discussion questions after each level.
