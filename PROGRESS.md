# Progress

## Current status

- Iteration: 0 (scaffolding)
- Consecutive all-pass iterations: 0
- Average FPS: n/a
- One-percent-low FPS: n/a
- Average frame time: n/a
- Draw calls: n/a
- Triangle count: n/a
- Texture count: n/a
- Renderer: SwiftShader (software) in CI — FPS numbers are indicative only, not a
  hardware benchmark. Target hardware is a mid-range laptop GPU.
- Stopping-condition status: not met

## Iteration 0 (base build)

### Implemented

- Project scaffolding: Vite + three 0.185 + Playwright + n8ao.
- ART_DIRECTION.md with palette, dimensions, ownership, engineering contracts.
- Core systems: seeded RNG, canvas texture toolkit, 12+ PBR material families,
  collision (capsule vs AABB + hull clamp + step assist), greeble kits (pipes,
  valves, gauges, cables, rails, grates, lamps, fans), static merge, instanced
  fasteners.
- Pressure hull: curved shell w/ porthole cutouts, T-profile ribs, bulkheads with
  open pressure doors, forward viewport bulkhead, stern dome, decks + bilge.
- Rooms v1: control room (helm/sonar/nav + animated displays), corridor + aft
  electrical passage, crew quarters (bunks/galley/mess/washroom), engine room
  (motor, gear, shaft, pumps, manifold, compressor, cabinets, hoist, fans).
- Underwater exterior: backdrop, 3 particle layers + silt + bubbles + biolum,
  rock conveyor + ridges, seabed, floodlight cones.
- Lighting states (cruising/restCycle/silentRunning/maintenanceLights), PMREM.
- Player (pointer lock, WASD, bob, sway), HUD, 3 interactions, post chain
  (N8AO + bloom + ACES + grade), debug API, Playwright suite.
