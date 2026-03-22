import { ResourceKey } from '../game/config';

/**
 * Formats a number with standard suffixes (k, m, b) for display.
 * @param value The number to format.
 * @returns A formatted string.
 */
export const formatNumber = (value: number) => {
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

export const resourceLabels: Record<ResourceKey, string> = {
  metal: 'Alloy Mass',
  energy: 'Stellar Energy',
  probes: 'Active Probes',
  data: 'Archived Data',
};

/**
 * Formats a cost object into a readable string string for UI buttons.
 * @param cost Any object with resource keys and numeric values.
 * @returns A string like "Metal 100 • Energy 50".
 */
export const formatCostLabel = (cost: Record<string, number | undefined>) =>
  (Object.entries(cost) as [ResourceKey, number][])
    .filter(([, value]) => value && value > 0)
    .map(([resource, value]) => `${resourceLabels[resource as ResourceKey] || resource} ${formatNumber(value)}`)
    .join(' • ');
