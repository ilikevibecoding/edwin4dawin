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
