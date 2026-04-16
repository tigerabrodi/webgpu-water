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
  length,
  smoothstep,
  texture,
  textureStore,
  uvec2,
  uvec3,
  vec2,
  vec4,
} from 'three/tsl'

/**
 * Builds a foam intensity mask from horizontal compression and local slope.
 */
export class FoamMapCompute {
  private readonly _renderer: THREE.WebGPURenderer
  private readonly _displacementTexture: THREE.StorageTexture
  private readonly _uniforms: WaterUniforms
  private readonly _texture: THREE.StorageTexture
  private _computeNode: THREE.ComputeNode | null = null

  constructor(
    renderer: THREE.WebGPURenderer,
    uniforms: WaterUniforms,
    displacementTexture: THREE.StorageTexture
  ) {
    this._renderer = renderer
    this._uniforms = uniforms
    this._displacementTexture = displacementTexture
    this._texture = new THREE.StorageTexture(
      WAVE_TEXTURE_RESOLUTION,
      WAVE_TEXTURE_RESOLUTION
    )
    this._texture.name = 'WaterFoamTexture'
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
    const texelUv = float(1).div(resolution)
    const texelWorldSize = float(WATER_WORLD_SIZE).div(resolution)
    const inverseStep = float(1).div(texelWorldSize.mul(2.0))

    const fillTexture = Fn(() => {
      const globalCoords = uvec3(globalId).toVar()
      const coords = uvec2(globalCoords.x, globalCoords.y).toVar()
      const uv = vec2(
        float(coords.x).add(0.5).div(resolution),
        float(coords.y).add(0.5).div(resolution)
      ).toVar()
      const east = texture(
        this._displacementTexture,
        uv.add(vec2(texelUv, 0.0))
      ).xyz.toVar()
      const west = texture(
        this._displacementTexture,
        uv.sub(vec2(texelUv, 0.0))
      ).xyz.toVar()
      const north = texture(
        this._displacementTexture,
        uv.add(vec2(0.0, texelUv))
      ).xyz.toVar()
      const south = texture(
        this._displacementTexture,
        uv.sub(vec2(0.0, texelUv))
      ).xyz.toVar()

      const dDxDx = east.x.sub(west.x).mul(inverseStep).toVar()
      const dDxDz = north.x.sub(south.x).mul(inverseStep).toVar()
      const dDzDx = east.z.sub(west.z).mul(inverseStep).toVar()
      const dDzDz = north.z.sub(south.z).mul(inverseStep).toVar()
      const slope = length(
        vec2(east.y.sub(west.y), north.y.sub(south.y)).mul(inverseStep)
      ).toVar()
      const jacobian = float(1)
        .add(dDxDx)
        .mul(float(1).add(dDzDz))
        .sub(dDxDz.mul(dDzDx))
        .toVar()
      const compression = clamp(
        this._uniforms.foamThreshold
          .sub(jacobian)
          .div(this._uniforms.foamSoftness),
        0.0,
        1.0
      ).toVar()
      const slopeMask = smoothstep(0.1, 1.0, slope).toVar()
      const foam = compression
        .mul(slopeMask)
        .mul(this._uniforms.foamIntensity)
        .toVar()

      textureStore(
        this.texture,
        coords,
        vec4(foam, foam, foam, 1.0)
      ).toWriteOnly()
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
