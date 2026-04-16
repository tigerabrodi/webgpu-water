/**
 * Procedural sky, same approach as the clouds project.
 *
 * Nordic sunset palette:
 *   Horizon: warm peach/copper (#f2c89d)
 *   Mid sky: dusty purple (#5a3d6b)
 *   Zenith: deep navy (#0a1628)
 *
 * Sun: bright copper/gold disc with halo glow.
 * Uses dot product of view direction and sun direction.
 * Core = pow(sunAmount, 620) * intensity
 * Halo = pow(sunAmount, 46) * intensity
 *
 * Rendered as a large inverted sphere or box with TSL material.
 */

// TODO: Create sky mesh (large sphere or scene.background via TSL)
// TODO: Gradient from horizon to zenith
// TODO: Sun disc + halo based on light direction uniform
