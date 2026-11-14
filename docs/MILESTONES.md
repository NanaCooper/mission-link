# Milestones

No clock times. Move to the next milestone only when the current one works
and is merged into main. If you finish early, go straight to polish (M6).

The only fixed time: submission closes Sunday 15 Nov, 11:59 PM local time.
Submit a working version as soon as M5 is done. Check the Project tab for
whether you can keep editing until the deadline, and for what it requires.

## M0 Setup (all three together)
- GitHub repo, React + Vite, Vitest, ESLint
- Supabase project and Vercel project created, keys in .env
- `src/shared/contract.js` written from docs/CONTRACT.md
- Everyone can run `npm run dev` and `npm test`

## M1 Parts working on fake data (in parallel)
- Dev 1: engine passes its tests with a placeholder storm
- Dev 2: two browser tabs join one room and pass a test message
- Dev 3: all screens render from fake state

## M2 Split-screen works end to end (SAFETY NET)
- Engine + session hook + UI connected on one device
- A full game can be won and lost
- Deploy to Vercel

## M3 Online works
- Two devices play a full game through a room code
- Partner disconnect shows a clear message instead of breaking
- Tested on two phones, one on mobile data

## M4 Real storm
- Real DONKI storm JSON replaces the placeholder
- "What really happened" end screen filled in
- Sources added to docs/SOURCES.md

## M5 Playtest
- Someone outside the team plays without help
- Fix anything they found confusing
- Submit a first working version

## M6 Polish and stretch (in this order, stop whenever)
1. Mars mode (one-turn warning delay)
2. Sounds and small animations
3. Read-aloud for younger kids
4. Short "teacher tips" screen with discussion questions
5. A second storm
6. Twi language option

## M7 Submission pack
- Demo video recorded on two real phones
- Project page text: problem, solution, how it uses NASA data
- All sources and tools listed (including AI tools used)
