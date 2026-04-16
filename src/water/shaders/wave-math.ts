/**
 * Pure TypeScript wave math functions.
 * Mirrored in WGSL/TSL for the GPU. Tested here with vitest.
 */

export interface WaveDisplacement {
  x: number
  y: number
  z: number
}

export interface WaveNormal {
  x: number
  y: number
  z: number
}

interface DirectionalWave {
  amplitudeScale: number
  directionX: number
  directionZ: number
  frequencyScale: number
  phaseOffset: number
  speedScale: number
}

const SIMPLEX_C0 = 0.211324865405187
const SIMPLEX_C1 = 0.366025403784439
const SIMPLEX_C2 = -0.577350269189626
const SIMPLEX_C3 = 0.024390243902439
const NORMAL_EPSILON = 0.001
const FLOW_DIRECTION_X = 0.92
const FLOW_DIRECTION_Z = 0.38
const DIRECTIONAL_WAVES: Array<DirectionalWave> = [
  {
    amplitudeScale: 1.0,
    directionX: 0.96,
    directionZ: 0.28,
    frequencyScale: 0.42,
    phaseOffset: 0.14,
    speedScale: 0.84,
  },
  {
    amplitudeScale: 0.62,
    directionX: 0.84,
    directionZ: 0.54,
    frequencyScale: 0.71,
    phaseOffset: 1.92,
    speedScale: 1.0,
  },
  {
    amplitudeScale: 0.34,
    directionX: 0.52,
    directionZ: -0.85,
    frequencyScale: 1.08,
    phaseOffset: 4.18,
    speedScale: 1.22,
  },
  {
    amplitudeScale: 0.2,
    directionX: 0.23,
    directionZ: 0.97,
    frequencyScale: 1.54,
    phaseOffset: 5.74,
    speedScale: 1.38,
  },
]

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function clamp01(value: number): number {
  return clamp(value, 0, 1)
}

function fract(value: number): number {
  return value - Math.floor(value)
}

function mod289(value: number): number {
  return value - Math.floor(value / 289) * 289
}

function permute(value: number): number {
  return mod289((value * 34 + 1) * value)
}

function dot2(ax: number, ay: number, bx: number, by: number): number {
  return ax * bx + ay * by
}

function normalize3(x: number, y: number, z: number): WaveNormal {
  const length = Math.hypot(x, y, z)

  if (length === 0) {
    return { x: 0, y: 1, z: 0 }
  }

  return {
    x: x / length,
    y: y / length,
    z: z / length,
  }
}

function cross(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number
): WaveNormal {
  return {
    x: ay * bz - az * by,
    y: az * bx - ax * bz,
    z: ax * by - ay * bx,
  }
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

export function simplex2(x: number, y: number): number {
  const skew = (x + y) * SIMPLEX_C1
  let cellX = Math.floor(x + skew)
  let cellY = Math.floor(y + skew)
  const unskew = (cellX + cellY) * SIMPLEX_C0
  const x0 = x - cellX + unskew
  const y0 = y - cellY + unskew
  const stepX = x0 > y0 ? 1 : 0
  const stepY = x0 > y0 ? 0 : 1
  const x1 = x0 + SIMPLEX_C0 - stepX
  const y1 = y0 + SIMPLEX_C0 - stepY
  const x2 = x0 + SIMPLEX_C2
  const y2 = y0 + SIMPLEX_C2

  cellX = mod289(cellX)
  cellY = mod289(cellY)

  const p0 = permute(permute(cellY + 0) + cellX + 0)
  const p1 = permute(permute(cellY + stepY) + cellX + stepX)
  const p2 = permute(permute(cellY + 1) + cellX + 1)

  let m0 = Math.max(0.5 - dot2(x0, y0, x0, y0), 0)
  let m1 = Math.max(0.5 - dot2(x1, y1, x1, y1), 0)
  let m2 = Math.max(0.5 - dot2(x2, y2, x2, y2), 0)

  m0 *= m0
  m1 *= m1
  m2 *= m2
  m0 *= m0
  m1 *= m1
  m2 *= m2

  const gx0 = 2 * fract(p0 * SIMPLEX_C3) - 1
  const gx1 = 2 * fract(p1 * SIMPLEX_C3) - 1
  const gx2 = 2 * fract(p2 * SIMPLEX_C3) - 1

  const gy0 = Math.abs(gx0) - 0.5
  const gy1 = Math.abs(gx1) - 0.5
  const gy2 = Math.abs(gx2) - 0.5

  const ox0 = Math.floor(gx0 + 0.5)
  const ox1 = Math.floor(gx1 + 0.5)
  const ox2 = Math.floor(gx2 + 0.5)

  const a0 = gx0 - ox0
  const a1 = gx1 - ox1
  const a2 = gx2 - ox2

  m0 *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + gy0 * gy0)
  m1 *= 1.79284291400159 - 0.85373472095314 * (a1 * a1 + gy1 * gy1)
  m2 *= 1.79284291400159 - 0.85373472095314 * (a2 * a2 + gy2 * gy2)

  const g0 = a0 * x0 + gy0 * y0
  const g1 = a1 * x1 + gy1 * y1
  const g2 = a2 * x2 + gy2 * y2

  return 130 * (m0 * g0 + m1 * g1 + m2 * g2)
}

export function fbmElevation(
  x: number,
  z: number,
  time: number,
  frequency: number,
  persistence: number,
  lacunarity: number,
  amplitude: number,
  speed: number,
  octaves: number
): number {
  let elevation = 0
  let amp = 1
  let freq = frequency
  const safePersistence = clamp(persistence, 0.18, 0.88)
  const safeLacunarity = Math.max(lacunarity, 1.05)
  const flowX = time * speed * FLOW_DIRECTION_X * 3.1
  const flowZ = time * speed * FLOW_DIRECTION_Z * 2.48

  for (let i = 0; i < octaves; i++) {
    const octaveWeight = 1 / (i + 1)
    const warpA = simplex2(
      (x + flowX * 0.72 + i * 3.17) * freq * 0.37,
      (z + flowZ * 0.72 - i * 2.41) * freq * 0.37
    )
    const warpB = simplex2(
      (z - flowZ * 0.56 - i * 1.93) * freq * 0.29,
      (x + flowX * 0.58 + i * 2.71) * freq * 0.29
    )
    const px = (x + flowX + warpA * 0.34 * octaveWeight + warpB * 0.18) * freq
    const pz = (z + flowZ + warpB * 0.34 * octaveWeight - warpA * 0.18) * freq
    const noiseValue = simplex2(px, pz)
    const shapedNoise = noiseValue * (0.84 + Math.max(noiseValue, 0) * 0.26)

    elevation += amp * shapedNoise
    amp *= safePersistence
    freq *= safeLacunarity
  }

  return elevation * amplitude
}

export function sampleDirectionalWaves(
  x: number,
  z: number,
  time: number,
  frequency: number,
  amplitude: number,
  choppiness: number,
  speed = 1,
  persistence = 0.5,
  lacunarity = 2.0
): WaveDisplacement {
  let displacementX = 0
  let displacementY = 0
  let displacementZ = 0
  let frequencyMultiplier = 1
  let amplitudeMultiplier = 1
  const safePersistence = clamp(persistence, 0.12, 0.9)
  const safeLacunarity = Math.sqrt(Math.max(lacunarity, 1.02))
  const travelSpeed = Math.max(speed, 0.01) * 4.6
  const amplitudeDecay = 0.72 + safePersistence * 0.18

  for (const wave of DIRECTIONAL_WAVES) {
    const currentFrequency =
      frequency * wave.frequencyScale * frequencyMultiplier
    const currentAmplitude =
      amplitude * 0.42 * wave.amplitudeScale * amplitudeMultiplier
    const phase =
      (x * wave.directionX + z * wave.directionZ) * currentFrequency -
      time * travelSpeed * wave.speedScale * currentFrequency +
      wave.phaseOffset
    const sine = Math.sin(phase)
    const harmonic = Math.sin(phase * 1.7 + wave.phaseOffset * 0.6) * 0.18
    const shapedHeight = (sine + harmonic) / 1.18
    const cosine = Math.cos(phase)

    displacementY += shapedHeight * currentAmplitude
    displacementX +=
      wave.directionX * cosine * currentAmplitude * choppiness * 0.55
    displacementZ +=
      wave.directionZ * cosine * currentAmplitude * choppiness * 0.55
    frequencyMultiplier *= safeLacunarity
    amplitudeMultiplier *= amplitudeDecay
  }

  return {
    x: displacementX,
    y: displacementY,
    z: displacementZ,
  }
}

function sampleWaveHeight(
  x: number,
  z: number,
  time: number,
  frequency: number,
  persistence: number,
  lacunarity: number,
  amplitude: number,
  speed: number,
  octaves: number
): number {
  const safeOctaves = Math.max(1, Math.floor(octaves))
  const swells = sampleDirectionalWaves(
    x,
    z,
    time,
    frequency * 0.92,
    amplitude,
    0,
    speed * 1.06,
    persistence,
    lacunarity
  )
  const primaryHeight = fbmElevation(
    x,
    z,
    time,
    frequency * 0.82,
    persistence,
    lacunarity,
    amplitude * 1.2,
    speed * 1.22,
    safeOctaves
  )
  const crossHeight = fbmElevation(
    z * 0.86 + 5.7,
    x * 0.92 - 3.4,
    time,
    frequency * 1.08,
    clamp(persistence * 0.94, 0.18, 0.88),
    lacunarity * 1.03,
    amplitude * 0.36,
    speed * 0.84,
    Math.max(2, safeOctaves - 1)
  )

  return primaryHeight + crossHeight + swells.y * 0.55
}

export function sampleWaveDisplacement(
  x: number,
  z: number,
  time: number,
  frequency: number,
  persistence: number,
  lacunarity: number,
  amplitude: number,
  speed: number,
  choppiness: number,
  octaves: number,
  epsilon = NORMAL_EPSILON
): WaveDisplacement {
  const macroDisplacement = sampleDirectionalWaves(
    x,
    z,
    time,
    frequency,
    amplitude,
    choppiness,
    speed,
    persistence,
    lacunarity
  )
  const height = sampleWaveHeight(
    x,
    z,
    time,
    frequency,
    persistence,
    lacunarity,
    amplitude,
    speed,
    octaves
  )
  const eastHeight = sampleWaveHeight(
    x + epsilon,
    z,
    time,
    frequency,
    persistence,
    lacunarity,
    amplitude,
    speed,
    octaves
  )
  const westHeight = sampleWaveHeight(
    x - epsilon,
    z,
    time,
    frequency,
    persistence,
    lacunarity,
    amplitude,
    speed,
    octaves
  )
  const northHeight = sampleWaveHeight(
    x,
    z + epsilon,
    time,
    frequency,
    persistence,
    lacunarity,
    amplitude,
    speed,
    octaves
  )
  const southHeight = sampleWaveHeight(
    x,
    z - epsilon,
    time,
    frequency,
    persistence,
    lacunarity,
    amplitude,
    speed,
    octaves
  )
  const slopeX = (eastHeight - westHeight) / (2 * epsilon)
  const slopeZ = (northHeight - southHeight) / (2 * epsilon)
  const horizontalStrength =
    choppiness * (0.42 + persistence * 0.96) * (amplitude * 13.0 + 0.22)

  return {
    x: macroDisplacement.x * 0.48 - slopeX * horizontalStrength,
    y: height,
    z: macroDisplacement.z * 0.48 - slopeZ * horizontalStrength,
  }
}

export function sampleWaveNormal(
  center: WaveDisplacement,
  east: WaveDisplacement,
  west: WaveDisplacement,
  north: WaveDisplacement,
  south: WaveDisplacement,
  texelWorldSize: number
): WaveNormal {
  const tangentX = {
    x: texelWorldSize * 2 + east.x - west.x,
    y: east.y - west.y,
    z: east.z - west.z,
  }
  const tangentZ = {
    x: north.x - south.x,
    y: north.y - south.y,
    z: texelWorldSize * 2 + north.z - south.z,
  }
  const normal = cross(
    tangentZ.x,
    tangentZ.y,
    tangentZ.z,
    tangentX.x,
    tangentX.y,
    tangentX.z
  )

  void center

  return normalize3(normal.x, normal.y, normal.z)
}

export function computeCompressionJacobian(
  dDxDx: number,
  dDxDz: number,
  dDzDx: number,
  dDzDz: number
): number {
  return (1 + dDxDx) * (1 + dDzDz) - dDxDz * dDzDx
}

export function computeFoamIntensity(
  jacobian: number,
  slope: number,
  threshold: number,
  softness: number,
  crest = 0,
  curvature = 0
): number {
  const safeSoftness = Math.max(softness, 1e-5)
  const compression = clamp01((threshold - jacobian) / safeSoftness)
  const slopeWeight = smoothstep(0.04, 0.45, slope)
  const crestWeight = smoothstep(0.18, 0.82, crest)
  const curvatureWeight = smoothstep(0.015, 0.14, curvature)
  const compressionFoam = compression * (0.46 + slopeWeight * 0.54)
  const crestFoam = crestWeight * curvatureWeight * (0.26 + slopeWeight * 0.42)

  return clamp01(Math.max(compressionFoam, crestFoam))
}

export function fresnel(
  viewDotNormal: number,
  scale: number,
  power: number
): number {
  return scale * Math.pow(1 - clamp01(viewDotNormal), power)
}

export function depthFog(depth: number, maxDepth: number): number {
  if (maxDepth <= 0) {
    return 1
  }

  return smoothstep(0, 1, depth / maxDepth)
}
