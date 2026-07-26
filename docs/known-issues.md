# Known Issues

Live list — newest first. Move fixed items to the bottom with ✔ and the fix commit.

## Open (accepted limitations, in scope)

- (minor) Training/facilities south halves lean on hemisphere + window light and
  read dim-but-playable; adding lights would exceed the contained-light budget
  rule. Accepted after audit 3 review.
- (minor) Character faces are stylized pixel-block features; readable at combat
  distances, visibly low-fi at point-blank inspection. Matches the visual bible's
  readable-silhouette priority; hero fidelity is out of scope.
- (env) S43 (timer-expiry defeat) can exceed its Playwright timeout when many
  agents share this VM's CPU — SwiftShader software GL, not a game defect.
  Passes in isolation; see `docs/perf-summary.md`.
- (env) All CI rendering runs on SwiftShader; real-GPU frame rates are
  significantly higher than the perf-summary numbers imply.

## Fixed

- ✔ Audit 3: restroom mirrors rendered pitch-black (metalness-1 with no env
  map) — faked mirror glass with gradient sheen + emissive floor.
- ✔ Audit 3: restroom-hall light blew out the poster wall (i 22 → 16).
- ✔ Audit 3: basement utility room had no dynamic light; near-black on a
  patrol route — pr-2 light added, budgets high 17 / ultra 21.
- ✔ Audit 3: north corridor west end cap was a bare drywall field — evac plan
  + exits poster.
- ✔ Audit 2: viewmodel washout in bright rooms — dedicated VM render pass with
  a stable light rig (`b432a20`).
- ✔ Audit 2: basement cable-tray bleed-through + grazing-angle ceiling
  collapse on low-precision GL — logarithmic depth + dual near planes +
  2.5 m slab tessellation (`b432a20`, `f19747d`).
- ✔ Audit 2: janitor closet ceiling void, noisy drywall normals, crushed
  foliage, dim copy/IT rooms, bare east-hall wall (`542ab44`).
- ✔ Audit 2: dark elliptical wear blobs on hard floors — dedicated
  `wear_hard` decal region (`f19747d`).
- ✔ Audit 1: light leaking through walls — containment rule: every light's
  distance stays within its room (`5480295`).
- ✔ Audit 1: black service-room ceiling voids — painted joists + strips.
- ✔ Audit 1: frosted glass was transparent to AI vision while opaque on
  screen — Playwright-vs-render disagreement (`8f5aaa4`).
- ✔ Viewmodel arms read as gray tubes — tactical sleeves/gloves (`62522e3`).
- ✔ Pickups were placeholder boxes — modeled medkit/ammo/armor/keycard props
  (`62522e3`).
- ✔ Garage sprinkler main ended mid-air — drop + head added (audit 2).
- ✔ Spawn faced south instead of north (yaw convention) — fixed in map data.
- ✔ Octal literal syntax error in enemy.js combat ranges.
- ✔ Corrupt entry in vfx impact color table.
