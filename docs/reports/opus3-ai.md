# Opus 3 — AI, objectives & round systems

Scope: `src/game/enemy.js`, `src/game/hostage.js`, `src/game/navigation.js`.
All randomness routes through `rng` (`src/core/rng.js`); no `Math.random` was
introduced and one pre-existing `Math.random` in the hostage stuck-recovery was
converted to `rng`. No public API used by `game.js`/`weapons.js` changed.

Final suite: **14/14 passing (4.8 min)**, zero console errors in every probe.

---

## A. Enemy combat intelligence

### A1 — Cover usage
Cover is sampled on a ring 1.5–4 m around the enemy, throttled per enemy
(1.2–2.5 s) and against a global per-step budget so 14 enemies cannot all search
in one frame. Each candidate is scored by two real raycasts rather than a collider
height window, because the height window turned out to be a poor proxy once the
prop pass filled rooms with mixed-height furniture:

- line of sight from the **crouched** eye (~1.25 m) must be blocked, and
- line of sight from the **standing** eye (~1.67 m) should be clear.

That combination is exactly a peek-over spot. When both are blocked it is treated
as hard cover and a lean point is computed instead, so the enemy leans out to
fire. Score also penalises being outside the archetype's range band and rejects
candidates sitting on top of an ally, which stopped the pile-ups I saw in the
first copy-room test.

In combat the enemy crouches at cover, pops up for its burst, and ducks during the
cooldown. Cover is cached and abandoned when the player gains LOS to the crouched
position (flanked) or moves more than 6 m from where the cover was chosen.

Measured over a 20 s six-enemy lobby fight (`artifacts/opus3-cover-lobby.png`):
5 of 6 combatants took cover at some point, 4–5 of 6 were in cover in steady
state, and 4 showed a full peek/duck cycle (crouch fraction observed both above
0.6 and below 0.2).

### A2 — Coordinated alerts
`game.js` calls `alertAlliesNear` once per nearby enemy in a single step, so the
grouping happens inside `alertTo`: alerts are bucketed by quantised position plus
sim step into a short-lived squad. Each member gets a ring slot, and its approach
target is offset around `lastKnown` by an angle derived from its id hash — that
keeps the spread deterministic under a fixed seed while stopping responders from
stacking on one point.

One member per squad becomes the flanker, preferring a `scout`. The flanker
samples points behind/beside `lastKnown`, then compares the direct path cost
against a route through an alternative door and commits to the detour when it is
affordable. Planning is throttled to roughly one attempt per 3.5 s per flanker and
costs at most three `findPath` calls.

Verified in `artifacts/opus3-flank.png`: after a single shot in the conference
room, `e_exec_1` (scout) took the flank role at t≈2.8 s and `e_garage_1` at
t≈7.6 s, and nine responders converged on nine distinct positions rather than a
single conga line.

### A3 — Search believability
Search points come from the room containing `lastKnown` (corners, inset ~1.6 m,
facing the corner) plus doorways within 12 m, positioned 1.4 m out on the
last-known side and facing the frame. Points are ranked nearest-first with a small
random pick among the top few for variety.

Verified in `artifacts/opus3-search.png`: with `lastKnown` at (29, 22) in the
cubicles (room rect x 18–40 × z 14–30), the four searchers targeted (24.9, 15.6),
(34.9, 15.6), (30.0, 28.4) and (38.3, 28.3) — all inside the correct room, near
its corners.

### A4 — Door discipline
Before a door waypoint the enemy stops 0.8 m short, faces the door, calls
`setOpen(true, 'ai')` on that specific door, and waits for `state === 'open'`
(or `angle > 0.5`) before continuing. Opening is directed at the gated door rather
than relying on radius-based opening, which is what removed the oscillation. A
locked door refreshes its nav cells and clears the path so the AI reroutes instead
of grinding.

Door state trace from `artifacts/opus3-flank.png` — every door transitions exactly
once, no flapping:

| door | transitions |
|---|---|
| `d_conf_glass` | closed → opening (t=0.8) → open (t=1.2) |
| `d_lobby_conf` | closed → opening (t=3.2) → open (t=3.6) |
| `d_lobby_cubicles` | closed → opening (t=6.4) → open (t=6.8) |

### A5 — Flash / smoke reactions
Blinded enemies stumble in short random steps and have a small chance per burst
window of firing wild (accuracy multiplier ~0.12, aim scattered up to ±40°).
When smoke sits between the enemy and `lastKnown`, non-heavy archetypes hold and
shift laterally around the cloud instead of pushing through; heavies push.

Verified in `artifacts/opus3-smoke.png`. A flash at the scout's feet blinded
`e_cub_1` for 4.12 s and `e_cub_2` for 2.63 s, and both drifted in sub-metre
erratic steps while blind. Under smoke the scout lost sight and held station at
(21.2, 18.5) for the full 5 s sample, while the heavy kept its sightline and
advanced from (25.8, 24.7) to (27.1, 25.8).

### A6 — Archetype flavor
- **scout** — prefers the flank role, mid-range band.
- **trooper** — standard bursts and band.
- **heavy** — advances with slower suppressive bursts, pushes smoke, closest band.
- **marksman** — holds long sightlines, relocates after 2 shots to a new cover
  point with standing LOS beyond 12 m, and switches to faster trooper-like bursts
  while retreating when the player closes inside 8 m (CQB mode).

### A7 — Watchdog
Displacement is accumulated only while the enemy actually intends to move. Under
0.4 m over 6 s forces a repath; over 12 s teleport-nudges to the nearest walkable
cell. A separate faster path handles the common case: an enemy shoved off the
walkable set by entity collisions is recovered after ~1.2 s, snapping at most
1.5 m (falling back to 3 m only if nothing closer exists) so the correction is not
visible. Incidents are counted in `enemy.stuckRescues`; there is no console
output.

Counts observed: 1 rescue across a 20 s six-enemy lobby fight, 1 across 22 s of
nine responders funnelling through the conference doors, and 0 for four enemies
spawned directly into prop-dense cubicle corners — all four of which escaped and
engaged within 16 s (`artifacts/opus3-search.png`). `Enemy` also snaps its own
spawn to the nearest walkable cell, which is what stopped the roster spawning
inside the new furniture.

### A8 — Fairness
Reaction time is applied on entry to combat and multiplied by 1.4 when alerted by
an ally, so there is no insta-lock after a load. Firing is gated on the existing
LOS check, which honours `blocksSight`, so nothing shoots through opaque geometry.
A soft cap of 3 simultaneous shooters is enforced by a slot pool with a 0.7 s TTL
after losing LOS; non-shooters reposition or seek cover, and slots rotate as
enemies duck in and out. Shooters release their slot while reloading.

Measured in the lobby fight: peak concurrent shooters was exactly 3 across all 40
samples, with 6 enemies engaged.

---

## B. Hostage lifelike behavior

### B1 — Follow position and aim-dodge
The hostage holds a back-shoulder slot 1.55 m behind and 0.95 m to one side of the
player, switching sides when the chosen side is unwalkable or inside a door span
(with a 0.35 s hysteresis so it does not flip-flop). If the player's aim dot
exceeds 0.86 within 5 m, she commits to a 1.4 m lateral step for 1.2 s; the dodge
target is sticky for its duration and cancels when the aim dot drops.

Measured (`artifacts/opus3-hostage.png`): settled at 1.54 m from the player with
0.49 m lateral offset and aim dot −0.95 (behind the shoulder). Aiming at her drove
aim dot from 1.0 to −0.32 and lateral offset from 0 to 2.26 m over 2.4 s.

One tuning note: the arrival threshold had to come down from 0.9 m to 0.5 m. At
0.9 m she could satisfy "arrived" anywhere on a wide circle around the slot and
settled directly behind the player (lateral 0.06 m), which read as trailing rather
than formation.

### B2 — Under fire
With combat inside 12 m she tucks in — the follow slot pulls to 1.15 m back and
0.7 m out — and hunch-runs at crouch fraction 0.6. While holding she cowers fully:
a ring sample around the hold spot picks a point where even her crouched head is
out of the nearest threat's line of sight. Scared barks fire at most every 20–34 s.

Measured: with an enemy engaged 2.5 m away she stayed at crouch 1.0 (see
discrepancy 2 below) and held 2.5 m from the player. Toggled to `holding`, she
relocated from (49.5, 36.9) to a hiding spot at (46.8, 36.9) and cowered there at
crouch 1.0 for the whole sample.

### B3 — Extraction
Within 8 m of the van she breaks formation, drops her path, sprints at 4.4 m/s to
the van rear and plays a relief subtitle ("The van — I see it!"), then the
existing boarding line on `extracted`.

### B4 — Stairs and doors
Hostages use the same stop-short/open/wait door discipline as enemies, and their
path requests are `priority` so they bypass the global A* budget (there are only
two of them). Both hostages traverse both stairways — see the escort regression
below.

### B5 — Never block doorways
When idling next to the player, if she is standing inside a door span she drifts
perpendicular out of it toward the player's side.

---

## C. Navigation robustness

### C1 — Perpendicular door crossings
Each door crossing on a smoothed path becomes an approach point 0.75 m short, a
point exactly on the door centre line, and an exit point 0.75 m past. Three
follow-up fixes were needed after the first version zig-zagged in real traces:

1. The approach point is skipped when the walker is already inside 1 m of the
   line, otherwise it steps backwards.
2. When the **destination** lies on a door line, `da * db > 0` never rejects the
   crossing, so the insertion looped and produced
   `43.25 → 44 → 44.75 → 44 → 43.25 → 44 → 44.75 → 44`. The crossing now
   terminates at the frame in that case.
3. The A* cell centre immediately after a crossing usually sits beside or behind
   the exit point; it is dropped when it is within 0.6 m of the exit or points
   back across the threshold. A final tidy pass removes any non-doorway waypoint
   within 0.4 m of its predecessor (or 0.8 m when the predecessor is a crossing
   point). Inserted crossing points are flagged and never removed by that pass —
   the first version of it deleted the door centre itself.

Resulting traces are clean, e.g. the west stair door:
`16, 9.6 → 17.75, 9.75 → 18, 9.5 → 18.75, 9.5 → 23.25, 11.25`.

### C2 — `findPath` fallback and `nearestWalkable`
`nearestOpen` tries radius 8 cells then falls back to 26. `nav.nearestWalkable(level, x, z, maxR)`
is exposed for the watchdog and off-mesh recovery. Path goals that land inside
geometry are clamped to the nearest walkable cell centre; start points stay exact.
Cross-level joins are de-duplicated, since a grid path and its stair link share
the landing waypoint.

### C3 — Dynamic prop awareness
**Confirmed:** `game.js` builds the nav mesh after `buildWorld`, so decorator and
prop colliders are included. At the time of testing the build indexed 914
move-blocking colliders, and cubicle furniture is reflected in walkability.

Broken-glass refresh runs correctly, but see discrepancy 1 — it cannot open a new
walking route in this map's geometry.

Locked doors are hard-blocked (cell cost 255). Nothing outside `navigation.js`
refreshes the grid when a keycard unlock happens, so `NavMesh.syncDoors()` now
diffs door lock state once per sim step from `beginNavStep` and refreshes only the
doors that changed. Verified: with `d_it_server` locked, IT room → server room is
`NULL`; after `unlockDoor`, it returns a route with a perpendicular crossing.

### C4 — Performance
A global budget of 6 `findPath` calls per sim step. Requests past the budget
return `undefined` (deferred) as distinct from `null` (no route), so a caller
keeps its current path and retries next step instead of falling into stuck
handling. Hostages pass `priority` to bypass it.

Grid construction was the most expensive part of a level load at
O(cells × colliders) — 24,144 cells against 914 colliders. Move-blocking colliders
are now bucketed into a coarse 4 m XZ index (padded by the agent radius), rebuilt
per build/refresh call so door leaf swaps and broken glass cannot leave it stale.
Full-grid recompute went from **665 ms to 234 ms** with byte-identical paths. The
234 ms residual is `world.groundAt` called once per cell, which lives in
`worldRuntime.js`.

Simulation cost with the AI live measured ~70 ms per simulated second for a
six-enemy fight with cover — roughly 1.2 ms per 60 Hz frame for the whole game
loop, about 7% of frame budget.

---

## Verification artifacts

| scenario | artifact | result |
|---|---|---|
| A1 cover, crouched at cover | `artifacts/opus3-cover.png` | scout crouch 1.0, peek cover at (21.39, 18.04) |
| A1/A8 cover adoption + shooter cap | `artifacts/opus3-cover-lobby.png` | 5/6 took cover, peak shooters 3 |
| A2/A4 flank + door traces | `artifacts/opus3-flank.png` | 2 flankers, 3 doors opened once each |
| A3/A7 search + prop-dense spawn | `artifacts/opus3-search.png` | 4/4 search points in correct room, 4/4 spawns escaped |
| A5 flash + smoke | `artifacts/opus3-smoke.png` | blind 4.12 s w/ stumble; heavy pushes, scout holds |
| B1/B2 hostage follow, dodge, cower | `artifacts/opus3-hostage.png` | lateral 0.49→2.26 m dodge; cowers at crouch 1.0 |

Escort regression, run twice with the AI **live** (god mode only), Voss via the
central stairwell and Reid via the **west** stairway: both reached `extracted`,
mission phase `extract`, zero console errors. Reid's west-stair leg is the
observable proof of the doorway fix below — he now arrives in the service corridor
1.7 m behind the player instead of detouring to the central stairwell.

---

## Discrepancies and findings

1. **Broken interior glass cannot open a new walking route.** The brief expected
   the glass refresh to unblock pathing. Every entry in `GLASS_WALLS` has
   `sill >= 0.75`, and `builder.js` emits a solid knee wall from the floor up to
   the sill under each glazed opening. Breaking the pane clears
   `blocksSight`/`blocksMove` on the glass but leaves a 0.75 m parapet, which is
   correctly still impassable — there is no climbing in the game. I verified the
   refresh path executes and the grid is legitimately unchanged (walkability and
   paths identical before/after breaking `g_conf_corr2`). The lowest sill in the
   map is 0.35 m on two vestibule windows, and those are exterior panes that keep
   `blocksMove` after breaking. Net: glass affects sight and fire, never pathing.

2. **Hostage under sustained fire sits at crouch 1.0, not the specified 0.6.**
   The 0.6 hunch-run applies when combat is within 12 m; an active `fearTimer`
   (set by `onCombatNearby`) overrides it to a full cower. With an enemy actually
   shooting nearby, fear stays topped up, so the observable value is 1.0. I left
   fear with priority because full cower reads better than a jog when rounds are
   landing, but the 0.6 tier is reachable and is what shows when combat is nearby
   without a recent fear trigger.

3. **More than one flanker can exist at once.** The spec is one flanker per
   alerted group, which is what the code does. `game.js` calls `alertAlliesNear`
   repeatedly with different origins, so several groups form from one gunshot and
   each picks its own flanker — two in the conference test.

4. **Pre-existing nav bug found and fixed: the west stairway was unusable.**
   `d_bland_corr` (service corridor ↔ west basement landing) is a 1 m opening
   whose span, [9.0, 10.0], lands exactly on 0.5 m cell boundaries. Both candidate
   cell centres sit 0.25 m from a jamb, under the 0.34 m agent radius, so the
   doorway was nav-sealed and every basement route ran through the central
   stairwell. Cells inside a door span now use a relaxed 0.12 m clearance against
   the jambs. This is why hostage escort via the west stair used to take the long
   way round.

   Note the trap I hit implementing it: relaxing the radius for *all* colliders in
   the doorway made the thin closed-door leaf miss the overlap test entirely, so
   locked doors silently stopped blocking paths. The leaf keeps the full agent
   radius; only the jambs are relaxed.

5. **S43 is render-bound, not simulation-bound.** It timed out repeatedly
   mid-wave, so I profiled it. Draw calls and triangle counts stay flat across the
   whole 13-minute fast-forward (1340 draws / 175.4k triangles), so nothing is
   accumulating. Frame time at the test's 1920×1080 viewport under swiftshader is
   400–1300 ms, i.e. 1–3 fps. The in-page simulation work for all 26 chunks is
   only 20–25 s; the rest of the wall clock is Playwright round-trips queueing
   behind slow frames. For reference, earlier in the wave the scene was 82k
   triangles / 1174 draws at 60 fps. The AI is frozen during S43, so none of this
   is AI cost. It passes when the machine is not contended (1.1 min in the final
   run) and flakes under parallel-agent load. Worth flagging to whoever owns the
   prop/geometry budget.

6. **`enemy.stuckRescues`** is the stats field requested; there is no console
   warning for stuck incidents.

---

## Proposed `DIFFICULTIES` tuning (for the lead — I did not edit `constants.js`)

Measured passive time-to-death: player teleported into the lobby with 100 HP +
100 armour, standing still, never returning fire.

| difficulty | first hit | time to death |
|---|---|---|
| recruit | 1.00 s | 19.0 s |
| operator | 1.00 s | 10.0 s |
| nightwatch | 0.75 s | 5.75 s |

First-hit timings track `reactionTime` plus a detection interval, so the
no-insta-lock requirement holds.

Recruit and operator read well and I would leave them alone. Nightwatch at 5.75 s
is the one I would soften slightly:

- `nightwatch.reactionTime` **0.32 → 0.40**
- `nightwatch.enemyDamageMult` **1.35 → 1.20**

Rationale: the new AI already reduces raw incoming damage through the 3-shooter cap
and roughly 50% pop-up uptime, and it still kills a passive player in under six
seconds. The change buys about one extra beat between being spotted and being
committed, which is precisely the beat the cover-based AI now rewards the player
for using. It should land nightwatch near 7–8 s passive, keeping it clearly the
sharpest tier.

This is safe for S24, which allows up to 23 s for the player to die on nightwatch
and requires health below 100 by the 8 s mark — first hit stays at well under 1 s.

I did not propose accuracy changes: `enemyAccuracy` interacts with the cover peek
cycle in ways I could not isolate cleanly in the time available, and reaction plus
damage are the more legible dials.
