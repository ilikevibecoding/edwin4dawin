# REVIEW_INTERIOR_B — Engineering section, crew deck, corridors, lift lobbies and cabs

Independent visual critique. No source file was edited. All screenshots were taken with
`node tools/view.mjs <views> shots/review_interior_b --w=1280 --h=720` (software GL, SwiftShader) and every
PNG cited below was opened and judged. Stats quoted per view are the `calls / tris / lights` the tool printed
(`shots/review_interior_b/_log_batch*.txt`). Animated elements were checked by re-taking the same view with
`--sim=0.7` and `--sim=2.7` into `shots/review_interior_b/sim07/` and `shots/review_interior_b/sim/` and
diffing the frames numerically with a small PNG decoder (mean absolute pixel delta, % of pixels changed, mean
luminance of a region) because the visual difference was too small to trust by eye. Note that the scene was
being edited by other workstreams while this review ran: batch 14 (`_log_batch14.txt`) reports 13–14 lights
and ~5 % more triangles for the same rooms than batches 8–11 did (10–12 lights), so stats are as printed at
capture time and not strictly comparable between batches.

Reference brief: `PLAN.md` §3 (layout, room boxes), §6 (design language) and §9 (budgets), `docs/WORKSTREAM_GUIDE.md`
(screenshot tool, design language, human scale: doors 2.4–3.6 m, consoles ~1 m, tables 0.75 m, railings 1.05 m).

Severity scale: **blocker** (breaks the illusion or the brief for the room), **major** (any visitor will notice),
**minor** (noticeable when you look), **polish** (nice to have).

---

## 1. Overall verdict

**Solid foundation, not yet a showcase.** 74 frames (66 views plus 8 animation re-takes) across 18 spaces.
Tally: 1 blocker, 26 major, 39 minor, 21 polish issues, all cited to a screenshot in §2.

What is right: every room has a purpose you can name from a single frame, the human scale is correct
throughout, the Imperial language (dark plating, white bands, indicator matrices, hazard bands, Aurebesh, cog)
is consistent from the reactor pit to the command deck, and there are no geometry faults — no z-fighting, no
seams into the void (the one wall gap, §2.2, shows the reactor chamber behind it), no props intersecting or
floating by accident in any of the 74 frames. The detention block
(§2.15), the hyperdrive machinery (§2.3), the reactor as a volume (§2.1), the bacta tank (§2.13) and the door
fronts and lift lobbies (§2.6, 2.9, 2.17, 2.18) are genuinely good; the lounge holograms and the bacta bubbles
verifiably animate.

What stops it being a showcase:

1. **One blocker.** The engineering control room's "wide window into the reactor" renders as two opaque plates;
   the console arc faces a wall (§2.2). The best possible image of the section does not exist.
2. **Three cross-cutting faults that are in almost every frame.** Light strips and bands are over-exposed, so
   every corridor ends in a pure-white vanishing point, tables and ceilings clip to white and the thin-white-line
   Imperial look becomes fat bloom bars (§2.2–2.18); the `deckBlack` scuff texture draws a sharp "cracked glass"
   web on every glossy floor (§2.7, 2.12, 2.17); and the 144 m command corridor, the two 124 m crew corridors
   and the 140 m engineering spine are the same module repeated with nothing to mark a door, a junction or a
   room — the brief's explicit monotony test is failed (§2.5, 2.7, 2.17).
3. **The advertised engineering animations are invisible.** The reactor core pulse and the hyperdrive ring pulse
   exist in code and in pixel diffs (Δ mean luminance ≤ 2.2/255) but cannot be seen because the emitters are
   already clipped (§2.1, 2.3). The welding arc and cargo lift are hangar elements outside this review.
4. **The turbolift cabs do not read as turbolifts** once you look into them: a black cavity with a lit back wall,
   a void above the door, one clipped ceiling slab, and the same back wall in all three lobbies; every lobby is
   also labelled deck 07 (§2.6, 2.9, 2.18).
5. **Big rooms are dressed at the walls and empty in the middle** — engineering's entrance half, the medbay lane,
   the armory aisle and the lounge runner mat (§2.2, 2.12, 2.13, 2.14) — and repeated props (tanks, bunks, beds,
   racks, hatches) are exact copies (§2.4, 2.10, 2.13, 2.14, 2.16).

Budgets: every interior view is within the `PLAN.md` §9 triangle budget (max 930k in the reactor) and most
single-room views are within 250 calls. The exceptions are the corridor cluster (three corridor rooms rendered
together: 294–381 calls), the tower lobby view that includes the command corridor (316) and any view into or
inside an open turbolift cab (281–323 calls in the crew and engineering lobbies, against 191–233 for the same
lobbies with the cab out of frame) — 12–50 % over. The ranked fix list is in §4; items 1–5 there would change
the section from "competent procedural interiors" to "Imperial".

---

## 2. Room by room

### 2.1 Reactor (`reactor`, −32..32 × 304..368, floor −10, catwalk ring at 0, 40 m tall)

Views: `reactor.png` (177 calls, 903k tris, 14 lights), `int_0_0_362_0_-8.png` (247 / 930k / 14),
`int_14_-10_336_90_30.png` (182 / 906k / 14), `int_-10_-10_318_209_12.png` (162 / 845k / 14),
`int_-20_0_336_270_-25.png` (185 / 909k / 14) plus `sim/` and `sim07/` copies of the last one.

The reactor is the strongest *space* of the section: a real 40 m volume, a sunken pit with a fenced core base,
a catwalk ring with four grated bridges, hazard-banded railings and floor stencils, and the cyan mood reads
immediately (`int_0_0_362_0_-8.png`, `int_-10_-10_318_209_12.png`). It is let down by its hero: the core is a
flat pale-cyan slab (measured mean luminance 214–223 on the core body in `int_14_-10_336_90_30.png`, RGB ≈
190/220/226 — not clipped but with zero internal gradient or structure), the advertised core pulse is
numerically present but invisible (mean luminance of the core region changes by 1.0 between t = 0 and
t = 2.7 s and by 0.1 at t = 0.7 s; 0.4 % of pixels move by more than 8/255), and the upper half of the chamber
is an unlit near-black expanse (mean luminance 18.8 over the top 110 px of `int_14_-10_336_90_30.png`). The
named `reactor` view is also framed so that two gantry columns stand exactly in front of the core.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `int_14_-10_336_90_30.png`, `int_0_0_362_0_-8.png` | Core body is a uniform pale slab: no vertical gradient, no inner rod/filament, no plasma streaks; the glass tube is only readable by faint panel seams | The core is the one thing every visitor walks toward; a flat cylinder reads as an untextured emissive primitive, not a fusion core | **major** | Lower the emissive intensity of the outer sleeve, add an inner brighter core rod (radius ×0.35) with a scrolling/vertical stripe texture, and give the sleeve a Fresnel-ish rim so the middle is darker than the edges |
| `int_-20_0_336_270_-25.png` vs `sim/…` and `sim07/…` | Core pulse is imperceptible (Δ mean lum 1.0 at 2.7 s, 0.1 at 0.7 s) | The brief calls for a visible core pulse; a value change lost behind tone-mapping is the same as none | **major** | Pulse something that is not clipped: modulate the ring-edge lights, a few of the pit under-lights and the catwalk grate light intensity, or scale the inner rod ±10 % instead of intensity |
| `int_14_-10_336_90_30.png` | Everything above the top containment ring — the underside of the overhead canopy and the upper wall — is unlit black | From the pit floor (where the spawn puts you) the room appears to end in a void a few metres above the rings | **major** | Add two or three dim cyan/white uplights on the top ring and a faint emissive grid or vent pattern on the canopy underside; keep the mood dark but not absent |
| `reactor.png` | The named view is framed with two gantry columns bisecting the core; the hero shot is of two posts | This is the view the debug/screenshot pipeline shows for the room | **minor** | Move the named view ~4 m sideways or lower the pitch so the core sits between, not behind, the columns |
| `int_-20_0_336_270_-25.png` | Grate reflection of the core turns into a white blob in the middle of the bridge (region mean lum 203) | Overexposure kills the nice grate pattern exactly where the eye lands | **minor** | Lower the grate material roughness less / reduce the point-light intensity over the bridges, or clamp bloom threshold |
| `int_-10_-10_318_209_12.png` | The pit floor between the fence and the walls is empty deck; the gantry columns are identical speckled boxes | The pit is the biggest floor area in the section and holds only a fence | **minor** | Add coolant manifolds, pump skids, cable trenches and a couple of maintenance carts along the walls; vary the columns with hazard bands, ladders or a conduit run |
| `int_-10_-10_318_209_12.png` | A bright solid-green square glows on the left wall with no fixture around it | Reads as a debug marker, not a status lamp | **polish** | Put it in a lamp housing or replace with a small indicator matrix |

### 2.2 Engineering Control (`engineering`, −20..20 × 270..300, floor −10, h 6)

Views: `engineering.png` (198 calls, 908k tris, 14 lights), `int_0_-10_292_180_8.png` (195 / 907k / 14),
`int_-6_-10_295_165_8.png` (189 / 907k / 14), `int_0_-10_297_0_-6.png` (225 / 918k / 14),
`int_0_-10_288_0_-4.png` (214 / 910k / 14).

The control room has the right ingredients and the best console work of the section: a five-station arc with
waveform/bar-graph screens and red/amber/green indicator matrices, a 0.5 m chief's dais with cyan edge strips,
railings and a 3 m stair, computer banks down both side walls, two 6 × 2.4 m status screens and a cog emblem
over the entrance, and grated cable trenches feeding the arc (`int_0_-10_292_180_8.png`,
`int_0_-10_297_0_-6.png`, `int_0_-10_288_0_-4.png`). Scale is right (consoles ≈1 m, chairs, 1.05 m rails).
The room's whole premise, however, is missing: the source header promises "a wide window into the reactor
chamber (x −8..8, y 1..4.5)" and the console arc is aimed at it, but both panes render as opaque dark plates
carrying the WARNING / RESTRICTED stencils; the reactor is only visible through the 3.6 m blast door between
them. The entrance half of the room is also a 20 × 12 m empty gloss floor under a fan of ceiling strips that
converge into a blown-out white patch.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `int_0_-10_292_180_8.png`, `engineering.png` | The two "window" panes flanking the blast door are opaque plates (decals sit on them); the reactor is only seen through the door opening | The room is *the* reactor control room; the arc of stations faces a blank wall. The single strongest image of the section (cyan core behind glass, consoles in front) does not exist | **blocker** | The layout must carry a `glass` door record for x −8..8 so `windowCell` gets a real transparent pane and the reactor stays rendered; drop the two decals to the sill or the door jambs |
| `int_-6_-10_295_165_8.png` | Narrow vertical slot between the west pane and its jamb through which the reactor catwalk is visible; the pane edge is unfinished | Reads as a gap in the wall structure | **minor** | Extend the pane/plate to meet the jamb, or make the surround overlap the pane edge by 0.15 m |
| `engineering.png` | Entrance half of the room (z 270–282) is an empty 20 × 12 m black gloss floor | The first thing a visitor sees from the door is a void with a stage at the far end | **major** | Add a briefing table/holo-table on the centreline, two or three standing kiosks, a parts crate stack and a floor stencil grid; pull the computer banks 1 m off the wall so they cast onto the floor |
| `engineering.png`, `int_0_-10_297_0_-6.png` | Eight ceiling strips converge to a single hot white patch at the room centre; the strips themselves bloom into 30 px bars | Fights the black-gloss Imperial look, which relies on thin crisp strips | **minor** | Halve the strip emissive, or break them into 4 m segments with dark gaps; move the two centre point lights apart |
| `int_0_-10_297_0_-6.png` | Ceiling is a bare dark plane apart from the strips and four drop lights; no beams, ducts or vents over a room full of machinery | Flat surfaces read as unfinished | **minor** | Add two transverse ceiling beams at z 280 and 290 and a duct run along the side walls under the cyan edge strip |
| `int_0_-10_297_0_-6.png` | Five arc stations and the chief station are the same console model with the same chair, only the screen set differs | Copy-paste repetition at the focal point | **polish** | Vary two of the stations (a wider double station, a standing plotting board) |

### 2.3 Hyperdrive & Propulsion (`hyperdrive`, −70..−38 × 270..340, floor −10, h 12)

Views: `hyperdrive.png` (189 calls, 720k tris, 9 lights), `int_-66_-10_288_180_4.png` (178 / 716k / 9),
`int_-58_-10_304_270_5.png` (167 / 717k / 9; `sim/` and `sim07/` copies), `int_-40_-10_338_40_8.png`
(240 / 742k / 9), `int_-54_-10_330_0_-6.png` (237 / 741k / 9).

This is the most convincing machinery room. The three 20 m motivators read as heavy plant (banded shells,
violet ring strips, hazard-banded plinths, indicator plates), the coil towers with stacked glowing rings are a
good silhouette, cables and grated trenches tie the machines to the floor, the walls carry indicator matrices
and status screens, and the violet mood is unmistakable (`int_-66_-10_288_180_4.png`,
`int_-58_-10_304_270_5.png`). The entrance dais with hazard-striped treads, four operator stations and two big
pedestal displays gives the room a front (`hyperdrive.png`). Weak points: the pulsing of the ring strips is not
perceptible (ring region mean luminance moves −0.6 at t = 2.7 s and −2.2 at t = 0.7 s; 0.4–2.5 % of pixels
change), the 70 m long east wall behind the coil towers is almost bare, the aft third of the room is a plain
black box plus empty tile, and up close the motivator shells are texture-less.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `int_-58_-10_304_270_5.png` (+ `sim/`, `sim07/`) | Violet ring pulse is invisible to the eye (Δ lum −0.6 / −2.2 on the ring region) | The brief's "animated elements" include the drive; the room currently reads as static | **major** | Animate a chase along the ring segments (one bright ring at a time) or breathe the coil-tower rings between 0.3× and 1.0× intensity; large-amplitude, low-frequency changes survive tone-mapping |
| `int_-58_-10_304_270_5.png` | East wall (x −38) between the motivators is a bare panel grid with one green lamp, one red dot, a work light and a small console | 70 × 12 m of flat wall in the room with the most machinery | **major** | Run a conduit rack and coolant pipes along the wall at y 3–5, add two big schematic screens and a hazard-banded access door between the coil towers |
| `int_-40_-10_338_40_8.png` | Aft machine block is a plain black box (slats only) and the floor around it is empty tile; the cable is a single thin loop | Feels filled, not designed; the block has no readable function | **minor** | Give the block a face: recessed control panel, pipe stubs into the floor trench, a stencil (`PWR-3`), and a second cable bundle to the motivator |
| `int_-54_-10_330_0_-6.png` | Close to a motivator the shell is a smooth untextured cylinder; the only detail is the two ring strips and a cradle bar | The eye lands on a 6 m diameter blank surface from the spawn-side aisle | **minor** | Add panel seams (longitudinal weld lines), a bolted flange every 5 m, inspection hatches and a stencil on the shell |
| `hyperdrive.png` | The two 3 m pedestal displays face the entrance, i.e. away from the seated operators | Circulation logic: the crew watch the motivators, the visitor watches the graphs | **polish** | Rotate the displays 180° or mount them on the dais rail facing inwards |
| `hyperdrive.png`, `int_-66_-10_288_180_4.png` | Ceiling strips bloom into thick white bars and converge into a hot patch | Same over-exposure as engineering | **minor** | Lower strip emissive / bloom threshold globally |

### 2.4 Life Support (`life_support`, 38..70 × 270..340, floor −10, h 10)

Views: `room_life_support.png` (139 calls, 688k tris, 9 lights), `int_54_-10_300_180_0.png` (138 / 688k / 9),
`int_40_-10_272_210_6.png` (142 / 689k / 9).

A believable plant hall: a 70 m central aisle edged with green floor strips, two ranks of banded scrubber
towers with hazard bands and green status strips, water tanks, machine blocks with status screens, a rack of
horizontal drums against the west wall and — the best touch — colour-coded overhead pipe runs (red, green,
yellow) crossing the hall (`room_life_support.png`, `int_40_-10_272_210_6.png`). The green accent separates it
cleanly from the violet drive room next door. Its weaknesses are repetition and emptiness: every tower is the
same tower, every machine block the same block with the same screen, the entrance corner is bare tile and the
aisle ends in an over-exposed white patch under the converging ceiling strips.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `int_54_-10_300_180_0.png`, `room_life_support.png` | Three identical water tanks in a row and four identical machine blocks with the same screen graphic; four identical scrubber towers | Copy-paste repetition is the first thing the eye picks up in a symmetric hall | **major** | Vary height/diameter per tank (seeded), rotate the machine blocks so alternate ones show their back/side, give each block a different screen index and stencil (`H2O`, `O2`, `CO2`) |
| `int_40_-10_272_210_6.png` | Entrance corner (x 38–50, z 270–285) is 15 × 12 m of empty tile with one yellow floor line | The first 10 m after the door are a car park | **minor** | Put a pump skid, a spare-filter crate stack and a hand cart here; extend the drum rack along the entrance wall |
| `int_54_-10_300_180_0.png` | Far wall (z 340) fan grilles are dark circles that almost vanish; the wall reads flat | The hall's end wall should be its air-handling statement | **minor** | Light the grilles from behind (dim green emissive discs) or put a slow-turning fan silhouette in each |
| `room_life_support.png` | Aisle vanishes into a blown white patch where eight ceiling strips converge | Same exposure problem as the other engineering rooms | **minor** | Break the strips into segments, or reduce emissive at the far end |

### 2.5 Engineering Corridor (`eng_corridor`, −70..70 × 262..270, floor −10, h 4.5)

Views: `room_eng_corridor.png` (218 calls, 663k tris, 9 lights), `int_-66_-10_266_-90_0.png` (251 / 666k / 9).

The 140 m spine is the standard Imperial corridor module: panel-grid walls, waist-height white light bands,
ceiling strips, indicator matrices, door numerals and Aurebesh labels, one hazard-banded door, a pipe run and an
angular portal frame at the west end (`int_-66_-10_266_-90_0.png`). The language is right and the detail
density per module is fine. The problem is the length: from either end the same module repeats to a vanishing
point that is a pure white glare (the strips converge and bloom), and nothing — no bulkhead frame, no change of
width, no ceiling drop at the three room doors — marks where hyperdrive, engineering control or life support
are. The black gloss floor also mirrors the glare into a white streak down the middle.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `room_eng_corridor.png`, `int_-66_-10_266_-90_0.png` | 70 m of identical modules ending in a blown-out white vanishing point | The brief singles out corridor monotony; the eye has nowhere to stop | **major** | Every 20–24 m insert a portal frame (the west-end one exists) with a 0.4 m ceiling drop and a hazard band; at the three room doors add a wider door surround with a room name plate and a coloured accent strip (violet / cyan / green) so the corridor reads like a map |
| `room_eng_corridor.png` | Floor reflection of the far strips is a solid white streak down the corridor centre | Reads as a wet floor / render error, not gloss durasteel | **minor** | Raise the deck roughness slightly or dim the strips toward the far end |
| `int_-66_-10_266_-90_0.png` | Only one door (hazard-striped, right side) is visibly different; all others are flush grey panels with a numeral | Circulation: you cannot tell a door from a panel at 20 m | **minor** | Give doors a recessed frame and a status lamp (green/red) |

### 2.6 Engineering Turbolift Lobby & cab (`eng_lobby`, −6..6 × 252..262, floor −10; cabs z 249..252)

Views: `room_eng_lobby.png` (233 calls, 461k tris, 5 lights), `int_0_-10_254.5_0_0.png` (230 / 461k / 5),
`int_-3_-10_250.5_0_0.png` (323 / 671k / 5, inside the west cab).

The lobby reads as a turbolift lobby at once: two double cab doors with a vertical white light seam, hazard
stripes on the floor in front of each, a central pier with a deck indicator ("07" in Aurebesh with a status
matrix), call-button bars (white and amber), a sconce over each door and a keypad plate — dense and correct
(`room_eng_lobby.png`, `int_0_-10_254.5_0_0.png`). Inside the cab the walls are flat dark panels with a mid-height
rail band, a small indicator matrix, an Aurebesh stencil block, a hazard decal and a large schematic control
panel (`int_-3_-10_250.5_0_0.png`); it is recognisably a lift car but very dim and plain compared with the lobby.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `int_-3_-10_250.5_0_0.png` | Cab back wall is flat panels and a dark band; the only fixtures are one indicator matrix, one stencil block, one hazard decal and one control panel — and it is pixel-for-pixel the same wall as the crew cab (`int_-3_6_-110.5_180_0.png`) | Riders spend the whole ride staring at this wall, and every cab on the ship is the same cab | **minor** | Add a deck-position display, a floor grate, a thin emissive kick strip, and seed the stencil/panel placement per lobby so cabs differ |
| `room_eng_lobby.png`, `int_0_-10_254.5_0_0.png` | Dust particles are large white dots that read as snowfall; the waist light band blooms into a 25 px soft bar | Undermines the crisp lobby detail | **polish** | Halve the particle size/alpha in small rooms; reduce band emissive |
| `room_eng_lobby.png` | A blue planet-like decal floats on the left wall with no frame | Reads as a placeholder | **polish** | Frame it as a screen or replace with a deck plan plate |

### 2.7 Crew Corridors (`crew_corridor` −62..62 × −130..−122 and `crew_corridor_fwd` −62..62 × −178..−170, floor 6)

Views: `crew_corridor.png` (381 calls, 928k tris, 12 lights), `room_crew_corridor_fwd.png` (348 / 920k / 12),
`int_-18.5_6_-125.5_0_0.png` (368 / 912k / 12, facing the mess door), `int_-12.5_6_-173.5_0_0.png`
(294 / 869k / 12, facing the detention door).

The two 124 m crew corridors are the same module as the engineering spine but denser: waist light bands,
indicator-matrix cabinets, waveform screens, Aurebesh plates, door numerals, hazard-striped door thresholds,
angled door headers with a status lamp, and the forward corridor is deliberately dimmer with a hazard-striped
door and a bank of computer cabinets (`room_crew_corridor_fwd.png`). Door fronts are the best moments: the mess
door (`int_-18.5_6_-125.5_0_0.png`) has an angled lintel, blue status lamp, keypad, hazard threshold and side
plates; the detention door (`int_-12.5_6_-173.5_0_0.png`) is correctly menacing with red hazard-framed
stencils, an orange lamp and a red keypad. Two things hold the corridors back. First, monotony and exposure:
in every axial view the strips converge into a pure-white vanishing point and the black floor mirrors it as a
white streak (`crew_corridor.png`, `room_crew_corridor_fwd.png`); no bulkhead, ceiling drop or width change
marks the four room doors or the connector mouth. Second, the deck texture's scuff lines catch the strips and
draw a sharp white "cracked glass" web on the floor that repeats with the tile (foreground of
`crew_corridor.png` and `room_crew_corridor_fwd.png`). Both corridor views are also well over the 250-call
interior budget of `PLAN.md` §9 because all three corridor rooms render together.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `crew_corridor.png`, `room_crew_corridor_fwd.png` | 60 m of identical wall modules in each direction ending in a blown-white vanishing point; nothing marks where quarters / mess / lounge / medbay are | The brief singles out corridor monotony; from the connector you cannot tell which door is which room | **major** | Insert a portal frame with a 0.4 m ceiling drop every ~20 m and give each room door a distinct surround: name plate, a coloured accent strip per room (amber mess, green medbay, red detention), a wider hazard threshold |
| `crew_corridor.png`, `room_crew_connector.png` | Deck scuff lines (14 random bright streaks baked into `deckBlack`) render as sharp white web lines under the strips and repeat every tile | Reads as cracked glass or a z-fighting artefact rather than scuffed durasteel | **major** | Lower the scuff albedo lift (0.24 → ~0.18) and count, or randomise scuffs per plate so the pattern does not tile; raise strip-reflection roughness |
| `crew_corridor.png`, `int_-18.5_6_-125.5_0_0.png` | Ceiling strips bloom into 30–60 px bars and the top of every frontal view is a solid white smear | Kills the thin-white-line Imperial look and hides the ceiling | **major** | Reduce strip emissive (or bloom threshold) by ~40 %; break the continuous centre strip into segments |
| `int_-18.5_6_-125.5_0_0.png` | The deck stencil beside the mess door reads "07" — the same number the engineering and tower lobbies show; it is the hard-coded `DECAL.DECK_A` | Deck numbering is a wayfinding cue and is wrong on two of three decks | **minor** | Generate the deck decal from `deckIndex` (one canvas per deck) |
| `int_-12.5_6_-173.5_0_0.png` | Left of the detention door one wall panel is a cream/beige tint among grey plates; the right waist band stops dead at a panel edge (x ≈ 890 px) with no end cap | Colour outlier and an unfinished band edge in an otherwise well-composed door front | **minor** | Clamp the panel tint palette to greys; add an end cap or continue the band to the frame |
| `int_-18.5_6_-125.5_0_0.png` | A blue triangle logo screen sits next to the mess door | Triangle-on-blue reads as a Rebel-style insignia, off-language for an Imperial deck | **polish** | Replace with the cog emblem or a deck plan |
| `crew_corridor.png` | 381 draw calls (fwd: 348) in a corridor view | Over the 250-call interior budget of `PLAN.md` §9 by 50 % | **minor** | Merge the per-module cabinets/screens into one geometry per side, or cull the far corridor when the connector doors are closed |

### 2.8 Crew Connector (`crew_connector`, −3..3 × −170..−130, floor 6)

Views: `room_crew_connector.png` (344 calls, 909k tris, 12 lights), `int_0_6_-131.5_0_0.png` (357 / 911k / 12),
`int_0_6_-165_0_0.png` (328 / 940k / 14, the junction with the forward corridor seen from 5 m).

The 40 m connector is the best-dressed corridor of the review: a bank of computer cabinets with blue schematic
screens and indicator matrices on one side, an overhead pipe run at the mouth, grated floor strips both sides,
a floor direction arrow with an Aurebesh label, a light-strip portal frame, a stack of cargo crates and a
hazard placard leaning against the wall (`room_crew_connector.png`, `int_0_6_-131.5_0_0.png`). It has purpose
(a service link) and identity. Standing 5 m from the far end the junction itself is fine — a portal frame
opening onto the forward corridor's wall band, a cabinet, a cog and an arrow decal (`int_0_6_-165_0_0.png`) —
so the "void" in the long views is purely exposure. The right-hand wall, however, is two 6 m blank plates for
the first 10 m, the upper walls are bare, and the far end is once again a white void from anywhere but the last
few metres.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `room_crew_connector.png`, `int_0_6_-131.5_0_0.png` | Far end (z −170) is a blown-white rectangle; the corridor appears to open into nothing, although `int_0_6_-165_0_0.png` shows a perfectly good junction there | Same exposure problem as the corridors; here it is framed by the portal so it is the focal point | **major** | Dim the ceiling strips over the last 8 m and lower the band emissive on the corridor_fwd wall opposite the mouth; a darker portal lintel at the junction would also stop the white from reading as an opening to nothing |
| `int_0_6_-131.5_0_0.png` | Right wall x 3, z −132..−142 is two large flat plates with one stencil and a lamp | The left side has cabinets and detail; the right is empty for 10 m | **minor** | Mirror a shorter cabinet run or add a pipe manifold and a wall-mounted fire-suppression cabinet |
| `room_crew_connector.png` | Upper third of both walls (above the cabinets, y 8.5–10.5) is bare plate for the whole 40 m | The eye is pulled up by the bright ceiling strips onto empty panels | **polish** | Run the pipe bundle from the mouth along the full length, or add a cable tray |

### 2.9 Crew Turbolift Lobby & cab (`crew_lobby`, −6..6 × −122..−112, floor 6; cabs z −112..−109)

Views: `room_crew_lobby.png` (193 calls, 434k tris, 5 lights — the named view faces the corridor exit door, not
the lifts), `int_0_6_-114_180_0.png` (222 / 459k / 5, the pier between the cabs), `int_-3_6_-114.5_180_0.png`
(217 / 459k / 5, west cab doors open), `int_-3_6_-110.5_180_0.png` (281 / 635k / 5, cab back wall),
`int_-3_6_-110.5_0_40.png` (320 / 626k / 5, cab ceiling and door head from inside), `int_-3_6_-109.8_0_0.png`
(323 / 606k / 5, lobby seen from the back of the cab).

The lobby itself is good: framed cog emblem, waveform screen, Aurebesh plates, a hazard-edged double exit door
with amber lamps and a status lamp, hazard thresholds, a cog floor stencil and a computer bank
(`room_crew_lobby.png`, `int_-3_6_-109.8_0_0.png`); the lift pier carries call bars (white/amber), a matrix and a
warning triangle (`int_0_6_-114_180_0.png`). The cabs are where the turbolift illusion fails. With the doors open
the car is a black cave with a lit back wall floating in it — the side walls, floor and ceiling receive no light
(`int_-3_6_-114.5_180_0.png`). From inside, the wall above the door is a featureless black void and the ceiling
is one blown-white slab (`int_-3_6_-110.5_0_40.png`); the back wall is the same flat panel set as the engineering
cab (`int_-3_6_-110.5_180_0.png`). There is no deck display, no hand rail with depth, no floor grate.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `int_-3_6_-114.5_180_0.png` | Open cab reads as a black cavity: side walls, floor and ceiling are unlit; only the back wall is visible | "Cab interiors must read as turbolifts" — this reads as a hole in the wall | **major** | Give the cab its own light (a PointLight or emissive ceiling diffuser with real intensity plus emissive kick/rail strips on the side walls); light the floor with a grate over a dim emissive plane |
| `int_-3_6_-110.5_0_40.png` | From inside, everything above the door head is black; the cab ceiling is a single clipped white rectangle | The rider looks up into a void during the ride | **major** | Add a front wall panel above the door with a deck-position display and a cove; replace the slab with a framed diffuser at lower intensity |
| `int_-3_6_-110.5_180_0.png`, `int_-3_-10_250.5_0_0.png` | Cab back walls of the crew and engineering lobbies are identical (same stencil block, matrix, hazard decal, panel) | Copy-paste between decks that should feel like different parts of the ship | **minor** | Seed the cab dressing per lobby; vary the stencil text and control-panel side |
| `room_crew_lobby.png`, `int_0_6_-114_180_0.png` | Waist band and ceiling strip are blown to solid white bars; particles read as snow | Same exposure problem as the engineering lobby | **polish** | Reduce band emissive and particle size in rooms under 12 m |
| `room_crew_lobby.png` | The named view for the lobby faces the exit door; the lifts are behind the camera | The room's identity (turbolifts) is not in its own reference shot | **polish** | Turn the spawn/named view to yaw 180 so the two cab doors and the pier are the first thing seen |
| `int_-3_6_-109.8_0_0.png`, `int_-3_6_-110.5_0_40.png`, `int_-3_-10_250.5_0_0.png` | 320–323 draw calls when standing in a cab (the same lobbies are 191–233 calls with the cab out of frame) | One open cab adds ~100 calls of individual slabs, taking a 10 × 12 m room 30 % over the §9 budget | **minor** | Merge the cab's wall/rail/panel slabs into one geometry per cab (or one per wall) |

### 2.10 Crew Quarters (`crew_quarters`, −62..−36 × −170..−130, floor 6)

Views: `crew_quarters.png` (182 calls, 682k tris, 10 lights), `int_-46_6_-142_90_0.png` (165 / 689k / 10).

The barracks has a clear identity: two ranks of triple bunk stacks with ladders, locker piers with vertical
amber light strips, bay-number stencils on the posts, white floor lane lines with bay numbers, a warm-grey deck
and a chevron of diagonal ceiling strips that gives the room a different ceiling from everything else
(`crew_quarters.png`). Scale is right (three bunks in ~2.8 m, ladders, 2.5 m lockers). What it lacks is life and
variation: every stack is the same stack with the same pale mattress and the same green blanket end, there is
not a single personal item, kit bag, open locker or towel in 40 m of bunks (`int_-46_6_-142_90_0.png`), the
ceiling over the bays is unlit black, and a pale untextured block sits at the aisle edge.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `crew_quarters.png`, `int_-46_6_-142_90_0.png` | ~20 identical bunk stacks, identical bedding, ladders always on the same side, no kit anywhere | Copy-paste repetition is the whole room; it reads as a furniture catalogue, not a place 200 people sleep | **major** | Seed per stack: blanket colour (grey/green/black), pillow present or not, ladder side, one in four bunks with a kit bag or folded uniform, a few lockers ajar with an amber interior |
| `int_-46_6_-142_90_0.png` | Pale flat block at the right edge (aisle side, ~1.2 m tall) with no texture, seams or edge detail | Reads as a placeholder primitive against textured bunks | **minor** | Give it a footlocker model (panel texture, hazard corner, latch) or remove it |
| `int_-46_6_-142_90_0.png` | Ceiling above the bunk bays is unlit black; only the strips exist | The room reads as open to a void above 3 m | **minor** | Add a low-intensity ambient/hemisphere fill or dim emissive ceiling panels between the strips |
| `crew_quarters.png` | Diagonal strips converge into a blown patch at the aisle centre | Same exposure problem | **polish** | Lower strip emissive |

### 2.11 Mess Hall (`mess`, −32..−4 × −170..−130, floor 6)

Views: `mess.png` (172 calls, 515k tris, 10 lights), `int_-20_6_-136_0_-12.png` (171 / 515k / 10),
`int_-18_6_-156_0_0.png` (169 / 513k / 10, galley counter).

Purpose and circulation are immediate: four table rows with benches lead to a serving counter with an amber kick
strip, two numbered dispensers with screens, a hot line behind and a hanging Aurebesh menu board with coloured
bars — the best single prop group on the crew deck (`int_-18_6_-156_0_0.png`). Trays and cups on the tables,
wall screens and upper cabinets fill the walls (`mess.png`). The intended warm-amber mood is only half there:
the pendant lamps glow amber but the light that actually falls on the room is the white ceiling strips, so the
table tops are burnt to flat white and the room reads as a bright canteen rather than a warm one
(`mess.png`, `int_-20_6_-136_0_-12.png`). The table tops also carry the floor-tile texture, so they look like
tiled counters.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `mess.png`, `int_-20_6_-136_0_-12.png` | Table tops are over-exposed near-white slabs with a visible tile grid; the foreground tables are pure white | The brief says warm amber; the room is dominated by clipped white | **major** | Drop the white strip intensity in this room by half and let the amber pendants carry the light (give them a real warm PointLight each, low range); use a matte grey table material without the deck tile texture |
| `mess.png` | Ceiling strips converge and bloom into a fat white bar down the centre | Same exposure problem, worst here because the ceiling is warm-tinted and the bar is white | **minor** | Segment the strips or tint them warm in this room |
| `int_-18_6_-156_0_0.png` | The galley behind the counter is one grey cabinet wall; the counter front is the same black indicator panel repeated four times | The focal wall of the room is flat and repetitive | **minor** | Add a hood, steam/vapour emitter over the hot line, hanging utensils or dispensers on the back wall; vary two of the four counter panels (hatch, drawer) |
| `mess.png`, `int_-20_6_-136_0_-12.png` | The same red circular screen graphic and the same waveform screen appear on both side walls | Copy-paste at eye level | **polish** | Rotate through more screen indices per wall |

### 2.12 Lounge (`lounge`, 4..32 × −170..−130, floor 6)

Views: `room_lounge.png` (203 calls, 701k tris, 10 lights), `int_16.2_6_-139.5_90_-14.png` (180 / 699k / 10;
`sim/` copy at t = 2.7 s), `int_19_6_-150.5_90_-8.png` (186 / 708k / 10), `int_18.9_6_-150.5_270_2.png`
(176 / 714k / 10; `sim/` copy).

The lounge has the most character props on the deck: curved booths around dejarik tables whose red holographic
pieces do move between frames (`int_16.2_6_-139.5_90_-14.png` vs `sim/…` — the pieces are in different squares),
a wireframe holo-globe on a lit pedestal that rotates (`int_18.9_6_-150.5_270_2.png` vs `sim/…`), a bar with
stools, shelf bottles and a warm pendant, a row of viewing chairs facing three wall screens, and a support
pillar with a vertical light seam (`int_19_6_-150.5_90_-8.png`). Mood is cool blue with an amber bar corner —
distinct from the mess. The composition problem is the 4 m wide runner mat down the middle: it is an empty
40 m strip that dominates the named view (`room_lounge.png`) and pushes every prop to the walls, leaving the
centre of the room black. The room is also the darkest on the deck, the scuff-web floor pattern is at its most
visible here, and the dejarik pieces are so small they read as red sparks.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `room_lounge.png` | A 4 m wide, 40 m long runner mat with white edge lines runs the full length of the room with nothing on it; the props line the walls | Reads as a raised platform or a road; the room has no centre | **major** | Cut the mat to two 8 m sections, or centre a pair of booths / a second holo-globe on it; add a low table cluster mid-room |
| `int_19_6_-150.5_90_-8.png`, `int_16.2_6_-139.5_90_-14.png` | Deck scuff lines render as bright white cracks across the whole visible floor | Most visible instance of the deck-texture problem (dark room, low camera) | **major** | See corridor fix (scuff albedo/count) |
| `int_16.2_6_-139.5_90_-14.png` | Dejarik holo pieces are ~0.1 m red blobs; the animated hologram is unreadable beyond 2 m | The one hologram in the room does not read as a hologram | **minor** | Scale pieces to 0.25–0.3 m, give them a cyan/blue additive glow and a faint projection cone from the board centre |
| `room_lounge.png`, `int_16.2_6_-139.5_90_-14.png` | Two wall screens show a blue triangle emblem | Reads as a Rebel-style insignia in an Imperial lounge | **polish** | Swap for the cog or a fleet roster screen |
| `int_18.9_6_-150.5_270_2.png` | Bar back-wall shelf has four bottles on 12 m of counter; the wall above it is bare plate with two small screens | The bar is the room's second focal point and is under-dressed | **polish** | Add glass racks, a lit back-bar strip and a dispenser bank |

### 2.13 Medbay (`medbay`, 36..62 × −170..−130, floor 6)

Views: `medbay.png` (248 calls, 740k tris, 10 lights), `int_44_6_-139_60_-5.png` (225 / 741k / 10, bed row on
the west wall), `int_48.5_6_-152.5_180_4.png` (235 / 753k / 10, back toward the entrance),
`int_48.5_6_-153.4_0_6.png` (242 / 736k / 10; `sim/` copy at t = 2.7 s, bacta tank), `int_50_6_-148_315_0.png`
(230 / 793k / 13, surgery bay and east wall).

The medbay gets its mood right: a lighter grey deck than the rest of the ship, pale panel walls, rectangular
ceiling light panels instead of strips over the beds, a thin green accent line at 2.35 m and green floor strips
under each bed — it reads clinical at a glance (`medbay.png`, `int_44_6_-139_60_-5.png`). The bacta tank is
the best hero object on the crew deck: a cyan translucent cylinder on a black plinth with a hazard ring, a cap
piped into the ceiling, and bubbles that actually rise (they are in different places in the `sim/` frame; 0.25 %
of pixels change by more than 32/255) (`int_48.5_6_-153.4_0_6.png`). Beds are the right height (~0.7 m) with a
monitor on a stand, privacy partitions, bay numbers and a green waveform screen each. What lets the room down is
the plan: 26 × 40 m of floor holds one row of beds on each wall, and the middle is a 10 m wide, 40 m long
empty lane with two white lines, so the medbay reads as a road with beds parked on the verge
(`medbay.png`, `int_48.5_6_-152.5_180_4.png`). The surgery table is a bare white slab, a white untextured cube sits
beside bed 1, every bed is the same bed, and the ceiling between the light panels is unlit black.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `medbay.png`, `int_48.5_6_-152.5_180_4.png` | Central 10 × 40 m lane is empty apart from two white lines and the nurse station; all beds hug the walls | A ward is organised in bays; this reads as a hangar with a bed row and has no centre of gravity | **major** | Add two island bays mid-room (four beds each, partitions between), move the bacta tank and the surgery bay onto the centreline as the focal group, and cut the lane lines to a 3 m wide path |
| `int_50_6_-148_315_0.png` | Surgery table is a plain white slab on a pedestal with nothing over or beside it; the glass bay behind it is only readable by its frame | The one surgical prop is an untextured box | **minor** | Add an overhead lamp/arm on a ceiling boom, a tray cart, an instrument rack, and give the glass a faint tint/edge highlight |
| `int_44_6_-139_60_-5.png`, `int_50_6_-148_315_0.png` | Bright white untextured cube (~0.9 m) beside the first bed of each row | Reads as a placeholder primitive against the textured beds | **minor** | Turn it into a supply cabinet (panel texture, drawer lines, red cross plate) or remove |
| `int_44_6_-139_60_-5.png`, `medbay.png` | Every bed/monitor/partition group is identical, down to the sheet fold and screen graphic; ~12 copies | Copy-paste repetition along both walls | **minor** | Seed per bed: sheet colour, monitor on/off (dark screen), a drip stand on one in three, one bed with a raised backrest, a curtain drawn on one bay |
| `int_44_6_-139_60_-5.png` | The green accent is a 4 cm emissive box that renders as a hairline laser passing across screens and posts | Reads as a tripwire, not an architectural light band | **polish** | Make the band 12–15 cm tall and recess it in a channel, or run it as a soffit light over the beds |
| `int_44_6_-139_60_-5.png`, `int_48.5_6_-152.5_180_4.png` | Blue triangle emblem on a bed-side screen; ceiling light panels and strips blown to white | Off-language insignia; same exposure problem | **polish** | Swap the emblem for a medical glyph; lower panel emissive |

### 2.14 Armory (`armory`, −62..−36 × −206..−178, floor 6)

Views: `room_armory.png` (205 calls, 758k tris, 10 lights), `int_-49_6_-190_0_0.png` (201 / 753k / 10),
`int_-49_6_-199_0_0.png` (200 / 806k / 13, issue counter).

Purpose is instant: caged weapon racks with rows of blaster rifles and red kick strips on both sides, hazard-striped
floor lanes angled toward the racks, red-lamp stanchions marking a queue, a mesh issue cage with a hazard placard
and floor tape, a long issue counter with a red kick strip, and a red cog stencil and hazard-banded door on the
back wall (`room_armory.png`, `int_-49_6_-199_0_0.png`). Red sconces wash the ceiling at the rack ends. It is
one of the more coherent rooms of the deck. It is also, like the medbay, a hall with the middle missing: the
14 m aisle between the racks is empty tile for 20 m, the counter top is 12 m of nothing, every rack holds the same
eight rifles in the same slots, and the ceiling above the strips is unlit black.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `room_armory.png`, `int_-49_6_-190_0_0.png` | Central aisle (x −55..−43, z −206..−182) is empty deck; the stanchions are the only free-standing objects | An armory has kit-out benches, armour stands, crate stacks; here it is a car park between two fences | **major** | Add two kit-out benches with helmet/armour stands, a stack of weapon crates with hazard stencils, a charging rack with amber cells, and a floor stencil grid |
| `room_armory.png`, `int_-49_6_-190_0_0.png` | Every rack is identical: same eight rifles, same spacing, same cage mesh; the far racks repeat the near ones exactly | Copy-paste repetition dominates the two long walls | **minor** | Seed per rack: 5–8 rifles with one or two empty slots, one rack of long rifles/one of pistols, one rack with the cage door open and a "checked out" red lamp |
| `int_-49_6_-199_0_0.png` | Issue counter top is empty for its full length and the wall behind it is a dark cabinet face with pipe stubs | The room's transaction point has nothing to transact | **minor** | Add a counter screen, a datapad, two rifles laid on the counter, a hand scanner and a lit "ISSUE" Aurebesh plate above |
| `int_-49_6_-199_0_0.png`, `int_-49_6_-190_0_0.png` | The red accent is again a 4 cm hairline at 2.35 m; the "hard red" mood comes from two sconces while the working light is white strips | The brief's red-tinted security mood is only present at the ceiling corners | **minor** | Give the strips in armory/detention a warm-red tint or lower them and add red PointLights over the racks |
| `room_armory.png`, `int_-49_6_-190_0_0.png` | Ceiling strips converge into a hot white patch; ceiling otherwise black | Same exposure problem | **polish** | Lower strip emissive |

### 2.15 Detention (`detention`, −30..4 × −220..−178, floor 6)

Views: `detention.png` (170 calls, 724k tris, 10 lights, guard post), `int_-12.5_6_-196_0_0.png`
(168 / 720k / 10, cell corridor), `int_-12.5_6_-200_90_0.png` (168 / 746k / 10, cells 13/14 close-up),
`int_-12.5_6_-210_0_0.png` (178 / 782k / 13, red end of the block).

The detention block is the strongest room on the crew deck and the one that most convincingly quotes the films.
The guard post is two walls of blue radar / red-and-amber bar-graph monitors with a console and chair each side,
hazard-banded kerbs, white floor lanes and orange diagonal ceiling stripes (`detention.png`). The cell corridor
is dead straight, narrow and tall, with orange edge strips top and bottom, vertical white light bars between
cells, numbered cell doors with slot ports, keypads whose lamp is green on the open cell and red on the locked
one, open cells with a bench and a slab bunk, and a red-lit hazard-banded door at the far end
(`int_-12.5_6_-196_0_0.png`, `int_-12.5_6_-200_90_0.png`, `int_-12.5_6_-210_0_0.png`). Scale is right (doors
≈2.6 m, keypads at chest height, benches at knee height). The red mood is real only in the last 10 m; the rest of the block is
lit white by the bars and strips. Remaining faults are exposure (the white bars are solid clipped rectangles and
the corridor ends in a white flare), the void-black ceiling above the orange strips, and a plain slab bunk.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `int_-12.5_6_-200_90_0.png`, `int_-12.5_6_-196_0_0.png` | Vertical light bars are clipped to solid white with no edge or fixture; the corridor's far end is a white flare | The best-composed corridor on the deck loses its edges to bloom | **minor** | Halve the bar emissive and give each bar a recessed housing; dim the far ceiling strip |
| `int_-12.5_6_-196_0_0.png`, `int_-12.5_6_-210_0_0.png` | Ceiling of the cell corridor is unlit black above the orange edge strips | The block reads as open to a void at 3.5 m | **minor** | Add a dim red ambient or emissive ceiling panels with a grille pattern between the strips |
| `detention.png`, `int_-12.5_6_-196_0_0.png` | The "hard red" brief mood is confined to the far door; the guard post and most of the corridor are white-lit | Room lighting mood is specified per room and this one is only half implemented | **minor** | Tint the corridor strips red-orange (or drop them and rely on the orange edge strips plus red PointLights every 8 m) |
| `int_-12.5_6_-210_0_0.png` | Open cell bunk is two pale untextured slabs and a black cylinder | Placeholder-looking prop in the nearest cell | **polish** | Use the bunk model from the crew quarters (frame, mattress texture) |
| `detention.png` | Monitor walls repeat the same four screen graphics ~10 times | Expected for a monitor bank but still visible | **polish** | Add two or three more screen indices (cell map, prisoner roster) |

### 2.16 Escape Pods (`escape_pods`, 8..62 × −206..−178, floor 6)

Views: `room_escape_pods.png` (201 calls, 755k tris, 10 lights), `int_34.5_6_-200_0_4.png` (200 / 751k / 10,
two hatches), `int_35_6_-200_180_0.png` (235 / 852k / 13, entrance wall from the hatch wall).

Distinct and legible: a wall of nine circular iris hatches with glowing green rings (two are orange, i.e. launched
or in use — one of the few deliberate variations among repeated props in the review, with the detention
keypad lamps), green emissive floor lines
radiating from a central muster circle with a cog and yellow X marks, a green T of ceiling light, green wall
washes, hatch numbers in Aurebesh and digits, a status panel between every pair of hatches, an overhead green pipe
run and a pod-status board by the door (`room_escape_pods.png`, `int_34.5_6_-200_0_4.png`,
`int_35_6_-200_180_0.png`). Hatch scale (~3 m) and the hazard arcs work. The room is the darkest on the deck
(mean luminance 37.7, 43 % of pixels under 16/255 in `room_escape_pods.png`) — acceptable for an emergency bay
lit by its own markings, but the ceiling is a void, the hanging sign board is an untextured pale slab when seen
from behind, and the hatch wall has no muster equipment at all.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `int_35_6_-200_180_0.png` (top left) | The overhead sign board that carries the Aurebesh / cog / arrow decals in `room_escape_pods.png` is, from behind, a flat pale untextured slab hanging at an angle from the ceiling | Looks like a floating plane; it is the largest object in the view from the hatches | **major** | Give the board a frame (thickness, angular brackets to the ceiling, dark back face with a stencil) or replace with a wall-mounted sign above the door |
| `int_34.5_6_-200_0_4.png` | Hatch pairs are identical including the hazard arc always on the right; the wall between them is plain green panel with one status plate | Copy-paste along the 54 m hatch wall | **minor** | Mirror alternate hatches, vary the arc angle, and put a breath-mask locker / emergency light / hand-hold rail between pairs |
| `room_escape_pods.png`, `int_35_6_-200_180_0.png` | No muster equipment: no benches, harness racks, emergency lockers or floor-mounted hand rails in a 54 × 28 m bay | The room is a floor diagram with hatches; there is nothing a crew would use while waiting | **minor** | Add lockers with green lamps under the status board, two rows of fold-down benches on the entrance wall, and an emergency light every 10 m |
| `room_escape_pods.png`, `int_35_6_-200_180_0.png` | Ceiling is unlit black except for the green T; the walls below the pipe run fade to black | Green markings floating in darkness | **polish** | Add a very dim green ambient or low-intensity emissive ceiling grid |

### 2.17 Command Deck Corridor (`cmd_corridor`, −84..60 × 206..212, floor 210, h 4.5)

Views: `cmd_corridor.png` (319 calls, 655k tris, 10 lights), `int_-80_210_209_-90_0.png` (342 / 656k / 10, from
the west end), `int_-22.5_210_208.5_180_0.png` (265 / 725k / 14, briefing-room door front).

The 144 m command corridor is the same kit as the other corridors, and at door-front range it is convincing: an
angular header with a status lamp, a 2.6 m door with recessed grooves and a keypad, hazard-striped threshold,
numeral and Aurebesh plates, a waveform screen and the waist band (`int_-22.5_210_208.5_180_0.png`). The portal
frames with chamfered corners, the three-pipe stub panel and the orange lamps are good module dressing
(`cmd_corridor.png`, `int_-80_210_209_-90_0.png`). But this is where the corridor problems are at their worst
because the corridor is the longest: from either end the modules repeat to a pure white vanishing point, the
paired ceiling strips bloom into 40 px bars, the black gloss floor mirrors the glare as a white streak, and the
deck scuff texture draws its sharp "cracked glass" web across every foreground tile. The whole view is
over-exposed (mean luminance 106 in `int_-80_210_209_-90_0.png`, the brightest interior frame of the review).
Nothing distinguishes the bridge blast door, the intelligence room or the lift lobby from a distance; the
corridor does not read as a map of the command deck. Both views are also over the 250-call budget.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `cmd_corridor.png`, `int_-80_210_209_-90_0.png` | 144 m of identical modules ending in a blown-white vanishing point; no bulkhead, ceiling change or accent marks the bridge, lift lobby, intelligence or briefing doors | The brief names this corridor explicitly as one that must not feel monotonous; it is the most monotonous view in the review | **major** | Portal frames with a 0.4 m ceiling drop every 24 m; a wider blast-door surround with a red light bar for the bridge and intelligence doors; a lit deck-plan kiosk at the lift lobby junction; dim the strips toward the far end |
| `int_-80_210_209_-90_0.png`, `cmd_corridor.png` | Deck scuff web renders as bright white cracks across the floor and repeats per tile | Reads as broken glass or a UV artefact on the most-seen floor of the ship | **major** | Same fix as §2.7 (lower `deckBlack` scuff lift and count, or randomise per plate) |
| `cmd_corridor.png`, `int_-80_210_209_-90_0.png` | Paired strips clip to fat white bars; the floor reflection is a solid white streak; frame mean luminance 106 | The corridor is meant to be dark plating with thin white bands; here it is grey-white | **major** | Lower strip emissive/bloom threshold globally; the command deck should be the darkest, most controlled corridor |
| `cmd_corridor.png` | 319–342 draw calls in a single-room corridor view | Over the §9 budget by ~30 % | **minor** | Merge per-module wall cabinets/screens into one geometry per side |
| `int_-22.5_210_208.5_180_0.png` | Header lamp blooms into a haze over the header; the door plate is a blotchy grey | Small, but the door front is otherwise the best-detailed object in the corridor | **polish** | Reduce lamp emissive; sharpen the door plate texture |

### 2.18 Command Deck Turbolift Lobby & cab (`lift_lobby_tower`, −6..6 × 212..222, floor 210; cabs z 222..225)

Views: `lift_lobby.png` (316 calls, 675k tris, 13 lights — rooms `lift_lobby_tower|cmd_corridor`),
`int_-3_210_220_180_0.png` (191 / 442k / 5, west cab open, from 2 m), `int_-3_210_223.5_180_0.png`
(228 / 559k / 5, inside the cab facing the back wall).

The tower lobby is the same lobby as engineering and crew — two cab doors with white seams, sconces, hazard
thresholds, a central pier with the "07" deck indicator and call bars, a cog floor stencil, indicator screens on
the side walls — and it reads as a turbolift lobby (`lift_lobby.png`). It is the darkest of the three (mean
luminance 55.9) with a single blown ceiling lamp and a void-black ceiling. The cab problems are identical to
the crew cab: with the doors open the interior is a black box with a lit back wall and one clipped ceiling
diffuser (`int_-3_210_220_180_0.png`); inside, the back wall is the exact panel set of the other two cabs — same
control-panel collage, same matrix, same stencil block, same hazard decal, same flat rail band
(`int_-3_210_223.5_180_0.png`). The deck sign says 07 on the command deck as well as in engineering and on the
crew corridor.

| Screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|
| `lift_lobby.png`, `room_eng_lobby.png`, `int_-18.5_6_-125.5_0_0.png` | All three lobbies (deckIndex 0, 1, 3 in the source) display deck "07" | Wayfinding: the one number a turbolift lobby must get right is wrong on two of three decks | **major** | Generate the deck decal from `deckIndex` (a canvas per deck) instead of the fixed `DECAL.DECK_A` |
| `int_-3_210_220_180_0.png` | Open cab is a black cavity: side walls and floor are near-black; only the back wall and the clipped diffuser are visible | Cab must read as a turbolift; it reads as a shaft | **major** | Light the cab (own PointLight or a real-intensity emissive ceiling frame), emissive kick and rail strips on the side walls, a floor grate |
| `int_-3_210_223.5_180_0.png`, `int_-3_6_-110.5_180_0.png`, `int_-3_-10_250.5_0_0.png` | Three cabs, one back wall; the "rail" is a flat dark stripe and the control panel is a collage of a dozen unreadable 5 cm widgets including a blue triangle | Copy-paste and low legibility where the rider stares for the whole ride | **minor** | Seed the dressing per lobby, give the rail depth (a 6 cm bar on standoffs), and make the panel a deck list with one lit row |
| `lift_lobby.png` | Ceiling is black apart from a single blown lamp; particles read as snow; cog stencil is clipped white | Lobby is a dark box with a floor logo | **polish** | Add a cove strip around the ceiling perimeter, lower the lamp, reduce particle size |

---

## 3. What works well

- **Every room is recognisable in one frame.** Reactor, drive, life support, medbay, armory, detention, pods,
  mess, lounge, quarters and the lobbies each have a purpose you can name without a caption
  (`int_0_0_362_0_-8.png`, `int_-66_-10_288_180_4.png`, `room_life_support.png`, `medbay.png`, `room_armory.png`,
  `detention.png`, `room_escape_pods.png`, `mess.png`, `room_lounge.png`, `crew_quarters.png`, `lift_lobby.png`).
- **The detention block** is the best room of the review: guard-post monitor walls, hazard kerbs, orange edge
  strips, numbered slot-port doors with keypads whose lamps are green on open cells and red on locked ones, and
  a hard-red far door (`detention.png`, `int_-12.5_6_-196_0_0.png`, `int_-12.5_6_-200_90_0.png`,
  `int_-12.5_6_-210_0_0.png`).
- **The hyperdrive hall's machinery** reads as heavy plant — banded motivator shells with violet rings, coil
  towers with stacked glowing rings, cable trenches, hazard plinths and an operator dais with hazard treads
  (`int_-66_-10_288_180_4.png`, `int_-58_-10_304_270_5.png`, `hyperdrive.png`).
- **The reactor as a volume**: a 40 m cyan chamber with a sunken pit, fenced core base, catwalk ring, grated
  bridges and hazard-banded railings (`int_0_0_362_0_-8.png`, `int_-10_-10_318_209_12.png`).
- **Engineering control's console arc and dais** — waveform/bar-graph screens, indicator matrices, cyan dais edge
  strips, the 3 m stair and the two big status screens with the cog emblem over the door
  (`int_0_-10_297_0_-6.png`, `int_0_-10_288_0_-4.png`, `int_0_-10_292_180_8.png`).
- **Life support's colour-coded overhead pipe runs** crossing the aisle, and the green accent that separates it
  from the violet drive room (`room_life_support.png`, `int_40_-10_272_210_6.png`).
- **The bacta tank** with rising bubbles (confirmed moving between `int_48.5_6_-153.4_0_6.png` and its `sim/`
  copy), a hazard ring and a piped cap.
- **The mess galley counter**: amber kick strip, numbered dispensers, hot line and a hanging Aurebesh menu board
  (`int_-18_6_-156_0_0.png`).
- **The lounge holograms actually animate**: dejarik pieces change squares and the wireframe globe rotates
  (`int_16.2_6_-139.5_90_-14.png` and `int_18.9_6_-150.5_270_2.png` vs their `sim/` copies).
- **The escape-pod bay's diagrammatic identity** — green iris hatches with two orange "used" ones, radiating
  floor lines to a cog muster circle, hatch numbers and status plates (`room_escape_pods.png`,
  `int_34.5_6_-200_0_4.png`).
- **Door fronts** are consistently good: angular headers with status lamps, keypads, hazard thresholds, numerals
  and Aurebesh plates (`int_-18.5_6_-125.5_0_0.png`, `int_-12.5_6_-173.5_0_0.png`,
  `int_-22.5_210_208.5_180_0.png`).
- **The lift lobbies themselves** (as opposed to the cabs) read as turbolift lobbies at once: double doors with
  light seams, sconces, hazard thresholds, a pier with deck indicator and call bars (`room_eng_lobby.png`,
  `int_0_-10_254.5_0_0.png`, `int_0_6_-114_180_0.png`, `lift_lobby.png`).
- **The crew connector's dressing** — cabinets with blue schematics, pipe run, grated floor strips, cargo crates,
  leaning hazard placard, floor arrow with Aurebesh — is the model the long corridors should follow
  (`room_crew_connector.png`, `int_0_6_-165_0_0.png`).
- **Human scale is right everywhere** I checked: doors 2.4–3.6 m, consoles ~1 m, bunks three-high in 2.8 m,
  tables 0.75 m, railings ~1.05 m, keypads at chest height (`int_-46_6_-142_90_0.png`, `int_0_-10_297_0_-6.png`,
  `int_-12.5_6_-200_90_0.png`, `int_-22.5_210_208.5_180_0.png`).
- **The Imperial language is consistent**: dark plating, black-gloss decks, white bands, indicator matrices,
  hazard bands, Aurebesh stencils and the cog appear in every room; nothing looks like it belongs to another
  franchise except the blue-triangle screens noted above.
- **No geometry faults**: across 74 frames I found no z-fighting, no seams into the void (the pane/jamb slot in
  §2.2 opens onto the reactor chamber, not the void), and no props floating or intersecting each other (the one
  "floating" object, the pod-bay sign board, is intentionally suspended).
- **Budgets** hold on triangles everywhere (max 930k in the reactor) and on draw calls in every single-room
  view that does not include an open turbolift cab (the exceptions are listed in §1 and §2.7, 2.9, 2.17).

---

## 4. Ranked top-12 fixes

1. **Make the engineering control window real** (blocker, §2.2). The room's premise — consoles facing the
   reactor — does not exist because both panes render opaque (`int_0_-10_292_180_8.png`). Carry a `glass` record
   for x −8..8 so `windowCell` gets a transparent pane and the reactor stays rendered behind it.
2. **Fix global exposure of light strips and bands** (§2.2–2.18, every room). Strips and waist bands clip to
   30–60 px white bars, every axial corridor view ends in a pure-white vanishing point, mess tables burn to
   white, cab ceilings and detention light bars are solid rectangles (`cmd_corridor.png`, `crew_corridor.png`,
   `mess.png`, `int_-3_6_-110.5_0_40.png`, `int_-12.5_6_-200_90_0.png`). Lower `emitWhite*` intensity or raise the
   bloom threshold ~40 % and segment continuous strips; this one change improves more frames than any other.
3. **Fix the `deckBlack` scuff web** (§2.7, 2.12, 2.17). The 14 baked scuffs render as sharp white cracks that
   repeat with every tile under strip light (`int_-80_210_209_-90_0.png`, `int_19_6_-150.5_90_-8.png`,
   `crew_corridor.png`). Lower the albedo lift (0.24 → ~0.18), reduce the count, randomise per plate.
4. **Give the long corridors landmarks** (§2.5, 2.7, 2.17). Portal frames with a ceiling drop every ~24 m and a
   distinct surround per room door (name plate, room-accent colour strip, wider hazard threshold) so the 144 m
   command corridor and the 124 m crew corridors read as maps rather than tunnels (`cmd_corridor.png`,
   `room_eng_corridor.png`, `room_crew_corridor_fwd.png`).
5. **Light and dress the turbolift cabs** (§2.6, 2.9, 2.18). Open cabs are black cavities with a floating lit
   back wall; inside, the wall above the door is a void and the ceiling a clipped slab; all three back walls are
   the same panel set (`int_-3_6_-114.5_180_0.png`, `int_-3_6_-110.5_0_40.png`, `int_-3_210_220_180_0.png`,
   `int_-3_210_223.5_180_0.png`). Own light source, emissive kick/rail strips, floor grate, a deck-position display,
   seeded dressing per lobby.
6. **Rebuild the reactor core's look and make its pulse visible** (§2.1). Inner bright rod plus darker sleeve
   with a rim, and pulse something that is not clipped (ring lights, pit under-lights) so the change survives
   tone-mapping; add dim uplights so the upper chamber is not black (`int_14_-10_336_90_30.png`,
   `int_-20_0_336_270_-25.png`).
7. **Make the hyperdrive animate and dress its east wall** (§2.3). Chase the ring segments or breathe the coil
   rings 0.3×–1.0×; run conduit, coolant pipes and schematic screens along the bare 70 m wall
   (`int_-58_-10_304_270_5.png`).
8. **Give the big rooms a centre** (§2.2, 2.12, 2.13, 2.14). Engineering's entrance half, the lounge runner
   mat, the medbay lane and the armory aisle are 10–20 m wide empty floors with everything pushed to the walls
   (`engineering.png`, `room_lounge.png`, `medbay.png`, `room_armory.png`). Island bays, a holo-table, kit-out
   benches, a second booth group.
9. **Seeded variation for repeated props** (§2.4, 2.10, 2.13, 2.14, 2.16). Identical tanks/blocks, bunks,
   beds, rifle racks and hatch pairs (`int_54_-10_300_180_0.png`, `int_-46_6_-142_90_0.png`,
   `int_44_6_-139_60_-5.png`, `room_armory.png`, `int_34.5_6_-200_0_4.png`). Per-instance seed for colour,
   contents, mirroring and one-in-N "in use" states, as the pod bay already does with its two orange hatches.
10. **Deck numbers from `deckIndex`** (§2.7, 2.18). Every lobby and corridor stencil says 07 because the decal
    is the fixed `DECAL.DECK_A` (`lift_lobby.png`, `room_eng_lobby.png`, `int_-18.5_6_-125.5_0_0.png`).
11. **Deliver the mess hall's warm amber** (§2.11). White strips burn the table tops flat white and the tops
    carry the deck tile texture (`mess.png`, `int_-20_6_-136_0_-12.png`). Halve the white, give the pendants real
    warm PointLights, use a matte table material.
12. **Replace placeholder primitives and the off-language emblem** (§2.10, 2.13, 2.15, 2.16). The pod-bay sign
    board's untextured back face, the medbay white cubes and slab surgery table, the quarters' pale block, the
    detention slab bunk (`int_35_6_-200_180_0.png`, `int_44_6_-139_60_-5.png`, `int_50_6_-148_315_0.png`,
    `int_-46_6_-142_90_0.png`, `int_-12.5_6_-210_0_0.png`); swap the blue triangle screens for the cog
    (`int_-18.5_6_-125.5_0_0.png`, `room_lounge.png`).

Also worth doing but outside the twelve: bring the corridor-cluster views back under the 250-call budget
(`crew_corridor.png` 381, `int_0_6_-131.5_0_0.png` 357, `int_-80_210_209_-90_0.png` 342) by merging per-module
wall furniture; shrink the dust particles in rooms under 12 m so they stop reading as snow
(`room_eng_lobby.png`, `lift_lobby.png`).

