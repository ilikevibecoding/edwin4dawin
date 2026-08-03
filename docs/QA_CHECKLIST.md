# QA checklist

Results below are from the final pass: `npm run build` followed by
`node scripts/qa-tour.mjs --preview --width 1920 --height 1080 --controls`, plus
`npm run qa:audio` and `npm run qa:gait -- --preview`. Raw output lives in `qa/report.json`,
`qa/audio-report.json` and `qa/gait-report.json`.

## Automated

### Visual tour — 29/29 checkpoints pass

Every checkpoint renders one deterministic frame, asserts the expected chapter, shot and scene,
evaluates subject screen coverage, frame luminance and clipping, then runs the full sanity sweep.
Per-checkpoint detail is in [CHECKPOINTS.md](CHECKPOINTS.md).

- [x] No checkpoint fails its assertions.
- [x] No frame has more than 30% blown-out pixels (worst measured: 0.7%). This guard runs on every
      checkpoint rather than only on those carrying a brightness assertion, which is how the
      over-scaled escape-pod plume was caught.
- [x] No frame in an interior chapter falls below the readability floor.
- [x] Zero console errors across the whole run.
- [x] Zero uncaught page exceptions across the whole run.
- [x] Runs identically against the dev server and the production build.

### Runtime sanity checks — all clear

Evaluated at every checkpoint and continuously while the debug overlay is open:

- [x] NaN or infinite transforms on the chase frame, either ship, the pod, the camera, the corridor
      root, or any cast member.
- [x] Objects outside expected bounds (corvette drift from the chase frame, destroyer distance).
- [x] Camera inside solid geometry — corridor wall/floor/ceiling clearance, and inside either hull
      in exterior chapters. *This check caught a real defect during development: a reframed escape
      shot put the camera 3 cm inside a corridor wall.*
- [x] Characters below the deck, or hips below a plausible stance.
- [x] Missing assets — narration manifest present, all clips decoded.
- [x] Missing narration cue for any chapter (structural check at boot).
- [x] Gaps or overlaps in the shot list (structural check at boot).
- [x] Narration clips overrunning each other (structural check at boot; also enforced by the
      generator, which exits non-zero on collision).
- [x] Duplicate audio after scrubbing — the one-shot cursor is re-armed on seek and the narration
      player is idempotent by construction.
- [x] Timeline events firing more than once — same mechanism; verified by scrubbing back and forth
      across the breach and re-checking.
- [x] Particle pool overflow.
- [x] WebGL errors and context loss.
- [x] Sustained frame-rate collapse.

### Gait — every sole planted, every step within reach

`scripts/qa-gait.mjs` sweeps the whole interior act, renders two frames a thirtieth of a second
apart at each step, finds each figure's lower ("planted") sole and compares how far that sole
travelled over the deck with how far the body travelled. A figure whose stance foot is nailed down
while the body passes over it scores near 0; one being dragged along with its legs waving scores
near 1. 832 samples, 63 of them with a figure actually travelling.

| Gait | Samples | Mean slip | Worst |
| --- | --- | --- | --- |
| Run | 27 | 0.16 | 0.77 |
| Walk | 12 | 0.13 | 0.36 |
| March | 11 | 0.13 | 0.43 |
| Firing on the move | 10 | 0.15 | 0.34 |

- [x] Every sole stays within 6 cm below and 14 cm above the deck, in every pose including the
      fallen and the crouching.
- [x] Every step lands between 0.25 m and the figure's own leg reach, so no path demands a stride
      the legs cannot cover.
- [x] Two samples of 63 exceed a slip ratio of 0.35 with a sole moving faster than 0.45 m/s, both
      at moments of hard deceleration; the fastest planted sole anywhere is 0.74 m/s, against 17 m/s
      before this pass.

### Audio — 7/7 beats produce signal, nothing clips

| Beat | Peak | Limiter |
| --- | --- | --- |
| Prologue drone + first narration | 0.52 | 0.0 dB |
| Tatooine pad + narration | 0.67 | −0.8 dB |
| Turbolaser salvo + pursuit ostinato | 0.52 | −1.3 dB |
| Door breach + boarding percussion | 0.55 | −0.1 dB |
| Respirator bed + iron motif | 0.55 | −0.9 dB |
| Data transfer blips + strings | 0.42 | −0.7 dB |
| Pod clamps and launch | 0.36 | −0.7 dB |

- [x] All 45 narration clips decode; playback mode reports `audio`.
- [x] AudioContext reaches `running` after the enter gate.
- [x] No beat reaches full scale; the limiter never works harder than about 1 dB.
- [x] Music ducks under narration.
- [x] Spatialised effects track the camera.

### Interface — 12/12 exercises pass

- [x] Play / pause via the transport button and `Space`.
- [x] Timeline advances in real time (verified against wall clock, and verified to hold even at
      software-rasteriser frame rates).
- [x] Chapter panel opens, lists exactly 8 chapters, and jumping lands in the right chapter.
- [x] Timeline scrubbing by drag lands where released; no console errors produced.
- [x] Restart returns to 0:00.
- [x] Subtitles toggle (`C` and the settings switch).
- [x] All four mix sliders present and functional.
- [x] Quality switching Low → High → Medium; each rebuild completes with a clean console.
- [x] Explore mode: entering, selecting the destroyer by click, orbiting by drag, panel appears.
- [x] Debug overlay toggles.
- [x] Help panel toggles.
- [x] Window resize at 1280×720, 2560×1440 and 3840×2160 with no errors and correct framing.

## Manual review

Each chapter was captured at multiple timestamps, inspected as contact sheets, and corrected. The
defects found and fixed this way:

- Planet was never moved to its orbital centre, so the camera flew inside it.
- Camera was being solved before the stage was posed, placing exterior shots against last frame's
  chase transform.
- Dorsal trenches were extruded on the wrong axis and stood off the destroyer as 880 m slabs.
- Hull greebles were scattered on a flat plane and floated beside the tapering hull.
- Battle smoke was sized for a capital ship and swallowed the 150 m corvette.
- Engine glows and near-camera bolts blew out under bloom.
- Interior blocking put a rebel in the archive sightline and a crate in the Vader tracking shot.
- The orbital track ran over the planet's UV pole; rolled the planet so it runs along the equator.
- Junction shoulder walls were single-sided and read as holes from inside the room.
- A CSS specificity bug let an invisible full-screen card swallow every transport click.
- The `?quality=` override was discarded by the GPU probe, so every tour had silently been
  running at the Low preset.
- Playback speed was tied to frame rate: the clock's delta cap made the story run in slow motion
  below 10 fps, which would have desynchronised narration on weak hardware.
- The timeline scrubber tracked drags with pointer capture only, so a drag that left the 22-pixel
  track stopped seeking.

### Motion-review pass

The rendered highlight reel was reviewed shot by shot as a separate exercise, which surfaced
defects that still frames had hidden:

- Figures read as hovering: a single overhead shadow-casting key cannot ground a dozen bodies in a
  corridor lit by practicals. Every character now carries a soft contact decal.
- The princess's robe was an open double-sided cone; leaning forward exposed its unlit interior as
  a dark slab through the front of the dress. It is now closed, single-sided and tall enough to
  enclose the pelvis, and her crouch is a lean rather than a fold.
- Pose changes snapped in a single frame. Poses now cross-fade over 0.72 s.
- The planet's limb crest clipped to featureless white.
- Captions sat low enough to bisect subjects; they now clear the lower third.
- The firefight camera stood half a metre behind a defender's back. It now sits behind the whole
  defended line so a defender frames the edge and the advance reads in depth.

### Staging pass

A final read of every checkpoint frame at 1920×1080, looking only at whether each shot does the job
the story needs it to do:

- The escape pod's hatch surround was a solid slab standing in front of the door, so the droids'
  destination read as a black hole punched in the wall. It is now four bars around a lit door with
  an airlock collar, hazard chevrons, a green ready sign and a practical in the bay.
- The escape pod shared the corvette's engine-halo sprite material. Because the pod is updated
  second and is dark for most of the piece, it had been switching the corvette's engine glow off
  through the entire chase. The pod now owns its material.
- Vader's cape opened above his shoulders, which turned the whole figure into a smooth bell in the
  one shot where he is nothing but an outline. The cape now hangs from the shoulder line and he has
  an armoured yoke and a standing collar.
- The pod separation shot trailed the pod, which put a hundred metres of lit hull directly behind a
  six-metre object. The camera now holds off its quarter with the ships thrown into frame left.
- The separation burn was first authored at the same scale as the re-entry plasma and washed the
  frame to pure white. Caught by the new global clipping guard rather than by eye.
- Breached blast-door leaves came to rest standing upright in the middle of the corridor.
- The warm planet bounce had drifted far enough that Imperial grey was reading as brown.

### Second motion-review pass

The re-rendered reel was reviewed shot by shot again:

- **Stars were drawing straight through both hulls.** The starfield material was `transparent`, which
  puts it in the transparent render list — drawn after all opaque geometry regardless of
  `renderOrder` — and it had the depth test switched off. Against a dark grey hull that reads as the
  ship being full of holes. The shell now sits at 1,600 km, comfortably beyond the planet and inside
  the 2,400 km exterior far plane, and depth-tests normally.
- The data-transfer beam left the middle of the projection and ran straight across the princess's
  face on the one shot where her expression carries the scene. It now leaves the foot of the
  projection, passes below her, and lands on the droid's lit data port.
- Walking read as sliding, and no amount of adjusting amplitudes fixed it. See below.

### Gait pass

The sliding was not a matter of taste, so it was measured rather than tuned. `scripts/qa-gait.mjs`
samples the planted sole against body travel, and the first sweep showed soles moving at up to 17 m/s
under bodies travelling at 5.8 — the figures were not walking at all. Three faults compounded:

- **The knee flexed during stance rather than swing.** In a walk the knee bends while the leg travels
  forward and stays near straight while it takes the body's weight. This did the opposite, so the
  sole was pressed to the deck at the exact moment it swept fastest — the strongest possible skating
  cue. It also bent the wrong way: in this rig a *positive* knee rotation is the anatomical fold, and
  the cycle used negative ones throughout, hyperextending every knee in the piece.
- **The stride was solved from a floored speed** — 0.9 m/s walking, 2.6 m/s running — so a figure
  creeping into position still took full strides.
- **Cadence was fixed per gait,** which can only ever suit one speed, and it could not be made to
  vary: the phase was `t * cadence` with `t` in the hundreds, so any change to cadence made the phase
  leap by tens of radians and the legs blurred through several cycles in a frame.

The cycle is now solved from the foot. Cadence rises with speed and the phase is the integral of it,
built once per figure from its own path, so it stays continuous however the cadence moves. The stance
foot gets a straight constant-speed sweep backwards over the deck at the body's own speed — so it
holds still in the world — and the hip and knee come from a two-link solve that puts the sole there.
The swing hands back into stance at matching speed, so nothing has to stop dead on the deck and wait.

Two further defects fell out of building the measurement:

- **Fallen figures were buried up to the chest.** The collapse pose tipped the body 81° about its own
  origin, which sits on the deck and so already lays it flat and low, and then subtracted a further
  0.86 m on top. A general grounding pass now sets every figure's hip height from where its soles
  are, which also lifted the crouching and the cowering out of the floor.
- **Pose cross-fades dragged the feet.** Averaging a solved stride against whatever the previous pose
  had the legs doing slides the planted foot for the length of the fade. The upper body still
  cross-fades; the legs come straight from the gait, whose amplitude grows from nothing as the figure
  gets under way, so nothing snaps.

Two paths were also too fast for any gait to cover: the boarding party crossed 6.3 m of umbilical in
0.9 s, needing 7 m/s. They now start moving earlier, out of sight behind the door.

### Third motion-review pass

The reel was reviewed again after the gait work, and three further defects came out of reading the
checkpoint frames alongside it:

- **The princess's gown was a lampshade.** Widening it to stop the crouch driving her pelvis through
  it had left a hem 0.7 m across ending above the knee, with a single thin leg and an oversized boot
  below. It is now narrow and floor length, still wide enough at knee height to contain a full stride,
  since a rigid cone cannot drape out of a leg's way.
- **Captions climbed into the middle of the frame at 720p.** The offset was a constant in `rem`, so an
  offset that sits comfortably in the lower third at 1080p covered whoever was standing centre frame
  at a smaller viewport. It now scales with viewport height.
- **The escape pod was a black disc.** It separates on the shadowed side of both hulls, so nothing was
  lighting it and the one shot that has to show it leaving showed a hole in the destroyer's underside.
  A small point light at its nozzles, scaled by thrust, now picks out the hull ribs and the nozzles.
  It has to sit at the nozzles rather than inside the pod, because a light at the centre of a closed
  shape illuminates none of it. The checkpoint also sampled the instant of launch, when the pod is
  still against the hull's apex; it now samples late in the shot where the gap is widest.

### Staging pass on the reframed corridor

- The corridor establishing shot dollied up a 3.4 m wide corridor behind the defenders and ended with
  the lens 40 cm off one of their backs, so the shot meant to establish the geography showed a
  shoulder and two walls. It now holds in the mouth of the archive junction on the centreline, with
  the defenders' start positions pulled forward of it, and the whole depth of the corridor in frame.
- The junction is twice the width of the corridor and its far wall had no light on it at all before
  the archive chapter, so an establishing shot staged there looked into a hole in the ship. A little
  fill is now kept alive from the start of the chapter.
- The screen-coverage measurement projected bounding-box corners that were behind the camera, which
  sends their coordinates through infinity and flips their sign, so a droid standing alongside the
  lens was reported as filling the whole frame. Boxes are now clipped to the near plane first. This
  only ever inflated coverage, so it could have masked a subject that had drifted out of shot.

## Final polish criteria

- [x] The destroyer reveal communicates overwhelming scale — the bow crosses the top of frame at
      about t = 105 and the belly fills the upper half by t = 118, with the corvette held small and
      low in the same frame.
- [x] Tatooine looks spherical and atmospheric — curved limb, warm haze band, dune detail that
      holds up at 52 km altitude, slow rotation, dust veil.
- [x] Both ships fly forward rather than sliding — motion is solved along an orbital track with
      banking derived from lateral velocity.
- [x] Corridor action is spatially understandable — one straight spine, Imperials always from −Z,
      defenders always facing −Z.
- [x] Major characters are recognisable — white-armoured troopers, dark-helmeted rebels, a figure in
      black with a flared helmet and cape, a white-gowned princess with side buns, a blue-and-white
      astromech, a gold protocol droid.
- [x] Vader's entrance has deliberate weight — he arrives only after the shooting stops, troopers
      clear the centre line, the lighting shifts red and cold, the score drops to the Iron motif, and
      a low retreating camera holds him for eleven seconds.
- [x] Leia's transfer of the plans is visually readable — the projection, the beam, the lit data
      port, and a two-shot of her kneeling beside the droid.
- [x] The droids reach the correct pod — a marked, lit airlock hatch at the far end of the aft run,
      with the astromech standing at it and the protocol droid still hesitating behind.
- [x] The pod visibly leaves the ship and approaches the planet — it clears the hull under thrust
      with the ships crowding frame left, then falls with both above it, then descends on a bright
      trail.
- [x] Narration, subtitles, music and action stay synchronised — all driven from one clock, and the
      clock advances by wall time regardless of frame rate.
- [x] No camera crosses through geometry — enforced by an assertion, not by inspection alone.
- [x] No important action happens offscreen — subject screen coverage is asserted per checkpoint.
- [x] No sound is painfully loud — measured peaks and limiter reduction above.
- [x] The interface does not cover important subjects — chrome is docked to the edges and the
      transport auto-hides during playback.
- [x] The experience works after a clean install — `rm -rf node_modules dist && npm install &&
      npm run build && npm run preview` was the final verification path.
