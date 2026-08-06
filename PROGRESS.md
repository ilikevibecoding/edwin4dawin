# PROGRESS — IRONVEIL RANGE (fictional interceptor base demo)

Self-evaluating build loop: build → run → play → screenshot → judge vs rubric → fix → commit.

## Rubric (self-judged from Playwright screenshots + test results, 1–10)

| # | Category | Target |
|---|----------|--------|
| R1 | Base environment & terrain believability | ≥ 8 |
| R2 | Battery asset quality (silhouette, detail, animation) | ≥ 8 |
| R3 | Effects: trails, launches, explosions, debris | ≥ 8 |
| R4 | Lighting, sky, weather, post-processing | ≥ 8 |
| R5 | UI/HUD/radar clarity & readability | ≥ 8 |
| R6 | Gameplay flow & feedback (assign → authorize → result) | ≥ 8 |
| R7 | Performance budgets (calls < 400, tris < 1.5M, 60 fps on mid-GPU) | ≥ 8 |
| R8 | Stability: all Playwright tests green | pass |

**Stopping condition:** all categories ≥ 8, average ≥ 8.5, full test suite green — or the
iteration budget is exhausted (whichever first). Headless CI runs on SwiftShader, so absolute
fps is judged via draw-call/triangle budgets + real-GPU spot checks, not headless fps.

---

## Iteration 1 — v0.1.0 scaffold (complete game, first visual pass)

**Status:** All 7 gameplay tests green. Screenshot harness produces 14 deterministic shots.

**Scores:** R1 4 · R2 4 · R3 6 · R4 6 · R5 8 · R6 8 · R7 8 (calls ~150, tris ~450k) · R8 pass
**Average: 6.1 — keep iterating.**

**What works**
- Full loop: console (scenario/time-of-day/battery, START), radar detection following the
  rotating array, track selection (PPI + holo table + HUD list), ASSIGN / AUTHORIZE, outdoor
  aim-assign (E/F), intercept/miss/decoy/impact outcomes with reasons, debrief + restart.
- Deterministic seeds; fixed-step test API (`window.__game`); object pools for threats,
  interceptors, particles, trails, debris, flashes, decals.
- Procedural audio (wind, hum, klaxon, launches, distance-delayed booms).

**Observations (fix list for iteration 2)**
1. ~~Chromatic aberration catastrophically strong~~ → fixed (subtle now).
2. ~~Trail ribbons zig-zag~~ → fixed (per-vertex direction sign).
3. Trails + smoke are unlit → full-bright at night, too white at sunset. Need time-of-day tint.
4. Night intercept scene unreadable: gray blobs; explosion flash too small at km distances.
5. Rampart canister rack reads as one plywood slab: needs frames, per-canister texture offsets,
   visible covers on both ends, more mechanical detail.
6. Sentinel rail is bare: needs a visible loaded missile, cable dressing.
7. Launch smoke rises too fast and forms perfect balls: reduce buoyancy, add per-particle
   rotation, more size/alpha variation.
8. Mountains too smooth/pale, terrain lacks near-ground detail.
9. Hazard rings slightly gaudy; pad concrete washed out.
10. Fence chainlink aliases to dark bands at distance.

**Perf:** headless (SwiftShader) ~150 draw calls, ~450k tris in overview shot — well inside
budget; real-GPU spot check pending.

---

## Iteration 2 — lighting/tinting/detail fixes

**Status:** all 7 gameplay tests green after changes.

**Scores:** R1 5 · R2 6 · R3 6.5 · R4 7 · R5 8 · R6 8 · R7 8 (305 calls / 135k tris night scene) · R8 pass
**Average: 6.8 — keep iterating.**

**Fixed this iteration**
- Trails + smoke now tinted by time-of-day light (`ctx.world.trailTint`); threat trails keep a
  0.45 emissive floor (reentry heat), interceptor smoke 0.12.
- Per-particle sprite rotation (aRot/aRotVel) removes the "perfect ball" smoke look.
- Distance-compensated explosion flashes (readable at multi-km).
- Rampart rack rebuilt: separated canisters w/ per-canister camo offset, ribs, frames, red
  covers + rims, rear closures — was rendering as a black slab (cloned textures needed
  `needsUpdate`, rest heading faced away from sun).
- Sentinel now carries a visible loaded round (hides on launch, returns after reload).
- Night: brighter moonlight/hemisphere, PMREM environment maps per time-of-day (metals no
  longer black), floodlights balanced (260 cd — 6500 washed the scene out), unlit ground
  decals switched to lit materials.
- Debrief modal no longer leaks into subsequent scenario starts.
- Launch smoke: lower buoyancy, more size/alpha variation.

**Next (iteration 3 — parallel specialist passes)**
1. Base/terrain detail density (clutter, fence, shelter interior, radar install, mountains).
2. Battery visual overhaul (silhouettes, greebles, decals, wear).
3. Explosions/trails quality (sparks streaks, debris trails, shockwaves, reentry look).
4. Sky/clouds/sunset/night drama + grading polish.
5. Radar holo + PPI + HUD refinement.

---

## Iteration 3 — four specialist passes + guidance/fuze fixes

**Status:** all 7 gameplay tests green; screenshot sweep initially exposed a real
gameplay regression (single-track sentinel shot ended grade D).

**Root-caused and fixed (guidance):**
- `predictIntercept` had a 0.5 s minimum time-of-flight clamp → at close range the
  aim point sat ~50 m ahead of the target (0.5 s × target speed) and guidance
  chased a phantom lead forever. Closest approach stuck at 34 m (> 20 m kill radius).
- Threats fly with quadratic drag but the predictor propagated pure ballistics →
  systematic lead bias. Added `propagateWithDrag` and threaded `dragK` through.
- Fixed-step sampling at ~2.5 km/s closing speed jumps 80 m/frame → added an
  analytic closest-approach fuze (relative-state tca/dca) so detonation distance
  is frame-rate independent. Probe: closest approach 2 m, pk 0.94, SUCCESS.
- Sentinel envelope ceiling 8000 → 12500 m ("maximum reach" battery was rolling
  OUTSIDE-ENVELOPE penalties at apogee).

**Fixed (visuals):**
- Searchlight beams rendered as solid additive pipes from the side → replaced with
  a view-facing + axial falloff shader (soft volumetric look, verified night probe).
- Launch smoke drifting over the player produced screen-filling soft blobs →
  near-camera alpha fade (2.5–18 m) in the particle vertex shader.
- Status strip / key-help overlap at ≤1500 px widths → strip lifted one row.

**Specialist passes integrated:** batteries (detailed rigs), effects (layered
explosions, sparks, reentry plasma), sky/weather/post (per-preset grading, moon,
milky way), radar/HUD/UI (holo + PPI overhaul, aim bracket).

---

## Iteration 4 — base environment overhaul (5th specialist)

**Status:** all 7 gameplay tests green; full 14-shot sweep captured (incl.
09_intercept_moment for the first time — intercept now succeeds deterministically).

**Scores:** R1 7.5 · R2 7.5 · R3 7.5 · R4 8 · R5 8.5 · R6 8.5 · R7 7.5 · R8 pass
**Average: 7.9 — keep iterating.**

**Landed this iteration**
- Three noise-displaced mountain ranges (5.2/7.4/9.2 km) with atmospheric-
  perspective banding; arc gaps prevent wall-of-ridge repetition.
- Apron: per-slab tone variation, tar joints, painted markings (lane stripes,
  pad IDs, KEEP CLEAR stencils), tire marks, oil stains, drain grates.
- Clutter zones: pallets, crates, barrels, cable drums, sandbags, tents, light
  masts — instanced/merged, with colliders.
- Radar centerpiece: raised platform w/ railing + stairs, 6.3 m phased array on
  tan pedestal, IFF dish, cabin, cable run, warning signs, blinking light.
- Shelter interior: panel walls, equipment racks w/ LED field, map board, desk,
  monitors, ceiling light — console view now reads as a real C2 room.
- Sand macro variation + windrows + non-repeating overlay + grass tufts.

**Perf:** default view 275 calls (was 293 pre-pass despite far more content);
base overview 530 (down from 589); console interior 282; SwiftShader software
rendering ~48 fps @1280×720 → large headroom on real GPUs. Watch item: widest
south-horizon angle peaks at 403 calls.

**Next (iteration 5 — final polish)**
1. Intercept spectacle at mid range (debris trails from kill point, brief
   secondary sparkle) — judged vs shots 09/13.
2. Base overview near-field interest (foreground clutter/road into frame).
3. Demo video (real-browser manual test walkthrough), README/PROGRESS final,
   PR update with artifacts.

---

## Iteration 5 — live walkthrough, UX friction fix, demo video

**Status:** full engagement played end-to-end in a real (non-headless) browser
on the VM; demo video recorded (sunset · SINGLE TRACK · SENTINEL LR-1 · grade S).

**Found by playing (not by tests):**
- TAB refused to open the fire-direction console unless the player stood within
  3.2 m of the shelter console in the idle phase — the first live playtest agent
  wandered the base for minutes and never found it. Fixed: TAB now flies the
  camera to the console from anywhere (walk-up + E path unchanged); exit
  restores the outdoor position. Scenario-active TAB already worked this way.
- Distant-intercept read (shot 09) is an early-phase flash by design; the
  lingering cauliflower cloud forms ~1 s later — left as-is after review.

**Test-stability note:** `manual engagement via console DOM controls` failed
once while the GUI browser was still software-rendering the game fullscreen
(SwiftShader, load avg > 6): the headless page's RAF-driven UI updates starved
so the track list DOM lagged the sim. Passed again immediately once the GUI tab
was parked. Environmental, not a product bug — noted here for future runs.

**Verification:** boot/perf-budget + manual-engagement tests green post-change
(full 7-test suite was green on identical engine code this iteration; the only
deltas since were the TAB input case and a CSS breakpoint). 14-shot sweep
captured; demo video reviewed beat-by-beat (intro → console → launch →
INTERCEPT banner → RAID DEFEATED S) before trimming.

**Final state vs rubric:** R1 7.5 · R2 7.5 · R3 7.5 · R4 8 · R5 8.5 · R6 8.5 ·
R7 7.5 · R8 pass — average 7.9 of the 8.5 target. Remaining known gaps, in
priority order: battery texture wear/decals at closeup range, mid-range
intercept spectacle, base overview foreground interest, watch-item 403-call
peak on the widest south-horizon angle.

---

## Iteration 6 — user feedback round + parallel specialist waves (IN PROGRESS)

**User feedback addressed directly (committed + demo refreshed):**
- "Big blob of black when I turn around" — root causes fixed (over-dark ground
  decals/tar strips, black cable protector humps → hazard-striped ramps,
  silhouetted work-light masts/floodlight poles → steel + emissive lamp faces,
  camera clipping inside Sentinel canister collider gaps → full-length box
  colliders). Verified with fresh 8-direction sweeps at two positions, day and
  night — clean. The user had been playing a pre-fix demo snapshot; refreshed.
- "Easier missile function / multiple interceptors at one bomb" — engagement
  model rebuilt: per-track concurrent assignments (`Map trackId→batteryId`),
  sticky salvo fire (F ripples across ready batteries), per-battery fire queue
  (one battery services several missiles, rounds auto-launch as it cycles),
  `engageAll()`, urgent-track F fallback, wider aim assist. Rounds detonating
  after their target died count as `safed`, not misses.
- "Mobile tablet to command on the go" — handheld TACOM pad (Q): live tactical
  radar plot (sweep synced to the dish, heading wedges, impact ×, engagement
  lines, queue rings), per-track ASGN/FIRE, battery chips with queue badges,
  ENGAGE ALL, raid setup (time/scenario/START) usable anywhere on the base.
- "Different views — the missile separate" — V cycles cinematic chase cams:
  side-chase interceptor cam → most-urgent-threat cam → first person, with
  letterbox bars, kill-linger, auto-return. Zero extra render cost.

**Specialist wave 1 (complete, committed):**
- Missiles (9 loops): lathe-profile RVs with ablative canvas textures, reentry
  heating + bow shock + terminal plasma streak, tumbling biconic decoys; three
  distinct interceptor airframes with stencils/panel lines/mach-diamond plumes.
  Self-scores 8.5–9 across silhouette/detail/lighting/motion/readability.
  Perf +3 draw calls net. Kill chain re-verified post-rewrite (same
  deterministic outcomes).
- Console room (9 loops): dressed fire-direction center (three-bay console,
  bezeled monitor wall, guarded launch button, props), phosphor PPI scope with
  persistence + engagement sidebar, live aux screens, volumetric holo table,
  acoustic walls/cable trays/signage, day/sunset/night ops lighting with red
  battle lamps. Self-scores 8.5–8.8. Seat pose adopted in main.js.

**Specialist wave 2 (running):** batteries (TEL/launcher fidelity) and
explosions/effects (intercept fireballs, ground impacts, launch blasts,
per-emit trail cooling).

**Queued for integration pass (after wave 2):** bloom threshold near sun disc
(distant-dot washout), slightly higher night ambient/IBL (both requested by
missiles specialist — deferred so running specialists don't tune against a
moving target), full 7-test suite on a quiet box, screenshot sweep re-score,
demo video, demo snapshot + CDN refresh.
