# Playwright Scenario Checklist (Opus 4)

Matrix of automated scenarios. Every scenario captures screenshots +
`render_game_to_text()` output into `artifacts/` and fails on any console error.

## Boot & shell
- [ ] S01 Boot: page loads, no console errors, canvas present, title screen rendered
- [ ] S02 Menu flow: title → settings (change & persist) → back
- [ ] S03 Full pre-game flow: difficulty → briefing → loadout → loading → spawn
- [ ] S04 Pause/resume; Esc handling; menu never traps the player
- [ ] S05 Fullscreen request on F (headless-safe assertion), resize 1920×1080 & 1280×720
- [ ] S06 Quality settings switch (Low/Med/High/Ultra) without errors; resolution scale

## Core gameplay chains
- [ ] S10 Movement: WASD displaces player; crouch changes eye height & speed; jump arcs
- [ ] S11 Collision: cannot leave map, cannot pass walls/closed doors; stairs walkable
- [ ] S12 Fire chain: ammo decreases, recoil applied, impact FX + decal, state updated
- [ ] S13 Reload chain: partial & empty reloads restore correct magazine/reserve
- [ ] S14 Weapon switching: slots 1–4, draw/holster states, HUD updates
- [ ] S15 Enemy damage chain: hits reduce enemy health, kill ends behavior, KIA counter
- [ ] S16 Player damage chain: enemy fire reduces armor→health; death → defeat screen
- [ ] S17 Door chain: interact opens/closes, collision + nav + text state track visual
- [ ] S18 Hostage chain: interact → following → waits on command → reaches extraction
- [ ] S19 Extraction chain: both hostages in zone → countdown → victory screen
- [ ] S20 Defeat paths: player death; mission timer expiry
- [ ] S21 Restart chain: full state reset (enemies, hostages, ammo, timer, doors, decals)
- [ ] S22 Determinism: same seed + same advanceTime script ⇒ identical state hash

## AI
- [ ] S30 Patrols move along routes; never permanently stuck (watchdog)
- [ ] S31 Hearing: gunshot draws investigation
- [ ] S32 Vision: LOS acquisition respects walls (no wallhack assertions)
- [ ] S33 Search after losing player; return to patrol
- [ ] S34 Difficulty scaling changes perception/accuracy/count

## Visual evidence
- [ ] S40 Screenshot matrix: every required room from repeatable cameras
- [ ] S41 Asset gallery pages screenshot sweep
- [ ] S42 Weapon gallery: each weapon idle/fire/reload states
- [ ] S43 Character gallery: enemy variants, hostages, animation states
- [ ] S44 Lighting scenarios (day/emergency/service) via QA hooks
- [ ] S45 Graybox-vs-final comparison shots from identical cameras

## Performance & quality
- [ ] S50 Frame-time sample in five hot areas at Medium (headless indicative only)
- [ ] S51 Draw-call / triangle budget report
- [ ] S52 No console errors across the entire matrix (aggregate gate)
