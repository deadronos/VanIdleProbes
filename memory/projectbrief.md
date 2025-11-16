# Project Brief

**Project:** VanIdleProbes

**Repository path:** `d:/GitHub/VanIdleProbes`

**Summary:** VanIdleProbes is a lightweight browser-based incremental/idle game built with React + TypeScript + Vite. Players manage and upgrade probes that gather resources over time. The codebase favors configuration-as-data and a single-file core game loop for fast iteration.

**Primary objectives:**
- Keep the core gameplay logic easy to find and change (centralized in `src/App.tsx`).
- Make it trivial to add units/upgrades by changing configuration objects (`UNIT_CONFIG`, `UPGRADE_CONFIG`).
- Fast developer feedback loop using `npm run dev` (Vite).
- No backend or external services; everything runs client-side.

**Acceptance criteria (EARS-style):**
- WHEN the developer runs `npm run dev`, THE app starts and resources update every tick. (Acceptance: Dev server runs and UI shows resource increments with no console errors.)
- WHEN a new unit is added to `UNIT_CONFIG`, THE UI automatically renders a card for it. (Acceptance: New unit appears without changes to other UI logic.)
- WHEN an upgrade is purchased, THE production calculations reflect the change. (Acceptance: Resource delta is visible in the next tick snapshot.)

**Primary maintainers / contacts:**
- Repo owner: `deadronos` (GitHub)

**Notes:**
- Use the `memory/` folder to keep project context, tasks, designs, and progress logs.

*Created on 2025-11-08*