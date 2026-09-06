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
