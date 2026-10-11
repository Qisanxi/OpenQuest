import { describe, it, expect } from 'vitest'
import { haversine, isWithinRadius, bearing, compassDirection, estimatedWalkMinutes } from '../../src/lib/geo/distance'

describe('geo/distance', () => {
  it('haversine NYC -> Boston is roughly 306 km', () => {
    const d = haversine(40.7128, -74.006, 42.3601, -71.0589)
    expect(d).toBeGreaterThan(305_000)
    expect(d).toBeLessThan(310_000)
  })

  it('haversine of identical points is 0', () => {
    expect(haversine(40, -74, 40, -74)).toBe(0)
  })

  it('isWithinRadius returns true for close points', () => {
    expect(isWithinRadius(40.7128, -74.006, 40.7130, -74.0065, 200)).toBe(true)
  })

  it('isWithinRadius returns false for far points', () => {
    expect(isWithinRadius(40.7128, -74.006, 40.7200, -74.0200, 200)).toBe(false)
  })

  it('bearing from NYC to Boston is roughly NE', () => {
    const b = bearing(40.7128, -74.006, 42.3601, -71.0589)
    expect(b).toBeGreaterThan(40)
    expect(b).toBeLessThan(60)
  })

  it('compassDirection returns correct octant', () => {
    expect(compassDirection(0)).toBe('N')
    expect(compassDirection(90)).toBe('E')
    expect(compassDirection(180)).toBe('S')
    expect(compassDirection(270)).toBe('W')
    expect(compassDirection(45)).toBe('NE')
  })

  it('estimatedWalkMinutes returns at least 2 min overhead', () => {
    expect(estimatedWalkMinutes(40.7128, -74.006, 40.7128, -74.006)).toBeGreaterThanOrEqual(2)
  })
})
