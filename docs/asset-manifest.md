# Asset Manifest — Northstar Rescue

Generated from the live runtime registry (`src/core/assets.js`) by `node tools/gen-manifest.mjs`,
so it cannot drift from the code that registers the assets. Every entry carries the metadata the
project requires: unique ID, name, category, responsible agent, file locations, intended rooms or
game states, physical dimensions, pivot and orientation, material slots, texture maps, collision
type, LOD requirement, animation states, audio dependencies, status, acceptance criteria, Playwright
evidence, and remaining discrepancies.

**No production asset may be introduced without a record here.** `assets.tag()` warns at load if an
object carries an unregistered ID, and `tests/assets.spec.js` fails the build on a missing field.

## Summary

- **464 registered assets** across 17 categories.
- **Instances placed in the built level:** 1468.
- **Registered but never instantiated:** 4 (PROP-CUBE-PANEL-SIDE, CLUT-STAPLER, CLUT-BADGE, WPN-CS12-BREAKER).

| Category | Records | Instances |
| --- | ---: | ---: |
| architecture | 35 | 283 |
| audio | 167 | 0 |
| breakroom | 19 | 45 |
| character | 40 | 17 |
| clutter | 30 | 120 |
| decal | 4 | 189 |
| door | 5 | 27 |
| electronics | 25 | 124 |
| furniture | 22 | 160 |
| glass | 4 | 16 |
| lighting | 6 | 157 |
| maintenance | 30 | 226 |
| material | 19 | 0 |
| restroom | 8 | 16 |
| signage | 15 | 56 |
| vfx | 27 | 0 |
| weapon | 8 | 32 |

| Responsible agent | Records |
| --- | ---: |
| Fable 1 — art direction & UI | 6 |
| Fable 2 — map architecture | 43 |
| Fable 3 — props & materials | 173 |
| Fable 4 — characters & effects | 242 |

| Status | Records |
| --- | ---: |
| accepted | 68 |
| integrated | 396 |

---

## architecture (35)

### `ARCH-ACCESS-PANEL` — Utility Access Panel

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | servicecorr, mechanical, restrooms, janitor, stairwell |
| Dimensions (w × h × d) | 0.50 × 0.50 × 0.02 m |
| Pivot & orientation | panel centre, faces +Z |
| Material slots | painted-metal, screw |
| Texture maps | baseColor, normal, roughness |
| Collision | none |
| LOD | single mesh |
| Instances in level | 6 |
| Status | **accepted** |
| Acceptance criteria | Recessed inner leaf and four corner fixings. |
| Playwright evidence | gallery capture |
| Remaining discrepancies | none |

### `ARCH-BASEBOARD` — Baseboard / Skirting

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | all interior rooms |
| Dimensions (w × h × d) | 1.00 × 0.10 × 0.12 m |
| Pivot & orientation | base centre |
| Material slots | painted-trim |
| Texture maps | baseColor, roughness |
| Collision | none (inside the wall collider) |
| LOD | single mesh |
| Instances in level | 0 |
| Status | **accepted** |
| Acceptance criteria | Continuous along every finished wall, returns into door casings, 4 mm chamfer. |
| Playwright evidence | artifacts/screenshots/room-lobby.png |
| Remaining discrepancies | none |

### `ARCH-BLINDS` — Venetian Blinds

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | lobby, waiting, breakroom, conference, execoffice, archive |
| Dimensions (w × h × d) | 3.00 × 1.60 × 0.06 m |
| Pivot & orientation | top centre at the window head |
| Material slots | blind-slat, headrail |
| Texture maps | baseColor, roughness |
| Collision | none |
| LOD | single mesh |
| Animation states | raised, partially lowered (35%), lowered (85%) |
| Instances in level | 9 |
| Status | **accepted** |
| Acceptance criteria | Individual tilted slats, headrail, at least two drop states across the building. |
| Playwright evidence | artifacts/screenshots/room-conference.png |
| Remaining discrepancies | none |

### `ARCH-CABLETRAY` — Cable Tray with Bundles

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | serverroom, itroom, servicecorr, mechanical |
| Dimensions (w × h × d) | 1.00 × 0.08 × 0.32 m |
| Pivot & orientation | centre, running along local X |
| Material slots | tray-steel, cable-jacket |
| Texture maps | baseColor, normal, roughness |
| Collision | aabb |
| LOD | single mesh |
| Instances in level | 4 |
| Status | **accepted** |
| Acceptance criteria | Side rails, rungs and four cable bundles; reads as a real containment system. |
| Playwright evidence | artifacts/screenshots/room-serverroom.png |
| Remaining discrepancies | none |

### `ARCH-CASED-OPENING` — Cased Opening (no leaf)

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | lobby, openoffice, midcorr, breakroom, servicecorr, loading, stairwell, execcorr |
| Dimensions (w × h × d) | 1.00 × 2.40 × 0.12 m |
| Pivot & orientation | base centre of the opening |
| Material slots | painted-casing |
| Texture maps | baseColor, roughness |
| Collision | shared with the wall pieces |
| LOD | single mesh |
| Instances in level | 13 |
| Status | **accepted** |
| Acceptance criteria | Reads as a built aperture with a casing, not a hole cut in a wall. |
| Playwright evidence | artifacts/screenshots/room-midcorr.png |
| Remaining discrepancies | none |

### `ARCH-CEIL-CONCRETE` — Exposed Concrete Soffit

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | serverroom, mechanical, garage, loading, servicecorr, weststair, janitor |
| Dimensions (w × h × d) | 1.00 × 0.08 × 1.00 m |
| Pivot & orientation | centre |
| Material slots | concrete |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single mesh |
| Instances in level | 7 |
| Status | **accepted** |
| Acceptance criteria | Back-of-house rooms show structure, not finish. |
| Playwright evidence | artifacts/screenshots/room-mechanical.png |
| Remaining discrepancies | none |

### `ARCH-CEIL-GRID` — Suspended Ceiling Grid

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | vestibule, waiting, openoffice, conference, breakroom, restrooms, midcorr, copyroom, itroom, archive, execcorr, execoffice, upperlanding, eastlink |
| Dimensions (w × h × d) | 0.60 × 0.05 × 1.20 m |
| Pivot & orientation | grid centre at ceiling height |
| Material slots | t-bar, ceiling-tile, ceiling-tile-stained |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none (deck collider above) |
| LOD | shared tile geometry, one draw per tile batch |
| Animation states | intact, stained, missing |
| Instances in level | 14 |
| Status | **accepted** |
| Acceptance criteria | Fissured tile face, exposed T-bar, slight per-tile sag and rotation so the grid never reads as a perfect CG plane; stained and missing variants placed deliberately. |
| Playwright evidence | artifacts/screenshots/room-servicecorr.png |
| Remaining discrepancies | none |

### `ARCH-CEIL-PLASTER` — Hard Plaster Ceiling

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | entrance, lobby, stairwell |
| Dimensions (w × h × d) | 1.00 × 0.08 × 1.00 m |
| Pivot & orientation | centre |
| Material slots | plaster |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none (deck above) |
| LOD | single mesh |
| Instances in level | 2 |
| Status | **accepted** |
| Acceptance criteria | Used where the room is double height and a suspended grid would look wrong. |
| Playwright evidence | artifacts/screenshots/room-lobby.png |
| Remaining discrepancies | none |

### `ARCH-CEIL-TILE-INTACT` — Acoustic Ceiling Tile (intact)

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | all interior rooms |
| Dimensions (w × h × d) | 0.58 × 0.02 × 1.18 m |
| Pivot & orientation | centre |
| Material slots | ceiling-tile |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | shared geometry |
| Instances in level | 0 |
| Status | **accepted** |
| Acceptance criteria | Worley-pitted face, off-white, no baked lighting. |
| Playwright evidence | gallery capture |
| Remaining discrepancies | none |

### `ARCH-CEIL-TILE-MISSING` — Missing Ceiling Tile (open plenum)

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | servicecorr, copyroom |
| Dimensions (w × h × d) | 0.60 × 0.00 × 1.20 m |
| Pivot & orientation | grid cell centre |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a |
| Instances in level | 0 |
| Status | **accepted** |
| Acceptance criteria | Reveals duct/conduit above rather than a black void. |
| Playwright evidence | artifacts/screenshots/room-servicecorr.png |
| Remaining discrepancies | none |

### `ARCH-CEIL-TILE-STAINED` — Acoustic Ceiling Tile (water stained)

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | restrooms, janitor, servicecorr, copyroom |
| Dimensions (w × h × d) | 0.58 × 0.02 × 1.18 m |
| Pivot & orientation | centre |
| Material slots | ceiling-tile-stained |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | shared geometry |
| Instances in level | 0 |
| Status | **accepted** |
| Acceptance criteria | Concentric tide-line rings, darker toward the centre; paired with a water-stain decal on the floor below. |
| Playwright evidence | artifacts/screenshots/room-restrooms.png |
| Remaining discrepancies | none |

### `ARCH-COLUMN` — Structural Column

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | lobby, openoffice, loading |
| Dimensions (w × h × d) | 0.42 × 3.00 × 0.42 m |
| Pivot & orientation | base centre |
| Material slots | drywall, base-cap |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | aabb |
| LOD | single mesh |
| Instances in level | 2 |
| Status | **accepted** |
| Acceptance criteria | Base and cap detail present; 12 mm chamfer; breaks the open-office sightline without blocking the aisle. |
| Playwright evidence | artifacts/screenshots/room-openoffice.png |
| Remaining discrepancies | none |

### `ARCH-CROWN-TRIM` — Crown / Edge Trim

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | lobby, execcorr, execoffice, conference |
| Dimensions (w × h × d) | 1.00 × 0.06 × 0.13 m |
| Pivot & orientation | top centre |
| Material slots | painted-trim |
| Texture maps | baseColor, roughness |
| Collision | none |
| LOD | single mesh |
| Instances in level | 0 |
| Status | **accepted** |
| Acceptance criteria | Used only in the finished public and executive spaces, absent in back of house. |
| Playwright evidence | artifacts/screenshots/room-execcorr.png |
| Remaining discrepancies | none |

### `ARCH-DOORFRAME` — Door Frame & Threshold

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | all interior rooms |
| Dimensions (w × h × d) | 1.06 × 2.16 × 0.13 m |
| Pivot & orientation | base centre of the opening |
| Material slots | painted-frame, aluminium-threshold |
| Texture maps | baseColor, roughness |
| Collision | shared with the wall pieces |
| LOD | single mesh |
| Instances in level | 23 |
| Status | **accepted** |
| Acceptance criteria | Jambs, head and threshold present with a real reveal; the door leaf hangs inside it without clipping. |
| Playwright evidence | tests/doors.spec.js |
| Remaining discrepancies | none |

### `ARCH-DUCT` — HVAC Duct Run

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | servicecorr, mechanical, loading, garage, serverroom |
| Dimensions (w × h × d) | 1.00 × 0.35 × 0.50 m |
| Pivot & orientation | centre, running along local X |
| Material slots | galvanised-steel |
| Texture maps | baseColor, normal, roughness |
| Collision | aabb |
| LOD | single mesh |
| Instances in level | 7 |
| Status | **accepted** |
| Acceptance criteria | Flanged joints at 1.5 m; visible where the ceiling is open or a tile is missing. |
| Playwright evidence | artifacts/screenshots/room-servicecorr.png |
| Remaining discrepancies | none |

### `ARCH-FLOOR-CARPET` — Carpet Floor Module

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | openoffice, conference, waiting, eastlink, execcorr, execoffice, upperlanding |
| Dimensions (w × h × d) | 1.00 × 0.30 × 1.00 m |
| Pivot & orientation | top face centre |
| Material slots | carpet |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | aabb (top face walkable) |
| LOD | single slab per room region; 2 m per texture tile |
| Instances in level | 10 |
| Status | **accepted** |
| Acceptance criteria | Loop-pile relief visible at grazing angles; traffic wear where routes converge; no stretched UVs. |
| Playwright evidence | tests/rooms.spec.js |
| Remaining discrepancies | none |

### `ARCH-FLOOR-CONCRETE` — Concrete Floor Module

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | serverroom, mechanical, servicecorr, loading, garage, weststair, janitor |
| Dimensions (w × h × d) | 1.00 × 0.30 × 1.00 m |
| Pivot & orientation | top face centre |
| Material slots | concrete |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | aabb |
| LOD | single slab; 4 m per tile |
| Instances in level | 11 |
| Status | **accepted** |
| Acceptance criteria | Sealed and unsealed variants differ in roughness; hairline cracks, no tiling repeats within a room. |
| Playwright evidence | artifacts/screenshots/room-loading.png |
| Remaining discrepancies | none |

### `ARCH-FLOOR-SNOW` — Snow Ground Plane

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | courtyard, eastapron |
| Dimensions (w × h × d) | 1.00 × 0.50 × 1.00 m |
| Pivot & orientation | top face centre |
| Material slots | snow |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | aabb |
| LOD | single slab; 4 m per tile |
| Instances in level | 2 |
| Status | **accepted** |
| Acceptance criteria | Drift relief and sparkle without reading as white plastic; footprint decals sit flat on it. |
| Playwright evidence | artifacts/screenshots/room-courtyard.png |
| Remaining discrepancies | none |

### `ARCH-FLOOR-TILE` — Ceramic / Terrazzo Tile Floor Module

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | entrance, vestibule, lobby, restrooms |
| Dimensions (w × h × d) | 1.00 × 0.30 × 1.00 m |
| Pivot & orientation | top face centre |
| Material slots | ceramic-tile |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | aabb |
| LOD | single slab; 2.4 m per tile |
| Instances in level | 5 |
| Status | **accepted** |
| Acceptance criteria | Grout lines recessed, tiles glossy, per-tile value variation. |
| Playwright evidence | artifacts/screenshots/room-vestibule.png |
| Remaining discrepancies | none |

### `ARCH-FLOOR-VINYL` — Vinyl Composition Tile Floor Module

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | breakroom, midcorr, copyroom, itroom, archive |
| Dimensions (w × h × d) | 1.00 × 0.30 × 1.00 m |
| Pivot & orientation | top face centre |
| Material slots | vct |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | aabb |
| LOD | single slab; 2.4 m per tile |
| Instances in level | 5 |
| Status | **accepted** |
| Acceptance criteria | Buffed sheen with dirt in the seams; aggregate speckle reads at 1 m. |
| Playwright evidence | artifacts/screenshots/room-breakroom.png |
| Remaining discrepancies | none |

### `ARCH-FLOORDRAIN` — Floor Drain Grate

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | mechanical, garage, restrooms, janitor |
| Dimensions (w × h × d) | 0.26 × 0.02 × 0.26 m |
| Pivot & orientation | top face centre |
| Material slots | cast-iron |
| Texture maps | baseColor, normal, roughness |
| Collision | none |
| LOD | single mesh |
| Instances in level | 5 |
| Status | **accepted** |
| Acceptance criteria | Sits flush in the slab with no z-fighting against the floor. |
| Playwright evidence | artifacts/screenshots/room-garage.png |
| Remaining discrepancies | none |

### `ARCH-GARAGE-SHUTTER` — Rolling Garage Shutter

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | garage |
| Dimensions (w × h × d) | 4.60 × 3.80 × 0.18 m |
| Pivot & orientation | base centre of the opening |
| Material slots | painted-slat, guide-rail, drum |
| Texture maps | baseColor, normal, roughness |
| Collision | aabb, removed as the curtain rises |
| LOD | slats culled as they roll away |
| Animation states | closed, raising, open |
| Audio dependencies | door_shutter_motor, door_shutter_stop |
| Instances in level | 1 |
| Status | **accepted** |
| Acceptance criteria | Individual slats, guide rails and a head drum; opening it removes the collider and enables extraction. |
| Playwright evidence | tests/doors.spec.js, tests/mission.spec.js |
| Remaining discrepancies | none |

### `ARCH-HALFWALL` — Half Wall / Knee Wall

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | lobby, waiting, openoffice |
| Dimensions (w × h × d) | 1.00 × 1.10 × 0.12 m |
| Pivot & orientation | base centre |
| Material slots | drywall, cap-trim |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | aabb |
| LOD | single mesh |
| Instances in level | 2 |
| Status | **accepted** |
| Acceptance criteria | Reads as usable waist-high cover with a capped top edge. |
| Playwright evidence | artifacts/screenshots/room-lobby.png |
| Remaining discrepancies | none |

### `ARCH-INTWINFRAME` — Interior Glazed Screen Frame

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | vestibule, lobby, conference, execcorr |
| Dimensions (w × h × d) | 2.20 × 1.40 × 0.12 m |
| Pivot & orientation | base centre of the opening |
| Material slots | painted-steel-frame |
| Texture maps | baseColor, normal, roughness |
| Collision | shared with the glazing collider |
| LOD | single mesh |
| Instances in level | 5 |
| Status | **accepted** |
| Acceptance criteria | Slimmer than the exterior frame and a different finish, so interior and exterior glazing read differently. |
| Playwright evidence | artifacts/screenshots/room-conference.png |
| Remaining discrepancies | none |

### `ARCH-LOADING-DOCK` — Loading Dock Structure

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | loading |
| Dimensions (w × h × d) | 6.00 × 1.10 × 2.40 m |
| Pivot & orientation | base centre |
| Material slots | concrete, rubber-bumper, steel-edge |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | compound aabb |
| LOD | single mesh |
| Instances in level | 1 |
| Status | **accepted** |
| Acceptance criteria | Dock edge, steel nosing and rubber bumpers at truck-bed height; climbable via steps, and the step-up behaviour is consistent. |
| Playwright evidence | artifacts/screenshots/room-loading.png |
| Remaining discrepancies | none |

### `ARCH-PIPE` — Pipe Run with Couplings

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | mechanical, servicecorr, janitor, restrooms, garage |
| Dimensions (w × h × d) | 1.00 × 0.10 × 0.10 m |
| Pivot & orientation | centre, running along local X |
| Material slots | painted-steel |
| Texture maps | baseColor, normal, roughness |
| Collision | aabb |
| LOD | single mesh |
| Instances in level | 6 |
| Status | **accepted** |
| Acceptance criteria | Couplings every 2.2 m; colour-coded service painting. |
| Playwright evidence | artifacts/screenshots/room-mechanical.png |
| Remaining discrepancies | none |

### `ARCH-RAILING` — Guard Rail / Balustrade

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | stairwell, weststair, execcorr, upperlanding |
| Dimensions (w × h × d) | 1.00 × 1.07 × 0.06 m |
| Pivot & orientation | base centre, running along local X |
| Material slots | stainless-post, glass-infill |
| Texture maps | baseColor, roughness |
| Collision | aabb along the run (does not block sight) |
| LOD | single mesh |
| Instances in level | 7 |
| Status | **accepted** |
| Acceptance criteria | Posts, top rail, mid rail and glass infill; prevents falling into the atrium without blocking the view down. |
| Playwright evidence | artifacts/screenshots/room-execcorr.png |
| Remaining discrepancies | none |

### `ARCH-ROOF-EDGE` — Roof Slab & Parapet

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | visible from courtyard and east apron |
| Dimensions (w × h × d) | 1.00 × 0.34 × 1.00 m |
| Pivot & orientation | centre |
| Material slots | concrete |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | aabb |
| LOD | single mesh |
| Instances in level | 24 |
| Status | **accepted** |
| Acceptance criteria | Caps every interior volume so the sky never leaks in; parapet visible from the exterior on the tall volumes. |
| Playwright evidence | artifacts/screenshots/room-courtyard.png |
| Remaining discrepancies | none |

### `ARCH-STAIR-LANDING` — Stair Landing Slab

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | stairwell, weststair, upperlanding, upperweststair |
| Dimensions (w × h × d) | 2.60 × 0.28 × 2.50 m |
| Pivot & orientation | top face centre |
| Material slots | tread |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | aabb |
| LOD | single mesh |
| Instances in level | 0 |
| Status | **accepted** |
| Acceptance criteria | Landings exist at the head of both flights and are walkable, so the mezzanine is reachable. |
| Playwright evidence | tests/rooms.spec.js (upperlanding, archive, execoffice) |
| Remaining discrepancies | none |

### `ARCH-STAIR-RUN` — Stair Flight

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | stairwell, weststair |
| Dimensions (w × h × d) | 2.60 × 4.00 × 5.80 m |
| Pivot & orientation | base of the bottom riser, ascending toward -Z |
| Material slots | tread, riser, stringer |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | one AABB per step (exact step-up behaviour) |
| LOD | single mesh |
| Instances in level | 2 |
| Status | **accepted** |
| Acceptance criteria | 200 mm rise / 290 mm going, 20 risers, nosing overhang, closed risers, painted steel stringers; traversable up and down by the player, enemies and hostages. |
| Playwright evidence | tests/ai.spec.js, tests/hostages.spec.js |
| Remaining discrepancies | none |

### `ARCH-WALL-CORNER` — Wall Corner Junction (interior & exterior)

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | all interior rooms |
| Dimensions (w × h × d) | 0.10 × 3.00 × 0.10 m |
| Pivot & orientation | base centre of the corner post |
| Material slots | drywall |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | shared with the adjoining wall segments |
| LOD | single mesh |
| Instances in level | 0 |
| Status | **accepted** |
| Acceptance criteria | Corners close exactly — the wall derivation in build.js splits every shared edge so no seam or gap can open. |
| Playwright evidence | tests/movement.spec.js (containment test) |
| Remaining discrepancies | none |

### `ARCH-WALL-EXT` — Exterior Wall Module

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | building envelope |
| Dimensions (w × h × d) | 1.00 × 7.60 × 0.24 m |
| Pivot & orientation | base centre; run along local +X |
| Material slots | exterior-face, interior-face, baseboard |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | compound AABB |
| LOD | single mesh |
| Instances in level | 53 |
| Status | **accepted** |
| Acceptance criteria | 240 mm thick, full building height, no gap at any junction, no sky visible from inside. |
| Playwright evidence | tests/rooms.spec.js |
| Remaining discrepancies | none |

### `ARCH-WALL-STRAIGHT` — Straight Interior Partition

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | all interior rooms |
| Dimensions (w × h × d) | 1.00 × 3.00 × 0.10 m |
| Pivot & orientation | base centre; run along local +X, faces ±Z |
| Material slots | drywall-face-a, drywall-face-b, baseboard |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | compound (one AABB per solid piece around each opening) |
| LOD | single mesh; 2.5 m per texture tile |
| Instances in level | 44 |
| Status | **accepted** |
| Acceptance criteria | Runs floor to structural deck so no light leaks over it; 6 mm chamfer on every exposed arris; baseboard and correct finish on each side. |
| Playwright evidence | tests/rooms.spec.js, artifacts/screenshots/room-*.png |
| Remaining discrepancies | none |

### `ARCH-WINDOWFRAME` — Exterior Window Frame

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/kit.js, src/map/build.js, src/map/layout.js |
| Rooms / game states | lobby, waiting, breakroom, conference, execoffice, execcorr, upperlanding, archive, loading |
| Dimensions (w × h × d) | 3.00 × 1.60 × 0.26 m |
| Pivot & orientation | base centre of the opening |
| Material slots | anodised-aluminium, painted-stool |
| Texture maps | baseColor, normal, roughness |
| Collision | shared with the glazing collider |
| LOD | single mesh |
| Instances in level | 11 |
| Status | **accepted** |
| Acceptance criteria | Head, sill, jambs, mullions and an interior stool board; mullion count scales with the opening width. |
| Playwright evidence | artifacts/screenshots/room-lobby.png |
| Remaining discrepancies | none |

### `PROP-COLUMN` — Structural Column Casing

| Field | Value |
| --- | --- |
| Category | architecture |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | openoffice |
| Dimensions (w × h × d) | 0.42 × 3.00 × 0.42 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paintedMetal |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |


## audio (167)

### `AMB-DRIP` — Dripping tap

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/ambience.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | drip |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | randomised drips with a basin echo in the restrooms; positional emitters placed from ROOMS, distance-culled. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `AMB-FLUORESCENT` — Fluorescent hum

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/ambience.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | amb_fluorescent |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | 120 Hz mains buzz with thin ballast hiss in every strip-lit room; positional emitters placed from ROOMS, distance-culled. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `AMB-HVAC` — HVAC rumble

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/ambience.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | amb_hvac |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | low ducted air with slow amplitude wander; office ceiling presence; positional emitters placed from ROOMS, distance-culled. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `AMB-HVAC-HEAVY` — Plant-room air handler

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/ambience.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | amb_hvac_heavy |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | heavier rumble with a 49 Hz motor fundamental; mechanical room; positional emitters placed from ROOMS, distance-culled. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `AMB-LIGHT-BUZZ` — Dying light buzz

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/ambience.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | amb_light_buzz |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | sputtering uneven tube in the service corridor; slightly unnerving; positional emitters placed from ROOMS, distance-culled. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `AMB-LIGHT-FLICKER` — Light flicker tick

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/ambience.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | light_flicker |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | tick plus a short buzz gasp when a tube stumbles; positional emitters placed from ROOMS, distance-culled. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `AMB-SERVER-FANS` — Server fan wall

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/ambience.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | amb_server_fans |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | dense fan broadband with beating twin whines; the loudest room tone; positional emitters placed from ROOMS, distance-culled. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `AMB-STORM` — Storm bed

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/ambience.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | amb_storm |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | global very-low rumble bed under everything outdoors-adjacent; positional emitters placed from ROOMS, distance-culled. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `AMB-STORM-GUST` — Storm gust

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/ambience.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | storm_gust |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | occasional 2-3 s wind swell; positional emitters placed from ROOMS, distance-culled. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `AMB-STORM-RUMBLE` — Distant storm rumble

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/ambience.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | storm_rumble |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | far-off low roll every so often; positional emitters placed from ROOMS, distance-culled. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `AMB-WIND` — Exterior wind

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/ambience.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | amb_wind |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | gusting band-passed wind at openings and the curtain wall; positional emitters placed from ROOMS, distance-culled. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `MUS-BED-TENSION` — Tension music bed

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/music.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | procedural drone + sparse pluck that rises with combat heat and relaxes ~8 s after contact ends; respects musicVolume. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `MUS-STING-DEFEAT` — Defeat sting

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | sting_defeat |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | low minor-second cluster sinking away. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `MUS-STING-HOSTAGE` — Hostage secured chime

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | sting_hostage_secured |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | warm two-strike bell; the "you did the right thing" sound. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `MUS-STING-MISSION-START` — Mission start sting

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | sting_mission_start |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | low swell with a heartbeat hit: "insertion". |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `MUS-STING-OBJ-COMPLETE` — Objective complete

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | sting_objective_complete |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | rising fifth with a soft chime; unambiguously positive. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `MUS-STING-OBJ-FAILED` — Objective failed

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | sting_objective_failed |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | sagging semitone over a low thump; unambiguously negative. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `MUS-STING-VICTORY` — Victory sting

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | sting_victory |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | three-note major arpeggio with shimmer; release of tension. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-DOOR-FIRE-CLOSE` — Door - fire close

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | door_fire_close |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | closer eases the leaf home, hiss then firm latch. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-DOOR-FIRE-OPEN` — Door - fire open

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | door_fire_open |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | panic-bar clunk plus the door-closer piston hiss. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-DOOR-GLASS-CLOSE` — Door - glass close

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | door_glass_close |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | soft stop with a pane ring. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-DOOR-GLASS-OPEN` — Door - glass open

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | door_glass_open |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | lighter glazed leaf, glass tap on the pull. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-DOOR-HANDLE` — Door handle / latch

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | door_handle |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | bare handle click used for settle latches. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-DOOR-IMPACT` — Door impact

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | door_impact |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | blunt thud on a leaf. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-DOOR-LOCKED` — Locked rattle

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | door_locked |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | handle turns, deadbolt refuses; clearly a "no". |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-DOOR-METAL-CLOSE` — Door - metal close

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | door_metal_close |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | weighty steel slam with a long metal ring. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-DOOR-METAL-OPEN` — Door - metal open

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | door_metal_open |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | heavy security bolt clunk and steel swing. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-DOOR-SPLINTER` — Door splintering

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | door_damaged |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | wood tearing crackle when a door takes fire. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-DOOR-UNLOCK` — Keycard unlock

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | door_unlocked |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | two-tone card chirp then the maglock bolt drops; clearly a "yes". |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-DOOR-WOOD-CLOSE` — Door - wood close

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | door_wood_close |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | timber leaf meets frame with a latch snap. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-DOOR-WOOD-OPEN` — Door - wood open

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | door_wood_open |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | timber office door: handle, latch, swing, optional hinge creak. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-DRYFIRE` — Dry fire

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_dry |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | hollow firing-pin double click that instantly reads as "empty". |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-FIRE-PISTOL` — NW-9 pistol fire

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_nw9_fire |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | snappy sidearm report: sharp mid crack, modest low thump, short indoor tail; heard from another room the same shot must become duller and longer. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-FIRE-RIFLE` — KD-4 carbine fire

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_kd4_fire |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | authoritative rifle report: hard transient, chest-weight thump, controlled tail; heard from another room the same shot must become duller and longer. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-FIRE-SHOTGUN` — CS-12 shotgun fire

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_cs12_fire |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | huge low boom with wide noise burst; reads as the heaviest close-range weapon; heard from another room the same shot must become duller and longer. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-FIRE-SMG` — VK-7 SMG fire

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_vk7_fire |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | compact fast report distinct from the carbine; slightly brighter crack; heard from another room the same shot must become duller and longer. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-FIRE-SMG-SUPPRESSED` — VK-7 suppressed fire

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_vk7_fire_suppressed |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | quiet "thut" where the bolt is louder than the muzzle; clearly stealthy next to any unsuppressed shot. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-FIRE-SNIPER` — HL-700 rifle fire

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_hl700_fire |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | the loudest single shot in the game: deep body, longest rolling tail; heard from another room the same shot must become duller and longer. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-FLASH-DETONATE` — Flashbang detonation

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | gadget_flash_detonate |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | brutal full-band crack, the loudest transient in the game. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-FLASH-RING` — Flash tinnitus ring

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | gadget_flash_ring |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | high whine that stands in for deafness after a close flash; duration scales with proximity. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-FOOT-CARPET` — Footstep - carpet

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | footstep_carpet |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | soft muffled compression, almost no transient; 3-4 randomised variants + pitch jitter so repeats never machine-gun; crouched steps softer and duller. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-FOOT-CONCRETE` — Footstep - concrete

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | footstep_concrete |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | gritty mid thud; 3-4 randomised variants + pitch jitter so repeats never machine-gun; crouched steps softer and duller. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-FOOT-GEAR` — Clothing/gear rustle

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | clothing_rustle |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | cloth movement with occasional sling tick. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-FOOT-LAND` — Landing thump

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | player_land |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | body-weight thud scaled by fall impact, with gear rustle. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-FOOT-METAL` — Footstep - metal

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | footstep_metal |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | thud plus resonant panel ring; 3-4 randomised variants + pitch jitter so repeats never machine-gun; crouched steps softer and duller. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-FOOT-SCUFF` — Stair/ladder scuff

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | stair_scuff |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | short sole scrape for stairs and ladders. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-FOOT-SNOW` — Footstep - snow

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | footstep_snow |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | granular crunch, no ring; 3-4 randomised variants + pitch jitter so repeats never machine-gun; crouched steps softer and duller. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-FOOT-TILE` — Footstep - tile

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | footstep_tile |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | hard heel click with a faint ceramic ring; 3-4 randomised variants + pitch jitter so repeats never machine-gun; crouched steps softer and duller. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-FOOT-VINYL` — Footstep - vinyl

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | footstep_vinyl |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | dull slap with occasional sole squeak; 3-4 randomised variants + pitch jitter so repeats never machine-gun; crouched steps softer and duller. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-FOOT-WOOD` — Footstep - wood

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | footstep_wood |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | hollow thock; 3-4 randomised variants + pitch jitter so repeats never machine-gun; crouched steps softer and duller. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-GADGET-BOUNCE` — Grenade bounce

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | gadget_bounce |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | small hard clack with a metal ping per bounce. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-GADGET-THROW` — Grenade throw

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | gadget_throw |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | pin click + arm swish. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-GLASS-CRACK` — Glass crack

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | glass_crack |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | sharp ping cluster for a pane taking damage without failing. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-GLASS-FRAGMENTS` — Glass fragments settle

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | glass_fragments |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | sparse late tinkles after a shatter. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-GLASS-SHATTER` — Glass shatter

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | glass_shatter |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | full pane failure: burst plus a rain of shard pings. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-IMPACT-CONCRETE` — Bullet impact - concrete

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | impact_concrete |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | sharp crack with grit spray; positional at the hit point. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-IMPACT-DRYWALL` — Bullet impact - drywall

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | impact_drywall |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | papery punch-through with powder rain; positional at the hit point. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-IMPACT-ELECTRONIC` — Bullet impact - electronic

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | impact_electronic |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | crunch with an electrical fizz; positional at the hit point. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-IMPACT-FLESH` — Bullet impact - flesh

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | impact_flesh |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | wet smack with low body; unmistakably a hit; positional at the hit point. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-IMPACT-GLASS` — Bullet impact - glass

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | impact_glass |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | brittle tick with small shard pings; positional at the hit point. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-IMPACT-METAL` — Bullet impact - metal

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | impact_metal |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | clang with a decaying ring; positional at the hit point. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-IMPACT-PLASTIC` — Bullet impact - plastic

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | impact_plastic |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | dry double snap; positional at the hit point. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-IMPACT-SNOW` — Bullet impact - snow

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | impact_snow |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | soft muffled puff; positional at the hit point. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-IMPACT-SOFT` — Bullet impact - soft

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | impact_soft |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | dull puff for fabric/paper/cushions; positional at the hit point. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-IMPACT-WOOD` — Bullet impact - wood

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | impact_wood |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | hollow thock with splinter crackle; positional at the hit point. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-LOCKER-RATTLE` — Locker rattle

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | locker_rattle |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | thin sheet-metal knock with a rattling resonance. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-CS12-DRAW` — CS-12 shotgun draw

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_cs12_draw |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | cloth-and-metal swish of the weapon coming up; weight scaled to the CS-12 shotgun. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-CS12-INSPECT` — CS-12 shotgun inspect

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_cs12_inspect |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | gentle turn-over rattle, no urgency; weight scaled to the CS-12 shotgun. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-CS12-MAG-IN` — CS-12 shotgun mag in

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_cs12_mag_in |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | fresh magazine seated with a positive slap; weight scaled to the CS-12 shotgun. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-CS12-MAG-OUT` — CS-12 shotgun mag out

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_cs12_mag_out |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | magazine sliding free and caught by hand; weight scaled to the CS-12 shotgun. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-CS12-PUMP` — Pump action

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_cs12_cycle |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | two-stroke shk-shk with shell rattle; must sell the CS-12 cadence. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-CS12-RELOAD-END` — CS-12 shotgun reload end

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_cs12_reload_end |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | slide/bolt released, round chambered; the "ready again" punctuation; weight scaled to the CS-12 shotgun. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-CS12-RELOAD-START` — CS-12 shotgun reload start

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_cs12_reload_start |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | grip shift + mag release; starts every reload; weight scaled to the CS-12 shotgun. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-GADGET-DRAW` — Grenade draw

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_flash_draw |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | cloth swish plus canister tink (flash + smoke share it). |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-HL700-BOLT` — Bolt cycle

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_hl700_cycle |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | up-draw-ping-push-down five-beat bolt work with a case ping. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-HL700-DRAW` — HL-700 rifle draw

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_hl700_draw |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | cloth-and-metal swish of the weapon coming up; weight scaled to the HL-700 rifle. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-HL700-INSPECT` — HL-700 rifle inspect

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_hl700_inspect |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | gentle turn-over rattle, no urgency; weight scaled to the HL-700 rifle. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-HL700-MAG-IN` — HL-700 rifle mag in

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_hl700_mag_in |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | fresh magazine seated with a positive slap; weight scaled to the HL-700 rifle. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-HL700-MAG-OUT` — HL-700 rifle mag out

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_hl700_mag_out |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | magazine sliding free and caught by hand; weight scaled to the HL-700 rifle. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-HL700-RELOAD-END` — HL-700 rifle reload end

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_hl700_reload_end |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | slide/bolt released, round chambered; the "ready again" punctuation; weight scaled to the HL-700 rifle. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-HL700-RELOAD-START` — HL-700 rifle reload start

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_hl700_reload_start |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | grip shift + mag release; starts every reload; weight scaled to the HL-700 rifle. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-HOLSTER` — Holster

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_holster |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | soft cloth + settle; the inverse of draw. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-KD4-CHARGE` — Charging handle

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_kd4_cycle |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | scrape back then spring slam forward; shared by pistol/SMG/carbine. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-KD4-DRAW` — KD-4 carbine draw

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_kd4_draw |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | cloth-and-metal swish of the weapon coming up; weight scaled to the KD-4 carbine. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-KD4-INSPECT` — KD-4 carbine inspect

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_kd4_inspect |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | gentle turn-over rattle, no urgency; weight scaled to the KD-4 carbine. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-KD4-MAG-IN` — KD-4 carbine mag in

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_kd4_mag_in |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | fresh magazine seated with a positive slap; weight scaled to the KD-4 carbine. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-KD4-MAG-OUT` — KD-4 carbine mag out

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_kd4_mag_out |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | magazine sliding free and caught by hand; weight scaled to the KD-4 carbine. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-KD4-RELOAD-END` — KD-4 carbine reload end

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_kd4_reload_end |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | slide/bolt released, round chambered; the "ready again" punctuation; weight scaled to the KD-4 carbine. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-KD4-RELOAD-START` — KD-4 carbine reload start

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_kd4_reload_start |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | grip shift + mag release; starts every reload; weight scaled to the KD-4 carbine. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-MODESWITCH` — Fire selector

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_mode_switch |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | tiny two-detent click. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-NW9-DRAW` — NW-9 pistol draw

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_nw9_draw |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | cloth-and-metal swish of the weapon coming up; weight scaled to the NW-9 pistol. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-NW9-INSPECT` — NW-9 pistol inspect

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_nw9_inspect |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | gentle turn-over rattle, no urgency; weight scaled to the NW-9 pistol. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-NW9-MAG-IN` — NW-9 pistol mag in

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_nw9_mag_in |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | fresh magazine seated with a positive slap; weight scaled to the NW-9 pistol. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-NW9-MAG-OUT` — NW-9 pistol mag out

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_nw9_mag_out |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | magazine sliding free and caught by hand; weight scaled to the NW-9 pistol. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-NW9-RELOAD-END` — NW-9 pistol reload end

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_nw9_reload_end |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | slide/bolt released, round chambered; the "ready again" punctuation; weight scaled to the NW-9 pistol. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-NW9-RELOAD-START` — NW-9 pistol reload start

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_nw9_reload_start |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | grip shift + mag release; starts every reload; weight scaled to the NW-9 pistol. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-TALON-DRAW` — Talon knife draw

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_talon_draw |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | cloth-and-metal swish of the weapon coming up |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-TALON-INSPECT` — Talon knife inspect

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_talon_inspect |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | gentle turn-over rattle, no urgency |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-TALON-MAG-IN` — Talon knife mag in

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_talon_mag_in |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | fresh magazine seated with a positive slap |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-TALON-MAG-OUT` — Talon knife mag out

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_talon_mag_out |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | magazine sliding free and caught by hand |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-TALON-RELOAD-END` — Talon knife reload end

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_talon_reload_end |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | slide/bolt released, round chambered; the "ready again" punctuation |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-TALON-RELOAD-START` — Talon knife reload start

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_talon_reload_start |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | grip shift + mag release; starts every reload |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-VK7-DRAW` — VK-7 SMG draw

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_vk7_draw |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | cloth-and-metal swish of the weapon coming up; weight scaled to the VK-7 SMG. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-VK7-INSPECT` — VK-7 SMG inspect

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_vk7_inspect |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | gentle turn-over rattle, no urgency; weight scaled to the VK-7 SMG. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-VK7-MAG-IN` — VK-7 SMG mag in

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_vk7_mag_in |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | fresh magazine seated with a positive slap; weight scaled to the VK-7 SMG. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-VK7-MAG-OUT` — VK-7 SMG mag out

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_vk7_mag_out |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | magazine sliding free and caught by hand; weight scaled to the VK-7 SMG. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-VK7-RELOAD-END` — VK-7 SMG reload end

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_vk7_reload_end |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | slide/bolt released, round chambered; the "ready again" punctuation; weight scaled to the VK-7 SMG. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MECH-VK7-RELOAD-START` — VK-7 SMG reload start

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_vk7_reload_start |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | grip shift + mag release; starts every reload; weight scaled to the VK-7 SMG. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MELEE-HIT-FLESH` — Melee hit (flesh)

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | melee_hit_flesh |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | wet muffled thud with low weight. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MELEE-HIT-WORLD` — Melee hit (world)

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | melee_hit_world |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | hard thock with a faint metallic edge. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MELEE-SLASH` — Knife slash

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_talon_slash |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | rising air whoosh, no contact. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-MELEE-STAB` — Knife stab

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_talon_stab |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | shorter, harder thrust whoosh. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-PAPER-RUSTLE` — Paper rustle

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | paper_rustle |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | dry page flutter. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-PICKUP-KEYCARD` — Keycard pickup

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | pickup_keycard |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | plastic snap plus a rising two-note chirp; rewarding. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-RICOCHET` — Ricochet

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | ricochet |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | classic descending zing; probability follows SURFACE_PROPS.ricochet. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-SHELL-PISTOL` — Pistol brass drop

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | shell_pistol |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | bright tinkling brass settling on hard floor; dull tick on carpet/snow. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-SHELL-RIFLE` — Rifle brass drop

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | shell_rifle |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | slightly deeper brass ring with a settle pattern; surface aware. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-SHELL-SHOTGUN` — Shotgun hull drop

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | shell_shotgun |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | plastic clunk, no ring; clearly not brass. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-SHUTTER-MOTOR` — Garage shutter motor

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | door_shutter_motor |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | geared motor drone with slat rattle while the shutter travels. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-SHUTTER-STOP` — Garage shutter stop

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | door_shutter_stop |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | heavy end-stop clunk and settling rattle. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-SMOKE-HISS` — Smoke hiss

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | gadget_smoke_hiss |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | pressurised hiss loop that thins as the canister empties (~13 s). |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-SMOKE-POP` — Smoke pop

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | gadget_smoke_pop |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | dull canister pop. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-SPARK` — Electrical sparks

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | spark |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | crackling arc burst for damaged electronics. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-TAIL-PISTOL` — NW-9 pistol distant tail

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_nw9_tail |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | standalone low-passed reverberant wash for shots heard far away or through walls. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-TAIL-RIFLE` — KD-4 carbine distant tail

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_kd4_tail |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | standalone low-passed reverberant wash for shots heard far away or through walls. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-TAIL-SHOTGUN` — CS-12 shotgun distant tail

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_cs12_tail |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | standalone low-passed reverberant wash for shots heard far away or through walls. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-TAIL-SMG` — VK-7 SMG distant tail

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_vk7_tail |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | standalone low-passed reverberant wash for shots heard far away or through walls. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `SFX-TAIL-SNIPER` — HL-700 rifle distant tail

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | weapon_hl700_tail |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | standalone low-passed reverberant wash for shots heard far away or through walls. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `UI-ANNOUNCE-ALERT` — Announcement (alert/danger)

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | announce_alert |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | falling minor two-note blip; reads as warning. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `UI-ANNOUNCE-GOOD` — Announcement (good/info)

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | announce_good |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | rising two-note blip under HUD announcements; ducks SFX. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `UI-BACK` — Menu back

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | ui_back |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | lower pluck; clearly "retreat" vs select. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `UI-DENY` — Denied

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | ui_deny |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | flat double buzz; unambiguous refusal. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `UI-HITMARKER` — Hitmarker

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | hitmarker |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | tiny dry tick confirming a hit; never fatiguing at full fire rate. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `UI-HITMARKER-HEADSHOT` — Headshot marker

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | hitmarker_headshot |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | brighter double tick, clearly distinct. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `UI-HITMARKER-KILL` — Kill confirm

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | hitmarker_kill |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | lower thock; full stop punctuation. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `UI-INTERACT-CONFIRM` — Interaction confirm

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | interact_confirm |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | small affirmative blip for generic INTERACT events. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `UI-MOVE` — Menu move

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | ui_move |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | near-subliminal tick. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `UI-PLAYER-DEATH` — Player death

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | player_death |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | long low collapse into silence. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `UI-PLAYER-HIT` — Player damage

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | player_hit |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | body thud scaled by damage taken. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `UI-SELECT` — Menu select

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | ui_select |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | short warm pluck; positive. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `UI-SLIDER` — Slider tick

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/sfx.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | ui_slider |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | pitch tracks the slider value so volume sliders audition themselves. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `VOX-ENEMY-BLINDED` — Enemy bark - blinded

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/vox.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | voice_enemy_blinded |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | wordless formant-synth vocalisation; panicked fast high syllables with tremor. Subtitles carry the words. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `VOX-ENEMY-CLEAR` — Enemy bark - clear

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/vox.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | voice_enemy_clear |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | wordless formant-synth vocalisation; relaxed falling stand-down. Subtitles carry the words. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `VOX-ENEMY-CONTACT` — Enemy bark - contact

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/vox.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | voice_enemy_contact |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | wordless formant-synth vocalisation; hard two-beat shout, falling: "seen you". Subtitles carry the words. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `VOX-ENEMY-COVER` — Enemy bark - cover

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/vox.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | voice_enemy_cover |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | wordless formant-synth vocalisation; quick two-beat drop call. Subtitles carry the words. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `VOX-ENEMY-DEATH` — Enemy death

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/vox.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | enemy_death |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | falling groan collapsing into breath plus gear hitting the floor. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `VOX-ENEMY-DOWN` — Enemy bark - down

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/vox.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | voice_enemy_down |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | wordless formant-synth vocalisation; alarmed two-beat casualty call. Subtitles carry the words. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `VOX-ENEMY-FLANK` — Enemy bark - flank

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/vox.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | voice_enemy_flank |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | wordless formant-synth vocalisation; directed three-beat command. Subtitles carry the words. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `VOX-ENEMY-HIT` — Enemy bark - hit

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/vox.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | voice_enemy_hit |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | wordless formant-synth vocalisation; clenched pain grunt, 0.2 s. Subtitles carry the words. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `VOX-ENEMY-INVESTIGATE` — Enemy bark - investigate

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/vox.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | voice_enemy_investigate |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | wordless formant-synth vocalisation; neutral checking-it-out phrase. Subtitles carry the words. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `VOX-ENEMY-LOST` — Enemy bark - lost

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/vox.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | voice_enemy_lost |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | wordless formant-synth vocalisation; rising frustrated "where did he go". Subtitles carry the words. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `VOX-ENEMY-LOUD` — Enemy bark - loud

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/vox.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | voice_enemy_loud |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | wordless formant-synth vocalisation; facility-wide radio order, hard drive. Subtitles carry the words. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `VOX-ENEMY-MOVING` — Enemy bark - moving

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/vox.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | voice_enemy_moving |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | wordless formant-synth vocalisation; short rising push call. Subtitles carry the words. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `VOX-ENEMY-RADIO` — Enemy bark - radio

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/vox.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | voice_enemy_radio |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | wordless formant-synth vocalisation; band-passed radio call with squelch clicks. Subtitles carry the words. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `VOX-ENEMY-RELOAD` — Enemy bark - reload

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/vox.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | voice_enemy_reload |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | wordless formant-synth vocalisation; urgent three-beat call. Subtitles carry the words. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `VOX-ENEMY-RETREAT` — Enemy bark - retreat

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/vox.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | voice_enemy_retreat |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | wordless formant-synth vocalisation; strained falling withdrawal call. Subtitles carry the words. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `VOX-ENEMY-SEARCHING` — Enemy bark - searching

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/vox.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | voice_enemy_searching |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | wordless formant-synth vocalisation; clipped sweep-pattern phrase. Subtitles carry the words. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `VOX-ENEMY-SUPPRESS` — Enemy bark - suppress

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/vox.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | voice_enemy_suppress |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | wordless formant-synth vocalisation; hardest sustained shout. Subtitles carry the words. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `VOX-ENEMY-SUSPICIOUS` — Enemy bark - suspicious

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/vox.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | voice_enemy_suspicious |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | wordless formant-synth vocalisation; rising wary question shape. Subtitles carry the words. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `VOX-HOSTAGE-BREATHING` — Hostage - breathing

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/vox.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | voice_hostage_breathing |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | wordless formant-synth vocalisation, higher and breathier than hostiles; shaky fear breathing cycles while bound. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `VOX-HOSTAGE-DEATH` — Hostage - death

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/vox.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | voice_hostage_death |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | wordless formant-synth vocalisation, higher and breathier than hostiles; cut-off cry falling away; the worst sound in the game. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `VOX-HOSTAGE-FOLLOW` — Hostage - follow

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/vox.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | voice_hostage_follow |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | wordless formant-synth vocalisation, higher and breathier than hostiles; quick tight assent when told to follow. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `VOX-HOSTAGE-RELIEVED` — Hostage - relieved

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/vox.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | voice_hostage_relieved |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | wordless formant-synth vocalisation, higher and breathier than hostiles; long settling exhale: relief without words. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `VOX-HOSTAGE-SCARED` — Hostage - scared

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/vox.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | voice_hostage_scared |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | wordless formant-synth vocalisation, higher and breathier than hostiles; sharp frightened cry when approached/grabbed. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `VOX-HOSTAGE-SOB` — Hostage - sob

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/vox.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | voice_hostage_sob |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | wordless formant-synth vocalisation, higher and breathier than hostiles; three small whimpers with tremor. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `VOX-HOSTAGE-WAIT` — Hostage - wait

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/vox.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | voice_hostage_wait |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | wordless formant-synth vocalisation, higher and breathier than hostiles; soft acknowledgement when told to wait. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |

### `VOX-PLAYER-HURT` — Player pain grunt

| Field | Value |
| --- | --- |
| Category | audio |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/audio/vox.js |
| Rooms / game states | — |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | none |
| LOD | n/a - synthesised at runtime, zero assets on disk |
| Audio dependencies | voice_player_hurt |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | brief clenched grunt on meaningful damage. |
| Playwright evidence | headless synthesis smoke test (see src/audio/README.md) |
| Remaining discrepancies | none |


## breakroom (19)

### `BREAK-BIN-RECYCLE` — Recycling Bin

| Field | Value |
| --- | --- |
| Category | breakroom |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | many |
| Dimensions (w × h × d) | 0.40 × 0.58 × 0.40 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 4 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `BREAK-BIN-TRASH` — Trash Bin

| Field | Value |
| --- | --- |
| Category | breakroom |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | many |
| Dimensions (w × h × d) | 0.40 × 0.58 × 0.40 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 3 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `BREAK-CAB-BASE` — Kitchen Base Cabinet

| Field | Value |
| --- | --- |
| Category | breakroom |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | breakroom |
| Dimensions (w × h × d) | 0.60 × 0.76 × 0.60 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | laminate |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `BREAK-CAB-WALL` — Kitchen Wall Cabinet

| Field | Value |
| --- | --- |
| Category | breakroom |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | breakroom |
| Dimensions (w × h × d) | 0.60 × 0.70 × 0.34 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | laminate |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `BREAK-COFFEE` — Drip Coffee Machine + Carafe

| Field | Value |
| --- | --- |
| Category | breakroom |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | breakroom |
| Dimensions (w × h × d) | 0.22 × 0.36 × 0.30 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic, glass |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `BREAK-COUNTER-SINK` — Countertop with Sink

| Field | Value |
| --- | --- |
| Category | breakroom |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | breakroom |
| Dimensions (w × h × d) | 1.80 × 0.95 × 0.64 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | laminate, stainless, chrome |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `BREAK-CUP-PAPER` — Paper Cup

| Field | Value |
| --- | --- |
| Category | breakroom |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | breakroom, openoffice |
| Dimensions (w × h × d) | 0.08 × 0.12 × 0.08 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paper |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 8 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `BREAK-FOODBOX` — Food Container

| Field | Value |
| --- | --- |
| Category | breakroom |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | breakroom |
| Dimensions (w × h × d) | 0.18 × 0.08 × 0.13 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `BREAK-FRIDGE` — Refrigerator

| Field | Value |
| --- | --- |
| Category | breakroom |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | breakroom |
| Dimensions (w × h × d) | 0.72 × 1.80 × 0.72 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | stainless |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `BREAK-KETTLE` — Electric Kettle

| Field | Value |
| --- | --- |
| Category | breakroom |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | breakroom |
| Dimensions (w × h × d) | 0.19 × 0.24 × 0.19 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | stainless |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `BREAK-MICROWAVE` — Microwave

| Field | Value |
| --- | --- |
| Category | breakroom |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | breakroom |
| Dimensions (w × h × d) | 0.50 × 0.30 × 0.38 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic, led-emissive |
| Texture maps | baseColor, normal, roughness, ao, emissive |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `BREAK-MUG` — Ceramic Mug

| Field | Value |
| --- | --- |
| Category | breakroom |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | breakroom, openoffice |
| Dimensions (w × h × d) | 0.09 × 0.10 × 0.09 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | ceramic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 10 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `BREAK-NOTICEBOARD` — Cork Notice Board (pinned)

| Field | Value |
| --- | --- |
| Category | breakroom |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | breakroom, midcorr |
| Dimensions (w × h × d) | 1.24 × 0.94 × 0.05 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | cork, wood, paper |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `BREAK-PLATE` — Plate

| Field | Value |
| --- | --- |
| Category | breakroom |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | breakroom |
| Dimensions (w × h × d) | 0.22 × 0.02 × 0.22 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | ceramic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `BREAK-SNACK` — Snack Packet

| Field | Value |
| --- | --- |
| Category | breakroom |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | breakroom |
| Dimensions (w × h × d) | 0.09 × 0.13 × 0.05 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `BREAK-SOAP-DISP` — Soap Dispenser

| Field | Value |
| --- | --- |
| Category | breakroom |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | breakroom, restrooms |
| Dimensions (w × h × d) | 0.11 × 0.17 × 0.11 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `BREAK-TOWEL-DISP` — Paper Towel Dispenser

| Field | Value |
| --- | --- |
| Category | breakroom |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | breakroom, restrooms |
| Dimensions (w × h × d) | 0.29 × 0.38 × 0.12 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic, paper |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `BREAK-VENDING` — Vending Machine "Polar Pantry"

| Field | Value |
| --- | --- |
| Category | breakroom |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | breakroom, midcorr |
| Dimensions (w × h × d) | 0.95 × 1.83 × 0.80 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paintedMetal, glass, screen-emissive |
| Texture maps | baseColor, normal, roughness, ao, emissive |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `BREAK-WATERCOOLER` — Water Cooler with Bottle

| Field | Value |
| --- | --- |
| Category | breakroom |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | openoffice, breakroom |
| Dimensions (w × h × d) | 0.36 × 1.40 × 0.36 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic, glass |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |


## character (40)

### `ANIM-ADS` — Viewmodel animation — ads

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/viewmodel.js, src/characters/weapons-models.js |
| Rooms / game states | viewmodel overlay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | n/a |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Magazine physically leaves/returns; empty reload cycles the action; sights align at ADS. |
| Playwright evidence | tests/viewmodel.spec.js |
| Remaining discrepancies | none |

### `ANIM-AIM` — Rig animation — aim

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | all characters |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | procedural, LOD-independent |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Feet plant from real speed (no sliding); crossfades without pops; additive layers stack. |
| Playwright evidence | tests/characters.spec.js |
| Remaining discrepancies | none |

### `ANIM-BREATHING` — Rig animation — breathing

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | all characters |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | procedural, LOD-independent |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Feet plant from real speed (no sliding); crossfades without pops; additive layers stack. |
| Playwright evidence | tests/characters.spec.js |
| Remaining discrepancies | none |

### `ANIM-CROUCH-IDLE` — Rig animation — crouch_idle

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | all characters |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | procedural, LOD-independent |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Feet plant from real speed (no sliding); crossfades without pops; additive layers stack. |
| Playwright evidence | tests/characters.spec.js |
| Remaining discrepancies | none |

### `ANIM-CROUCH-WALK` — Rig animation — crouch_walk

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | all characters |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | procedural, LOD-independent |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Feet plant from real speed (no sliding); crossfades without pops; additive layers stack. |
| Playwright evidence | tests/characters.spec.js |
| Remaining discrepancies | none |

### `ANIM-DEATH-BACK` — Rig animation — death_back

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | all characters |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | procedural, LOD-independent |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Feet plant from real speed (no sliding); crossfades without pops; additive layers stack. |
| Playwright evidence | tests/characters.spec.js |
| Remaining discrepancies | none |

### `ANIM-DEATH-FORWARD` — Rig animation — death_forward

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | all characters |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | procedural, LOD-independent |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Feet plant from real speed (no sliding); crossfades without pops; additive layers stack. |
| Playwright evidence | tests/characters.spec.js |
| Remaining discrepancies | none |

### `ANIM-DEATH-SLUMP` — Rig animation — death_slump

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | all characters |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | procedural, LOD-independent |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Feet plant from real speed (no sliding); crossfades without pops; additive layers stack. |
| Playwright evidence | tests/characters.spec.js |
| Remaining discrepancies | none |

### `ANIM-FIRE` — Rig animation — fire

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | all characters |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | procedural, LOD-independent |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Feet plant from real speed (no sliding); crossfades without pops; additive layers stack. |
| Playwright evidence | tests/characters.spec.js |
| Remaining discrepancies | none |

### `ANIM-FLINCH` — Rig animation — flinch

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | all characters |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | procedural, LOD-independent |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Feet plant from real speed (no sliding); crossfades without pops; additive layers stack. |
| Playwright evidence | tests/characters.spec.js |
| Remaining discrepancies | none |

### `ANIM-GUARD` — Rig animation — guard

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | all characters |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | procedural, LOD-independent |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Feet plant from real speed (no sliding); crossfades without pops; additive layers stack. |
| Playwright evidence | tests/characters.spec.js |
| Remaining discrepancies | none |

### `ANIM-HOSTAGE-CROUCH` — Rig animation — hostage_crouch

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | all characters |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | procedural, LOD-independent |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Feet plant from real speed (no sliding); crossfades without pops; additive layers stack. |
| Playwright evidence | tests/characters.spec.js |
| Remaining discrepancies | none |

### `ANIM-HOSTAGE-EXTRACT` — Rig animation — hostage_extract

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | all characters |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | procedural, LOD-independent |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Feet plant from real speed (no sliding); crossfades without pops; additive layers stack. |
| Playwright evidence | tests/characters.spec.js |
| Remaining discrepancies | none |

### `ANIM-HOSTAGE-FEAR` — Rig animation — hostage_fear

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | all characters |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | procedural, LOD-independent |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Feet plant from real speed (no sliding); crossfades without pops; additive layers stack. |
| Playwright evidence | tests/characters.spec.js |
| Remaining discrepancies | none |

### `ANIM-HOSTAGE-FOLLOW` — Rig animation — hostage_follow

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | all characters |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | procedural, LOD-independent |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Feet plant from real speed (no sliding); crossfades without pops; additive layers stack. |
| Playwright evidence | tests/characters.spec.js |
| Remaining discrepancies | none |

### `ANIM-HOSTAGE-IDLE` — Rig animation — hostage_idle

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | all characters |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | procedural, LOD-independent |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Feet plant from real speed (no sliding); crossfades without pops; additive layers stack. |
| Playwright evidence | tests/characters.spec.js |
| Remaining discrepancies | none |

### `ANIM-HOSTAGE-STOP` — Rig animation — hostage_stop

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | all characters |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | procedural, LOD-independent |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Feet plant from real speed (no sliding); crossfades without pops; additive layers stack. |
| Playwright evidence | tests/characters.spec.js |
| Remaining discrepancies | none |

### `ANIM-IDLE` — Rig animation — idle

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | all characters |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | procedural, LOD-independent |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Feet plant from real speed (no sliding); crossfades without pops; additive layers stack. |
| Playwright evidence | tests/characters.spec.js |
| Remaining discrepancies | none |

### `ANIM-INVESTIGATE` — Rig animation — investigate

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | all characters |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | procedural, LOD-independent |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Feet plant from real speed (no sliding); crossfades without pops; additive layers stack. |
| Playwright evidence | tests/characters.spec.js |
| Remaining discrepancies | none |

### `ANIM-RELOAD` — Rig animation — reload

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | all characters |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | procedural, LOD-independent |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Feet plant from real speed (no sliding); crossfades without pops; additive layers stack. |
| Playwright evidence | tests/characters.spec.js |
| Remaining discrepancies | none |

### `ANIM-RELOAD-EMPTY` — Viewmodel animation — reload-empty

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/viewmodel.js, src/characters/weapons-models.js |
| Rooms / game states | viewmodel overlay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | n/a |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Magazine physically leaves/returns; empty reload cycles the action; sights align at ADS. |
| Playwright evidence | tests/viewmodel.spec.js |
| Remaining discrepancies | none |

### `ANIM-RELOAD-TACTICAL` — Viewmodel animation — reload-tactical

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/viewmodel.js, src/characters/weapons-models.js |
| Rooms / game states | viewmodel overlay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | n/a |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Magazine physically leaves/returns; empty reload cycles the action; sights align at ADS. |
| Playwright evidence | tests/viewmodel.spec.js |
| Remaining discrepancies | none |

### `ANIM-RUN` — Rig animation — run

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | all characters |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | procedural, LOD-independent |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Feet plant from real speed (no sliding); crossfades without pops; additive layers stack. |
| Playwright evidence | tests/characters.spec.js |
| Remaining discrepancies | none |

### `ANIM-SEARCH` — Rig animation — search

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | all characters |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | procedural, LOD-independent |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Feet plant from real speed (no sliding); crossfades without pops; additive layers stack. |
| Playwright evidence | tests/characters.spec.js |
| Remaining discrepancies | none |

### `ANIM-TAKE-COVER` — Rig animation — take_cover

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | all characters |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | procedural, LOD-independent |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Feet plant from real speed (no sliding); crossfades without pops; additive layers stack. |
| Playwright evidence | tests/characters.spec.js |
| Remaining discrepancies | none |

### `ANIM-TURN-LEFT` — Rig animation — turn_left

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | all characters |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | procedural, LOD-independent |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Feet plant from real speed (no sliding); crossfades without pops; additive layers stack. |
| Playwright evidence | tests/characters.spec.js |
| Remaining discrepancies | none |

### `ANIM-TURN-RIGHT` — Rig animation — turn_right

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | all characters |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | procedural, LOD-independent |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Feet plant from real speed (no sliding); crossfades without pops; additive layers stack. |
| Playwright evidence | tests/characters.spec.js |
| Remaining discrepancies | none |

### `ANIM-VM-DRAW` — Viewmodel animation — vm-draw

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/viewmodel.js, src/characters/weapons-models.js |
| Rooms / game states | viewmodel overlay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | n/a |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Magazine physically leaves/returns; empty reload cycles the action; sights align at ADS. |
| Playwright evidence | tests/viewmodel.spec.js |
| Remaining discrepancies | none |

### `ANIM-VM-INSPECT` — Viewmodel animation — vm-inspect

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/viewmodel.js, src/characters/weapons-models.js |
| Rooms / game states | viewmodel overlay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | n/a |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Magazine physically leaves/returns; empty reload cycles the action; sights align at ADS. |
| Playwright evidence | tests/viewmodel.spec.js |
| Remaining discrepancies | none |

### `ANIM-WALK` — Rig animation — walk

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | all characters |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | — |
| Texture maps | — |
| Collision | n/a |
| LOD | procedural, LOD-independent |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Feet plant from real speed (no sliding); crossfades without pops; additive layers stack. |
| Playwright evidence | tests/characters.spec.js |
| Remaining discrepancies | none |

### `CHAR-ENEMY-BREACHER` — Ash Vector Breacher (heavy plate carrier, knee pads, balaclava)

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/enemy-model.js, src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | vestibule, lobby, loading, garage |
| Dimensions (w × h × d) | 0.62 × 1.78 × 0.42 m |
| Pivot & orientation | feet centre, -Z forward |
| Material slots | fabric, armour plate, skin, rubber, metal, leather |
| Texture maps | procedural fabric/plastic sets, canvas insignia patch |
| Collision | capsule (AI-owned) + per-bone hit boxes |
| LOD | segmented full body <18 m, 12-mesh simplified beyond |
| Animation states | idle, breathing, guard, walk, run, crouch_idle, crouch_walk, turn_left, turn_right, aim, fire, reload, flinch, take_cover, investigate, search, death_forward, death_back, death_slump, hostage_idle, hostage_fear, hostage_crouch, hostage_follow, hostage_stop, hostage_extract |
| Audio dependencies | enemy voice + foley (audio engine) |
| Instances in level | 7 |
| Status | **integrated** |
| Acceptance criteria | Consistent human scale (1.78 m), distinct silhouette per variant, head 4.0x/chest 1.0x/stomach 1.25x/limbs 0.75x hit regions, no mesh separation at joints, shadows on. |
| Playwright evidence | tests/characters.spec.js + gallery screenshots |
| Remaining discrepancies | none |

### `CHAR-ENEMY-MARKSMAN` — Ash Vector Marksman (long coat, shoulder rig, cap + headset)

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/enemy-model.js, src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | execcorr, upperlanding, archive, conference |
| Dimensions (w × h × d) | 0.56 × 1.80 × 0.40 m |
| Pivot & orientation | feet centre, -Z forward |
| Material slots | fabric, armour plate, skin, rubber, metal, leather |
| Texture maps | procedural fabric/plastic sets, canvas insignia patch |
| Collision | capsule (AI-owned) + per-bone hit boxes |
| LOD | segmented full body <18 m, 12-mesh simplified beyond |
| Animation states | idle, breathing, guard, walk, run, crouch_idle, crouch_walk, turn_left, turn_right, aim, fire, reload, flinch, take_cover, investigate, search, death_forward, death_back, death_slump, hostage_idle, hostage_fear, hostage_crouch, hostage_follow, hostage_stop, hostage_extract |
| Audio dependencies | enemy voice + foley (audio engine) |
| Instances in level | 3 |
| Status | **integrated** |
| Acceptance criteria | Consistent human scale (1.78 m), distinct silhouette per variant, head 4.0x/chest 1.0x/stomach 1.25x/limbs 0.75x hit regions, no mesh separation at joints, shadows on. |
| Playwright evidence | tests/characters.spec.js + gallery screenshots |
| Remaining discrepancies | none |

### `CHAR-ENEMY-RUNNER` — Ash Vector Runner (light jacket, chest rig, beanie/respirator)

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/enemy-model.js, src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | openoffice, midcorr, breakroom, servicecorr |
| Dimensions (w × h × d) | 0.52 × 1.78 × 0.36 m |
| Pivot & orientation | feet centre, -Z forward |
| Material slots | fabric, armour plate, skin, rubber, metal, leather |
| Texture maps | procedural fabric/plastic sets, canvas insignia patch |
| Collision | capsule (AI-owned) + per-bone hit boxes |
| LOD | segmented full body <18 m, 12-mesh simplified beyond |
| Animation states | idle, breathing, guard, walk, run, crouch_idle, crouch_walk, turn_left, turn_right, aim, fire, reload, flinch, take_cover, investigate, search, death_forward, death_back, death_slump, hostage_idle, hostage_fear, hostage_crouch, hostage_follow, hostage_stop, hostage_extract |
| Audio dependencies | enemy voice + foley (audio engine) |
| Instances in level | 3 |
| Status | **integrated** |
| Acceptance criteria | Consistent human scale (1.78 m), distinct silhouette per variant, head 4.0x/chest 1.0x/stomach 1.25x/limbs 0.75x hit regions, no mesh separation at joints, shadows on. |
| Playwright evidence | tests/characters.spec.js + gallery screenshots |
| Remaining discrepancies | none |

### `CHAR-HEAD-BALACLAVA` — Head variation — balaclava

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/enemy-model.js, src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | all combat |
| Dimensions (w × h × d) | 0.20 × 0.28 × 0.24 m |
| Pivot & orientation | neck joint |
| Material slots | skin, fabric, rubber, plastic |
| Texture maps | procedural |
| Collision | head hit box (4.0x) |
| LOD | hidden on simplified body |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Brow, nose bridge and cheekbones read at 2 m; overlay never clips the skull. |
| Playwright evidence | gallery screenshots |
| Remaining discrepancies | none |

### `CHAR-HEAD-BEANIE` — Head variation — beanie

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/enemy-model.js, src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | all combat |
| Dimensions (w × h × d) | 0.20 × 0.28 × 0.24 m |
| Pivot & orientation | neck joint |
| Material slots | skin, fabric, rubber, plastic |
| Texture maps | procedural |
| Collision | head hit box (4.0x) |
| LOD | hidden on simplified body |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Brow, nose bridge and cheekbones read at 2 m; overlay never clips the skull. |
| Playwright evidence | gallery screenshots |
| Remaining discrepancies | none |

### `CHAR-HEAD-HEADSET` — Head variation — headset

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/enemy-model.js, src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | all combat |
| Dimensions (w × h × d) | 0.20 × 0.28 × 0.24 m |
| Pivot & orientation | neck joint |
| Material slots | skin, fabric, rubber, plastic |
| Texture maps | procedural |
| Collision | head hit box (4.0x) |
| LOD | hidden on simplified body |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Brow, nose bridge and cheekbones read at 2 m; overlay never clips the skull. |
| Playwright evidence | gallery screenshots |
| Remaining discrepancies | none |

### `CHAR-HEAD-RESPIRATOR` — Head variation — respirator

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/enemy-model.js, src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | all combat |
| Dimensions (w × h × d) | 0.20 × 0.28 × 0.24 m |
| Pivot & orientation | neck joint |
| Material slots | skin, fabric, rubber, plastic |
| Texture maps | procedural |
| Collision | head hit box (4.0x) |
| LOD | hidden on simplified body |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Brow, nose bridge and cheekbones read at 2 m; overlay never clips the skull. |
| Playwright evidence | gallery screenshots |
| Remaining discrepancies | none |

### `CHAR-HOSTAGE-ANALYST` — Dr. Rhea Calloway (cardigan, lanyard, glasses)

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/hostage-model.js, src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | conference |
| Dimensions (w × h × d) | 0.48 × 1.67 × 0.34 m |
| Pivot & orientation | feet centre, -Z forward |
| Material slots | fabric, skin, plastic, leather |
| Texture maps | procedural, canvas ID badge |
| Collision | capsule + hit boxes |
| LOD | segmented full body <18 m, simplified beyond |
| Animation states | hostage_idle, hostage_fear, hostage_crouch, hostage_follow, hostage_stop, hostage_extract |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Bound-wrists pose while captive; zip-tie removed and hands-free poses after securing. |
| Playwright evidence | tests/hostages.spec.js |
| Remaining discrepancies | none |

### `CHAR-HOSTAGE-DIRECTOR` — Martin Oyelaran (shirt sleeves, tie, ID badge)

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/hostage-model.js, src/characters/rig.js, src/characters/animation.js |
| Rooms / game states | execoffice |
| Dimensions (w × h × d) | 0.52 × 1.78 × 0.36 m |
| Pivot & orientation | feet centre, -Z forward |
| Material slots | fabric, skin, leather |
| Texture maps | procedural, canvas ID badge |
| Collision | capsule + hit boxes |
| LOD | segmented full body <18 m, simplified beyond |
| Animation states | hostage_idle, hostage_fear, hostage_crouch, hostage_follow, hostage_stop, hostage_extract |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Bound-wrists pose while captive; zip-tie removed and hands-free poses after securing. |
| Playwright evidence | tests/hostages.spec.js |
| Remaining discrepancies | none |

### `CHAR-VM-ARMS` — First-person arms (tactical gloves, articulated fingers)

| Field | Value |
| --- | --- |
| Category | character |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/viewmodel.js, src/characters/weapons-models.js |
| Rooms / game states | viewmodel overlay |
| Dimensions (w × h × d) | 0.08 × 0.10 × 0.45 m |
| Pivot & orientation | wrist |
| Material slots | glove fabric, knuckle plastic, sleeve fabric, skin |
| Texture maps | procedural |
| Collision | none |
| LOD | single (overlay only) |
| Animation states | draw, holster, idle, fire, ads_in, ads_out, reload_tactical, reload_empty, dry_fire, recoil_recovery, movement_sway, landing, inspect |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Trigger finger on the trigger, support hand on handguard/pump; no self-clipping; overlay pass never intersects walls. |
| Playwright evidence | tests/viewmodel.spec.js |
| Remaining discrepancies | none |


## clutter (30)

### `CLUT-BACKPACK` — Backpack

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | openoffice |
| Dimensions (w × h × d) | 0.34 × 0.45 × 0.25 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | fabric |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 4 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `CLUT-BADGE` — ID Badge on Lanyard

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | many |
| Dimensions (w × h × d) | 0.09 × 0.01 × 0.16 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic, fabric |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `CLUT-BINDER` — Ring Binder

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | many |
| Dimensions (w × h × d) | 0.07 × 0.31 × 0.28 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic, paper |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 7 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `CLUT-BOTTLE` — Water Bottle

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | many |
| Dimensions (w × h × d) | 0.07 × 0.22 × 0.07 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | glass, plastic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 3 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `CLUT-BRIEFCASE` — Briefcase

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | execoffice, waiting |
| Dimensions (w × h × d) | 0.42 × 0.38 × 0.12 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | leather, aluminum |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `CLUT-BROCHURE` — Tri-fold Company Brochure

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | lobby, waiting |
| Dimensions (w × h × d) | 0.10 × 0.07 × 0.07 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paper |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 3 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `CLUT-CALENDAR` — Desk Calendar

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | many |
| Dimensions (w × h × d) | 0.14 × 0.10 × 0.10 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paper |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `CLUT-CAN` — Drinks Can

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | many |
| Dimensions (w × h × d) | 0.07 × 0.12 × 0.07 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | aluminum |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 5 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `CLUT-CLIPSDISH` — Paper Clips Dish

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | many |
| Dimensions (w × h × d) | 0.09 × 0.03 × 0.09 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic, stainless |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `CLUT-COAT-HOOK` — Coat Left on Wall Hook

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | vestibule, execoffice, breakroom |
| Dimensions (w × h × d) | 0.40 × 0.95 × 0.20 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | fabric, aluminum |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 3 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `CLUT-DRAWING` — Child's Drawing (pinned)

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | openoffice |
| Dimensions (w × h × d) | 0.19 × 0.15 × 0.01 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paper |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `CLUT-FOLDER` — Manila Folder

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | many |
| Dimensions (w × h × d) | 0.24 × 0.01 × 0.32 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paper |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 7 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `CLUT-KEYCARD` — Access Keycard

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | itroom |
| Dimensions (w × h × d) | 0.09 × 0.00 × 0.05 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Animation states | pickup |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `CLUT-NOTEBOOK` — Notebook

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | many |
| Dimensions (w × h × d) | 0.15 × 0.01 × 0.21 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paper |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 4 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `CLUT-ORGANISER` — Desk Organiser

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | many |
| Dimensions (w × h × d) | 0.16 × 0.14 × 0.09 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 3 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `CLUT-PAPER` — Loose Paper Sheet

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | many |
| Dimensions (w × h × d) | 0.21 × 0.00 × 0.30 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paper |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 21 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `CLUT-PAPERSTACK` — Paper Stack

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | many |
| Dimensions (w × h × d) | 0.22 × 0.06 × 0.30 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paper |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 13 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `CLUT-PEN` — Pen

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | many |
| Dimensions (w × h × d) | 0.14 × 0.01 × 0.01 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 5 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `CLUT-PENCIL` — Pencil

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | many |
| Dimensions (w × h × d) | 0.15 × 0.01 × 0.01 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | wood |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `CLUT-PHOTOFRAME` — Photo Frame

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | many |
| Dimensions (w × h × d) | 0.13 × 0.11 × 0.05 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | wood, photo |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 4 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `CLUT-PLANT-FICUS` — Potted Ficus

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | lobby, waiting, execcorr |
| Dimensions (w × h × d) | 0.75 × 1.60 × 0.75 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic, foliage |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 6 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `CLUT-PLANT-POT` — Empty Plant Pot

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | janitor |
| Dimensions (w × h × d) | 0.22 × 0.16 × 0.22 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | ceramic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `CLUT-PLANT-SNAKE` — Potted Snake Plant

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | many |
| Dimensions (w × h × d) | 0.35 × 0.75 × 0.35 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | ceramic, foliage |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 6 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `CLUT-SCISSORS` — Scissors

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | many |
| Dimensions (w × h × d) | 0.16 × 0.01 × 0.05 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | stainless, plastic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `CLUT-STAPLER` — Stapler

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | many |
| Dimensions (w × h × d) | 0.15 × 0.06 × 0.04 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `CLUT-STICKY` — Sticky-note Block

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | many |
| Dimensions (w × h × d) | 0.07 × 0.02 × 0.07 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paper |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 7 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `CLUT-TAPE` — Tape Dispenser

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | many |
| Dimensions (w × h × d) | 0.14 × 0.09 × 0.05 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `CLUT-TENTCARD` — Counter Tent Card ("Back in 5")

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | lobby |
| Dimensions (w × h × d) | 0.15 × 0.11 × 0.06 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paper |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `CLUT-UMBRELLA` — Umbrella (leaning)

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | entrance, openoffice |
| Dimensions (w × h × d) | 0.10 × 0.80 × 0.12 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | fabric, plastic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `CLUT-WRAPPER` — Food Wrapper

| Field | Value |
| --- | --- |
| Category | clutter |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | breakroom, openoffice |
| Dimensions (w × h × d) | 0.10 × 0.01 × 0.06 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 4 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |


## decal (4)

### `DECAL-BLOOD` — Blood Decal Set (reduced-blood aware)

| Field | Value |
| --- | --- |
| Category | decal |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/fx/decals.js |
| Rooms / game states | all |
| Dimensions (w × h × d) | 0.50 × 0.50 × 0.00 m |
| Pivot & orientation | quad centre, +Z along surface normal |
| Material slots | alpha-blended decal |
| Texture maps | baseColor+alpha |
| Collision | none |
| LOD | pooled quads, budget from settings.quality.decalBudget |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | No z-fighting (0.006m offset + polygonOffset); variants prevent visible repetition; reducedBlood respected. |
| Playwright evidence | tests/decals.spec.js |
| Remaining discrepancies | none |

### `DECAL-BULLET-SET` — Bullet Impact Decal Set (7 surfaces, 4 variants)

| Field | Value |
| --- | --- |
| Category | decal |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/fx/decals.js |
| Rooms / game states | all |
| Dimensions (w × h × d) | 0.12 × 0.12 × 0.00 m |
| Pivot & orientation | quad centre, +Z along surface normal |
| Material slots | alpha-blended decal |
| Texture maps | baseColor+alpha |
| Collision | none |
| LOD | pooled quads, budget from settings.quality.decalBudget |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | No z-fighting (0.006m offset + polygonOffset); variants prevent visible repetition; reducedBlood respected. |
| Playwright evidence | tests/decals.spec.js |
| Remaining discrepancies | none |

### `DECAL-SCORCH` — Scorch Decal Set

| Field | Value |
| --- | --- |
| Category | decal |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/fx/decals.js |
| Rooms / game states | all |
| Dimensions (w × h × d) | 0.60 × 0.60 × 0.00 m |
| Pivot & orientation | quad centre, +Z along surface normal |
| Material slots | alpha-blended decal |
| Texture maps | baseColor+alpha |
| Collision | none |
| LOD | pooled quads, budget from settings.quality.decalBudget |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | No z-fighting (0.006m offset + polygonOffset); variants prevent visible repetition; reducedBlood respected. |
| Playwright evidence | tests/decals.spec.js |
| Remaining discrepancies | none |

### `DECAL-WEAR-SET` — Environmental Wear Decal Set (carpet paths, scuffs, stains, footprints, residue)

| Field | Value |
| --- | --- |
| Category | decal |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/fx/decals.js |
| Rooms / game states | all |
| Dimensions (w × h × d) | 1.50 × 1.50 × 0.00 m |
| Pivot & orientation | quad centre, +Z along surface normal |
| Material slots | alpha-blended decal |
| Texture maps | baseColor+alpha |
| Collision | none |
| LOD | pooled quads, budget from settings.quality.decalBudget |
| Instances in level | 189 |
| Status | **integrated** |
| Acceptance criteria | No z-fighting (0.006m offset + polygonOffset); variants prevent visible repetition; reducedBlood respected. |
| Playwright evidence | tests/decals.spec.js |
| Remaining discrepancies | none |


## door (5)

### `DOOR-CARDREADER` — Door Card Reader

| Field | Value |
| --- | --- |
| Category | door |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/doors.js, src/map/layout.js |
| Rooms / game states | vestibule, serverroom |
| Dimensions (w × h × d) | 0.07 × 0.12 × 0.02 m |
| Pivot & orientation | hinge side, base of the opening; leaf swings about local Y |
| Material slots | reader-shell, status-led-emissive |
| Texture maps | baseColor, normal, roughness |
| Collision | aabb, disabled once the leaf passes 50% open |
| LOD | single mesh; hardware merged into the leaf at load |
| Animation states | denied (red), granted (green) |
| Audio dependencies | door_locked, door_unlocked |
| Instances in level | 4 |
| Status | **accepted** |
| Acceptance criteria | Mounted at 1.15 m on the handle side; emissive LED changes colour on a successful read and resets on mission restart. |
| Playwright evidence | tests/doors.spec.js |
| Remaining discrepancies | none |

### `DOOR-FIRE` — Fire Door

| Field | Value |
| --- | --- |
| Category | door |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/doors.js, src/map/layout.js |
| Rooms / game states | weststair, upperweststair, conference, loading |
| Dimensions (w × h × d) | 0.95 × 2.10 × 0.04 m |
| Pivot & orientation | hinge side, base of the opening; leaf swings about local Y |
| Material slots | painted-steel-face, vision-panel-glass, push-bar, overhead-closer |
| Texture maps | baseColor, normal, roughness |
| Collision | aabb, disabled once the leaf passes 50% open |
| LOD | single mesh; hardware merged into the leaf at load |
| Animation states | closed, opening, open, closing, damaged |
| Audio dependencies | door_fire_open, door_fire_close, door_impact |
| Instances in level | 4 |
| Status | **accepted** |
| Acceptance criteria | Vision panel both sides, push bar on the egress side, overhead closer with arm, 260 HP before failing; signed "FIRE DOOR — KEEP SHUT". |
| Playwright evidence | tests/doors.spec.js |
| Remaining discrepancies | none |

### `DOOR-GLASS` — Glazed Office Door

| Field | Value |
| --- | --- |
| Category | door |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/doors.js, src/map/layout.js |
| Rooms / game states | entrance, vestibule, lobby, conference, itroom, execoffice |
| Dimensions (w × h × d) | 0.95 × 2.10 × 0.04 m |
| Pivot & orientation | hinge side, base of the opening; leaf swings about local Y |
| Material slots | anodised-stile, clear-glass, brushed-hardware |
| Texture maps | baseColor, normal, roughness |
| Collision | aabb, disabled once the leaf passes 50% open |
| LOD | single mesh; hardware merged into the leaf at load |
| Animation states | closed, opening, open, closing, damaged |
| Audio dependencies | door_glass_open, door_glass_close, glass_crack, glass_shatter |
| Instances in level | 6 |
| Status | **accepted** |
| Acceptance criteria | Stile-and-rail leaf with a real glazed panel that reads as glass and does not block line of sight; double-leaf variant used at the entrance and vestibule. |
| Playwright evidence | tests/doors.spec.js |
| Remaining discrepancies | none |

### `DOOR-SECURITY` — Security Door

| Field | Value |
| --- | --- |
| Category | door |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/doors.js, src/map/layout.js |
| Rooms / game states | vestibule, serverroom |
| Dimensions (w × h × d) | 1.05 × 2.10 × 0.04 m |
| Pivot & orientation | hinge side, base of the opening; leaf swings about local Y |
| Material slots | dark-painted-steel, push-bar, overhead-closer |
| Texture maps | baseColor, normal, roughness |
| Collision | aabb, disabled once the leaf passes 50% open |
| LOD | single mesh; hardware merged into the leaf at load |
| Animation states | locked, unlocked, opening, open, closing, damaged |
| Audio dependencies | door_metal_open, door_metal_close, door_locked, door_unlocked |
| Instances in level | 4 |
| Status | **accepted** |
| Acceptance criteria | Starts locked; refuses until the IT-workshop key card is collected, then the reader LED turns green and it opens. Reports `locked` in the text state. |
| Playwright evidence | tests/doors.spec.js |
| Remaining discrepancies | none |

### `DOOR-STANDARD` — Standard Office Door

| Field | Value |
| --- | --- |
| Category | door |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/doors.js, src/map/layout.js |
| Rooms / game states | breakroom, restrooms, janitor, copyroom, mechanical, archive |
| Dimensions (w × h × d) | 0.95 × 2.10 × 0.04 m |
| Pivot & orientation | hinge side, base of the opening; leaf swings about local Y |
| Material slots | wood-veneer-face, edge-trim, brushed-hardware, aluminium-kickplate |
| Texture maps | baseColor, normal, roughness |
| Collision | aabb, disabled once the leaf passes 50% open |
| LOD | single mesh; hardware merged into the leaf at load |
| Animation states | closed, opening, open, closing |
| Audio dependencies | door_wood_open, door_wood_close, door_handle, door_impact |
| Instances in level | 9 |
| Status | **accepted** |
| Acceptance criteria | Timber leaf with recessed panels, lever handle both sides, three hinges, kick plate; hinge-side pivot, collider clears as the leaf swings past 50%, AI paths through it. |
| Playwright evidence | tests/doors.spec.js |
| Remaining discrepancies | none |


## electronics (25)

### `ELEC-CABLE-BUNDLE` — Cable Bundle

| Field | Value |
| --- | --- |
| Category | electronics |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | serverroom, itroom |
| Dimensions (w × h × d) | 1.20 × 0.04 × 0.06 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 3 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `ELEC-CABLE-LOOSE` — Loose Floor Cable

| Field | Value |
| --- | --- |
| Category | electronics |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | itroom, openoffice |
| Dimensions (w × h × d) | 0.90 × 0.02 × 0.20 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 4 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `ELEC-CLOCK` — Wall Clock (08:12)

| Field | Value |
| --- | --- |
| Category | electronics |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | many |
| Dimensions (w × h × d) | 0.34 × 0.34 × 0.04 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 8 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `ELEC-COPIER` — Floor Copier

| Field | Value |
| --- | --- |
| Category | electronics |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | copyroom, openoffice |
| Dimensions (w × h × d) | 1.10 × 1.10 × 0.64 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic, screen-emissive |
| Texture maps | baseColor, normal, roughness, ao, emissive |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `ELEC-DISPLAY-WALL` — Wall Conference Display 65in

| Field | Value |
| --- | --- |
| Category | electronics |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | conference |
| Dimensions (w × h × d) | 1.46 × 0.85 × 0.09 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic, screen-emissive |
| Texture maps | baseColor, normal, roughness, ao, emissive |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `ELEC-DOCK` — Docking Station

| Field | Value |
| --- | --- |
| Category | electronics |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | openoffice, itroom |
| Dimensions (w × h × d) | 0.22 × 0.05 × 0.09 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `ELEC-HEADSET` — Headset on Stand

| Field | Value |
| --- | --- |
| Category | electronics |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | openoffice, vestibule |
| Dimensions (w × h × d) | 0.17 × 0.15 × 0.10 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `ELEC-KEYBOARD` — Keyboard

| Field | Value |
| --- | --- |
| Category | electronics |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | openoffice, itroom |
| Dimensions (w × h × d) | 0.44 × 0.03 × 0.15 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 17 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `ELEC-LAPTOP-CLOSED` — Laptop (closed)

| Field | Value |
| --- | --- |
| Category | electronics |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | openoffice, conference |
| Dimensions (w × h × d) | 0.34 × 0.03 × 0.24 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | aluminum |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `ELEC-LAPTOP-OPEN` — Laptop (open)

| Field | Value |
| --- | --- |
| Category | electronics |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | execoffice, conference |
| Dimensions (w × h × d) | 0.34 × 0.24 × 0.24 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | aluminum, screen-emissive |
| Texture maps | baseColor, normal, roughness, ao, emissive |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `ELEC-MONITOR-24` — 24in Monitor (powered)

| Field | Value |
| --- | --- |
| Category | electronics |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | openoffice, itroom, vestibule |
| Dimensions (w × h × d) | 0.56 × 0.53 × 0.18 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic, screen-emissive |
| Texture maps | baseColor, normal, roughness, ao, emissive |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 13 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `ELEC-MONITOR-24-OFF` — 24in Monitor (unpowered)

| Field | Value |
| --- | --- |
| Category | electronics |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | openoffice, itroom |
| Dimensions (w × h × d) | 0.56 × 0.53 × 0.18 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic, screen-off |
| Texture maps | baseColor, normal, roughness, ao, emissive |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 4 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `ELEC-MONITOR-DUAL` — Dual Monitor Arm Setup

| Field | Value |
| --- | --- |
| Category | electronics |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | itroom, vestibule |
| Dimensions (w × h × d) | 1.16 × 0.60 × 0.20 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic, screen-emissive |
| Texture maps | baseColor, normal, roughness, ao, emissive |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `ELEC-MOUSE` — Mouse

| Field | Value |
| --- | --- |
| Category | electronics |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | openoffice, itroom |
| Dimensions (w × h × d) | 0.06 × 0.04 × 0.10 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 16 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `ELEC-MOUSEPAD` — Mouse Pad

| Field | Value |
| --- | --- |
| Category | electronics |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | openoffice |
| Dimensions (w × h × d) | 0.26 × 0.00 × 0.22 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | rubber |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 16 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `ELEC-PAPERTRAY` — Paper Tray

| Field | Value |
| --- | --- |
| Category | electronics |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | copyroom, openoffice |
| Dimensions (w × h × d) | 0.26 × 0.09 × 0.33 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic, paper |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `ELEC-PHONE` — Desk Phone

| Field | Value |
| --- | --- |
| Category | electronics |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | openoffice, conference, execoffice |
| Dimensions (w × h × d) | 0.24 × 0.09 × 0.19 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 11 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `ELEC-PRINTER-DESK` — Desktop Printer

| Field | Value |
| --- | --- |
| Category | electronics |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | openoffice, execoffice |
| Dimensions (w × h × d) | 0.46 × 0.30 × 0.38 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic, paper |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `ELEC-PROJECTOR` — Projector

| Field | Value |
| --- | --- |
| Category | electronics |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | conference |
| Dimensions (w × h × d) | 0.32 × 0.12 × 0.24 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `ELEC-RACK-42U` — Server Rack 42U

| Field | Value |
| --- | --- |
| Category | electronics |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | serverroom |
| Dimensions (w × h × d) | 0.62 × 2.02 × 1.02 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paintedMetal, led-emissive |
| Texture maps | baseColor, normal, roughness, ao, emissive |
| Collision | box |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 4 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `ELEC-SECMONITORS` — Security Monitor Bank

| Field | Value |
| --- | --- |
| Category | electronics |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | vestibule |
| Dimensions (w × h × d) | 0.98 × 0.80 × 0.36 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic, screen-emissive |
| Texture maps | baseColor, normal, roughness, ao, emissive |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Animation states | static |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `ELEC-SWITCH` — Network Switch 1U

| Field | Value |
| --- | --- |
| Category | electronics |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | itroom, serverroom |
| Dimensions (w × h × d) | 0.44 × 0.05 × 0.24 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paintedMetal, led-emissive |
| Texture maps | baseColor, normal, roughness, ao, emissive |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `ELEC-TOWER` — Computer Tower

| Field | Value |
| --- | --- |
| Category | electronics |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | openoffice, itroom |
| Dimensions (w × h × d) | 0.19 × 0.42 × 0.45 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 7 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `ELEC-UPS` — UPS Unit

| Field | Value |
| --- | --- |
| Category | electronics |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | serverroom |
| Dimensions (w × h × d) | 0.26 × 0.42 × 0.60 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paintedMetal, led-emissive |
| Texture maps | baseColor, normal, roughness, ao, emissive |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `ELEC-WHITEBOARD` — Whiteboard (marker notes)

| Field | Value |
| --- | --- |
| Category | electronics |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | conference, openoffice, itroom |
| Dimensions (w × h × d) | 1.84 × 1.24 × 0.06 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | aluminum, whiteboard |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |


## furniture (22)

### `PROP-BOOKCASE` — Bookcase

| Field | Value |
| --- | --- |
| Category | furniture |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | execoffice, execcorr, conference |
| Dimensions (w × h × d) | 0.90 × 1.90 × 0.34 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | woodVeneer, paper |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 3 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `PROP-CAB-FILE-2` — Filing Cabinet, 2 drawer

| Field | Value |
| --- | --- |
| Category | furniture |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | openoffice, itroom |
| Dimensions (w × h × d) | 0.47 × 0.72 × 0.62 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paintedMetal, aluminum |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 6 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `PROP-CAB-FILE-4` — Filing Cabinet, 4 drawer

| Field | Value |
| --- | --- |
| Category | furniture |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | openoffice, copyroom, execoffice |
| Dimensions (w × h × d) | 0.47 × 1.32 × 0.62 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paintedMetal, aluminum |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 7 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `PROP-CHAIR-CONF` — Conference Chair (cantilever)

| Field | Value |
| --- | --- |
| Category | furniture |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | conference, execoffice |
| Dimensions (w × h × d) | 0.52 × 0.98 × 0.55 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | fabricChair, chrome |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 10 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `PROP-CHAIR-SLED` — Waiting Chair (sled base)

| Field | Value |
| --- | --- |
| Category | furniture |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | waiting, lobby |
| Dimensions (w × h × d) | 0.55 × 0.92 × 0.52 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | fabricPanel, paintedMetal |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 10 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `PROP-CHAIR-STACK` — Stacking Chair

| Field | Value |
| --- | --- |
| Category | furniture |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | breakroom |
| Dimensions (w × h × d) | 0.48 × 0.88 × 0.48 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic, aluminum |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 8 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `PROP-CHAIR-TASK` — Task Chair (5-star, mesh)

| Field | Value |
| --- | --- |
| Category | furniture |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | openoffice, itroom, vestibule |
| Dimensions (w × h × d) | 0.56 × 1.00 × 0.56 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | fabricChair, plastic, chrome |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 22 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `PROP-COATRACK` — Coat Rack

| Field | Value |
| --- | --- |
| Category | furniture |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | openoffice, execoffice |
| Dimensions (w × h × d) | 0.40 × 1.72 × 0.40 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paintedMetal |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 3 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `PROP-CUBE-PANEL-HIGH` — Cubicle Panel 1600x1600

| Field | Value |
| --- | --- |
| Category | furniture |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | openoffice |
| Dimensions (w × h × d) | 1.60 × 1.60 × 0.06 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | fabricPanel, aluminum |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 10 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `PROP-CUBE-PANEL-LOW` — Cubicle Panel 1600x1200

| Field | Value |
| --- | --- |
| Category | furniture |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | openoffice |
| Dimensions (w × h × d) | 1.60 × 1.20 × 0.06 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | fabricPanel, aluminum |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 18 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `PROP-CUBE-PANEL-SIDE` — Cubicle Panel 800x1200

| Field | Value |
| --- | --- |
| Category | furniture |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | openoffice |
| Dimensions (w × h × d) | 0.80 × 1.20 × 0.06 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | fabricPanel, aluminum |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `PROP-CUBE-POST` — Cubicle Connector Post

| Field | Value |
| --- | --- |
| Category | furniture |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | openoffice |
| Dimensions (w × h × d) | 0.08 × 1.20 × 0.08 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | aluminum |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 18 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `PROP-DESK-EXEC` — Executive Desk

| Field | Value |
| --- | --- |
| Category | furniture |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | execoffice |
| Dimensions (w × h × d) | 1.90 × 0.73 × 0.95 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | woodVeneer, leather, aluminum |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `PROP-DESK-RECEPTION` — Reception Desk (curved)

| Field | Value |
| --- | --- |
| Category | furniture |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | lobby |
| Dimensions (w × h × d) | 2.70 × 1.10 × 1.60 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | woodVeneer, laminate, brand |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | compound |
| LOD | single shared-geometry mesh group |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `PROP-DESK-STD` — Standard Desk 1600

| Field | Value |
| --- | --- |
| Category | furniture |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | openoffice, itroom, vestibule |
| Dimensions (w × h × d) | 1.60 × 0.73 × 0.80 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | laminate, paintedMetal |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 18 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `PROP-PEDESTAL` — Pedestal Drawer Unit

| Field | Value |
| --- | --- |
| Category | furniture |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | openoffice, itroom |
| Dimensions (w × h × d) | 0.40 × 0.64 × 0.55 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paintedMetal |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 10 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `PROP-RACK-ARCHIVE` — Archive Rack Bay (box files)

| Field | Value |
| --- | --- |
| Category | furniture |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | archive |
| Dimensions (w × h × d) | 2.48 × 2.10 × 0.62 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paintedMetal, paper |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 4 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `PROP-SHELF-OPEN` — Open Shelving Unit

| Field | Value |
| --- | --- |
| Category | furniture |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | copyroom, itroom, janitor |
| Dimensions (w × h × d) | 0.80 × 1.80 × 0.35 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | laminate |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `PROP-SOFA-3` — Three-Seat Sofa

| Field | Value |
| --- | --- |
| Category | furniture |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | lobby |
| Dimensions (w × h × d) | 2.24 × 0.84 × 0.85 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | leather |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `PROP-TABLE-BREAK` — Break Table (round)

| Field | Value |
| --- | --- |
| Category | furniture |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | breakroom |
| Dimensions (w × h × d) | 1.00 × 0.74 × 1.00 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | laminate, paintedMetal |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `PROP-TABLE-CONF` — Boat Conference Table 3.2m

| Field | Value |
| --- | --- |
| Category | furniture |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | conference |
| Dimensions (w × h × d) | 3.20 × 0.77 × 1.32 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | woodVeneer, paintedMetal |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `PROP-TABLE-SIDE` — Side Table

| Field | Value |
| --- | --- |
| Category | furniture |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | lobby, waiting, execcorr |
| Dimensions (w × h × d) | 0.60 × 0.50 × 0.60 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | woodVeneer, paintedMetal |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 5 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |


## glass (4)

### `GLASS-BROKEN` — Broken Glazing State

| Field | Value |
| --- | --- |
| Category | glass |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/build.js, src/art/materials.js, src/fx/effects.js |
| Rooms / game states | any glazed opening |
| Dimensions (w × h × d) | 3.00 × 2.10 × 0.01 m |
| Pivot & orientation | pane centre |
| Material slots | physical-glass |
| Texture maps | none (analytic) |
| Collision | aabb, blocksSight=false |
| LOD | single quad |
| Animation states | intact, cracked, shattered |
| Audio dependencies | glass_crack, glass_shatter, glass_fragments |
| Instances in level | 0 |
| Status | **accepted** |
| Acceptance criteria | Shooting a pane produces a crack decal then a shatter with falling fragments, stops blocking bullets, and updates the text state. |
| Playwright evidence | tests/weapons.spec.js |
| Remaining discrepancies | none |

### `GLASS-CLEAR` — Clear Glazing Pane

| Field | Value |
| --- | --- |
| Category | glass |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/build.js, src/art/materials.js, src/fx/effects.js |
| Rooms / game states | lobby, conference, waiting, vestibule, breakroom, execoffice |
| Dimensions (w × h × d) | 3.00 × 2.10 × 0.01 m |
| Pivot & orientation | pane centre |
| Material slots | physical-glass |
| Texture maps | none (analytic) |
| Collision | aabb, blocksSight=false |
| LOD | single quad |
| Audio dependencies | glass_crack, glass_shatter, glass_fragments |
| Instances in level | 8 |
| Status | **accepted** |
| Acceptance criteria | Reads as glass, not an opaque blue wall: low opacity, clearcoat specular, does not block line of sight, breakable with a visual fracture state. |
| Playwright evidence | tests/weapons.spec.js |
| Remaining discrepancies | none |

### `GLASS-FROSTED` — Frosted Glazing Pane

| Field | Value |
| --- | --- |
| Category | glass |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/build.js, src/art/materials.js, src/fx/effects.js |
| Rooms / game states | execcorr, archive, loading |
| Dimensions (w × h × d) | 3.00 × 2.10 × 0.01 m |
| Pivot & orientation | pane centre |
| Material slots | physical-glass |
| Texture maps | none (analytic) |
| Collision | aabb, blocksSight=false |
| LOD | single quad |
| Audio dependencies | glass_crack, glass_shatter, glass_fragments |
| Instances in level | 3 |
| Status | **accepted** |
| Acceptance criteria | Obscures shapes without going opaque; higher roughness than clear glass. |
| Playwright evidence | tests/weapons.spec.js |
| Remaining discrepancies | none |

### `GLASS-TINTED` — Tinted Exterior Glazing

| Field | Value |
| --- | --- |
| Category | glass |
| Responsible agent | Fable 2 — map architecture |
| File locations | src/map/build.js, src/art/materials.js, src/fx/effects.js |
| Rooms / game states | lobby, conference, execcorr, upperlanding |
| Dimensions (w × h × d) | 3.00 × 2.10 × 0.01 m |
| Pivot & orientation | pane centre |
| Material slots | physical-glass |
| Texture maps | none (analytic) |
| Collision | aabb, blocksSight=false |
| LOD | single quad |
| Audio dependencies | glass_crack, glass_shatter, glass_fragments |
| Instances in level | 5 |
| Status | **accepted** |
| Acceptance criteria | Cooler and darker than interior glass; the snow outside still reads through it. |
| Playwright evidence | tests/weapons.spec.js |
| Remaining discrepancies | none |


## lighting (6)

### `LIGHT-DOWNLIGHT` — Recessed Downlight

| Field | Value |
| --- | --- |
| Category | lighting |
| Responsible agent | Fable 1 — art direction & UI |
| File locations | src/map/lighting.js |
| Rooms / game states | lobby, entrance, execcorr, execoffice, upperlanding |
| Dimensions (w × h × d) | 0.26 × 0.05 × 0.26 m |
| Pivot & orientation | fixture centre at ceiling height |
| Material slots | can, lens-emissive |
| Texture maps | baseColor, emissive, roughness |
| Collision | none |
| LOD | emissive geometry always drawn; point light culled to the quality budget |
| Instances in level | 27 |
| Status | **accepted** |
| Acceptance criteria | Pendant stem in double-height spaces; warm in executive areas, cool in the lobby. |
| Playwright evidence | tests/rooms.spec.js |
| Remaining discrepancies | none |

### `LIGHT-EMERGENCY` — Emergency Twin-Spot

| Field | Value |
| --- | --- |
| Category | lighting |
| Responsible agent | Fable 1 — art direction & UI |
| File locations | src/map/lighting.js |
| Rooms / game states | servicecorr, weststair, upperweststair, mechanical, garage, janitor |
| Dimensions (w × h × d) | 0.26 × 0.11 × 0.10 m |
| Pivot & orientation | fixture centre at ceiling height |
| Material slots | body, lamp-emissive |
| Texture maps | baseColor, emissive, roughness |
| Collision | none |
| LOD | emissive geometry always drawn; point light culled to the quality budget |
| Instances in level | 7 |
| Status | **accepted** |
| Acceptance criteria | Two red spot heads; becomes the only light source in the blackout lighting scenario. |
| Playwright evidence | tests/rooms.spec.js |
| Remaining discrepancies | none |

### `LIGHT-STRIP` — Surface Strip Light

| Field | Value |
| --- | --- |
| Category | lighting |
| Responsible agent | Fable 1 — art direction & UI |
| File locations | src/map/lighting.js |
| Rooms / game states | servicecorr, mechanical, serverroom, weststair, janitor, loading, garage |
| Dimensions (w × h × d) | 1.40 × 0.07 × 0.09 m |
| Pivot & orientation | fixture centre at ceiling height |
| Material slots | body, tube-emissive |
| Texture maps | baseColor, emissive, roughness |
| Collision | none |
| LOD | emissive geometry always drawn; point light culled to the quality budget |
| Instances in level | 35 |
| Status | **accepted** |
| Acceptance criteria | Bare-tube back-of-house fixture; one flickers. |
| Playwright evidence | tests/rooms.spec.js |
| Remaining discrepancies | none |

### `LIGHT-TROFFER` — 1200 mm Recessed Troffer

| Field | Value |
| --- | --- |
| Category | lighting |
| Responsible agent | Fable 1 — art direction & UI |
| File locations | src/map/lighting.js |
| Rooms / game states | office-zone rooms |
| Dimensions (w × h × d) | 1.22 × 0.07 × 0.62 m |
| Pivot & orientation | fixture centre at ceiling height |
| Material slots | housing, diffuser-emissive |
| Texture maps | baseColor, emissive, roughness |
| Collision | none |
| LOD | emissive geometry always drawn; point light culled to the quality budget |
| Instances in level | 62 |
| Status | **accepted** |
| Acceptance criteria | Emissive diffuser reads as lit even when its point light is culled; tired-tube variant is slightly green. |
| Playwright evidence | tests/rooms.spec.js |
| Remaining discrepancies | none |

### `SIGN-DOOR-PLATE` — Door Sign Plate

| Field | Value |
| --- | --- |
| Category | lighting |
| Responsible agent | Fable 1 — art direction & UI |
| File locations | src/map/lighting.js |
| Rooms / game states | all interior rooms |
| Dimensions (w × h × d) | 0.24 × 0.09 × 0.01 m |
| Pivot & orientation | fixture centre at ceiling height |
| Material slots | sign-face |
| Texture maps | baseColor, emissive, roughness |
| Collision | none |
| LOD | emissive geometry always drawn; point light culled to the quality budget |
| Instances in level | 18 |
| Status | **accepted** |
| Acceptance criteria | Original room names and numbers, legible at 2 m, abstracted at distance. |
| Playwright evidence | tests/rooms.spec.js |
| Remaining discrepancies | none |

### `SIGN-EXIT` — Illuminated Exit Sign

| Field | Value |
| --- | --- |
| Category | lighting |
| Responsible agent | Fable 1 — art direction & UI |
| File locations | src/map/lighting.js |
| Rooms / game states | lobby, midcorr, servicecorr, garage, stairwell, weststair |
| Dimensions (w × h × d) | 0.34 × 0.15 × 0.03 m |
| Pivot & orientation | fixture centre at ceiling height |
| Material slots | panel-emissive, bracket |
| Texture maps | baseColor, emissive, roughness |
| Collision | none |
| LOD | emissive geometry always drawn; point light culled to the quality budget |
| Instances in level | 8 |
| Status | **accepted** |
| Acceptance criteria | Green emissive panel readable from the far end of the corridor; doubles as navigation lighting. |
| Playwright evidence | tests/rooms.spec.js |
| Remaining discrepancies | none |


## maintenance (30)

### `MAINT-AHU` — HVAC Air Handler

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | mechanical |
| Dimensions (w × h × d) | 1.70 × 1.98 × 0.92 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paintedMetal, aluminum |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `MAINT-BOLLARD` — Loading Bollard

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | courtyard, eastapron, garage |
| Dimensions (w × h × d) | 0.16 × 0.92 × 0.16 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paintedMetal |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 6 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `MAINT-BOX-L` — Cardboard Box (large)

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | loading, garage |
| Dimensions (w × h × d) | 0.60 × 0.45 × 0.55 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | cardboard |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 3 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `MAINT-BOX-M` — Cardboard Box (medium)

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | loading, copyroom, archive |
| Dimensions (w × h × d) | 0.45 × 0.35 × 0.42 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | cardboard |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 10 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `MAINT-BOX-OPEN` — Cardboard Box (open)

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | loading, copyroom |
| Dimensions (w × h × d) | 0.45 × 0.45 × 0.42 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | cardboard, paper |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `MAINT-BOX-S` — Cardboard Box (small)

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | loading, copyroom, archive |
| Dimensions (w × h × d) | 0.30 × 0.24 × 0.30 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | cardboard |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 9 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `MAINT-BREAKERBOX` — Breaker Box (door open)

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | mechanical, servicecorr |
| Dimensions (w × h × d) | 0.40 × 0.62 × 0.15 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paintedMetal, breaker-face |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `MAINT-BROOM` — Broom (leaning)

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | janitor, garage |
| Dimensions (w × h × d) | 0.26 × 1.30 × 0.30 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | wood, plastic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `MAINT-CLEANBOTTLE` — Cleaning Spray Bottle

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | janitor |
| Dimensions (w × h × d) | 0.08 × 0.26 × 0.08 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `MAINT-CONE` — Warning Cone

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | servicecorr, garage, courtyard |
| Dimensions (w × h × d) | 0.30 × 0.70 × 0.30 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 6 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `MAINT-CRATE` — Shipping Crate

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | loading, garage |
| Dimensions (w × h × d) | 0.94 × 0.80 × 0.74 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | wood |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 4 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `MAINT-DUCT` — Duct Branch

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | mechanical, loading |
| Dimensions (w × h × d) | 2.40 × 0.37 × 0.50 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | aluminum |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `MAINT-ELECPANEL` — Electrical Panel (closed)

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | mechanical, garage |
| Dimensions (w × h × d) | 0.60 × 0.90 × 0.20 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paintedMetal |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `MAINT-EXTINGUISHER` — Fire Extinguisher + Bracket

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | many |
| Dimensions (w × h × d) | 0.16 × 0.60 × 0.18 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paintedMetal, chrome |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 8 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `MAINT-FIRECABINET` — Recessed Fire Cabinet

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | midcorr, servicecorr, loading |
| Dimensions (w × h × d) | 0.42 × 0.72 × 0.22 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paintedMetal, glass |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 3 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `MAINT-FLOORMAT` — Walk-off Floor Mat

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | entrance, vestibule, garage |
| Dimensions (w × h × d) | 1.80 × 0.02 × 1.10 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | rubber |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 5 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `MAINT-GARAGECTRL` — Garage Control Box

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | garage |
| Dimensions (w × h × d) | 0.20 × 0.28 × 0.12 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paintedMetal |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Animation states | open-shutter |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `MAINT-HANDTRUCK` — Hand Truck

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | loading, servicecorr |
| Dimensions (w × h × d) | 0.50 × 1.30 × 0.40 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paintedMetal, rubber |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `MAINT-JANITORCART` — Janitor Cart

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | janitor, servicecorr |
| Dimensions (w × h × d) | 1.00 × 0.90 × 0.55 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic, fabric |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `MAINT-LADDER` — Step Ladder

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | mechanical, archive, garage |
| Dimensions (w × h × d) | 0.50 × 1.50 × 0.62 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | aluminum |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `MAINT-MOPBUCKET` — Mop + Bucket

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | janitor, servicecorr |
| Dimensions (w × h × d) | 0.40 × 1.30 × 0.48 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic, wood |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `MAINT-PALLET` — Wooden Pallet

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | loading, garage, eastapron |
| Dimensions (w × h × d) | 1.20 × 0.15 × 1.00 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | wood |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 5 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `MAINT-PIPES` — Pipe Assembly with Valves

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | mechanical, garage |
| Dimensions (w × h × d) | 0.90 × 2.20 × 0.24 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | stainless, paintedMetal |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 3 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `MAINT-SMOKEDET` — Smoke Detector

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | ceilings |
| Dimensions (w × h × d) | 0.12 × 0.04 × 0.12 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic, led-emissive |
| Texture maps | baseColor, normal, roughness, ao, emissive |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 25 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `MAINT-SPRINKLER` — Sprinkler Head

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | ceilings |
| Dimensions (w × h × d) | 0.08 × 0.07 × 0.08 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | chrome |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 105 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `MAINT-SUPPLYCRATE` — Ammunition Supply Crate

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | loading |
| Dimensions (w × h × d) | 0.87 × 0.52 × 0.52 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paintedMetal |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Animation states | interact |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `MAINT-TOOLCASE` — Tool Case

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | mechanical, garage |
| Dimensions (w × h × d) | 0.46 × 0.27 × 0.22 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paintedMetal |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 3 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `MAINT-TRANSFORMER` — Utility Cabinet / Transformer

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | mechanical |
| Dimensions (w × h × d) | 0.90 × 1.50 × 0.62 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paintedMetal, led-emissive |
| Texture maps | baseColor, normal, roughness, ao, emissive |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `MAINT-WETFLOOR` — Wet Floor Sign

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | servicecorr, restrooms |
| Dimensions (w × h × d) | 0.30 × 0.63 × 0.24 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | plastic |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 4 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `MAINT-WIRESHELF` — Wire Utility Shelving

| Field | Value |
| --- | --- |
| Category | maintenance |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | janitor, loading, garage |
| Dimensions (w × h × d) | 1.20 × 1.80 × 0.45 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | chrome |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 4 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |


## material (19)

### `MAT-BRUSHMETAL` — Brushed / Stainless Metal

| Field | Value |
| --- | --- |
| Category | material |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/art/materials.js, src/art/texgen.js, src/art/noise.js |
| Rooms / game states | kitchen, handles, server-room |
| Dimensions (w × h × d) | 1.00 × 1.00 × 0.00 m |
| Pivot & orientation | tileable, metres-per-tile documented per surface |
| Material slots | standard |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | n/a |
| LOD | mipmapped, quality-scaled resolution (0.5x/0.75x/1x) |
| Instances in level | 0 |
| Status | **accepted** |
| Acceptance criteria | No baked lighting in base colour; roughness authored independently; tiles seamlessly. |
| Playwright evidence | tests/materials.spec.js + gallery screenshots |
| Remaining discrepancies | none |

### `MAT-CARPET` — Commercial Loop Carpet

| Field | Value |
| --- | --- |
| Category | material |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/art/materials.js, src/art/texgen.js, src/art/noise.js |
| Rooms / game states | open-office, exec, conference |
| Dimensions (w × h × d) | 1.00 × 1.00 × 0.00 m |
| Pivot & orientation | tileable, metres-per-tile documented per surface |
| Material slots | standard |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | n/a |
| LOD | mipmapped, quality-scaled resolution (0.5x/0.75x/1x) |
| Instances in level | 0 |
| Status | **accepted** |
| Acceptance criteria | No baked lighting in base colour; roughness authored independently; tiles seamlessly. |
| Playwright evidence | tests/materials.spec.js + gallery screenshots |
| Remaining discrepancies | none |

### `MAT-CEILTILE` — Acoustic Ceiling Tile

| Field | Value |
| --- | --- |
| Category | material |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/art/materials.js, src/art/texgen.js, src/art/noise.js |
| Rooms / game states | all interior |
| Dimensions (w × h × d) | 1.00 × 1.00 × 0.00 m |
| Pivot & orientation | tileable, metres-per-tile documented per surface |
| Material slots | standard |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | n/a |
| LOD | mipmapped, quality-scaled resolution (0.5x/0.75x/1x) |
| Instances in level | 0 |
| Status | **accepted** |
| Acceptance criteria | No baked lighting in base colour; roughness authored independently; tiles seamlessly. |
| Playwright evidence | tests/materials.spec.js + gallery screenshots |
| Remaining discrepancies | none |

### `MAT-CERAMIC` — Ceramic Tile

| Field | Value |
| --- | --- |
| Category | material |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/art/materials.js, src/art/texgen.js, src/art/noise.js |
| Rooms / game states | restrooms, kitchen |
| Dimensions (w × h × d) | 1.00 × 1.00 × 0.00 m |
| Pivot & orientation | tileable, metres-per-tile documented per surface |
| Material slots | standard |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | n/a |
| LOD | mipmapped, quality-scaled resolution (0.5x/0.75x/1x) |
| Instances in level | 0 |
| Status | **accepted** |
| Acceptance criteria | No baked lighting in base colour; roughness authored independently; tiles seamlessly. |
| Playwright evidence | tests/materials.spec.js + gallery screenshots |
| Remaining discrepancies | none |

### `MAT-CONCRETE` — Concrete

| Field | Value |
| --- | --- |
| Category | material |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/art/materials.js, src/art/texgen.js, src/art/noise.js |
| Rooms / game states | mechanical, loading, garage, stairwell |
| Dimensions (w × h × d) | 1.00 × 1.00 × 0.00 m |
| Pivot & orientation | tileable, metres-per-tile documented per surface |
| Material slots | standard |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | n/a |
| LOD | mipmapped, quality-scaled resolution (0.5x/0.75x/1x) |
| Instances in level | 0 |
| Status | **accepted** |
| Acceptance criteria | No baked lighting in base colour; roughness authored independently; tiles seamlessly. |
| Playwright evidence | tests/materials.spec.js + gallery screenshots |
| Remaining discrepancies | none |

### `MAT-DRYWALL` — Painted Drywall

| Field | Value |
| --- | --- |
| Category | material |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/art/materials.js, src/art/texgen.js, src/art/noise.js |
| Rooms / game states | reception, open-office, corridors, exec |
| Dimensions (w × h × d) | 1.00 × 1.00 × 0.00 m |
| Pivot & orientation | tileable, metres-per-tile documented per surface |
| Material slots | standard |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | n/a |
| LOD | mipmapped, quality-scaled resolution (0.5x/0.75x/1x) |
| Instances in level | 0 |
| Status | **accepted** |
| Acceptance criteria | No baked lighting in base colour; roughness authored independently; tiles seamlessly. |
| Playwright evidence | tests/materials.spec.js + gallery screenshots |
| Remaining discrepancies | none |

### `MAT-FABRIC` — Upholstery Fabric

| Field | Value |
| --- | --- |
| Category | material |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/art/materials.js, src/art/texgen.js, src/art/noise.js |
| Rooms / game states | chairs, cubicle-panels, sofa |
| Dimensions (w × h × d) | 1.00 × 1.00 × 0.00 m |
| Pivot & orientation | tileable, metres-per-tile documented per surface |
| Material slots | standard |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | n/a |
| LOD | mipmapped, quality-scaled resolution (0.5x/0.75x/1x) |
| Instances in level | 0 |
| Status | **accepted** |
| Acceptance criteria | No baked lighting in base colour; roughness authored independently; tiles seamlessly. |
| Playwright evidence | tests/materials.spec.js + gallery screenshots |
| Remaining discrepancies | none |

### `MAT-GLASS-CLEAR` — Clear Glass

| Field | Value |
| --- | --- |
| Category | material |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/art/materials.js, src/art/texgen.js, src/art/noise.js |
| Rooms / game states | conference, exterior-windows, lobby |
| Dimensions (w × h × d) | 1.00 × 1.00 × 0.00 m |
| Pivot & orientation | tileable, metres-per-tile documented per surface |
| Material slots | standard |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | n/a |
| LOD | mipmapped, quality-scaled resolution (0.5x/0.75x/1x) |
| Instances in level | 0 |
| Status | **accepted** |
| Acceptance criteria | No baked lighting in base colour; roughness authored independently; tiles seamlessly. |
| Playwright evidence | tests/materials.spec.js + gallery screenshots |
| Remaining discrepancies | none |

### `MAT-GLASS-FROST` — Frosted Glass

| Field | Value |
| --- | --- |
| Category | material |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/art/materials.js, src/art/texgen.js, src/art/noise.js |
| Rooms / game states | exec-corridor, restroom |
| Dimensions (w × h × d) | 1.00 × 1.00 × 0.00 m |
| Pivot & orientation | tileable, metres-per-tile documented per surface |
| Material slots | standard |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | n/a |
| LOD | mipmapped, quality-scaled resolution (0.5x/0.75x/1x) |
| Instances in level | 0 |
| Status | **accepted** |
| Acceptance criteria | No baked lighting in base colour; roughness authored independently; tiles seamlessly. |
| Playwright evidence | tests/materials.spec.js + gallery screenshots |
| Remaining discrepancies | none |

### `MAT-GLASS-TINT` — Tinted Exterior Glass

| Field | Value |
| --- | --- |
| Category | material |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/art/materials.js, src/art/texgen.js, src/art/noise.js |
| Rooms / game states | curtain-wall |
| Dimensions (w × h × d) | 1.00 × 1.00 × 0.00 m |
| Pivot & orientation | tileable, metres-per-tile documented per surface |
| Material slots | standard |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | n/a |
| LOD | mipmapped, quality-scaled resolution (0.5x/0.75x/1x) |
| Instances in level | 0 |
| Status | **accepted** |
| Acceptance criteria | No baked lighting in base colour; roughness authored independently; tiles seamlessly. |
| Playwright evidence | tests/materials.spec.js + gallery screenshots |
| Remaining discrepancies | none |

### `MAT-LAMINATE` — Laminate

| Field | Value |
| --- | --- |
| Category | material |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/art/materials.js, src/art/texgen.js, src/art/noise.js |
| Rooms / game states | desks, breakroom, cabinets |
| Dimensions (w × h × d) | 1.00 × 1.00 × 0.00 m |
| Pivot & orientation | tileable, metres-per-tile documented per surface |
| Material slots | standard |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | n/a |
| LOD | mipmapped, quality-scaled resolution (0.5x/0.75x/1x) |
| Instances in level | 0 |
| Status | **accepted** |
| Acceptance criteria | No baked lighting in base colour; roughness authored independently; tiles seamlessly. |
| Playwright evidence | tests/materials.spec.js + gallery screenshots |
| Remaining discrepancies | none |

### `MAT-LEATHER` — Synthetic Leather

| Field | Value |
| --- | --- |
| Category | material |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/art/materials.js, src/art/texgen.js, src/art/noise.js |
| Rooms / game states | exec-chair, lobby-sofa |
| Dimensions (w × h × d) | 1.00 × 1.00 × 0.00 m |
| Pivot & orientation | tileable, metres-per-tile documented per surface |
| Material slots | standard |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | n/a |
| LOD | mipmapped, quality-scaled resolution (0.5x/0.75x/1x) |
| Instances in level | 0 |
| Status | **accepted** |
| Acceptance criteria | No baked lighting in base colour; roughness authored independently; tiles seamlessly. |
| Playwright evidence | tests/materials.spec.js + gallery screenshots |
| Remaining discrepancies | none |

### `MAT-PAINTMETAL` — Painted Metal

| Field | Value |
| --- | --- |
| Category | material |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/art/materials.js, src/art/texgen.js, src/art/noise.js |
| Rooms / game states | doors, lockers, panels |
| Dimensions (w × h × d) | 1.00 × 1.00 × 0.00 m |
| Pivot & orientation | tileable, metres-per-tile documented per surface |
| Material slots | standard |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | n/a |
| LOD | mipmapped, quality-scaled resolution (0.5x/0.75x/1x) |
| Instances in level | 0 |
| Status | **accepted** |
| Acceptance criteria | No baked lighting in base colour; roughness authored independently; tiles seamlessly. |
| Playwright evidence | tests/materials.spec.js + gallery screenshots |
| Remaining discrepancies | none |

### `MAT-PAPER` — Paper & Cardboard

| Field | Value |
| --- | --- |
| Category | material |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/art/materials.js, src/art/texgen.js, src/art/noise.js |
| Rooms / game states | clutter, archive, loading |
| Dimensions (w × h × d) | 1.00 × 1.00 × 0.00 m |
| Pivot & orientation | tileable, metres-per-tile documented per surface |
| Material slots | standard |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | n/a |
| LOD | mipmapped, quality-scaled resolution (0.5x/0.75x/1x) |
| Instances in level | 0 |
| Status | **accepted** |
| Acceptance criteria | No baked lighting in base colour; roughness authored independently; tiles seamlessly. |
| Playwright evidence | tests/materials.spec.js + gallery screenshots |
| Remaining discrepancies | none |

### `MAT-PLASTER` — Plaster

| Field | Value |
| --- | --- |
| Category | material |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/art/materials.js, src/art/texgen.js, src/art/noise.js |
| Rooms / game states | stairwell, vestibule |
| Dimensions (w × h × d) | 1.00 × 1.00 × 0.00 m |
| Pivot & orientation | tileable, metres-per-tile documented per surface |
| Material slots | standard |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | n/a |
| LOD | mipmapped, quality-scaled resolution (0.5x/0.75x/1x) |
| Instances in level | 0 |
| Status | **accepted** |
| Acceptance criteria | No baked lighting in base colour; roughness authored independently; tiles seamlessly. |
| Playwright evidence | tests/materials.spec.js + gallery screenshots |
| Remaining discrepancies | none |

### `MAT-PLASTIC` — Hard Plastic

| Field | Value |
| --- | --- |
| Category | material |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/art/materials.js, src/art/texgen.js, src/art/noise.js |
| Rooms / game states | electronics, equipment |
| Dimensions (w × h × d) | 1.00 × 1.00 × 0.00 m |
| Pivot & orientation | tileable, metres-per-tile documented per surface |
| Material slots | standard |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | n/a |
| LOD | mipmapped, quality-scaled resolution (0.5x/0.75x/1x) |
| Instances in level | 0 |
| Status | **accepted** |
| Acceptance criteria | No baked lighting in base colour; roughness authored independently; tiles seamlessly. |
| Playwright evidence | tests/materials.spec.js + gallery screenshots |
| Remaining discrepancies | none |

### `MAT-SNOW` — Snow

| Field | Value |
| --- | --- |
| Category | material |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/art/materials.js, src/art/texgen.js, src/art/noise.js |
| Rooms / game states | exterior, courtyard, ledges |
| Dimensions (w × h × d) | 1.00 × 1.00 × 0.00 m |
| Pivot & orientation | tileable, metres-per-tile documented per surface |
| Material slots | standard |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | n/a |
| LOD | mipmapped, quality-scaled resolution (0.5x/0.75x/1x) |
| Instances in level | 0 |
| Status | **accepted** |
| Acceptance criteria | No baked lighting in base colour; roughness authored independently; tiles seamlessly. |
| Playwright evidence | tests/materials.spec.js + gallery screenshots |
| Remaining discrepancies | none |

### `MAT-VINYL` — Vinyl Composition Tile

| Field | Value |
| --- | --- |
| Category | material |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/art/materials.js, src/art/texgen.js, src/art/noise.js |
| Rooms / game states | breakroom, service-corridor, copy-room |
| Dimensions (w × h × d) | 1.00 × 1.00 × 0.00 m |
| Pivot & orientation | tileable, metres-per-tile documented per surface |
| Material slots | standard |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | n/a |
| LOD | mipmapped, quality-scaled resolution (0.5x/0.75x/1x) |
| Instances in level | 0 |
| Status | **accepted** |
| Acceptance criteria | No baked lighting in base colour; roughness authored independently; tiles seamlessly. |
| Playwright evidence | tests/materials.spec.js + gallery screenshots |
| Remaining discrepancies | none |

### `MAT-WOOD` — Wood Veneer

| Field | Value |
| --- | --- |
| Category | material |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/art/materials.js, src/art/texgen.js, src/art/noise.js |
| Rooms / game states | exec-office, conference, reception |
| Dimensions (w × h × d) | 1.00 × 1.00 × 0.00 m |
| Pivot & orientation | tileable, metres-per-tile documented per surface |
| Material slots | standard |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | n/a |
| LOD | mipmapped, quality-scaled resolution (0.5x/0.75x/1x) |
| Instances in level | 0 |
| Status | **accepted** |
| Acceptance criteria | No baked lighting in base colour; roughness authored independently; tiles seamlessly. |
| Playwright evidence | tests/materials.spec.js + gallery screenshots |
| Remaining discrepancies | none |


## restroom (8)

### `REST-BIN` — Small Steel Bin

| Field | Value |
| --- | --- |
| Category | restroom |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | restrooms, execoffice |
| Dimensions (w × h × d) | 0.27 × 0.37 × 0.27 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | stainless |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `REST-HANDDRYER` — Hand Dryer

| Field | Value |
| --- | --- |
| Category | restroom |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | restrooms |
| Dimensions (w × h × d) | 0.26 × 0.32 × 0.17 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | stainless, led-emissive |
| Texture maps | baseColor, normal, roughness, ao, emissive |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `REST-MIRROR` — Mirror

| Field | Value |
| --- | --- |
| Category | restroom |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | restrooms |
| Dimensions (w × h × d) | 0.56 × 0.80 × 0.03 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | aluminum, mirror |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `REST-SINK` — Wall-hung Sink + P-trap

| Field | Value |
| --- | --- |
| Category | restroom |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | restrooms |
| Dimensions (w × h × d) | 0.52 × 1.00 × 0.46 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | porcelain, chrome |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `REST-STALL-DOOR` — Stall Door

| Field | Value |
| --- | --- |
| Category | restroom |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | restrooms |
| Dimensions (w × h × d) | 0.66 × 1.85 × 0.06 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paintedMetal, chrome |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `REST-STALL-PANEL` — Stall Partition Panel

| Field | Value |
| --- | --- |
| Category | restroom |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | restrooms |
| Dimensions (w × h × d) | 0.05 × 1.85 × 1.50 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paintedMetal, chrome |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 3 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `REST-TOILET` — Toilet

| Field | Value |
| --- | --- |
| Category | restroom |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | restrooms |
| Dimensions (w × h × d) | 0.44 × 0.80 × 0.66 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | porcelain, chrome |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `REST-URINAL` — Urinal

| Field | Value |
| --- | --- |
| Category | restroom |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | restrooms |
| Dimensions (w × h × d) | 0.36 × 0.62 × 0.32 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | porcelain, chrome |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | box |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |


## signage (15)

### `SIGN-DEPT` — Department Sign

| Field | Value |
| --- | --- |
| Category | signage |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | many |
| Dimensions (w × h × d) | 0.55 × 0.17 × 0.02 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | sign |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 4 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `SIGN-EMERG-PLACARD` — Emergency Instructions Placard

| Field | Value |
| --- | --- |
| Category | signage |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | midcorr, weststair, loading |
| Dimensions (w × h × d) | 0.26 × 0.36 × 0.01 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paper |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 3 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `SIGN-EQUIP-LABEL` — Equipment Hazard Label

| Field | Value |
| --- | --- |
| Category | signage |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | mechanical, serverroom, garage |
| Dimensions (w × h × d) | 0.24 × 0.08 × 0.01 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | sign |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 4 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `SIGN-EVAC-DIAGRAM` — Evacuation Diagram

| Field | Value |
| --- | --- |
| Category | signage |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | midcorr, lobby, servicecorr |
| Dimensions (w × h × d) | 0.42 × 0.52 × 0.01 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paper |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 4 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `SIGN-FLYER` — Bulletin Flyer

| Field | Value |
| --- | --- |
| Category | signage |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | breakroom, copyroom |
| Dimensions (w × h × d) | 0.16 × 0.20 × 0.01 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paper |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `SIGN-LOGO` — Northstar Logo Panel

| Field | Value |
| --- | --- |
| Category | signage |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | lobby |
| Dimensions (w × h × d) | 2.40 × 0.75 × 0.03 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | brand, emissive |
| Texture maps | baseColor, normal, roughness, ao, emissive |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `SIGN-NOTICE-EMP` — Employee Notice

| Field | Value |
| --- | --- |
| Category | signage |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | many |
| Dimensions (w × h × d) | 0.28 × 0.36 × 0.01 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paper |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 7 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `SIGN-NOTICE-SEC` — Security Notice

| Field | Value |
| --- | --- |
| Category | signage |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | vestibule, serverroom, garage |
| Dimensions (w × h × d) | 0.28 × 0.36 × 0.01 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paper |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 4 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `SIGN-NOTICE-TAPED` — Taped Paper Notice

| Field | Value |
| --- | --- |
| Category | signage |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | many |
| Dimensions (w × h × d) | 0.19 × 0.26 × 0.01 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paper |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 3 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `SIGN-PICTO-EXIT` — Exit Runner Pictogram

| Field | Value |
| --- | --- |
| Category | signage |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | many |
| Dimensions (w × h × d) | 0.15 × 0.15 × 0.01 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | sign |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 7 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `SIGN-PICTO-WC` — Restroom Pictogram

| Field | Value |
| --- | --- |
| Category | signage |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | restrooms, midcorr |
| Dimensions (w × h × d) | 0.15 × 0.15 × 0.01 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | sign |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 2 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `SIGN-ROOMPLATE` — Room Number Plate

| Field | Value |
| --- | --- |
| Category | signage |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | many |
| Dimensions (w × h × d) | 0.16 × 0.08 × 0.01 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | sign |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 6 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `SIGN-SAFETY` — Safety Poster

| Field | Value |
| --- | --- |
| Category | signage |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | servicecorr, loading, breakroom |
| Dimensions (w × h × d) | 0.42 × 0.56 × 0.01 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paper |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | InstancedMesh shared geometry; dropped by propDensity when small |
| Instances in level | 5 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `SIGN-SHIPLABEL` — Shipping Label Placard

| Field | Value |
| --- | --- |
| Category | signage |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | loading |
| Dimensions (w × h × d) | 0.30 × 0.20 × 0.01 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | paper |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |

### `SIGN-WAYFIND` — Wayfinding Sign

| Field | Value |
| --- | --- |
| Category | signage |
| Responsible agent | Fable 3 — props & materials |
| File locations | src/props/library.js, src/props/populate.js |
| Rooms / game states | lobby, midcorr, stairwell |
| Dimensions (w × h × d) | 0.64 × 0.40 × 0.02 m |
| Pivot & orientation | base-centre, -Z forward (wall-mounted props pivot at the wall face) |
| Material slots | sign |
| Texture maps | baseColor, normal, roughness, ao |
| Collision | none |
| LOD | single shared-geometry mesh group |
| Instances in level | 3 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale; chamfered visible edges; rests exactly on floor; collision proxy matches silhouette; no baked lighting. |
| Playwright evidence | tests/props.spec.js + QA gallery screenshot |
| Remaining discrepancies | none |


## vfx (27)

### `VFX-BLOOD` — Blood spray

| Field | Value |
| --- | --- |
| Category | vfx |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/fx/effects.js |
| Rooms / game states | gameplay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | world-space |
| Material slots | additive/alpha point sprites |
| Texture maps | procedural canvas sprites |
| Collision | n/a |
| LOD | particle counts scale with quality.particleScale |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Mist + droplets; grey puff under reducedBlood. |
| Playwright evidence | tests/effects.spec.js |
| Remaining discrepancies | none |

### `VFX-DOOR-IMPACT` — Door impact dust

| Field | Value |
| --- | --- |
| Category | vfx |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/fx/effects.js |
| Rooms / game states | gameplay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | world-space |
| Material slots | additive/alpha point sprites |
| Texture maps | procedural canvas sprites |
| Collision | n/a |
| LOD | particle counts scale with quality.particleScale |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Splinters + dust at the impact point. |
| Playwright evidence | tests/effects.spec.js |
| Remaining discrepancies | none |

### `VFX-DUST-MOTES` — Ambient dust motes

| Field | Value |
| --- | --- |
| Category | vfx |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/fx/effects.js |
| Rooms / game states | gameplay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | world-space |
| Material slots | additive/alpha point sprites |
| Texture maps | procedural canvas sprites |
| Collision | n/a |
| LOD | particle counts scale with quality.particleScale |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Slow drift inside registered room bounds, only near the camera. |
| Playwright evidence | tests/effects.spec.js |
| Remaining discrepancies | none |

### `VFX-FLASH-DETONATION` — LX-2 flash detonation

| Field | Value |
| --- | --- |
| Category | vfx |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/fx/effects.js |
| Rooms / game states | gameplay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | world-space |
| Material slots | additive/alpha point sprites |
| Texture maps | procedural canvas sprites |
| Collision | n/a |
| LOD | particle counts scale with quality.particleScale |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | White core + shock ring + light pop; UI blind handled by combat. |
| Playwright evidence | tests/effects.spec.js |
| Remaining discrepancies | none |

### `VFX-GLASS-SHATTER` — Glass pane shatter

| Field | Value |
| --- | --- |
| Category | vfx |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/fx/effects.js |
| Rooms / game states | gameplay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | world-space |
| Material slots | additive/alpha point sprites |
| Texture maps | procedural canvas sprites |
| Collision | n/a |
| LOD | particle counts scale with quality.particleScale |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Pane hidden, fragments fall with gravity and rest at the sill line. |
| Playwright evidence | tests/effects.spec.js |
| Remaining discrepancies | none |

### `VFX-HOSTAGE-FEEDBACK` — Hostage feedback burst

| Field | Value |
| --- | --- |
| Category | vfx |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/fx/effects.js |
| Rooms / game states | gameplay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | world-space |
| Material slots | additive/alpha point sprites |
| Texture maps | procedural canvas sprites |
| Collision | n/a |
| LOD | particle counts scale with quality.particleScale |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Teal secured / amber warning ring + sparkles. |
| Playwright evidence | tests/effects.spec.js |
| Remaining discrepancies | none |

### `VFX-IMPACT-CONCRETE` — Bullet impact — concrete

| Field | Value |
| --- | --- |
| Category | vfx |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/fx/effects.js |
| Rooms / game states | gameplay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | world-space |
| Material slots | additive/alpha point sprites |
| Texture maps | procedural canvas sprites |
| Collision | n/a |
| LOD | particle counts scale with quality.particleScale |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Reads the surface type at a glance; flesh mist suppressed by reducedBlood. |
| Playwright evidence | tests/effects.spec.js |
| Remaining discrepancies | none |

### `VFX-IMPACT-DRYWALL` — Bullet impact — drywall

| Field | Value |
| --- | --- |
| Category | vfx |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/fx/effects.js |
| Rooms / game states | gameplay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | world-space |
| Material slots | additive/alpha point sprites |
| Texture maps | procedural canvas sprites |
| Collision | n/a |
| LOD | particle counts scale with quality.particleScale |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Reads the surface type at a glance; flesh mist suppressed by reducedBlood. |
| Playwright evidence | tests/effects.spec.js |
| Remaining discrepancies | none |

### `VFX-IMPACT-FABRIC` — Bullet impact — fabric

| Field | Value |
| --- | --- |
| Category | vfx |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/fx/effects.js |
| Rooms / game states | gameplay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | world-space |
| Material slots | additive/alpha point sprites |
| Texture maps | procedural canvas sprites |
| Collision | n/a |
| LOD | particle counts scale with quality.particleScale |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Reads the surface type at a glance; flesh mist suppressed by reducedBlood. |
| Playwright evidence | tests/effects.spec.js |
| Remaining discrepancies | none |

### `VFX-IMPACT-FLESH` — Bullet impact — flesh

| Field | Value |
| --- | --- |
| Category | vfx |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/fx/effects.js |
| Rooms / game states | gameplay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | world-space |
| Material slots | additive/alpha point sprites |
| Texture maps | procedural canvas sprites |
| Collision | n/a |
| LOD | particle counts scale with quality.particleScale |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Reads the surface type at a glance; flesh mist suppressed by reducedBlood. |
| Playwright evidence | tests/effects.spec.js |
| Remaining discrepancies | none |

### `VFX-IMPACT-GLASS` — Bullet impact — glass

| Field | Value |
| --- | --- |
| Category | vfx |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/fx/effects.js |
| Rooms / game states | gameplay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | world-space |
| Material slots | additive/alpha point sprites |
| Texture maps | procedural canvas sprites |
| Collision | n/a |
| LOD | particle counts scale with quality.particleScale |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Reads the surface type at a glance; flesh mist suppressed by reducedBlood. |
| Playwright evidence | tests/effects.spec.js |
| Remaining discrepancies | none |

### `VFX-IMPACT-METAL` — Bullet impact — metal

| Field | Value |
| --- | --- |
| Category | vfx |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/fx/effects.js |
| Rooms / game states | gameplay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | world-space |
| Material slots | additive/alpha point sprites |
| Texture maps | procedural canvas sprites |
| Collision | n/a |
| LOD | particle counts scale with quality.particleScale |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Reads the surface type at a glance; flesh mist suppressed by reducedBlood. |
| Playwright evidence | tests/effects.spec.js |
| Remaining discrepancies | none |

### `VFX-IMPACT-SNOW` — Bullet impact — snow

| Field | Value |
| --- | --- |
| Category | vfx |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/fx/effects.js |
| Rooms / game states | gameplay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | world-space |
| Material slots | additive/alpha point sprites |
| Texture maps | procedural canvas sprites |
| Collision | n/a |
| LOD | particle counts scale with quality.particleScale |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Reads the surface type at a glance; flesh mist suppressed by reducedBlood. |
| Playwright evidence | tests/effects.spec.js |
| Remaining discrepancies | none |

### `VFX-IMPACT-WOOD` — Bullet impact — wood

| Field | Value |
| --- | --- |
| Category | vfx |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/fx/effects.js |
| Rooms / game states | gameplay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | world-space |
| Material slots | additive/alpha point sprites |
| Texture maps | procedural canvas sprites |
| Collision | n/a |
| LOD | particle counts scale with quality.particleScale |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Reads the surface type at a glance; flesh mist suppressed by reducedBlood. |
| Playwright evidence | tests/effects.spec.js |
| Remaining discrepancies | none |

### `VFX-MUZZLE-PISTOL` — Muzzle flash — pistol

| Field | Value |
| --- | --- |
| Category | vfx |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/fx/effects.js |
| Rooms / game states | gameplay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | world-space |
| Material slots | additive/alpha point sprites |
| Texture maps | procedural canvas sprites |
| Collision | n/a |
| LOD | particle counts scale with quality.particleScale |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Distinct silhouette per family: star core, halo, forward sparks, smoke wisp, <80 ms light pulse. |
| Playwright evidence | tests/effects.spec.js |
| Remaining discrepancies | none |

### `VFX-MUZZLE-RIFLE` — Muzzle flash — rifle

| Field | Value |
| --- | --- |
| Category | vfx |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/fx/effects.js |
| Rooms / game states | gameplay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | world-space |
| Material slots | additive/alpha point sprites |
| Texture maps | procedural canvas sprites |
| Collision | n/a |
| LOD | particle counts scale with quality.particleScale |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Distinct silhouette per family: star core, halo, forward sparks, smoke wisp, <80 ms light pulse. |
| Playwright evidence | tests/effects.spec.js |
| Remaining discrepancies | none |

### `VFX-MUZZLE-SHOTGUN` — Muzzle flash — shotgun

| Field | Value |
| --- | --- |
| Category | vfx |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/fx/effects.js |
| Rooms / game states | gameplay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | world-space |
| Material slots | additive/alpha point sprites |
| Texture maps | procedural canvas sprites |
| Collision | n/a |
| LOD | particle counts scale with quality.particleScale |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Distinct silhouette per family: star core, halo, forward sparks, smoke wisp, <80 ms light pulse. |
| Playwright evidence | tests/effects.spec.js |
| Remaining discrepancies | none |

### `VFX-MUZZLE-SMG` — Muzzle flash — smg

| Field | Value |
| --- | --- |
| Category | vfx |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/fx/effects.js |
| Rooms / game states | gameplay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | world-space |
| Material slots | additive/alpha point sprites |
| Texture maps | procedural canvas sprites |
| Collision | n/a |
| LOD | particle counts scale with quality.particleScale |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Distinct silhouette per family: star core, halo, forward sparks, smoke wisp, <80 ms light pulse. |
| Playwright evidence | tests/effects.spec.js |
| Remaining discrepancies | none |

### `VFX-MUZZLE-SNIPER` — Muzzle flash — sniper

| Field | Value |
| --- | --- |
| Category | vfx |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/fx/effects.js |
| Rooms / game states | gameplay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | world-space |
| Material slots | additive/alpha point sprites |
| Texture maps | procedural canvas sprites |
| Collision | n/a |
| LOD | particle counts scale with quality.particleScale |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Distinct silhouette per family: star core, halo, forward sparks, smoke wisp, <80 ms light pulse. |
| Playwright evidence | tests/effects.spec.js |
| Remaining discrepancies | none |

### `VFX-OBJECTIVE-MARKER` — Objective marker pulse

| Field | Value |
| --- | --- |
| Category | vfx |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/fx/effects.js |
| Rooms / game states | gameplay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | world-space |
| Material slots | additive/alpha point sprites |
| Texture maps | procedural canvas sprites |
| Collision | n/a |
| LOD | particle counts scale with quality.particleScale |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Pulsing ring + column glow; removable handle. |
| Playwright evidence | tests/effects.spec.js |
| Remaining discrepancies | none |

### `VFX-POSTFX-COMPOSITE` — Post-processing composite (bloom, grade, vignette, grain, FXAA, motion blur)

| Field | Value |
| --- | --- |
| Category | vfx |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/fx/postfx.js |
| Rooms / game states | fullscreen |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | n/a |
| Material slots | fullscreen shaders |
| Texture maps | render targets |
| Collision | n/a |
| LOD | bloom at quarter res; every stage toggled by settings |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | ACES output matches the raw pipeline; motion blur exists but defaults OFF; respects bloom/vignette/filmGrain/motionBlur/quality/resolutionScale. |
| Playwright evidence | tests/postfx.spec.js |
| Remaining discrepancies | none |

### `VFX-SHELL-CASINGS` — Ejected shell casings

| Field | Value |
| --- | --- |
| Category | vfx |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/fx/effects.js |
| Rooms / game states | gameplay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | world-space |
| Material slots | additive/alpha point sprites |
| Texture maps | procedural canvas sprites |
| Collision | n/a |
| LOD | particle counts scale with quality.particleScale |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Instanced, bounce with a bus tink event, come to rest, expire. |
| Playwright evidence | tests/effects.spec.js |
| Remaining discrepancies | none |

### `VFX-SMOKE-VOLUME` — Smoke grenade volume

| Field | Value |
| --- | --- |
| Category | vfx |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/fx/effects.js |
| Rooms / game states | gameplay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | world-space |
| Material slots | additive/alpha point sprites |
| Texture maps | procedural canvas sprites |
| Collision | n/a |
| LOD | particle counts scale with quality.particleScale |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Blocks AI line of sight via blocksLineOfSight(a,b) during its solid window. |
| Playwright evidence | tests/effects.spec.js |
| Remaining discrepancies | none |

### `VFX-TRACER` — Bullet tracer streak

| Field | Value |
| --- | --- |
| Category | vfx |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/fx/effects.js |
| Rooms / game states | gameplay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | world-space |
| Material slots | additive/alpha point sprites |
| Texture maps | procedural canvas sprites |
| Collision | n/a |
| LOD | particle counts scale with quality.particleScale |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Subtle stretched streak, not a laser; 90 ms. |
| Playwright evidence | tests/effects.spec.js |
| Remaining discrepancies | none |

### `VFX-TRANSITION-DEFEAT` — Defeat transition

| Field | Value |
| --- | --- |
| Category | vfx |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/fx/effects.js |
| Rooms / game states | gameplay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | world-space |
| Material slots | additive/alpha point sprites |
| Texture maps | procedural canvas sprites |
| Collision | n/a |
| LOD | particle counts scale with quality.particleScale |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Red pulse + settling smoke. |
| Playwright evidence | tests/effects.spec.js |
| Remaining discrepancies | none |

### `VFX-TRANSITION-VICTORY` — Victory transition

| Field | Value |
| --- | --- |
| Category | vfx |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/fx/effects.js |
| Rooms / game states | gameplay |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | world-space |
| Material slots | additive/alpha point sprites |
| Texture maps | procedural canvas sprites |
| Collision | n/a |
| LOD | particle counts scale with quality.particleScale |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Cool pulse + rising motes. |
| Playwright evidence | tests/effects.spec.js |
| Remaining discrepancies | none |

### `VFX-WEATHER-STORM` — Winter storm (snow, wind streaks, breath vapour, haze)

| Field | Value |
| --- | --- |
| Category | vfx |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/fx/weather.js |
| Rooms / game states | courtyard, eastapron, entrance, garage |
| Dimensions (w × h × d) | 0.00 × 0.00 × 0.00 m |
| Pivot & orientation | world-space |
| Material slots | point sprites, alpha planes |
| Texture maps | procedural flake/streak/haze |
| Collision | n/a |
| LOD | snow culled when the camera is deep inside; counts scale with particleScale |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Snow only in exterior volumes + open doorways; breath puffs in cold zones; haze visible through glazing. |
| Playwright evidence | tests/weather.spec.js |
| Remaining discrepancies | none |


## weapon (8)

### `WPN-CS12-BREAKER` — CS-12 Breaker — Corvid Systems

| Field | Value |
| --- | --- |
| Category | weapon |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/weapons-models.js |
| Rooms / game states | loadout, enemy hands, pickups |
| Dimensions (w × h × d) | 0.13 × 0.19 × 0.94 m |
| Pivot & orientation | firing-hand grip, barrel -Z |
| Material slots | polymer frame, phosphate steel, aluminium receiver, rubber grip, glass optic, brass |
| Texture maps | procedural PBR, canvas hudIcon + inventoryIcon (line art) |
| Collision | none (attached) / aabb (pickup) |
| LOD | shared geometry FP + world; icons for HUD |
| Animation states | fire, reload_tactical, reload_empty, draw, holster, inspect |
| Audio dependencies | shotgun fire/reload set |
| Instances in level | 0 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale (0.94 m long), separate magazine child, cycling slide/bolt, muzzle + ejection empties, iron sights or optic. |
| Playwright evidence | tests/weapons.spec.js + gallery screenshots |
| Remaining discrepancies | none |

### `WPN-HL700-LONGSIGHT` — HL-700 Longsight — Hollowpoint Industrial

| Field | Value |
| --- | --- |
| Category | weapon |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/weapons-models.js |
| Rooms / game states | loadout, enemy hands, pickups |
| Dimensions (w × h × d) | 0.09 × 0.25 × 1.10 m |
| Pivot & orientation | firing-hand grip, barrel -Z |
| Material slots | polymer frame, phosphate steel, aluminium receiver, rubber grip, glass optic, brass |
| Texture maps | procedural PBR, canvas hudIcon + inventoryIcon (line art) |
| Collision | none (attached) / aabb (pickup) |
| LOD | shared geometry FP + world; icons for HUD |
| Animation states | fire, reload_tactical, reload_empty, draw, holster, inspect |
| Audio dependencies | sniper fire/reload set |
| Instances in level | 6 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale (1.1 m long), separate magazine child, cycling slide/bolt, muzzle + ejection empties, iron sights or optic. |
| Playwright evidence | tests/weapons.spec.js + gallery screenshots |
| Remaining discrepancies | none |

### `WPN-KD4-RANGER` — KD-4 Ranger — Kessler Defence

| Field | Value |
| --- | --- |
| Category | weapon |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/weapons-models.js |
| Rooms / game states | loadout, enemy hands, pickups |
| Dimensions (w × h × d) | 0.06 × 0.36 × 0.84 m |
| Pivot & orientation | firing-hand grip, barrel -Z |
| Material slots | polymer frame, phosphate steel, aluminium receiver, rubber grip, glass optic, brass |
| Texture maps | procedural PBR, canvas hudIcon + inventoryIcon (line art) |
| Collision | none (attached) / aabb (pickup) |
| LOD | shared geometry FP + world; icons for HUD |
| Animation states | fire, reload_tactical, reload_empty, draw, holster, inspect |
| Audio dependencies | carbine fire/reload set |
| Instances in level | 16 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale (0.84 m long), separate magazine child, cycling slide/bolt, muzzle + ejection empties, iron sights or optic. |
| Playwright evidence | tests/weapons.spec.js + gallery screenshots |
| Remaining discrepancies | none |

### `WPN-LX2-FLASHBANG` — LX-2 Flashbang — Vantor

| Field | Value |
| --- | --- |
| Category | weapon |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/weapons-models.js |
| Rooms / game states | loadout, enemy hands, pickups |
| Dimensions (w × h × d) | 0.07 × 0.14 × 0.07 m |
| Pivot & orientation | firing-hand grip, barrel -Z |
| Material slots | polymer frame, phosphate steel, aluminium receiver, rubber grip, glass optic, brass |
| Texture maps | procedural PBR, canvas hudIcon + inventoryIcon (line art) |
| Collision | none (attached) / aabb (pickup) |
| LOD | shared geometry FP + world; icons for HUD |
| Animation states | fire, reload_tactical, reload_empty, draw, holster, inspect |
| Audio dependencies | flash fire/reload set |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale (0.066 m long), separate magazine child, cycling slide/bolt, muzzle + ejection empties, iron sights or optic. |
| Playwright evidence | tests/weapons.spec.js + gallery screenshots |
| Remaining discrepancies | none |

### `WPN-NW9-SIDEARM` — NW-9 Sidearm — Meridian Arms

| Field | Value |
| --- | --- |
| Category | weapon |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/weapons-models.js |
| Rooms / game states | loadout, enemy hands, pickups |
| Dimensions (w × h × d) | 0.04 × 0.17 × 0.19 m |
| Pivot & orientation | firing-hand grip, barrel -Z |
| Material slots | polymer frame, phosphate steel, aluminium receiver, rubber grip, glass optic, brass |
| Texture maps | procedural PBR, canvas hudIcon + inventoryIcon (line art) |
| Collision | none (attached) / aabb (pickup) |
| LOD | shared geometry FP + world; icons for HUD |
| Animation states | fire, reload_tactical, reload_empty, draw, holster, inspect |
| Audio dependencies | pistol fire/reload set |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale (0.19 m long), separate magazine child, cycling slide/bolt, muzzle + ejection empties, iron sights or optic. |
| Playwright evidence | tests/weapons.spec.js + gallery screenshots |
| Remaining discrepancies | none |

### `WPN-SM6-SMOKE` — SM-6 Smoke Canister — Kessler Defence

| Field | Value |
| --- | --- |
| Category | weapon |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/weapons-models.js |
| Rooms / game states | loadout, enemy hands, pickups |
| Dimensions (w × h × d) | 0.06 × 0.15 × 0.06 m |
| Pivot & orientation | firing-hand grip, barrel -Z |
| Material slots | polymer frame, phosphate steel, aluminium receiver, rubber grip, glass optic, brass |
| Texture maps | procedural PBR, canvas hudIcon + inventoryIcon (line art) |
| Collision | none (attached) / aabb (pickup) |
| LOD | shared geometry FP + world; icons for HUD |
| Animation states | fire, reload_tactical, reload_empty, draw, holster, inspect |
| Audio dependencies | smoke fire/reload set |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale (0.062 m long), separate magazine child, cycling slide/bolt, muzzle + ejection empties, iron sights or optic. |
| Playwright evidence | tests/weapons.spec.js + gallery screenshots |
| Remaining discrepancies | none |

### `WPN-TALON-KNIFE` — Talon — Corvid Systems

| Field | Value |
| --- | --- |
| Category | weapon |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/weapons-models.js |
| Rooms / game states | loadout, enemy hands, pickups |
| Dimensions (w × h × d) | 0.04 × 0.06 × 0.27 m |
| Pivot & orientation | firing-hand grip, barrel -Z |
| Material slots | polymer frame, phosphate steel, aluminium receiver, rubber grip, glass optic, brass |
| Texture maps | procedural PBR, canvas hudIcon + inventoryIcon (line art) |
| Collision | none (attached) / aabb (pickup) |
| LOD | shared geometry FP + world; icons for HUD |
| Animation states | fire, reload_tactical, reload_empty, draw, holster, inspect |
| Audio dependencies | knife fire/reload set |
| Instances in level | 1 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale (0.27 m long), separate magazine child, cycling slide/bolt, muzzle + ejection empties, iron sights or optic. |
| Playwright evidence | tests/weapons.spec.js + gallery screenshots |
| Remaining discrepancies | none |

### `WPN-VK7-WHISPER` — VK-7 Whisper — Vantor

| Field | Value |
| --- | --- |
| Category | weapon |
| Responsible agent | Fable 4 — characters & effects |
| File locations | src/characters/weapons-models.js |
| Rooms / game states | loadout, enemy hands, pickups |
| Dimensions (w × h × d) | 0.08 × 0.28 × 0.59 m |
| Pivot & orientation | firing-hand grip, barrel -Z |
| Material slots | polymer frame, phosphate steel, aluminium receiver, rubber grip, glass optic, brass |
| Texture maps | procedural PBR, canvas hudIcon + inventoryIcon (line art) |
| Collision | none (attached) / aabb (pickup) |
| LOD | shared geometry FP + world; icons for HUD |
| Animation states | fire, reload_tactical, reload_empty, draw, holster, inspect |
| Audio dependencies | smg fire/reload set |
| Instances in level | 6 |
| Status | **integrated** |
| Acceptance criteria | Real-world scale (0.59 m long), separate magazine child, cycling slide/bolt, muzzle + ejection empties, iron sights or optic. |
| Playwright evidence | tests/weapons.spec.js + gallery screenshots |
| Remaining discrepancies | none |

