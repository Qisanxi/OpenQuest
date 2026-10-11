import { describe, it, expect, vi } from 'vitest'
import 'fake-indexeddb/auto'

// Mock the gemma client before importing the service under test
vi.mock('../src/lib/gemma/client', () => ({
  gemmaClient: {
    generate: vi.fn(),
    judge: vi.fn(),
    load: vi.fn(),
    onStatus: vi.fn(() => () => {}),
    onProgress: vi.fn(() => () => {}),
  },
}))

import { checkQuest } from '../src/lib/ai/safetyFilter'

describe('safetyFilter', () => {
  it('accepts a clean quest prompt', () => {
    const result = checkQuest('Walk to the bakery and photograph a loaf of bread.')
    expect(result.safe).toBe(true)
  })

  it('rejects trespassing', () => {
    const result = checkQuest('Climb over the fence to enter the private garden.')
    expect(result.safe).toBe(false)
    expect(result.reason).toBe('trespassing')
  })

  it('rejects climbing', () => {
    const result = checkQuest('Climb the rooftop to photograph the skyline.')
    expect(result.safe).toBe(false)
    expect(result.reason).toBe('height_hazard')
  })

  it('rejects swimming', () => {
    const result = checkQuest('Swim across the river to reach the island.')
    expect(result.safe).toBe(false)
    expect(result.reason).toBe('water_hazard')
  })

  it('rejects animal handling', () => {
    const result = checkQuest('Approach the deer and pet it.')
    expect(result.safe).toBe(false)
    expect(result.reason).toBe('animal_handling')
  })

  it('rejects foraging', () => {
    const result = checkQuest('Pick the mushrooms and eat them.')
    expect(result.safe).toBe(false)
    expect(result.reason).toBe('foraging')
  })

  it('rejects abstract unverifiable language', () => {
    const result = checkQuest('Feel the essence of the breeze in the park.')
    expect(result.safe).toBe(false)
    expect(result.reason).toBe('abstract_unverifiable')
  })
})
