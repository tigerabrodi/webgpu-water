import * as THREE from 'three/webgpu'
import {
  COMPUTE_WORKGROUP_SIZE,
  WATER_WORLD_SIZE,
  WAVE_TEXTURE_RESOLUTION,
} from '@/water/constants'
import type { WaterUniforms } from '@/water/uniforms'
import {
  Fn,
  clamp,
  float,
  globalId,
  max,
  mx_fractal_noise_float,
  textureStore,
  uvec2,
  uvec3,
  vec2,
  vec3,
  vec4,
} from 'three/tsl'

/**
 * Generates a displacement texture for the water surface.
 *
 * RGBA layout:
 *   R = horizontal displacement X
 *   G = height
 *   B = horizontal displacement Z
 *   A = reserved
 */
export class WaveCompute {
  private readonly _renderer: THREE.WebGPURenderer
  private readonly _uniforms: WaterUniforms
  private readonly _texture: THREE.StorageTexture
  private _computeNode: THREE.ComputeNode | null = null

  constructor(renderer: THREE.WebGPURenderer, uniforms: WaterUniforms) {
    this._renderer = renderer
    this._uniforms = uniforms
    this._texture = new THREE.StorageTexture(
      WAVE_TEXTURE_RESOLUTION,
      WAVE_TEXTURE_RESOLUTION
    )
    this._texture.name = 'WaterDisplacementTexture'
    this._texture.type = THREE.FloatType
  }

  get texture(): THREE.StorageTexture {
    return this._texture
  }

  compute(): void {
    if (!this._computeNode) {
      this._computeNode = this.createComputeNode()
    }

    void this._renderer.compute(this._computeNode)
  }

  private createComputeNode(): THREE.ComputeNode {
    const resolution = float(WAVE_TEXTURE_RESOLUTION)
    const worldSize = float(WATER_WORLD_SIZE)
    const texelSize = worldSize.div(resolution)

    const sampleSwell = Fn<
      {
        amplitude: WaterUniforms['waveAmplitude']
        choppiness: WaterUniforms['waveChoppiness']
        frequency: WaterUniforms['waveFrequency']
        position: ReturnType<typeof vec2>
        speed: WaterUniforms['waveSpeed']
        time: WaterUniforms['time']
      },
      ReturnType<typeof vec3>
    >(({ amplitude, choppiness, frequency, position, speed, time }) => {
      const direction0 = vec2(0.96, 0.28).normalize().toVar()
      const direction1 = vec2(0.84, 0.54).normalize().toVar()
      const direction2 = vec2(0.52, -0.85).normalize().toVar()
      const direction3 = vec2(0.23, 0.97).normalize().toVar()
      const travelSpeed = speed.mul(4.6).toVar()

      const phase0 = position
        .dot(direction0)
        .mul(frequency.mul(0.42))
        .sub(time.mul(travelSpeed).mul(0.84).mul(frequency.mul(0.42)))
        .add(0.14)
        .toVar()
      const phase1 = position
        .dot(direction1)
        .mul(frequency.mul(0.71))
        .sub(time.mul(travelSpeed).mul(1.0).mul(frequency.mul(0.71)))
        .add(1.92)
        .toVar()
      const phase2 = position
        .dot(direction2)
        .mul(frequency.mul(1.08))
        .sub(time.mul(travelSpeed).mul(1.22).mul(frequency.mul(1.08)))
        .add(4.18)
        .toVar()
      const phase3 = position
        .dot(direction3)
        .mul(frequency.mul(1.54))
        .sub(time.mul(travelSpeed).mul(1.38).mul(frequency.mul(1.54)))
        .add(5.74)
        .toVar()

      const height0 = phase0
        .sin()
        .add(phase0.mul(1.7).add(0.084).sin().mul(0.18))
        .div(1.18)
        .toVar()
      const height1 = phase1
        .sin()
        .add(phase1.mul(1.7).add(1.152).sin().mul(0.18))
        .div(1.18)
        .toVar()
      const height2 = phase2
        .sin()
        .add(phase2.mul(1.7).add(2.508).sin().mul(0.18))
        .div(1.18)
        .toVar()
      const height3 = phase3
        .sin()
        .add(phase3.mul(1.7).add(3.444).sin().mul(0.18))
        .div(1.18)
        .toVar()

      const swellHeight = height0
        .mul(amplitude.mul(0.42))
        .add(height1.mul(amplitude.mul(0.2604)))
        .add(height2.mul(amplitude.mul(0.1428)))
        .add(height3.mul(amplitude.mul(0.084)))
        .toVar()

      const displacementX = direction0.x
        .mul(phase0.cos())
        .mul(amplitude.mul(0.42))
        .mul(choppiness.mul(0.55))
        .add(
          direction1.x
            .mul(phase1.cos())
            .mul(amplitude.mul(0.2604))
            .mul(choppiness.mul(0.55))
        )
        .add(
          direction2.x
            .mul(phase2.cos())
            .mul(amplitude.mul(0.1428))
            .mul(choppiness.mul(0.55))
        )
        .add(
          direction3.x
            .mul(phase3.cos())
            .mul(amplitude.mul(0.084))
            .mul(choppiness.mul(0.55))
        )
        .toVar()

      const displacementZ = direction0.y
        .mul(phase0.cos())
        .mul(amplitude.mul(0.42))
        .mul(choppiness.mul(0.55))
        .add(
          direction1.y
            .mul(phase1.cos())
            .mul(amplitude.mul(0.2604))
            .mul(choppiness.mul(0.55))
        )
        .add(
          direction2.y
            .mul(phase2.cos())
            .mul(amplitude.mul(0.1428))
            .mul(choppiness.mul(0.55))
        )
        .add(
          direction3.y
            .mul(phase3.cos())
            .mul(amplitude.mul(0.084))
            .mul(choppiness.mul(0.55))
        )
        .toVar()

      return vec3(displacementX, swellHeight, displacementZ)
    })

    const sampleHeightField = Fn<
      {
        amplitude: WaterUniforms['waveAmplitude']
        frequency: WaterUniforms['waveFrequency']
        lacunarity: WaterUniforms['waveLacunarity']
        persistence: WaterUniforms['wavePersistence']
        position: ReturnType<typeof vec2>
        speed: WaterUniforms['waveSpeed']
        time: WaterUniforms['time']
      },
      ReturnType<typeof float>
    >(
      ({
        amplitude,
        frequency,
        lacunarity,
        persistence,
        position,
        speed,
        time,
      }) => {
        const safePersistence = clamp(persistence, 0.18, 0.88).toVar()
        const safeLacunarity = max(lacunarity, 1.05).toVar()
        const drift = vec2(
          time.mul(speed.mul(3.1)),
          time.mul(speed.mul(1.28))
        ).toVar()
        const warpA = mx_fractal_noise_float(
          vec3(
            position.x.add(drift.x.mul(0.72)).mul(frequency.mul(0.37)),
            position.y.add(drift.y.mul(0.72)).mul(frequency.mul(0.37)),
            time.mul(speed.mul(0.12)).add(1.4)
          ),
          2,
          2.0,
          0.5,
          1.0
        ).toVar()
        const warpB = mx_fractal_noise_float(
          vec3(
            position.y.sub(drift.y.mul(0.56)).mul(frequency.mul(0.29)),
            position.x.add(drift.x.mul(0.58)).mul(frequency.mul(0.29)),
            time.mul(speed.mul(-0.11)).add(4.7)
          ),
          2,
          2.0,
          0.5,
          1.0
        ).toVar()
        const primaryNoise = mx_fractal_noise_float(
          vec3(
            position.x
              .add(drift.x)
              .add(warpA.mul(0.34))
              .add(warpB.mul(0.18))
              .mul(frequency.mul(0.82)),
            position.y
              .add(drift.y)
              .add(warpB.mul(0.34))
              .sub(warpA.mul(0.18))
              .mul(frequency.mul(0.82)),
            time.mul(speed.mul(0.14))
          ),
          5,
          safeLacunarity,
          safePersistence,
          1.0
        ).toVar()
        const shapedPrimary = primaryNoise
          .mul(float(0.84).add(max(primaryNoise, 0.0).mul(0.26)))
          .toVar()
        const crossNoise = mx_fractal_noise_float(
          vec3(
            position.y
              .add(5.7)
              .mul(0.86)
              .add(drift.y.mul(0.84))
              .mul(frequency.mul(1.08)),
            position.x
              .sub(3.4)
              .mul(0.92)
              .add(drift.x.mul(0.84))
              .mul(frequency.mul(1.08)),
            time.mul(speed.mul(0.1)).add(8.2)
          ),
          4,
          safeLacunarity.mul(1.03),
          clamp(safePersistence.mul(0.94), 0.18, 0.88),
          1.0
        ).toVar()
        const swell = sampleSwell({
          amplitude,
          choppiness: amplitude.mul(0.0),
          frequency,
          position,
          speed,
          time,
        }).toVar()

        return shapedPrimary
          .mul(amplitude.mul(1.2))
          .add(crossNoise.mul(amplitude.mul(0.36)))
          .add(swell.y.mul(0.55))
      }
    )

    const fillTexture = Fn(() => {
      const globalCoords = uvec3(globalId).toVar()
      const coords = uvec2(globalCoords.x, globalCoords.y).toVar()
      const uv = vec2(
        float(coords.x).add(0.5).div(resolution),
        float(coords.y).add(0.5).div(resolution)
      ).toVar()
      const worldPosition = uv.mul(worldSize).sub(worldSize.mul(0.5)).toVar()
      const swell = sampleSwell({
        amplitude: this._uniforms.waveAmplitude,
        choppiness: this._uniforms.waveChoppiness,
        frequency: this._uniforms.waveFrequency,
        position: worldPosition,
        speed: this._uniforms.waveSpeed,
        time: this._uniforms.time,
      }).toVar()
      const height = sampleHeightField({
        amplitude: this._uniforms.waveAmplitude,
        frequency: this._uniforms.waveFrequency,
        lacunarity: this._uniforms.waveLacunarity,
        persistence: this._uniforms.wavePersistence,
        position: worldPosition,
        speed: this._uniforms.waveSpeed,
        time: this._uniforms.time,
      }).toVar()
      const eastHeight = sampleHeightField({
        amplitude: this._uniforms.waveAmplitude,
        frequency: this._uniforms.waveFrequency,
        lacunarity: this._uniforms.waveLacunarity,
        persistence: this._uniforms.wavePersistence,
        position: worldPosition.add(vec2(texelSize, 0.0)),
        speed: this._uniforms.waveSpeed,
        time: this._uniforms.time,
      }).toVar()
      const westHeight = sampleHeightField({
        amplitude: this._uniforms.waveAmplitude,
        frequency: this._uniforms.waveFrequency,
        lacunarity: this._uniforms.waveLacunarity,
        persistence: this._uniforms.wavePersistence,
        position: worldPosition.sub(vec2(texelSize, 0.0)),
        speed: this._uniforms.waveSpeed,
        time: this._uniforms.time,
      }).toVar()
      const northHeight = sampleHeightField({
        amplitude: this._uniforms.waveAmplitude,
        frequency: this._uniforms.waveFrequency,
        lacunarity: this._uniforms.waveLacunarity,
        persistence: this._uniforms.wavePersistence,
        position: worldPosition.add(vec2(0.0, texelSize)),
        speed: this._uniforms.waveSpeed,
        time: this._uniforms.time,
      }).toVar()
      const southHeight = sampleHeightField({
        amplitude: this._uniforms.waveAmplitude,
        frequency: this._uniforms.waveFrequency,
        lacunarity: this._uniforms.waveLacunarity,
        persistence: this._uniforms.wavePersistence,
        position: worldPosition.sub(vec2(0.0, texelSize)),
        speed: this._uniforms.waveSpeed,
        time: this._uniforms.time,
      }).toVar()
      const slopeX = eastHeight.sub(westHeight).div(texelSize.mul(2.0)).toVar()
      const slopeZ = northHeight
        .sub(southHeight)
        .div(texelSize.mul(2.0))
        .toVar()
      const horizontalStrength = this._uniforms.waveChoppiness
        .mul(this._uniforms.wavePersistence.mul(0.96).add(0.42))
        .mul(this._uniforms.waveAmplitude.mul(13.0).add(0.22))
        .toVar()
      const displacement = vec4(
        swell.x.mul(0.48).sub(slopeX.mul(horizontalStrength)),
        height,
        swell.z.mul(0.48).sub(slopeZ.mul(horizontalStrength)),
        1.0
      ).toVar()

      textureStore(this.texture, coords, displacement).toWriteOnly()
    })

    return fillTexture()
      .computeKernel([COMPUTE_WORKGROUP_SIZE, COMPUTE_WORKGROUP_SIZE])
      .setCount([
        WAVE_TEXTURE_RESOLUTION / COMPUTE_WORKGROUP_SIZE,
        WAVE_TEXTURE_RESOLUTION / COMPUTE_WORKGROUP_SIZE,
        1,
      ])
  }
}
