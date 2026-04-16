import { WATER_BASIN_RADIUS } from '@/water/constants'

export interface BasinFactors {
  coreFactor: number
  radialDistance: number
  slopeFactor: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

export function computeBasinWarp(x: number, z: number): number {
  return (
    Math.sin(x * 0.78 + 0.6) * 0.08 +
    Math.cos(z * 0.64 - 0.4) * 0.06 +
    Math.sin((x - z) * 0.32) * 0.05
  )
}

export function computeBasinFactors(x: number, z: number): BasinFactors {
  const radialDistance =
    Math.hypot(x * 0.93, z * 1.07) / WATER_BASIN_RADIUS + computeBasinWarp(x, z)
  const slopeFactor = 1 - smoothstep(0.22, 1.0, radialDistance)
  const coreFactor = 1 - smoothstep(0.0, 0.58, radialDistance)

  return {
    coreFactor,
    radialDistance,
    slopeFactor,
  }
}

export function computeGroundHeight(x: number, z: number): number {
  const { coreFactor, slopeFactor } = computeBasinFactors(x, z)
  const innerRipple =
    Math.sin(x * 2.8) * Math.cos(z * 2.4) * slopeFactor * 0.016
  const outerVariation =
    Math.sin(x * 0.84 + 0.8) * Math.cos(z * 0.96 - 0.5) * 0.024

  return (
    -0.24 - slopeFactor * 0.2 - coreFactor * 0.26 + innerRipple + outerVariation
  )
}

export function computeWaterThickness(
  x: number,
  z: number,
  waterHeight: number
): number {
  return Math.max(0, waterHeight - computeGroundHeight(x, z))
}
