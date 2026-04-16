import * as THREE from 'three/webgpu'
import {
  COMPUTE_WORKGROUP_SIZE,
  WATER_WORLD_SIZE,
  WAVE_TEXTURE_RESOLUTION,
} from '@/water/constants'
import {
  Fn,
  cross,
  float,
  globalId,
  normalize,
  texture,
  textureStore,
  uvec2,
  uvec3,
  vec2,
  vec3,
  vec4,
} from 'three/tsl'

/**
 * Builds a filtered world-space normal map from the displacement texture.
 */
export class NormalMapCompute {
  private readonly _renderer: THREE.WebGPURenderer
  private readonly _displacementTexture: THREE.StorageTexture
  private readonly _texture: THREE.StorageTexture
  private _computeNode: THREE.ComputeNode | null = null

  constructor(
    renderer: THREE.WebGPURenderer,
    displacementTexture: THREE.StorageTexture
  ) {
    this._renderer = renderer
    this._displacementTexture = displacementTexture
    this._texture = new THREE.StorageTexture(
      WAVE_TEXTURE_RESOLUTION,
      WAVE_TEXTURE_RESOLUTION
    )
    this._texture.name = 'WaterNormalTexture'
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
    const negativeTexelUv = float(0.0).sub(texelUv)

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
      const northeast = texture(
        this._displacementTexture,
        uv.add(vec2(texelUv, texelUv))
      ).xyz.toVar()
      const northwest = texture(
        this._displacementTexture,
        uv.add(vec2(negativeTexelUv, texelUv))
      ).xyz.toVar()
      const southeast = texture(
        this._displacementTexture,
        uv.add(vec2(texelUv, negativeTexelUv))
      ).xyz.toVar()
      const southwest = texture(
        this._displacementTexture,
        uv.add(vec2(negativeTexelUv, negativeTexelUv))
      ).xyz.toVar()
      const eastAverage = east.add(northeast).add(southeast).div(3.0).toVar()
      const westAverage = west.add(northwest).add(southwest).div(3.0).toVar()
      const northAverage = north.add(northeast).add(northwest).div(3.0).toVar()
      const southAverage = south.add(southeast).add(southwest).div(3.0).toVar()
      const tangentX = vec3(
        texelWorldSize.mul(2.0).add(eastAverage.x.sub(westAverage.x)),
        eastAverage.y.sub(westAverage.y),
        eastAverage.z.sub(westAverage.z)
      ).toVar()
      const tangentZ = vec3(
        northAverage.x.sub(southAverage.x),
        northAverage.y.sub(southAverage.y),
        texelWorldSize.mul(2.0).add(northAverage.z.sub(southAverage.z))
      ).toVar()
      const normal = normalize(cross(tangentZ, tangentX)).toVar()
      const encoded = normal.mul(0.5).add(0.5).toVar()

      textureStore(this.texture, coords, vec4(encoded, 1.0)).toWriteOnly()
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
