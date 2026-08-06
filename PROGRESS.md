# AEGIS LINE — build log

A fictional first-person air-defence range built with Vite + three.js. Every
asset is generated procedurally at boot; nothing is downloaded.

This file records each self-evaluation pass: what was scored, what the captures
showed, what the numbers said, and what got fixed next.

## Scoring rubric

Each pass is scored out of 10 in seven areas. The bar for "done" is every area
at 8 or above with no regressions in the test suite.

| Area | What it covers |
| --- | --- |
| Site & assets | Base layout, launcher silhouettes, mechanical detail, materials |
| Sky & lighting | Gradient, clouds, three conditions, image-based lighting, haze |
| Flight & physics | Arc believability, guidance behaviour, phase readability |
| Effects | Plumes, contrails, blasts, debris, dust, decals |
| Interface | HUD, scope, console, prompts, result clarity, accessibility |
| Gameplay | Pacing, battery differentiation, outcome variety, legibility |
| Performance | Draw calls, triangles, simulation cost, memory stability |

## How the loop runs

- `npm run dev` serves the app; Playwright drives it through `window.__GAME`.
- `window.__GAME.advance(seconds)` steps the simulation in fixed increments
  with no rendering, so tests are deterministic and fast.
- `tools/guidance-sim.mjs` runs the real flight code headless in node, which is
  how guidance is tuned — seconds per sweep instead of minutes per browser run.
- `tools/timing.mjs` and `tools/skyprobe.mjs` isolate performance and sky issues.
- Captures land in `test-results/shots/`.

---

## Iteration 1 — first playable

**Scores:** Site 5 · Sky 4 · Flight 2 · Effects 5 · Interface 7 · Gameplay 3 ·
Performance 3

**Observations**

- The site rendered but the player spawned facing away from it.
- 3981 draw calls for a static site — every kit-bashed bolt was its own mesh.
- No interception ever succeeded.

**Fixes**

- Spawn orientation, and a `renderer.info.autoReset = false` so the perf readout
  measured the whole composited frame instead of the last fullscreen quad.
- Static-merge pass (`optimizeStatic`) with `noMerge` markers on anything that
  moves at runtime. Runtime control is always via shared materials, which
  survive merging. **3981 → 494 draw calls.**
- Terrain: longer mountain wavelengths so ridges resolve as massifs rather than
  aliasing into spikes at the low-resolution rim of the warped grid.

---

## Iteration 2 — making the guidance actually work

**Scores:** Site 6 · Sky 5 · Flight 7 · Effects 6 · Interface 7 · Gameplay 6 ·
Performance 7

Guidance was the blocker, so the flight code was extracted from the entity into
a pure function in `physics.js` that both the game and a headless node harness
call. That turned a 6-minute browser round-trip into a 0.3-second sweep.

**Root causes found**

1. **Loft bias never faded.** Rounds aimed above the intercept point for the
   whole flight and sailed ~1 km over the target. Now the bias washes out as
   time-to-intercept drops.
2. **No energy management.** The long-range batteries arrived with far too much
   speed to turn. Added a sustainer cutoff once the solution is reachable.
3. **Fixed launch pitch.** A 3 km/s round has a turn radius measured in tens of
   kilometres; launching at a fixed 68–82° pointed it somewhere it could never
   recover from. The erector now aims at the fire solution, clamped to each
   launcher's elevation limits, and keeps tracking while assigned.
4. **Mirrored training azimuth.** All rigs point local +Z, whose site bearing is
   `PI - y`, so the launchers trained to the mirror of the target bearing. This
   is why the offline harness scored kills while the game missed by 20 km.
5. **Pooled interceptors inherited termination state.** A recycled round with a
   stale `passedTarget` self-destructed at launch.
6. **Radar dropped late tracks.** `lastSeen` defaulted to 0, so anything that
   appeared more than six seconds into a raid was instantly marked lost.

**Result:** batteries settled at 75% / 75% / 100% single-shot success with
median intercept altitudes of 5.1 / 11.0 / 11.4 km — the intended progression
from a fast, less precise terminal battery to a deliberate long-range one.

---

## Iteration 3 — visual quality

**Scores:** Site 8 · Sky 8 · Flight 8 · Effects 7 · Interface 8 · Gameplay 8 ·
Performance 8

**Observations from the captures**

- Every metal surface was near-black. There was no environment map, so anything
  with metalness had nothing to reflect.
- The sky washed out to near-white. The gradient colours had been authored as
  if they were final pixels, but they feed an HDR buffer that then goes through
  ACES tone mapping, which lifts and desaturates them.
- Missiles vanished at range: scene fog is distance-only and erased a contrail
  at 40 km that would be perfectly visible in reality.
- A high-altitude intercept was four pixels of fireball — no payoff at all.
- The first launch froze for seven seconds while effect shaders compiled.

**Fixes**

- **Image-based lighting.** The sky is captured into a PMREM environment map
  whenever the condition settles. Painted finishes dropped to low metalness,
  since military paint is not that reflective.
- **Sky rewritten around the tone-mapped result** rather than the raw values:
  much deeper zenith, warmer horizon, scattered rather than overcast cirrus.
- **Altitude-aware aerial perspective** in the particle and trail shaders,
  integrating an exponential atmosphere along the view ray, plus a CPU twin for
  billboard markers. Ground smoke hazes like the terrain; a trail at altitude
  stays crisp.
- **Distance-compensated burst flash** so an intercept 14 km away reads as a
  bright flare rather than a few pixels. Rendered above 1.0 into the HDR buffer
  so bloom picks it up.
- **Shader pre-warm at boot** (`Effects.warmup`, `InterceptorSystem.prewarm`).
  Launch latency went from ~7 s to 12 ms — and test capture went from timing
  out to 12 minutes for the whole suite.
- Launchers now park at a deployed elevation so each has a legible silhouette
  at rest.

**Performance note:** the CI machine has no GPU, so frames render through
SwiftShader and measured FPS is meaningless. Simulation cost is measured
separately and is the number that matters for the frame budget.

---

## Current state

See the tables in the final section of this file for the latest measurements.

## Known limitations

- Performance figures come from a software rasteriser; the frame budget is
  tracked through draw calls, triangle counts and simulation time rather than
  measured FPS.
- Decoys never classify, by design: the ambiguity is the point of the night
  scenario. A player who waits for classification will lose time.
