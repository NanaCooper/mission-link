# Dev 3 plan: Game screens (Mission Link)

## Context
The team agreed on the "Four-Person Build Guide" (14 Nov 2026). The user is **Dev 3: Game screens**.
Dev 3 builds the look and the in-game screens: Astronaut, Mission Control, Split-screen. Dev 4 puts
these into `App.jsx`, so every Dev 3 screen **only takes props** and never calls the session hook.
Deadline: Sun 15 Nov, 11:59 PM. The work will be split across several agents, so this plan defines
work packages (WPs) that can run in parallel without touching the same files.

**Dev 3 owns only:** `src/index.css`, `src/ui/components/`, `src/ui/game/`, `src/ui/fakeState.js`.
Never edit anything else (not `App.jsx`, `main.jsx`, `src/engine/`, `src/realtime/`, `src/shared/`,
`src/ui/flow/`, root files). Stack: React 19 + Vite 8, plain JS (`.jsx`), Vitest 5. **No new libraries.**

## Already in place (reuse, don't redo)
- Uncommitted Step 1 draft: `src/index.css`, `src/ui/components/{Meter,BigButton,Panel,Stars}.jsx`,
  `src/ui/components/index.js`, `src/ui/components/components.test.jsx`. WP1 finishes and pushes it.
- Testing pattern: Vitest + `renderToStaticMarkup` from `react-dom/server` (no testing library needed).
  See `components.test.jsx`.
- Team rules: `CLAUDE.md`, `src/ui/CLAUDE.md`. Where they differ from the build guide, the guide wins.

## Decisions (defaults chosen; change here if the team disagrees)
1. **Radiation meter warns "High!" at ≥75%** via `Meter alertWhen="high"`. Other meters: "Low!" under 25%.
2. **Meter colour** via optional `tone`: `'power' | 'oxygen' | 'radiation' | 'health'`.
3. **CSS split to avoid merge conflicts:** `src/index.css` = global look + shared components only (WP1).
   Each screen has its own co-located CSS file imported by the component
   (e.g. `src/ui/game/AstronautScreen.css`). No other WP edits `index.css`.
4. **Shared text in one file:** `src/ui/game/labels.js` holds move/warning labels, icons, hints, and the
   radiation explainer. Screens import from it; nobody hard-codes these strings twice.
5. **Rule numbers are not UI logic.** Hints like "Costs 20 power" live only in `labels.js` and must be
   re-checked if Dev 1 changes `balance.js`. Screens never compute game results.
6. **Preview:** `src/ui/game/Preview.jsx` (per guide). To view it, use a **local-only, uncommitted**
   page (`ui-preview.html` + `ui-preview.jsx` in root, deleted before pushing) unless the team agrees to
   commit a dev page.
7. **Git with several agents:** each WP on its own branch (`dev3/<wp>`), ideally its own git worktree.
   Merge to `main` in the order below. `git pull` before starting, `npm test` before every push.

## Agreed shapes the screens consume (from the guide, do not change)
```js
// Astronaut view
{ status, turn, maxTurns, world, meters: { power, oxygen, radiationDose, crewHealth },
  radiationLimit, science, inbox: [{ turn, warning }], log: [{ turn, text }],
  lastMove, lastFact: { text, source: { name, url } } | null, lostReason, stars }
// Mission Control view
{ status, turn, maxTurns, world, delayTurns, stage: { label, missionControlSees, dust },
  forecast, lastMove, lastFact, crewHealth, warningThisTurn, lostReason, stars }
// MOVES:    raiseShield, shelter, savePower, doScience
// WARNINGS: stormComing, shelterNow, savePower, allClear
```
Newest warning = last item of `inbox`. Latest log line = last item of `log`. Meters are 0–100;
the radiation bar's max is **always `view.radiationLimit`**, never a hard-coded 40.

**Confirmed against Dev 1's engine (`src/engine/index.js`), 14 Nov:**
- Both views match the shapes above exactly.
- `turn` **starts at 0** and goes up by 1 after each move; the game ends when it reaches `maxTurns`.
  So screens show **`Turn ${Math.min(view.turn + 1, view.maxTurns)} of ${view.maxTurns}`**.
- On Mars, a delivered warning is `{ turn, turnSent, warning }` (`turn` = the turn it arrived).
  Screens only read `.warning` from the last inbox item, so the extra field changes nothing.
- `getStorm(id)` returns the default storm for an unknown id, so it never returns nothing.

## Shared component APIs (fixed now so all WPs can build in parallel)
| Component | File | Props |
|---|---|---|
| Meter | `src/ui/components/Meter.jsx` | `icon, label, value, max, tone?, alertWhen? ('low'\|'high')` |
| BigButton | `src/ui/components/BigButton.jsx` | `icon, label, hint, onClick, disabled, selected` (selected = colour + ✓) |
| Panel | `src/ui/components/Panel.jsx` | `title?, children, className?` |
| Stars | `src/ui/components/Stars.jsx` | `count, max = 3` (shows "2 of 3 stars") |
| WhyCard | `src/ui/components/WhyCard.jsx` | `fact` (`{ text, source: { name, url } }` or null → renders nothing; empty url → name as plain text) |
| InfoTip | `src/ui/components/InfoTip.jsx` | `label, children` — small "What is this?" button that toggles an explanation (`aria-expanded`) |
All exported from `src/ui/components/index.js`.

## Work packages

| WP | Agent | Files (only these) | Depends on | Can start |
|---|---|---|---|---|
| WP1 Look + components | A | `src/index.css`, `src/ui/components/*` | — | Now |
| WP2 Fake data + labels | B | `src/ui/fakeState.js`, `src/ui/game/labels.js` | — | Now |
| WP3 AstronautScreen | C | `src/ui/game/AstronautScreen.{jsx,css}`, `AstronautScreen.test.jsx` | APIs above (code against them) | Now |
| WP4 MissionControlScreen | D | `src/ui/game/MissionControlScreen.{jsx,css}`, `MissionControlScreen.test.jsx` | APIs above | Now |
| WP5 SplitScreen + Preview | A or B | `src/ui/game/SplitScreen.{jsx,css}`, `SplitScreen.test.jsx`, `Preview.jsx` | WP3, WP4 merged | After WP3+4 |
| WP6 Polish (one at a time) | any one | `src/ui/game/`, `src/ui/components/`, `src/index.css` | Dev 4 connected the real game | Later |
| WP7 Demo video | human | — | Online play works | Last |

Merge order: **WP1 → WP2 → WP3 → WP4 → WP5**. WP1 goes first and fast: Dev 4 is waiting on it.

### WP1: Look + shared components
- Finish the draft. Add `WhyCard.jsx` and `InfoTip.jsx`, export them, add tests.
- `index.css`: CSS variables (deep space bg, bright text, one accent, meter colours power yellow,
  oxygen blue, radiation purple, health green, warning red), `.world-moon` (cool grey) and
  `.world-mars` (rust orange) that **only** change `--accent` and `--panel-border`. Body ≥18px,
  buttons ≥48px, rounded, mobile first at 360px, `prefers-reduced-motion` respected.
- Done when: `npm test` passes; components look right at 360px on both themes.
- Hand-off message to Dev 4: **"Components are up: Meter, BigButton, Panel, Stars."** (+ WhyCard, InfoTip)

### WP2: Fake data + labels
- `src/ui/fakeState.js` exports exactly as the guide says: `fakeAstronautView`,
  `fakeMissionControlView`, `fakeMarsAstronautView`, `fakeMarsMissionControlView`
  (Mars copies: world 'mars', delayTurns 1, stage.dust true, missionControlSees
  'Dust is covering the solar panels. Saving power gives less today.'). Values per guide
  (power 45, oxygen 90, radiationDose 22, crewHealth 81, radiationLimit 40, science 2, turn 3 of 6,
  inbox `[{ turn: 3, warning: 'shelterNow' }]`, 3 log lines, lastMove 'raiseShield', etc.).
  Also export `fakeWonView` and `fakeLostView` variants for disabled-button tests.
- `src/ui/game/labels.js`: `MOVE_INFO` (per move: icon, label, hint), `WARNING_INFO` (per warning:
  icon, label), `WORLD_NAMES` ({ moon: 'Moon base', mars: 'Mars base' }), `RADIATION_EXPLAINER`
  ("Invisible energy from the Sun that can hurt astronauts. This bar counts game points for one
  storm. It is not a real dose."), `MARS_DELAY_NOTE` ("Mars is far away. Your message arrives next
  turn, so warn about what is coming next."). Keys must match `MOVES`/`WARNINGS` in
  `src/shared/contract.js`; add a test that checks this.
- Hints (from guide rules): Raise shield "Costs 20 power. Blocks most radiation.";
  Shelter "Costs 5 power and some health. Blocks almost all radiation."; Save power "Gets back
  15 power. No protection."; Do science "Costs 10 power. Earns science points."
- Done when: tests pass and shapes match the guide field by field.

### WP3: AstronautScreen (`{ view, onMove }`)
Outer element gets `world-moon`/`world-mars` from `view.world`. Contents, top to bottom:
1. Header: `WORLD_NAMES[view.world]` and "Turn X of Y".
2. Four Meters: Power (⚡ power), Oxygen (🫁 oxygen), **Storm radiation budget** (☢️ radiation,
   `max = view.radiationLimit`, `alertWhen="high"`, InfoTip with `RADIATION_EXPLAINER`),
   Crew health (❤️ health).
3. Newest warning (last of `inbox`) in a big highlighted box with its icon and label, or
   "No message from Mission Control yet".
4. Four BigButtons from `MOVE_INFO`, calling `onMove(move)`; disabled when `status !== 'playing'`.
5. Latest log line, then `WhyCard` from `view.lastFact` **below the buttons** (never covers them at 360px).
- Tests: header text; radiation max uses `radiationLimit` (render with 50 → shows "/ 50");
  no-message fallback; buttons disabled when won/lost; WhyCard only when `lastFact` set; Mars class.

### WP4: MissionControlScreen (`{ view, onWarn }`)
Outer element gets the world class. Contents:
1. Header "Mission Control, Earth" + turn.
2. Storm stage `view.stage.label` in big words; dust badge ("🌪️ Dust storm") when `stage.dust`.
3. `stage.missionControlSees`; "Coming next: " + `forecast` (or "This is the last turn" when null).
4. Astronaut's last move (label from `MOVE_INFO`, or "No move yet"); crew health as a Meter.
5. When `delayTurns === 1`, `MARS_DELAY_NOTE` in a clear box **above** the buttons.
6. Four BigButtons from `WARNING_INFO` calling `onWarn(warning)`; `selected` when equal to
   `warningThisTurn`; disabled when not playing.
7. `WhyCard` from `lastFact`.
- Must not show power, oxygen or radiation (only crew health).
- Tests: delay note only on Mars; dust badge only when dust; selected warning marked; no
  power/oxygen text; disabled when not playing.

### WP5: SplitScreen + Preview
- `SplitScreen.jsx` `{ astronautView, missionControlView, onMove, onWarn }`: both screens at once;
  side by side above 900px, stacked with Mission Control on top on phones; thin labelled divider
  ("👆 Mission Control" / "👇 Astronaut") so two kids know their half.
- `Preview.jsx`: Moon pair, Mars pair, and the SplitScreen, all from `fakeState.js`, handlers log
  to console. Temporary, for checking only.
- Hand-off message to Dev 4: **"AstronautScreen, MissionControlScreen and SplitScreen are in
  src/ui/game/, props as in the guide."**

### WP6: Polish (after Dev 4 connects the real game; one prompt at a time, in this order)
1. Highlight meters that changed after a turn + newest log line as a 3-second toast.
2. "Read to me" button using `speechSynthesis` (no library).
3. Beeps with the Web Audio API for move, warning arriving, level end; mute button. No audio files.
4. Check all screens at 360px and landscape tablet on both themes; fix overflow and small taps.
5. Extra: prediction prompt on turn 4 (React state only, never sent to the hook).

### WP7: Demo video (human)
Check the Space Apps Project tab for length/format first. Two phones on the Vercel link, a third
films. Script: problem → join with code → Moon "Shelter now" → Mars late warning note → stars and
"What really happened" → "Built with real NASA DONKI space weather data." No copyrighted music.
Give the file to Dev 2.

## Prompt header every agent gets
> You are working on Mission Link as Dev 3 (game screens). Read `CLAUDE.md`, `src/ui/CLAUDE.md`,
> `docs/CONTRACT.md` and this plan. Do **[WP name]** only. Only edit: **[file list]**. Plain JS,
> React, no new libraries. Kid text: short words a 9-year-old understands, icons + words, never
> colour alone, ≥18px text, ≥48px taps, works at 360px. Screens take props only, no game rules.
> Work on branch `dev3/[wp]`. `git pull` first; run `npm test` and `npm run build` before pushing.

## Verification
- `npm test`: all component and screen tests pass (render tests with `renderToStaticMarkup`).
- `npm run build`: succeeds with no errors.
- Visual: open the local preview page with `npm run dev`; check at 360px, ~768px and >900px on
  Moon and Mars themes (Chrome DevTools device mode, or the chrome-devtools MCP screenshot).
- Checklist per screen: text ≥18px, taps ≥48px, every button has icon + word, radiation bar uses
  `radiationLimit`, Why? card never covers buttons, keyboard focus visible, nothing overflows.
- After merge to `main`, Vercel redeploys; open the live link on a phone.

---

## Pixel redesign: status and hand-off (14 Nov, branch `dev3/pixel-look`)

### Done
- **Pixel look** in `src/index.css`: Press Start 2P (titles, tags, numbers) + Pixelify Sans (reading text),
  notched pixel borders (`--px`, `--notch`, class `pixel-box`), block meter bars, step animations,
  `prefers-reduced-motion` turns all motion off. Fonts are in `src/ui/components/fonts/` (OFL licences
  included), so the game needs no internet.
- **Pixel art from text grids**: `src/ui/components/pixel/sprites.js` (`PALETTE`, `PORTRAITS`, `ICONS`, `PIECES`).
  One letter = one square. `PixelSprite` draws them as SVG. `sprites.test.js` checks every sprite.
- **New components** (exported from `src/ui/components/index.js`): `Portrait` (who: `nova` | `sola` | `blip`,
  mood, blinks), `PixelIcon` (name), `SpeechBox` (face + name tag + typed text; tap shows all).
  `WhyCard` is now BLIP speaking. `Meter` has `delta` (+15 / -20 tag) and `showMax`. `Stars` are pixel stars.
- **Characters** (`src/ui/game/labels.js` → `CHARACTERS`): Nova (Astronaut), Commander Sola (Mission Control),
  BLIP (robot). Change names only there. Faces: `novaMood()`, `solaMoodForWarning()`.
- **Scenes** (`src/ui/game/scenes/`): `BaseScene` (Astronaut: base, Nova, shield / shelter / lights; it must
  NEVER show the storm), `SpaceScene` (Mission Control: Sun, flare, gas cloud, particles by stage, Earth,
  message line, dust haze, blackout cut), `stormLook.js` (turn → picture).
- **Screens**: AstronautScreen (scene with name + turn on top; Sola's message is "New" only if it arrived
  this turn; Nova's face + meters with change tags; pixel move buttons; BLIP says the log + Why?),
  MissionControlScreen (scene; Sola's briefing + "Coming next"; Nova's face, last move, health; notes; 2x2
  warnings), SplitScreen (phones: sticky tabs + "Pass to ..." buttons, a tab flashes when it is that
  player's turn; wider than 900px: side by side). `useMeterDeltas.js` remembers last turn's numbers.
- 322 tests pass, lint clean, build OK. Checked at 360px and 1280px.

### Known issues (start here)
1. FIXED (14 Nov, `dev3/finish`): the "Signal blocked" tag now blinks three times, then stays solid.
2. FIXED (14 Nov, `dev3/finish`): the dust and blackout tags sit in the bottom left corner of the picture
   (`scene__corner scene__corner--stack`), so they no longer wrap over it at 360px.
3. Dev 4's flow screens (Home, Lobby, End, How to play, Data sources) still use emoji. They get the pixel
   panels and buttons automatically, but no characters. Dev 4 owns them: suggest, don't edit.

### Local preview pages (never committed; listed in `.git/info/exclude`, shared by all worktrees)
`ui-preview.html` (all screens, fake data), `ui-sprites.html` (every sprite), `ui-scenes.html` (every scene).
If missing, create `ui-preview.html` + `ui-preview.jsx` in the repo root that render `src/ui/game/Preview.jsx`
with `./src/index.css`. Run `npm run dev` and open `/ui-preview.html`.

### Next work, split so agents never touch the same files
- **Agent 1, look + components:** `src/index.css`, `src/ui/components/**`
- **Agent 2, scenes + the "what happened" moment:** `src/ui/game/scenes/**`
- **Agent 3, sound, read-aloud, prediction prompt:** `src/ui/game/AstronautScreen.*`, `MissionControlScreen.*`,
  `SplitScreen.*`, `labels.js`, new `src/ui/game/sound.js`, `src/ui/game/useReadAloud.js` (+ their tests)

### Status after 14 Nov evening (Agent 2 and Agent 3 work is done)
- **Sound** (`sound.js`): Web Audio beeps for a warning, a move, the shield, a radiation hit, win and lose.
  `soundFor(previousView, view)` picks them. "Sound on / off" on both screens, remembered on the device.
- **Read to me** (`useReadAloud.js`): on both screens, hidden when the browser cannot speak. The words come
  from `astronautReadText` / `missionControlReadText` in `labels.js`.
- **Prediction prompt**: Astronaut screen at `view.turn === 3`. Optional, React state only (`PREDICTION` in `labels.js`).
- **Nova walks** (`scenes/novaWalk.js`): she walks to a spot for each move, with stepping legs. The lights,
  the door, the sparkles and the shield wait for her (`scene__after-walk`, `scene__until-walk`, `--walk`).
- **"What happened" moment**: `BaseScene hit` (radiation change this turn; a purple flash after the walk,
  stronger from `BIG_HIT`) and `SpaceScene messageSent` (a message packet travels from Earth once a warning
  is sent). Wired in `AstronautScreen` and `MissionControlScreen`.
- Checked at 360px and 1024px wide: no sideways scroll, every button at least 48px tall.

### Still open
- The "Sound on / off" and "Read to me" buttons use emoji. Pixel icons need new sprites in
  `components/pixel/sprites.js` (Agent 1's files).
- Nova always faces the front. A side-on walking sprite, or a body for Commander Sola, is new pixel art.
- Not checked by ear: the sounds and the voice. Try them on a real phone.
- WP7, the demo video, is for a person to record.
