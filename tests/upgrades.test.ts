import { describe, it, expect } from 'vitest';
import { computeProduction } from '../src/game/engine';
import { INITIAL_RESOURCES, INITIAL_UNITS, INITIAL_UPGRADES, INITIAL_PRESTIGE } from '../src/game/config';

describe('Upgrade Effects', () => {
  it('Autoforge upgrade applies correct 50% multiplier', () => {
    const resources = { ...INITIAL_RESOURCES, entropy: 0, distance: 0, probes: 0 };
    const units = { ...INITIAL_UNITS, fabricators: 1 };
    const upgrades = { ...INITIAL_UPGRADES, autoforge: true };
    const prestige = { ...INITIAL_PRESTIGE };

    const production = computeProduction(resources, units, upgrades, prestige);

    // Expected calculation:
    // Base fabricator production: 1.05
    // Multiplier: 1.5 (50% increase)
    // Production Factor: 1 (due to 0 entropy, 0 distance, 0 prestige)
    // Total: 1 * 1.05 * 1.5 = 1.575
    const expected = 1 * 1.05 * 1.5;

    expect(production.probes).toBeCloseTo(expected, 4);
  });
});
