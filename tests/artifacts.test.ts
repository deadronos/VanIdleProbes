import { describe, it, expect } from 'vitest';
import { computeProduction } from '../src/game/engine';
import { INITIAL_RESOURCES, INITIAL_UNITS, INITIAL_UPGRADES, INITIAL_PRESTIGE } from '../src/game/config';

describe('Artifact Bonuses', () => {
  it('Dense Matter artifact increases metal production by 10%', () => {
    const resources = { ...INITIAL_RESOURCES, entropy: 0, distance: 0, probes: 0 };
    const units = { ...INITIAL_UNITS, harvesters: 1 };
    const upgrades = { ...INITIAL_UPGRADES };
    const prestige = { ...INITIAL_PRESTIGE };

    // Calculate base production without artifacts
    const baseProd = computeProduction(resources, units, upgrades, prestige, []);

    // Calculate with Dense Matter
    const boostedProd = computeProduction(resources, units, upgrades, prestige, ['neutronStar']);

    expect(boostedProd.metal).toBeCloseTo(baseProd.metal * 1.10, 4);
    // Ensure other resources are unaffected
    expect(boostedProd.energy).toBeCloseTo(baseProd.energy, 4);
  });

  it('Zero-Point Siphon increases energy production by 10%', () => {
    const resources = { ...INITIAL_RESOURCES };
    const units = { ...INITIAL_UNITS, foundries: 1 }; // need energy production
    const upgrades = { ...INITIAL_UPGRADES };
    const prestige = { ...INITIAL_PRESTIGE };

    const baseProd = computeProduction(resources, units, upgrades, prestige, []);
    const boostedProd = computeProduction(resources, units, upgrades, prestige, ['voidCloud']);

    expect(boostedProd.energy).toBeCloseTo(baseProd.energy * 1.10, 4);
  });

  it('Xeno-Code increases data production by 15%', () => {
    const resources = { ...INITIAL_RESOURCES };
    const units = { ...INITIAL_UNITS, archives: 1 }; // need data production
    const upgrades = { ...INITIAL_UPGRADES };
    const prestige = { ...INITIAL_PRESTIGE };

    const baseProd = computeProduction(resources, units, upgrades, prestige, []);
    const boostedProd = computeProduction(resources, units, upgrades, prestige, ['alienDerelict']);

    expect(boostedProd.data).toBeCloseTo(baseProd.data * 1.15, 4);
  });

  it('Spacetime Fold increases distance speed by 20%', () => {
     const resources = { ...INITIAL_RESOURCES, probes: 100 };
    const units = { ...INITIAL_UNITS };
    const upgrades = { ...INITIAL_UPGRADES };
    const prestige = { ...INITIAL_PRESTIGE };

    const baseProd = computeProduction(resources, units, upgrades, prestige, []);
    const boostedProd = computeProduction(resources, units, upgrades, prestige, ['wormholeRemnant']);

    expect(boostedProd.distance).toBeCloseTo(baseProd.distance * 1.20, 4);
  });

  it('Multiple artifacts stack correctly', () => {
     const resources = { ...INITIAL_RESOURCES, probes: 100 };
    const units = { ...INITIAL_UNITS, harvesters: 1, foundries: 1 };
    const upgrades = { ...INITIAL_UPGRADES };
    const prestige = { ...INITIAL_PRESTIGE };

    const baseProd = computeProduction(resources, units, upgrades, prestige, []);
    const boostedProd = computeProduction(resources, units, upgrades, prestige, ['neutronStar', 'voidCloud']);

    expect(boostedProd.metal).toBeCloseTo(baseProd.metal * 1.10, 4);
    expect(boostedProd.energy).toBeCloseTo(baseProd.energy * 1.10, 4);
  });
});
