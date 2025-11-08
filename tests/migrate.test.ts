import { describe, it, expect } from 'vitest'
import { migrate_v0_to_v1 } from '../src/game/save'
import { INITIAL_RESOURCES, INITIAL_UNITS } from '../src/game/config'

describe('migrate_v0_to_v1', () => {
  it('fills missing keys and preserves provided values', () => {
    const raw = {
      resources: { metal: 123.5 },
      units: { harvesters: 3 },
      prestige: { cycles: 2, storedKnowledge: 1 },
      upgradeState: { autonomy: true },
      logs: ['restored'],
    }

    const save = migrate_v0_to_v1(raw)
    expect(save.version).toBe(1)
    expect(save.state.resources.metal).toBe(123.5)
    expect(save.state.resources.energy).toBe(INITIAL_RESOURCES.energy)
    expect(save.state.units.harvesters).toBe(3)
    expect(save.state.units.foundries).toBe(INITIAL_UNITS.foundries)
    expect(save.state.prestige.cycles).toBe(2)
    expect(save.state.upgradeState.autonomy).toBe(true)
    expect(save.state.logs).toEqual(['restored'])
  })
})
