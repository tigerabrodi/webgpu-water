# compute passes

this folder is the data factory.

the renderer does not ask the water material to invent everything on the fly.
it asks the gpu to prebuild three textures.

## passes

### `wave-fft.ts`

despite the filename. this is not a full spectral ocean fft solver.
it is a layered compute driven displacement field.

it mixes two ideas.

- directional swell waves for readable large motion.
- fbm style noise for broken up natural detail.

the output texture stores this layout.

- `r` is horizontal displacement x.
- `g` is height.
- `b` is horizontal displacement z.
- `a` is spare.

that one texture becomes the shared truth for the rest of the water stack.

### `normal-map.ts`

this pass samples the displacement neighbors and builds a filtered world space normal.
it does not trust the mesh normal.
it rebuilds the normal from the actual moved surface.

that matters because the whole look of water comes from how light skates across tiny changes in slope.

### `foam-map.ts`

this pass builds a foam mask from motion stress.
the key signals are.

- horizontal compression through a jacobian style test.
- local slope.
- crest height.
- curvature.

foam only started to feel useful when we stopped gating it on compression alone.
before that. the foam sliders felt dead in calmer setups.

## why this split is worth it

- the water surface shader stays readable.
- the same displacement texture can drive normals. foam. and future effects.
- debugging gets easier because each texture has a clear job.

## the painful bits

### foam controls lied to us early on

the ui had foam knobs.
but the pass was too strict.
so most slider changes did almost nothing unless the waves were already extreme.

the fix was not a ui rewrite.
the fix was teaching the compute pass to care about cresting and curvature too.

### detail can kill the fjord feel

compute makes it easy to add more noise.
that does not mean it is a good idea.

we had to keep pushing back against busy detail because fjord water wants heavier larger shapes under the fine sparkle.

## debugging advice

if the water ever feels wrong again.

1. inspect the displacement texture first.
2. inspect the normal texture second.
3. inspect the foam mask last.

if the first pass is wrong. the others can only fail in more beautiful ways.
