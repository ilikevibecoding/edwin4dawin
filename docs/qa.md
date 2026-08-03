# QA

## Running it

```bash
npm run dev            # in one terminal
npm run qa             # in another
```

or, against the production build:

```bash
npm run build
npm run qa:build
```

Useful flags:

| Flag | Effect |
| --- | --- |
| `--realtime` | Also plays the whole piece through at wall-clock speed, sampling frame rate and sanity checks every 2 s |
| `--only=vader-entrance,plans` | Restrict to named checkpoints |
| `--controls-only` / `--no-controls` | Skip one half of the run |
| `--width=` / `--height=` | Viewport (default 1600×900) |
| `--out=qa/output/run1` | Artefact directory (default `qa/output/latest`) |

The tour writes one PNG per checkpoint plus `report.json`, and exits non-zero if
anything failed.

## What the tour does

1. Loads the page, waits for the loading gate to unlock, clicks **Enter the
   galaxy**, and pauses the timeline.
2. Reads the global structure: duration, chapters, shots, camera coverage gaps,
   duplicate event ids, missing narration clips, narration fallback state.
3. For each checkpoint: seeks to `t − preroll`, runs `preroll` seconds of show
   time deterministically so transient effects are in flight, settles twelve
   frames, screenshots, then runs that checkpoint's assertions plus the global
   sanity checks.
4. Exercises every control (below).
5. Optionally plays the whole piece in real time.
6. Collects console errors and warnings, filtering only the noise headless
   Chrome always emits about audio devices and software WebGL.

## Checkpoint manifest

Defined in [`src/qa/checkpoints.ts`](../src/qa/checkpoints.ts) and exposed to
the harness through `window.__show.checkpoints`. Each entry carries a timestamp,
the expected chapter and shot, a description of what must be visible, a
screenshot filename, an optional preroll, and assertions.

| # | id | t (s) | Chapter | Shot | Expected | File |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `prologue-open` | 6.5 | prologue | void | Black field, first gold card legible, starfield still dim | `01-prologue-open.png` |
| 2 | `prologue-late` | 29 | prologue | void | Final card receding, starfield at full brightness | `02-prologue-late.png` |
| 3 | `planet-reveal` | 44 | tatooine | planet-reveal | Tatooine limb across frame, bright atmospheric edge, no ships | `03-planet-reveal.png` |
| 4 | `planet-drift` | 56 | tatooine | planet-drift | High drift over the day side | `04-planet-drift.png` |
| 5 | `runner-entry` | 70.5 | pursuit | runner-entry | Corvette past the lens at close range, engines lit | `05-runner-entry.png` |
| 6 | `runner-track` | 81 | pursuit | runner-track | Hammerhead, hull stripe and engine cluster all legible | `06-runner-track.png` |
| 7 | `destroyer-arrives` | 104 | pursuit | destroyer-reveal | Destroyer bow entering from the top of frame | `07-destroyer-arrives.png` |
| 8 | `destroyer-overhead` | 112 | pursuit | destroyer-reveal | Belly fills most of the frame; corvette tiny beneath | `08-destroyer-overhead.png` |
| 9 | `battle-profile` | 126 | pursuit | battle-profile | Two-shot with turbolaser bolts in flight and shield flash | `09-battle-profile.png` |
| 10 | `drives-hit` | 138 | pursuit | engines-hit | Corvette stern, engines failing | `10-drives-hit.png` |
| 11 | `tractor` | 158 | capture | tractor | Tractor beam from the destroyer belly | `11-tractor.png` |
| 12 | `alongside` | 172 | capture | alongside | Corvette dwarfed against the destroyer flank | `12-alongside.png` |
| 13 | `corridor-establish` | 190 | corridor | corridor-establish | White corridor, sealed door, rebels taking positions | `13-corridor-establish.png` |
| 14 | `defender-eye` | 202 | corridor | defender-eye | Eye level behind the line; the door glowing where it is cut | `14-defender-eye.png` |
| 15 | `breach` | 207.9 | corridor | door-breach | Door tearing inward, debris and smoke, camera shake | `15-breach.png` |
| 16 | `firefight` | 220 | corridor | firefight | Bolts crossing in both directions; troopers advancing | `16-firefight.png` |
| 17 | `vader-entrance` | 246 | corridor | vader-entrance | Low angle, red key, troopers turned toward him | `17-vader-entrance.png` |
| 18 | `plans` | 269 | plans | plans-projection | Leia beside the station schematic, both readable | `18-plans.png` |
| 19 | `transfer` | 280 | plans | transfer | The plans collapsing into the astromech | `19-transfer.png` |
| 20 | `droids-run` | 293 | pod | droids-run | Both droids moving aft, astromech leading | `20-droids-run.png` |
| 21 | `pod-bay` | 303.4 | pod | bay | Pod broadside in its cradle, astromech on the platform | `21-pod-bay.png` |
| 22 | `pod-launch` | 308.8 | pod | tube | Hatch open on the starfield, pod running out | `21b-pod-launch.png` |
| 23 | `pod-away` | 313 | pod | pod-away | Pod clear of the corvette, thrusters lit | `22-pod-away.png` |
| 24 | `descent` | 320 | pod | descent | Pod as a bright point against Tatooine | `23-descent.png` |
| 25 | `epilogue-wide` | 330 | epilogue | final-wide | Destroyer and corvette above, pod falling | `24-epilogue-wide.png` |
| 26 | `closing-card` | 340 | epilogue | closing-card | Closing line legible over the final frame | `25-closing-card.png` |

Assertions are written against a small context (`CheckpointContext`) offering
`onScreen(id, margin)`, `screenSize(id)`, `visible(id)` and the live world,
director and timeline. Examples in use:

- the corvette is inside the safe frame and at least 6 % of the viewport at
  `runner-entry`;
- the destroyer covers more than half the viewport at `destroyer-overhead`;
- at least one turbolaser bolt is in flight at `battle-profile` and at least one
  blaster bolt at `firefight`;
- the blast door has actually blown in at `breach`;
- Vader is visible and inside the safe frame at `vader-entrance`;
- the astromech is on screen at `pod-bay`;
- the region is `exterior` again by `pod-away`.

Every checkpoint additionally asserts that the active shot and chapter are the
ones the manifest names, which catches an accidental retiming.

## Runtime sanity checks

[`src/qa/sanity.ts`](../src/qa/sanity.ts) runs from the diagnostics overlay and
from every checkpoint.

| Code | Severity | Catches |
| --- | --- | --- |
| `nan-transform`, `nan-rotation` | error | Non-finite positions or quaternions on the camera, ships or pod |
| `out-of-bounds` | error | Anything that has wandered past ±60 km |
| `camera-in-wall` | error | Interior camera outside the corridor or bay half-width |
| `camera-through-floor` | error | Interior camera below the deck or above the ceiling |
| `camera-out-of-set` | error | Interior camera beyond either end of the set |
| `figure-off-floor` | error | A character more than 8 cm off the deck under it (the pod bay's boarding platform and ramp are modelled, so climbing them is legal) |
| `figure-in-wall` | warn | A character outside the corridor or bay |
| `figure-off-set` | warn | A character past either end of the set |
| `missing-narration` | warn | Narration cues with no decoded clip |
| `audio-peak` | warn | Master peak above 0.985 |
| `webgl-error` | error | Any `gl.getError()` since the last check |
| `low-fps` | warn | Under 18 fps |
| `nan-vertex`, `missing-geometry`, `missing-material` | error | Scanned once over the whole graph after construction |

The timeline separately reports duplicate event ids and events that fired more
than once; the tour treats both as failures.

## Controls covered

`play / pause button`, `timeline scrubbing (no duplicate audio)`, `restart`,
`chapter selector`, `scrubber drag`, `subtitle toggle`, `audio mixer`,
`quality switching`, `diagnostics overlay`, `help panel`,
`explore mode: orbit, pick and inspect`, `window resize`, `fullscreen request`,
`keyboard shortcuts`.

The resize test cycles 1280×720, 2560×1440, 900×1400 and back, asserting the
renderer still draws at each. The explore test drags to look, walks with `W`,
selects Vader, opens the inspector, uses **Inspect** and **Follow**, re-runs the
sanity checks from inside explore mode, and then returns to the cinematic
camera.

## Manual checklist

Things the harness cannot judge, checked by eye against the captured frames:

- [x] The destroyer reveal communicates overwhelming scale
- [x] Tatooine reads as a sphere with atmosphere and surface variation
- [x] Both ships fly along their heading rather than sliding sideways
- [x] Corridor geography is established before the close action
- [x] Rebels, stormtroopers, Vader, Leia, R2 and C-3PO are identifiable in
      silhouette and colour
- [x] Vader's entrance changes the light, the music and the blocking
- [x] The transfer of the plans into the astromech is legible
- [x] The droids reach the pod and the pod visibly leaves the ship
- [x] Narration, subtitles and action stay in sync across a scrub
- [x] No camera crosses geometry in any shot
- [x] Nothing important happens off screen
- [x] Master output is compressed and limited; no cue peaks painfully
- [x] The interface does not cover the subject of any shot

## Last full run

Against `dist/` served by `vite preview`:

```
checkpoints  26/26 passed
controls     14/14 passed
console      0 error(s), 0 warning(s)
result       PASS
```

The `--realtime` playthrough of the same build completed the full 344 s
timeline with no NaN transforms, no WebGL errors and no duplicate audio, and
found two defects that the checkpoint sweep could not: the interior region was
being switched on half a second before the cut that hides it, and the protocol
droid's climb key was placed short of the boarding ramp so he lerped into the
air over the last half-metre of deck. Both are fixed.

## Known environment caveat

The QA container has no GPU, so Chrome runs on SwiftShader. Every checkpoint
logs a `low-fps` warning, which is expected here and is not a property of the
piece. Two consequences worth knowing about:

- The render loop clamps its own delta at 0.1 s, so below ten frames a second
  the show plays in slow motion rather than skipping. The realtime pass
  therefore reports a `speedRatio` and watches for a stall instead of enforcing
  a wall-clock budget; on this hardware it runs at about 0.09× real time.
- Frame-rate figures for real hardware have to be taken from a desktop browser.
  What can be measured here is the draw-call budget, which peaks at about 800
  calls in the corridor and 1 700 in the chapter where the holographic
  schematic and the whole cast are on screen at once.
