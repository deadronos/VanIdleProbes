import { useEffect, useMemo, useState, useRef } from 'react';
import './App.css';
import type { ResourceKey, ResourceState, UnitKey, UpgradeKey, PrestigeState, UpgradeState, Cost, AnomalyKey } from './game/config';
import { INITIAL_RESOURCES, INITIAL_UNITS, INITIAL_PRESTIGE, INITIAL_UPGRADES, UNIT_CONFIG, UPGRADE_CONFIG, ANOMALY_CONFIG } from './game/config';
import { computeProduction, simulateOfflineProgress } from './game/engine';
import { buildSave, saveToLocalStorage, loadFromLocalStorage, migrateSave } from './game/save';
import { formatNumber } from './components/Formatters';
import { canAffordCost, applyCost, getUnitCost } from './util/game-logic';
import { ResourceCard } from './components/ResourceCard';
import { UnitCard } from './components/UnitCard';
import { UpgradeCard } from './components/UpgradeCard';
import { GalaxyMap } from './components/GalaxyMap';
import { PrestigePanel } from './components/PrestigePanel';
import { warn } from './util/logger';

const TICK_MS = 250;

const resourceOrder: ResourceKey[] = ['metal', 'energy', 'probes', 'data'];
const resourceFlavour: Record<ResourceKey, string> = {
  metal: 'Captured asteroid matter feeding the foundries.',
  energy: 'Refined stellar flux powering the network.',
  probes: 'Autonomous Von Neumann agents exploring the expanse.',
  data: 'Crystalline memory encoded from every contact.',
};

const distanceMilestones = [15, 40, 90, 180, 320];
const dataMilestones = [60, 180, 420, 800];
const PRESTIGE_REQUIREMENTS = { distance: 120, data: 650 };
const FORK_REQUIREMENTS = { cycles: 3, distance: 420, data: 1400 };
const STABILIZE_COST: Cost = { data: 35 };

function App() {
  const [resources, setResources] = useState<ResourceState>(INITIAL_RESOURCES);
  const [units, setUnits] = useState<Record<UnitKey, number>>(INITIAL_UNITS);
  const [prestige, setPrestige] = useState<PrestigeState>(INITIAL_PRESTIGE);
  const [upgradeState, setUpgradeState] = useState<UpgradeState>(INITIAL_UPGRADES);
  const [scannedAnomalies, setScannedAnomalies] = useState<AnomalyKey[]>([]);
  const [logs, setLogs] = useState<string[]>([
    'Origin node online. Awaiting replication directives.',
    'First probe awakens near a dying star.',
  ]);

  const [prestigeTab, setPrestigeTab] = useState<'cycle' | 'fork'>('cycle');
  const [autosave] = useState<boolean>(true);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [buyAmount, setBuyAmount] = useState<1 | 10 | 100>(1);
  
  const stateRef = useRef({ resources, units, prestige, upgradeState, scannedAnomalies, logs });

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
    () => computeProduction(resources, units, upgradeState, prestige, scannedAnomalies),
    [resources, units, upgradeState, prestige, scannedAnomalies],
  );

  const activeProbeCount = useMemo(
    () => Math.max(3, Math.min(swarmSeed.length, Math.floor(resources.probes / 6))),
    [resources.probes, swarmSeed.length],
  );

  const orbitExpansion = useMemo(() => 1 + Math.min(resources.distance / 260, 1.6), [resources.distance]);
  const resonanceBonus = 1 + prestige.forks * 0.35 + prestige.primeArchives * 0.22;
  const cycleMultiplier = 1 + prestige.cycles * 0.55 + prestige.storedKnowledge * 0.15;
  const totalMultiplier = cycleMultiplier * resonanceBonus;
  const baseMemoryGain = Math.max(0, Math.floor(resources.distance / 12 + resources.data / 140) - 14);
  const primeGain = Math.max(0, Math.floor(prestige.cycles / 1.5 + resources.distance / 280) - 2);

  useEffect(() => {
    const raw = loadFromLocalStorage();
    if (raw) {
      try {
        const saved = migrateSave(raw);
        const s = saved.state;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setResources(s.resources);
        setUnits(s.units);
        setPrestige({ ...INITIAL_PRESTIGE, ...s.prestige });
        setUpgradeState(s.upgradeState);
        setScannedAnomalies(s.scannedAnomalies || []);
        if (s.logs && s.logs.length) setLogs(s.logs);
        setLastSavedAt(saved.savedAt);

        const savedAtMs = Date.parse(saved.savedAt);
        if (!Number.isNaN(savedAtMs)) {
          const offlineSeconds = Math.floor((Date.now() - savedAtMs) / 1000);
          if (offlineSeconds > 5) {
            const { resources: res, log } = simulateOfflineProgress(
              s.resources,
              s.units,
              s.upgradeState,
              s.prestige,
              s.scannedAnomalies || [],
              Math.min(offlineSeconds, 24 * 60 * 60),
            );
            setResources(res);
            setLogs((prev) => [log, ...prev].slice(0, 8));
          }
        }
      } catch (e) {
        warn('Failed to load save:', e);
      }
    }

  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const messages: string[] = [];
      setResources((prev) => {
        const prod = computeProduction(prev, units, upgradeState, prestige, scannedAnomalies);
        const next = {
          metal: prev.metal + prod.metal * (TICK_MS / 1000),
          energy: prev.energy + prod.energy * (TICK_MS / 1000),
          data: prev.data + prod.data * (TICK_MS / 1000),
          probes: prev.probes + prod.probes * (TICK_MS / 1000),
          entropy: Math.min(1, Math.max(0, prev.entropy + prod.entropyChange * (TICK_MS / 1000))),
          distance: prev.distance + prod.distance * (TICK_MS / 1000),
        };

        for (const milestone of distanceMilestones) {
          if (prev.distance < milestone && next.distance >= milestone) {
            messages.push(`Signal detected at ${milestone} light years.`);
          }
        }
        for (const milestone of dataMilestones) {
          if (prev.data < milestone && next.data >= milestone) {
            messages.push(`Archive density surpasses ${milestone.toLocaleString()} qubits.`);
          }
        }
        return next;
      });

      if (messages.length) {
        setLogs((prev) => [...messages.reverse(), ...prev].slice(0, 8));
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [units, upgradeState, prestige, scannedAnomalies]);

  useEffect(() => {
    stateRef.current = { resources, units, prestige, upgradeState, scannedAnomalies, logs };
  });
  
  useEffect(() => {
    if (!autosave) return;
    const interval = setInterval(() => {
      const { resources: r, units: u, prestige: p, upgradeState: us, scannedAnomalies: sa, logs: l } = stateRef.current;
      const save = buildSave({ resources: r, units: u, prestige: p, upgradeState: us, scannedAnomalies: sa, logs: l });
      saveToLocalStorage(save);
      setLastSavedAt(save.savedAt);
    }, 10_000);
    return () => clearInterval(interval);
  }, [autosave]);

  const handlePurchaseUnit = (key: UnitKey) => {
    for(let i=0; i<buyAmount; i++) {
        const cost = getUnitCost(key, units[key] + i);
        if (!canAffordCost(resources, cost)) break;
        setResources(prev => applyCost(prev, cost));
        setUnits(prev => ({ ...prev, [key]: prev[key] + 1 }));
    }
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
  };

  const handleScanAnomaly = (key: AnomalyKey) => {
    if (scannedAnomalies.includes(key)) return;
    const config = ANOMALY_CONFIG[key];
    if (resources.distance < config.distanceReq) return;
    if (!canAffordCost(resources, config.cost)) return;
    setResources((prev) => applyCost(prev, config.cost));
    setScannedAnomalies((prev) => [...prev, key]);
    setLogs((prev) => [`Anomaly analyzed: ${config.name}.`, ...prev].slice(0, 8));
  };

  const handlePrestige = () => {
    const memoryGain = baseMemoryGain;
    setPrestige((prev) => ({
      ...prev,
      cycles: prev.cycles + 1,
      storedKnowledge: prev.storedKnowledge + memoryGain + (upgradeState.quantumMemory ? 1 : 0),
    }));
    setUnits(INITIAL_UNITS);
    setUpgradeState((prev) => ({ ...INITIAL_UPGRADES, quantumMemory: prev.quantumMemory }));
    setScannedAnomalies([]);
    setResources({ ...INITIAL_RESOURCES });
  };

  const handleFork = () => {
    const primeBoost = primeGain;
    setPrestige((prev) => ({
      cycles: 0,
      storedKnowledge: 0,
      forks: prev.forks + 1,
      primeArchives: prev.primeArchives + primeBoost,
    }));
    setUnits(INITIAL_UNITS);
    setUpgradeState((prev) => ({ ...INITIAL_UPGRADES, quantumMemory: prev.quantumMemory }));
    setScannedAnomalies([]);
    setResources({ ...INITIAL_RESOURCES });
    setPrestigeTab('cycle');
  };

  const handleManualSave = () => {
    const save = buildSave({ resources, units, prestige, upgradeState, scannedAnomalies, logs });
    saveToLocalStorage(save);
    setLastSavedAt(save.savedAt);
  };

  return (
    <div className="app">
      <div className="cosmic-background">
        {starfield.map((star) => (
          <span key={star.id} className="background-star" style={{ left: `${star.left}%`, top: `${star.top}%`, width: `${star.size}px`, height: `${star.size}px`, animationDelay: `${star.delay}s` }} />
        ))}
      </div>
      <main className="interface">
        <header className="header">
          <div>
            <h1>Von Idle Probes</h1>
            <div className="cycle-info">
              <span>Cycle {prestige.cycles + 1}</span>
              <span>Stored Knowledge: {formatNumber(prestige.storedKnowledge)}</span>
              <span>Prime Archives: {formatNumber(prestige.primeArchives)}</span>
            </div>
          </div>
          <div className="header-stats">
            <div className="header-chip">Latency {Math.round(productionPreview.latencyFactor * 100)}%</div>
            <div className="header-chip">Entropy {(resources.entropy * 100).toFixed(1)}%</div>
            <div className="header-chip accent">{formatNumber(resources.distance)} ly explored</div>
          </div>
          <div className="save-controls">
            <button onClick={handleManualSave}>Save</button>
            <div className="last-saved">Last saved: {lastSavedAt ? lastSavedAt : 'Never'}</div>
          </div>
        </header>

        <section className="galaxy-section">
          <GalaxyMap starfield={starfield} swarmSeed={swarmSeed} activeProbeCount={activeProbeCount} orbitExpansion={orbitExpansion} distance={resources.distance} scannedAnomalies={scannedAnomalies} />
          <div className="entropy-panel">
            <h3>Replication Entropy</h3>
            <div className="entropy-bar"><div className="entropy-fill" style={{ width: `${resources.entropy * 100}%` }} /></div>
            <p>Drift {productionPreview.entropyChange >= 0 ? '+' : ''}{productionPreview.entropyChange.toFixed(3)} /s</p>
            <button className="primary" onClick={handleStabilize} disabled={!canAffordCost(resources, STABILIZE_COST)}>
              Stabilize Lattice ({formatNumber(STABILIZE_COST.data || 0)} data)
            </button>
          </div>
        </section>

        <section className="resource-grid">
          {resourceOrder.map((res) => (
            <ResourceCard key={res} resource={res} amount={resources[res]} rate={productionPreview[res]} flavour={resourceFlavour[res]} multipliers={productionPreview.multipliers} />
          ))}
        </section>

        <section className="unit-section">
          <div className="section-header">
            <h2>Unit Fabrication</h2>
            <div className="buy-selector">
                {[1, 10, 100].map(amt => (
                    <button key={amt} className={buyAmount === amt ? 'active' : ''} onClick={() => setBuyAmount(amt as 1 | 10 | 100)}>{amt}x</button>
                ))}
            </div>
          </div>
          <div className="unit-grid">
            {(Object.keys(UNIT_CONFIG) as UnitKey[]).map((key) => (
              <UnitCard key={key} unitKey={key} count={units[key]} cost={getUnitCost(key, units[key])} onAction={() => handlePurchaseUnit(key)} canAfford={canAffordCost(resources, getUnitCost(key, units[key]))} />
            ))}
          </div>
        </section>

        <section className="scanner-section">
          <h2>Deep Space Scanner</h2>
          <div className="unit-grid">
            {(Object.keys(ANOMALY_CONFIG) as AnomalyKey[]).map((key) => (
              <UnitCard key={key} anomalyKey={key} cost={ANOMALY_CONFIG[key].cost} onAction={() => handleScanAnomaly(key)} canAfford={canAffordCost(resources, ANOMALY_CONFIG[key].cost)} isScanned={scannedAnomalies.includes(key)} />
            ))}
          </div>
        </section>

        <section className="upgrade-section">
          <h2>Firmware Upgrades</h2>
          <div className="upgrade-grid">
            {(Object.keys(UPGRADE_CONFIG) as UpgradeKey[]).map((key) => (
              <UpgradeCard key={key} upgradeKey={key} purchased={upgradeState[key]} unlocked={!UPGRADE_CONFIG[key].requiresCycle || prestige.cycles >= (UPGRADE_CONFIG[key].requiresCycle || 0)} onPurchase={() => handlePurchaseUpgrade(key)} canAfford={canAffordCost(resources, UPGRADE_CONFIG[key].cost)} />
            ))}
          </div>
        </section>

        <PrestigePanel
          resources={resources}
          prestige={prestige}
          prestigeTab={prestigeTab}
          setPrestigeTab={setPrestigeTab}
          requirements={{ cycle: PRESTIGE_REQUIREMENTS, fork: FORK_REQUIREMENTS }}
          projections={{
            cycle: { projectedGain: baseMemoryGain, baseGain: baseMemoryGain, nextMultiplier: 0, currentMultiplier: totalMultiplier, projectedKnowledge: prestige.storedKnowledge + baseMemoryGain },
            fork: { gain: primeGain, nextPrime: prestige.primeArchives + primeGain, nextFork: prestige.forks + 1 }
          }}
          progress={{
            cycle: { distance: resources.distance / PRESTIGE_REQUIREMENTS.distance, data: resources.data / PRESTIGE_REQUIREMENTS.data },
            fork: { cycle: prestige.cycles / FORK_REQUIREMENTS.cycles, distance: resources.distance / FORK_REQUIREMENTS.distance, data: resources.data / FORK_REQUIREMENTS.data }
          }}
          resonance={{ current: resonanceBonus, projected: 1 + (prestige.forks + 1) * 0.35 + (prestige.primeArchives + primeGain) * 0.22 }}
          ready={{ cycle: resources.distance >= PRESTIGE_REQUIREMENTS.distance && resources.data >= PRESTIGE_REQUIREMENTS.data, fork: prestige.cycles >= FORK_REQUIREMENTS.cycles && resources.distance >= FORK_REQUIREMENTS.distance && resources.data >= FORK_REQUIREMENTS.data }}
          onPrestige={handlePrestige}
          onFork={handleFork}
        />

        <section className="log-section">
          <h2>Telemetry Feed</h2>
          <ul>{logs.map((log, i) => <li key={i}>{log}</li>)}</ul>
        </section>
      </main>
    </div>
  );
}

export default App;
