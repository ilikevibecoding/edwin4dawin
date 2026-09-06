# Lighting agent (light3) — defect log

Rubric 25 (Lighting and exposure, hero). Shares 26 (water sunlight/reflections) and 24 (clouds).
Baseline: `6130eae7` served on port 4550; work builds on 4551. Stills 1280x720, `?bench=dev&freeze=1&seed=20260904`,
measured with a script that inverts the composite's neutral tone curve (exposure 0.92, grade, ACES, gamma 2.2) so
sRGB patch means can be read back as pre-exposure scene radiance ("lin"). Grid cells are 8x8 A-H / 1-8.

Camera matrix used per round (all times 06:45, 09:00, 12:00, 15:30, 17:45, 18:20, 19:00, 22:00 unless noted):
`chaseTo` / `chaseAway` = chase camera, aircraft at (700, 300, 3100) heading toward / away from the sun azimuth;
`planeClose` = fixed camera 14 m behind-left of the aircraft taxiing off the Garza marina (aircraft undersides,
self-shadow, sand, marina water); `cockpitTo`, `lowBridge` (45 m over the causeway), `highSkyline` (900 m),
`down` (400 m, pitch -89), `horizon30` (30 m, pitch 0), `horizon3k` (3 km, pitch -3); weather sets at 09:00 and
15:30 for scattered / cloudy / storm; dusk sweep 17:30 -> 19:30 on the `sunset` bench pose.

## Round 0 — baseline observation (no code change)

Reference frame (`bench/reference/reference_a.png`) measured for the levels the project is graded against:
sunlit white wing sRGB 201-212, white fuselage side in shade 99-104, near water (105,159,189) L150, sky top
(55,134,180) L120, cloud tops L218, sand (184,167,148), vegetation (81,85,74).

| # | defect (what is visibly wrong) | where measured | measurement |
|---|---|---|---|
| 0.1 | Sunlit white is a flat 244 with no panel-line or curvature shading; sand, the bridge deck and concrete are the same flat white at noon. | planeClose 12:00 D4-F4 wing/fuselage top; lowBridge 12:00 deck E5-H8; chase 09:00 sand | wing top sRGB 244 (lin 1.78); sunlit cloud tops sit at 220-224 (lin 0.8) although the same normalised sun lights them: the CSM sun (`SUN_IRRADIANCE` 6.0) is a stop above the sky/cloud scale. Sky top matches the reference (L115 vs 120), so it is the surfaces that are over, not the exposure. |
| 0.2 | Shaded white looks lit: the fuselage side under the wing at noon reads 202, the reference's 99-104; on screen sunlit : shade is 1.5 : 1 (target 4-6 : 1). The aircraft reads as a plastic model with no volume. | planeClose 12:00 E4 (white under the wing root) vs D4 (top) | shade lin 0.52 = the probe's whitened fill (~0.45 mean) x albedo; the visible sky's cos-weighted mean is ~0.2. |
| 0.3 | One-pixel dark seam along the whole horizon from every altitude (hard-failure item "hard horizon seam"). | chaseTo 06:45 row 157 at x=150 and x=1100; horizon30 12:00 row 360/361 | L188 between rows of 208 (06:45); sky 203 -> far water 175-186 in one row (12:00, 30 m). MSAA resolves the horizon row to unhazed far water + dome, and the resolved depth takes the dome's sample, so the aerial pass skips the pixel. At 30 m the last two rows also hold 10-60 km of water that is only 45-100 % dissolved. |
| 0.4 | Sun disc at 17:45 (7.7 deg) is a flat yellow disc dimmer than the sunlit clouds, with no glare; the noon sun is a hard white dot in an even blue field. | chaseTo 17:45 E1 (636-650, 28-42); cockpitTo 17:45 D2 | disc (243,203,110) L205; sky 2 deg from the disc (239,203,170); no pixel near the disc reaches 250. `sunComposite` switched to the 9x red "limb" below 23 deg; ACES lifts its G to 0.66 so it reads yellow, not red. |
| 0.5 | Sky between sun elevations 5 and 20 deg is one warm-grey wash: no blue anywhere in a chase frame looking 13-20 deg up; golden hour reads as dust. | chaseTo/Away 06:45, 17:45; dusk 17:30 frame top | frame top 06:45 away (137,143,176) / 17:45 toward (181,141,151). `kLow` 3.5 puts 40 % horizon colour 13 deg up; the el-14 key's horizon is a warm grey (0.50,0.43,0.40). |
| 0.6 | Golden hour city: no long tower shadows, lit and shaded faces almost the same value (flat pastel city). | highSkyline 17:45 D5-F6 | lit west face vs east face contrast ~1.3 : 1; low-sun IBL (amb 0.85, salmon probe mean ~0.35 -> E_sky 1.1) exceeds the noon sky's irradiance (0.65) while the direct beam is a quarter of noon's. |
| 0.7 | Overcast and storm frames are almost as bright as clear noon; wing tops still full white under a 92 % deck. | cloudy 15:30, storm 09:00 chaseTo | IBL is lifted x1.5 under a deck (`1 + 0.6 grey`) on top of a probe deck at 1.9x the horizon luminance; direct sun 0.3 / 0.18 of clear. Scene mean L at 09:00 storm 116 vs clear 118. |
| 0.8 | Glitter path and sun-side haze at 17:45 read brown-beige. | chaseTo 17:45 E3-E4 glitter path | (199,156,122) L163: the glitter scales with the CSM irradiance (0.25 x sunCol, ~0.6 peak) and the sun-side sky is (0.62,0.11,0.025)-tinted haze at low luminance. Shared with the water agent (glitter BRDF scale); the sky part is mine. |
| 0.9 | Horizon from 30 m: water body at 5-60 km darker than the sky above it (visible step) and a dashed rectangle on the water. | horizon30 12:00 | haze 4.0e-5 /m is a 98 km visibility (comment says 30-40 km); the dashed rectangle is the near-water patch edge (water agent). |
| 0.10 | Night 22:00: aircraft legible, nav lights and city glow fine; yellow paint reads black-olive on the moored aircraft. | planeClose 22:00 | crushed 0.0 % (no hard black), but the airframe sits at sRGB 40-60. Kept for now; no defect raised. |
| 0.11 | Cockpit: interior shading flat (panel one grey), no visible sunlit patch. 12:00 (roof blocks a 74 deg sun) and 17:45 straight into the sun (every visible surface faces away) are inconclusive tests. | cockpitTo 12:00, 17:45 | add a side-sun cockpit view (15:30, sun 50 deg off the nose). |

Kept (works, recorded before touching anything): the sky's daytime blue gradient and horizon haze band (matches the
reference), the sunset horizon salmon/peach and the water's mirror of it, the night city glow and star field, cloud
tops at the reference's level, the bloom on nav lights, the water coloration at noon (bright cyan over sand).

Baseline budgets: all views 129-306 calls, 0.2-1.28 M triangles, console empty.

## Round 1 — radiometric rebalance (defects 0.1, 0.2, 0.6, 0.7)

Change (`src/world/atmosphere.ts`): `SUN_IRRADIANCE` 6.0 -> 3.0 so a sunlit Lambertian white (E/pi ~ 1.0 with its
share of sky) lands on the scale the cloud raymarch already uses for sunlit cloud tops (~0.8-1.0), and the IBL
multiplier per key: el 4 0.85 -> 0.8, el 14 1.0 -> 0.7, el 30/90 1.0 -> 0.5 (the probe's neutral fill averages
2-3x the visible sky's mean radiance; halving it at high sun puts the shaded white where the sky alone would put it).

A/B (same seed/pose, port 4550 vs 4551), neutral-paint histogram over the aircraft (pixels with chroma < 0.45):

| frame | baseline p15 / p50 / p95 (sRGB) | round 1 | reference photo |
|---|---|---|---|
| planeClose 12:00 | 146 / 188 / 242, sunlit:shade 7.2:1 (lin) | 85 / 126 / 223, 8.5:1 | 90 / 150 / 232, 10.5:1 |
| cloudy 15:30 chase | 101 / 166 / 211 | 83 / 131 / 174 | (white under overcast should sit ~0.85 x the sky band, see 1.2) |

Direct patches, planeClose 12:00: fuselage top 243 -> 223 (lin 1.69 -> 0.83, now the level of the sunlit cloud tops
220-224), float top in shade 152 -> 107 (reference shaded white 99-107), under-wing root 207 -> 160 (penumbra of the
wing shadow, not full shade). Water body (water agent's): (65,189,209) L172 -> (37,151,182) L129 at noon, i.e. the
water's sun-driven body scattering halved with the CSM irradiance (reference water L150 — the body could take
+0.3 EV back; the hue is unchanged). No pixel clips in any of the six frames (blown 0.00-0.01 %).

| # | result | measurement |
|---|---|---|
| 1.1 | 0.1/0.2 fixed at noon: the airframe shows curvature and panel shading, shade reads as shade; sunlit white 223 (target 220-235), shade p15 85 (target 90-107). | above |
| 1.2 | New: under a 70 % deck the white wing top is now 156-174 (lin 0.26-0.33) against a sky band of 194 (lin 0.45); under overcast a white horizontal sits at ~0.85 x the sky's radiance (the whole deck is the source), i.e. ~182. The 1.5x overcast lift was tuned against `amb` 1.0. Fix in round 2: the overcast IBL becomes an absolute level (`lerp(k.amb, 1.2, grey)`) instead of a multiple of the clear-sky key. | cloudy 15:30 chase: paint p85/p95 156/174, sky band (191,195,196) |
| 1.3 | Sunrise 06:45 palette intact (pink-mauve water, warm haze); white paint no longer flat. | planeClose 06:45 L p50 110 -> 95 |

## Round 2 — horizon seam, sun disc and glare, overcast level (defects 0.3, 0.4, 0.7, 1.2)

Changes: `post.ts` aerial pass lifts MSAA-resolved horizon pixels whose neighbour holds geometry past the dissolve
start to the sky radiance; `common.glsl.ts` disc colour follows the elevation (clipped white above ~9 deg,
yellow-orange at 3-4 deg, orange-red on the horizon) instead of a 9x red limb below 23 deg, circumsolar glare
(1.5 deg core + 5 deg veil, in `skyRadiance` so dome, probe and water mirror agree), `kLow` 3.5 -> 5;
`atmosphere.ts` overcast IBL `lerp(amb, 1.2, grey)`.

| # | result | measurement |
|---|---|---|
| 2.1 | 0.3 fixed where the horizon is the far plane: the one-pixel grey line along the 06:45 horizon is gone (crop 100-400 x 120-200, 4x). | chaseTo 06:45 row 156: r0 med 18 below its neighbours, r2 no row stands out (detector moves to the airframe edge) |
| 2.2 | 0.3 not fixed at 30 m: the last sky row still holds mixed pixels (p10 181 against 202), because the horizon water there is 24 km away (0.07 deg below level), short of the 33 km dissolve start the test required. The step itself (sky 202 -> water 178 over rows 360/361) is the real sea horizon: the reference photo has a 25-level step (175 -> 150). Fix in round 3: haze the seam pixel by its farthest geometry neighbour, which is exact when the dome equals `skyRadiance`. | horizon30 12:00 rows 354-367 |
| 2.3 | 0.4 fixed: 17:45 disc (237,220,201) white with a soft halo (r0 (241,206,165) flat yellow), cockpit view shows a disc with glare instead of an orange dot; 18:20 (1.7 deg) disc (244,196,119) lemon-yellow — too yellow for 1.7 deg, ramp retuned to (2.3,0.7,0.15) for round 3. | chaseTo 17:45 (610-670, 20-60); 18:20 (630-650, 140-155) |
| 2.4 | 0.5 barely moved: frame top 17:45 toward the sun (176,137,153), r0 (181,141,151); 13 deg up is still 28 % horizon colour plus the mie and sunset-band terms. A mauve belt over the salmon horizon is plausible (Belt-of-Venus tones); kept, no further change to `kLow`. | chaseTo 17:45 rows 2-12 |
| 2.5 | 1.2 fixed: cloudy 15:30 white wing top p85/p95 171/184 (lin 0.32/0.39) under a 194 (0.45) sky band = 0.85x; storm 09:00 176/191 under a 174 band (the deck above is brighter than the horizon band under a storm). Scene p50 storm 85 -> 71, clear noon ~125: overcast now reads darker than clear (0.7). | paint histograms |
| 2.6 | 0.6 open: golden-hour city still one peach wash; towers show some lit/shade but lit faces are mauve-grey not orange. Cause is in the probe: the neutral fill is 65 % of the probe at the horizon and 40 % at 60 deg up at every azimuth and every sun elevation, so at 17:45 shade and horizontal ground are lit by salmon haze. Fix in round 3: fill weight x0.35 below ~8 deg sun (sky.ts probe shader, cloud code untouched). | highSkyline 17:45 ruler crop 480-780 x 290-440 |
| 2.7 | Glitter path 06:45 toward the sun: core 247 -> 239, edge 151 -> 133, blown 1.49 % -> 0.07 %. Still bright with bloom, but the water's specular halved with the CSM irradiance; a glitter toward a 14 deg sun clips hard in life. Request to the water agent (x1.5-2 on the glitter BRDF scale). | chaseTo 06:45 (620-680, 200-260) |
| 2.8 | Night 22:00 unchanged (moon scale untouched): city glow, lit windows with soft bloom, red nav light halo, legible white wing. Kept. | nightChase blown 0.06 %, crushed 0 % |
