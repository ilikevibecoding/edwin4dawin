# Northstar Rescue — Visual Quality Checklist

Owner: **Fable 1** (art direction). Derived from `docs/visual-bible.md` and the project
brief. Last full pass: **2026-07-26**, at 1920×1080 with geometry spot-checks at
1280×720 and 2560×1440 and UI scales 0.8 / 1.0 / 1.4.

**How this document is verified.** Everything here was judged from live screenshots of
the running game (Vite dev server + headless Chromium with SwiftShader), not from code
reading. Evidence screenshots referenced below live in `/tmp/` (session artefacts,
`tour-*.png`, `flow-*.png`) and the committed smoke set in `artifacts/smoke/`.
Re-run the tour with a throwaway Playwright script: boot with `?qa=1`, `startMission()`,
then for each key in `CHECKPOINTS` (`src/map/layout.js`) call
`__NORTHSTAR__.teleport(key)`, `advanceTime(700)`, screenshot, and measure mean
luminance by drawing `#game-canvas` into a 96×54 offscreen canvas and averaging
`0.2126R + 0.7152G + 0.0722B` per pixel.

**Luminance bands used below** (mean of the whole frame, 0–255):

- **< 25** — unplayable; the player cannot read the room at all.
- **25–45** — too dark to fight; enemies and geometry merge.
- **45–70** — moody; acceptable only for service/back-of-house beats, and only if
  silhouettes still read.
- **70–150** — target band for fightable interiors.
- **> 190** — risk of blown highlights; check HUD text survives.

---

## Part A — requirement checklist

Verdicts: **PASS** / **MARGINAL** (works but below the bar somewhere) / **FAIL**.

### A1. Palette and lighting-zone adherence

- **Requirement:** every surface colour resolves to a `PALETTE` key; each room is lit
  per its `ZONES` script (exterior daylight-cold, office fluorescent, executive
  tungsten, service tired-fluorescent + emergency, server blue/amber).
- **Verify:** tour all `CHECKPOINTS`; compare against §1 of the visual bible; measure
  luminance.
- **Verdict: FAIL (lighting), PASS (palette).** The palette itself is disciplined —
  cool blue-greys everywhere, warm light only in the executive wing, red only at
  exits/alarms. But the *zone script is not being delivered by the rig* in several
  rooms: archive measures **6/255** (`/tmp/tour-archive.png`), reception **28**,
  lobby **39**, mechanical **45**, garage **48**, serverroom **49**, extraction **50**.
  The lobby is written as a welcoming double-height space and reads as a navy void.
  Owner: **Fable 2** (`src/map/lighting.js`); the `ZONES` numbers in
  `src/art/palette.js` are Fable 1's but are additive-frozen this session.

### A2. Material standards

- **Requirement:** albedo in PBR range, metalness binary, roughness varied with
  motivated wear; no material noisier than the story it tells.
- **Verify:** close-ups of carpet, ceiling tile, cubicle fabric, tile, wood, metal.
- **Verdict: MARGINAL.** The recent fixes landed: acoustic ceiling tile reads as tile,
  not camouflage (`/tmp/tour-openoffice.png`); cubicle fabric is a quiet muted blue;
  carpet is a readable mid-blue. The one remaining offender is the **wood grain**: it
  is a high-contrast tiger-stripe that reads as bark or camouflage on the exec
  bookshelves and desk (`/tmp/tour-execoffice.png`), burnt-orange streaks on door
  leaves (`/tmp/tour-eastlink.png`, right edge), and in low light it tints to a molten
  red-black that makes the janitor door look like a furnace hatch
  (`/tmp/tour-janitor.png`). Owner: **Fable 3** (`src/art/texgen.js` wood family).

### A3. Scale standards

- **Requirement:** doors 0.95×2.1 m, desks 0.735 m, counters 0.92 m, chairs 0.45 m,
  eye height 1.68 m; props pass the door/desk sanity check.
- **Verify:** stand in doorways; compare furniture to door heights in screenshots.
- **Verdict: PASS.** Doors, cubicles, benches, kitchenette and stall partitions are all
  mutually consistent across the tour set; nothing reads dollhouse or giant.

### A4. Edge bevelling

- **Requirement:** no razor edges at player height (3 mm chamfer per shape language).
- **Verify:** close approach to wall corners, door frames, desks; look for zero-width
  highlights.
- **Verdict: PASS.** Corners catch a soft highlight line rather than aliasing to
  nothing; the viewmodel weapon itself shows the chamfer language clearly.

### A5. Decal quality

- **Requirement:** decals sit on surfaces, tell a story (wear, prints, leaks), and
  never float.
- **Verify:** entrance footprints, restroom leak, carpet wear, bullet impacts, and the
  dock zone.
- **Verdict: FAIL in the dock zone.** Footprints at the entrance and the restroom leak
  read well. But the loading bay / garage / extraction volume is scattered with
  **white smears floating in mid-air**, detached from any surface
  (`/tmp/tour-loading.png` — over the roller door and doorway; `/tmp/tour-garage.png`,
  `/tmp/tour-extraction.png` — hovering off the walls). A few also float off the
  exterior facade (`/tmp/tour-entrance.png`, left edge). They look like snow/scuff
  decals projected past their target plane. Owner: **Fable 3** (`src/fx/decals.js`).

### A6. Glass reads as glass

- **Requirement:** glazing shows the space beyond plus a specular cue; never opaque,
  never invisible.
- **Verify:** entrance double doors, corridor office glazing, conference window.
- **Verdict: PASS.** The entrance doors show the vestibule beyond with frame reflections
  (`/tmp/tour-entrance.png`); mid-corridor office glazing reads perfectly
  (`/tmp/tour-midcorr.png`); the conference window reads as glass behind half-open
  blinds (`/tmp/tour-conference.png`).

### A7. No crushed blacks, no blown windows

- **Requirement:** detail survives in the darkest interior surface; exterior windows
  never clip to pure white.
- **Verify:** luminance histogram of dark rooms; look through windows from lit rooms.
- **Verdict: FAIL (blacks), PASS (windows).** Windows are well behaved — the storm
  exterior through the waiting-room and conference glazing is bright but textured.
  Blacks crush badly, though: open doorways into unlit rooms render as **pure black
  voids** (`/tmp/tour-vestibule.png` both doors, `/tmp/tour-serverroom.png` locked
  door), the exec-corridor carpet crushes to black-maroon, and the mezzanine void over
  the lobby is featureless black (`/tmp/tour-execcorr.png`). Owner: **Fable 2**
  (fixture coverage / minimum fill), with **Fable 4** owning any tonemap floor in
  `src/fx/postfx.js`.

### A8. Restrained bloom and vignette

- **Requirement:** bloom only where a fixture motivates it; vignette subtle enough
  that you notice it only when it is gone.
- **Verify:** stare at ceiling fixtures and the snow exterior; check screen corners.
- **Verdict: PASS.** Fixtures glow modestly without haloing neighbouring geometry
  (`/tmp/tour-midcorr.png`, `/tmp/tour-breakroom.png`); corners darken gently; the
  damage vignette is event-driven only.

### A9. Readable enemies

- **Requirement:** an enemy silhouette must read at gameplay distance in its room's
  zone lighting.
- **Verify:** screenshots with AI frozen at spawn distance in bright and dark rooms.
- **Verdict: MARGINAL.** In the target band the dark suit against light walls reads
  instantly (`/tmp/tour-loading.png`, `/tmp/tour-execcorr.png`). But in the failed-dark
  rooms (A1) an enemy would merge with the room — this is a lighting failure, not a
  character one. Owner: character values **Fable 4** (fine); room light **Fable 2**.

### A10. HUD legibility

- **Requirement:** vitals, ammo, timer and objectives read as one family; everything
  survives both a bright snow exterior and a dark service corridor; no element ever
  overlaps another at 1920×1080, 1280×720, 2560×1440 or UI scale 0.8–1.4.
- **Verify:** `/tmp/tour-insertion.png` (bright), `/tmp/tour-servicecorr.png` (dark),
  `/tmp/tour-upperlanding.png` (near-white wall, mean 171); automated bounding-box
  collision checks across all nine resolution × scale combinations.
- **Verdict: PASS** (after this session's rework). Etched text shadows carry the small
  labels over the white wall and the snow; the collision matrix reported zero overlaps
  in nine of nine combinations; announcer suppresses itself while the Tab objectives
  panel is open.

### A11. Typography consistency

- **Requirement:** display stack for headings/labels (uppercase, tracked), UI stack for
  body, tabular numerals for changing numbers; no default browser widgets.
- **Verify:** flow screenshots of every screen (`/tmp/flow-01` … `flow-18`).
- **Verdict: PASS.** One family across title, menus, briefing, loadout, HUD and end
  cards; timers and ammo use tabular numerals; sliders/cyclers are custom-drawn.

### A12. Iconography consistency

- **Requirement:** all glyphs from `src/ui/icons.js`; 24×24, stroke 1.6, outlines,
  `currentColor`; one symbol per concept across HUD, minimap and briefing.
- **Verify:** compare hostage/objective/extraction markers on the HUD minimap vs the
  briefing floor plan (`/tmp/flow-07-briefing-ground.png` vs `/tmp/flow-11-hud.png`).
- **Verdict: PASS.** Same marker shapes at both scales; no stray emoji or second
  symbol systems anywhere in the flow set.

---

## Part B — room-by-room tour (art-director verdicts)

All 29 `CHECKPOINTS`, 1920×1080, mission running, AI frozen. "Luma" is the mean frame
luminance 0–255. Evidence: `/tmp/tour-<key>.png`; the earlier committed set is
`artifacts/smoke/room-<key>.png` (pre-fix state, useful for befores).

| Room | Luma | Verdict | Notes (owner of each problem in bold) |
| --- | ---: | --- | --- |
| insertion | 135 | PASS | Snow, bollards, glazed entry all read; HUD survives the brightest scene in the game. |
| entrance | 112 | PASS− | Glass doors excellent. Exit sign above the door reads as a black box with a green blob, not a sign (**Fable 3**). A couple of white smear decals float off the facade (**Fable 3**). |
| vestibule | 102 | PASS− | Wall clock is a lovely beat. Both side doorways render as pure black voids — no spill from the rooms beyond (**Fable 2**). |
| lobby | 39 | **FAIL** | Written as a bright double-height welcome; delivered as a navy box. Brand sign barely self-illuminates, upper volume unlit (**Fable 2**). |
| reception | 28 | **FAIL** | Even darker; desk monitors are dead black, brand-sign letters clip at an odd angle behind the desk (**Fable 2** light, **Fable 3** sign/monitor emissives). |
| waiting | 95 | PASS | Ficus, benches, navy carpet, tile ceiling — the calmest room in the game and it reads. |
| stairwell | 120 | PASS | Nothing wrong visually; the checkpoint spawn faces a blank wall, which makes automated review shots useless (**Fable 2**, nit). |
| openoffice | 93 | PASS | The recovery room: acoustic ceiling reads as tile (fix confirmed), cubicle fabric muted (confirmed), carpet mid-blue (confirmed), viewmodel no longer dominates (confirmed). |
| officeWest | 112 | PASS− | Good; the wood door seen through the far opening reads as burnt-orange streaks (**Fable 3** wood grain). |
| conference | 132 | PASS− | Window + blinds are the best glass in the game. Bookshelf wood is noisy tiger-stripe (**Fable 3**). |
| breakroom | 145 | PASS | Brightest interior; kitchenette, fridge, checkered vinyl all read. Exemplar for the office zone. |
| restrooms | 119 | PASS | Heavy grout reads a bit like graph paper up close but is consistent; teal stalls and mop bucket good. |
| midcorr | 145 | PASS | The exemplar corridor: even fixtures, red alarm box, office glazing. Every corridor should aspire to this. |
| janitor | 69 | **FAIL** | The door texture tints to molten red-black and reads as a furnace hatch, not wood (**Fable 3**); ceiling crushes to black (**Fable 2**). |
| copyroom | 107 | PASS | Clean; view through to the office is good depth. |
| itroom | 113 | PASS | Reads fine; sparse but plausible. |
| serverroom | 49 | MARGINAL | Below the fight band; the locked door leaf renders as a pure black rectangle with no panel detail (**Fable 2** light, **Fable 3** door material in low light). |
| mechanical | 45 | **FAIL** | Too dark to fight; electrical panels are unlit black slabs, red-black door again (**Fable 2** primary, **Fable 3** panel emissive detail). |
| servicecorr | 54 | MARGINAL+ | The one *earned* dark room: single tired tube + red exit glow reads intentional and is still navigable. Keep the mood, lift the floor slightly. |
| loading | 77 | PASS− | Enemy silhouette reads clearly against the lit wall; green exit sign correct here. Ruined by dozens of floating white smear decals over the roller door (**Fable 3**). |
| garage | 48 | MARGINAL | Below band; roller door catches light nicely but walls are void-like and the floating smears continue (**Fable 2** + **Fable 3**). |
| extraction | 50 | MARGINAL | Same volume as garage, same verdicts. This is the mission's finale beat — it deserves better lighting than 50 (**Fable 2**). |
| execcorr | 55 | MARGINAL | Enemy reads; gold slat art piece is a good executive beat. Oxblood carpet crushes to black and the mezzanine void over the lobby is featureless black (**Fable 2**/**Fable 3**). |
| execoffice | 80 | PASS− | Hostage and captor read instantly. Worst-case wood: bookshelf + desk tiger-stripe (**Fable 3**). |
| archive | 6 | **HARD FAIL** | Effectively unlit: black frame with a mustard band of what appears to be unlit shelving geometry and green exit-sign bleed. Unplayable; worse than the previously reported 12/255 (**Fable 2**). |
| upperlanding | 171 | PASS | Brightest interior surface in the game (near-white wall); confirmed HUD text survives it. |
| upperweststair | 50 | MARGINAL | Spawn faces a featureless dark wall; whole volume below band (**Fable 2**). |
| weststair | 70 | PASS− | View into waiting is good; the framing stair wall reads mauve-purple, which is off the blue-grey script (**Fable 2**/**Fable 3** — check the material tint under tungsten spill). |
| eastlink | 133 | PASS− | Bright, clean link corridor; door leaf right of frame shows the tiger-stripe wood again (**Fable 3**). |

**Recent-fix confirmation (all landed):** acoustic ceiling tile no longer camouflage;
cubicle fabric no longer checkerboard; carpet no longer near-black; first-person
weapon proportionate (see `/tmp/tour-openoffice.png` vs
`artifacts/smoke/room-openoffice.png`).

---

## Part C — top remaining problems, ranked

1. **Archive is unlit (luma 6/255)** — unplayable, regressed vs the previous 12/255
   measurement. Needs fixtures or emergency lighting in the rig. Owner: **Fable 2**
   (`src/map/lighting.js`).
2. **Lobby + reception atrium (28–39)** — the game's front door and its scripted
   "welcoming" beat is a black box; brand sign and monitors need emissive lift too.
   Owner: **Fable 2**, with **Fable 3** for sign/monitor emissives.
3. **Tiger-stripe wood grain** — doors, bookshelves, exec desk; tints molten red in
   low light (janitor). One noise-octave and contrast reduction would fix every
   instance at once. Owner: **Fable 3** (`src/art/texgen.js`).
4. **Floating smear decals in the dock zone** (loading/garage/extraction, plus the
   facade) — white blobs hanging in mid-air. Owner: **Fable 3** (`src/fx/decals.js`).
5. **Service/dock band under-lit (45–55)** — mechanical, garage, extraction,
   serverroom, upperweststair all sit below the fight band; extraction is the finale
   and needs the most care. Owner: **Fable 2**. (The `ZONES.service` intensity values
   in `src/art/palette.js` are Fable 1's and can be revisited jointly, but the rig's
   fixture placement is the first lever.)
6. **Doorway/void crush** — openings into unlit spaces render as pure black holes
   (vestibule, serverroom, execcorr mezzanine). A small fill/spill or tonemap floor
   would preserve depth. Owner: **Fable 2**, tonemap floor **Fable 4**.
7. **Entrance exit-sign glyph** reads as a black box with a green blob. Owner:
   **Fable 3**.
8. **Weststair mauve wall** — off the blue-grey script. Owner: **Fable 2**/**Fable 3**.
9. **Stairwell-type checkpoints face blank walls** — hurts automated review coverage.
   Owner: **Fable 2** (spawn yaw).
