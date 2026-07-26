# Playwright Scenario Checklist

Suite lives in `tests/`. Every scenario must pass with **zero console errors**
(every spec attaches `watchErrors` before load and asserts `[]` at the end).
Status: ☐ pending ☑ automated & passing.

The spec file that covers each scenario is named in brackets.

## Boot & flow
- ☑ S01 Title loads, no console errors, title text visible [01]
- ☑ S02 Full menu flow: title → difficulty → briefing → loadout → loading → playing [01]
- ☑ S03 Settings persist (sensitivity, fov, quality) & apply live [04]
- ☑ S04 Pause / resume; menu never traps player [01]
- ☑ S05 Restart resets: enemies, hostages, ammo, timer, doors, glass, objectives [01]
- ☑ S06 Abort to title and start a fresh mission [06]

## Movement & world
- ☑ S10 WASD movement changes position; collision blocks walls [02]
- ☑ S11 Crouch lowers eye height & speed [02]; jump clears low obstacle [06]
- ☑ S12 Stairs traversal: ground → basement both stairways [02]
- ☑ S13 Doors: open/close changes visuals + collision + state text; locked door blocks, keycard unlocks [02]
- ☑ S14 Glass: shots crack then break; broken interior glass is traversable; noise alerts AI [06]

## Combat chains
- ☑ S20 Firing decrements mag, produces recoil/effects, hits surface (impact) or enemy (damage) [02]
- ☑ S21 Reload restores mag from reserve through reload state (incl. shotgun shell-by-shell, interruptible) [02]
- ☑ S22 Weapon switching (1/2/3/4 + wheel) updates HUD and state text [02]
- ☑ S23 Enemy damage → flinch/alert; zero HP → death, kill feedback, mission counters [06]
- ☑ S24 Enemy fire damages player; armor absorbs; death → defeat screen [02]
- ☑ S25 Flash blinds AI [06]; smoke blocks AI vision [06, as S25b]
- ☑ S26 Knife melee damages; backstab multiplier applies [06]

## AI
- ☑ S30 Patrols move along routes (positions change over time) [05]
- ☑ S31 Hearing: gunshot noise pulls patrols to investigate [03]
- ☑ S32 Vision: LOS within cone triggers suspicion → combat; walls block [05]
      — frosted glass is authored as a blocker but does not block at runtime, see
      `docs/reports/opus4-qa.md`
- ☑ S33 Losing player → search behavior → return to patrol [05, squad + isolated pair as S33b]
- ☑ S34 No enemy permanently stuck across a 3-minute observation [05]

## Mission
- ☑ S40 Hostage discovery announce; free → follows; E toggles hold/follow [03]
- ☑ S41 Hostage follows through doors and down stairs to garage [03]
- ☑ S42 Both hostages extracted + player in zone → victory screen with stats [03]
- ☑ S43 Timer expiry → defeat (timeout reason) [03]
- ☑ S44 Player death → defeat (killed reason) [02, as part of S24]
- ☑ S45 Shooting a hostage → immediate defeat (civilian reason) [03]
- ☑ S46 Difficulty changes enemy count & timer [06]

## Render/quality
- ☑ S50 1920×1080 playable; resize mid-game keeps aspect & input mapping [04]
- ☑ S51 Quality presets low/medium/high/ultra all render without errors [04]
- ☑ S52 Resolution scale 0.5 renders; drawing buffer shrinks [04]
      — no fps threshold is asserted: this machine and CI use software GL, where
      the number says nothing about a player's frame rate (`docs/perf-summary.md`)
- ☑ S53 render_game_to_text position matches visible screenshot state (spot checks) [04]
- ☑ S54 Asset gallery opens (QA), pages through assets, no errors [07, plus S54b
      which builds and frames every catalog entry]

## Accessibility & release quality (added alongside the checklist)
- ☑ A1 `reducedMotion` adds `body.reduced-motion` and survives a reload [04]
- ☑ A2 `crosshair` off hides the reticle, `subtitles` off suppresses lines,
      `invertY` flips the pitch delta [04]
- ☑ Manifest sanity: `validateManifest()` clean, nothing left at status `spec`,
      no `PLACEHOLDER` asset signed off as `accepted` [07]
- ☑ Draw-call / triangle regression fence at the lobby, during a firefight, and
      across the five heaviest checkpoints [07]
- ☑ Asset-id overlay lists the nearest `world.propAnchors` while playing [07]
