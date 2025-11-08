import { useEffect, useMemo, useState, useRef } from 'react'
import './App.css'
import type { ResourceKey, ResourceState, UnitKey, UpgradeKey, PrestigeState, UpgradeState } from './game/config'
import { INITIAL_RESOURCES, INITIAL_UNITS, INITIAL_PRESTIGE, INITIAL_UPGRADES, UNIT_CONFIG, UPGRADE_CONFIG } from './game/config'
import { computeProduction, simulateOfflineProgress } from './game/engine'
import { buildSave, saveToLocalStorage, loadFromLocalStorage, exportSaveFile, importSaveFile, migrateSave } from './game/save'

const TICK_MS = 250
const TICK_RATE = TICK_MS / 1000

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

const getUnitCost = (key: UnitKey, owned: number) => {
  const config = UNIT_CONFIG[key]
  const multiplier = Math.pow(config.costGrowth, owned)
  return Object.fromEntries(
    Object.entries(config.baseCost).map(([resource, value]) => [resource, value * multiplier]),
  ) as Cost
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
  const baseLatencyFactor =
    1 / (1 + Math.max(0, resources.distance - signalBonus * 90) / (160 + signalBonus * 75))
  const latencyFactor =
    upgrades.autonomy && baseLatencyFactor < 1
      ? baseLatencyFactor + (1 - baseLatencyFactor) * 0.2
      : baseLatencyFactor
  const entropyPressureBase = 0.012 + resources.distance / 8200
  const entropyPressure = upgrades.stellarCartography ? entropyPressureBase * 0.85 : entropyPressureBase
  const entropyMitigation = units.stabilizers * 0.018 + (upgrades.stellarCartography ? 0.01 : 0)
  const entropyChange = entropyPressure - entropyMitigation
  const entropyPenalty = Math.max(
    0.28,
    1 - Math.min(0.82, resources.entropy) * (upgrades.quantumMemory ? 0.55 : 0.7),
  )
  const delayCompensation = upgrades.autonomy && baseLatencyFactor < 0.999 ? 1.2 : 1
  const productionFactor = cycleBoost * latencyFactor * entropyPenalty * delayCompensation
  const energyMultiplier = upgrades.dysonSheath ? 1.4 : 1
  const probeMultiplier = upgrades.autoforge ? 1.5 : 1
  const dataMultiplier = upgrades.archiveBloom ? 1.6 : 1
  const cartographyExplorationBonus = upgrades.stellarCartography ? 1.12 : 1

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
    latencyFactor *
    cartographyExplorationBonus

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

const formatCostLabel = (cost: Cost) =>
  Object.entries(cost)
    .filter(([, value]) => value && value > 0)
    .map(([resource, value]) => `${resourceLabels[resource as ResourceKey]} ${formatNumber(value)}`)
    .join(' • ')

const distanceMilestones = [15, 40, 90, 180, 320]
const dataMilestones = [60, 180, 420, 800]
const PRESTIGE_REQUIREMENTS = { distance: 160, data: 900 }
const STABILIZE_COST: Cost = { data: 45 }

interface MilestoneProgress {
  previous: number
  next?: number
  progress: number
  span: number
}

const getMilestoneProgress = (value: number, milestones: number[]): MilestoneProgress => {
  const nextIndex = milestones.findIndex((milestone) => milestone > value)
  if (nextIndex === -1) {
    const previous = milestones[milestones.length - 1] ?? 0
    return { previous, next: undefined, progress: 1, span: 1 }
  }

  const previous = nextIndex > 0 ? milestones[nextIndex - 1] : 0
  const next = milestones[nextIndex]
  const span = next - previous || 1
  const progress = Math.min(1, Math.max(0, (value - previous) / span))

  return { previous, next, progress, span }
}

function App() {
  const [resources, setResources] = useState<ResourceState>(INITIAL_RESOURCES)
  const [units, setUnits] = useState<Record<UnitKey, number>>(INITIAL_UNITS)
  const [prestige, setPrestige] = useState<PrestigeState>(INITIAL_PRESTIGE)
  const [upgradeState, setUpgradeState] = useState<UpgradeState>(INITIAL_UPGRADES)
  const [logs, setLogs] = useState<string[]>([
    'Origin node online. Awaiting replication directives.',
    'First probe awakens near a dying star.',
  ])

  const [autosave, setAutosave] = useState<boolean>(true)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)

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

  const distanceMilestoneProgress = useMemo(
    () => getMilestoneProgress(resources.distance, distanceMilestones),
    [resources.distance],
  )

  const dataMilestoneProgress = useMemo(
    () => getMilestoneProgress(resources.data, dataMilestones),
    [resources.data],
  )

  const stabilizeAffordable = canAffordCost(resources, STABILIZE_COST)

  const prestigeProjection = useMemo(() => {
    const baseGain = Math.max(1, Math.floor(resources.data / 450) + Math.floor(resources.distance / 200))
    const bonus = upgradeState.quantumMemory ? 1 : 0
    const projectedGain = baseGain + bonus
    const projectedKnowledge = prestige.storedKnowledge + projectedGain
    const currentMultiplier = 1 + prestige.cycles * 0.55 + prestige.storedKnowledge * 0.12
    const nextMultiplier = 1 + (prestige.cycles + 1) * 0.55 + projectedKnowledge * 0.12

    return {
      baseGain,
      projectedGain,
      projectedKnowledge,
      currentMultiplier,
      nextMultiplier,
    }
  }, [resources.data, resources.distance, prestige.cycles, prestige.storedKnowledge, upgradeState.quantumMemory])

  useEffect(() => {
    document.title = `Von Idle Probes • ${formatNumber(resources.probes)} probes`
  }, [resources.probes])

  // On mount: load save from localStorage (with migration) and apply offline progress
  useEffect(() => {
    try {
      const raw = loadFromLocalStorage()
      if (!raw) return
      const save = migrateSave(raw)
      const s = save.state
      setResources(s.resources)
      setUnits(s.units)
      setPrestige(s.prestige)
      setUpgradeState(s.upgradeState)
      if (s.logs && s.logs.length) setLogs((prev) => [...s.logs, ...prev].slice(0, 8))
      setLastSavedAt(save.savedAt)

      const savedAtMs = Date.parse(save.savedAt)
      if (!Number.isNaN(savedAtMs)) {
        const offlineSeconds = Math.floor((Date.now() - savedAtMs) / 1000)
        if (offlineSeconds > 0) {
          const { resources: newResources, log } = simulateOfflineProgress(
            s.resources,
            s.units,
            s.upgradeState,
            s.prestige,
            Math.min(offlineSeconds, 24 * 60 * 60),
          )
          setResources(newResources)
          setLogs((prev) => [log, ...prev].slice(0, 8))
        }
      }
    } catch {
      // ignore malformed saves
    }
  }, [])

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

  // Autosave (debounced)
  useEffect(() => {
    if (!autosave) return
    const t = setTimeout(() => {
      try {
        const save = buildSave({ resources, units, prestige, upgradeState, logs })
        saveToLocalStorage(save)
        setLastSavedAt(save.savedAt)
      } catch (e) {
        console.warn('Failed to autosave', e)
      }
    }, 2000)
    return () => clearTimeout(t)
  }, [resources, units, prestige, upgradeState, logs, autosave])

  const handlePurchaseUnit = (key: UnitKey) => {
    const config = UNIT_CONFIG[key]
    const cost = getUnitCost(key, units[key])
    if (!canAffordCost(resources, cost)) {
      return
    }

    setResources((prev) => applyCost(prev, cost))
    setUnits((prev) => ({ ...prev, [key]: prev[key] + 1 }))
    setLogs((prev) => [`${config.name} commissioned.`, ...prev].slice(0, 8))
  }

  const handlePurchaseUpgrade = (key: UpgradeKey) => {
    if (upgradeState[key]) return
    const config = UPGRADE_CONFIG[key]
    if (config.requiresCycle && prestige.cycles < config.requiresCycle) return
    if (!canAffordCost(resources, config.cost)) return

    setResources((prev) => applyCost(prev, config.cost))
    setUpgradeState((prev) => ({ ...prev, [key]: true }))
    setLogs((prev) => [`Upgrade acquired: ${config.name}.`, ...prev].slice(0, 8))
  }

  const handleStabilize = () => {
    if (!canAffordCost(resources, STABILIZE_COST)) return

    setResources((prev) => {
      const updated = applyCost(prev, STABILIZE_COST)
      return { ...updated, entropy: Math.max(0, updated.entropy - 0.16) }
    })
    setLogs((prev) => ['Entropy damped. Replication fidelity restored.', ...prev].slice(0, 8))
  }

  const prestigeDistanceProgress = Math.min(resources.distance / PRESTIGE_REQUIREMENTS.distance, 1)
  const prestigeDataProgress = Math.min(resources.data / PRESTIGE_REQUIREMENTS.data, 1)

  const prestigeReady =
    resources.distance >= PRESTIGE_REQUIREMENTS.distance && resources.data >= PRESTIGE_REQUIREMENTS.data

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

  const handleExportSave = () => {
    try {
      const save = buildSave({ resources, units, prestige, upgradeState, logs })
      exportSaveFile(save)
    } catch (e) {
      console.warn('Export failed', e)
    }
  }

  const handleImportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const save = await importSaveFile(file)
      const s = save.state
      setResources(s.resources)
      setUnits(s.units)
      setPrestige(s.prestige)
      setUpgradeState(s.upgradeState)
      if (s.logs && s.logs.length) setLogs((prev) => [...s.logs, ...prev].slice(0, 8))
      setLastSavedAt(save.savedAt)
      saveToLocalStorage(save)

      const savedAtMs = Date.parse(save.savedAt)
      if (!Number.isNaN(savedAtMs)) {
        const offlineSeconds = Math.floor((Date.now() - savedAtMs) / 1000)
        if (offlineSeconds > 0) {
          const { resources: newResources, log } = simulateOfflineProgress(
            s.resources,
            s.units,
            s.upgradeState,
            s.prestige,
            Math.min(offlineSeconds, 24 * 60 * 60),
          )
          setResources(newResources)
          setLogs((prev) => [log, ...prev].slice(0, 8))
        }
      }
    } catch (err) {
      console.warn('Import failed', err)
    }
  }

  const handleManualSave = () => {
    try {
      const save = buildSave({ resources, units, prestige, upgradeState, logs })
      saveToLocalStorage(save)
      setLastSavedAt(save.savedAt)
      setLogs((prev) => ['Manual save created.', ...prev].slice(0, 8))
    } catch (e) {
      console.warn('Manual save failed', e)
    }
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
          <div className="save-controls">
            <button onClick={handleExportSave}>Export</button>
            <input ref={importInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportChange} />
            <button onClick={() => importInputRef?.current?.click()}>Import</button>
            <label className="autosave-toggle">
              <input type="checkbox" checked={autosave} onChange={(e) => setAutosave(e.target.checked)} /> Autosave
            </label>
            <button onClick={handleManualSave}>Save</button>
            <div className="last-saved">Last saved: {lastSavedAt ? new Date(lastSavedAt).toLocaleString() : 'Never'}</div>
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
            <p
              className={`entropy-drift ${
                productionPreview.entropyChange > 0.001
                  ? 'entropy-rise'
                  : productionPreview.entropyChange < -0.001
                  ? 'entropy-fall'
                  : ''
              }`}
            >
              Drift {productionPreview.entropyChange >= 0 ? '+' : ''}
              {productionPreview.entropyChange.toFixed(3)} /s
            </p>
            <p>
              High entropy slows production and risks divergence. Signal relays and dampers push it back.
            </p>
            <button
              className="primary"
              onClick={handleStabilize}
              disabled={!stabilizeAffordable}
            >
              Stabilize Lattice (45 Data)
            </button>
            <div className="milestone-tracker">
              <div className="milestone-card">
                <div className="milestone-header">
                  <span>Signal Horizon</span>
                  <span>
                    {distanceMilestoneProgress.next
                      ? `${formatNumber(resources.distance)} / ${formatNumber(distanceMilestoneProgress.next)} ly`
                      : `${formatNumber(resources.distance)} ly`}
                  </span>
                </div>
                <div className="milestone-bar">
                  <div
                    className="milestone-bar-fill"
                    style={{ width: `${distanceMilestoneProgress.progress * 100}%` }}
                  />
                </div>
                <small>
                  {distanceMilestoneProgress.next
                    ? `${formatNumber(
                        resources.distance - distanceMilestoneProgress.previous,
                      )} / ${formatNumber(distanceMilestoneProgress.span)} ly towards next echo`
                    : 'All signal waypoints catalogued'}
                </small>
              </div>
              <div className="milestone-card">
                <div className="milestone-header">
                  <span>Archive Compression</span>
                  <span>
                    {dataMilestoneProgress.next
                      ? `${formatNumber(resources.data)} / ${formatNumber(dataMilestoneProgress.next)} data`
                      : `${formatNumber(resources.data)} data`}
                  </span>
                </div>
                <div className="milestone-bar">
                  <div
                    className="milestone-bar-fill"
                    style={{ width: `${dataMilestoneProgress.progress * 100}%` }}
                  />
                </div>
                <small>
                  {dataMilestoneProgress.next
                    ? `${formatNumber(resources.data - dataMilestoneProgress.previous)} / ${formatNumber(
                        dataMilestoneProgress.span,
                      )} data compressed`
                    : 'Archives humming at maximum density'}
                </small>
              </div>
            </div>
          </div>
        </section>

        <section className="telemetry-panel">
          <article className="telemetry-card">
            <h3>Exploration Velocity</h3>
            <span className="telemetry-value">+{formatNumber(productionPreview.distance)} ly/s</span>
            <p>Signal relays and active probes extend the frontier.</p>
          </article>
          <article className="telemetry-card">
            <h3>Latency Efficiency</h3>
            <span className="telemetry-value">{(productionPreview.latencyFactor * 100).toFixed(0)}%</span>
            <p>Autonomy firmware and mesh relays mitigate light delay.</p>
          </article>
          <article className="telemetry-card">
            <h3>Throughput Multiplier</h3>
            <span className="telemetry-value">{productionPreview.productionFactor.toFixed(2)}×</span>
            <p>Cycle momentum and entropy control amplify output.</p>
          </article>
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
              const cost = getUnitCost(key, units[key])
              const affordable = canAffordCost(resources, cost)

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
                    <span className="unit-cost">Cost: {formatCostLabel(cost)}</span>
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
              const costLabel = formatCostLabel(config.cost)
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
              <li>
                Requires {PRESTIGE_REQUIREMENTS.distance} ly explored and {PRESTIGE_REQUIREMENTS.data} data archived.
              </li>
              <li>Gain Stored Knowledge to accelerate future cycles.</li>
              <li>Quantum Memory Loom persists between cycles.</li>
            </ul>
            <div className="prestige-progress-grid">
              <div className="prestige-progress-block">
                <div className="progress-header">
                  <span>Exploration</span>
                  <span>
                    {formatNumber(Math.min(resources.distance, PRESTIGE_REQUIREMENTS.distance))} /
                    {formatNumber(PRESTIGE_REQUIREMENTS.distance)} ly
                  </span>
                </div>
                <div className="progress-bar">
                  <div style={{ width: `${prestigeDistanceProgress * 100}%` }} />
                </div>
              </div>
              <div className="prestige-progress-block">
                <div className="progress-header">
                  <span>Archives</span>
                  <span>
                    {formatNumber(Math.min(resources.data, PRESTIGE_REQUIREMENTS.data))} /
                    {formatNumber(PRESTIGE_REQUIREMENTS.data)} data
                  </span>
                </div>
                <div className="progress-bar">
                  <div style={{ width: `${prestigeDataProgress * 100}%` }} />
                </div>
              </div>
            </div>
            <div className="prestige-stats">
              <div>
                <strong>Projected Memory Gain:</strong> {formatNumber(prestigeProjection.projectedGain)}
                {prestigeProjection.projectedGain !== prestigeProjection.baseGain ? ' (includes Quantum Memory)' : ''}
              </div>
              <div>
                <strong>Next Cycle Throughput:</strong> {prestigeProjection.nextMultiplier.toFixed(2)}×
              </div>
              <div>
                <strong>Current Cycle Throughput:</strong> {prestigeProjection.currentMultiplier.toFixed(2)}×
              </div>
              <div>
                <strong>Stored Knowledge After Reset:</strong> {formatNumber(prestigeProjection.projectedKnowledge)}
              </div>
            </div>
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
