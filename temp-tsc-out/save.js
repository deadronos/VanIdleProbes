// Minimal local defaults copied from `config.ts` to avoid runtime import during test transforms
const INITIAL_RESOURCES = {
    metal: 80,
    energy: 30,
    data: 0,
    probes: 4,
    entropy: 0.04,
    distance: 0,
};
const INITIAL_UNITS = {
    harvesters: 1,
    foundries: 0,
    fabricators: 0,
    archives: 0,
    signalRelays: 0,
    stabilizers: 0,
};
const INITIAL_PRESTIGE = {
    cycles: 0,
    storedKnowledge: 0,
};
const INITIAL_UPGRADES = {
    autonomy: false,
    dysonSheath: false,
    autoforge: false,
    archiveBloom: false,
    quantumMemory: false,
    stellarCartography: false,
};
export const CURRENT_SAVE_VERSION = 1;
export const SAVE_KEY = 'vanidleprobes.save.v1';
export const buildSave = (state, appVersion = '0.0.0') => ({
    version: CURRENT_SAVE_VERSION,
    savedAt: new Date().toISOString(),
    meta: { appVersion },
    state,
});
export const saveToLocalStorage = (save) => {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    }
    catch (e) {
        console.warn('Failed to save to localStorage', e);
    }
};
export const loadFromLocalStorage = () => {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw)
            return null;
        return JSON.parse(raw);
    }
    catch (e) {
        console.warn('Failed to load save', e);
        return null;
    }
};
export const exportSaveFile = (save, filename = `vanidleprobes-save-${save.savedAt}.json`) => {
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
export const importSaveFile = async (file) => {
    const text = await file.text();
    const parsed = JSON.parse(text);
    return migrateSave(parsed);
};
export const migrate_v0_to_v1 = (raw) => {
    const rawObj = raw ?? {};
    const stateCandidate = rawObj.state ?? rawObj;
    const resourcesObj = stateCandidate.resources ?? {};
    const resources = {
        ...INITIAL_RESOURCES,
        metal: resourcesObj.metal ?? stateCandidate.metal ?? INITIAL_RESOURCES.metal,
        energy: resourcesObj.energy ?? stateCandidate.energy ?? INITIAL_RESOURCES.energy,
        data: resourcesObj.data ?? stateCandidate.data ?? INITIAL_RESOURCES.data,
        probes: resourcesObj.probes ?? stateCandidate.probes ?? INITIAL_RESOURCES.probes,
        entropy: resourcesObj.entropy ?? stateCandidate.entropy ?? INITIAL_RESOURCES.entropy,
        distance: resourcesObj.distance ?? stateCandidate.distance ?? INITIAL_RESOURCES.distance,
    };
    const unitsRaw = stateCandidate.units ?? {};
    const units = { ...INITIAL_UNITS };
    for (const k of Object.keys(INITIAL_UNITS)) {
        const v = unitsRaw[k];
        units[k] = (typeof v === 'number' ? v : INITIAL_UNITS[k]);
    }
    const prestigeRaw = stateCandidate.prestige ?? {};
    const prestige = {
        cycles: prestigeRaw.cycles ?? INITIAL_PRESTIGE.cycles,
        storedKnowledge: prestigeRaw.storedKnowledge ?? INITIAL_PRESTIGE.storedKnowledge,
    };
    const upgradeStateRaw = stateCandidate.upgradeState ?? {};
    const upgradeStateObj = { ...INITIAL_UPGRADES };
    for (const k of Object.keys(INITIAL_UPGRADES)) {
        const v = upgradeStateRaw[k];
        upgradeStateObj[k] = typeof v === 'boolean' ? v : INITIAL_UPGRADES[k];
    }
    const logs = stateCandidate.logs ?? [];
    const save = {
        version: CURRENT_SAVE_VERSION,
        savedAt: new Date().toISOString(),
        meta: { appVersion: '0.0.0' },
        state: {
            resources,
            units,
            prestige,
            upgradeState: upgradeStateObj,
            logs,
        },
    };
    return save;
};
export const migrateSave = (raw) => {
    if (!raw)
        throw new Error('No save data provided');
    const rawObj = raw;
    const ver = Number(rawObj.version);
    if (!Number.isFinite(ver) || ver < 1) {
        return migrate_v0_to_v1(raw);
    }
    if (ver === CURRENT_SAVE_VERSION) {
        return raw;
    }
    // Future migration chain would go here
    throw new Error(`Unsupported save version: ${ver}`);
};
