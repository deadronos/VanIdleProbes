# Product Context

**Why this project exists:**
VanIdleProbes is an exploratory incremental game meant to be compact and easy to extend. It serves as a small codebase for experimenting with game mechanics (production math, entropy, prestige) while remaining accessible for contributors.

**Problems it solves:**
- Provides a clear, single-file reference implementation of an idle game's main loop.
- Demonstrates configuration-driven design for units and upgrades.
- Offers a sandbox for tuning tick-based production and prestige mechanics.

**How it should work:**
- Players build and upgrade probes which generate resources (`metal`, `energy`, `data`, `probes`) each tick.
- Production math is computed centrally in `computeProduction(...)` and applied every tick.
- UI, assets, and configuration live inside the repo — no external services are required.

**User experience goals:**
- Smooth, artifact-free incremental feedback (no jank during ticks).
- Clear progression and discovery through units and upgrades.
- Fast iteration for designers/developers via Vite + React Fast Refresh.

