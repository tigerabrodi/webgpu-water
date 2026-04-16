import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { type WaterUniforms, createUniforms } from '@/water/uniforms'

/**
 * Orchestrates the full water rendering pipeline:
 * 1. Compute: FFT wave spectrum to displacement heightmap (every frame)
 * 2. Compute: normal map from heightmap (every frame)
 * 3. Compute: foam map from Jacobian (every frame)
 * 4. Render: water surface with displacement, fresnel, SSS, reflections
 * 5. Render: ground with patina PBR textures, caustics, depth fog
 * 6. Render: procedural sky (gradient + sun disc)
 */
export class WaterRenderer {
  private renderer: THREE.WebGPURenderer | null = null
  private scene: THREE.Scene | null = null
  private camera: THREE.PerspectiveCamera | null = null
  private controls: OrbitControls | null = null
  private container: HTMLElement
  private uniforms: WaterUniforms | null = null
  private clock = new THREE.Clock()
  private animationId: number | null = null

  constructor(container: HTMLElement) {
    this.container = container
  }

  async init(): Promise<void> {
    this.renderer = new THREE.WebGPURenderer({ antialias: true })
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    )
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    this.container.appendChild(this.renderer.domElement)

    await this.renderer.init()

    this.scene = new THREE.Scene()

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.001,
      100
    )
    this.camera.position.set(0.8, 0.3, 0.8)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.target.set(0, 0, 0)

    this.uniforms = createUniforms(
      this.container.clientWidth,
      this.container.clientHeight
    )

    // TODO: Load KTX2 patina textures
    // TODO: Create water surface mesh with TSL material
    // TODO: Create ground mesh with patina PBR + caustics
    // TODO: Create procedural sky
    // TODO: Initialize compute passes (FFT waves, normals, foam)

    window.addEventListener('resize', this.onResize)
    this.clock.start()
    this.animate()
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate)

    if (!this.renderer || !this.scene || !this.camera || !this.uniforms) return

    const elapsed = this.clock.getElapsedTime()
    this.uniforms.time.value = elapsed

    this.controls?.update()

    // TODO: Run per-frame compute passes
    // TODO: renderer.compute(waveFFT)
    // TODO: renderer.compute(normalMap)
    // TODO: renderer.compute(foamMap)

    this.renderer.render(this.scene, this.camera)
  }

  private onResize = (): void => {
    if (!this.renderer || !this.camera || !this.uniforms) return

    const width = this.container.clientWidth
    const height = this.container.clientHeight

    this.renderer.setSize(width, height)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.uniforms.resolution.value.set(width, height)
  }

  dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
    }
    window.removeEventListener('resize', this.onResize)
    this.controls?.dispose()
    this.renderer?.dispose()

    if (this.renderer?.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(
        this.renderer.domElement
      )
    }
  }
}
