# QA checklist

Two layers: an automated tour that must be green before anything else, and a
manual pass for the things a machine cannot judge.

## Automated

```bash
npm run qa          # against the dev server on :5173
npm run qa:build    # production build, then the tour against :4173
```

The run must end with:

```
checkpoints      27
failures          0
control failures  0
console errors    0
static issues     0
```

Screenshots land in `qa/screenshots/`, the machine-readable result in
`qa/report.json`.

### Checkpoint manifest

Defined in `src/qa/Checkpoints.ts`. Each entry carries a timestamp, the chapter
and camera that must be active, the subjects that must be inside the frustum,
an optional minimum coverage fraction for the primary subject, an allowed mean
luminance window, and the screenshot filename.

| # | id | t (s) | Chapter | Camera | Must be visible | Extra assertion |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `prologue-text` | 13.5 | Prologue | `prologue.void` | — | luminance 0.002–0.30 |
| 2 | `prologue-title` | 38.5 | Prologue | `prologue.void` | — | luminance 0.004–0.35 |
| 3 | `tatooine-wide` | 50 | The Desert World | `tatooine.establish` | planet | luminance 0.02–0.60 |
| 4 | `tatooine-limb` | 70 | The Desert World | `tatooine.limb` | planet | — |
| 5 | `corvette-enter` | 83 | The Pursuit | `pursuit.enter` | runner | runner ≥ 3% of frame height |
| 6 | `destroyer-nose` | 96 | The Pursuit | `pursuit.reveal` | runner, destroyer | — |
| 7 | `destroyer-overhead` | 104 | The Pursuit | `pursuit.reveal` | destroyer | destroyer ≥ 55% of frame height |
| 8 | `battle-profile` | 122 | The Pursuit | `pursuit.profile` | runner, destroyer | — |
| 9 | `chase-nearmiss` | 140 | The Pursuit | `pursuit.chase` | runner | runner ≥ 12% of frame height |
| 10 | `shields-fail` | 155 | The Pursuit | `pursuit.impacts` | runner | — |
| 11 | `tractor` | 184 | Capture | `capture.tractor` | runner, destroyer | — |
| 12 | `underbelly` | 198 | Capture | `capture.underbelly` | runner, destroyer | — |
| 13 | `corridor-wide` | 214 | The Forward Passage | `corridor.establish` | corridor, rebels | luminance 0.05–0.60 |
| 14 | `door-glow` | 231 | The Forward Passage | `corridor.defender` | corridor, rebels | — |
| 15 | `breach` | 236.5 | The Forward Passage | `corridor.breach` | troopers | — |
| 16 | `firefight` | 246 | The Forward Passage | `corridor.crossfire` | rebels, troopers | — |
| 17 | `vader-entrance` | 275 | The Forward Passage | `corridor.vader` | vader | vader ≥ 30% of frame height |
| 18 | `vader-advance` | 286 | The Forward Passage | `corridor.vader.walk` | vader | — |
| 19 | `plans-projection` | 308 | The Plans | `plans.console` | leia, plans | — |
| 20 | `data-transfer` | 317 | The Plans | `plans.transfer` | leia, r2 | — |
| 21 | `droids-run` | 338 | Pod Six | `pod.run` | r2, threepio | — |
| 22 | `pod-bay` | 347 | Pod Six | `pod.bay` | interiorPod, r2 | — |
| 23 | `pod-launch` | 355 | Pod Six | `pod.launch` | pod, runner | — |
| 24 | `pod-away` | 369 | Pod Six | `pod.away` | pod, runner, destroyer | — |
| 25 | `descent` | 379 | Pod Six | `pod.descent` | pod, planet | — |
| 26 | `epilogue` | 390 | Epilogue | `epilogue.wide` | runner, destroyer | — |
| 27 | `closing-card` | 399 | Epilogue | `epilogue.card` | — | — |

### Control tests

Run after the checkpoints, in the same session:

- [ ] Play then pause: the clock advances, then stops.
- [ ] Scrub backwards and forwards: no one-shot timeline event fires twice.
- [ ] Chapter jumps: each of the eight lands inside its own chapter.
- [ ] Explore mode enters and exits, and the camera returns to the director.
- [ ] Resize to 1280×720, 1920×1080 and 3840×2160: no error, correct aspect.
- [ ] Quality switch low → medium → high: scene rebuilds, clock preserved.
- [ ] Subtitles track narration: the caption at a cue matches the script line.

### Continuous sanity checks

`src/qa/Sanity.ts` runs every frame in QA mode and fails the tour on any of:

- [ ] NaN or infinite position, rotation or scale on any tracked object
- [ ] An object outside its expected world bounds
- [ ] The active camera inside solid geometry
- [ ] A character below the floor plane
- [ ] A chapter with no narration cue
- [ ] Two narration cues overlapping by more than a moment
- [ ] A gap or overlap in the shot list
- [ ] The same narration clip playing twice after a seek
- [ ] A one-shot timeline event firing more than once
- [ ] A WebGL error reported by the context
- [ ] Sustained frame rate below the tier's floor

## Manual pass

Do this once per release build, at 1920×1080 in a maximised window, with sound.

### Startup

- [ ] The loading screen shows real progress with named stages, not a fake bar.
- [ ] "Enter the Galaxy" is the only way in, and audio starts on that click.
- [ ] The console is clean: no warnings, no errors, no deprecation notices.
- [ ] A forced WebGL failure shows the error panel rather than a blank page.

### Playthrough

Watch the whole 6:44 without touching anything.

- [ ] Prologue typography is legible and recedes without shimmering.
- [ ] Tatooine reads as a sphere with atmosphere, not a flat disc.
- [ ] The corvette enters at speed and flies nose-first along its path.
- [ ] The destroyer reveal lands: it fills the frame and feels enormous.
- [ ] Turbolaser bolts take visible time to cross, and impacts shake the lens.
- [ ] The transition from exterior to interior reads as one continuous idea.
- [ ] The corridor is spatially understandable before the close action starts.
- [ ] The cutting seam and the breach are both readable from the defenders' end.
- [ ] Every character is recognisable: trooper, rebel, Vader, Leia, R2, C-3PO.
- [ ] Vader's entrance changes the light, the music and the camera.
- [ ] The transfer of the plans into the droid reads in a single frame.
- [ ] Both droids reach pod six, and the pod visibly leaves the hull.
- [ ] The pod becomes a bright point entering the atmosphere.
- [ ] Narration, subtitles, music and action stay in sync throughout.
- [ ] No camera crosses a wall, a hull or a character.
- [ ] No important action happens off screen.
- [ ] Nothing is painfully loud; the master limiter never pumps audibly.
- [ ] The transport bar auto-hides and never covers a subject.

### Controls

- [ ] Space, `R`, `←`, `→`, `,`, `.`, `1`–`8`, `E`, `C`, `F`, `H`, `D`.
- [ ] Scrubber: drag anywhere, including backwards over a breach or a launch.
- [ ] Chapter selector matches the scrubber ticks.
- [ ] Each mixer slider changes only its own bus; master scales everything.
- [ ] Subtitles toggle on and off without desynchronising.
- [ ] Fullscreen enters and exits, and the canvas resizes correctly.
- [ ] Help panel opens, lists every control, and closes on `H` or `Escape`.
- [ ] Debug overlay shows camera, chapter, time, beat, FPS and draw calls.

### Explore mode

- [ ] `E` pauses nothing by itself; the timeline keeps running underneath.
- [ ] Orbit, WASD, `Q`/`E`, `Shift` and the wheel all behave.
- [ ] Hovering an interactive object highlights it subtly.
- [ ] Clicking opens the card with the right name and description.
- [ ] Follow tracks a moving ship; Inspect frames it; Return restores the shot.
- [ ] You cannot get lost: Return always works, from anywhere.

### Performance and resilience

- [ ] 60 FPS at high on a discrete GPU at 1080p.
- [ ] At least 30 FPS at low on integrated graphics at 1080p.
- [ ] Switching to a background tab suspends audio and stops the frame loop.
- [ ] Returning to the tab resumes without a time jump.
- [ ] Resizing during playback does not stall or distort.
- [ ] A clean clone, `npm install`, `npm run build`, `npm run preview` works.
