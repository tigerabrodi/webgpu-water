# webgpu water

compute driven fjord water in webgpu with three.js tsl.

- gpu wave displacement
- gpu normal and foam passes
- real screen depth transmission
- procedural sky and sun reflections
- patina ground and caustics
- live tweak ui with presets and debug controls

## run

```bash
bun install
bun run dev
```

## checks

```bash
bun tsc && bun lint && bun run format && bun run test
```

## where to look

- `src/water/README.md`
- `src/water/compute/README.md`
- `src/water/materials/README.md`
- `src/water/shaders/README.md`
