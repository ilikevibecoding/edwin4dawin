# clouds4 — defect log (Atmosphere Agent, rubric 24 Cloud realism)

Worktree `wt-clouds4`, branch `cursor/clouds4-loop-8213`, baseline dist served on :4540 (HEAD 6130eae7), candidate
dists on :4541+. Seed 20260904. Grid cells are the 8×8 A–H / 1–8 of the 1920×1080 still.

Test cameras (besides the bench views `aerial-a`, `cloudy`, `island-pass`, `sunset`, `cockpit-city`, `night`):

- `under` — `dev&cam=2600,1100,-3900&hdg=0&pch=40&fov=60&time=14.6&weather=scattered` (200 m under a cumulus base, looking up)
- `baselevel` — `dev&cam=0,1300,0&hdg=0&pch=2&fov=50&time=14.6&weather=scattered` (level with the bases)
- offline prototype cameras (numpy port of CLOUD_FRAG, see method): U1 under-edge `2600,1100,-2300 hdg 0 pch 25`,
  A1 = aerial-a camera, T1 above `2600,3000,-1200 pch -25`, C1 = cloudy camera, S1 = sunset camera.

## Method note

The GPU captures queue behind ~10 builders (Chrome gated to 2 instances), so the density/lighting model was
ported to numpy (`/tmp/clouds4/lit.py`: the macro field, envelope, noise erosion, light march, 3-octave
scattering, ambient split and tonemap of `sky.ts`) and iterated offline on 320×180 frames (15–120 s each);
every kept change is then verified on the GPU build against the :4540 baseline. Offline frames are not
evidence for the report; only GPU crops are.

## Round 0 — observe / diagnose (baseline 6130eae7)

Captured `bench/out/clouds4-base` (aerial-a, cloudy, island-pass, sunset, cockpit-city, night, under, baselevel).

### D1. Bases are opaque planes ("flat marshmallow slab") — aerial-a C1–F2, under (whole frame), baselevel
Visible: every cumulus ends below in a level, smooth, pale surface; from 200 m underneath the base is a uniform
light-grey ceiling with no relief. Diagnosis (code + numpy cross-sections `/tmp/clouds4/cur_side.png`):

- the base is the iso-surface of a smooth ramp: `envelope()` ramps density in over `baseRamp` = 0.13·thick =
  286 m and the shape noise that should rag it has almost no contrast — the 64³ noise channels use a tiny part
  of the 8-bit range (R mean 0.74 / std 0.068, A std 0.063, B std 0.072; the composite `shape` term has std
  0.077), so `1.2·e − (1−shape)·0.8` moves the base surface by a few tens of metres only. Measured base-altitude
  relief (bottom view, od = 1 crossing) after removing the 3 km cell-to-cell variation: **std 12 m**.
- **slab clip**: the march starts at `uCloudBase` (`t0 = tb`) but `envelope()` places cells with `baseVar < 0.5`
  up to 0.11·thick + 0.04·thick = **330 m below `uCloudBase`** (970 m in the scattered preset). Everything
  under 1300 m is never sampled from a camera below the layer, so those cells are planed off at exactly
  1300 m: a geometric flat cut, not a shading problem. (`lightOD` also stops at `uCloudBase − 300`.)
- the base is too bright: the light march's mean density falls to 0 in the upper half of the envelope (the noise
  erodes the top 60 % of the column), so the optical depth from a base sample toward the sun is only ~6; the
  slow multiple-scattering octave `0.20·exp(−0.06·od)` then returns 0.14 of the sun, plus 0.36·exp(−0.25·od) =
  0.07: base radiance ≈ 0.21 × 2.7 = 0.57 linear + ambient 0.12 → sRGB ≈ 205 against a clipped-white top.
  A real fair-weather cumulus base sits at sRGB 110–160 with darker cores.

### D2. Vertical striations once the noise contrast is raised — prototype U1
The noise-domain warp `q + vec3(f.w·0.9, f.z·0.53, f.w·0.6)` shifts the 3D noise by 0.9 tile (2.3 km) per unit
of the ~1 km turret field: the noise is compressed horizontally by up to 3× along turret gradients. Invisible at
the current contrast, it turns into vertical drapery as soon as the shape term gets a usable amplitude.

### D3. Camera at base level (baselevel view, camera inside the ramp zone)
Fine step `dtF = pathLen / (budget·0.6)` is sized for the whole slab crossing (up to 42 km for near-horizontal
rays), i.e. ~365 m even for the cloud 50 m from the camera; the detail erosion is faded out (`detFade`) and the
near cloud is a coarse, structureless fog. Prototype also shows point-sampling speckle when fine erosion is
sampled at 40 m steps: the near field needs a step bound independent of the far path.

### D4. No high cloud in clear/scattered skies — island-pass, cockpit-city, aerial-a upper rows
Above the cumulus the dome is a bare gradient (rubric 24 "layering").

### D5. Cloud shadow footprint vs. cloud
`cloudShadow` uses the raw footprint `smoothstep(thr, thr+0.09)` while the visible cloud is `cov²` shredded by
noise: shadows are wider and softer than the clouds that cast them (aerial-a water, plan-view diagnostic).

### D6. Clouds are composited in the sky dome (architecture, not fixable here)
The cloud layer is blended in `DOME_FRAG` behind all geometry (depth-tested dome), so clouds are never drawn
in front of terrain or water: from above the layer they vanish against the ground (plan-view diagnostic from
9000 m shows only their shadows), and from base level the far band is cut at the terrain horizon. Noted for the
lead / Lighting Agent (post.ts owns the depth composite).

### Baseline metrics (stills, high quality, SwiftShader)
aerial-a 289 calls / 1.10 M tris, cloudy 309 / 1.29 M, island-pass 255 / 0.55 M, sunset 283 / 1.02 M,
cockpit-city 269 / 1.12 M, night 252 / 1.28 M; console clean. Sync frame (sw) aerial-a 5979 ms, cloudy 7427 ms.

### Candidate direction (offline, to be verified on GPU in round 1)
- re-bake the noise with full-range channels (mean 0.5, std 0.16 / 0.16 / 0.10 / 0.16) — precision and contrast;
- base geometric warp: displace the base altitude by an isotropic perlin fetch (σ ≈ 60 m, 325–650 m features)
  faded out above 0.2–0.35 of the slab, ramp 0.13 → 0.07; extend the march slab below `uCloudBase`;
- Nubis-style inverted detail (1 − worley) confined to the thin base zone: rags and scud, not cheese holes;
- gentler noise-domain warp driven by the 10 km tower field (D2);
- darker multiple-scattering tail for cumulus: octaves 0.44·e^−od, 0.34·e^−0.3od, 0.14·e^−0.2od (deck path kept);
- prototype result U1: base relief std 12 m → ~70 m, base sRGB ~205 → ~150 with lumps, ragged fringe, scud.
