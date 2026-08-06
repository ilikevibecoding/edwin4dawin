# PROGRESS — Castellan Ridge interceptor demo

Self-evaluation loop: build → run → play (Playwright) → screenshot → judge vs rubric → fix → commit.

## Rubric (0–10 each)

1. Base environment & composition
2. Battery assets & animation
3. Flight physics believability (threats + interceptors)
4. Effects: trails, explosions, shockwaves, debris
5. Lighting / weather / post-processing
6. Radar, HUD, UX clarity
7. Performance (60 fps target on mid-range GPU; headless numbers recorded as proxy)
8. Gameplay loop completeness & readability

**Stopping condition:** every category ≥ 8, average ≥ 8.5, all Playwright tests green, and a full
manual play-through of all three scenarios completes without errors or visual breakage.

## Iteration log

### Iteration 1 — initial build + first fix pass

**Built:** full module set (13 modules), deterministic RNG + manual-step test hooks, 17 Playwright
tests + screenshot gallery. Complete gameplay loop works: console → scenario → radar tracks →
assign → authorize → intercept/miss/decoy/impact → debrief → restart.

**Bugs found by self-test and fixed:**
- Terrain triangle winding inverted → terrain was backface-culled (world looked white); fixed CCW indices.
- First RAF timestamp predates module eval → negative dt poisoned FPS/UI throttling; clamped.
- `renderer.info` reset per composer pass → draw-call counter useless; switched to manual reset.
- UI sync throttled by wall-clock → stale HUD in manual-step tests; test hooks force-sync now.
- Playwright `baseURL` missing; sentinel test didn't wait for reload between shots.
- Searchlight cones were solid triangles → replaced with fresnel-faded double-cone shader beams.
- Air bursts invisible at multi-km range → scaled flash/shockwave/debris ~2×.
- Added PMREM environment lighting baked from the procedural sky (metals no longer black).
- Chromatic aberration far too strong; concrete/sun exposure rebalanced; sky dither added.

**Test results:** 17/17 passing after fixes. Headless SwiftShader proxy: 10.3 fps @ 960×540 (q1),
153 draw calls, 0.06M tris — well inside budget; real-GPU check pending.

**Rubric scores (self-judged from gallery):**
| Category | Score | Notes |
|---|---|---|
| Base environment | 4.5 | works but sparse; apron empty, props washed out |
| Battery assets | 5.5 | silhouettes recognizable; need mechanical detail |
| Flight physics | 7 | arcs + guidance believable; polish steering/readability |
| Effects | 6 | trails good; launch/explosion need verification + drama |
| Lighting/weather/post | 6 | day fixed, night dramatic; banding + washout spots |
| Radar/HUD/UX | 7 | holo + console + HUD all functional; PPI wedge misaligned |
| Performance | 7 | budgets green; real-GPU 60 fps check pending |
| Gameplay loop | 8 | complete, tested, restartable |

**Next fix list (iteration 2):** parallel specialist passes — base density/composition, battery
detail, effects drama, lighting/grade, radar/UI polish, physics feel. Then re-shoot + re-score.

### Iteration 2 — six parallel specialist passes + integration

**Specialist passes (parallel subagents, disjoint file scopes):**
1. *Base environment* (`base.js`): road network + service loop, fuel point, motor pool, tents,
   T-walls, guard towers, revetment berms per pad, apron stains/markings, draped camo net fix,
   tire tracks, second gate, light towers, terrain rim recolor. +~50 draw calls.
2. *Batteries* (`batteries.js`): full mechanical greeble via merged-geometry kit (ribs, clamp
   bands, trunnions, gear arcs, hydraulics re-anchored, cab glazing, wheels with hubs, ladders,
   stencils, placards); fixed RAMPART elevation clipping + ZENITH erecting over its own cab
   (now erects over the tail, two-stage); SENTINEL gantry rebuilt with platforms + photogrammetry
   bands + hatch interior glow; caps swing open at fire time. +21 draw calls total.
3. *Effects* (`effects.js`): launch = dual flash + ignition puffs + radial dust wash + 17-28 s
   lingering pad smoke + pad light; exhaust laid along travel segments (no dots); air burst =
   frag-spark shell + chunky smoke ball + smoking shards + distance-compensated flash; ground
   impact = tall dirt column + rolling dust ring + delayed secondary pops + blast dome; crisp
   shockwave ring; angle-based trail node insertion (no kinks); all Math.random removed from sim.
4. *Lighting/post* (`weather.js`, `post.js`): 3-stop sky gradient + sun-side warm scatter,
   sunset magenta/gold layering, night +70% ground luminance (cool moonlight), Milky Way band,
   moon halo core+atmosphere, cirrus streaks, per-tod cloud tint, bloom bright-pass clamp
   (floodlight glow flood fixed), bloom quality tiers, vignette 0.30.
5. *Radar/UI* (`radar.js`, `ui.js`, `styles.css`): 36° vertex-alpha sweep fan aligned with
   detections + ping rings, deck bearing ticks/range labels, classification-shaped blips,
   dashed predicted-impact paths, PPI afterglow + track history trails, battery reload bars,
   track rows with class chips + climb/descend arrows, bracket-style aim prompt, debrief totals,
   focus-visible accessibility, ≥11px fonts.
6. *Flight physics* (`threats.js`, `interceptors.js`, `physics.js`, `constants.js`): damped
   intercept solver + 5-9 Hz aim low-pass (no terminal jitter), per-airframe cold-launch
   profiles (sentinel cold-ejects then lights), doom offsets perpendicular to closing velocity
   (all misses pass 30-70 m), envelope floor margins (no sub-floor kills), threat loft raised
   (visible apogee), 102-engagement seed sweep: rampart 88% hits at 0.8-3 km, zenith 97% at
   6.2-8.4 km, sentinel 97% ≥4 km, all misses carry explained reasons.

**Integration fixes (main.js + cross-module):**
- `threat-impact` now resolves recently-closed tracks (no more "untracked threat" for engaged targets).
- PCFSoftShadowMap → PCFShadowMap (r185 deprecation), `clearView()` test hook.
- Ribbon trails: noise-strip texture (soft cross-edge + lengthwise wisps) — killed the
  "paper band" look; blast dome rebuilt as fresnel rim shell and rescaled (was nuke-sized).

**Test results:** 17/17 passing post-integration. Headless proxy: 10.5 fps @ 960×540 q1,
199 draws steady-state / ~460 worst-case wide view during heavy effects (composer passes included).

**Rubric scores (self-judged from gallery v2):**
| Category | Score | Notes |
|---|---|---|
| Base environment | 7.5 | reads as a real installation; could use more mid-distance interest |
| Battery assets | 8 | close-up detail good, poses fixed, night lights work |
| Flight physics | 8.5 | validated niches, smooth terminal, cinematic misses |
| Effects | 8 | launch/burst/impact all dramatic; verify saturation load |
| Lighting/weather/post | 8 | three moods distinct; night navigable + dramatic |
| Radar/HUD/UX | 8.5 | console+holo+HUD cohesive and readable |
| Performance | 6.5 | draw calls grew (460 worst case incl. post passes) — needs perf pass |
| Gameplay loop | 8.5 | full loop, explained outcomes, decoy logic verified |

**Next fix list (iteration 3):** performance pass (draw-call audit, shadow scope, instancing
check), player-POV walkthrough screenshots (eye-level composition check), audio verification,
final gallery + video capture, README/PROGRESS wrap-up.
