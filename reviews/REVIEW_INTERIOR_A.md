# Interior review A — bridge, command tower, hangar deck

Independent visual critique of the ISD interior on branch `cursor/star-destroyer-ship-a618`. No source files were
edited. All screenshots are in `shots/review_interior_a/` (1280×720, `node tools/view.mjs … --w=1280 --h=720`,
hangar views with `--sim=45`; sub-folders `sim12/`, `sim34/`, `sim38/`, `anim/`, `restat/` hold the animation and
launch checks and re-captured stats). Every issue below is visible in the cited file. Stats are quoted as the tool printed them:
`calls / triangles / visibleLights / visibleObjects / ms-per-frame (software GL)`.

Method notes that matter for reading this review:

- Software GL (SwiftShader) renders 2–18 s per frame, so the engine's `dt` clamp (`Math.min(getDelta(), 0.1)`)
  means real-time captures advance `dt`-driven animators only ~0.1 s per frame. `debugAPI.simulate()` passes
  `t = 0` to `rooms.update()`, so `--sim` advances `dt` accumulators but not `t`-driven animators. I therefore
  checked animation two ways: `--sim=12` pairs (`sim12/`) and same-session real-time A/B pairs 25–51 s apart
  (`anim/*_A.png` vs `*_B.png`), diffed pixel-wise with ffmpeg + numpy. Conclusions in §5.
- Named default views are part of the product (they are what a reviewer, a trailer or a `README` link shows), so a
  default camera that faces a wall is graded as a defect of the room's presentation, not of the tool.
- Provenance: the checkout was shared with a technical-validation workstream that had uncommitted edits in `src/`
  during the session (light budget 14 → 12, hip-height safety bars on the hangar lane gaps, cargo arch moved to
  z −60..−48, hangar lobby box +2 m, PMREM leak / collision fixes). The dev server hot-reloads, so later frames may
  include them; none of those changes touches a finding below.
- Budgets from `docs/WORKSTREAM_GUIDE.md` (≤ 150k tris ordinary rooms, ≤ 400k bridge/hangar, ≤ 8 lights) are
  exceeded in every view I took (tower rooms 460–880k, hangar cluster 1.0–2.1M tris, 16 lights). Performance is out
  of scope for a visual review but I list the measured numbers per view in the appendix.

---

## 1. Overall verdict

**The bones are right; the finish is not yet cinematic.** Layout, circulation and human scale are convincing: the
walkway-between-pits bridge, the 144 m spine corridor with a real lift lobby, side rooms that each have a readable
job (mantrap + red mood for intelligence, tiered seats for briefing, radar wall for comms, star-chart for nav), a
hangar with two rows of racked TIEs over a well, a cargo bay with a working crane, a Lambda shuttle on a lit pad.
Doors sit at 2.4–3.2 m (`layout.js`), railings at hip height, consoles at ~1 m. The Imperial vocabulary is present
everywhere — dark plating, white bands, black panels with indicator matrices, hazard stripes, Aurebesh stencils,
cog emblems.

What stops it reading as finished is a short list of *systemic* problems that appear in almost every room and
therefore dominate the impression:

1. **Ceilings are black voids** in the bridge, tactical, intelligence, officers' quarters, flight control, hangar
   lobby and above the TIE racks — the single biggest reason the hero rooms look like a stage set.
2. **Exposure is blown** at every white band and floodlight; the far end of the corridor, the comms/briefing
   downlights, the cargo/repair/shuttle floods and the bridge centre strip all clip to pure white with bloom.
3. **Glazing haze**: the bridge and tower windows are veiled by fog + stacked light shafts so the hull — the
   payoff of standing on a Star Destroyer bridge — reads as grey-blue mist from the walkway (`bridge.png`) and from
   every side room; it is only legible pressed against the glass (`bridge_window.png`).
4. **The screens don't move.** Holograms, the radar sweep and the hangar crane animate, but every large console and
   wall display is a static texture (verified in §5). The rooms feel paused.
5. **Two particle/decal effects hurt more than they help**: oversized dust motes (dense, near-camera, in every
   room) and oversized white floor scratch decals that read as cracked glass.
6. **Repetition**: identical droid alcoves ×6, identical chairs in every room, mirrored placards, three identical
   cog emblems in the shuttle bay, a 144 m corridor with no bulkhead rhythm.
7. **Default cameras**: `hangar` (the flagship view) faces a wall ~6 m away; `room_briefing` is inside a desk;
   `room_comms`, `room_fighter_maint`, `room_repair_bay`, `room_cargo_bay` all face away from their hero content.

None of these is hard to fix and most are a single material/tone/light constant or a view definition. Fix the top
six items in §7 and the interior jumps from "competent procedural demo" to "shot from the film".

---

## 2. Room by room

Severity: **blocker** = breaks the brief for that room · **major** = clearly undermines the room's read ·
**minor** = local flaw · **polish** = nice-to-have.

### 2.1 Command bridge

Views: `bridge.png` (411 calls, 1144k tris, 16 lights, 318 objs, 5472 ms), `bridge_window.png` (383 / 1143k / 16 /
318 / 6120 ms), `bridge_pit.png` (397 / 1142k / 16 / 318 / 7442 ms), `int_0_210_201_0_-6.png` (285 / 801k / 10 /
201 / 5926 ms), `int_-13_210_188_-90_-12.png` (296 / 877k / 15 / 243 / 7193 ms), `int_0_210_178_180_6.png` (247 /
780k / 10 / 201 / 3893 ms).

The layout is unmistakably an ISD bridge: raised central walkway, two sunken crew pits with red-backed chairs and
schematic screens, glazing at the bow, hazard-striped pit edges, railings at the right height. From inside a pit
(`bridge_pit.png`, `int_-13_210_188_-90_-12.png`) it is the strongest space in the ship — Aurebesh readouts, blue
schematics, indicator matrices, stair under-lighting. From the walkway (`bridge.png`) it collapses: the glazing is a
flat grey-blue haze with a few stars, the hologram is a faint cyan smudge, the dais is a lone chair beside a small
table, the ceiling is black with one clipped strip, and the floor is covered in white scratch decals and drifting
motes. The hull is only legible pressed against the glass (`bridge_window.png`) — see 2.2.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `bridge.png`, `int_0_210_201_0_-6.png` | Forward glazing reads as uniform grey-blue haze from the walkway; no hull, no planet, stars barely visible | The bridge's entire reason to exist is that view; from the default camera it is missing | **major** | Set `fog: false` on glass and on the exterior rendered through it; drop `BeamBatch` frustums between walkway and glazing to ≤ 2 and halve their opacity; raise exterior exposure seen through glass |
| `bridge.png` | Ceiling is a black void with a single centre light strip clipped to pure white | Hero room has no upper half; the strip's bloom dominates the frame | **major** | `imperialCeiling` coffers across the 28 m width (recessed panels + secondary bands at 0.3 intensity), clamp centre strip emissive so it tone-maps below 1.0 |
| `int_0_210_201_0_-6.png` | Captain's dais is a small holo table and one chair on a flat floor; no platform, steps or railing | The command position is the focal point of the room and it is underwhelming | **major** | Raise dais 0.4 m with three hazard-edged steps, add 1.05 m railing, two flanking officer stations, hologram 1.5× larger |
| `bridge.png` | Stray glowing white sphere at floor level in front of the dais (frame centre, just above the far railing) | Reads as a floating light bulb | **minor** | Locate the sphere mesh (likely a light helper or the holo beam base) and hide it |
| `bridge.png`, `int_0_210_201_0_-6.png` | White floor scratch decals ~2 m long and high-contrast on the walkway | Reads as shattered glass, not wear; steals contrast from the pits | **minor** | Scale scratch decals to ≤ 0.5 m, opacity ≤ 0.25, confine to pit stairs and hatch edges |
| `bridge.png`, `bridge_pit.png` | Dust motes large, dense and bright at all depths | Distracting sparkle over screens and glass; looks like snow | **minor** | Cap sprite size in pixels, fade within 2 m of camera, cut count 3× |
| `int_-13_210_188_-90_-12.png` | Diagonal light shafts are hard-edged quads; red/amber point lights render as bare orbs; one pit screen clipped to white | Cheap-looking beams and floating orbs break the illusion of fixtures | **minor** | Radial soft edge on beam material, hide light sprites / put them inside housings, cap `screen` emissive |
| `bridge_pit.png` | Pit walls use `wornMetal` at a scale that reads as rust/corrosion | Contradicts the clean-plating language; an ISD bridge is pristine | **minor** | Use `imperialPanel`/`deckBlack` for pit walls; reserve `wornMetal` for grates and hangar floors |
| `int_0_210_178_180_6.png` | Aft wall: cog emblem ≈ 1 m and blast door look small for a 34 m × 28 m room; port and starboard pit-wall screens are mirror copies | Reads as copy-paste and under-scaled | **minor** | Emblem 3 m, door frame 3.6 m with a blast-door jamb, different `screenRect` pages per side |
| `bridge_pit.png` etc. | Large schematic screens and indicator matrices are static (§5) | The nerve centre of the ship shows no activity | **major** | UV-scroll or page-cycle the big `screen` planes; blink a subset of matrix cells |

### 2.2 Bridge glazing sightline (`bridge_window`)

`bridge_window.png` (383 calls, 1143k tris, 16 lights, 318 objs, 6120 ms). With the camera at the glass the view
works: the hull wedge sweeps away below, a planet limb sits on the right, stars are crisp and the composition is
recognisably "Star Destroyer bridge". The haze problem is therefore fog/beams between camera and glass, not the
glass material. Detail issues remain in the frame itself.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `bridge_window.png` | Mullions are flat boxes with no bevel; the centre mullion is visibly thicker than the others; the sill is a dull uniform navy slab | Frame is the foreground of the hero shot and it is the least detailed thing in it | **polish** | Two-box bevelled mullion profile, equal widths, a sill lip with an indicator strip and a couple of stencils |
| `bridge.png` vs `bridge_window.png` | The hull is only visible within ~2 m of the glass | Nobody stands at the glass by default; the walkway view must carry the hull | **major** | Same fix as 2.1 row 1 |

### 2.3 Command corridor

`cmd_corridor.png` (318 calls, 655k tris, 10 lights, 250 objs, 7439 ms), `int_0_210_209_180_3.png` (397 / 849k / 16
/ 404 / 5210 ms). Clean, legible circulation: eye-height white band, door alcoves with hazard jambs, indicator
panels, floor stripes, signage that faces the right way. But the corridor is 144 m of the same bay, and it is
overexposed — the far end dissolves into white.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `cmd_corridor.png` | Whole corridor over-bright; far end clips to white | Loses depth cue and the dark-plating mood | **major** | Halve band emissive; fog colour darker than the band so distance reads as darkening not whitening |
| `cmd_corridor.png` | 144 m of identical bays with no bulkhead frames or change of section | Reads as a tiled texture, not a ship | **major** | Bulkhead frame with 3.6 m arch every 24 m, alternate bay light intensity, vary `panelGrid` seed per bay, one utility alcove per 48 m |
| `int_0_210_209_180_3.png` | Hazard-striped door jambs are saturated and ~0.4 m wide; every door identical | Hazard band becomes wallpaper, loses meaning | **minor** | Jamb stripe 0.12 m, desaturate 20 %, reserve red hazard for blast/secure doors only |
| `int_0_210_209_180_3.png` | Lift indicator lights at the far end are 2–3 px and washed out | Wayfinding cue invisible | **polish** | Larger indicator plate over the lift arch |
| `cmd_corridor.png` | Scratch decals and dust as in 2.1 | Same | **minor** | Same |

### 2.4 Lift lobby (tower)

`lift_lobby.png` (315 calls, 675k tris, 13 lights, 310 objs, 7038 ms), `int_0_210_213_180_4.png` (316 / 675k / 13 /
310 / 4576 ms). The aft wall is one of the best-designed surfaces in the tower: mirrored lift doors with hazard
thresholds, a central status display, a grey panel band with cog stencils, an eye-height band. The ceiling and floor
let it down.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `lift_lobby.png` | Ceiling is a flat slab with one downlight clipped to white and a visible seam line | Ceiling is a quarter of the frame | **major** | Coffered `imperialCeiling`, 4 small downlights instead of one, hide seam with a trim strip |
| `lift_lobby.png` | Floor cog decal is blurry at 2 m | Emblem is the room's identity mark | **minor** | Render the emblem at 512² minimum or as geometry |
| `int_0_210_213_180_4.png`, `lift_lobby.png` | Dust motes near the camera are the size of a fist | Same as 2.1 | **minor** | Same |

### 2.5 Tactical

`room_tactical.png` (214 calls, 509k tris, 7 lights, 174 objs, 6191 ms), `int_-25_210_178_180_4.png` (190 / 490k / 7
/ 174 / 2304 ms). The rotating wireframe hologram over a table pedestal, hex projector housing and red-lit console
banks give it a purpose, and the hologram is genuinely animated (§5). It is the emptiest of the side rooms: a large
open floor between the table and the walls, flat upper walls, a black ceiling.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `room_tactical.png` | Window is a grey-green haze; nothing of the hull visible | Tower windows should show the hull (brief) | **major** | Same glazing/fog fix as 2.1 |
| `room_tactical.png` | Upper walls are flat dark planes; ceiling black void above the projector | Half the frame is undesigned | **major** | Coffers with two bands; a light ring around the hex projector housing |
| `room_tactical.png` | Holo table pedestal is a thin plain cylinder with weak railings; wireframe ship ambiguous | Focal prop lacks presence | **minor** | Wider octagonal pedestal with panel seams and a hazard ring; hologram with a base grid plane and 2–3 contact markers |
| `int_-25_210_178_180_4.png` | ~60 % of floor empty; dim | Reads as unfinished | **minor** | Two standing consoles facing the table, a floor grille lane, brighter table under-glow |
| `room_tactical.png` | Grey console in foreground is untextured; floor scratch decals | Same as 2.1 | **minor** | Same |

### 2.6 Nav station

`room_nav_station.png` (208 calls, 523k tris, 9 lights, 170 objs, 4629 ms), `int_25_210_176_0_0.png` (186 / 519k /
9 / 170 / 2463 ms), `int_25_210_178_180_4.png` (184 / 503k / 9 / 170 / 4504 ms). Best mood of the side rooms: a
star-chart holo-globe under dramatic shafts, hazard-edged pit, converging ceiling strips. The window still fails, and
the room is under-furnished for its length.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `int_25_210_176_0_0.png` | Window heavily hazed, centre mullion semi-transparent, two bright glints on the glass | Hull unreadable; see-through mullion is a material bug | **major** | Fog fix; opaque mullion material; move glints to fixtures |
| `int_25_210_178_180_4.png` | Light bands clipped to white | Kills the mood the shafts create | **major** | Band emissive ≤ 0.8 after tone-map |
| `room_nav_station.png` | Chairs have a mottled/corroded texture | Furniture on a flagship should be pristine | **minor** | Use `fabric`/`deckBlack` for seat shells |
| `int_25_210_178_180_4.png` | Wide empty floor; scratch decals | Under-furnished | **minor** | A second console island, floor grille lane |

### 2.7 Observation gallery

`room_observation.png` (171 calls, 499k tris, 6 lights, 147 objs, 4740 ms), `int_-73_210_175_0_-6.png` (168 / 498k /
6 / 147 / 2205 ms), `int_-73_210_179_180_2.png` (151 / 480k / 6 / 147 / 4149 ms). Strong axis: a lit central
walkway to a cog-emblem door with a telescope at the window end. Not animated (no animators registered).

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `room_observation.png` | Ceiling light band clipped to white | Same systemic exposure | **major** | Same |
| `room_observation.png`, `int_-73_210_175_0_-6.png` | Far window is grey-green haze | An *observation* gallery with nothing to observe | **major** | Fog fix; consider a larger clear pane here |
| `int_-73_210_175_0_-6.png` | Telescope is coarse untextured boxes/cylinders; two warm orbs floating near it | Focal prop and floating lights | **minor** | Add barrel rings, a mount yoke and a small screen; put lights in housings |
| `int_-73_210_175_0_-6.png` | Thick brown horizontal bar at eye level along the window wall | Reads as a wooden rail — off-language | **minor** | Dark steel rail with a white band inset |
| `room_observation.png`, `int_-73_210_179_180_2.png` | Same "PINCH OD 421" placard repeated on both side walls | Copy-paste | **polish** | Vary placard text/seed per side |

### 2.8 Intelligence

`room_intelligence.png` (188 calls, 485k tris, 9 lights, 157 objs, 5416 ms), `int_-50_210_215_180_2.png` (267 /
701k / 16 / 277 / 4217 ms), `int_-50_210_226_0_2.png` (200 / 489k / 9 / 157 / 5085 ms). The clearest identity in
the tower: mantrap vestibule, laser tripwire, red security mood, threat globe over a conference table, data walls.
The globe animates (§5). It is over-cooked in a few places.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `room_intelligence.png` | Hazard floor mat is fully saturated yellow/black and large — reads as a picnic blanket | Hazard band loses its warning register | **minor** | Narrow to a 0.3 m threshold strip, desaturate |
| `room_intelligence.png`, `int_-50_210_226_0_2.png` | Vestibule frame and wall panel have a speckled surface; `wornMetal` reads as mildew | Off-language grime in a high-security room | **minor** | Swap to `imperialPanel`, keep grime for hangar |
| `room_intelligence.png` | Black void ceiling with a red bloom | Same systemic ceiling issue | **major** | Coffers with red edge-lit slots |
| `room_intelligence.png` | Inner vestibule door small and plain vs the outer secure door | Mantrap should feel heavier inward | **minor** | Match outer door frame, add lock indicator |
| `int_-50_210_215_180_2.png` | Two downlights clipped to white; chairs blocky with rust spots; identical tiled data panels; chair row not aligned to workstations | Exposure, texture, repetition, furniture logic | **minor** | Tone-map; `fabric` chairs; vary panel pages; move chairs to desks |
| `room_intelligence.png` | Cog stencils placed at random heights/angles | Reads as scatter | **polish** | Align stencils to panel grid |

### 2.9 Briefing room

`room_briefing.png` (184 calls, 516k tris, 9 lights, 151 objs, 6449 ms), `int_-23_210_215_180_2.png` (257 / 730k /
16 / 271 / 3766 ms), `int_-23_210_226_0_2.png` (184 / 516k / 9 / 151 / 3787 ms). Tiered seating with blue aisle
lines facing a screen wall — right idea, but the screen is small, the seats are the same blocky chair as
everywhere, and the default camera is inside furniture.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `room_briefing.png` | Default view is inside a desk/chair, facing the door | The room's presentation shot shows nothing | **major** | Move `room_briefing` spawn to the aft aisle looking at the screen wall |
| `int_-23_210_215_180_2.png` | Screen wall is a 6-tile display ~2 m wide on a 30 m wall | Focal point undersized | **major** | 6 m × 3 m main display with a scrolling tactical page, two flanking panels |
| `int_-23_210_215_180_2.png`, `int_-23_210_226_0_2.png` | Ceiling downlights clipped to white on a speckled dark ceiling | Exposure | **minor** | Tone-map |
| `int_-23_210_226_0_2.png` | Every seat is the identical blocky rust-spotted chair | Copy-paste | **minor** | Bench seating per tier or 2–3 chair variants |

### 2.10 Comms

`room_comms.png` (187 calls, 553k tris, 10 lights, 157 objs, 7471 ms), `int_23_210_215_180_2.png` (271 / 766k / 16 /
277 / 4466 ms), `int_23_210_226_0_2.png` (187 / 553k / 10 / 157 / 4243 ms). A convincing operations room: rows of
console desks, button matrices with red/blue/amber, a radar sweep display that really sweeps (§5), a pipe conduit,
cog over the door with a hazard threshold. Exposure is the main problem.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `int_23_210_226_0_2.png`, `int_23_210_215_180_2.png` | Near ceiling strip clipped to white; a bloom hotspot on the centre aisle floor | Exposure | **major** | Tone-map bands; reduce floor gloss under downlights |
| `room_comms.png` | Default view faces the door; hazard pattern reads as a mat; server cabinets mirrored | Presentation shot misses the radar wall | **minor** | Turn `room_comms` spawn 180°; narrow threshold; vary cabinet fronts |
| `int_23_210_215_180_2.png` | All desks have identical button layouts; desk tops use rust-spotted `wornMetal` | Repetition, off-language grime | **minor** | 3 layout variants; `deckBlack` desk tops |
| `int_23_210_226_0_2.png` | Console screens static; only the radar animates | Ops room should be alive | **minor** | Scroll text on two desk screens |

### 2.11 Officers' quarters

`room_officers_quarters.png` (187 calls, 484k tris, 9 lights, 149 objs, 7600 ms), `int_47.5_210_216.8_55_2.png`
(179 / 484k / 9 / 150 / 3936 ms), `int_50_210_223.1_180_3.png` (140 / 462k / 9 / 150 / 3771 ms). Cabin corridor,
cabins with bunk/desk, a lounge with bench seating. The lounge reads well; the cabins are murky and the cabin doors
are the only doors under the human-scale spec.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `room_officers_quarters.png` | Corridor side walls flat; ceiling black void; door frames lit only by thin strips | Undesigned surfaces | **major** | `panelGrid` on cabin walls with name plates, coffers, door indicator plates |
| `int_47.5_210_216.8_55_2.png` | Cabin interior underexposed; bunk is a flat panel; light band at an odd mid-wall height; cabin door 2.2 m (`DOOR_H = 2.2` in `officers_quarters.js`) vs brief 2.4–3.6 m | Under-scale door and unreadable cabin | **minor** | Door 2.4 m; bunk with mattress inset and reading light; band at 2.1 m |
| `int_50_210_223.1_180_3.png` | Lounge chairs oversized and blocky; thin bright line under the bench | Scale/seam | **polish** | Chair 0.9 m tall; close the bench-to-floor gap |
| `room_officers_quarters.png` | Dust motes | Same | **minor** | Same |

### 2.12 Hangar (flight deck and well)

Views: `hangar.png` (282 calls, 1185k tris, 10 lights, 228 objs, 6164 ms), `hangar_well.png` (337 / 1688k / 16 / 277
/ 8526 ms), `int_-20_-40_0_-90_45.png` (386 / 1938k / 16 / 312 / 17837 ms), `int_0_-40_-82_180_28.png` (378 / 1449k
/ 14 / 271 / 14366 ms), `int_-24_-40_-10_-90_-32.png` (379 / 1916k / 16 / 312 / 9782 ms), `int_10_-40_-10_-90_28.png`
(420 / 2111k / 16 / 325 / 12138 ms), `int_-36_-40_-84_-145_10.png` (342 / 1212k / 10 / 236 / 11950 ms),
`int_10_-40_-34_-90_14.png` (379 / 1789k / 16 / 312 / 11081 ms), `int_0_-40_40_180_8.png` (329 / 1845k / 15 / 298 /
13091 ms).

The ingredients of a working flight deck are here: two rows of racked TIEs receding along the well, volumetric
floods, a crane, gantries and a stair tower, floor arrows and Aurebesh stencils, cog emblems, a moving crane and
warning beacons (§5). `int_0_-40_-82_180_28.png` and `sim34/int_0_-40_-82_180_18.png` are the frames that feel
like the film. Everything else about the presentation undersells it: the default `hangar` view is a wall, the
`hangar_well` view never shows the well, the ceiling above the racks is a void, and the exposure swings from blown
floods to a far end lost in black. No TIE launch was in frame in any of the 16 views at `--sim=45` (first launch
at 32 s, 4 s lowering + 6–10 s launching, so the fighter has usually cleared the well by 45 s); it was caught at
`--sim=34` — see 2.12a.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `hangar.png` | Default `hangar` view (−34, −40, −84, yaw −35) stands in the forward-port corner facing the forward wall ~6 m away: a person-height two-row "32" stencil clipped by the top of the frame, a status cabinet and crates; no deck, no well, no TIEs | This is the flagship interior view and it shows a wall | **blocker** | Move `hangar` to the forward end at (0, −40, −82) yaw 180 pitch 18 (this is `sim34/int_0_-40_-82_180_18.png`: deck, railing, both rack rows, shafts), or to the catwalk at y −32 |
| `hangar_well.png` | Camera at the well edge, pitch −8: the well is invisible; frame is railing + far wall; a glowing yellow pallet with no fixture; scratch decals | The view named "well" gives no sense of depth | **major** | Pitch −25 from x −26, or shoot from the catwalk; make the pallet a lit crate with a fixture; decals as 2.1 |
| `int_-20_-40_0_-90_45.png` | Above the racks the ceiling is a black void; racks are thin brackets with nothing to hang from | The TIE racks — the hangar's signature — float in nothing | **major** | Girder grid + coffered plating at the ceiling, rack rails spanning the girders, service catwalk between rows |
| `int_-24_-40_-10_-90_-32.png` | Well walls are a monotonous small-tile grid; the blue hex containment field reads as a thin strip; the two rows of yellow dashes and the cylinder bracket have no readable purpose | The well is the launch chute; it should read as machinery | **major** | Guide-rail channels, retracted clamp arms, red edge beacons, a tractor-beam emitter ring, blast-scored plates at the bottom |
| `int_0_-40_-82_180_28.png` | Far (aft) end sinks into black; overall exposure low so the deck is barely visible | Best frame in the hangar loses its far third | **minor** | Floods on the aft blast door, one bright band across the far bulkhead |
| `int_10_-40_-10_-90_28.png`, `int_-36_-40_-84_-145_10.png` | Floodlights clip to white with heavy warm/white bloom; starboard wall is flat plating | Exposure and undesigned wall | **minor** | Tone-map; add conduit runs and tool lockers along the starboard wall |
| `int_10_-40_-34_-90_14.png` | X-braces intersect the flight-control stair; the booth above is dark and featureless | Intersecting geometry; booth should glow | **minor** | Offset braces to the stringer, light the booth glazing from inside |
| `int_0_-40_40_180_8.png` | Blast door to the shuttle bay is a flat slab with a stripe | Major threshold reads as a texture | **minor** | Segmented door leaves with a recessed track and hazard chevrons |
| `int_-20_-40_0_-90_45.png` | TIE wing panels read paper-thin edge-on; cradle arms are plain boxes | Hero props | **polish** | 0.15 m wing frame thickness, pylon detail, cradle clamps with amber lights |

#### 2.12a Launch check at `--sim=38` and `--sim=34`

`sim38/int_-24_-40_-10_-90_-32.png` (383 calls, 1920k tris, 16 lights, 304 objs, 2200 ms), `sim38/int_-30_-40_-60_-60_10.png`
(393 / 1809k / 16 / 295 / 2910 ms), `sim34/int_0_-40_-82_180_18.png` (378 / 1449k / 14 / 263 / 3355 ms),
`sim34/int_-20_-40_0_-90_30.png` (405 / 1939k / 16 / 312 / 4114 ms).

At `sim=38` nothing was in the well from either angle. At `sim=34` the launch is caught: in
`sim34/int_0_-40_-82_180_18.png` the second TIE in the starboard row hangs ~2 m below the rack line, tilted, with an
orange thruster glow under the cockpit (lowering phase). This frame — pitch 18 from the forward end — is also the
best overall composition of the hangar: deck, railing, well edge, both rack rows, ceiling grid and shafts all in
frame. Two things the launch check exposes:

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `sim34/int_0_-40_-82_180_18.png` | The lowering TIE is only distinguishable by looking twice: no warning strobes, no red deck lights, no clamp-arm motion, no floor markings lighting up | A launch on a working flight deck should be an event | **major** | Red rotating beacons on the rack rail + amber floor strip under the slot for the lowering/launching states; audible cue exists, visual cue does not |
| `sim38/int_-24_-40_-10_-90_-32.png` | Down in the well: the far wall is a small-brick tile grid (reads as masonry), the hazard kerb has heavy mud splotches, the blue hex containment field is a thin strip at this pitch; retracted clamp arm is cylinders on a box | The launch chute should read as machinery, not a tiled shaft | **major** | Large plate panels with rail channels and beacons; clean hazard paint; clamp arms with hydraulics and amber lights |
| `sim38/int_-30_-40_-60_-60_10.png` | Underside of the maintenance ramp fills half the frame with streaked brown `wornMetal` that reads as plywood; glowing floor pallet clips to white | Material scale + exposure | **minor** | `hullPlate` on structure undersides; pallet as a lit crate |

### 2.13 Flight control booth

`room_flight_control.png` (318 calls, 1085k tris, 16 lights, 309 objs, 12859 ms). Consoles with button matrices,
glazing onto the hangar, floor stripes to the door. It only animates on a launch event (a screen flash in
`flight_control.js`); otherwise the booth is static.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `room_flight_control.png` | Ceiling is an empty black void above the glazing | Same systemic ceiling | **major** | Low coffer with two bands |
| `room_flight_control.png` | Console screens static except the launch flash (§5) | Flight control should be the busiest screens on the ship | **minor** | Scrolling launch queue, sweeping approach radar |
| `room_flight_control.png` | Dust motes over the glazing | Same | **minor** | Same |

### 2.14 Fighter maintenance

`room_fighter_maint.png` (287 calls, 1672k tris, 15 lights, 260 objs, 8711 ms), `int_-76_-40_-15_-90_4.png` (363 /
1688k / 15 / 252 / 10611 ms), `int_-47_-40_-56_135_4.png` (307 / 1686k / 15 / 260 / 15222 ms). A TIE on a cradle, a
steel gantry with a stair and hazard-striped column bases, floor stencils — the right content, spread too thin over
a 36 m × 90 m floor, under a ceiling that looks corroded.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `room_fighter_maint.png` | Default view faces a repetitive wall; the TIE and gantry are out of frame | Presentation shot | **major** | Spawn at (−50, −40, −50) yaw 150 |
| `int_-47_-40_-56_135_4.png` | Two thirds of the frame is bare floor | Reads as a warehouse at night | **major** | Second TIE cradle, tool carts, cable reels, parts racks, a second floor stencil |
| `int_-47_-40_-56_135_4.png` | Ceiling plating uses rust-brown `wornMetal` | Off-language | **minor** | `hullPlate`/`imperialPanel` ceiling |
| `int_-76_-40_-15_-90_4.png` | Foreground bench is an untextured black box; red cylinder is generic | Filler props | **minor** | Panelled bench with drawers, a labelled fuel cell |

### 2.15 Cargo bay

`room_cargo_bay.png` (276 calls, 1042k tris, 15 lights, 288 objs, 7142 ms), `int_47_-40_-27_-45_6.png` (312 / 1045k
/ 15 / 288 / 5800 ms), `int_76_-40_-42_90_4.png` (364 / 1070k / 14 / 288 / 14207 ms — camera inside a container
stack; not counted). From the right angle this is one of the best rooms in the ship: an overhead crane on a
hazard-striped beam with a container on the hook, racking with canisters, yellow floor lanes, a mezzanine. The
default view faces the racking wall and the materials on the consoles are wrong.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `room_cargo_bay.png` | Default view: racking wall + empty foreground; crane and mezzanine barely in frame | Presentation shot | **minor** | Spawn at (47, −40, −27) yaw −45 (this is `int_47_-40_-27_-45_6.png`) |
| `int_47_-40_-27_-45_6.png` | Lectern and console fronts use `wornMetal` at a scale that reads as plywood/wood grain | Breaks the Imperial palette | **minor** | `deckBlack` with panel seams |
| `room_cargo_bay.png` | 15 identical rounded canisters in a 3×5 grid; a column passes in front of the cog emblem | Copy-paste and a floating pole | **minor** | 3 canister variants, offset emblem from the column |
| `room_cargo_bay.png`, `int_47_-40_-27_-45_6.png` | Two floodlights clipped to white; floor arrow stencil appears to glow | Exposure; decals should not emit | **minor** | Tone-map; decal material non-emissive |
| `room_cargo_bay.png` | Upper wall is a uniform panel grid with vertical seams | Undesigned | **polish** | Conduit runs, a cargo-manifest display |

### 2.16 Repair bay

`room_repair_bay.png` (256 calls, 1404k tris, 12 lights, 257 objs, 7761 ms), `int_76_-40_60_90_4.png` (333 / 1517k /
11 / 257 / 12158 ms), `int_47_-40_34_-135_4.png` (313 / 1607k / 16 / 309 / 12656 ms). A crane beam, a large engine
component on yellow cradles with a work-area outline, drums, crates, lockers, droid charging alcoves. Purpose is
legible; the space is empty and repetitive.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `room_repair_bay.png` | Six identical droid charging alcoves in a row; default view faces this wall; half the frame bare floor | Copy-paste is the first thing you see | **major** | 2–3 alcove variants (one open with a droid, one dark), spawn facing the crane |
| `int_47_-40_34_-135_4.png` | One hero prop in a 36 m × 60 m floor | Under-furnished | **major** | A TIE hull on jacks, a welding gantry, tool carts, cable trays |
| `room_repair_bay.png`, `int_76_-40_60_90_4.png` | Walls lighter grey than the rest of the ship; floodlights clipped to white | Palette drift and exposure | **minor** | Darken wall albedo 30 %; tone-map |
| `int_47_-40_34_-135_4.png` | Warm floor glow blobs with no fixture (right of centre) | Floating light | **polish** | Attach to a lamp mast |

### 2.17 Shuttle bay

`shuttle_bay.png` (184 calls, 1021k tris, 10 lights, 171 objs, 7063 ms), `int_-24_-40_108_-56_6.png` (228 / 1040k /
10 / 178 / 9214 ms), `int_-26_-40_80_-150_8.png` (186 / 1025k / 10 / 178 / 9871 ms). The Lambda shuttle on a
raised, hazard-edged, under-lit pad with a service cart and a cog on the far wall is a proper set piece
(`int_-26_-40_80_-150_8.png`). The hall around it is a long repetitive box with a blown flood and an ambiguous far
end.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `shuttle_bay.png`, `int_-26_-40_80_-150_8.png` | Central/left floodlight clips to white with bloom over a third of the frame | Exposure | **major** | Tone-map floods |
| `shuttle_bay.png` | Far end at z 170 is a low railing with a black band above — is it a bay door, space or a wall? | Reads as a gap into the void | **major** | A closed segmented bay door with a red beacon row, or an open door with visible starfield/atmosphere shield |
| `shuttle_bay.png` | Three identical cog emblems — port wall, aft wall, starboard wall — same size, same height; the panel grid repeats around them | Copy-paste | **minor** | One large emblem on the aft wall; side walls get bay-number stencils and status screens |
| `shuttle_bay.png` | Shuttle wing at 2 m shows a speckled dot texture | Hero prop material | **minor** | Panel-line normal/emissive detail instead of speckle |
| `int_-26_-40_80_-150_8.png`, `int_-24_-40_108_-56_6.png` | Shuttle is coarse: flat wing slabs, no panel lines, unlit cockpit, low-poly engine; a black blob prop by the pad | Hero prop fidelity | **minor** | Wing frame + panel lines, cockpit glow, engine bell rings, replace blob with a fuel cart |

### 2.18 Hangar lobby

`room_hangar_lobby.png` (196 calls, 490k tris, 6 lights, 210 objs, 7035 ms). A blast door with a hazard stripe, a cog
placard, a status screen, an eye-height band — a correct vestibule, but dark, empty and undecorated overhead.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `room_hangar_lobby.png` | Ceiling is a black void with a few pinpoint fixtures; the eye-height wall band is effectively the only illumination | Room is a dim box | **major** | Coffers with two downlights, red beacon over the blast door |
| `room_hangar_lobby.png` | No furniture or pilot-readiness cues (no helmet racks, lockers, briefing screen) | Purpose reads as "door" | **minor** | Locker bank, bench, a launch-status board |
| `room_hangar_lobby.png` | Two identical floor stencils; heavy scratch decals; dust | Copy-paste + systemic | **minor** | Vary stencil text; decal fix |

---

## 3. Human scale check

- Doors in `layout.js` (`D(id, a, b, axis, at, from, to, h, kind)`): bridge–corridor 3.2 m blast, corridor–lift
  3.0 m blast, bridge–tactical/nav 2.6 m, side rooms off the corridor 2.4–2.6 m — all within 2.4–3.6 m. Hangar
  thresholds are deliberately vehicle-scale (shuttle-bay blast door 14 m, side-bay arches 10–12 m, hangar lobby 4 m).
  Officers' cabin doors are `DOOR_H = 2.2` in `officers_quarters.js` — the only person-doors under spec
  (`int_47.5_210_216.8_55_2.png`).
- Railings read at hip height (~1.05 m) in `bridge_pit.png`, `int_-13_210_188_-90_-12.png`, `hangar_well.png`.
- Consoles ~1 m in `bridge_pit.png`, `int_23_210_215_180_2.png`, `room_flight_control.png`.
- Over-scale: the hangar wall stencil block (person-height, `hangar.png`), hazard jambs (~0.4 m, `int_0_210_209_180_3.png`),
  lounge chairs (`int_50_210_223.1_180_3.png`), floor scratch decals everywhere.

---

## 4. What works well

- **Bridge pits** — `bridge_pit.png`, `int_-13_210_188_-90_-12.png`: schematic screens, Aurebesh readouts, indicator
  matrices, red-backed chairs, railing framing the pit, stair under-lights. The most Imperial frames in the set.
- **Bridge glazing at the glass** — `bridge_window.png`: hull wedge, planet limb and starfield compose exactly as
  they should.
- **Lift lobby aft wall** — `lift_lobby.png`, `int_0_210_209_180_3.png`: hazard thresholds, central display, cog
  stencils on a grey band; the corridor signage is correct Aurebesh, not mirrored.
- **Intelligence identity** — `room_intelligence.png`: mantrap vestibule, laser tripwire, red mood, threat globe.
- **Comms operations wall** — `int_23_210_215_180_2.png`: radar sweep (animated), button matrices, pipe conduit.
- **Nav station mood** — `room_nav_station.png`: star-chart globe under light shafts, hazard pit edge.
- **Observation axis** — `room_observation.png`: lit walkway to the cog door.
- **Hangar racks** — `sim34/int_0_-40_-82_180_18.png` and `int_0_-40_-82_180_28.png`: two rows of TIEs receding
  along the well under a ceiling grid of bands, with volumetric floods, deck and railing in frame, and (at sim 34)
  one TIE dropping out of its rack with a thruster glow; `int_-20_-40_0_-90_45.png` from below. The TIE model itself
  holds up close (cockpit window frame, pylons) in the `sim34` crop.
- **Cargo crane** — `int_47_-40_-27_-45_6.png`: hazard-striped crane beam with a container on the hook, racking,
  yellow lanes, mezzanine.
- **Repair hero prop** — `int_47_-40_34_-135_4.png`: engine component on yellow cradles inside a work-area outline
  under the crane beam.
- **Shuttle set piece** — `int_-26_-40_80_-150_8.png`: Lambda on a lit, hazard-edged pad with a service cart and a
  status board.
- **Motion that exists** — dais hologram, tactical hologram, intelligence globe, comms sweep, hangar crane and
  beacons (`anim/*` diffs, §5).

---

## 5. Animated interface elements — what actually moves

Pixel diffs (threshold 24/255, dust excluded by inspection of the diff masks):

| Pair | Wall-clock / sim gap | Moving | Static |
|---|---|---|---|
| `anim/bridge_pit_A/B` | 48 s real | dais hologram; pit-edge fixtures (`sim12/bridge_pit` also shows these) | all schematic/Aurebesh/arc screens, indicator matrices |
| `anim/room_tactical_A/B`, `sim12/room_tactical` | 30 s real / 12 s sim | table hologram | all wall screens |
| `anim/int_23_210_215_180_2_A/B` (comms) | 34 s real | radar sweep wedge | every desk screen |
| `anim/int_-50_210_226_0_2_A/B` (intelligence) | 41 s real | threat globe | data-wall panels |
| `anim/hangar_well_A/B` | 25 s real | crane trolley, two beacons | everything else |
| `anim/room_flight_control_A/B`, `sim12/room_flight_control` | 51 s real / 12 s sim | one object through the glazing (hangar) | all booth consoles (code only flashes on launch) |

Verdict: the *holographic* layer is animated and it shows; the *screen* layer — which is 90 % of what the eye lands
on in the bridge, comms, tactical and flight control — is static texture. The bridge has exactly two page-cycling
screens (`buildAnimated`, `s.next -= dt`), both in the forward-most side-wall bay at z 177.6, 3 m up; from the
`bridge_pit` camera they are ~22 m away and a few pixels wide — the `sim12/bridge_pit` diff shows one small changed
cluster on the starboard forward wall that is consistent with a page flip, but I could not confirm it by eye. Every
other screen in these rooms has no animator at all. Observation and officers' quarters register no animators.

Tooling note for the lead: `debugAPI.simulate()` calls `rooms.update(h, 0, …)` — `t` is always 0, so `--sim`
advances `dt`-accumulating animators but not `t`-driven ones; real-time software-GL captures do the opposite (the
0.1 s `dt` clamp starves `dt` accumulators). Passing an accumulated clock as `t` in `simulate()` would make `--sim`
a complete animation check.

---

## 6. Repetition, seams, floating and intersecting geometry (checklist)

- Copy-paste: droid alcoves ×6 (`room_repair_bay.png`), canisters ×15 (`room_cargo_bay.png`), cog emblems ×3
  (`shuttle_bay.png`), placards (`room_observation.png`), floor stencils (`room_hangar_lobby.png`), one chair model
  in every room, mirrored pit screens (`int_0_210_178_180_6.png`), 144 m of one corridor bay (`cmd_corridor.png`).
- Floating: white sphere on the bridge (`bridge.png`), light orbs (`int_-13_210_188_-90_-12.png`,
  `int_-73_210_175_0_-6.png`), glowing pallet (`hangar_well.png`), floor glow blobs (`int_47_-40_34_-135_4.png`).
- Intersecting: X-braces through the flight-control stair (`int_10_-40_-34_-90_14.png`); column through the cog
  emblem (`room_cargo_bay.png`).
- Gaps/voids: shuttle bay far end (`shuttle_bay.png`); black ceilings listed in §1.
- Seams: lift lobby ceiling seam (`lift_lobby.png`); bench-to-floor light line (`int_50_210_223.1_180_3.png`);
  semi-transparent mullion (`int_25_210_176_0_0.png`).
- Z-fighting: none observed at 1280×720 in any of the 80 frames (54 primary views + sim/anim/restat re-captures).

---

## 7. Top-12 fixes, ranked by impact per effort

1. **Fix the default cameras** — `hangar` (faces a wall), `room_briefing` (inside a desk), `room_comms`,
   `room_fighter_maint`, `room_repair_bay`, `room_cargo_bay` (face away from hero content), `hangar_well` (no well).
   Six numbers each in `main.js`; changes the first impression of the entire hangar cluster.
   (`hangar.png`, `room_briefing.png`, `hangar_well.png`)
2. **Give every hero room a ceiling** — bridge, tactical, intelligence, officers' corridor, flight control, hangar
   lobby, and a girder grid above the TIE racks. `imperialCeiling` exists; it just isn't used where it counts.
   (`bridge.png`, `room_tactical.png`, `int_-20_-40_0_-90_45.png`, `room_hangar_lobby.png`)
3. **Tone-map the whites** — one global clamp on band/flood emissive so nothing clips to 255 with bloom. Fixes the
   corridor, comms, briefing, nav, observation, cargo, repair, shuttle and hangar floods in one change.
   (`cmd_corridor.png`, `int_23_210_226_0_2.png`, `shuttle_bay.png`, `room_repair_bay.png`)
4. **Un-haze the glazing** — `fog: false` on glass and the exterior seen through it; cap `BeamBatch` frustums in
   front of windows. The hull becomes visible from the bridge walkway and from every tower room.
   (`bridge.png` vs `bridge_window.png`, `room_tactical.png`, `int_25_210_176_0_0.png`, `room_observation.png`)
5. **Animate the screens** — UV-scroll or page-cycle the large `screen` planes (the ones at eye level in the pits,
   comms desks, tactical and flight control, not just the two forward bridge bays) and blink 10 % of matrix cells.
   (`anim/*` diffs, §5)
6. **Dust motes** — pixel-size cap, near-camera fade, one third the count. Visible in every room.
   (`lift_lobby.png`, `room_intelligence.png`, `bridge.png`)
7. **Floor scratch decals** — ≤ 0.5 m, opacity ≤ 0.25, restricted to traffic lanes. (`bridge.png`,
   `hangar_well.png`, `room_hangar_lobby.png`)
8. **Break repetition** — bulkhead frames every 24 m in the corridor, 2–3 variants each for chairs, droid alcoves,
   canisters, placards; one cog per wall. (`cmd_corridor.png`, `room_repair_bay.png`, `room_cargo_bay.png`,
   `shuttle_bay.png`)
9. **Retire `wornMetal` from clean spaces** — bridge pit walls, comms/intel desks, cargo lectern, fighter-maint
   ceiling all read as rust, mildew or plywood. Keep it for hangar floors and grates. (`bridge_pit.png`,
   `int_47_-40_-27_-45_6.png`, `int_-47_-40_-56_135_4.png`)
10. **Build the captain's dais** — raised platform, steps, railing, flanking stations, bigger hologram; remove the
    stray sphere. (`int_0_210_201_0_-6.png`, `bridge.png`)
11. **Make the well read as a launch chute** — rail channels, clamp arms, beacon rows, a visible drop from the
    catwalk; visual launch cues (beacons, floor strip); and a default hangar view framed like
    `sim34/int_0_-40_-82_180_18.png`, which shows a TIE lowering at `--sim≈34`.
    (`sim38/int_-24_-40_-10_-90_-32.png`, `hangar_well.png`, `sim34/int_0_-40_-82_180_18.png`)
12. **Furnish the big halls** — repair bay, fighter maintenance, tactical, nav: mid-floor props (second cradle,
    tool carts, cable trays, console islands) so ≤ 40 % of any frame is bare floor.
    (`int_47_-40_34_-135_4.png`, `int_-47_-40_-56_135_4.png`, `int_-25_210_178_180_4.png`)

Also worth a line each: officers' cabin doors to 2.4 m; bevelled bridge mullions; a real bay door at the shuttle
bay's far end; move the X-braces off the flight-control stair; hide the light orbs.

---

## Appendix — every view taken, with the tool's stats

`calls / triangles / lights / objs / ms-per-frame` — software GL, 1280×720. Hangar-cluster views with `--sim=45`.

| File | Position / view | Stats |
|---|---|---|
| `bridge.png` | named | 411 / 1144k / 16 / 318 / 5472 |
| `bridge_window.png` | named | 383 / 1143k / 16 / 318 / 6120 |
| `bridge_pit.png` | named | 397 / 1142k / 16 / 318 / 7442 |
| `cmd_corridor.png` | named | 318 / 655k / 10 / 250 / 7439 |
| `lift_lobby.png` | named | 315 / 675k / 13 / 310 / 7038 |
| `room_tactical.png` | named | 214 / 509k / 7 / 174 / 6191 |
| `room_nav_station.png` | named | 208 / 523k / 9 / 170 / 4629 |
| `room_observation.png` | named | 171 / 499k / 6 / 147 / 4740 |
| `room_intelligence.png` | named | 188 / 485k / 9 / 157 / 5416 |
| `room_briefing.png` | named | 184 / 516k / 9 / 151 / 6449 |
| `room_comms.png` | named | 187 / 553k / 10 / 157 / 7471 |
| `room_officers_quarters.png` | named | 187 / 484k / 9 / 149 / 7600 |
| `hangar.png` | named, sim 45 | 282 / 1185k / 10 / 228 / 6164 |
| `hangar_well.png` | named, sim 45 | 337 / 1688k / 16 / 277 / 8526 |
| `room_flight_control.png` | named, sim 45 | 318 / 1085k / 16 / 309 / 12859 |
| `room_fighter_maint.png` | named, sim 45 | 287 / 1672k / 15 / 260 / 8711 |
| `room_cargo_bay.png` | named, sim 45 | 276 / 1042k / 15 / 288 / 7142 |
| `room_repair_bay.png` | named, sim 45 | 256 / 1404k / 12 / 257 / 7761 |
| `shuttle_bay.png` | named, sim 45 | 184 / 1021k / 10 / 171 / 7063 |
| `room_hangar_lobby.png` | named, sim 45 | 196 / 490k / 6 / 210 / 7035 |
| `int_-36_-40_-84_-145_10.png` | hangar aft-port corner | 342 / 1212k / 10 / 236 / 11950 |
| `int_-24_-40_-10_-90_-32.png` | down into the well | 379 / 1916k / 16 / 312 / 9782 |
| `int_0_-40_-82_180_28.png` | hangar full length, aft | 378 / 1449k / 14 / 271 / 14366 |
| `int_36_-40_64_35_12.png` | camera inside a container stack (discarded) | 385 / 1532k / 16 / 257 / 14607 |
| `int_-76_-40_-15_-90_4.png` | fighter maint, along the bay | 363 / 1688k / 15 / 252 / 10611 |
| `int_76_-40_60_90_4.png` | repair bay from the outer wall | 333 / 1517k / 11 / 257 / 12158 |
| `int_76_-40_-42_90_4.png` | camera inside a container (discarded) | 364 / 1070k / 14 / 288 / 14207 |
| `int_0_-40_40_180_8.png` | well floor toward shuttle-bay door | 329 / 1845k / 15 / 298 / 13091 |
| `int_10_-40_-34_-90_14.png` | flight-control stair | 379 / 1789k / 16 / 312 / 11081 |
| `int_-24_-40_108_-56_6.png` | shuttle bay, shuttle stern | 228 / 1040k / 10 / 178 / 9214 |
| `int_10_-40_-10_-90_28.png` | starboard hangar wall | 420 / 2111k / 16 / 325 / 12138 |
| `int_-20_-40_0_-90_45.png` | up at the TIE racks | 386 / 1938k / 16 / 312 / 17837 |
| `int_-47_-40_-56_135_4.png` | fighter maint, gantry + TIE | 307 / 1686k / 15 / 260 / 15222 |
| `int_47_-40_34_-135_4.png` | repair bay, crane + engine part | 313 / 1607k / 16 / 309 / 12656 |
| `int_-26_-40_80_-150_8.png` | shuttle on pad | 186 / 1025k / 10 / 178 / 9871 |
| `int_47_-40_-27_-45_6.png` | cargo crane | 312 / 1045k / 15 / 288 / 5800 |
| `int_-73_210_175_0_-6.png` | observation, window end | 168 / 498k / 6 / 147 / 2205 |
| `int_-25_210_178_180_4.png` | tactical, aft | 190 / 490k / 7 / 174 / 2304 |
| `int_25_210_176_0_0.png` | nav, window | 186 / 519k / 9 / 170 / 2463 |
| `int_-23_210_226_0_2.png` | briefing, forward | 184 / 516k / 9 / 151 / 3787 |
| `int_23_210_226_0_2.png` | comms, forward | 187 / 553k / 10 / 157 / 4243 |
| `int_-50_210_226_0_2.png` | intelligence, forward | 200 / 489k / 9 / 157 / 5085 |
| `int_47.5_210_216.8_55_2.png` | officers' cabin | 179 / 484k / 9 / 150 / 3936 |
| `int_50_210_223.1_180_3.png` | officers' lounge | 140 / 462k / 9 / 150 / 3771 |
| `int_0_210_201_0_-6.png` | bridge walkway, forward | 285 / 801k / 10 / 201 / 5926 |
| `int_-13_210_188_-90_-12.png` | port pit from the walkway | 296 / 877k / 15 / 243 / 7193 |
| `int_0_210_178_180_6.png` | bridge, aft wall | 247 / 780k / 10 / 201 / 3893 |
| `int_0_210_213_180_4.png` | lift lobby, aft | 316 / 675k / 13 / 310 / 4576 |
| `int_-23_210_215_180_2.png` | briefing, aft (screen wall) | 257 / 730k / 16 / 271 / 3766 |
| `int_23_210_215_180_2.png` | comms, aft (radar wall) | 271 / 766k / 16 / 277 / 4466 |
| `int_-50_210_215_180_2.png` | intelligence, aft | 267 / 701k / 16 / 277 / 4217 |
| `int_25_210_178_180_4.png` | nav, aft | 184 / 503k / 9 / 170 / 4504 |
| `int_-73_210_179_180_2.png` | observation, aft | 151 / 480k / 6 / 147 / 4149 |
| `int_0_210_209_180_3.png` | corridor → lift lobby | 397 / 849k / 16 / 404 / 5210 |
| `sim12/bridge_pit.png` | sim 12 | 272 / 800k / 10 / 201 / 3985 |
| `sim12/room_tactical.png` | sim 12 | 214 / 509k / 7 / 174 / 3940 |
| `sim12/hangar_well.png` | sim 12 | 341 / 1695k / 16 / 269 / 5375 |
| `sim12/room_flight_control.png` | sim 12 | 310 / 1078k / 16 / 301 / 7843 |
| `anim/*_A.png`, `anim/*_B.png` | real-time pairs (25–51 s apart) | bridge_pit 272 / 800k; tactical 214 / 509k; comms 271 / 766k; hangar_well 337 / 1688k; flight_control 306 / 1078k; intelligence 200 / 489k |
| `sim38/int_-24_-40_-10_-90_-32.png` | down into the well, sim 38 | 383 / 1920k / 16 / 304 / 2200 |
| `sim38/int_-30_-40_-60_-60_10.png` | under the maint ramp toward the well, sim 38 | 393 / 1809k / 16 / 295 / 2910 |
| `sim34/int_0_-40_-82_180_18.png` | hangar full length, lowering TIE, sim 34 | 378 / 1449k / 14 / 263 / 3355 |
| `sim34/int_-20_-40_0_-90_30.png` | starboard rack row, sim 34 | 405 / 1939k / 16 / 312 / 4114 |
