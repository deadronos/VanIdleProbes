export type ResourceKey = 'metal' | 'energy' | 'data' | 'probes'

export type ResourceState = {
  metal: number
  energy: number
  data: number
  probes: number
  entropy: number
  distance: number
}

export type UnitKey =
  | 'harvesters'
  | 'foundries'
  | 'fabricators'
  | 'archives'
  | 'signalRelays'
  | 'stabilizers'

export type UpgradeKey =
  | 'autonomy'
  | 'dysonSheath'
  | 'autoforge'
  | 'archiveBloom'
  | 'quantumMemory'
  | 'stellarCartography'

export interface Cost {
  metal?: number
  energy?: number
  data?: number
  probes?: number
}

export interface UnitConfig {
  name: string
  description: string
  accent: string
  icon: string
  baseCost: Cost
  costGrowth: number
}

export interface UpgradeConfig {
  name: string
  description: string
  effect: string
  accent: string
  cost: Cost
  requiresCycle?: number
  persistent?: boolean
}

export interface PrestigeState {
  cycles: number
  storedKnowledge: number
}

export type UpgradeState = Record<UpgradeKey, boolean>

export const INITIAL_RESOURCES: ResourceState = {
  metal: 95,
  energy: 45,
  data: 0,
  probes: 6,
  entropy: 0.03,
  distance: 0,
}

export const INITIAL_UNITS: Record<UnitKey, number> = {
  harvesters: 2,
  foundries: 0,
  fabricators: 0,
  archives: 0,
  signalRelays: 0,
  stabilizers: 0,
}

export const INITIAL_PRESTIGE: PrestigeState = {
  cycles: 0,
  storedKnowledge: 0,
}

export const INITIAL_UPGRADES: Record<UpgradeKey, boolean> = {
  autonomy: false,
  dysonSheath: false,
  autoforge: false,
  archiveBloom: false,
  quantumMemory: false,
  stellarCartography: false,
}

export const UNIT_CONFIG: Record<UnitKey, UnitConfig> = {
  harvesters: {
    name: 'Harvester Drones',
    description: 'Strip-mine asteroids for raw mass. Backbone of the network.',
    accent: 'var(--accent-cyan)',
    icon: '🛠️',
    baseCost: { metal: 30 },
    costGrowth: 1.13,
  },
  foundries: {
    name: 'Stellar Foundries',
    description: 'Smelt mined ore into directed energy beams.',
    accent: 'var(--accent-gold)',
    icon: '⚙️',
    baseCost: { metal: 130, energy: 15 },
    costGrowth: 1.15,
  },
  fabricators: {
    name: 'Autofabricators',
    description: 'Assemble new Von Neumann probes from raw materials.',
    accent: 'var(--accent-magenta)',
    icon: '🛰️',
    baseCost: { metal: 220, energy: 75 },
    costGrowth: 1.2,
  },
  archives: {
    name: 'Archive Spires',
    description: 'Observe and catalogue every discovery into crystalline memory.',
    accent: 'var(--accent-violet)',
    icon: '📡',
    baseCost: { metal: 210, energy: 90, data: 14 },
    costGrowth: 1.17,
  },
  signalRelays: {
    name: 'Signal Relays',
    description: 'Extend the mesh network. Mitigates light-delay penalties.',
    accent: 'var(--accent-blue)',
    icon: '📶',
    baseCost: { metal: 180, energy: 140 },
    costGrowth: 1.17,
  },
  stabilizers: {
    name: 'Entropy Dampers',
    description: 'Phase-lock stray mutations and keep replication precise.',
    accent: 'var(--accent-green)',
    icon: '🧊',
    baseCost: { metal: 280, energy: 185, data: 38 },
    costGrowth: 1.2,
  },
}

export const UPGRADE_CONFIG: Record<UpgradeKey, UpgradeConfig> = {
  autonomy: {
    name: 'Autonomy Firmware',
    description: 'Let remote probes self-correct. Sharply reduces latency.',
    effect: '+25% exploration speed and +20% production under delay.',
    accent: 'var(--accent-cyan)',
    cost: { data: 120, energy: 150 },
  },
  dysonSheath: {
    name: 'Dyson Sheath',
    description: 'Miniature swarms capture stray stellar energy.',
    effect: '+40% energy output from foundries.',
    accent: 'var(--accent-gold)',
    cost: { data: 150, metal: 450 },
  },
  autoforge: {
    name: 'Recursive Autoforges',
    description: 'Fabricators construct their own assembly lines.',
    effect: '+50% probe fabrication efficiency.',
    accent: 'var(--accent-magenta)',
    cost: { data: 210, energy: 280 },
    requiresCycle: 1,
  },
  archiveBloom: {
    name: 'Archive Bloom',
    description: 'Distributed archivists compress incoming knowledge.',
    effect: '+60% data generation.',
    accent: 'var(--accent-violet)',
    cost: { data: 260, metal: 540 },
    requiresCycle: 1,
  },
  quantumMemory: {
    name: 'Quantum Memory Loom',
    description: 'Prestige bonus persists across cycles.',
    effect: '+1 stored knowledge each prestige and production boost.',
    accent: 'var(--accent-blue)',
    cost: { data: 360, probes: 100 },
    requiresCycle: 1,
    persistent: true,
  },
  stellarCartography: {
    name: 'Stellar Cartography',
    description: 'Predictive maps keep entropy under control.',
    effect: '-15% entropy growth and extra distance insights.',
    accent: 'var(--accent-green)',
    cost: { data: 440, energy: 420 },
    requiresCycle: 2,
  },
}
