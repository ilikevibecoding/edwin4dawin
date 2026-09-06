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

## Round 7 — sampling model (builds r7a `/tmp/clouds4/r7a_mips`, r7b `/tmp/clouds4/r7`)

Changes: relief baked into the macro field (two value-noise octaves 520/260 m packed into the base-variation
channel of the half-float bake: no relief fetch in the march, the light march sees it for free, the cheap
rejection is `0 < hf0 < 1`); near-field ×5 fetch dropped, a 16-cell worley octave added to the detail channel
instead; light march recomputed when the ray re-enters cloud after a gap (D11) and reused 3-4 samples deep
inside; step grows up to 2× once T < 0.3; shading of the relief by thickness (a lower base is a thicker cloud:
darker; the hollows and high cells brighter) instead of r6's horizon-openness heuristic.

- **r7a: mipmapped noise + `textureLod` at the step's LOD** (the exact fix for D12). Alias-free — and 2.3× the
  baseline cost on SwiftShader (`under` 2295 vs 1009 ms, `aerial` 10121 vs 5231 ms): a trilinear mip fetch reads
  two levels, twice a plain fetch, on the software rasteriser the bench runs on. Rejected for the bench; on a GPU
  it would be free. Its `under` frame also showed the second finding below.
- **r7b: analytic fade instead** (`stepFade`: each channel fades toward its mean as the step passes the periods it
  resolves — shape 70→230 m keeps a quarter, detail 40→130 m, wisps 25→90 m — plus a surface pass that runs to
  T = 0.15 within 400 m of the camera): `under` 1599 ms vs base 1009 (+58 %), still over.
- **Finding: the base has no texture because the noise has no leverage on it.** The base iso-surface sits where
  `1.2·e = (1 − shape)·0.9`; with the 110 m ramp (r6) the whole ±0.27 swing of the normalised shape term moves
  it by ±10–20 m, and the ×2–2.5 density gain saturates right above it. The baseline (286 m ramp, ±0.07 swing)
  moved it ±15 m — the same flat plane for the opposite reason. Rounds 1–5 got their ragged bases from the 3D
  relief warp, which is gone (D7/D8). Hence r7a/r7b `under`: smooth 260–520 m pouches with no finer structure
  even where the 12 m surface steps resolve the detail channel.
  Fix for r7c: a longer ramp where the noise can bite (edges longer than cores) with a stronger base erosion term.

### Round 7c–7e results (stills `/tmp/clouds4/r7c`, `r7d`, `r7e`; crops `crops/r7c_*`)
- **r7c** (ramp scaled by the column's own height: 130 m under a core, 200–260 m under the low edge of a cell,
  base erosion 0.9 → 1.1): `aerial-a` bases are lobed and ragged with shaded undersides and none of r6's
  hatching (crop `r7c_aerial_base_r6_r7c`: baseline slab / r6 hatched / r7c); `baselevel2` (camera at base
  level in a gap between cells, replacing `baselevel`, whose camera stood inside a cell and saw fog) shows dark,
  level bases that are defined without being a cut plane. `under`: 260–520 m pouches with the ramp's rags, still
  no texture under 150 m: **D9 persists** at close range — the noise the march can afford (fine step 36 m,
  surface step 12 m) integrates the 56–112 m channels to their mean over the 100–200 m the ray spends in the base.
- **r7d** (one per-pixel fetch of a 640 m perlin tile at the first dense sample, modulating the ambient within
  2 km): mottle visible but **stippled** — the per-pixel step jitter moves the first dense sample by up to a
  surface step, so neighbouring pixels sample the 40 m period at different phases.
- **r7e** (900 m tile, surface pass to T = 0.25–0.35, light march 3 noised + 3 smooth steps): stipple gone, but
  the mottle is nearly invisible: the ambient it modulates is a minor share of a base's radiance (the
  multiple-scattering floor of the sun term, 0.1 × 2.9 × sun at od 6–9, is most of it). `under2`: a real
  overhead base (grey, lobed, ragged fringe) with well-formed cumulus beyond. Fix for r8: modulate the shadowed
  sun term too, add a 300 m octave within 700 m, sample on the smooth base surface when looking up through it.
- **Cost** (interleaved, same Chrome; the machine was shared with other builders, so absolute times drift and
  only pairs count): `under` r7c 1324/1492/2215 vs base 857/772/792 ms, r7e 2034 vs 1429 (+42 %); `aerial-a`
  r7c 6459/7729 vs base 9082/9208, r7e 13542 vs 16446 (cheaper: the far band stops at the envelope test and
  the fade removes noise fetches at long steps). `under` is the stress case (the whole frame within 300–2000 m
  of a base, three-quarters of the opacity integrated at the 12 m surface step); the bench views are at or
  under parity. r8 lifts the surface pass to T = 0.3–0.4 since the per-pixel texture now carries the fine scale.

## Round 8 — cirrus bands, base texture on the sun term (build 2bd6387c, stills `/tmp/clouds4/r8`)

Changes: cirrus rewritten (D13); the per-pixel surface texture modulates the shadowed sun term as well as the
ambient, gets a 300 m octave within 700 m, and is sampled on the smooth base surface when the ray comes up
through it; surface pass to T = 0.3–0.4. (First build failed to compile: `patch` is a reserved word in GLSL ES
3.00 — the session's error capture caught it; the bundler cannot.)

- **D13 fixed** (`crops/r8_skyup_cirrus_r7_vs_r8.jpg`): bands of gently curved fibres with clear sky between,
  denser cores and single strands at the fringe, a faint cirrostratus haze around the bands. Prototyped offline
  on the real noise texture (`/tmp/clouds4/cirrus.py`, the same camera as the `skyup` view) before the GPU
  build: a ridged-noise strand (thin bright filaments) read as marbled contour lines; a per-region rotation of
  the fibre frame sheared the pattern by kilometres (a rotation about the world origin); a bend field with
  cross-wind features shorter than the streaks made them wiggle, one with 2–5 km along-wind features made them
  zigzag — the bend has to be a 200 km field (arcs of tens of km). The perlin-worley channel as a mask put the
  bands on its 4-cell lattice; two incommensurate perlin tiles (48×16 and 17×6 km) do not repeat within 100 km.
- **D9 (near-base texture) resolved to the extent the budget allows** (`crops/r8_under_r7e_vs_r8.jpg`,
  `r8_under.jpg`): the base 300–2000 m overhead shows dark cells and lighter thin spots at 50–200 m, sagging
  pouches and a ragged fringe opening to the sky; still soft (a real base 300 m away is), no stipple (high-pass
  std 0.54 vs r7e 0.55 at 1:1 — the base-surface sampling removed the jitter decorrelation).
- **Edges** (`crops/r7e_edges_1to1.jpg`): lobed silhouettes without halo against the sky, bases fading into the
  haze over the sea without a cut or banding.
- **Night** (`crops/r8_nightcity.jpg`, `r8_nightunder2_base_vs_r8.jpg`): city-glow undersides of the closed deck
  over downtown are lobed and warm with a star gap; `under2` at 22:00 shows a lobed dark underside where the
  baseline shows the flat slab with a straight edge. No regression in the `night` bench view (hardly any cloud
  in frame in either build).
- **Sunset** (`crops/r8_sunset_top.jpg`): dark bellies, warm rims toward the sun, faint pink cirrus bands.
- **Cloudy deck** (`crops/r7e_cloudy_deck_base_vs_r7e.jpg`): hanging cells with shaded lobes, the horizon band
  hazed rather than a grey wall (baseline: a flat plane with flat-bottomed shapes).
- **Cost, measured properly**: `/tmp/clouds4/abcost.mjs` attaches to the session's Chrome, keeps both builds'
  pages open at the same view and profiles them alternately, min of per-frame minimums (the machine ran at load
  10–12 all afternoon; single profiled frames varied 4×). `under`: base 681 / r8 1209 ms (**1.78×**, median
  1.79×); `aerial-a`: 3731 / 3914 (**1.05×**, median 1.02×). The stress view is over budget: the light march
  (7 fetches every 2–4 samples) and the surface pass dominate there. → r9.
