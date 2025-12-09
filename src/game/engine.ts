import type { ResourceState, UnitKey, PrestigeState, UpgradeKey, UpgradeState } from './config';

export type { UnitKey, PrestigeState, UpgradeKey, UpgradeState };

/**
 * A snapshot of the production rates and multipliers for a single tick.
 */
export type ProductionSnapshot = {
  /** Metal production per second. */
  metal: number
  /** Energy production per second. */
  energy: number
  /** Data production per second. */
  data: number
  /** Probe production per second. */
  probes: number
  /** Distance exploration rate per second. */
  distance: number
  /** Rate of change for entropy per second. */
  entropyChange: number
  /** The current efficiency multiplier due to distance latency (0.0 - 1.0). */
  latencyFactor: number
  /** The aggregate production multiplier affecting all outputs. */
  productionFactor: number
}

/**
 * Clamps a number between a lower and upper bound.
 *
 * @param v - The value to clamp.
 * @param lo - The lower bound.
 * @param hi - The upper bound.
 * @returns The clamped value.
 */
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Calculates the production rates for all resources based on the current game state.
 *
 * @param resources - Current resource amounts (affects some dynamic rates like entropy).
 * @param units - Counts of owned units.
 * @param upgrades - State of purchased upgrades.
 * @param prestige - Current prestige level and bonuses.
 * @returns A snapshot of production rates and efficiency factors.
 */
export const computeProduction = (
  resources: ResourceState,
  units: Record<UnitKey, number>,
  upgrades: UpgradeState,
  prestige: PrestigeState,
): ProductionSnapshot => {
  const normalizedPrestige: PrestigeState = {
    cycles: prestige.cycles ?? 0,
    storedKnowledge: prestige.storedKnowledge ?? 0,
    forks: prestige.forks ?? 0,
    primeArchives: prestige.primeArchives ?? 0,
  };

  const resonanceBoost = 1 + normalizedPrestige.forks * 0.35 + normalizedPrestige.primeArchives * 0.22;
  const cycleBoost =
    (1 + normalizedPrestige.cycles * 0.55 + normalizedPrestige.storedKnowledge * 0.15) * resonanceBoost;
  const signalBonus = 1 + units.signalRelays * 0.22 + (upgrades.autonomy ? 0.42 : 0);
  const baseLatencyFactor =
    1 / (1 + Math.max(0, resources.distance - signalBonus * 105) / (210 + signalBonus * 90));
  const latencyFactor =
    upgrades.autonomy && baseLatencyFactor < 1
      ? baseLatencyFactor + (1 - baseLatencyFactor) * 0.25
      : baseLatencyFactor;
  const entropyPressureBase = 0.01 + resources.distance / 9200;
  const entropyDamping = Math.max(0.65, 1 - normalizedPrestige.primeArchives * 0.06);
  const entropyPressure =
    upgrades.stellarCartography || normalizedPrestige.primeArchives > 0
      ? entropyPressureBase * Math.min(1, 0.82 * entropyDamping)
      : entropyPressureBase * entropyDamping;
  const entropyMitigation = units.stabilizers * 0.022 + (upgrades.stellarCartography ? 0.012 : 0);
  const entropyChange = entropyPressure - entropyMitigation;
  const entropyPenalty = Math.max(
    0.28,
    1 - Math.min(0.82, resources.entropy) * (upgrades.quantumMemory ? 0.55 : 0.7),
  );
  const delayCompensation = upgrades.autonomy && baseLatencyFactor < 0.999 ? 1.2 : 1;
  const productionFactor = cycleBoost * latencyFactor * entropyPenalty * delayCompensation;
  const energyMultiplier = upgrades.dysonSheath ? 1.42 : 1;
  const probeMultiplier = upgrades.autoforge ? 1.5 : 1;
  const dataMultiplier = (upgrades.archiveBloom ? 1.62 : 1) * (1 + normalizedPrestige.primeArchives * 0.05);
  const cartographyExplorationBonus = (upgrades.stellarCartography ? 1.14 : 1) * (1 + normalizedPrestige.forks * 0.04);

  const metal = (5.5 + units.harvesters * 11 + units.foundries * 2) * productionFactor;
  const energy = (units.foundries * 7.2 * energyMultiplier + units.harvesters * 1.8) * productionFactor;
  const probes = (units.fabricators * 1.05 * probeMultiplier + resources.probes * 0.015) * productionFactor;
  const data =
    (units.archives * 1.7 * dataMultiplier + Math.max(0, resources.distance - 32) * 0.022 + 0.1) *
    productionFactor;
  const distance =
    (resources.probes * (0.1 + units.signalRelays * 0.0043 + (upgrades.autonomy ? 0.026 : 0)) +
      units.fabricators * 0.017 +
      units.archives * 0.005) *
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

/**
 * Simulates game progress over a period of offline time.
 * Calculates resource gains and returns a log message summarizing the results.
 *
 * @param resources - Resource state at the start of the offline period.
 * @param units - Owned units.
 * @param upgrades - Owned upgrades.
 * @param prestige - Prestige state.
 * @param offlineSeconds - Total seconds of offline time to simulate.
 * @param stepSec - Optional simulation step size in seconds (default is dynamic).
 * @returns An object containing the new resource state and a log string.
 */
export function simulateOfflineProgress(
  resources: ResourceState,
  units: Record<UnitKey, number>,
  upgrades: UpgradeState,
  prestige: PrestigeState,
  offlineSeconds: number,
  stepSec?: number,
): { resources: ResourceState; log: string } {
  let seconds = Math.floor(offlineSeconds);
  const MAX = 24 * 60 * 60;
  if (isNaN(seconds) || seconds <= 0) {
    return { resources, log: 'No offline time to apply.' };
  }
  if (seconds > MAX) seconds = MAX;

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

  const fmt = (n: number) => {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}b`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}m`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(2)}k`;
    if (n >= 100) return n.toFixed(1);
    return n.toFixed(2);
  };

  const hh = Math.floor(seconds / 3600);
  const mm = Math.floor((seconds % 3600) / 60);
  const ss = seconds % 60;
  const timeLabel = `${hh}h ${mm}m ${ss}s`;

  const log = `Recovered ${fmt(recoveredMetal)} metal, ${fmt(recoveredEnergy)} energy, ${fmt(
    recoveredData,
  )} data, ${fmt(recoveredProbes)} probes over ${timeLabel}.`;

  return { resources, log };
}
