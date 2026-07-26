# Playwright scenario checklist

Owner: **opus4** (testing, performance, tools, release quality).
Suite: `tests/**`, config `playwright.config.js`, harness `tests/helpers/game.js`.

```bash
npm test                        # whole suite, one worker, boots npm start itself
npx playwright test tests/weapons.spec.js
npx playwright test -g "recoil"
npx playwright show-report      # HTML report from the last run
npm run shots                   # tools/capture-matrix.mjs — screenshot matrix
node tools/audit.mjs            # room-by-room audit → artifacts/audit.{json,md}
node tools/webgl-check.mjs      # confirm headless WebGL2/SwiftShader is alive
```

## Ground rules every spec follows

Headless Chromium renders through SwiftShader, so a frame costs tens of
milliseconds and wall-clock waiting is both slow and unreliable. Every spec
therefore obeys the same rules:

- **Simulated time only.** Time moves through `window.advanceTime(ms)` (wrapped
  as `advance(page, ms)`), never through `page.waitForTimeout`. Two runs with the
  same inputs produce the same digest, which is what `boot.spec.js` asserts
  directly.
- **Short input bursts with pauses.** `burst(page, action, ms)` holds an action,
  releases it, then advances a little further so the release is simulated. No
  spec ever leaves an action held across an assertion.
- **Reach the real gameplay state.** Every spec enters `playing` — through the
  real menu chain in `menu-flow.spec.js` and at least once per suite elsewhere,
  through the QA API's `forcePlay` when the menu is not what is under test.
- **Read the text contract.** Assertions go through `render_game_to_text()` and
  the QA API rather than pixel diffing, so a failure names the system at fault.
- **Screenshots always.** Every spec writes PNGs into `artifacts/screenshots/`
  under stable names, so a failure comes with evidence.
- **No console errors.** `expectNoConsoleErrors(page)` runs at the end of every
  spec; page errors, `console.error` and failed requests all count.
- **Quality is pinned.** `bootGame` forces the `medium` preset (`low` for the
  heavier specs) and a fixed resolution scale so measurements are comparable
  between runs and machines.

## The scenarios

| # | Spec | What it proves |
| --- | --- | --- |
| 1 | `boot.spec.js` | The app boots clean, draws real pixels, publishes a schema-valid state contract, and simulates deterministically. |
| 2 | `menu-flow.spec.js` | The whole front end is traversable and escapable, and settings actually take effect. |
| 3 | `movement.spec.js` | The player moves in the documented coordinate frame and the world contains them. |
| 4 | `weapons.spec.js` | The full trigger-to-impact chain, and every reload path, is arithmetically correct. |
| 5 | `combat.spec.js` | Damage, hit location, armour, death and the resulting mission bookkeeping agree. |
| 6 | `ai.spec.js` | Hostiles perceive, investigate, search, use doors, and never wedge. |
| 7 | `doors.spec.js` | Doors move visually, in collision and in the text state together, and locks mean something. |
| 8 | `hostages.spec.js` | The rescue loop works end to end, including the failure case. |
| 9 | `mission.spec.js` | Both win and both loss paths resolve, and restart is a true reset. |
| 10 | `rooms.spec.js` | Every checkpoint in the level is reachable, correctly labelled and readable. |
| 11 | `assets.spec.js` | The asset manifest matches the scene graph, and the gallery can show any of it. |
| 12 | `visual.spec.js` | The canonical screenshot matrix exists and is measured for exposure and contrast. |
| 13 | `performance.spec.js` | Frame cost per room per preset, with no catastrophic collapse and no leak. |
| 14 | `accessibility.spec.js` | Every accessibility setting has a visible, asserted effect. |
| 15 | `resize.spec.js` | Renderer, camera and input all follow the window at three sizes. |

### 1. `boot.spec.js` — boot integrity

- Loads `/` with no `console.error`, no uncaught page error and no failed
  network request (favicon excluded).
- Samples the canvas and requires non-trivial content: more than one distinct
  colour bucket and a luminance spread, so a black or single-colour frame fails.
- Validates `render_game_to_text()` against the documented schema: the
  `northstar.state/1` tag, the `coordinateSystem` block, `gameMode`,
  `levelReady`, `difficulty`, `simTime`, `frame`, and once in gameplay the
  `player`, `weapon`, `mission`, `hostages`, `enemies`, `doors`, `hud` and
  `performance` blocks with the right value types.
- Determinism: from a fresh boot, runs an identical scripted input sequence
  twice and requires `screenshotState().digest` to match. This is the assertion
  the whole suite's reliability rests on.

### 2. `menu-flow.spec.js` — front end

- Walks title → menu → settings → controls → difficulty → briefing → loadout →
  loading → playing by clicking the real UI, and asserts the state machine
  arrives at `playing` with the chosen difficulty and loadout.
- Changes several settings (FOV, subtitles, crosshair style, quality, UI scale)
  and asserts each one reached its system — camera FOV, the subtitle element,
  the crosshair DOM, the renderer, the root scale variable — not just the
  settings store.
- Presses Escape on every screen and asserts it always backs out one level and
  never traps: no screen is a dead end.
- Pause → resume returns to `playing` with the clock preserved; pause → restart
  re-enters a fresh run; pause → abort lands back in `menu`.
- Drives the main menu with Tab and Enter alone to prove keyboard operability.

### 3. `movement.spec.js` — locomotion

- Faces a known yaw, then bursts each of `forward`, `back`, `left`, `right` and
  asserts the position delta lands in the documented frame (+X east, +Z south,
  yaw 0 facing −Z) with the right sign and a sane magnitude.
- Repeats at a rotated yaw to prove movement is camera-relative rather than
  world-axis aligned.
- Applies look deltas and asserts yaw and pitch move in the correct direction
  (not inverted), that pitch clamps at both extremes, and that the invert-Y
  setting flips only pitch.
- Crouch lowers the eye height, reports the crouched movement state and slows
  the player; standing restores all three.
- Jump leaves the ground (`grounded` false, positive Y velocity, height gain)
  and lands again at the original floor height.
- Drives into several walls from known positions and asserts containment: the
  player stops short, stays inside the room, and never crosses the collider.
- A long scripted walk over many directions asserts Y never leaves the legal
  band, so the player can neither fall through the floor nor escape the shell.

### 4. `weapons.spec.js` — trigger to impact

- Each firearm: one trigger pull decrements the magazine by exactly one (or the
  right burst count), emits exactly one `WEAPON_FIRE`, and produces an impact
  event and a decal.
- The impact point is compared against the aimed surface, so a shot that misses
  the crosshair fails.
- Recoil: pitch rises during a burst and recovers afterwards; bloom grows with
  sustained fire and decays.
- Tactical reload from a partial magazine restores to capacity and removes
  exactly the rounds taken from reserve; the empty reload does the same from
  zero and takes longer; reserve arithmetic is checked both ways.
- Dry fire on an empty magazine consumes nothing and emits no fire event.
- Slot switching moves the active weapon, respects the draw transition, and
  preserves each slot's ammunition independently.
- ADS lowers the camera FOV, raises `adsFactor` and measurably tightens the
  cone; the shotgun spawns its full pellet count in a pattern wider than the
  carbine; the sniper is one high-damage magnified round per trigger pull.

### 5. `combat.spec.js` — damage model

- Spawns a hostile at a known position, shoots it, and asserts health fell by
  the weapon's damage and the hit was attributed to the right entity.
- A head hit removes more health than a body hit with the same weapon.
- Hostile armour soaks part of the body damage.
- Reducing a hostile to zero health ends its combat behaviour (dead state, no
  further fire) and updates the mission's hostile bookkeeping.
- Unfreezing AI in front of an alerted hostile draws return fire that reduces
  player health; with player armour, part of that damage is absorbed and the
  armour value drops.

### 6. `ai.spec.js` — perception and behaviour

- Samples hostile positions over simulated time and requires movement: they
  patrol rather than stand still.
- With a wall between them, the hostile's awareness of the player stays at the
  unaware level; removing the wall from the equation (line of sight open) raises
  it, which proves the check is the geometry and not a timer.
- A gunshot near a hostile pushes it into investigate, then search, then back to
  patrol when nothing is found — the whole arc, asserted by state.
- A hostile whose route crosses a closed door opens it instead of clipping
  through: the door's `openAmount` rises while the hostile is still on the far
  side.
- Sixty seconds of simulated time with position samples: every hostile either
  keeps moving or is legitimately posted, and none is wedged in one spot with a
  movement intent it cannot satisfy.

### 7. `doors.spec.js` — doors

- Opening a door changes all three representations together: the mesh rotation
  or offset, the collider (the player can now pass), and the door entry in
  `render_game_to_text()`.
- The player walks through the open doorway and is blocked by the closed one.
- A locked security door refuses with a prompt; after the keycard is collected,
  the same interaction opens it.
- The garage shutter runs from closed to open under the mission trigger and the
  extraction route becomes passable.

### 8. `hostages.spec.js` — the rescue loop

- Holding `use` on a bound hostage raises the secure progress, and on completion
  flips the hostage state, the HUD's secured count and the objective together.
- A freed hostage follows the player through a doorway, and the hold/follow
  toggle parks and recalls them.
- Both hostages are escorted into the extraction volume and register as
  extracted.
- Killing a hostage fails the protect objective and ends the mission in defeat.

### 9. `mission.spec.js` — mission shape

- Runs the objective chain from insertion to victory using the QA API to jump
  between objective states, asserting each objective's state transition and the
  final outcome.
- Player death is a defeat with the right end reason.
- Letting the clock expire is a defeat with the timer reason.
- Restart equality: a digest taken a fixed simulated time after a fresh
  insertion must equal the digest taken the same way after a restart, which
  covers enemies, hostages, doors, ammunition, timer, effects and objectives in
  one assertion.

### 10. `rooms.spec.js` — level coverage

- Teleports to **every** entry in `CHECKPOINTS`, screenshots each, and asserts
  the reported room matches the checkpoint's declared room.
- Requires a mean-luminance floor per frame so an unlit or unbuilt room fails
  rather than quietly shipping.
- Accumulates console errors across the whole sweep, so an error raised in one
  room only is still caught.
- Applies every entry in `LIGHT_SCENARIOS` and asserts the image actually
  changes between scenarios.

### 11. `assets.spec.js` — manifest against reality

- Every record in the registry carries all required manifest fields, with
  offenders reported by id and owner.
- Every `assetId` in the live scene graph resolves to a registered record.
- Records registered but never instantiated are listed (a content gap, reported
  rather than failed for the non-instanced categories).
- The gallery opens, filters, and displays a sample from every category, and
  `captureViews` returns the four canonical inspection views.

### 12. `visual.spec.js` — screenshot matrix

- Captures title, menu, briefing, loadout, loading, every major room in
  production lighting, ADS, firing, reloading, hostage secure, extraction,
  victory, defeat, minimap and pause under stable names.
- Measures mean luminance, standard deviation, Michelson contrast, crushed-black
  and blown-highlight fractions and distinct colour count per shot, and writes
  the table so crushed blacks and blown highlights are auditable without opening
  the images.

### 13. `performance.spec.js` — frame cost

- For each of several rooms and each quality preset, runs a fixed simulated
  workload and records mean, median and worst frame cost plus draw calls and
  triangles.
- Asserts no catastrophic collapse: no room may cost dramatically more than the
  median room at the same preset, and `low` must not cost more than `high`.
- Asserts the resolution scale and shadow settings reach the renderer.
- A leak check: a long simulation with combat and effects must not grow
  geometry, texture or scene-object counts without bound.
- Writes `artifacts/performance.json` for the lead.

### 14. `accessibility.spec.js` — settings with teeth

- Subtitles appear for hostile voice lines and for mission announcements, with
  the text matching the line.
- Reduced blood suppresses blood decals and particles while impacts still
  register.
- Reduced camera motion measurably reduces view bob amplitude while walking.
- The crosshair can be hidden entirely, and its style setting changes the DOM.
- UI scale changes the rendered layout size; the FOV setting reaches the camera.
- Every menu screen is reachable and operable with Tab, arrows, Enter and
  Escape alone.

### 15. `resize.spec.js` — viewport

- At 1280×720, 1920×1080 and 2560×1440: the renderer's drawing buffer matches
  the viewport times the resolution scale, and the camera aspect matches the
  new ratio.
- The same look delta produces the same yaw change at every size, so
  sensitivity is not resolution dependent.
- `F` requests fullscreen and Escape releases it, with the renderer following
  both transitions.

## Artifacts

| Path | Written by | Contents |
| --- | --- | --- |
| `artifacts/screenshots/*.png` | every spec, `tools/capture-matrix.mjs` | Stable-named frames. |
| `artifacts/screenshots/index.md` | `tools/capture-matrix.mjs` | The screenshot index with per-frame measurements and flags. |
| `artifacts/screenshots.json` | `tools/capture-matrix.mjs` | The same data, machine readable. |
| `artifacts/visual-matrix.json`, `artifacts/screenshots/visual-matrix.md` | `visual.spec.js` | Per-shot luminance and contrast from the test run. |
| `artifacts/performance.json` | `performance.spec.js` | Frame cost per room per preset. |
| `artifacts/audit.json`, `artifacts/audit.md` | `tools/audit.mjs` | Room-by-room audit ranked by severity. |
| `test-results/` | Playwright | Failure screenshots and traces. |
| `playwright-report/` | Playwright | The HTML report. |
