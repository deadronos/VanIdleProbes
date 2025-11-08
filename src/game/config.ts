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
  metal: 80,
  energy: 30,
  data: 0,
  probes: 4,
  entropy: 0.04,
  distance: 0,
}

export const INITIAL_UNITS: Record<UnitKey, number> = {
  harvesters: 1,
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
    baseCost: { metal: 35 },
    costGrowth: 1.15,
  },
  foundries: {
    name: 'Stellar Foundries',
    description: 'Smelt mined ore into directed energy beams.',
    accent: 'var(--accent-gold)',
    icon: '⚙️',
    baseCost: { metal: 150, energy: 20 },
    costGrowth: 1.18,
  },
  fabricators: {
    name: 'Autofabricators',
    description: 'Assemble new Von Neumann probes from raw materials.',
    accent: 'var(--accent-magenta)',
    icon: '🛰️',
    baseCost: { metal: 260, energy: 85 },
    costGrowth: 1.22,
  },
  archives: {
    name: 'Archive Spires',
    description: 'Observe and catalogue every discovery into crystalline memory.',
    accent: 'var(--accent-violet)',
    icon: '📡',
    baseCost: { metal: 240, energy: 110, data: 20 },
    costGrowth: 1.2,
  },
  signalRelays: {
    name: 'Signal Relays',
    description: 'Extend the mesh network. Mitigates light-delay penalties.',
    accent: 'var(--accent-blue)',
    icon: '📶',
    baseCost: { metal: 210, energy: 160 },
    costGrowth: 1.19,
  },
  stabilizers: {
    name: 'Entropy Dampers',
    description: 'Phase-lock stray mutations and keep replication precise.',
    accent: 'var(--accent-green)',
    icon: '🧊',
    baseCost: { metal: 320, energy: 210, data: 45 },
    costGrowth: 1.25,
  },
}

export const UPGRADE_CONFIG: Record<UpgradeKey, UpgradeConfig> = {
  autonomy: {
    name: 'Autonomy Firmware',
    description: 'Let remote probes self-correct. Sharply reduces latency.',
    effect: '+25% exploration speed and +20% production under delay.',
    accent: 'var(--accent-cyan)',
    cost: { data: 140, energy: 180 },
  },
  dysonSheath: {
    name: 'Dyson Sheath',
    description: 'Miniature swarms capture stray stellar energy.',
    effect: '+40% energy output from foundries.',
    accent: 'var(--accent-gold)',
    cost: { data: 180, metal: 520 },
  },
  autoforge: {
    name: 'Recursive Autoforges',
    description: 'Fabricators construct their own assembly lines.',
    effect: '+50% probe fabrication efficiency.',
    accent: 'var(--accent-magenta)',
    cost: { data: 260, energy: 320 },
    requiresCycle: 1,
  },
  archiveBloom: {
    name: 'Archive Bloom',
    description: 'Distributed archivists compress incoming knowledge.',
    effect: '+60% data generation.',
    accent: 'var(--accent-violet)',
    cost: { data: 310, metal: 640 },
    requiresCycle: 1,
  },
  quantumMemory: {
    name: 'Quantum Memory Loom',
    description: 'Prestige bonus persists across cycles.',
    effect: '+1 stored knowledge each prestige and production boost.',
    accent: 'var(--accent-blue)',
    cost: { data: 420, probes: 120 },
    requiresCycle: 1,
    persistent: true,
  },
  stellarCartography: {
    name: 'Stellar Cartography',
    description: 'Predictive maps keep entropy under control.',
    effect: '-15% entropy growth and extra distance insights.',
    accent: 'var(--accent-green)',
    cost: { data: 520, energy: 480 },
    requiresCycle: 2,
  },
}
