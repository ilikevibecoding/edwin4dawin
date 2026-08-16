# DSV "Tethys" — Art Direction & Engineering Contracts

One document. Every agent follows it. Deviations are integration bugs.

## Concept

An original medium deep-sea expedition submarine, late-analog era (1980s–90s): painted steel,
bakelite switches, CRT-ish amber/green instruments, hand-labeled valves. Used, maintained,
cramped, damp. NOT sci-fi, NOT abandoned, NOT neon.

## Global palette (exact values; do not invent new hues)

| Use                        | Hex        |
| -------------------------- | ---------- |
| Hull paint (upper, warm off-white) | `#cfc9b8` |
| Hull paint (mid, muted gray)       | `#9aa09c` |
| Wainscot / lower band (naval green)| `#6f7d6d` |
| Machinery dark steel               | `#3a3d42` |
| Gunmetal                           | `#2e3134` |
| Machinery blue-gray paint          | `#4e5c66` |
| Safety orange (restrained)         | `#b4602f` |
| Hazard yellow (muted)              | `#b99a45` |
| Functional red                     | `#8e3030` |
| Rubber floor                       | `#26272a` |
| Oiled steel floor                  | `#43454a` |
| Anti-slip coating                  | `#33352f` |
| Instrument green                   | `#79c98d` |
| Instrument amber                   | `#d8a04c` |
| Instrument cyan (rare)             | `#6fb3c8` |
| Warm practical light               | `#ffd9a3` |
| Cool fill light                    | `#a8c4d0` |
| Water near                         | `#0a2e33` |
| Water far                          | `#041418` |

## Coordinates & dimensions (meters)

- +Z is AFT, -Z is FORWARD (bow). +X starboard, -X port. Y up. Deck floor at y = 0.
- Pressure hull: cylinder radius **1.62**, axis at y = **0.86**, axis along Z.
- Player eye height 1.70. Visible ceiling ~2.05–2.25 at centerline (structure below hull crown).
- Frame ribs every **0.75 m** (T-profile, depth 0.11, thickness 0.05).
- Main walkway width 0.95–1.25 between equipment.

### Z layout (continuous route, ~25 m accessible)

| Zone | Z range | Notes |
| ---- | ------- | ----- |
| Bow cap + forward viewport | -1.4 … 0.4 | viewport center y 1.25, z ≈ -0.55 |
| Control room               | 0.4 … 5.8  | route x ≈ 0, periscope column x +0.42 z 5.0 |
| Bulkhead 1 + hatch         | z = 5.8    | oval opening 0.66 × 1.40, sill h 0.12 |
| Corridor / crew quarters   | 5.9 … 13.4 | bunks port z 6.6–10.6, galley stbd 8.4–10.8, washroom stbd 11.0–12.6 |
| Bulkhead 2 + hatch         | z = 13.4   | |
| Aft electrical passage     | 13.5 … 16.8| switchboards both sides |
| Frame ring (open)          | z = 16.8   | steps down 0.34 just aft |
| Engine room                | 16.8 … 23.2| deck at y = -0.34, catwalk center |
| Stern cap                  | 23.2 … 24.4| shaft gland, steering rams — NOT an empty wall |

Portholes: stbd z 6.9 y 1.5 (corridor), port z 11.5 y 1.45 (crew mess). Diameter 0.34 glass.

## Module ownership (a file has ONE owner per iteration)

| File | Owner role |
| ---- | ---------- |
| `src/layout.js` | lead (constants; read-only for everyone) |
| `src/rng.js`, `src/textures.js` | lead (helpers; additive changes only) |
| `src/materials.js` | materials agent |
| `src/submarine.js` | hull/layout agent |
| `src/greebles.js` | pipes/valves/greebles agent |
| `src/machinery.js` | aft machinery agent (reusable machines) |
| `src/controlRoom.js` | control-room agent |
| `src/corridor.js` | corridor agent |
| `src/crewQuarters.js` | crew agent |
| `src/engineRoom.js` | aft machinery agent |
| `src/water.js` | underwater agent |
| `src/environment.js` | lighting agent |
| `src/post.js` | post agent |
| `src/player.js`, `src/interact.js`, `src/hud.js` | player agent |
| `src/views.js`, `src/debug.js` | presentation agent |
| `src/main.js`, `tools/*` | lead |

## Engineering contracts

- Seeded determinism: every random via `makeRng(name)` from `src/rng.js`. NO `Math.random()`.
- Sim time: animate ONLY from `ctx.time.simTime` (seconds). Views freeze it.
- Rooms export `build(ctx) -> THREE.Group`; register colliders via `ctx.collision.addBox(min,max)`
  or `ctx.collision.addBoxFromObject(obj, pad)`. Register practical lights via
  `ctx.lights.register(fixture)` (see environment.js).
- Interactables register via `ctx.interact.register({object, prompt, onUse, highlight})`.
- Animated things register `ctx.anim.add(fn(simTime, dt))`.
- Route x ∈ [-0.35, +0.35] from z 0.8 → 23.0 must remain collision-free (checked by shots.mjs).
- Every mesh needs a material from `materials.js` — no `MeshStandardMaterial` defaults inline.
- Bevel/chamfer anything the camera gets near. No razor-edge boxes in hero views.
- Wear follows logic: hands (rails, wheels, handles), feet (deck centers), water (below cold
  pipes, drains), oil (under machines), chips (raised edges, hatch rims), dust (top recesses).
- Detail must be supported: pipes end in flanges/machines/bulkhead penetrations. Cables end in
  boxes/conduits. Brackets under pipes. Labels near what they label.
- Draw calls: static per-room geometry merged per material; repeated small parts instanced.
- Budgets: ≤ 900 draw calls, ≤ 1.6 M triangles, ≤ 80 textures, ≤ 8 shadow-casting lights.
