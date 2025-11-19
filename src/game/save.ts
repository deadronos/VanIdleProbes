// Local type definitions to avoid importing from `config` during test transforms
type ResourceState = {
  metal: number
  energy: number
  data: number
  probes: number
  entropy: number
  distance: number
}

type UnitKey =
  | 'harvesters'
  | 'foundries'
  | 'fabricators'
  | 'archives'
  | 'signalRelays'
  | 'stabilizers'

interface PrestigeState {
  cycles: number
  storedKnowledge: number
  forks: number
  primeArchives: number
}

type UpgradeKey =
  | 'autonomy'
  | 'dysonSheath'
  | 'autoforge'
  | 'archiveBloom'
  | 'quantumMemory'
  | 'stellarCartography'

type UpgradeState = Record<UpgradeKey, boolean>

// Minimal local defaults copied from `config.ts` to avoid runtime import during test transforms
const INITIAL_RESOURCES: ResourceState = {
  metal: 95,
  energy: 45,
  data: 0,
  probes: 6,
  entropy: 0.03,
  distance: 0,
}

const INITIAL_UNITS: Record<UnitKey, number> = {
  harvesters: 2,
  foundries: 0,
  fabricators: 0,
  archives: 0,
  signalRelays: 0,
  stabilizers: 0,
}

const INITIAL_PRESTIGE: PrestigeState = {
  cycles: 0,
  storedKnowledge: 0,
  forks: 0,
  primeArchives: 0,
}

const INITIAL_UPGRADES: Record<string, boolean> = {
  autonomy: false,
  dysonSheath: false,
  autoforge: false,
  archiveBloom: false,
  quantumMemory: false,
  stellarCartography: false,
}

export const CURRENT_SAVE_VERSION = 2
export const SAVE_KEY = 'vanidleprobes.save.v2'

export interface SaveV2 {
  version: 2
  savedAt: string
  meta: {
    appVersion: string
  }
  state: {
    resources: ResourceState
    units: Record<UnitKey, number>
    prestige: PrestigeState
    upgradeState: UpgradeState
    logs?: string[]
  }
}

export const buildSave = (
  state: SaveV2['state'],
  appVersion = '0.0.0',
): SaveV2 => ({
  version: CURRENT_SAVE_VERSION,
  savedAt: new Date().toISOString(),
  meta: { appVersion },
  state,
})

export const saveToLocalStorage = (save: SaveV2) => {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save))
  } catch (e) {
    console.warn('Failed to save to localStorage', e)
  }
}

export const loadFromLocalStorage = (): unknown | null => {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (e) {
    console.warn('Failed to load save', e)
    return null
  }
}

export const exportSaveFile = (save: SaveV2, filename = `vanidleprobes-save-${save.savedAt}.json`) => {
  const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export const importSaveFile = async (file: File): Promise<SaveV2> => {
  const text = await file.text()
  const parsed = JSON.parse(text)
  return migrateSave(parsed)
}

export const migrate_v0_to_v1 = (raw: unknown): SaveV2 => {
  const rawObj = (raw as Record<string, unknown>) ?? {}
  const stateCandidate = (rawObj.state as Record<string, unknown>) ?? rawObj

  const resourcesObj = (stateCandidate.resources as Record<string, unknown>) ?? {}
  const resources = {
    ...INITIAL_RESOURCES,
    metal: (resourcesObj.metal as number) ?? (stateCandidate.metal as number) ?? INITIAL_RESOURCES.metal,
    energy: (resourcesObj.energy as number) ?? (stateCandidate.energy as number) ?? INITIAL_RESOURCES.energy,
    data: (resourcesObj.data as number) ?? (stateCandidate.data as number) ?? INITIAL_RESOURCES.data,
    probes: (resourcesObj.probes as number) ?? (stateCandidate.probes as number) ?? INITIAL_RESOURCES.probes,
    entropy: (resourcesObj.entropy as number) ?? (stateCandidate.entropy as number) ?? INITIAL_RESOURCES.entropy,
    distance: (resourcesObj.distance as number) ?? (stateCandidate.distance as number) ?? INITIAL_RESOURCES.distance,
  }

  const unitsRaw = (stateCandidate.units as Record<string, unknown>) ?? {}
  const units: Record<UnitKey, number> = { ...INITIAL_UNITS }
  for (const k of Object.keys(INITIAL_UNITS) as UnitKey[]) {
    const v = unitsRaw[k as string]
    units[k] = (typeof v === 'number' ? (v as number) : INITIAL_UNITS[k])
  }

  const prestigeRaw = (stateCandidate.prestige as Record<string, unknown>) ?? {}
  const prestige = {
    cycles: (prestigeRaw.cycles as number) ?? INITIAL_PRESTIGE.cycles,
    storedKnowledge: (prestigeRaw.storedKnowledge as number) ?? INITIAL_PRESTIGE.storedKnowledge,
    forks: (prestigeRaw.forks as number) ?? INITIAL_PRESTIGE.forks,
    primeArchives: (prestigeRaw.primeArchives as number) ?? INITIAL_PRESTIGE.primeArchives,
  }

  const upgradeStateRaw = (stateCandidate.upgradeState as Record<string, unknown>) ?? {}
  const upgradeStateObj: Record<string, boolean> = { ...INITIAL_UPGRADES }
  for (const k of Object.keys(INITIAL_UPGRADES)) {
    const v = upgradeStateRaw[k]
    upgradeStateObj[k] = typeof v === 'boolean' ? (v as boolean) : (INITIAL_UPGRADES as Record<string, boolean>)[k]
  }

  const logs = (stateCandidate.logs as string[]) ?? []

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
  }

  return save
}

export const migrate_v1_to_v2 = (raw: unknown): SaveV2 => {
  const previous = migrate_v0_to_v1(raw)
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
  }
}

export const migrateSave = (raw: unknown): SaveV2 => {
  if (!raw) throw new Error('No save data provided')
  const rawObj = raw as Record<string, unknown>
  const ver = Number(rawObj.version)
  if (!Number.isFinite(ver) || ver < 1) {
    return migrate_v0_to_v1(raw)
  }
  if (ver === 1) {
    return migrate_v1_to_v2(raw)
  }
  if (ver === CURRENT_SAVE_VERSION) {
    return raw as SaveV2
  }
  // Future migration chain would go here
  throw new Error(`Unsupported save version: ${ver}`)
}
