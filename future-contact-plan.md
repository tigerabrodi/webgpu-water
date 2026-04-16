# Future Contact Plan

## What This Is

This file is the future plan for water contact work.

The current renderer already does the main water body well.
This plan is for the next layer that makes the scene feel inhabited.

That means things like these.

- rocks breaking the surface.
- floating props like wood. barrels. buoys. or boats.
- foam building up around contact points.
- ripple wakes from moving objects.
- splashes and disturbance where something hits the water.

## Main Goal

Make the water react to the world instead of only looking good on its own.

That is the jump from nice shader demo to believable scene.

## What We Already Have

The current codebase already gives us a strong base.

- compute driven displacement in `src/water/compute/wave-fft.ts`
- gpu normals in `src/water/compute/normal-map.ts`
- gpu foam mask in `src/water/compute/foam-map.ts`
- cpu mirror wave math in `src/water/shaders/wave-math.ts`
- real screen depth based transmission in `src/water/materials/water-surface.ts`

The big win here is `wave-math.ts`.
That file means we can query the water on the cpu without reading gpu textures back every frame.

## Future Systems

### 1. Floating Objects

This is the first thing to build.

Simple version.

- sample water displacement at the object `x z`
- set object `y` from the sampled water height
- tilt the object from the sampled water normal

Better version.

- use 4 float points per object
- sample water under each point
- average the heights for bobbing
- use point height differences for pitch and roll
- add damping so motion feels heavy instead of twitchy

Best version.

- build a small buoyancy controller
- each float point applies spring force and drag
- let a physics body solve the final motion

### 2. Shoreline And Rock Foam

This is one of the biggest realism upgrades.

We want foam where water meets things.

That includes.

- rocks sticking through the surface
- steep basin edges
- shallow shelves
- objects that cut through the water line

Likely path.

- detect contact from scene depth difference or signed distance style masks
- blend a contact foam mask into the existing foam logic
- break it up with noise so it does not look like a white outline

### 3. Ripple And Wake Interaction

Static water looks nice.
Reactive water feels alive.

For moving objects we want.

- expanding ripples from impacts
- trailing wakes behind moving props
- local disturbance where something enters or exits the water

Likely path.

- add a small interaction texture
- write impulses into it from object movement
- let a lightweight ripple solver decay and spread those impulses over time
- mix the result into displacement. normals. and foam

### 4. Splash Layer

This is separate from the water surface itself.

The surface shader should not carry all the burden.
For harder impacts we want a cheap vfx layer too.

That can be.

- sprite particles
- mesh spray cards
- short lived foam bursts

## Suggested Build Order

### Phase 1. Floating Props

Start with one buoy or crate.

- build a `FloatingObjectController`
- sample displacement and normal from `wave-math.ts`
- make the object bob and tilt
- expose damping and follow strength as tweak values

### Phase 2. Contact Foam

- add one rock mesh breaking the surface
- generate a contact mask around the water line
- blend a noisy foam ring into the existing water foam

### Phase 3. Ripple Texture

- build a small interaction texture
- inject impulses from moving objects
- fade and spread the ripples over time

### Phase 4. Splash VFX

- add simple impact spray
- trigger it from high velocity contact events

## Code Shape I Would Use

Possible future folders.

- `src/water/interaction/`
- `src/water/buoyancy/`
- `src/water/vfx/`

Possible future files.

- `src/water/buoyancy/floating-object-controller.ts`
- `src/water/buoyancy/buoyancy.ts`
- `src/water/interaction/ripple-field.ts`
- `src/water/materials/contact-foam.ts`

## Main Risks

### Gpu And Cpu Drift

If the cpu wave query and gpu wave surface drift apart too much. floating objects will not sit exactly on the rendered water.

The answer is to keep the cpu mirror math close to the compute rules and test the important parts.

### Foam Getting Too Graphic

Contact foam can get fake very fast.
Hard white outlines are the usual failure.

It needs breakup. softness. and some directional variation.

### Too Many Systems Fighting Each Other

Displacement. foam. ripples. splashes. buoyancy. and scene depth can become a mess if we do them all at once.

That is why the build order matters.
One layer at a time.

## First Real Demo Worth Building

If we ever come back to this.
the best small demo is probably this.

- one half submerged rock
- one floating buoy
- contact foam around the rock
- soft wake behind the buoy
- one impact ripple button in the debug ui

That would prove the whole contact stack without turning the project into a giant physics game.
