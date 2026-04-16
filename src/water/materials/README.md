# materials

this folder is where the raw gpu data becomes the final image.

two meshes matter here.

- `ground.ts` is the basin floor with patina textures and caustics.
- `water-surface.ts` is the actual water body.

## `ground.ts`

the ground is not a flat card.
it is reshaped on the cpu from the shared basin profile.
that gives the water something real to sit over.

the material then adds.

- patina texture color and normal detail.
- underwater fogging.
- emissive caustics.

the caustics are a first class system now because they deserve their own controls.
they are not just a hidden bonus texture.

## `water-surface.ts`

this is the main look dev file.

it combines.

- compute displacement from the wave texture.
- compute normals plus micro ripple detail.
- refracted scene color.
- screen depth based transmission.
- fresnel reflection from the procedural sky.
- sun glints.
- crest glow.
- foam.

## the most important technical choice

the final transmission model uses the real scene depth behind the water pixel.
that gives a more truthful shallow versus deep read.

the split is important.

- color distortion comes from `refractedUv`.
- thickness comes from `screenUV`.

that sounds small.
it was not small.
using the refracted depth for thickness made the whole surface feel too flat and too uniformly dense.

## what made the water feel better

### less fake opacity

early versions were too eager to hide the world below.
that made the water feel like frosted glass.

the better balance was.

- let shallow areas open up.
- let deep areas absorb harder.
- keep grazing angles reflective.

### softer control mapping

another issue was that some sliders technically worked but barely spoke.
the material now maps shallow visibility. depth fog. fresnel. and reflection more directly so the ui feels more honest.

### views matter

we also learned that material work and camera work are tied together.
if `shelf` does not actually look into shallow water. users will assume the transmission code is broken even when it is not.

## if you need to change something

- change color logic here if the water mood is wrong.
- change compute passes if the water motion is wrong.
- change camera presets in `renderer.ts` if the demo shots are wrong.
