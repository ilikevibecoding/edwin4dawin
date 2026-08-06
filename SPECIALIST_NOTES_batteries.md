# SPECIALIST NOTES — Interceptor Battery Visual Quality

Owner: batteries specialist. Files: `src/batteries.js`, `tools/probe_batteries.mjs`, `shots_batteries/`, `dist-batteries/`.

Rubric (1-10): S=silhouette/proportions, D=surface detail, L=lighting response, X=launch drama, R=distance readability.

## Loop 1 — baseline audit (original art)
Shots: `shots_batteries/loop1_*.png`
Scores: S 5.5 · D 4.0 · L 5.0 · X 6.0 · R 6.0 — avg **5.3**
Perf: scene ~370 calls (day ground view), batteries ~45 calls together.
Top weaknesses:
1. All three read as "boxes on boxes": no cab detail, no wheels with real tires, no cabling.
2. Flat camo texture everywhere, no panel lines / stencils / grime; materials all same roughness.
3. Launch sequence moves but nothing on the vehicle reacts (no covers, no scorch, no recoil).

## Loop 2 — full rebuild of all three rigs
Changes: tractor+trailer TEL for RAMPART (cab, generator bed, pintle hitch, outriggers,
canister rack with per-cell membranes + instanced covers/scorch), HALBERD 8-tube open
lattice pack on 10-wheel cab-over truck, SENTINEL gantry tower + crane jib + perforated
rail + white 3-round canister rack. New procedural texture set (paintSet/treadSet/tire
tread+side/canister face/cover/scorch/girder/round/white-can). PBR pass (chrome, glass,
rubber, burnt steel), per-face auto UV by texel density, instanced covers + scorch rings,
status-light fixtures, marker lights, visual recoil, contact shadow blobs.
Shots: `shots_batteries/loop2_*.png`
Scores: S 8.0 · D 7.0 · L 7.0 · X 8.0 · R 8.0 — avg **7.6**
Perf: batteries 143 calls together (over the ~70 target) — flagged for consolidation.
Top weaknesses:
1. Glass rendered void-black (metalness reflections tinted by dark albedo).
2. Undersides/shadow faces dead black (dark IBL floor), turntable tread texture stretched.
3. Cylinder stencils wrapped around the circumference instead of running axially.

## Loop 3 — lighting + readability fixes
Changes: bright blue-gray glass (envMapIntensity 2.4), warm emissive "ground bounce" on 15
mats (dimmed at night via floodlightsOn), axial stencils on round/white cans, rack belly
ribs + cabling, turntable rebuilt (chassis wall + tread top disc), marker lights brighter at
night, cab roof AC + sun visors on both trucks.
Shots: `shots_batteries/loop3_*.png`
Scores: S 8.5 · D 7.8 · L 8.3 · X 8.5 · R 8.4 — avg **8.3**
Perf: scene 401 calls day ground view (< 420 OK, but tight); batteries 186 calls together
(126 main-pass meshes + ~60 shadow-pass draws) — 2.7x the ~70 target. MUST cut before
adding more.
Top weaknesses:
1. RAMPART canister-box side/underside: huge featureless dark slab from rear/side views.
2. Draw-call budget blown: labels are one mesh+texture each, tire side/tread are two mats,
   nearly every bucket casts shadows (doubles its cost).
3. HALBERD tubes read as uniform olive plastic — no stencil band / cap detail up close;
   night wide view: batteries nearly invisible except status lamps.

## Loop 4 — perf pass 1 + surface detail
Changes: per-rig label atlas (one canvas + one merged quad mesh per rig), shadow casting
trimmed via `mat.userData.noShadow` (steel/tread/glass/decal buckets skip the shadow map),
tire tread+sidewall folded into ONE 512x256 atlas material, HALBERD tube texture (filament
winding, hazard rings, axial stencil band, per-tube u-shift), RAMPART rack rebuilt with
proud X-braces over exposed olive canister walls (no more flat slab), scorch rings and
covers instanced, night markers brightened.
Shots: `shots_batteries/loop4_*.png`
Scores: S 8.5 · D 8.3 · L 8.3 · X 8.5 · R 8.2 — avg **8.4**
Perf: batteries 124 calls together (from 186) — still 1.8x the ~70 target.
Top weaknesses:
1. Still 124 calls: every rig re-buys the same material meshes (3x chassis, 3x steel...).
2. HALBERD cab-roof markers barely read at night; headlights inert.
3. RAMPART hydraulic rams anchored to the deck — they detach visually when the rack yaws.

## Loop 5 — perf pass 2: cross-rig world merge
Changes: RAMPART + SENTINEL statics baked into world space and merged into ONE mesh per
material shared by both rigs (`staticRoot` + WS/WD buckets with a base-matrix `setBase` on
the merge helper); ONE global label atlas for all static stencils incl. the unit roundel
(variable-height cells, image items); `hydraulicsPair` merges each ram pair into 2 meshes;
beacons deleted (status light already pulses during launch); chrome aliased to steel;
cables ride the chassis bucket. Night pass: marker lamps 6.0 emissive at night, headlight
lenses glow with the floodlights; launch status light pulse amplitude up. RAMPART rams
re-anchored to the turntable so they track yaw.
Shots: `shots_batteries/loop5_*.png`
Scores: S 8.5 · D 8.0 · L 8.5 · X 8.5 · R 8.0 — avg **8.3**
Perf: batteries 86 calls (patriot 11 + thaad 34 + sentinel 12 + shared statics 29); scene
day ground view 301 calls. THAAD dominates: its whole truck yaws, so nothing merges.
Top weaknesses:
1. HALBERD keeps 34 calls hostage because the entire truck spins in place to lay — which
   also looks silly at walk-up distance.
2. Surface score dips: rear membranes removed (girder bulkhead) left the pack rear plain.
3. Budget still 16 over the ~70 target.

## Loop 6 — HALBERD yaw pallet + final perf pass
Changes: HALBERD no longer spins its truck — the pack now lays on a slew pallet (slew-ring
base + rotating pallet plate with tread top, trunnion pedestals, ram anchor lugs, hyd power
pack, red slew-arc warning ring). The whole truck became world-static and merged into the
shared cross-rig buckets (thaad 34 -> 17 calls). Effective slew rate preserved exactly via
`rig.slewMul = 0.55`, so time-to-lay and intercept timing are unchanged. Trunnion axle
stubs merged into the pallet bucket (coaxial with the elevation axis = rotation-invariant).
`matGirderLite` (no shadow pass) for rack/pack end plates buried inside the silhouette.
Shots: `shots_batteries/loop6_*.png`, `loop6a_*.png`
Scores: S 8.5 · D 8.5 · L 8.5 · X 8.5 · R 8.3 — avg **8.46**
Perf: batteries **70 calls** (patriot 10 + thaad 17 + sentinel 12 + shared statics 31) —
ON the ~70 budget; scene day ground view 285 calls (< 420 OK).
Top weaknesses:
1. RAMPART has no blast deflector (design brief asks for one).
2. HALBERD cab roof bare from the elevated 3/4 views that dominate gameplay.
3. Night wide-distance readability still just marker dots (acceptable: rubric range is
   40-80 m, where lights + floodlit silhouettes do read).

## Loop 7 — RAMPART deflector + HALBERD roof stowage
Changes: RAMPART blast deflector (scuffed kick plate hinged under the rack rear, angled
down-away, louver ribs + side gussets — rides the rack bucket, yaws with it, elevation is
fixed so ground clearance never changes); HALBERD cab-roof stowage (strapped tarp roll +
jerry can pair on a low rail) filling the bare roof the elevated pack views stare at.
Both additions reuse bucket materials — zero extra draw calls.
Shots: `shots_batteries/loop7_*.png`, `loop7a_*.png`
Scores: S 8.6 · D 8.6 · L 8.5 · X 8.5 · R 8.3 — avg **8.5**  (first loop >= 8.5)
Perf: batteries 70 calls, scene day ground view 285 (< 420 OK). Launch/reload behavior
re-verified: full single-track intercept sequence on all three rigs, membrane pop +
scorch rings + reload states all firing.
Top weaknesses:
1. Distance readability weakest axis (8.3): day 40-80 m fine, but rigs carry no
   high-visibility range markings that would pop against the tan desert.
2. Night wide shots: silhouettes read only via lamp dots (ok in 40-80 m band).
3. Truck undersides: no mudflaps on HALBERD/RAMPART tractor rear axles (small
   grounding detail visible in the walk-up 3/4 views).

## Loop 8 — range ID boards + grounding details (FINAL)
Changes: high-visibility range identification boards (international-orange diagonals,
weathered, bolt heads) stamped on all three rigs — RAMPART trailer edge rails, HALBERD
lower cab panels, SENTINEL lower tower lattice (2 faces). All six boards share ONE
label-atlas cell (`labelStrip` now dedups repeated image items), so the whole feature
costs zero draw calls and keeps the atlas <= 1024 px. Mudflaps behind the HALBERD front
axle + rear bogie and the RAMPART tractor rear axle; amber work lamps on both truck cab
rear edges (markerMat — they come on with the floodlights at sunset/night).
Shots: `shots_batteries/loop8_*.png`, `loop8a_*.png`
Scores: S 8.6 · D 8.7 · L 8.6 · X 8.5 · R 8.4 — avg **8.56**  (second consecutive
loop >= 8.5 -> stop rule satisfied)
Perf: batteries 70 calls (patriot 10 + thaad 17 + sentinel 12 + shared statics 31),
scene day ground view 285 calls / ~246 k triangles. Full launch sequences re-verified
on all three rigs (flash, plume, membrane pop, scorch rings, reload states).

# FINAL SUMMARY

## Final rubric scores (loop 8)
| Axis | Score |
|---|---|
| Silhouette & proportions | 8.6 |
| Surface detail | 8.7 |
| Lighting response | 8.6 |
| Launch sequence drama | 8.5 |
| Distance readability | 8.4 |
| **Average** | **8.56** |
Stop rule: loops 7 (8.50) and 8 (8.56) both >= 8.5 with screenshots.

## Perf delta
- Batteries together: 45 calls (baseline look) -> 186 (loop 3 peak detail, over budget)
  -> **70 calls** (loops 6-8) — on the ~70 budget with far more visual detail.
- Whole scene, representative ground-level day view: **285 draw calls** (< 420 budget).
- All textures procedural canvas, <= 1024 px; visual RNG only (`ctx.vrng`); zero
  per-frame allocations (scratch vectors reused; all geometry/materials built once).
- Techniques: cross-rig world-space static merging (one mesh per material for ALL
  static parts of all three rigs), HALBERD converted from truck-spin to slew pallet
  (truck became static; effective slew rate preserved via `rig.slewMul`), one global
  label atlas (variable-height cells, image dedup), instanced covers/scorch rings,
  per-material shadow-cast trimming (`mat.userData.noShadow`), merged hydraulic pairs.

## Best screenshots (copied to /opt/cursor/artifacts/)
- `batteries_rampart_closeup_day.png`  (loop8a_rampart_rear34)
- `batteries_halberd_closeup_day.png`  (loop8a_halberd_front34)
- `batteries_sentinel_closeup_day.png` (loop8a_sentinel_front34)
- `batteries_rampart_launch_flash.png` (loop8_rampart_launch_flash)
- `batteries_sentinel_sunset.png`      (loop8_sentinel_sunset)
- `batteries_halberd_night.png`        (loop8a_halberd_night)

## Requests for other module owners
1. **base.js**: the pads read slightly sterile right at the vehicle wheels — a few
   oil-stain decals under the parked trucks (like the scorch decal under SENTINEL's
   deflector) would ground them further. Also the perimeter floodlight poles do not
   quite reach the RAMPART pad; one more pole near pad 1 would help night walk-ups.
2. **interceptors.js**: RAMPART cell flash originates perfectly at the muzzle; if a
   short-lived smoke ring at the muzzle plane were added it would sell the cold-launch
   pop even harder (visual only, keep timing).
3. **ui.js**: no changes needed — battery status strings map 1:1 to the status-light
   states (`ready`/`slewing`/`launching`/`reloading`).

## Behavior contract — verified unchanged
- `BATTERY_DEFS` ids/fields, `createBatteries(ctx)` signature, battery API
  (`canAccept/pointAt/launch/relax/resetAmmo/update`, `rig.group`, `displayState`).
- Launch/reload timings, ammo counts, `ctx.interceptors.launch(...)` call signature,
  muzzle position/direction logic (muzzle world positions re-checked in probe).
- `ctx.world.colliders` unchanged in count and extents (verified: colliders pushed
  from the same padWorld footprints as before).
