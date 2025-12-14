# Feature Ideas for Von Idle Probes

Based on the analysis of the existing codebase (`src/game/engine.ts`, `src/App.tsx`) and the project themes in `idea.md`, here are three distinct feature proposals designed to enhance gameplay depth without breaking the core incremental loop.

## 1. Swarm Directives (Strategic Stances)

**Concept:**
Introduce a global "behavior mode" for the swarm, allowing the player to shift focus between different macro-goals (Growth, Harvesting, Exploration) without micromanaging individual units.

**Mechanic:**
The player selects one active **Directive** at a time from a UI dropdown or toggle group. Changing directives might have a short cooldown or a temporary efficiency penalty ("reconfiguration time").

**Proposed Directives:**
*   **Replication Protocol:**
    *   **Effect:** +20% Probe production.
    *   **Penalty:** +10% Entropy generation rate (riskier growth).
    *   **Flavor:** "Prioritizing self-copying subroutines. Error checking relaxed."
*   **Harvest Protocol:**
    *   **Effect:** +25% Metal and Energy production.
    *   **Penalty:** -15% Exploration speed and Data generation.
    *   **Flavor:** "Diverting processing power to mining lasers and solar collectors."
*   **Echo Protocol:**
    *   **Effect:** +30% Data generation and Distance exploration.
    *   **Penalty:** -20% Metal and Energy production.
    *   **Flavor:** "Focusing sensors on deep space signals. Production throttled."

**Implementation Strategy:**
*   **`src/game/config.ts`**: Add `DirectiveKey` type and a `DIRECTIVE_CONFIG` object defining the modifiers.
*   **`src/game/engine.ts`**: Update `computeProduction` to accept the current directive and apply its multipliers to the `ProductionSnapshot`.
*   **`src/App.tsx`**: Add state for `activeDirective` and a UI control in the header or near the resource grid.

---

## 2. Cosmic Anomalies (Discovery System)

**Concept:**
Transform the "Distance" resource from a simple counter into a source of tangible rewards. Instead of just log messages, players uncover "Anomalies" that can be analyzed for permanent bonuses.

**Mechanic:**
*   **Detection:** At specific distance milestones (e.g., every 500 ly), an **Anomaly** appears in a new "Scanner" tab or section.
*   **Analysis:** Scanning an anomaly takes time (active countdown) or costs a lump sum of Data/Energy.
*   **Reward:** Once scanned, it becomes a **Stellar Artifact** providing a permanent passive buff.

**Examples:**
*   **"Dying Neutron Star"**: Unlocks *Dense Matter Synthesis* (+10% Metal cap or production).
*   **"Alien Derelict"**: Unlocks *Xeno-Algorithms* (Unlocks a new generic upgrade or gives free Probes).
*   **"Gravitational Lens"**: Increases Exploration speed by 5% permanently.

**Implementation Strategy:**
*   **`src/game/config.ts`**: Define `Anomaly` and `Artifact` interfaces.
*   **`src/game/save.ts`**: Add `artifacts: string[]` to the save schema to track unlocked bonuses.
*   **`src/game/engine.ts`**: Check for `artifacts` in `computeProduction` and apply their specific bonuses.
*   **`src/App.tsx`**: Add a notification system for new anomalies and a UI for the "Artifact Collection."

---

## 3. Emergency Protocols (Active Skills)

**Concept:**
Add an active layer to the game for players who want to engage more deeply than just waiting. These are "cooldown-based" abilities that offer short-term boosts or crisis management.

**Mechanic:**
An "Operations" panel containing manual skills. Each skill has a cooldown and a resource cost.

**Proposed Skills:**
*   **Emergency Venting:**
    *   **Effect:** Instantly reduces Entropy by 0.30 (30%).
    *   **Cost:** 50% of current Energy storage.
    *   **Cooldown:** 3 minutes.
*   **Temporal Overclock:**
    *   **Effect:** Multiplies all production by 5x for 20 seconds.
    *   **Cost:** 100 Data.
    *   **Cooldown:** 10 minutes.
*   **Deep Scan:**
    *   **Effect:** Instantly grants Data equivalent to 60 seconds of current production.
    *   **Cost:** 200 Energy.
    *   **Cooldown:** 5 minutes.

**Implementation Strategy:**
*   **`src/App.tsx`**:
    *   Manage cooldown timers using `useRef` or state timestamps.
    *   Add the "Operations" UI panel.
*   **`src/game/engine.ts`**:
    *   `computeProduction` might need to know if "Temporal Overclock" is active to apply the 5x multiplier.
    *   Alternatively, handle the logic purely in `App.tsx` by modifying the effective rate passed to the update loop, though integrating into `engine.ts` is cleaner for consistency.
