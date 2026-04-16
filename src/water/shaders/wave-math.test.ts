import { describe, it, expect } from 'vitest'
import { depthFog, fbmElevation, fresnel } from '@/water/shaders/wave-math'

describe('fbmElevation', () => {
  it('returns zero at origin with zero amplitude', () => {
    expect(fbmElevation(0, 0, 0, 1, 0.5, 2, 0, 0.4, 8)).toBe(0)
  })

  it('scales with amplitude', () => {
    const low = fbmElevation(1, 1, 0, 1, 0.5, 2, 0.01, 0.4, 4)
    const high = fbmElevation(1, 1, 0, 1, 0.5, 2, 0.1, 0.4, 4)
    expect(Math.abs(high)).toBeGreaterThan(Math.abs(low))
  })

  it('changes with time (waves move)', () => {
    const t0 = fbmElevation(1, 1, 0, 1, 0.5, 2, 0.01, 0.4, 4)
    const t1 = fbmElevation(1, 1, 5, 1, 0.5, 2, 0.01, 0.4, 4)
    expect(t0).not.toBe(t1)
  })
})

describe('fresnel', () => {
  it('returns zero when looking straight at the surface', () => {
    expect(fresnel(1.0, 1.0, 2.0)).toBe(0)
  })

  it('returns scale when looking at grazing angle', () => {
    expect(fresnel(0.0, 0.8, 2.0)).toBe(0.8)
  })

  it('increases as angle becomes more shallow', () => {
    const steep = fresnel(0.8, 1.0, 2.0)
    const shallow = fresnel(0.2, 1.0, 2.0)
    expect(shallow).toBeGreaterThan(steep)
  })
})

describe('depthFog', () => {
  it('returns zero at zero depth', () => {
    expect(depthFog(0, 1)).toBe(0)
  })

  it('returns one at max depth', () => {
    expect(depthFog(1, 1)).toBe(1)
  })

  it('clamps to one beyond max depth', () => {
    expect(depthFog(5, 1)).toBe(1)
  })

  it('returns 0.5 at half depth', () => {
    expect(depthFog(0.5, 1)).toBe(0.5)
  })
})
