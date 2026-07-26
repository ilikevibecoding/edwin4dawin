# Fable 4c — Character / Weapon Polish Pass

Owner: Fable 4c. Scope: the eight audit findings from the lead's visual review.
Files touched: `src/game/viewmodel.js`, `src/characters/weaponMeshes.js`,
`src/characters/pickupModels.js`, `src/characters/humanoid.js`,
`src/characters/animation.js`, `src/characters/bodies.js`,
`assets/manifest/characters.js`, this report.

All evidence shot at 1920×1080 through `tools/shot.mjs` (qa.startMission →
freezeAI + god → scenario → advanceTime → screenshot), zero console errors on
every probe.

---

## 1. First-person arms (was: "bare light-gray pipes")

Rewrote `buildArm()` in `viewmodel.js`:

- **Sleeve**: charcoal/dark-slate softshell (`0x272c31`, roughness 0.92),
  forearm cylinder **tapered elbow→wrist** (r 0.0475 → 0.0405) and re-aimed so
  the elbow sits down-and-out toward the lower screen corner (was: nearly
  camera-parallel tube).
- **Cuff seam**: darker cuff band (`0x1d2124`) with a lighter stitch-seam ring
  between cuff and sleeve; watch strap + face on the left wrist.
- **Glove**: black tactical (`0x141618`), back-of-hand plate, four fingers with
  curled tip segments wrapping the grip, thumb, **hard knuckle plate** and a
  finger-guard ridge, wrist strap with buckle.
- **Material fix for bright light**: emissive floor cut from 0.26× to 0.12× of
  albedo and albedo dropped to true charcoal. FP weapon material boost cut from
  1.6×/0.26 emissive to 1.18×/0.13 (`weaponMeshes.js`) so weapons stopped
  washing out under the cubicle fluorescents too.
- Silhouette stays slim: arm cross-section ≤ 0.05 m radius, one arm per side,
  shared geometry cache (`ARM_GEO`).

Evidence — before: `artifacts/tourB_cubicles.png`, `artifacts/tourB_lobby.png`,
`artifacts/f4c_before_arms_cubicles.png`. After (per weapon, bright + dark):
`artifacts/f4c_arms_cubicles_{vireo,kestrel,ridgeline,boreas,longwatch}.png`,
`artifacts/f4c_arms_garage_{vireo,kestrel,ridgeline,boreas,longwatch}.png`,
moving: `artifacts/f4c_arms_moving.png`, ADS: see §7.

## 2. Pickup models (was: primitive tinted blocks)

`pickupModels.js` rewritten; contract unchanged
(`buildPickupModel(type) -> THREE.Group`, pivot at base, ≤ 0.4 m tall), shared
geometry/material caches, `CanvasTexture` decals built once.

- **medkit** — white case 0.34×0.135×0.24 m, red canvas cross decal on lid +
  front, red belly band, two steel latches, handle, rounded feet.
- **ammo** — olive steel can 0.30×0.20 m, stenciled canvas label
  **"5.56 / 9MM MIXED — VEKTRA"** on the side and lid, fold-flat handle, lid
  lip, latch.
- **armor** — folded plate-carrier bundle ≈0.42×0.17 m: cordura shell, visible
  ceramic plate, MOLLE webbing rows, two buckle straps over the fold, shoulder
  pads.
- **keycard** — white card on a short lanyard with clip + name tag, **teal
  emissive edge** so it reads at range; propped at a slight angle.

Evidence — before: `artifacts/f4c_before_pickups_security.png`. After:
`artifacts/f4c_pickup_security.png` (+`_security2`), `artifacts/f4c_pickup_itroom.png`
(keycard), `artifacts/f4c_pickup_server.png` (armor+ammo),
`artifacts/f4c_pickup_break.png` (medkit), close-ups
`artifacts/f4c_pickup_ammo_close.png`, `artifacts/f4c_pickup_armor_close.png`.

## 3. Enemy weapon variety

Already wired in `bodies.js` (`ENEMY_WEAPON` map) — verified, not changed:
scout→**kestrel**, trooper→**ridgeline**, heavy→**boreas**,
marksman→**longwatch**, all WORLD models from `buildWeaponModel(id,
{firstPerson:false})`, right hand glued to `gripR` via the chest anchor, left
hand two-bone-IK'd to `gripL` every frame.

Evidence: `artifacts/f4c_enemy_lineup.png` (all four archetypes side by side,
distinct silhouettes: scoped rifle / pump shotgun / carbine / PDW). Before:
`artifacts/f4c_before_enemies.png`, `artifacts/f4c_before_enemies_front.png`.

## 4. Muzzle origin for enemy tracers — API exposed

`bodies.js`: every body (enemy + hostage) now exposes

```js
body.muzzleWorld(out?: THREE.Vector3): THREE.Vector3
```

World position of the held weapon's `userData.muzzle` marker (matrix-world
refreshed on call); unarmed bodies (hostages) fall back to an eye-line point.
**Note for VFX owner**: the enemy tracer visual origin in `src/fx/vfx.js` /
`src/game/enemy.js` is *not* reachable from the character files — `enemy.js`
currently emits `enemy-shot` with `from = eye position`. Swap that origin for
`this.body.muzzleWorld()` when you pick this up; the API is live today.

## 5. Hostage zip-tie bound → freed

Verified, no change needed: the wrist tie mesh (`rig.meshes.tie`) is visible
while Voss kneels bound and is hidden by `setCrouch()` once freed (< 0.5 crouch
frac). Evidence: `artifacts/f4c_hostage_tie_bound.png` (close-up, tie visible
at the wrists), `artifacts/f4c_hostage_tie_freed.png` (after
`qa.freeHostage('voss')` + 1.5 s — tie gone, hostage standing).

## 6. Death settle — two fixes

Audit found two real problems while verifying:

- **Knee separation**: thigh capsule ended 0.058 m above the knee pivot and the
  shin capsule started below it — invisible when standing, an obvious detached
  shin at the bent death poses. Fixed in `humanoid.js`: thigh capsule extended
  to the knee pivot (`cap(0.062, 0.32)` @ −0.24), shin capsule raised so its
  rounded cap hugs the pivot (`cap(0.05, 0.25)` @ −0.15), boot top extended to
  keep the ankle covered.
- **Weapon pointing at the ceiling**: the hand-glued gun ended up vertical in
  both settle poses. Fixed in `animation.js`: `playDeath()` now calls
  `dropWeapon()` — the weapon detaches from the hand and lies **flat beside the
  body** (deterministic side/yaw scatter from the animator's seeded Rng, rolled
  onto its side, y = 0.05). Variant-0's right arm also flops flat instead of
  reaching up.

Root height verified: root lerps to `rootY × scale` (−0.85 / −0.82) and both
corpses rest flat — no half-clipping through carpet, no floating.
Evidence: `artifacts/f4c_death_carpet.png`, `artifacts/f4c_death_carpet_close.png`
(trooper on cubicle carpet), `artifacts/f4c_death_concrete.png` (heavy on
service-level concrete).

## 7. ADS alignment audit

Method: ADS screenshot per weapon, cropped 3× around the exact screen center
with a rendered center marker, sight-point offset read in screen pixels at
1920×1080. Sights themselves were upgraded in `weaponMeshes.js` so every weapon
has a real aim point (FP models only; world silhouettes untouched):

- vireo: open-notch rear ears + glowing front dot (was a solid rear block that
  hid the post).
- kestrel: hollow dot-sight housing with tinted lens + emissive dot (was a
  solid box — nothing to aim with).
- ridgeline: aperture-ear rear + glowing front dot.
- boreas: gold bead (existing) — pose height corrected.
- longwatch: etched crosshair reticle on the ocular lens.

| Weapon | ADS offset (final, `VM_POSES[].ads`) | Sight point vs crosshair |
|---|---|---|
| vireo | `[0, -0.081, -0.36]` | centered (≤ 2 px) |
| kestrel | `[0, -0.1012, -0.4]` | centered (≤ 1 px) |
| ridgeline | `[0, -0.0912, -0.42]` | centered (≤ 1 px) |
| boreas | `[0, -0.0762, -0.42]` | centered (≤ 2 px; was 6 px high at −0.0745) |
| longwatch | `[0, -0.0973, -0.3]` | reticle centered (≤ 2 px) |

Evidence: `artifacts/f4c_ads_{vireo,kestrel,ridgeline,boreas,longwatch}.png`
(before-tuning set kept as `f4c_ads_*_v1.png`, first baseline
`artifacts/f4c_before_ads_ridgeline.png`).

Also verified in FP:

- **Shotgun per-shell reload**: red shell with brass head visibly fed under the
  receiver toward the loading port each cycle —
  `artifacts/f4c_boreas_shellload.png`.
- **Longwatch bolt lift**: bolt handle visibly rotates up and pulls back after
  each shot — `artifacts/f4c_longwatch_bolt.png`.

## 8. Casing eject origin — API exposed

`viewmodel.js` already exposed `group.userData.muzzleWorld()`. Added:

```js
group.userData.ejectWorld(): THREE.Vector3
```

World position of the active weapon's `userData.shellEject` marker (all five
gun FP models carry one — the vireo's was added at the slide port in this
pass); falls back to `muzzleWorld()` when no port exists (knife/gadgets).
**Note for VFX owner**: consume this instead of the muzzle for casing spawns.

---

## Test results

`npx playwright test tests/02-movement-combat.spec.js tests/03-mission.spec.js`
→ **10 passed (6.6 m)**. (One earlier run flaked on S43 "timer expiry defeats"
— a 120 s wall-clock timeout while fast-forwarding 12 game-minutes under
software GL with parallel load; the defeat screen was already showing in the
failure snapshot, and the test passes standalone in 1.6 m and in the final full
run.)

## Remaining discrepancies / notes for other owners

- **Enemy tracers still originate at the eye line** — `body.muzzleWorld()` is
  live, but the emit site (`enemy.js` → `vfx.js`) is outside my file set (§4).
- **Casings spawn at the muzzle until VFX consumes `ejectWorld()`** (§8).
- Sleeve tops can still catch a mid-gray highlight at glancing angles directly
  under a fluorescent panel (rough-fabric lambert); values hold well in every
  probed room and this reads as lighting, not as the old bare-pipe gray.
- QA note: `qa.freezeAI(true)` stops body yaw from syncing, so frozen spawned
  enemies keep their spawn heading — lineup evidence was shot from the north
  for front views.
