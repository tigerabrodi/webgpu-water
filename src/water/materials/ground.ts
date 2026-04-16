import { WATER_BASIN_RADIUS, WATER_FLOOR_SIZE } from '@/water/constants'
import type { WaterUniforms } from '@/water/uniforms'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js'
import * as THREE from 'three/webgpu'
import {
  abs,
  mix,
  normalMap,
  positionWorld,
  pow,
  smoothstep,
  texture,
  vec2,
  vec3,
} from 'three/tsl'

export interface GroundTextures {
  basecolor: THREE.Texture
  height: THREE.Texture
  metalness: THREE.Texture
  normal: THREE.Texture
  roughness: THREE.Texture
}

let ktx2Loader: KTX2Loader | null = null

const PATINA_DARK = vec3(0.078, 0.145, 0.173)
const WATER_FOG = vec3(0.039, 0.086, 0.157)
const CAUSTICS_TINT = vec3(0.92, 0.81, 0.55)

function getKTX2Loader(renderer: THREE.WebGPURenderer): KTX2Loader {
  if (ktx2Loader) {
    return ktx2Loader
  }

  ktx2Loader = new KTX2Loader()
  ktx2Loader.setTranscoderPath('/basis/')
  ktx2Loader.detectSupport(renderer)

  return ktx2Loader
}

export async function loadGroundTextures(
  renderer: THREE.WebGPURenderer
): Promise<GroundTextures> {
  const loader = getKTX2Loader(renderer)
  const basePath = '/textures/patina'

  const [basecolor, normal, roughness, metalness, height] = await Promise.all([
    loader.loadAsync(`${basePath}/basecolor.ktx2`),
    loader.loadAsync(`${basePath}/normal.ktx2`),
    loader.loadAsync(`${basePath}/roughness.ktx2`),
    loader.loadAsync(`${basePath}/metalness.ktx2`),
    loader.loadAsync(`${basePath}/height.ktx2`),
  ])

  for (const textureItem of [basecolor, normal, roughness, metalness, height]) {
    textureItem.wrapS = THREE.RepeatWrapping
    textureItem.wrapT = THREE.RepeatWrapping
  }

  basecolor.colorSpace = THREE.SRGBColorSpace
  normal.colorSpace = THREE.NoColorSpace
  roughness.colorSpace = THREE.NoColorSpace
  metalness.colorSpace = THREE.NoColorSpace
  height.colorSpace = THREE.NoColorSpace

  return {
    basecolor,
    height,
    metalness,
    normal,
    roughness,
  }
}

export function createGroundMesh(
  uniforms: WaterUniforms,
  textures: GroundTextures
): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(
    WATER_FLOOR_SIZE,
    WATER_FLOOR_SIZE,
    400,
    400
  )
  geometry.rotateX(-Math.PI / 2)

  const positions = geometry.getAttribute('position')

  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index)
    const z = positions.getZ(index)
    const basinWarp =
      Math.sin(x * 0.78 + 0.6) * 0.08 +
      Math.cos(z * 0.64 - 0.4) * 0.06 +
      Math.sin((x - z) * 0.32) * 0.05
    const radius =
      Math.hypot(x * 0.93, z * 1.07) / WATER_BASIN_RADIUS + basinWarp
    const basinSlope = 1 - THREE.MathUtils.smoothstep(radius, 0.22, 1.0)
    const basinCore = 1 - THREE.MathUtils.smoothstep(radius, 0.0, 0.58)
    const innerRipple =
      Math.sin(x * 2.8) * Math.cos(z * 2.4) * basinSlope * 0.016
    const outerVariation =
      Math.sin(x * 0.84 + 0.8) * Math.cos(z * 0.96 - 0.5) * 0.024

    positions.setY(
      index,
      -0.24 - basinSlope * 0.2 - basinCore * 0.26 + innerRipple + outerVariation
    )
  }

  positions.needsUpdate = true
  geometry.computeVertexNormals()

  const material = new THREE.MeshPhysicalNodeMaterial()
  const textureUv = vec2(positionWorld.x, positionWorld.z).mul(0.58).toVar()
  const heightSample = texture(textures.height, textureUv).r.toVar()
  const baseColor = texture(textures.basecolor, textureUv).rgb.toVar()

  material.colorNode = (() => {
    const oxidized = mix(
      baseColor,
      PATINA_DARK,
      smoothstep(0.46, 1.0, heightSample)
    ).toVar()
    const fogFactor = smoothstep(
      0.22,
      uniforms.waterDepth.add(0.58),
      abs(positionWorld.y)
    )
      .mul(0.68)
      .toVar()

    return mix(oxidized, WATER_FOG, fogFactor)
  })()

  material.normalNode = normalMap(
    texture(textures.normal, textureUv),
    vec2(1.0)
  )
  material.roughnessNode = mix(
    texture(textures.roughness, textureUv).r,
    0.2,
    heightSample
  )
  material.metalnessNode = mix(
    texture(textures.metalness, textureUv).r,
    0.52,
    smoothstep(0.15, 0.85, heightSample)
  )
  material.emissiveNode = (() => {
    const shallowMask = smoothstep(
      0.24,
      uniforms.waterDepth.add(0.54),
      abs(positionWorld.y)
    )
      .oneMinus()
      .toVar()
    const causticsA = pow(
      smoothstep(
        0.52,
        0.9,
        abs(
          texture(
            textures.height,
            textureUv.add(
              vec2(uniforms.time.mul(0.06), uniforms.time.mul(0.02))
            )
          )
            .r.mul(2.0)
            .sub(1.0)
        ).oneMinus()
      ),
      2.2
    ).toVar()
    const causticsB = pow(
      smoothstep(
        0.48,
        0.84,
        abs(
          texture(
            textures.height,
            vec2(textureUv.y, textureUv.x)
              .mul(1.45)
              .add(vec2(uniforms.time.mul(-0.045), uniforms.time.mul(0.035)))
          )
            .r.mul(2.0)
            .sub(1.0)
        ).oneMinus()
      ),
      2.0
    ).toVar()
    const caustics = causticsA.add(causticsB).mul(shallowMask).mul(0.38).toVar()

    return CAUSTICS_TINT.mul(caustics)
  })()
  material.clearcoat = 0.12
  material.clearcoatRoughness = 0.56

  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = 'FjordGround'
  mesh.receiveShadow = true
  mesh.renderOrder = 0

  return mesh
}
