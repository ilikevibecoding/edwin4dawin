# Fable 4 report — characters, weapons & first-person viewmodel

Owner: Fable 4 (characters, weapons & animation).
Scope of this pass: `src/characters/humanoid.js` (new),
`src/characters/animation.js` (new), `src/characters/weaponMeshes.js` (new),
`src/characters/bodies.js` (internals rewritten, exported API preserved),
`src/game/viewmodel.js` (rewritten, exported API preserved),
`assets/manifest/characters.js` (CHR-000 placeholder replaced with
CHR-001…009 + WPN-001…008), this report.

## What was built

### Humanoid rig (`humanoid.js`)

`createHumanoid({variant, seed})` builds the joint hierarchy
root→hips→spine→chest→neck→head, shoulders→upperArm→forearm→hand (L/R),
hips→thigh→shin→foot (L/R) as plain `THREE.Group` joints with meshes rigidly
attached — no skinning. Clothing is designed so joint pivots read as garment
breaks (jacket hem at hips, sleeve cuffs at wrists, boot tops at shin).
Proportions at 1.75 m: head 0.23, shoulder width 0.46, arm 0.72, leg 0.85;
head center sits at ~1.64 m standing so `headHeight()`-derived hit boxes keep
working. Geometry is capsules/cylinders/spheres + scaled boxes, all built
once in module-level caches and shared across instances; materials are
likewise shared per outfit. Each character is ≤ ~38 meshes.

Hostile variants (Meridian Cell — every one carries an orange accent as the
enemy read):

- **scout** — gray-green softshell, light chest rig, beanie; slim (0.92
  width scale), orange armband.
- **trooper** — dark slate jacket, plate carrier with mag pouches, ball cap;
  medium build, orange chest patch.
- **heavy** — bulky armor vest, shoulder pads, helmet with orange band;
  broadest silhouette (1.14 width scale).
- **marksman** — hooded parka tone, cheek-pad hood, small backpack, orange
  arm patch.

Head variants: 2 skin tones × {clean, beard, balaclava, goggles} chosen
deterministically from the character seed (enemies hash their id into an
`Rng` seed — same enemy always gets the same face; no `Math.random`
anywhere). Balaclava swaps the skull material and exposes an eye strip;
goggles add a frame + amber lens worn on the forehead.

Hostages: **Voss** — charcoal blazer, light blouse, hair bun, ID lanyard
with card; **Reid** — navy facilities polo with hi-vis trim, khakis, navy
cap. Both get a zip-tie wrist mesh that is visible while bound (kneel pose)
and hidden once freed.

### Animation system (`animation.js`)

Pure procedural, deterministic, no external data. Poses are joint-rotation
sets blended by weight (`POSES` table + `applyPose`). The gait system
accumulates cycle phase from `setMoveAnim(speed, dt)` — phase advances
proportionally to distance, so feet plant without ice-skating; walk blends
into a deeper run cycle by speed, with arm counter-swing, torso lean, and hip
bob. Crouch is a continuous blend (`setCrouch(frac)`): hips drop, knees fold,
torso hunches. Aim overlay drives a two-hand rifle hold toward facing with
`setAimPitch` bending chest+neck so the muzzle tracks the player vertically.
Two-bone analytic IK keeps both hands glued to the weapon's grip and forend
markers through every pose (idle, walk, crouch, aim pitch). Event-driven
twitches: fire recoil (weapon + shoulders kick), flinch on impact.

Deaths: 2 variants — crumple-backward and sideways-twist — picked from the
character's seeded Rng. Both are ~0.9 s animated falls with a slight bounce,
rotating at the root and settling flat on the floor (y clamped, no clipping
through the slab).

Hostage set: bound-kneel (hands zip-tied behind), cower, follow-jog (same
no-skate gait), idle.

### Weapon models (`weaponMeshes.js`)

`buildWeaponModel(id, {firstPerson})` for all eight ids: vireo (compact
pistol), kestrel (PDW/SMG with side-fold stock), ridgeline (railed carbine),
boreas (tube-mag pump shotgun), longwatch (scoped bolt rifle), talon
(drop-point knife), flash (perforated cylinder), smoke (banded canister).
World versions ≤10 parts; FP versions 12–25 parts with extra detail (rails,
irons, lamp lenses, pins/levers on grenades). Silhouettes match the loadout
card SVGs in `src/ui/weaponIcons.js`. Every group exposes
`userData.muzzle` (Object3D at the barrel tip), `userData.magazine`,
`userData.boltOrPump`, and `userData.shellEject`. Materials: dark metals +
polymer + small accents, cached per world/FP set. FP materials get lifted
albedo + a soft emissive fill (the viewmodel sits outside the world's light
rigs), `depthTest:false`, `depthWrite:false`, and `transparent:true` so the
viewmodel draws in the transparent pass after world glass and can never be
washed over or clipped.

### First-person viewmodel (`viewmodel.js`)

`createViewmodel(camera)` → `{group, update(dt, weapons, player),
dispose()}`. The group lives in `Engine.scene` and syncs
position/quaternion from the camera every update (safer than parenting to
the camera). Right+left forearm/glove meshes (charcoal sleeve, dark tactical
glove, watch strap on the right wrist) hold the current FP weapon model; a
per-weapon pose table (`VM_POSES`) sets hip anchor (~0.22, −0.22, −0.45 for
the carbine), ADS anchor (sights align screen center), and both hand grip
targets so hands always look attached. Muzzle never passes ~0.9 m.

Behaviors: draw/holster rise-drop with tilt (driven by `weapons.state` +
`timer`), Lissajous idle sway, movement bob from player velocity projected
into camera space (damped under ADS), ADS lerp via `player.adsFrac`, fire
kick from the `weapon-fire` event (back + up, exponential recovery),
mag reload (weapon cants, mag drops below screen, left hand cycles, charging
tug), per-shell shotgun feed during `reload`, bolt lift-pull-push and pump
forend slide during `pump`, knife idle grip + diagonal swing on fire,
grenade held idle → throw motion on `throw` with the hand returning empty
before re-draw. Crouch/land response uses `player.landDip` and a walk tilt.
Anti-clip: all materials `depthTest:false`, meshes `renderOrder` 990+
(depth-sorted by local z within the rig), `castShadow=false`,
`frustumCulled=false`. `group.userData.muzzleWorld()` returns the active
muzzle's world position for the VFX pass. Viewmodel total is ≤ ~46 meshes.

## Verification

Screenshots (all read and iterated on; in `artifacts/`):

- Characters: `f4_chars_lineup.png`, `f4_chars_front.png`,
  `f4_chars_front2.png`, `f4_chars_close.png` (all four hostiles + head
  variants), `f4_walk.png`/`f4_walk2.png`/`f4_walk3.png` (gait phases),
  `f4_death_mid.png`/`f4_death_end.png` (fall + settled),
  `f4_hostage_bound.png`, `f4_voss_close.png`, `f4_hostage_follow.png`.
- Viewmodel: `f4_vm_idle.png`, `f4_vm_move.png` (bob), `f4_vm_ads.png`
  (irons centered), `f4_vm_draw.png`, `f4_vm_reload.png` (mid-mag-cycle),
  `f4_vm_vireo.png`, `f4_vm_kestrel.png`, `f4_vm_boreas_pump.png`,
  `f4_vm_boreas_shell.png`, `f4_vm_bolt.png`, `f4_vm_longwatch_ads.png` /
  `f4_vm_lw_ads2.png`, `f4_vm_knife.png`, `f4_vm_gadget.png`,
  `f4_vm_throw.png`.

Tests: `npx playwright test tests/02-movement-combat.spec.js` — all pass
(hit boxes intact through the body rewrite). `tests/03-mission.spec.js` also
run — all pass (hostage free/follow/extract flows work with the new rigs).
Zero console errors across all probe runs.

## Discrepancies / known limits

- No skinned deformation (by design) — elbows/knees are rigid joint breaks;
  reads fine at gameplay distances.
- Reload gestures on world characters are a simplified left-hand-to-mag-well
  cycle; enemies never expose a reload state through the bodies API, so it
  only shows via the aim-pose twitch.
- FP materials use `depthTest:false`, so extreme wall-hugging draws the
  viewmodel over geometry closer than the hands — standard FPS trade-off.
- VFX-001 muzzle-flash/casing sprites remain pending (separate VFX pass);
  `muzzleWorld()` and `userData.shellEject` are ready for it.
