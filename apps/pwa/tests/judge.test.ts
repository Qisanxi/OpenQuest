import { describe, it, expect } from 'vitest'
import { repairJson } from '../src/lib/ai/jsonRepair'
import { checkQuest } from '../src/lib/ai/safetyFilter'

describe('jsonRepair', () => {
  it('strips markdown fences', () => {
    expect(repairJson('```json\n{"a":1}\n```')).toBe('{"a":1}')
  })

  it('quotes unquoted keys', () => {
    expect(repairJson('{name: "foo"}')).toBe('{"name": "foo"}')
  })

  it('replaces single quotes', () => {
    expect(repairJson("{'key': 'val'}")).toBe('{"key": "val"}')
  })

  it('removes trailing commas', () => {
    expect(repairJson('{"a":1,}')).toBe('{"a":1}')
    expect(repairJson('[1,2,3,]')).toBe('[1,2,3]')
  })

  it('appends missing closing braces', () => {
    expect(repairJson('{"a":1')).toBe('{"a":1}')
  })

  it('appends multiple missing closers', () => {
    expect(repairJson('{"a":[1,2')).toBe('{"a":[1,2]}')
  })
})

describe('safetyFilter', () => {
  it('passes clean quest', () => {
    expect(checkQuest('Walk to the bakery and photograph a loaf of bread.').safe).toBe(true)
  })

  it('fails trespassing', () => {
    expect(checkQuest('Climb over the fence.').safe).toBe(false)
  })

  it('fails foraging', () => {
    expect(checkQuest('Pick and eat the mushrooms.').safe).toBe(false)
  })

  it('fails abstract', () => {
    expect(checkQuest('Feel the essence of autumn.').safe).toBe(false)
  })
})
