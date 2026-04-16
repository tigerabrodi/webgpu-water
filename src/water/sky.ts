import type { WaterUniforms } from '@/water/uniforms'
import {
  Fn,
  abs,
  dot,
  float,
  max,
  mix,
  normalize,
  positionWorldDirection,
  pow,
  smoothstep,
  vec3,
  vec4,
} from 'three/tsl'

const HORIZON_COLOR = vec3(0.337, 0.239, 0.212)
const MID_SKY_COLOR = vec3(0.192, 0.149, 0.255)
const ZENITH_COLOR = vec3(0.023, 0.055, 0.114)
const AFTERGLOW_COLOR = vec3(0.749, 0.49, 0.318)

export const createSkyColorNode = Fn<
  {
    direction: ReturnType<typeof vec3>
    sunColor: WaterUniforms['sunColor']
    sunDirection: WaterUniforms['sunDirection']
  },
  ReturnType<typeof vec3>
>(({ direction, sunColor, sunDirection }) => {
  const viewDirection = normalize(direction).toVar()
  const horizonMix = smoothstep(-0.18, 0.32, viewDirection.y).toVar()
  const zenithMix = smoothstep(0.08, 0.92, viewDirection.y).toVar()
  const base = mix(HORIZON_COLOR, MID_SKY_COLOR, horizonMix).toVar()
  base.assign(mix(base, ZENITH_COLOR, zenithMix))

  const sunsetBand = pow(
    float(1.0).sub(abs(viewDirection.y)).max(0.0),
    4.5
  ).toVar()
  base.addAssign(AFTERGLOW_COLOR.mul(sunsetBand).mul(0.24))

  const sunAmount = max(
    dot(viewDirection, normalize(sunDirection)),
    0.0
  ).toVar()
  const sunHalo = pow(sunAmount, 62.0).mul(0.34).toVar()
  const sunCore = pow(sunAmount, 920.0).mul(1.1).toVar()

  return base.add(sunColor.mul(sunHalo.add(sunCore)))
})

export function createSkyBackgroundNode(uniforms: WaterUniforms) {
  return vec4(
    createSkyColorNode({
      direction: positionWorldDirection,
      sunColor: uniforms.sunColor,
      sunDirection: uniforms.sunDirection,
    }),
    1.0
  )
}
