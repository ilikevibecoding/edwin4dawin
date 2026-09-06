# Lighting agent (light3) — report

Rubric 25 Lighting and exposure (hero); shared 26 (water sunlight/reflections) and 24 (clouds).
Branch `cursor/light3-loop-8213` on top of `6130eae7`. Defect log with per-round measurements: `DEFECTS.md`.

## What changed and why (each change names its defect)

| change | file | defect | evidence |
|---|---|---|---|
| `SUN_IRRADIANCE` 6.0 -> 3.0 | `atmosphere.ts` | 0.1 sunlit white a flat 244 (lin 1.7), a stop above the cloud tops lit by the same sun | noon fuselage top 243 -> 223 sRGB, cloud tops 220-224; blown 0.00 % everywhere |
| IBL per key 0.85/1.0/1.0 -> 0.7/0.7/0.5 (el 4/14/30+; 0.5/0.55 at low sun in round 1, lifted in round 4 with the probe fill change) | `atmosphere.ts` | 0.2 shaded white lit to 202 (reference 99-107), sunlit : shade 1.5 : 1 on screen | float top in shade 152 -> 107; paint p15 146 -> 85 (reference 90); lin ratio 7 -> 8.5 : 1 (reference 10.5) |
| overcast IBL `lerp(amb, 1.2, grey)` | `atmosphere.ts` | 0.7 / 1.2 overcast as bright as clear, then white wing darker than the deck | cloudy wing p95 184 under a 194 sky band (0.85x); storm scene p50 85 -> 71 vs clear noon ~125 |
| horizon seam pixels hazed by their farthest geometry neighbour | `post.ts` | 0.3 one-pixel dark line along every horizon | 06:45 line gone; 30 m case: see DEFECTS 2.2 / 3.x |
| disc colour by elevation, opaque disc, circumsolar glare in `skyRadiance` | `common.glsl.ts` | 0.4 flat yellow disc dimmer than the clouds at 7.7 deg, hard white dot at noon | 17:45 disc (237,220,201) with halo; cockpit view shows glare |
| `kLow` 3.5 -> 5 | `common.glsl.ts` | 0.5 salmon horizon colour 40 % of the sky 13 deg up | frame top 17:45 (176,137,153): small change, kept for the Belt-of-Venus tone |
| probe fill x0.35 below ~8 deg sun | `sky.ts` (probe shader only) | 0.6 golden hour as dust: shade and ground lit by the salmon haze at every azimuth | round 3 |

## Values other agents depend on

Scene radiance scale (pre-exposure; composite exposure 0.92, ACES): sunlit Lambertian white ~1.0, sunlit cloud top
~0.8-1.0, visible sky zenith 0.125 / horizon 0.25 / haze band 0.53 at noon, shaded white ~0.10-0.14.

- CSM key light: `sunColor * sunI * 3.0` (was 6.0). Moonlight unchanged (1.0 scale).
- IBL (`scene.environmentIntensity`): 0.5 above 30 deg, 0.7 at 14 deg and below, 1.2 under a closed deck.
- Sky radiance near a low sun (17:45, el 7.7): horizon key (0.51,0.29,0.24), haze (0.57,0.37,0.31), sun-side
  haze (0.76,0.31,0.15); the aerial in-scatter is `skyRadiance(dir)` itself, so hazed water and hazed land are the
  same colour at the same distance by construction. Disc radiance at 7.7 deg = 40 x key colour (clips white),
  (2.3,0.7,0.15) at 1.7 deg (orange), (1.6,0.24,0.03) on the horizon.
- Horizon step at 30 m: sky 202 -> water 178 (24 km) -> 157 (3.5 km); the reference photo's step is 175 -> 150.

## Requests to other agents

- Water Rendering Agent: the body scattering and glitter scale with the CSM irradiance, so both halved with
  `SUN_IRRADIANCE` (noon body (65,189,209) L172 -> (37,151,182) L129; reference water L150 -> +0.3 EV on the
  body would restore it; glitter core 247 -> 239, edge 151 -> 133 — a glitter toward a 14 deg sun clips hard in
  life, so x1.5-2 on the glitter BRDF scale). Hue untouched.
- Aircraft agent: a cheap contact/AO term under the wing root and between the floats (the shade there is now
  correctly dark, which makes the missing occlusion gradient visible).
- Cockpit glass: veiling glare when the disc is in frame (the disc now clips white with a halo, the glass adds
  nothing yet).

## Self-score (rubric 25)

Pending the final round.
