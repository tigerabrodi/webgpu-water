function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

export function computeScreenSpaceThickness(
  surfaceViewZ: number,
  sceneViewZ: number,
  maxThickness: number
): number {
  return clamp(surfaceViewZ - sceneViewZ, 0, maxThickness)
}

export function computeOpticalDepth(
  thickness: number,
  waterDepth: number
): number {
  return waterDepth * (thickness * 2.15 + 0.18) + 0.04
}

export function computeTransmissionVisibility(
  thickness: number,
  clarity: number,
  nDotV: number,
  reflectionMix: number
): number {
  const shallowVisibility = 1 - smoothstep(0.08, 0.68, thickness)
  const angleVisibility = 0.35 + 0.65 * Math.pow(clamp(nDotV, 0, 1), 1.35)
  const reflectionOcclusion = 1 - clamp(reflectionMix * 0.72, 0, 0.92)

  return clamp(
    clarity *
      angleVisibility *
      (0.22 + shallowVisibility * 0.98) *
      reflectionOcclusion,
    0,
    1
  )
}
