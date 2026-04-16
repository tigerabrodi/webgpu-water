import { uniform } from 'three/tsl'
import * as THREE from 'three/webgpu'

export interface WaterUniforms {
  time: { value: number }
  resolution: { value: THREE.Vector2 }
  sunDirection: { value: THREE.Vector3 }
  sunColor: { value: THREE.Color }
  waveAmplitude: { value: number }
  waveFrequency: { value: number }
  wavePersistence: { value: number }
  waveLacunarity: { value: number }
  waveSpeed: { value: number }
  waterDepth: { value: number }
  foamThreshold: { value: number }
  sssIntensity: { value: number }
}

export function createUniforms(width: number, height: number): WaterUniforms {
  return {
    time: uniform(0.0),
    resolution: uniform(new THREE.Vector2(width, height)),
    sunDirection: uniform(new THREE.Vector3(-0.5, 0.3, 1.0).normalize()),
    sunColor: uniform(new THREE.Color(1.0, 0.82, 0.57)),
    waveAmplitude: uniform(0.01),
    waveFrequency: uniform(1.07),
    wavePersistence: uniform(0.3),
    waveLacunarity: uniform(2.18),
    waveSpeed: uniform(0.4),
    waterDepth: uniform(0.12),
    foamThreshold: uniform(0.3),
    sssIntensity: uniform(0.6),
  }
}
