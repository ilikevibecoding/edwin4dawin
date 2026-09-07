# clouds4 — Atmosphere Agent report (rubric 24 Cloud realism)

Branch `cursor/clouds4-loop-8213` (worktree `wt-clouds4`), baseline 6130eae7 served on :4540, candidates on
:4541–:4546. Seed 20260904, stills 1280×720 `quality=high` unless stated. Defect log with per-round evidence:
`DEFECTS.md`; crops under `crops/` (`r0_base_*` baseline, `r5_*`/`r6_*` A/B pairs, baseline left or top).

## What was wrong (round 0 diagnosis, `DEFECTS.md` D1–D6)

The "flat marshmallow slab" underside had three independent causes, none of them the lighting alone:

1. **Geometry**: the visible base was the iso-surface of a 286 m smooth ramp, and the shape noise that should
   rag it had almost no contrast — the 64³ noise channels used a fifth of the 8-bit range (perlin std 0.063),
   so `1.2·e − (1 − shape)·0.8` moved the surface by tens of metres. Measured base relief after removing the
   cell-to-cell variation: std 12 m.
2. **Slab clip**: the march (and the light march) started at `uCloudBase`, but the envelope hangs cells with a
   low base-variation value up to 330 m below it. Everything under 1300 m was never sampled: those cells were
   planed off at exactly 1300 m — a literal flat cut. From 200 m below such a cell the baseline shows a level
   ceiling ending in a straight edge (`crops/r5_under_base_vs_r5.jpg`, left).
3. **Lighting**: the slow multiple-scattering octave `0.20·e^(−0.06·od)` returned 14 % of the sun at the optical
   depth a base sees (~6), so every base sat at sRGB ≈ 205 against a clipped-white crown; a real fair-weather base
   sits at sRGB 110–160.

## What changed (files: `src/world/sky.ts`, `src/world/noiseTexture.ts`, `cloudShadow` hunk in `common.glsl.ts`)

- `noiseTexture.ts`: every channel normalised to mean 0.5 / std 0.16 (B 0.10) before quantisation — full 8-bit
  range (no terracing) and a known contrast for the shader's erosion terms.
- Base relief: a 2D height field (perlin 325/162/81 m, σ 60 m, clipped at 2.5 σ) added to the smooth base,
  fetched at the column's base altitude so the surface cannot fold; faded out above a third of the slab.
  Under a closed deck the amplitude is halved (stratocumulus undulation).
- Base ramp 0.13 → 0.05 of the slab (286 → 110 m): the condensation level is sharp, the relief bends it.
- Nubis-style inverted worley in the thin base zone: rags and scud hang from the fringe instead of round bumps;
  a finer worley erosion and lighting mottle within ~2 km of the camera.
- March slab extended to the lowest possible base (`slabBottom()`); the base variation is capped in metres so a
  2.5 km storm slab does not hang cells on the water.
- Noise-domain warp driven by the 10 km tower field instead of the 1 km turret field (the old warp compressed the
  noise 3× horizontally and drew vertical drapery once the channels had contrast).
- Cumulus multiple-scattering tail 0.152·e^(−0.2·od) (deck path unchanged): shaded walls ~20 % of the crown, the
  base of a tower dark; relief shading in the ambient (pouch bottoms open to the horizon, hollows shadowed).
- Fine step grows with distance along the ray (`dtF0·(1 + t/6 km)`) instead of one crossing-sized step: a camera
  at base level gets 36–80 m steps through the cloud next to it, the fading far band gets the coarse ones.
- Cirrus veil: a 2D layer at 9 km in the clear/scattered presets (wind-aligned fibres, 40 km patches, forward
  scattering, hazed with the physical optical depth).
- `cloudShadow`: footprint `cov²` to match the march's footprint (the shadow was a wider, softer disc than the
  cloud casting it).
- Cost: one 2D + one 3D fetch per base-zone sample for the relief (main march only), the wisp fetch skipped in
  the lower half of the column, light march unchanged at one noise fetch per short step.

## Evidence

(filled in per round below; see `DEFECTS.md` for the defects each round removed or introduced)

## Self-score 24 and notes for the Lighting Agent (25)

(filled in at the end)
