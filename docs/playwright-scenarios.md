# Playwright Scenario Checklist

Suite lives in `tests/`. Every scenario must pass with **zero console errors**.
Status: ☐ pending ☑ automated & passing.

## Boot & flow
- ☐ S01 Title loads, no console errors, title text visible
- ☐ S02 Full menu flow: title → difficulty → briefing → loadout → loading → playing
- ☐ S03 Settings persist (sensitivity, fov, quality) & apply live
- ☐ S04 Pause / resume; menu never traps player
- ☐ S05 Restart resets: enemies, hostages, ammo, timer, doors, glass, objectives
- ☐ S06 Abort to title and start a fresh mission

## Movement & world
- ☐ S10 WASD movement changes position; collision blocks walls
- ☐ S11 Crouch lowers eye height & speed; jump clears low obstacle
- ☐ S12 Stairs traversal: ground → basement both stairways
- ☐ S13 Doors: open/close changes visuals + collision + state text; locked door blocks, keycard unlocks
- ☐ S14 Glass: shots crack then break; broken interior glass is traversable; noise alerts AI

## Combat chains
- ☐ S20 Firing decrements mag, produces recoil/effects, hits surface (impact) or enemy (damage)
- ☐ S21 Reload restores mag from reserve through reload state (incl. shotgun shell-by-shell, interruptible)
- ☐ S22 Weapon switching (1/2/3/4 + wheel) updates HUD and state text
- ☐ S23 Enemy damage → flinch/alert; zero HP → death, kill feedback, mission counters
- ☐ S24 Enemy fire damages player; armor absorbs; death → defeat screen
- ☐ S25 Flash blinds AI (and player when facing); smoke blocks AI vision
- ☐ S26 Knife melee damages; backstab multiplier applies

## AI
- ☐ S30 Patrols move along routes (positions change over time)
- ☐ S31 Hearing: gunshot noise pulls patrols to investigate
- ☐ S32 Vision: LOS within cone triggers suspicion → combat; walls/frosted glass block
- ☐ S33 Losing player → search behavior → return to patrol
- ☐ S34 No enemy permanently stuck across a 3-minute observation

## Mission
- ☐ S40 Hostage discovery announce; free → follows; E toggles hold/follow
- ☐ S41 Hostage follows through doors and down stairs to garage
- ☐ S42 Both hostages extracted + player in zone → victory screen with stats
- ☐ S43 Timer expiry → defeat (timeout reason)
- ☐ S44 Player death → defeat (killed reason)
- ☐ S45 Shooting a hostage → immediate defeat (civilian reason)
- ☐ S46 Difficulty changes enemy count & timer

## Render/quality
- ☐ S50 1920×1080 playable; resize mid-game keeps aspect & input mapping
- ☐ S51 Quality presets low/medium/high/ultra all render without errors
- ☐ S52 Resolution scale 0.5 renders; fps ≥ threshold on CI software GL
- ☐ S53 render_game_to_text position matches visible screenshot state (spot checks)
- ☐ S54 Asset gallery opens (QA), pages through assets, no errors
