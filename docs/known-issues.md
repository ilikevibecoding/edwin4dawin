# Known issues

Compiled by **opus4** (testing, performance, tools, release quality) from the
Playwright suite, static contract checks against `docs/ownership-ledger.md`, and
the QA tooling in `tools/`.

**Nothing here has been fixed.** Every item names the owning agent, the evidence
and a suggested direction; the fix belongs to the owner.

## Status of this pass

The suite is written and collected — `npx playwright test --list` reports
**63 tests across 15 spec files** — but **all 63 fail in `bootGame`**, in 65
seconds total, with the identical diagnosis:

```
Error: the game did not boot — a required resource failed:
       404 http://127.0.0.1:5173/src/main.js.
```

No test reaches a single assertion, and both tools (`npm run shots`,
`node tools/audit.mjs`) exit inside two seconds with the same reason. The cause
is that the application entry point does not exist yet. Everything below is
therefore either (a) a boot blocker, or (b) a defect provable by reading the
code against the ledger's contracts. The behavioural findings the suite is built
to produce (per-room readability, frame cost, AI soak results, asset coverage)
will land the moment issues #1 and #2 are resolved; re-run
`npm test`, `npm run shots` and `node tools/audit.mjs` and this document should
be regenerated from the results.

## Ranked defects

### 1. The application has no entry point — nothing boots at all
**Severity: blocker. Owner: Opus 1 (lead).**

`index.html` loads `<script type="module" src="./src/main.js">`, and
`src/main.js` does not exist.

```
[vite] Pre-transform error: Failed to load url /src/main.js
       (resolved id: /src/main.js). Does the file exist?
404 http://127.0.0.1:5173/src/main.js
http://127.0.0.1:5173/src/main.js — net::ERR_ABORTED
```

Impact: the canvas stays empty, no module ever runs, and therefore
`window.__NORTHSTAR__`, `window.advanceTime`, `window.render_game_to_text` and
`window.__NORTHSTAR_QA__` never exist. All 63 tests fail in `bootGame`, and both
tools exit before their first capture.

Reproduce: `npm start`, open `http://127.0.0.1:5173/` — or
`npx playwright test tests/boot.spec.js`, which now reports the 404 directly
instead of an opaque timeout.

### 2. `src/map/manifest.js` is missing, so `src/game.js` cannot be imported
**Severity: blocker. Owner: Fable 2 (map architecture).**

`src/game.js:13` imports `registerArchitectureAssets` from `./map/manifest.js`,
and that file does not exist. The ledger's work log marks **T11 "Architecture
asset manifest registration" as done**, so this looks like a file that was never
written rather than one still in progress.

```
Failed to resolve import "./map/manifest.js" from "src/game.js".
Does the file exist?
```

Impact: even once `src/main.js` lands, the module graph still fails to build, so
this blocks the same 63 tests. It is the only unresolved import anywhere in
`src/` — a scan of every relative import in the tree finds exactly these two
missing files.

### 3. The mission can never start: `loading` pauses the engine that is supposed to start it
**Severity: critical. Owner: Opus 1 (`src/game.js`, with `src/core/engine.js`).**

`startMission()` sets the state to `LOADING` and sets `_pendingStart = true`
(`src/game.js:198-206`). `_pendingStart` is only ever consumed by `stepPlayer`
(`src/game.js:265-271`), which is registered as a **fixed** system. But
`setState` sets `engine.paused = !playing` (`src/game.js:194`), and
`Engine.advance` multiplies the incoming delta by zero while paused
(`src/core/engine.js:177`), so the accumulator never fills and **no fixed system
ever runs during `loading`**.

Impact: the loading screen runs forever and gameplay is unreachable through the
real menu chain. `restart()` calls `startMission()`, so pause → restart is
equally stuck. Nothing else in the UI drives `loading` → `playing` — the only
other reference to the loading screen is the progress bar.

This is why `QAMode.forcePlay()` calls `beginPlay()` directly, and why
`menu-flow.spec.js` will fail at the loading step until this is fixed. Suggested
direction: consume `_pendingStart` in a frame system (frame systems still run
while paused), or do not pause the engine in `LOADING`, or drive the transition
from the loading screen itself.

### 4. `advanceTime(ms)` silently discards everything past 100 ms, and long real frames dilate time
**Severity: major. Owner: Opus 1 (`src/core/engine.js`).**

`fixedStep` is 1/120 s and `maxSubSteps` is 12, so a single `advance()` call can
consume at most 100 ms of simulation; anything left in the accumulator is thrown
away by the spiral-of-death guard (`src/core/engine.js:186`).

Impact, two ways:

- Automation: `window.advanceTime(1000)` simulates 100 ms and drops 900 ms with
  no signal. Any caller that reasonably expects "advance one second" gets a
  tenth of it. The harness works around this by chunking every request into
  80 ms slices (`MAX_STEP_MS` in `tests/helpers/game.js`), but the global is
  documented as the public testing surface and should be safe to call directly.
- Players: any real frame longer than 100 ms (entirely normal on software GL and
  plausible on weak hardware) loses the excess, so the game silently runs in
  slow motion instead of dropping frames.

Suggested direction: either scale the fixed step when the budget is exceeded, or
make the discard observable (a counter in `perf`), and have `advanceTime` loop
internally so the public global honours the full request.

### 5. Restart is not bit-identical to a fresh insertion
**Severity: major. Owner: Opus 1 (`src/game.js`).**

`resetMission()` zeroes `engine.simTime` (`src/game.js:230`) but leaves
`engine._accumulator` and `engine.frame` carrying whatever they held from the
previous run. The residual accumulator (0 … 8.3 ms) shifts the phase of the
first fixed step after a reset.

Impact: `mission.spec.js` asserts a full digest equality between a fresh
insertion and a restart. Any state derived from sub-step phase (positions,
timers, animation blends) can differ by one fixed step, which makes that
assertion flaky rather than wrong — the worst kind of failure to chase later.
Suggested direction: reset `_accumulator` (and, for tidiness, `frame`) in
`resetMission()`, or add an `Engine.resetClock()` for the game to call.

### 6. Pausing freezes the simulation but not the presentation
**Severity: moderate. Owner: Opus 1 (`src/core/engine.js`).**

`Engine.advance` computes `frameDt = ms / 1000` and runs every **frame** system
with it regardless of `paused` (`src/core/engine.js:188-189`). Only fixed systems
are gated.

Impact: on the pause screen the weather, particles, view model, post-processing
and lighting animation all keep running while the world is frozen — snow keeps
falling on a stopped scene, and a paused screenshot is not reproducible. It also
means `advanceTime` in a menu state still animates effects, which is a subtle
source of non-determinism for screenshot comparison. Suggested direction: pass
`paused` to frame systems, or scale `frameDt` by the same factor as `dt` and let
the UI opt out.

### 7. The pointer-lock fallback can raise an unhandled rejection
**Severity: moderate. Owner: Opus 1 (`src/core/input.js:164-178`).**

The retry path calls `this.canvas.requestPointerLock()` without awaiting it. In
current Chromium that call returns a promise, so a refusal (no user gesture, or
lock already changing) becomes an *Uncaught (in promise) DOMException* in the
console.

Impact: any release gate that forbids console errors fails on a legitimate user
action — clicking away and back, or pressing Escape at the wrong moment.
`beginPlay()` and `resume()` both call it unconditionally
(`src/game.js:212, 244`). The QA API neutralises this in automation
(`setPointerLock(false)` replaces the request with a no-op), so the suite does
not see it — real players and any headed run will. Suggested direction: `await`
the fallback inside the existing `try`, or attach a `.catch(() => {})`.

### 8. QA's `aiFrozen` flag is wired into player input
**Severity: moderate (latent). Owner: Opus 1 (`src/game.js:275`).**

```js
allowInput: playing && !this.qa.aiFrozen ? true : playing,
```

The expression evaluates to `playing` in every case, so it is dead logic today.
But it reads as though freezing AI also disables player input, and a debug flag
has no business appearing in the player update at all: the next edit to this
line is very likely to turn it into a real bug that only manifests under QA.
`handleInteraction(dt)` also takes a `dt` it never uses. Suggested direction:
pass `allowInput: playing` and drop the `qa` reference.

### 9. `#ui-root` marks the entire HUD as a polite live region
**Severity: moderate (accessibility). Owner: Opus 1 (`index.html:16`), with Fable 1 (`src/ui/**`).**

```html
<div id="ui-root" aria-live="polite"></div>
```

Every menu, screen and HUD element mounts inside this one live region, so a
screen reader is asked to announce every ammo count, every health change and
every objective tick — continuously, during combat.

Impact: the announcements that matter (objective updates, subtitles, mission
callouts) are buried in numeric chatter, which is worse for a screen-reader user
than no live region at all. `accessibility.spec.js` asserts subtitles and
announcements appear, and will pass while this remains unusable in practice.
Suggested direction: drop the attribute here and put `aria-live` on the subtitle
and announcement elements only, with the volatile HUD marked `aria-hidden`.

### 10. Errors and frame timing are not observable through the text contract
**Severity: low (testability). Owner: Opus 1 (`src/game.js`, `src/core/engine.js`).**

Two small gaps that make failures harder to diagnose than they need to be:

- `renderToText()` exposes `consoleErrors` as a **count**
  (`src/game.js:417`) while `_bindGlobalErrors` has already captured the message,
  source and line. A test can tell that something broke but not what.
- `perf.fps` is only ever computed inside the rAF loop
  (`src/core/engine.js:150-159`), so `performance.fps` reads whatever the last
  real frame produced — effectively `0` in a scripted run. Anything driven by
  `advanceTime` has to time its own frames, which is what
  `performance.spec.js` and `tools/audit.mjs` do.

Suggested direction: include the last few `consoleErrors` entries (message plus
source) in the text state, and derive `fps` from `cpuMs` so a scripted run
reports something meaningful.

## Informational — not defects

- **`combat.lastShot` and the `IMPACT` bus payload describe points differently.**
  Records use `point: [x, y, z]` (`src/player/combat.js:289, 305, 426, 653`)
  while the damage `info` payload carries live `THREE.Vector3` clones
  (`src/player/combat.js:385`). Both are reasonable in place — the harness
  normalises them in `shotRecords()` — but any new consumer will trip over it
  once. Worth a comment on the contract rather than a change.
- **Every interface in the ledger's contract block resolves.** A method-by-method
  check of the 17 documented systems (`LevelBuild`, `DoorSystem`, `LightingRig`,
  `PropPopulator`, `NavGrid`, `WeaponSystem`, `ViewModel`, `CombatSystem`,
  `EnemyManager`, `HostageManager`, `MissionDirector`, `EffectsSystem`,
  `DecalSystem`, `AudioEngine`, `UIManager`, `Weather`, `PostFX`) found no
  missing or renamed members, and every `EVT.*` name used by QA and the tests
  exists in `src/core/events.js`. The integration surface is sound; the blockers
  are the two absent files.

## Blocked — what the suite cannot yet tell you

These are the findings the suite exists to produce. They are unknown, not clean:

| Question | Answered by | Blocked on |
| --- | --- | --- |
| Is every room readable, correctly labelled and reachable? | `rooms.spec.js`, `tools/audit.mjs` | #1, #2 |
| What does a frame cost per room per preset? | `performance.spec.js` | #1, #2 |
| Do weapons, reloads and impacts add up exactly? | `weapons.spec.js`, `combat.spec.js` | #1, #2 |
| Do hostiles perceive, investigate and un-stick? | `ai.spec.js` | #1, #2 |
| Does the rescue loop complete, and both defeat paths resolve? | `hostages.spec.js`, `mission.spec.js` | #1, #2 |
| Does the manifest match the scene graph? | `assets.spec.js`, `tools/audit.mjs` | #1, #2 |
| Is the front end traversable and escapable? | `menu-flow.spec.js` | #1, #2, #3 |
| Are the canonical screenshots free of crushed blacks? | `visual.spec.js`, `npm run shots` | #1, #2 |

## Re-running this pass

```bash
npm test                    # 63 tests, 15 files, one worker
npm run shots               # artifacts/screenshots/index.md
node tools/audit.mjs        # artifacts/audit.json + artifacts/audit.md
npx playwright show-report  # HTML report with failure traces
```

`tests/helpers/game.js` now reports the reason a boot failed — failed requests,
page errors and console errors — instead of a bare `waitForFunction` timeout, so
the next blocker of this kind names itself in the first line of the failure.
