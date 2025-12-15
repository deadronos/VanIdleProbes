/**
 * Represents the keys for the different types of resources in the game.
 * - `metal`: Used for construction.
 * - `energy`: Used for powering structures and operations.
 * - `data`: Used for research and upgrades.
 * - `probes`: The main unit of exploration and expansion.
 */
export type ResourceKey = 'metal' | 'energy' | 'data' | 'probes'

/**
 * Represents the current state of all resources.
 */
export type ResourceState = {
  /** The amount of metal available. */
  metal: number
  /** The amount of energy available. */
  energy: number
  /** The amount of data available. */
  data: number
  /** The number of probes currently active. */
  probes: number
  /** The current entropy level, representing system instability. */
  entropy: number
  /** The distance explored in light years. */
  distance: number
}

/**
 * Keys identifying the different types of units (buildings/ships).
 */
export type UnitKey =
  | 'harvesters'
  | 'foundries'
  | 'fabricators'
  | 'archives'
  | 'signalRelays'
  | 'stabilizers'

/**
 * Keys identifying the different available upgrades.
 */
export type UpgradeKey =
  | 'autonomy'
  | 'dysonSheath'
  | 'autoforge'
  | 'archiveBloom'
  | 'quantumMemory'
  | 'stellarCartography'

/**
 * Keys identifying the different available stellar artifacts.
 */
export type ArtifactKey =
  | 'denseMatter'
  | 'zeroPoint'
  | 'xenoCode'
  | 'spacetimeFold'

/**
 * Keys identifying the distinct anomalies that can be discovered.
 */
export type AnomalyKey =
  | 'neutronStar'
  | 'voidCloud'
  | 'alienDerelict'
  | 'wormholeRemnant'

/**
 * Represents a cost in terms of resources.
 * Only properties with values > 0 are usually considered.
 */
export interface Cost {
  /** Cost in metal. */
  metal?: number
  /** Cost in energy. */
  energy?: number
  /** Cost in data. */
  data?: number
  /** Cost in probes. */
  probes?: number
}

/**
 * Configuration data for a unit.
 */
export interface UnitConfig {
  /** Display name of the unit. */
  name: string
  /** Flavor text and description of functionality. */
  description: string
  /** CSS color variable for UI accent. */
  accent: string
  /** Icon to display for the unit. */
  icon: string
  /** The initial cost to purchase the first unit. */
  baseCost: Cost
  /** The exponential growth factor for the cost of subsequent units. */
  costGrowth: number
}

/**
 * Configuration data for an upgrade.
 */
export interface UpgradeConfig {
  /** Display name of the upgrade. */
  name: string
  /** Description of what the upgrade does. */
  description: string
  /** Short summary of the effect stats. */
  effect: string
  /** CSS color variable for UI accent. */
  accent: string
  /** Cost to purchase the upgrade. */
  cost: Cost
  /** Minimum prestige cycle required to unlock this upgrade (optional). */
  requiresCycle?: number
  /** If true, the upgrade persists through prestige resets (optional). */
  persistent?: boolean
}

/**
 * Configuration for a stellar artifact.
 */
export interface ArtifactConfig {
  /** Display name of the artifact. */
  name: string
  /** Narrative description of the object. */
  description: string
  /** Summary of the bonus effect. */
  effect: string
  /** CSS color variable for UI accent. */
  accent: string
}

/**
 * Configuration for an anomaly.
 */
export interface AnomalyConfig {
  /** Display name of the anomaly. */
  name: string
  /** Narrative description of what is detected. */
  description: string
  /** Distance in light years required to detect this anomaly. */
  distanceReq: number
  /** Cost to scan/analyze the anomaly. */
  cost: Cost
  /** The artifact granted upon completion. */
  reward: ArtifactKey
}

/**
 * Represents the prestige state of the game, including reset currencies and counters.
 */
export interface PrestigeState {
  /** Number of times the game has been reset (cycles completed). */
  cycles: number
  /** Currency gained from resetting, used for permanent bonuses. */
  storedKnowledge: number
  /** Number of times the "Fork" prestige has been activated. */
  forks: number
  /** Secondary prestige currency/building that persists across forks. */
  primeArchives: number
}

/**
 * Tracks which upgrades have been purchased.
 */
export type UpgradeState = Record<UpgradeKey, boolean>

/**
 * The initial state of resources when starting a new game or resetting.
 */
export const INITIAL_RESOURCES: ResourceState = {
  metal: 95,
  energy: 45,
  data: 0,
  probes: 6,
  entropy: 0.03,
  distance: 0,
};

/**
 * The initial counts for all units.
 */
export const INITIAL_UNITS: Record<UnitKey, number> = {
  harvesters: 2,
  foundries: 0,
  fabricators: 0,
  archives: 0,
  signalRelays: 0,
  stabilizers: 0,
};

/**
 * The initial prestige state for a fresh save file.
 */
export const INITIAL_PRESTIGE: PrestigeState = {
  cycles: 0,
  storedKnowledge: 0,
  forks: 0,
  primeArchives: 0,
};

/**
 * The initial state of upgrades (all unpurchased).
 */
export const INITIAL_UPGRADES: Record<UpgradeKey, boolean> = {
  autonomy: false,
  dysonSheath: false,
  autoforge: false,
  archiveBloom: false,
  quantumMemory: false,
  stellarCartography: false,
};

/**
 * Static configuration for all units in the game.
 */
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
};

/**
 * Static configuration for all upgrades in the game.
 */
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
};

/**
 * Static configuration for all stellar artifacts.
 */
export const ARTIFACT_CONFIG: Record<ArtifactKey, ArtifactConfig> = {
  denseMatter: {
    name: 'Dense Matter Synthesis',
    description: 'Data harvested from a collapsing neutron star allows for hyper-dense alloy construction.',
    effect: '+10% metal production.',
    accent: 'var(--accent-cyan)',
  },
  zeroPoint: {
    name: 'Zero-Point Siphon',
    description: 'Vacuum energy extraction protocols derived from void cloud telemetry.',
    effect: '+10% energy production.',
    accent: 'var(--accent-gold)',
  },
  xenoCode: {
    name: 'Xeno-Algorithms',
    description: 'Self-optimizing logic shards recovered from an alien derelict.',
    effect: '+15% data generation.',
    accent: 'var(--accent-violet)',
  },
  spacetimeFold: {
    name: 'Spacetime Fold',
    description: 'Wormhole residue allows probes to micro-jump, covering vast distances instantly.',
    effect: '+20% exploration speed.',
    accent: 'var(--accent-magenta)',
  },
};

/**
 * Static configuration for discoverable anomalies.
 */
export const ANOMALY_CONFIG: Record<AnomalyKey, AnomalyConfig> = {
  neutronStar: {
    name: 'Dying Neutron Star',
    description: 'A super-dense stellar remnant emitting rhythmic radio bursts. Rich in physics data.',
    distanceReq: 50,
    cost: { data: 80, energy: 100 },
    reward: 'denseMatter',
  },
  voidCloud: {
    name: 'Void Cloud',
    description: 'A localized region of false vacuum instability. Sensors indicate energy fluctuations.',
    distanceReq: 150,
    cost: { data: 200, energy: 300 },
    reward: 'zeroPoint',
  },
  alienDerelict: {
    name: 'Alien Derelict',
    description: 'A non-humanoid vessel drifting in the silence. It transmits a repeating prime number sequence.',
    distanceReq: 350,
    cost: { data: 500, probes: 20 },
    reward: 'xenoCode',
  },
  wormholeRemnant: {
    name: 'Wormhole Remnant',
    description: 'Fading gravitational waves from a collapsed bridge in spacetime.',
    distanceReq: 700,
    cost: { data: 1200, energy: 2000 },
    reward: 'spacetimeFold',
  },
};
