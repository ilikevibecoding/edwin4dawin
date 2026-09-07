# Highway agent — defect log

Views: `bridge-low`, `aerial-a` (garza-hwy-2 + garza-west + garza-bridge landing), `skyline-high`, `sunset`, plus `dev`
cameras over the coastal highway (`south-hwy-mainland`, x -6900..-2790 at z 2650..2700): 200 m along
(`cam=-3300,200,2760&hdg=275&pch=-22`), 200 m across (`cam=-4200,200,3050&hdg=0&pch=-32`), 600 m
(`cam=-2600,600,2900&hdg=272&pch=-25`), 1500 m (`cam=-3000,1500,3500&hdg=300&pch=-30`), shoulder
(`cam=-4400,9,2711.5&hdg=268&pch=-2`), the arterial junction (`cam=-3400,60,2760&hdg=330&pch=-35`), the spit
(`cam=120,80,2000&hdg=300&pch=-25`) and the garza-west landing (`cam=-60,20,2660&hdg=300&pch=-12`); `time=22` for night.
Baseline = `bench/out/highway-r0` (commit 6130eae7, before any highway work).

## Round 1 — inventory (baseline 6130eae7)

| # | view | what reads wrong | status |
|---|------|------------------|--------|
| 1 | aerial-a | garza-hwy-2 along the spit and up the island is a flat light-grey ribbon laid on the sand: no median, no edge, no lighting, no signage; the pavement simply stops at the terrain | fixed r2 (median F-barrier, verges, guardrail, median poles, gantry before the bridge) |
| 2 | aerial-a | garza-bridge landing on the spit: the deck meets the road over a plain concrete block (the approach box); no abutment, no wing walls, no slope, no riprap | fixed r2 (sloped fill, U-abutment, wing walls, riprap berm) |
| 3 | aerial-a | garza-west causeway from 1.5–2.5 km: a pale slab with pier dots; the parapet line and the lamps do not register, the deck has no median although it carries 4 lanes of the divided highway | median barrier on 4-lane decks r2; lamp dots at distance via the lit-dot alpha floor (night) |
| 4 | bridge-low | north-cw-1 deck reads well (median, parapets, lamps, joints) but the kerbs have no drainage, the fascia no downpipes; the approach behind the pylon is the block again | scuppers + downpipes r2; approaches r2 |
| 5 | skyline-high | none of the highway classes is in frame (dt-bayshore is an arterial); north-cw-1 at 2.5 km is a thin line — acceptable | n/a |
| 6 | sunset | garza-bridge and tortuga-rd in the far middle ground: the ground highway is a ribbon with no furniture; the causeway lamps are unlit at 17.9 h (sun still up) — correct | fixed r2 (furniture) |
| 7 | dev 200 m along the coastal highway | 4 lanes of 5.5 m over the whole 22 m: no shoulders, no edge treatment, the asphalt meets the grass directly; no median, no poles, no signs, no gantries; the district streets cross at grade every ~105 m with no junction treatment | furniture r2; markings are roads.ts (request to the Street Detail agent) |
| 8 | dev shoulder | idem at 2 m: an empty 22 m slab with a yellow centre line | furniture r2 |

## Round 2 — first furniture build (7a032aa5 / 1027bbad)

| # | view | what reads wrong | status |
|---|------|------------------|--------|
| 9 | all | world generation aborted: the 1024² sign atlas overflowed with the gantry faces (`sign atlas full`) | fixed 1027bbad (2048×1024, smaller faces) |

## Round 3 — dev shots on 7beec3c3 (`/tmp/highway/shots`, 15 views in one page)

| # | view | what reads wrong | status |
|---|------|------------------|--------|
| 10 | 200 m along, 600 m along, 1500 m | the corridor still reads as a pale ribbon: the highway pavement is sun-bleached concrete-asphalt (roads.ts, albedo ~0.35) — as pale as the barrier, the compacted-shell verge and the dry ground, so only the pole shadow strokes and the gantry register at 200 m and nothing at 600 m+ | verges redesigned 217e5a69 (dark gravel band along the pavement + 5 m mown grass / sand), darker columns; pavement contrast (dark lanes, pale shoulders, edge lines) requested from the Street Detail agent |
| 11 | shoulder (north verge) | the verge is indistinguishable from the ground; the delineator and the median poles read well; the barrier reads well | verge 217e5a69 |
| 12 | spit (80 m) | at the spit's tip the terrain swallows the last 30 m of the highway and the deck's first metres (a sand hump over both): the abutment stands inside the hump | terrain mesh vs `heightAt` at a narrow ridge — request to the Terrain agent; the U-abutment is correct but hidden |
| 13 | junction (60 m) | the arterial T-junction has no signals; the barrier terminal reads as a small pyramid; the median opening is bare | signals 64f53311 (mast arms on the far corners), sand-drum crash cushions 7beec3c3 |
| 14 | gantry (shoulder) | gantry, pedestals, truss and panel backs read right; a warehouse stands 3 m from the pavement edge (City agent) | ok / noted |
| 15 | night 300 m | the median lighting reads as a string of lit dots to the horizon | ok |
| 16 | 9:00 from 300 m | pole shadow strokes every 60 m across the pavement (shadow proxies working); the barrier's shadow is a hairline | ok |
| 17 | landing (garza-west, Garza end) | camera inside the shore vegetation; re-shot from over the water | re-shot r4 |
| 18 | top-down 120 m | a district street runs adjacent to the highway's south edge for kilometres (the grid's frontage street): the verge on that side is under it (correct, hidden) | noted for the City / Street Detail agents |

## Round 4 — verges, junctions, plaza, footbridges (cb323374 … 0db2ef9c; `/tmp/highway/shots8`)

| # | view | what reads wrong | status |
|---|------|------------------|--------|
| 19 | top-down 120 m, 200 m along | the verge reads as the same dry tone as the ground; the corridor has no edges | fixed cb323374: 12 m mown strips in four terrain-draped rows (gravel band, mower stripes, swale), green against the dry lots |
| 20 | junction 60 m | the barrier terminals end bare; nothing marks the opening from the air | fixed 7beec3c3 / b6ea564f: sand-drum crash cushions, signal mast arms with lit aspects at night, 1 km / 300 m advance signs |
| 21 | 200 m along (east end) | the causeway approach is the only structure on 4 km of highway: nothing else breaks the ribbon | toll plaza bcbeb7b0 (lit canopy, islands, booths), pedestrian overpasses cdecc7f3 |
| 22 | top-down 120 m | delineators, chevrons, a signal mast and a footbridge stair stood in the frontage street; a gantry column stood in it | fixed 0db2ef9c: `makeRoadTest` — dropped, stepped out or spanned |
| 23 | aerial-a, bridge-low | the causeway decks were one pale slab: carriageway and shoulders the same concrete tone | fixed 9328156b: asphalt lanes between pale concrete shoulders and kerbs |
| 24 | dev 2 m on the verge (`cam=-4400,2,2690`) | camera was under the pavement (surface at y≈5.5 there): a grey void | camera error, re-shot at y 7.3 in r5 |

## Round 5 — the pavement itself (`/tmp/highway/shots11` pale shoulders, `shots12` full course, `shots13` pools + box lift)

| # | view | what reads wrong | status |
|---|------|------------------|--------|
| 25 | 600 m along, 1500 m | with everything above in place the highway was still a *pale* ribbon at 600 m+ and, at 1500 m, no darker than a 10 m street: the pavement tone (roads.ts, 0.30–0.40) is the barrier's, the ground's and the shoulders'. The Street Detail branch keeps that tone, so the request alone would not land | fixed: **wearing course** in highway.ts — dark lane asphalt (0.11–0.17) with its own paint, an older paler shoulder mix (0.20–0.27) over the joint, 2 cm over roads.ts' pavement, 15 cm short of its edge; the decks match (bridges.ts). At 600 m the corridor is now a dark ribbon with a bright spine; at 1500 m it is the darkest road line in the grid |
| 26 | 600 m along (shots11) | lanes dark but shoulders left pale: the ribbon's mean tone was no darker than the streets, so from 1500 m nothing had changed | fixed in shots12 (the shoulders take the course too) |
| 27 | junction 60 m (shots11/12) | inside the arterial's box a pale diagonal band: the crossing road's pavement (its own rows) stands a few cm over the highway's and pokes through the 2 cm course | fixed shots13: the course ramps up 6 cm over the 15 m before every junction box and rides over both pavements there |
| 28 | night 300 m | the median lighting is a string of lit dots but the pavement under the poles is unlit: no pools, so the highway does not read as *lit* from the air | fixed shots13: each course strip knows its nearest pole (vertex colour) and the shader lays a warm pool across both carriageways under it, driven by the lamps' night curve |
| 29 | junction 60 m | the sloped barrier terminal reads as a flat pale wedge from above (its top is the pale cap) | cosmetic; a darker cap on the last 7 m would help — left |
| 30 | all aerial | the mown verge is a fresh green at 120–200 m but does not register at 600 m+ against the lots' pale grass | open: a stronger (irrigated) verge tone is the next lever after the pavement; weigh against looking painted |

## Round 6 — the spit, the tone at noon, the barrier at night (`/tmp/highway/shots13` review, `shots16` on 4bb94600)

| # | view | what reads wrong | status |
|---|------|------------------|--------|
| 31 | spit 80 m (`cam=120,80,2000 hdg=300 pch=-25`) | sand-coloured blotches all over the carriageway for hundreds of metres, the terrain's pale patch texture over the lanes: the rendered ground stands through the pavement. Two causes, measured with `/tmp/highway/poke.ts`: (a) roads.ts sets the surface at `heightAt(edge)+0.15` at the two edges only, linear across, so a dune crest under the middle of the 22 m road stands up to 0.45 m over it (610 samples > 5 cm on the spit alone); (b) terrain.ts samples the height texture at `uv=(wp+HALF)/WORLD_SIZE` — no half-texel offset — so the clipmap is `heightAt` shifted 4.9 m toward +x,+z, and on any slope it sits decimetres off the CPU field (with the shift: 3075 samples over the surface, worst 0.57 m, at the spit, `tortuga-rd` 980,-400 and `garza-hwy` -1012,2538) | fixed 4bb94600 in highway.ts: a per-row **lift field** (five knots across; the largest excess of the rendered terrain — `heightAt` at the point and half a texel back — over the pavement within a row along and a knot across, + 6 cm) lifts the course, the barrier, poles, cushions, islands and the verge's inner row over the ground; the course is split at the mid-carriageway knot so it follows the field. Zero over ~95 % of the network. The roads.ts pavement and the cars (traffic.ts: `heightAt(vertex)+0.25` between polyline vertices) stay where they were — both already under the terrain at these spots. Requests: Street Detail (roads.ts: sample the terrain across the width, take the max), Terrain (terrain.ts: `+ 0.5 * cell` in the uv; the A/B build `/tmp/highway-dist14` shows the effect) |
| 32 | top-down 120 m (noon) | measured: lanes 159 sRGB, shoulders 200, streets 186–197, grass 185–199 — the lanes are darker than a street but still a mid grey; a highway from the air is a *dark* ribbon | fixed 4bb94600: lanes 0.07–0.11 (from 0.11–0.17), decks too; shoulders unchanged so the edge contrast grows; the lamp pools compensated (×1.4) |
| 33 | night 80 m | the median barrier is a dark line at night although it stands directly under the lamps; the pools light the asphalt only | fixed 4bb94600: `aInfo.w` names the nearest pole on the barrier too (its lofts wait for the lighting), the concrete glows in the pool, brightest along the cap |
| 34 | junction low (`cam=-3440,4.5,2712`), verge low (`cam=…,2,…`) | both cameras stood in the water / under the pavement: the terrain at -3440,2712 is below sea level | camera errors; `/tmp/highway/where.mjs x z` now prints the shoulder camera for any point |
| 35 | top-down 120 m | the frontage street beside the highway is 22 m of pale roads.ts pavement with yellow dashes, brighter than the highway's shoulders, running parallel for kilometres — it halves the corridor's contrast on that side | Street Detail / City agents (noted in r3 #18); the darker lanes make the highway itself unambiguous |

## Round 7 — after the lead's half-cell fix (`/tmp/highway/shots19` on 76f9b9d8: lead merged, fast-forward)

Re-check of the three poke-through sites after terrain.ts / water.ts moved to `(wp + HALF + 0.5*CELL)`: spit (`cam=120,80,2000`), tortuga-rd (`cam=940,80,-340 hdg=35`), garza-hwy (`cam=-1120,80,2560 hdg=85`) — no sand through the carriageway anywhere, the course meets both deck ends flush, the lift field stays (its max-of-both-readings is now redundant but harmless). The round-6 paint (plaza diverge/merge fans, hatched noses, stop bars, zebras) verified from 200 m and 60 m.

| # | view | what reads wrong | status |
|---|------|------------------|--------|
| 36 | progress cam `cam=-1300,120,2750 hdg=60 pch=-16`, tortuga 80 m, garza 80 m | the verge is a **neon band**: measured against the terrain shader, the mown grass (0.36, 0.52, 0.21 before the material's 0xb8b4aa base) was 1.6 x the brightness of the terrain's lawn (0.064, 0.105, 0.038) and far more saturated, one tone for kilometres with a hard outer edge — the corridor read as painted | fixed 8a7d32b0: grass a shade fresher than the lawn (0.19, 0.32, 0.12), 40–80 m dry khaki patches where the irrigation misses, the outer 4 m going over to the dry yard tone |
| 37 | progress junction cam `cam=-4400,180,2700 hdg=90 pch=-14` (4 x crop) | green irregular blotches on the frontage street beside the highway: my verge rows follow the terrain while the street's pavement is flat between its 15 m rows, so the verge stood through it | fixed 8a7d32b0: rows under another road's pavement (`inRoad`) sink 45 cm |
| 38 | toll plaza 200 m (`cam=-3195,200,2900 pch=-45`, 10 x crop) | the plaza's west barrier terminal — sand drums and the sloped end — stood in the path of a street crossing the highway there (the opening ended 48 m from the plaza, the street crosses at ~50 m) | fixed 8a7d32b0: an opening whose end falls within 13 m of any road mouth grows past it |
| 39 | cloudy (right, 1.5 km), plane-front-quarter (left, 2.5 km), bridge-low (far pylon) | the cable-stayed spans stand **cable-less**: the stays' alpha is their sub-pixel coverage (a 14 cm stay at 1 km covers 0.05 px) | fixed 3c01aa0e: stays and hangers carry `aGlow = -1` and keep a 0.5 opacity floor under the 1.75 px minimum width; stays 18 cm |
| 40 | bridge-low, progress cam | no joints read on the decks now that the asphalt is dark: the 30 cm dark steel strips over the piers are the asphalt's own tone | fixed 3c01aa0e: armoured joints — pale edge plates (0.5 m over piers, 0.7 m at the abutments) round a dark seal |
| 41 | night (no causeway night view yet) | the deck lamps are lit dots but the deck under them stays dark, unlike the highway with its pools | fixed 3c01aa0e: pools on the deck from the deterministic 22 + 45 j lamp row (alternating sides), `uLampGlow` on the bridge concrete |
| 42 | cloudy A4 (critic) | "a deck floating onto flat ground" — every deck end has its fill (approach harness: garza-west 0–40 and 910–982 m etc.); the critic's shot predates the round-4 approaches. Re-shot at the garza-west east end (`cam=80,40,2640 hdg=265`) in r8 | verify r8 |
| 43 | junction 60 m | the crossing arterial has no median treatment on its approaches, so the junction is a bare crossing of two roads | fixed 8a7d32b0: a raised kerbed divider down each arterial arm, 60 m from the kerb returns, 0.6 m wide on 4-lane arms (the traffic's inner lane runs 1.5 m off the centre line) and 1.0 m with a planted top on 2-lane arms; stopped short of side-street mouths. Turn-lane (corner) islands left out: the traffic's turning paths through the box are not known to this module and an island in a path is worse than none |
| 44 | junction 180 m | pole rhythm: 60 m everywhere | 40 m through 160 m either side of a signalised junction (8a7d32b0) |

## Rounds 8–10 — decks from 45–120 m, junctions from 180 m, traffic against the furniture (3c01aa0e, 8a7d32b0, 4e00444a; `/tmp/highway/shots22` queued, then re-pointed at the merged build)

The user's order for the second block of rounds: (1) the causeway / bridge decks at 45–120 m, (2) the arterial junctions
from 180 m, (3) the frontage street, (4) the traffic against the barrier openings and the plaza. Rows 39–44 above are
the deck and junction fixes of rounds 8–9; the rows below complete the block. The lead merged at 22:53 (fast-forward
onto my tip) and again at 00:10 (`e1ae2719`, 45 commits: streets round 3–4, plazas, the half-cell fix live).

| # | view | what reads wrong | status |
|---|------|------------------|--------|
| 45 | deck 45–120 m (`bridge-low`, progress cam) | the deck's gutters are plain: nothing marks a bridge deck's drainage from the chase camera although the scuppers hang under the fascia every 15 m | fixed 4e00444a: a cast-iron inlet grate 0.6 × 0.4 m decaled in both gutters over every scupper with the damp ring its run-off leaves — a row of dark dots along both edge lines |
| 46 | junction 60 m, plaza 200 m — `traffic.ts` geometry check | the crash-cushion drums stood at ±0.55 m across in a triangle, 0.9 m wide: the inner lane's cars run 1.5 m off the centre line (`laneOff0`), a 1.9 m car's flank 0.55 m off it — the drums were in the flank of every car; the plaza's median island (1.6 m) and its booth (1.4 m) stood 0.25 m into the inner lane | fixed 4e00444a: drums in single file within ±0.4 m; the median island a bare 0.8 m divider with no booth (the four lane islands keep theirs); the cross-road dividers were already sized to the arterial lanes (0.6 m at 1.5 m lanes, 1.0 m at 1.8 m) |
| 47 | 180 m junction cam | the crossing arterial runs through the highway's box and the frontage street's box 4 m apart with no median on either approach | fixed 8a7d32b0 (row 43); the divider stops short of side-street mouths, which on the south arm means it starts past the frontage street |
| 48 | all night views (no causeway night view had been shot) | the deck lamps were lit dots over a dark deck | fixed 3c01aa0e (row 41); `hw_prog_bridge_night` and `hw_cable_1km_night` queued for the verification |

## Round 11 — the frontage street (a3bfba34 frontage, 8418c704 fills, 11f4f34f channel lights, e618d81a masts, a11411ba patches; `/tmp/highway/shots24` on `/tmp/highway-dist24`)

| # | view | what reads wrong | status |
|---|------|------------------|--------|
| 49 | 180 m junction cam, 120 m top-down, 1.5 km | the frontage street: a 9 m two-lane `street` at z = 2715 runs 2.6 km along `south-hwy-mainland`, its centre 15.2 m off the axis for 1.2 km — its kerb 0.3 m *inside* the highway's pavement edge — and 21–42 m off it either side of that. From the air it is pale `roads.ts` pavement (repaving bands 0.6–1.26 × the base) with yellow dashes beside the dark lanes, halving the corridor's contrast on the south side; at 1.5 km it is the pale line that makes the highway look like two roads | fixed a3bfba34: `buildHighway` takes the `RoadGraph` (one `game.ts` hunk); every `street`/`lane` chain sampled within 10° of a highway with its near edge from 1.5 m over to 6 m off the highway's edge is a frontage stretch. Over it the street is resurfaced on its own chain's rows (`chain.rows` / `rowY`, so the course sits exactly 2 cm over the pavement) in the lane asphalt with a local street's paint — a dashed yellow centre stopped 5 m short of each junction box and plain through it (the nodes' box reach), wheel paths 1.8 m off the centre, damp gutters — and its edge nearest the highway becomes a kerbed 1.05 m **hedge buffer**, lofted on the pavement, broken where a road's pavement reaches it from the highway's side (rectangle test, no end caps, so the side streets ending on the *far* kerb do not break it). 1.67 km on `south-hwy-mainland`, +3.8 k triangles |
| 50 | 180 m junction cam | at the junctions along the frontage stretch the signal mast arms stood on the north corners only: the south footings (1.6 m off the shoulder) fell on the frontage street's pavement and were skipped by the road test | fixed e618d81a: a footing on the frontage street is moved into the hedge buffer at the nearest clear station (kerb-top height), the arm reaching the same lanes from a metre nearer |
| 51 | landings (`hw_land_garza`, `hw_garza`, spit) | the grassed approach fills were 0.60/0.68/0.40 before the material base — twice as bright as the retuned verge grass they continue, a lime wedge at every landing from the air | fixed 8418c704: the fills take the verge's grass (0.21, 0.33, 0.13) and its 40–80 m dry khaki patches |
| 52 | night, causeway 1 km | nothing marks the channel span at night but the pylon beacons | fixed 11f4f34f: red channel lights on the main-span piers' channel faces at clearance level, green on both fascias at mid-span (lamp heads: lit dots to the head cut-off) |
| 53 | 45–200 m over the lanes | the course comment promised patch repairs; the lanes had cracks, section tones and wheel paths only | fixed a11411ba: 5 × 3 m repair cells (4 %, darker or bleached), box-filtered edges, gone once a pixel covers a metre |

Verification of rounds 8–11 (`shots24`, 30 views: decks day + night at 45–120 m and 1 km, junction 180 m, frontage
at 9 m / 60 m / 120 m, plaza 200 m, 200 / 600 / 1500 m, `aerial-a`, `bridge-low`, `sunset`, `cloudy`, `harbor`) is
queued behind two other builders' long sessions (a 47-job vegetation batch with 30-minute jobs and an aircraft batch,
both holding a slot for over an hour); results are appended below when the slot comes.
