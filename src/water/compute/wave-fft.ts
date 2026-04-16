import type * as THREE from 'three/webgpu'

/**
 * FFT wave generation via compute shader.
 *
 * Generates a displacement heightmap from a wave spectrum.
 * Steps:
 * 1. Initialize wave spectrum (Phillips or JONSWAP) in frequency space
 * 2. Animate spectrum with time (complex multiplication)
 * 3. Inverse FFT via butterfly passes to get spatial heightmap
 * 4. Output: 2D storage texture of wave heights
 *
 * The heightmap is sampled by the vertex shader for surface displacement.
 * Also used by the normal map and foam map compute passes.
 *
 * For the initial version, we can use FBM simplex noise instead of FFT
 * and upgrade to FFT later. The compute infrastructure stays the same.
 */
export class WaveCompute {
  static readonly RESOLUTION = 256

  private _renderer: THREE.WebGPURenderer

  constructor(renderer: THREE.WebGPURenderer) {
    this._renderer = renderer
  }

  compute(): void {
    // TODO: Generate wave heightmap into storage texture
    // TODO: Initial version: FBM simplex noise (port from reference)
    // TODO: Upgrade path: Phillips spectrum + IFFT butterfly passes
    void this._renderer
  }
}
