# Opus 2 — Player & Combat Systems

Tuning pass on movement feel, gunplay balance, penetration and combat edge cases.
Files touched: `src/game/constants.js`, `src/game/weapons.js`, `src/game/player.js`
(plus this report). Everything below was measured in the running game through
`window.__qa` + `window.__combat` probes on a static build (`vite build` served by
`vite preview`) so that sibling hot-reloads could not disturb the numbers.

Enemy HP for reference: scout 70, trooper 100, heavy 150, marksman 85.

---

## 1. Time to kill

Measured, not calculated: a trooper/scout/heavy/marksman is spawned at range,
the sights are locked on the body, the trigger is held (`tryFire()` each sim
step, exactly the cadence a held mouse button produces) and the clock runs from
the first shot to the frame the target dies. Recoil is compensated between shots,
which is what an aiming player does; the uncompensated column shows the cost of
not doing it.

**Body fire, ADS, standing still — ms (rounds)**

| Weapon | target | 5 m | 15 m | 30 m |
| --- | --- | --- | --- | --- |
| VX-7 Kestrel (SMG) | scout | 167 (3) | 250 (4) | 583 (8) |
| | trooper | **250 (4)** | 333 (5) | 667 (9) |
| | heavy | 417 (6) | 500 (7) | 1083 (14) |
| | marksman | 250 (4) | 250 (4) | 583 (8) |
| HC-4 Ridgeline (carbine) | scout | 200 (3) | 200 (3) | 200 (3) |
| | trooper | 300 (4) | **300 (4)** | **300 (4)** |
| | heavy | 400 (5) | 400 (5) | 500 (6) |
| | marksman | 200 (3) | 200 (3) | 200 (3) |
| B-12 Boreas (shotgun) | scout | **0 (1)** | 2250 (4) | never (10 shells) |
| | trooper | 750 (2) | 2250 (4) | never |
| | heavy | 750 (2) | 3750 (6) | never |
| | marksman | 0 (1) | 1500 (3) | never |
| LR-8 Longwatch (bolt) | scout | **0 (1)** | **0 (1)** | **0 (1)** |
| | trooper | 1367 (2) | 1367 (2) | 1367 (2) |
| | heavy | 1367 (2) | 1367 (2) | 1367 (2) |
| | marksman | 0 (1) | 0 (1) | 0 (1) |
| P-11 Vireo (pistol) | scout | 367 (3) | 367 (3) | 550 (4) |
| | trooper | 550 (4) | 550 (4) | 917 (6) |
| | heavy | 917 (6) | 917 (6) | 1283 (8) |
| | marksman | 550 (4) | 550 (4) | 733 (5) |

`0 (1)` = one shot, so no interval is measured. `never` = target still alive
after ten shells.

**Per-shot damage (ADS, perfect aim)**

| Weapon | body 5 m | body 15 m | body 30 m | head 5 m | head 15 m |
| --- | --- | --- | --- | --- | --- |
| Kestrel | 25 | 22.9 | 11.5 | 57.5 | 52.5 |
| Ridgeline | 31 | 31 | 29.6 | 89.9 | 89.9 |
| Boreas (9 pellets) | 99 | 46.1 | 0 | 140.8 | 20.7 |
| Longwatch | 96 | 96 | 96 | 307.2 | 307.2 |
| Vireo | 26 | 26 | 19.8 | 78 | 78 |
| Talon (knife) | 52 front / **156 backstab** | | | | |

**Trooper @15 m, no recoil compensation:** Kestrel 333 ms (5), Ridgeline 300 ms
(4), Vireo 550 ms (4), Longwatch 1367 ms (2), Boreas 3000 ms (5). Compensation
matters most on the shotgun (the muzzle wallows 3.4°/shell) and least on the
carbine, whose climb is small and predictable.

The design contract this satisfies:

- **Kestrel owns CQB.** It beats the carbine on every target at 5 m
  (trooper 250 vs 300 ms) and loses badly at 30 m (667 vs 300 ms) — 12→30 m
  falloff to 45 % is the price of that cyclic rate.
- **Ridgeline is the all-rounder.** Four body hits on a trooper at *any* interior
  range, 60 % damage retained at extreme range, flat TTK curve.
- **Boreas is 1–2 shells inside 8 m and falls off a cliff.** 99 damage at
  point-blank one-shots a scout/marksman and leaves a trooper at 1 hp;
  falloff 7→20 m to 20 % ends it past ~12 m.
- **Longwatch one-shots scout and marksman in the body at any range** (96 vs 70/85)
  and **one-shots everything in the head** (307 ≥ heavy's 150). Two body hits for
  trooper/heavy, gated behind a 1.15 s bolt.
- **Vireo is an honest backup:** 4 body hits on a trooper, 3 on a scout, and a
  3.0× head multiplier (78) that rewards a calm second shot.
- **Talon backstab (3.0×, 156) is a one-hit kill on every enemy type**, front
  swing 52 is 2–3 swings. Side-on reads as a front swing (52), verified.

**Headshot reliability** (20 shots, ADS, standing still, aim locked on the head box):

| | 5 m | 15 m | 30 m |
| --- | --- | --- | --- |
| Vireo | 20/20 | 19/20 | 7/20 |
| Kestrel | 20/20 | 20/20 | 5/20 |
| Ridgeline | 20/20 | 20/20 | 20/20 |
| Boreas | 20/20 | 14/20 | 6/20 |
| Longwatch | 20/20 | 20/20 | 20/20 |

Pistol/SMG headshots are a close-range reward; rifle-class weapons hold the head
box at 30 m. That is the intended separation.

**Player survivability (operator, 100 hp + 100 armor):** standing in the open
against two troopers at 12 m, not returning fire, the player dies in **4.9 s**
(health/armor trace `1 s: 87/84 → 2 s: 55/45 → 3 s: 42/29 → 4 s: 33/18`). Armor
absorbs 55 % and burns down as it does, so the first exchange is survivable and
the second is not. Dangerous, but you always get the beat you need to break
contact — and the S24 death test still passes comfortably.

---

## 2. Movement

Measured speeds: **run 4.5, walk 2.2, crouch 1.7, ADS-run 2.79** m/s
(`adsSpeedMult` 0.72 → **0.62**, so sights cost you a third of your speed and
aiming while repositioning is a decision).

Jump: `jumpVel` 5.6 (with a hidden 0.78 multiplier) → a clean **4.95 applied
directly**, apex **0.584 m** measured, 467 ms of air time. Result, from the crate
ladder probe:

| obstacle | outcome |
| --- | --- |
| 0.30 m ledge | walked onto it (step-up, no jump) |
| 0.45 m ledge | blocked (step height is 0.34) |
| **0.50 m crate** | **jumped onto it, walked across, stepped off the far side** |
| 0.60 m crate | jumped, apex short of the lip, slid back down the face |
| 0.75 / 1.00 m | blocked |

So a jump clears exactly the low-prop tier the brief asks for and nothing more.

**Landing lockout** (new): landing with downward speed sets
`landLock = landLockTime × (0.6 + impact × 0.6)` (0.16–0.26 s). While it runs,
ground acceleration is cut to `landAccelMult` 0.45 and jumping is refused.
Measured: `landLock = 0.251` at touchdown, re-jump **refused** during the window,
allowed after it expires. Hop-spam therefore costs you cornering control instead
of granting evasion; there is no way to gain speed by jumping (velocity is
clamped to the target speed, not added).

---

## 3. Spread, recoil, ADS

### Per-weapon spread (cone radius, degrees — measured live)

| | hip still | ADS still | hip running | ADS running | ADS crouched | ADS airborne | ADS after 5 shots |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Vireo | 2.20 | 0.62 | 4.20 | 0.82 | 0.46 | 1.48 | 1.43 |
| Kestrel | 2.60 | 0.68 | 4.30 | 0.85 | 0.51 | 1.62 | 1.05 |
| Ridgeline | 2.20 | 0.31 | 4.60 | 0.55 | 0.23 | 0.74 | 0.71 |
| Boreas | 3.60 | 2.59 | 4.60 | 2.69 | 1.94 | 6.22 | 2.59 |
| Longwatch | 6.00 | 0.12 | 10.50 | 0.57 | 0.09 | 0.29 | 0.54 |
| Longwatch (breath held) | — | **0.066** | — | — | — | — | — |

Hip fire at 2.2–2.6° puts every round inside a 0.6 m torso at 5 m (0.19 m cone
radius) and sprays at 15 m (0.58 m radius) — **hip viable under 5 m, ADS
mandatory past 8 m**, which is the readability contract. The shotgun is
deliberately the exception: ADS only tightens the pattern 28 %.

Empirical dispersion sampling (200 aim vectors, mean/max degrees): hip still
1.47/2.19, ADS still 0.20/0.31, ADS running 0.86/1.24, ADS crouched 0.15/0.23.

### First-shot accuracy and bloom

`spreadBase` is the cold-bore cone; every shot adds `spreadPerShot` up to
`spreadMax`, and bloom decays at a per-weapon `bloomDecay` (pistol 6.0 → sniper
1.8 deg/s). ADS is only allowed to discipline `bloomAdsShare` (85 %) of the
accumulated bloom, so a held burst degrades even in the sights. Bloom returns to
0 within 220 ms of trigger release on the pistol and ~1 s on the carbine
(`bloomAfter10 = 0` in every recoil trace once the burst ended).

### Recoil signatures

New per-weapon fields: `recoilDrift` (constant horizontal pull, + = right),
`recoilJitter` (random lateral), `recoilRampPer`/`recoilRampMax` (climb grows as
the burst runs on), `adsRecoilMult`, and `recoilRecover` (recentre rate, now
per weapon via `player.applyRecoil`). Traces below are cumulative muzzle offset
in **cm at 10 m** (vertical/horizontal) per shot:

| weapon | shots 1 → 10 (vertical cm) | horizontal character | recentre |
| --- | --- | --- | --- |
| Vireo | 19 → 31 | ±4 cm random, no drift | **217 ms** (snappy) |
| Kestrel | 9 → 21 | ±7 cm jitter, slight left | 200 ms |
| Ridgeline | 16 → 40 | steady **+6 to +8 cm right** | 317 ms |
| Boreas | 64 (first shell) | ±11 cm | **400 ms** (wallows) |
| Longwatch | 94 (first shot) | ±3 cm | bolt-gated |

That is: pistol snappy recenter, SMG fast small climb with lateral jitter,
carbine steady climb with a slight right drift, shotgun heavy punch and slow
recovery, sniper huge kick behind a slow bolt — as specified. Artifact:
`artifacts/opus2_recoil_hipfire_trio.png` (vireo | kestrel | ridgeline columns),
`artifacts/opus2_recoil_shotgun_sniper.png`.

### ADS refinement

- `adsFrac` is now an eased curve (`1 − (1 − t)^2.4`) over the raw `adsT` ramp:
  fast off the mark, soft into the last few percent. Ease-out runs at 1.33× the
  ease-in rate so lowering the sights feels lighter than raising them.
- Sensitivity scales with the zoom actually on screen — `sens × fov/baseFov`,
  taken 85 % of the way to true zoom compensation (`player.adsSensScale`). The
  1.12× pistol barely changes; the 2.9× Longwatch crawls without feeling icy.
- Aiming is refused while reloading or throwing, so **a reload drops the sights**
  and they re-raise automatically if the button is still held.

### Hold breath (Longwatch)

Holding Shift while scoped with a `steadyMult` weapon steadies the rifle:
spread ×0.55 (measured 0.12° → 0.066°) via a smoothed `steadyFrac`. Breath is a
resource: it drains over `steadyTime` 4 s and refills 1.6× slower
(measured: `breath 1 → 0` in 4 s, back to 0.32 after 2 s of rest), and the bonus
fades with it, so there is no permanent free accuracy. `steady`, `steadyFrac`
and `breath` are public for a future HUD/zoom-stabilise hook (viewmodel sway
untouched).

### Counter-strafe / stop-and-pop

Movement penalty is keyed to *current* velocity (`moveBloom` tracks
`speed / runSpeed` instantly upward) and settles over `COMBAT.moveSettleTime`
0.12 s downward, with ADS only cancelling 60 % of it. Measured decay after
releasing the key (Ridgeline, ADS):

| | spread | speed |
| --- | --- | --- |
| running | 1.248° | 2.79 m/s |
| +40 ms | 0.888° | 1.72 |
| +80 ms | 0.347° | 0.12 |
| **+120 ms** | **0.308°** (= standing still) | 0 |

Stopping restores full accuracy in ~120 ms: the tactical stop-and-pop rhythm.
Artifact: `artifacts/opus2_stop_and_pop.png` — left group fired while running,
right group 130 ms after the stop, same wall, aim re-locked per shot.

### Crouch

Crouch transitions 5.5/s down, 7/s up (standing back up is the slower half of a
peek, and needs headroom). Crouched + grounded fire gets `crouchSpreadMult`
**0.75×** — 0.31° → 0.23° on the carbine, a real reason to drop.

---

## 4. Penetration

Rewritten around two ideas: the **distance actually traversed through the
material along the shot line** (`traversalThickness`, an exact AABB slab exit —
an oblique shot through a 0.16 m wall must chew through more than 0.16 m) and a
**material tier table** in `COMBAT.penetration` (`minPen`, `maxThick`, `retain`,
`cost`). Weapons spend penetration "layers" (`cost`, fabric 0.5 / solid 1.0) up
to `clamp(w.penetration, 1, 3)`, and range falloff is now measured from the
muzzle across the whole chain instead of restarting at each exit hole.

Verified against the **shipped world geometry** (colliders picked from the live
scene with a clear line of fire, trooper 1 m behind, damage read from health):

| cover | Vireo | Kestrel | Ridgeline | Boreas | Longwatch |
| --- | --- | --- | --- | --- | --- |
| Cubicle fabric panel, 0.08 m (`carpet`) | 70 % | 70 % | 78 % | 66 % | 90 % |
| Sheet-metal panel, 0.04 m | 70 % | 70 % | 78 % | 66 % | 90 % |
| Upholstered chair, 0.45 m (`carpet`) | 63 % | 63 % | 70 % | 60 % | 84 % |
| **Interior drywall wall, 0.16 m** | blocked | blocked | **50 %** | blocked | **60 %** |
| **Solid wood door, 0.18 m** | **54 %** | **54 %** | **60 %** | blocked | 72 % |
| Glass door panel | 90 % | 90 % | 90 % | 90 % | 90 % |
| Wooden desk shot side-on (0.67 m) | blocked | blocked | blocked | blocked | blocked |
| Cardboard pallet stack (0.43 m) | blocked | blocked | blocked | blocked | blocked |
| Steel locker (0.72 m) | blocked | blocked | blocked | blocked | blocked |
| Concrete / brick / tile / stone, any thickness | blocked | blocked | blocked | blocked | blocked |

This lands the brief exactly: carbine/rifle through interior drywall at
**40–60 % retained**, SMG/pistol only through doors and thin panels, shotgun
through **neither** wall nor door, and every prop panel thinner than 0.09 m
(cubicle dividers, sheet rails) drilled by **everything** with light loss.
Obliquity works: the same 0.20 m wall penetrates head-on (0.20 m of material) and
stops the round at 45° (0.283 m), verified with staged geometry.

Only `wall`, `door`, `prop` and `rail` colliders are ever penetrable — invisible
bounds, ceilings and barriers stay solid — and `hardSurfaces` (concrete, brick,
stone, marble, tile, snow) are exempt regardless of thickness.

---

## 5. Edge cases hardened

| case | behaviour now | evidence |
| --- | --- | --- |
| **Reload cancel on switch** | switching mid-reload aborts cleanly; rounds only move at timer completion, so no dupe/loss. `weapon-reload-cancel` is emitted. | `11/90` → reload → switch → back → still `11/90`, then a full reload gives `30/71` |
| **Reload drops ADS** | `canAds` excludes the reload/throw states; sights re-raise if the button is still held | ADS probe |
| **Firing while switching** | blocked in `draw`, `pump`, `throw`; no stray shot on arrival | edge probe: 0 shots during switch |
| **Reload during pump/bolt** | never cuts the cycle short — the intent is queued and fires the instant the action completes (bolt 1150 ms, then reload runs) | `reloadDuringPump: pump queued=0.5` → `afterPump: reload` |
| **Buffered R** | an R pressed during a draw/pump/bolt is remembered instead of swallowed (and only ages out while the weapon is idle); a switch clears it, so a queued reload never follows the player onto the next weapon | `afterSwitch: queued=0`, vireo untouched at `9/60` |
| **Shell-reload interrupt** | firing mid-shell-reload racks what is in the tube (`pump`, 0.18 s) and fires immediately after | `midShellReload 3/29` → `pump` → fires, `2/29` |
| **Dry-fire → auto-reload** | dry click, 0.28 s cooldown, reload starts if reserve remains | `dryFire: reload 0/8` → `1/7` |
| **Gadget quick-throw (G)** | draws the gadget, throws on draw completion, returns to the *original* slot; a deliberate switch mid-draw clears the pending return (no stale forced switch) | edge probe |
| **Empty gadget** | last charge thrown auto-switches to the previous (non-gadget) slot; selecting an empty gadget slot is refused | edge probe |
| **Damage direction** | `player.takeDamage(amount, dirRad)` still accepts the shooter convention `atan2(dx,dz) − yaw + π`, and `hudArcAngle` converts it to screen space (clockwise from up). The shooter convention runs counter-clockwise, so it was mirrored on screen before this pass; it is now negated (and an `{x,z}` source is resolved against the player's own yaw). | trooper flanking from behind-right: computed 122°, DOM arc `rotate(2.1246rad)` = 121.7°, artifact `artifacts/opus2_damage_arc.png` |
| **Grenade underhand** | looking down past ~30° scales the throw from 11 → 4.4 m/s and flattens the loft, so the charge lands a couple of metres away instead of skipping down the corridor. Fuse-based detonation keeps the timing identical. | grenade arc probe |
| **Walking off a prop** (bug found in this pass) | stepping off the far edge of a crate used to teleport the player back to its near face: the slide clamp assumed you always approach a blocker from the near side, and a falling player whose feet are still inside the footprint re-triggered it. The clamp now picks the face by which side of the collider the player is on. | mount trace: crossed a 0.5 m crate and stepped off at x 24.74 instead of snapping back to 22.86 |

---

## 6. Verification

Static build served on a private port so sibling hot-reloads cannot destroy the
test context (`vite build --outDir /tmp/nsbuild` + `vite preview --port 5199`).
Probes step `game.update(1/60)` directly and only render when a screenshot is
needed — `Engine.advanceManual` renders every call, which is seconds per frame
under software GL.

Probes (all reported **zero console errors**): TTK/per-shot damage, hit-reg +
head boxes + melee facing, ADS state/sensitivity, movement + jump + landing lock
+ recoil traces + dispersion, crate mount trajectories, penetration tiers vs
staged geometry, penetration vs shipped props/doors/walls, combat edge cases,
pump/bolt rules + hold breath + time-to-death.

Artifacts:

- `artifacts/opus2_recoil_hipfire_trio.png` — 8-round hip bursts, vireo / kestrel / ridgeline columns on one wall at 8 m
- `artifacts/opus2_recoil_shotgun_sniper.png` — boreas and longwatch groups, same wall
- `artifacts/opus2_stop_and_pop.png` — running group (left) vs 130 ms-after-stop group (right)
- `artifacts/opus2_damage_arc.png` — damage arc lit toward a trooper flanking from behind-right

Tests: `tests/02-movement-combat.spec.js` **6/6 green**; full suite **14/14**
(`npx playwright test` → `14 passed (7.2m)`).

A note on flakiness for whoever runs these next: the suite shares the HMR dev
server on 5173, so any file saved while it runs reloads the page mid-test and the
failure reads `page.evaluate: Execution context was destroyed`. Three earlier
runs each lost a different unrelated test that way (S40-S42, then S02, then
S02/S05/S22 during one of my own saves); every one of them passed on a re-run
with nothing being edited. If a run fails, check for that message before
suspecting the assertion.

Public API kept intact: weapon states `idle|draw|reload|pump|throw`,
`getHudState` shape, `ammoOf`, `stats`, `bloom`, `adsHeld`, `timer`; player
`moveState` names, `adsFrac`, `recoilPitch/Yaw`, `crouchFrac`, `eyePos`,
`forwardDir`, `takeDamage(amount, dirRad)`, `heal`, `addArmor`. Ridgeline stays
30/90 with reload-to-30. All randomness goes through `rng`.

---

## 7. Discrepancies and notes

1. **Head box vs character head.** Characters carry `headHeight ≈ 1.66`; the hit
   box from `enemy.hitBoxes` registers `head` from **1.54 to 1.78 m** at 10 m
   (0.24 m tall) and `body` from 1.30 m down. Aiming at the visual head centre
   and anywhere in the upper skull reads as a headshot, and there is no dead gap
   between the boxes. Above 1.82 m is a clean miss. No fix needed in my files;
   flagged because `enemy.js` owns those numbers.
2. **Melee arc.** Backstab uses `facingDir · toTarget > 0.35` (rear ~140°).
   Side-on attacks correctly deal front damage. Knife range is 1.7 m, longer than
   the 1.0 m in the original brief — that is the shipped value and it feels right
   against the new bodies.
3. **Shotgun ADS.** `spreadAdsMult` 0.72 means sights barely help the Boreas.
   Intentional (pattern is pattern), but it makes the shotgun the one weapon
   where ADS is nearly cosmetic beyond the zoom.
4. **Upholstered furniture is soft cover.** Fabric chairs/sofas (`carpet`
   surface) now pass bullets at 60–84 % up to 0.62 m of traversal, while wooden
   desks and steel lockers still stop them. Waist-high props that already do not
   block sight therefore no longer make bullet-proof cover out of a cushion.
5. **Zoom stabilisation while holding breath** is exposed (`steadyFrac`) but not
   applied to the camera — FOV is driven outside my files, so I left the hook
   instead of reaching into it.
6. **`hudArcAngle` is a compatibility shim.** The cleanest fix would be for
   shooters to report a clockwise screen bearing, but `enemy.js` is not mine, so
   the conversion lives in `player.takeDamage`. If enemy code ever changes
   convention, that negation is the one place to revisit.
