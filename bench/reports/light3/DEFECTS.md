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
multiplier per key: el 4 0.85 -> 0.5, el 14 1.0 -> 0.55, el 30/90 1.0 -> 0.5 (the probe's neutral fill averages
2-3x the visible sky's mean radiance; halving it at high sun puts the shaded white where the sky alone would put it;
the low-sun keys were held near 0.5 because with 0.8 the shaded tower faces at 17:45 matched the sunlit ones).

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

## Round 3 — seam at 30 m, low-sun probe, dusk sweep, shadows (defects 0.3, 0.6, 0.11, items 4/5)

Changes: `post.ts` seam pixels hazed by their farthest geometry neighbour (cloud shadow skipped for them);
`sky.ts` probe fill x0.35 below ~8 deg sun (probe shader only); disc ramp retuned.

| # | result | measurement |
|---|---|---|
| 3.1 | 0.3 closed at 30 m: the remaining dark pixels of the last sky row are ships and islands on the horizon (x 135, 350, 907-999), not mixed pixels; the 5x crop shows a clean sky/water boundary. The step 202 -> 178 -> 157 (24 km -> 3.5 km) is the sea horizon. | horizon30 12:00 rows 357-364 |
| 3.2 | 0.6 improved: shade and streets of the golden-hour city take the away-side violet of the dome, lit faces stay pink-orange (colour separation instead of one peach wash). Side effect: the water's mirror of the away-side sky goes deep violet at 17:45 (near water L 59 -> 44, planeClose) and a white wing top on the side away from the sun falls to sRGB 54 (r0 87), darker than the water mirroring the same sky. Round 4: fill factor 0.5 instead of 0.35 and low-sun `amb` 0.5/0.55 -> 0.7. | highSkyline / planeClose / lowBridge 17:45 |
| 3.3 | 2.3 disc at 1.7 deg (248,210,1): still lemon with the linear 0-5 deg ramp; squared ramp for round 4 (target sRGB ~(250,170,60)). | chaseTo 18:20 (640-650, 114-124) |
| 3.4 | Dusk sweep 17:30 -> 19:30 (6 frames, scattered): scene p50 85/58/41/34/22/17, sky top L 172/141/117/96/45/28, wing top 86/65/43/33/32/32 — monotonic, no pops; the largest sky step (96 -> 45, 18:42 -> 19:06) spans civil to nautical twilight (sun -4.9 -> -10.2 deg), where the real sky loses far more. Nav lights come on between 18:18 and 18:42 (aircraft agent's night switch); the night exposure boost holds the airframe at 32-33 from 18:42 on. | r3/dusk*.png contact strip |
| 3.5 | Shadows 09:00 / 15:30 close-up: wing shadow on the water beside the floats, fuselage top shaded by the wing, strut lines on the float tops, dark water under the floats; no acne on the floats or the fuselage. Bridge 15:30: pole and car shadows crisp on the deck, the deck's shadow on the water, no acne on the deck, pylons shaded on one side. Bridge 17:45 (sun 7.7 deg behind): no acne, no visible peter-panning of the cars (they sit on their shadows). | s0900/s1530/s1745 planeClose, lowBridge |
| 3.6 | Cascade coverage (dbg=cascades, chase 300 m): cascade 1 (green) holds the ground out to ~2x the nearest ground distance, cascade 2 (blue) the rest of the range including the 3-5 km city; tree shadows on the near island's sand, building shadows in the core. Vegetation casters stop at 1.8 km (shadows are ~1 texel there). No change needed. | s1530_chaseGround_cascades |
| 3.7 | 0.11 cockpit with the sun 50 deg off the nose at 38 deg elevation: no sunlit patch inside — the high wing and roof shade the door windows at that elevation (a real high-wing cabin is shaded at midday); a 17:45 side sun would put a patch on the panel. Not a defect; a low-sun side view is the remaining test. | s1530_cockpitSide |

## Round 4 — merged lead (clouds4 r9d deck, waterrender, terrain5, facade3 ...), critic h03 triage (no capture yet)

The lead `origin/cursor/vice-city-aerial-8213` (76f9b9d8) merged fast-forward; my round-3 tip was already in it.
Triage of the critic's lighting items (`bench/reports/critics/h03/visual-2.md` #14, #24, #25 and regression
(d)1) against the progress snapshots h00 (base), h03 (critic's build) and h13 (current lead), same cameras.

| # | finding | measurement (sRGB, 8x8 grid of the 1280x720 progress frames) |
|---|---|---|
| 4.1 | (d)1 palette under the deck, `skyline_high` (16:12 scattered): the sky barely moved, every ground and water region fell 30-40 % and slid toward the haze hue. | sky A3 h00 (192,201,202) -> h03 (182,193,197); suburbs B4 (171,180,172) -> (130,142,144); downtown D4-E4 (155,166,164) -> (105,121,128); channel water C7 (62,140,159) -> (54,108,125); ocean G5 (73,133,154) -> (70,106,124); port deck L 135 -> 82 |
| 4.2 | Cause is not deck-specific: the `scattered` preset (coverage 0.37) sits below the overcast ramp (`grey = smoothstep(0.4, 0.8, cov)` = 0) and the probe greys 9 % under it (75 % under `cloudy`); the same fall shows in `clear` frames (`aircraft_rear` 14:00 lit water F3 L 136 -> 85, shadow B6 114 -> 62; `shore_beach` 15:00 dry sand (161,165,145) -> (106,99,78), deep water L 113 -> 76, sky top 174 -> 174). | h00 vs h13 |
| 4.3 | Attribution: my round-1 rebalance (sun 6 -> 3, IBL 1.0 -> 0.5) is exactly -1 EV on every sunlit and shaded surface against an unchanged sky; my own r0 -> r3 pairs show it (noon skyline suburbs L 192 -> ~135 predicted by x0.5, measured h13 140). The rest is materials tuned under the old +1 EV sun (sand now renders at L 99-108 where the reference photo has (200,186,172) L 188 and a 0.4-albedo surface under the present sun would give ~190) and the water agent's dome-following base (water L 128 predicted from x0.5, measured 85-98). | reference_a: sky top (36,135,183) L 118, sunlit white 201-212, sand 188, water 126-150, vegetation 71; lead noon: sky top 115-120, white 224 |
| 4.4 | #14 cloud shadows absent under the `cloudy` deck: three global attenuations and no local one. The preset dims the key to 0.3 everywhere (gaps included), `game.ts` fades cast shadows to 0.35 under coverage 0.7, `cloudShadow()` keeps its own 0.72 cap and post then takes only the direct share of that: under a cloud 1 - 0.72 x 0.38 = 27 % darker than the (already dim) gap. Fix in round 5. | code reading; `cloudy` h13 frame flat |
| 4.5 | #14 shadows on water "black, structureless": the water shader already keeps the sky reflection and leaks 45 % of the sunlit body into the shadow (water.ts compose), so the read is the level: lit water 0.097 linear against a 0.062 shadow (ratio 1.56, h00 1.33) on a base that is itself a stop darker. Lifting the IBL (the shadowed body's `indirectDiffuse`) is mine; the base is the water agent's. | `aircraft_rear` F3 / B6 |
| 4.6 | #14 nav-light "40 px discs": not clipping. The glow sprite is a world-sized quad (0.95 m half-size = ~50 px at the chase distance) with a (1-r)^3.5 skirt that falls 20:1 across the radius in linear light; after the night gain (x3.5) and the display gamma it reads as a near-linear cone with the white lens at +-4 px. Bloom adds nothing to it: the bright pass keys on pre-gain radiance (1.5) while at 22:00 a lamp of 0.43 is already white on screen. | beacon row (638,511): R 255 core, 227 / 203 / 168 / 129 / 82 / 46 at 4 / 12 / 16 / 20 / 28 / 36 px; nav (274,433) similar; tail white 255 -> 148 -> 65 at 0 / 8 / 16 px |
| 4.7 | (5) moon key on clouds: the only cloud in the 22:00 `night` frame is the city-glow-lit underside at the top right, (21,24,39)-(35,29,30) against a sky of (27,28,44)-(49,41,53): dim tan, not daylight white. A night deck (`cloudy` at 22:00) is still to be captured. | h13 night |

## Round 5 — cloud shadows local to the clouds, night glare, shadow level (critic #14, #25, (d)1)

Captures on the merged lead (port 4550) against two candidates: `cand` (4551: `post.ts` reads the footprint back
out of `cloudShadow()`'s 0.72 cap so a cloud removes the whole direct share like a building does; presets
`scattered`/`cloudy` sunDim -> 1 (the beam *between* the clouds), storm keeps 0.18; `game.ts` cast-shadow
strength 1 in every weather; bloom threshold follows the night gain; nav-light sprites get a glare profile and a
10 px minimum) and `pal` (4552: cand + the composite's 18 % smoothstep contrast removed + IBL keys 0.5/0.7 ->
0.65/0.8). Debug switches `dbg=nocloudshadow` / `noshadow` / `nobloom` isolate the terms on the lead.

| # | result | measurement |
|---|---|---|
| 5.1 | **The grey hero frames are cumulus shadows.** `aircraft_rear` (14:00 clear) sits under a cloud of the new field: with the cloud shadow off the frame is the protected palette — lit water (108,149,159) L 141, white paint p50 205 / p95 222, shade p15 142 — and the lead's capped shadow (x0.57 over the whole frame) is what made it "muted teal / grey". Noon at the same camera (no cloud) on the lead: paint p50 217 / p95 225, water (99,146,159) L 137, i.e. the reference's 126-150. | aircraft_rear lead / lead_nocs; planeClose1200_lead |
| 5.2 | The deck is not the cause under `scattered` either: `skyline_high` in `clear` (dev camera) has the same suburbs (129,140,141) and downtown (102,118,124) as under the deck; only the water differs, by the deck's shadows on the ocean (G5 L 128 -> 99). The suburbs at L 140 are the honest 16:12 sun (el 28.6 deg): a 0.4-albedo roof under it lands at ~140 with the sky at its reference level; h00's L 192 was the +1 EV key with clipped whites. | skyline_high lead / lead_nocs / lead_clear |
| 5.3 | Cloud-shadow pattern: lead `cloudy` ground factor (with / without cloud shadow) 0.82-0.87 everywhere, `skyline_high` 0.77-0.87 on the ocean with no edge; `cand` `skyline_high` 0.66 / 0.82 / 0.98 (p5/25/50), 23 % of the ground below 0.8 and the ocean patches read as shadows with soft edges. Under `cloudy` the footprint is closed over the whole visible ground (2 % of pixels in sunlit gaps), so it is a true overcast at ground level there: no pattern to show, but the ground fell to p50 67 (lead 83) because the beam is now really gone. Round 6: overcast diffuse target 1.2 -> 1.6. Storm unchanged (lead vs cand mean abs diff 3.4, p50 108 -> 104). | csmap_* ratio maps; cloudy/storm stats |
| 5.4 | A whole frame inside a cumulus shadow is dull at any strength: lead x0.57 (critic: "grey"), physical x0.34 (`cand` aircraft_rear paint p95 145). No lighting value fixes a hero camera parked under a cloud; flagged to the lead (move the camera's time/seed or the cloud) rather than lightened. `uCloudShadowStrength` stays the one knob. | aircraft_rear cand / pal |
| 5.5 | Shadow on water is not black on the lead but is on the dark base: shadowed water L 27/33/49 (p5/50/95) against 49/57/121 for the same pixels unshadowed (factor 0.58 median); the water shader keeps the sky reflection and leaks 45 % of the lit body already (water.ts). The lift that is mine is the IBL (the shadowed body's indirect term): `pal` noon shade p15 121 -> 128, frame p5 62 -> 74, sunlit : shade 5.3 -> 4.8 : 1, paint p95 225 -> 225 (no clipping), lit water (99,146,159) -> (110,156,167). | shmap_aircraft_rear_lead; planeClose1200 lead / pal |
| 5.6 | Night glare: lead nav light row (4 px steps from the core) 255 / 248 / 229 / 173 / 119 / 67 / 37 -> cand 255 / 248 / 213 / 86 / 39 / 29 / 27; tail 249 / 178 / 126 / 84 / 59 / 40 -> 249 / 152 / 77 / 35 / 23 / 19: a core of a few px with a tail instead of a 40 px cone. Bloom now reaches the lamps (threshold 0.43 at the x3.5 gain): city core +4 levels (108 -> 112), sky and cloud unchanged (29 / 24), blown 0.12 -> 0.13 %. Lead with and without bloom was identical at every lamp (bloom contributed nothing at night). | night lead / lead_nobloom / cand; crop night_lights_lead_vs_cand_4x |
| 5.7 | Kept: storm level (5.3), noon whites (5.5), sky (skyline A3 (181,193,196) on lead and both candidates). Removed contrast term moves highlights by < 2 %. | stats |

## Round 6 — combined candidate on the six progress cameras, time sweeps, night deck (critic #14, (5), (d)1)

Candidate = round 5 `cand` + `pal` together (4551) against the lead (4550), plus the `dev` camera sweeps of the
`cloudy` chase and the `skyline_high` fixed camera at 6 / 9 / 12 / 15 / 17:30 / 19 / 22, `shore_beach`, and the
`cloudy` preset at 22:00. Analysis `/tmp/light3/r6/analyze.py` (regions, HSV saturation, paint histograms, nav-light
profiles). No frame clips (blown <= 0.08 %, all of it lamps at night) and none crushes (0.00 % at <= 4).

| # | result | measurement |
|---|---|---|
| 6.1 | Progress cameras, lead -> candidate: `skyline_high` suburbs L 140 -> 148, downtown 118 -> 129, channel water C7 98 -> 104, sky A3 (181,193,196) -> (183,193,197) (unchanged: the palette's sky is kept); `highway_bridge` lit water 103 -> 112, deck 171 -> 178, sky 178 -> 180; `cloudy` sunlit gaps p95 193 -> 223, ground p50 83 -> 86, lit/shade pattern std 41 -> 46, sunlit wing 197 -> 223; `sunset` and `night` levels unchanged (night p50 26, city core 108 -> 116). | r6 tables |
| 6.2 | `aircraft_rear` is still the frame under the cumulus (5.4), now at the physical depth: lit water 85 -> 65, paint p95 177 -> 145 — the one progress frame the candidate makes worse. The post pass multiplies the *whole* pixel by the cloud's footprint: the water's sky mirror (never in a cloud's shadow), surfaces already in a cast shadow (no beam left to remove) and the emissives at night all go down with it, and a fair-weather cumulus is treated as opaque where its base passes ~20-35 % of the beam as diffuse (two-stream: T = 2 / (2 + tau (1 - g)), tau 25-45 for 0.5-1 km of cloud). Round 7 moves the cloud shadow onto the direct light itself (a cloud-footprint map sampled where the CSM shadow is applied) with a thickness-dependent transmittance. | r6 REAR table |
| 6.3 | `cloudy` chase sweep (build before 2196b41f): ground p50 t6 98 / t9 120 / t12 122 / t15 86 / t17:30 121 / t19 42 / t22 27. 17:30 (el 11) brighter than 15:00 (el 45) is the overcast level following the clear sky's horizon luminance (peaks at el 14): fixed in 2196b41f (`deckLight`, the level follows sunI x sin el), verification in round 7. t9 and t15 share the elevation and differ by the footprint's projection (shadows fall west at 9:00, east at 15:00: the 15:00 camera looks over the closed part of the deck, 2 % gaps). | r6 sweep table |
| 6.4 | `skyline_high` sweep: t9 / t12 water C7 L 138 / 139 at S 0.53 / 0.51, suburbs 145 / 152, downtown 119 / 108 — turquoise water and blue sky under the scattered deck by day. t19 / t22: the deck is lit from below by the city glow, tan (64,53,51) L 55 against a sky of (27,30,47), tops grey; not daylight white (critic (5), now verified under a full deck too: `cloudy` 22:00 deck top L 55, deck right L 40, saturation 0.22). | skyline_t*, night2200_cloudy |
| 6.5 | **Night deck too bright (new).** `cloudy` at 22:00 has brighter water and land than the clear night (water low-right L 29 vs 20, mid-left 31 vs 28, land 36 vs 32, a teal cast on the water): `ambientIntensity = lerp(k.amb, 1.6, grey)` is an absolute day target, so at night the deck lifts the IBL from 0.15 to 1.37 (x9) while the dome it integrates is the night dome. Fix in round 7: the overcast level as a ratio of the clear-sky key (k.amb x lerp(1, 2.46, grey)), the same 2.5x by day. | night_cand vs night2200_cloudy_cand regions |
| 6.6 | Paint ratio without the cloud (`aircraft_rear` lead with `nocloudshadow`): sunlit p95 222 (lin 0.74) : shade p15 142 (lin 0.20) = 3.7 : 1 — at the low edge of the 4-6 : 1 band before the round-5 IBL lift (which puts it near 3.2 : 1). The IBL is not lifted further; the undersides that read black in h03 were the cloud-shadowed frame (5.1), not the fill. `highway_bridge` fuselage flank (rounded, part-lit) L 204-208 against the wing top 209. | paint(); regions |
| 6.7 | Tooling: `an.py` inverted the tone curve at exposure 0.92 (the composite's initial uniform) where the pipeline runs at 1.0 x night gain; the linear estimates quoted in rounds 0-5 are 8 % high in absolute terms, every ratio unaffected. Corrected; the contrast term is switchable per build. | an.py |
