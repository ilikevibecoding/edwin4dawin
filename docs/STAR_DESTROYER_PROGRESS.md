# Star Destroyer conversion: progress log

Loop: baseline → plan → exterior silhouette → interior structure → bridge → hangar/traffic → materials,
lighting, atmosphere, audio hooks, animation → visual critique → technical verification → perf → merge
→ full review. Numbers come from `tools/check.mjs`, `tools/verify.mjs` and `tools/shots.mjs` on the
build machine (software WebGL: counts are transferable, frame times are not).

## M0 · Baseline (commit a727b08)

See `docs/BASELINE.md`: 5 rooms, 124 draw calls, 226 k tris, 22 lights always on, no exterior.

## M1 · Foundation and silhouette (commit 2178da7)

Built:
- `src/config/shipSpec.js`: hull (1600 m wedge, trench, ventral keel block), superstructure terraces,
  tower (neck, slab, domes, spire), engines, hangar well, two turbolift shafts, 4 decks, 27 rooms with
  bounds/doors/windows, 8 corridors, 8 reserved future systems.
- Interior registry: per-space kits, zone streaming (tower / engineering / hangar built on demand),
  portal culling (current space + 2 door hops), auto-derived corridors (junctions, room doors and lift
  portals become openings), instanced sliding doors with proximity logic and toggling colliders,
  turbolifts that physically carry the player (carry floors) and swap zones mid-ride, light pool (14
  points + 3 shadowed spots serve hundreds of fixtures with a constant shader light count).
- Player: walkable floors, stairs/ramps, step-up, run key; legacy freighter rooms re-themed to the
  Imperial palette and embedded as the command deck's auxiliary flight-control wing.
- Exterior skeleton with sun term injected into exterior materials (no interior light leaks), instanced
  plates / trench machinery / terrace greebles / turrets / domes / antennas / window rows in near/mid LOD
  groups, engines with glow, keel block with the real hangar well and a tractor sheet.
- Camera modes: exterior orbit/fly camera kept outside the hull, board (spline through the bridge
  windows) and exit (window bay or hangar well, fade for windowless rooms) transitions, per-mode FOV and
  near plane. Fighter traffic skeleton with `Pilot` hooks and serialisable state. Reserved systems, audio
  hooks with procedural ambience, perf monitor (fps, p95, JS ms, calls, tris, visible objects, texture MB,
  heap, load, shader compile, long tasks).

Measured (`tools/check.mjs`, 1280×720):

| View | Draw calls | Triangles | Visible objects | Lights |
| --- | --- | --- | --- | --- |
| ext_far | 245 | 108 k | 705 | 0 (sun term) |
| ext_mid | 240 | 62 k | 705 | 0 |
| ext_close | 209 | 125 k | 709 | 0 |
| bridge (shell) | 109 | 197 k | 709 | 14 |
| room:A-spine | 123 | 142 k | 709 | 14 |
| hangar (shell) | 191 | 1 133 k | 795 | 14 |
| cockpit (legacy wing) | 208 | 397 k | 709 | 16 |

Ready-to-first-frame on the build machine: ~20 s (software GL; texture generation + shader compile).
Texture memory estimate: 108 MB. Exterior draw calls are dominated by the six fighters (~35 meshes each,
fixed in the traffic workstream).

`tools/verify.mjs`: 19/19 — every room resolves to itself, doors open/close and toggle their colliders,
both lifts ride every deck carrying the player and streaming zones (tower → engineering → hangar), exit
and board transitions complete, traffic advances, reserved systems registered, budgets held.

Open issues carried into wave 1: hull too dark/flat from mid range; shells are placeholders for all 26
new rooms; hangar shell has a solid floor (well must be open); legacy cockpit key light blob (spot now
pooled without its frame shadow at that moment); exterior window rows invisible from far.

## Wave 1 (parallel workstreams, isolated worktrees)

Exterior hull detail · bridge · command-deck rooms · crew-deck rooms (2 agents) · engineering rooms ·
hangar deck + machinery · fighter traffic. Ownership per `docs/AGENT_GUIDE.md`. Results recorded below
after integration.
