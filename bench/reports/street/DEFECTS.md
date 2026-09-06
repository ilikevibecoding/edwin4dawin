# Street detail — defect log

Branch `cursor/street-loop-8213`. Views: the bench set plus ad-hoc `dev` cameras over downtown
(`street2m` 2 m over the avenue at x=-2737 z=-3880 looking north; `isect60` 60 m over the intersection at
x=-2715 z=-3895; `c100`/`c200`/`c500`/`c1k` the city read from 100 m to 1 km; `-night` variants at 22:00).
Captures are gated to two Chrome slots machine-wide, so every round batches its views into one browser.

Status: `open` / `fixed (round n)` / `wontfix (reason)` / `request (agent)`.

## Round 0 — baseline (commit 6130eae7, before this branch)

| # | View | Defect | Status |
|---|------|--------|--------|
| 0.1 | all city views | Street lamps only on `arterial`/`highway`/`causeway` segments, one 9 m pole every 45 m alternating sides; none on `street`/`lane`, none at intersections; the pole stands at `width/2 + 1` from the centreline, i.e. in the gutter of a road with no curb. | fixed (round 1): lamp plan from `streets.ts` — arterial 36 m staggered both sides, street 48 m, ped 18 m on the promenade, one per intersection corner, footing 0.75 m behind the curb face |
| 0.2 | night views | Lamp heads glow (`aEmissive`) but throw no light: no pools on the road, so the lamps do not read as street lighting from the air. | fixed (round 1): ground irradiance map (`uLampMap`, 2.5 m texels) sampled by the road and sidewalk materials |
| 0.3 | night, skyline-high | Lamps vanish beyond the prop LOD distance (~600 m); a city at night has no street grid of lights. | fixed (round 1): additive point sprites per chunk fade in at 160–320 m and out at 4 km |
| 0.4 | street2m, isect60 | No traffic signals anywhere. | fixed (round 1): mast arms with 3-aspect heads per approach lane, pedestrian heads, street-name blades at every arterial × non-lane intersection, stop signs on the minor legs of arterial T's and street crossings |
| 0.5 | street2m | No sidewalks or curbs; buildings meet the asphalt directly and roads read as flat grey ribbons. | fixed (round 1): curb + gutter + slab mesh strips per block face (width by zone), curb returns with dished ramps at every corner, a promenade on the hotel/downtown shoreline |
| 0.6 | isect60 | Markings continue straight through intersections (crossing roads' lines overlap and z-fight); no stop lines, crosswalks or arrows. | fixed (round 1): per-vertex intersection box distance suppresses lines and lays stop bars, ladder crosswalks and lane arrows; intersection strips share one material and depth so the overlap is invisible |
| 0.7 | c200–c1k | Asphalt is one flat tone with no wear; lane lines alias from altitude (single-sample `step`). | fixed (round 1): `fwidth` box-filtered markings and features, albedo/roughness variation, tyre paths, patch repairs, cracks, seams, manholes and gullies; everything band-limited to the pixel footprint |
| 0.8 | street2m | Nothing on the sidewalks: no benches, bins, hydrants, shelters, bollards, tree wells, utility covers. | fixed (round 1): kit soup per 500 m cell (two draws: large / small); tree wells and covers in the sidewalk shader; footprints mark the ground occupied |

## Round 1 — first build of the new systems

| # | View | Defect | Status |
|---|------|--------|--------|
| 1.1 | all | Road material failed to compile (`patch` is a reserved word in GLSL ES 3.0): every road drew with the fallback program, flat blue-grey. | fixed (round 1): renamed `repair` |
| 1.2 | street2m | Olive, speckled band on the curb top fading 1.5 m into the slab along every run: the apron (earth/grass) tone appears where the concrete should be. | open — instrumented render pending (kind/across/ramp written to emissive) |
| 1.3 | tooling | Bench scripts died at launch with `Timed out after 30000 ms while waiting for the WS endpoint` while the machine-wide Chrome gate held the launch for a free slot. | fixed (round 1): `timeout: 0` on `puppeteer.launch` in `capture.mjs` / `shot.mjs` |
| 1.4 | street2m | Lamp arm on the near-side street lamps points across the walk, not over the roadway (yaw sign to verify against the right-hand normal). | open — checking on the isect60 view |
| 1.5 | c100–c500 | Not yet captured on this build: the surface read from the air (asphalt tone, marking wear, curb line) is the user's top priority and is the first thing round 2 measures against the baseline. | open |
