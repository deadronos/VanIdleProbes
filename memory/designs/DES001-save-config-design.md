# [DESIGN001] Save Format, Config Extraction, Offline Simulation

**Status:** Draft  
**Created:** 2025-11-08  
**Author:** assistant

## Purpose
Introduce robust, versioned local saves (autosave default ON), interactive Export/Import (JSON), migration (v0→v1), an offline progress application capped at 24h with 10–60s step sizes, and move static configs to `src/game/config.ts` for maintainability and testability.

## Requirements (EARS)
- WHEN the app state changes, THE SYSTEM SHALL persist the game to `localStorage` (Acceptance: `vanidleprobes.save.v1` appears with valid JSON and `version:1`).
- WHEN a user clicks Export, THE SYSTEM SHALL download a versioned JSON save (Acceptance: file includes `version`, `savedAt`, `meta.appVersion`, `state`).
- WHEN a user imports a JSON save, THE SYSTEM SHALL migrate it to the current save format and optionally apply offline progress (Acceptance: loaded state merges safely, UI shows `Last saved:` and migration logs).
- WHEN a save is loaded and `savedAt` is in the past, THE SYSTEM SHALL simulate offline gains up to 24 hours using 10–60s timesteps (Acceptance: resources increase sensibly; entropy/distance clamped as per engine).

## High-level architecture
- `src/game/config.ts` — exported constants & types: `UNIT_CONFIG`, `UPGRADE_CONFIG`, `INITIAL_UNITS`, `INITIAL_UPGRADES`, `ResourceKey`, `UnitKey`, `UpgradeKey`, etc.
- `src/game/engine.ts` — `computeProduction(state)`, `applyProductionStep(state, prod, seconds)`, `simulateOfflineProgress(state, seconds, stepSec?)`.
- `src/game/save.ts` — `buildSave(state)`, `saveToLocalStorage`, `loadFromLocalStorage`, `exportSaveFile`, `importSaveFile`, `migrateSave(raw)`, `migrate_v0_to_v1(raw)`.
- `src/App.tsx` — UI wiring: autosave toggle (default ON), `Export` / `Import` controls, `LastSavedAt` display. Imports from the `game` modules.

## Save format (v1)
- `key`: `vanidleprobes.save.v1`
- JSON shape:
  - `version`: 1
  - `savedAt`: ISO8601 string or epoch ms
  - `meta`: `{ appVersion: string }`
  - `state`:
    - `resources`: `{ metal, energy, data, probes, entropy, distance }`
    - `units`: `{ <UnitKey>: number }`
    - `prestige`: `{ cycles, storedKnowledge }`
    - `upgradeState`: `{ <UpgradeKey>: boolean }`
    - `logs`: `string[]` (optional)

## Migration
- Detect v0: missing `version` or non-number `version`.
- Migrator chain:
  - `migrate_v0_to_v1(raw)` → returns `SaveV1` by merging `raw.state` with `INITIAL_*`.
  - `migrateSave(raw)` orchestrates successive migrations until `version === CURRENT_SAVE_VERSION`.
- Always set `meta.appVersion` (use `package.json` when saving).

## Offline simulation (algorithm)
- Compute `offlineSeconds = min(86400, floor((now - savedAt) / 1000))`.
- Choose `stepSec = clamp(Math.ceil(offlineSeconds / 120), 10, 60)` (ensures 2–1440 steps).
- Loop `for i in 0..steps-1`:
  - `prod = computeProduction(state)`
  - apply `state.resources += prod * stepSec`
  - clamp entropy/distance or other bounded fields
- Append a short log entry: `"Recovered X resources over Y offline"`.

## UI placement & handlers
- Add `save-controls` area in header (right side). Handlers:
  - `handleExportSave()`
  - `handleImportSave(file)`
  - `handleToggleAutosave()`
  - `handleManualSave()` (optional)
- CSS classes: `save-controls`, `autosave-toggle`, `import-input`, `last-saved`.

## Acceptance Criteria
- Autosave enabled by default, debounced (2s).
- Export downloads a valid `SaveV1` JSON.
- Import runs migrations and asks for confirmation before replacing state.
- Offline gains applied correctly and capped at 24h.
- Unit tests exist for `migrate_v0_to_v1` and `simulateOfflineProgress`.
