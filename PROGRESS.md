# PROGRESS — first-person spaceship interior demo

Self-evaluating build loop. Every iteration: implement → screenshot via
`tools/shots.mjs` → look at the four shots → score the rubric harshly (a maybe is a
fail) → write the next fix list, worst first → commit.

**Environment note:** there is no GPU on this machine. Screenshots are rendered by
headless Chrome 148 through ANGLE/SwiftShader (software WebGL2), verified working.
That means *real* 60 fps cannot be measured here, so rubric item 7 is scored from proxy
budgets recorded in `shots/iter_N/stats.json` (draw calls, triangles, programs, textures,
lights, shadow casters, CPU frame time, console errors) plus visual checks for
z-fighting, shadow acne and missing faces.

Budgets: ≤ 250 draw calls · ≤ 400 k triangles · ≤ 60 programs · ≤ 14 active lights ·
≤ 3 shadow casters · CPU frame ≤ 6 ms · 0 console errors.

---

## Iteration 1 — scaffolding

**Built:** Vite + three 0.185 project; eight modules (`main`, `ship`, `space`, `player`,
`interact`, `post`, `materials`, `greeble`); procedural texture library (panel/metal/
fabric/floor/grate/screen sets, canvas-painted albedo + roughness + metalness + Sobel
normals); kit-bash geometry merged per material into ~40 meshes; corridor + cockpit +
quarters + galley + bathroom with props; light rig with day/rest presets; two-scene
space render (starfield, gas giant with fresnel rim, nebulae, debris streaks); FPS
controller with AABB collision and head bob; three raycast interactions with fades and
HUD; post chain (space pass → interior pass → N8AO → bloom → ACES → grade → vignette →
grain → SMAA); `tools/shots.mjs` Playwright harness.

**Stats:** 155–202 draw calls · 98–112 k tris · 23 programs · 90 textures · **32 lights**
· 3 shadow casters · 1 console error (404 favicon).

### Rubric

| # | Item | Verdict | Why |
| --- | --- | --- | --- |
| 1 | Lighting intentional | **FAIL** | 32 lights are all active on every object (three.js tests light layers against the *camera*, not per object), so every room leaks into every other one. Result is flat and uniformly warm; no key/fill separation. |
| 2 | Materials physical | **FAIL** | Everything reads as the same slightly plasticky beige. No visible reflection variation, panel seams look painted on rather than geometric. |
| 3 | Detail density | **FAIL** | Huge undetailed wall fields in three of four shots. Greeble clusters read as random chocolate bars stuck to the wall. |
| 4 | Post balanced | **FAIL** | Vignette/grain/bloom are present and the teal strips glow, but the mid-tones are washed out and the palette is muddy. Histogram probe returned garbage (readback from a WebGL canvas without `preserveDrawingBuffer`) so exposure is unverified. |
| 5 | Space sells motion | **FAIL** | Not visible in any shot — all four view presets pointed the wrong way (yaw convention inverted), so the "window" shot is a picture of a wall. |
| 6 | Cohesive palette | **FAIL** | Reads tan/plywood, not bone + orange + teal. The hull albedo is too warm and too pink. |
| 7 | Tech clean | **FAIL** | Draw calls and triangles are inside budget, but 32 lights is 2.3× the budget, 90 textures is over, and there is a 404. |
| 8 | Cold-look test | **FAIL** | Obvious Three.js demo. Tiling is blatant — the same "A-04" stencil repeats every metre across every wall. |
| 9 | Interactions | **NOT RUN** | Harness written but not exercised this iteration. Counts as FAIL. |

**Score: 0/9.**

### Fix list for iteration 2 (worst first)

1. **View presets point the wrong way.** `rotateY(π)` faces +Z (aft); every preset is
   inverted. Fix the yaw convention and add a `yawTo(from,to)` helper so views aim at
   what they are supposed to frame. Nothing else can be judged until this is right.
2. **Kill the light leak / flatness.** Cut the rig to a deliberate key + fill + accent
   per room and add distance-based light culling in the render loop (`rig.cull(camPos)`)
   so only ~8–12 lights are live per frame. Raise contrast between lit pools and dark.
3. **Texture repetition + scale.** Move wall tiling from 1 m to ~2.6 m, strip the stencil
   text out of the tiling albedo and re-add it as sparse decal quads, deepen panel-line
   normals, widen the roughness range, and cool the hull albedo toward bone/grey-green.
4. **Greeble quality.** Rewrite `greebleClusterGeo` to emit machinery: a backplate with
   grid-aligned boxes, recessed insets, valves, gauges and cable stubs.
5. **Prove the space view.** Verify the porthole and cockpit viewport actually show the
   planet, rim glow, stars and debris; tune `SHOT_TIME` so the planet is framed.
6. **Instrumentation.** Fix the histogram (decode the saved PNG in Node instead of
   reading back the WebGL canvas), drop settle frames from 24 → 10 (a shot pass currently
   takes 10 minutes under software rendering), and add a favicon to kill the 404.

---

## Iteration 2 — view convention, light leak, texture repetition, greebles

**Changed:**
- **View convention fixed.** `rotateY(yaw)` faces `(-sin, 0, -cos)`; every preset now aims with a
  `yawTo(from,to)` helper, so the four shots frame what they are supposed to frame.
- **Light leak / flatness.** three.js only tests light layers against the *camera*, so per-room
  isolation is impossible with layers alone. Added `rig.cull(camPos)`: each light carries a
  `{ref, range}` and is switched off when the player is far away — 28 lights authored, 13–16 live.
  Corridor practicals became spot lights (pools with dark gaps), hemisphere dropped 0.85 → 0.32,
  env intensity 0.55 → 0.42, cool porthole spill added as the cold counterweight.
- **Textures.** Wall tiling 1 m → 2.6 m; stencils removed from the tiling albedo and reintroduced as
  a 16-cell **decal atlas** (stencils, arrows, hazard triangle, barcode, wiring placard, scorch)
  placed sparsely and asymmetrically; irregular sub-panel splits so the tile is not a lattice;
  normal strength 1.5 → 2.4; wider roughness range; hull recoloured to a cooler bone.
- **Greebles rewritten** as grid-aligned machinery: recessed bays, finned heatsinks, handwheels,
  gauges, breaker rows, junction blocks, pipe stubs on a bolted backplate.
- **Cockpit rebuilt**: continuous dash with five angled screens, yokes, throttle quadrant, thinner
  mullions, proper seats, overhead panel, ceiling ribs, side racks.
- **Space**: seamless planet texture (noise sampled on a circle in u), sun re-aimed so the planet
  shows a terminator, planet 900 → 1150 units, a moon out of the bow viewport, calmer debris.
- **Harness**: PNG decoder in `tools/png.mjs` so exposure is measured from the saved file
  (canvas readback was returning pure black); settle 24 → 8 frames (a pass went 10 min → 3 min);
  interaction assertions made robust (`getLastToast`, status compared without the ship clock).

**Stats:** 191–323 draw calls · 218–342 k tris · 28 lights (13–16 live) · 0 console errors ·
blown 0–0.33 % · crushed 3.3–14.8 %.

### Rubric

| # | Item | Verdict | Why |
| --- | --- | --- | --- |
| 1 | Lighting intentional | **FAIL** | Corridor now has real key/fill/accent separation and reads well. Quarters is flat khaki, cockpit has one blown ceiling panel. Not all four. |
| 2 | Materials physical | **FAIL** | Panels and metal are believable now, but fabric reads as cardboard and the mattress reads as a rusty steel slab. |
| 3 | Detail density | **FAIL** | Corridor passes. Quarters and cockpit still have big bare wall fields. |
| 4 | Post balanced | **FAIL** | Highlights fine (≤ 0.33 % blown), but quarters crushes 14.8 % of the frame and the under-bunk strip blows to white. |
| 5 | Space sells motion | **FAIL** | Planet with terminator now fills the porthole, stars and debris streak past, `window_t+3.png` proves drift — but the atmosphere rim glow is barely visible, so it is a "maybe". |
| 6 | Cohesive palette | **FAIL** | Corridor and window shots are bone/teal/orange. Quarters is olive-khaki — the warm practicals are too orange against bone walls. |
| 7 | Tech clean | **FAIL** | Quarters hits 323 draw calls (budget 250) and 16 live lights (budget 14). No z-fighting, no acne, no missing faces, 0 errors. |
| 8 | Cold-look test | **FAIL** | The corridor shot is genuinely close — but I hesitate, and a hesitation is a fail. |
| 9 | Interactions | **PASS** | Pointer lock engages in headless Chrome; all three prompts appear (`E: Sleep` / `E: Eat` / `E: Wash`); bed and bathroom fade to alpha 1.0 with "8 HOURS PASS" / "REFRESHED"; all three toasts fire; the rest cycle visibly re-lights the ship (`ix_rest_cycle.png`) and eases back. |

**Score: 1/9.**

### Fix list for iteration 3 (worst first)

1. **Rebuild the crew quarters.** It fails five rubric items on its own: a real bunk (frame, curved
   mattress, folded blanket, pillow, curtain rail, under-bunk drawers), wall furniture (pipe runs,
   shelf, locker detail, personal clutter, panel breakup), warm key + teal fill + cool door spill,
   and no blown emissive strip.
2. **Kill the khaki.** Warm practicals are too orange against bone; move room fills toward
   `#ffc9a0`, push a little more teal and orange *object* colour instead of orange *light*.
3. **Cockpit second pass.** Seats read as cardboard boxes — reshape and darken; overhead panel
   material; stop the ceiling practical blowing out; more side-wall furniture.
4. **Hover highlight is far too strong** — the whole mattress turns teal. Drop to a subtle rim.
5. **Planet rim glow** needs to actually read as an atmosphere: stronger fresnel, wider shell.
6. **Budgets**: 323 calls / 16 live lights in quarters. Tighten cull ranges, cap simultaneous
   shadow casters at 2.
7. **Crushed blacks in quarters** (14.8 %) — lift the fill, the room should read moody, not black.

---

## Iteration 3 — crew quarters rebuild, cockpit second pass, decal bug

**Changed:**
- **Quarters rebuilt**: welded bunk frame with posts/rails/headboard/shelf and a solid skirt, soft
  `roundedBoxGeo` mattress, *rumpled* blanket (five overlapping slabs, deep teal with a rust cuff),
  two-part pillow, curtain rail with a half-drawn drape, warm berth strip inside the bunk, under-bunk
  drawers, locker with vents and handles, desk with drawer unit and clutter, stool, shelf with
  boxes, jacket on a hook, boots, floor mat, crate, pinboard, overhead cabinet run, ceiling
  conduits, pipe runs, wainscot + stringer trim, six decals. Key (bedside lamp, shadow-casting) /
  fill (ceiling strip) / bounce / teal accent / cool door spill.
- **Decal atlas bug fixed**: canvas rows run top-down but texture V runs bottom-up, so `decalUV`
  was sampling the wrong row — a "scorch" decal was rendering a mirrored teal `EXIT` sign on the
  quarters wall. Row index is now flipped.
- **Cockpit second pass**: in-frame side consoles with greeble tops and teal edge strips, extra
  equipment racks, darker framed overhead panel, deeper-recessed ceiling practical, warm fill
  de-saturated (`#ffb066` → `#ffd9bb`) so the seats stop reading as brown cardboard.
- Hover highlight dropped from 0.55 → 0.16 emissive (it used to turn the whole mattress teal).
- Atmosphere rim: wider shell (1.075 → 1.11 R), `uPower` 3.1 → 2.4, `uStrength` 1.7 → 2.5.
- Budgets: one corridor shadow caster instead of two, 768² shadow maps, tighter cull ranges.
  Quarters went 326 → 212 draw calls, cockpit 192 → 132.

**Stats:** 132–246 draw calls · 157–256 k tris · 30 lights (13–18 live) · 0 console errors ·
blown 0–1.46 % · crushed 3.3–11.2 %.

### Rubric

| # | Item | Verdict | Why |
| --- | --- | --- | --- |
| 1 | Lighting intentional | **FAIL** | Corridor, window and quarters now have real key/fill/accent. The cockpit does not: a big blown ceiling panel and otherwise undifferentiated blue fill. |
| 2 | Materials physical | **FAIL** | Panels, metal, grate, mattress and blanket all read correctly now. The pilot seats still read as cardboard boxes. |
| 3 | Detail density | **FAIL** | Corridor/quarters/window pass. The cockpit side walls above the consoles are still large bare panels. |
| 4 | Post balanced | **FAIL** | Corridor blows 1.46 % of the frame — the planet's lit limb plus the additive rim shader clip through the porthole. |
| 5 | Space sells motion | **PASS** | Banded planet with a terminator and atmosphere rim fills the porthole, three parallax star shells, debris streaks, `window_t+3.png` shows visible drift. |
| 6 | Cohesive palette | **PASS** | Bone hull, orange accents, teal practicals, cool window light in all four shots. |
| 7 | Tech clean | **FAIL** | Draw calls and triangles inside budget, no z-fighting/acne/holes, 0 errors — but the quarters runs 18 live lights against a budget of 14. |
| 8 | Cold-look test | **FAIL** | The corridor shot is close to convincing. I still hesitate: the mid-corridor wall panels are too clean and too evenly lit. |
| 9 | Interactions | **PASS** | Unchanged from iteration 2 apart from a subtler highlight (re-verified next pass). |

**Score: 3/9.**

### Fix list for iteration 4 (worst first)

1. **Blown highlights** — drop the space sun/rim intensity so the planet stops clipping through the
   porthole; recess or dim the cockpit ceiling practical further.
2. **Cockpit**: furniture and greebles on the upper side walls, rework the seats (shell + cushion +
   harness) so they read as seats, warmer/cooler separation between dash and cabin.
3. **Active light budget** in the quarters (18 → ≤ 14): tighten cull ranges, merge the bounce into
   the ceiling fill.
4. **Corridor mid-field**: hanging cables, a floor hatch, a wall-mounted crate and stronger
   light/dark banding so the middle of the shot is not a clean flat wall.
5. Re-run the interaction harness to keep item 9 honest.

---

## Iteration 4 — blown highlights, light budget, corridor mid-field, cockpit furniture

**Changed:**
- **Active-light budget enforced properly.** `rig.cull(camPos, cap)` now sorts the surviving
  lights by distance and hard-caps them (13), so the shader light loop is bounded no matter
  where the player stands. Cull ranges tightened on corridor practicals (7.5 → 6.2 m), teal
  porthole accents (5.5 → 4.2) and cool porthole spill (6.5 → 5.4). Quarters went 18 → 14 live.
- **Blown highlights.** Space sun 3.4 → 2.3, atmosphere rim `uStrength` 2.5 → 1.45, space
  ambient 0.55 → 0.42, bloom threshold 0.62 → 0.70. Corridor went from 1.46 % blown to 0.
- **Corridor mid-field** (the flat stretch that failed the cold-look test): floor hatch with a
  grate inset and bolt studs, wall-mounted toolbox with a greebled face, two drooping cable
  looms, a ceiling vent and a crate — all in the 10–13 m band where the shot was empty.
- **Cockpit upper side walls**: breaker cabinets with greeble faces, vertical pipe drops, teal
  strip lights in recessed housings, orange placards. Seats slimmed (the `hullDark` shell boxes
  that read as slabs are gone, backrest 0.86 → 0.62 m) and the camera raised to look over them.
- `debugAPI.hideSplash()` added so the harness can shoot without the title overlay.
- Committed shots are JPEG from here on (`shots/**/*.png` is gitignored) — the four 1600×900 PNGs
  per pass were adding ~17 MB each time. The analyser still reads the local PNGs.

**Stats:** 131–246 draw calls · 142–273 k tris · 38–56 programs · 88–95 textures · 30 lights
(**13–14 active**) · 1–3 shadow casters · 0 console errors · blown 0–0.02 % · crushed 3.9–13.6 %.

### Rubric

| # | Item | Verdict | Why |
| --- | --- | --- | --- |
| 1 | Lighting intentional | **FAIL** | Corridor/quarters/window read well. The **cockpit** does not: the overhead practical is still a blown white bar at the top of frame, it washes the ceiling to a warm plywood tone, and there is no cool key from the viewport for the warm dash to play against. |
| 2 | Materials physical | **FAIL** | Panels, metal, grate, blanket and desk are convincing. The **pilot seats still read as brown cardboard boxes** — flat fabric, box silhouette, no cushion break-up. |
| 3 | Detail density | **PASS** (borderline) | The corridor mid-field clutter fixed the flat wall; the cockpit upper walls now carry cabinets, pipe drops and strip lights. No contiguous bare region larger than ~1/12 frame in any of the four. |
| 4 | Post balanced | **FAIL** | Blown is fixed (≤ 0.02 %), but cockpit and quarters crush 13.0–13.6 % of the frame (budget 2 %), and the under-bunk teal strip plus the cockpit practical are local white-outs the global histogram hides. |
| 5 | Space sells motion | **FAIL** | `window` is a good planet but it **fills the entire porthole** — no limb, no atmosphere rim, no stars, so it reads as an orange wall. The cockpit viewport is nearly empty: stars and one teal dot, no planet, moon or nebula. |
| 6 | Cohesive palette | **PASS** | Bone + slate + orange + teal + cool window light in all four. |
| 7 | Tech clean | **FAIL** (borderline) | Corridor 246/250 calls, `window` uses 3 shadow casters, the cockpit ceiling shows a hard emissive edge. Otherwise in budget, no z-fighting/acne/holes, 0 errors. |
| 8 | Cold-look test | **PASS** | Judged on `corridor.jpg` alone: light pools down the length with dark gaps between practicals, layered pipe runs break the silhouette at three depths, greebled machinery and a toolbox sit at eye level, the grated floor has wear and teal guide ticks, and a planet-lit porthole anchors the right side. It reads as an indie space game. No hesitation. |
| 9 | Interactions | **PASS** | `stats.json.interactions`: pointer lock true; `E: Sleep` / `E: Eat` / `E: Wash` all present; bed and bathroom fade to alpha 1.0 with "8 HOURS PASS" / "REFRESHED"; three toasts; three status changes. |

**Score: 4/9.**

### Fix list for iteration 5 (worst first)

1. **Cockpit lighting rebuild.** Move the overhead practical aft and deepen its recess so the
   emitter is never in frame; shrink and dim the emissive quad. Add the missing cool key — a
   `RectAreaLight` just inside the main viewport aimed aft — so the cabin reads cool and the
   dash/console warm+teal becomes accent. Re-material the ceiling from the warm-reading hull set
   to slate structure so it stops looking like plywood.
2. **Cockpit viewport content.** Per-view shot clock so the cockpit frame gets the planet limb
   plus the moon and a nebula instead of empty stars.
3. **Seats.** Rebuild as pedestal → tapered base → rounded cushion with a front lip → narrower
   backrest with a gap under a separate headrest → side bolsters → harness straps → teal piping.
   Darker, more desaturated seat fabric.
4. **Window composition.** Shrink the planet's apparent size at the window shot time so the
   porthole frames limb + atmosphere rim + stars rather than a full-bleed orange field.
5. **Local white-outs.** Segment the under-bunk strip into ticks and drop its emissive; recess the
   quarters ceiling strip so the emitter is not seen edge-on.
6. **Crushed blacks** 13 % → ≤ 6 % in cockpit/quarters via a small black lift, without flattening
   the corridor.
7. **Budgets.** Corridor 246 → ≤ 220 calls by merging the new mid-field clutter; cap the `window`
   view at 2 shadow casters.

---

## Iteration 5 — cockpit light rig, seats, soft goods, per-view shot clock

**Changed:**
- **Cockpit is now cool-keyed.** The viewport `RectAreaLight` went 6.5 → 8.4 and is aimed at the
  dash instead of the cabin, the overhead practical moved 1 m aft of the pilot position (out of
  frame), its emitter shrank and dimmed (4.4 → 2.5 intensity), and the ceiling was re-materialled
  from the warm hull set to slate. The warm dash/console fill is now the accent, not the key.
- **Seats rebuilt**: rails → pedestal → gas strut → tilted cushion with a rolled front lip →
  narrow backrest that stops short of a *separate* floating headrest on two posts → tubular frame
  → soft bolsters → four-point harness webbing → armrests with a recline lever. New near-black
  `fabricSeat` material so the warm fill can't turn them brown.
- **Soft goods are now actual cloth.** `softClothGeo()` builds a displaced grid (broad sag +
  gaussian fold ridges + drooping perimeter + a closing skirt), used for the duvet and its
  turned-back cuff. Box stacks read as planks no matter how they are arranged; a displaced grid
  reads as fabric.
- **Space framing solved properly.** The planet's traverse got a wider span (8.2 → 20 km) and it
  now sits 4.6 km abeam, so its disc fits *inside* the porthole instead of full-bleeding it. The
  sightline through a porthole depends on where you stand, so `SHOT_TIMES` is now per view
  (cockpit 5.5 s, corridor 21 s, others 33.5 s) — derived by projecting the planet and the aperture
  into NDC in-page and solving, not by guessing. Porthole A moved to eye height (1.55 → 1.62) so the
  tube is less oblique. Atmosphere rim toned down (strength 1.45 → 1.2, purple end pulled toward blue).
- **Local white-outs fixed**: `emissiveWarmDim` / `emissiveTealDim` variants for emitters seen
  edge-on; the under-bunk strip became six short ticks behind a shroud; the quarters ceiling strip
  got a deeper housing.
- **Post**: new `ShadowLiftEffect` (`mix(lift, 1, c)`, lift 0.024) placed *after* the vignette, so
  the darkened corners stop clipping to zero. Vignette 0.44 → 0.40.
- **Budgets**: cockpit key/rect cull ranges 30 → 11/13 m and the quarters lamp 10 → 7 m, so the
  cockpit's shadow-casting directional light no longer follows the player down the corridor.

**Stats:** 106–170 draw calls · 86–178 k tris · 11–14 active lights · 1–3 shadow casters ·
0 console errors · blown 0–0.02 % · **crushed 0.000 %** (was 13.6 %).

### Rubric

| # | Item | Verdict | Why |
| --- | --- | --- | --- |
| 1 | Lighting intentional | **FAIL** | Corridor, quarters and window all read well. The cockpit's overhead blow-out is gone and the cool key works, but the ceiling is now the brightest surface in the frame — a large, flat, unmotivated slab. |
| 2 | Materials physical | **PASS** | Seats read as upholstered seats (charcoal cloth, tubular frame, harness); the duvet reads as fabric with real folds; panels, worn metal, grate, glass and rubber all separate cleanly. |
| 3 | Detail density | **FAIL** | Only one offender left: the cockpit ceiling, ~18 % of that frame with nothing but panel seams. |
| 4 | Post balanced | **PASS** | Blown ≤ 0.02 %, crushed 0.000 %, AO visible in every corner, grain and vignette present but not obtrusive. |
| 5 | Space sells motion | **PASS** | Planet disc + atmosphere rim + stars framed inside the porthole; planet, moon and a nebula in the cockpit viewport; `window_t+3.png` shows obvious drift. |
| 6 | Cohesive palette | **PASS** | Bone, slate, rust-orange, teal, cool window light in all four. |
| 7 | Tech clean | **PASS** | All budgets met, no z-fighting, no shadow acne, no missing faces, no console errors. |
| 8 | Cold-look test | **PASS** | The corridor frame reads as an indie space game. |
| 9 | Interactions | **PASS** | Pointer lock, three prompts, two fades with captions, three toasts, three status changes. |

**Score: 7/9.**

### Fix list for iteration 6

1. Cockpit ceiling: add a glare shield over the viewport to shade it, fill it with services
   (conduit pairs, avionics bays, vent, handholds, decal), and paint it a genuinely darker slate.
2. Give the dark seats a readable edge (thin teal piping) so they don't flatten into silhouettes.

---

## Iteration 6 — cockpit ceiling and light hierarchy

**Changed:**
- **Glare shield** over the viewport (0.62 m deep brow, bolt row, side cheeks). It shades the
  ceiling from the window key — which is what was flattening it — and it is what a real cockpit has.
- **Ceiling services**: two conduit runs, two recessed avionics bays with greeble faces and bolt
  rows, a vent, orange placards, two overhead handholds, one stencil decal.
- **`ceilingDark` material** (painted slate, heavier grime) for the cockpit ceiling so the largest
  surface in the frame cannot become the brightest one. Frame mean luma 68.4 → 64.0.
- **Teal piping** down the outer edges of both seat backs, so the near-black seats keep a readable
  silhouette against the dark cabin.
- Window key light re-aimed at the dash rather than the cabin centre.

**Stats:** 106–169 draw calls · 85–189 k tris · 11–14 active lights · 0–2 shadow casters ·
93–99 textures and 38–62 programs (both **cumulative for the session**, and both include the
post-processing render targets and SMAA lookups) · 0 console errors · blown 0–0.02 % · crushed 0.000 % ·
mean luma 61.5–80.5 · mean saturation 0.147–0.232.

### Rubric

| # | Item | Verdict | Why |
| --- | --- | --- | --- |
| 1 | Lighting intentional | **PASS** | Corridor: warm practical pools with dark gaps between them, cool porthole spill, teal floor ticks. Cockpit: cool viewport key, warm dash accent, teal readouts, dark ceiling. Quarters: warm bedside key, dim ceiling fill, teal under-bunk accent, cool doorway spill. Window: cool planet light raking bone panels with a warm practical deep in the frame. Four distinguishable roles per shot, no uniformly-lit surfaces. |
| 2 | Materials physical | **PASS** | Metal ring and pipes show env reflection and directional scratch breakup; painted panels are matte with chips and grime; the duvet and seats show no specular; roughness varies *within* single surfaces (panel centres vs seams, worn floor tread vs recesses). |
| 3 | Detail density | **PASS** | No contiguous undetailed region larger than ~1/12 of frame in any of the four. Floors show tread wear and scuffing. |
| 4 | Post balanced | **PASS** | Blown ≤ 0.02 % (budget 0.3 %), crushed 0.000 % (budget 2 %), AO visible in corners and under props, vignette and grain readable but not obtrusive, fog gives corridor depth. |
| 5 | Space sells motion | **PASS** | Banded planet with terminator and atmosphere rim inside the porthole; three parallax star shells; debris streaks; planet + moon + nebula through the cockpit viewport; `window_t+3.png` shows the planet visibly closer and rotated. |
| 6 | Cohesive palette | **PASS** | Bone hull, slate structure, rust-orange accents, teal practicals, cool space light. Hue histogram is concentrated in two bins (warm + cool) with no stray hues. |
| 7 | Tech clean | **PASS** | 106–169 draw calls (budget 250), 85–189 k tris (400 k), 11–14 active lights (14), 0–2 shadow casters (3), 0 console errors, no z-fighting, no shadow acne, no backface holes. |
| 8 | Cold-look test | **PASS** | Judged on `corridor.png` alone: light pools down the length with dark gaps, three depths of pipe silhouette, greebled machinery and a toolbox at eye level, worn grated floor with teal guide ticks, a planet sliding past a porthole. Indie space game — no hesitation. |
| 9 | Interactions | **PASS** | `pointerLock: true`; `E: Sleep` / `E: Eat` / `E: Wash`; bed and bathroom fade to alpha 1.0 with "8 HOURS PASS" / "REFRESHED"; three toasts; three status changes; the rest cycle re-lights the ship. |

**Score: 9/9** for the four judged frames — but see the correction at the top of iteration 7.
The run does **not** stop here.

---

## Iteration 7 — the rest of the ship (and four real bugs)

**Correction to iteration 6.** Its 9/9 was scored on the four judged frames only. Sweeping the
*whole* ship — the interaction frames plus the galley and bathroom — turned up four defects that
were present in iteration 6 and that item 7 ("no visible artifacts") should have caught:

1. **Every stencil decal in the ship was upside-down.** `decalUV()` mirrored the atlas row *and*
   the V axis inside the cell. Two flips = a 180° rotation, which reads as mirrored text — the
   quarters bunk label rendered as "Ⅴ-⊥Ƨ" instead of "A-12", the bathroom "O2" as "ᘔO".
2. **The hover highlight repainted whole objects neon teal.** Saturated teal at 0.16 emissive is
   brighter than the rooms themselves; the duvet turned into a glowing green sheet.
3. **The bathroom mirror was a black rectangle** — a low-roughness metal plane reflecting a dark
   PMREM probe. It read as a hole in the wall.
4. **The rest preset was nearly black**, so the galley interaction frame was unreadable, and the
   galley's own dispenser sat in its own shadow even in the day preset.

So iteration 6's item 7 and item 9 verdicts are downgraded to FAIL retroactively, and the evidence
set for the rest of the run is widened: **six views** (the four judged frames plus `galley` and
`bathroom`) plus the interaction frames.

**Changed:**
- `decalUV()` no longer double-flips — every stencil, arrow, hazard mark and placard in the ship is
  now the right way up.
- Hover tint is a pale teal (`0xb6f2ea`) at 0.05 emissive: a sheen, not a repaint. The DOM prompt
  is the real affordance.
- Rest preset lifted from black to night-lighting: env 0.16 → 0.24, hemisphere rest 0.14 → 0.20 and
  warmer, rest fog density 0.045 → 0.038.
- **Mirror**: `bakeMirrors()` in `main.js` renders one 256 px `CubeCamera` pass per mirror at
  start-up (with the light rig temporarily un-culled) and uses it as that material's `envMap`. Six
  small draws, once, and the mirror shows the room — scratched and hazy, because it keeps the
  worn-metal roughness/normal maps, which is what a freighter head's mirror should look like.
- **Bathroom fittings**: towel on a rail, soap dispenser, shelf with three bottles, wall vent,
  shower curtain, hazard trim at the shower lip, and the oversized 0.9 m schematic decal cut to
  0.4 m and moved off the near wall.
- **Galley dispenser** is a machine now: recessed dispense bay in deep slate, nozzle, grated drip
  tray, three buttons, gauge cluster, spill decal, and a warm task light over the bay
  (`emissiveWarmDim` + 1.9 point light). `galleyFront` re-aimed to frame it.
- Corridor aft ceiling: conduit run, junction box with greebles, vent and a stencil, so the
  near-camera ceiling band is not bare.
- `getStats()` now reports `updateMs` (JS-side scene update) and `renderMs` separately, because on
  this machine `renderMs` is *software rasterisation* and says nothing about a real GPU frame.

**Stats:** 109–173 draw calls · 89–191 k tris · 11–14 active lights · **JS update 0.15–0.25 ms/frame** ·
0 console errors · blown 0–0.02 % · crushed 0.000 % · mean luma 61.5–80.5.

### Rubric

| # | Item | Verdict | Why |
| --- | --- | --- | --- |
| 1 | Lighting intentional | **PASS** | Four roles per room (key / fill / practical / accent); the galley now has a task light over the dispenser and the bathroom a vanity strip plus a warm spill from the shower nook; rest preset reads as night lighting rather than black. |
| 2 | Materials physical | **PASS** | Mirror, basin metal, towel and curtain fabric, painted panels, worn floor: all distinct, all with roughness variation inside the surface. |
| 3 | Detail density | **PASS** | Bathroom walls now carry towel rail, soap unit, shelf, bottles, vent, pipes and right-way-up placards; galley dispenser is a machine, not a box. |
| 4 | Post balanced | **PASS** | blown ≤ 0.02 %, crushed 0.000 %, AO and vignette present, no clipped emitters. |
| 5 | Space sells motion | **PASS** | Unchanged from iteration 6 and re-verified: planet inside the porthole, `window_t+3` drift. |
| 6 | Cohesive palette | **PASS** | Unchanged. |
| 7 | Tech clean | **PASS** | The four artefacts above are fixed; budgets still met (≤ 173 calls, ≤ 191 k tris, ≤ 14 lights, 0 errors). |
| 8 | Cold-look test | **PASS** | Corridor frame unchanged from the iteration-6 pass. |
| 9 | Interactions | **PASS** | All three prompts, two fades with captions, three toasts, three status changes — and the frames themselves are now readable, with a hover sheen instead of a neon repaint. |

**Score: 9/9.** Iteration 8 is the confirmation pass — same rubric, six views plus interactions.

---

## Iteration 8 — the confirmation pass that failed

Iteration 8 ran the six views plus interactions with no code changes, and the wider
sweep found three more things that item 3 (detail density) and item 7 (no visible
artifacts) should have caught in iteration 7:

1. **The galley's ceiling fixture burned a white blob into the middle of the frame.**
   The spot sat at `x1 - 0.75`, i.e. 0.35 m in front of the overhead cabinet's face
   and level with its top edge, so the cone hit that face at point-blank range.
2. **The galley's aft wall was 3.7 m of bare bone panel** — the far field of the
   judged frame, and the largest undetailed region anywhere in the ship.
3. **The bathroom camera stood inside the shower nook's frame post**, so the left
   edge of the judged frame was a 0.3 m-away smear of hazard-striped trim, and the
   mirror read as a slab of mottled stone.

Plus two softer misses: the towels and the shower curtain used `drapeGeo`, which is
a *row of separate slabs* and reads as cardboard at arm's length, and the head had
no fixtures below shoulder height at all.

**Score: 6/9** (fail: 3 detail density, 7 tech clean, 2 materials physical).
So the run does not stop; iteration 8's stats are recorded below for reference.

**Stats:** 109–173 draw calls · 89–220 k tris · 11–14 active lights ·
JS update 0.16–0.45 ms/frame · 0 console errors · blown ≤ 0.021 % · crushed 0.000 %.

---

## Iteration 9 — the head, the stores, and one sign error

**Changed:**

- **`hangClothGeo()`** — a new primitive: one continuous closed shell swept along a
  rail, with pleats that deepen toward the free hem and a hem that sags in the
  middle. It replaces `drapeGeo` everywhere the player can walk up to the cloth.
  The towels are now cloth folded over a rail; the shower curtain is a gathered
  panel on a track.
- **The mirror is a real planar reflection** (`Reflector` + a custom shader). The
  baked cube probe it replaces reflected a dark room into mottled grey, and what
  sells a mirror is recognising the room in it. The stock `ReflectorShader`
  overlay-blends its tint, which assumes sRGB values and misbehaves in a linear
  HDR chain, so the shader is reflected radiance × a lossy warm-grey tint, hazed
  where the plate's grime map says it is scratched. Cost is one 768×432 render,
  only while the plate is in frustum (i.e. only in the head), clamped to one
  reflection render per displayed frame so N8AO's depth pass doesn't double it, and
  with the reflection camera's layers masked to the head + the corridor beyond the
  door — which cuts both its draw calls and its light count.
- **The head is a room now**: stainless splash-back wainscot with a nosing cap and
  battens, a hip-height grab rail, a vac toilet with a paper roll and a flush
  panel, a service cabinet with louvres, a cable tray with clips, a filter housing,
  a bath towel and a hand towel, a soap unit, a bracketed shelf with bottles, a
  valve stack, and a floor drain.
- **The galley's key light moved inboard to `x1 - 1.62`** so its cone axis passes
  *under* the overhead cabinet and lands on the counter. The blob is gone and the
  cabinet fronts get the grazing light a strip light over a galley run should give
  them. The fixture got an eggcrate diffuser, because 2.5 m of bare emitter is one
  white slab across the top of the frame.
- **The under-cabinet teal strip** used to sit 60 mm *in front of* the cabinet's
  face, so half of it escaped upward and washed the whole ceiling teal. Tucked back
  under the carcass, which now shades it, and dimmed.
- **The galley's aft wall is the ship's stores**: a locker bank with four louvred
  doors standing 40 mm off their carcass (handles, latches, stencils), an open bay
  with three shelves of tins, ration boxes and bottles behind retaining bungees, a
  shaded task strip under the cap, an extinguisher on a bracket, a pinboard with
  papers, a coiled hose, a crate stack, a mop, stringers and a kick plate.
- **A stores spot** at `z1 - 1.02`. At `z1 - 0.62` the bank's own top cap blocked
  the cone and left every door in shadow.
- **One real bug**: the galley's aft wall faces −Z, so "proud of the wall" means
  *more negative* z. The first version of the bank placed every door, shelf, handle
  and item of stock at `wz - small`, which is *inside* a carcass that spans
  `wz - 0.44 … wz`. The bank rendered as a featureless slab of panel. Fixed by
  deriving everything from an explicit front plane, `bf = wz - depth`.
- `tools/look.mjs` — an ad-hoc camera probe (arbitrary position, target and focal
  length). This is what found the buried locker bank; the judged views are too
  wide to tell "the prop is missing" from "the prop is unlit".
- `tools/jpeg.mjs` — the shot record encoder, so the PNG→JPEG step is a committed
  tool instead of a one-off.

**Stats (six views):** 112–237 draw calls · 97–319 k tris · 11–14 active lights ·
**JS update 0.16–0.38 ms/frame** · 0 console errors · blown ≤ 0.055 % ·
crushed 0.000 % · mean luma 61.5–80.6.

Note on the draw-call budget: the head's 237 includes the mirror's reflection pass.
The primary pass is 189; the budget of 250 now covers both.

### Rubric

| # | Item | Verdict | Why |
| --- | --- | --- | --- |
| 1 | Lighting intentional | **PASS** | Galley: eggcrate key over the counter, warm hotplate practical, teal under-cabinet accent, task strip on the stores, cool spill from the door — five separable roles. Head: cool vanity strip as key, dim ceiling fill, warm spill from the shower nook. No surface is lit by everything at once and no cone hits a surface at point-blank range. |
| 2 | Materials physical | **PASS** | The mirror is a mirror; the towels are cloth with folds and a sagging hem; the wainscot is scratched stainless against matte painted panel; the locker doors are painted metal against a chrome handle. |
| 3 | Detail density | **PASS** | The two regions that failed in iteration 8 — the galley's aft wall and the head's walls — are now the most detailed surfaces in their frames. |
| 4 | Post balanced | **PASS** | blown ≤ 0.055 % (budget 0.3 %), crushed 0.000 % (budget 2 %), AO reading in the shelf recesses and under the counter lip. |
| 5 | Space sells motion | **PASS** | Unchanged and re-verified: planet with limb and atmosphere rim in the porthole, `window_t+3` drift, planet + moon + nebula through the cockpit glass. |
| 6 | Cohesive palette | **PASS** | Bone hull, slate structure, rust-orange accents (cabinet doors, wainscot nosing, towels, tins), teal practicals, cool space light. |
| 7 | Tech clean | **FAIL** | Two left: the head cabinet's louvre read as a solid black rectangle (`structureDark` slats in shadow), and the hand towel at 0.14 × 0.20 m read as a bunched lump rather than cloth. Both fixed after the pass — hence iteration 10. |
| 8 | Cold-look test | **PASS** | Corridor frame unchanged. |
| 9 | Interactions | **PASS** | `E: Sleep` / `E: Eat` / `E: Wash`, two fades to alpha 1.0 with captions, three toasts, three status changes, rest cycle re-lights the ship. |

**Score: 8/9.** Fixes applied: `structure` louvres at 7 slats, hand towel up to
0.22 × 0.32 m, a shadow gap and lift lip on the head unit's lid, and the mirror
reflection up to 768×432 with 2× MSAA (the 640×360 pass left stair-steps on the
reflected light bar). Iteration 10 is the next full pass.

---

## Iteration 10 — full pass, six views plus interactions

No new construction; this is the pass that judges the iteration-9 fixes (mid-value
louvres, a hand towel with enough drop to show its folds, the shadow gap and lift
lip on the head unit's lid, and the mirror reflection at 768×432 with 2× MSAA).

**Stats:** 112–237 draw calls · 97–320 k tris · 11–14 active lights ·
**JS update 0.16–0.31 ms/frame** · 0 console errors · blown ≤ 0.052 % ·
crushed 0.000 % · mean luma 61.5–80.5.

### Rubric

| # | Item | Verdict | Why |
| --- | --- | --- | --- |
| 1 | Lighting intentional | **PASS** | Corridor: warm practical pools with dark gaps, cool porthole spill, teal floor ticks. Cockpit: cool viewport key, warm dash accent, dark ceiling. Quarters: warm bedside key, dim ceiling fill, teal under-bunk accent. Galley: eggcrate key over the counter, hotplate practical, teal under-cabinet accent, stores task strip, cool door spill. Head: cool vanity key, dim ceiling fill, warm nook spill. Every room has a key, a fill and at least one practical, and no cone hits a surface at point-blank range. |
| 2 | Materials physical | **PASS** | The mirror reflects the room. Towels are cloth: continuous surface, pleats deepening toward the hem, a hem that sags in the middle, no specular. Stainless wainscot against matte painted panel, painted locker doors against chrome handles, worn tread on the floors. Roughness varies within single surfaces everywhere. |
| 3 | Detail density | **PASS** | No contiguous undetailed region larger than ~1/12 of frame in any of the six. The two that failed in iteration 8 — the galley's aft wall and the head's walls — are now the most worked surfaces in their frames. |
| 4 | Post balanced | **PASS** | blown ≤ 0.052 % (budget 0.3 %), crushed 0.000 % (budget 2 %), AO reading in the shelf recesses, under the counter lip and in every corner; vignette and grain present without drawing attention; fog gives the corridor depth. |
| 5 | Space sells motion | **PASS** | Banded planet with terminator and atmosphere rim filling the porthole, three parallax star shells, debris streaks, planet + moon + nebula through the cockpit glass, and `window_t+3.png` shows it moved. |
| 6 | Cohesive palette | **PASS** | Bone hull, slate structure, rust-orange accents, teal practicals, cool space light — and the rust now carries into the galley cabinet fronts, the head's wainscot nosing and the towels, so it reads as one ship. |
| 7 | Tech clean | **PASS** | 112–237 draw calls (budget 250, and the head's figure includes the mirror's reflection pass — its primary pass is 189), 97–320 k tris (400 k), 11–14 active lights (14), ≤ 2 shadow casters (3), 0 console errors, JS update ≤ 0.31 ms/frame. No z-fighting, no shadow acne, no backface holes, no clipping props, no decal upside-down. |
| 8 | Cold-look test | **PASS** | The corridor frame: light pools down the length with dark gaps, three depths of pipe silhouette, greebled machinery at eye level, worn grated floor with teal guide ticks, a gas giant sliding past a porthole. Reads as an indie space game. |
| 9 | Interactions | **PASS** | `pointerLock: true`; prompts `E: Sleep` / `E: Eat` / `E: Wash` all exact; bed and head fade to alpha 1.0 with captions "8 HOURS PASS" / "REFRESHED"; three toasts; three status changes; the rest cycle re-lights the ship (see `ix_rest_cycle.jpg`) and eases back to day. |

**Score: 9/9.** Iteration 11 is the confirmation pass — same six views plus
interactions, no changes in between.

---

## Iteration 11 — confirmation pass

No code changes between iteration 10 and this pass. Same six views, same scripted
interactions, same deterministic clock per view.

**Stats:** 112–237 draw calls · 97–320 k tris · 11–14 active lights ·
**JS update 0.10–0.22 ms/frame** · 0 console errors · blown ≤ 0.051 % ·
crushed 0.000 % · mean luma 61.5–80.5. Every figure matches iteration 10 to within
noise, which is the point: the pass is deterministic.

### Rubric

| # | Item | Verdict |
| --- | --- | --- |
| 1 | Lighting intentional | **PASS** |
| 2 | Materials physical | **PASS** |
| 3 | Detail density | **PASS** |
| 4 | Post balanced | **PASS** |
| 5 | Space sells motion | **PASS** |
| 6 | Cohesive palette | **PASS** |
| 7 | Tech clean | **PASS** |
| 8 | Cold-look test | **PASS** |
| 9 | Interactions | **PASS** |

**Score: 9/9 — two consecutive all-pass iterations (10 and 11). The loop stops here.**

A note on the hover highlight, since it is the one thing that reads differently
between two frames of the same object: the bunk is olive in `quarters.jpg` and
teal-tinted in `ix_bed_prompt.jpg`. That is the hover sheen (`0xb6f2ea` at 0.05
emissive) doing its job — it is deliberately visible, because a highlight nobody
can see is not a highlight, and the DOM prompt is the primary affordance. It is not
the neon repaint that iteration 7 fixed.

### Performance caveat, restated

This machine has no GPU. Everything renders through SwiftShader, so `renderMs`
(180–230 ms) is *software rasterisation* and says nothing about a real GPU frame.
The numbers that do transfer are the ones a GPU frame is bounded by:

- **draw calls 112–237** (the head's figure includes the mirror's reflection pass;
  its primary pass is 189)
- **triangles 97–320 k**
- **active lights ≤ 14**, shadow casters ≤ 2
- **JS-side update 0.10–0.31 ms/frame** — the CPU cost of the whole simulation
  (player, collisions, interactions, light rig, culling, space) is a third of a
  millisecond, so the frame budget is entirely the GPU's.

At that geometry and light count, with one 768×432 reflection only while the player
is in the head, 60 fps at 1080p is a comfortable target on any discrete GPU of the
last decade. It has not been measured on one and this write-up does not claim it
has.

---

## Delivery

Stopping condition met at iteration 11 (all nine rubric items passed on iterations
10 and 11, judged on six views plus the scripted interaction pass), inside the
12-iteration cap.

**Final build:** `npm run build:cdn` → `docs/play.html`, one self-contained
1.19 MB HTML file. Every module, stylesheet and the favicon are inlined; there is
not a single relative fetch, so it runs from any host that serves it as HTML.

**Published URL** (verified end to end, not just published):

    https://htmlpreview.github.io/?https://github.com/ilikevibecoding/edwin4dawin/blob/cursor/bc-ab2639ec-8b18-439e-abdd-7394a66f1293-1273/docs/play.html

`node tools/cdncheck.mjs "<url>"` loads that URL in headless Chrome, waits for the
app, frames the corridor and screenshots it:

```
· http 200 text/html; charset=utf-8
· debugAPI.ready: true
· canvases: 1
· stats {"calls":203,"tris":192251,"programs":46,"textures":91,"geometries":112,
         "lights":33,"activeLights":11,"shadowCasters":0,"colliders":46,
         "interactables":3,"preset":"day","updateMs":0.3}
· image meanLuma 62 blown 0% crushed 0%
· failed requests: none
· errors: none
✔ runs
```

Evidence: `shots/cdn_final.jpg` — the corridor, rendered by the published file at
its public URL, not by the dev server. The draw call and triangle counts match the
iteration-11 corridor figures exactly, which is how we know the URL is serving this
build and not a stale one.

### Why this host

Probed, with results:

| Host | Result |
| --- | --- |
| `raw.githubusercontent.com` | 200, full file, but `content-type: text/plain` — the browser shows source |
| `cdn.jsdelivr.net/gh/…` | 200, full file, `text/plain` — same problem |
| `cdn.statically.io/gh/…` | 200 but truncated at 4096 bytes |
| `raw.githack.com` | 200 `text/html` to curl, but a browser navigation gets a 9 kB "External Content Notice" interstitial |
| `gitcdn.link` | dead — 114-byte redirect to a lander |
| GitHub Pages | not enabled on the repo, and `gh` is read-only here so it cannot be enabled |
| **`htmlpreview.github.io`** | **200 `text/html`, runs the demo** ← used |

If you enable GitHub Pages on the repo, `docs/play.html` on the default branch
becomes a first-class URL and the htmlpreview hop disappears.

---

## Iteration 12 — the build was unplayable, and the harness said it was fine

Reported: *"I load it up, I see the salvage run, but I can't play it at all."*

Correct report. Three defects, and a process failure that let all three ship.

### The process failure

`tools/shots.mjs` drove the camera with `debugAPI.setView()`. `tools/cdncheck.mjs`
asserted that pixels appeared. Between them they proved the **renderer** worked and
never once proved the **game** worked. Eleven iterations of "9/9 pass" were scored
on screenshots of a demo nobody had tried to walk around in.

### 1. The player moved in slow motion below 20 fps

```js
let dt = Math.min(0.05, timer.getDelta());   // the bug
```

A clamp like this is the standard defence against a huge post-tab-switch delta
teleporting the player through a wall. As a *replacement* for the real delta it
silently turns the game into slow motion: the simulation can never advance more
than 50 ms per frame, so below 20 fps it loses real time in proportion.

| fps | fixed-step (now) | clamped 0.05 (shipped) |
| --- | --- | --- |
| 144 | 2.47 m/s | 2.47 m/s |
| 60 | 2.46 m/s | 2.46 m/s |
| 30 | 2.46 m/s | 2.46 m/s |
| 15 | 2.46 m/s | **1.70 m/s** |
| 8 | 2.46 m/s | **0.89 m/s** |

Fix: `Player.advance(dt)` substeps at ≤20 ms, which keeps the anti-tunnelling
guarantee without lying about elapsed time; the loop clamp moves to 0.25 s so it
only catches genuine hitches; `timer.connect(document)` stops a hidden tab banking
its delta. Proof: `node tools/simtest.mjs` — 0.06 % spread from 144 to 8 fps, and
the same test run against the old stepping varies by 64 %.

### 2. Nothing ever lowered the quality

The demo rendered a full-resolution GTAO pass at up to 1.5× device pixel ratio on
every machine, with no way down. Now `post.js` exposes a four-rung ladder (pixel
ratio, AO resolution and sample count, bloom kernel, grain) and `main.js` walks it
from measured frame time. Two things this got wrong first, both worth recording:

- **Measured the wrong clock.** Timing `performance.now()` around the draw calls
  reported 2.6 ms on a box managing one frame per second — GPU work is
  asynchronous. It governs on the real rAF-to-rAF interval instead.
- **Oscillated.** An EMA plus a short cooldown bounced medium↔low every two
  seconds. Now: median over an 8-sample window, a wide 13.5–26 ms dead band (a
  vsynced 60 Hz display reports 16.7 ms whether or not it has headroom, so that
  range is left alone), a 15 s climb block after any demotion, and a panic path
  straight to the floor rung.

Pinned off under `?shot=1` so judged frames stay comparable; `?quality=` still
forces a rung by hand.

### 3. A refused pointer lock dead-ended the whole demo

The splash only cleared on a *successful* lock and `requestLock()` swallowed its
rejection — so any browser that refused left you clicking at the title screen with
no explanation and no way in. Which is exactly what "I see the salvage run but I
can't play it" looks like. Chrome refuses for about a second after you leave lock
with Esc; iframes without `allow="pointer-lock"`, some extensions and some browser
policies refuse outright.

Now `requestLock()` reports whether it engaged, and on failure — rejected promise,
`pointerlockerror`, or neither within 700 ms — the game switches to drag-to-look,
clears the splash, and puts a strip on the HUD explaining the controls. Arrow keys
look in both modes.

### New harnesses

| Tool | What it proves |
| --- | --- |
| `tools/simtest.mjs` | movement is frame-rate independent, and cannot tunnel |
| `tools/playcheck.mjs` | the built page is playable: click to lock, walk, look, collide, prompt, interact — real input only |
| `tools/playcheck.mjs --deny-lock` | still playable with pointer lock stubbed to fail |
| `tools/walkthrough.mjs` | records a playthrough using only real input, no `setView()` |

All four pass against the **published URL**, not just the dev server.

### Visual regression

Iteration 12 re-shot all six judged views. Draw calls, triangles, active lights,
mean luma and blown/crushed percentages are unchanged from iteration 11, and the
frames are visually identical — the quality ladder refactor did not alter the
authored look. (Frames are never byte-identical between runs: the film grain is
randomised per frame, so iterations 10 and 11 differed too.)
