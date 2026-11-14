# Dev 4: NASA data and game flow

You own `src/ui/flow/`. Edit nothing outside it unless the owner agrees.
Read @../../../docs/CONTRACT.md first.

Dev 4 also edits, by agreement:
- `src/App.jsx` and `src/main.jsx`: screen switching and wiring the real game.
- `src/engine/storms/<id>.json` and one line in `src/engine/storms/index.js`:
  the real DONKI storm. Dev 1 owns the folder. Tell Dev 1 before pushing.
- `docs/SOURCES.md`: every NASA fact and its link.

## What lives here
- HomeScreen, LobbyScreen, EndScreen, HowToPlayScreen, DataSourcesScreen
- `facts.js`: real facts shown outside the storm stages, each with its source
- `fakeFlow.js`: fake data for building screens before the real game is wired

## Rules
- Use the shared components in `src/ui/components/` (Dev 3). Do not change them.
- Never put game rules here. The engine decides everything.
- Get state from `useGameSession` and views from `src/realtime/engineAdapter.js`.
- Every fact shown to players has a source link that points to the page it
  came from, and a line in `docs/SOURCES.md`. Open the link and check the
  wording before you add a fact. Never write a fact from memory.
- Saved NASA data is labelled "Archived NASA data, saved on <date>". Never
  present it as live. The app never calls DONKI while it runs.
- Kid-facing text: short sentences, simple words, explain any space word.
- Mobile first: every screen works at 360px wide.
