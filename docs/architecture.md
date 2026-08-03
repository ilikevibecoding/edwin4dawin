# Architecture notes

## Shape of the thing

The application is a deterministic function of one number: show time. Nothing
in the piece integrates state frame to frame — every ship position, character
pose, light level and camera pose is evaluated from `t`. That is what makes the
scrubber instant, the automated tour reproducible, and a bug reportable as
"it's wrong at 246.0".

```
main.ts
└── app/app.ts ................ bootstrap, loop, public QA surface (window.__show)
    ├── core/renderer.ts ...... Stage: WebGLRenderer, two scenes, post chain
    ├── core/quality.ts ....... three tiers + a startup benchmark
    ├── show/world.ts ......... every object, split into two regions
    ├── show/timeline.ts ...... chapters, one-shot events, continuous animators
    ├── show/camera-director.ts named shots, blending, shake
    ├── show/staging.ts ....... the script: what happens when
    ├── audio/ ................ engine, music, sfx, narrator
    ├── explore/explore.ts .... free camera, picking, follow/inspect
    ├── ui/interface.ts ....... transport, popovers, subtitles, diagnostics
    └── qa/ ................... checkpoint manifest, runtime sanity checks
```

## Two scenes, two regions

`Stage` renders a **sky scene** and a **stage scene** back to back with the same
camera but different clip ranges. The sky holds the starfield, the planet and
the suns — objects tens of thousands of units away. The stage holds everything
the audience can collide with. Splitting them removes the depth-precision
problem that comes from wanting both a 1 m door handle and a 6 000 km planet in
one frustum.

Within the stage scene, `World` keeps two **regions**:

| Region | Contents | Origin |
| --- | --- | --- |
| `exterior` | ships, pod, space effects | world origin |
| `interior` | corridor, pod bay, cast, interior effects | `y = −6000` |

Only one is visible at a time. They are parked far enough apart that neither
one's lights or shadows can reach the other, so switching is a visibility flag
rather than a scene rebuild — which is what keeps a scrub across the cut
instant.

Interior particle effects are the exception: they live at the scene root rather
than inside the offset interior group, because every effect is emitted at a
world-space position and re-deriving local space for each emitter was a
persistent source of "the sparks are 6 km below the floor" bugs.

## The timeline

`Timeline` holds three kinds of content:

- **Chapters** — a name, a span and a synopsis. They drive the selector, the
  scrubber marks and the chapter readout.
- **One-shot events** — audio and effect cues with an id. Each fires at most
  once per pass. Seeking backwards re-arms everything after the new head;
  seeking forwards marks the skipped ones as already fired, so scrubbing cannot
  produce a pile of overlapping sounds. The rule is `event.t < seekTarget`
  rather than `<=`, because an event landing exactly on the target is one the
  audience should still hear.
- **Continuous animators** — pure `(t, dt) => void` functions. Ship paths,
  character tracks, light levels, hatch positions and the projection's reveal
  are all evaluated here, from `t` alone.

`coverageGaps()` walks the shot list and reports any stretch of the timeline
with no camera assigned. The automated tour treats a gap as a failure.

## Camera direction

`CameraDirector` owns a list of named `Shot`s. Each carries a span, a region, a
near/far clip range, a base field of view and an `apply(ctx)` that writes an eye
position, a target and optionally a fov. Adjacent shots cross-fade over the
incoming shot's `blend` seconds, so a cut is just a blend of zero.

On top of that sits an impulse-driven shake: `impulse(strength)` and
`impulseNear(worldPoint, strength, falloffRadius)`. Hull impacts call the
latter, so vibration is proportional to how close the hit was to the lens.

Shots are written in the coordinate space they belong to. Interior shots use a
`cp(z, x, y)` helper that takes a corridor station and returns a world point,
so a camera move reads as "start 7 m ahead of Vader and close to 4".

## Assets

Everything is built by code, and the same three ideas recur:

- **Seeded randomness.** `core/rng.ts` provides a small deterministic PRNG plus
  value noise and fBm. Every generator takes a seed string, so a hull, a grime
  map or a greeble field is reproducible — which is what makes a visual bug
  reproducible.
- **Memoised factories.** `assets/textures.ts` and `assets/materials.ts` cache
  by argument, so the corvette and the pod share a panel normal map, and a
  quality change does not re-paint canvases that have not changed.
- **Instancing.** Stars, greebles, debris, bolts, sparks and corridor fittings
  are instanced or pooled. The whole piece draws in a few hundred calls.

`loftedHull` deserves a note: it generates a tube from a radius profile
`t → multiplier`, and both the escape pod's hull and its fittings evaluate that
same profile. Rings, patches and caps therefore hug the skin by construction
rather than by hand-tuned numbers.

## Characters

`characters/figure.ts` is a small skeletal rig — pelvis, spine, chest, neck,
head, two arms, two legs — posed procedurally. There is no animation data:
`pose()` computes joint angles from a gait phase, a state and a handful of blend
values. States are `idle`, `alert`, `walk`, `run`, `march`, `aim`, `fire`,
`react`, `fall`, `down`, `interact`, `crouch`, `cower` and `kneel`.

Two details matter for QA:

- **Gait is a function of path distance, not accumulated time.** `driveFigure`
  samples the authored track for cumulative metres walked and hands that to the
  rig, so a scrubbed frame shows exactly the stride the played frame would.
- **Blends snap when `dt` is zero.** When the timeline is paused, aim blends,
  fall progress and look angles resolve instantly instead of damping toward
  their targets. Without this, every screenshot the automated tour takes would
  catch the cast halfway between poses.

Weapons hang from a grip socket with the barrel down the local −Z. When a figure
has an `aimTarget`, `poseExtra` rotates the weapon so that axis points at it, so
barrels always aim somewhere plausible.

## Audio

`AudioEngine` builds the graph — four gain buses (narration, music, effects,
master) into a compressor and a limiter, so nothing can peak painfully — and
keeps context creation separate from context resumption. The context is
constructed during loading and only *resumed* on the enter click, which means
the automated tour can drive audio without a user gesture.

`MusicDirector` sequences an original score: a chord plan per chapter and four
leitmotifs played on synthesised brass, strings, choir and percussion. `SfxLibrary` synthesises every effect from oscillators and
filtered noise and spatialises the diegetic ones through `PannerNode`s, with a
reference distance per cue so a turbolaser and a footstep fall off at
appropriate rates.

`Narrator` plays pre-rendered clips keyed by cue id, publishes the matching
subtitle, and falls back to `speechSynthesis` if a clip is missing — reporting
the fallback through the sanity checks rather than failing silently.

## Quality tiers

`qualityFor(level)` returns a settings object read at two different moments.
Renderer-side settings — pixel ratio, shadow map, bloom, grain, depth cueing —
are applied immediately when the tier changes. Construction-time budgets —
particle capacities, crowd size, sphere tessellation, star count, greeble
density — are baked when the world is built, so those take effect on the next
load; the preference is persisted to `localStorage`. `core/disposal.ts` tracks
every geometry, material and texture the world owns so that teardown releases
GPU memory rather than leaking it.
