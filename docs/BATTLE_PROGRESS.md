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

## Review wave 2

_re-scoring in progress_
