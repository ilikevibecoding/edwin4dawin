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

## Wave 1 (parallel workstreams, isolated worktrees) — integrated at commit 142031b

Eight agents, eight branches, each owning disjoint files (`docs/AGENT_GUIDE.md`): exterior hull detail
(`src/exterior/*`), bridge, command-deck rooms, crew-deck rooms (two agents), engineering rooms, hangar
deck + `src/hangar/machinery.js`, fighter traffic (`src/hangar/traffic.js`, `tie.js`). Two merge conflicts
(both in `src/exterior/hull.js`: the tractor sheet, the keel-plate hole sign) resolved by hand.

Shared fixes made during integration from the agents' reports: space resolution tolerates 2.6 m pits;
pooled spots honour each fixture's shadow range; light pool skips fixtures in culled spaces and favours
the current room; portal culling never draws rooms behind a second door; thin-wall-safe panel backing
plates; legacy mirror reflects only within 4.5 m; ventral keel raised so the hangar keel block is the
lowest point (the old hull wedge cut through the well); tractor sheet faces down and is faint; the lit
hangar is shown through the well from below the ship; `roomShell` accepts panel pitch / style mix;
touch controls for phones.

All 27 spaces now have finished interiors; the exterior has plating with sun + fill shading, layered
plates, trench machinery, superstructure city, turrets, engines, running lights; fighters are 3 meshes
with an instanced far LOD.

`tools/verify.mjs` on the integrated branch: 19/20 — the one failure is the legacy flight-control wing
view at 332 draw calls against the 320 budget (its five freighter rooms are one space with ~35
materials; portal culling has since been tightened).

`tools/shots.mjs sd1_wave1` (build snapshot, 1280×720, 56 frames + checks; drift, interactions,
transitions and lift ride all pass):

| View | Calls | Triangles | Lights |
| --- | --- | --- | --- |
| ext_far | 79 | 152 k | sun term |
| ext_mid | 87 | 119 k | sun term |
| ext_close | 95 | 192 k | sun term |
| ext_tower | 92 | 200 k | sun term |
| ext_belly | 116 | 277 k | sun term |
| bridge | 193 | 441 k | 15 |
| bridgeAft (looks down the spine) | 348 | 663 k | 13 |
| hangarDeck | 132 | 285 k | 15 |
| room:reactor | 124 | 289 k | 14 |
| room:medbay | 262 | 593 k | 14 |
| room:lounge | 246 | 634 k | 14 |
| room:B-spine (corridor, sees every crew-deck door) | 327 | 674 k | 14 |
| room:cargo | 90 | 255 k | 15 |

Totals: 121 MB estimated texture memory (108 baseline), 85 shader programs, 1.7 s shader compile on the
build machine, JS heap 253 MB (includes the procedural texture canvases), zone build 1.1 s / 0.4 s / 0.3 s
(tower / engineering / hangar) on the build machine, ready in 26 s here (software GL).

Review after this merge: three independent visual critics (exterior, decks A+B, decks C+D) and one
technical reviewer; their fix lists drive wave 2.
