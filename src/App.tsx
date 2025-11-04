import { useEffect, useMemo, useState } from 'react'
import './App.css'

type ResourceKey = 'metal' | 'energy' | 'data' | 'probes'

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

type UpgradeKey =
  | 'autonomy'
  | 'dysonSheath'
  | 'autoforge'
  | 'archiveBloom'
  | 'quantumMemory'
  | 'stellarCartography'

interface Cost {
  metal?: number
  energy?: number
  data?: number
  probes?: number
}

interface UnitConfig {
  name: string
  description: string
  accent: string
  icon: string
  baseCost: Cost
  costGrowth: number
}

interface UpgradeConfig {
  name: string
  description: string
  effect: string
  accent: string
  cost: Cost
  requiresCycle?: number
  persistent?: boolean
}

interface PrestigeState {
  cycles: number
  storedKnowledge: number
}

const TICK_MS = 250
const TICK_RATE = TICK_MS / 1000

const INITIAL_RESOURCES: ResourceState = {
  metal: 80,
  energy: 30,
  data: 0,
  probes: 4,
  entropy: 0.04,
  distance: 0,
}

const INITIAL_UNITS: Record<UnitKey, number> = {
  harvesters: 1,
  foundries: 0,
  fabricators: 0,
  archives: 0,
  signalRelays: 0,
  stabilizers: 0,
}

const INITIAL_PRESTIGE: PrestigeState = {
  cycles: 0,
  storedKnowledge: 0,
}

const INITIAL_UPGRADES: Record<UpgradeKey, boolean> = {
  autonomy: false,
  dysonSheath: false,
  autoforge: false,
  archiveBloom: false,
  quantumMemory: false,
  stellarCartography: false,
}

const UNIT_CONFIG: Record<UnitKey, UnitConfig> = {
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

const UPGRADE_CONFIG: Record<UpgradeKey, UpgradeConfig> = {
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

const formatNumber = (value: number) => {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}b`
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}m`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}k`
  }
  if (value >= 100) {
    return value.toFixed(1)
  }
  return value.toFixed(2)
}

const canAffordCost = (resources: ResourceState, cost: Cost) =>
  (Object.entries(cost) as [ResourceKey, number][]).every(([key, value]) =>
    value ? resources[key] >= value : true,
  )

const applyCost = (resources: ResourceState, cost: Cost) => {
  const updated = { ...resources }
  for (const [key, value] of Object.entries(cost) as [ResourceKey, number][]) {
    if (value) {
      updated[key] -= value
    }
  }
  return updated
}

type UpgradeState = Record<UpgradeKey, boolean>

type ProductionSnapshot = {
  metal: number
  energy: number
  data: number
  probes: number
  distance: number
  entropyChange: number
  latencyFactor: number
  productionFactor: number
}

const computeProduction = (
  resources: ResourceState,
  units: Record<UnitKey, number>,
  upgrades: UpgradeState,
  prestige: PrestigeState,
): ProductionSnapshot => {
  const cycleBoost = 1 + prestige.cycles * 0.55 + prestige.storedKnowledge * 0.12
  const signalBonus = 1 + units.signalRelays * 0.18 + (upgrades.autonomy ? 0.35 : 0)
  const latencyFactor = 1 / (1 + Math.max(0, resources.distance - signalBonus * 90) / (160 + signalBonus * 75))
  const entropyPressure = 0.012 + resources.distance / 8200
  const entropyMitigation = units.stabilizers * 0.018 + (upgrades.stellarCartography ? 0.01 : 0)
  const entropyChange = entropyPressure - entropyMitigation
  const entropyPenalty = Math.max(
    0.28,
    1 - Math.min(0.82, resources.entropy) * (upgrades.quantumMemory ? 0.55 : 0.7),
  )
  const productionFactor = cycleBoost * latencyFactor * entropyPenalty
  const energyMultiplier = upgrades.dysonSheath ? 1.4 : 1
  const probeMultiplier = upgrades.autoforge ? 1.5 : 1
  const dataMultiplier = upgrades.archiveBloom ? 1.6 : 1

  const metal = (4 + units.harvesters * 9.5 + units.foundries * 1.5) * productionFactor
  const energy = (units.foundries * 6.3 * energyMultiplier + units.harvesters * 1.4) * productionFactor
  const probes = (units.fabricators * 0.95 * probeMultiplier + resources.probes * 0.012) * productionFactor
  const data =
    (units.archives * 1.45 * dataMultiplier + Math.max(0, resources.distance - 40) * 0.018 + 0.05) *
    productionFactor
  const distance =
    (resources.probes * (0.08 + units.signalRelays * 0.0038 + (upgrades.autonomy ? 0.02 : 0)) +
      units.fabricators * 0.014 +
      units.archives * 0.004) *
    latencyFactor

  return {
    metal,
    energy,
    data,
    probes,
    distance,
    entropyChange,
    latencyFactor,
    productionFactor,
  }
}

const resourceOrder: ResourceKey[] = ['metal', 'energy', 'probes', 'data']
const resourceLabels: Record<ResourceKey, string> = {
  metal: 'Alloy Mass',
  energy: 'Stellar Energy',
  probes: 'Active Probes',
  data: 'Archived Data',
}
const resourceFlavour: Record<ResourceKey, string> = {
  metal: 'Captured asteroid matter feeding the foundries.',
  energy: 'Refined stellar flux powering the network.',
  probes: 'Autonomous Von Neumann agents exploring the expanse.',
  data: 'Crystalline memory encoded from every contact.',
}

const distanceMilestones = [15, 40, 90, 180, 320]
const dataMilestones = [60, 180, 420, 800]

function App() {
  const [resources, setResources] = useState<ResourceState>(INITIAL_RESOURCES)
  const [units, setUnits] = useState<Record<UnitKey, number>>(INITIAL_UNITS)
  const [prestige, setPrestige] = useState<PrestigeState>(INITIAL_PRESTIGE)
  const [upgradeState, setUpgradeState] = useState<UpgradeState>(INITIAL_UPGRADES)
  const [logs, setLogs] = useState<string[]>([
    'Origin node online. Awaiting replication directives.',
    'First probe awakens near a dying star.',
  ])

  const starfield = useMemo(
    () =>
      Array.from({ length: 120 }, (_, idx) => ({
        id: idx,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 2 + 0.6,
        delay: Math.random() * 6,
      })),
    [],
  )

  const productionPreview = useMemo(
    () => computeProduction(resources, units, upgradeState, prestige),
    [resources, units, upgradeState, prestige],
  )

  useEffect(() => {
    document.title = `Von Idle Probes • ${formatNumber(resources.probes)} probes`
  }, [resources.probes])

  useEffect(() => {
    const interval = setInterval(() => {
      const messages: string[] = []
      setResources((prev) => {
        const production = computeProduction(prev, units, upgradeState, prestige)
        const next: ResourceState = {
          metal: prev.metal + production.metal * TICK_RATE,
          energy: prev.energy + production.energy * TICK_RATE,
          data: prev.data + production.data * TICK_RATE,
          probes: prev.probes + production.probes * TICK_RATE,
          entropy: Math.min(0.88, Math.max(0, prev.entropy + production.entropyChange * TICK_RATE)),
          distance: prev.distance + production.distance * TICK_RATE,
        }

        for (const milestone of distanceMilestones) {
          if (prev.distance < milestone && next.distance >= milestone) {
            messages.push(`Signal echo received from ${milestone} light years.`)
          }
        }
        for (const milestone of dataMilestones) {
          if (prev.data < milestone && next.data >= milestone) {
            messages.push(`Archive density surpasses ${milestone.toLocaleString()} qubits.`)
          }
        }
        if (prev.entropy < 0.65 && next.entropy >= 0.65) {
          messages.push('Warning: replication entropy approaching instability.')
        }
        return next
      })

      if (messages.length) {
        setLogs((prev) => [...messages.reverse(), ...prev].slice(0, 8))
      }
    }, TICK_MS)

    return () => clearInterval(interval)
  }, [units, upgradeState, prestige])

  const handlePurchaseUnit = (key: UnitKey) => {
    const config = UNIT_CONFIG[key]
    const costMultiplier = Math.pow(config.costGrowth, units[key])
    const cost = Object.fromEntries(
      Object.entries(config.baseCost).map(([resource, value]) => [resource, value * costMultiplier]),
    ) as Cost
    let success = false
    setResources((prev) => {
      if (!canAffordCost(prev, cost)) {
        return prev
      }
      success = true
      return applyCost(prev, cost)
    })

    if (success) {
      setUnits((prev) => ({ ...prev, [key]: prev[key] + 1 }))
      setLogs((prev) => [`${config.name} commissioned.`, ...prev].slice(0, 8))
    }
  }

  const handlePurchaseUpgrade = (key: UpgradeKey) => {
    if (upgradeState[key]) return
    const config = UPGRADE_CONFIG[key]
    if (config.requiresCycle && prestige.cycles < config.requiresCycle) return
    let success = false
    setResources((prev) => {
      if (!canAffordCost(prev, config.cost)) return prev
      success = true
      return applyCost(prev, config.cost)
    })

    if (success) {
      setUpgradeState((prev) => ({ ...prev, [key]: true }))
      setLogs((prev) => [`Upgrade acquired: ${config.name}.`, ...prev].slice(0, 8))
    }
  }

  const handleStabilize = () => {
    const stabilizeCost: Cost = { data: 45 }
    let success = false
    setResources((prev) => {
      if (!canAffordCost(prev, stabilizeCost)) return prev
      success = true
      const updated = applyCost(prev, stabilizeCost)
      updated.entropy = Math.max(0, updated.entropy - 0.16)
      return updated
    })
    if (success) {
      setLogs((prev) => ['Entropy damped. Replication fidelity restored.', ...prev].slice(0, 8))
    }
  }

  const prestigeReady = resources.distance >= 160 && resources.data >= 900

  const handlePrestige = () => {
    if (!prestigeReady) return
    const memoryGain = Math.max(1, Math.floor(resources.data / 450) + Math.floor(resources.distance / 200))
    setPrestige((prev) => ({
      cycles: prev.cycles + 1,
      storedKnowledge: prev.storedKnowledge + memoryGain + (upgradeState.quantumMemory ? 1 : 0),
    }))
    setUnits(INITIAL_UNITS)
    setUpgradeState((prev) => ({
      ...INITIAL_UPGRADES,
      quantumMemory: prev.quantumMemory,
    }))
    setResources({
      ...INITIAL_RESOURCES,
      metal: INITIAL_RESOURCES.metal + memoryGain * 25,
      energy: INITIAL_RESOURCES.energy + memoryGain * 12,
      probes: INITIAL_RESOURCES.probes + memoryGain * 0.6,
    })
    setLogs((prev) => [`Cycle rebooted. Memory shards retained: ${memoryGain}.`, ...prev].slice(0, 8))
  }

  return (
    <div className="app">
      <div className="cosmic-background">
        {starfield.map((star) => (
          <span
            key={star.id}
            className="background-star"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
      </div>
      <main className="interface">
        <header className="header">
          <div>
            <h1>Von Idle Probes</h1>
            <p className="tagline">Recursive machines expanding beyond the dying light.</p>
            <div className="cycle-info">
              <span>Cycle {prestige.cycles + 1}</span>
              <span>Stored Knowledge: {formatNumber(prestige.storedKnowledge)}</span>
            </div>
          </div>
          <div className="header-stats">
            <div className="header-chip">Latency {Math.round(productionPreview.latencyFactor * 100)}%</div>
            <div className="header-chip">Entropy {(resources.entropy * 100).toFixed(1)}%</div>
            <div className="header-chip accent">{formatNumber(resources.distance)} ly explored</div>
          </div>
        </header>

        <section className="galaxy-section">
          <div className="galaxy-map">
            {starfield.slice(0, 60).map((star) => (
              <span
                key={`map-${star.id}`}
                className="map-star"
                style={{
                  left: `${(star.left / 100) * 90 + 5}%`,
                  top: `${(star.top / 100) * 70 + 10}%`,
                  width: `${star.size * 1.5}px`,
                  height: `${star.size * 1.5}px`,
                  animationDelay: `${star.delay * 0.6}s`,
                }}
              />
            ))}
            <div
              className="exploration-wave"
              style={{
                transform: `scale(${1 + resources.distance / 220})`,
                opacity: Math.min(1, 0.25 + resources.distance / 280),
              }}
            />
            <div className="origin-node">Origin</div>
          </div>
          <div className="entropy-panel">
            <h3>Replication Entropy</h3>
            <div className="entropy-bar">
              <div className="entropy-fill" style={{ width: `${Math.min(100, resources.entropy * 100)}%` }} />
            </div>
            <p>
              High entropy slows production and risks divergence. Signal relays and dampers push it back.
            </p>
            <button
              className="primary"
              onClick={handleStabilize}
              disabled={!canAffordCost(resources, { data: 45 })}
            >
              Stabilize Lattice (45 Data)
            </button>
          </div>
        </section>

        <section className="resource-grid">
          {resourceOrder.map((resource) => (
            <article key={resource} className="resource-card">
              <header>
                <h2>{resourceLabels[resource]}</h2>
                <span className="resource-amount">{formatNumber(resources[resource])}</span>
              </header>
              <p>{resourceFlavour[resource]}</p>
              <footer>
                <span className="rate">+{formatNumber(productionPreview[resource])} /s</span>
              </footer>
            </article>
          ))}
        </section>

        <section className="unit-section">
          <h2>Replication Network</h2>
          <div className="unit-grid">
            {(Object.keys(UNIT_CONFIG) as UnitKey[]).map((key) => {
              const config = UNIT_CONFIG[key]
              const costMultiplier = Math.pow(config.costGrowth, units[key])
              const cost = Object.entries(config.baseCost)
                .map(([resource, value]) => `${resourceLabels[resource as ResourceKey]} ${formatNumber(value * costMultiplier)}`)
                .join(' • ')

              const affordable = canAffordCost(
                resources,
                Object.fromEntries(
                  Object.entries(config.baseCost).map(([resource, value]) => [resource, value * costMultiplier]),
                ) as Cost,
              )

              return (
                <article key={key} className="unit-card" style={{ ['--accent' as string]: config.accent }}>
                  <header>
                    <span className="unit-icon" aria-hidden>{config.icon}</span>
                    <div>
                      <h3>{config.name}</h3>
                      <span className="unit-count">x{units[key]}</span>
                    </div>
                  </header>
                  <p>{config.description}</p>
                  <footer>
                    <span className="unit-cost">Cost: {cost}</span>
                    <button
                      className={affordable ? 'primary' : 'secondary'}
                      onClick={() => handlePurchaseUnit(key)}
                      disabled={!affordable}
                    >
                      Fabricate
                    </button>
                  </footer>
                </article>
              )
            })}
          </div>
        </section>

        <section className="upgrade-section">
          <h2>Network Upgrades</h2>
          <div className="upgrade-grid">
            {(Object.keys(UPGRADE_CONFIG) as UpgradeKey[]).map((key) => {
              const config = UPGRADE_CONFIG[key]
              const unlocked = !config.requiresCycle || prestige.cycles >= config.requiresCycle
              const costLabel = Object.entries(config.cost)
                .map(([resource, value]) => `${resourceLabels[resource as ResourceKey]} ${formatNumber(value)}`)
                .join(' • ')
              const affordable = unlocked && !upgradeState[key] && canAffordCost(resources, config.cost)

              return (
                <article
                  key={key}
                  className={`upgrade-card${upgradeState[key] ? ' purchased' : ''}${!unlocked ? ' locked' : ''}`}
                  style={{ ['--accent' as string]: config.accent }}
                >
                  <header>
                    <h3>{config.name}</h3>
                    {config.requiresCycle ? <span className="requires">Cycle {config.requiresCycle}</span> : null}
                  </header>
                  <p>{config.description}</p>
                  <p className="effect">{config.effect}</p>
                  <footer>
                    <span className="unit-cost">{costLabel}</span>
                    <button
                      className={affordable ? 'primary' : 'secondary'}
                      disabled={!affordable}
                      onClick={() => handlePurchaseUpgrade(key)}
                    >
                      {upgradeState[key] ? 'Installed' : unlocked ? 'Install Upgrade' : 'Locked'}
                    </button>
                  </footer>
                </article>
              )
            })}
          </div>
        </section>

        <section className="prestige-panel">
          <div>
            <h2>Recompile the Origin</h2>
            <p>
              Reboot the origin node to bake your discoveries into the next generation. Resets resources and structures
              but grants lasting knowledge boosts.
            </p>
            <ul>
              <li>Requires 160 ly explored and 900 data archived.</li>
              <li>Gain Stored Knowledge to accelerate future cycles.</li>
              <li>Quantum Memory Loom persists between cycles.</li>
            </ul>
          </div>
          <button className="prestige-button" onClick={handlePrestige} disabled={!prestigeReady}>
            Initiate Ascension
          </button>
        </section>

        <section className="log-section">
          <h2>Telemetry Feed</h2>
          <ul>
            {logs.map((entry, index) => (
              <li key={`${entry}-${index}`}>{entry}</li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}

export default App
