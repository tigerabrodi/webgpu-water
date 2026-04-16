import { WATER_FLOOR_SIZE } from '@/water/constants'
import { computeGroundHeight } from '@/water/shaders/basin-profile'
import type { WaterUniforms } from '@/water/uniforms'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js'
import * as THREE from 'three/webgpu'
import {
  abs,
  float,
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
    positions.setY(index, computeGroundHeight(x, z))
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
    const causticsUv = vec2(positionWorld.x, positionWorld.z)
      .mul(uniforms.causticsScale.mul(0.1))
      .toVar()
    const sampleA = abs(
      texture(
        textures.height,
        causticsUv.add(
          vec2(
            uniforms.time.mul(uniforms.causticsSpeed.mul(0.06)),
            uniforms.time.mul(uniforms.causticsSpeed.mul(0.02))
          )
        )
      )
        .r.mul(2.0)
        .sub(1.0)
    ).toVar()
    const sampleB = abs(
      texture(
        textures.height,
        vec2(causticsUv.y, causticsUv.x)
          .mul(1.45)
          .add(
            vec2(
              uniforms.time.mul(uniforms.causticsSpeed.mul(-0.045)),
              uniforms.time.mul(uniforms.causticsSpeed.mul(0.035))
            )
          )
      )
        .r.mul(2.0)
        .sub(1.0)
    ).toVar()
    const causticsRaw = uniforms.causticsIntensity
      .mul(uniforms.causticsOffset.sub(sampleA))
      .add(uniforms.causticsIntensity.mul(uniforms.causticsOffset.sub(sampleB)))
      .toVar()
    const caustics = smoothstep(
      float(0.5).sub(uniforms.causticsThickness),
      float(0.5).add(uniforms.causticsThickness),
      causticsRaw
    )
      .mul(shallowMask)
      .toVar()

    return CAUSTICS_TINT.mul(pow(caustics, 1.7))
  })()
  material.clearcoat = 0.12
  material.clearcoatRoughness = 0.56

  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = 'FjordGround'
  mesh.receiveShadow = true
  mesh.renderOrder = 0

  return mesh
}
