# Battle of Coruscant — progress log

Live: `<tunnel>/battle.html` (same dev server as the ISD walkthrough; the ISD start card links to it).
Plan and rubric: `docs/BATTLE_OF_CORUSCANT_PLAN.md`. Contributor guide: `docs/BATTLE_AGENT_GUIDE.md`.

## Skeleton (integrator)

- `battle.html` + `src/battle/main.js`: renderer/post (no AO, stronger bloom), orbit/fly camera without the
  ISD hull clamp, cinematic autopilot (C), touch orbit/pinch + Cinematic button, adaptive pixel ratio,
  debug API (`views`, `setView`, `advanceSim`, `setPaused/renderFrame`, `battleStats`, `battleState`,
  `setCinematic`, `capturePixels`).
- `fleet.js`: instanced capital ships, per-instance LOD buckets (2.2 km / 9 km), per-instance colour
  (damage tint), hardpoints, area-weighted hull surface sampling for impacts, oriented bounds +
  `containsPoint`.
- Placeholder models for Venator / Providence / Munificent / Recusant, five fighter types, pooled bolts,
  instanced fireball/flak/fire/smoke shader, Coruscant night-side city planet (no halo), star field.
- `tools/battle-verify.mjs` (views within budget, pixel probes, 3-minute sim health, fighters vs hulls,
  cinematic hull clearance, JS cost, page errors) and `tools/battle-video.mjs` (offline cinematic MP4).

### Skeleton measurements (software GL, 960×540)

| view | draw calls | triangles | JS ms |
| --- | --- | --- | --- |
| wide (11 km) | 80 | 191 k | 3.7 |
| venator_close | 73 | 211 k | 2.1 |
| providence_close | 84 | 196 k | 1.5 |

3-minute fixed-step sim: 26 k bolts fired, peak 357 in flight, peak 1 172 particles, update 0.14 ms/step.
Harness failures handed to workstreams: planet warmth (planet), kill rate 25/41 in 60 s (choreography),
fighters inside hulls (fighters), hero-pass camera intrusion (choreography).

## Wave 1 (parallel worktrees, all merged)

| workstream | result |
| --- | --- |
| Venator-class | hero model 36.7k / 11.0k / 1.5k tris per LOD, 8 heavy + 20 light hardpoints, 10 engines, `buildVenatorOpen` doors-parted variant (used for ~30 % of the line) |
| Providence-class | 31.7k / 7.0k / 1.1k tris, 46 hardpoints, 9 engines, flank hangar slots, tall command fin + pod |
| Munificent / Recusant | 17.6k / 7.5k / 1.2k and 13.9k / 7.0k / 1.2k tris; crescent pincer prow, aft bulb, engine ring; skeletal frame cage, spear tip, wide aft slab |
| Fighters | 7 types ≤ 300 tris, one BatchedMesh + glow layer (2 draw calls / 370 fighters), no-fly zones, flights, dogfights, respawn from hangars; `fighters.update` 0.15 ms |
| Weapons & effects | ribbon bolts (1 draw call), staged impacts, shield ripples, burning wounds with plumes, staged detonations, debris pool; 4 draw calls total |
| Planet & environment | analytic 5-level Voronoi city with AA line widths, bake 1.1 s, 16 MB textures, key light 5.4 from the starboard bow + warm planet fill (deck 161–196 / flank 67–69 / belly 127–130 sRGB) |
| Choreography & camera | 46-ship deterministic layout, salvos + density controller (80–140 heavy bolts in flight), damage director (≤ 4 deaths / 3 min, reinforcements), 11 cinematic shots clear of hulls; `battle.update` 0.18 ms avg |

Integrator wiring: shield ripples while `hits < 0.35 hp`, hulk-velocity detonations, fighter-vs-fighter hits
feed fighter health, capital point defence against fighters, ship-relative view yaw, fighter hull cache
follows reinforcements, debris + muzzle flashes attached in `main.js`, live dev server re-optimised (a
stale dep cache had produced two three.js instances).

### Integrated measurements (software GL, 1280×720, 4 review agents loading the machine)

| view | draw calls | triangles | JS ms |
| --- | --- | --- | --- |
| wide (11 km) | 72 | 254 k | 1.2 |
| venator_close | 90 | 454 k | 1.3 |
| venator_towers | 84 | 469 k | 2.4 |
| broadside | 86 | 592 k | 1.3 |
| melee_below | 85 | 579 k | 1.0 |

`tools/battle-verify.mjs`: **14/14** — max 101 calls / 0.59 M tris over 33 views; 62 k bolts fired in
190 s, peak 400 in flight, peak 2 007 particles; 46/50 ships alive after 3 min with 4 staged deaths and
4 reinforcements; 0 fighters inside hulls; cinematic camera never inside a hull; `battle.update`
≤ 0.53 ms per 1/60 step; texture memory 36 MB; production build 229 kB (gzip 81 kB) for the battle
entry plus the shared 906 kB three.js chunk.

## Review wave 1 (independent critics + technical review on the integrated scene)

Scores on the 18-point rubric (1–5 each), before the fix wave:

| class | total | strongest | weakest |
| --- | --- | --- | --- |
| Venator | 47/90 (mean 2.6) | silhouette 4, towers 4, LOD 4 | weathering 1, damage variety 1, plating 2, engines 2, lighting 2, belly 2, scale 2, motion 2 |
| Providence | 52/90 | silhouette 4, colour 4, LOD 4 | weathering 1, hangar strip 2, plating 2, engines 2, rear detail 2, belly 2, damage 2 |
| Munificent | 49/90 | silhouette 4, colour 4, LOD 4 | engines 1 (opaque cones), weathering 1, plating 2, rear detail 2, belly 2, damage 2 |
| Recusant | 51/90 | silhouette 4, scale cues 4, orientation 4 | weathering 1, damage 1, bow 2, plating 2, rear detail 2 |

Battle composition critic: 2.4/5 overall — orientation variety 4, sky 3.5, density 3; lighting 2 (khaki,
no key/fill edge), impacts 2, fighters-in-frame 2, planet 2 (stained-glass Voronoi), detonations 1.5,
far bolts 2.5 (confetti), pacing 2.5, HUD overlap 2.

Technical review: no stability blockers (heap flat over 40 simulated minutes, 27 programs constant,
pools bounded, depth precision fine to 30 km); one design blocker — particle-budget guards compared
against the two-layer `alive` sum and suppressed fires/ripples/venting ~92 % of the time; should-fix:
death director denominator (kills stop at ~19), fires never end / hulks never retire, quality scaler
never climbs on 60 Hz, galactic band shader cost, 2.5 s planet bake on the main thread, effects not
scaled on phones, fighter attrition 502/min, flak = half the particle pool, cinematic sun constant,
fighter lead, `Ship.target` never set (turrets), smoke render order.

### Integrator fixes already landed

HUD overlap + shot name on cuts; `Ship.target` mirrored (turret tracking works); `explosions.hasRoom`
per-layer test; quality scaler recovers (`dt <= 1/58`), phones run DPR 1.0 with a 0.66 floor; effect
pools scale with `SCALE`; instanced **tracking turrets** in `fleet.js` (bodies + barrels per type,
rate-limited yaw/pitch toward `Ship.target`, hardpoints fire from the barrel tips); shared **engine
plume system** (`enginePlumes.js`, one additive draw call, flicker, dark on dead ships, `engineLevel`
override); lighting baseline (fills cut ~3×, plating map normalised so tints map to albedo); start
card restored.

## Fix wave (parallel worktrees, all merged)

| workstream | result |
| --- | --- |
| Venator | three-scale plating with per-face UVs, film-calibrated cream/flank/dark-belly palette (deck 182–203, shadow 46–60, belly 59–68 sRGB), soot/fade/scorch weathering, nozzle bells on framework plumes, 8 heavy + 20 light **tracking turrets** (bolts leave the muzzles), 9 m deck seam, 64 m open bay, trench machinery, keel bays, denser block, flared tower heads; 32.8k / 9.1k / 1.1k tris |
| Providence | 4-tier stepped command tower with bridge head, 7 discrete hangar bays per flank (open / blast door), three-scale plating, no stern halo, 10 tracking heavy turrets, weathering, ventral hangar mouth, keel strake; 45.3k / 9.1k / 1.7k tris |
| Munificent / Recusant | deep lit nozzle bells (opaque cones gone), three-scale plating, tracking turrets (0° aim error), recessed slot windows, deeper pincer + thick fins + dishes + docking bay; Recusant slab 1.6× with swept tips, stepped spike, two-tier block; 23.8k / 8.8k / 1.5k and 20.7k / 8.8k / 1.7k tris |
| Effects | min projected bolt length (far bolts are streaks), red stays red, staged impacts (flash → boiling fireball → sparks → lingering dark puff), **scorch decal layer** under fires/heavy hits, fires with 60–120 s life + re-ignition + extinguish, staged detonations with shock ring, hull-coloured debris and drifting black cloud, flak culled by camera distance, smoke drawn first and depth-sorted; 6 draw calls |
| Planet / lighting | light-fabric Coruscant (4 pin-light layers cross-faded by texel footprint, beaded arteries, rings/spokes, hubs, near-black warm ground, crisp halo-free limb), galactic band baked once (~50 ms/frame of shader work removed), planet bake in a Web Worker (main-thread stall 1.1–1.8 s → ~20 ms), touch profile (1024×512, 3 Voronoi levels), key 4.8 + shaped city fill (deck ~200, shadow 45–70, belly 60–90) |
| Choreography / cinematic | per-layer particle budgets (fires actually light), death director fixed (4 deaths per 3-minute window sustained over 20 min, wrecks retire, reinforcements), staged 3.5–5 s deaths with dimming engines, fighter mean life 44 s → 2.2–2.7 min, fighter lead fix, ±25° line variety with banked turns, 11 shots at 5–8 s + 2.5 s inserts, chase keeps the fighter in the lower third, Coruscant in the bottom third of low shots, OBB camera clearance, mobile scaling of fire density |

### Fixed-scene measurements (software GL, 1280×720)

`tools/battle-verify.mjs`: **14/14** — max 107 calls / 0.85 M tris over 33 views; 54.6 k bolts in 191 s,
peak 387 in flight, peak 1 701 particles; 45/50 alive with 5 staged deaths; 0 fighters inside hulls;
13 cinematic cuts in 80 s, camera never inside a hull; `battle.update` ≤ 0.69 ms per 1/60 step;
texture memory 38 MB; page ready 6.6 s here (planet bake now off the main thread).

## Review wave 2 (re-scoring the fixed scene)

| class | before | after | notes |
| --- | --- | --- | --- |
| Venator | 47/90 | **61/90** | turrets 4 (slew as a group, bolts leave the muzzles), flanks/belly 4, scale 4, weapons 4, motion 4; still khaki in oblique light, deck seam a hairline, weathering 2 |
| Providence | 52/90 | **56/90** | tower 4, hangar bays 4, scale 4; LOD tint step, masonry seam, plain stern |
| Munificent | 49/90 | **62/90** | silhouette 5, pincer 4, bulb 4, colour 4, damage 3; dead hulls kept lit windows (fixed since), tiling |
| Recusant | 51/90 | **56/90** | orientation 4, spine 4; flat stern plate, pod, weak at 10 km |

Battle composition: **2.4 → 3.4 / 5** — detonations 1.5 → 3.5, impacts 2 → 3.5, HUD 2 → 4, bolts 2.5 → 3.5,
fighters 2 → 3, planet 2 → 3, lighting 2 → 3, pacing 2.5 → 3.5, sky 3.5 → 4; nothing regressed. All four
classes remain distinguishable at 10 km. Remaining top items: planet ground colour/structure, hexagonal
fireball edges, static flame licks, scorch readability, bolt heads, two-stage flak, hull-breaking deaths,
composition variety.

### Integrator polish (landed)

Dead hulls now go dark (emissive parts per instance), engine glow discs are gradients instead of
clipped white, the city fill is less saturated (cream-grey shadows), the planet ground is violet-indigo
again, cinematic labels drop ship ids, the phone HUD stays on one line.

## Polish wave (merged)

- Effects: rotated-octave fbm fireballs with torn rims, hot cores, rolling lobes and soot intrusions;
  thin blue-white shock rings; 2–3 animated licks per fire with their own phase/size/lean; wreck fires never
  age out (flame layer reserves 15 % for licks, smallest live fire evicted first); scorch stamps on every
  heavy hit at 1.5× (merge on re-hit), 3× under fires, darker soot with a heat rim; capsule bolts with a
  saturated red tip (300 m head rgb 248/107/74, 3 km 219/68/49); two-stage flak (white-orange core with
  rays → dark ragged puff); near-camera fade (60–150 m). 6 effect draw calls; pools peak add 1171/1400,
  flame 688/840, smoke 1851/2800, scorch 1790/2100 over 240 s.
- Ships: Venator cream-white palette (deck sat 0.10, oblique flank 0.03), 10 m × 4 m recessed deck seam
  with lit strips, connecting deck between the towers, brighter open bay; Providence stable grey across
  LODs (LOD 0/1/2 within 6 sRGB), one plate scale, recessed channels, deep nozzle bells + stern vents;
  Recusant deep bells between pylons, solid LOD 2 spine (reads at 10 km), pod collar/girders/sensors,
  gunmetal grey; Munificent blade-like pincer arms, cooler tan, soot bands. LOD 0/1/2: Venator 33.1k /
  9.2k / 1.1k, Providence 49.6k / 10.1k / 2.0k, Munificent 24.5k / 9.5k / 1.6k, Recusant 23.5k / 10.8k / 1.5k.
- Integrator: dead hulls go dark (emissive instance colour), gradient engine discs, lower-saturation fill,
  violet-indigo ground.

### Final measurements (software GL, 1280×720)

`tools/battle-verify.mjs` **14/14**: max 107 calls / 0.90 M tris over 33 views; 58.9 k bolts in 191 s,
peak 388 in flight, 1 846 particles; 45/50 ships alive with 5 staged deaths; 0 fighters inside hulls;
13 cinematic cuts in 80 s, camera never inside a hull; `battle.update` ≤ 0.94 ms per 1/60 step (with two
other Chrome instances loading the machine); texture memory 38 MB; 27 shader programs; production build
OK (battle entry 229 kB gzip 81 kB + shared three.js chunk; planet bake worker 3.6 kB).

Phone (emulated iPhone 13, DPR capped at 1.0, fleet scale 0.6): 27 ships, 222 fighters, 92 calls,
529 k tris, cinematic auto-starts, one-finger orbit and the Cinematic button work, no errors.

## Known limitations / next steps

- Hulls do not break apart on death (wrecks keep their geometry under fires, debris and smoke).
- Flak still clusters at 2–3 km in some inserts; the flak *rate* in the choreography is the remaining knob.
- The Venator belly reads slightly warm under the city fill even with a neutral albedo.
- Below ~5 km the planet's pin layers magnify into soft blooms (no low-pass shots are in the shot list).
- Frame rates on real GPUs were not measured (software GL only); the technical review estimates 60+ fps
  on discrete GPUs, ~20–25 % of an integrated GPU at 1.5 DPR, and main-thread cost as the phone risk.
- No sound in the battle scene yet (the ISD scene's audio system could drive distant rumbles and bolts).

## Reference-matched roster wave (user feedback: lasers, the "C" ship, every ship compared one-to-one)

- Turbolaser colours: Republic fires red and blue, Separatists blue and green (per shot from the capital
  RNG stream; point defence follows).
- Reference material: ~100 Wookieepedia cross-sections, stills and concept images fetched per class (kept
  outside the repo, used only for side-by-side comparison) plus the user's Venator render and film still.
- Twelve workstreams in isolated worktrees, each matching top / side / front / 3/4 silhouettes against the
  references with PIL side-by-side composites (saved as `ref_<class>_<view>.jpg` artifacts):

| class | side | result (LOD 0 / 1 / 2 tris) |
| --- | --- | --- |
| Venator | Rep | grey hull, wide dark-red door strips, converging bow stripes, leaning towers on the sloped block with T-heads, 28 tracking turrets, 10 engines (26.1k / 7.9k / 1.6k) |
| Acclamator (new) | Rep | clean wedge, maroon spine, red wing stripes, roundels, T-head tower, 4-bell bank (14.9k / 5.1k / 1.2k) |
| Arquitens (new) | Rep | forked bow with trench, kite hull, T-bridge, three nacelles, wine-red stripes (9.9k / 4.9k / 1.1k) |
| Carrack (new) | Rep | tube hull with the faceted bow head (bridge), proud frames, 2×4 engine block (10.8k / 5.6k / 1.6k) |
| Dreadnaught (new) | Rep | hammerhead bow, rounded hull, 46 turrets, 3+2 nozzles (21.5k / 9.2k / 1.7k) |
| Consular c70 (new) | Rep | red courier, salon pod, bridge pod on a pylon, three engine pods in a row (10.9k / 4.5k / 1.5k) |
| Providence | Sep | tall narrow dagger fitted to the MF75 profile (~10 m), raked tower with hammerhead pod + comms spar, ventral fin, drum + nozzle ring (48.8k / 9.0k / 2.0k) |
| Munificent | Sep | hooded crescent bow, sensor cross (blades + 426 m wing), machinery neck, elliptical dome with Banking Clan bands and hexagon, bridge module, stern blades (27.2k / 9.9k / 1.9k) |
| Recusant | Sep | spade bow with dome bands and chevron, bridge pod, hangar module, truss tail, staggered stern pods (16.4k / 6.6k / 1.9k) |
| Lucrehulk (new) | Sep | 3170 m broken ring, core sphere with bridge dome, spire cluster, 6 engine clusters, 39 turrets (51.6k / 14.9k / 2.7k) |
| Fighters | both | ARC-170, V-19 Torrent, Eta-2, Vulture, Tri-fighter, Hyena bomber, HMP gunship, all ≤ 380 tris, roles per type, 2 draw calls |
| Fleet plan | — | 67 ships at scale 1 (41 at 0.6): escorts weaving under the Venators, couriers, Dreadnaught artillery arc, Acclamators behind the line, two Lucrehulk anchors; size-scaled deaths; 4 new shots |

Integrator: turbolaser palette, size-scaled LOD distances, plume capacity, class views with fallback,
distant turrets slewing at quarter rate, tintGeometry RGB triples. A machine overload (4 cores, ten
Chrome-rendering agents) killed six agents mid-work; all were resumed from their worktree state.

### Measurements (software GL, 1280×720, 71 ships)

`tools/battle-verify.mjs` **14/14**: max 166 calls / 0.90 M tris over 48 views; 54.3 k bolts in 195 s,
peak 488 in flight, 1 637 particles; 66/71 alive with 5 staged deaths; 0 fighters inside hulls; 13 cuts in
80 s, camera clear of hulls; `battle.update` ≤ 0.71 ms per 1/60 step; textures 38 MB; page ready 2.8 s;
production build OK.

## Venator exact-match rebuild (user feedback: "I gave you a reference and everything")

The user's reference render is the authority. Two independent rebuilds ran in parallel worktrees from the
same numeric brief (tower, block, deck-marking and colour targets measured off the render); each fitted a
camera to the render by landmark projection (rms ≈ 3 px) so reference | render side-by-sides compare the
same pixels, and iterated against that view (14 and 17 iterations). Attempt B matched the whole-ship read
(tower proportions, twin red door strips with the grey centre deck, one red bow wedge, light neutral grey)
and was merged; attempt A's pose and single narrow red band drifted from the render.

Three passes on B, all in `src/battle/ships/venator*.js`:

1. Structure: arrowhead plan, raised red door band with side walls and a hairline seam, two light shafts
   with a clear gap on a 25° ramp block, T-heads, turret shelves with DBY-827 housings at the measured
   x ±85 m, crimson doors at half the deck's sRGB as in the render, coarse plating.
2. Heads and ramp: flared light hammerheads (slab 2.3× the shaft width, dark recessed window band, lofted
   chin, sensor block and drum), ramp relief as real geometry (grille rows, raised plates, steps), shaft and
   block sides reduced to dark slots and seams, the bridge deck visible through the gap.
3. Scene views (the reference angle hid these): the 40 m plating texel read as a chessboard at the
   `venator_close` distance, so the base texel went back to the Acclamator's fine scale with a new
   `staggered()` partition driving 16–90 m raised plate fields and `plateWall()` relief on every tower
   face; the stern, a flat wall of cubes, became terraced aft shoulders behind free-standing shaft rears
   with a lit stern hangar mouth, window rows, vents, dishes and sloped turret shelves.

Result: 28.6k / 7.0k / 1.9k triangles per LOD, 4 materials, 28 tracking turrets, 10 engines. Measured at
the fitted camera: sunlit deck 172 sRGB (render 126–180 depending on the wing), ramp 211 vs 216, shaft
fronts held at ~208 under the bloom threshold (the render's are blown to 250 by its low sun). What still
differs is lighting — the render's near-horizon sun 45° to starboard blackens its port faces; the scene's
sun is 48° high with no shadows — plus a faint 12 m seam grid baked into the shared plating map.
