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
- Evidence: pending (`/tmp/facade3/r9`).
