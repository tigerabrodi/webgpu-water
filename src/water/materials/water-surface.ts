/**
 * Water surface TSL material.
 *
 * Vertex: displace plane vertices by sampling wave heightmap texture.
 * Fragment:
 *   - Elevation-based color (deep navy troughs, lighter surface, white peaks)
 *   - Fresnel: steep angle = see through, shallow angle = mirror
 *   - Cube map or procedural reflections
 *   - SSS: thin wave crests glow emerald/cyan when backlit
 *   - Foam: white overlay where foam map intensity is high
 *   - Normal perturbation from compute-generated normal map
 *
 * Nordic fjord palette:
 *   Trough: deep navy / near black (#0a1628)
 *   Surface: dark steel blue (#2a4a6b)
 *   Peak: pale silver (#bbd8e0)
 *   SSS tint: emerald (#2dd4a8)
 *   Specular: warm copper/gold from low sun
 */

// TODO: Create MeshStandardNodeMaterial or MeshPhysicalNodeMaterial
// TODO: positionNode = displace Y by sampling wave heightmap
// TODO: normalNode = sample compute-generated normal map
// TODO: colorNode = elevation-based color mixing
// TODO: Add fresnel blending for reflection
// TODO: Add SSS approximation for backlit crests
// TODO: Add foam overlay from foam map
