import { describe, expect, it } from 'vitest'
import { computeCausticsMask } from '@/water/shaders/caustics'

describe('computeCausticsMask', () => {
  it('returns zero when intensity is zero', () => {
    expect(computeCausticsMask(0.2, 0.25, 0, 0.75, 0.18)).toBe(0)
  })

  it('gets brighter when intensity increases for the same samples', () => {
    const softer = computeCausticsMask(0.18, 0.24, 0.35, 0.75, 0.18)
    const brighter = computeCausticsMask(0.18, 0.24, 0.9, 0.75, 0.18)

    expect(brighter).toBeGreaterThan(softer)
  })

  it('stays inside the displayable range', () => {
    const mask = computeCausticsMask(0.02, 0.04, 1.4, 0.92, 0.28)

    expect(mask).toBeGreaterThanOrEqual(0)
    expect(mask).toBeLessThanOrEqual(1)
  })
})
