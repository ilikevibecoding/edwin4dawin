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

Also found while porting the field to numpy: the Python `hash22` had the GLSL swizzle wrong, so the first
offline cell positions were fiction; fixed (`fract((p3.xx + p3.yz) * p3.zy)`) and re-validated against the game's
shadow pattern from a 9 km plan-view shot. The `under` cameras below were re-placed on real cells:
`under` = `cam=5000,790,-7600&hdg=0&pch=40&fov=60` (cell base 991 m, i.e. 309 m below `uCloudBase` — a cell the
baseline planes off), `under2` = `cam=-1300,990,1900&hdg=0&pch=35&fov=60` (base 1187 m).

## Rounds 1–5 — first GPU verification (builds c8b52a32 r1 … ce5c5a5c r5, stills 1280×720 high)

Kept (crops in `crops/r5_*`):
- **D1 fixed in the aerial views** (`r1_aerial_zoom_base_vs_r1`, `r5_aerial_top_base_vs_r5`): the bases are grey,
  lumpy undersides with a ragged fringe and sunlit cauliflower crowns; the cell whose base sits below `uCloudBase`
  now hangs down instead of ending in a plane. Cloudy deck (`r5_cloudy_base_vs_r5`): visible cell relief and
  dark/bright cells on the underside instead of an even lid. Sunset: bellies shaded, rims brighter. Night: no
  visible change at this scale (moon key path untouched).
- **Slab clip**: confirmed on GPU — `under` (200 m below a cell with base 991 m) shows a flat ceiling with a
  straight edge in the baseline and a hanging, lumpy underside in r1+.

Rejected / new defects:
- **D7 funnel** (`r5_under2_base_vs_r5_funnel`, r4/r5): with the relief taken from the 3D noise *at the sample*,
  the base iso-surface `y = base + warp(x, y, z)` folds over wherever ∂warp/∂y > 1 m/m (σ 60 m over a 162 m
  vertical period gives slopes up to ~3): pointed sacks hang from the base and one reads as a funnel cloud.
  r1's 3-octave A-channel relief showed it less, r4's B-channel (2 octaves) more.
- **D8 radial streaks from inside the layer** (`r5_baselevel_base_vs_r5_streaks`): same cause seen edge-on — a
  horizontal ray at base altitude passes in and out of the folded surface, so the density switches on and off
  along each ray and the overhead mass shows rays radiating from the vanishing point. r5's distance-proportional
  step made the near puffs at left better resolved but did not remove the streaks.
- **D9 the close base is a soft blur** (`r5_under_base_vs_r5`): 200 m under the base the relief is 100–300 m
  soft lumps with no crisp detail; the near-field worley erosion (r3) hardly shows because the density
  saturates inside the base zone, and the ambient has nothing that shades the relief (sun above the cloud,
  `aoSky` at its floor under a tall column).
- **D10 cirrus veil invisible** (`r5_island_base_vs_r5`, aerial, cockpit): the veil sits at 9 km, i.e. 30–90 km
  away for elevations under 17°, and `applyAerial`'s far-plane dissolve (33→57 km) blends it exactly to the sky
  colour; every bench camera sees the sky below 25° elevation, so nothing was drawn.
- Cost: interleaved timings in one browser were too noisy to read (3 Chrome instances on the machine, ±30 %
  between identical views); `under` (all cloud, close) 1.2 s → 1.7–2.2 s is the one consistent regression and
  is addressed in r6 (one fewer fetch per light-march step, relief fetch only in the base zone of the main march).

## Round 6 — fixes (build 9c116e21)
- relief as a **2D height field**: fetched at `(x, baseAltitude, z)`, so `y = base + warp(x, z)` cannot fold
  (D7, D8); ramp 0.07 → 0.05 (110 m) for a crisper condensation level;
- **relief shading**: pouch bottoms open to the horizon/ground bounce (+30 % ground ambient, +20 % sky),
  hollows shadowed by their neighbours (−30 / −20 %) — the only cue the ambient can give for the relief (D9);
- light march on the smooth base (one fetch per short step; a pouch lit as if at the mean base is close to right);
- cirrus: hazed with the physical optical depth to 9 km instead of `applyAerial` (D10), fibre octaves fade
  beyond 20–60 km so a 2.6 km fibre does not shimmer at a few pixels wide.

### Round 6 results (stills `/tmp/clouds4/r6`, 1280×720 high, one persistent Chrome; crops `crops/r6_*`)
Fixed: **D7** (no funnels in `under2`), **D8** (no radial streaks in `baselevel`), **D10** (veil visible in `skyup`,
`island`, `cockpit`). `under`: the ceiling is a darker grey with 100–300 m relief and a ragged fringe instead of
the baseline's pale plane with a straight edge. Sunset: bellies shaded, rim brighter next to the sun. Night: no change.

New / remaining:
- **D11 speckle band along silhouettes** (`under2`, the boundary between a near pouch and the far base): a 2–4 px
  band of dark dots. The light march is reused for 2–3 samples, so a ray that leaves a lit fringe and enters the
  dark far base keeps the fringe's `lt` for its first dense samples; whether that happens depends on the sample
  phase (the per-pixel jitter), hence the dots.
- **D12 dither hatching on distant clouds — regression** (`baselevel`, cumulus 8–10 km away): the diagonal
  interleaved-gradient pattern shows through the cloud body. The far fine step is 150–220 m and the shape noise now
  has 2.5× the contrast (normalised std 0.16 vs 0.063), so its 80–160 m features are point-sampled far below their
  Nyquist rate and the per-pixel jitter turns the aliasing into structured noise. The baseline (365 m constant
  steps, low-contrast noise, 286 m ramp) integrated a nearly smooth density and showed none. Same cause: the row
  of bright beads along the sunset bases (rags lit by the grazing sun, one sample wide), and part of the cloudy
  clip's frame-to-frame change (deck band mean |Δ| base 4.66, r5 5.58, r6 5.42 on 8-bit values).
- **D13 cirrus reads as a uniform comb** (`skyup`): straight parallel fibres of even density over the whole upper
  sky; real cirrus is patchy (clear areas between bands) with gently curved fibres.
- **D9 remains**: 200 m under the base the relief is soft; the near-field ×5 worley (r3) hardly shows because a
  36 m fine step point-samples an 8 m texel (pure aliasing), only the 12 m surface steps resolve it.
- **Cost** (same Chrome, back to back): `under` base 872 ms → r6 1488 ms (+71 %). Attribution builds: without the
  near-field fetch 1193, without the relief fetch 1213, light march reused one sample longer 1361, original ramp
  1595 (noise). SwiftShader is fetch-bound: the two extra 3D fetches per base-zone sample and the light march are
  the regression; aerial-a is unchanged (8465 → 7026, within noise), the bench views see clouds far away.

Round 7 plan (sampling model): mipmapped noise with the fetch LOD set by the step (`textureLod`, the step's own
box filter replaces `detFade` and removes the far aliasing), relief baked into the macro field (no relief fetch;
the light march sees it for free), near-field fetch dropped (a finer worley octave in the detail channel instead,
resolved by the surface steps only where they can), light march recomputed on re-entry and reused longer at depth.
