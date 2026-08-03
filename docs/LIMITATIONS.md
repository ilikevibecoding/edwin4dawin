# Known limitations

An honest list of what this build does not do, or does imperfectly.

## Verification environment

Everything in this repository was developed and verified on a machine with **no GPU**. The
automated tour, the audio test and the demo video all ran through Chrome's SwiftShader software
rasteriser, which renders the exact same frames but at roughly 2–6 fps at 1080p. Consequences:

- Frame rates quoted in `qa/report.json` are software-rasteriser numbers and say nothing useful
  about real hardware. The 60 fps target is a design target derived from the measured geometry
  budget, not a measurement on a GPU.
- That budget, taken from the final tour at Medium: exterior chapters run 25–137 draw calls and
  13–31 k triangles; interior chapters run 256–770 draw calls and 45–89 k triangles. The triangle
  load is trivial; the cost is draw calls, and the peak is the pod bay looking back down the full
  length of the corridor with the whole cast in frustum.
- **The cast is draw-call expensive.** Every figure is an articulated hierarchy of primitives —
  roughly 25 meshes each, moving relative to one another, so they cannot be merged without giving
  up the rig. Fifteen figures in one frustum is most of that 770. Skinning them into one mesh each
  would be the right fix and is not done here.
- The startup benchmark's thresholds (downgrade above 42 ms/frame, upgrade below 9 ms/frame) were
  chosen analytically rather than tuned against a spread of real GPUs.
- The demo video was rendered frame by frame rather than captured in real time. It is the real
  renderer's output, but it is not a recording of a live session.

Anyone with a GPU should sanity-check the automatic quality suggestion and adjust
`src/core/Quality.ts` if it guesses wrong.

## Rendering

- **Bloom is global, not selective.** A single high-threshold `UnrealBloomPass` is used rather than
  a two-pass selective bloom with an emissive mask. In practice only genuine emissives cross the
  threshold, but a very bright lit surface can pick up a halo it does not deserve.
- **No depth of field.** The brief allowed restrained DOF where it aids readability; it was left out
  because at this scale range a correct DOF pass costs more than it returns, and the compositions
  separate subjects with lighting and contrast instead.
- **Shadows are interior-only.** One shadow-casting directional light covers the corridor. Exterior
  ships cast no shadows on each other — at a 1.6 km to 150 m scale ratio with a single distant sun,
  the missing shadow is rarely the thing your eye looks for, but it is missing.
- **Planet detail is a tiled overlay.** The colour map is necessarily low frequency for a 200 km
  sphere; crispness comes from a seamless tiled detail normal. Under extreme magnification the
  tiling can be detected.
- **No dynamic resolution scaling.** Quality presets are discrete; the renderer does not adapt
  pixel ratio frame to frame under load.

## Animation and staging

- **Characters are stylised primitive rigs**, not skinned meshes. Joints are rigid and there is no
  soft deformation, no finger articulation and no facial animation. Identification is carried by
  silhouette, value and posture, which is a deliberate art direction choice — but it is a choice,
  not a free lunch.
- **Ground contact assumes a flat deck.** The walk cycle does solve two-link IK for the hip and knee,
  and a grounding pass sets hip height from the lower sole, so feet plant properly — but the target
  height is a constant, not a query against the floor underneath. The whole corridor is flat, so this
  reads correctly here; on a ramp or a step it would not. There is also no ankle joint, so the sole
  stays parallel to the deck through the whole stride instead of rolling heel to toe.
- **Some slip is unavoidable at the fastest moments.** Where a path demands a longer stride than the
  legs can reach, the stride is clamped and the foot skates. `qa/gait-report.json` reports these; in
  the final build two samples of 63 exceed the tolerance, both under hard deceleration, with the
  worst planted sole moving 0.74 m/s.
- **The cape and the gown are fixed cones**, not simulated cloth. The gown's hem therefore has to be
  wide enough to contain a full stride, since it cannot drape out of a leg's way, and a fallen figure's
  robe does not settle.
- **Fallen figures are a single tipped pose,** not a simulated collapse, so a body comes to rest on
  the deck in the same attitude wherever it falls.
- **Crowd variety is limited.** Six stormtroopers and five defenders share two rigs, differentiated
  by phase offset, gait and objective rather than by unique animation.

## Audio

- **Narration is synthetic.** The voices are generic open TTS voices, mastered for a cinematic bed.
  They are clear and neutral, and deliberately imitate nobody, but they are not a performance.
- **The score is synthesised, not sampled or performed.** Brass, strings, choir and timpani are
  oscillator-and-filter constructions. The writing is original and the language is space opera, but
  the timbres are honestly synthetic.
- **Spatialisation is approximate.** Distances are compressed per source with a hand-tuned scale so
  that kilometre-scale exterior geometry produces a sensible mix; it is not a physically accurate
  attenuation model.
- **Sound in a vacuum.** Exterior explosions and engines are audible. This is a deliberate genre
  convention, not an oversight.

## Interaction

- **Explore mode does not collide.** The free camera can fly through hulls and walls. It is leashed
  to the action so you cannot fly out of sight of it, and Follow or Return to camera always recovers
  you, but there is no collision response.
- **Selection is per-object, not per-part.** Clicking a character selects the character, not the
  helmet or the rifle.
- **No touch controls.** The interface is responsive and the transport works with touch, but
  Explore mode's orbit and fly assume a mouse and keyboard.
- **No reduced-motion alternative for the camera.** `prefers-reduced-motion` shortens interface
  transitions but does not calm the cinematic's camera moves or shake.

## Content

- **The piece runs 6:20**, inside the 4–7 minute brief, but the corridor firefight is compressed:
  the defence collapses in about fifteen seconds. A longer cut would let individual defenders read
  more clearly.
- **Only three spoken character lines.** The rest is narration. More diegetic lines would add life
  but would also increase the risk of drifting toward the film's actual dialogue, which the brief
  forbids.
- **The escape pod's flight is dramatised, not orbital.** A real pod separating at orbital velocity
  would enter a long ballistic arc, not fall visibly away within thirty seconds. The trajectory is
  authored for readability.
