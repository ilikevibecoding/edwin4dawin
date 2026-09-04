# REVIEW_INTERIOR_B — Engineering section, crew deck, corridors, lift lobbies and cabs

Independent visual critique. No source file was edited. All screenshots were taken with
`node tools/view.mjs <views> shots/review_interior_b --w=1280 --h=720` (software GL, SwiftShader) and every
PNG cited below was opened and judged. Stats quoted per view are the `calls / tris / lights` the tool printed
(`shots/review_interior_b/_log_batch*.txt`). Animated elements were checked by re-taking the same view with
`--sim=0.7` and `--sim=2.7` into `shots/review_interior_b/sim07/` and `shots/review_interior_b/sim/` and
diffing the frames numerically with a small PNG decoder (mean absolute pixel delta, % of pixels changed, mean
luminance of a region) because the visual difference was too small to trust by eye.

Reference brief: `PLAN.md` §3 (layout, room boxes, design language) and §6 (budgets), `docs/WORKSTREAM_GUIDE.md`
(screenshot tool, design language, human scale: doors 2.4–3.6 m, consoles ~1 m, tables 0.75 m, railings 1.05 m).

Severity scale: **blocker** (breaks the illusion or the brief for the room), **major** (any visitor will notice),
**minor** (noticeable when you look), **polish** (nice to have).

---

## 1. Overall verdict

_(written last — see end of file)_

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
| `int_-3_-10_250.5_0_0.png` | Cab back wall is three flat panels and a dark rail; no ceiling light, no floor grate, no door-side indicator | Riders spend 2–3 s per ride staring at this wall | **minor** | Add a recessed ceiling light box, a floor grate, a deck-position display over the door and a thin emissive kick strip at the base |
| `room_eng_lobby.png`, `int_0_-10_254.5_0_0.png` | Dust particles are large white dots that read as snowfall; the waist light band blooms into a 25 px soft bar | Undermines the crisp lobby detail | **polish** | Halve the particle size/alpha in small rooms; reduce band emissive |
| `room_eng_lobby.png` | A blue planet-like decal floats on the left wall with no frame | Reads as a placeholder | **polish** | Frame it as a screen or replace with a deck plan plate |

