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

## Wave 1 (parallel worktrees)

_pending integration_
