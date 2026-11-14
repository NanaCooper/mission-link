# Dev 2: Rooms, sync and deploys

You own `src/realtime/`. Edit nothing outside it. Read @../../docs/CONTRACT.md first.

## What to build
- `supabaseClient.js` reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
- `room.js`: `createRoom()` makes a code like MOON-4821 (host = Astronaut),
  `joinRoom(code)` (guest = Mission Control). Use Realtime broadcast + presence.
  No database tables needed.
- `useGameSession({ mode, role, code })` from the contract. This is what the UI uses.

## How the session hook behaves
- split: holds state locally (useReducer) and calls the engine directly.
- online host: same as split, plus broadcast `stateUpdate` after every change,
  and apply incoming `sendWarning` events through the engine.
- online guest: never runs the engine. Shows the latest `stateUpdate`.
  Sends `requestState` on join and on reconnect.

## Rules
- The host is the single source of truth.
- Every message carries `turn`. Ignore messages from an old turn.
- Reject a third player: if presence already shows two people, show "Room full".
- If the partner disconnects, set partnerConnected = false so the UI can show
  "Waiting for your partner" instead of breaking.
- Until the engine is ready, use a tiny fake engine so you are not blocked.
- The Mars delay lives in the engine, not in the network. Do not add delays here.

## Testing
- Build and test with two browser tabs on one laptop.
- Before calling M3 done: two phones, one on Wi-Fi and one on mobile data.

## Deploys
- Vercel with the two env vars set in the dashboard.
- Deploy at M2 and after every milestone, so a working link always exists.
- The Home screen must always offer split-screen, in case venue Wi-Fi fails.
