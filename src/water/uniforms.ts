import { uniform } from 'three/tsl'
import * as THREE from 'three/webgpu'
import type { WaterSettings } from '@/water/settings'

function createSunDirection(azimuth: number, elevation: number): THREE.Vector3 {
  const horizontal = Math.cos(elevation)
  return new THREE.Vector3(
    Math.cos(azimuth) * horizontal,
    Math.sin(elevation),
    Math.sin(azimuth) * horizontal
  ).normalize()
}

export function createUniforms(
  width: number,
  height: number,
  settings: WaterSettings
) {
  return {
    foamIntensity: uniform(settings.foamIntensity),
    foamSoftness: uniform(settings.foamSoftness),
    time: uniform(0.0),
    resolution: uniform(new THREE.Vector2(width, height)),
    sunDirection: uniform(
      createSunDirection(settings.sunAzimuth, settings.sunElevation)
    ),
    sunColor: uniform(new THREE.Color(1.0, 0.82, 0.57)),
    fresnelPower: uniform(settings.fresnelPower),
    fresnelScale: uniform(settings.fresnelScale),
    peakThreshold: uniform(settings.peakThreshold),
    peakTransition: uniform(settings.peakTransition),
    reflectionStrength: uniform(settings.reflectionStrength),
    waveAmplitude: uniform(settings.waveAmplitude),
    waveChoppiness: uniform(settings.waveChoppiness),
    waveFrequency: uniform(settings.waveFrequency),
    wavePersistence: uniform(settings.wavePersistence),
    waveLacunarity: uniform(settings.waveLacunarity),
    waveSpeed: uniform(settings.waveSpeed),
    troughThreshold: uniform(settings.troughThreshold),
    troughTransition: uniform(settings.troughTransition),
    waterClarity: uniform(settings.waterClarity),
    waterDepth: uniform(settings.waterDepth),
    waterOpacity: uniform(settings.waterOpacity),
    foamThreshold: uniform(settings.foamThreshold),
    sssIntensity: uniform(settings.sssIntensity),
  }
}

export type WaterUniforms = ReturnType<typeof createUniforms>

export function updateUniformsFromSettings(
  uniforms: WaterUniforms,
  settings: WaterSettings
): void {
  uniforms.foamIntensity.value = settings.foamIntensity
  uniforms.foamSoftness.value = settings.foamSoftness
  uniforms.fresnelPower.value = settings.fresnelPower
  uniforms.fresnelScale.value = settings.fresnelScale
  uniforms.peakThreshold.value = settings.peakThreshold
  uniforms.peakTransition.value = settings.peakTransition
  uniforms.reflectionStrength.value = settings.reflectionStrength
  uniforms.waveAmplitude.value = settings.waveAmplitude
  uniforms.waveChoppiness.value = settings.waveChoppiness
  uniforms.waveFrequency.value = settings.waveFrequency
  uniforms.wavePersistence.value = settings.wavePersistence
  uniforms.waveLacunarity.value = settings.waveLacunarity
  uniforms.waveSpeed.value = settings.waveSpeed
  uniforms.troughThreshold.value = settings.troughThreshold
  uniforms.troughTransition.value = settings.troughTransition
  uniforms.waterClarity.value = settings.waterClarity
  uniforms.waterDepth.value = settings.waterDepth
  uniforms.waterOpacity.value = settings.waterOpacity
  uniforms.foamThreshold.value = settings.foamThreshold
  uniforms.sssIntensity.value = settings.sssIntensity
  uniforms.sunDirection.value.copy(
    createSunDirection(settings.sunAzimuth, settings.sunElevation)
  )
}
