# Dev 3: Screens and look

You own `src/ui/`. Edit nothing outside it. Read @../../docs/CONTRACT.md first.

## Screens
- Home: "Play on one device", "Create room", "Join room", choose Moon or Mars
- Lobby: big room code, "Waiting for your partner..."
- AstronautScreen: meters, inbox warnings, 4 move buttons, last turn's result
- MissionControlScreen: storm stage, what is coming next, crew health,
  the Astronaut's last move, 4 warning buttons
- SplitScreen: both views on one device. Side by side on laptop or tablet,
  top and bottom on a phone.
- EndScreen: stars, win or lose reason, "What really happened" from the storm
  JSON, a short NASA fact, and a data credit line

## Data
- Get state and actions from `useGameSession` (Dev 2).
- Get what each player may see from `getAstronautView` and
  `getMissionControlView` (Dev 1).
- Until those are ready, use `src/ui/fakeState.js`.
- Never put game rules in the UI. The engine decides everything.

## Design for ages 7–12
- Mobile first. Test at 360px wide.
- Tap targets at least 48px, body text at least 18px.
- Icons plus words on every button. Never use colour alone to show meaning.
- Meters as coloured bars with an icon and a number.
- After each turn, show one short line of what happened.
- Short sentences. Say "Solar storm on the way!", not "SEP event detected".
- Explain space words the first time: "Radiation: invisible energy from the
  Sun that can hurt astronauts."
