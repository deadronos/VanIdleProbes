import { describe, expect, it } from 'vitest';
import { calculateBulkUnitPurchase } from '../src/util/game-logic';
import { computeProduction } from '../src/game/engine';
import {
  INITIAL_PRESTIGE,
  INITIAL_RESOURCES,
  INITIAL_UNITS,
  INITIAL_UPGRADES,
} from '../src/game/config';

describe('bulk unit purchasing', () => {
  it('buys only the units that remain affordable and reports the total sequential cost', () => {
    const resources = {
      ...INITIAL_RESOURCES,
      metal: 100,
      energy: 0,
      data: 0,
      probes: 0,
    };

    const preview = calculateBulkUnitPurchase(resources, 'harvesters', 2, 10);

    expect(preview.purchased).toBe(2);
    expect(preview.nextOwned).toBe(4);
    expect(preview.totalCost.metal).toBeCloseTo(81.59391, 5);
    expect(preview.remainingResources.metal).toBeCloseTo(18.40609, 5);
  });
});

describe('computeProduction multipliers', () => {
  it('exposes the expected upgrade multipliers in the production snapshot', () => {
    const resources = { ...INITIAL_RESOURCES, entropy: 0, distance: 0, probes: 0 };
    const units = { ...INITIAL_UNITS };
    const upgrades = {
      ...INITIAL_UPGRADES,
      autoforge: true,
      dysonSheath: true,
      archiveBloom: true,
      stellarCartography: true,
    };
    const prestige = { ...INITIAL_PRESTIGE };

    const production = computeProduction(resources, units, upgrades, prestige);

    expect(production.multipliers.upgrades.energy).toBeCloseTo(1.4, 5);
    expect(production.multipliers.upgrades.probes).toBeCloseTo(1.5, 5);
    expect(production.multipliers.upgrades.data).toBeCloseTo(1.6, 5);
    expect(production.multipliers.upgrades.distance).toBeCloseTo(1.14, 5);
  });
});
