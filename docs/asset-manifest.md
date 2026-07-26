<!--
  GENERATED FILE — do not edit by hand.
  Produced by: node tests/tools/generate-manifest.mjs
  Source of truth: the reg() calls in each owning module.
-->
# Northstar Rescue — Asset Manifest

Total registered assets: **429** · Accepted: **414** · Registration warnings: **0**

## architecture

### `arch.wall.straight` — Straight wall module

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/kit.js, src/map/shell.js
- **Used in:** all rooms
- **Dimensions (m):** 0.16 m thick × variable, 8 mm arris bevel
- **Pivot / orientation:** centre of panel, +Y up
- **Material slots:** drywall.*, concrete.wall, tile.mosaic
- **Texture maps:** baseColor, normal, roughness
- **Collision:** AABB matching panel
- **LOD:** merged into per-material static batches; no separate LOD needed (screen-space cost is fill-bound)
- **Status:** accepted
- **Acceptance criteria:** Beveled arrises visible at 1 m; no razor edge; baseboard aligned; material tiles at 2.4 m
- **Playwright evidence:** screenshots/rooms/*.png
- **Remaining discrepancies:** none

### `arch.wall.corner` — Interior/exterior corner

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/kit.js, src/map/shell.js
- **Used in:** every room junction
- **Dimensions (m):** derived from panel intersections
- **Pivot / orientation:** shared with panels
- **Material slots:** drywall.*
- **Texture maps:** baseColor, normal, roughness
- **Collision:** covered by panel AABBs
- **LOD:** merged into per-material static batches; no separate LOD needed (screen-space cost is fill-bound)
- **Status:** accepted
- **Acceptance criteria:** No gap or z-fight at corners; bevels meet cleanly
- **Playwright evidence:** screenshots/rooms/*.png
- **Remaining discrepancies:** none

### `arch.wall.half` — Half wall / knee wall

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/kit.js, src/map/shell.js
- **Used in:** open plan, mezzanine, reception
- **Dimensions (m):** 1.1 m high
- **Pivot / orientation:** panel centre
- **Material slots:** drywall.*, wood.veneer
- **Texture maps:** baseColor, normal, roughness
- **Collision:** AABB
- **LOD:** merged into per-material static batches; no separate LOD needed (screen-space cost is fill-bound)
- **Status:** accepted
- **Acceptance criteria:** Cap trim present; readable as vaultable-looking but solid cover
- **Playwright evidence:** screenshots/rooms/*.png
- **Remaining discrepancies:** none

### `arch.doorframe` — Door frame module

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/kit.js, src/map/shell.js
- **Used in:** every doorway
- **Dimensions (m):** 0.06 m jamb, head, threshold strip
- **Pivot / orientation:** opening centre at floor
- **Material slots:** wood.pale, metal.brushed
- **Texture maps:** baseColor, normal, roughness
- **Collision:** none (door leaf carries collision)
- **LOD:** merged into per-material static batches; no separate LOD needed (screen-space cost is fill-bound)
- **Status:** accepted
- **Acceptance criteria:** Jambs enclose the opening; threshold strip present; no floating
- **Playwright evidence:** screenshots/rooms/*.png
- **Remaining discrepancies:** none

### `arch.archreveal` — Cased opening reveal

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/kit.js, src/map/shell.js
- **Used in:** wide arches
- **Dimensions (m):** 0.03 m reveal
- **Pivot / orientation:** opening centre
- **Material slots:** drywall.*
- **Texture maps:** baseColor, normal, roughness
- **Collision:** none
- **LOD:** merged into per-material static batches; no separate LOD needed (screen-space cost is fill-bound)
- **Status:** accepted
- **Acceptance criteria:** Reveal wraps head and both jambs; no exposed wall core
- **Playwright evidence:** screenshots/rooms/*.png
- **Remaining discrepancies:** none

### `arch.windowframe` — Window frame + mullion grid

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/kit.js, src/map/shell.js
- **Used in:** all glazing
- **Dimensions (m):** 60 mm mullion, 1.5 m panel pitch
- **Pivot / orientation:** opening centre
- **Material slots:** metal.aluminium, laminate.white
- **Texture maps:** baseColor, normal, roughness
- **Collision:** sill AABB only
- **LOD:** merged into per-material static batches; no separate LOD needed (screen-space cost is fill-bound)
- **Status:** accepted
- **Acceptance criteria:** Mullions align on a consistent grid; sill has thickness; glass reads as glass
- **Playwright evidence:** screenshots/rooms/*.png
- **Remaining discrepancies:** none

### `arch.column` — Structural column

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/kit.js, src/map/shell.js
- **Used in:** lobby, open plan, garage
- **Dimensions (m):** 0.42 m square × storey height
- **Pivot / orientation:** base centre
- **Material slots:** drywall.cool, metal.brushed
- **Texture maps:** baseColor, normal, roughness
- **Collision:** AABB
- **LOD:** merged into per-material static batches; no separate LOD needed (screen-space cost is fill-bound)
- **Status:** accepted
- **Acceptance criteria:** Base and capital present; bevels at 16 mm; aligns to structural grid
- **Playwright evidence:** screenshots/rooms/*.png
- **Remaining discrepancies:** none

### `arch.ceilinggrid` — Suspended ceiling grid

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/kit.js, src/map/shell.js
- **Used in:** all gridded rooms
- **Dimensions (m):** 600 mm T-bar module
- **Pivot / orientation:** room origin
- **Material slots:** metal.aluminium, ceiling.tile
- **Texture maps:** baseColor, normal, roughness
- **Collision:** ceiling AABB
- **LOD:** merged into per-material static batches; no separate LOD needed (screen-space cost is fill-bound)
- **Status:** accepted
- **Acceptance criteria:** Grid aligns to room; tiles inset in grid; plenum backing prevents void
- **Playwright evidence:** screenshots/rooms/*.png
- **Remaining discrepancies:** none

### `arch.ceilingtile.intact` — Intact ceiling tile

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/kit.js, src/map/shell.js
- **Used in:** all gridded rooms
- **Dimensions (m):** 0.6 × 0.6 × 0.016 m
- **Pivot / orientation:** tile centre
- **Material slots:** ceiling.tile
- **Texture maps:** baseColor, normal, roughness
- **Collision:** part of ceiling AABB
- **LOD:** merged into per-material static batches; no separate LOD needed (screen-space cost is fill-bound)
- **Status:** accepted
- **Acceptance criteria:** Fissured mineral-fibre read; no tiling repeat visible from below
- **Playwright evidence:** screenshots/rooms/*.png
- **Remaining discrepancies:** none

### `arch.ceilingtile.stained` — Stained ceiling tile

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/kit.js, src/map/shell.js
- **Used in:** break room, service corridor, loading
- **Dimensions (m):** 0.6 × 0.6 × 0.016 m
- **Pivot / orientation:** tile centre
- **Material slots:** ceiling.tileStained
- **Texture maps:** baseColor, normal, roughness
- **Collision:** part of ceiling AABB
- **LOD:** merged into per-material static batches; no separate LOD needed (screen-space cost is fill-bound)
- **Status:** accepted
- **Acceptance criteria:** Water stain reads as a leak, not a texture error
- **Playwright evidence:** screenshots/rooms/*.png
- **Remaining discrepancies:** none

### `arch.ceilingtile.missing` — Missing ceiling tile

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/kit.js, src/map/shell.js
- **Used in:** service corridor, IT, loading
- **Dimensions (m):** 0.6 × 0.6 m void
- **Pivot / orientation:** tile centre
- **Material slots:** ceiling.plenum
- **Texture maps:** baseColor
- **Collision:** part of ceiling AABB
- **LOD:** merged into per-material static batches; no separate LOD needed (screen-space cost is fill-bound)
- **Status:** accepted
- **Acceptance criteria:** Reveals dark plenum with visible services, never the skybox
- **Playwright evidence:** screenshots/rooms/*.png
- **Remaining discrepancies:** none

### `arch.floor.carpet` — Carpet floor module

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/kit.js, src/map/shell.js
- **Used in:** open plan, lobby, executive
- **Dimensions (m):** per-room slab
- **Pivot / orientation:** room origin
- **Material slots:** carpet.*
- **Texture maps:** baseColor, normal, roughness
- **Collision:** floor AABB
- **LOD:** merged into per-material static batches; no separate LOD needed (screen-space cost is fill-bound)
- **Status:** accepted
- **Acceptance criteria:** Tiles at 2 m; no stretched UV; seam-free at room joins
- **Playwright evidence:** screenshots/rooms/*.png
- **Remaining discrepancies:** none

### `arch.floor.tile` — Tile floor module

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/kit.js, src/map/shell.js
- **Used in:** restrooms, vestibule, server
- **Dimensions (m):** per-room slab
- **Pivot / orientation:** room origin
- **Material slots:** tile.*
- **Texture maps:** baseColor, normal, roughness
- **Collision:** floor AABB
- **LOD:** merged into per-material static batches; no separate LOD needed (screen-space cost is fill-bound)
- **Status:** accepted
- **Acceptance criteria:** Grout lines continuous across the room, aligned to walls
- **Playwright evidence:** screenshots/rooms/*.png
- **Remaining discrepancies:** none

### `arch.floor.concrete` — Concrete floor module

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/kit.js, src/map/shell.js
- **Used in:** loading, garage, plant
- **Dimensions (m):** per-room slab
- **Pivot / orientation:** room origin
- **Material slots:** concrete.*
- **Texture maps:** baseColor, normal, roughness
- **Collision:** floor AABB
- **LOD:** merged into per-material static batches; no separate LOD needed (screen-space cost is fill-bound)
- **Status:** accepted
- **Acceptance criteria:** Trowel variation visible; joints present in large bays
- **Playwright evidence:** screenshots/rooms/*.png
- **Remaining discrepancies:** none

### `arch.stair.flight` — Stair flight module

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/kit.js, src/map/shell.js
- **Used in:** central stairwell, fire stair
- **Dimensions (m):** 12 risers @ 175 mm, 280 mm tread, 1.3–1.5 m wide
- **Pivot / orientation:** bottom-front-centre
- **Material slots:** concrete.polished, metal.brushed
- **Texture maps:** baseColor, normal, roughness
- **Collision:** per-tread AABB
- **LOD:** merged into per-material static batches; no separate LOD needed (screen-space cost is fill-bound)
- **Status:** accepted
- **Acceptance criteria:** Player and AI ascend smoothly; nosings visible; handrail follows slope
- **Playwright evidence:** screenshots/rooms/*.png
- **Remaining discrepancies:** none

### `arch.stair.landing` — Stair landing

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/kit.js, src/map/shell.js
- **Used in:** both stairs
- **Dimensions (m):** variable
- **Pivot / orientation:** slab centre
- **Material slots:** concrete.polished
- **Texture maps:** baseColor, normal, roughness
- **Collision:** slab AABB
- **LOD:** merged into per-material static batches; no separate LOD needed (screen-space cost is fill-bound)
- **Status:** accepted
- **Acceptance criteria:** Flush with flights; no step lip that catches movement
- **Playwright evidence:** screenshots/rooms/*.png
- **Remaining discrepancies:** none

### `arch.railing` — Railing module

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/kit.js, src/map/shell.js
- **Used in:** mezzanine, stairs, loading dock
- **Dimensions (m):** 1.06 m high, 1.4 m post pitch
- **Pivot / orientation:** run start
- **Material slots:** metal.brushed, glass.clear
- **Texture maps:** baseColor, normal, roughness
- **Collision:** run AABB
- **LOD:** merged into per-material static batches; no separate LOD needed (screen-space cost is fill-bound)
- **Status:** accepted
- **Acceptance criteria:** Blocks falls; glass infill reads as glass; posts do not intersect treads
- **Playwright evidence:** screenshots/rooms/*.png
- **Remaining discrepancies:** none

### `arch.baseboard` — Baseboard

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/kit.js, src/map/shell.js
- **Used in:** all finished rooms
- **Dimensions (m):** 110 mm high
- **Pivot / orientation:** wall base
- **Material slots:** wood.pale
- **Texture maps:** baseColor, normal, roughness
- **Collision:** within wall AABB
- **LOD:** merged into per-material static batches; no separate LOD needed (screen-space cost is fill-bound)
- **Status:** accepted
- **Acceptance criteria:** Continuous at corners; returns into door jambs
- **Playwright evidence:** screenshots/rooms/*.png
- **Remaining discrepancies:** none

### `arch.crown` — Edge trim

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/kit.js, src/map/shell.js
- **Used in:** executive, boardroom, lobby
- **Dimensions (m):** 55 mm
- **Pivot / orientation:** wall head
- **Material slots:** drywall.cool
- **Texture maps:** baseColor, normal, roughness
- **Collision:** within wall AABB
- **LOD:** merged into per-material static batches; no separate LOD needed (screen-space cost is fill-bound)
- **Status:** accepted
- **Acceptance criteria:** Reads at gameplay distance without aliasing
- **Playwright evidence:** screenshots/rooms/*.png
- **Remaining discrepancies:** none

### `arch.duct` — Duct module

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/kit.js, src/map/shell.js
- **Used in:** plant, service corridor, plenum
- **Dimensions (m):** 0.44 m square section
- **Pivot / orientation:** run centre
- **Material slots:** metal.galvanised
- **Texture maps:** baseColor, normal, roughness
- **Collision:** run AABB
- **LOD:** merged into per-material static batches; no separate LOD needed (screen-space cost is fill-bound)
- **Status:** accepted
- **Acceptance criteria:** Flanged joints every 1.2 m; supported, never floating
- **Playwright evidence:** screenshots/rooms/*.png
- **Remaining discrepancies:** none

### `arch.pipe` — Pipe & conduit module

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/kit.js, src/map/shell.js
- **Used in:** plant, garage, service spine
- **Dimensions (m):** 50–100 mm dia
- **Pivot / orientation:** run centre
- **Material slots:** metal.galvanised, metal.painted
- **Texture maps:** baseColor, normal, roughness
- **Collision:** none (visual)
- **LOD:** merged into per-material static batches; no separate LOD needed (screen-space cost is fill-bound)
- **Status:** accepted
- **Acceptance criteria:** Hangers at 2.2 m; runs terminate into equipment or walls
- **Playwright evidence:** screenshots/rooms/*.png
- **Remaining discrepancies:** none

### `arch.cabletray` — Cable tray

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/kit.js, src/map/shell.js
- **Used in:** server, IT, plenum
- **Dimensions (m):** 0.3 m wide
- **Pivot / orientation:** run centre
- **Material slots:** metal.galvanised, plastic.dark
- **Texture maps:** baseColor, normal, roughness
- **Collision:** none
- **LOD:** merged into per-material static batches; no separate LOD needed (screen-space cost is fill-bound)
- **Status:** accepted
- **Acceptance criteria:** Carries a visible cable bundle; brackets present
- **Playwright evidence:** screenshots/rooms/*.png
- **Remaining discrepancies:** none

### `arch.floordrain` — Floor drain

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/kit.js, src/map/shell.js
- **Used in:** restroom, janitor, garage
- **Dimensions (m):** 0.18 m dia
- **Pivot / orientation:** centre at floor
- **Material slots:** metal.stainless
- **Texture maps:** baseColor, normal, roughness
- **Collision:** none
- **LOD:** merged into per-material static batches; no separate LOD needed (screen-space cost is fill-bound)
- **Status:** accepted
- **Acceptance criteria:** Sits flush in the floor, no z-fighting with the slab
- **Playwright evidence:** screenshots/rooms/*.png
- **Remaining discrepancies:** none

### `arch.accesspanel` — Utility access panel

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/kit.js, src/map/shell.js
- **Used in:** corridors, plant, garage
- **Dimensions (m):** 0.5 × 0.5 m
- **Pivot / orientation:** panel centre
- **Material slots:** metal.painted
- **Texture maps:** baseColor, normal, roughness
- **Collision:** none
- **LOD:** merged into per-material static batches; no separate LOD needed (screen-space cost is fill-bound)
- **Status:** accepted
- **Acceptance criteria:** Latch detail present; sits proud of the wall by 18 mm
- **Playwright evidence:** screenshots/rooms/*.png
- **Remaining discrepancies:** none

### `arch.roofedge` — Roof edge / parapet

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/kit.js, src/map/shell.js
- **Used in:** single-storey roof seen from upper floor
- **Dimensions (m):** 0.55 m high coping
- **Pivot / orientation:** run centre
- **Material slots:** concrete.wall, metal.galvanised
- **Texture maps:** baseColor, normal, roughness
- **Collision:** AABB
- **LOD:** merged into per-material static batches; no separate LOD needed (screen-space cost is fill-bound)
- **Status:** accepted
- **Acceptance criteria:** Reads as a real coping from the executive windows; snow sits behind it
- **Playwright evidence:** screenshots/rooms/*.png
- **Remaining discrepancies:** none

## audio

### `audio.weapons` — Weapon fire, tails, handling foley

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/audio/index.js, src/audio/synth.js
- **Used in:** gameplay, ui
- **Dimensions (m):** n/a (audio)
- **Pivot / orientation:** n/a (audio)
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** n/a
- **LOD:** 32-voice cap, quietest stolen; reverb send per voice
- **Audio dependencies:** wpn.pistol.fire, wpn.smg.fire, wpn.rifle.fire, wpn.shotgun.fire, wpn.dmr.fire, wpn.pistol.tail, wpn.smg.tail, wpn.rifle.tail, wpn.shotgun.tail, wpn.dmr.tail, wpn.distant.indoor, wpn.distant.far, wpn.dry, wpn.magOut, wpn.magIn, wpn.chamber, wpn.draw, wpn.holster, wpn.pistol.reload, wpn.smg.reload, wpn.rifle.reload, wpn.shotgun.shell, wpn.shotgun.pump, wpn.dmr.reload, wpn.dmr.bolt, wpn.knife.swing, wpn.knife.hit
- **Status:** accepted
- **Acceptance criteria:** Five families read distinctly; reloads are timed composites; all synthesised.
- **Playwright evidence:** tests/combat.spec.js and tests/mission.spec.js exercise every trigger path; 109 sound ids resolve with zero missing, and every voice line carries a subtitle
- **Remaining discrepancies:** none

### `audio.casings` — Shell casing drops

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/audio/index.js, src/audio/synth.js
- **Used in:** gameplay, ui
- **Dimensions (m):** n/a (audio)
- **Pivot / orientation:** n/a (audio)
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** n/a
- **LOD:** 32-voice cap, quietest stolen; reverb send per voice
- **Audio dependencies:** shell.small, shell.rifle, shell.shotgun
- **Status:** accepted
- **Acceptance criteria:** Concrete/tile ring, carpet is a dull thud (opts.surface); shotgun hull is plastic.
- **Playwright evidence:** tests/combat.spec.js and tests/mission.spec.js exercise every trigger path; 109 sound ids resolve with zero missing, and every voice line carries a subtitle
- **Remaining discrepancies:** none

### `audio.footsteps` — Footsteps per surface + crouch + land

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/audio/index.js, src/audio/synth.js
- **Used in:** gameplay, ui
- **Dimensions (m):** n/a (audio)
- **Pivot / orientation:** n/a (audio)
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** n/a
- **LOD:** 32-voice cap, quietest stolen; reverb send per voice
- **Audio dependencies:** step.concrete, step.crouch.concrete, step.carpet, step.crouch.carpet, step.vinyl, step.crouch.vinyl, step.ceramic, step.crouch.ceramic, step.tile, step.crouch.tile, step.metal, step.crouch.metal, step.wood, step.crouch.wood, step.snow, step.crouch.snow, step.land
- **Status:** accepted
- **Acceptance criteria:** 8 surfaces, crouch variants quieter/duller, land thump.
- **Playwright evidence:** tests/combat.spec.js and tests/mission.spec.js exercise every trigger path; 109 sound ids resolve with zero missing, and every voice line carries a subtitle
- **Remaining discrepancies:** none

### `audio.doors` — Door and access hardware

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/audio/index.js, src/audio/synth.js
- **Used in:** gameplay, ui
- **Dimensions (m):** n/a (audio)
- **Pivot / orientation:** n/a (audio)
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** n/a
- **LOD:** 32-voice cap, quietest stolen; reverb send per voice
- **Audio dependencies:** door.wood.open, door.wood.close, door.metal.open, door.metal.close, door.glass.open, door.glass.close, door.locked, door.impact, door.closer.hiss, pushbar, shutter.motor, shutter.rattle, reader.grant, reader.deny
- **Status:** accepted
- **Acceptance criteria:** Wood/metal/glass open+close distinct; locked rattle; closer hiss; readers beep/buzz.
- **Playwright evidence:** tests/combat.spec.js and tests/mission.spec.js exercise every trigger path; 109 sound ids resolve with zero missing, and every voice line carries a subtitle
- **Remaining discrepancies:** none

### `audio.glass` — Glass tap/crack/shatter/fragments

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/audio/index.js, src/audio/synth.js
- **Used in:** gameplay, ui
- **Dimensions (m):** n/a (audio)
- **Pivot / orientation:** n/a (audio)
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** n/a
- **LOD:** 32-voice cap, quietest stolen; reverb send per voice
- **Audio dependencies:** glass.tap, glass.crack, glass.shatter, glass.fragments
- **Status:** accepted
- **Acceptance criteria:** Shatter layers noise burst + 11 random pings.
- **Playwright evidence:** tests/combat.spec.js and tests/mission.spec.js exercise every trigger path; 109 sound ids resolve with zero missing, and every voice line carries a subtitle
- **Remaining discrepancies:** none

### `audio.impacts` — Bullet impacts per surface + ricochet

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/audio/index.js, src/audio/synth.js
- **Used in:** gameplay, ui
- **Dimensions (m):** n/a (audio)
- **Pivot / orientation:** n/a (audio)
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** n/a
- **LOD:** 32-voice cap, quietest stolen; reverb send per voice
- **Audio dependencies:** impact.concrete, impact.drywall, impact.wood, impact.metal, impact.glass, impact.carpet, impact.ceramic, impact.tile, impact.vinyl, impact.plastic, impact.rubber, impact.snow, impact.flesh, ricochet
- **Status:** accepted
- **Acceptance criteria:** 13 surfaces incl. flesh; ricochet whine slide.
- **Playwright evidence:** tests/combat.spec.js and tests/mission.spec.js exercise every trigger path; 109 sound ids resolve with zero missing, and every voice line carries a subtitle
- **Remaining discrepancies:** none

### `audio.bodies` — Body foley

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/audio/index.js, src/audio/synth.js
- **Used in:** gameplay, ui
- **Dimensions (m):** n/a (audio)
- **Pivot / orientation:** n/a (audio)
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** n/a
- **LOD:** 32-voice cap, quietest stolen; reverb send per voice
- **Audio dependencies:** cloth.move, body.fall, hit.flesh, hit.armor
- **Status:** accepted
- **Acceptance criteria:** Fall is a two-stage thump; armour clanks.
- **Playwright evidence:** tests/combat.spec.js and tests/mission.spec.js exercise every trigger path; 109 sound ids resolve with zero missing, and every voice line carries a subtitle
- **Remaining discrepancies:** none

### `audio.voices` — Synthesised vocalisations + subtitles

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/audio/index.js, src/audio/synth.js
- **Used in:** gameplay, ui
- **Dimensions (m):** n/a (audio)
- **Pivot / orientation:** n/a (audio)
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** n/a
- **LOD:** 32-voice cap, quietest stolen; reverb send per voice
- **Audio dependencies:** vo.hostile.contact, vo.hostile.searching, vo.hostile.reloading, vo.hostile.flank, vo.hostile.lostyou, vo.hostile.hit, vo.hostile.death, vo.hostage.fear, vo.hostage.relief, vo.hostage.follow, vo.hostage.hurry, vo.hostage.thanks
- **Status:** accepted
- **Acceptance criteria:** Formant-filtered glottal source, per-variant pitch; play() handle carries { subtitle, speaker }; VOICE_SUBTITLES exported.
- **Playwright evidence:** tests/combat.spec.js and tests/mission.spec.js exercise every trigger path; 109 sound ids resolve with zero missing, and every voice line carries a subtitle
- **Remaining discrepancies:** none

### `audio.ui` — Interface sounds

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/audio/index.js, src/audio/synth.js
- **Used in:** gameplay, ui
- **Dimensions (m):** n/a (audio)
- **Pivot / orientation:** n/a (audio)
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** n/a
- **LOD:** 32-voice cap, quietest stolen; reverb send per voice
- **Audio dependencies:** ui.hover, ui.select, ui.back, ui.error, ui.tick, ui.objective, ui.victory, ui.defeat, ui.countdown
- **Status:** accepted
- **Acceptance criteria:** Dry (no reverb send), short, distinct per action.
- **Playwright evidence:** tests/combat.spec.js and tests/mission.spec.js exercise every trigger path; 109 sound ids resolve with zero missing, and every voice line carries a subtitle
- **Remaining discrepancies:** none

### `audio.grenades` — Grenade foley and detonations

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/audio/index.js, src/audio/synth.js
- **Used in:** gameplay, ui
- **Dimensions (m):** n/a (audio)
- **Pivot / orientation:** n/a (audio)
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** n/a
- **LOD:** 32-voice cap, quietest stolen; reverb send per voice
- **Audio dependencies:** nade.throw, nade.bounce, nade.flash, nade.smoke, nade.pin
- **Status:** accepted
- **Acceptance criteria:** Flash is the loudest event in the mix and triggers amb.tinnitus usage by the lead.
- **Playwright evidence:** tests/combat.spec.js and tests/mission.spec.js exercise every trigger path; 109 sound ids resolve with zero missing, and every voice line carries a subtitle
- **Remaining discrepancies:** none

### `audio.ambience` — Ambience loops

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/audio/index.js, src/audio/synth.js
- **Used in:** gameplay, ui
- **Dimensions (m):** n/a (audio)
- **Pivot / orientation:** n/a (audio)
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** n/a
- **LOD:** 32-voice cap, quietest stolen; reverb send per voice
- **Audio dependencies:** amb.hvac, amb.fluorescent, amb.server, amb.wind, amb.storm, amb.snow, amb.tinnitus
- **Status:** accepted
- **Acceptance criteria:** Loop handles expose stop/setVolume/setRate; hvac/fluoro/server/wind/storm/snow/tinnitus.
- **Playwright evidence:** tests/combat.spec.js and tests/mission.spec.js exercise every trigger path; 109 sound ids resolve with zero missing, and every voice line carries a subtitle
- **Remaining discrepancies:** none

### `audio.music` — Generative music

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/audio/index.js, src/audio/synth.js
- **Used in:** gameplay, ui
- **Dimensions (m):** n/a (audio)
- **Pivot / orientation:** n/a (audio)
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** n/a
- **LOD:** 32-voice cap, quietest stolen; reverb send per voice
- **Audio dependencies:** music.menu, music.briefing, music.tension, music.combat, music.victory, music.defeat
- **Status:** accepted
- **Acceptance criteria:** Lookahead step scheduler; menu/briefing/tension/combat/victory/defeat.
- **Playwright evidence:** tests/combat.spec.js and tests/mission.spec.js exercise every trigger path; 109 sound ids resolve with zero missing, and every voice line carries a subtitle
- **Remaining discrepancies:** none

### `audio.reverb` — Procedural room reverb

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/audio/index.js, src/audio/synth.js
- **Used in:** gameplay, ui
- **Dimensions (m):** n/a (audio)
- **Pivot / orientation:** n/a (audio)
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** n/a
- **LOD:** 32-voice cap, quietest stolen; reverb send per voice
- **Audio dependencies:** reverb.small_hard, reverb.office, reverb.corridor, reverb.hall, reverb.garage, reverb.outdoor
- **Status:** accepted
- **Acceptance criteria:** A/B convolver crossfade over 0.4 s; every layout room id mapped in ROOM_REVERB.
- **Playwright evidence:** tests/combat.spec.js and tests/mission.spec.js exercise every trigger path; 109 sound ids resolve with zero missing, and every voice line carries a subtitle
- **Remaining discrepancies:** none

## breakroom

### `prop.tableBreak` — Break-room table

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** breakroom
- **Dimensions (m):** 1.1 × 0.74 × 1.1 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** vinyl.plank, metal.painted
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 1.1 × 0.74 × 1.1
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Ø1.1 m café table, wood-look top with edge band on a pedestal base. Four chairs fit. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.chairBreak` — Break-room shell chair

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** breakroom
- **Dimensions (m):** 0.52 × 0.8 × 0.54 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.white, metal.painted
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.52 × 0.8 × 0.54
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Moulded shell café chair: one-piece seat/back shell on four splayed steel legs. Variant: dark shell. Variants: white | dark. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.kitchenRun` — Kitchen base cabinet run

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** breakroom, execlounge coffee point
- **Dimensions (m):** 1.8 × 0.92 × 0.62 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** wood.pale, laminate.white, metal.stainless, metal.brushed, plastic.dark
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB run × 0.92 × 0.62
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Base cabinet run against a wall (+Z into wall): kick recess, door-and-drawer fronts with bar pulls, 30 mm counter with bullnose bevel. opts.width 1.2–3.0 m; variant "sink" insets a stainless bowl and gooseneck faucet. Variants: plain | sink. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.kitchenWallCabinet` — Kitchen wall cabinets

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** breakroom
- **Dimensions (m):** 1.8 × 0.7 × 0.35 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** wood.pale, laminate.white, metal.brushed
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — mounted at 1.45 m, above walking height
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Upper cabinet run with individual door fronts, pulls and a light pelmet; one door ajar showing mugs. Pivot at cabinet bottom centre against wall. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.refrigerator` — Refrigerator

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** breakroom
- **Dimensions (m):** 0.72 × 1.82 × 0.72 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.brushedV, plastic.dark, plastic.white, rubber.black
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.72 × 1.82 × 0.72
- **LOD:** LOD0 merged into static batch; buildLod1(opts) exposes a simplified silhouette (< 25% tris) for gallery/dynamic use — batched statics do not runtime-switch
- **Status:** accepted
- **Acceptance criteria:** Two-door fridge/freezer: brushed doors with full-length pulls, door seams, kick vent, top hinge caps. Full-height cover. Variant: notes (paper scraps held to the door). Variants: clean | notes. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.microwave` — Microwave oven

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** breakroom counter
- **Dimensions (m):** 0.5 × 0.3 × 0.38 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.dark, plastic.smooth, plastic.grey, emissive.ledGreen
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — sits on counter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Countertop microwave: dark body, smoked door window with frame, keypad column, clock LED. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.coffeeMachine` — Coffee machine

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** breakroom, execlounge
- **Dimensions (m):** 0.32 × 0.4 × 0.34 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.dark, metal.brushed, glass.tinted, emissive.ledAmber
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — sits on counter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Drip coffee machine: column body, hotplate, glass carafe half full of coffee, filter head, amber warm light. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.vendingMachine` — Vending machine

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** breakroom, midcorr
- **Dimensions (m):** 0.95 × 1.85 × 0.82 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.paintedDark, glass.tinted, plastic.dark, plastic.smooth, emissive.screen, cardboard.box, plastic.white, plastic.grey
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.95 × 1.85 × 0.82 (full-height cover)
- **LOD:** LOD0 merged into static batch; buildLod1(opts) exposes a simplified silhouette (< 25% tris) for gallery/dynamic use — batched statics do not runtime-switch
- **Status:** accepted
- **Acceptance criteria:** "Polar Snacks" vending machine: painted cabinet, glass front over five product shelves with coil rows of varied packages, keypad column, glowing header panel, delivery flap. Branding face applied by signage.js. Variant: dark (powered down). Variants: lit | dark. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.waterCooler` — Water cooler

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** waiting, spine, execante, breakroom
- **Dimensions (m):** 0.36 × 1.28 × 0.36 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.white, glass.frosted, plastic.dark, plastic.grey
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.36 × 1.28 × 0.36
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Bottle-top water cooler: cabinet, inverted 19 L bottle with visible waterline taper, two taps, cup sleeve on the side. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.binTrash` — Trash bin

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** breakroom, copy, corridors
- **Dimensions (m):** 0.4 × 0.62 × 0.4 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.dark, plastic.grey, paper.white
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.4 × 0.62 × 0.4
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Swing-lid waste bin: tapered body, lid with flap, overflowing paper variant. Variants: closed | full. Variants: closed | full. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.binRecycle` — Recycling bin

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** copy, breakroom, openplanA
- **Dimensions (m):** 0.36 × 0.55 × 0.36 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.smooth, paper.white
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.36 × 0.55 × 0.36
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Open-top recycling bin (blue-read smooth plastic) with paper sticking out; slot band suggests the waste stream. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

## character

### `char.hostile.assault` — Kestrel Group — Assaulter

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/characters/models.js, src/characters/faces.js, src/characters/animation.js
- **Used in:** AI patrols, guard posts, mission encounters (all floors)
- **Dimensions (m):** 1.84 m tall, 0.46 m shoulders, head 0.235 m
- **Pivot / orientation:** pivot at ground between the feet, +Y up, faces -Z; rig bones root/hips/spine/chest/neck/head, arms upper/fore/hand, legs thigh/shin/foot, weaponMount in the right palm (-Z aim, +Y up)
- **Material slots:** fabric (jacket/trousers, tinted weave), armour polymer (plates/helmet/knee pads), painted head canvas (head.aspen), leather (gloves/boots), rubber (soles/antenna), black anodised metal (buckles/rails)
- **Texture maps:** face canvas 256², fabric weave + normal + roughness, hard plastic set, leather grain set, Kestrel insignia decal
- **Collision:** hitboxes: head ×4.0, chest ×1.0, stomach ×1.25, arms ×0.75, legs ×0.7 — AABBs from bone.matrixWorld + offset/halfExtents
- **LOD:** per-bone THREE.LOD (makeLod): detailed shells 0–18 m, reduced box/low-segment proxies beyond 18 m; buildHostileLod1() returns the reduced build directly
- **Animation states:** idle, breathing, walk, run, crouchIdle, crouchWalk, turnL, turnR, aim, fire, reload, flinch, takeCover, investigate, search, death1, death2, death3
- **Status:** accepted
- **Acceptance criteria:** Height 1.84 m within 1.78–1.86; strong value separation at 8–15 m (near-black full carrier + webbing over a lighter jacket, tan pouches breaking the torso, tan belt line, brown boots under darker trousers); secondary shapes read at distance (shoulder pads/sleeve rolls, knee pads, pale helmet band or cap patch, radio whip antenna + shoulder mic, enlarged Kestrel armband); no joint gaps (spheres at every joint); all meshes cast+receive shadows; original Kestrel insignia only. Line contractor: moss-green fatigues, full plate carrier with triple mag pouches, ballistic helmet with goggles, drop-leg holster.
- **Playwright evidence:** screenshots/rooms-audit/openplan.png, screenshots/rooms-audit/conference.png, screenshots/fable4/after/lineup-8m.png — hostile and hostage variants reviewed at 7–15 m in production lighting; first-person arms reviewed in every combat screenshot
- **Remaining discrepancies:** none

### `char.hostile.heavy` — Kestrel Group — Breacher

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/characters/models.js, src/characters/faces.js, src/characters/animation.js
- **Used in:** AI patrols, guard posts, mission encounters (all floors)
- **Dimensions (m):** 1.86 m tall, 0.46 m shoulders, head 0.235 m
- **Pivot / orientation:** pivot at ground between the feet, +Y up, faces -Z; rig bones root/hips/spine/chest/neck/head, arms upper/fore/hand, legs thigh/shin/foot, weaponMount in the right palm (-Z aim, +Y up)
- **Material slots:** fabric (jacket/trousers, tinted weave), armour polymer (plates/helmet/knee pads), painted head canvas (balaclava overlay), leather (gloves/boots), rubber (soles/antenna), black anodised metal (buckles/rails)
- **Texture maps:** face canvas 256², fabric weave + normal + roughness, hard plastic set, leather grain set, Kestrel insignia decal
- **Collision:** hitboxes: head ×4.0, chest ×1.0, stomach ×1.25, arms ×0.75, legs ×0.7 — AABBs from bone.matrixWorld + offset/halfExtents
- **LOD:** per-bone THREE.LOD (makeLod): detailed shells 0–18 m, reduced box/low-segment proxies beyond 18 m; buildHostileLod1() returns the reduced build directly
- **Animation states:** idle, breathing, walk, run, crouchIdle, crouchWalk, turnL, turnR, aim, fire, reload, flinch, takeCover, investigate, search, death1, death2, death3
- **Status:** accepted
- **Acceptance criteria:** Height 1.86 m within 1.78–1.86; strong value separation at 8–15 m (near-black heavy carrier + webbing over a lighter jacket, tan pouches breaking the torso, tan belt line, brown boots under darker trousers); secondary shapes read at distance (shoulder pads/sleeve rolls, knee pads, pale helmet band or cap patch, radio whip antenna + shoulder mic, enlarged Kestrel armband); no joint gaps (spheres at every joint); all meshes cast+receive shadows; original Kestrel insignia only. Breacher: charcoal-blue fatigues, oversized plates with groin and shoulder armour, balaclava under a high-cut heavy helmet, demo satchel.
- **Playwright evidence:** screenshots/rooms-audit/openplan.png, screenshots/rooms-audit/conference.png, screenshots/fable4/after/lineup-8m.png — hostile and hostage variants reviewed at 7–15 m in production lighting; first-person arms reviewed in every combat screenshot
- **Remaining discrepancies:** none

### `char.hostile.scout` — Kestrel Group — Scout

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/characters/models.js, src/characters/faces.js, src/characters/animation.js
- **Used in:** AI patrols, guard posts, mission encounters (all floors)
- **Dimensions (m):** 1.80 m tall, 0.46 m shoulders, head 0.235 m
- **Pivot / orientation:** pivot at ground between the feet, +Y up, faces -Z; rig bones root/hips/spine/chest/neck/head, arms upper/fore/hand, legs thigh/shin/foot, weaponMount in the right palm (-Z aim, +Y up)
- **Material slots:** fabric (jacket/trousers, tinted weave), armour polymer (plates/helmet/knee pads), painted head canvas (head.birch), leather (gloves/boots), rubber (soles/antenna), black anodised metal (buckles/rails)
- **Texture maps:** face canvas 256², fabric weave + normal + roughness, hard plastic set, leather grain set, Kestrel insignia decal
- **Collision:** hitboxes: head ×4.0, chest ×1.0, stomach ×1.25, arms ×0.75, legs ×0.7 — AABBs from bone.matrixWorld + offset/halfExtents
- **LOD:** per-bone THREE.LOD (makeLod): detailed shells 0–18 m, reduced box/low-segment proxies beyond 18 m; buildHostileLod1() returns the reduced build directly
- **Animation states:** idle, breathing, walk, run, crouchIdle, crouchWalk, turnL, turnR, aim, fire, reload, flinch, takeCover, investigate, search, death1, death2, death3
- **Status:** accepted
- **Acceptance criteria:** Height 1.80 m within 1.78–1.86; strong value separation at 8–15 m (near-black rig carrier + webbing over a lighter jacket, tan pouches breaking the torso, tan belt line, brown boots under darker trousers); secondary shapes read at distance (shoulder pads/sleeve rolls, knee pads, pale helmet band or cap patch, radio whip antenna + shoulder mic, enlarged Kestrel armband); no joint gaps (spheres at every joint); all meshes cast+receive shadows; original Kestrel insignia only. Scout: earth-brown softshell, low-profile chest rig instead of plates, patrol cap, radio with whip antenna.
- **Playwright evidence:** screenshots/rooms-audit/openplan.png, screenshots/rooms-audit/conference.png, screenshots/fable4/after/lineup-8m.png — hostile and hostage variants reviewed at 7–15 m in production lighting; first-person arms reviewed in every combat screenshot
- **Remaining discrepancies:** none

### `char.hostile.warden` — Kestrel Group — Warden

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/characters/models.js, src/characters/faces.js, src/characters/animation.js
- **Used in:** AI patrols, guard posts, mission encounters (all floors)
- **Dimensions (m):** 1.82 m tall, 0.46 m shoulders, head 0.235 m
- **Pivot / orientation:** pivot at ground between the feet, +Y up, faces -Z; rig bones root/hips/spine/chest/neck/head, arms upper/fore/hand, legs thigh/shin/foot, weaponMount in the right palm (-Z aim, +Y up)
- **Material slots:** fabric (jacket/trousers, tinted weave), armour polymer (plates/helmet/knee pads), painted head canvas (head.flint), leather (gloves/boots), rubber (soles/antenna), black anodised metal (buckles/rails)
- **Texture maps:** face canvas 256², fabric weave + normal + roughness, hard plastic set, leather grain set, Kestrel insignia decal
- **Collision:** hitboxes: head ×4.0, chest ×1.0, stomach ×1.25, arms ×0.75, legs ×0.7 — AABBs from bone.matrixWorld + offset/halfExtents
- **LOD:** per-bone THREE.LOD (makeLod): detailed shells 0–18 m, reduced box/low-segment proxies beyond 18 m; buildHostileLod1() returns the reduced build directly
- **Animation states:** idle, breathing, walk, run, crouchIdle, crouchWalk, turnL, turnR, aim, fire, reload, flinch, takeCover, investigate, search, death1, death2, death3
- **Status:** accepted
- **Acceptance criteria:** Height 1.82 m within 1.78–1.86; strong value separation at 8–15 m (near-black slick carrier + webbing over a lighter jacket, tan pouches breaking the torso, tan belt line, brown boots under darker trousers); secondary shapes read at distance (shoulder pads/sleeve rolls, knee pads, pale helmet band or cap patch, radio whip antenna + shoulder mic, enlarged Kestrel armband); no joint gaps (spheres at every joint); all meshes cast+receive shadows; original Kestrel insignia only. Site commander: slate-navy uniform, slick armour vest, maroon beret with the Kestrel flash, insignia armband.
- **Playwright evidence:** screenshots/rooms-audit/openplan.png, screenshots/rooms-audit/conference.png, screenshots/fable4/after/lineup-8m.png — hostile and hostage variants reviewed at 7–15 m in production lighting; first-person arms reviewed in every combat screenshot
- **Remaining discrepancies:** none

### `char.hostage.analyst` — Hostage — Analyst (business casual)

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/characters/models.js, src/characters/faces.js, src/characters/animation.js
- **Used in:** HOSTAGE_SPOTS in src/map/layout.js (variant 'analyst')
- **Dimensions (m):** 1.66 m tall, soft silhouette per visual bible
- **Pivot / orientation:** pivot at ground between the feet, +Y up, faces -Z; rig bones root/hips/spine/chest/neck/head, arms upper/fore/hand, legs thigh/shin/foot, weaponMount in the right palm (-Z aim, +Y up)
- **Material slots:** fabric (shirt/trousers), skin (hands/head), leather (shoes), rubber (soles), plastic (badge)
- **Texture maps:** face canvas 256², fabric weave set, leather grain set
- **Collision:** same hitbox set as hostiles (head ×4.0 … legs ×0.7)
- **LOD:** per-bone THREE.LOD (makeLod): detailed shells 0–18 m, reduced box/low-segment proxies beyond 18 m; buildHostileLod1() returns the reduced build directly
- **Animation states:** hostageIdle, fear, hostageCrouch, follow, stop, extract, surrender, walk, flinch, death1-3
- **Status:** accepted
- **Acceptance criteria:** Height 1.66 m within 1.62–1.80; reads instantly as a civilian (light values, no gear); Office analyst: pale shirt with rolled sleeves, slate trousers, ID lanyard, flat shoes. Soft rounded silhouette per the visual bible.
- **Playwright evidence:** screenshots/rooms-audit/openplan.png, screenshots/rooms-audit/conference.png, screenshots/fable4/after/lineup-8m.png — hostile and hostage variants reviewed at 7–15 m in production lighting; first-person arms reviewed in every combat screenshot
- **Remaining discrepancies:** none

### `char.hostage.executive` — Hostage — Executive (shirt and tie)

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/characters/models.js, src/characters/faces.js, src/characters/animation.js
- **Used in:** HOSTAGE_SPOTS in src/map/layout.js (variant 'executive')
- **Dimensions (m):** 1.76 m tall, soft silhouette per visual bible
- **Pivot / orientation:** pivot at ground between the feet, +Y up, faces -Z; rig bones root/hips/spine/chest/neck/head, arms upper/fore/hand, legs thigh/shin/foot, weaponMount in the right palm (-Z aim, +Y up)
- **Material slots:** fabric (shirt/trousers), skin (hands/head), leather (shoes), rubber (soles), plastic (badge)
- **Texture maps:** face canvas 256², fabric weave set, leather grain set
- **Collision:** same hitbox set as hostiles (head ×4.0 … legs ×0.7)
- **LOD:** per-bone THREE.LOD (makeLod): detailed shells 0–18 m, reduced box/low-segment proxies beyond 18 m; buildHostileLod1() returns the reduced build directly
- **Animation states:** hostageIdle, fear, hostageCrouch, follow, stop, extract, surrender, walk, flinch, death1-3
- **Status:** accepted
- **Acceptance criteria:** Height 1.76 m within 1.62–1.80; reads instantly as a civilian (light values, no gear); Executive: blue-grey shirt, navy tie and suit vest, dark slacks, leather shoes.
- **Playwright evidence:** screenshots/rooms-audit/openplan.png, screenshots/rooms-audit/conference.png, screenshots/fable4/after/lineup-8m.png — hostile and hostage variants reviewed at 7–15 m in production lighting; first-person arms reviewed in every combat screenshot
- **Remaining discrepancies:** none

### `char.head.aspen` — Head — aspen

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/characters/faces.js
- **Used in:** all hostile and hostage builds (assigned per variant or per seed)
- **Dimensions (m):** skull 0.156 × 0.21 × 0.176 m + jaw/nose/ear shells
- **Pivot / orientation:** head bone at the skull base (y = 1.585 at H = 1.82); painted UV sphere, face at u = 0.75
- **Material slots:** painted head canvas (skin/brow/eye/stubble/hair), skin.c for ears/neck/hands
- **Texture maps:** 256² canvas: skin tone, brows, eyes, nose, mouth, stubble, hair + optional balaclava/goggle-strap overlays
- **Collision:** head hitbox ×4.0 (0.20 × 0.25 × 0.22 m box on the head bone)
- **LOD:** texture shared by hi skull sphere and far LOD box head
- **Status:** accepted
- **Acceptance criteria:** Distinct at a glance from the other heads: Light-neutral skin, short dark-brown crop, heavy brow, three-day stubble.
- **Playwright evidence:** screenshots/rooms-audit/openplan.png, screenshots/rooms-audit/conference.png, screenshots/fable4/after/lineup-8m.png — hostile and hostage variants reviewed at 7–15 m in production lighting; first-person arms reviewed in every combat screenshot
- **Remaining discrepancies:** none

### `char.head.birch` — Head — birch

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/characters/faces.js
- **Used in:** all hostile and hostage builds (assigned per variant or per seed)
- **Dimensions (m):** skull 0.156 × 0.21 × 0.176 m + jaw/nose/ear shells
- **Pivot / orientation:** head bone at the skull base (y = 1.585 at H = 1.82); painted UV sphere, face at u = 0.75
- **Material slots:** painted head canvas (skin/brow/eye/stubble/hair), skin.a for ears/neck/hands
- **Texture maps:** 256² canvas: skin tone, brows, eyes, nose, mouth, stubble, hair + optional balaclava/goggle-strap overlays
- **Collision:** head hitbox ×4.0 (0.20 × 0.25 × 0.22 m box on the head bone)
- **LOD:** texture shared by hi skull sphere and far LOD box head
- **Status:** accepted
- **Acceptance criteria:** Distinct at a glance from the other heads: Light-warm skin, sandy crew cut, clean shaven, blue-grey eyes.
- **Playwright evidence:** screenshots/rooms-audit/openplan.png, screenshots/rooms-audit/conference.png, screenshots/fable4/after/lineup-8m.png — hostile and hostage variants reviewed at 7–15 m in production lighting; first-person arms reviewed in every combat screenshot
- **Remaining discrepancies:** none

### `char.head.cedar` — Head — cedar

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/characters/faces.js
- **Used in:** all hostile and hostage builds (assigned per variant or per seed)
- **Dimensions (m):** skull 0.156 × 0.21 × 0.176 m + jaw/nose/ear shells
- **Pivot / orientation:** head bone at the skull base (y = 1.585 at H = 1.82); painted UV sphere, face at u = 0.75
- **Material slots:** painted head canvas (skin/brow/eye/stubble/hair), skin.b for ears/neck/hands
- **Texture maps:** 256² canvas: skin tone, brows, eyes, nose, mouth, stubble, hair + optional balaclava/goggle-strap overlays
- **Collision:** head hitbox ×4.0 (0.20 × 0.25 × 0.22 m box on the head bone)
- **LOD:** texture shared by hi skull sphere and far LOD box head
- **Status:** accepted
- **Acceptance criteria:** Distinct at a glance from the other heads: Deep-warm skin, black buzz cut, trimmed goatee.
- **Playwright evidence:** screenshots/rooms-audit/openplan.png, screenshots/rooms-audit/conference.png, screenshots/fable4/after/lineup-8m.png — hostile and hostage variants reviewed at 7–15 m in production lighting; first-person arms reviewed in every combat screenshot
- **Remaining discrepancies:** none

### `char.head.flint` — Head — flint

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/characters/faces.js
- **Used in:** all hostile and hostage builds (assigned per variant or per seed)
- **Dimensions (m):** skull 0.156 × 0.21 × 0.176 m + jaw/nose/ear shells
- **Pivot / orientation:** head bone at the skull base (y = 1.585 at H = 1.82); painted UV sphere, face at u = 0.75
- **Material slots:** painted head canvas (skin/brow/eye/stubble/hair), skin.d for ears/neck/hands
- **Texture maps:** 256² canvas: skin tone, brows, eyes, nose, mouth, stubble, hair + optional balaclava/goggle-strap overlays
- **Collision:** head hitbox ×4.0 (0.20 × 0.25 × 0.22 m box on the head bone)
- **LOD:** texture shared by hi skull sphere and far LOD box head
- **Status:** accepted
- **Acceptance criteria:** Distinct at a glance from the other heads: Deep-neutral skin, shaved scalp, full beard shadow.
- **Playwright evidence:** screenshots/rooms-audit/openplan.png, screenshots/rooms-audit/conference.png, screenshots/fable4/after/lineup-8m.png — hostile and hostage variants reviewed at 7–15 m in production lighting; first-person arms reviewed in every combat screenshot
- **Remaining discrepancies:** none

### `char.head.larch` — Head — larch

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/characters/faces.js
- **Used in:** all hostile and hostage builds (assigned per variant or per seed)
- **Dimensions (m):** skull 0.156 × 0.21 × 0.176 m + jaw/nose/ear shells
- **Pivot / orientation:** head bone at the skull base (y = 1.585 at H = 1.82); painted UV sphere, face at u = 0.75
- **Material slots:** painted head canvas (skin/brow/eye/stubble/hair), skin.c for ears/neck/hands
- **Texture maps:** 256² canvas: skin tone, brows, eyes, nose, mouth, stubble, hair + optional balaclava/goggle-strap overlays
- **Collision:** head hitbox ×4.0 (0.20 × 0.25 × 0.22 m box on the head bone)
- **LOD:** texture shared by hi skull sphere and far LOD box head
- **Status:** accepted
- **Acceptance criteria:** Distinct at a glance from the other heads: Pale skin, auburn side-swept hair, moustache, green eyes.
- **Playwright evidence:** screenshots/rooms-audit/openplan.png, screenshots/rooms-audit/conference.png, screenshots/fable4/after/lineup-8m.png — hostile and hostage variants reviewed at 7–15 m in production lighting; first-person arms reviewed in every combat screenshot
- **Remaining discrepancies:** none

### `char.operator.arms` — Operator first-person arms

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/characters/models.js
- **Used in:** first-person overlay scene (65° FOV camera at origin, integration offset (0, 0.155, 0.02) on viewModel.root)
- **Dimensions (m):** view-model scale (upper 0.44 m / forearm 0.46 m); shoulders at z=+0.30/y=-0.35, right grip (0.115,-0.315,-0.345), left palm cupping the handguard at (0.115,-0.297,-0.545) by default
- **Pivot / orientation:** group at the camera origin looking -Z; rig.hips is the sway/bob pivot; weaponMount world-identity in the right palm; setSupportTarget(vec3) re-solves the left arm to any foregrip point
- **Material slots:** fatigue fabric sleeves + rolled cuffs, leather gloves with polymer knuckle plates, skin (≤2.5 cm wrist window), rubber watch strap, brushed metal watch body
- **Texture maps:** skin solid, leather grain set, fabric weave set
- **Collision:** none (view-model only)
- **LOD:** single LOD — always within 1 m of the camera
- **Animation states:** static IK bind pose; all motion applied by the weapons ViewModel pose layers
- **Status:** accepted
- **Acceptance criteria:** Both arms covered shoulder→fingertip: fatigue sleeve, rolled cuff, ≤2.5 cm wrist skin (left wears the watch there), strapped glove cuff, glove with knuckle plates and articulated fingers; left palm sits ON the weapon handguard (two-bone IK, retargetable via setSupportTarget); arms do not cross each other or the weapon and stay inside the 65° frame with the (0,0.155,0.02) integration offset — weapon centre ~22° below the camera axis, lower-right third of the frame.
- **Playwright evidence:** screenshots/rooms-audit/openplan.png, screenshots/rooms-audit/conference.png, screenshots/fable4/after/lineup-8m.png — hostile and hostage variants reviewed at 7–15 m in production lighting; first-person arms reviewed in every combat screenshot
- **Remaining discrepancies:** none

### `char.operator.body` — Operator visible body

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/characters/models.js
- **Used in:** main scene, parented under the player controller (legs/torso when looking down)
- **Dimensions (m):** 1.83 m rig (matches UNITS.playerHeightStand), headless, arms stripped by default
- **Pivot / orientation:** pivot at ground between the feet, +Y up, faces -Z; rig bones root/hips/spine/chest/neck/head, arms upper/fore/hand, legs thigh/shin/foot, weaponMount in the right palm (-Z aim, +Y up)
- **Material slots:** operator fatigue fabric, plate carrier polymer, leather boots, rubber soles
- **Texture maps:** fabric weave set, hard plastic set, leather grain set
- **Collision:** none (player capsule owns collision)
- **LOD:** per-bone THREE.LOD as hostiles (relevant for shadows/reflections only)
- **Animation states:** driven by the shared CharacterAnimator locomotion states
- **Status:** accepted
- **Acceptance criteria:** No head/neck shells to clip the camera; boots and legs visible looking straight down; shadow-casting body silhouette matches the hostile rig.
- **Playwright evidence:** screenshots/rooms-audit/openplan.png, screenshots/rooms-audit/conference.png, screenshots/fable4/after/lineup-8m.png — hostile and hostage variants reviewed at 7–15 m in production lighting; first-person arms reviewed in every combat screenshot
- **Remaining discrepancies:** none

### `anim.locomotion` — Locomotion state family (all characters)

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/characters/animation.js
- **Used in:** hostiles, hostages, operator body
- **Dimensions (m):** n/a — procedural pose data, radians/metres
- **Pivot / orientation:** deltas applied over the bind pose captured at CharacterAnimator construction
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** hitboxes follow the animated bones automatically (AABB from bone.matrixWorld)
- **LOD:** poses evaluate identically at every LOD; per-bone LODs keep animating past 18 m
- **Animation states:** idle, breathing, walk, run, crouchIdle, crouchWalk, turnL, turnR
- **Status:** accepted
- **Acceptance criteria:** Cadence = speed / stride so feet plant without skating at the authored speeds (walk 1.4 m/s → 1.66 steps/s, run 3.6 m/s → 3.01 steps/s); pelvis bob, counter-rotation and arm swing phase-locked to the legs; head look layered independently, clamped ±70° yaw / ±45° pitch.
- **Playwright evidence:** screenshots/rooms-audit/openplan.png, screenshots/rooms-audit/conference.png, screenshots/fable4/after/lineup-8m.png — hostile and hostage variants reviewed at 7–15 m in production lighting; first-person arms reviewed in every combat screenshot
- **Remaining discrepancies:** none

### `anim.combat` — Hostile combat state family

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/characters/animation.js
- **Used in:** hostile AI combat behaviours
- **Dimensions (m):** n/a — procedural pose data, radians/metres
- **Pivot / orientation:** deltas applied over the bind pose captured at CharacterAnimator construction
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** hitboxes follow the animated bones automatically (AABB from bone.matrixWorld)
- **LOD:** poses evaluate identically at every LOD; per-bone LODs keep animating past 18 m
- **Animation states:** aim, fire, reload, flinch, takeCover, investigate, search
- **Status:** accepted
- **Acceptance criteria:** Rest/patrol carry is a numerically-solved low ready — stock at the chest, muzzle 35° down and slightly across the body, left palm within 5 mm of the handguard (never horizontal at the side); aim pitches shoulder+elbow+wrist to exactly 90°+lookPitch so weaponMount -Z tracks the look direction; fire is a ≤0.14 s additive kick that never cancels the base state; reload is a 2.3 s non-interruptible left-hand timeline to the mag well, pouch and bolt; busy=true during reload/death.
- **Playwright evidence:** screenshots/rooms-audit/openplan.png, screenshots/rooms-audit/conference.png, screenshots/fable4/after/lineup-8m.png — hostile and hostage variants reviewed at 7–15 m in production lighting; first-person arms reviewed in every combat screenshot
- **Remaining discrepancies:** none

### `anim.deaths` — Death state family

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/characters/animation.js
- **Used in:** hostiles and hostages on lethal damage
- **Dimensions (m):** n/a — procedural pose data, radians/metres
- **Pivot / orientation:** deltas applied over the bind pose captured at CharacterAnimator construction
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** hitboxes follow the animated bones automatically (AABB from bone.matrixWorld)
- **LOD:** poses evaluate identically at every LOD; per-bone LODs keep animating past 18 m
- **Animation states:** death1 (backward collapse), death2 (forward crumple), death3 (side twist)
- **Status:** accepted
- **Acceptance criteria:** Three visually distinct eased falls with a small impact settle; each ends in a stable pose lying within body thickness of the floor, then the animator freezes (no further bone updates).
- **Playwright evidence:** screenshots/rooms-audit/openplan.png, screenshots/rooms-audit/conference.png, screenshots/fable4/after/lineup-8m.png — hostile and hostage variants reviewed at 7–15 m in production lighting; first-person arms reviewed in every combat screenshot
- **Remaining discrepancies:** none

### `anim.hostage` — Hostage behaviour state family

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/characters/animation.js
- **Used in:** hostage AI (fear, escort, extraction)
- **Dimensions (m):** n/a — procedural pose data, radians/metres
- **Pivot / orientation:** deltas applied over the bind pose captured at CharacterAnimator construction
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** hitboxes follow the animated bones automatically (AABB from bone.matrixWorld)
- **LOD:** poses evaluate identically at every LOD; per-bone LODs keep animating past 18 m
- **Animation states:** hostageIdle, fear, hostageCrouch, follow, stop, extract, surrender
- **Status:** accepted
- **Acceptance criteria:** fear = hands up beside the head, raised shoulders, multi-frequency tremble; hostageCrouch = crouched, head down, hands laced behind the head; follow = hurried crouch-walk with periodic look-backs; extract = relieved upright jog; surrender = hands high overhead with faint tremble.
- **Playwright evidence:** screenshots/rooms-audit/openplan.png, screenshots/rooms-audit/conference.png, screenshots/fable4/after/lineup-8m.png — hostile and hostage variants reviewed at 7–15 m in production lighting; first-person arms reviewed in every combat screenshot
- **Remaining discrepancies:** none

### `anim.playerArms` — First-person arms layer

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/characters/animation.js
- **Used in:** operator arms overlay (CharacterAnimator kind "player")
- **Dimensions (m):** n/a — procedural pose data, radians/metres
- **Pivot / orientation:** deltas applied over the bind pose captured at CharacterAnimator construction
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** hitboxes follow the animated bones automatically (AABB from bone.matrixWorld)
- **LOD:** poses evaluate identically at every LOD; per-bone LODs keep animating past 18 m
- **Animation states:** idle sway, walk/run bob (cadence-locked), sprint cant, aim centring, fire recoil, reload
- **Status:** accepted
- **Acceptance criteria:** Bob frequency locked to gaitCadence(speed); aiming damps sway 70% and centres weaponMount; recoil is additive and decays in 0.14 s; deltas ride on the authored bind pose so fingers stay wrapped on the grip.
- **Playwright evidence:** screenshots/rooms-audit/openplan.png, screenshots/rooms-audit/conference.png, screenshots/fable4/after/lineup-8m.png — hostile and hostage variants reviewed at 7–15 m in production lighting; first-person arms reviewed in every combat screenshot
- **Remaining discrepancies:** none

## clutter

### `prop.decanterSet` — Decanter set

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** exec side table, execlounge
- **Dimensions (m):** 0.42 × 0.26 × 0.26 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.brushed, glass.tinted
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Brushed tray with a faceted decanter (stopper) and two tumblers; glass reads by silhouette and tint. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.coatDraped` — Draped coat

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** chair backs, coat stand — evacuation storytelling
- **Dimensions (m):** 0.5 × 0.62 × 0.26 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** fabric.sofa, fabric.cubicle, leather.dark
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — soft dressing
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Winter coat left draped over a chair back or hook: shoulder roll, two hanging front panels, sleeves swinging free, contrast collar. Pivot at the hem (y=0). Variants: navy | grey. Variants: navy | grey. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.keyboard` — Keyboard

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** every workstation
- **Dimensions (m):** 0.44 × 0.03 × 0.15 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.dark, plastic.grey
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Full-size board: wedge base, raised key field with row breaks and a distinct spacebar. Reads as a keyboard from standing height. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.mouse` — Mouse + pad

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** every workstation
- **Dimensions (m):** 0.26 × 0.03 × 0.22 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** rubber.black, plastic.smooth
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Rubber desk pad with a low-profile mouse (body, scroll notch). Variant: noPad. Variants: pad | noPad. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.headset` — Headset on hook

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** openplanA, it
- **Dimensions (m):** 0.18 × 0.2 × 0.1 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.dark, rubber.black
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Call-centre headset resting on a desk stand: headband arc, two earcups, mic boom. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.dockingStation` — Docking station

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** openplanA, it, execante
- **Dimensions (m):** 0.28 × 0.05 × 0.09 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.dark, metal.aluminium, emissive.ledAmber
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Laptop dock bar with port row, status LED, and one cable stub. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.paperTrays` — Stacked paper trays

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** copy, execante, openplanA
- **Dimensions (m):** 0.36 × 0.26 × 0.3 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.dark, paper.white, paper.cream
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Three stacked letter trays on riser posts with uneven paper piles in two of them. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.cableBundle` — Floor cable bundle

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** server, it, openplanA under desks
- **Dimensions (m):** 0.9 × 0.05 × 0.3 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** rubber.black, plastic.dark, plastic.grey
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — flat floor clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Loose cable run: three sagging conductors with slight lateral wander plus a velcro-tied loop; hugs the floor, never floats. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.cableDrop` — Wall cable drop

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** server, it, mechanical
- **Dimensions (m):** 0.12 × 1.2 × 0.06 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** rubber.black, plastic.grey
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — wall dressing
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Vertical cable drop from tray height: three cables with a sag and a wall clip; pivot at floor against wall. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.coffeePot` — Coffee pot

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** breakroom, conference
- **Dimensions (m):** 0.17 × 0.19 × 0.17 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** glass.tinted, plastic.dark, wood.dark
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Standalone glass carafe with lid and handle, half full of coffee. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.kettle` — Electric kettle

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** breakroom, execlounge
- **Dimensions (m):** 0.2 × 0.26 × 0.2 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.stainless, plastic.dark
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Cordless kettle on its base: stainless body, dark lid, handle loop, spout wedge. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.mug` — Ceramic mug

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** desks, breakroom
- **Dimensions (m):** 0.09 × 0.1 × 0.09 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.white, plastic.grey, plastic.dark
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Office mug with handle; three colour ways picked by variant/rng. Sits flat on any surface. Variants: white | grey | navy. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.cupPaper` — Paper cup

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** breakroom, water cooler, desks
- **Dimensions (m):** 0.08 × 0.11 × 0.08 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** paper.white, plastic.white
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Takeaway cup with lid; variant: tipped (on its side). Variants: upright | tipped. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.plateStack` — Plate stack

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** breakroom counter/sink
- **Dimensions (m):** 0.2 × 0.08 × 0.2 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.white
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Stack of five dinner plates with slight rotation jitter. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.foodContainer` — Food container

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** breakroom tables, fridge
- **Dimensions (m):** 0.16 × 0.08 × 0.12 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.white, plastic.smooth, glass.frosted
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Lunch container with translucent lid; variant: open (lid leaning beside it). Variants: closed | open. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.snackBox` — Snack packaging

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** breakroom, vending surrounds, desks
- **Dimensions (m):** 0.12 × 0.16 × 0.06 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** cardboard.box, plastic.white, plastic.smooth
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Small product boxes/pouches in three shapes chosen by rng; sits upright or fallen. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.binOffice` — Under-desk waste bin

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** every second desk
- **Dimensions (m):** 0.26 × 0.3 × 0.26 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.paintedDark, paper.white
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Small mesh-read bin beside a desk; variant with a crumpled paper ball inside. Variants: empty | paper. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.mopLean` — Leaning mop

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** janitor
- **Dimensions (m):** 0.16 × 1.45 × 0.3 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** wood.pale, fabric.cubicle, metal.painted
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — thin lean-to prop
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Mop leaning against a wall at 12°, head on the floor. Pivot at head against wall. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.broomLean` — Leaning broom

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** janitor, loading, westyard
- **Dimensions (m):** 0.28 × 1.4 × 0.3 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** wood.pale, plastic.dark
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — thin lean-to prop
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Push broom leaning against a wall: handle, angled head block with bristle band. Pivot at head against wall. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.cleaningBottles` — Cleaning bottle cluster

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** janitor shelves, under sinks
- **Dimensions (m):** 0.3 × 0.28 × 0.2 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.white, plastic.smooth, plastic.grey
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Three mixed bottles: spray bottle with trigger, jug with handle recess, squeeze bottle; rng varies arrangement. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.toolCase` — Tool case

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** mechanical, it, loading
- **Dimensions (m):** 0.5 × 0.24 × 0.25 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.dark, metal.brushed, plastic.smooth
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Site tool case: ribbed lid, twin latches, handle. Variant: open (lid up, tray with tool bars visible). Variants: closed | open. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.paperSheet` — Loose paper sheet

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** desks, copy, floors near printers
- **Dimensions (m):** 0.21 × 0.002 × 0.3 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** paper.white
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Single A4 sheet with rng yaw and a faint curl; sits 1 mm above the surface. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.paperStack` — Paper stack

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** desks, copy, archive
- **Dimensions (m):** 0.24 × 0.12 × 0.32 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** paper.white, paper.cream
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Stack of 3–5 reams/piles with alternating jitter; height varies with rng. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.folder` — Manila folder

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** desks, archive, conference table
- **Dimensions (m):** 0.24 × 0.015 × 0.32 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** paper.cream, paper.white
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Folder with sheets poking out at an angle; variant: open (cover flipped, page visible). Variants: closed | open. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.binderRow` — Binder row

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** shelves, desks, archive
- **Dimensions (m):** 0.5 × 0.32 × 0.29 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.dark, plastic.smooth, plastic.grey, paper.white
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — sits on furniture
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** 3–6 lever-arch binders with spine label strips; count set by opts.count or rng, one may lean. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.notebook` — Notebook

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** desks, conference
- **Dimensions (m):** 0.15 × 0.02 × 0.21 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.smooth, paper.white
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** A5 notebook with cover overhang and page block; variant: open with page split. Variants: closed | open. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.pen` — Pen

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** every desk
- **Dimensions (m):** 0.14 × 0.01 × 0.02 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.smooth, metal.brushed
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Ballpoint with clip nub; random yaw. Variant: pencil (pale wood shaft). Variants: pen | pencil. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.stapler` — Stapler

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** desks, copy
- **Dimensions (m):** 0.06 × 0.06 × 0.16 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.smooth, metal.brushed
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Stapler: base, anvil strip, arched top arm with hinge rise at the back. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.tapeDispenser` — Tape dispenser

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** desks, copy
- **Dimensions (m):** 0.05 × 0.07 × 0.14 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.dark, plastic.white
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Weighted tape dispenser with a visible tape ring and cutter tongue. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.scissors` — Scissors

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** copy, desks
- **Dimensions (m):** 0.08 × 0.008 × 0.2 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.brushed, plastic.smooth
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Scissors lying flat, blades slightly open, moulded handles. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.stickyNotes` — Sticky note pads

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** desks, monitors
- **Dimensions (m):** 0.08 × 0.02 × 0.08 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** paper.cream, paper.white
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Two offset note pads; individual stuck notes are provided by the decal module for verticals. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.clipCup` — Paper-clip cup

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** desks
- **Dimensions (m):** 0.07 × 0.09 × 0.07 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.dark, metal.brushed
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Pen cup with clip wires and two pens sticking out at angles. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.idBadge` — ID badge on lanyard

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** desks, reception, floors (dropped in the evacuation)
- **Dimensions (m):** 0.09 × 0.006 × 0.16 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.white, fabric.chair, plastic.smooth
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Staff badge with lanyard puddle beside it; a human trace — dropped where people fled. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.keycard` — Key card

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** security desk, server, exec
- **Dimensions (m):** 0.054 × 0.002 × 0.086 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.smooth
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Access card, face up; objective-adjacent storytelling piece. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.calendarDesk` — Desk calendar

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** desks, reception
- **Dimensions (m):** 0.16 × 0.09 × 0.1 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** paper.white, metal.brushed
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Tent calendar: wire spine, two angled page faces. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.photoFrame` — Desk photo frame

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** desks — humanises the workstations
- **Dimensions (m):** 0.13 × 0.16 × 0.06 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** wood.dark, glass.clear, paper.cream
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Photo frame leaning on its strut: frame, glass sheet, photo backing. Variant: fallen (face down — someone left in a hurry). Variants: standing | fallen. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.brochureStack` — Company brochures

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** lobby, waiting, execante
- **Dimensions (m):** 0.22 × 0.03 × 0.3 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** paper.white, plastic.smooth
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Fanned stack of tri-fold brochures; cover art applied via signage where visible on stands. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.cupCoffeeTakeout` — Takeaway coffee cup

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** desks, conference, security desk
- **Dimensions (m):** 0.09 × 0.13 × 0.09 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** paper.cream, plastic.dark, paper.white
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Corrugated-sleeve coffee cup with sip lid. Variant: dropped (on its side, lid popped off nearby — pair with a spill decal). Variants: upright | dropped. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.bottleWater` — Water bottle

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** desks, conference table
- **Dimensions (m):** 0.07 × 0.24 × 0.07 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** glass.frosted, plastic.smooth
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Half-litre bottle with shoulder taper and cap; variant: tipped. Variants: upright | tipped. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.canDrink` — Drink can

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** breakroom, desks, vending surrounds
- **Dimensions (m):** 0.066 × 0.115 × 0.066 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.aluminium, plastic.smooth
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** 330 ml can with neck taper and a brand band; variant: crushed (squashed, on side). Variants: upright | crushed. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.wrapperFood` — Food wrapper

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** breakroom tables, bins, desks
- **Dimensions (m):** 0.14 × 0.02 × 0.1 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.smooth, paper.cream
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Crumpled wrapper: two overlapping crushed shells with random yaw. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.deskOrganiser` — Desk organiser

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** desks
- **Dimensions (m):** 0.25 × 0.12 × 0.15 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.dark, paper.white, plastic.smooth
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Multi-bay organiser: two upright letter slots with paper, pen tray with a pen. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.plantDesk` — Desk plant

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** desks, counters, window sills
- **Dimensions (m):** 0.14 × 0.24 × 0.14 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.grey, fabric.cubicleTeal, concrete.dark
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Small succulent: pot, soil, 5-leaf rosette of squashed spheres. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.backpack` — Backpack

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** under desks, lockers, waiting — abandoned in the evacuation
- **Dimensions (m):** 0.34 × 0.46 × 0.22 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** fabric.sofa, rubber.black, plastic.dark
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — soft floor clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Slumped backpack leaning on a surface: main body, front pocket, two straps splayed on the floor. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.briefcase` — Briefcase

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** exec, execante, boardroom
- **Dimensions (m):** 0.45 × 0.34 × 0.12 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** leather.dark, metal.brushed
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Standing briefcase: leather shell, two latches, handle arc. Variant: flat (lying down). Variants: standing | flat. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.umbrella` — Umbrella

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** lobby stand, coat corners
- **Dimensions (m):** 0.1 × 0.85 × 0.1 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** fabric.chair, metal.blackAnodised, plastic.dark
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Furled umbrella leaning at 10°: canopy roll, shaft, crook handle. Variant: floor (lying flat). Variants: leaning | floor. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

## decal

### `decal.carpetWear` — Decal — carpetWear

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/decals.js, src/props/dress.js
- **Used in:** level-wide via dress.js decal pass
- **Dimensions (m):** default 1.6 × 1.6 m, 3 painted variant(s), atlas tile 256×256px
- **Pivot / orientation:** quad centre on the host surface, offset 0.006 m along the surface normal
- **Material slots:** decal.atlas (shared transparent 2048² canvas atlas, single material/draw call)
- **Texture maps:** procedural Canvas2D alpha art: Pale trampled traffic lane with dirty fringes for carpet floors
- **Collision:** none
- **LOD:** flat quads in one merged mesh; mipmapped atlas handles distance, no swap needed
- **Status:** accepted
- **Acceptance criteria:** Pale trampled traffic lane with dirty fringes for carpet floors. Alpha fades to 0 at tile edges (no hard square borders), reads as surface wear not a sticker, deterministic per seed, never z-fights (0.006 m offset + polygonOffset).
- **Playwright evidence:** screenshots/gallery/decals.png
- **Remaining discrepancies:** none

### `decal.wallScuff` — Decal — wallScuff

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/decals.js, src/props/dress.js
- **Used in:** level-wide via dress.js decal pass
- **Dimensions (m):** default 0.9 × 0.9 m, 3 painted variant(s), atlas tile 256×256px
- **Pivot / orientation:** quad centre on the host surface, offset 0.006 m along the surface normal
- **Material slots:** decal.atlas (shared transparent 2048² canvas atlas, single material/draw call)
- **Texture maps:** procedural Canvas2D alpha art: Heel and furniture scuff streaks for wall bases
- **Collision:** none
- **LOD:** flat quads in one merged mesh; mipmapped atlas handles distance, no swap needed
- **Status:** accepted
- **Acceptance criteria:** Heel and furniture scuff streaks for wall bases. Alpha fades to 0 at tile edges (no hard square borders), reads as surface wear not a sticker, deterministic per seed, never z-fights (0.006 m offset + polygonOffset).
- **Playwright evidence:** screenshots/gallery/decals.png
- **Remaining discrepancies:** none

### `decal.floorDirt` — Decal — floorDirt

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/decals.js, src/props/dress.js
- **Used in:** level-wide via dress.js decal pass
- **Dimensions (m):** default 1.3 × 1.3 m, 3 painted variant(s), atlas tile 256×256px
- **Pivot / orientation:** quad centre on the host surface, offset 0.006 m along the surface normal
- **Material slots:** decal.atlas (shared transparent 2048² canvas atlas, single material/draw call)
- **Texture maps:** procedural Canvas2D alpha art: Grey-brown grime blotch with speckle for hard floors
- **Collision:** none
- **LOD:** flat quads in one merged mesh; mipmapped atlas handles distance, no swap needed
- **Status:** accepted
- **Acceptance criteria:** Grey-brown grime blotch with speckle for hard floors. Alpha fades to 0 at tile edges (no hard square borders), reads as surface wear not a sticker, deterministic per seed, never z-fights (0.006 m offset + polygonOffset).
- **Playwright evidence:** screenshots/gallery/decals.png
- **Remaining discrepancies:** none

### `decal.waterStain` — Decal — waterStain

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/decals.js, src/props/dress.js
- **Used in:** level-wide via dress.js decal pass
- **Dimensions (m):** default 1 × 1 m, 2 painted variant(s), atlas tile 256×256px
- **Pivot / orientation:** quad centre on the host surface, offset 0.006 m along the surface normal
- **Material slots:** decal.atlas (shared transparent 2048² canvas atlas, single material/draw call)
- **Texture maps:** procedural Canvas2D alpha art: Concentric tide-mark rings, brown, for floors and walls
- **Collision:** none
- **LOD:** flat quads in one merged mesh; mipmapped atlas handles distance, no swap needed
- **Status:** accepted
- **Acceptance criteria:** Concentric tide-mark rings, brown, for floors and walls. Alpha fades to 0 at tile edges (no hard square borders), reads as surface wear not a sticker, deterministic per seed, never z-fights (0.006 m offset + polygonOffset).
- **Playwright evidence:** screenshots/gallery/decals.png
- **Remaining discrepancies:** none

### `decal.ceilingLeak` — Decal — ceilingLeak

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/decals.js, src/props/dress.js
- **Used in:** level-wide via dress.js decal pass
- **Dimensions (m):** default 0.9 × 0.9 m, 2 painted variant(s), atlas tile 256×256px
- **Pivot / orientation:** quad centre on the host surface, offset 0.006 m along the surface normal
- **Material slots:** decal.atlas (shared transparent 2048² canvas atlas, single material/draw call)
- **Texture maps:** procedural Canvas2D alpha art: Yellow-brown leak blotch with dark irregular rim for ceiling tiles
- **Collision:** none
- **LOD:** flat quads in one merged mesh; mipmapped atlas handles distance, no swap needed
- **Status:** accepted
- **Acceptance criteria:** Yellow-brown leak blotch with dark irregular rim for ceiling tiles. Alpha fades to 0 at tile edges (no hard square borders), reads as surface wear not a sticker, deterministic per seed, never z-fights (0.006 m offset + polygonOffset).
- **Playwright evidence:** screenshots/gallery/decals.png
- **Remaining discrepancies:** none

### `decal.dust` — Decal — dust

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/decals.js, src/props/dress.js
- **Used in:** level-wide via dress.js decal pass
- **Dimensions (m):** default 0.8 × 0.8 m, 2 painted variant(s), atlas tile 256×256px
- **Pivot / orientation:** quad centre on the host surface, offset 0.006 m along the surface normal
- **Material slots:** decal.atlas (shared transparent 2048² canvas atlas, single material/draw call)
- **Texture maps:** procedural Canvas2D alpha art: Soft dust gradient creeping from an edge, for corners and shelf tops
- **Collision:** none
- **LOD:** flat quads in one merged mesh; mipmapped atlas handles distance, no swap needed
- **Status:** accepted
- **Acceptance criteria:** Soft dust gradient creeping from an edge, for corners and shelf tops. Alpha fades to 0 at tile edges (no hard square borders), reads as surface wear not a sticker, deterministic per seed, never z-fights (0.006 m offset + polygonOffset).
- **Playwright evidence:** screenshots/gallery/decals.png
- **Remaining discrepancies:** none

### `decal.footprints` — Decal — footprints

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/decals.js, src/props/dress.js
- **Used in:** level-wide via dress.js decal pass
- **Dimensions (m):** default 0.6 × 1.2 m, 3 painted variant(s), atlas tile 256×512px
- **Pivot / orientation:** quad centre on the host surface, offset 0.006 m along the surface normal
- **Material slots:** decal.atlas (shared transparent 2048² canvas atlas, single material/draw call)
- **Texture maps:** procedural Canvas2D alpha art: Alternating boot prints with tread gaps, walking line
- **Collision:** none
- **LOD:** flat quads in one merged mesh; mipmapped atlas handles distance, no swap needed
- **Status:** accepted
- **Acceptance criteria:** Alternating boot prints with tread gaps, walking line. Alpha fades to 0 at tile edges (no hard square borders), reads as surface wear not a sticker, deterministic per seed, never z-fights (0.006 m offset + polygonOffset).
- **Playwright evidence:** screenshots/gallery/decals.png
- **Remaining discrepancies:** none

### `decal.snowTracks` — Decal — snowTracks

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/decals.js, src/props/dress.js
- **Used in:** level-wide via dress.js decal pass
- **Dimensions (m):** default 0.9 × 1.8 m, 2 painted variant(s), atlas tile 256×512px
- **Pivot / orientation:** quad centre on the host surface, offset 0.006 m along the surface normal
- **Material slots:** decal.atlas (shared transparent 2048² canvas atlas, single material/draw call)
- **Texture maps:** procedural Canvas2D alpha art: Wet slush lane with melting boot prints for entrances
- **Collision:** none
- **LOD:** flat quads in one merged mesh; mipmapped atlas handles distance, no swap needed
- **Status:** accepted
- **Acceptance criteria:** Wet slush lane with melting boot prints for entrances. Alpha fades to 0 at tile edges (no hard square borders), reads as surface wear not a sticker, deterministic per seed, never z-fights (0.006 m offset + polygonOffset).
- **Playwright evidence:** screenshots/gallery/decals.png
- **Remaining discrepancies:** none

### `decal.fingerprints` — Decal — fingerprints

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/decals.js, src/props/dress.js
- **Used in:** level-wide via dress.js decal pass
- **Dimensions (m):** default 0.7 × 0.7 m, 2 painted variant(s), atlas tile 256×256px
- **Pivot / orientation:** quad centre on the host surface, offset 0.006 m along the surface normal
- **Material slots:** decal.atlas (shared transparent 2048² canvas atlas, single material/draw call)
- **Texture maps:** procedural Canvas2D alpha art: Faint palm and finger smudges for glazing
- **Collision:** none
- **LOD:** flat quads in one merged mesh; mipmapped atlas handles distance, no swap needed
- **Status:** accepted
- **Acceptance criteria:** Faint palm and finger smudges for glazing. Alpha fades to 0 at tile edges (no hard square borders), reads as surface wear not a sticker, deterministic per seed, never z-fights (0.006 m offset + polygonOffset).
- **Playwright evidence:** screenshots/gallery/decals.png
- **Remaining discrepancies:** none

### `decal.tapeTorn` — Decal — tapeTorn

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/decals.js, src/props/dress.js
- **Used in:** level-wide via dress.js decal pass
- **Dimensions (m):** default 0.35 × 0.35 m, 3 painted variant(s), atlas tile 256×256px
- **Pivot / orientation:** quad centre on the host surface, offset 0.006 m along the surface normal
- **Material slots:** decal.atlas (shared transparent 2048² canvas atlas, single material/draw call)
- **Texture maps:** procedural Canvas2D alpha art: Torn packing-tape strip left on a surface
- **Collision:** none
- **LOD:** flat quads in one merged mesh; mipmapped atlas handles distance, no swap needed
- **Status:** accepted
- **Acceptance criteria:** Torn packing-tape strip left on a surface. Alpha fades to 0 at tile edges (no hard square borders), reads as surface wear not a sticker, deterministic per seed, never z-fights (0.006 m offset + polygonOffset).
- **Playwright evidence:** screenshots/gallery/decals.png
- **Remaining discrepancies:** none

### `decal.signResidue` — Decal — signResidue

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/decals.js, src/props/dress.js
- **Used in:** level-wide via dress.js decal pass
- **Dimensions (m):** default 0.5 × 0.5 m, 2 painted variant(s), atlas tile 256×256px
- **Pivot / orientation:** quad centre on the host surface, offset 0.006 m along the surface normal
- **Material slots:** decal.atlas (shared transparent 2048² canvas atlas, single material/draw call)
- **Texture maps:** procedural Canvas2D alpha art: Clean ghost rectangle, adhesive shadows and plug holes where a sign was removed
- **Collision:** none
- **LOD:** flat quads in one merged mesh; mipmapped atlas handles distance, no swap needed
- **Status:** accepted
- **Acceptance criteria:** Clean ghost rectangle, adhesive shadows and plug holes where a sign was removed. Alpha fades to 0 at tile edges (no hard square borders), reads as surface wear not a sticker, deterministic per seed, never z-fights (0.006 m offset + polygonOffset).
- **Playwright evidence:** screenshots/gallery/decals.png
- **Remaining discrepancies:** none

### `decal.cableMarks` — Decal — cableMarks

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/decals.js, src/props/dress.js
- **Used in:** level-wide via dress.js decal pass
- **Dimensions (m):** default 0.9 × 0.9 m, 2 painted variant(s), atlas tile 256×256px
- **Pivot / orientation:** quad centre on the host surface, offset 0.006 m along the surface normal
- **Material slots:** decal.atlas (shared transparent 2048² canvas atlas, single material/draw call)
- **Texture maps:** procedural Canvas2D alpha art: Grey rub-lines and clip shadows from removed cable runs
- **Collision:** none
- **LOD:** flat quads in one merged mesh; mipmapped atlas handles distance, no swap needed
- **Status:** accepted
- **Acceptance criteria:** Grey rub-lines and clip shadows from removed cable runs. Alpha fades to 0 at tile edges (no hard square borders), reads as surface wear not a sticker, deterministic per seed, never z-fights (0.006 m offset + polygonOffset).
- **Playwright evidence:** screenshots/gallery/decals.png
- **Remaining discrepancies:** none

### `decal.crackedPlaster` — Decal — crackedPlaster

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/decals.js, src/props/dress.js
- **Used in:** level-wide via dress.js decal pass
- **Dimensions (m):** default 0.8 × 0.8 m, 3 painted variant(s), atlas tile 256×256px
- **Pivot / orientation:** quad centre on the host surface, offset 0.006 m along the surface normal
- **Material slots:** decal.atlas (shared transparent 2048² canvas atlas, single material/draw call)
- **Texture maps:** procedural Canvas2D alpha art: Recursive branching plaster crack with pale spall
- **Collision:** none
- **LOD:** flat quads in one merged mesh; mipmapped atlas handles distance, no swap needed
- **Status:** accepted
- **Acceptance criteria:** Recursive branching plaster crack with pale spall. Alpha fades to 0 at tile edges (no hard square borders), reads as surface wear not a sticker, deterministic per seed, never z-fights (0.006 m offset + polygonOffset).
- **Playwright evidence:** screenshots/gallery/decals.png
- **Remaining discrepancies:** none

### `decal.chippedPaint` — Decal — chippedPaint

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/decals.js, src/props/dress.js
- **Used in:** level-wide via dress.js decal pass
- **Dimensions (m):** default 0.6 × 0.6 m, 2 painted variant(s), atlas tile 256×256px
- **Pivot / orientation:** quad centre on the host surface, offset 0.006 m along the surface normal
- **Material slots:** decal.atlas (shared transparent 2048² canvas atlas, single material/draw call)
- **Texture maps:** procedural Canvas2D alpha art: Flaked paint patches exposing dark undercoat
- **Collision:** none
- **LOD:** flat quads in one merged mesh; mipmapped atlas handles distance, no swap needed
- **Status:** accepted
- **Acceptance criteria:** Flaked paint patches exposing dark undercoat. Alpha fades to 0 at tile edges (no hard square borders), reads as surface wear not a sticker, deterministic per seed, never z-fights (0.006 m offset + polygonOffset).
- **Playwright evidence:** screenshots/gallery/decals.png
- **Remaining discrepancies:** none

### `char.insignia.kestrel` — Kestrel Group insignia

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/characters/faces.js
- **Used in:** hostile plate carriers, left-arm armbands, warden beret flash
- **Dimensions (m):** 128² canvas, worn at 0.05–0.065 m
- **Pivot / orientation:** centred decal plane, alpha-transparent background
- **Material slots:** standard decal material, polygon-offset over cloth
- **Texture maps:** painted canvas: slate shield, ice-white kestrel in a stoop, three gold chevrons, KESTREL wordmark
- **Collision:** n/a
- **LOD:** dropped with the hi shells beyond 18 m
- **Status:** built
- **Acceptance criteria:** Wholly original fiction — no real-world or third-party game branding anywhere on the characters.
- **Playwright evidence:** pending
- **Remaining discrepancies:** none

### `vfx.decal.bullet.concrete` — Runtime decal — bullet.concrete

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/decals.js
- **Used in:** combat impacts
- **Dimensions (m):** 0.12 m nominal quad
- **Pivot / orientation:** centre of quad, +Z along surface normal
- **Material slots:** per-slot MeshLambertMaterial, transparent, polygonOffset(-4,-4), depthWrite off
- **Texture maps:** vfx.decal.bullet.concrete.* canvas variants via decalTexture()
- **Collision:** none
- **LOD:** hard cap settings.preset.decalBudget, oldest recycled first
- **Status:** built
- **Acceptance criteria:** Offset 0.008 m along normal, random roll, 80 ms fade-in, no z-fighting or flicker; blood respects reducedBlood.
- **Playwright evidence:** pending
- **Remaining discrepancies:** none

### `vfx.decal.bullet.drywall` — Runtime decal — bullet.drywall

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/decals.js
- **Used in:** combat impacts
- **Dimensions (m):** 0.12 m nominal quad
- **Pivot / orientation:** centre of quad, +Z along surface normal
- **Material slots:** per-slot MeshLambertMaterial, transparent, polygonOffset(-4,-4), depthWrite off
- **Texture maps:** vfx.decal.bullet.drywall.* canvas variants via decalTexture()
- **Collision:** none
- **LOD:** hard cap settings.preset.decalBudget, oldest recycled first
- **Status:** built
- **Acceptance criteria:** Offset 0.008 m along normal, random roll, 80 ms fade-in, no z-fighting or flicker; blood respects reducedBlood.
- **Playwright evidence:** pending
- **Remaining discrepancies:** none

### `vfx.decal.bullet.wood` — Runtime decal — bullet.wood

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/decals.js
- **Used in:** combat impacts
- **Dimensions (m):** 0.12 m nominal quad
- **Pivot / orientation:** centre of quad, +Z along surface normal
- **Material slots:** per-slot MeshLambertMaterial, transparent, polygonOffset(-4,-4), depthWrite off
- **Texture maps:** vfx.decal.bullet.wood.* canvas variants via decalTexture()
- **Collision:** none
- **LOD:** hard cap settings.preset.decalBudget, oldest recycled first
- **Status:** built
- **Acceptance criteria:** Offset 0.008 m along normal, random roll, 80 ms fade-in, no z-fighting or flicker; blood respects reducedBlood.
- **Playwright evidence:** pending
- **Remaining discrepancies:** none

### `vfx.decal.bullet.metal` — Runtime decal — bullet.metal

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/decals.js
- **Used in:** combat impacts
- **Dimensions (m):** 0.12 m nominal quad
- **Pivot / orientation:** centre of quad, +Z along surface normal
- **Material slots:** per-slot MeshLambertMaterial, transparent, polygonOffset(-4,-4), depthWrite off
- **Texture maps:** vfx.decal.bullet.metal.* canvas variants via decalTexture()
- **Collision:** none
- **LOD:** hard cap settings.preset.decalBudget, oldest recycled first
- **Status:** built
- **Acceptance criteria:** Offset 0.008 m along normal, random roll, 80 ms fade-in, no z-fighting or flicker; blood respects reducedBlood.
- **Playwright evidence:** pending
- **Remaining discrepancies:** none

### `vfx.decal.bullet.glass` — Runtime decal — bullet.glass

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/decals.js
- **Used in:** combat impacts
- **Dimensions (m):** 0.12 m nominal quad
- **Pivot / orientation:** centre of quad, +Z along surface normal
- **Material slots:** per-slot MeshLambertMaterial, transparent, polygonOffset(-4,-4), depthWrite off
- **Texture maps:** vfx.decal.bullet.glass.* canvas variants via decalTexture()
- **Collision:** none
- **LOD:** hard cap settings.preset.decalBudget, oldest recycled first
- **Status:** built
- **Acceptance criteria:** Offset 0.008 m along normal, random roll, 80 ms fade-in, no z-fighting or flicker; blood respects reducedBlood.
- **Playwright evidence:** pending
- **Remaining discrepancies:** none

### `vfx.decal.bullet.carpet` — Runtime decal — bullet.carpet

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/decals.js
- **Used in:** combat impacts
- **Dimensions (m):** 0.12 m nominal quad
- **Pivot / orientation:** centre of quad, +Z along surface normal
- **Material slots:** per-slot MeshLambertMaterial, transparent, polygonOffset(-4,-4), depthWrite off
- **Texture maps:** vfx.decal.bullet.carpet.* canvas variants via decalTexture()
- **Collision:** none
- **LOD:** hard cap settings.preset.decalBudget, oldest recycled first
- **Status:** built
- **Acceptance criteria:** Offset 0.008 m along normal, random roll, 80 ms fade-in, no z-fighting or flicker; blood respects reducedBlood.
- **Playwright evidence:** pending
- **Remaining discrepancies:** none

### `vfx.decal.bullet.ceramic` — Runtime decal — bullet.ceramic

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/decals.js
- **Used in:** combat impacts
- **Dimensions (m):** 0.12 m nominal quad
- **Pivot / orientation:** centre of quad, +Z along surface normal
- **Material slots:** per-slot MeshLambertMaterial, transparent, polygonOffset(-4,-4), depthWrite off
- **Texture maps:** vfx.decal.bullet.ceramic.* canvas variants via decalTexture()
- **Collision:** none
- **LOD:** hard cap settings.preset.decalBudget, oldest recycled first
- **Status:** built
- **Acceptance criteria:** Offset 0.008 m along normal, random roll, 80 ms fade-in, no z-fighting or flicker; blood respects reducedBlood.
- **Playwright evidence:** pending
- **Remaining discrepancies:** none

### `vfx.decal.bullet.vinyl` — Runtime decal — bullet.vinyl

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/decals.js
- **Used in:** combat impacts
- **Dimensions (m):** 0.12 m nominal quad
- **Pivot / orientation:** centre of quad, +Z along surface normal
- **Material slots:** per-slot MeshLambertMaterial, transparent, polygonOffset(-4,-4), depthWrite off
- **Texture maps:** vfx.decal.bullet.vinyl.* canvas variants via decalTexture()
- **Collision:** none
- **LOD:** hard cap settings.preset.decalBudget, oldest recycled first
- **Status:** built
- **Acceptance criteria:** Offset 0.008 m along normal, random roll, 80 ms fade-in, no z-fighting or flicker; blood respects reducedBlood.
- **Playwright evidence:** pending
- **Remaining discrepancies:** none

### `vfx.decal.bullet.plastic` — Runtime decal — bullet.plastic

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/decals.js
- **Used in:** combat impacts
- **Dimensions (m):** 0.12 m nominal quad
- **Pivot / orientation:** centre of quad, +Z along surface normal
- **Material slots:** per-slot MeshLambertMaterial, transparent, polygonOffset(-4,-4), depthWrite off
- **Texture maps:** vfx.decal.bullet.plastic.* canvas variants via decalTexture()
- **Collision:** none
- **LOD:** hard cap settings.preset.decalBudget, oldest recycled first
- **Status:** built
- **Acceptance criteria:** Offset 0.008 m along normal, random roll, 80 ms fade-in, no z-fighting or flicker; blood respects reducedBlood.
- **Playwright evidence:** pending
- **Remaining discrepancies:** none

### `vfx.decal.bullet.snow` — Runtime decal — bullet.snow

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/decals.js
- **Used in:** combat impacts
- **Dimensions (m):** 0.12 m nominal quad
- **Pivot / orientation:** centre of quad, +Z along surface normal
- **Material slots:** per-slot MeshLambertMaterial, transparent, polygonOffset(-4,-4), depthWrite off
- **Texture maps:** vfx.decal.bullet.snow.* canvas variants via decalTexture()
- **Collision:** none
- **LOD:** hard cap settings.preset.decalBudget, oldest recycled first
- **Status:** built
- **Acceptance criteria:** Offset 0.008 m along normal, random roll, 80 ms fade-in, no z-fighting or flicker; blood respects reducedBlood.
- **Playwright evidence:** pending
- **Remaining discrepancies:** none

### `vfx.decal.scorch` — Runtime decal — scorch

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/decals.js
- **Used in:** combat impacts
- **Dimensions (m):** 0.50 m nominal quad
- **Pivot / orientation:** centre of quad, +Z along surface normal
- **Material slots:** per-slot MeshLambertMaterial, transparent, polygonOffset(-4,-4), depthWrite off
- **Texture maps:** vfx.decal.scorch.* canvas variants via decalTexture()
- **Collision:** none
- **LOD:** hard cap settings.preset.decalBudget, oldest recycled first
- **Status:** built
- **Acceptance criteria:** Offset 0.008 m along normal, random roll, 80 ms fade-in, no z-fighting or flicker; blood respects reducedBlood.
- **Playwright evidence:** pending
- **Remaining discrepancies:** none

### `vfx.decal.blood` — Runtime decal — blood

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/decals.js
- **Used in:** combat impacts
- **Dimensions (m):** 0.50 m nominal quad
- **Pivot / orientation:** centre of quad, +Z along surface normal
- **Material slots:** per-slot MeshLambertMaterial, transparent, polygonOffset(-4,-4), depthWrite off
- **Texture maps:** vfx.decal.blood.* canvas variants via decalTexture()
- **Collision:** none
- **LOD:** hard cap settings.preset.decalBudget, oldest recycled first
- **Status:** built
- **Acceptance criteria:** Offset 0.008 m along normal, random roll, 80 ms fade-in, no z-fighting or flicker; blood respects reducedBlood.
- **Playwright evidence:** pending
- **Remaining discrepancies:** none

### `vfx.decal.scuff` — Runtime decal — scuff

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/decals.js
- **Used in:** combat impacts
- **Dimensions (m):** 0.50 m nominal quad
- **Pivot / orientation:** centre of quad, +Z along surface normal
- **Material slots:** per-slot MeshLambertMaterial, transparent, polygonOffset(-4,-4), depthWrite off
- **Texture maps:** vfx.decal.scuff.* canvas variants via decalTexture()
- **Collision:** none
- **LOD:** hard cap settings.preset.decalBudget, oldest recycled first
- **Status:** built
- **Acceptance criteria:** Offset 0.008 m along normal, random roll, 80 ms fade-in, no z-fighting or flicker; blood respects reducedBlood.
- **Playwright evidence:** pending
- **Remaining discrepancies:** none

### `vfx.decal.door` — Runtime decal — door

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/decals.js
- **Used in:** combat impacts
- **Dimensions (m):** 0.50 m nominal quad
- **Pivot / orientation:** centre of quad, +Z along surface normal
- **Material slots:** per-slot MeshLambertMaterial, transparent, polygonOffset(-4,-4), depthWrite off
- **Texture maps:** vfx.decal.door.* canvas variants via decalTexture()
- **Collision:** none
- **LOD:** hard cap settings.preset.decalBudget, oldest recycled first
- **Status:** built
- **Acceptance criteria:** Offset 0.008 m along normal, random roll, 80 ms fade-in, no z-fighting or flicker; blood respects reducedBlood.
- **Playwright evidence:** pending
- **Remaining discrepancies:** none

## door

### `door.standard` — Standard office door

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/doors.js, src/map/layout.js
- **Used in:** offices, copy room, break room, janitor
- **Dimensions (m):** 0.94 × 2.06 × 0.045 m
- **Pivot / orientation:** hinge edge at floor, swings on -Y
- **Material slots:** wood.veneer, wood.dark, metal.brushed
- **Texture maps:** baseColor, normal, roughness
- **Collision:** AABB while closed, shrinking sweep while opening
- **LOD:** single LOD; leaf + hardware total under 900 triangles, hardware culled beyond 14 m by frustum
- **Animation states:** closed, opening, open, closing, locked-rattle, damaged-ajar
- **Audio dependencies:** door.wood.open, door.wood.close, door.handle
- **Status:** accepted
- **Acceptance criteria:** Correct pivot and swing clearance, collision matches the visible leaf at every open amount, hardware at real-world heights, AI paths through it, text state matches the render.
- **Playwright evidence:** screenshots/doors/*.png
- **Remaining discrepancies:** none

### `door.glass` — Glass office door

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/doors.js, src/map/layout.js
- **Used in:** conference, boardroom, IT
- **Dimensions (m):** 0.94 × 2.06 × 0.016 m
- **Pivot / orientation:** hinge edge at floor
- **Material slots:** glass.clear, metal.aluminium
- **Texture maps:** baseColor, normal, roughness
- **Collision:** AABB while closed
- **LOD:** single LOD; leaf + hardware total under 900 triangles, hardware culled beyond 14 m by frustum
- **Animation states:** closed, opening, open, closing, locked-rattle, damaged-ajar
- **Audio dependencies:** door.glass.open, door.glass.close
- **Status:** accepted
- **Acceptance criteria:** Correct pivot and swing clearance, collision matches the visible leaf at every open amount, hardware at real-world heights, AI paths through it, text state matches the render.
- **Playwright evidence:** screenshots/doors/*.png
- **Remaining discrepancies:** none

### `door.glassDouble` — Interior glass double door

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/doors.js, src/map/layout.js
- **Used in:** vestibule to lobby
- **Dimensions (m):** 2.0 × 2.4 m pair
- **Pivot / orientation:** centre of pair at floor
- **Material slots:** glass.clear, metal.aluminium
- **Texture maps:** baseColor, normal, roughness
- **Collision:** AABB pair
- **LOD:** single LOD; leaf + hardware total under 900 triangles, hardware culled beyond 14 m by frustum
- **Animation states:** closed, opening, open, closing, locked-rattle, damaged-ajar
- **Audio dependencies:** door.glass.open, door.glass.close
- **Status:** accepted
- **Acceptance criteria:** Correct pivot and swing clearance, collision matches the visible leaf at every open amount, hardware at real-world heights, AI paths through it, text state matches the render.
- **Playwright evidence:** screenshots/doors/*.png
- **Remaining discrepancies:** none

### `door.exteriorDouble` — Exterior entrance double door

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/doors.js, src/map/layout.js
- **Used in:** employee entrance
- **Dimensions (m):** 2.0 × 2.4 m pair, glazed
- **Pivot / orientation:** centre of pair at floor
- **Material slots:** metal.painted, glass.clear, metal.brushed
- **Texture maps:** baseColor, normal, roughness
- **Collision:** AABB pair
- **LOD:** single LOD; leaf + hardware total under 900 triangles, hardware culled beyond 14 m by frustum
- **Animation states:** closed, opening, open, closing, locked-rattle, damaged-ajar
- **Audio dependencies:** door.metal.open, door.metal.close, wind.gust
- **Status:** accepted
- **Acceptance criteria:** Correct pivot and swing clearance, collision matches the visible leaf at every open amount, hardware at real-world heights, AI paths through it, text state matches the render.
- **Playwright evidence:** screenshots/doors/*.png
- **Remaining discrepancies:** none

### `door.fire` — Fire door

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/doors.js, src/map/layout.js
- **Used in:** stairs, loading, garage, plant
- **Dimensions (m):** 0.94 × 2.06 × 0.055 m with vision panel
- **Pivot / orientation:** hinge edge at floor
- **Material slots:** metal.painted, glass.clear, metal.brushed
- **Texture maps:** baseColor, normal, roughness
- **Collision:** AABB while closed
- **LOD:** single LOD; leaf + hardware total under 900 triangles, hardware culled beyond 14 m by frustum
- **Animation states:** closed, opening, open, closing, locked-rattle, damaged-ajar
- **Audio dependencies:** door.metal.open, door.metal.close, pushbar
- **Status:** accepted
- **Acceptance criteria:** Correct pivot and swing clearance, collision matches the visible leaf at every open amount, hardware at real-world heights, AI paths through it, text state matches the render.
- **Playwright evidence:** screenshots/doors/*.png
- **Remaining discrepancies:** none

### `door.security` — Security door

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/doors.js, src/map/layout.js
- **Used in:** plant, server south entry
- **Dimensions (m):** 0.94 × 2.06 × 0.06 m with card reader
- **Pivot / orientation:** hinge edge at floor
- **Material slots:** metal.paintedDark, plastic.dark, emissive.ledRed
- **Texture maps:** baseColor, normal, roughness
- **Collision:** AABB while closed
- **LOD:** single LOD; leaf + hardware total under 900 triangles, hardware culled beyond 14 m by frustum
- **Animation states:** closed, opening, open, closing, locked-rattle, damaged-ajar
- **Audio dependencies:** door.metal.open, reader.deny, reader.grant
- **Status:** accepted
- **Acceptance criteria:** Correct pivot and swing clearance, collision matches the visible leaf at every open amount, hardware at real-world heights, AI paths through it, text state matches the render.
- **Playwright evidence:** screenshots/doors/*.png
- **Remaining discrepancies:** none

### `door.server` — Server room door

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/doors.js, src/map/layout.js
- **Used in:** server room
- **Dimensions (m):** 0.94 × 2.06 × 0.06 m brushed with vision panel
- **Pivot / orientation:** hinge edge at floor
- **Material slots:** metal.brushedV, glass.clear
- **Texture maps:** baseColor, normal, roughness
- **Collision:** AABB while closed
- **LOD:** single LOD; leaf + hardware total under 900 triangles, hardware culled beyond 14 m by frustum
- **Animation states:** closed, opening, open, closing, locked-rattle, damaged-ajar
- **Audio dependencies:** door.metal.open, reader.grant
- **Status:** accepted
- **Acceptance criteria:** Correct pivot and swing clearance, collision matches the visible leaf at every open amount, hardware at real-world heights, AI paths through it, text state matches the render.
- **Playwright evidence:** screenshots/doors/*.png
- **Remaining discrepancies:** none

### `door.restroom` — Restroom door

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/doors.js, src/map/layout.js
- **Used in:** restrooms
- **Dimensions (m):** 0.86 × 2.06 × 0.04 m
- **Pivot / orientation:** hinge edge at floor
- **Material slots:** wood.pale, metal.brushed
- **Texture maps:** baseColor, normal, roughness
- **Collision:** AABB while closed
- **LOD:** single LOD; leaf + hardware total under 900 triangles, hardware culled beyond 14 m by frustum
- **Animation states:** closed, opening, open, closing, locked-rattle, damaged-ajar
- **Audio dependencies:** door.wood.open
- **Status:** accepted
- **Acceptance criteria:** Correct pivot and swing clearance, collision matches the visible leaf at every open amount, hardware at real-world heights, AI paths through it, text state matches the render.
- **Playwright evidence:** screenshots/doors/*.png
- **Remaining discrepancies:** none

### `door.exec` — Executive door

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/doors.js, src/map/layout.js
- **Used in:** executive office
- **Dimensions (m):** 1.0 × 2.3 × 0.055 m dark veneer
- **Pivot / orientation:** hinge edge at floor
- **Material slots:** wood.dark, metal.brushed
- **Texture maps:** baseColor, normal, roughness
- **Collision:** AABB while closed
- **LOD:** single LOD; leaf + hardware total under 900 triangles, hardware culled beyond 14 m by frustum
- **Animation states:** closed, opening, open, closing, locked-rattle, damaged-ajar
- **Audio dependencies:** door.wood.open
- **Status:** accepted
- **Acceptance criteria:** Correct pivot and swing clearance, collision matches the visible leaf at every open amount, hardware at real-world heights, AI paths through it, text state matches the render.
- **Playwright evidence:** screenshots/doors/*.png
- **Remaining discrepancies:** none

### `door.garageShutter` — Roller shutter

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/doors.js, src/map/layout.js
- **Used in:** extraction garage, loading dock
- **Dimensions (m):** 5.8 × 4.0 m slat curtain
- **Pivot / orientation:** bottom centre of the opening
- **Material slots:** metal.galvanised, metal.painted, emissive.ledGreen
- **Texture maps:** baseColor, normal, roughness
- **Collision:** AABB shrinking as the curtain lifts
- **LOD:** single LOD; leaf + hardware total under 900 triangles, hardware culled beyond 14 m by frustum
- **Animation states:** closed, opening, open, closing, locked-rattle, damaged-ajar
- **Audio dependencies:** shutter.motor, shutter.rattle
- **Status:** accepted
- **Acceptance criteria:** Correct pivot and swing clearance, collision matches the visible leaf at every open amount, hardware at real-world heights, AI paths through it, text state matches the render.
- **Playwright evidence:** screenshots/doors/*.png
- **Remaining discrepancies:** none

### `door.hardware.lever` — Lever handle set

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/doors.js, src/map/layout.js
- **Used in:** all lever doors
- **Dimensions (m):** 0.12 m lever, both faces
- **Pivot / orientation:** spindle centre at 1.05 m
- **Material slots:** metal.brushed, metal.stainless
- **Texture maps:** baseColor, normal, roughness
- **Collision:** none
- **LOD:** single LOD; leaf + hardware total under 900 triangles, hardware culled beyond 14 m by frustum
- **Animation states:** closed, opening, open, closing, locked-rattle, damaged-ajar
- **Audio dependencies:** door.handle
- **Status:** accepted
- **Acceptance criteria:** Correct pivot and swing clearance, collision matches the visible leaf at every open amount, hardware at real-world heights, AI paths through it, text state matches the render.
- **Playwright evidence:** screenshots/doors/*.png
- **Remaining discrepancies:** none

### `door.hardware.pushbar` — Push bar

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/doors.js, src/map/layout.js
- **Used in:** fire and exterior doors
- **Dimensions (m):** 0.7 m crash bar
- **Pivot / orientation:** bar centre at 1.02 m
- **Material slots:** metal.brushed
- **Texture maps:** baseColor, normal, roughness
- **Collision:** none
- **LOD:** single LOD; leaf + hardware total under 900 triangles, hardware culled beyond 14 m by frustum
- **Animation states:** closed, opening, open, closing, locked-rattle, damaged-ajar
- **Audio dependencies:** pushbar
- **Status:** accepted
- **Acceptance criteria:** Correct pivot and swing clearance, collision matches the visible leaf at every open amount, hardware at real-world heights, AI paths through it, text state matches the render.
- **Playwright evidence:** screenshots/doors/*.png
- **Remaining discrepancies:** none

### `door.hardware.closer` — Door closer

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/doors.js, src/map/layout.js
- **Used in:** all closer-fitted doors
- **Dimensions (m):** 0.2 m body with arm
- **Pivot / orientation:** head of the leaf
- **Material slots:** metal.paintedDark, metal.brushed
- **Texture maps:** baseColor, normal, roughness
- **Collision:** none
- **LOD:** single LOD; leaf + hardware total under 900 triangles, hardware culled beyond 14 m by frustum
- **Animation states:** closed, opening, open, closing, locked-rattle, damaged-ajar
- **Audio dependencies:** door.closer.hiss
- **Status:** accepted
- **Acceptance criteria:** Correct pivot and swing clearance, collision matches the visible leaf at every open amount, hardware at real-world heights, AI paths through it, text state matches the render.
- **Playwright evidence:** screenshots/doors/*.png
- **Remaining discrepancies:** none

### `door.hardware.cardreader` — Card reader

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/doors.js, src/map/layout.js
- **Used in:** controlled doors
- **Dimensions (m):** 0.08 × 0.13 × 0.03 m
- **Pivot / orientation:** centre at 1.15 m beside the jamb
- **Material slots:** plastic.dark, emissive.ledRed, emissive.ledGreen
- **Texture maps:** baseColor, normal, roughness
- **Collision:** none
- **LOD:** single LOD; leaf + hardware total under 900 triangles, hardware culled beyond 14 m by frustum
- **Animation states:** closed, opening, open, closing, locked-rattle, damaged-ajar
- **Audio dependencies:** reader.grant, reader.deny
- **Status:** accepted
- **Acceptance criteria:** Correct pivot and swing clearance, collision matches the visible leaf at every open amount, hardware at real-world heights, AI paths through it, text state matches the render.
- **Playwright evidence:** screenshots/doors/*.png
- **Remaining discrepancies:** none

## electronics

### `prop.monitor` — 24-inch monitor

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** every desk
- **Dimensions (m):** 0.56 × 0.53 × 0.2 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.smooth, plastic.dark, screen.atlas (content map + emissiveMap), metal.brushed
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — desk clutter scale
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** 24" panel (0.54 × 0.33 visible) on column stand and flat foot; powered face shows original screen content (spreadsheet / mail / dashboard / CAD / lock screen) from the shared screen atlas, paired with a screens[] entry. Variants: on | off (dark glass) | nosignal. Variants: on | off | nosignal. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.monitorDual` — Dual-monitor arm setup

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** openplanA, it, server desk
- **Dimensions (m):** 1.14 × 0.56 × 0.22 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.smooth, metal.blackAnodised, screen.atlas (content map + emissiveMap)
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — desk clutter scale
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Two 24" panels angled 8° inwards on a shared pole arm with a weighted base; both faces carry distinct original screen content; two screens[] entries. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.laptop` — Laptop, open

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** it, execante, conference, exec
- **Dimensions (m):** 0.34 × 0.24 × 0.24 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.aluminium, plastic.dark, screen.atlas (content map + emissiveMap)
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** 14" aluminium laptop open at 105°: keyboard deck with key field and trackpad, lid screen with original content (mail / lock screen / spreadsheet) + screens[] entry. Variant: closed. Variants: open | closed. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.computerTower` — Desktop tower PC

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** under every workstation desk
- **Dimensions (m):** 0.18 × 0.42 × 0.45 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.dark, metal.paintedDark, emissive.ledGreen
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — sits inside desk collider footprint
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Mid-tower: front panel with optical bay lines, power button, status LED, side vent. Variant: off (no LED). Variants: on | off. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.deskPhone` — Desk phone

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** reception, desks, conference
- **Dimensions (m):** 0.22 × 0.09 × 0.2 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.dark, plastic.grey, plastic.smooth
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Office IP phone: wedge body, handset in cradle, keypad grid, small display. Variant: offHook (handset beside body, cord loop). Variants: onHook | offHook. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.printerDesk` — Desktop printer

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** execante, it, copy
- **Dimensions (m):** 0.48 × 0.3 × 0.4 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.grey, plastic.dark, paper.white
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — sits on furniture
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Small laser printer: body with output slot, raised control pad, paper in the out-tray. Variant: jam (lid propped, paper askew). Variants: ok | jam. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.copierFloor` — Floor-standing copier

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** copy, openplanA
- **Dimensions (m):** 1.1 × 1.22 × 0.68 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.grey, plastic.dark, metal.painted, paper.white, screen.atlas (copier panel content)
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 1.1 × 1.22 × 0.68
- **LOD:** LOD0 merged into static batch; buildLod1(opts) exposes a simplified silhouette (< 25% tris) for gallery/dynamic use — batched statics do not runtime-switch
- **Status:** accepted
- **Acceptance criteria:** Multifunction copier: cabinet base, scanner deck with raised feeder lid, angled control screen with READY panel content (screens[] entry), three paper drawers, side output tray with paper. Waist-high cover. Variant: open (front service door ajar, toner visible, panel shows PAPER JAM). Variants: closed | open. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.displayWall` — Wall conference display

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** conference, boardroom, waiting
- **Dimensions (m):** 1.48 × 0.9 × 0.09 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.smooth, metal.blackAnodised, screen.atlas (content map + emissiveMap)
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — wall mounted
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** 65" display on a wall bracket: slim bezel, content face (title slide / dashboard via opts.content) + screens[] entry, soundbar beneath. Pivot at panel centre against wall (+Z into wall). Variant: off. Variants: on | off. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.securityMonitorBank` — Security monitor bank

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** vestibule, server
- **Dimensions (m):** 0.94 × 0.68 × 0.18 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.paintedDark, plastic.smooth, screen.atlas (CCTV quad splits)
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — sits on desk/console
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Rack of 2 × 2 CCTV monitors on a shared stand; each face shows a labelled quad-split camera view (one dead feed reads NO SIGNAL), registered as "security" screens; cable loom behind. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.serverRack` — Server rack

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** server
- **Dimensions (m):** 0.6 × 2 × 1 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.paintedDark, metal.blackAnodised, plastic.dark, emissive.ledGreen, emissive.ledAmber
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.6 × 2.0 × 1.0 (full-height cover)
- **LOD:** LOD0 merged into static batch; buildLod1(opts) exposes a simplified silhouette (< 25% tris) for gallery/dynamic use — batched statics do not runtime-switch
- **Status:** accepted
- **Acceptance criteria:** 42U rack 0.6 × 2.0 × 1.0: frame, side panels, populated front with distinct 1U/2U server faces, drive slots and per-unit status LEDs; screens[] "server" entry for the KVM row. Variants: closed (perforated door) | open (equipment exposed). Variants: open | closed. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.switchShelf` — Network switch shelf

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** it, server, copy
- **Dimensions (m):** 0.6 × 0.5 × 0.32 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.paintedDark, plastic.dark, emissive.ledGreen, rubber.black
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — wall mounted above desks
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Wall-mount comms bracket: two switch units with port rows and blinking-green LED strips, patch cables dropping to a loom. Pivot at bracket centre against wall. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.ups` — Floor UPS unit

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** server, it
- **Dimensions (m):** 0.26 × 0.46 × 0.6 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.paintedDark, plastic.dark, emissive.ledAmber
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.26 × 0.46 × 0.6
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Tower UPS: heavy body, vent slots, angled status panel with amber LED, thick outlet cable. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.deskLamp` — Desk lamp

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** exec, execante, reception
- **Dimensions (m):** 0.16 × 0.42 × 0.34 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.blackAnodised, emissive.warm, plastic.dark
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Task lamp: weighted base, two-segment arm, cone head with a warm emissive underside. Variant: off. Variants: on | off. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

## furniture

### `prop.deskStandard` — Standard workstation desk

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** openplanA, openplanB, it, execante
- **Dimensions (m):** 1.6 × 0.75 × 0.8 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** laminate.grey, metal.paintedDark, plastic.dark
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 1.6 × 0.75 × 0.8 (solid under-desk volume)
- **LOD:** LOD0 merged into static batch; buildLod1(opts) exposes a simplified silhouette (< 25% tris) for gallery/dynamic use — batched statics do not runtime-switch
- **Status:** accepted
- **Acceptance criteria:** Reads as a metal-leg office desk at 8 m: 36 mm laminate top with beveled edge, C-legs with foot bars, rear modesty panel, cable grommet. Variants: intact | worn (darker top, skewed modesty panel). Variants: intact | worn. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.deskReception` — Reception counter desk

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** lobby
- **Dimensions (m):** 3.2 × 1.12 × 1 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** wood.veneer, laminate.white, metal.brushed, drywall.brand
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 3.2 × 1.12 × 1.0
- **LOD:** LOD0 merged into static batch; buildLod1(opts) exposes a simplified silhouette (< 25% tris) for gallery/dynamic use — batched statics do not runtime-switch
- **Status:** accepted
- **Acceptance criteria:** Two-tier reception counter: 0.74 m worktop behind a 1.12 m veneer transaction front with brushed-steel reveal and brand-navy accent band. Silhouette reads at 8 m; usable chest-high cover. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.deskExec` — Executive desk

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** exec, execante
- **Dimensions (m):** 2.2 × 0.76 × 1.05 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** wood.dark, metal.brushed, leather.dark
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 2.2 × 0.76 × 1.05
- **LOD:** LOD0 merged into static batch; buildLod1(opts) exposes a simplified silhouette (< 25% tris) for gallery/dynamic use — batched statics do not runtime-switch
- **Status:** accepted
- **Acceptance criteria:** Dark-veneer executive desk: 40 mm top with brushed reveal, twin drawer pedestals with individual drawer fronts and pulls, leather desk inlay. No bare untextured faces. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.cubiclePanel` — Cubicle partition panel

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** openplanA, openplanB
- **Dimensions (m):** 1.5 × 1.35 × 0.06 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** fabric.cubicle, fabric.cubicleTeal, metal.aluminium
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB matching panel footprint (chest-high cover)
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** 1.35 m acoustic panel: aluminium perimeter frame, fabric face with visible seam, cap rail and stabiliser feet. Stands unsupported. Variants: grey | teal fabric. opts.width stretches 0.9–1.8 m. Variants: grey | teal. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.tableConference` — Conference table

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** conference
- **Dimensions (m):** 3.6 × 0.75 × 1.2 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** wood.veneer, metal.paintedDark, plastic.dark
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 3.6 × 0.75 × 1.2
- **LOD:** LOD0 merged into static batch; buildLod1(opts) exposes a simplified silhouette (< 25% tris) for gallery/dynamic use — batched statics do not runtime-switch
- **Status:** accepted
- **Acceptance criteria:** 3.6 × 1.2 m veneer conference table: 45 mm top with edge reveal, twin column pedestals with cross feet, centre cable hatch. Ten chairs fit around it at real spacing. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.tableBoardroom` — Boardroom table

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** boardroom
- **Dimensions (m):** 4.2 × 0.75 × 1.4 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** wood.dark, metal.brushed, plastic.dark
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 4.2 × 0.75 × 1.4
- **LOD:** LOD0 merged into static batch; buildLod1(opts) exposes a simplified silhouette (< 25% tris) for gallery/dynamic use — batched statics do not runtime-switch
- **Status:** accepted
- **Acceptance criteria:** Fourteen-seat dark-veneer boardroom table with brushed twin plinths, under-top reveal and two flush cable hatches. Reads as the room centrepiece at 10 m. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.tableRound` — Round collaboration table

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** openplanB, breakroom, execlounge
- **Dimensions (m):** 1.4 × 0.74 × 1.4 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** laminate.white, metal.painted
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 1.4 × 0.74 × 1.4
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Ø1.4 m white laminate table on a column base with a four-spoke foot. Chairs tuck under the rim without clipping. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.tableSide` — Side table

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** lobby, waiting, mezz, execlounge, boardroomW
- **Dimensions (m):** 0.5 × 0.52 × 0.5 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** wood.pale, metal.brushed
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.5 × 0.52 × 0.5
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Ø0.5 m side table: pale veneer disc on three splayed brushed legs. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.tableCoffee` — Coffee table

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** lobby, waiting, exec, execlounge
- **Dimensions (m):** 1.1 × 0.4 × 0.6 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** wood.veneer, metal.blackAnodised
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 1.1 × 0.4 × 0.6
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Low lounge table: veneer slab with under-shelf on black frame legs. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.chairTask` — Task chair

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** openplanA, openplanB, it, execante, copy, server
- **Dimensions (m):** 0.66 × 1.02 × 0.66 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** fabric.chair, plastic.dark, metal.brushed, rubber.black
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.6 × 1.0 × 0.6
- **LOD:** LOD0 merged into static batch; buildLod1(opts) exposes a simplified silhouette (< 25% tris) for gallery/dynamic use — batched statics do not runtime-switch
- **Status:** accepted
- **Acceptance criteria:** Real task chair anatomy: five-star base with castors, gas lift, tilt mechanism, contoured seat pan at 0.46 m, lumbar back, T-armrests. Variants: intact (grey) | alt (warm fabric) | worn (sagged back, one armrest missing) | tipped (knocked onto its back, low collider). Variants: intact | alt | worn | tipped. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.chairExec` — Executive chair

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** exec, boardroom, execante
- **Dimensions (m):** 0.7 × 1.22 × 0.7 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** leather.dark, metal.brushed, plastic.dark, rubber.black
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.66 × 1.2 × 0.66
- **LOD:** LOD0 merged into static batch; buildLod1(opts) exposes a simplified silhouette (< 25% tris) for gallery/dynamic use — batched statics do not runtime-switch
- **Status:** accepted
- **Acceptance criteria:** High-back leather executive chair: five-star polished base, castors, gas lift, padded seat/back with headrest bulge, loop armrests. Variants: intact | tan. Variants: intact | tan. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.chairConference` — Conference chair

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** conference, boardroom (spares), copy
- **Dimensions (m):** 0.56 × 0.88 × 0.58 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** fabric.chairAlt, metal.brushed, plastic.dark
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.56 × 0.88 × 0.58
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Cantilever visitor chair: continuous tube frame, padded seat and back, plastic glides. Stacks visually with itself. Variant: tipped (knocked onto its back). Variants: intact | tipped. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.chairWaiting` — Waiting-room chair

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** waiting, lobby, execante
- **Dimensions (m):** 0.58 × 0.82 × 0.6 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** fabric.sofa, metal.painted, plastic.dark
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.58 × 0.82 × 0.6
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Four-leg waiting chair with wide padded seat and back on a painted steel frame; gangs into rows on a shared beam when placed side by side. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.sofa` — Three-seat sofa

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** lobby, waiting, exec, execlounge
- **Dimensions (m):** 2 × 0.82 × 0.85 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** fabric.sofa, wood.dark, leather.tan
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 2.0 × 0.82 × 0.85
- **LOD:** LOD0 merged into static batch; buildLod1(opts) exposes a simplified silhouette (< 25% tris) for gallery/dynamic use — batched statics do not runtime-switch
- **Status:** accepted
- **Acceptance criteria:** Three-seat sofa: plinth, three seat cushions with gaps, three back cushions, padded arms, timber feet. Variant: leather (tan). Usable waist-high cover. Variants: fabric | leather. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.chairLounge` — Lounge chair

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** mezz, execlounge, boardroomW, exec
- **Dimensions (m):** 0.85 × 0.78 × 0.85 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** leather.tan, fabric.sofa, metal.blackAnodised
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.85 × 0.78 × 0.85
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Deep lounge chair: thick seat and wrap-around back on a black steel sled. Variants: tan leather | storm fabric. Variants: tan | fabric. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.cabinetFiling` — Filing cabinet

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** openplanA, archive, execante, records2, northcorr
- **Dimensions (m):** 0.45 × 1.32 × 0.62 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.painted, metal.brushed, plastic.dark, paper.white
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.45 × 1.32 × 0.62
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Four-drawer steel filing cabinet 0.45 × 1.32 × 0.62 with recessed drawer fronts, bar pulls and label holders. Variants: intact | open (top drawer pulled, files visible) | worn (dented, one pull missing). Chest-high cover. Variants: intact | open | worn. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.drawerUnit` — Mobile drawer pedestal

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** openplanA, it, execante
- **Dimensions (m):** 0.42 × 0.6 × 0.55 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.painted, plastic.dark, metal.brushed
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.42 × 0.6 × 0.55
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Under-desk pedestal: three drawers, cushion top pad, four castors. Rolls under the standard desk without clipping. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.shelfUnit` — Open shelving unit

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** it, copy, openplanB
- **Dimensions (m):** 0.9 × 1.8 × 0.35 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.paintedDark, laminate.grey
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.9 × 1.8 × 0.35
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Steel frame shelving with five laminate shelves; posts read individually at 2 m. Dressed by dress.js with boxes/binders. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.rackArchive` — Mobile archive racking

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** archive, records2
- **Dimensions (m):** 4 × 2.2 × 0.48 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.painted, metal.paintedDark, cardboard.box, signage.atlas (flat file-spine strips)
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB run × 2.2 × 0.48
- **LOD:** LOD0 merged into static batch; buildLod1(opts) exposes a simplified silhouette (< 25% tris) for gallery/dynamic use — batched statics do not runtime-switch
- **Status:** accepted
- **Acceptance criteria:** Mobile racking run: steel uprights and shelves on a floor rail, end panel with drive wheel, shelves dressed with archive boxes and file runs. opts.length sets run 2–5 m. Full-height cover. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.bookcase` — Veneer bookcase

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** exec, boardroom, execante
- **Dimensions (m):** 0.9 × 2 × 0.32 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** wood.veneer, plastic.smooth, signage.atlas (flat book-spine strips)
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.9 × 2.0 × 0.32
- **LOD:** LOD0 merged into static batch; buildLod1(opts) exposes a simplified silhouette (< 25% tris) for gallery/dynamic use — batched statics do not runtime-switch
- **Status:** accepted
- **Acceptance criteria:** Closed-back veneer bookcase, four shelves dressed with flat-colour spine strips (darker foot band, pale title bar — no speckle noise); occasional gaps and inset rows for life. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.lockerBank` — Staff locker bank

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** openplanB
- **Dimensions (m):** 1.2 × 1.8 × 0.45 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.brushedV, metal.paintedDark, plastic.dark
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 1.2 × 1.8 × 0.45
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Four-column locker bank with vent slots, individual doors, latches and number plates; one door ajar for storytelling. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.credenza` — Credenza sideboard

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** boardroom, boardroomW, exec, execlounge
- **Dimensions (m):** 1.8 × 0.72 × 0.5 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** wood.dark, metal.brushed, laminate.white
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 1.8 × 0.72 × 0.5
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Low executive sideboard: veneer carcass, four sliding door fronts with brushed pulls, plinth recess. Waist-high cover. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.consoleTable` — Corridor console table

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** execspine, execcorr, mezz
- **Dimensions (m):** 1.2 × 0.8 × 0.35 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** wood.dark, metal.blackAnodised
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 1.2 × 0.8 × 0.35
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Slim wall console on black frame; carries lamp/plant clutter from dress.js. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.displayCase` — Brand display case

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** execcorr, lobby
- **Dimensions (m):** 0.6 × 1.5 × 0.6 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** wood.dark, glass.clear, metal.brushed, drywall.brand
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.6 × 1.5 × 0.6
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Museum-style display plinth with glass hood and a lit model/award inside; glass reads as glass. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.coatStand` — Coat stand

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** execante, conference, it, boardroom
- **Dimensions (m):** 0.45 × 1.75 × 0.45 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.blackAnodised, fabric.sofa, fabric.chairAlt
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.45 × 1.75 × 0.45 (thin pole, small box)
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Pole coat stand with four hook arms and splayed feet. Variant: coat (a draped winter coat hangs on it). Variants: bare | coat. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.coatHookRail` — Wall coat hooks

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** breakroom, copy, janitor, it
- **Dimensions (m):** 0.8 × 0.12 × 0.14 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** wood.pale, metal.brushed, fabric.sofa
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — wall mounted above head height of blockage
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Wall rail with four hooks; variant hangs a coat and a scarf. Mount at 1.6 m. Variants: bare | coat. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.plantFloor` — Potted floor plant

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** lobby, waiting, spine, exec, mezz, execcorr
- **Dimensions (m):** 0.55 × 1.5 × 0.55 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.dark, fabric.cubicleTeal, concrete.dark, dirtless
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.5 × 0.9 × 0.5 (pot only; foliage non-blocking)
- **LOD:** LOD0 merged into static batch; buildLod1(opts) exposes a simplified silhouette (< 25% tris) for gallery/dynamic use — batched statics do not runtime-switch
- **Status:** accepted
- **Acceptance criteria:** Office ficus: tapered pot, soil disc, trunk and a clustered foliage crown in desaturated evergreen. Silhouette reads at 8 m. Variants: dark pot | concrete pot. Variants: dark | concrete. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.rugArea` — Area rug

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** exec, execlounge, boardroomW
- **Dimensions (m):** 2.6 × 0.02 × 1.8 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** carpet.exec, carpet.warm, leather.dark
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — flat floor dressing, walkable
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Bound-edge area rug: 18 mm pile slab with a stitched leather binding strip on all four sides; lies flat, no collider. Variants: exec (slate) | warm. Variants: exec | warm. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.lampFloor` — Floor lamp

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** exec, execlounge, waiting
- **Dimensions (m):** 0.42 × 1.62 × 0.42 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.blackAnodised, fabric.chairAlt, emissive.warm
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** small AABB 0.34 × 1.62 × 0.34 on the base
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Standing lamp: weighted disc base, slim column, drum shade in warm fabric with an emissive under-disc when lit. Variants: on | off. Variants: on | off. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.benchStone` — Stone bench

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** lobby, mezz
- **Dimensions (m):** 1.8 × 0.45 × 0.55 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** concrete.polished, concrete.dark
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 1.8 × 0.45 × 0.55 (knee-high hard cover)
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Polished concrete lobby bench: 120 mm slab seat with eased edges on two rough-cast plinths; sits dead flat, believable architectural furniture that doubles as low cover. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.planterLow` — Interior planter run

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** lobby, mezz — natural chest-high cover with foliage
- **Dimensions (m):** 1.8 × 0.55 × 0.5 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.paintedDark, concrete.dark, fabric.cubicleTeal
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 1.8 × 0.55 × 0.5 (planter box only; foliage non-blocking)
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Rectangular steel planter with rolled rim and recessed soil bed, dressed with a staggered evergreen hedge to ~0.95 m. Cover you can shoot over standing, hide behind crouched. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.whiteboard` — Whiteboard

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** conference, it, openplanB, boardroom, copy
- **Dimensions (m):** 1.8 × 1.2 × 0.06 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** laminate.white, metal.aluminium, plastic.dark
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — wall mounted
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Wall whiteboard: white face, aluminium frame, pen tray with markers and an eraser. Writing overlay applied by signage.js at dressing time. Pivot at board centre-bottom against the wall (+Z into wall). Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.wallClock` — Wall clock

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** most rooms
- **Dimensions (m):** 0.32 × 0.32 × 0.06 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.dark, plastic.white, metal.blackAnodised
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — wall mounted
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Ø0.32 office clock: dark rim, white face, hour/minute hands frozen at 10:08 (storm knocked the power). Pivot at clock centre against wall. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.planterExt` — Exterior planter

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** court, entrance approach
- **Dimensions (m):** 1.2 × 0.62 × 0.5 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** concrete.dark, snow.fresh, fabric.cubicleTeal, wood.dark
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 1.2 × 0.62 × 0.5 (knee-high hard cover)
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Board-formed concrete planter with a snow cap, dormant shrub twigs poking through; snow overhangs the rim slightly. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.stanchion` — Queue stanchion

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** lobby, vestibule
- **Dimensions (m):** 0.36 × 1 × 0.36 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.brushed, fabric.chair, rubber.black
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.36 × 1.0 × 0.36 (post only)
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Rope-queue post: weighted base, polished shaft, ball top; dress.js links pairs with a sagging belt part. Variant: belt (includes a 1.5 m belt to +X). Variants: post | belt. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.turnstile` — Badge turnstile

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** vestibule
- **Dimensions (m):** 1.1 × 1.02 × 0.35 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.brushedV, glass.clear, plastic.dark, emissive.ledRed
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** two pedestal AABBs with the wing gap open
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Speed-gate lane: two brushed pedestals with card readers (red LED) and retracted glass wings; the 0.55 m lane between them stays passable. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

## glass

### `glass.clear` — Clear glazing pane

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/glass.js, src/map/kit.js
- **Used in:** interior partitions, office doors, archive and IT windows
- **Dimensions (m):** variable, 14 mm thick
- **Pivot / orientation:** pane centre, normal along the wall axis
- **Material slots:** glass.clear
- **Texture maps:** baseColor (solid), clearcoat
- **Collision:** thin AABB per pane, removed on shatter
- **LOD:** single LOD; panes are two-triangle-per-face boxes
- **Audio dependencies:** glass.tap, glass.crack, glass.shatter, glass.fragments
- **Status:** accepted
- **Acceptance criteria:** Reads as glass, not a blue wall: visible reflection, near-zero body tint, sightline unobstructed
- **Playwright evidence:** screenshots/glass/*.png
- **Remaining discrepancies:** none

### `glass.tinted` — Tinted exterior glazing

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/glass.js, src/map/kit.js
- **Used in:** lobby curtain wall, waiting area
- **Dimensions (m):** variable, 14 mm
- **Pivot / orientation:** pane centre, normal along the wall axis
- **Material slots:** glass.tinted
- **Texture maps:** baseColor (solid), clearcoat
- **Collision:** thin AABB per pane, removed on shatter
- **LOD:** single LOD; panes are two-triangle-per-face boxes
- **Audio dependencies:** glass.tap, glass.crack, glass.shatter, glass.fragments
- **Status:** accepted
- **Acceptance criteria:** Solar tint reads on the exterior, interior stays legible, no blown-out window
- **Playwright evidence:** screenshots/glass/*.png
- **Remaining discrepancies:** none

### `glass.frosted` — Frosted privacy glazing

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/glass.js, src/map/kit.js
- **Used in:** restroom, plant, garage clerestory, stair landing
- **Dimensions (m):** variable, 14 mm
- **Pivot / orientation:** pane centre, normal along the wall axis
- **Material slots:** glass.frosted
- **Texture maps:** baseColor, normal, roughness
- **Collision:** thin AABB per pane, removed on shatter
- **LOD:** single LOD; panes are two-triangle-per-face boxes
- **Audio dependencies:** glass.tap, glass.crack, glass.shatter, glass.fragments
- **Status:** accepted
- **Acceptance criteria:** Silhouettes diffuse through it; blocks AI sight; no hard-edged transparency
- **Playwright evidence:** screenshots/glass/*.png
- **Remaining discrepancies:** none

### `glass.cracked` — Cracked glass state

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/glass.js, src/map/kit.js
- **Used in:** any damaged pane
- **Dimensions (m):** matches the source pane
- **Pivot / orientation:** pane centre, normal along the wall axis
- **Material slots:** glass.cracked
- **Texture maps:** crack decal (alpha), baseColor
- **Collision:** thin AABB per pane, removed on shatter
- **LOD:** single LOD; panes are two-triangle-per-face boxes
- **Audio dependencies:** glass.tap, glass.crack, glass.shatter, glass.fragments
- **Status:** accepted
- **Acceptance criteria:** Crack web radiates from the impact point, still solid, roughness raised
- **Playwright evidence:** screenshots/glass/*.png
- **Remaining discrepancies:** none

### `glass.broken` — Broken glass state

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/glass.js, src/map/kit.js
- **Used in:** any destroyed pane
- **Dimensions (m):** pane removed, jagged remnant
- **Pivot / orientation:** pane centre, normal along the wall axis
- **Material slots:** glass.cracked
- **Texture maps:** crack decal (alpha)
- **Collision:** thin AABB per pane, removed on shatter
- **LOD:** single LOD; panes are two-triangle-per-face boxes
- **Audio dependencies:** glass.tap, glass.crack, glass.shatter, glass.fragments
- **Status:** accepted
- **Acceptance criteria:** Opening becomes passable to bullets and sight, remnant border visible, shards spawn
- **Playwright evidence:** screenshots/glass/*.png
- **Remaining discrepancies:** none

### `glass.fragments` — Glass fragment particles

- **Owner:** Fable 2 — Map architecture & environmental composition
- **Files:** src/map/glass.js, src/map/kit.js
- **Used in:** every shatter event
- **Dimensions (m):** 0.02–0.09 m shards
- **Pivot / orientation:** pane centre, normal along the wall axis
- **Material slots:** glass.clear
- **Texture maps:** baseColor (solid)
- **Collision:** thin AABB per pane, removed on shatter
- **LOD:** single LOD; panes are two-triangle-per-face boxes
- **Audio dependencies:** glass.tap, glass.crack, glass.shatter, glass.fragments
- **Status:** accepted
- **Acceptance criteria:** Shards fall with gravity, tumble, fade after 3 s, land audibly
- **Playwright evidence:** screenshots/glass/*.png
- **Remaining discrepancies:** none

## lighting

### `light.troffer` — Recessed fluorescent troffer

- **Owner:** Fable 1 — Art direction, visual bible & interface
- **Files:** src/map/lighting.js, src/art/palette.js
- **Used in:** open plan, corridors, copy, IT, vestibule
- **Dimensions (m):** 1.18 × 0.58 × 0.075 m
- **Pivot / orientation:** fixture centre at ceiling plane, +Y up
- **Material slots:** metal.painted, emissive.fluoro
- **Texture maps:** baseColor, emissive
- **Collision:** none (fixtures merged into the ceiling batch)
- **LOD:** emissive geometry always drawn; illumination bound to the nearest N emitters per quality preset
- **Status:** accepted
- **Acceptance criteria:** Slightly green 4000 K; tube face emissive without blowing out; grid-aligned
- **Playwright evidence:** screenshots/lighting/*.png
- **Remaining discrepancies:** none

### `light.downlight` — Recessed downlight

- **Owner:** Fable 1 — Art direction, visual bible & interface
- **Files:** src/map/lighting.js, src/art/palette.js
- **Used in:** lobby, conference, executive, restrooms, waiting
- **Dimensions (m):** 0.21 m dia × 0.05 m
- **Pivot / orientation:** fixture centre at ceiling plane, +Y up
- **Material slots:** metal.brushed, emissive.fluoro
- **Texture maps:** baseColor, emissive
- **Collision:** none (fixtures merged into the ceiling batch)
- **LOD:** emissive geometry always drawn; illumination bound to the nearest N emitters per quality preset
- **Status:** accepted
- **Acceptance criteria:** Clean pool of light; no banding on the wall wash
- **Playwright evidence:** screenshots/lighting/*.png
- **Remaining discrepancies:** none

### `light.batten` — Surface batten fitting

- **Owner:** Fable 1 — Art direction, visual bible & interface
- **Files:** src/map/lighting.js, src/art/palette.js
- **Used in:** archive, server, service spaces
- **Dimensions (m):** 1.32 × 0.11 m
- **Pivot / orientation:** fixture centre at ceiling plane, +Y up
- **Material slots:** metal.galvanised, emissive.fluoro
- **Texture maps:** baseColor, emissive
- **Collision:** none (fixtures merged into the ceiling batch)
- **LOD:** emissive geometry always drawn; illumination bound to the nearest N emitters per quality preset
- **Status:** accepted
- **Acceptance criteria:** Reads as a bare industrial fitting; tube visible
- **Playwright evidence:** screenshots/lighting/*.png
- **Remaining discrepancies:** none

### `light.bulkhead` — Stair bulkhead

- **Owner:** Fable 1 — Art direction, visual bible & interface
- **Files:** src/map/lighting.js, src/art/palette.js
- **Used in:** stairwells
- **Dimensions (m):** 0.32 × 0.18 × 0.11 m
- **Pivot / orientation:** fixture centre at ceiling plane, +Y up
- **Material slots:** metal.painted, emissive.fluoro
- **Texture maps:** baseColor, emissive
- **Collision:** none (fixtures merged into the ceiling batch)
- **LOD:** emissive geometry always drawn; illumination bound to the nearest N emitters per quality preset
- **Status:** accepted
- **Acceptance criteria:** Wall mounted at 2.4 m; casts a readable pool on the treads
- **Playwright evidence:** screenshots/lighting/*.png
- **Remaining discrepancies:** none

### `light.highbay` — High-bay pendant

- **Owner:** Fable 1 — Art direction, visual bible & interface
- **Files:** src/map/lighting.js, src/art/palette.js
- **Used in:** loading, garage
- **Dimensions (m):** 0.6 m dia × 0.22 m
- **Pivot / orientation:** fixture centre at ceiling plane, +Y up
- **Material slots:** metal.painted, emissive.fluoro
- **Texture maps:** baseColor, emissive
- **Collision:** none (fixtures merged into the ceiling batch)
- **LOD:** emissive geometry always drawn; illumination bound to the nearest N emitters per quality preset
- **Status:** accepted
- **Acceptance criteria:** Suspended on a visible stem; lights the full 5 m bay
- **Playwright evidence:** screenshots/lighting/*.png
- **Remaining discrepancies:** none

### `light.emergency` — Emergency bulkhead

- **Owner:** Fable 1 — Art direction, visual bible & interface
- **Files:** src/map/lighting.js, src/art/palette.js
- **Used in:** service corridor, stairs, loading, garage
- **Dimensions (m):** 0.3 × 0.14 × 0.1 m
- **Pivot / orientation:** fixture centre at ceiling plane, +Y up
- **Material slots:** metal.painted, emissive.emergency
- **Texture maps:** baseColor, emissive
- **Collision:** none (fixtures merged into the ceiling batch)
- **LOD:** emissive geometry always drawn; illumination bound to the nearest N emitters per quality preset
- **Status:** accepted
- **Acceptance criteria:** Amber twin-spot; visible in the blackout lighting scenario
- **Playwright evidence:** screenshots/lighting/*.png
- **Remaining discrepancies:** none

### `light.exitsign` — Exit sign

- **Owner:** Fable 1 — Art direction, visual bible & interface
- **Files:** src/map/lighting.js, src/art/palette.js
- **Used in:** all escape routes
- **Dimensions (m):** 0.42 × 0.2 m double sided
- **Pivot / orientation:** fixture centre at ceiling plane, +Y up
- **Material slots:** metal.brushed, emissive.exit
- **Texture maps:** baseColor, emissive
- **Collision:** none (fixtures merged into the ceiling batch)
- **LOD:** emissive geometry always drawn; illumination bound to the nearest N emitters per quality preset
- **Status:** accepted
- **Acceptance criteria:** Legible from 12 m; green face on both sides; original pictogram
- **Playwright evidence:** screenshots/lighting/*.png
- **Remaining discrepancies:** none

### `light.sun` — Storm daylight key

- **Owner:** Fable 1 — Art direction, visual bible & interface
- **Files:** src/map/lighting.js, src/art/palette.js
- **Used in:** whole map
- **Dimensions (m):** directional, 62 m shadow ortho
- **Pivot / orientation:** fixture centre at ceiling plane, +Y up
- **Material slots:** n/a
- **Texture maps:** baseColor, emissive
- **Collision:** none (fixtures merged into the ceiling batch)
- **LOD:** emissive geometry always drawn; illumination bound to the nearest N emitters per quality preset
- **Status:** accepted
- **Acceptance criteria:** Cold 6500 K key with stable shadows and no peter-panning
- **Playwright evidence:** screenshots/lighting/*.png
- **Remaining discrepancies:** none

### `light.snowbounce` — Snow bounce fill

- **Owner:** Fable 1 — Art direction, visual bible & interface
- **Files:** src/map/lighting.js, src/art/palette.js
- **Used in:** north and east glazing
- **Dimensions (m):** directional fill
- **Pivot / orientation:** fixture centre at ceiling plane, +Y up
- **Material slots:** n/a
- **Texture maps:** baseColor, emissive
- **Collision:** none (fixtures merged into the ceiling batch)
- **LOD:** emissive geometry always drawn; illumination bound to the nearest N emitters per quality preset
- **Status:** accepted
- **Acceptance criteria:** Lifts interior shadow without flattening contrast
- **Playwright evidence:** screenshots/lighting/*.png
- **Remaining discrepancies:** none

## maintenance

### `prop.electricalPanel` — Electrical panel

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** mechanical, loading, janitor, garage
- **Dimensions (m):** 0.5 × 0.72 × 0.15 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.painted, metal.paintedDark, plastic.dark, emissive.ledRed
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — wall mounted, shallow
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Distribution board: grey enclosure with door seam, latch, conduit stub top and bottom, fault LED. Label applied by signage.js. Variant: open (breaker rows visible). Pivot at panel centre against wall. Variants: closed | open. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.breakerBox` — Small breaker box

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** janitor, server, garage
- **Dimensions (m):** 0.3 × 0.42 × 0.12 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.painted, metal.galvanised
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — wall mounted
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Compact breaker enclosure with hinge knuckles and a single conduit drop. Pivot at box centre against wall. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.transformerCabinet` — Transformer cabinet

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** mechanical
- **Dimensions (m):** 1 × 1.4 × 0.8 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.painted, metal.galvanised, metal.paintedDark, emissive.ledAmber
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 1.0 × 1.4 × 0.8 (chest-high cover)
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Floor-standing transformer: ribbed cabinet with vent louvres, lifting eyes, conduit risers, hum-worthy mass; hazard label from signage.js. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.hvacUnit` — Air handling unit

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** mechanical
- **Dimensions (m):** 2.4 × 1.8 × 1.2 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.galvanised, metal.painted, metal.paintedDark, plastic.dark
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 2.4 × 1.8 × 1.2 (full cover block)
- **LOD:** LOD0 merged into static batch; buildLod1(opts) exposes a simplified silhouette (< 25% tris) for gallery/dynamic use — batched statics do not runtime-switch
- **Status:** accepted
- **Acceptance criteria:** Packaged AHU: panelled casing with seam battens, two access doors with latches, fan intake grille, duct collar at the top and vibration feet. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.pipeManifold` — Pipe riser & valves

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** mechanical, janitor, garage
- **Dimensions (m):** 0.7 × 2.4 × 0.35 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.galvanised, metal.paintedRed, metal.painted, metal.brushed
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.7 × 2.4 × 0.35 against wall
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Wall pipe group: two galvanised risers with flanges and a red sprinkler main, branch tee, two hand wheels and a gauge. Variant: sprinkler (all red, tagged). Pivot at floor against wall. Variants: mixed | sprinkler. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.fireExtinguisher` — Fire extinguisher

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** every wing — corridors, plant, garage, kitchens
- **Dimensions (m):** 0.18 × 0.55 × 0.18 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.paintedRed, metal.brushed, rubber.black, plastic.dark
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — small clutter (bracket-mounted or floor)
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** 6 kg extinguisher: red cylinder with dome, valve head with lever and pin, hose clipped down the side, gauge dot. Variants: wall (with bracket, pivot at tank centre against wall) | floor. Variants: floor | wall. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.fireCabinet` — Fire equipment cabinet

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** northcorr, southcorr, loading, garage
- **Dimensions (m):** 0.45 × 0.7 × 0.2 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.paintedRed, glass.clear, metal.brushed
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — wall mounted, shallow
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Recessed fire cabinet: red frame, glazed door showing an extinguisher silhouette inside, pull latch. Pivot at cabinet centre against wall. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.sprinklerHead` — Sprinkler head

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** all suspended ceilings
- **Dimensions (m):** 0.08 × 0.09 × 0.08 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.brushed, metal.paintedRed
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — ceiling fixture
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Pendent sprinkler: escutcheon ring, drop, frame arms and a red bulb dot. Pivot at ceiling plane, hangs down. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.smokeDetector` — Smoke detector

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** all rooms
- **Dimensions (m):** 0.14 × 0.05 × 0.14 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.white, emissive.ledRed
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — ceiling fixture
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Ceiling smoke detector puck with vent ring shadow and a red standby LED. Pivot at ceiling plane. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.janitorCart` — Janitor cart

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** janitor, southcorr
- **Dimensions (m):** 1.1 × 1 × 0.55 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.grey, plastic.dark, fabric.sofa, metal.painted, plastic.white
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 1.1 × 1.0 × 0.55
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Cleaning cart: chassis with two shelves, vinyl waste-bag sack, push handle, four castors, bottles on the top tray. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.mopBucket` — Mop bucket & wringer

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** janitor, southcorr
- **Dimensions (m):** 0.42 × 0.9 × 0.42 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.smooth, plastic.grey, metal.painted, fabric.cubicle, wood.pale
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.42 × 0.35 × 0.42 (bucket only; mop pole non-blocking)
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Wheeled mop bucket with wringer basket and a mop standing in it, head down, handle leaning 15°. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.shelvingUtility` — Utility shelving

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** janitor, mechanical, loading, southcorr
- **Dimensions (m):** 1.2 × 1.8 × 0.5 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.galvanised, metal.paintedDark, cardboard.box, plastic.white, plastic.grey
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 1.2 × 1.8 × 0.5
- **LOD:** LOD0 merged into static batch; buildLod1(opts) exposes a simplified silhouette (< 25% tris) for gallery/dynamic use — batched statics do not runtime-switch
- **Status:** accepted
- **Acceptance criteria:** Boltless steel shelving with four shelves, dressed with boxes, bottles and paper stock by rng; density scales with opts.fill 0–1. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.boxCardboard` — Cardboard box

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** loading, archive, copy, everywhere goods live
- **Dimensions (m):** 0.5 × 0.35 × 0.4 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** cardboard.box, paper.white
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB matching box (only ≥0.3 m sizes)
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Corrugated box with taped seam and a shipping label from signage.js. Variants: S (0.3) | M (0.5) | L (0.65) | open (flaps up). Variants: S | M | L | open. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.crateShipping` — Shipping crate

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** loading, garage, westyard
- **Dimensions (m):** 1.2 × 0.9 × 0.8 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** wood.pale, wood.dark, metal.galvanised
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 1.2 × 0.9 × 0.8 (waist-high cover)
- **LOD:** LOD0 merged into static batch; buildLod1(opts) exposes a simplified silhouette (< 25% tris) for gallery/dynamic use — batched statics do not runtime-switch
- **Status:** accepted
- **Acceptance criteria:** Timber crate: plank faces with visible batten frame, galvanised corner straps, stencilled label from signage.js. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.pallet` — Wooden pallet

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** loading, southcorr, westyard
- **Dimensions (m):** 1.2 × 0.14 × 1 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** wood.pale
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 1.2 × 0.14 × 1.0 (step-over height)
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Euro pallet: seven deck boards, three bearers, three bottom boards; gaps read from 3 m. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.palletLoad` — Loaded pallet

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** loading, garage
- **Dimensions (m):** 1.2 × 1.15 × 1 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** wood.pale, cardboard.box, glass.frosted
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 1.2 × 1.15 × 1.0 (chest-high cover)
- **LOD:** LOD0 merged into static batch; buildLod1(opts) exposes a simplified silhouette (< 25% tris) for gallery/dynamic use — batched statics do not runtime-switch
- **Status:** accepted
- **Acceptance criteria:** Pallet stacked two courses high with boxes and a shrink-wrap band; box sizes jittered by rng. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.handTruck` — Hand truck

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** loading, southcorr, eastcorr
- **Dimensions (m):** 0.5 × 1.2 × 0.55 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.painted, rubber.black, plastic.dark
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.5 × 1.2 × 0.5
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Two-wheel sack truck leaning 15° against its wheels: frame rails, cross bars, toe plate, rubber wheels with hubs. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.ladderStep` — Step ladder

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** mechanical, archive, loading, janitor
- **Dimensions (m):** 0.55 × 1.5 × 0.9 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.aluminium, plastic.dark
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.55 × 1.5 × 0.9
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** A-frame aluminium ladder, open: two rails per side, four treads, top cap, spreader bars. Variant: folded (leans on wall). Variants: open | folded. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.coneWarning` — Warning cone

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** corridors, loading, garage, court
- **Dimensions (m):** 0.3 × 0.52 × 0.3 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.paintedRed, plastic.white
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — knock-over scale clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Traffic cone: square base, tapered body in safety red with a reflective white band. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.wetFloorSign` — Wet floor A-sign

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** northcorr, restroom approach, janitor
- **Dimensions (m):** 0.3 × 0.6 × 0.5 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.smooth, plastic.white
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — knock-over scale clutter
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** A-frame caution sign; face text painted by signage.js. Two hinged boards with a spine gap. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.matFloor` — Walk-off floor mat

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** vestibule, entrances, loading personnel door
- **Dimensions (m):** 1.5 × 0.02 × 0.9 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** rubber.black, fabric.cubicle
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — flat, walkable
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Entrance mat: rubber border with a coarse fibre centre; lies dead flat, no collider, no z-fight (raised 8 mm). Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.barrier` — Loading barrier

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** loading, garage, eastyard
- **Dimensions (m):** 1.4 × 1 × 0.45 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.painted, plastic.smooth
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 1.4 × 1.0 × 0.45
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** A-frame barrier: two leg trestles and a plank with hazard striping from signage.js. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.garagePanel` — Shutter control panel

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** garage, loading (beside shutters)
- **Dimensions (m):** 0.24 × 0.3 × 0.12 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.painted, plastic.smooth, plastic.dark, emissive.ledGreen, emissive.ledRed
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — wall mounted
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Roller-door control station: box with UP/STOP/DOWN buttons, status LEDs, conduit drop. Pivot at box centre against wall. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.drum` — Steel drum

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** garage, westyard
- **Dimensions (m):** 0.6 × 0.9 × 0.6 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.painted, metal.paintedDark
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.6 × 0.9 × 0.6 (waist-high cover)
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** 200 L drum with two rolling ribs and a bung cap; variant: dark. Variants: grey | dark. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.bollard` — Steel bollard

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** court, eastyard vehicle edges
- **Dimensions (m):** 0.22 × 0.95 × 0.22 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.paintedDark, metal.brushed, snow.fresh
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.22 × 0.95 × 0.22
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Ø0.18 bollard with domed cap, reflective band and a snow collar at the base. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.snowDrift` — Snow drift mound

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** court, westyard, eastyard, building edges
- **Dimensions (m):** 2.2 × 0.55 × 1.4 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** snow.fresh
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single low AABB (step-up height) for L size; none for S
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Wind-formed drift: two merged squashed domes, long axis along the wind. Variants: S | M | L scale the footprint. Variants: S | M | L. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.gritBin` — Grit bin

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** court, westyard
- **Dimensions (m):** 0.9 × 0.75 × 0.6 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.smooth, plastic.dark, snow.fresh
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.9 × 0.75 × 0.6
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Municipal grit bin: hopper body with sloped lid, hinge spine, snow on top; "GRIT" label via signage. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.vanUtility` — Utility van (parked)

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** eastyard (extraction approach)
- **Dimensions (m):** 2.1 × 2.15 × 4.9 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.painted, glass.tinted, rubber.black, plastic.dark, metal.brushed, snow.fresh
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** body + cab AABBs (full vehicle blocker)
- **LOD:** LOD0 merged into static batch; buildLod1(opts) exposes a simplified silhouette (< 25% tris) for gallery/dynamic use — batched statics do not runtime-switch
- **Status:** accepted
- **Acceptance criteria:** Believable blocky panel van, long axis on Z, nose −Z: cab with windshield and side glass, box body with door seams, bumpers, four wheels with hubs, roof snow cap, mirrors. "Polar Logistics" livery quad from signage. Reads as a van at 30 m; never as a detailed car. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.lightPole` — Yard light pole

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** court, eastyard, westyard
- **Dimensions (m):** 0.6 × 5.2 × 0.6 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.paintedDark, plastic.smooth, emissive.warm, snow.fresh
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB on the pole shaft
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** 5 m pole on a concrete-read base: tapered shaft, single cobra head with a warm emissive face, snow on the head. Variant: off. Variants: on | off. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.bikeRack` — Bike rack

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** court
- **Dimensions (m):** 1.8 × 0.8 × 0.3 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.galvanised, snow.fresh
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 1.8 × 0.8 × 0.3
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Three galvanised hoop stands in a row with snow ridges balanced on top; nobody biked in today. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

## material

### `mat.drywall.warm` — Warm painted drywall

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** walls: lobby, open plan, corridors
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** drywall.warm
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Painted gypsum board, office standard warm white. Roughness within 0.82–0.94, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.drywall.cool` — Cool painted drywall

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** walls: IT, server, restrooms
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** drywall.cool
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Cool-grey painted gypsum board. Roughness within 0.82–0.94, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.drywall.accent` — Accent painted drywall

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** accent walls: reception, conference
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** drywall.accent
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Deep slate feature paint. Roughness within 0.82–0.94, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.drywall.brand` — Brand navy drywall

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** logo wall, executive corridor
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** drywall.brand
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Northstar navy feature paint. Roughness within 0.82–0.94, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.drywall.scuffed` — Scuffed drywall

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** service corridor, loading
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** drywall.scuffed
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** High-traffic scuffed paint. Roughness within 0.82–0.94, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.plaster.clean` — Clean plaster

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** stairwell, mechanical
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** plaster.clean
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Skim-coat plaster. Roughness within 0.88–0.97, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.plaster.cracked` — Cracked plaster

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** mechanical room, loading
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** plaster.cracked
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Damaged plaster with crack network. Roughness within 0.88–0.97, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.ceiling.tile` — Acoustic ceiling tile

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** all suspended ceilings
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** ceiling.tile
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Mineral fibre fissured tile 600mm. Roughness within 0.93–0.99, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.ceiling.tileStained` — Stained ceiling tile

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** break room, service corridor
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** ceiling.tileStained
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Water-damaged tile variant. Roughness within 0.93–0.99, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.ceiling.plenum` — Plenum void

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** ceiling openings
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** ceiling.plenum
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Dark void behind missing tiles. Roughness within 0.93–0.99, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.carpet.slate` — Slate loop carpet

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** open plan
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** carpet.slate
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Commercial carpet tile, slate. Roughness within 0.9–0.99, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.carpet.teal` — Teal loop carpet

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** lobby, waiting
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** carpet.teal
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Commercial carpet tile, teal. Roughness within 0.9–0.99, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.carpet.warm` — Warm loop carpet

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** conference
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** carpet.warm
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Commercial carpet tile, warm grey. Roughness within 0.9–0.99, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.carpet.exec` — Executive carpet

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** executive suite
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** carpet.exec
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Dense cut-pile, charcoal violet. Roughness within 0.9–0.99, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.carpet.worn` — Worn carpet

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** corridors
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** carpet.worn
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Traffic-worn commercial carpet. Roughness within 0.9–0.99, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.vinyl.grey` — Grey vinyl sheet

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** copy room, IT
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** vinyl.grey
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Commercial sheet vinyl. Roughness within 0.4–0.62, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.vinyl.warm` — Warm vinyl sheet

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** break room
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** vinyl.warm
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Warm grey sheet vinyl. Roughness within 0.4–0.62, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.vinyl.plank` — Vinyl plank

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** break room dining
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** vinyl.plank
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Wood-look luxury vinyl plank. Roughness within 0.4–0.62, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.tile.ceramic` — Ceramic floor tile

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** restrooms
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** tile.ceramic
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** 300mm ceramic tile with grout. Roughness within 0.18–0.4, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.tile.ceramicWet` — Wet ceramic tile

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** restroom sink area
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** tile.ceramicWet
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Damp ceramic tile variant. Roughness within 0.18–0.4, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.tile.mosaic` — Mosaic wall tile

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** restroom walls
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** tile.mosaic
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** 150mm wall mosaic. Roughness within 0.18–0.4, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.tile.darkFloor` — Dark floor tile

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** vestibule
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** tile.darkFloor
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Large-format dark tile. Roughness within 0.18–0.4, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.concrete.raw` — Raw concrete slab

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** loading, garage
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** concrete.raw
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Power-trowelled concrete. Roughness within 0.72–0.92, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.concrete.polished` — Polished concrete

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** vestibule, mechanical
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** concrete.polished
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Polished slab. Roughness within 0.72–0.92, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.concrete.dark` — Dark concrete

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** exterior plinth
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** concrete.dark
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Board-formed dark concrete. Roughness within 0.72–0.92, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.concrete.wall` — Concrete wall

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** garage, stairwell core
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** concrete.wall
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Board-formed concrete wall. Roughness within 0.72–0.92, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.wood.veneer` — Wood veneer

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** reception desk, conference table
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** wood.veneer
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Walnut veneer panel. Roughness within 0.34–0.55, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.wood.dark` — Dark wood veneer

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** executive desk
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** wood.dark
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Dark stained veneer. Roughness within 0.34–0.55, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.wood.pale` — Pale wood veneer

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** break room cabinets
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** wood.pale
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Oak veneer. Roughness within 0.34–0.55, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.laminate.grey` — Grey laminate

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** workstations
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** laminate.grey
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Desk laminate, grey. Roughness within 0.28–0.45, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.laminate.white` — White laminate

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** copy room
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** laminate.white
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Cabinet laminate, white. Roughness within 0.28–0.45, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.laminate.dark` — Dark laminate

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** IT benches
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** laminate.dark
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Dark desk laminate. Roughness within 0.28–0.45, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.metal.brushed` — Brushed metal

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** door hardware, trims
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** metal.brushed
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Horizontal brushed aluminium. Roughness within 0.42–0.62, metalness 0.65. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.metal.brushedV` — Brushed metal vertical

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** lift-style panels, lockers
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** metal.brushedV
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Vertical brushed aluminium. Roughness within 0.42–0.62, metalness 0.65. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.metal.stainless` — Stainless steel

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** kitchen, restroom fittings
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** metal.stainless
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Polished stainless. Roughness within 0.42–0.62, metalness 0.65. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.metal.painted` — Painted metal

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** filing cabinets, racks
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** metal.painted
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Powder-coated grey steel. Roughness within 0.42–0.62, metalness 0.65. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.metal.paintedDark` — Dark painted metal

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** server racks, shelving
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** metal.paintedDark
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Powder-coated charcoal steel. Roughness within 0.42–0.62, metalness 0.65. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.metal.paintedRed` — Red painted metal

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** extinguishers, fire cabinet
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** metal.paintedRed
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Fire-equipment red. Roughness within 0.42–0.62, metalness 0.65. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.metal.galvanised` — Galvanised steel

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** HVAC, conduit
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** metal.galvanised
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Galvanised duct/pipe finish. Roughness within 0.42–0.62, metalness 0.65. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.metal.blackAnodised` — Black anodised

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** weapon receivers, fixtures
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** metal.blackAnodised
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Anodised black finish. Roughness within 0.42–0.62, metalness 0.65. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.metal.gunmetal` — Gunmetal

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** weapon barrels, slides
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** metal.gunmetal
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Phosphate gunmetal finish. Roughness within 0.42–0.62, metalness 0.65. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.metal.aluminium` — Aluminium

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** window mullions, ladders
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** metal.aluminium
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Mill-finish aluminium. Roughness within 0.42–0.62, metalness 0.65. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.fabric.chair` — Chair fabric

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** desk chairs
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** fabric.chair
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Woven task-chair fabric. Roughness within 0.85–0.98, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.fabric.chairAlt` — Chair fabric alt

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** waiting chairs
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** fabric.chairAlt
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Woven fabric, warm variant. Roughness within 0.85–0.98, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.fabric.cubicle` — Cubicle fabric

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** cubicle panels
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** fabric.cubicle
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Coarse acoustic panel fabric. Roughness within 0.85–0.98, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.fabric.cubicleTeal` — Cubicle fabric teal

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** cubicle accent panels
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** fabric.cubicleTeal
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Coarse acoustic fabric, teal. Roughness within 0.85–0.98, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.fabric.sofa` — Sofa fabric

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** waiting-area sofa
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** fabric.sofa
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Upholstery weave. Roughness within 0.85–0.98, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.leather.dark` — Dark leather

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** executive chair
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** leather.dark
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Synthetic leather grain. Roughness within 0.42–0.66, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.leather.tan` — Tan leather

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** lounge chair
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** leather.tan
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Tan synthetic leather. Roughness within 0.42–0.66, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.plastic.dark` — Dark hard plastic

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** electronics housings
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** plastic.dark
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Textured ABS. Roughness within 0.3–0.5, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.plastic.white` — White hard plastic

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** appliances, dispensers
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** plastic.white
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Textured ABS, light. Roughness within 0.3–0.5, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.plastic.grey` — Grey hard plastic

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** printers, phones
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** plastic.grey
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Textured ABS, grey. Roughness within 0.3–0.5, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.plastic.smooth` — Smooth plastic

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** monitor bezels
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** plastic.smooth
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Gloss ABS. Roughness within 0.3–0.5, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.rubber.black` — Rubber

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** mats, grips, castors
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** rubber.black
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Matte rubber. Roughness within 0.85–0.96, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.paper.white` — White paper

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** documents, printouts
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** paper.white
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Office paper stock. Roughness within 0.78–0.92, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.paper.cream` — Cream paper

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** archive files
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** paper.cream
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Aged paper stock. Roughness within 0.78–0.92, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.cardboard.box` — Cardboard

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** boxes, packaging
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** cardboard.box
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Corrugated cardboard. Roughness within 0.78–0.92, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.snow.fresh` — Fresh snow

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** courtyard, roofs, yard
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** snow.fresh
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Wind-drifted fresh snow. Roughness within 0.62–0.85, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.snow.trampled` — Trampled snow

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** entrance paths, dock
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** snow.trampled
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Compacted trafficked snow. Roughness within 0.62–0.85, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.ice.thin` — Thin ice

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** entrance thresholds
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** ice.thin
- **Texture maps:** baseColor (solid), emissive where applicable
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Refrozen meltwater. Roughness within 0.1–0.28, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.glass.clear` — Clear glass

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** windows, partitions
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** glass.clear
- **Texture maps:** baseColor (solid), emissive where applicable
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Low-iron clear glazing. Roughness within 0.02–0.06, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.glass.tinted` — Tinted glass

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** exterior curtain wall
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** glass.tinted
- **Texture maps:** baseColor (solid), emissive where applicable
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Solar-tinted exterior glazing. Roughness within 0.02–0.06, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.glass.frosted` — Frosted glass

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** office doors, restroom
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** glass.frosted
- **Texture maps:** baseColor, normal (Sobel from authored height), roughness
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Acid-etched privacy glass. Roughness within 0.02–0.06, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.glass.cracked` — Cracked glass

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** damaged windows
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** glass.cracked
- **Texture maps:** baseColor (solid), emissive where applicable
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Impact-damaged glazing state. Roughness within 0.02–0.06, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.emissive.fluoro` — Fluorescent tube

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** ceiling fixtures
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** emissive.fluoro
- **Texture maps:** baseColor (solid), emissive where applicable
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Emissive T8 tube surface. Roughness within 0.28–0.55, metalness 0.15. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.emissive.exit` — Exit sign emissive

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** exits
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** emissive.exit
- **Texture maps:** baseColor (solid), emissive where applicable
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Green exit sign face. Roughness within 0.28–0.55, metalness 0.15. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.emissive.emergency` — Emergency light emissive

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** service spaces
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** emissive.emergency
- **Texture maps:** baseColor (solid), emissive where applicable
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Amber emergency face. Roughness within 0.28–0.55, metalness 0.15. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.emissive.screen` — Screen emissive

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** monitors, laptops
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** emissive.screen
- **Texture maps:** baseColor (solid), emissive where applicable
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Monitor emissive face. Roughness within 0.28–0.55, metalness 0.15. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.emissive.ledGreen` — Green LED

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** servers, network gear
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** emissive.ledGreen
- **Texture maps:** baseColor (solid), emissive where applicable
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Equipment status LED. Roughness within 0.28–0.55, metalness 0.15. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.emissive.ledAmber` — Amber LED

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** UPS, panels
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** emissive.ledAmber
- **Texture maps:** baseColor (solid), emissive where applicable
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Equipment warning LED. Roughness within 0.28–0.55, metalness 0.15. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.emissive.ledRed` — Red LED

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** card readers, alarms
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** emissive.ledRed
- **Texture maps:** baseColor (solid), emissive where applicable
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Equipment fault LED. Roughness within 0.28–0.55, metalness 0.15. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.emissive.warm` — Warm lamp emissive

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** desk lamps
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** emissive.warm
- **Texture maps:** baseColor (solid), emissive where applicable
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Tungsten lamp face. Roughness within 0.28–0.55, metalness 0.15. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.skin.a` — Skin tone A

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** characters
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** skin.a
- **Texture maps:** baseColor (solid), emissive where applicable
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Character skin, light-warm. Roughness within 0.85–0.98, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.skin.b` — Skin tone B

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** characters
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** skin.b
- **Texture maps:** baseColor (solid), emissive where applicable
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Character skin, deep-warm. Roughness within 0.85–0.98, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.skin.c` — Skin tone C

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** characters
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** skin.c
- **Texture maps:** baseColor (solid), emissive where applicable
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Character skin, light-neutral. Roughness within 0.85–0.98, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

### `mat.skin.d` — Skin tone D

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/art/materials.js, src/art/textures.js
- **Used in:** characters
- **Dimensions (m):** tileable, authored at 512², world tiling set per surface
- **Pivot / orientation:** UV origin bottom-left, +U east / +V up on vertical faces
- **Material slots:** skin.d
- **Texture maps:** baseColor (solid), emissive where applicable
- **Collision:** n/a — surface material
- **LOD:** mip chain with trilinear + anisotropic filtering; single texture serves all LODs
- **Status:** accepted
- **Acceptance criteria:** Character skin, deep-neutral. Roughness within 0.85–0.98, metalness 0. No baked lighting in base colour; seamless tiling verified in the asset gallery.
- **Playwright evidence:** screenshots/gallery/materials.png
- **Remaining discrepancies:** none

## restroom

### `prop.dispenserTowel` — Paper-towel dispenser

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** restroom, breakroom, janitor
- **Dimensions (m):** 0.3 × 0.36 × 0.13 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.white, paper.white
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — wall mounted
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Wall dispenser with a towel tongue hanging from the slot. Pivot at unit centre against wall. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.dispenserSoap` — Soap dispenser

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** restroom, breakroom sink, janitor
- **Dimensions (m):** 0.12 × 0.18 × 0.11 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.white, plastic.smooth
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — wall mounted
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Wall soap dispenser with sight window and push bar. Pivot at unit centre against wall. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.vanityUnit` — Restroom vanity

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** restroom
- **Dimensions (m):** 1.6 × 0.86 × 0.56 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** laminate.white, plastic.white, metal.stainless, metal.brushed
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB run × 0.86 × 0.56
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Two-basin vanity against a wall (+Z into wall): counter with apron, inset basins, monobloc faucets, under-counter P-traps. opts.width 1.2–2.4 m; opts.basins 1–3. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.mirrorWall` — Restroom mirror

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** restroom above vanity
- **Dimensions (m):** 1.5 × 0.9 × 0.03 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.stainless, metal.aluminium
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — wall mounted
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Frameless mirror band with clip hardware; polished stainless face reads specular under the restroom fluorescents. Pivot at mirror centre against wall. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.toilet` — Toilet

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** restroom stalls
- **Dimensions (m):** 0.4 × 0.78 × 0.68 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.white, metal.brushed, plastic.smooth
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.4 × 0.78 × 0.68
- **LOD:** LOD0 merged into static batch; buildLod1(opts) exposes a simplified silhouette (< 25% tris) for gallery/dynamic use — batched statics do not runtime-switch
- **Status:** accepted
- **Acceptance criteria:** Close-coupled WC: pedestal, elongated bowl, cistern with flush button, seat + lid, floor bolt caps. Variant: lidUp. Variants: lidDown | lidUp. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.urinal` — Wall urinal

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** restroom
- **Dimensions (m):** 0.36 × 0.62 × 0.34 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** plastic.white, metal.stainless
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** single AABB 0.36 × 0.62 × 0.34 offset onto the wall
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Wall-hung urinal: shell body, hood, flush pipe from above, drain dome. Pivot at bowl centre against wall, bowl lip at ~0.6 m when mounted at 0.45 m. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.stallPartition` — Toilet stall partition

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** restroom
- **Dimensions (m):** 1.1 × 1.9 × 1.5 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** laminate.grey, metal.aluminium, metal.brushed
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** side panel + door AABBs (0.2 m floor gap preserved visually)
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Cubicle: side panel on pilaster feet, front stile, door with latch and hinge blocks. Variants: closed | ajar (door swung 35°) | open (door at 80°) | panelOnly (end panel with no door — closes the last stall of a run). Panels float 0.2 m off the floor on feet like a real washroom system. Variants: closed | ajar | open | panelOnly. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

### `prop.handDryer` — Hand dryer

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/library.js, src/props/dress.js
- **Used in:** restroom
- **Dimensions (m):** 0.3 × 0.34 × 0.2 m (w × h × d)
- **Pivot / orientation:** footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance
- **Material slots:** metal.brushed, plastic.dark
- **Texture maps:** procedural family maps: baseColor + normal + roughness (see mat.* entries)
- **Collision:** none — wall mounted
- **LOD:** single LOD (< ~600 tris); merged into per-material static batches
- **Status:** accepted
- **Acceptance criteria:** Wall hand dryer: brushed shell, dark nozzle throat, indicator dot. Pivot at unit centre against wall. Variants: intact. Base at y=0 — never floats; small clutter carries no collider.
- **Playwright evidence:** screenshots/gallery/props.png
- **Remaining discrepancies:** none

## signage

### `sign.roomSign` — Room number plate

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/dress.js
- **Used in:** beside every named door
- **Dimensions (m):** 0.30 × 0.12 m
- **Pivot / orientation:** sign centre against mount plane, face towards −Z before yaw
- **Material slots:** signage.atlas (shared 4096×2048 canvas atlas, one material for all sign faces), metal.aluminium / metal.blackAnodised / wood backers
- **Texture maps:** baseColor from shared signage atlas (Canvas2D, original artwork/text only)
- **Collision:** none — flat wall/prop dressing
- **LOD:** single quad per face; whole signage set merges to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** Navy plate, number block, room name; brushed backer. Text legible at 2 m. No real-world brand, game or company references; all copy is original fiction. UI palette honoured (navy/ice/cyan/gold).
- **Playwright evidence:** screenshots/gallery/signage.png
- **Remaining discrepancies:** none

### `sign.deptSign` — Department sign

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/dress.js
- **Used in:** openplan, it, archive, execcorr
- **Dimensions (m):** 0.95 × 0.26 m
- **Pivot / orientation:** sign centre against mount plane, face towards −Z before yaw
- **Material slots:** signage.atlas (shared 4096×2048 canvas atlas, one material for all sign faces), metal.aluminium / metal.blackAnodised / wood backers
- **Texture maps:** baseColor from shared signage atlas (Canvas2D, original artwork/text only)
- **Collision:** none — flat wall/prop dressing
- **LOD:** single quad per face; whole signage set merges to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** Division name with star mark and gold keel line; legible at 6 m. No real-world brand, game or company references; all copy is original fiction. UI palette honoured (navy/ice/cyan/gold).
- **Playwright evidence:** screenshots/gallery/signage.png
- **Remaining discrepancies:** none

### `sign.directional` — Wayfinding sign

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/dress.js
- **Used in:** corridor junctions, lobby
- **Dimensions (m):** 0.80 × variable
- **Pivot / orientation:** sign centre against mount plane, face towards −Z before yaw
- **Material slots:** signage.atlas (shared 4096×2048 canvas atlas, one material for all sign faces), metal.aluminium / metal.blackAnodised / wood backers
- **Texture maps:** baseColor from shared signage atlas (Canvas2D, original artwork/text only)
- **Collision:** none — flat wall/prop dressing
- **LOD:** single quad per face; whole signage set merges to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** Arrow rows with rule separators; arrows read at 8 m. No real-world brand, game or company references; all copy is original fiction. UI palette honoured (navy/ice/cyan/gold).
- **Playwright evidence:** screenshots/gallery/signage.png
- **Remaining discrepancies:** none

### `sign.safetyPoster` — Safety poster

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/dress.js
- **Used in:** corridors, breakroom, loading
- **Dimensions (m):** 0.44 × 0.64 m
- **Pivot / orientation:** sign centre against mount plane, face towards −Z before yaw
- **Material slots:** signage.atlas (shared 4096×2048 canvas atlas, one material for all sign faces), metal.aluminium / metal.blackAnodised / wood backers
- **Texture maps:** baseColor from shared signage atlas (Canvas2D, original artwork/text only)
- **Collision:** none — flat wall/prop dressing
- **LOD:** single quad per face; whole signage set merges to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** Four original poster designs (winter footing, lifting, fire, clear desk) in aluminium frames. No real-world brand, game or company references; all copy is original fiction. UI palette honoured (navy/ice/cyan/gold).
- **Playwright evidence:** screenshots/gallery/signage.png
- **Remaining discrepancies:** none

### `sign.evacDiagram` — Evacuation diagram

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/dress.js
- **Used in:** every wing, both floors
- **Dimensions (m):** 0.33 × 0.46 m
- **Pivot / orientation:** sign centre against mount plane, face towards −Z before yaw
- **Material slots:** signage.atlas (shared 4096×2048 canvas atlas, one material for all sign faces), metal.aluminium / metal.blackAnodised / wood backers
- **Texture maps:** baseColor from shared signage atlas (Canvas2D, original artwork/text only)
- **Collision:** none — flat wall/prop dressing
- **LOD:** single quad per face; whole signage set merges to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** Simplified true-to-layout plan with route arrows and YOU ARE HERE dot. No real-world brand, game or company references; all copy is original fiction. UI palette honoured (navy/ice/cyan/gold).
- **Playwright evidence:** screenshots/gallery/signage.png
- **Remaining discrepancies:** none

### `sign.notice` — Taped notice

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/dress.js
- **Used in:** breakroom, copy, doors
- **Dimensions (m):** 0.21 × 0.29 m
- **Pivot / orientation:** sign centre against mount plane, face towards −Z before yaw
- **Material slots:** signage.atlas (shared 4096×2048 canvas atlas, one material for all sign faces), metal.aluminium / metal.blackAnodised / wood backers
- **Texture maps:** baseColor from shared signage atlas (Canvas2D, original artwork/text only)
- **Collision:** none — flat wall/prop dressing
- **LOD:** single quad per face; whole signage set merges to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** Eight original A4 memos (incl. paper-jam and evacuation notices) with tape corners and random tilt. No real-world brand, game or company references; all copy is original fiction. UI palette honoured (navy/ice/cyan/gold).
- **Playwright evidence:** screenshots/gallery/signage.png
- **Remaining discrepancies:** none

### `sign.bulletinBoard` — Bulletin board

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/dress.js
- **Used in:** breakroom, openplanB
- **Dimensions (m):** 0.95 × 0.66 m
- **Pivot / orientation:** sign centre against mount plane, face towards −Z before yaw
- **Material slots:** signage.atlas (shared 4096×2048 canvas atlas, one material for all sign faces), metal.aluminium / metal.blackAnodised / wood backers
- **Texture maps:** baseColor from shared signage atlas (Canvas2D, original artwork/text only)
- **Collision:** none — flat wall/prop dressing
- **LOD:** single quad per face; whole signage set merges to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** Cork board with six pinned, rotated notes and pin dots. No real-world brand, game or company references; all copy is original fiction. UI palette honoured (navy/ice/cyan/gold).
- **Playwright evidence:** screenshots/gallery/signage.png
- **Remaining discrepancies:** none

### `sign.whiteboardContent` — Whiteboard writing

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/dress.js
- **Used in:** over prop.whiteboard faces
- **Dimensions (m):** 1.70 × 1.06 m
- **Pivot / orientation:** sign centre against mount plane, face towards −Z before yaw
- **Material slots:** signage.atlas (shared 4096×2048 canvas atlas, one material for all sign faces), metal.aluminium / metal.blackAnodised / wood backers
- **Texture maps:** baseColor from shared signage atlas (Canvas2D, original artwork/text only)
- **Collision:** none — flat wall/prop dressing
- **LOD:** single quad per face; whole signage set merges to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** Four marker layouts (sprint board, chart, storm meeting, half-erased agenda) with erased ghosts. No real-world brand, game or company references; all copy is original fiction. UI palette honoured (navy/ice/cyan/gold).
- **Playwright evidence:** screenshots/gallery/signage.png
- **Remaining discrepancies:** none

### `sign.bookRow` — Book spine strip

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/dress.js
- **Used in:** prop.bookcase, prop.rackArchive shelves
- **Dimensions (m):** ≈0.76 × 0.30 m per shelf
- **Pivot / orientation:** sign centre against mount plane, face towards −Z before yaw
- **Material slots:** signage.atlas (shared 4096×2048 canvas atlas, one material for all sign faces), metal.aluminium / metal.blackAnodised / wood backers
- **Texture maps:** baseColor from shared signage atlas (Canvas2D, original artwork/text only)
- **Collision:** none — flat wall/prop dressing
- **LOD:** single quad per face; whole signage set merges to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** Eight flat-colour spine strips (muted palette, darker foot band, pale title bar) — no high-frequency noise; replaces per-book geometry. No real-world brand, game or company references; all copy is original fiction. UI palette honoured (navy/ice/cyan/gold).
- **Playwright evidence:** screenshots/gallery/signage.png
- **Remaining discrepancies:** none

### `sign.brandLogo` — Northstar brand sign

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/dress.js
- **Used in:** lobby, execcorr
- **Dimensions (m):** 1.70 × 0.50 m (wide) / 0.6² (mark)
- **Pivot / orientation:** sign centre against mount plane, face towards −Z before yaw
- **Material slots:** signage.atlas (shared 4096×2048 canvas atlas, one material for all sign faces), metal.aluminium / metal.blackAnodised / wood backers
- **Texture maps:** baseColor from shared signage atlas (Canvas2D, original artwork/text only)
- **Collision:** none — flat wall/prop dressing
- **LOD:** single quad per face; whole signage set merges to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** Compass-star mark + NORTHSTAR wordmark on navy; original design. No real-world brand, game or company references; all copy is original fiction. UI palette honoured (navy/ice/cyan/gold).
- **Playwright evidence:** screenshots/gallery/signage.png
- **Remaining discrepancies:** none

### `sign.artPrint` — Framed art print

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/dress.js
- **Used in:** exec suite, lounge, boardroom
- **Dimensions (m):** 0.64 × 0.88 m
- **Pivot / orientation:** sign centre against mount plane, face towards −Z before yaw
- **Material slots:** signage.atlas (shared 4096×2048 canvas atlas, one material for all sign faces), metal.aluminium / metal.blackAnodised / wood backers
- **Texture maps:** baseColor from shared signage atlas (Canvas2D, original artwork/text only)
- **Collision:** none — flat wall/prop dressing
- **LOD:** single quad per face; whole signage set merges to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** Three original prints: aurora bands, ridge line, star chart. No real-world brand, game or company references; all copy is original fiction. UI palette honoured (navy/ice/cyan/gold).
- **Playwright evidence:** screenshots/gallery/signage.png
- **Remaining discrepancies:** none

### `sign.vendingHeader` — Vending brand face

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/dress.js
- **Used in:** prop.vendingMachine header
- **Dimensions (m):** 0.84 × 0.20 m
- **Pivot / orientation:** sign centre against mount plane, face towards −Z before yaw
- **Material slots:** signage.atlas (shared 4096×2048 canvas atlas, one material for all sign faces), metal.aluminium / metal.blackAnodised / wood backers
- **Texture maps:** baseColor from shared signage atlas (Canvas2D, original artwork/text only)
- **Collision:** none — flat wall/prop dressing
- **LOD:** single quad per face; whole signage set merges to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** "POLAR SNACKS" gradient header, fictional brand. No real-world brand, game or company references; all copy is original fiction. UI palette honoured (navy/ice/cyan/gold).
- **Playwright evidence:** screenshots/gallery/signage.png
- **Remaining discrepancies:** none

### `sign.shippingLabel` — Shipping label

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/dress.js
- **Used in:** crates, boxes in loading
- **Dimensions (m):** 0.20 × 0.14 m
- **Pivot / orientation:** sign centre against mount plane, face towards −Z before yaw
- **Material slots:** signage.atlas (shared 4096×2048 canvas atlas, one material for all sign faces), metal.aluminium / metal.blackAnodised / wood backers
- **Texture maps:** baseColor from shared signage atlas (Canvas2D, original artwork/text only)
- **Collision:** none — flat wall/prop dressing
- **LOD:** single quad per face; whole signage set merges to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** Three consignment labels with barcodes; fictional POs. No real-world brand, game or company references; all copy is original fiction. UI palette honoured (navy/ice/cyan/gold).
- **Playwright evidence:** screenshots/gallery/signage.png
- **Remaining discrepancies:** none

### `sign.equipLabel` — Equipment label

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/dress.js
- **Used in:** panels, AHU, risers, racks
- **Dimensions (m):** 0.24 × 0.10 m
- **Pivot / orientation:** sign centre against mount plane, face towards −Z before yaw
- **Material slots:** signage.atlas (shared 4096×2048 canvas atlas, one material for all sign faces), metal.aluminium / metal.blackAnodised / wood backers
- **Texture maps:** baseColor from shared signage atlas (Canvas2D, original artwork/text only)
- **Collision:** none — flat wall/prop dressing
- **LOD:** single quad per face; whole signage set merges to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** Engraved-read tags (AHU-1, PANEL LP-2 400V…), hazard chevron variant. No real-world brand, game or company references; all copy is original fiction. UI palette honoured (navy/ice/cyan/gold).
- **Playwright evidence:** screenshots/gallery/signage.png
- **Remaining discrepancies:** none

### `sign.hazardStripe` — Hazard stripe band

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/dress.js
- **Used in:** prop.barrier plank, dock edge
- **Dimensions (m):** 1.36 × 0.19 m
- **Pivot / orientation:** sign centre against mount plane, face towards −Z before yaw
- **Material slots:** signage.atlas (shared 4096×2048 canvas atlas, one material for all sign faces), metal.aluminium / metal.blackAnodised / wood backers
- **Texture maps:** baseColor from shared signage atlas (Canvas2D, original artwork/text only)
- **Collision:** none — flat wall/prop dressing
- **LOD:** single quad per face; whole signage set merges to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** Black/amber chevrons, tiling-safe. No real-world brand, game or company references; all copy is original fiction. UI palette honoured (navy/ice/cyan/gold).
- **Playwright evidence:** screenshots/gallery/signage.png
- **Remaining discrepancies:** none

### `sign.wetFloorFaces` — Wet floor sign face

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/dress.js
- **Used in:** prop.wetFloorSign
- **Dimensions (m):** 0.27 × 0.50 m ×2
- **Pivot / orientation:** sign centre against mount plane, face towards −Z before yaw
- **Material slots:** signage.atlas (shared 4096×2048 canvas atlas, one material for all sign faces), metal.aluminium / metal.blackAnodised / wood backers
- **Texture maps:** baseColor from shared signage atlas (Canvas2D, original artwork/text only)
- **Collision:** none — flat wall/prop dressing
- **LOD:** single quad per face; whole signage set merges to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** CAUTION WET FLOOR with slipping-figure pictogram, both boards. No real-world brand, game or company references; all copy is original fiction. UI palette honoured (navy/ice/cyan/gold).
- **Playwright evidence:** screenshots/gallery/signage.png
- **Remaining discrepancies:** none

### `sign.directory` — Lobby directory

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/dress.js
- **Used in:** lobby, mezz
- **Dimensions (m):** 0.5 × 0.72 m panel on 1.7 m post
- **Pivot / orientation:** sign centre against mount plane, face towards −Z before yaw
- **Material slots:** signage.atlas (shared 4096×2048 canvas atlas, one material for all sign faces), metal.aluminium / metal.blackAnodised / wood backers
- **Texture maps:** baseColor from shared signage atlas (Canvas2D, original artwork/text only)
- **Collision:** AABB on post
- **LOD:** single quad per face; whole signage set merges to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** Free-standing directory listing fictional rooms; collider on the post. No real-world brand, game or company references; all copy is original fiction. UI palette honoured (navy/ice/cyan/gold).
- **Playwright evidence:** screenshots/gallery/signage.png
- **Remaining discrepancies:** none

### `sign.securityNotice` — CCTV notice

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/dress.js
- **Used in:** vestibule, loading, garage
- **Dimensions (m):** 0.22 × 0.30 m
- **Pivot / orientation:** sign centre against mount plane, face towards −Z before yaw
- **Material slots:** signage.atlas (shared 4096×2048 canvas atlas, one material for all sign faces), metal.aluminium / metal.blackAnodised / wood backers
- **Texture maps:** baseColor from shared signage atlas (Canvas2D, original artwork/text only)
- **Collision:** none — flat wall/prop dressing
- **LOD:** single quad per face; whole signage set merges to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** Camera pictogram + CCTV IN OPERATION. No real-world brand, game or company references; all copy is original fiction. UI palette honoured (navy/ice/cyan/gold).
- **Playwright evidence:** screenshots/gallery/signage.png
- **Remaining discrepancies:** none

### `sign.stairLevel` — Stair level marker

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/dress.js
- **Used in:** stairwell, firestair
- **Dimensions (m):** 0.35 × 0.35 m
- **Pivot / orientation:** sign centre against mount plane, face towards −Z before yaw
- **Material slots:** signage.atlas (shared 4096×2048 canvas atlas, one material for all sign faces), metal.aluminium / metal.blackAnodised / wood backers
- **Texture maps:** baseColor from shared signage atlas (Canvas2D, original artwork/text only)
- **Collision:** none — flat wall/prop dressing
- **LOD:** single quad per face; whole signage set merges to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** Giant G / 1 level letters on navy. No real-world brand, game or company references; all copy is original fiction. UI palette honoured (navy/ice/cyan/gold).
- **Playwright evidence:** screenshots/gallery/signage.png
- **Remaining discrepancies:** none

### `sign.vanLivery` — Van livery

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/dress.js
- **Used in:** prop.vanUtility flanks
- **Dimensions (m):** 1.80 × 0.78 m
- **Pivot / orientation:** sign centre against mount plane, face towards −Z before yaw
- **Material slots:** signage.atlas (shared 4096×2048 canvas atlas, one material for all sign faces), metal.aluminium / metal.blackAnodised / wood backers
- **Texture maps:** baseColor from shared signage atlas (Canvas2D, original artwork/text only)
- **Collision:** none — flat wall/prop dressing
- **LOD:** single quad per face; whole signage set merges to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** POLAR LOGISTICS wordmark with star; applied to both van sides. No real-world brand, game or company references; all copy is original fiction. UI palette honoured (navy/ice/cyan/gold).
- **Playwright evidence:** screenshots/gallery/signage.png
- **Remaining discrepancies:** none

### `sign.gritLabel` — Grit bin label

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/dress.js
- **Used in:** prop.gritBin
- **Dimensions (m):** 0.50 × 0.27 m
- **Pivot / orientation:** sign centre against mount plane, face towards −Z before yaw
- **Material slots:** signage.atlas (shared 4096×2048 canvas atlas, one material for all sign faces), metal.aluminium / metal.blackAnodised / wood backers
- **Texture maps:** baseColor from shared signage atlas (Canvas2D, original artwork/text only)
- **Collision:** none — flat wall/prop dressing
- **LOD:** single quad per face; whole signage set merges to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** GRIT block letters on amber. No real-world brand, game or company references; all copy is original fiction. UI palette honoured (navy/ice/cyan/gold).
- **Playwright evidence:** screenshots/gallery/signage.png
- **Remaining discrepancies:** none

### `sign.nameplate` — Desk nameplate

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/dress.js
- **Used in:** reception, execante
- **Dimensions (m):** 0.25 × 0.065 m
- **Pivot / orientation:** sign centre against mount plane, face towards −Z before yaw
- **Material slots:** signage.atlas (shared 4096×2048 canvas atlas, one material for all sign faces), metal.aluminium / metal.blackAnodised / wood backers
- **Texture maps:** baseColor from shared signage atlas (Canvas2D, original artwork/text only)
- **Collision:** none — flat wall/prop dressing
- **LOD:** single quad per face; whole signage set merges to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** Standing wedge with fictional staff names. No real-world brand, game or company references; all copy is original fiction. UI palette honoured (navy/ice/cyan/gold).
- **Playwright evidence:** screenshots/gallery/signage.png
- **Remaining discrepancies:** none

### `screen.spreadsheet` — Screen — ledger spreadsheet

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/library.js
- **Used in:** desk monitors
- **Dimensions (m):** atlas region ≈320 × 180 px, mapped to each device’s panel size
- **Pivot / orientation:** quad centred on the device panel, facing −Z before yaw
- **Material slots:** screen.atlas (shared 1024×1024 canvas as map + emissiveMap, emissive ×0.62 — legible, not clipped)
- **Texture maps:** baseColor + emissive from shared screen atlas (Canvas2D, original UI fiction)
- **Collision:** none — face quad on a device that carries its own collider where needed
- **LOD:** single quad per screen; all screens merge to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** Grid, header band, row/column figures, selection cell. Peak painted luminance ≈72% white so the panel reads as content, not a light source. All text original fiction.
- **Playwright evidence:** screenshots/gallery/screens.png
- **Remaining discrepancies:** none

### `screen.mail` — Screen — mail client

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/library.js
- **Used in:** desk monitors, laptops
- **Dimensions (m):** atlas region ≈320 × 180 px, mapped to each device’s panel size
- **Pivot / orientation:** quad centred on the device panel, facing −Z before yaw
- **Material slots:** screen.atlas (shared 1024×1024 canvas as map + emissiveMap, emissive ×0.62 — legible, not clipped)
- **Texture maps:** baseColor + emissive from shared screen atlas (Canvas2D, original UI fiction)
- **Collision:** none — face quad on a device that carries its own collider where needed
- **LOD:** single quad per screen; all screens merge to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** Folder rail, message list with original subjects, reading pane. Peak painted luminance ≈72% white so the panel reads as content, not a light source. All text original fiction.
- **Playwright evidence:** screenshots/gallery/screens.png
- **Remaining discrepancies:** none

### `screen.dashboard` — Screen — facilities dashboard

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/library.js
- **Used in:** desk monitors, wall display
- **Dimensions (m):** atlas region ≈320 × 180 px, mapped to each device’s panel size
- **Pivot / orientation:** quad centred on the device panel, facing −Z before yaw
- **Material slots:** screen.atlas (shared 1024×1024 canvas as map + emissiveMap, emissive ×0.62 — legible, not clipped)
- **Texture maps:** baseColor + emissive from shared screen atlas (Canvas2D, original UI fiction)
- **Collision:** none — face quad on a device that carries its own collider where needed
- **LOD:** single quad per screen; all screens merge to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** Meridian Facilities tiles (AHU, load, humidity, dock fault) + trend chart. Peak painted luminance ≈72% white so the panel reads as content, not a light source. All text original fiction.
- **Playwright evidence:** screenshots/gallery/screens.png
- **Remaining discrepancies:** none

### `screen.cad` — Screen — floor-plan CAD view

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/library.js
- **Used in:** desk monitors (IT, records)
- **Dimensions (m):** atlas region ≈320 × 180 px, mapped to each device’s panel size
- **Pivot / orientation:** quad centred on the device panel, facing −Z before yaw
- **Material slots:** screen.atlas (shared 1024×1024 canvas as map + emissiveMap, emissive ×0.62 — legible, not clipped)
- **Texture maps:** baseColor + emissive from shared screen atlas (Canvas2D, original UI fiction)
- **Collision:** none — face quad on a device that carries its own collider where needed
- **LOD:** single quad per screen; all screens merge to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** Dark plan view with rooms, door swings, gold dimension line. Peak painted luminance ≈72% white so the panel reads as content, not a light source. All text original fiction.
- **Playwright evidence:** screenshots/gallery/screens.png
- **Remaining discrepancies:** none

### `screen.login` — Screen — sign-in prompt

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/library.js
- **Used in:** shared desks
- **Dimensions (m):** atlas region ≈320 × 180 px, mapped to each device’s panel size
- **Pivot / orientation:** quad centred on the device panel, facing −Z before yaw
- **Material slots:** screen.atlas (shared 1024×1024 canvas as map + emissiveMap, emissive ×0.62 — legible, not clipped)
- **Texture maps:** baseColor + emissive from shared screen atlas (Canvas2D, original UI fiction)
- **Collision:** none — face quad on a device that carries its own collider where needed
- **LOD:** single quad per screen; all screens merge to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** Northstar star mark, user/password fields, SIGN IN button. Peak painted luminance ≈72% white so the panel reads as content, not a light source. All text original fiction.
- **Playwright evidence:** screenshots/gallery/screens.png
- **Remaining discrepancies:** none

### `screen.locked` — Screen — locked session

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/library.js
- **Used in:** desk monitors, laptops
- **Dimensions (m):** atlas region ≈320 × 180 px, mapped to each device’s panel size
- **Pivot / orientation:** quad centred on the device panel, facing −Z before yaw
- **Material slots:** screen.atlas (shared 1024×1024 canvas as map + emissiveMap, emissive ×0.62 — legible, not clipped)
- **Texture maps:** baseColor + emissive from shared screen atlas (Canvas2D, original UI fiction)
- **Collision:** none — face quad on a device that carries its own collider where needed
- **LOD:** single quad per screen; all screens merge to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** "SESSION LOCKED — Northstar Administrative Center", resume hint, workstation id. Peak painted luminance ≈72% white so the panel reads as content, not a light source. All text original fiction.
- **Playwright evidence:** screenshots/gallery/screens.png
- **Remaining discrepancies:** none

### `screen.cctv` — Screen — CCTV quad split A

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/library.js
- **Used in:** security monitor bank
- **Dimensions (m):** atlas region ≈320 × 180 px, mapped to each device’s panel size
- **Pivot / orientation:** quad centred on the device panel, facing −Z before yaw
- **Material slots:** screen.atlas (shared 1024×1024 canvas as map + emissiveMap, emissive ×0.62 — legible, not clipped)
- **Texture maps:** baseColor + emissive from shared screen atlas (Canvas2D, original UI fiction)
- **Collision:** none — face quad on a device that carries its own collider where needed
- **LOD:** single quad per screen; all screens merge to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** Four labelled camera cells with timestamps and scanline sheen. Peak painted luminance ≈72% white so the panel reads as content, not a light source. All text original fiction.
- **Playwright evidence:** screenshots/gallery/screens.png
- **Remaining discrepancies:** none

### `screen.cctv2` — Screen — CCTV quad split B

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/library.js
- **Used in:** security monitor bank
- **Dimensions (m):** atlas region ≈320 × 180 px, mapped to each device’s panel size
- **Pivot / orientation:** quad centred on the device panel, facing −Z before yaw
- **Material slots:** screen.atlas (shared 1024×1024 canvas as map + emissiveMap, emissive ×0.62 — legible, not clipped)
- **Texture maps:** baseColor + emissive from shared screen atlas (Canvas2D, original UI fiction)
- **Collision:** none — face quad on a device that carries its own collider where needed
- **LOD:** single quad per screen; all screens merge to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** Second camera set; one dead cell reads NO SIGNAL. Peak painted luminance ≈72% white so the panel reads as content, not a light source. All text original fiction.
- **Playwright evidence:** screenshots/gallery/screens.png
- **Remaining discrepancies:** none

### `screen.rack` — Screen — rack monitoring console

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/library.js
- **Used in:** server room console
- **Dimensions (m):** atlas region ≈320 × 180 px, mapped to each device’s panel size
- **Pivot / orientation:** quad centred on the device panel, facing −Z before yaw
- **Material slots:** screen.atlas (shared 1024×1024 canvas as map + emissiveMap, emissive ×0.62 — legible, not clipped)
- **Texture maps:** baseColor + emissive from shared screen atlas (Canvas2D, original UI fiction)
- **Collision:** none — face quad on a device that carries its own collider where needed
- **LOD:** single quad per screen; all screens merge to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** Hostname rows with green/amber load blocks; NSR fleet fiction. Peak painted luminance ≈72% white so the panel reads as content, not a light source. All text original fiction.
- **Playwright evidence:** screenshots/gallery/screens.png
- **Remaining discrepancies:** none

### `screen.slides` — Screen — presentation title slide

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/library.js
- **Used in:** conference/boardroom displays
- **Dimensions (m):** atlas region ≈320 × 180 px, mapped to each device’s panel size
- **Pivot / orientation:** quad centred on the device panel, facing −Z before yaw
- **Material slots:** screen.atlas (shared 1024×1024 canvas as map + emissiveMap, emissive ×0.62 — legible, not clipped)
- **Texture maps:** baseColor + emissive from shared screen atlas (Canvas2D, original UI fiction)
- **Collision:** none — face quad on a device that carries its own collider where needed
- **LOD:** single quad per screen; all screens merge to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** "Q3 OPERATIONS REVIEW — Polar Logistics" title slide with keel accent. Peak painted luminance ≈72% white so the panel reads as content, not a light source. All text original fiction.
- **Playwright evidence:** screenshots/gallery/screens.png
- **Remaining discrepancies:** none

### `screen.copier` — Screen — copier panel (ready)

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/library.js
- **Used in:** prop.copierFloor
- **Dimensions (m):** atlas region ≈320 × 180 px, mapped to each device’s panel size
- **Pivot / orientation:** quad centred on the device panel, facing −Z before yaw
- **Material slots:** screen.atlas (shared 1024×1024 canvas as map + emissiveMap, emissive ×0.62 — legible, not clipped)
- **Texture maps:** baseColor + emissive from shared screen atlas (Canvas2D, original UI fiction)
- **Collision:** none — face quad on a device that carries its own collider where needed
- **LOD:** single quad per screen; all screens merge to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** READY status, tray/toner lines, soft buttons. Peak painted luminance ≈72% white so the panel reads as content, not a light source. All text original fiction.
- **Playwright evidence:** screenshots/gallery/screens.png
- **Remaining discrepancies:** none

### `screen.copierJam` — Screen — copier panel (jam)

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/library.js
- **Used in:** prop.copierFloor jam variant
- **Dimensions (m):** atlas region ≈320 × 180 px, mapped to each device’s panel size
- **Pivot / orientation:** quad centred on the device panel, facing −Z before yaw
- **Material slots:** screen.atlas (shared 1024×1024 canvas as map + emissiveMap, emissive ×0.62 — legible, not clipped)
- **Texture maps:** baseColor + emissive from shared screen atlas (Canvas2D, original UI fiction)
- **Collision:** none — face quad on a device that carries its own collider where needed
- **LOD:** single quad per screen; all screens merge to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** Amber warning triangle, PAPER JAM — open panel B. Peak painted luminance ≈72% white so the panel reads as content, not a light source. All text original fiction.
- **Playwright evidence:** screenshots/gallery/screens.png
- **Remaining discrepancies:** none

### `screen.nosignal` — Screen — no input signal

- **Owner:** Fable 3 — Props, materials, decals & storytelling
- **Files:** src/props/signage.js, src/props/library.js
- **Used in:** one or two monitors
- **Dimensions (m):** atlas region ≈320 × 180 px, mapped to each device’s panel size
- **Pivot / orientation:** quad centred on the device panel, facing −Z before yaw
- **Material slots:** screen.atlas (shared 1024×1024 canvas as map + emissiveMap, emissive ×0.62 — legible, not clipped)
- **Texture maps:** baseColor + emissive from shared screen atlas (Canvas2D, original UI fiction)
- **Collision:** none — face quad on a device that carries its own collider where needed
- **LOD:** single quad per screen; all screens merge to one mesh + one texture, mips handle distance
- **Status:** accepted
- **Acceptance criteria:** Black panel with drifted blue NO INPUT SIGNAL box. Peak painted luminance ≈72% white so the panel reads as content, not a light source. All text original fiction.
- **Playwright evidence:** screenshots/gallery/screens.png
- **Remaining discrepancies:** none

## system

### `sys.engine` — Renderer & post chain

- **Owner:** Opus 1 — Lead architect & integrator
- **Files:** src/core/engine.js
- **Used in:** whole game
- **Dimensions (m):** n/a
- **Pivot / orientation:** n/a
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** n/a
- **LOD:** n/a
- **Status:** accepted
- **Acceptance criteria:** ACES tone mapping, bloom, grade, SMAA, resolution scaling, separate view-model overlay pass
- **Playwright evidence:** tests/*.spec.js
- **Remaining discrepancies:** none

### `sys.input` — Input, pointer lock & fullscreen

- **Owner:** Opus 1 — Lead architect & integrator
- **Files:** src/core/input.js
- **Used in:** whole game
- **Dimensions (m):** n/a
- **Pivot / orientation:** n/a
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** n/a
- **LOD:** n/a
- **Status:** accepted
- **Acceptance criteria:** Pointer lock with a virtual-capture fallback for headless automation; F toggles fullscreen, Esc exits
- **Playwright evidence:** tests/*.spec.js
- **Remaining discrepancies:** none

### `sys.collision` — Collision world

- **Owner:** Opus 2 — Player & combat systems
- **Files:** src/map/collision.js
- **Used in:** whole game
- **Dimensions (m):** n/a
- **Pivot / orientation:** n/a
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** n/a
- **LOD:** n/a
- **Status:** accepted
- **Acceptance criteria:** Uniform-grid AABB broadphase, per-axis sweep with step-up, BVH raycasts
- **Playwright evidence:** tests/*.spec.js
- **Remaining discrepancies:** none

### `sys.nav` — Multi-level navigation grid

- **Owner:** Opus 3 — AI, objectives & round systems
- **Files:** src/map/nav.js
- **Used in:** whole game
- **Dimensions (m):** n/a
- **Pivot / orientation:** n/a
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** n/a
- **LOD:** n/a
- **Status:** accepted
- **Acceptance criteria:** Column-sampled 0.4 m grid with automatic stair links, A* and string pulling
- **Playwright evidence:** tests/*.spec.js
- **Remaining discrepancies:** none

### `sys.player` — First-person controller

- **Owner:** Opus 2 — Player & combat systems
- **Files:** src/player/controller.js
- **Used in:** whole game
- **Dimensions (m):** n/a
- **Pivot / orientation:** n/a
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** n/a
- **LOD:** n/a
- **Status:** accepted
- **Acceptance criteria:** Acceleration/friction movement, crouch, jump, lean, landing response, footstep and noise emission
- **Playwright evidence:** tests/*.spec.js
- **Remaining discrepancies:** none

### `sys.combat` — Player combat

- **Owner:** Opus 2 — Player & combat systems
- **Files:** src/player/combat.js
- **Used in:** whole game
- **Dimensions (m):** n/a
- **Pivot / orientation:** n/a
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** n/a
- **LOD:** n/a
- **Status:** accepted
- **Acceptance criteria:** Hitscan ballistics, spread, recoil patterns, penetration, reload state machine, grenades
- **Playwright evidence:** tests/*.spec.js
- **Remaining discrepancies:** none

### `sys.ai` — Hostile AI

- **Owner:** Opus 3 — AI, objectives & round systems
- **Files:** src/ai/enemy.js
- **Used in:** whole game
- **Dimensions (m):** n/a
- **Pivot / orientation:** n/a
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** n/a
- **LOD:** n/a
- **Status:** accepted
- **Acceptance criteria:** Vision cone with real line of sight, hearing, patrol, investigate, cover, flank, search, stuck recovery
- **Playwright evidence:** tests/*.spec.js
- **Remaining discrepancies:** none

### `sys.hostage` — Hostage behaviour

- **Owner:** Opus 3 — AI, objectives & round systems
- **Files:** src/ai/hostage.js
- **Used in:** whole game
- **Dimensions (m):** n/a
- **Pivot / orientation:** n/a
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** n/a
- **LOD:** n/a
- **Status:** accepted
- **Acceptance criteria:** Held, secured, following, stopped, extracted, down; guaranteed extraction recovery
- **Playwright evidence:** tests/*.spec.js
- **Remaining discrepancies:** none

### `sys.mission` — Mission director

- **Owner:** Opus 3 — AI, objectives & round systems
- **Files:** src/mission/mission.js, src/mission/difficulty.js
- **Used in:** whole game
- **Dimensions (m):** n/a
- **Pivot / orientation:** n/a
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** n/a
- **LOD:** n/a
- **Status:** accepted
- **Acceptance criteria:** Objective chain, garrison spawning, timer, alarm, victory/defeat, total reset
- **Playwright evidence:** tests/*.spec.js
- **Remaining discrepancies:** none

### `sys.testing` — Deterministic test surface

- **Owner:** Opus 4 — Testing, performance & release quality
- **Files:** src/core/testing.js, src/core/qa.js
- **Used in:** whole game
- **Dimensions (m):** n/a
- **Pivot / orientation:** n/a
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** n/a
- **LOD:** n/a
- **Status:** accepted
- **Acceptance criteria:** render_game_to_text, advanceTime, QA teleport/spawn/freeze/lighting/gallery tools
- **Playwright evidence:** tests/*.spec.js
- **Remaining discrepancies:** none

## ui

### `ui.theme` — Interface theme & typography treatment

- **Owner:** Fable 1 — Art direction, visual bible & interface
- **Files:** src/ui/styles.css
- **Used in:** every screen and the HUD
- **Dimensions (m):** screen space (resolution independent, rem/clamp sizing)
- **Pivot / orientation:** DOM flow / top-left; overlays anchored to viewport edges
- **Material slots:** CSS custom properties mirroring the UI palette in src/art/palette.js
- **Texture maps:** none — vector SVG, DOM and Canvas2D only, zero external files
- **Collision:** none (screen-space UI)
- **LOD:** none — vector, crisp at any resolution; verified at 1280×720 and 1920×1080
- **Status:** accepted
- **Acceptance criteria:** Cold navy/cyan palette per the colour script; red reserved for danger; legible at 720p and 1080p; respects --ui-scale; no scrollbars or layout shift; web-safe font stacks only (offline).
- **Playwright evidence:** screenshots/flow/step-*.png — all thirteen flow steps captured through the real interface at 1280×720 and 1920×1080
- **Remaining discrepancies:** none

### `ui.icons` — Vector icon set (glyphs, weapon silhouettes, key caps, pips)

- **Owner:** Fable 1 — Art direction, visual bible & interface
- **Files:** src/ui/icons.js
- **Used in:** HUD, menus, briefing, loadout, settings
- **Dimensions (m):** screen space (resolution independent, rem/clamp sizing)
- **Pivot / orientation:** DOM flow / top-left; overlays anchored to viewport edges
- **Material slots:** CSS custom properties mirroring the UI palette in src/art/palette.js
- **Texture maps:** none — vector SVG, DOM and Canvas2D only, zero external files
- **Collision:** none (screen-space UI)
- **LOD:** none — vector, crisp at any resolution; verified at 1280×720 and 1920×1080
- **Status:** accepted
- **Acceptance criteria:** All 35 glyphs share the 2.4px stroke grid, use currentColor, and are generated inline with no emoji or external assets.
- **Playwright evidence:** screenshots/flow/step-*.png — all thirteen flow steps captured through the real interface at 1280×720 and 1920×1080
- **Remaining discrepancies:** none

### `ui.title` — NORTHSTAR RESCUE title treatment & star mark

- **Owner:** Fable 1 — Art direction, visual bible & interface
- **Files:** src/ui/icons.js, src/ui/menus.js, src/ui/styles.css
- **Used in:** title screen, loading screen, credits
- **Dimensions (m):** screen space (resolution independent, rem/clamp sizing)
- **Pivot / orientation:** DOM flow / top-left; overlays anchored to viewport edges
- **Material slots:** CSS custom properties mirroring the UI palette in src/art/palette.js
- **Texture maps:** none — vector SVG, DOM and Canvas2D only, zero external files
- **Collision:** none (screen-space UI)
- **LOD:** none — vector, crisp at any resolution; verified at 1280×720 and 1920×1080
- **Status:** accepted
- **Acceptance criteria:** Original faceted four-point star with compass ring; display type is a letter-spaced web-safe stack; animated snow stays restrained and pauses under reduced-motion.
- **Playwright evidence:** screenshots/flow/step-*.png — all thirteen flow steps captured through the real interface at 1280×720 and 1920×1080
- **Remaining discrepancies:** none

### `ui.hud` — In-mission HUD layer

- **Owner:** Fable 1 — Art direction, visual bible & interface
- **Files:** src/ui/hud.js, src/ui/styles.css
- **Used in:** gameplay
- **Dimensions (m):** screen space (resolution independent, rem/clamp sizing)
- **Pivot / orientation:** DOM flow / top-left; overlays anchored to viewport edges
- **Material slots:** CSS custom properties mirroring the UI palette in src/art/palette.js
- **Texture maps:** none — vector SVG, DOM and Canvas2D only, zero external files
- **Collision:** none (screen-space UI)
- **LOD:** none — vector, crisp at any resolution; verified at 1280×720 and 1920×1080
- **Animation states:** hitmarker pop, damage direction fade, notification slide, timer critical pulse, low-health vignette
- **Status:** accepted
- **Acceptance criteria:** Shows health/armor/ammo/weapon/utility/objective/hostages/timer/compass/interact/subtitles; minimal at rest; every element driven by update(state) with change-detection (no per-frame layout churn).
- **Playwright evidence:** screenshots/flow/step-*.png — all thirteen flow steps captured through the real interface at 1280×720 and 1920×1080
- **Remaining discrepancies:** none

### `ui.crosshair` — Dynamic crosshair family

- **Owner:** Fable 1 — Art direction, visual bible & interface
- **Files:** src/ui/hud.js, src/ui/styles.css
- **Used in:** gameplay, settings live preview
- **Dimensions (m):** screen space (resolution independent, rem/clamp sizing)
- **Pivot / orientation:** DOM flow / top-left; overlays anchored to viewport edges
- **Material slots:** CSS custom properties mirroring the UI palette in src/art/palette.js
- **Texture maps:** none — vector SVG, DOM and Canvas2D only, zero external files
- **Collision:** none (screen-space UI)
- **LOD:** none — vector, crisp at any resolution; verified at 1280×720 and 1920×1080
- **Status:** accepted
- **Acceptance criteria:** Four styles (dynamic / cross / dot / none); dynamic style tracks spread in device pixels via a CSS custom property; hidden while scoped.
- **Playwright evidence:** screenshots/flow/step-*.png — all thirteen flow steps captured through the real interface at 1280×720 and 1920×1080
- **Remaining discrepancies:** none

### `ui.minimap` — Tactical minimap & briefing floor plan

- **Owner:** Fable 1 — Art direction, visual bible & interface
- **Files:** src/ui/minimap.js
- **Used in:** HUD, mission briefing
- **Dimensions (m):** screen space (resolution independent, rem/clamp sizing)
- **Pivot / orientation:** DOM flow / top-left; overlays anchored to viewport edges
- **Material slots:** CSS custom properties mirroring the UI palette in src/art/palette.js
- **Texture maps:** none — vector SVG, DOM and Canvas2D only, zero external files
- **Collision:** none (screen-space UI)
- **LOD:** none — vector, crisp at any resolution; verified at 1280×720 and 1920×1080
- **Status:** accepted
- **Acceptance criteria:** Architectural plan rendered from ROOMS/OPENINGS rectangles (rooms, corridors, stairs, doors, windows); north-up; player wedge, hostage/objective/enemy markers, extraction zone; compact and expanded modes.
- **Playwright evidence:** screenshots/flow/step-*.png — all thirteen flow steps captured through the real interface at 1280×720 and 1920×1080
- **Remaining discrepancies:** none

### `ui.menus` — Menu screen system (13 screens)

- **Owner:** Fable 1 — Art direction, visual bible & interface
- **Files:** src/ui/menus.js, src/ui/styles.css
- **Used in:** title, settings, controls, difficulty, briefing, loadout, loading, pause, victory, defeat, restartConfirm, gallery, credits
- **Dimensions (m):** screen space (resolution independent, rem/clamp sizing)
- **Pivot / orientation:** DOM flow / top-left; overlays anchored to viewport edges
- **Material slots:** CSS custom properties mirroring the UI palette in src/art/palette.js
- **Texture maps:** none — vector SVG, DOM and Canvas2D only, zero external files
- **Collision:** none (screen-space UI)
- **LOD:** none — vector, crisp at any resolution; verified at 1280×720 and 1920×1080
- **Status:** accepted
- **Acceptance criteria:** All screens reachable; full keyboard navigation (arrows/Tab/Enter/Esc); every DEFAULTS setting exposed with live preview and reset; Esc never traps; data-testid on every interactive control.
- **Playwright evidence:** screenshots/flow/step-*.png — all thirteen flow steps captured through the real interface at 1280×720 and 1920×1080
- **Remaining discrepancies:** none

### `wpn.icon.weapons` — Weapon silhouette icons (8 weapons, hud + inventory styles)

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/weapons/icons.js
- **Used in:** HUD weapon panel, loadout menu, pickup prompts
- **Dimensions (m):** square canvas, any size (default 128 px)
- **Pivot / orientation:** canvas centre; silhouettes authored in a 100×44 design box, muzzle right
- **Material slots:** hud: flat #e6f1fa silhouette, inventory: panel bg, steel gradient fill, accent underline, name plate
- **Texture maps:** Canvas2D, no external files; cached per (id, size, style)
- **Collision:** n/a — UI asset
- **LOD:** vector-drawn at request size; default 128 px (weapons) / 64 px (ammo, utility)
- **Status:** accepted
- **Acceptance criteria:** Each of the 8 weapon ids renders a distinct original silhouette matching its 3D model; family shorthands alias correctly; data-URL export works.
- **Playwright evidence:** screenshots/flow/step-*.png — all thirteen flow steps captured through the real interface at 1280×720 and 1920×1080
- **Remaining discrepancies:** none

### `wpn.icon.ammo` — Ammunition icons (9mm, 5.56, 7.62, 12ga)

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/weapons/icons.js
- **Used in:** HUD ammo counter, pickup prompts
- **Dimensions (m):** square canvas, any size (default 64 px)
- **Pivot / orientation:** canvas centre; silhouettes authored in a 100×44 design box, muzzle right
- **Material slots:** cartridge/shotshell silhouettes drawn nose-up, calibre-scaled
- **Texture maps:** Canvas2D, no external files; cached per (id, size, style)
- **Collision:** n/a — UI asset
- **LOD:** vector-drawn at request size; default 128 px (weapons) / 64 px (ammo, utility)
- **Status:** accepted
- **Acceptance criteria:** Four calibres visually distinct at 24 px; weapon-family shorthands map to the right calibre.
- **Playwright evidence:** screenshots/flow/step-*.png — all thirteen flow steps captured through the real interface at 1280×720 and 1920×1080
- **Remaining discrepancies:** none

### `wpn.icon.utility` — Utility icons (flash, smoke, knife)

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/weapons/icons.js
- **Used in:** HUD utility slots, loadout menu
- **Dimensions (m):** square canvas, any size (default 64 px)
- **Pivot / orientation:** canvas centre; silhouettes authored in a 100×44 design box, muzzle right
- **Material slots:** grenade canister with flash ticks / smoke puffs; knife silhouette
- **Texture maps:** Canvas2D, no external files; cached per (id, size, style)
- **Collision:** n/a — UI asset
- **LOD:** vector-drawn at request size; default 128 px (weapons) / 64 px (ammo, utility)
- **Status:** accepted
- **Acceptance criteria:** Flash and smoke devices distinguishable at HUD size; consistent with weaponIcon renders of the same ids.
- **Playwright evidence:** screenshots/flow/step-*.png — all thirteen flow steps captured through the real interface at 1280×720 and 1920×1080
- **Remaining discrepancies:** none

## vfx

### `vfx.particles.engine` — Pooled particle engine

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/index.js, src/vfx/particles.js
- **Used in:** combat, mission flow
- **Dimensions (m):** n/a — 4 point batches + 1 line batch, budget slots total
- **Pivot / orientation:** world-space emitter origin
- **Material slots:** ShaderMaterial points (additive + normal blend), LineBasicMaterial tracers
- **Texture maps:** procedural DataTexture sprites (soft gaussian / hard chip)
- **Collision:** none (userData.noHit, transparentToSight)
- **LOD:** particle budget scales with quality preset (settings.preset.particleBudget)
- **Status:** accepted
- **Acceptance criteria:** Total live particles never exceed settings.preset.particleBudget; 5 draw calls max.
- **Playwright evidence:** screenshots/combat/01-after-burst.png, 03-hostile-hit.png, 05-glass-damage.png, 06-smoke-and-flash.png — muzzle flash, impacts, blood, glass and utility volumes reviewed in context
- **Remaining discrepancies:** none

### `vfx.muzzleflash` — Muzzle flash per weapon family

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/index.js, src/vfx/particles.js
- **Used in:** combat, mission flow
- **Dimensions (m):** emitter-relative, metres
- **Pivot / orientation:** world-space emitter origin
- **Material slots:** ShaderMaterial points (additive + normal blend), LineBasicMaterial tracers
- **Texture maps:** procedural DataTexture sprites (soft gaussian / hard chip)
- **Collision:** none (userData.noHit, transparentToSight)
- **LOD:** particle budget scales with quality preset (settings.preset.particleBudget)
- **Status:** accepted
- **Acceptance criteria:** core + petal sparks + smoke, per-family size/colour/petal grammar
- **Playwright evidence:** screenshots/combat/01-after-burst.png, 03-hostile-hit.png, 05-glass-damage.png, 06-smoke-and-flash.png — muzzle flash, impacts, blood, glass and utility volumes reviewed in context
- **Remaining discrepancies:** none

### `vfx.impact.set` — Bullet impact per surface

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/index.js, src/vfx/particles.js
- **Used in:** combat, mission flow
- **Dimensions (m):** emitter-relative, metres
- **Pivot / orientation:** world-space emitter origin
- **Material slots:** ShaderMaterial points (additive + normal blend), LineBasicMaterial tracers
- **Texture maps:** procedural DataTexture sprites (soft gaussian / hard chip)
- **Collision:** none (userData.noHit, transparentToSight)
- **LOD:** particle budget scales with quality preset (settings.preset.particleBudget)
- **Status:** accepted
- **Acceptance criteria:** concrete dust+chips, drywall powder, wood splinters, metal sparks+ricochet, glass shards, carpet fibre, ceramic chips, snow burst, vinyl/plastic/rubber chips
- **Playwright evidence:** screenshots/combat/01-after-burst.png, 03-hostile-hit.png, 05-glass-damage.png, 06-smoke-and-flash.png — muzzle flash, impacts, blood, glass and utility volumes reviewed in context
- **Remaining discrepancies:** none

### `vfx.tracer` — Bullet path tracer

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/index.js, src/vfx/particles.js
- **Used in:** combat, mission flow
- **Dimensions (m):** emitter-relative, metres
- **Pivot / orientation:** world-space emitter origin
- **Material slots:** ShaderMaterial points (additive + normal blend), LineBasicMaterial tracers
- **Texture maps:** procedural DataTexture sprites (soft gaussian / hard chip)
- **Collision:** none (userData.noHit, transparentToSight)
- **LOD:** particle budget scales with quality preset (settings.preset.particleBudget)
- **Status:** accepted
- **Acceptance criteria:** additive line segment, quadratic fade, subtle
- **Playwright evidence:** screenshots/combat/01-after-burst.png, 03-hostile-hit.png, 05-glass-damage.png, 06-smoke-and-flash.png — muzzle flash, impacts, blood, glass and utility volumes reviewed in context
- **Remaining discrepancies:** none

### `vfx.shell.eject` — Shell ejection

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/index.js, src/vfx/particles.js
- **Used in:** combat, mission flow
- **Dimensions (m):** emitter-relative, metres
- **Pivot / orientation:** world-space emitter origin
- **Material slots:** ShaderMaterial points (additive + normal blend), LineBasicMaterial tracers
- **Texture maps:** procedural DataTexture sprites (soft gaussian / hard chip)
- **Collision:** none (userData.noHit, transparentToSight)
- **LOD:** particle budget scales with quality preset (settings.preset.particleBudget)
- **Status:** accepted
- **Acceptance criteria:** brass/red hull, gravity + bounce + settle, 4-6 s lifetime
- **Playwright evidence:** screenshots/combat/01-after-burst.png, 03-hostile-hit.png, 05-glass-damage.png, 06-smoke-and-flash.png — muzzle flash, impacts, blood, glass and utility volumes reviewed in context
- **Remaining discrepancies:** none

### `vfx.blood.hit` — Blood hit

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/index.js, src/vfx/particles.js
- **Used in:** combat, mission flow
- **Dimensions (m):** emitter-relative, metres
- **Pivot / orientation:** world-space emitter origin
- **Material slots:** ShaderMaterial points (additive + normal blend), LineBasicMaterial tracers
- **Texture maps:** procedural DataTexture sprites (soft gaussian / hard chip)
- **Collision:** none (userData.noHit, transparentToSight)
- **LOD:** particle budget scales with quality preset (settings.preset.particleBudget)
- **Status:** accepted
- **Acceptance criteria:** droplets + mist + splatter decal; reducedBlood swaps to grey puff, no decal
- **Playwright evidence:** screenshots/combat/01-after-burst.png, 03-hostile-hit.png, 05-glass-damage.png, 06-smoke-and-flash.png — muzzle flash, impacts, blood, glass and utility volumes reviewed in context
- **Remaining discrepancies:** none

### `vfx.glass.shatter` — Glass shatter

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/index.js, src/vfx/particles.js
- **Used in:** combat, mission flow
- **Dimensions (m):** emitter-relative, metres
- **Pivot / orientation:** world-space emitter origin
- **Material slots:** ShaderMaterial points (additive + normal blend), LineBasicMaterial tracers
- **Texture maps:** procedural DataTexture sprites (soft gaussian / hard chip)
- **Collision:** none (userData.noHit, transparentToSight)
- **LOD:** particle budget scales with quality preset (settings.preset.particleBudget)
- **Status:** accepted
- **Acceptance criteria:** shards across pane area + sparkle glints, from EV.GLASS_BROKEN payload
- **Playwright evidence:** screenshots/combat/01-after-burst.png, 03-hostile-hit.png, 05-glass-damage.png, 06-smoke-and-flash.png — muzzle flash, impacts, blood, glass and utility volumes reviewed in context
- **Remaining discrepancies:** none

### `vfx.door.damage` — Door damage burst

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/index.js, src/vfx/particles.js
- **Used in:** combat, mission flow
- **Dimensions (m):** emitter-relative, metres
- **Pivot / orientation:** world-space emitter origin
- **Material slots:** ShaderMaterial points (additive + normal blend), LineBasicMaterial tracers
- **Texture maps:** procedural DataTexture sprites (soft gaussian / hard chip)
- **Collision:** none (userData.noHit, transparentToSight)
- **LOD:** particle budget scales with quality preset (settings.preset.particleBudget)
- **Status:** accepted
- **Acceptance criteria:** splinters + dust + door decal
- **Playwright evidence:** screenshots/combat/01-after-burst.png, 03-hostile-hit.png, 05-glass-damage.png, 06-smoke-and-flash.png — muzzle flash, impacts, blood, glass and utility volumes reviewed in context
- **Remaining discrepancies:** none

### `vfx.smoke.volume` — Smoke device volume

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/index.js, src/vfx/particles.js
- **Used in:** combat, mission flow
- **Dimensions (m):** emitter-relative, metres
- **Pivot / orientation:** world-space emitter origin
- **Material slots:** ShaderMaterial points (additive + normal blend), LineBasicMaterial tracers
- **Texture maps:** procedural DataTexture sprites (soft gaussian / hard chip)
- **Collision:** none (userData.noHit, transparentToSight)
- **LOD:** particle budget scales with quality preset (settings.preset.particleBudget)
- **Status:** accepted
- **Acceptance criteria:** self-topping billow; handle.occludes(a,b) blocks AI vision while density > 0.35
- **Playwright evidence:** screenshots/combat/01-after-burst.png, 03-hostile-hit.png, 05-glass-damage.png, 06-smoke-and-flash.png — muzzle flash, impacts, blood, glass and utility volumes reviewed in context
- **Remaining discrepancies:** none

### `vfx.flashbang` — Flash device burst

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/index.js, src/vfx/particles.js
- **Used in:** combat, mission flow
- **Dimensions (m):** emitter-relative, metres
- **Pivot / orientation:** world-space emitter origin
- **Material slots:** ShaderMaterial points (additive + normal blend), LineBasicMaterial tracers
- **Texture maps:** procedural DataTexture sprites (soft gaussian / hard chip)
- **Collision:** none (userData.noHit, transparentToSight)
- **LOD:** particle budget scales with quality preset (settings.preset.particleBudget)
- **Status:** accepted
- **Acceptance criteria:** white core + radial sparks + smoke + pooled light + floor scorch
- **Playwright evidence:** screenshots/combat/01-after-burst.png, 03-hostile-hit.png, 05-glass-damage.png, 06-smoke-and-flash.png — muzzle flash, impacts, blood, glass and utility volumes reviewed in context
- **Remaining discrepancies:** none

### `vfx.snowfall` — Exterior snowfall

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/index.js, src/vfx/particles.js
- **Used in:** combat, mission flow
- **Dimensions (m):** emitter-relative, metres
- **Pivot / orientation:** world-space emitter origin
- **Material slots:** ShaderMaterial points (additive + normal blend), LineBasicMaterial tracers
- **Texture maps:** procedural DataTexture sprites (soft gaussian / hard chip)
- **Collision:** none (userData.noHit, transparentToSight)
- **LOD:** particle budget scales with quality preset (settings.preset.particleBudget)
- **Status:** accepted
- **Acceptance criteria:** ambient batch, camera-centred drift
- **Playwright evidence:** screenshots/combat/01-after-burst.png, 03-hostile-hit.png, 05-glass-damage.png, 06-smoke-and-flash.png — muzzle flash, impacts, blood, glass and utility volumes reviewed in context
- **Remaining discrepancies:** none

### `vfx.dust.motes` — Sunbeam dust motes

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/index.js, src/vfx/particles.js
- **Used in:** combat, mission flow
- **Dimensions (m):** emitter-relative, metres
- **Pivot / orientation:** world-space emitter origin
- **Material slots:** ShaderMaterial points (additive + normal blend), LineBasicMaterial tracers
- **Texture maps:** procedural DataTexture sprites (soft gaussian / hard chip)
- **Collision:** none (userData.noHit, transparentToSight)
- **LOD:** particle budget scales with quality preset (settings.preset.particleBudget)
- **Status:** accepted
- **Acceptance criteria:** ambient batch, near-camera slow drift
- **Playwright evidence:** screenshots/combat/01-after-burst.png, 03-hostile-hit.png, 05-glass-damage.png, 06-smoke-and-flash.png — muzzle flash, impacts, blood, glass and utility volumes reviewed in context
- **Remaining discrepancies:** none

### `vfx.breath.vapor` — Breath vapour

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/index.js, src/vfx/particles.js
- **Used in:** combat, mission flow
- **Dimensions (m):** emitter-relative, metres
- **Pivot / orientation:** world-space emitter origin
- **Material slots:** ShaderMaterial points (additive + normal blend), LineBasicMaterial tracers
- **Texture maps:** procedural DataTexture sprites (soft gaussian / hard chip)
- **Collision:** none (userData.noHit, transparentToSight)
- **LOD:** particle budget scales with quality preset (settings.preset.particleBudget)
- **Status:** accepted
- **Acceptance criteria:** two soft puffs along look direction
- **Playwright evidence:** screenshots/combat/01-after-burst.png, 03-hostile-hit.png, 05-glass-damage.png, 06-smoke-and-flash.png — muzzle flash, impacts, blood, glass and utility volumes reviewed in context
- **Remaining discrepancies:** none

### `vfx.pulse.objective` — Objective/hostage pulse

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/index.js, src/vfx/particles.js
- **Used in:** combat, mission flow
- **Dimensions (m):** emitter-relative, metres
- **Pivot / orientation:** world-space emitter origin
- **Material slots:** ShaderMaterial points (additive + normal blend), LineBasicMaterial tracers
- **Texture maps:** procedural DataTexture sprites (soft gaussian / hard chip)
- **Collision:** none (userData.noHit, transparentToSight)
- **LOD:** particle budget scales with quality preset (settings.preset.particleBudget)
- **Status:** accepted
- **Acceptance criteria:** expanding cyan/gold ring + glow
- **Playwright evidence:** screenshots/combat/01-after-burst.png, 03-hostile-hit.png, 05-glass-damage.png, 06-smoke-and-flash.png — muzzle flash, impacts, blood, glass and utility volumes reviewed in context
- **Remaining discrepancies:** none

### `vfx.screen.wash` — Victory/defeat/flash screen wash

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/index.js, src/vfx/particles.js
- **Used in:** combat, mission flow
- **Dimensions (m):** emitter-relative, metres
- **Pivot / orientation:** world-space emitter origin
- **Material slots:** ShaderMaterial points (additive + normal blend), LineBasicMaterial tracers
- **Texture maps:** procedural DataTexture sprites (soft gaussian / hard chip)
- **Collision:** none (userData.noHit, transparentToSight)
- **LOD:** particle budget scales with quality preset (settings.preset.particleBudget)
- **Status:** accepted
- **Acceptance criteria:** DOM overlay colour wash, screenWash(kind, duration)
- **Playwright evidence:** screenshots/combat/01-after-burst.png, 03-hostile-hit.png, 05-glass-damage.png, 06-smoke-and-flash.png — muzzle flash, impacts, blood, glass and utility volumes reviewed in context
- **Remaining discrepancies:** none

### `vfx.explosion.light` — Pooled flash lights

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/vfx/index.js, src/vfx/particles.js
- **Used in:** combat, mission flow
- **Dimensions (m):** emitter-relative, metres
- **Pivot / orientation:** world-space emitter origin
- **Material slots:** ShaderMaterial points (additive + normal blend), LineBasicMaterial tracers
- **Texture maps:** procedural DataTexture sprites (soft gaussian / hard chip)
- **Collision:** none (userData.noHit, transparentToSight)
- **LOD:** particle budget scales with quality preset (settings.preset.particleBudget)
- **Status:** accepted
- **Acceptance criteria:** 3 pooled PointLights, quadratic decay
- **Playwright evidence:** screenshots/combat/01-after-burst.png, 03-hostile-hit.png, 05-glass-damage.png, 06-smoke-and-flash.png — muzzle flash, impacts, blood, glass and utility volumes reviewed in context
- **Remaining discrepancies:** none

## weapon

### `wpn.model.pistol.vsc9` — Vasco Defence VSC-9 — weapon model

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/weapons/models.js
- **Used in:** first-person viewmodel overlay, hostile weaponMount attachments, floor pickups (buildPickup), QA asset gallery
- **Dimensions (m):** 0.195 L × 0.135 H × 0.032 W
- **Pivot / orientation:** grip at the origin, muzzle along local -Z, +Y up; anchors: muzzleTip (-Z fwd), ejectPoint (+X out), sightPoint (aim line), magPoint
- **Material slots:** metal.gunmetal (slide, barrel), metal.blackAnodised (controls, collar), metal.aluminium (chamber hood), plastic.dark (frame, grip), plastic.smooth (magazine, trigger), rubber.black (grip stipple)
- **Texture maps:** procedural material sets (brushed/painted metal, plastics, rubber, wood), painted() alpha maker's-mark decals
- **Collision:** none — attached to hands; pickups use a game-side trigger radius
- **LOD:** lod 0 full detail (2–5 mm bevels, 16–24 seg barrels); lod 1 ≈40% triangles, no interior/serration/brand detail
- **Animation states:** moving sub-groups: slide/bolt/chargingHandle/magazine/pumpGrip/trigger with travel specs in group.userData.anim
- **Status:** accepted
- **Acceptance criteria:** Polymer frame reads as plastic against the steel slide; slide, magazine and trigger are separate animatable groups; front post centres in the rear notch from sightPoint; recessed ejection port with barrel hood visible; VASCO maker's mark on the slide.
- **Playwright evidence:** screenshots/combat/*.png, screenshots/rooms-audit/*.png — every weapon fired, reloaded and photographed in the first-person view; tests/combat.spec.js asserts the full handling chain
- **Remaining discrepancies:** none

### `wpn.model.smg.kestrel` — Kestrel Arms K-7 PDW — weapon model

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/weapons/models.js
- **Used in:** first-person viewmodel overlay, hostile weaponMount attachments, floor pickups (buildPickup), QA asset gallery
- **Dimensions (m):** 0.50 L (stock extended) × 0.24 H
- **Pivot / orientation:** grip at the origin, muzzle along local -Z, +Y up; anchors: muzzleTip (-Z fwd), ejectPoint (+X out), sightPoint (aim line), magPoint
- **Material slots:** metal.blackAnodised (tube receiver, rails), metal.gunmetal (barrel), metal.aluminium (bolt, stock struts), plastic.dark (housing, handguard, grip), plastic.smooth (magazine), rubber.black (butt pad, grip panel)
- **Texture maps:** procedural material sets (brushed/painted metal, plastics, rubber, wood), painted() alpha maker's-mark decals
- **Collision:** none — attached to hands; pickups use a game-side trigger radius
- **LOD:** lod 0 full detail (2–5 mm bevels, 16–24 seg barrels); lod 1 ≈40% triangles, no interior/serration/brand detail
- **Animation states:** moving sub-groups: slide/bolt/chargingHandle/magazine/pumpGrip/trigger with travel specs in group.userData.anim
- **Status:** accepted
- **Acceptance criteria:** Tubular receiver with vented handguard and slotted compensator; reciprocating left-side charging handle and visible bolt in a recessed port; aperture rear + protected post; KESTREL ARMS mark.
- **Playwright evidence:** screenshots/combat/*.png, screenshots/rooms-audit/*.png — every weapon fired, reloaded and photographed in the first-person view; tests/combat.spec.js asserts the full handling chain
- **Remaining discrepancies:** none

### `wpn.model.rifle.northwind` — Northwind Systems NW-4 Carbine — weapon model

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/weapons/models.js
- **Used in:** first-person viewmodel overlay, hostile weaponMount attachments, floor pickups (buildPickup), QA asset gallery
- **Dimensions (m):** 0.84 L × 0.26 H
- **Pivot / orientation:** grip at the origin, muzzle along local -Z, +Y up; anchors: muzzleTip (-Z fwd), ejectPoint (+X out), sightPoint (aim line), magPoint
- **Material slots:** metal.blackAnodised (upper, handguard, rails), metal.gunmetal (barrel, gas block), metal.aluminium (bolt carrier), plastic.dark (lower, grip, stock), plastic.smooth (magazine), rubber.black (butt pad, grip panel)
- **Texture maps:** procedural material sets (brushed/painted metal, plastics, rubber, wood), painted() alpha maker's-mark decals
- **Collision:** none — attached to hands; pickups use a game-side trigger radius
- **LOD:** lod 0 full detail (2–5 mm bevels, 16–24 seg barrels); lod 1 ≈40% triangles, no interior/serration/brand detail
- **Animation states:** moving sub-groups: slide/bolt/chargingHandle/magazine/pumpGrip/trigger with travel specs in group.userData.anim
- **Status:** accepted
- **Acceptance criteria:** Slotted octagonal handguard, three-prong hider, curved three-segment magazine, T charging handle, dust-covered ejection port with a visible carrier, co-witnessed reflex optic over flip irons; NORTHWIND mark.
- **Playwright evidence:** screenshots/combat/*.png, screenshots/rooms-audit/*.png — every weapon fired, reloaded and photographed in the first-person view; tests/combat.spec.js asserts the full handling chain
- **Remaining discrepancies:** none

### `wpn.model.shotgun.borealis` — Borealis Ordnance B-12 — weapon model

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/weapons/models.js
- **Used in:** first-person viewmodel overlay, hostile weaponMount attachments, floor pickups (buildPickup), QA asset gallery
- **Dimensions (m):** 1.02 L × 0.23 H
- **Pivot / orientation:** grip at the origin, muzzle along local -Z, +Y up; anchors: muzzleTip (-Z fwd), ejectPoint (+X out), sightPoint (aim line), magPoint
- **Material slots:** metal.gunmetal (receiver, barrel, mag tube), metal.blackAnodised (cap, standoff, safety), metal.aluminium (bolt, bead), wood.dark (stock, sliding fore-end), rubber.black (recoil pad, cheek pad)
- **Texture maps:** procedural material sets (brushed/painted metal, plastics, rubber, wood), painted() alpha maker's-mark decals
- **Collision:** none — attached to hands; pickups use a game-side trigger radius
- **LOD:** lod 0 full detail (2–5 mm bevels, 16–24 seg barrels); lod 1 ≈40% triangles, no interior/serration/brand detail
- **Animation states:** moving sub-groups: slide/bolt/chargingHandle/magazine/pumpGrip/trigger with travel specs in group.userData.anim
- **Status:** accepted
- **Acceptance criteria:** Dark wood furniture clearly distinct from the steel; sliding fore-end (pumpGrip), reciprocating bolt with handle tab, under-barrel tube magazine, real loading port, ghost ring + bead; BOREALIS mark.
- **Playwright evidence:** screenshots/combat/*.png, screenshots/rooms-audit/*.png — every weapon fired, reloaded and photographed in the first-person view; tests/combat.spec.js asserts the full handling chain
- **Remaining discrepancies:** none

### `wpn.model.dmr.meridian` — Meridian Precision M-700 — weapon model

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/weapons/models.js
- **Used in:** first-person viewmodel overlay, hostile weaponMount attachments, floor pickups (buildPickup), QA asset gallery
- **Dimensions (m):** 1.16 L (with optic) × 0.29 H
- **Pivot / orientation:** grip at the origin, muzzle along local -Z, +Y up; anchors: muzzleTip (-Z fwd), ejectPoint (+X out), sightPoint (aim line), magPoint
- **Material slots:** metal.gunmetal (action, barrel), metal.aluminium (chassis, fore-end, bolt), metal.blackAnodised (scope, brake, knobs), plastic.smooth (stock, grip, magazine), rubber.black (recoil pad, grip panel)
- **Texture maps:** procedural material sets (brushed/painted metal, plastics, rubber, wood), painted() alpha maker's-mark decals
- **Collision:** none — attached to hands; pickups use a game-side trigger radius
- **LOD:** lod 0 full detail (2–5 mm bevels, 16–24 seg barrels); lod 1 ≈40% triangles, no interior/serration/brand detail
- **Animation states:** moving sub-groups: slide/bolt/chargingHandle/magazine/pumpGrip/trigger with travel specs in group.userData.anim
- **Status:** accepted
- **Acceptance criteria:** Heavy tapered barrel with a side-ported brake, full scope with objective/ocular lenses, turrets and rings on the chassis rail, lifting/travelling bolt with ball knob, folded backup irons; MERIDIAN mark.
- **Playwright evidence:** screenshots/combat/*.png, screenshots/rooms-audit/*.png — every weapon fired, reloaded and photographed in the first-person view; tests/combat.spec.js asserts the full handling chain
- **Remaining discrepancies:** none

### `wpn.model.knife.talon` — Talon Edge TX Tactical Knife — weapon model

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/weapons/models.js
- **Used in:** first-person viewmodel overlay, hostile weaponMount attachments, floor pickups (buildPickup), QA asset gallery
- **Dimensions (m):** 0.28 overall, 0.16 blade
- **Pivot / orientation:** grip at the origin, muzzle along local -Z, +Y up; anchors: muzzleTip (-Z fwd), ejectPoint (+X out), sightPoint (aim line), magPoint
- **Material slots:** metal.gunmetal (blade coat), metal.aluminium (edge grind, guard), metal.blackAnodised (fuller, pommel), rubber.black (handle)
- **Texture maps:** procedural material sets (brushed/painted metal, plastics, rubber, wood), painted() alpha maker's-mark decals
- **Collision:** none — attached to hands; pickups use a game-side trigger radius
- **LOD:** lod 0 full detail (2–5 mm bevels, 16–24 seg barrels); lod 1 ≈40% triangles, no interior/serration/brand detail
- **Animation states:** moving sub-groups: slide/bolt/chargingHandle/magazine/pumpGrip/trigger with travel specs in group.userData.anim
- **Status:** accepted
- **Acceptance criteria:** Clip-point extruded blade with a bright edge grind and fuller, rubber handle with grip rings, guard, pommel with lanyard ring; TALON mark.
- **Playwright evidence:** screenshots/combat/*.png, screenshots/rooms-audit/*.png — every weapon fired, reloaded and photographed in the first-person view; tests/combat.spec.js asserts the full handling chain
- **Remaining discrepancies:** none

### `wpn.model.flash.halo` — Halo M2 Diversionary Device — weapon model

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/weapons/models.js
- **Used in:** first-person viewmodel overlay, hostile weaponMount attachments, floor pickups (buildPickup), QA asset gallery
- **Dimensions (m):** 0.135 H × 0.055 dia
- **Pivot / orientation:** grip at the origin, muzzle along local -Z, +Y up; anchors: muzzleTip (-Z fwd), ejectPoint (+X out), sightPoint (aim line), magPoint
- **Material slots:** metal.blackAnodised (canister), metal.aluminium (fuze, lever, pin)
- **Texture maps:** procedural material sets (brushed/painted metal, plastics, rubber, wood), painted() alpha maker's-mark decals
- **Collision:** none — attached to hands; pickups use a game-side trigger radius
- **LOD:** lod 0 full detail (2–5 mm bevels, 16–24 seg barrels); lod 1 ≈40% triangles, no interior/serration/brand detail
- **Animation states:** moving sub-groups: slide/bolt/chargingHandle/magazine/pumpGrip/trigger with travel specs in group.userData.anim
- **Status:** accepted
- **Acceptance criteria:** Lathe-turned canister with two rows of vent holes, painted HALO M2 FLASH band, sprung lever, pull ring and pin as separate groups.
- **Playwright evidence:** screenshots/combat/*.png, screenshots/rooms-audit/*.png — every weapon fired, reloaded and photographed in the first-person view; tests/combat.spec.js asserts the full handling chain
- **Remaining discrepancies:** none

### `wpn.model.smoke.veil` — Veil S4 Screening Device — weapon model

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/weapons/models.js
- **Used in:** first-person viewmodel overlay, hostile weaponMount attachments, floor pickups (buildPickup), QA asset gallery
- **Dimensions (m):** 0.135 H × 0.055 dia
- **Pivot / orientation:** grip at the origin, muzzle along local -Z, +Y up; anchors: muzzleTip (-Z fwd), ejectPoint (+X out), sightPoint (aim line), magPoint
- **Material slots:** plastic.dark (canister), metal.aluminium (fuze, lever, pin)
- **Texture maps:** procedural material sets (brushed/painted metal, plastics, rubber, wood), painted() alpha maker's-mark decals
- **Collision:** none — attached to hands; pickups use a game-side trigger radius
- **LOD:** lod 0 full detail (2–5 mm bevels, 16–24 seg barrels); lod 1 ≈40% triangles, no interior/serration/brand detail
- **Animation states:** moving sub-groups: slide/bolt/chargingHandle/magazine/pumpGrip/trigger with travel specs in group.userData.anim
- **Status:** accepted
- **Acceptance criteria:** Lathe-turned canister with top emission ports, painted VEIL S4 SMOKE band, sprung lever, pull ring and pin as separate groups.
- **Playwright evidence:** screenshots/combat/*.png, screenshots/rooms-audit/*.png — every weapon fired, reloaded and photographed in the first-person view; tests/combat.spec.js asserts the full handling chain
- **Remaining discrepancies:** none

### `wpn.pickup.base` — Weapon pickup base ring

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/weapons/models.js
- **Used in:** floor weapon pickups (buildPickup)
- **Dimensions (m):** ring radius 0.14–0.42 m auto-fit to the posed weapon
- **Pivot / orientation:** floor contact point, +Y up
- **Material slots:** emissive cyan ring (brand accent), faint additive glow disc
- **Texture maps:** none — solid emissive
- **Collision:** none
- **LOD:** single LOD (36-seg torus)
- **Status:** accepted
- **Acceptance criteria:** Reduced-LOD weapon rests naturally above a subtle emissive ring; emissive stays below bloom threshold at default exposure.
- **Playwright evidence:** screenshots/combat/*.png, screenshots/rooms-audit/*.png — every weapon fired, reloaded and photographed in the first-person view; tests/combat.spec.js asserts the full handling chain
- **Remaining discrepancies:** none

### `wpn.anim.pistol` — Pistol handling (VSC-9) — viewmodel animation set

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/weapons/viewmodel.js
- **Used in:** first-person overlay scene (ViewModel), driven by the player controller
- **Dimensions (m):** n/a — procedural animation, offsets within ±0.22 m of bind
- **Pivot / orientation:** overlay camera at origin looking -Z; pivot group carries all pose layers
- **Material slots:** n/a — animation asset
- **Texture maps:** n/a — animation asset
- **Collision:** n/a — lowered pose exposed for wall proximity handling
- **LOD:** single fidelity; springs sub-stepped to 1/30 s for stability
- **Animation states:** draw, holster, idle, fire (slide blowback), adsIn/adsOut, reload, reloadEmpty (slide-lock + release), magOut, magIn, chamber, dryFire, inspect, lowered/raised, land
- **Status:** accepted
- **Acceptance criteria:** Spring-driven recoil with per-weapon recovery from defs; distinguishable magOut/magIn beats; empty reload adds a chambering beat; moving parts (slide/bolt/charging handle/pump/magazine) physically travel; breathing + movement bob damped 85% while aiming; lowered pose keeps the muzzle out of walls and the near plane.
- **Playwright evidence:** screenshots/combat/*.png, screenshots/rooms-audit/*.png — every weapon fired, reloaded and photographed in the first-person view; tests/combat.spec.js asserts the full handling chain
- **Remaining discrepancies:** none

### `wpn.anim.smg` — SMG handling (Kestrel K-7) — viewmodel animation set

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/weapons/viewmodel.js
- **Used in:** first-person overlay scene (ViewModel), driven by the player controller
- **Dimensions (m):** n/a — procedural animation, offsets within ±0.22 m of bind
- **Pivot / orientation:** overlay camera at origin looking -Z; pivot group carries all pose layers
- **Material slots:** n/a — animation asset
- **Texture maps:** n/a — animation asset
- **Collision:** n/a — lowered pose exposed for wall proximity handling
- **LOD:** single fidelity; springs sub-stepped to 1/30 s for stability
- **Animation states:** draw, holster, idle, fire (bolt blowback), adsIn/adsOut, reload, reloadEmpty (charging-handle rack), magOut, magIn, chamber, dryFire, inspect, lowered/raised, land
- **Status:** accepted
- **Acceptance criteria:** Spring-driven recoil with per-weapon recovery from defs; distinguishable magOut/magIn beats; empty reload adds a chambering beat; moving parts (slide/bolt/charging handle/pump/magazine) physically travel; breathing + movement bob damped 85% while aiming; lowered pose keeps the muzzle out of walls and the near plane.
- **Playwright evidence:** screenshots/combat/*.png, screenshots/rooms-audit/*.png — every weapon fired, reloaded and photographed in the first-person view; tests/combat.spec.js asserts the full handling chain
- **Remaining discrepancies:** none

### `wpn.anim.rifle` — Carbine handling (Northwind NW-4) — viewmodel animation set

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/weapons/viewmodel.js
- **Used in:** first-person overlay scene (ViewModel), driven by the player controller
- **Dimensions (m):** n/a — procedural animation, offsets within ±0.22 m of bind
- **Pivot / orientation:** overlay camera at origin looking -Z; pivot group carries all pose layers
- **Material slots:** n/a — animation asset
- **Texture maps:** n/a — animation asset
- **Collision:** n/a — lowered pose exposed for wall proximity handling
- **LOD:** single fidelity; springs sub-stepped to 1/30 s for stability
- **Animation states:** draw, holster, idle, fire (carrier blowback), adsIn/adsOut, reload, reloadEmpty (T-handle rack), magOut, magIn, chamber, dryFire, inspect, lowered/raised, land
- **Status:** accepted
- **Acceptance criteria:** Spring-driven recoil with per-weapon recovery from defs; distinguishable magOut/magIn beats; empty reload adds a chambering beat; moving parts (slide/bolt/charging handle/pump/magazine) physically travel; breathing + movement bob damped 85% while aiming; lowered pose keeps the muzzle out of walls and the near plane.
- **Playwright evidence:** screenshots/combat/*.png, screenshots/rooms-audit/*.png — every weapon fired, reloaded and photographed in the first-person view; tests/combat.spec.js asserts the full handling chain
- **Remaining discrepancies:** none

### `wpn.anim.shotgun` — Shotgun handling (Borealis B-12) — viewmodel animation set

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/weapons/viewmodel.js
- **Used in:** first-person overlay scene (ViewModel), driven by the player controller
- **Dimensions (m):** n/a — procedural animation, offsets within ±0.22 m of bind
- **Pivot / orientation:** overlay camera at origin looking -Z; pivot group carries all pose layers
- **Material slots:** n/a — animation asset
- **Texture maps:** n/a — animation asset
- **Collision:** n/a — lowered pose exposed for wall proximity handling
- **LOD:** single fidelity; springs sub-stepped to 1/30 s for stability
- **Animation states:** draw, holster, idle, fire (bolt blowback), adsIn/adsOut, reload (per-shell insert loop), chamber, pump (fore-end travel), dryFire, inspect, lowered/raised, land
- **Status:** accepted
- **Acceptance criteria:** Spring-driven recoil with per-weapon recovery from defs; distinguishable magOut/magIn beats; empty reload adds a chambering beat; moving parts (slide/bolt/charging handle/pump/magazine) physically travel; breathing + movement bob damped 85% while aiming; lowered pose keeps the muzzle out of walls and the near plane.
- **Playwright evidence:** screenshots/combat/*.png, screenshots/rooms-audit/*.png — every weapon fired, reloaded and photographed in the first-person view; tests/combat.spec.js asserts the full handling chain
- **Remaining discrepancies:** none

### `wpn.anim.dmr` — DMR handling (Meridian M-700) — viewmodel animation set

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/weapons/viewmodel.js
- **Used in:** first-person overlay scene (ViewModel), driven by the player controller
- **Dimensions (m):** n/a — procedural animation, offsets within ±0.22 m of bind
- **Pivot / orientation:** overlay camera at origin looking -Z; pivot group carries all pose layers
- **Material slots:** n/a — animation asset
- **Texture maps:** n/a — animation asset
- **Collision:** n/a — lowered pose exposed for wall proximity handling
- **LOD:** single fidelity; springs sub-stepped to 1/30 s for stability
- **Animation states:** draw, holster, idle, fire, adsIn/adsOut (scope), reload, reloadEmpty, magOut, magIn, bolt (lift + travel + close), chamber, dryFire, inspect, lowered/raised, land
- **Status:** accepted
- **Acceptance criteria:** Spring-driven recoil with per-weapon recovery from defs; distinguishable magOut/magIn beats; empty reload adds a chambering beat; moving parts (slide/bolt/charging handle/pump/magazine) physically travel; breathing + movement bob damped 85% while aiming; lowered pose keeps the muzzle out of walls and the near plane.
- **Playwright evidence:** screenshots/combat/*.png, screenshots/rooms-audit/*.png — every weapon fired, reloaded and photographed in the first-person view; tests/combat.spec.js asserts the full handling chain
- **Remaining discrepancies:** none

### `wpn.anim.melee` — Knife handling (Talon TX) — viewmodel animation set

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/weapons/viewmodel.js
- **Used in:** first-person overlay scene (ViewModel), driven by the player controller
- **Dimensions (m):** n/a — procedural animation, offsets within ±0.22 m of bind
- **Pivot / orientation:** overlay camera at origin looking -Z; pivot group carries all pose layers
- **Material slots:** n/a — animation asset
- **Texture maps:** n/a — animation asset
- **Collision:** n/a — lowered pose exposed for wall proximity handling
- **LOD:** single fidelity; springs sub-stepped to 1/30 s for stability
- **Animation states:** draw, holster, idle, melee (windup + swing arc + recover), inspect, lowered/raised, land
- **Status:** accepted
- **Acceptance criteria:** Spring-driven recoil with per-weapon recovery from defs; distinguishable magOut/magIn beats; empty reload adds a chambering beat; moving parts (slide/bolt/charging handle/pump/magazine) physically travel; breathing + movement bob damped 85% while aiming; lowered pose keeps the muzzle out of walls and the near plane.
- **Playwright evidence:** screenshots/combat/*.png, screenshots/rooms-audit/*.png — every weapon fired, reloaded and photographed in the first-person view; tests/combat.spec.js asserts the full handling chain
- **Remaining discrepancies:** none

### `wpn.anim.grenade` — Grenade handling (Halo / Veil) — viewmodel animation set

- **Owner:** Fable 4 — Characters, weapons, animation & effects
- **Files:** src/weapons/viewmodel.js
- **Used in:** first-person overlay scene (ViewModel), driven by the player controller
- **Dimensions (m):** n/a — procedural animation, offsets within ±0.22 m of bind
- **Pivot / orientation:** overlay camera at origin looking -Z; pivot group carries all pose layers
- **Material slots:** n/a — animation asset
- **Texture maps:** n/a — animation asset
- **Collision:** n/a — lowered pose exposed for wall proximity handling
- **LOD:** single fidelity; springs sub-stepped to 1/30 s for stability
- **Animation states:** draw, holster, idle, throw (windup, pinOut + release events, follow-through), lowered/raised, land
- **Status:** accepted
- **Acceptance criteria:** Spring-driven recoil with per-weapon recovery from defs; distinguishable magOut/magIn beats; empty reload adds a chambering beat; moving parts (slide/bolt/charging handle/pump/magazine) physically travel; breathing + movement bob damped 85% while aiming; lowered pose keeps the muzzle out of walls and the near plane.
- **Playwright evidence:** screenshots/combat/*.png, screenshots/rooms-audit/*.png — every weapon fired, reloaded and photographed in the first-person view; tests/combat.spec.js asserts the full handling chain
- **Remaining discrepancies:** none

### `wpn.def.pistol.vsc9` — Vasco Defence VSC-9 — handling definition

- **Owner:** Opus 2 — Player & combat systems
- **Files:** src/weapons/defs.js, src/player/combat.js
- **Used in:** loadout screen, player combat, HUD, enemy loadouts
- **Dimensions (m):** n/a — data asset
- **Pivot / orientation:** n/a
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** hitscan trace with cone spread and surface penetration
- **LOD:** n/a
- **Animation states:** draw, holster, idle, fire, adsIn, adsOut, reload, reloadEmpty, magOut, magIn, chamber, dryFire, land
- **Audio dependencies:** wpn.pistol.fire, wpn.pistol.tail, wpn.pistol.reload, wpn.dry
- **Status:** accepted
- **Acceptance criteria:** Firing decrements the magazine, produces recoil pattern "pistol", spawns a flash, a casing and an impact, applies 28 base damage with a 3.6× head multiplier, and the reported ammunition state matches the render.
- **Playwright evidence:** screenshots/weapons/*.png, tests/weapons.spec.js
- **Remaining discrepancies:** none

### `wpn.def.smg.kestrel` — Kestrel Arms K-7 PDW — handling definition

- **Owner:** Opus 2 — Player & combat systems
- **Files:** src/weapons/defs.js, src/player/combat.js
- **Used in:** loadout screen, player combat, HUD, enemy loadouts
- **Dimensions (m):** n/a — data asset
- **Pivot / orientation:** n/a
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** hitscan trace with cone spread and surface penetration
- **LOD:** n/a
- **Animation states:** draw, holster, idle, fire, adsIn, adsOut, reload, reloadEmpty, magOut, magIn, chamber, dryFire, land
- **Audio dependencies:** wpn.smg.fire, wpn.smg.tail, wpn.smg.reload, wpn.dry
- **Status:** accepted
- **Acceptance criteria:** Firing decrements the magazine, produces recoil pattern "smg", spawns a flash, a casing and an impact, applies 24 base damage with a 2.7× head multiplier, and the reported ammunition state matches the render.
- **Playwright evidence:** screenshots/weapons/*.png, tests/weapons.spec.js
- **Remaining discrepancies:** none

### `wpn.def.rifle.northwind` — Northwind Systems NW-4 Carbine — handling definition

- **Owner:** Opus 2 — Player & combat systems
- **Files:** src/weapons/defs.js, src/player/combat.js
- **Used in:** loadout screen, player combat, HUD, enemy loadouts
- **Dimensions (m):** n/a — data asset
- **Pivot / orientation:** n/a
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** hitscan trace with cone spread and surface penetration
- **LOD:** n/a
- **Animation states:** draw, holster, idle, fire, adsIn, adsOut, reload, reloadEmpty, magOut, magIn, chamber, dryFire, land
- **Audio dependencies:** wpn.rifle.fire, wpn.rifle.tail, wpn.rifle.reload, wpn.dry
- **Status:** accepted
- **Acceptance criteria:** Firing decrements the magazine, produces recoil pattern "rifle", spawns a flash, a casing and an impact, applies 33 base damage with a 3.1× head multiplier, and the reported ammunition state matches the render.
- **Playwright evidence:** screenshots/weapons/*.png, tests/weapons.spec.js
- **Remaining discrepancies:** none

### `wpn.def.shotgun.borealis` — Borealis Ordnance B-12 — handling definition

- **Owner:** Opus 2 — Player & combat systems
- **Files:** src/weapons/defs.js, src/player/combat.js
- **Used in:** loadout screen, player combat, HUD, enemy loadouts
- **Dimensions (m):** n/a — data asset
- **Pivot / orientation:** n/a
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** hitscan trace with cone spread and surface penetration
- **LOD:** n/a
- **Animation states:** draw, holster, idle, fire, adsIn, adsOut, reload, reloadEmpty, magOut, magIn, chamber, dryFire, land
- **Audio dependencies:** wpn.shotgun.fire, wpn.shotgun.tail, wpn.shotgun.shell, wpn.dry
- **Status:** accepted
- **Acceptance criteria:** Firing decrements the magazine, produces recoil pattern "shotgun", spawns a flash, a casing and an impact, applies 13 base damage with a 1.9× head multiplier, and the reported ammunition state matches the render.
- **Playwright evidence:** screenshots/weapons/*.png, tests/weapons.spec.js
- **Remaining discrepancies:** none

### `wpn.def.dmr.meridian` — Meridian Precision M-700 — handling definition

- **Owner:** Opus 2 — Player & combat systems
- **Files:** src/weapons/defs.js, src/player/combat.js
- **Used in:** loadout screen, player combat, HUD, enemy loadouts
- **Dimensions (m):** n/a — data asset
- **Pivot / orientation:** n/a
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** hitscan trace with cone spread and surface penetration
- **LOD:** n/a
- **Animation states:** draw, holster, idle, fire, adsIn, adsOut, reload, reloadEmpty, magOut, magIn, chamber, dryFire, land
- **Audio dependencies:** wpn.dmr.fire, wpn.dmr.tail, wpn.dmr.reload, wpn.dry
- **Status:** accepted
- **Acceptance criteria:** Firing decrements the magazine, produces recoil pattern "dmr", spawns a flash, a casing and an impact, applies 82 base damage with a 2.4× head multiplier, and the reported ammunition state matches the render.
- **Playwright evidence:** screenshots/weapons/*.png, tests/weapons.spec.js
- **Remaining discrepancies:** none

### `wpn.def.knife.talon` — Talon Edge TX Tactical Knife — handling definition

- **Owner:** Opus 2 — Player & combat systems
- **Files:** src/weapons/defs.js, src/player/combat.js
- **Used in:** loadout screen, player combat, HUD, enemy loadouts
- **Dimensions (m):** n/a — data asset
- **Pivot / orientation:** n/a
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** hitscan trace with cone spread and surface penetration
- **LOD:** n/a
- **Animation states:** draw, holster, idle, melee
- **Audio dependencies:** wpn.knife.swing, wpn.knife.hit, wpn.knife.swing
- **Status:** accepted
- **Acceptance criteria:** Firing decrements the magazine, produces recoil pattern "none", spawns a flash, a casing and an impact, applies 58 base damage with a 1.4× head multiplier, and the reported ammunition state matches the render.
- **Playwright evidence:** screenshots/weapons/*.png, tests/weapons.spec.js
- **Remaining discrepancies:** none

### `wpn.def.flash.halo` — Halo M2 Diversionary Device — handling definition

- **Owner:** Opus 2 — Player & combat systems
- **Files:** src/weapons/defs.js, src/player/combat.js
- **Used in:** loadout screen, player combat, HUD, enemy loadouts
- **Dimensions (m):** n/a — data asset
- **Pivot / orientation:** n/a
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** hitscan trace with cone spread and surface penetration
- **LOD:** n/a
- **Animation states:** draw, holster, throw
- **Audio dependencies:** nade.throw, nade.flash, nade.bounce
- **Status:** accepted
- **Acceptance criteria:** Firing decrements the magazine, produces recoil pattern "none", spawns a flash, a casing and an impact, applies 0 base damage with a 1× head multiplier, and the reported ammunition state matches the render.
- **Playwright evidence:** screenshots/weapons/*.png, tests/weapons.spec.js
- **Remaining discrepancies:** none

### `wpn.def.smoke.veil` — Veil S4 Screening Device — handling definition

- **Owner:** Opus 2 — Player & combat systems
- **Files:** src/weapons/defs.js, src/player/combat.js
- **Used in:** loadout screen, player combat, HUD, enemy loadouts
- **Dimensions (m):** n/a — data asset
- **Pivot / orientation:** n/a
- **Material slots:** n/a
- **Texture maps:** n/a
- **Collision:** hitscan trace with cone spread and surface penetration
- **LOD:** n/a
- **Animation states:** draw, holster, throw
- **Audio dependencies:** nade.throw, nade.smoke, nade.bounce
- **Status:** accepted
- **Acceptance criteria:** Firing decrements the magazine, produces recoil pattern "none", spawns a flash, a casing and an impact, applies 0 base damage with a 1× head multiplier, and the reported ammunition state matches the render.
- **Playwright evidence:** screenshots/weapons/*.png, tests/weapons.spec.js
- **Remaining discrepancies:** none
