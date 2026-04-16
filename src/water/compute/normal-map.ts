import type * as THREE from 'three/webgpu'

/**
 * Normal map generation via compute shader.
 *
 * Reads the wave heightmap, computes surface gradients,
 * writes a normal map texture.
 *
 * More accurate than finite differences in the vertex shader.
 * Each thread samples 4 neighbors (+x, -x, +z, -z),
 * computes tangent and bitangent, cross product for normal.
 */
export class NormalMapCompute {
  private _renderer: THREE.WebGPURenderer

  constructor(renderer: THREE.WebGPURenderer) {
    this._renderer = renderer
  }

  compute(): void {
    // TODO: Read wave heightmap storage texture
    // TODO: Compute normals from height gradients
    // TODO: Write to normal map storage texture
    void this._renderer
  }
}
