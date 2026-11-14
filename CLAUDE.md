# Mission Link (working title): NASA Space Apps 2026

Challenge: Build a Junior Astronaut Mission Trainer. Players: kids aged 7–12.

## The game in one paragraph
Two-player co-op. One player is the Astronaut on a Moon base. The other is
Mission Control on Earth. A real solar storm (from NASA DONKI data) hits the
base over 6 turns. Mission Control sees the storm data but cannot act. The
Astronaut can act but only sees the base meters. They must talk to survive.
At the end, a "What really happened" screen shows the real storm.
Mars mode: Mission Control's warnings arrive one turn late (real comms delay).

## Modes
- split: both views on one device, no network. This must ALWAYS work. It is our safety net.
- online: two devices synced with Supabase Realtime. The Astronaut device is the host.

## Stack
React + Vite, plain JavaScript, Supabase Realtime, Vitest, deployed on Vercel.
Do not add other libraries without asking the team first.

## Shared contract
@docs/CONTRACT.md

The contract is the only thing all three folders depend on. Never change it
alone: tell the team, agree, then update it in its own small commit.

## Folder ownership
- src/engine/   Dev 1: game rules, storm data, tests
- src/realtime/ Dev 2: rooms, sync, session hook, deploys
- src/ui/       Dev 3: screens, look, end screen
- src/shared/   everyone, only by agreement

Only edit files in your own folder. If you need something from another
folder, ask its owner or use fake data until it is ready.

## Working rules
- git pull before every session. Commit small and often with clear messages.
- `npm test` must pass before you push.
- Kid-facing text: short sentences, simple words, explain any space word.
- Every NASA fact or number shown to players needs a line in docs/SOURCES.md.
- Never put keys in code. Use .env (VITE_ prefix) and keep .env out of git.

## Milestones
@docs/MILESTONES.md
