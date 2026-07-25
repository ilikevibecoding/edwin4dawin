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
