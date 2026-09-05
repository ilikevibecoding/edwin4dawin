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

## Review wave

_critics (Venator rubric, Separatist rubric, battle composition/effects) and a technical review in progress_
