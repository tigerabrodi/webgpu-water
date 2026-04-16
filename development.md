# Development

## Stack

- Bun (runtime + package manager)
- Vite 8 (bundler)
- TypeScript 6 (strict mode)
- React 19
- Three.js 0.183 (WebGPU renderer + TSL)
- Tailwind CSS v4
- Vitest (testing)
- ESLint + Prettier (formatting)

## Commands

```bash
bun run dev       # Start dev server
bun run build     # Type check + build
bun tsc           # Type check only
bun lint          # ESLint
bun run format    # Prettier
bun run test      # Vitest (run once)
```

After every batch of work, run all four checks:

```bash
bun tsc && bun lint && bun run format && bun run test
```

## TDD Workflow

Tests first. See it fail. Implement. See it pass.

Pure math functions (wave FBM, fresnel, depth fog, Jacobian) get TypeScript implementations tested with vitest. The WGSL/TSL shader code mirrors the same logic.

Test files live next to the code they test:

```
src/water/shaders/wave-math.test.ts    # Wave math, fresnel, depth fog
```

## Project Structure

```
webgpu-water/
  plan.md                              # Full implementation plan
  development.md                       # This file
  CLAUDE.md                            # Agent instructions
  public/
    textures/
      patina/
        basecolor.ktx2                 # Patina color (sRGB, UASTC)
        normal.ktx2                    # Surface bumps (linear, UASTC)
        roughness.ktx2                 # Rough/smooth variation (linear, UASTC)
        metalness.ktx2                 # Metal vs oxidized (linear, UASTC)
        height.ktx2                    # Depth detail (linear, UASTC)
        diffuse.ktx2                   # Raw generated texture (sRGB, UASTC)
  src/
    main.tsx                           # React entry point
    App.tsx                            # Mounts WaterRenderer
    index.css                          # Tailwind import + fullscreen reset
    water/
      renderer.ts                      # Orchestrates all passes
      uniforms.ts                      # Shared uniforms
      sky.ts                           # Procedural sky (gradient + sun)
      compute/
        wave-fft.ts                    # Wave heightmap generation (compute)
        normal-map.ts                  # Normal map from heightmap (compute)
        foam-map.ts                    # Jacobian foam detection (compute)
      materials/
        water-surface.ts               # Water TSL material
        ground.ts                      # Ground with patina PBR + caustics
      shaders/
        wave-math.ts                   # Pure TS wave math (testable)
        wave-math.test.ts              # Tests
```

## Path Aliases

`@/` maps to `./src/`. Use it everywhere:

```ts
import { WaterRenderer } from '@/water/renderer'
```

## Code Style

- No semicolons
- Single quotes
- 2 space indent
- Trailing comma es5
- Booleans prefixed: `is`, `should`, `has`, `are`, `can`, `was`
- Arrays use `Array<T>` not `T[]`
- Max 800 lines per file

## KTX2 Textures

All patina ground textures are KTX2 with UASTC encoding + Zstandard compression. Load with Three.js KTX2Loader. These are GPU-compressed: no CPU-side PNG decode, the GPU reads them directly.

Basecolor and diffuse are sRGB. Normal, roughness, metalness, height are linear.

## Reference

The original WebGL water shader lives at `/Users/tigerabrodi/Desktop/water-from-course`. Read those shaders when porting wave logic and caustics.
