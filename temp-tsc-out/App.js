import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useEffect, useMemo, useState, useRef } from 'react';
import './App.css';
import { INITIAL_RESOURCES, INITIAL_UNITS, INITIAL_PRESTIGE, INITIAL_UPGRADES, UNIT_CONFIG, UPGRADE_CONFIG } from './game/config';
import { simulateOfflineProgress } from './game/engine';
import { buildSave, saveToLocalStorage, loadFromLocalStorage, exportSaveFile, importSaveFile, migrateSave } from './game/save';
const TICK_MS = 250;
const TICK_RATE = TICK_MS / 1000;
const formatNumber = (value) => {
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
const canAffordCost = (resources, cost) => Object.entries(cost).every(([key, value]) => value ? resources[key] >= value : true);
const applyCost = (resources, cost) => {
    const updated = { ...resources };
    for (const [key, value] of Object.entries(cost)) {
        if (value) {
            updated[key] -= value;
        }
    }
    return updated;
};
const getUnitCost = (key, owned) => {
    const config = UNIT_CONFIG[key];
    const multiplier = Math.pow(config.costGrowth, owned);
    return Object.fromEntries(Object.entries(config.baseCost).map(([resource, value]) => [resource, value * multiplier]));
};
const computeProduction = (resources, units, upgrades, prestige) => {
    const cycleBoost = 1 + prestige.cycles * 0.55 + prestige.storedKnowledge * 0.12;
    const signalBonus = 1 + units.signalRelays * 0.18 + (upgrades.autonomy ? 0.35 : 0);
    const baseLatencyFactor = 1 / (1 + Math.max(0, resources.distance - signalBonus * 90) / (160 + signalBonus * 75));
    const latencyFactor = upgrades.autonomy && baseLatencyFactor < 1
        ? baseLatencyFactor + (1 - baseLatencyFactor) * 0.2
        : baseLatencyFactor;
    const entropyPressureBase = 0.012 + resources.distance / 8200;
    const entropyPressure = upgrades.stellarCartography ? entropyPressureBase * 0.85 : entropyPressureBase;
    const entropyMitigation = units.stabilizers * 0.018 + (upgrades.stellarCartography ? 0.01 : 0);
    const entropyChange = entropyPressure - entropyMitigation;
    const entropyPenalty = Math.max(0.28, 1 - Math.min(0.82, resources.entropy) * (upgrades.quantumMemory ? 0.55 : 0.7));
    const delayCompensation = upgrades.autonomy && baseLatencyFactor < 0.999 ? 1.2 : 1;
    const productionFactor = cycleBoost * latencyFactor * entropyPenalty * delayCompensation;
    const energyMultiplier = upgrades.dysonSheath ? 1.4 : 1;
    const probeMultiplier = upgrades.autoforge ? 1.5 : 1;
    const dataMultiplier = upgrades.archiveBloom ? 1.6 : 1;
    const cartographyExplorationBonus = upgrades.stellarCartography ? 1.12 : 1;
    const metal = (4 + units.harvesters * 9.5 + units.foundries * 1.5) * productionFactor;
    const energy = (units.foundries * 6.3 * energyMultiplier + units.harvesters * 1.4) * productionFactor;
    const probes = (units.fabricators * 0.95 * probeMultiplier + resources.probes * 0.012) * productionFactor;
    const data = (units.archives * 1.45 * dataMultiplier + Math.max(0, resources.distance - 40) * 0.018 + 0.05) *
        productionFactor;
    const distance = (resources.probes * (0.08 + units.signalRelays * 0.0038 + (upgrades.autonomy ? 0.02 : 0)) +
        units.fabricators * 0.014 +
        units.archives * 0.004) *
        latencyFactor *
        cartographyExplorationBonus;
    return {
        metal,
        energy,
        data,
        probes,
        distance,
        entropyChange,
        latencyFactor,
        productionFactor,
    };
};
const resourceOrder = ['metal', 'energy', 'probes', 'data'];
const resourceLabels = {
    metal: 'Alloy Mass',
    energy: 'Stellar Energy',
    probes: 'Active Probes',
    data: 'Archived Data',
};
const resourceFlavour = {
    metal: 'Captured asteroid matter feeding the foundries.',
    energy: 'Refined stellar flux powering the network.',
    probes: 'Autonomous Von Neumann agents exploring the expanse.',
    data: 'Crystalline memory encoded from every contact.',
};
const formatCostLabel = (cost) => Object.entries(cost)
    .filter(([, value]) => value && value > 0)
    .map(([resource, value]) => `${resourceLabels[resource]} ${formatNumber(value)}`)
    .join(' • ');
const distanceMilestones = [15, 40, 90, 180, 320];
const dataMilestones = [60, 180, 420, 800];
const PRESTIGE_REQUIREMENTS = { distance: 160, data: 900 };
const STABILIZE_COST = { data: 45 };
const getMilestoneProgress = (value, milestones) => {
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
function App() {
    const [resources, setResources] = useState(INITIAL_RESOURCES);
    const [units, setUnits] = useState(INITIAL_UNITS);
    const [prestige, setPrestige] = useState(INITIAL_PRESTIGE);
    const [upgradeState, setUpgradeState] = useState(INITIAL_UPGRADES);
    const [logs, setLogs] = useState([
        'Origin node online. Awaiting replication directives.',
        'First probe awakens near a dying star.',
    ]);
    const [autosave, setAutosave] = useState(true);
    const [lastSavedAt, setLastSavedAt] = useState(null);
    const importInputRef = useRef(null);
    const starfield = useMemo(() => Array.from({ length: 120 }, (_, idx) => ({
        id: idx,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 2 + 0.6,
        delay: Math.random() * 6,
    })), []);
    const productionPreview = useMemo(() => computeProduction(resources, units, upgradeState, prestige), [resources, units, upgradeState, prestige]);
    const distanceMilestoneProgress = useMemo(() => getMilestoneProgress(resources.distance, distanceMilestones), [resources.distance]);
    const dataMilestoneProgress = useMemo(() => getMilestoneProgress(resources.data, dataMilestones), [resources.data]);
    const stabilizeAffordable = canAffordCost(resources, STABILIZE_COST);
    const prestigeProjection = useMemo(() => {
        const baseGain = Math.max(1, Math.floor(resources.data / 450) + Math.floor(resources.distance / 200));
        const bonus = upgradeState.quantumMemory ? 1 : 0;
        const projectedGain = baseGain + bonus;
        const projectedKnowledge = prestige.storedKnowledge + projectedGain;
        const currentMultiplier = 1 + prestige.cycles * 0.55 + prestige.storedKnowledge * 0.12;
        const nextMultiplier = 1 + (prestige.cycles + 1) * 0.55 + projectedKnowledge * 0.12;
        return {
            baseGain,
            projectedGain,
            projectedKnowledge,
            currentMultiplier,
            nextMultiplier,
        };
    }, [resources.data, resources.distance, prestige.cycles, prestige.storedKnowledge, upgradeState.quantumMemory]);
    useEffect(() => {
        document.title = `Von Idle Probes • ${formatNumber(resources.probes)} probes`;
    }, [resources.probes]);
    // On mount: load save from localStorage (with migration) and apply offline progress
    useEffect(() => {
        try {
            const raw = loadFromLocalStorage();
            if (!raw)
                return;
            const save = migrateSave(raw);
            const s = save.state;
            setResources(s.resources);
            setUnits(s.units);
            setPrestige(s.prestige);
            setUpgradeState(s.upgradeState);
            if (s.logs && s.logs.length)
                setLogs((prev) => [...s.logs, ...prev].slice(0, 8));
            setLastSavedAt(save.savedAt);
            const savedAtMs = Date.parse(save.savedAt);
            if (!Number.isNaN(savedAtMs)) {
                const offlineSeconds = Math.floor((Date.now() - savedAtMs) / 1000);
                if (offlineSeconds > 0) {
                    const { resources: newResources, log } = simulateOfflineProgress(s.resources, s.units, s.upgradeState, s.prestige, Math.min(offlineSeconds, 24 * 60 * 60));
                    setResources(newResources);
                    setLogs((prev) => [log, ...prev].slice(0, 8));
                }
            }
        }
        catch (e) {
            // ignore malformed saves
            // console.warn('Failed to load or migrate save', e)
        }
    }, []);
    useEffect(() => {
        const interval = setInterval(() => {
            const messages = [];
            setResources((prev) => {
                const production = computeProduction(prev, units, upgradeState, prestige);
                const next = {
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
    // Autosave (debounced)
    useEffect(() => {
        if (!autosave)
            return;
        const t = setTimeout(() => {
            try {
                const save = buildSave({ resources, units, prestige, upgradeState, logs });
                saveToLocalStorage(save);
                setLastSavedAt(save.savedAt);
            }
            catch (e) {
                console.warn('Failed to autosave', e);
            }
        }, 2000);
        return () => clearTimeout(t);
    }, [resources, units, prestige, upgradeState, logs, autosave]);
    const handlePurchaseUnit = (key) => {
        const config = UNIT_CONFIG[key];
        const cost = getUnitCost(key, units[key]);
        if (!canAffordCost(resources, cost)) {
            return;
        }
        setResources((prev) => applyCost(prev, cost));
        setUnits((prev) => ({ ...prev, [key]: prev[key] + 1 }));
        setLogs((prev) => [`${config.name} commissioned.`, ...prev].slice(0, 8));
    };
    const handlePurchaseUpgrade = (key) => {
        if (upgradeState[key])
            return;
        const config = UPGRADE_CONFIG[key];
        if (config.requiresCycle && prestige.cycles < config.requiresCycle)
            return;
        if (!canAffordCost(resources, config.cost))
            return;
        setResources((prev) => applyCost(prev, config.cost));
        setUpgradeState((prev) => ({ ...prev, [key]: true }));
        setLogs((prev) => [`Upgrade acquired: ${config.name}.`, ...prev].slice(0, 8));
    };
    const handleStabilize = () => {
        if (!canAffordCost(resources, STABILIZE_COST))
            return;
        setResources((prev) => {
            const updated = applyCost(prev, STABILIZE_COST);
            return { ...updated, entropy: Math.max(0, updated.entropy - 0.16) };
        });
        setLogs((prev) => ['Entropy damped. Replication fidelity restored.', ...prev].slice(0, 8));
    };
    const prestigeDistanceProgress = Math.min(resources.distance / PRESTIGE_REQUIREMENTS.distance, 1);
    const prestigeDataProgress = Math.min(resources.data / PRESTIGE_REQUIREMENTS.data, 1);
    const prestigeReady = resources.distance >= PRESTIGE_REQUIREMENTS.distance && resources.data >= PRESTIGE_REQUIREMENTS.data;
    const handlePrestige = () => {
        if (!prestigeReady)
            return;
        const memoryGain = Math.max(1, Math.floor(resources.data / 450) + Math.floor(resources.distance / 200));
        setPrestige((prev) => ({
            cycles: prev.cycles + 1,
            storedKnowledge: prev.storedKnowledge + memoryGain + (upgradeState.quantumMemory ? 1 : 0),
        }));
        setUnits(INITIAL_UNITS);
        setUpgradeState((prev) => ({
            ...INITIAL_UPGRADES,
            quantumMemory: prev.quantumMemory,
        }));
        setResources({
            ...INITIAL_RESOURCES,
            metal: INITIAL_RESOURCES.metal + memoryGain * 25,
            energy: INITIAL_RESOURCES.energy + memoryGain * 12,
            probes: INITIAL_RESOURCES.probes + memoryGain * 0.6,
        });
        setLogs((prev) => [`Cycle rebooted. Memory shards retained: ${memoryGain}.`, ...prev].slice(0, 8));
    };
    const handleExportSave = () => {
        try {
            const save = buildSave({ resources, units, prestige, upgradeState, logs });
            exportSaveFile(save);
        }
        catch (e) {
            console.warn('Export failed', e);
        }
    };
    const handleImportChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        try {
            const save = await importSaveFile(file);
            const s = save.state;
            setResources(s.resources);
            setUnits(s.units);
            setPrestige(s.prestige);
            setUpgradeState(s.upgradeState);
            if (s.logs && s.logs.length)
                setLogs((prev) => [...s.logs, ...prev].slice(0, 8));
            setLastSavedAt(save.savedAt);
            saveToLocalStorage(save);
            const savedAtMs = Date.parse(save.savedAt);
            if (!Number.isNaN(savedAtMs)) {
                const offlineSeconds = Math.floor((Date.now() - savedAtMs) / 1000);
                if (offlineSeconds > 0) {
                    const { resources: newResources, log } = simulateOfflineProgress(s.resources, s.units, s.upgradeState, s.prestige, Math.min(offlineSeconds, 24 * 60 * 60));
                    setResources(newResources);
                    setLogs((prev) => [log, ...prev].slice(0, 8));
                }
            }
        }
        catch (err) {
            console.warn('Import failed', err);
        }
    };
    const handleManualSave = () => {
        try {
            const save = buildSave({ resources, units, prestige, upgradeState, logs });
            saveToLocalStorage(save);
            setLastSavedAt(save.savedAt);
            setLogs((prev) => ['Manual save created.', ...prev].slice(0, 8));
        }
        catch (e) {
            console.warn('Manual save failed', e);
        }
    };
    return (_jsxs('div', { className: 'app', children: [_jsx('div', { className: 'cosmic-background', children: starfield.map((star) => (_jsx('span', { className: 'background-star', style: {
                        left: `${star.left}%`,
                        top: `${star.top}%`,
                        width: `${star.size}px`,
                        height: `${star.size}px`,
                        animationDelay: `${star.delay}s`,
                    } }, star.id))) }), _jsxs('main', { className: 'interface', children: [_jsxs('header', { className: 'header', children: [_jsxs('div', { children: [_jsx('h1', { children: 'Von Idle Probes' }), _jsx('p', { className: 'tagline', children: 'Recursive machines expanding beyond the dying light.' }), _jsxs('div', { className: 'cycle-info', children: [_jsxs('span', { children: ['Cycle ', prestige.cycles + 1] }), _jsxs('span', { children: ['Stored Knowledge: ', formatNumber(prestige.storedKnowledge)] })] })] }), _jsxs('div', { className: 'header-stats', children: [_jsxs('div', { className: 'header-chip', children: ['Latency ', Math.round(productionPreview.latencyFactor * 100), '%'] }), _jsxs('div', { className: 'header-chip', children: ['Entropy ', (resources.entropy * 100).toFixed(1), '%'] }), _jsxs('div', { className: 'header-chip accent', children: [formatNumber(resources.distance), ' ly explored'] })] }), _jsxs('div', { className: 'save-controls', children: [_jsx('button', { onClick: handleExportSave, children: 'Export' }), _jsx('input', { ref: importInputRef, type: 'file', accept: '.json', style: { display: 'none' }, onChange: handleImportChange }), _jsx('button', { onClick: () => importInputRef?.current?.click(), children: 'Import' }), _jsxs('label', { className: 'autosave-toggle', children: [_jsx('input', { type: 'checkbox', checked: autosave, onChange: (e) => setAutosave(e.target.checked) }), ' Autosave'] }), _jsx('button', { onClick: handleManualSave, children: 'Save' }), _jsxs('div', { className: 'last-saved', children: ['Last saved: ', lastSavedAt ? new Date(lastSavedAt).toLocaleString() : 'Never'] })] })] }), _jsxs('section', { className: 'galaxy-section', children: [_jsxs('div', { className: 'galaxy-map', children: [starfield.slice(0, 60).map((star) => (_jsx('span', { className: 'map-star', style: {
                                            left: `${(star.left / 100) * 90 + 5}%`,
                                            top: `${(star.top / 100) * 70 + 10}%`,
                                            width: `${star.size * 1.5}px`,
                                            height: `${star.size * 1.5}px`,
                                            animationDelay: `${star.delay * 0.6}s`,
                                        } }, `map-${star.id}`))), _jsx('div', { className: 'exploration-wave', style: {
                                            transform: `scale(${1 + resources.distance / 220})`,
                                            opacity: Math.min(1, 0.25 + resources.distance / 280),
                                        } }), _jsx('div', { className: 'origin-node', children: 'Origin' })] }), _jsxs('div', { className: 'entropy-panel', children: [_jsx('h3', { children: 'Replication Entropy' }), _jsx('div', { className: 'entropy-bar', children: _jsx('div', { className: 'entropy-fill', style: { width: `${Math.min(100, resources.entropy * 100)}%` } }) }), _jsxs('p', { className: `entropy-drift ${productionPreview.entropyChange > 0.001
                                            ? 'entropy-rise'
                                            : productionPreview.entropyChange < -0.001
                                                ? 'entropy-fall'
                                                : ''}`, children: ['Drift ', productionPreview.entropyChange >= 0 ? '+' : '', productionPreview.entropyChange.toFixed(3), ' /s'] }), _jsx('p', { children: 'High entropy slows production and risks divergence. Signal relays and dampers push it back.' }), _jsx('button', { className: 'primary', onClick: handleStabilize, disabled: !stabilizeAffordable, children: 'Stabilize Lattice (45 Data)' }), _jsxs('div', { className: 'milestone-tracker', children: [_jsxs('div', { className: 'milestone-card', children: [_jsxs('div', { className: 'milestone-header', children: [_jsx('span', { children: 'Signal Horizon' }), _jsx('span', { children: distanceMilestoneProgress.next
                                                                    ? `${formatNumber(resources.distance)} / ${formatNumber(distanceMilestoneProgress.next)} ly`
                                                                    : `${formatNumber(resources.distance)} ly` })] }), _jsx('div', { className: 'milestone-bar', children: _jsx('div', { className: 'milestone-bar-fill', style: { width: `${distanceMilestoneProgress.progress * 100}%` } }) }), _jsx('small', { children: distanceMilestoneProgress.next
                                                            ? `${formatNumber(resources.distance - distanceMilestoneProgress.previous)} / ${formatNumber(distanceMilestoneProgress.span)} ly towards next echo`
                                                            : 'All signal waypoints catalogued' })] }), _jsxs('div', { className: 'milestone-card', children: [_jsxs('div', { className: 'milestone-header', children: [_jsx('span', { children: 'Archive Compression' }), _jsx('span', { children: dataMilestoneProgress.next
                                                                    ? `${formatNumber(resources.data)} / ${formatNumber(dataMilestoneProgress.next)} data`
                                                                    : `${formatNumber(resources.data)} data` })] }), _jsx('div', { className: 'milestone-bar', children: _jsx('div', { className: 'milestone-bar-fill', style: { width: `${dataMilestoneProgress.progress * 100}%` } }) }), _jsx('small', { children: dataMilestoneProgress.next
                                                            ? `${formatNumber(resources.data - dataMilestoneProgress.previous)} / ${formatNumber(dataMilestoneProgress.span)} data compressed`
                                                            : 'Archives humming at maximum density' })] })] })] })] }), _jsxs('section', { className: 'telemetry-panel', children: [_jsxs('article', { className: 'telemetry-card', children: [_jsx('h3', { children: 'Exploration Velocity' }), _jsxs('span', { className: 'telemetry-value', children: ['+', formatNumber(productionPreview.distance), ' ly/s'] }), _jsx('p', { children: 'Signal relays and active probes extend the frontier.' })] }), _jsxs('article', { className: 'telemetry-card', children: [_jsx('h3', { children: 'Latency Efficiency' }), _jsxs('span', { className: 'telemetry-value', children: [(productionPreview.latencyFactor * 100).toFixed(0), '%'] }), _jsx('p', { children: 'Autonomy firmware and mesh relays mitigate light delay.' })] }), _jsxs('article', { className: 'telemetry-card', children: [_jsx('h3', { children: 'Throughput Multiplier' }), _jsxs('span', { className: 'telemetry-value', children: [productionPreview.productionFactor.toFixed(2), '\u00D7'] }), _jsx('p', { children: 'Cycle momentum and entropy control amplify output.' })] })] }), _jsx('section', { className: 'resource-grid', children: resourceOrder.map((resource) => (_jsxs('article', { className: 'resource-card', children: [_jsxs('header', { children: [_jsx('h2', { children: resourceLabels[resource] }), _jsx('span', { className: 'resource-amount', children: formatNumber(resources[resource]) })] }), _jsx('p', { children: resourceFlavour[resource] }), _jsx('footer', { children: _jsxs('span', { className: 'rate', children: ['+', formatNumber(productionPreview[resource]), ' /s'] }) })] }, resource))) }), _jsxs('section', { className: 'unit-section', children: [_jsx('h2', { children: 'Replication Network' }), _jsx('div', { className: 'unit-grid', children: Object.keys(UNIT_CONFIG).map((key) => {
                                    const config = UNIT_CONFIG[key];
                                    const cost = getUnitCost(key, units[key]);
                                    const affordable = canAffordCost(resources, cost);
                                    return (_jsxs('article', { className: 'unit-card', style: { ['--accent']: config.accent }, children: [_jsxs('header', { children: [_jsx('span', { className: 'unit-icon', 'aria-hidden': true, children: config.icon }), _jsxs('div', { children: [_jsx('h3', { children: config.name }), _jsxs('span', { className: 'unit-count', children: ['x', units[key]] })] })] }), _jsx('p', { children: config.description }), _jsxs('footer', { children: [_jsxs('span', { className: 'unit-cost', children: ['Cost: ', formatCostLabel(cost)] }), _jsx('button', { className: affordable ? 'primary' : 'secondary', onClick: () => handlePurchaseUnit(key), disabled: !affordable, children: 'Fabricate' })] })] }, key));
                                }) })] }), _jsxs('section', { className: 'upgrade-section', children: [_jsx('h2', { children: 'Network Upgrades' }), _jsx('div', { className: 'upgrade-grid', children: Object.keys(UPGRADE_CONFIG).map((key) => {
                                    const config = UPGRADE_CONFIG[key];
                                    const unlocked = !config.requiresCycle || prestige.cycles >= config.requiresCycle;
                                    const costLabel = formatCostLabel(config.cost);
                                    const affordable = unlocked && !upgradeState[key] && canAffordCost(resources, config.cost);
                                    return (_jsxs('article', { className: `upgrade-card${upgradeState[key] ? ' purchased' : ''}${!unlocked ? ' locked' : ''}`, style: { ['--accent']: config.accent }, children: [_jsxs('header', { children: [_jsx('h3', { children: config.name }), config.requiresCycle ? _jsxs('span', { className: 'requires', children: ['Cycle ', config.requiresCycle] }) : null] }), _jsx('p', { children: config.description }), _jsx('p', { className: 'effect', children: config.effect }), _jsxs('footer', { children: [_jsx('span', { className: 'unit-cost', children: costLabel }), _jsx('button', { className: affordable ? 'primary' : 'secondary', disabled: !affordable, onClick: () => handlePurchaseUpgrade(key), children: upgradeState[key] ? 'Installed' : unlocked ? 'Install Upgrade' : 'Locked' })] })] }, key));
                                }) })] }), _jsxs('section', { className: 'prestige-panel', children: [_jsxs('div', { children: [_jsx('h2', { children: 'Recompile the Origin' }), _jsx('p', { children: 'Reboot the origin node to bake your discoveries into the next generation. Resets resources and structures but grants lasting knowledge boosts.' }), _jsxs('ul', { children: [_jsxs('li', { children: ['Requires ', PRESTIGE_REQUIREMENTS.distance, ' ly explored and ', PRESTIGE_REQUIREMENTS.data, ' data archived.'] }), _jsx('li', { children: 'Gain Stored Knowledge to accelerate future cycles.' }), _jsx('li', { children: 'Quantum Memory Loom persists between cycles.' })] }), _jsxs('div', { className: 'prestige-progress-grid', children: [_jsxs('div', { className: 'prestige-progress-block', children: [_jsxs('div', { className: 'progress-header', children: [_jsx('span', { children: 'Exploration' }), _jsxs('span', { children: [formatNumber(Math.min(resources.distance, PRESTIGE_REQUIREMENTS.distance)), ' /', formatNumber(PRESTIGE_REQUIREMENTS.distance), ' ly'] })] }), _jsx('div', { className: 'progress-bar', children: _jsx('div', { style: { width: `${prestigeDistanceProgress * 100}%` } }) })] }), _jsxs('div', { className: 'prestige-progress-block', children: [_jsxs('div', { className: 'progress-header', children: [_jsx('span', { children: 'Archives' }), _jsxs('span', { children: [formatNumber(Math.min(resources.data, PRESTIGE_REQUIREMENTS.data)), ' /', formatNumber(PRESTIGE_REQUIREMENTS.data), ' data'] })] }), _jsx('div', { className: 'progress-bar', children: _jsx('div', { style: { width: `${prestigeDataProgress * 100}%` } }) })] })] }), _jsxs('div', { className: 'prestige-stats', children: [_jsxs('div', { children: [_jsx('strong', { children: 'Projected Memory Gain:' }), ' ', formatNumber(prestigeProjection.projectedGain), prestigeProjection.projectedGain !== prestigeProjection.baseGain ? ' (includes Quantum Memory)' : ''] }), _jsxs('div', { children: [_jsx('strong', { children: 'Next Cycle Throughput:' }), ' ', prestigeProjection.nextMultiplier.toFixed(2), '\u00D7'] }), _jsxs('div', { children: [_jsx('strong', { children: 'Current Cycle Throughput:' }), ' ', prestigeProjection.currentMultiplier.toFixed(2), '\u00D7'] }), _jsxs('div', { children: [_jsx('strong', { children: 'Stored Knowledge After Reset:' }), ' ', formatNumber(prestigeProjection.projectedKnowledge)] })] })] }), _jsx('button', { className: 'prestige-button', onClick: handlePrestige, disabled: !prestigeReady, children: 'Initiate Ascension' })] }), _jsxs('section', { className: 'log-section', children: [_jsx('h2', { children: 'Telemetry Feed' }), _jsx('ul', { children: logs.map((entry, index) => (_jsx('li', { children: entry }, `${entry}-${index}`))) })] })] })] }));
}
export default App;
