# Known issues

> ## Resolution status (updated by the lead after the final integration pass)
>
> **63 of 63 Playwright scenarios pass. Zero console errors and zero console warnings** across a
> full room tour and a full mission. The ranked list below is preserved as written because the
> analysis is worth keeping; this block records what happened to each item.
>
> | # | Defect | Status |
> | ---: | --- | --- |
> | 1 | Openings in north–south walls cut at the mirror of their doorway | **Fixed.** `buildWalls` now uses `seg.axis === 'z' ? seg.b - o.at : o.at - seg.a`. All 34 walk-through openings sweep clear with the player capsule. `src/mission/level-repair.js` was deleted with it. QA was right and the lead's "false positive" reading was wrong — see `progress.md`. |
> | 2 | A hostile alerts itself with its own gunfire | **Fixed.** Noise events carry `sourceId` and a listener ignores its own; an ally's shot is no longer treated as evidence of the player's position; one gunshot now raises one radio alert instead of one per listener. `alertCount` over an identical 60 s firefight fell from 924 to 33. |
> | 3 | Seven quality-preset knobs never reach a player who changes quality | **Fixed.** `Engine.applyQuality` now also walks every texture in the scene for anisotropy, resizes and disposes the shadow map, and sets the shadow refresh cadence. |
> | 4 | QA checkpoints standing the player inside a prop | **Fixed.** `reception`, `conference`, `loading` and `archive` moved; the load reports no snap warnings. |
> | 5 | The garage shutter carries no `assetId` | **Fixed.** Tagged `ARCH-GARAGE-SHUTTER` when the curtain is rebuilt. |
> | 6 | 65 registered records never instantiated | **Reduced to 4.** Sub-parts now declare `componentOf` and are covered by their parent; weapons register an instance when their view model is built; the missing service infrastructure was actually built (item 8 below). Remaining: `PROP-CUBE-PANEL-SIDE`, `CLUT-STAPLER`, `CLUT-BADGE` (registered prop variants the populator does not currently place) and `WPN-CS12-BREAKER` (only instantiated when chosen in the loadout). |
> | 7 | The archive crushes 44% of the frame to black | **Fixed.** Two causes: the light-culling score weighted priority so heavily that a room's own strip lights lost to distant accents, and the checkpoint faced a shelf bay half a metre away. Archive now measures 56/255; every room is above the readable floor of 42. |
> | 8 | Six stairwell/service checkpoints have almost nothing in view | **Fixed.** `buildServices()` builds the ductwork, pipework, cable trays, access panels, floor drains, loading dock, atrium columns and half walls the brief calls for. |
> | 9 | Snow particles and a scrim plane inside the playable volume | **Fixed.** Weather geometry is excluded from raycasts, haze moved outside the playable bounds, and wind streaks are culled 1.5 m inside a doorway. |
> | 10 | `level-repair` warns and does work on every load | **Fixed.** Deleted along with its imports once item 1 was fixed at source. |
> | + | A hostage told to hold followed the player anyway | **Fixed.** The hold order now anchors a position, discards cover chosen while escorting, restricts cover-seeking to 3 m of the anchor, and walks back once it is quiet. |
>
> ### Found after release, fixed
>
> **The central stair trapped the player on the flight** (reported by a player; `v1.0.1`). You could
> climb the stairs and then not step off them, which made the mezzanine — and hostage B — unreachable
> on foot and the mission impossible to finish.
>
> Two things combined. The strip of landing beyond the top tread measured 0.60 m between the shaft
> edge and the north wall, and a player capsule is 0.66 m across, so there was nowhere to stand. And
> the balustrade ran the full length of the flight at full height, walling it in on both sides, so
> stepping sideways onto the wide landing strips was blocked too.
>
> The fix shortens the going from 280 mm to 260 mm (head clearance 0.60 m → 0.96 m), stops the
> balustrade 0.95 m short of the top with a newel post so you can step off sideways as you would on a
> real open stair, and adds a build-time guard that warns at load if any flight's head or foot
> landing is narrower than a capsule.
>
> **Why the test suite missed it, and what now covers it.** Every navigation test passed throughout,
> because `NavGrid` bakes explicit stair links and its 0.35 m cells never asked whether a 0.66 m
> capsule could round the corner — so the grid returned a route that the player controller physically
> could not walk. `tests/traversal.spec.js` closes that gap: it asks the navigation grid for its own
> route to each hostage and then *drives the real controller along it*, so a path that only exists on
> the grid now fails.
>
> ### Remaining, accepted
>
> - **`effects.decalsPooled` differs between a restart and a fresh insertion.** It is a decal pool
>   high-water mark, not game state; the same-seed digest is identical and every gameplay value
>   resets. Left as-is.
> - ~~Three registered prop variants are never placed.~~ **Fixed.** The stapler is on the copy-room
>   mail-sort table and in a cubicle desk kit, the visitor badge is on the reception counter, and two
>   spare cubicle side panels lean against the loading-bay wall. `assets.unusedRecords()` now returns
>   an empty list: **all 477 records have at least one instance.**
> - **Frame cost under SwiftShader is not representative.** Every performance figure in this
>   repository is measured through software rendering, so absolute milliseconds mean little; the
>   trustworthy numbers are engine CPU time (0.85–0.94 ms mean across presets) and draw calls
>   (746 median). No room costs dramatically more than its peers and `low` never costs more than
>   `high`.
> - **The enemy aim pose is straighter at the elbow than the carry pose.** Hostiles now drop to the
>   carry pose while repositioning, which removes most of the exposure, but the pose data itself
>   could still be softened.

---

Compiled by **opus4** (testing, performance, tools, release quality) from a full
`npx playwright test` run, `npm run shots`, `node tools/audit.mjs`, and the
diagnostic tools listed against each item.

**Nothing here has been fixed by me** — I own `tests/**`, `tools/**`,
`src/qa/**`, `playwright.config.js` and these two documents, so every item names
the owning agent, the evidence and a suggested direction. Where I could not tell
a real defect from an artefact of my own measurement, I say so.

## Status of this pass

**63 of 63 tests pass, in 16.9 minutes on one worker. 18 of 29 checkpoints are
inside every audit bar.** Zero console errors
across the whole suite, and zero across a full mission driven by
`node tools/console.mjs` — menus, insertion, combat, rescue, extraction and both
endings. One console warning survives an entire run, and it is item 1 below.

Every defect the previous pass listed (#1 through #10: the missing entry point,
the missing manifest, the unreachable mission, the clamped `advanceTime`, the
non-identical restart, the presentation that ran while paused, the pointer-lock
rejection, the `aiFrozen` flag in the player path, the blanket `aria-live`, and
the unobservable console errors and frame timing) is **fixed and verified by a
passing test**. The suite is now measuring the game rather than failing to reach
it.

Two things the lead asked me to confirm or refute:

- **`[mission] opening ... was sealed` is not a false positive.** It is item 1,
  and the detector is right. A collision query at those doorways comes back clear
  because `level-repair` has already cut them open by the time anything can look.
- **`[ai] ENEMY_POSTS ... snapped` is gone.** Neither warning appears in a full
  run; the only console output at all is item 1 plus two `[props]`/`[optimize]`
  info lines and Vite's own two debug lines.

## Ranked defects

### 1. Every opening in a north–south wall is cut at the mirror of its doorway
**Severity: major. Owner: Fable 2 (map architecture), `src/map/build.js:373-379`.**

`wallWithOpenings` builds a wall along its local +X and takes each opening's
position as a distance from the wall's `a` end. `buildWalls` passes
`x: o.at - seg.a` for every wall, but then rotates north–south walls by `+π/2`
about Y, which maps local +X onto world **−Z**. So on a z-axis segment the hole
ends up at `(seg.a + seg.b) - o.at` — the mirror of the doorway about the
segment's midpoint — while `buildOpening` puts the frame, the door leaf and the
collision aperture at `o.at`.

`node tools/mirror.mjs` rebuilds each segment in isolation from the shipping kit
and reads back where the gap actually lands. **Eleven of 53 openings are
mirrored, and every one of them is on a z-axis segment**; the 40 that are correct
are all x-axis, plus 14 z-axis openings that happen to sit near enough to their
segment's midpoint that the mirror lands back on the doorway and hides the bug.
The worst are far from subtle:

| Opening | Rooms | Doorway at | Hole at | Off by |
| --- | --- | --- | --- | --- |
| `op-office-conf-door` | openoffice / conference | 0.9 | 6.1 | 5.2 m |
| `op-lobby-waiting` | lobby / waiting | −6.4 | −2.1 | 4.3 m |
| `op-lobby-waiting-glass` | lobby / waiting | −2.6 | −5.9 | 3.3 m |
| `op-exec-glass` | execcorr / execoffice | −5.1 | −7.9 | 2.8 m |
| `op-waiting-weststair` | waiting / weststair | −5.5 | −3.0 | 2.5 m |
| `op-archive-wstair` | archive / upperweststair | −2.4 | −1.1 | 1.3 m |
| `op-rest-office` | openoffice / restrooms | 6.5 | 7.5 | 1.0 m |

The mission is playable because `src/mission/level-repair.js` cuts the sealed
walk-through doorways open at load, which is what its warning is telling you. Two
things survive the repair. Measuring the built level with the repair's patch
meshes excluded, **no walk-through doorway is left sealed, but three unintended
apertures remain** where the mirrored hole was punched and nothing filled it
in — `op-waiting-weststair` near z −3.0, `op-rest-office` near z 7.5 and
`op-archive-wstair` near z −1.1. Those are holes through walls that the layout
says are solid. And the glazed openings are not repaired at all, because
`level-repair` only looks at walk-through routes: `op-lobby-waiting-glass`,
`op-exec-glass`, `op-office-conf-glass` and `op-landing-win` have their glass in
the designed position and their hole somewhere else.

Suggested direction, which is also what the warning text says:

```js
const localOps = ops.map((o) => ({
  x: seg.axis === 'z' ? seg.b - o.at : o.at - seg.a,
  ...
}));
```

That is a one-line change and it should let `level-repair` retire. Verify with
`node tools/mirror.mjs`, which should report 0 mirrored.

### 2. A hostile alerts itself with its own gunfire, so the garrison never stands down
**Severity: major. Owner: AI (`src/ai/enemies.js:857-886` and `1572-1578`).**

`_shoot` emits `world:noise` with `source: 'enemy'` and **no shooter id** — only
`EVT.ENEMY_FIRE` carries `id`. `_hear` tries to compensate:

```js
if (n.source === 'enemy' && n.kind === 'gunshot' && !this.facilityLoud) {
```

which has two holes. Without an id, a hostile cannot tell its own muzzle report
from a comrade's even in the branch meant for friendly fire; and once
`facilityLoud` is true the branch is skipped altogether and a hostile's own shot
is processed as a generic loud event.

`node tools/selfalert.mjs` isolates one hostile with nobody else alive, so
anything that happens to it can only have come from itself:

| | quiet facility | loud facility |
| --- | --- | --- |
| awareness | 0 → 0.65 | 0 → 0.85 |
| state | idle → suspicious | suspicious → investigate |
| radio alerts raised | 0 | 1 per shot (3 more shots → 3 more) |
| `lastKnownPos` | its own muzzle, `13.24, 0, 2.13` | its own muzzle, `13.3, 0, 2.4` |

The hostile stood at `13.09, 0, 2.12`. It walked its own awareness to the heard
ceiling and wrote its own position down as the player's last known location.

Consequences, in order of how much they hurt: a hostile in combat re-alerts
itself on every round it fires, so awareness never decays and no hostile ever
returns to patrol once it has fired; `raiseAlert` is called once per shot, so a
single exchange trips `alertsToGoLoud` and the whole garrison goes loud from one
hostile's own trigger; and `lastKnownPos` is repeatedly overwritten with the
shooter's own feet, which degrades the search behaviour that the state machine is
otherwise good at. `tests/ai.spec.js:182` only observes the investigate → search
→ give-up arc at all because it reduces the garrison to a single hostile first,
and it has a comment saying so.

Suggested direction: put `id: e.id` in the `world:noise` payload from `_shoot`
and drop `n.id === e.id` unconditionally, before the `facilityLoud` test.

### 3. Half of `QUALITY_PRESETS` never reaches the game when a player changes quality
**Severity: major (release quality). Owner: Opus 1 (`src/core/engine.js:84-92`).**

`applyQuality` is the only thing wired to a quality change, and it sets shadow
enable, the shadow refresh interval, the anisotropy ceiling and the resolution
scale. The other seven knobs are read once during level build, or never.

`node tools/qualityknobs.mjs` boots at `high`, measures the live scene, switches
to `low` exactly the way the settings screen does, measures again, then boots
fresh at `low` for comparison:

| Observation | at `high` | after switching to `low` | fresh boot at `low` |
| --- | --- | --- | --- |
| `shadows` | true | **false** | false |
| `shadowRefreshInterval` | 3 | **1** | 1 |
| pixel ratio | 1 | **0.75** | 0.75 |
| particle scale | 1 | **0.4** | 0.4 |
| shadow map size | 2048 | 2048 | **512** |
| decal budget | 160 | 160 | **48** |
| prop density in use | 1 | 1 | **0.55** |
| instanced prop count | 1138 | 1138 | **1058** |
| anisotropy on live textures | 8 | 8 | **1** |

So a player whose framerate has collapsed — which is the only reason anyone opens
that menu mid-mission — turns quality down and keeps a 2048×2048 shadow map,
8× anisotropic filtering on every texture in the level, a 160-decal pool and full
prop density. They get the four cheap wins and none of the expensive ones.
`lodBias` is worse than build-time: grepping the tree, **nothing reads it at
all** (`enemies.js` has its own hard-coded `_lodBias = 1` that is not this
setting).

Suggested direction: either re-apply what can be re-applied on the bus
(`shadow.mapSize`, `decals.budget`, and anisotropy by walking live textures) and
document prop density as build-time; or have the settings screen say plainly that
a quality change takes full effect on the next insertion. Silently applying a
third of a setting is the one option that helps nobody.

### 4. Four QA checkpoints stand the player inside a prop
**Severity: moderate. Owner: Fable 2 (map) with Fable 3 (props), `CHECKPOINTS` in `src/map/layout.js`.**

`tests/movement.spec.js` surveys every checkpoint by raycasting at knee height
(0.55 m, where a desk stops a capsule but a wall test would not) in all four
horizontal directions, and writes the result to
`artifacts/movement-wasd.json`. Clearance beyond the player's 0.33 m radius:

| Checkpoint | north | south | east | west |
| --- | --- | --- | --- | --- |
| `janitor` | 1.12 | 0.56 | 0.86 | **0.00** |
| `serverroom` | 1.62 | **0.00** | 0.31 | 0.31 |
| `loading` | 2.03 | 0.36 | **0.00** | 1.02 |
| `archive` | 2.53 | **0.00** | 1.14 | 9.96 |

Zero means the ray hit something before it cleared the capsule: the player is
already touching a rack, desk or crate the moment they arrive. It is not fatal —
the collision solver pushes them out and nothing gets stuck — but it makes those
four rooms awkward to enter and it is the reason `movement.spec.js` has to search
for somewhere to run its four-way test instead of naming a room.

`weststair` and `upperweststair` are the tightest at 0.21 m east and 0.31 m west,
which is a 1.1 m stair shaft. That is defensible for a service stair, but see
item 8: it is also why the audit reads those two checkpoints as unfurnished.

### 5. The garage shutter carries no `assetId`
**Severity: moderate. Owner: Fable 2 (map architecture) / doors.**

`ARCH-GARAGE-SHUTTER` is registered in the manifest and **never instantiated**,
yet the shutter is plainly built: `node tools/probehit.mjs` finds its mesh under a
`shutter:DOOR-GARAGE` group, and the view probe at the `garage` and `extraction`
checkpoints reports 9 of 45 rays landing on geometry with no asset id — those
nine are the shutter. It is the whole reason both checkpoints sit at severity 18
in `artifacts/audit.md`, resolving 2 assets against a bar of 3: tag the shutter
and both go clean.

It matters more than one untagged mesh usually would, because the shutter is the
extraction route: it is the last thing the player looks at in a successful run,
and it is invisible to every asset-coverage check the project has.

### 6. Sixty-five registered records are never instantiated, including things on screen every frame
**Severity: moderate. Owner: Fable 4 (characters, animation) and Fable 3 (props), listed per record.**

`artifacts/audit.md` lists all 65 against 464 registered. Most are a content gap
that is fine to defer, but three groups are not:

- **All 26 `ANIM-*` records.** Nothing in the scene graph is tagged with an
  animation id, so the animation manifest is entirely unverifiable — `assets.spec.js`
  can only check that the records are well formed, which it now does with
  category-aware required fields so that animations are not failed for lacking
  `materials` and `textures`.
- **`CHAR-VM-ARMS` and all seven `WPN-*` view models.** The first-person weapon
  is on screen in every gameplay frame of all 274 screenshots, and none of that
  geometry is tagged. The same is true of the four `CHAR-HEAD-*` records while
  hostiles are visibly wearing balaclavas and headsets.
- **Sixteen `ARCH-*` records** including `ARCH-COLUMN`, `ARCH-DUCT`, `ARCH-PIPE`,
  `ARCH-CABLETRAY` and `ARCH-CEIL-TILE-MISSING`. Ducts and cable trays are
  exactly what would fix item 8.

### 7. The archive crushes 44% of the frame to black
**Severity: moderate. Owner: Fable 2 (lighting rig), `src/map/lighting.js`.**

Worst single readability finding in the audit: mean luminance 0.22 with 44% of
pixels at or below 0.015 luminance. The room is not unlit — 193 distinct colours
and the archive racks read clearly — but nearly half the image carries no
information at all. `execoffice` (26%), `upperlanding` (30%) and `loading` (31%)
are the next worst. The lead's fix for the unlit archive raised the mean; the
shadow side is still solid black.

Cross-check before changing anything: this is measured through SwiftShader with
no colour management surprises, and `visual.spec.js` measures the same quantity
on the canonical matrix and agrees.

### 8. Six stairwell and service checkpoints have almost nothing in view
**Severity: moderate, and partly a limitation of my own audit — read both halves. Owner: Fable 3 (props).**

`stairwell`, `weststair`, `upperweststair`, `janitor`, `serverroom`, `mechanical`
and `loading` all trip the audit's "may be unfurnished" bar at 70–87 distinct
colours, and the three stairs show only one or two registered assets in view.
The three stairs are the top three severities in `artifacts/audit.md` at 26 each.

The honest reading is split. For `weststair` and `upperweststair` the audit is
measuring a wall: every one of the 45 probe rays terminates between 0.53 m and
0.96 m, because the checkpoint faces the shaft wall at half a metre (item 4). A
colour count taken from a wall 60 cm away says nothing about the room, and I
would not file that as a content defect on its own. For `janitor`, `serverroom`,
`mechanical` and `loading` the probe does see the room — depth out to 4–18 m,
five or six assets — and those rooms genuinely are bare boxes with a rack or two.

Two actions fall out of it, one each: dress the service rooms (`ARCH-DUCT`,
`ARCH-PIPE`, `ARCH-CABLETRAY` and `ARCH-ACCESS-PANEL` are registered and unused,
item 6); and my audit should frame each room from its centre along its longest
axis rather than trusting the checkpoint's yaw, which is a change to
`tools/audit.mjs` I have not made this pass.

### 9. Snow particles and an invisible scrim plane sit inside the playable volume
**Severity: low. Owner: Fable 4 (weather/VFX) with Fable 2 (map).**

Two overlapping findings, neither visible in a screenshot, both real:

- The snow field is a `Points` cloud centred on the camera, and it is present
  **inside** the extraction garage: at the `extraction` checkpoint all 45 probe
  rays pass through particles, at ranges from 0.9 m.
- The `insertion` checkpoint at `0, 1.68, −21` stands **inside** an unlit
  44 × 9 m double-sided `PlaneGeometry` scrim at `0, 3.2, −21`.

Both have `depthWrite: false`, so the courtyard renders correctly
(`artifacts/screenshots/audit-insertion.png`) and there is nothing for a player
to see. I am reporting it because it cost me a false defect: with those two
counted as hits, the view probe reported the courtyard and the garage as *100%
untagged geometry with no assets visible*, which reads exactly like a room that
was never dressed. `QAMode.probeView` now counts only depth-writing meshes and
reports the rest as `overlayHits`, and the same three checkpoints now resolve
`ARCH-FLOOR-SNOW`, `ARCH-WALL-EXT`, `MAINT-BOLLARD`, `ARCH-DOORFRAME` and
`DOOR-GLASS`. The scrim's placement is still worth a look: a backdrop plane
coplanar with a spawn point is an accident waiting to become visible the moment
someone gives it `depthWrite: true`.

### 10. `level-repair` warns, and does work, on every single load
**Severity: low while item 1 stands, then delete. Owner: Opus 1 / mission (`src/mission/level-repair.js`).**

The one console warning that survives a full run. It is correct and its diagnosis
of item 1 is correct — the message names the exact expression and the exact fix,
which is genuinely good defect reporting and is how I found item 1 as fast as I
did. Two notes for whoever owns it:

- It is a `console.warn` on the happy path of every load, so any release gate
  that forbids console output fails until item 1 lands. `tests/boot.spec.js`
  deliberately allows warnings and fails only on errors, for exactly this reason.
- It repairs walk-through routes only, so the four glazed openings in item 1 stay
  broken, and it leaves the mirrored hole behind (three unintended apertures).
  Once `build.js` is fixed this module should go, rather than becoming permanent.

## Not defects

- **Draw calls oscillate between frames by design.** `engine.shadowRefreshInterval`
  throttles the shadow pass, so `renderer.info.render.calls` alternates between
  roughly 870 and 1250 at `medium`. No test asserts an exact count.
  It does mean a *single-sample* draw-call comparison between presets is
  meaningless — `artifacts/performance.json` shows `medium/lobby` at 1249 against
  `high/lobby` at 856 purely because one sample landed on a shadow frame and the
  other did not.
- **Frame times have wild outliers that are not the game's.** Under SwiftShader a
  frame doing byte-for-byte identical GL work costs anywhere from 4 ms to 13 s
  depending on how the host scheduled it; `node tools/shadowcost.mjs` shows the
  spikes land regardless of shadow-refresh phase and with zero new shader
  programs compiled, and engine CPU time stays under 2.5 ms right through them.
  Everything I report ranks on **median** frame cost for this reason, with engine
  CPU alongside it.
- **`combat.lastShot` and the `IMPACT` bus payload describe points differently** —
  records use `point: [x, y, z]`, the damage payload carries live `THREE.Vector3`
  clones. Both are reasonable in place and the harness normalises them; worth a
  comment on the contract rather than a change.

## Re-running this pass

```bash
npm test                     # 63 tests, 15 files, one worker, ~17 min
npm run shots                # artifacts/screenshots/ + index.md
node tools/audit.mjs         # artifacts/audit.{json,md}, ~14 min
node tools/console.mjs       # every console message, attributed to a module
node tools/mirror.mjs        # item 1
node tools/selfalert.mjs     # item 2
node tools/qualityknobs.mjs  # item 3
node tools/probehit.mjs      # items 5 and 9
node tools/probecheck.mjs    # the view probe, without a 14-minute audit run
node tools/shadowcost.mjs    # frame cost attribution, "not defects" above
```
