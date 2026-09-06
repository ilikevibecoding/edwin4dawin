# City architecture — phase 3 report (branch `cursor/facade3-loop-8213`)

Owner: City Architecture Agent (rubric 17 City skyline [hero], 18 Building geometry [hero], 19 Building
materials, 20 Rooftop density). Base: lead branch 6130eae7 (`bench/out/city-r0-base`, preview 4580). Defect log
with per-round OBSERVE / CRITIQUE / CHANGE / EVIDENCE: `DEFECTS.md` (rounds 0-10). Evidence stills:
`/tmp/facade3/r4 … r10` (1280x720 dev poses, listed in `DEFECTS.md`) and `bench/out/city-r10-*` (1920x1080).

## The hero: glass that reads as glass at every distance

The user's stated priority was "each piece of glass in the building needs to look really good from far away".
The base drew a pane as a 40 % metal whose reflection was the roughness-blurred probe: a flat pale paint chip at
every distance. Three rounds rebuilt it as a physical pane:

1. **A coated dielectric** (R2). F0 is the coating per glass family (blue-green low-e 0.22/0.30/0.36, silver-grey,
   bronze, near-clear 0.09), times a per-building variant and a per-pane batch grain; the diffuse colour is the
   room seen through the pane (blinds at the glass plane take the sun, the room behind takes daylight only, so a
   sunlit face's windows are dark holes with glowing blinds instead of beige panels). The mirrored sky is looked up
   by height (the top floors mirror the zenith, the lower floors the haze band and the neighbours' silhouettes)
   and stays crisp at every distance instead of blurring to its mean.
2. **The sun in a pane is the solar disc** (R8). With a delta light the GGX lobe clipped every pane within ~3 deg
   of the specular direction: a tower at 300 m carried a solid twelve-storey white band, at 1 km its whole face
   washed out. Glass now never uses the GGX sun term: the light loop is wrapped per cascade and adds an analytic
   disc (0.53 deg core clipping white, a bowed-glass halo) from each pane's own tilted normal, carrying that
   cascade's shadow. Pane tilts follow installation tolerance (most within 0.2 deg, 8 % racked toward a degree),
   so the panes near the mirror point blaze together while a handful within two or three storeys flash alone.
3. **The far field is the tilt distribution's band, not a lobe** (R9). The wide lobe that stood in for
   sub-pixel panes spread the sun over +-30 deg and made every glass tower at 2 km the same pale matte grey. A
   real facade's aggregate is a sub-degree band: as panes go sub-pixel the disc hands over to
   `12·exp(−θ²/2·0.007²) + 1.5·exp(−θ²/2·0.02²)`; off that band a far pane is mirrored sky plus its sunlit
   spandrels, which is exactly what makes a distant tower read as glass (dark, sky-coloured, graded by height,
   with a floor rhythm) and blaze only where the sun's image lands.

## What changed (by distance)

| Distance | Before (base) | After |
| --- | --- | --- |
| 3.5-6 km (`skyline-high`, `aerial-a`) | one clump of pale rectangles on the peninsula, brickell a low clump, heights piecewise-uniform, the three tallest within 300 m | two high-rise clusters either side of the river with a height gradient to the bay, log-normal heights (median 46 → 118 m edge → core/bay, tail to 272 m), three spaced peaks, setbacks / crowns / spires / drums / twins / slots / mechanical floors in silhouette, glass towers deep blue-grey mirrors |
| 1-2 km | glass a 40 % metal: flat pale tint, blurred sky; roofs flat | coated dielectric: sky mirrored crisp and bent by height, sun as a band only where its image lands, blinds and spandrels give the floor rhythm; RTU blocks, penthouses and masts dot every roof (`roofbig` kind to 1.6 km) |
| 500 m | roofs: 0-3 grey boxes | every roof surface (main, setback terraces, podiums, pair bars, crown rings, landmarks' tiers) carries a packed kit: RTUs with ducts, penthouse, tanks on legs, cooling towers, solar rows, skylights, rails, masts, dishes, pipe runs; membranes in four weathered tones with seams and drain stains; kit casts into the two near cascades |
| 100-300 m (`city-close`) | uniform glass, identical windows, dark plinth all round, white sun band | per-pane disc glints and grain, blinds per floor / building, parallax rooms with furniture, rooms lit by daylight only; lobbies with lit ceilings, columns, entrances and signs; walk-up doors with lamps; loading docks and service doors on the backs; lettered shop fascias with doors and stall risers; rain runs and grime on the masonry |
| yaw | every building yawed 2·rot off its street (13.75° on the hotel strip) | one rotation convention (instances, proxies, trims, recipes) |

## Self-scores (rubric v2, 1-10)

| # | Category | Base | Now | Why not higher |
| --- | --- | --- | --- | --- |
| 17 | City skyline (hero) | 4 | 7 | From 3.5-6 km the mid-rise ring still reads as a field of similar warm boxes around the peaks; no supertall past 272 m; the peninsula's outline (kept) decides the composition more than the massing does; the two clusters read as one at 6 km. |
| 18 | Building geometry (hero) | 4 | 7 | Plans are boxes, drums and their unions (L, cross, slot, twins); no faceted or curved slabs, no sky bridges, podiums rarely wrap a whole block; window frames, reveals and balconies are shader relief beyond 600 m and geometry only inside it, so a punched facade at 100 m is flat except in the parallax panes. |
| 19 | Building materials | 3 | 7 | Glass is the strong family (coating, grain, disc, band, mirrored sky by height); masonry weathering is procedural bands (grime, sill streaks, rain runs) without per-facade history; brick and stone have no relief; stucco and precast vary by noise only; the pale-cap / pale-spandrel curtain wall still runs hot under a head-on low sun (the scene's 6.0 irradiance through ACES puts every 0.55 albedo at 235). |
| 20 | Rooftop density | 2 | 8 | Ducts are straight runs and elbows only (no cable trays, ladders, hatches, gantries); glass towers have rails but no parapet upstand; rooftop pools and gardens exist on one landmark only; helipads are rare by design; the small kit stops at 700 m so a 1-2 km roof shows RTU blocks, penthouses and masts but not its vents. |

## What remains weak (self-critique)

- The sun-facing curtain wall at 300 m at 17:18 is bright: the blinds at the glass plane are sunlit diffuse (0.6
  albedo, 235 after ACES), so a face with most blinds down reads cream rather than dark glass. Real blinds behind
  low-e glass take the coating's transmission (here 1 - 1.4·F0 ≈ 0.6): the value is right, the perception is set by
  the exposure. A per-building blind albedo (grey, charcoal) would widen the range.
- The mirrored sky is one probe: two towers 500 m apart mirror the same sky, and a pane never mirrors the tower
  across the street (only a darkening, `facadeOccl`). Planar reflection per landmark is the next step and not cheap.
- Night: lit fraction and colour vary per building and per floor / window, but without the hour uniform the offices
  cannot empty after 21:00 (see requests).
- Landmarks: fourteen recipes plus sixteen named landmarks; the eye still finds two near-identical setback towers
  within one view now and then (same recipe, same family, adjacent lots).
- Street level is the Street agent's, but the buildings meet the ground as a 0.4 m buried plinth: no stoops, area
  railings, basement lights or planters, so the base of a mid-rise at 30 m is a line.

## Highest-value next attack

A second sun term for the *blinds and spandrels behind glass* (transmission squared, the coating's colour) and a
per-building blind palette would take the sunlit curtain wall from cream to the dark, warm-flecked glass the
reference photographs show; after that, planar reflection on the two or three landmark slabs in `city-close`.

## Failed / reverted candidates

- GGX sun lobe on glass at any roughness (R8): 0.07 clipped ±3° white; 0.3-0.45 in the far field made every glass
  tower at 2 km the same pale matte grey. Replaced by the analytic disc / band.
- Tilt tail `0.004 + 0.06·h⁴` (R8): 16 % of panes beyond 1.9°, the 300 m glint field spanned ten storeys as two
  blobs. Now `0.003 + 0.02·h⁸`.
- Probe sun mask widened to 12° at 0.92 (R10 WIP): no measurable change at 300 m (3548 → 3509 clipped pixels in
  the slab region); back to 4° at 0.85. The remaining soft glow is the mirrored sunset aureole.
- Membrane albedos 0.8 / 0.6 / 0.5 (R4): all folded to white on the tone curve; now 0.64 / 0.44 / 0.35 / 0.12.
- Roof kit rng drawn from the district rng (R4): every kit tweak reshuffled the lots after it; forked from one
  draw in R7 (one reshuffle, then stable).
- Street poses at `y = 2` (R5, R9, R10): the dev camera's y is absolute and downtown's ground is 3.6-6 m, so four
  street frames were shot from under the terrain (a plane at eye level, buildings' undersides through it, a
  black stepped block that is a setback's soffits). Redone at ground + 1.8 m.

## Shared-file hunks (for the lead)

- `src/bench/views.ts`, `VIEWS` array: one new entry `city-close` (fixed camera `[-3330, 120, -3670]`, heading 90,
  pitch 8, fov 50, time 17.3, clear; aircraft placed from the camera). No other view touched.
- `src/world/map.ts`, `createDistricts`: the `brickell` district's extent / density / height range (the
  high-rise ring across the river); geography untouched.
- Everything else is in `src/world/city.ts` and `src/world/facade.ts` (owned).

## Budgets (1920x1080 stills, seed 20260904; gate 400 calls / 1.5 M tris)

| View | Base calls / tris | After calls / tris |
| --- | --- | --- |
| skyline-high | 234 / 1.25 M | B_SKY |
| aerial-a | 289 / 1.10 M | B_AER |
| night | 252 / 1.28 M | B_NIGHT |
| sunset | 283 / 1.02 M | B_SUNSET |
| cockpit-city | 269 / 1.12 M | B_COCKPIT |
| city-close | 290 / 1.08 M | B_CC |

Flicker (clip mean abs frame diff, 320x180 grey): FLICKER.
Console: CONSOLE.

## Requests to other agents

- Street Detail Agent: the downtown ground plane between buildings is bare pale pavement at 100-300 m (no
  sidewalks, kerbs, parking lanes, street trees); the tower lobbies and shop fronts now sit on it and the
  contrast makes it read. A `freeze=1` still at street level (`?bench=dev&cam=-2900,28,-3900&hdg=90&pch=-4`)
  showed a pure-black camera-facing quad (~140x180 px) at the left edge in both day and night — a billboard
  whose texture had not arrived when the frame froze (vegetation impostor?), worth a load-order check.
- Lighting Agent: (a) expose the hour as a shared uniform (`uHour` next to `uNight` in `Atmosphere.uniforms`);
  the facade lights offices per floor and homes per window with a per-building fraction, but cannot yet taper the
  offices after 21:00 and warm the homes toward midnight without the hour. (b) The mirrored sky on a far facade
  is the probe: a warmer, wider aureole around a low sun (17:00-18:00) would make the west faces' mirrored haze
  read as sunset glass.
- Highway Agent: none.
