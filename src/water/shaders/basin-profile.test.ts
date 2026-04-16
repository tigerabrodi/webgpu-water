import { describe, expect, it } from 'vitest'
import {
  computeBasinFactors,
  computeGroundHeight,
  computeWaterThickness,
} from '@/water/shaders/basin-profile'

describe('computeBasinFactors', () => {
  it('keeps basin weights inside the expected range', () => {
    const profile = computeBasinFactors(1.4, -0.8)

    expect(profile.coreFactor).toBeGreaterThanOrEqual(0)
    expect(profile.coreFactor).toBeLessThanOrEqual(1)
    expect(profile.slopeFactor).toBeGreaterThanOrEqual(0)
    expect(profile.slopeFactor).toBeLessThanOrEqual(1)
  })

  it('is deeper in the center than near the outer shelf', () => {
    const center = computeBasinFactors(0, 0)
    const edge = computeBasinFactors(8.2, 0)

    expect(center.coreFactor).toBeGreaterThan(edge.coreFactor)
    expect(center.slopeFactor).toBeGreaterThan(edge.slopeFactor)
  })
})

describe('computeGroundHeight', () => {
  it('pushes the basin floor lower in the center', () => {
    const center = computeGroundHeight(0, 0)
    const edge = computeGroundHeight(8.2, 0)

    expect(center).toBeLessThan(edge)
  })
})

describe('computeWaterThickness', () => {
  it('returns thicker water over the basin center for the same surface height', () => {
    const centerThickness = computeWaterThickness(0, 0, 0.02)
    const edgeThickness = computeWaterThickness(8.2, 0, 0.02)

    expect(centerThickness).toBeGreaterThan(edgeThickness)
  })

  it('clamps thickness to zero when the water falls under the floor', () => {
    expect(computeWaterThickness(0, 0, -1)).toBe(0)
  })
})
