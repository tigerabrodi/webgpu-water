import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { FoamMapCompute } from '@/water/compute/foam-map'
import { NormalMapCompute } from '@/water/compute/normal-map'
import { WaveCompute } from '@/water/compute/wave-fft'
import { createGroundMesh, loadGroundTextures } from '@/water/materials/ground'
import { createWaterSurfaceMesh } from '@/water/materials/water-surface'
import { defaultWaterSettings, type WaterSettings } from '@/water/settings'
import { createSkyBackgroundNode } from '@/water/sky'
import {
  type WaterUniforms,
  createUniforms,
  updateUniformsFromSettings,
} from '@/water/uniforms'
import * as THREE from 'three/webgpu'

interface WaterDebugState {
  resolution: {
    height: number
    width: number
  }
  settings: WaterSettings
  sunDirection: {
    x: number
    y: number
    z: number
  }
  time: number
  view: WaterCameraView
}

interface WaterDebugHandle {
  getState: () => WaterDebugState
  resetCamera: () => void
  setGroundVisible: (isVisible: boolean) => void
  setSettings: (settings: Partial<WaterSettings>) => void
  setWaterVisible: (isVisible: boolean) => void
  setView: (view: WaterCameraView) => void
}

declare global {
  interface Window {
    __waterDebug?: WaterDebugHandle
  }
}

export type WaterCameraView = 'glide' | 'horizon' | 'shelf' | 'storm'

export class WaterRenderer {
  private renderer: THREE.WebGPURenderer | null = null
  private scene: THREE.Scene | null = null
  private camera: THREE.PerspectiveCamera | null = null
  private controls: OrbitControls | null = null
  private readonly container: HTMLElement
  private uniforms: WaterUniforms | null = null
  private readonly timer = new THREE.Timer()
  private animationId: number | null = null
  private waveCompute: WaveCompute | null = null
  private normalCompute: NormalMapCompute | null = null
  private foamCompute: FoamMapCompute | null = null
  private sunLight: THREE.DirectionalLight | null = null
  private fillLight: THREE.HemisphereLight | null = null
  private groundMesh: THREE.Mesh | null = null
  private waterMesh: THREE.Mesh | null = null
  private debugHandle: WaterDebugHandle | null = null
  private isDisposed = false
  private cameraView: WaterCameraView = 'horizon'
  private settings: WaterSettings

  constructor(
    container: HTMLElement,
    settings: WaterSettings = defaultWaterSettings
  ) {
    this.container = container
    this.settings = { ...settings }
  }

  async init(): Promise<void> {
    if (this.isDisposed) return

    this.renderer = new THREE.WebGPURenderer({ antialias: true })
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    )
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 0.84
    this.renderer.shadowMap.enabled = true
    this.container.appendChild(this.renderer.domElement)

    await this.renderer.init()

    if (this.isDisposed) {
      this.renderer.dispose()
      return
    }

    this.scene = new THREE.Scene()
    this.uniforms = createUniforms(
      this.container.clientWidth,
      this.container.clientHeight,
      this.settings
    )
    this.scene.backgroundNode = createSkyBackgroundNode(this.uniforms)

    this.camera = new THREE.PerspectiveCamera(
      54,
      this.container.clientWidth / this.container.clientHeight,
      0.01,
      100
    )

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.06
    this.controls.minDistance = 0.45
    this.controls.maxDistance = 6.4
    this.controls.maxPolarAngle = Math.PI * 0.47
    this.resetCamera()

    this.sunLight = new THREE.DirectionalLight(
      new THREE.Color(1.0, 0.82, 0.57),
      4.8
    )
    this.sunLight.castShadow = true
    this.sunLight.shadow.bias = -0.0003
    this.sunLight.shadow.mapSize.set(1024, 1024)
    this.sunLight.target.position.set(0, -0.08, 0)
    this.fillLight = new THREE.HemisphereLight(0x6a4d74, 0x0a1628, 0.8)

    this.scene.add(this.sunLight)
    this.scene.add(this.sunLight.target)
    this.scene.add(this.fillLight)

    this.waveCompute = new WaveCompute(this.renderer, this.uniforms)
    this.normalCompute = new NormalMapCompute(
      this.renderer,
      this.waveCompute.texture
    )
    this.foamCompute = new FoamMapCompute(
      this.renderer,
      this.uniforms,
      this.waveCompute.texture
    )

    const groundTextures = await loadGroundTextures(this.renderer)

    if (this.isDisposed || !this.scene) {
      return
    }

    this.groundMesh = createGroundMesh(this.uniforms, groundTextures)
    this.waterMesh = createWaterSurfaceMesh(this.uniforms, {
      displacementTexture: this.waveCompute.texture,
      foamTexture: this.foamCompute.texture,
      normalTexture: this.normalCompute.texture,
    })

    this.scene.add(this.groundMesh)
    this.scene.add(this.waterMesh)

    this.applySettings(this.settings)
    this.runComputePasses()
    this.renderer.render(this.scene, this.camera)
    this.attachDebugHandle()

    window.addEventListener('resize', this.onResize)
    this.timer.connect(document)
    this.timer.reset()
    this.animate()
  }

  setSettings(settings: WaterSettings): void {
    this.settings = { ...settings }
    this.applySettings(this.settings)
  }

  updateSettings(settings: Partial<WaterSettings>): void {
    this.setSettings({
      ...this.settings,
      ...settings,
    })
  }

  resetCamera(): void {
    this.setView('horizon')
  }

  setGroundVisible(isVisible: boolean): void {
    if (this.groundMesh) {
      this.groundMesh.visible = isVisible
    }
  }

  setWaterVisible(isVisible: boolean): void {
    if (this.waterMesh) {
      this.waterMesh.visible = isVisible
    }
  }

  setView(view: WaterCameraView): void {
    if (!this.camera) return

    this.cameraView = view

    if (view === 'glide') {
      this.camera.position.set(1.18, 0.14, -0.06)
      this.camera.lookAt(0.02, -0.02, 0.18)
      this.controls?.target.set(0.02, -0.02, 0.18)
      return
    }

    if (view === 'storm') {
      this.camera.position.set(1.56, 0.28, 0.58)
      this.camera.lookAt(0.08, -0.01, 0.14)
      this.controls?.target.set(0.08, -0.01, 0.14)
      return
    }

    if (view === 'shelf') {
      this.camera.position.set(1.06, 0.16, 1.16)
      this.camera.lookAt(0, -0.11, 0.16)
      this.controls?.target.set(0, -0.11, 0.16)
      return
    }

    this.camera.position.set(1.08, 0.16, 0.64)
    this.camera.lookAt(0, -0.04, 0.02)
    this.controls?.target.set(0, -0.04, 0.02)
  }

  getState(): WaterDebugState {
    const sunDirection = this.uniforms?.sunDirection.value
    const resolution = this.uniforms?.resolution.value

    return {
      resolution: {
        height: resolution?.y ?? this.container.clientHeight,
        width: resolution?.x ?? this.container.clientWidth,
      },
      settings: { ...this.settings },
      sunDirection: {
        x: sunDirection?.x ?? 0,
        y: sunDirection?.y ?? 0,
        z: sunDirection?.z ?? 0,
      },
      time: this.uniforms?.time.value ?? 0,
      view: this.cameraView,
    }
  }

  private animate = (timestamp?: number): void => {
    this.animationId = requestAnimationFrame(this.animate)

    if (
      !this.renderer ||
      !this.scene ||
      !this.camera ||
      !this.uniforms ||
      !this.waveCompute ||
      !this.normalCompute ||
      !this.foamCompute
    ) {
      return
    }

    this.timer.update(timestamp)
    this.uniforms.time.value = this.timer.getElapsed()
    this.controls?.update()
    this.runComputePasses()
    this.renderer.render(this.scene, this.camera)
  }

  private runComputePasses(): void {
    this.waveCompute?.compute()
    this.normalCompute?.compute()
    this.foamCompute?.compute()
  }

  private applySettings(settings: WaterSettings): void {
    if (!this.uniforms) return

    updateUniformsFromSettings(this.uniforms, settings)
    this.updateLighting()
  }

  private updateLighting(): void {
    if (!this.uniforms || !this.sunLight) return

    const direction = this.uniforms.sunDirection.value.clone()

    this.sunLight.position.copy(direction.multiplyScalar(2.4))
  }

  private attachDebugHandle(): void {
    this.debugHandle = {
      getState: () => this.getState(),
      resetCamera: () => this.resetCamera(),
      setGroundVisible: (isVisible) => this.setGroundVisible(isVisible),
      setSettings: (settings) => this.updateSettings(settings),
      setWaterVisible: (isVisible) => this.setWaterVisible(isVisible),
      setView: (view) => this.setView(view),
    }
    window.__waterDebug = this.debugHandle
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
    this.isDisposed = true

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
    }

    window.removeEventListener('resize', this.onResize)
    this.controls?.dispose()

    if (window.__waterDebug === this.debugHandle) {
      delete window.__waterDebug
    }

    this.scene?.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const geometry = object.geometry as THREE.BufferGeometry
        geometry.dispose()

        if (Array.isArray(object.material)) {
          for (const material of object.material) {
            const typedMaterial = material as THREE.Material
            typedMaterial.dispose()
          }
        } else {
          const typedMaterial = object.material as THREE.Material
          typedMaterial.dispose()
        }
      }
    })

    this.renderer?.dispose()

    if (this.renderer?.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(
        this.renderer.domElement
      )
    }
  }
}
