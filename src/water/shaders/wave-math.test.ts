import { describe, expect, it } from 'vitest'
import {
  computeCompressionJacobian,
  computeFoamIntensity,
  depthFog,
  fbmElevation,
  fresnel,
  sampleDirectionalWaves,
  sampleWaveDisplacement,
  sampleWaveNormal,
  type WaveDisplacement,
} from '@/water/shaders/wave-math'

function createDisplacement(x: number, y: number, z: number): WaveDisplacement {
  return { x, y, z }
}

function displacementDistance(
  left: WaveDisplacement,
  right: WaveDisplacement
): number {
  return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z)
}

function displacementEnergy(displacement: WaveDisplacement): number {
  return (
    Math.abs(displacement.x) +
    Math.abs(displacement.y) +
    Math.abs(displacement.z)
  )
}

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

describe('sampleWaveDisplacement', () => {
  it('has no horizontal drag when choppiness is zero', () => {
    const displacement = sampleWaveDisplacement(
      0.35,
      -0.4,
      1.2,
      1.1,
      0.45,
      2.1,
      0.02,
      0.3,
      0,
      6
    )

    expect(displacement.x).toBeCloseTo(0, 6)
    expect(displacement.z).toBeCloseTo(0, 6)
  })

  it('adds horizontal drag when choppiness is enabled', () => {
    const calm = sampleWaveDisplacement(
      0.35,
      -0.4,
      1.2,
      1.1,
      0.45,
      2.1,
      0.02,
      0.3,
      0,
      6
    )
    const choppy = sampleWaveDisplacement(
      0.35,
      -0.4,
      1.2,
      1.1,
      0.45,
      2.1,
      0.02,
      0.3,
      0.08,
      6
    )

    expect(Math.abs(choppy.x) + Math.abs(choppy.z)).toBeGreaterThan(
      Math.abs(calm.x) + Math.abs(calm.z)
    )
  })

  it('keeps more octave energy when persistence is higher', () => {
    const samplePoints: Array<[number, number]> = [
      [0.35, -0.4],
      [0.72, 0.18],
      [-0.62, 0.31],
      [1.14, -0.57],
    ]
    const lowEnergy = samplePoints.reduce((energy, [x, z]) => {
      return (
        energy +
        displacementEnergy(
          sampleWaveDisplacement(x, z, 1.2, 1.1, 0.22, 2.1, 0.02, 0.3, 0.08, 6)
        )
      )
    }, 0)
    const highEnergy = samplePoints.reduce((energy, [x, z]) => {
      return (
        energy +
        displacementEnergy(
          sampleWaveDisplacement(x, z, 1.2, 1.1, 0.72, 2.1, 0.02, 0.3, 0.08, 6)
        )
      )
    }, 0)

    expect(highEnergy).toBeGreaterThan(lowEnergy)
  })

  it('moves farther over the same time slice when wave speed increases', () => {
    const samplePoints: Array<[number, number]> = [
      [0.35, -0.4],
      [0.72, 0.18],
      [-0.62, 0.31],
      [1.14, -0.57],
    ]
    const lowTravel = samplePoints.reduce((travel, [x, z]) => {
      const t0 = sampleWaveDisplacement(
        x,
        z,
        0.5,
        1.1,
        0.45,
        2.1,
        0.02,
        0.15,
        0.08,
        6
      )
      const t1 = sampleWaveDisplacement(
        x,
        z,
        1.0,
        1.1,
        0.45,
        2.1,
        0.02,
        0.15,
        0.08,
        6
      )
      return travel + displacementDistance(t0, t1)
    }, 0)
    const highTravel = samplePoints.reduce((travel, [x, z]) => {
      const t0 = sampleWaveDisplacement(
        x,
        z,
        0.5,
        1.1,
        0.45,
        2.1,
        0.02,
        1.1,
        0.08,
        6
      )
      const t1 = sampleWaveDisplacement(
        x,
        z,
        1.0,
        1.1,
        0.45,
        2.1,
        0.02,
        1.1,
        0.08,
        6
      )
      return travel + displacementDistance(t0, t1)
    }, 0)

    expect(highTravel).toBeGreaterThan(lowTravel)
  })
})

describe('sampleDirectionalWaves', () => {
  it('returns zero height when amplitude is zero', () => {
    const displacement = sampleDirectionalWaves(0.4, -0.2, 1.5, 1.2, 0, 0.08)

    expect(displacement.x).toBeCloseTo(0, 6)
    expect(displacement.y).toBeCloseTo(0, 6)
    expect(displacement.z).toBeCloseTo(0, 6)
  })

  it('changes with time and creates real vertical motion', () => {
    const t0 = sampleDirectionalWaves(0.4, -0.2, 0, 1.2, 0.05, 0.08)
    const t1 = sampleDirectionalWaves(0.4, -0.2, 3.5, 1.2, 0.05, 0.08)

    expect(Math.abs(t0.y)).toBeGreaterThan(0.001)
    expect(t0.y).not.toBe(t1.y)
  })

  it('travels farther over the same time slice when speed increases', () => {
    const samplePoints: Array<[number, number]> = [
      [0.4, -0.2],
      [0.72, 0.18],
      [-0.48, 0.26],
      [1.14, -0.57],
    ]
    const lowTravel = samplePoints.reduce((travel, [x, z]) => {
      const t0 = sampleDirectionalWaves(x, z, 0.5, 1.2, 0.05, 0.08, 0.2)
      const t1 = sampleDirectionalWaves(x, z, 1.0, 1.2, 0.05, 0.08, 0.2)
      return travel + displacementDistance(t0, t1)
    }, 0)
    const highTravel = samplePoints.reduce((travel, [x, z]) => {
      const t0 = sampleDirectionalWaves(x, z, 0.5, 1.2, 0.05, 0.08, 1.2)
      const t1 = sampleDirectionalWaves(x, z, 1.0, 1.2, 0.05, 0.08, 1.2)
      return travel + displacementDistance(t0, t1)
    }, 0)

    expect(highTravel).toBeGreaterThan(lowTravel)
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

describe('sampleWaveNormal', () => {
  it('returns an upward normal for a flat surface', () => {
    const normal = sampleWaveNormal(
      createDisplacement(0, 0, 0),
      createDisplacement(0, 0, 0),
      createDisplacement(0, 0, 0),
      createDisplacement(0, 0, 0),
      createDisplacement(0, 0, 0),
      0.1
    )

    expect(normal.x).toBeCloseTo(0, 6)
    expect(normal.y).toBeCloseTo(1, 6)
    expect(normal.z).toBeCloseTo(0, 6)
  })

  it('leans away from a higher eastern neighbor', () => {
    const normal = sampleWaveNormal(
      createDisplacement(0, 0.05, 0),
      createDisplacement(0, 0.2, 0),
      createDisplacement(0, 0, 0),
      createDisplacement(0, 0.05, 0),
      createDisplacement(0, 0.05, 0),
      0.1
    )

    expect(normal.x).toBeLessThan(0)
    expect(normal.y).toBeGreaterThan(0.6)
  })
})

describe('computeCompressionJacobian', () => {
  it('returns one when the surface has no horizontal compression', () => {
    expect(computeCompressionJacobian(0, 0, 0, 0)).toBe(1)
  })

  it('drops below one when the surface compresses', () => {
    const jacobian = computeCompressionJacobian(-0.25, 0.05, 0.04, -0.2)
    expect(jacobian).toBeLessThan(1)
  })
})

describe('computeFoamIntensity', () => {
  it('returns zero when the jacobian stays above the foam threshold', () => {
    expect(computeFoamIntensity(0.92, 0.7, 0.65, 0.2)).toBe(0)
  })

  it('returns stronger foam for compressed and steep areas', () => {
    const soft = computeFoamIntensity(0.54, 0.25, 0.65, 0.2)
    const strong = computeFoamIntensity(0.22, 0.9, 0.65, 0.2)

    expect(strong).toBeGreaterThan(soft)
    expect(strong).toBeGreaterThan(0.4)
  })
})
