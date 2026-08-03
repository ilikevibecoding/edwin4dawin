# Architecture notes

## The one idea everything rests on

**The world is a pure function of the master clock.**

`Timeline.time` is the only mutable playback state in the production. Ships, characters, particles,
bolts, debris, lighting, camera and grade are all *evaluated* from that number rather than
integrated frame to frame. There is no accumulating physics state anywhere in the render path.

This is not a stylistic preference; it buys four concrete properties:

1. **Scrubbing is exact.** Dragging the timeline backwards puts every spark, every tumbling door
   leaf and every character limb precisely where it was. Nothing has to be "rewound".
2. **Screenshots are reproducible.** The QA harness can ask for time `t = 219.1` and get a
   byte-identical frame every run, which is what makes assertion-based visual testing possible.
3. **Events cannot double-fire.** One-shot systems (audio) keep a monotonic cursor that is re-armed
   on seek, so a scrub never replays a hundred turbolasers at once.
4. **Frame rate cannot change the story.** The clock advances by wall-clock seconds, so narration,
   music and action stay in sync at 4 fps or 144 fps.

Anything genuinely non-deterministic — camera smoothing, explore-mode input, the operator drift on
locked-off frames — is confined to a thin layer that never feeds back into world state.

## Systems

```
main.ts
  └── App                       lifecycle, loop, mode switching, error boundary, test hooks
        ├── RenderSystem        WebGLRenderer + EffectComposer (render → bloom → output → grade)
        ├── MaterialLibrary     the colour script; every texture drawn on canvas from a seeded RNG
        ├── SpaceScene          Tatooine, starfield, both ships, the pod, the battle, prologue text
        ├── CorridorScene       the ship interior, the cast, the firefight, the plans
        ├── CameraDirector      29 named shots; shake and drift layered on top
        ├── Timeline            the clock, chapter table, seek/play/pause events
        ├── SoundDirector       beds, one-shots, score scheduling, narration, ducking
        ├── UIRoot              gate, transport, chapters, settings, help, selection, subtitles
        ├── ExploreControls     orbit/fly camera with follow and inspect
        ├── Picker              hover highlight and selection
        └── SanityChecker       runtime invariants, surfaced in the debug overlay and QA report
```

## Coordinate spaces

Two spaces matter, and keeping them separate is what makes the exterior act authorable.

**World space** holds Tatooine (radius 200 km, centred one orbital radius below the action) and the
starfield (re-centred on the camera every frame so it behaves as infinitely distant).

**The chase frame** is a moving reference attached to the corvette's orbital track: origin at the
corvette, `+Z` along its heading, `+Y` straight up away from the planet. Ship offsets, the battle
script, every exterior camera and all ejected sparks and debris are authored here. Two payoffs:
authored numbers stay small and readable, and debris automatically inherits the ships' velocity,
which is correct in vacuum and free.

`chaseFrame(t)` solves the frame's world transform in closed form from an integrated speed profile,
so there is no drift and no dependence on frame history.

The order of operations inside a frame matters and is deliberate:

```
space.pose(t)          → chase frame + ships + effects take their positions
interior.update(t)     → the corridor act, if it is the active scene
director.update(t)     → shots read the chase frame's *current* world matrix
space.finalize(t, cam) → starfield re-centre, sun and bounce follow the camera
render
```

Evaluating the camera before posing the stage was a real bug during development: exterior shots
were being solved against the previous frame's chase transform, which put subjects hundreds of
metres from where the composition expected them.

## Procedural assets

Nothing is downloaded and nothing is traced from reference art.

- **Textures** are drawn on a 2D canvas: recursive panel subdivision with seams, rivets, weathering
  streaks and scorch; equirectangular desert with dune trains, canyons and salt flats; seamless
  sine-based detail tiles; window grids; control-panel faces; smoke puffs; radial glows.
- **Hulls** are *lofted*: a 2D cross-section swept through a handful of named stations. The
  destroyer's whole read comes from one wedge profile and eleven stations; the corvette from a
  rounded rectangle and thirteen. Silhouette stays under deliberate control instead of being buried
  in thousands of raw vertices.
- **Greebling** scatters small boxes and cylinders over a hull face and merges them into a single
  geometry. A `surface` callback asks the loft how tall the hull is at that station, so fittings
  stay welded to a tapering hull instead of floating beside it.
- **Characters** are stylised primitive rigs — a plain `Object3D` hierarchy — posed by closed-form
  functions of the clock. Identification comes from silhouette, value contrast and posture, not
  polygon count.

## Effects

Every effect is a precomputed event table.

- **Particles** upload spawn time, position, velocity, colour, size and lifetime once; a vertex
  shader evaluates each particle's whole life from `uTime`. Scrubbing is free and exact.
- **Bolts** are declared as "leaves A at t0, arrives at B at t1". The pursuit's intercept times are
  solved iteratively against the analytic ship motion at load time, so a shot fired at a moving
  corvette genuinely lands on the hull point it was aimed at — and the viewer can watch it cross
  the gap.
- **Debris and flashes** follow the same pattern, with a small pool of real point lights recycled
  between the strongest flashes so nearby hull actually catches the bounce.

## Audio

```
oscillators / noise ─┬─ music bus ─┐
                     ├─ sfx bus  ──┼─ master gain ─ compressor ─ limiter ─ destination
narration mp3 ───────┴─ narration ─┘
                     └─ reverb sends (cold hall for space, tight metal for the corridor)
```

Diegetic sources route through `PannerNode`s positioned in world space with a per-source distance
scale, and the listener is driven by the active camera, so the mix genuinely changes as the camera
moves. Music ducks 45% under narration.

The score is written in `src/audio/Music.ts` as note tables with three recurring motifs
(**Courier**, **Iron**, **Ember**), scheduled on a lookahead window driven by the master clock.
Sound effects are synthesised per-trigger; nothing is sampled.

Narration is pre-rendered from `src/content/narration.json` by `scripts/generate_narration.py`
using a local, open text-to-speech engine, then mastered with ffmpeg and committed as MP3.
At runtime the player is idempotent: it compares the cue that *should* be sounding against the one
that *is*, so calling it every frame can never start the same clip twice. If a clip fails to
decode it falls back to the browser's own speech synthesis; if that is unavailable the subtitles
still carry the entire script.

## Rendering and grade

`WebGLRenderer` with ACES filmic tone mapping, then a composer chain of render → bloom → output →
grade. Bloom sits at a high threshold so only genuine emissives (engines, bolts, holograms, lit
panels) bloom. The grade pass adds a gentle vignette, luminance-weighted film grain, a whisper of
corner dispersion, a **black lift** so no interior ever crushes to zero, and the global fade used
for chapter transitions.

Near and far planes are set per shot: 5 m to 2,400 km outside, 6 cm to 600 m inside. That keeps
depth precision comfortable across a scene that spans nine orders of magnitude.

## Quality and disposal

Three presets scale pixel ratio, shadows, bloom, grain, particle budgets, greeble density, star
count, planet tessellation and anisotropy. Changing preset tears both scenes down, disposes every
tracked geometry, material and texture through the `DisposalRegistry`, and rebuilds against the new
budget — verified by the automated control test, which cycles Low → High → Medium and asserts a
clean console.
