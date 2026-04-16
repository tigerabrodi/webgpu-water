# water system

this folder is the whole renderer.

if you want the shortest mental model.

- `renderer.ts` owns the scene. camera. lights. compute dispatch. and view presets.
- `compute/` writes the moving data textures on the gpu.
- `materials/` turns those textures into visible water and ground.
- `shaders/` holds the pure math mirrors that we can test in typescript.
- `sky.ts` gives the procedural sky that the water reflects.
- `settings.ts` is the live tweak surface.

## frame flow

every frame does this.

1. update uniforms from the live settings.
2. run the wave compute pass.
3. run the normal compute pass from the wave texture.
4. run the foam compute pass from the wave texture.
5. render the ground.
6. render the water on top with refraction. reflection. foam. and transmission.

the big design choice is simple.

we do not fake everything inside one giant fragment shader.
we let the gpu build intermediate textures first.
that keeps the wave logic reusable and easier to debug.

## what feels most important here

the water only started to feel real when three things lined up.

- enough large scale displacement to read as body.
- enough small scale normal detail to catch light.
- a believable shallow versus deep transition.

if one of those is weak. the whole thing collapses into flat blue plastic.

## the hard lessons

### real depth based transmission mattered more than another color tweak

we first had a basin driven cheat for the under water read.
it was useful early.
but it made the water feel canned because the shader was not reacting to the real scene behind the current pixel.

the final fix was to read screen depth behind the water surface and build thickness from that in `materials/water-surface.ts`.

### refraction color and transmission thickness are not the same sample

one of the nastiest bugs was using the refracted depth sample for thickness.
that sounded logical at first.
but it made the water read too uniformly deep and too mushy.

the better split was this.

- use refracted uv for the color sample.
- use the current pixel depth for physical thickness.

that made shelf views and shallow reads much more honest.

### camera presets are part of the renderer

we treated the views like ui sugar at first.
that was wrong.
if the presets do not show different strengths of the water. the whole demo feels weaker than the code really is.

that is why `renderer.ts` now treats `horizon`. `shelf`. `glide`. and `storm` as real presentation tools.

## where to read next

- `compute/README.md` for how the gpu textures are built.
- `materials/README.md` for how the visible look is assembled.
- `shaders/README.md` for the testable math and the translation strategy.
