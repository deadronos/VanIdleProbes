# Progress

**Date:** 2025-11-08

## What works
- Repository skeleton and client app are present.
- Core tick loop and production math are centralized in `src/App.tsx` (pattern documented in `memory/systemPatterns.md`).
- Dev scripts are available in `package.json` (`npm run dev`, `npm run build`, `npm run lint`).

## What's left to build
- Add design docs for major features (prestige, entropy, UI flows).
- Add persistent save/load (if desired).
- Break up `App.tsx` into modules when complexity grows.

## Current status
- Memory bank seeded with core documents and an initial tasks entry.
- Next: track future tasks in `memory/tasks/_index.md` and create task-specific files as work continues.

