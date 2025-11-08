Purpose
-------
This file gives focused, repository-specific instructions for AI coding assistants (Copilot-style agents) so they can be productive immediately. It documents the app architecture, developer workflows, and the concrete code patterns you should follow when making changes.

Quick start (commands)
----------------------
- Dev server: npm run dev  (starts Vite with React Fast Refresh)
- Build: npm run build  (runs tsc -b then vite build)
- Preview production bundle: npm run preview
- Lint: npm run lint

High-level architecture
-----------------------
- Single-page client app built with React + TypeScript + Vite. No backend or env variables—everything is client-side under `src/`.
- Entry point: `src/main.tsx` → `src/App.tsx`. `App.tsx` contains the core game loop and UI.
- Key dev-time integration: Vite configured in `vite.config.ts` using `@vitejs/plugin-react` with `babel-plugin-react-compiler` enabled. Expect React compiler/transform behavior when editing JSX/TSX.

State & domain patterns (concrete examples)
-----------------------------------------
- Central state is local to `App.tsx` using React `useState` hooks: `resources`, `units`, `upgradeState`, `prestige`, and `logs`.
- Configuration-as-data: Unit and upgrade definitions are plain objects near the top of `src/App.tsx`:
  - `UNIT_CONFIG` (add or change unit props here; also update `INITIAL_UNITS` and the `UnitKey` union)
  - `UPGRADE_CONFIG` (add upgrades here; remember to update `INITIAL_UPGRADES` and `UpgradeKey`)
- Resource, unit, and upgrade keys are string unions (e.g. `type ResourceKey = 'metal' | 'energy' | 'data' | 'probes'`) — keep keys consistent across `INITIAL_*`, config objects, and helper functions.
- Cost helpers you will reuse:
  - `canAffordCost(resources, cost)`
  - `applyCost(resources, cost)`
  - `getUnitCost(key, owned)`

Game loop & production logic
----------------------------
- Ticking is driven in `App.tsx` by a setInterval using `TICK_MS = 250`. Production is computed in `computeProduction(...)` which returns a `ProductionSnapshot` used to increment resources each tick.
- Entropy, latency, and prestige logic live inside `computeProduction` and downstream UI/handlers (e.g. `handlePrestige` persists `quantumMemory` specially). If changing prestige/upgrade persistence, update `handlePrestige` accordingly.

UI & styling notes
-----------------
- Styling lives in `src/App.css` and class names are used across the JSX in `App.tsx` (e.g. `.unit-card`, `.upgrade-card`, `.entropy-fill`). Follow the existing class names and CSS variable usage (accent colors are `--accent-*`).
- Starfield and small visual effects are generated programmatically (see `starfield` useMemo in `App.tsx`). Reuse that pattern for similar background visuals.

When adding features (concrete checklist)
---------------------------------------
1. Add domain config: update the appropriate CONFIG object in `src/App.tsx` and the corresponding INITIAL_* and union types.
2. Update cost, display label, and any milestone arrays (e.g. `distanceMilestones`, `dataMilestones`) if the feature influences progression.
3. Update `computeProduction` if the feature affects production math or entropy.
4. Add UI in the appropriate section of `App.tsx` (units, upgrades, resource grid); follow existing markup and CSS variables.
5. Run `npm run dev` and verify the UI and console for runtime errors; lint with `npm run lint`.

Important files to reference
--------------------------
- `src/App.tsx` — core logic, configs, and UI
- `vite.config.ts` — Vite + React compiler setup
- `package.json` — scripts and deps (dev: vite, build: tsc + vite)
- `eslint.config.js`, `tsconfig.*` — editor/lint/build guidance

No hidden services or envs
-------------------------
There are no server-side integrations, environment secrets, or CI-provided variables in the repo. Do not add assumptions about network APIs or environment variables unless you also update the repo to include appropriate configuration and docs.

Ask before
----------
- Changing the tick rate or replacing the single-file state model with a store (Redux/MobX) — discuss trade-offs.
- Adding persistent storage, telemetry, or backend calls — these are global design changes and need an agreed API and config.

If something is unclear or you want me to expand examples (unit/upgrade creation, tests, or a refactor plan), tell me which area and I'll update this file.
