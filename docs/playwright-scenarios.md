# Playwright scenario checklist

Owner: **opus4** (testing, performance, tools, release quality).
Suite: `tests/**`, config `playwright.config.js`, harness `tests/helpers/game.js`.

## Current state

**63 of 63 passing, whole suite 16.9 minutes, zero console errors, zero flakes.**
One console warning is outstanding across an entire mission and it belongs to the
map builder (see `docs/known-issues.md`, item 1). The results table is at the
bottom of this file; every row is from a single uninterrupted
`npx playwright test`.

```bash
npm test                        # whole suite, one worker, boots npm start itself
npx playwright test tests/weapons.spec.js
npx playwright test -g "recoil"
npx playwright show-report      # HTML report from the last run
npm run shots                   # tools/capture-matrix.mjs — screenshot matrix
node tools/audit.mjs            # room-by-room audit → artifacts/audit.{json,md}
node tools/console.mjs          # every console message, grouped and attributed
node tools/shadowcost.mjs       # attribute frame cost: shadow pass vs the rest
node tools/hittest.mjs          # demonstrate the stale-compositor trap (below)
node tools/webgl-check.mjs      # confirm headless WebGL2/SwiftShader is alive
```

Tools that exist to prove one defect each, cross-referenced from
`docs/known-issues.md`:

```bash
node tools/mirror.mjs           # wall openings cut at the mirror of their doorway
node tools/selfalert.mjs        # a hostile alerting itself with its own gunfire
node tools/qualityknobs.mjs     # which quality knobs a player actually gets
node tools/probehit.mjs         # what the view probe is really hitting, object by object
node tools/probecheck.mjs       # spot-check probeView without a 14-minute audit run
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
- **Quality is pinned.** `bootGame` forces the `low` preset at resolution scale
  0.5 in a 1280×720 viewport, so measurements are comparable between runs and
  machines. `resize.spec.js` and `performance.spec.js` override this on purpose.
- **One booted page for the whole suite.** Building the level costs about a
  minute of software rendering, so 63 boots would be an hour before the first
  assertion. `tests/helpers/game.js` overrides Playwright's `page` fixture with a
  worker-scoped page, and `bootGame()` *resets* it — settings, mission, inputs,
  overlays, console log — instead of reloading. `bootGame(page, { fresh: true })`
  buys a virgin process where one is genuinely needed, and the digest equality
  assertions in `mission.spec.js` and `boot.spec.js` are what keep the reset
  honest.
- **The game's render loop is stopped during a test.** A background frame costs
  most of a second under SwiftShader and makes both screenshots and measurements
  slow and noisy, so the harness takes the clock and only the frames a spec asks
  for get drawn. `boot.spec.js` covers the live loop separately, so this
  optimisation cannot hide a broken rAF path.

### The one non-obvious consequence: clicks need a painted frame

This cost two days of confusing failures, so it is worth stating plainly.
`advanceTime` renders the WebGL scene synchronously, outside any animation frame.
It therefore never makes the browser repaint the **DOM**. With the game's loop
stopped, nothing else asks for a frame either, and two things go stale together:

- a CSS opacity transition never starts, so a screen that has just become visible
  sits at `opacity: 0` indefinitely; and
- the compositor keeps serving hit-test regions from the last frame it painted,
  so `document.elementFromPoint` — and therefore any real mouse click, including
  a Playwright click with `force: true` — lands on whichever screen *used* to be
  there.

The symptom was a click on the main menu's Deploy button being delivered to a
difficulty card belonging to a screen the DOM correctly reported as
`visibility: hidden`, which then made a *different* screen open. `tools/hittest.mjs`
prints the hit-test stack before and after a frame and demonstrates the whole
thing. The cure is `settleUi()`, which hands the loop back to the game for 320 ms
of wall time (enough for the 260 ms screen fade) and then takes it away again;
`clickAny()` calls it between retries and refuses to click until `hitTest()`
confirms a click at the element's centre would actually reach that element.
Requesting animation frames by hand is *not* a reliable substitute — sometimes the
transition still does not start.

The same trap bites screenshots, and there a fixed delay is not enough. An
opacity transition only advances on frames the browser actually paints, and a
painted frame under SwiftShader can take most of a second, so a capture taken a
fixed 320 ms after a screen opens lands part-way through the fade. The first
matrix shipped with `matrix-05-difficulty.png` at roughly 15% opacity — a picture
of the level with a ghost of the menu over it — and the giveaway was in the index:
all eight menu frames measured *identically*, because `canvasMetrics` only sees
the WebGL canvas and the canvas behind all eight menus is the same image. The cure
is `settleUi()` in `tools/lib/session.mjs`, which paints until every
`.screen.visible` reports a computed opacity of at least 0.98 before capturing,
rather than waiting a set time and hoping.

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

- Surveys every checkpoint for walking clearance in all four horizontal
  directions and stages the four-way test at the roomiest one, rather than
  assuming a named room is open. This matters: `openoffice` has a desk about
  0.3 m behind the spawn, which caps a one-second backpedal at 0.30 m and looks
  exactly like an inverted key binding. Measured, all four directions travel the
  same 2.15 m.
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
  patrol when nothing is found — the whole arc, asserted by state. Two setup
  details are load-bearing. The garrison is reduced to one hostile first, because
  every hostile that hears a shot raises its own radio alert and an intact
  garrison therefore trips `alertsToGoLoud` on the very first round and hunts for
  the rest of the mission *by design*; the give-up half of the loop is only
  observable one hostile at a time. And the player is parked 250 m out with
  noclip on, not 30 m: sight range caps at 70 m but an investigator chasing a
  noise walks out through the north face of the building and closes 20 m of that
  on its own, and outside the building there is no floor to stand on.
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
  triangles. Rankings use the **median**: under SwiftShader a frame doing
  byte-for-byte identical GL work costs anywhere from 5 ms to 13 000 ms depending
  on how the host felt about scheduling it, and one such outlier moves a 16-sample
  mean by most of a second (see `docs/known-issues.md`, "not defects").
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
- `F` requests fullscreen and a second `F` releases it, with the renderer
  following both transitions. The spec presses `F` twice rather than `F` then
  Escape because headless Chromium does not honour Escape as a fullscreen exit;
  that is an automation limitation, not a claim about the keybinding.
- Resizing goes through `setViewport()`, which waits for the engine to acknowledge
  the new size and then draws twice. The engine resizes from the window `resize`
  event, which lands independently of the frames a test asks for, so the first
  frame after a resize can be the old image or a black one drawn into a buffer
  that was reallocated underneath it.

## Results

From one uninterrupted `npx playwright test`: **63 passed, 0 failed, 0 flaky,
16.9 minutes** on a single worker under SwiftShader. Times include the shared boot
amortised across the suite, which is why the first test in a file is sometimes the
slow one.

| # | Spec | Test | State | Time |
| --- | --- | --- | --- | --- |
| 1 | `accessibility`:19 | subtitles appear for hostile voice lines and for announcements | pass | 1.2m |
| 2 | `accessibility`:85 | reduced blood suppresses blood | pass | 9.8s |
| 3 | `accessibility`:150 | reduced camera motion reduces view bob | pass | 24.9s |
| 4 | `accessibility`:201 | the crosshair can be hidden, and its style can be changed | pass | 5.9s |
| 5 | `accessibility`:260 | UI scale and FOV settings change the layout and the camera | pass | 7.1s |
| 6 | `accessibility`:327 | every menu is navigable and operable by keyboard alone | pass | 12.6s |
| 7 | `ai`:78 | hostiles patrol: positions change over simulated time | pass | 6.5s |
| 8 | `ai`:116 | a hostile cannot see the player through a wall | pass | 4.0s |
| 9 | `ai`:182 | a gunshot makes hostiles investigate, then search, then give up | pass | 5.9s |
| 10 | `ai`:259 | hostiles open doors instead of walking through them | pass | 5.1s |
| 11 | `ai`:312 | no hostile is permanently stuck over 60 s of simulation | pass | 5.5s |
| 12 | `assets`:17 | every registered record carries all required manifest fields | pass | 2.1s |
| 13 | `assets`:52 | no object in the scene carries an unregistered assetId | pass | 6.3s |
| 14 | `assets`:79 | registered-but-never-instantiated records are reported | pass | 7.5s |
| 15 | `assets`:114 | the asset gallery opens and can display a sample from every category | pass | 38.5s |
| 16 | `boot`:22 | loads clean and renders on its own clock | pass | 1.1m |
| 17 | `boot`:42 | the canvas renders non-trivial pixel content | pass | 37.0s |
| 18 | `boot`:60 | render_game_to_text() matches the documented schema | pass | 3.8s |
| 19 | `boot`:96 | advanceTime is deterministic: identical inputs give identical digests | pass | 3.5s |
| 20 | `combat`:88 | shooting a hostile applies damage and reduces its health | pass | 6.4s |
| 21 | `combat`:126 | a headshot does more damage than a body shot | pass | 7.1s |
| 22 | `combat`:175 | armour soaks body damage | pass | 6.8s |
| 23 | `combat`:213 | killing a hostile stops its behaviour and updates mission state | pass | 7.7s |
| 24 | `combat`:274 | enemy return fire damages the player | pass | 5.8s |
| 25 | `combat`:325 | player armour absorbs part of incoming damage | pass | 1.6s |
| 26 | `doors`:74 | using a door changes its visual state, its collision and the text state | pass | 9.5s |
| 27 | `doors`:147 | a security door refuses until the keycard is collected | pass | 6.0s |
| 28 | `doors`:206 | the garage shutter opens | pass | 4.3s |
| 29 | `hostages`:70 | holding E frees a hostage and moves state, HUD and objective together | pass | 7.9s |
| 30 | `hostages`:144 | a freed hostage follows, and can be told to hold | pass | 8.2s |
| 31 | `hostages`:213 | both hostages reach extraction | pass | 5.4s |
| 32 | `hostages`:254 | a dead hostage fails the objective and the mission | pass | 5.1s |
| 33 | `menu-flow`:20 | the real menu chain reaches gameplay | pass | 13.9s |
| 34 | `menu-flow`:41 | settings change and actually apply | pass | 12.7s |
| 35 | `menu-flow`:116 | Escape backs out of every screen and never traps | pass | 14.7s |
| 36 | `menu-flow`:166 | pause resumes, restarts and aborts to menu | pass | 13.8s |
| 37 | `menu-flow`:220 | the menu is fully keyboard navigable | pass | 2.3s |
| 38 | `mission`:19 | the objective chain runs from insertion to victory | pass | 15.8s |
| 39 | `mission`:87 | the player dying is a defeat | pass | 7.1s |
| 40 | `mission`:127 | the clock running out is a defeat | pass | 5.3s |
| 41 | `mission`:161 | restart is a complete reset: the digest matches a fresh insertion | pass | 7.9s |
| 42 | `movement`:81 | WASD moves in the documented directions | pass | 5.2s |
| 43 | `movement`:127 | movement follows the facing direction, not the world axes | pass | 4.8s |
| 44 | `movement`:146 | mouse look changes yaw and pitch and is not inverted | pass | 5.4s |
| 45 | `movement`:195 | crouch lowers the eye height and changes the movement state | pass | 6.9s |
| 46 | `movement`:237 | jump leaves the ground and lands again | pass | 4.5s |
| 47 | `movement`:275 | walls contain the player | pass | 11.4s |
| 48 | `movement`:320 | the player never falls out of the world during a long random walk | pass | 8.6s |
| 49 | `performance`:76 | frame cost per room per quality preset, with no catastrophic collapse | pass | 3.6m |
| 50 | `performance`:206 | the resolution scale and quality preset reach the renderer | pass | 33.1s |
| 51 | `resize`:41 | the renderer and camera follow every window size | pass | 22.1s |
| 52 | `resize`:100 | look sensitivity is independent of window size | pass | 9.7s |
| 53 | `resize`:147 | F requests fullscreen, a second F leaves it, and Escape never traps | pass | 8.0s |
| 54 | `rooms`:25 | every checkpoint is reachable, correct and readable | pass | 38.0s |
| 55 | `rooms`:112 | lighting scenarios all apply and change the image | pass | 10.3s |
| 56 | `visual`:49 | capture and measure the canonical screenshot matrix | pass | 1.3m |
| 57 | `weapons`:43 | firing consumes exactly one round per shot and puts a bullet on target | pass | 10.1s |
| 58 | `weapons`:110 | the bullet lands where the crosshair is pointing | pass | 2.2s |
| 59 | `weapons`:147 | recoil moves the aim and then recovers | pass | 4.2s |
| 60 | `weapons`:187 | tactical and empty reloads restore exactly the right ammunition | pass | 13.3s |
| 61 | `weapons`:259 | weapon switching moves between slots | pass | 6.5s |
| 62 | `weapons`:305 | ADS narrows the FOV and tightens the cone | pass | 5.3s |
| 63 | `weapons`:344 | the shotgun fires a pellet pattern and the sniper is a magnified single shot | pass | 6.7s |

## Artifacts

| Path | Written by | Contents |
| --- | --- | --- |
| `artifacts/screenshots/matrix-*.jpg` | `npm run shots` | The canonical 60-frame matrix: every screen, every room, every gameplay beat, both endings, five lighting scenarios. |
| `artifacts/screenshots/index.md` | `npm run shots` | The screenshot index with per-frame measurements and flags. |
| `artifacts/screenshots.json` | `npm run shots` | The same data, machine readable. |
| `artifacts/screenshots/audit-*.jpg` | `tools/audit.mjs` | One frame per checkpoint, referenced from `audit.md`. |
| `artifacts/screenshots/*.png` (others) | every spec | Per-scenario evidence under stable names. |
| `artifacts/visual-matrix.json`, `artifacts/screenshots/visual-matrix.md` | `visual.spec.js` | Per-shot luminance and contrast from the test run. |
| `artifacts/performance.json` | `performance.spec.js` | Frame cost per room per preset, wall clock and engine CPU separately. |
| `artifacts/audit.json`, `artifacts/audit.md` | `tools/audit.mjs` | Room-by-room audit ranked by severity. |
| `artifacts/console.json` | `tools/console.mjs` | Every console message from a full mission, grouped, counted and attributed to a module. |
| `artifacts/shadow-cost.json` | `tools/shadowcost.mjs` | Per-frame cost with the shadow-refresh phase and new-program count, which is the evidence behind the frame-cost claims. |
| `artifacts/mirror.json`, `quality-knobs.json`, `self-alert.json`, `probe-hits.json` | the single-defect tools | The evidence behind items 1, 2, 3, 5 and 9 of `docs/known-issues.md`. |
| `artifacts/*.json` (others) | individual specs | Per-scenario measurements, named after the scenario. |
| `test-results/` | Playwright | Failure screenshots and traces. |
| `playwright-report/` | Playwright | The HTML report. |

### What is worth tracking in git

The two sets that are meant to be reviewed — the canonical matrix and the
per-checkpoint audit — are now written as **JPEG**, and everything else stays PNG.
That is not an aesthetic choice, it is what makes the ignore rule work: the
existing `artifacts/screenshots/*.png` line keeps excluding the disposable
per-spec evidence with no further maintenance, and the reference sets are the only
`*.jpg` in the tree.

The reason for the encoder change is size. At 1920×1080 a PNG of this game runs
about 1.8 MB once the menus are legible, so the 89 reference frames came to
**159 MB** — more than any repo should carry for a screenshot set, and enough that
the alternative was giving up either the resolution or the coverage. The same 89
frames as quality-88 JPEG, at the same resolution, are **18.4 MB**. **No
measurement is affected:** every number in `index.md`, `visual-matrix.md` and
`audit.md` is read off the WebGL canvas *before* the file is written, so the
encoder cannot move a result.

| Set | Files | Size | Track? |
| --- | --- | --- | --- |
| every `artifacts/*.json` and `*.md`, plus `screenshots/index.md` and `screenshots/visual-matrix.md` | 80 | 688 KB | **Yes.** This is the evidence: it diffs, it reviews, and a regression shows up as a changed number. |
| `artifacts/screenshots/matrix-*.jpg` | 60 | 12.0 MB | **Yes.** The only visual record of every screen, room, beat and ending; `index.md` is unreadable without it. |
| `artifacts/screenshots/audit-*.jpg` | 29 | 6.4 MB | **Yes.** `audit.md` links every row to its frame, so without them the audit is numbers with no way to check them by eye. |
| everything else in `artifacts/screenshots/` (`*.png`) | 183 | 106 MB | **No.** Per-spec evidence, rewritten on every `npm test`, only useful while triaging the failure in front of you. |

So the ignore rules I am asking for: keep `artifacts/screenshots/*.png` ignored,
and stop ignoring `artifacts/screenshots/*.jpg` and `artifacts/**/*.md`.
