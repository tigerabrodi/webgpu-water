function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

export function computeCausticsMask(
  sampleA: number,
  sampleB: number,
  intensity: number,
  offset: number,
  thickness: number
): number {
  if (intensity <= 0) {
    return 0
  }

  const combined =
    intensity * (offset - Math.abs(sampleA)) +
    intensity * (offset - Math.abs(sampleB))

  return smoothstep(0.5 - thickness, 0.5 + thickness, combined)
}
