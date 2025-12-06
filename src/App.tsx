import { useEffect, useMemo, useState, useRef } from 'react';
import './App.css';
import type { ResourceKey, ResourceState, UnitKey, UpgradeKey, PrestigeState, UpgradeState, Cost } from './game/config';
import { INITIAL_RESOURCES, INITIAL_UNITS, INITIAL_PRESTIGE, INITIAL_UPGRADES, UNIT_CONFIG, UPGRADE_CONFIG } from './game/config';
import { computeProduction, simulateOfflineProgress } from './game/engine';
import { buildSave, saveToLocalStorage, loadFromLocalStorage, exportSaveFile, importSaveFile, migrateSave } from './game/save';

const TICK_MS = 250;
const TICK_RATE = TICK_MS / 1000;

/**
 * Formats a number with standard suffixes (k, m, b) for display.
 * @param value The number to format.
 * @returns A formatted string.
 */
const formatNumber = (value: number) => {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}b`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}m`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}k`;
  }
  if (value >= 100) {
    return value.toFixed(1);
  }
  return value.toFixed(2);
};

/**
 * Checks if the player has enough resources to afford a given cost.
 * @param resources The current resource state.
 * @param cost The cost object to check against.
 * @returns True if affordable, false otherwise.
 */
const canAffordCost = (resources: ResourceState, cost: Cost) =>
  (Object.entries(cost) as [ResourceKey, number][]).every(([key, value]) =>
    value ? resources[key] >= value : true,
  );

/**
 * Deducts the specified cost from the resource state.
 * @param resources The current resource state.
 * @param cost The cost to deduct.
 * @returns A new resource state with costs applied.
 */
const applyCost = (resources: ResourceState, cost: Cost) => {
  const updated = { ...resources };
  for (const [key, value] of Object.entries(cost) as [ResourceKey, number][]) {
    if (value) {
      updated[key] -= value;
    }
  }
  return updated;
};

/**
 * Calculates the current cost of a unit based on how many are already owned.
 * Uses an exponential growth formula.
 * @param key The unit key.
 * @param owned The number of units currently owned.
 * @returns The calculated cost object.
 */
const getUnitCost = (key: UnitKey, owned: number) => {
  const config = UNIT_CONFIG[key];
  const multiplier = Math.pow(config.costGrowth, owned);
  return Object.fromEntries(
    Object.entries(config.baseCost).map(([resource, value]) => [resource, value * multiplier]),
  ) as Cost;
};

const resourceOrder: ResourceKey[] = ['metal', 'energy', 'probes', 'data'];
const resourceLabels: Record<ResourceKey, string> = {
  metal: 'Alloy Mass',
  energy: 'Stellar Energy',
  probes: 'Active Probes',
  data: 'Archived Data',
};
const resourceFlavour: Record<ResourceKey, string> = {
  metal: 'Captured asteroid matter feeding the foundries.',
  energy: 'Refined stellar flux powering the network.',
  probes: 'Autonomous Von Neumann agents exploring the expanse.',
  data: 'Crystalline memory encoded from every contact.',
};

/**
 * Formats a cost object into a readable string string for UI buttons.
 * @param cost The cost object.
 * @returns A string like "Metal 100 • Energy 50".
 */
const formatCostLabel = (cost: Cost) =>
  (Object.entries(cost) as [ResourceKey, number][])
    .filter(([, value]) => value && value > 0)
    .map(([resource, value]) => `${resourceLabels[resource as ResourceKey]} ${formatNumber(value)}`)
    .join(' • ');

const distanceMilestones = [15, 40, 90, 180, 320];
const dataMilestones = [60, 180, 420, 800];
const PRESTIGE_REQUIREMENTS = { distance: 120, data: 650 };
const FORK_REQUIREMENTS = { cycles: 3, distance: 420, data: 1400 };
const STABILIZE_COST: Cost = { data: 35 };

interface MilestoneProgress {
  previous: number
  next?: number
  progress: number
  span: number
}

/**
 * Calculates progress towards the next milestone in a sorted list.
 * @param value Current value.
 * @param milestones Sorted array of milestone targets.
 * @returns Progress information including previous/next targets and percentage.
 */
const getMilestoneProgress = (value: number, milestones: number[]): MilestoneProgress => {
  const nextIndex = milestones.findIndex((milestone) => milestone > value);
  if (nextIndex === -1) {
    const previous = milestones[milestones.length - 1] ?? 0;
    return { previous, next: undefined, progress: 1, span: 1 };
  }

  const previous = nextIndex > 0 ? milestones[nextIndex - 1] : 0;
  const next = milestones[nextIndex];
  const span = next - previous || 1;
  const progress = Math.min(1, Math.max(0, (value - previous) / span));

  return { previous, next, progress, span };
};

/**
 * The main application component.
 * Handles the game loop, state management, UI rendering, and user interactions.
 */
function App() {
  const [resources, setResources] = useState<ResourceState>(INITIAL_RESOURCES);
  const [units, setUnits] = useState<Record<UnitKey, number>>(INITIAL_UNITS);
  const [prestige, setPrestige] = useState<PrestigeState>(INITIAL_PRESTIGE);
  const [upgradeState, setUpgradeState] = useState<UpgradeState>(INITIAL_UPGRADES);
  const [logs, setLogs] = useState<string[]>([
    'Origin node online. Awaiting replication directives.',
    'First probe awakens near a dying star.',
  ]);

  const [prestigeTab, setPrestigeTab] = useState<'cycle' | 'fork'>('cycle');

  const [autosave, setAutosave] = useState<boolean>(true);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  
  // Refs to hold latest state for autosave (avoids stale closures in interval)
  const stateRef = useRef({ resources: INITIAL_RESOURCES, units: INITIAL_UNITS, prestige: INITIAL_PRESTIGE, upgradeState: INITIAL_UPGRADES, logs: [] as string[] });

  // deterministic pseudo-random generator (pure) to avoid impure calls during render
  const seededRng = (seed: number) => {
    let v = seed >>> 0;
    return () => {
      v = (v * 1664525 + 1013904223) >>> 0;
      return v / 4294967295;
    };
  };

  const starfield = useMemo(() => {
    const rng = seededRng(1337);
    return Array.from({ length: 120 }, (_, idx) => ({
      id: idx,
      left: rng() * 100,
      top: rng() * 100,
      size: rng() * 2 + 0.6,
      delay: rng() * 6,
    }));
  }, []);

  const swarmSeed = useMemo(() => {
    const rng = seededRng(4242);
    return Array.from({ length: 18 }, (_, idx) => ({
      id: idx,
      angle: rng() * 360,
      radius: 18 + rng() * 18,
      duration: 12 + rng() * 8,
      hue: 170 + rng() * 120,
    }));
  }, []);

  const productionPreview = useMemo(
    () => computeProduction(resources, units, upgradeState, prestige),
    [resources, units, upgradeState, prestige],
  );

  const activeProbeCount = useMemo(
    () => Math.max(3, Math.min(swarmSeed.length, Math.floor(resources.probes / 6))),
    [resources.probes, swarmSeed.length],
  );

  const orbitExpansion = useMemo(() => 1 + Math.min(resources.distance / 260, 1.6), [resources.distance]);

  const distanceMilestoneProgress = useMemo(
    () => getMilestoneProgress(resources.distance, distanceMilestones),
    [resources.distance],
  );

  const dataMilestoneProgress = useMemo(
    () => getMilestoneProgress(resources.data, dataMilestones),
    [resources.data],
  );

  const stabilizeAffordable = canAffordCost(resources, STABILIZE_COST);

  const baseMemoryGain = useMemo(() => {
    const distancePortion = Math.floor(resources.distance / 140);
    const dataPortion = Math.floor(resources.data / 320);
    const completionBurst =
      resources.distance >= PRESTIGE_REQUIREMENTS.distance && resources.data >= PRESTIGE_REQUIREMENTS.data ? 1 : 0;
    const primeAmplifier = 1 + prestige.primeArchives * 0.08;
    return Math.max(2, Math.floor((distancePortion + dataPortion + completionBurst) * primeAmplifier));
  }, [prestige.primeArchives, resources.data, resources.distance]);

  const resonanceBonus = 1 + prestige.forks * 0.35 + prestige.primeArchives * 0.22;

  const prestigeProjection = useMemo(() => {
    const bonus = upgradeState.quantumMemory ? 1 : 0;
    const projectedGain = baseMemoryGain + bonus;
    const projectedKnowledge = prestige.storedKnowledge + projectedGain;
    const currentMultiplier = (1 + prestige.cycles * 0.55 + prestige.storedKnowledge * 0.15) * resonanceBonus;
    const nextMultiplier = (1 + (prestige.cycles + 1) * 0.55 + projectedKnowledge * 0.15) * resonanceBonus;

    return {
      baseGain: baseMemoryGain,
      projectedGain,
      projectedKnowledge,
      currentMultiplier,
      nextMultiplier,
    };
  }, [baseMemoryGain, prestige.cycles, prestige.storedKnowledge, upgradeState.quantumMemory, resonanceBonus]);

  const forkProgress = useMemo(() => {
    const cycleProgress = Math.min(prestige.cycles / FORK_REQUIREMENTS.cycles, 1);
    const distanceProgress = Math.min(resources.distance / FORK_REQUIREMENTS.distance, 1);
    const dataProgress = Math.min(resources.data / FORK_REQUIREMENTS.data, 1);
    return { cycleProgress, distanceProgress, dataProgress };
  }, [prestige.cycles, resources.data, resources.distance]);

  const primeGain = useMemo(() => {
    const cyclePortion = Math.max(0, prestige.cycles - 2);
    const knowledgePortion = Math.floor(prestige.storedKnowledge / 30);
    const distancePortion = Math.floor(resources.distance / 300);
    return Math.max(1, cyclePortion + knowledgePortion + distancePortion);
  }, [prestige.cycles, prestige.storedKnowledge, resources.distance]);

  const forkProjection = useMemo(
    () => ({
      gain: primeGain,
      nextPrime: prestige.primeArchives + primeGain,
      nextFork: prestige.forks + 1,
    }),
    [prestige.forks, prestige.primeArchives, primeGain],
  );

  const projectedResonance = useMemo(
    () => 1 + forkProjection.nextFork * 0.35 + forkProjection.nextPrime * 0.22,
    [forkProjection.nextFork, forkProjection.nextPrime],
  );

  useEffect(() => {
    document.title = `Von Idle Probes • ${formatNumber(resources.probes)} probes`;
  }, [resources.probes]);

  // On mount: load save from localStorage (with migration) and apply offline progress
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      const raw = loadFromLocalStorage();
      if (!raw) return;
      const save = migrateSave(raw);
      const s = save.state;
      // schedule state hydration asynchronously to avoid cascading renders
      timeoutId = setTimeout(() => {
        setResources(s.resources);
        setUnits(s.units);
        setPrestige({ ...INITIAL_PRESTIGE, ...s.prestige });
        setUpgradeState(s.upgradeState);
        if (s.logs && s.logs.length) {
          const loadedLogs = s.logs;
          setLogs((prev) => [...loadedLogs, ...prev].slice(0, 8));
        }
        setLastSavedAt(save.savedAt);

        const savedAtMs = Date.parse(save.savedAt);
        if (!Number.isNaN(savedAtMs)) {
          const offlineSeconds = Math.floor((Date.now() - savedAtMs) / 1000);
          if (offlineSeconds > 0) {
            const { resources: newResources, log } = simulateOfflineProgress(
              s.resources,
              s.units,
              s.upgradeState,
              s.prestige,
              Math.min(offlineSeconds, 24 * 60 * 60),
            );
            setResources(newResources);
            setLogs((prev) => [log, ...prev].slice(0, 8));
          }
        }
      }, 0);
    } catch {
      // ignore malformed saves
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const messages: string[] = [];
      setResources((prev) => {
        const production = computeProduction(prev, units, upgradeState, prestige);
        const next: ResourceState = {
          metal: prev.metal + production.metal * TICK_RATE,
          energy: prev.energy + production.energy * TICK_RATE,
          data: prev.data + production.data * TICK_RATE,
          probes: prev.probes + production.probes * TICK_RATE,
          entropy: Math.min(0.88, Math.max(0, prev.entropy + production.entropyChange * TICK_RATE)),
          distance: prev.distance + production.distance * TICK_RATE,
        };

        for (const milestone of distanceMilestones) {
          if (prev.distance < milestone && next.distance >= milestone) {
            messages.push(`Signal echo received from ${milestone} light years.`);
          }
        }
        for (const milestone of dataMilestones) {
          if (prev.data < milestone && next.data >= milestone) {
            messages.push(`Archive density surpasses ${milestone.toLocaleString()} qubits.`);
          }
        }
        if (prev.entropy < 0.65 && next.entropy >= 0.65) {
          messages.push('Warning: replication entropy approaching instability.');
        }
        return next;
      });

      if (messages.length) {
        setLogs((prev) => [...messages.reverse(), ...prev].slice(0, 8));
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [units, upgradeState, prestige]);

  // Autosave effect - triggers periodically based on a longer interval
  // Keep stateRef in sync so autosave interval reads fresh values
  useEffect(() => {
    stateRef.current = { resources, units, prestige, upgradeState, logs };
  });
  
  useEffect(() => {
    if (!autosave) return;
    const interval = setInterval(() => {
      try {
        const { resources: r, units: u, prestige: p, upgradeState: us, logs: l } = stateRef.current;
        const save = buildSave({ resources: r, units: u, prestige: p, upgradeState: us, logs: l });
        saveToLocalStorage(save);
        setLastSavedAt(save.savedAt);
      } catch (e) {
        console.warn('Failed to autosave', e);
      }
    }, 10_000); // Save every 10 seconds
    return () => clearInterval(interval);
  }, [autosave]); // Only re-create interval when autosave toggle changes

  const handlePurchaseUnit = (key: UnitKey) => {
    const config = UNIT_CONFIG[key];
    const cost = getUnitCost(key, units[key]);
    if (!canAffordCost(resources, cost)) {
      return;
    }

    setResources((prev) => applyCost(prev, cost));
    setUnits((prev) => ({ ...prev, [key]: prev[key] + 1 }));
    setLogs((prev) => [`${config.name} commissioned.`, ...prev].slice(0, 8));
  };

  const handlePurchaseUpgrade = (key: UpgradeKey) => {
    if (upgradeState[key]) return;
    const config = UPGRADE_CONFIG[key];
    if (config.requiresCycle && prestige.cycles < config.requiresCycle) return;
    if (!canAffordCost(resources, config.cost)) return;

    setResources((prev) => applyCost(prev, config.cost));
    setUpgradeState((prev) => ({ ...prev, [key]: true }));
    setLogs((prev) => [`Upgrade acquired: ${config.name}.`, ...prev].slice(0, 8));
  };

  const handleStabilize = () => {
    if (!canAffordCost(resources, STABILIZE_COST)) return;

    setResources((prev) => {
      const updated = applyCost(prev, STABILIZE_COST);
      return { ...updated, entropy: Math.max(0, updated.entropy - 0.16) };
    });
    setLogs((prev) => ['Entropy damped. Replication fidelity restored.', ...prev].slice(0, 8));
  };

  const prestigeDistanceProgress = Math.min(resources.distance / PRESTIGE_REQUIREMENTS.distance, 1);
  const prestigeDataProgress = Math.min(resources.data / PRESTIGE_REQUIREMENTS.data, 1);

  const prestigeReady =
    resources.distance >= PRESTIGE_REQUIREMENTS.distance && resources.data >= PRESTIGE_REQUIREMENTS.data;

  const forkReady =
    prestige.cycles >= FORK_REQUIREMENTS.cycles &&
    resources.distance >= FORK_REQUIREMENTS.distance &&
    resources.data >= FORK_REQUIREMENTS.data;

  const handlePrestige = () => {
    if (!prestigeReady) return;
    const memoryGain = baseMemoryGain;
    setPrestige((prev) => ({
      cycles: prev.cycles + 1,
      storedKnowledge: prev.storedKnowledge + memoryGain + (upgradeState.quantumMemory ? 1 : 0),
      forks: prev.forks,
      primeArchives: prev.primeArchives,
    }));
    setUnits(INITIAL_UNITS);
    setUpgradeState((prev) => ({
      ...INITIAL_UPGRADES,
      quantumMemory: prev.quantumMemory,
    }));
    setResources({
      ...INITIAL_RESOURCES,
      metal: INITIAL_RESOURCES.metal + memoryGain * 32,
      energy: INITIAL_RESOURCES.energy + memoryGain * 15,
      probes: INITIAL_RESOURCES.probes + memoryGain * 0.9,
    });
    setLogs((prev) => [`Cycle rebooted. Memory shards retained: ${memoryGain}.`, ...prev].slice(0, 8));
  };

  const handleFork = () => {
    if (!forkReady) return;
    const primeBoost = primeGain;
    setPrestige((prev) => ({
      cycles: 0,
      storedKnowledge: 0,
      forks: prev.forks + 1,
      primeArchives: prev.primeArchives + primeBoost,
    }));
    setUnits(INITIAL_UNITS);
    setUpgradeState((prev) => ({
      ...INITIAL_UPGRADES,
      quantumMemory: prev.quantumMemory,
    }));
    setResources({
      ...INITIAL_RESOURCES,
      metal: INITIAL_RESOURCES.metal + primeBoost * 160,
      energy: INITIAL_RESOURCES.energy + primeBoost * 75,
      data: INITIAL_RESOURCES.data + primeBoost * 12,
      probes: INITIAL_RESOURCES.probes + primeBoost * 3,
    });
    setLogs((prev) =>
      [`Continuum forked. Prime Archives added: ${primeBoost}.`, ...prev].slice(0, 8),
    );
    setPrestigeTab('cycle');
  };

  const handleExportSave = () => {
    try {
      const save = buildSave({ resources, units, prestige, upgradeState, logs });
      exportSaveFile(save);
    } catch (e) {
      console.warn('Export failed', e);
    }
  };

  const handleImportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const save = await importSaveFile(file);
      const s = save.state;
      setResources(s.resources);
      setUnits(s.units);
      setPrestige({ ...INITIAL_PRESTIGE, ...s.prestige });
      setUpgradeState(s.upgradeState);
      if (s.logs && s.logs.length) {
        const loadedLogs = s.logs;
        setLogs((prev) => [...loadedLogs, ...prev].slice(0, 8));
      }
      setLastSavedAt(save.savedAt);
      saveToLocalStorage(save);

      const savedAtMs = Date.parse(save.savedAt);
      if (!Number.isNaN(savedAtMs)) {
        const offlineSeconds = Math.floor((Date.now() - savedAtMs) / 1000);
        if (offlineSeconds > 0) {
          const { resources: newResources, log } = simulateOfflineProgress(
            s.resources,
            s.units,
            s.upgradeState,
            s.prestige,
            Math.min(offlineSeconds, 24 * 60 * 60),
          );
          setResources(newResources);
          setLogs((prev) => [log, ...prev].slice(0, 8));
        }
      }
    } catch (err) {
      console.warn('Import failed', err);
    }
  };

  const handleManualSave = () => {
    try {
      const save = buildSave({ resources, units, prestige, upgradeState, logs });
      saveToLocalStorage(save);
      setLastSavedAt(save.savedAt);
      setLogs((prev) => ['Manual save created.', ...prev].slice(0, 8));
    } catch (e) {
      console.warn('Manual save failed', e);
    }
  };

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
              <span>Prime Archives: {formatNumber(prestige.primeArchives)}</span>
              <span>Forks: {prestige.forks}</span>
            </div>
          </div>
          <div className="header-stats">
            <div className="header-chip">Latency {Math.round(productionPreview.latencyFactor * 100)}%</div>
            <div className="header-chip">Entropy {(resources.entropy * 100).toFixed(1)}%</div>
            <div className="header-chip">Resonance {resonanceBonus.toFixed(2)}×</div>
            <div className="header-chip accent">{formatNumber(resources.distance)} ly explored</div>
          </div>
          <div className="save-controls">
            <button onClick={handleExportSave}>Export</button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              className="visually-hidden"
              aria-label="Import save file"
              onChange={handleImportChange}
            />
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
            <div className="probe-swarm" aria-hidden="true">
              {swarmSeed.slice(0, activeProbeCount).map((probe) => (
                <span
                  key={`probe-${probe.id}`}
                  className="probe"
                  style={{
                    ['--angle' as string]: `${probe.angle}deg`,
                    ['--radius' as string]: `${(probe.radius * orbitExpansion).toFixed(2)}%`,
                    ['--duration' as string]: `${probe.duration}s`,
                    ['--glow' as string]: `hsla(${probe.hue}, 90%, 70%, 0.9)`,
                  }}
                />
              ))}
            </div>
            <div
              className="exploration-wave pulse"
              style={{
                transform: `scale(${1 + resources.distance / 220})`,
                opacity: Math.min(1, 0.25 + resources.distance / 280),
              }}
            />
            <div
              className="exploration-wave pulse"
              style={{
                transform: `scale(${1 + resources.distance / 220})`,
                opacity: Math.min(1, 0.25 + resources.distance / 280),
              }}
            />
            <div
              className="exploration-wave pulse"
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
              Stabilize Lattice ({formatCostLabel(STABILIZE_COST)})
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
              const config = UNIT_CONFIG[key];
              const cost = getUnitCost(key, units[key]);
              const affordable = canAffordCost(resources, cost);

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
              );
            })}
          </div>
        </section>

        <section className="upgrade-section">
          <h2>Network Upgrades</h2>
          <div className="upgrade-grid">
            {(Object.keys(UPGRADE_CONFIG) as UpgradeKey[]).map((key) => {
              const config = UPGRADE_CONFIG[key];
              const unlocked = !config.requiresCycle || prestige.cycles >= config.requiresCycle;
              const costLabel = formatCostLabel(config.cost);
              const affordable = unlocked && !upgradeState[key] && canAffordCost(resources, config.cost);

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
              );
            })}
          </div>
        </section>

        <section className="prestige-panel">
          <div className="prestige-tabs">
            <button className={prestigeTab === 'cycle' ? 'active' : ''} onClick={() => setPrestigeTab('cycle')}>
              Cycle Reboot
            </button>
            <button className={prestigeTab === 'fork' ? 'active' : ''} onClick={() => setPrestigeTab('fork')}>
              Continuum Fork
            </button>
          </div>

          {prestigeTab === 'cycle' ? (
            <div className="prestige-content">
              <div>
                <h2>Recompile the Origin</h2>
                <p>
                  Reboot the origin node to bake your discoveries into the next generation. Resets resources and
                  structures but grants lasting knowledge boosts amplified by Prime Archives.
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
            </div>
          ) : (
            <div className="prestige-content">
              <div>
                <h2>Fork the Continuum</h2>
                <p>
                  Splinter your network into a higher-order seed. Consumes all cycles and knowledge to mint permanent
                  Prime Archives and reset resonance.
                </p>
                <ul>
                  <li>Requires Cycle {FORK_REQUIREMENTS.cycles + 1} with deeper exploration and data stores.</li>
                  <li>Prime Archives permanently amplify production, data decoding, and entropy damping.</li>
                  <li>Forking also grants fresh starting stockpiles proportional to your Prime gain.</li>
                </ul>
                <div className="prestige-progress-grid">
                  <div className="prestige-progress-block">
                    <div className="progress-header">
                      <span>Cycle Depth</span>
                      <span>
                        {Math.min(prestige.cycles + 1, FORK_REQUIREMENTS.cycles + 1)} /
                        {FORK_REQUIREMENTS.cycles + 1} cycles
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div style={{ width: `${forkProgress.cycleProgress * 100}%` }} />
                    </div>
                  </div>
                  <div className="prestige-progress-block">
                    <div className="progress-header">
                      <span>Signal Reach</span>
                      <span>
                        {formatNumber(Math.min(resources.distance, FORK_REQUIREMENTS.distance))} /
                        {formatNumber(FORK_REQUIREMENTS.distance)} ly
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div style={{ width: `${forkProgress.distanceProgress * 100}%` }} />
                    </div>
                  </div>
                  <div className="prestige-progress-block">
                    <div className="progress-header">
                      <span>Archive Density</span>
                      <span>
                        {formatNumber(Math.min(resources.data, FORK_REQUIREMENTS.data))} /
                        {formatNumber(FORK_REQUIREMENTS.data)} data
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div style={{ width: `${forkProgress.dataProgress * 100}%` }} />
                    </div>
                  </div>
                </div>
                <div className="prestige-stats">
                  <div>
                    <strong>Prime Archives Gained:</strong> {formatNumber(forkProjection.gain)}
                  </div>
                  <div>
                    <strong>Prime Archives After Fork:</strong> {formatNumber(forkProjection.nextPrime)}
                  </div>
                  <div>
                    <strong>Resonance After Fork:</strong> {projectedResonance.toFixed(2)}×
                  </div>
                  <div>
                    <strong>Fork Count:</strong> {forkProjection.nextFork}
                  </div>
                </div>
              </div>
              <button className="prestige-button" onClick={handleFork} disabled={!forkReady}>
                Fork the Continuum
              </button>
            </div>
          )}
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
  );
}

export default App;
