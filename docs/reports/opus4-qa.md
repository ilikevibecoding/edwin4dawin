# Opus 4 report — test matrix, asset gallery, perf tooling, release quality

Owner: Opus 4 (testing, performance, tools & release quality).
Files touched: `tests/**` (4 new specs + `helpers.js`), `tools/**`
(`perf.mjs`, `scene-census.mjs`, `lib/harness.mjs` new; `shot.mjs` extended),
`src/core/gallery.js`, `src/core/testhooks.js`, `docs/playwright-scenarios.md`,
`docs/perf-summary.md` (new), this report. No other files were modified, no
dependencies added, no git operations.

## 1. Where the suite stands

**39 tests, all green, 11.3 minutes** on this container (software GL, one worker).
The 14 pre-existing tests are untouched — no assertion in `tests/01`–`tests/03`
was changed, weakened or skipped. `tests/helpers.js` only gained additive
helpers (below).

Every scenario in `docs/playwright-scenarios.md` is now automated. The checklist
records which spec covers each id; the additions are:

| spec | scenarios |
| --- | --- |
| `04-settings-render.spec.js` | S03, S50, S51, S52, S53 + accessibility A1/A2 |
| `05-ai-behavior.spec.js` | S30, S32, S33, S33b, S34 |
| `06-combat-world.spec.js` | S06, S11 (jump), S14, S23, S25 (flash), S25b (smoke), S26, S44, S46 |
| `07-gallery-manifest-perf.spec.js` | S54, S54b, manifest sanity, perf fence, asset-id overlay |

Everything is deterministic: `?test=1&qa=1&seed=42`, simulation driven by
`window.advanceTime`, no real-time waits except polling a mission build. Every
new spec attaches `watchErrors` before navigation and asserts `[]` at the end;
the run above produced zero console errors anywhere.

Runtime is kept in budget by reusing one booted page and one built mission per
spec file via `test.describe.configure({ mode: 'serial' })`. Destructive
staging (anything calling `killEnemies`) is ordered last inside its block so the
scenarios that need the full eleven-hostile roster run first.

### Helper additions (`tests/helpers.js`)

* `newGamePage(browser, opts)` — page at the project viewport with error capture
  attached *before* load, game booted.
* `weaponReady(page)` — advances until the weapon leaves its draw animation.
  Needed because a freshly drawn weapon silently swallows the first trigger pull;
  this cost me one false failure in S14 before I found it.
* `frameBrightness(page)` — mean luminance of the live WebGL frame, copied
  through a 2D canvas in the same task as the render (the drawing buffer is not
  preserved). Used by S53 to prove the screen is not black.
* `blockHmr(page)` / `gotoGame` — see the note in §5; this one matters.

## 2. Asset gallery (`src/core/gallery.js`)

`openGallery()` switches to `MODES.GALLERY` and stands up a studio stage as its
own group in `Engine.scene`. Every scene child that was visible is hidden on
open and restored on close, so a mission in progress survives a visit; the
camera transform, near and far planes are saved and restored too. Nothing
touches the DOM outside `#gallery-overlay`, and that node only exists while the
gallery is open, so the gallery cannot leak into normal play.

**Catalog — 187 entries**, every one of which is proven to build and frame by
S54b:

| category | count | source |
| --- | --- | --- |
| character | 6 | 4 enemy types (`createEnemyBody`) + 2 hostages (`createHostageBody`) |
| weapon | 8 | `buildWeaponModel(id, { firstPerson: false })` |
| weapon-fp | 8 | `buildWeaponModel(id, { firstPerson: true })` |
| pickup | 4 | `buildPickupModel` |
| prop | 161 | every id from `propIds()` |

**Presentation.** Dark backdrop wall plus a large floor plane, a neutral
four-light rig (warm key, cool fill, cold rim, hemisphere bounce), and a
turntable pedestal with an emissive edge ring. Each asset is auto-framed: the
bounding box is centred over the pedestal and sat on its face, then the camera
distance is solved from the bounding sphere against the current vertical fov.
Two details that took iteration and screenshot review:

* The fit has to include the pedestal, not just the asset. A keycard framed on
  its own bounding sphere fills the screen and pushes the turntable out of frame;
  fitting `max(assetFootprint, pedestalDiameter)` frames both.
* Assets read as floating without a contact shadow, and a *real* shadow is not an
  option because the low quality preset has shadow maps off. The stage paints a
  radial-gradient quad instead — but it has to be **wider** than the silhouette,
  otherwise the asset covers its own shadow completely, which is exactly the bug
  the first version had.

Each category gets an opening pose so the still frame a test captures at spin 0
is the readable one: characters face the camera, weapons present a profile.
The turntable spins from the sim step, so `advanceTime` rotates it exactly like
real time and screenshots stay reproducible.

The overlay card shows manifest asset id, name, category, index/total, the
measured bounding size and the control hints, with Prev/Next/Back buttons.
Arrow keys and A/D page; Esc returns to the title. Manifest lookup falls back
from an exact id match to searching entry `name` fields, because manifest rows
are authored per prop *family* — `FURN-002` lives inside the `FURN-001` family
row rather than having one of its own.

### `__qa` additions

All additive; no existing snapshot field or semantic was changed, since other
specs depend on them.

`openGallery`, `closeGallery`, `galleryShow(idOrIndex)`, `galleryInfo()`,
`galleryCatalog()`, `showAssetIds(v)`, `setSetting`/`getSetting`/`settings`/
`qualityPreset`, `cameraFov`, `cameraAspect`, `rendererInfo`, `enemies`,
`playerFlash`, `smokeBlocks(a, b)`, `glassPanes(prefix)`, `propAnchors`,
`collidersNear`, `lineOfSight`, `faceEnemy(id, x, z)`.

`galleryShow` accepts a catalog index, an entry id (`prop_desk_standard`), a
bare prop id (`desk_standard`) or a manifest asset id (`CHR-003`).

Snapshot (`render_game_to_text`) gained four fields, all additions:
`enemies.blinded`, `enemies.stuckRescues`, `glassCracked`, `mission.kills`, plus
`blinded` on each nearby-enemy record.

**Asset-id overlay.** `qa.showAssetIds(true)` installs a sim-step updater that
prints the ten nearest `world.propAnchors` (asset id, prop id, distance) into
the existing QA overlay via `setQaOverlay`, refreshed every step and removed
cleanly on `showAssetIds(false)`. It is off unless asked for.

## 3. Performance

Full numbers, methodology and the run configuration live in
`docs/perf-summary.md`. Headlines from the sweep of 14 checkpoints plus a live
firefight, at the `high` preset, 1920×1080, shadows on:

* **Median 615 draw calls / 126k triangles.**
* **Worst view on the map: the plaza at 1466 calls / 177k triangles** — the whole
  facade plus the outdoor shell. Not the lobby, which is what a naive fence
  would have assumed.
* Lobby facing north: 1049 calls / 161k triangles. A live firefight there is
  1033 calls / 158k — hostiles cost calls, not triangles.

### Top draw-call hogs

From `tools/scene-census.mjs`, which walks `Engine.scene` and attributes one
draw unit per material per visible mesh:

1. **Character rigs — 618 draw units across 6 rig types.** A humanoid body is
   40–60 separate meshes for only ~4k triangles, so hostiles are call-bound.
2. **Door assemblies — 435 draw units across 40 doors,** more than the entire
   architectural shell, and resident for the whole mission wherever the player
   is. Each door is 6–21 meshes (leaf, frame, stops, lever, plate, glazing).
   Cheapest thing on the list to fix: nothing in an assembly moves relative to
   the rest except the leaf.
3. **The `world` shell — 294 draw units for ~120k triangles,** i.e. most of the
   geometry for a fifth of the calls. Its batching already works.
4. Pickups 129, viewmodel 26, vfx 30, weather 8.

Materials and shaders are not the bottleneck: ~200 unique materials and 19
compiled programs back the whole scene, and the census names the geometries
that are duplicated 13–26× (the same box/cylinder/capsule across props) as
instancing candidates. Recommendations are written up in the report; I did not
restructure anyone else's code.

### One methodology warning worth repeating

`Engine.getPerf().fps` is a 90-frame rolling average of the RAF loop. Under
software GL that is roughly one frame per second, so the window spans a minute
of wall clock and **cannot distinguish two adjacent checkpoints**. The perf tool
therefore times isolated `Engine.render()` calls itself, forcing a
`gl.readPixels` afterwards so the measurement includes the rasterisation the
driver would otherwise defer. Even then, software-GL time turns out to be
*fill*-bound, not call-bound (`copy_mail` at 399 calls costs more than `spawn` at
1466), so the report treats it strictly as a coarse "did something explode"
signal. Draw calls and triangles are the numbers the fence asserts on.

### The fence (`tests/07`)

Observed value + ~30% headroom, deliberately loose enough to survive ongoing
decoration work and tight enough to catch a systemic explosion:

* lobby (static and mid-firefight): < 1400 draw calls, < 215k triangles
* five heaviest stops (`spawn`, `vestibule`, `conference`, `cubicles`, `garage`):
  < 1900 draw calls, < 235k triangles

The brief suggested < 900 calls; the real lobby view is 1049, so 900 would have
failed on arrival. Both fences annotate the measured values into the test
report, so a run always records where the numbers actually sat.

## 4. Accessibility results

All four settings behave correctly (`tests/04`, A1 and A2):

| setting | verified |
| --- | --- |
| `reducedMotion` | adds `body.reduced-motion`; survives a reload (localStorage-backed, re-applied on boot) |
| `crosshair` | off adds `hidden` to `#crosshair`, on removes it |
| `subtitles` | off renders zero `#subtitles .subtitle-line` nodes for a triggered line; on renders them |
| `invertY` | the same injected look delta produces opposite-signed pitch |

One note on how the crosshair is asserted: `#crosshair` is a zero-size element
whose visibility is driven purely by a `hidden` class, so Playwright's
`toBeVisible()` is not a reliable oracle for it. The test checks the class,
which is what the CSS actually keys off.

## 5. Discrepancies and findings

**1. Frosted glass is authored as a sight blocker but does not block sight.**
`src/world/builder.js` marks frosted glass colliders `blocksSight: true`, but
`worldRuntime.lineOfSight` is only ever called with `throughGlass` true (its
default, and the only way `game.js` calls it), and that path ignores
`blocksSight` on glass colliders. So the AI can see through frosted glazing
despite the data saying otherwise. S32 therefore asserts the *data* contract for
both styles and the *runtime* contract for clear glass and for a solid wall, and
documents the gap rather than asserting behaviour that does not exist. Owner
decision needed: either the flag or the raycast should change.

**2. Two manifest rows are stale.** `validateManifest()` is clean, 142 entries,
nothing left at status `spec`. But `VEH-000` and `PROP-000` are both still named
`PLACEHOLDER …` at status `integrated`, and both now have real models — the van
was replaced by `VEH-001`, and the pickups are properly modelled (open the
gallery on `pickup_medkit` and it is plainly a finished prop). The rows should be
renamed or retired.

**3. The `PLACEHOLDER`-cannot-be-`accepted` rule is currently vacuous.** No
manifest entry uses status `accepted` at all; the only statuses in use are
`integrated` and `ready-to-wire`. The test encodes the rule so it starts biting
the moment sign-off begins, but it is not proving anything today. Worth saying
out loud rather than letting a green check imply otherwise.

**4. A broken pane's frame still blocks movement.** After a pane breaks, its own
collider correctly stops blocking sight and movement, but a 0.9 m sill wall below
the glazing still stops a body walking through. That is the surrounding geometry,
not the pane, and S14 asserts it as such — flagging it in case "broken interior
glass is traversable" was meant to mean vaulting works.

**5. The AI is a better hunter than the scenario assumed.** S33 originally
expected a squad to lose the player after ten seconds of hiding. It does not:
responders converge on the last known position and re-acquire, and there is no
teleport destination that reliably hides you — the plaza is visible through the
lobby facade, and the basement gets searched (I verified the re-acquiring
hostiles were genuinely within 5 m at the same y, not seeing through a floor).
This is good behaviour, so the scenario is split rather than weakened: S33
asserts that a responder is only ever still in combat if it has a live contact,
and that the ones who truly lose the player sweep and return to patrol; S33b
stages an isolated pair and asserts the full combat → search → patrol arc.
Combat legitimately persists while a responder is still *walking* to the last
known position, which is why a single-instant assertion was wrong.

**6. Interior sightlines are shorter than the map suggests.** The north corridor
looks like a clean 14 m shot but a door assembly breaks line of sight past about
8 m, and the cubicles' partitions eat a round at 5 m. Both cost me a false
failure. The training room gives a verified clear 14 m line, which is where the
smoke scenario is now staged. Not a bug — worth knowing before staging anything
that needs a long clear line.

**7. Two dev servers were running, on 5173 and 5273.** My shell had `BASE_URL`
pointing at 5273, which was serving a stale transform of `testhooks.js` — a QA
function that demonstrably existed returned `undefined` in probes while the same
call worked in tests. If you are debugging something inexplicable, check which
port you are actually talking to. `playwright.config.js` correctly pins 5173.

**8. HMR reloads make long deterministic runs flaky, and that is now fixed for
tests.** With several agents editing concurrently, Vite full-reloads the page
mid-test, destroying the execution context and the deterministic clock. This
produced screenshot timeouts and visibility failures that looked like real
defects. `tests/helpers.js` (and the tool harness) now fulfil `/@vite/client`
with a stub that keeps the CSS-injection contract and drops the socket, so a
teammate's save cannot reload a test page. I verified the stub is behaviourally
identical on this project — CSS arrives via a `<link>`, and no app module uses
`import.meta.hot`.

## 6. Tools

```bash
node tools/perf.mjs                      # sweep + rewrite docs/perf-summary.md
node tools/perf.mjs --quality low        # any preset from src/core/settings.js
node tools/scene-census.mjs lobby        # draw-unit attribution at a checkpoint
node tools/scene-census.mjs lobby --json artifacts/census-lobby.json
node tools/shot.mjs "/?test=1&qa=1" out.png "qa.openGallery();"   # unchanged contract
```

`tools/lib/harness.mjs` holds the shared boot (deterministic mode, console-error
capture, HMR stub, a `__waitForPlaying()` helper). `shot.mjs` keeps its original
argument contract and `__probe` output and only gained the HMR stub.

Both tools exit non-zero on any console error, so they work as CI gates as well
as inspection tools.
