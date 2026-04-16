/**
 * Pure TypeScript wave math functions.
 * Mirrored in WGSL/TSL for the GPU. Tested here with vitest.
 */

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

  for (let i = 0; i < octaves; i++) {
    const px = x * freq + time * speed
    const pz = z * freq + time * speed * 0.7
    const noiseValue = Math.sin(px) * Math.cos(pz) * 0.5
    elevation += amp * noiseValue
    amp *= persistence
    freq *= lacunarity
  }

  return elevation * amplitude
}

export function fresnel(
  viewDotNormal: number,
  scale: number,
  power: number
): number {
  return scale * Math.pow(1 - Math.max(0, Math.min(1, viewDotNormal)), power)
}

export function depthFog(depth: number, maxDepth: number): number {
  return Math.max(0, Math.min(1, depth / maxDepth))
}
