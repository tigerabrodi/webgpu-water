import { describe, expect, it } from 'vitest'
import {
  computeOpticalDepth,
  computeScreenSpaceThickness,
  computeTransmissionVisibility,
} from '@/water/shaders/transmission'

describe('computeScreenSpaceThickness', () => {
  it('returns positive thickness when the scene lies behind the water surface', () => {
    expect(computeScreenSpaceThickness(-1.2, -2.4, 4)).toBeCloseTo(1.2, 6)
  })

  it('clamps to zero when the sampled scene is in front of the water', () => {
    expect(computeScreenSpaceThickness(-2.4, -1.2, 4)).toBe(0)
  })

  it('respects the max thickness clamp', () => {
    expect(computeScreenSpaceThickness(-0.4, -20, 2.5)).toBe(2.5)
  })
})

describe('computeOpticalDepth', () => {
  it('grows with thickness', () => {
    const shallow = computeOpticalDepth(0.1, 0.2)
    const deep = computeOpticalDepth(1.2, 0.2)

    expect(deep).toBeGreaterThan(shallow)
  })
})

describe('computeTransmissionVisibility', () => {
  it('stays stronger in shallow water than in deep water', () => {
    const shallow = computeTransmissionVisibility(0.15, 0.85, 0.6, 0.22)
    const deep = computeTransmissionVisibility(1.2, 0.85, 0.6, 0.22)

    expect(shallow).toBeGreaterThan(deep)
  })

  it('drops to zero when clarity is zero', () => {
    expect(computeTransmissionVisibility(0.2, 0, 0.8, 0.2)).toBe(0)
  })

  it('stays present in shallow water even at grazing angles', () => {
    expect(
      computeTransmissionVisibility(0.16, 0.85, 0.2, 0.36)
    ).toBeGreaterThan(0.12)
  })

  it('drops when reflection becomes dominant', () => {
    const lowReflection = computeTransmissionVisibility(0.16, 0.85, 0.45, 0.12)
    const highReflection = computeTransmissionVisibility(0.16, 0.85, 0.45, 0.92)

    expect(lowReflection).toBeGreaterThan(highReflection)
  })
})
