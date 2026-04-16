# Agent Instructions

## What This Project Is

A WebGPU water renderer using Three.js TSL. Nordic fjord at sunset. Dark moody water with copper/gold specular, patina copper ground, procedural sky.

Rebuilt from a reference WebGL implementation at `/Users/tigerabrodi/Desktop/water-from-course`.

Read `plan.md` for the full architecture and implementation plan.
Read `development.md` for project structure and code style.

Also reference the WebGPU clouds project at `/Users/tigerabrodi/Desktop/webgpu-clouds` for patterns. That project uses the same TSL/compute approach and has working examples of storage textures, compute dispatches, procedural sky, and fullscreen compositing.

## After Every Batch of Work

Run all four checks:

```bash
bun tsc && bun lint && bun run format && bun run test
```

Fix any failures before moving on.

## TDD

Tests first. Write the test. See it fail. Implement. See it pass. Zero mocking ever.

Pure math functions (wave FBM, fresnel, depth fog, Jacobian) get TypeScript implementations tested with vitest.

## Code Style

- No semicolons, single quotes, trailing comma es5
- Use `@/` path alias for all imports
- Booleans prefixed: `is`, `should`, `has`, `are`, `can`, `was`
- Arrays: `Array<T>` not `T[]`
- Max 800 lines per file
- Do not start the dev server. The user runs it themselves.

## KTX2 Textures

Ground textures are at `public/textures/patina/*.ktx2`. Load with KTX2Loader from Three.js. These are UASTC + Zstandard compressed. Basecolor and diffuse are sRGB. Normal, roughness, metalness, height are linear.

## WebGPU Patterns

Use TSL for materials and simple compute. Use `wgslFn` for heavy math if needed. Use `Fn` + `compute` for compute dispatches. Storage textures for inter-pass data.

Reference the clouds project compute passes for working examples of:
- `Storage3DTexture` creation and `textureStore` writes
- `computeKernel` and `setCount` for workgroup dispatch
- `globalId` for thread indexing
- `mx_fractal_noise_float` and `mx_worley_noise_float` for built-in TSL noise

## Reference

The original GLSL shaders at `/Users/tigerabrodi/Desktop/water-from-course/src/shaders/` are the ground truth for wave math and caustics. When porting a function, read the GLSL first, understand it, then write the TSL/WGSL equivalent.

Key reference files:
- `water.vert`: FBM simplex noise displacement, finite difference normals
- `water.frag`: Elevation color, fresnel, cube map reflections
- `caustics.frag`: Two-layer 3D simplex noise caustics
