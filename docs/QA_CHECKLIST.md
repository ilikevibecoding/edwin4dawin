# QA checklist

Results below are from the final pass: `npm run build` followed by
`node scripts/qa-tour.mjs --preview --width 1920 --height 1080 --controls`, plus
`node scripts/qa-audio.mjs`. Raw output lives in `qa/report.json` and `qa/audio-report.json`.

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

### Audio — 7/7 beats produce signal, nothing clips

| Beat | Peak | Limiter |
| --- | --- | --- |
| Prologue drone + first narration | 0.45 | 0.0 dB |
| Tatooine pad + narration | 0.54 | −0.5 dB |
| Turbolaser salvo + pursuit ostinato | 0.56 | −2.5 dB |
| Door breach + boarding percussion | 0.58 | −0.5 dB |
| Respirator bed + iron motif | 0.50 | −1.2 dB |
| Data transfer blips + strings | 0.49 | −0.2 dB |
| Pod clamps and launch | 0.49 | −0.8 dB |

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
- Slow, deliberate walks read as sliding. The stride amplitude was solved purely from path speed
  with a floor of half, which at a deliberate pace is a stride too small to see at ten metres. The
  floor is now high enough that a walk is a walk, with a deeper bob and a wider arm swing.
- The data-transfer beam left the middle of the projection and ran straight across the princess's
  face on the one shot where her expression carries the scene. It now leaves the foot of the
  projection, passes below her, and lands on the droid's lit data port.

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
