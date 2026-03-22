import { ResourceKey, ResourceState, Cost, UnitKey, UNIT_CONFIG } from '../game/config';

/**
 * Checks if the player has enough resources to afford a given cost.
 */
export const canAffordCost = (resources: ResourceState, cost: Cost) =>
  (Object.entries(cost) as [ResourceKey, number][]).every(([key, value]) =>
    value ? resources[key] >= value : true,
  );

/**
 * Deducts the specified cost from the resource state.
 */
export const applyCost = (resources: ResourceState, cost: Cost) => {
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
 */
export const getUnitCost = (key: UnitKey, owned: number) => {
  const config = UNIT_CONFIG[key];
  const multiplier = Math.pow(config.costGrowth, owned);
  return Object.fromEntries(
    Object.entries(config.baseCost).map(([resource, value]) => [resource, value * multiplier]),
  ) as Cost;
};

export interface MilestoneProgress {
  previous: number
  next?: number
  progress: number
  span: number
}

/**
 * Calculates progress towards the next milestone in a sorted list.
 */
export const getMilestoneProgress = (value: number, milestones: number[]): MilestoneProgress => {
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
