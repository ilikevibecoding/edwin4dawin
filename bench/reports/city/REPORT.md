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
| 17 | City skyline (hero) | 4 | 8 | SCORE17 |
| 18 | Building geometry (hero) | 4 | 8 | SCORE18 |
| 19 | Building materials | 3 | 7 | SCORE19 |
| 20 | Rooftop density | 2 | 8 | SCORE20 |

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
