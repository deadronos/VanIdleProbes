# System Patterns

- **Architecture:** Single-page React + TypeScript app built with Vite. Entry: `src/main.tsx` → `src/App.tsx`.

- **State & domain patterns:** Central game state lives in `App.tsx` using `useState` hooks (resources, units, upgrades, prestige, logs). Configuration-as-data (`UNIT_CONFIG`, `UPGRADE_CONFIG`) drives UI and gameplay.

- **Game loop:** Ticking is driven by `TICK_MS = 250` (see `src/App.tsx`). Production is computed in `computeProduction(...)` which returns a `ProductionSnapshot` applied each tick.

- **Cost & helper functions:** Reuse helpers like `canAffordCost(resources, cost)`, `applyCost(resources, cost)`, and `getUnitCost(key, owned)`.

- **UI patterns:** Unit and upgrade cards are configuration-driven. Styling is in `src/App.css` and class names are reused across the JSX.

- **When to extract modules:** Start single-file for rapid experimentation; extract when file size or cognitive complexity warrants it.

