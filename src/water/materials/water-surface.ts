import {
  WATER_BASIN_RADIUS,
  WATER_SURFACE_SEGMENTS,
  WATER_WORLD_SIZE,
} from '@/water/constants'
import { createSkyColorNode } from '@/water/sky'
import type { WaterUniforms } from '@/water/uniforms'
import * as THREE from 'three/webgpu'
import {
  clamp,
  cameraPosition,
  dot,
  float,
  length,
  max,
  mix,
  normalize,
  positionLocal,
  positionWorld,
  pow,
  reflect,
  screenUV,
  smoothstep,
  texture,
  uv,
  vec2,
  vec3,
  viewportSafeUV,
  viewportSharedTexture,
} from 'three/tsl'

interface WaterSurfaceTextures {
  displacementTexture: THREE.StorageTexture
  foamTexture: THREE.StorageTexture
  normalTexture: THREE.StorageTexture
}

const TROUGH_COLOR = vec3(0.052, 0.098, 0.168)
const SURFACE_COLOR = vec3(0.165, 0.29, 0.42)
const PEAK_COLOR = vec3(0.384, 0.518, 0.632)
const SSS_TINT = vec3(0.176, 0.831, 0.659)
const FOAM_TINT = vec3(0.968, 0.979, 0.988)
const COPPER_RIM = vec3(0.922, 0.655, 0.38)
const ABSORPTION_TINT = vec3(0.092, 0.204, 0.284)

export function createWaterSurfaceMesh(
  uniforms: WaterUniforms,
  textures: WaterSurfaceTextures
): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(
    WATER_WORLD_SIZE,
    WATER_WORLD_SIZE,
    WATER_SURFACE_SEGMENTS,
    WATER_SURFACE_SEGMENTS
  )
  geometry.rotateX(-Math.PI / 2)

  const material = new THREE.NodeMaterial()
  material.transparent = true
  material.depthWrite = true
  const waterUv = uv().toVar()
  const displacementSample = texture(
    textures.displacementTexture,
    waterUv
  ).toVar()
  const displacement = displacementSample.rgb.toVar()
  const displacedLocal = positionLocal.add(displacement).toVar()
  const encodedNormal = texture(textures.normalTexture, waterUv).rgb.toVar()
  const macroNormal = normalize(encodedNormal.mul(2.0).sub(1.0)).toVar()
  const worldXZ = vec2(displacedLocal.x, displacedLocal.z).toVar()
  const detailTiling = uniforms.waveFrequency
    .mul(7.2)
    .add(uniforms.wavePersistence.mul(11.5))
    .toVar()
  const detailMotion = uniforms.time
    .mul(uniforms.waveSpeed.mul(4.2).add(0.04))
    .toVar()
  const ripplePhaseA = worldXZ.x
    .mul(detailTiling)
    .add(worldXZ.y.mul(detailTiling.mul(0.58)))
    .add(detailMotion)
    .toVar()
  const ripplePhaseB = worldXZ.y
    .mul(detailTiling.mul(1.28))
    .sub(worldXZ.x.mul(detailTiling.mul(0.74)))
    .sub(detailMotion.mul(1.18))
    .toVar()
  const ripplePhaseC = worldXZ.x
    .mul(detailTiling.mul(1.72))
    .sub(worldXZ.y.mul(detailTiling.mul(1.06)))
    .add(detailMotion.mul(1.52))
    .toVar()
  const rippleStrength = uniforms.waveAmplitude
    .mul(5.2)
    .add(uniforms.waveChoppiness.mul(1.25))
    .add(uniforms.wavePersistence.mul(0.18))
    .toVar()
  const microRipple = vec3(
    ripplePhaseA
      .sin()
      .mul(0.022)
      .add(ripplePhaseB.cos().mul(0.017))
      .add(ripplePhaseC.sin().mul(0.012)),
    0.22,
    ripplePhaseA
      .cos()
      .mul(0.021)
      .add(ripplePhaseB.sin().mul(0.016))
      .add(ripplePhaseC.cos().mul(0.013))
  )
    .mul(rippleStrength)
    .toVar()
  const surfaceNormal = normalize(
    vec3(
      macroNormal.x.add(microRipple.x),
      macroNormal.y.add(microRipple.y),
      macroNormal.z.add(microRipple.z)
    )
  ).toVar()
  const refractionOffset = vec2(surfaceNormal.x, surfaceNormal.z)
    .mul(0.0065)
    .mul(
      uniforms.waveAmplitude
        .mul(12.0)
        .add(uniforms.waveChoppiness.mul(1.8))
        .add(0.12)
    )
    .toVar()
  const refractedUv = viewportSafeUV(screenUV.add(refractionOffset))
  const refractionSample = viewportSharedTexture(refractedUv).toVar()
  const refractionColor = refractionSample.rgb.toVar()
  const viewDirection = normalize(cameraPosition.sub(positionWorld)).toVar()
  const nDotV = max(dot(viewDirection, surfaceNormal), 0.0).toVar()
  const basinWarp = worldXZ.x
    .mul(0.78)
    .add(0.6)
    .sin()
    .mul(0.08)
    .add(worldXZ.y.mul(0.64).sub(0.4).cos().mul(0.06))
    .add(worldXZ.x.sub(worldXZ.y).mul(0.32).sin().mul(0.05))
    .toVar()
  const radialDistance = length(vec2(worldXZ.x.mul(0.93), worldXZ.y.mul(1.07)))
    .div(WATER_BASIN_RADIUS)
    .add(basinWarp)
    .toVar()
  const basinSlopeFactor = float(1.0)
    .sub(smoothstep(0.22, 1.0, radialDistance))
    .toVar()
  const basinCoreFactor = float(1.0)
    .sub(smoothstep(0.0, 0.58, radialDistance))
    .toVar()
  const opticalDepth = uniforms.waterDepth
    .mul(0.96)
    .add(basinSlopeFactor.mul(0.18))
    .add(basinCoreFactor.mul(0.26))
    .add(0.12)
    .toVar()
  const surfaceDensity = uniforms.waterOpacity
    .mul(0.82)
    .add(opticalDepth.mul(0.64))
    .add(0.1)
    .toVar()
  const refractionVisibility = pow(nDotV, 3.6)
    .mul(uniforms.waterClarity)
    .mul(float(1.0).sub(surfaceDensity.mul(0.58)))
    .mul(
      float(1.0).sub(basinSlopeFactor.mul(0.4).add(basinCoreFactor.mul(0.3)))
    )
    .toVar()
  const surfaceOpacity = clamp(
    clamp(
      uniforms.waterOpacity
        .mul(0.58)
        .add(0.4)
        .add(pow(float(1.0).sub(nDotV), 1.65).mul(0.18))
        .sub(refractionVisibility.mul(0.12)),
      0.62,
      1.0
    )
      .add(basinSlopeFactor.mul(0.04))
      .add(basinCoreFactor.mul(0.06)),
    0.62,
    1.0
  ).toVar()

  material.positionNode = positionLocal.add(displacement)
  material.normalNode = surfaceNormal
  material.opacityNode = surfaceOpacity
  material.colorNode = (() => {
    const height = displacement.y.toVar()
    const foamAmount = texture(textures.foamTexture, waterUv).r.toVar()
    const reflectionDirection = normalize(
      reflect(viewDirection.negate(), surfaceNormal)
    ).toVar()
    const reflectionColor = createSkyColorNode({
      direction: reflectionDirection,
      sunColor: uniforms.sunColor,
      sunDirection: uniforms.sunDirection,
    }).toVar()
    const nDotL = max(dot(surfaceNormal, uniforms.sunDirection), 0.0).toVar()
    const troughMix = smoothstep(
      uniforms.troughThreshold.sub(uniforms.troughTransition),
      uniforms.troughThreshold.add(uniforms.troughTransition),
      height
    ).toVar()
    const peakMix = smoothstep(
      uniforms.peakThreshold.sub(uniforms.peakTransition),
      uniforms.peakThreshold.add(uniforms.peakTransition),
      height
    ).toVar()
    const baseColor = mix(
      mix(TROUGH_COLOR, SURFACE_COLOR, troughMix),
      PEAK_COLOR,
      peakMix
    ).toVar()
    const directLight = baseColor
      .mul(0.22)
      .add(baseColor.mul(nDotL).mul(0.82))
      .toVar()
    const reflectedSun = normalize(
      reflect(uniforms.sunDirection.negate(), surfaceNormal)
    ).toVar()
    const glintNoise = ripplePhaseA
      .sin()
      .mul(0.46)
      .add(ripplePhaseB.cos().mul(0.34))
      .add(ripplePhaseC.sin().mul(0.2))
      .mul(0.5)
      .add(0.5)
      .toVar()
    const broadSunSpecular = pow(
      max(dot(viewDirection, reflectedSun), 0.0),
      118.0
    )
      .mul(uniforms.sunColor)
      .mul(0.62)
      .toVar()
    const tightSunSpecular = pow(
      max(dot(viewDirection, reflectedSun), 0.0),
      420.0
    )
      .mul(smoothstep(0.54, 0.9, glintNoise))
      .mul(uniforms.sunColor)
      .mul(1.18)
      .toVar()
    const sunSpecular = broadSunSpecular.add(tightSunSpecular).toVar()
    const fresnelTerm = uniforms.fresnelScale
      .mul(pow(float(1.0).sub(nDotV), uniforms.fresnelPower))
      .toVar()
    const rimWarmth = pow(float(1.0).sub(nDotV), 5.5)
      .mul(COPPER_RIM)
      .mul(0.22)
      .toVar()
    const crestMask = smoothstep(
      uniforms.peakThreshold.sub(uniforms.peakTransition.mul(0.25)),
      uniforms.peakThreshold.add(uniforms.peakTransition.mul(0.9)),
      height
    ).toVar()
    const backScatter = pow(
      max(dot(viewDirection, uniforms.sunDirection.negate()), 0.0),
      3.5
    ).toVar()
    const sss = SSS_TINT.mul(crestMask)
      .mul(backScatter)
      .mul(uniforms.sssIntensity)
      .toVar()
    const foamBreakup = ripplePhaseA
      .sin()
      .mul(0.5)
      .add(ripplePhaseB.cos().mul(0.35))
      .add(ripplePhaseC.sin().mul(0.15))
      .mul(0.5)
      .add(0.5)
      .toVar()
    const absorbedRefraction = mix(
      refractionColor
        .mul(ABSORPTION_TINT.mul(surfaceDensity.mul(0.82).add(0.18)))
        .add(TROUGH_COLOR.mul(0.28)),
      TROUGH_COLOR.mul(1.06)
        .add(SURFACE_COLOR.mul(0.22))
        .add(ABSORPTION_TINT.mul(0.08)),
      basinSlopeFactor.mul(0.58).add(basinCoreFactor.mul(0.38))
    ).toVar()
    const transmissionColor = mix(
      mix(TROUGH_COLOR, baseColor, nDotV.mul(0.38).add(0.12)),
      absorbedRefraction,
      refractionVisibility.mul(0.82)
    ).toVar()
    const foamCoverage = foamAmount
      .mul(crestMask.mul(0.88).add(0.12))
      .mul(foamBreakup.mul(0.58).add(0.42))
      .toVar()
    const foamMask = smoothstep(0.14, 0.56, foamCoverage).toVar()
    const foamColor = mix(PEAK_COLOR, FOAM_TINT, 0.68)
      .add(COPPER_RIM.mul(0.06))
      .toVar()
    const silverCrest = PEAK_COLOR.mul(crestMask).mul(0.035).toVar()
    const shadedWater = directLight
      .add(sunSpecular)
      .add(rimWarmth)
      .add(sss)
      .add(silverCrest)
      .toVar()
    const reflectedWater = mix(
      transmissionColor
        .mul(surfaceDensity.mul(0.18).add(0.78))
        .add(shadedWater.mul(0.42)),
      reflectionColor
        .mul(uniforms.reflectionStrength.mul(0.82).add(0.18))
        .add(sunSpecular),
      clamp(fresnelTerm, 0.0, 1.0)
    ).toVar()

    return mix(reflectedWater, foamColor, foamMask)
  })()

  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = 'WaterSurface'
  mesh.receiveShadow = false
  mesh.renderOrder = 2

  return mesh
}
