# WebGPU Water: Implementation Plan

## Reference Implementation

The reference water shader lives at `/Users/tigerabrodi/Desktop/water-from-course`. It is a WebGL Three.js project with raw GLSL shaders. We are rebuilding it with WebGPU compute shaders and TSL, with a different visual direction.

Key files in the reference:

- `src/main.js`: Scene setup, orbit controls, cube map environment, ground + water meshes.
- `src/objects/Water.js`: 512x512 plane, ShaderMaterial, FBM wave uniforms.
- `src/objects/Ground.js`: Circle geometry, caustics shader.
- `src/shaders/water.vert`: FBM simplex noise vertex displacement, 8 octaves, finite difference normals.
- `src/shaders/water.frag`: Elevation-based color, cube map reflections, fresnel blending.
- `src/shaders/caustics.frag`: Two layers of 3D simplex noise shaped with smoothstep.

## Visual Direction

Nordic fjord at sunset. Dark, moody, dramatic.

**Water palette:**
- Trough: deep navy, near black (#0a1628)
- Surface: dark steel blue (#2a4a6b)
- Peak: pale silver (#bbd8e0)
- SSS tint: emerald (#2dd4a8)
- Specular: warm copper/gold from low sun

**Sky palette:**
- Horizon: warm peach/copper (#f2c89d)
- Mid sky: dusty purple (#5a3d6b)
- Zenith: deep navy (#0a1628)
- Sun: bright copper/gold disc with halo

**Ground:** Patina PBR textures from fal.ai. Weathered oxidized copper with verdigris. Dark teals and copper browns. Caustics dance on top.

## Architecture

Three compute passes per frame, three render passes.

### Compute Pass 1: Wave Heightmap (every frame)

**What**: Generate a 256x256 2D storage texture of wave heights.

**How the reference did it**: FBM simplex noise directly in the vertex shader. Every vertex recalculates 8 octaves every frame. Redundant work for nearby vertices.

**How we do it**: One compute dispatch writes a heightmap texture. The vertex shader just samples it. Cleaner separation. And the compute path scales to FFT later.

**Initial version**: FBM simplex noise in compute. Same math as the reference, just running as a compute dispatch into a storage texture instead of per-vertex.

**Upgrade path**: Phillips spectrum + inverse FFT via butterfly passes. Physically correct wave shapes with proper energy distribution. FFT is a natural compute workload (log2(N) butterfly passes, each a dispatch).

### Compute Pass 2: Normal Map (every frame)

**What**: Generate a 256x256 2D normal map from the wave heightmap.

**How the reference did it**: Finite differences in the vertex shader. Sample three nearby points, cross product. An approximation.

**How we do it**: Compute shader reads the heightmap, samples 4 neighbors per texel (+x, -x, +z, -z), computes proper gradients, writes normals to a storage texture. More accurate, computed once per texel instead of per vertex.

### Compute Pass 3: Foam Map (every frame)

**What**: Generate a 256x256 2D foam intensity map.

**How the reference did it**: Nothing. No foam.

**How we do it**: Compute the Jacobian of the wave displacement. The Jacobian measures how much the horizontal displacement compresses the surface. Where it goes negative, the surface is folding over itself. That is where foam forms. Output a foam intensity texture. The water material blends white foam where this value is high.

### Render: Water Surface

A high-resolution plane grid displaced by the wave heightmap.

Material (TSL MeshPhysicalNodeMaterial):
- `positionNode`: sample wave heightmap, displace Y
- `normalNode`: sample compute-generated normal map
- `colorNode`: elevation-based color mixing (trough/surface/peak)
- Fresnel: `scale * pow(1 - dot(view, normal), power)`. Steep angle = see through water. Shallow angle = mirror.
- SSS: where wave is thin and sun is behind it, tint emerald/cyan. Simple approximation: `sssIntensity * pow(max(dot(lightDir, -viewDir), 0), sssExponent) * thinnessFactor`.
- Foam: white overlay where foam map intensity exceeds threshold. Soft blend.
- Reflections: procedural sky reflection via reflection vector sampling.

### Render: Ground

A circle geometry below the water plane.

Material (TSL MeshStandardNodeMaterial):
- PBR maps from KTX2 textures: basecolor, normal, roughness, metalness, height
- Caustics: two layers of scrolling 3D noise, same approach as reference but as TSL nodes
- Depth fog: `mix(groundColor, waterBodyColor, depthFog(depth, maxDepth))`. Shallow edges show patina clearly. Deep center fades to navy.

KTX2 textures loaded with Three.js KTX2Loader. GPU-compressed (UASTC + Zstandard). No PNG decoding at runtime.

### Render: Procedural Sky

Same approach as the clouds project. Gradient + sun disc.

Rendered as scene background or a large inverted sphere with TSL material.
- Gradient: horizon to zenith color ramp via `smoothstep` on UV.y
- Sun: `pow(max(dot(viewDir, sunDir), 0), exponent)` for core and halo
- Sun color: copper/gold, matches the specular on the water

## Design Decisions

**Compute for wave generation**: The reference runs wave math per-vertex in the vertex shader. This means every vertex independently computes 8 octaves of noise. With compute, we write a heightmap once and every vertex just reads a texel. Less redundant work. And compute is the only path that supports FFT later.

**Compute for normals**: Finite differences in the vertex shader are an approximation. The compute pass samples the actual heightmap with proper gradients. More accurate normals mean more accurate lighting and reflections.

**Compute for foam**: The Jacobian is a property of the displacement field, not a per-vertex thing. Computing it from the heightmap texture is natural. The reference has no foam at all.

**KTX2 textures**: GPU-compressed. The browser doesn't decode PNGs on the CPU and re-upload. The GPU reads the compressed data directly. Smaller download, faster load, less memory. We converted all 5 PBR maps (basecolor, normal, roughness, metalness, height) to KTX2 with UASTC encoding.

**Nordic fjord palette**: Darker and moodier than the reference's generic ocean colors. Deep navy water with copper/gold specular is rarer and more dramatic. The patina ground adds surreal character.

**SSS approximation**: Real subsurface scattering is expensive. The approximation is cheap: check if the sun is behind the wave crest from the viewer's perspective, and if the wave is thin (low height above baseline). If both, add an emerald/cyan tint. This is what makes Uncharted 4 water look alive.

## Implementation Order

1. Pure math functions in TypeScript + tests (wave FBM, fresnel, depth fog)
2. Water surface mesh with basic FBM displacement (TSL, no compute yet)
3. Procedural sky (gradient + sun disc)
4. Ground mesh with patina KTX2 textures (PBR material)
5. Move wave generation to compute shader (storage texture)
6. Normal map compute pass
7. Caustics on ground (scrolling noise)
8. Depth fog on ground
9. Fresnel + reflections on water
10. SSS approximation
11. Foam map compute + foam overlay
12. FFT wave upgrade (stretch goal)
