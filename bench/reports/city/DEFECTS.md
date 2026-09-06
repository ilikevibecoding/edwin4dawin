# City architecture gauntlet — defect log

Branch `cursor/facade3-loop-8213`, worktree `/home/ubuntu/wt-facade3`, previews 4580 (base = lead branch
6130eae7) and 4581 (this branch). Views: `skyline-high` (3.5 km, 900 m up, from the bay, SE faces, 16:12),
`aerial-a` (6 km, 14:36), `cockpit-city` (4 km, 10:30), `sunset` (17:54, backlit), `night` (22:00),
`city-close` (new: 120 m up west of the core looking east, 150–600 m, 17:18, sun behind the camera).
Grid cells are 8×8 A–H / 1–8 on the 1920×1080 stills. Test matrix distances: 2 km, 1 km, 500 m, 200 m, 100 m.

## Round 0 — baseline (lead branch)

What is visibly wrong (OBSERVE / CRITIQUE):

- **Yaw sign bug** (all views, aerial): buildings stand 2·rot off their own streets. Top-down over the hotel
  strip (district rot −0.12) every slab is skewed 13.75° against the grid; `industrial-river` (rot −0.1) 11.5°;
  downtown 2.3°. Cause: `roads.ts`/lots rotate local (x, z) as x' = x c − z s, the instance matrices used
  `Euler(0, rot, 0)` whose local +x lands on (c, −s). The twin / slot / L-shape recipes and the crown fins offset
  their parts with the lot convention, so they were skewed by the same 2·rot against their own faces (a 6 m
  slot between two 60 m slabs opened to 13 m at one end and closed at the other on the hotel strip).
- **Skyline thin** (`skyline-high` D3–F4, `aerial-a` B2–C3): downtown reads as one clump of similar pale
  rectangles on the peninsula, brickell a separate small clump; heights piecewise-uniform (many 75–130 m,
  few tall), no depth behind the bayfront, the three tallest landmarks within 300 m of one another.
- **Glass does not read as glass** (every view; `city-close` dev pose, 300 m): panes were a 40 % metal
  (albedo = tint, metalness 0.92) whose reflection was the roughness-blurred probe, so every pane was a
  flat pale grey-blue paint chip; no sun glint at the height where a vertical mirror must show the sun
  (camera height + d·tan(el)); the ribbon-glass drum shows no vertical highlight; far glass (widened
  roughness 0.45 for the sun lobe) blurred the mirrored sky to its mean, killing the zenith-to-horizon
  gradient that makes distant glass towers read dark-blue and graded.
- **Identically lit squares** (`city-close` punched towers at 250 m): blinds per pane only (38 % everywhere),
  no per-floor or per-building variation; window interiors a uniform dark grey.
- **Rooftops** (any view from above 100 m): flat membrane with 0–3 grey boxes; no ducting, rails, stacks,
  dishes, skylights; every roof reads as the same recipe.
- Budgets at baseline (quick shots, 1280×720): skyline-high 233 calls / 1.18 M tris; aerial-a 289 / 1.05 M.

## Round 1 — yaw fix + `city-close` view

- Changed: `yawQuaternion()` composes instance matrices with −rot (tiles and shadow proxies); `addTrims`
  offsets switched to the lot convention (it had deliberately matched the wrong one).
- Why: one rotation convention for lots, streets, footprints, offsets and the drawn body.
- Evidence: top-down hotel strip before/after (`rot_compare_hotel.png`): slabs parallel to their streets after.
- Added `city-close` (only `views.ts` edit): 17:18, el 13.7°, az 275°; camera 120 m up at (−3330, −3670)
  looking east; a vertical west-facing pane mirrors the sun at 120 + d·tan(13.7°) = 193 m on the 300 m slab.
  Earlier candidate poses (16:48, el 21°) put the mirror point at 247 m, above every roof in frame — that is
  why the old bench views never showed sun on glass.
- Remains: everything else.

## Round 2 — glazing as a coated dielectric (facade.ts)

- Changed: `lights_physical_fragment` override sets `material.specularColor` = coating F0 per glass family
  (blue-green 0.16/0.23/0.28, bronze, grey, near-clear 0.09) × building variant × per-pane grain, and
  `material.diffuseColor` = the room seen through the pane (interior / blinds / parallax room, reveal-shadowed);
  sun-lobe roughness 0.07 (resolved panes, each tilted pane glints alone) → 0.42 (sub-pixel, coherent lobe);
  the mirrored sky uses its own roughness 0.08–0.2 so the gradient stays crisp at any distance; lower floors'
  mirrored sky darkened by the neighbours' silhouettes (`facadeOccl`); downward mirror rays show the sunlit
  blocks within ~400 m and the haze band beyond 3 km; spandrel glass is glazing with an opaque backing;
  glazed crowns, shopfronts and balustrades on the same path. Blinds: per-floor threshold bias and
  per-building blind/curtain colours. Parallax rooms: desk/partition silhouettes on the back wall.
- Why: real glass is 8–30 % reflective head-on and a mirror toward grazing; it is dark where the mirrored sky
  is dark and bright only in the sun's image. The previous look was the mean of a blurred sky at 40 %.
- Evidence: `city-close` before/after at the same pose (`glint_test.png` → `r1_cc.png`): before a pale
  uniform slab with a soft white blob; after a dark coated slab with a structured glint field 60–80 % up,
  per-pane sparkle, mirrored neighbours on the lower floors, a vertical highlight down each drum.
  `skyline-high` crop: glass towers deep blue-grey instead of pale (shade faces at 16:12, correct).
- Remains: the glass is on the dark side below the glint band at 17:18 (first version blended 75 % to the
  haze band even at 300 m — fixed with the distance weight, to re-check); night lighting through the new
  diffuse path to verify; mirror-pass reflections of towers to verify.

## Round 3 — skyline depth (WIP, committed 2bb512b9, verification pending)

- Changed: log-normal heights (median 46 → 118 m edge → core/bay, σ 0.4–0.5, clamp 272; brickell 40 → 102,
  clamp 235), slimmer footprints for the tall tail; brickell (hMax 235) fills like downtown with its own
  core/bayfront gradient and four landmarks (Brickell Flatiron 265 m green-glass point tower, River Twins,
  Palmetto hotel slab + drum, Obsidian stone tiers); Faro Bahía moved 250 m west so the three peaks are
  spaced; midtown hMax 95; the mid-rise ring within ~1.5 km of downtown carries the odd 90–140 m tower.
- Why: a CBD's height distribution is heavy-tailed and its high-rise extends over several km along the
  waterfront; the skyline needs three peaks with a tail between them rather than a clump.
- To verify: `skyline-high`, `aerial-a`, `sunset` silhouettes; brickell landmarks on land; budgets.

## Round 4 — rooftop kit (city.ts addRoofDetail / addSmallRoofKit, facade.ts kit styles)

- Changed: three near-detail instance kinds (`roof`, `roofcyl` within 700 m; `roofbig` within 1.6 km; never in
  the shadow passes or proxies, culled per 250 m cell like the trims) fed by a per-roof packer (axis-aligned
  rectangles in the roof frame, so nothing overlaps the penthouse, tank, helipad or one another). Offices: RTUs
  (1-8 by area) with duct runs to the penthouse wall where they stand in line with it (else an elbow into a
  curb), vents and stacks with rain caps, a tall flue now and then, antenna mast in a corner and a dish on a
  post, pipe runs, a see-through guard rail along the parapet where the facade has no coping (posts every
  1.5 m, top and mid rail, the rest discarded so it thins away when sub-pixel). Residential: condenser rows,
  water tank on legs (older masonry), fewer RTUs. Roofs below 150 m: solar rows on a fifth (2-6 rows, glazed
  cells in an aluminium grid); roofs below 70 m: skylights or a ridge light. Cooling towers become louvred
  plant with fan tops. Walk-ups, street-wall infill and strip malls get the small kit (condensers, vents, TV
  mast, a skylight). Shader styles 15-19: plant casing with panel seams, louvre band, fan rings and rust weep;
  rail; solar; skylight; galvanised duct / pipe with joints.
- Why: every roof the player flies over must read as laid out, at three scales (dots at 1.5 km, RTU blocks
  at 500 m, ducts / rails / vents at 100-200 m), for a few instanced draws.
- Evidence: pending (browser slots).

## Round 5 — street level: fronts and backs (facade.ts)

- Changed: each building picks a front face and its opposite back face. Office towers: a one- or two-storey
  lobby (clear glazing between slim mullions over a plinth, slab edge at its head, lit ceiling), the front's
  centre third an entrance: canopy band, doors in its shadow with frames, a lit sign over them at night.
  Walk-ups: shopfronts stay off the back; the front carries a panelled door in a pale surround with a lamp at
  night where there is no shopfront. Backs (walk-ups, towers, podiums, sheds wider than 14 m): a ribbed roll-up
  loading door and a steel personnel door in a soiled plinth. Shop fascias carry lettering (blocky glyph runs
  in the sign's contrast colour, faded out as they go sub-pixel; lit at night).
- Why: 100-200 m facades ended at a uniform dark plinth; entrances, docks and signs are the layer that
  distance reveals.
- Evidence: pending (browser slots).

## Round 6 — mechanical floors

- Changed: about half the office towers over 80 m carry a louvred mechanical floor 55-85 % of the way up (a
  dark slatted band instead of windows; slats box-filtered, faded when sub-pixel).
- Why: skyline rhythm at 1 km — the unbroken window stack was the last "rectangle" cue.
- Evidence: `city-close` (r5): the drum's grey band and the slab's dark band read at 300-450 m.

## Verification pass over rounds 4-6 (build 36450ce0, 1280×720 dev poses, 14:00 and 17:18)

What works (`/tmp/facade3/r5`): roof at 150 m (`roof_close`) — RTUs with fan rings and panel seams, vents with
caps, a mast, the spire's shadow across the neighbour; roofs at 300-600 m (`roof_mid`) — RTU blocks and vent dots
on most roofs; street at 80 m (`street_close`) — shopfronts with fascias, mechanical band on the tower behind,
window panes mirroring sky above eye level and the paler horizon at it (correct), blinds varying per pane and
floor; `city-close` — glint field on the sun-facing slab at the predicted height (173-217 m, the mirror point is
193 m), vertical sun stripe down the ribbon-glass drum, dark mirrored sky on its shade side. Budgets: every view
under 300 calls / 1.2 M tris; console clean.

What is wrong (OBSERVE / CRITIQUE):

- **Bare secondary roofs** (`roof_close` right half, `roof_mid` slot pair): only the topmost mass of a recipe got
  a kit. Setback tiers, podium roofs, the second bar of L / twin / asymmetric / cross / slot pairs, the ring
  around lantern and tiara crowns and every landmark's terraces were flat membrane. Worse, the L-shape's kit was
  laid at the *lower* bar's roof height under the *taller* bar's centre — inside the taller bar, invisible.
  Round towers packed their kit in the roof's bounding square: items in the corners stood off the drum.
- **Roofs read as white plates at 300-600 m**: sampled membranes 194-215 / 255 whatever their type. The albedos
  (0.80 TPO / 0.62 grey / 0.50 ballast / 0.27 EPDM) sat on the ACES shoulder under a 14:00 sun and folded into
  one white; weathered membranes are darker (TPO ~0.6, ballast ~0.35, EPDM ~0.12).
- **Sign lettering reads as equal white blocks**: glyph cells of one width and height across the whole fascia.
  Shopfronts had no door and no stall riser; the shop glass at `facadeOccl` 0.8 was a flat dark panel.
- **The sun band is a solid white slab** (`city-close` central slab: 10 storeys of clipped panes across every bay;
  `glass_1km`: the two central towers' entire west faces washed white). Geometry is right (the band sits at the
  mirror point) but its width is the GGX lobe's: at roughness 0.07 a delta light's lobe peaks ~1000x over white
  and falls as 1/θ⁴, so every pane whose mirror direction is within ~2.8° of the sun clips, which covers the
  whole ±2.4° tilt spread at 300 m and the whole tower at 1 km. The real sun is a 0.53° disc: a pane either
  mirrors it (white) or shows a faint halo; the blob on a tower at 300 m is 2-4 storeys with a scatter of
  flashing panes around it.

## Round 7 — every roof surface, membrane tones, shop fronts (city.ts, facade.ts)

- Changed: `addRoofDetail` takes `{ tier: 'terrace' | 'podium', block, round }`. Terraces (setback tiers, the
  ring around a crown) carry vents, a small unit or two, rails, solar; podiums carry the tower's cooling towers,
  RTUs, screen wall and the retail's skylights; neither gets a penthouse, tank, helipad or spire. The upper mass
  is blocked out of the packer (plus 0.6 m clearance). Recipes 1, 3, 4, 6, 9, 11, 13, 14, 15, 16 feed every
  surface; the L-shape's main kit moved to the taller bar's own roof height; drums pack within the inscribed
  circle and centre their penthouse. Landmarks: Meridian (3 terraces), Terraces (4 + roof), Crown Plaza (ring
  between lantern and fins), Twin Palms, Gateway, Helix, Aquamarine (cross arms), Bayside Slot (both slabs),
  Ziggurat (5), Twin Sails (podium), Coral Crown (podium + crown ring), Harbor Steps (4), North Quay, River
  Twins (podium + both roofs), Palmetto (deck + drum), Obsidian (3). The roof rng is forked from one draw of the
  district rng, so kit tweaks no longer reshuffle the lots after them. Membranes: 0.64 / 0.44 / 0.35 / 0.12.
  Shopfronts: stall riser, a framed door at one end of a bay, glyph runs of varying width and height centred on
  each fascia (35-85 % of it) with word gaps and a logo block on some; `facadeOccl` 0.55.
- Why: the player flies over roofs; a setback's terraces are what is seen. Membrane tone is the only variation
  a flat roof has under a high sun.
- Evidence (`/tmp/facade3/r7`, build 304ec4a5, 14:00): `roof_mid` membranes now sample in four tones (TPO 230,
  grey 188, ballast 140, EPDM 80 / 255) where every roof was 194-215 before; `roof_close` the near roof reads
  grey with RTUs, vents, mast and rail; `landmark_steps` (Harbor Steps at 350 m) every setback tier carries its
  rail and a unit or two, the Art Deco crown's steps likewise. Budgets unchanged (159-295 calls, <= 1.12 M tris).
- Remains: the roof rng fork reshuffled the lots once, so the R5 street pose frames a different block now; the
  shopfront changes are verified at street level in R9's `street_lobby`.

## Round 8 — the sun in a pane is the solar disc (facade.ts)

- Changed: the light loop is inlined from the CSM chunk with `RE_Direct` wrapped: for a resolved pane
  (`facadeGlintW = glass × vis`) the GGX sun term is scaled out (`facadeLobeScale = 1 − vis`) and an analytic
  disc is added from the pane's tilted normal and coating, per cascade light, so it carries that cascade's
  shadow and blend. Disc: 0.53° core clipping white (12·F·E), a bowed-glass halo `3·F·E·exp(−(θ/0.012)²)` that
  grades on the thin coating of ordinary windows and clips on reflective curtain wall. Pane tilts now follow
  installation tolerance (`0.004 + 0.06·h⁴` rad: most within a tenth of a degree, the odd unit a degree), faded
  with vis² so sub-pixel panes do not shimmer; the core radius widens (`0.0046 + 0.03·(1 − vis)`) over the
  collapsing tilt spread. The GGX lobe that fades back in as panes go sub-pixel is wide from the start
  (0.3 → 0.45): at a tenth of its weight a 0.07 lobe's tail still clipped ±1.4°. Glazed crowns at 0.3.
- Why: see the critique above; the hero requirement is glass that reads as glass from 1-2 km, and a washed
  white face is the opposite.
- Evidence (`/tmp/facade3/r8`, build ec9569be): `city-close` before/after (`cc_slab_ba.png`): the central slab's
  twelve-storey white band is gone; the face is dark coated glass with the blind rhythm and two compact sun spots
  (3 bays x 4 storeys each, 90 clipped pixels in the 19 k of the glint region, was ~5 000) with a soft halo.
  `glass_1km` (17:18): the drum carries one vertical highlight, the glass slabs are dark blue-grey; nothing washes.
  `night`: lit fraction and colour vary per building, crown lights, LED accents. Budgets 230-295 calls.

What is wrong (OBSERVE / CRITIQUE, `glass_2km`, `skyline-high`):

- **Far glass reads as pale matte paint**: at 2 km (panes ~1 px) every glass tower's sun-side and its side faces
  are the same pale warm grey. Cause: the far-field GGX lobe (roughness 0.3 -> 0.45) that fades in as panes go
  sub-pixel spreads the sun over +-30 deg, onto faces whose mirror direction is 20-40 deg from the sun. A real
  facade's aggregate is its tilt distribution (sigma ~0.2 deg): off the sun's band it mirrors nothing but sky.
- **The tilt tail is too fat**: `0.004 + 0.06 h^4` puts 16 % of the panes beyond 1.9 deg (max 3.7 deg), so the
  glint field at 300 m spanned +-10 storeys as two blobs 20 m apart instead of one blaze with a scatter of
  flashes within two or three storeys.
- **Lobby glazing reads as fog** (`street_close`, 35 m): the interior was a smooth vertical gradient (the "lit
  ceiling" as a smoothstep), so the lobby is a grey-to-white blur behind slim mullions: no ceiling, columns,
  floor or back wall.

## Round 9 — glass never uses the GGX sun term; the far field is the tilt distribution's band (facade.ts)

- Changed: `facadeLobeScale = 1 - glass` at every distance; `facadeGlint` blends by `facadeGlintVis` from the
  resolved pane's disc (as R8) to the sub-pixel band: `12·exp(−θ²/2·0.007²)` (the panes that mirror the disc
  together, clipping) `+ 1.5·exp(−θ²/2·0.02²)` (the stray units, graded). Off the band a far pane is mirrored sky
  (the height-bent probe) plus its sunlit blinds / spandrels. Tilts `0.003 + 0.02 h^8` (8 % beyond 0.75 deg,
  max 1.3 deg). Pane roughness 0.15 (now only the mirrored sky's environment BRDF). Glazed crowns, shopfronts
  and lobbies take the disc from their flat normal instead of resetting to the GGX lobe. Lobby interior: lit
  ceiling with downlights along the head, round columns every 8.4 m, stone back wall in 1.2 m bays, polished
  floor band, faded to its mean as the glazing goes sub-pixel.
- Why: from 2 km a glass tower is a dark sky-coloured mirror with a floor rhythm, and blazes only where the sun's
  image lands; a matte warm face is the one thing it never is.
- Poses (`/tmp/facade3/r9.sh`, 1280x720): `city-close`; 1 km `cam=-3700,100,-3750 hdg 85 pch 2 time 17.8`
  (mirror point 223 m: on the tall tops); 2 km low `cam=-4700,60,-3800 time 18.0` (212 m); 2 km day
  `cam=-4700,150,-3800 pch -2 time 14`; `skyline-high`; `aerial-a`; street `cam=-2950,2,-3900 hdg 90 pch 4`;
  roof `cam=-2750,260,-3950 hdg 60 pch -35`; `sunset`.
- Evidence (`/tmp/facade3/r9`, build 4442382f, 13:05-13:10): `glass_2km_low` (18:00, 2 km): the glass towers are
  dark blue-grey mirrors with a floor rhythm among the warm-lit masonry (the R8 build had them the same pale warm
  grey as the stucco); `glass_1km` (17:48): the tall slab right of centre reads as glass (dark, sky-toned, the
  plant on its roof in silhouette), the drum carries one vertical highlight, no face washes out; `city-close`: the
  glint field is one blaze with a scatter of flashes within three storeys (was two blobs 20 m apart);
  `skyline_high` 235 calls / 1.23 M tris, `aerial_a` 291 / 1.04 M, `sunset` 283 / 0.95 M, console clean.
  `skyline-high` clip (`bench/out/city-r9/skyline-high`, 30 frames) for the flicker metric against
  `bench/out/city-r0-clips`.
- Remains: `street_lobby` was shot from `cam=-2950,2,-3900`, which is 3 m under the terrain there (the dev
  camera's y is absolute; downtown's ground is 3.6-6 m): the frame shows the terrain as a plane at eye level and
  the buildings' undersides through it. Every earlier street pose (R5 `street_day`, R10 `street_park` /
  `street_bayshore`) had the same fault: the "pure black stepped block" in the R5 and R10 street frames is the
  underside of a setback's tiers seen from below the ground (down-facing faces take no sun and the probe's ground
  hemisphere is masked on facades), and the "ledges crossing the sky" in `street_bayshore` are the balcony slabs of
  a slab the camera stood under. Not rendering defects; the poses are redone at ground + 1.8 m in R10.

## Round 10 — the aureole at the true mirror point; the grid off the sun's lobe (facade.ts)

What is wrong (OBSERVE / CRITIQUE, `city-close` R9):

- **Two soft blobs 40-80 m below the mirror point**: with the disc and band in place, the remaining bright patches
  on the central slab sat where no mirror geometry puts the sun. Cause: the height bend of the sky lookup (the
  stand-in for the probe's missing parallax) also bent the direction that lands on the probe's aureole, so the
  aureole appeared up or down the tower according to `facadeHf`.
- **The grid of a sunlit face near the sun's image clips to a white lattice**: mullion caps and spandrel panels took
  the GGX sun term at roughness 0.35 / 0.45, a lobe whose peak is 2.5x the sky over +-10 deg; the whole grid of a
  face within 20 deg of the mirror point rendered at 250+ over the dark panes, so the tower read as a white
  lattice rather than glass at 300 m (row profile across the face: 50 / 251 / 55 / 249 ...).

- Changed: the bend fades out within ~30 deg of the sun's image (`bendW`), and the probe's own disc (capped at 12x
  the sky) is graded down within 4 deg of it (`sunMask`, 0.85) since the disc in a pane is `facadeGlint`'s. A 12 deg
  mask at 0.92 was built and shot as well: no measurable difference in the region (3548 -> 3509 clipped pixels),
  so it went back to 4 deg; the soft 50 m glow that remains at the mirror point is the mirrored sky's sunset
  aureole, which a real tower shows. Mullion caps and spandrel panels at roughness 0.55 (extruded, rounded
  profiles and matte paint, not flat mirrors).
- Why: the sun's image in a glass tower is the one place the eye checks first; a blob at the wrong height or a
  white lattice over the panes both say "not glass".
- Evidence (`/tmp/facade3/r10`, `r10b`, `r10c`, builds c4e85411 / 9c212a6f / this round): `cc_slab_r9_r10.png`
  (R9 vs R10): the lower blob is gone, one glow at the predicted 190 m; `cc_slab_r10b_r10c.png`: the grid is pale
  grey lines over the panes instead of white bars, clipped pixels in the slab region 3548 -> 1311, the blaze at the
  mirror point compact; `blob_zoom.png` (r10c, 5x nearest): dark panes with beige blinds per floor, the grid
  grey, the disc in the few panes whose tilt aims it at the eye.
- Headless lint (`/tmp/facade3/lint.ts`: map, roads and city built as `game.ts` does, every instance scanned):
  3 995 bodies, 37 306 trims, 23 902 kit items, 13 016 houses; no non-finite or degenerate instance, no
  near-black body, no kit item at ground level, the longest trims 96.5 m (the coping and balcony slabs of a 96 m
  slab). The 128 "floating" bodies are landmark parts on purpose (lanterns, fins, the Helix boxes).
- Street poses for the materials check (`/tmp/facade3/poses.ts` lists downtown street centrelines with what stands
  in a 50 deg cone ahead; the camera at ground + 1.8 m): mixed street `cam=-3108,7.5,-3838 hdg 91 pch 3` (deco
  20 m at 87 m, concrete 32 m at 78 m, glass 99 m at 135 m, stone 60-71 m at 200 m), glass tower street
  `cam=-2706,6.6,-4046 hdg 91 pch 6` (a 285 m setback tower at 190 m), deco street `cam=-2979,7,-3835 hdg 91`,
  park edge `cam=-2238,5.4,-3928 hdg 271`, 150 m facades from 40 m up `cam=-3108,40,-3838 hdg 91 pch -4 time 16.5`,
  `city-close` at 22:00 for the lit fraction.
- The first four street stills of this round (`/tmp/facade3/r10c/y2/`) were shot from `y = 2` after all: the
  poses tool printed its candidates as `cam=x,2,z` and the jobs were written from that line. They show the
  under-terrain signature once more and, this time, with the numbers to prove it: the near building's entrance
  door stands directly above a tan slab (the box's underside, `y = ground - 0.4`), the slab's near edge 46 px
  above the horizon at 39 m puts the box bottom 2.2 m above the eye, i.e. the camera at ~2.0 with the bottom at
  4.18 (headless `camcheck.ts`: terrain 4.76 there, the URL's y would have been 6.6). The pale plane is the
  water at y = 0 seen through the single-sided terrain from underneath. The tool prints `ground + 1.8` now and
  the four poses are re-queued at their true heights.
- The black stepped block (`r10/street_park`, camera at ground + 2.15 this time, the ground rendered) is a
  real object, not a soffit: it stands on the pavement and casts a shadow to its right. Pure black with a blocky
  crown-like outline and camera-facing — consistent with a vegetation impostor card whose atlas had not been
  rendered when the frame froze; probe job queued (`kind: probe`, ray hits per pixel) to name the mesh.

## Round 11 — what stands behind the glass is seen through the coating twice (facade.ts)

What is wrong (OBSERVE / CRITIQUE, `city-close` R10c, `glass_1km` R10):

- **A sun-facing curtain wall with its blinds down reads as a cream slab**: the blinds at the glass plane were
  lit as `albedo x T` (T the coating's transmission, 0.5-0.7 for the low-e families). A 0.6 blind behind T 0.6
  glass gave 0.36, which under the scene's 6.0 sun through ACES sits at 235 — the same value as a sunlit stucco
  wall, so the tower's sun side lost the dark, sky-mirroring look that says glass and read as painted panels
  with a grid. Real light goes in through the coating and comes back out through it: `albedo x T^2` = 0.22,
  mid-grey under the mirrored sky, with the glass body's green tint.
- **One blind colour per city**: every building drew from the same three blind tones (light grey, a tan on 20 %
  of panes, dark grey on half the panes of 30 % of buildings), so towers side by side wore the same cream once
  the sun was on them.
- **Pale metal spandrels at 0.86** ran to white beside the panes on any sunlit face (noted in R10's report).
- **Rooms are lightless by day**: through a resolved pane (the parallax rooms, within ~150 m) the ceiling grid
  shows only at night; by day an office tower's fittings are on and visible as pale bars in the dark rooms, the
  cue that reads "office" from the street.

- Changed: `pass2 = T^2 x (0.90, 1.0, 0.96)` on the blinds, the rooms' daylight and the spandrel-glass backing;
  a per-building blind palette (off-white 0.66 / grey 0.50 / charcoal 0.28 / warm fabric, a fifth of tenants their
  own two tones); pale spandrel panels 0.60; the ceiling fittings emit by day (0.45 x T, 65 % of office floors)
  through resolved panes only, handing over to the night glow with `nightOn`.
- Why: the user's priority is the glass at every distance; the sun-facing face at 300 m is where the base's
  "paint chip" look survived longest, and it is what the blind albedo through one pass of coating produced.
- Evidence: A/B stills queued (`/tmp/facade3/r11` vs `r10c`: `city-close`, 1 km, 2 km low, 150 m facades,
  street at ground + 1.8).
