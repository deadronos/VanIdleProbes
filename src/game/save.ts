import type { ResourceState, UnitKey, PrestigeState, UpgradeState } from './config';
import {
  INITIAL_RESOURCES,
  INITIAL_UNITS,
  INITIAL_PRESTIGE,
  INITIAL_UPGRADES,
} from './config';

/** The current version number for the save file format. */
export const CURRENT_SAVE_VERSION = 2;
/** The key used for storing save data in localStorage. */
export const SAVE_KEY = 'vanidleprobes.save.v2';

/**
 * Interface representing the structure of a version 2 save file.
 */
export interface SaveV2 {
  /** The version of the save format (must be 2). */
  version: 2
  /** ISO timestamp string of when the save was created. */
  savedAt: string
  /** Metadata about the application environment. */
  meta: {
    /** The version of the application that created the save. */
    appVersion: string
  }
  /** The actual game state data. */
  state: {
    resources: ResourceState
    units: Record<UnitKey, number>
    prestige: PrestigeState
    upgradeState: UpgradeState
    logs?: string[]
  }
}

/**
 * Constructs a full save object from the current game state.
 *
 * @param state - The current game state (resources, units, etc.).
 * @param appVersion - The current version of the application.
 * @returns A complete `SaveV2` object ready for storage.
 */
export const buildSave = (
  state: SaveV2['state'],
  appVersion = '0.0.0',
): SaveV2 => ({
  version: CURRENT_SAVE_VERSION,
  savedAt: new Date().toISOString(),
  meta: { appVersion },
  state,
});

/**
 * Persists the save object to the browser's localStorage.
 * Handles potential storage quotas or access errors gracefully.
 *
 * @param save - The save object to store.
 */
export const saveToLocalStorage = (save: SaveV2) => {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (e) {
    console.warn('Failed to save to localStorage', e);
  }
};

/**
 * Retrieves and parses the save data from localStorage.
 *
 * @returns The parsed save object (as `unknown`) or `null` if no save exists or parsing failed.
 */
export const loadFromLocalStorage = (): unknown | null => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load save', e);
    return null;
  }
};

/**
 * Triggers a browser download of the current save state as a JSON file.
 *
 * @param save - The save object to export.
 * @param filename - The default filename for the downloaded file.
 */
export const exportSaveFile = (save: SaveV2, filename = `vanidleprobes-save-${save.savedAt}.json`) => {
  const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/**
 * Reads and parses a save file uploaded by the user.
 * Automatically attempts to migrate the save to the current version.
 *
 * @param file - The file object from a file input.
 * @returns A promise resolving to the migrated `SaveV2` object.
 */
export const importSaveFile = async (file: File): Promise<SaveV2> => {
  const text = await file.text();
  const parsed = JSON.parse(text);
  return migrateSave(parsed);
};

/**
 * Migrates a legacy (v0 or partial) save structure to the v1/v2 format.
 * Fills in missing fields with initial values.
 *
 * @param raw - The raw, potentially unstructured save data.
 * @returns A strictly typed `SaveV2` object (conceptually v1, but interface is compatible).
 */
export const migrate_v0_to_v1 = (raw: unknown): SaveV2 => {
  const rawObj = (raw as Record<string, unknown>) ?? {};
  const stateCandidate = (rawObj.state as Record<string, unknown>) ?? rawObj;

  const resourcesObj = (stateCandidate.resources as Record<string, unknown>) ?? {};
  const resources = {
    ...INITIAL_RESOURCES,
    metal: (resourcesObj.metal as number) ?? (stateCandidate.metal as number) ?? INITIAL_RESOURCES.metal,
    energy: (resourcesObj.energy as number) ?? (stateCandidate.energy as number) ?? INITIAL_RESOURCES.energy,
    data: (resourcesObj.data as number) ?? (stateCandidate.data as number) ?? INITIAL_RESOURCES.data,
    probes: (resourcesObj.probes as number) ?? (stateCandidate.probes as number) ?? INITIAL_RESOURCES.probes,
    entropy: (resourcesObj.entropy as number) ?? (stateCandidate.entropy as number) ?? INITIAL_RESOURCES.entropy,
    distance: (resourcesObj.distance as number) ?? (stateCandidate.distance as number) ?? INITIAL_RESOURCES.distance,
  };

  const unitsRaw = (stateCandidate.units as Record<string, unknown>) ?? {};
  const units: Record<UnitKey, number> = { ...INITIAL_UNITS };
  for (const k of Object.keys(INITIAL_UNITS) as UnitKey[]) {
    const v = unitsRaw[k as string];
    units[k] = (typeof v === 'number' ? (v as number) : INITIAL_UNITS[k]);
  }

  const prestigeRaw = (stateCandidate.prestige as Record<string, unknown>) ?? {};
  const prestige = {
    cycles: (prestigeRaw.cycles as number) ?? INITIAL_PRESTIGE.cycles,
    storedKnowledge: (prestigeRaw.storedKnowledge as number) ?? INITIAL_PRESTIGE.storedKnowledge,
    forks: (prestigeRaw.forks as number) ?? INITIAL_PRESTIGE.forks,
    primeArchives: (prestigeRaw.primeArchives as number) ?? INITIAL_PRESTIGE.primeArchives,
  };

  const upgradeStateRaw = (stateCandidate.upgradeState as Record<string, unknown>) ?? {};
  const upgradeStateObj: Record<string, boolean> = { ...INITIAL_UPGRADES };
  for (const k of Object.keys(INITIAL_UPGRADES)) {
    const v = upgradeStateRaw[k];
    upgradeStateObj[k] = typeof v === 'boolean' ? (v as boolean) : (INITIAL_UPGRADES as Record<string, boolean>)[k];
  }

  const logs = (stateCandidate.logs as string[]) ?? [];

  const save: SaveV2 = {
    version: CURRENT_SAVE_VERSION,
    savedAt: new Date().toISOString(),
    meta: { appVersion: '0.0.0' },
    state: {
      resources,
      units,
      prestige,
      upgradeState: upgradeStateObj as UpgradeState,
      logs,
    },
  };

  return save;
};

/**
 * Migrates a v1 save to v2.
 * Initializes new prestige fields (forks, primeArchives) if missing.
 *
 * @param raw - The v1 save data.
 * @returns A valid `SaveV2` object.
 */
export const migrate_v1_to_v2 = (raw: unknown): SaveV2 => {
  const previous = migrate_v0_to_v1(raw);
  return {
    ...previous,
    version: 2,
    state: {
      ...previous.state,
      prestige: {
        ...previous.state.prestige,
        forks: 0,
        primeArchives: 0,
      },
    },
  };
};

/**
 * Main entry point for save migration.
 * Routes the raw save data through the appropriate migration chain based on its version.
 *
 * @param raw - The raw save data loaded from storage or file.
 * @returns The fully migrated `SaveV2` object.
 * @throws If the save version is unsupported or data is missing.
 */
export const migrateSave = (raw: unknown): SaveV2 => {
  if (!raw) throw new Error('No save data provided');
  const rawObj = raw as Record<string, unknown>;
  const ver = Number(rawObj.version);
  if (!Number.isFinite(ver) || ver < 1) {
    return migrate_v0_to_v1(raw);
  }
  if (ver === 1) {
    return migrate_v1_to_v2(raw);
  }
  if (ver === CURRENT_SAVE_VERSION) {
    return raw as SaveV2;
  }
  // Future migration chain would go here
  throw new Error(`Unsupported save version: ${ver}`);
};
