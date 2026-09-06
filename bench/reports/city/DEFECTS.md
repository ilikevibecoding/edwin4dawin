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
