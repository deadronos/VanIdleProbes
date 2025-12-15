import { describe, it, expect } from 'vitest';
import { migrate_v2_to_v3, migrateSave, CURRENT_SAVE_VERSION } from '../src/game/save';
import { INITIAL_RESOURCES, INITIAL_UNITS } from '../src/game/config';

describe('Save Migration V2 -> V3', () => {
  it('initializes scannedAnomalies as empty array', () => {
    const rawV2 = {
      version: 2,
      savedAt: new Date().toISOString(),
      meta: { appVersion: '0.0.0' },
      state: {
        resources: { ...INITIAL_RESOURCES },
        units: { ...INITIAL_UNITS },
        prestige: { cycles: 0, storedKnowledge: 0, forks: 0, primeArchives: 0 },
        upgradeState: {},
        logs: [],
      }
    };

    const saveV3 = migrate_v2_to_v3(rawV2);
    expect(saveV3.version).toBe(3);
    expect(saveV3.state.scannedAnomalies).toBeDefined();
    expect(Array.isArray(saveV3.state.scannedAnomalies)).toBe(true);
    expect(saveV3.state.scannedAnomalies.length).toBe(0);
  });

  it('migrateSave handles v2 input correctly', () => {
     const rawV2 = {
      version: 2,
      savedAt: new Date().toISOString(),
      meta: { appVersion: '0.0.0' },
      state: {
        resources: { ...INITIAL_RESOURCES },
        units: { ...INITIAL_UNITS },
        prestige: { cycles: 0, storedKnowledge: 0, forks: 0, primeArchives: 0 },
        upgradeState: {},
        logs: [],
      }
    };
    const save = migrateSave(rawV2);
    expect(save.version).toBe(CURRENT_SAVE_VERSION);
    expect(save.state.scannedAnomalies).toEqual([]);
  });
});
