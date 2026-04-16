# shader math

this folder is the test bench.

the pure math lives here in plain typescript first when it can.
then the renderer mirrors the same idea in tsl or gpu code.

that buys us three things.

- we can do tdd on the hard parts.
- we can explain the math without drowning in rendering code.
- we can catch regressions before they turn into visual mysteries.

## files

### `wave-math.ts`

this is the readable wave model mirror.
it covers fbm elevation. directional wave sampling. normals. and helper math.

it exists because once the water logic gets layered enough. it becomes too easy to cargo cult numbers in the gpu pass.
this file gives us a clean place to reason about the shape.

### `basin-profile.ts`

this is the shared fjord floor shape.
the ground mesh uses it directly.
we also used it earlier as a transmission cheat before moving to real screen depth.

keeping it pure still matters because the basin shape is a real input to the look.

### `transmission.ts`

this is the mirror for shallow versus deep water math.
it tests thickness. optical depth. and transmission visibility.

the big lesson here was that physically nicer code on paper can still look worse if the view angle response is too harsh.
we had to soften the angle gate so shallow water stayed visible even when looking across the surface.

### `caustics.ts`

this is the small math core for the ground caustics controls.
it keeps the behavior testable and easier to port.

## the journey notes that matter

### readable math beat clever looking shader piles

it was tempting to keep stuffing more logic into the final water material.
that made tuning worse fast.

the better path was to keep pulling important rules back into pure helpers.
that is how the renderer stayed understandable while the look got better.

### a side project still deserves clean math

it is tempting to say this is just visual work and skip tests.
that is how shader projects turn into superstition.

every pure part we could isolate made the rest of the renderer easier to trust.

## rule of thumb

if a number feels magical and important.
it probably belongs in a pure helper with a test before it belongs in a giant material expression.
