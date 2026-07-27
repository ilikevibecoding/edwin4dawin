# Playwright scenario checklist

Owner: **Opus 4**. Every scenario drives the real client, enters the affected
gameplay state, uses short input bursts with deliberate pauses, captures both a
screenshot and `render_game_to_text()`, and asserts on both.

Run everything: `npm test`
Run one suite: `npx playwright test tests/combat.spec.js`
Screenshot matrix: `node tests/tools/capture-matrix.mjs --quality=high --out=screenshots/rooms`
Fast single probe: `node tests/tools/probe.mjs --quality=medium --play --at=lobby`

CI runs Chromium with SwiftShader software rasterisation, so gameplay specs use a
1280×720 viewport and `?quality=low`; `flow.spec.js` explicitly re-tests
1920×1080 and every quality preset.

## `tests/smoke.spec.js` — boot and baseline

| # | Scenario | Asserts |
| --- | --- | --- |
| 1 | Title screen loads | `screen-title` visible, zero console errors |
| 2 | Level builds completely | no unresolved room rectangle, ≥25 doors, ≥60 glass panes, ≥400 props, ≥6 000 navigation nodes, every room navigable, zero manifest warnings, ≥300 registered assets |
| 3 | Gameplay state is coherent | schema, metre units, 100 health, correct starting weapon and magazine, 2 hostages, ≥8 hostiles, no victory/defeat, no runtime errors |
| 4 | `advanceTime` is deterministic | same teleport + 500 ms twice produces identical position and enemy count |

## `tests/combat.spec.js` — cause-and-effect chains

| # | Scenario | Chain asserted |
| --- | --- | --- |
| 1 | Firing | magazine decrements → shot count matches → recoil moves the view mid-burst → cone opens under sustained fire → cone recovers afterwards |
| 2 | Reload | empty the magazine → auto-reload completes → fire ten → manual reload reports in progress → magazine full → reserve reduced by exactly the rounds spent |
| 3 | Weapon switching | rifle → pistol (15 rounds) → knife (no magazine) → rifle, and switching does not refill |
| 4 | All five firearms | each becomes active, consumes ammunition, reloads to full, reports coherent state |
| 5 | Hostile damage | body shots reduce health → hit registers in statistics → sustained fire kills → state becomes `dead` → mission enemy count updates |
| 6 | Hit regions | head damage exceeds limb damage by more than 2× |
| 7 | Glass | rounds crack then shatter panes, intact count drops |
| 8 | Utility | flash blinds a hostile with line of sight; smoke creates an occluding volume |

## `tests/mission.spec.js` — mission flow

| # | Scenario | Chain asserted |
| --- | --- | --- |
| 1 | Door | reported `closed` + collision present + prompt offered → `E` → `open`, open amount > 0.9, passable, zero colliders → `E` again → `closed` |
| 2 | Roller shutter | colliders present → rolls open → state `open`, opening clear |
| 3 | Locked door | refuses to open and stays shut → unlock → opens |
| 4 | Hostage | `held` + prompt "Secure" → `E` → `following` + objective advances → player moves → hostage actually closes the distance → `E` → `stopped` → `E` → `following` → both secured → extraction eligible |
| 5 | Hostage pathing | both holding rooms produce a valid navigation path to the extraction garage |
| 6 | Extraction | player + both hostages in the bay → extraction active → hold → victory, both `extracted`, victory screen shown |
| 7 | Death | fatal damage → defeat state and defeat screen |
| 8 | Clock | timer expiry → defeat with the clock reason |
| 9 | Restart | after breaking glass, opening doors, killing everyone, securing hostages and spending ammunition → restart → all hostiles alive, hostages `held`, alarm cleared, objective back to `infiltrate`, timer reset, health/armour/ammunition restored, all glass intact, all doors closed, player back at the courtyard spawn, no runtime errors |
| 10 | Victory then restart | victory clears and a fresh active mission starts |

## `tests/ai.spec.js` — AI behaviour

| # | Scenario | Asserts |
| --- | --- | --- |
| 1 | Patrol | more than 60% of hostiles change position over 12 s of unalerted patrol |
| 2 | No X-ray vision | a hostile two rooms away with a direct facing cannot see the player |
| 3 | No firing through geometry | `canShootAt` false through a wall, true with a clear line |
| 4 | Reaction to gunfire | alarm raises, hostiles become alerted, they converge and search |
| 5 | Engage then search | hostile enters combat and saturates awareness while visible, then falls back to searching once the player is gone |
| 6 | Hostiles are dangerous | three alerted hostiles reduce player health/armour within nine seconds |
| 7 | Never permanently stuck | 56 s of building-wide alarm, sampled eight times: no hostile holds one position across all samples while not in cover |
| 8 | Navigation coverage | every room reachable from the lobby, both stairwells traversable between floors |

## `tests/flow.spec.js` — required flow, menus, settings, resolution

| # | Scenario | Asserts |
| --- | --- | --- |
| 1 | Thirteen-step flow | title → settings → video tab → controls → difficulty → briefing (both floor plans) → loadout → deploy → loading → spawn in the courtyard with the `infiltrate` objective → walk toward the doors → inside advances the objective → hostage discovered → secured → extraction eligible → extraction → victory screen → restart → return to menu. Screenshot at every step |
| 2 | Pause | Esc pauses, simulation freezes, Esc resumes, Resume works, Settings from pause returns to pause, Return to Menu works. The player is never trapped |
| 3 | Settings | FOV, quality, crosshair, reduced blood, minimap, invert-Y and resolution scale apply live and persist to storage |
| 4 | Quality presets | all four render; low costs fewer draw calls than ultra |
| 5 | Fullscreen | `F` requests fullscreen on the app container; Esc leaves the player in a usable state |
| 6 | Resize | 1280×720, 1600×900, 1024×640, 1920×1080: renderer size matches, canvas fills the viewport, and the same mouse delta produces the same yaw change at every size |
| 7 | 1920×1080 | full-resolution gameplay burst: movement and firing work, state stays coherent, no console errors |
| 8 | Asset gallery | gallery lists registered assets, manifest total >380 with zero warnings |

## `tests/rooms.spec.js` — room-by-room audit

| # | Scenario | Asserts |
| --- | --- | --- |
| 1 | Every required area | all 22 required areas exist in the layout, each has navigation coverage, each has a stated real-world purpose |
| 2 | Two routes to each hostage | at least two topologically distinct approaches to the conference room and the executive office |
| 3 | No accidental dead ends | every room reachable from every other room |
| 4 | Screenshot audit | 50 composed viewpoints captured with state, checked for console errors |
| 5 | Void check | no camera position in any room can see the skybox through a wall |

## `tests/perf.spec.js` — performance

| # | Scenario | Asserts |
| --- | --- | --- |
| 1 | Build profile | build under 40 s even on software rendering; spatial batching produced many small batches rather than a few map-wide meshes; per-view draw calls and triangles recorded for twelve viewpoints |

## Evidence layout

```
screenshots/
  flow/         thirteen-step flow, pause, restart, victory, defeat
  combat/       burst, reload, hostile hit, hostile down, glass, utility
  doors/        closed, open
  hostage/      held, following
  weapons/      one gallery view per weapon
  characters/   one gallery view per variant
  rooms-audit/  33 composed room viewpoints + state payloads
  before-after/ before and after pairs for every fixed visual defect
  quality/      one view per quality preset
  resolution/   1920×1080 gameplay
  gallery/      asset gallery UI
test-results/reports/
  level-report.json, performance.json, nav-reachability.json,
  hostage-paths.json, ai-patrol.json, ai-stuck.json, quality-presets.json,
  manifest-stats.json, resize.json, room-audit.json
```

Every PNG has a sibling `.json` holding the `render_game_to_text()` payload
captured on the same frame, which is how "Playwright state disagreeing with the
rendered game" is guarded against.
