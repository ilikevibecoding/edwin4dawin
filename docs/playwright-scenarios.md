# Playwright Scenario Checklist (Opus 4)

Automated matrix in `tests/`. Every scenario asserts on `render_game_to_text()` and
fails on any console/page error. Evidence screenshots in `artifacts/shots/**`.

## Boot & shell — `tests/smoke.spec.ts`
- [x] S01 Boot: title renders, no console errors, canvas present, registry populated
- [x] S02 Menu flow: settings change persists to localStorage
- [x] S03 Full pre-game flow: title → difficulty → briefing → loadout → playing (DOM clicks)
- [x] S04 Pause/resume; menu never traps the player
- [x] S05 Resize 1920×1080 ↔ 1280×720, canvas + camera track
- [x] S06 Quality settings switch Low→High without errors
- [x] S22 Determinism: same seed + same input script ⇒ identical state (players, enemies, ammo)

## Core gameplay chains — `tests/gameplay.spec.ts`
- [x] S10 Movement: WASD displacement, crouch toggle & state, jump air/land
- [x] S11 Collision: walls stop movement; lobby stair climbs to balcony (y > 3.4)
- [x] S12 Fire chain: ammo decreases, impacts fire, state updates
- [x] S13 Reload chain: phase transitions, magazine restored, reserve debited exactly
- [x] S14 Weapon switching: slots 1/2/3 with draw times, HUD state tracks
- [x] S15 Enemy damage chain: health reduces, kill ends behavior, KIA + enemiesAlive update
- [x] S16 Player damage & death → defeat screen with reason
- [x] S17 Door chain: prompt → interact → opening → open → walk-through changes room
- [x] S18 Hostage chain: captive → interact (zip cut) → following (pursuit ≤ 5 m) → objective done
- [x] S19 Extraction chain: all hostages + player in zone → countdown → shutter → victory screen
- [x] S20 Defeat on mission-timer expiry (reinforcements reason)
- [x] S21 Restart chain: ammo/health/enemies/kills/timer/hostages/doors all reset
- [x] S24 Flash device: throw → detonation stuns LOS-exposed enemies (`tests/devices.spec.ts`)
- [x] S25 Smoke device: deploys vision-blocking volume; auto-switch back to primary
- [x] S26 Full escort navigation: hostage B follows from the upstairs conference room
      through glass doors, fire door, both stair runs, main hall and loading doors to
      the garage (`tests/escort.spec.ts`)

## AI — `tests/gameplay.spec.ts`
- [x] S30 Patrols move; ≥60% of enemies displaced over 6 s; no permanent stuck
- [x] S31 Hearing: gunshot pulls investigators
- [x] S32 Vision respects walls: enclosed enemy cannot see the player (no wallhack)
- [x] S33 Combat → search after losing the player; return toward patrol
- [x] S34 Difficulty scaling: veteran spawns 14 hostiles

## Visual evidence (tooling, reviewed by hand)
- [x] S40 Room screenshot matrix — `tools/shot.mjs --all-checkpoints` → `artifacts/shots/audit1/`
- [x] S41 Asset gallery sweep (55 exhibits) — `tools/gallery-sweep.mjs` → `artifacts/shots/gallery/`
- [x] S42 Weapon states (hip/ADS/reload/fire per class) — `tools/ui-shots.mjs` → `artifacts/shots/ui/`
- [x] S43 Character gallery: 3 outfits × 4 heads, hostages, anim states incl. death
- [x] S44 Lighting scenarios day/emergency via QA hooks — `artifacts/shots/audit1/lighting-*.png`
- [x] S45 Graybox-vs-final: identical cameras — `artifacts/shots/p2-graybox/` vs `artifacts/shots/audit1/`

## Performance & quality
- [x] S50 Perf snapshot per view via `render_game_to_text().perf` (fps/calls/triangles)
- [x] S51 Draw-call budget: worst audited view ~770 calls / ~380 k triangles (headless)
- [x] S52 No console errors across the matrix (every spec asserts; tools exit non-zero on errors)
