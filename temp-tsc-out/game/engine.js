const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const computeProduction = (resources, units, upgrades, prestige) => {
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
export function simulateOfflineProgress(resources, units, upgrades, prestige, offlineSeconds, stepSec) {
    let seconds = Math.floor(offlineSeconds);
    const MAX = 24 * 60 * 60;
    if (isNaN(seconds) || seconds <= 0) {
        return { resources, log: 'No offline time to apply.' };
    }
    if (seconds > MAX)
        seconds = MAX;
    const defaultStep = Math.ceil(seconds / 120);
    const step = clamp(stepSec ?? defaultStep, 10, 60);
    const steps = Math.ceil(seconds / step);
    const before = { ...resources };
    for (let i = 0; i < steps; i++) {
        const remaining = seconds - i * step;
        const thisStep = Math.min(step, remaining);
        const prod = computeProduction(resources, units, upgrades, prestige);
        resources = {
            metal: resources.metal + prod.metal * thisStep,
            energy: resources.energy + prod.energy * thisStep,
            data: resources.data + prod.data * thisStep,
            probes: resources.probes + prod.probes * thisStep,
            entropy: clamp(resources.entropy + prod.entropyChange * thisStep, 0, 0.88),
            distance: resources.distance + prod.distance * thisStep,
        };
    }
    const recoveredMetal = resources.metal - before.metal;
    const recoveredEnergy = resources.energy - before.energy;
    const recoveredData = resources.data - before.data;
    const recoveredProbes = resources.probes - before.probes;
    const fmt = (n) => {
        if (n >= 1_000_000_000)
            return `${(n / 1_000_000_000).toFixed(2)}b`;
        if (n >= 1_000_000)
            return `${(n / 1_000_000).toFixed(2)}m`;
        if (n >= 1_000)
            return `${(n / 1_000).toFixed(2)}k`;
        if (n >= 100)
            return n.toFixed(1);
        return n.toFixed(2);
    };
    const hh = Math.floor(seconds / 3600);
    const mm = Math.floor((seconds % 3600) / 60);
    const ss = seconds % 60;
    const timeLabel = `${hh}h ${mm}m ${ss}s`;
    const log = `Recovered ${fmt(recoveredMetal)} metal, ${fmt(recoveredEnergy)} energy, ${fmt(recoveredData)} data, ${fmt(recoveredProbes)} probes over ${timeLabel}.`;
    return { resources, log };
}
