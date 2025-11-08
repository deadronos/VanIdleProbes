import { describe, it, expect } from 'vitest'
import { simulateOfflineProgress } from '../src/game/engine'
import { INITIAL_RESOURCES, INITIAL_UNITS, INITIAL_UPGRADES } from '../src/game/config'

describe('simulateOfflineProgress', () => {
  it('applies short offline time (10s) and increases resources', () => {
    const resources = { ...INITIAL_RESOURCES }
    const units = { ...INITIAL_UNITS }
    const upgrades = { ...INITIAL_UPGRADES }
    const prestige = { cycles: 0, storedKnowledge: 0 }

    const { resources: newResources, log } = simulateOfflineProgress(resources, units, upgrades, prestige, 10, 10)
    expect(newResources.metal).toBeGreaterThan(resources.metal)
    expect(newResources.energy).toBeGreaterThanOrEqual(resources.energy)
    expect(newResources.data).toBeGreaterThanOrEqual(resources.data)
    expect(typeof log).toBe('string')
  })

  it('caps offline application to 24 hours and clamps entropy', () => {
    const resources = { ...INITIAL_RESOURCES, entropy: 0.5 }
    const units = { ...INITIAL_UNITS }
    const upgrades = { ...INITIAL_UPGRADES }
    const prestige = { cycles: 0, storedKnowledge: 0 }

    const hugeSeconds = 10_000_000
    const { resources: newResources } = simulateOfflineProgress(resources, units, upgrades, prestige, hugeSeconds)
    // capped to 24h => should return finite numbers and entropy must be within [0, 0.88]
    expect(Number.isFinite(newResources.metal)).toBe(true)
    expect(newResources.entropy).toBeGreaterThanOrEqual(0)
    expect(newResources.entropy).toBeLessThanOrEqual(0.88)
  })
})
