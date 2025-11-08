# [TASK010] Implement versioned saves, config extraction, offline simulation, and tests

**Status:** Pending  
**Added:** 2025-11-08  
**Updated:** 2025-11-08

## Original Request
Add autosave (default on, localStorage), interactive Export/Import JSON saves with versioning and `meta.appVersion`, implement per-version migrators (v0 → v1), cap offline apply to 24h using 10–60s simulation steps, and add unit tests for migration and offline simulation.

## Thought Process
- Keep `config` and `engine` code separate for testability and to avoid circular imports.  
- The save layer should be small and only orchestrate serialization/migration — real math lives in `engine.ts`.  
- Autosave must be debounced to avoid frequent `localStorage` writes.  
- Offline simulation must be deterministic, capped, and efficient.

## Implementation Plan (ordered)
1. Create `src/game/config.ts`
   - Add and export: `UNIT_CONFIG`, `UPGRADE_CONFIG`, `INITIAL_UNITS`, `INITIAL_UPGRADES`, type aliases used in `src/App.tsx`.
2. Create `src/game/engine.ts`
   - Export `computeProduction(state)` (or re-export existing logic).
   - Implement `simulateOfflineProgress(state, offlineSeconds, stepSec?)`.
3. Create `src/game/save.ts`
   - Export `SaveV1` type, `CURRENT_SAVE_VERSION = 1`, `buildSave(state)`, `saveToLocalStorage`, `loadFromLocalStorage`, `exportSaveFile`, `importSaveFile`, `migrateSave`, `migrate_v0_to_v1`.
4. Edit `src/App.tsx`
   - Import the modules above.
   - Add state: `autosave` (default `true`), `lastSavedAt`.
   - Add debounced autosave effect (2s), save key `vanidleprobes.save.v1`.
   - Add header UI: `Export`, `Import` (hidden `input`), `Autosave` toggle, `Last saved:`.
   - On load, call `loadFromLocalStorage()`, run `migrateSave` if needed, compute `offlineSeconds` and call `simulateOfflineProgress`.
5. Add unit tests
   - `tests/migrate.test.ts`: verify `migrate_v0_to_v1` fills missing keys.
   - `tests/offline.test.ts`: verify `simulateOfflineProgress` (small/offline large cases, clamping, 24h cap).
   - Install `vitest` devDep and add `"test": "vitest"` script.
6. Commit in small steps, update `memory/tasks/_index.md` to include TASK010.

## Subtasks
| ID  | Description | Status | Updated | Notes |
| --- | ----------- | ------ | ------- | ----- |
| 1.1 | Add `src/game/config.ts` | Not Started | 2025-11-08 | Move constants/types |
| 1.2 | Add `src/game/engine.ts` | Not Started | 2025-11-08 | Export compute/simulate |
| 1.3 | Add `src/game/save.ts` | Not Started | 2025-11-08 | Migration & export/import |
| 1.4 | Edit `src/App.tsx` UI & autosave | Not Started | 2025-11-08 | Add controls and load logic |
| 1.5 | Add tests + test runner | Not Started | 2025-11-08 | `migrate` and `offline` tests |
| 1.6 | CI workflow (optional) | Not Started | 2025-11-08 | Run tests on PRs |

## Progress Log
### 2025-11-08
- Task created with implementation plan and design file drafted.
- Waiting for approval to create files and apply changes.

## Acceptance Criteria
- `vanidleprobes.save.v1` persists valid `SaveV1` JSON.
- UI shows `Last saved:` timestamp and export/import controls.
- Import migrates legacy saves (v0) to v1 and preserves/merges required fields.
- Offline gains applied with 24h cap and 10–60s steps.
- Unit tests for migration and offline simulator pass.
