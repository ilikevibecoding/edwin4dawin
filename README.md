# Starfall — *Flight of the Diplomat*

A six-and-a-half minute interactive cinematic that runs in a browser and retells,
in original words and original assets, the situation at the opening of a
well-known space opera: a stolen file, a small diplomatic ship above a desert
world, and something very large closing on it from behind.

Everything you see and hear is generated. There are no downloaded meshes, no
photographic textures, no sampled sound effects and no music from any film.
Geometry is built from primitives and lathes in TypeScript, textures are drawn
into canvases at load time, the score and the effects are synthesised through
the Web Audio API, and the narration is spoken by a local open-source neural
voice. See [Assets and licensing](#assets-and-licensing).

```bash
npm install
npm run dev        # http://localhost:5173
```

Click **Enter the Galaxy** on the title gate. That click is what unlocks the
audio context, so nothing plays until you do.

---

## Contents

- [Running it](#running-it)
- [Controls](#controls)
- [Architecture](#architecture)
- [The show](#the-show)
- [Audio](#audio)
- [Quality tiers](#quality-tiers)
- [QA](#qa)
- [Assets and licensing](#assets-and-licensing)
- [Known limitations](#known-limitations)

---

## Running it

Requires Node 18 or newer and a browser with WebGL 2.

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 5173 with hot reload |
| `npm run build` | Typecheck, then a production bundle in `dist/` |
| `npm run preview` | Serve the production bundle on port 4173 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run qa` | Automated visual tour against the dev server |
| `npm run qa:build` | Production build, then the tour against the preview server |
| `npm run narration` | Re-render the narration audio (needs Piper; see below) |

Nothing is fetched from the network at runtime. The only files loaded are the
narration clips in `public/audio/narration/`, and if they are missing the
application falls back to the browser's own speech synthesis.

### Query parameters

Useful when driving the app from automation:

| Parameter | Effect |
| --- | --- |
| `?qa=1` | Installs the `window.__STARFALL` test harness and skips the benchmark |
| `?quality=low\|medium\|high` | Forces a quality tier instead of auto-detecting |
| `?autoplay=0` | Loads paused |
| `?t=210` | Starts at a given timeline second |

---

## Controls

The transport bar fades out during playback and returns on mouse movement.

### Cinematic mode

| Key | Action |
| --- | --- |
| `Space` | Play / pause |
| `←` `→` | Skip five seconds |
| `,` `.` | Previous / next chapter |
| `1`–`8` | Jump to chapter |
| `R` | Restart |
| `E` | Toggle Explore mode |
| `C` | Toggle subtitles |
| `F` | Fullscreen |
| `H` | Help panel |
| `D` | Debug overlay |

On screen: play/pause, restart, a scrubber with chapter ticks, a chapter
selector, an Explore toggle, a subtitles toggle, an audio mixer (master,
narration, music, effects), a quality selector, fullscreen, and help.

### Explore mode

| Input | Action |
| --- | --- |
| Left-drag | Orbit / look |
| `W` `A` `S` `D` | Move on the horizontal plane |
| `Q` / `E` or `Space` | Down / up |
| `Shift` | Move faster |
| Wheel | Dolly toward the cursor |
| Click an object | Select it and open its card |
| `Escape` | Return to the cinematic camera |

Selecting a ship, character or set piece opens a card with an original
description and three actions: **Follow** keeps the camera locked to the object
as it moves, **Inspect** frames it at a readable distance, and **Return to
cinematic** hands control back to the director. The timeline keeps running
underneath unless you pause it, so you can walk around a live scene.

---

## Architecture

```
src/
  main.ts                 entry: loading gate, benchmark, error boundary
  app/App.ts              bootstrap, frame loop, input, quality switching
  core/
    RenderSystem.ts       renderer, the two scene graphs, camera
    PostProcess.ts        bloom, depth of field, tone map, vignette, grain
    Quality.ts            the three tiers and what each one turns off
    Rng.ts  MathX.ts      seeded randomness, easing and interpolation
    Disposal.ts           recursive GPU resource teardown
  assets/
    Textures.ts           every texture, drawn into canvases at load
    Materials.ts          the shared material palette
    Greeble.ts            merge, box and parametric-surface helpers
    BlockadeRunner.ts     the corvette
    StarDestroyer.ts      the wedge
    Tatooine.ts           planet shader, atmosphere, haze
    EscapePod.ts          pod six
    Corridor.ts           the modular interior set
    Door.ts               blast door and sliding doors
    DataProjection.ts     the stolen plans
    Starfield.ts  Environment.ts  ShipCommon.ts
  characters/
    Humanoid.ts           the shared rig and its skinning
    Character.ts          keyframe blocking, state machine, gait, look-at
    Cast.ts               trooper, rebel, Vader, Leia, R2, C-3PO
  effects/
    Particles.ts          pooled instanced particle system
    Bolts.ts              energy bolts with real travel time
    FX.ts                 façade: impacts, smoke, sparks, shake, breach
  timeline/
    Timeline.ts           deterministic clock, chapters, one-shot events
    Script.ts             chapters, narration text, prologue and closing cards
  camera/CameraDirector.ts shot list, blending, handheld, shake
  show/
    Stage.ts              everything that exists in the world
    Show.ts               the state of the world at time t
    Shots.ts              every camera setup, and the fade schedule
    Blocking.ts           character keyframes and fire orders
    Motion.ts             ship flight paths
    PrologueText.ts       the receding golden typography
  audio/
    AudioEngine.ts        graph, buses, spatialisation, limiter
    Music.ts              the score
    Sfx.ts                every sound effect, synthesised
  ui/UI.ts  ui/Subtitles.ts  ui/style.css
  interaction/ExploreMode.ts
  qa/
    Checkpoints.ts        the screenshot manifest
    Sanity.ts             runtime and static assertions
    TestHooks.ts          window.__STARFALL
scripts/
  qa-tour.mjs             automated visual tour + control tests
  probe.mjs               ad-hoc "what is that bright blob?" probe
  inspect.mjs             turntable views of a single asset
  generate-narration.mjs  renders Script.ts to audio with Piper
```

### Three ideas the whole thing rests on

**One deterministic timeline.** `Timeline` owns a clock and a list of chapters
and one-shot events. `Show.update(t)` is a pure function of that clock: it
recomputes ship transforms, character poses, light intensities, shader uniforms
and effect state from `t` alone. Seeking backwards is therefore safe, and the
QA harness can land on any second and get the same frame every time. The only
things that are not recomputed are one-shot events (a door blowing in, a sound
starting), which the timeline fires exactly once and re-arms on seek.

**Two scene graphs, four kilometres apart.** The planet and the ships live at
the origin; the corridor set lives at `y = -4000`. Only one root is visible at
a time. This keeps the depth ranges sane — a 1.6 km capital ship and a 3 m
corridor cannot share a near plane — and it means the lights parented to the
hidden root cost nothing. Distant objects (planet, starfield, sun) render in a
separate background pass with their own projection so they never fight the
foreground for depth precision.

**Seeded randomness everywhere.** `rng('hull-greebles')` returns a deterministic
stream, so a hull looks the same on every load and a visual bug can be
reproduced by reloading rather than by luck.

### Rendering

A forward renderer with ACES filmic tone mapping into a custom post chain:
threshold → separable blur at three scales → composite bloom, then a
circle-of-confusion depth-of-field pass, then tone map, vignette, chromatic
aberration and animated grain. The chain is authored as explicit render targets
in `PostProcess.ts` rather than through `EffectComposer` so each tier can drop
passes entirely instead of running them at zero strength.

Image-based lighting comes from two procedurally rendered equirectangular
environments — one for space (sun, planet bounce, star haze) and one for the
interior (warm ceiling strips, cold walls) — swapped when the action moves
inside.

---

## The show

Eight chapters, 404 seconds, 31 named camera setups.

| # | Chapter | Time | What happens |
| --- | --- | --- | --- |
| 1 | Prologue | 0:00 | Original golden prologue receding into the dark |
| 2 | The Desert World | 0:42 | Tatooine, haze, a lit limb, silence |
| 3 | The Pursuit | 1:18 | The corvette runs; the wedge overtakes and fires |
| 4 | Capture | 2:48 | Drive killed, tractor beam, drawn in under the belly |
| 5 | The Forward Passage | 3:30 | Defenders, the cut, the breach, the dark lord |
| 6 | The Plans | 4:48 | The schematic, and the file going into the droid |
| 7 | Pod Six | 5:32 | The droids reach the bay; the pod launches and falls |
| 8 | Epilogue | 6:22 | The ships remain; the closing card; Explore mode |

Camera work is authored as a list of shots in `Shots.ts`, each with a start, an
end, an `apply(ctx, pose)` that writes position, target, field of view, near and
far planes and depth-of-field parameters, plus a blend time and a handheld
amount. The director cross-fades between overlapping shots, adds
low-frequency handheld noise scaled per shot, and applies impact shake from the
effects system on top. Nothing is hand-keyed frame by frame; every move is a
function of the shot's own progress, so scrubbing is exact.

Character motion is keyframed in `Blocking.ts`: each figure gets a list of
`{ time, position, state, facing }` keys, and `Character` interpolates position
with an ease per segment, drives a gait cycle whose stride length is derived
from actual ground speed, turns the body toward the direction of travel, and
blends a look-at into the neck. States are `idle`, `walk`, `run`, `aim`, `fire`,
`react`, `fall`, `down`, `kneel`, `interact`, `cower`, `menace` and `surrender`.
Fallen characters are handled without gore: they drop and stay down.

---

## Audio

There are no audio files except the narration. Everything else is synthesised
on the fly.

**Score.** `Music.ts` runs a bar clock over six mood presets, one or two per
chapter, each with its own key, tempo, chord cycle, melodic cell and layer mix.
Instrument colours are synthesised: "brass" is a filtered saw stack with a slow
attack, "strings" are detuned saws through a gentle low-pass, "choir" is a
triangle pad, and percussion is filtered noise plus a pitched thump. Two short
original melodic cells recur — a rising figure for the ship, a descending
semitone cluster for the Empire — and moods crossfade on chapter boundaries.

**Effects.** `Sfx.ts` synthesises twenty-six sounds, one function each:
`laserHeavy`, `laserLight`, `blasterRed`, `blasterBlue`, `hullImpact`,
`shieldFlash`, `explosionSmall`, `lowBoom`, `metalStress`, `doorCut`,
`doorBreach`, `clampRelease`, `alarm`, `spark`, `footstep`, `droidChirp`,
`droidWorried`, `droidRoll`, `dataTransfer`, `hologramOn`, `uiClick`,
`podLaunch`, `atmosphere`, `tractorBeam`, `breath` and `saberIgnite`. On top of
those, `AudioEngine` runs eight continuous beds whose level and filter follow
the show: `destroyerRumble`, `runnerEngine`, `corridorTone`, `alarmLoop`,
`fire`, `podEngine`, `entryRumble` and `respirator`. The respirator is an
original rhythm of filtered noise bursts, not a sample.

**Spatialisation.** Diegetic sounds are played through `PannerNode`s positioned
in world space and updated against the camera each frame, so the destroyer's
drives move across the stereo field as the camera swings around the stern.

**Mixing.** The graph is `sources → (panner) → bus gain → master gain →
compressor → limiter`. Four independent bus gains — master, music, effects and
narration — are exposed in the mixer, and the compressor plus limiter mean
nothing clips no matter how many impacts land at once.

**Narration.** 492 words across 39 lines, all original. Rendered offline by
`npm run narration`, which bundles `Script.ts` (so the words have exactly one
source of truth), speaks each line with [Piper](https://github.com/rhasspy/piper)
using neutral open voices, trims and normalises with FFmpeg, and writes
`public/audio/narration/*.mp3` plus a duration manifest. If the clips are
missing the app uses `speechSynthesis` instead and the subtitles still track.

---

## Quality tiers

Detected by a two-second benchmark at startup and overridable at any time from
the selector or `?quality=`.

| | Low | Medium | High |
| --- | --- | --- | --- |
| Pixel ratio cap | 1.0 | 1.5 | 2.0 |
| Shadow maps | off | 1024 | 2048 |
| MSAA | off | 4× | 4× |
| Bloom iterations | 3 | 4 | 5 |
| Depth of field | off | off | on |
| Grain / aberration | off | on | on |
| Volumetric light shafts | off | on | on |
| Particle budget | ×0.34 | ×1.0 | ×1.7 |
| Hull greeble density | ×0.34 | ×1.0 | ×1.8 |
| Planet segments | 64 | 128 | 192 |
| Starfield | 2,600 | 7,000 | 14,000 |
| Anisotropy | 1 | 4 | 8 |

Switching tiers rebuilds the render targets and re-tunes the existing scene; it
does not reload the page, and the timeline keeps its position.

---

## QA

`npm run qa` drives a headless browser through the checkpoint manifest in
`src/qa/Checkpoints.ts`. For each entry it seeks with a pre-roll (so one-shot
events fire in order), settles a few frames, asserts, and saves a screenshot to
`qa/screenshots/`. A full report lands in `qa/report.json`.

Each checkpoint declares its timestamp, the chapter and camera it expects to be
active, the subjects that must be inside the frustum, an optional minimum
fraction of viewport height for the primary subject, and an allowed mean
luminance window that catches both black frames and blown-out ones.

The tour then exercises the controls: play and pause, scrubbing without
duplicating one-shot events, chapter jumps landing in the right chapter,
entering and leaving Explore mode, resizing, switching quality, and subtitle
tracking.

`Sanity.ts` runs continuously in QA mode and reports: NaN or infinite
transforms, objects outside their expected bounds, the camera inside solid
geometry, characters below the floor, missing narration coverage per chapter,
overlapping narration cues, gaps or overlaps in the shot list, duplicate audio
playback after a seek, timeline events firing twice, WebGL errors, and sustained
frame-rate drops.

Two smaller tools helped more than anything else during production:
`scripts/probe.mjs` renders one frame per variant of an arbitrary JS snippet
(turn a material black, hide a group, ray-pick the centre pixel) which is how
you find out what a bright blob actually is; and `scripts/inspect.mjs` puts a
single asset on a turntable against a neutral background.

See [`docs/QA-CHECKLIST.md`](docs/QA-CHECKLIST.md) for the manual pass.

Two screen recordings from the manual pass live in [`media/`](media/), with a
self-contained player page at [`media/index.html`](media/index.html). Both were
captured through a software rasteriser on a machine with no GPU, so the frame
rate in them is single digits; the stills in `qa/screenshots/` come from the
same renderer offline and show the real output.

---

## Assets and licensing

The code in this repository is MIT licensed.

**Nothing here is taken from any film.** No meshes, textures, footage, music,
dialogue or sound effects were copied, traced, sampled or derived from
copyrighted material. Specifically:

- All geometry is constructed at runtime from Three.js primitives, lathes,
  merged boxes and parametric surfaces in `src/assets` and `src/characters`.
- All textures are drawn procedurally into `<canvas>` elements at load time in
  `src/assets/Textures.ts`. There are no image files in the repository.
- All music and sound effects are synthesised with the Web Audio API at runtime
  from oscillators and noise. There are no sample files.
- The prologue, the closing card, the narration and the two character lines are
  original prose written for this project. Nothing quotes a screenplay, a crawl
  or a line of film dialogue, and no character is named in the spoken text.
- The narration is spoken by Piper's open neutral voices (MIT / CC-BY, see
  below). No performance by any actor is imitated, and no cloud speech service
  or API key is involved.
- Designs are *evocative* rather than replicas: a white hammerhead corvette, a
  grey wedge, a black-armoured figure. They are original models built to a
  silhouette, not reconstructions.

Third-party runtime dependency: [three.js](https://threejs.org) (MIT).
Build and test dependencies: Vite (MIT), TypeScript (Apache-2.0),
puppeteer-core (Apache-2.0).

Narration voices, used only at build time by `npm run narration`:
`en_GB-alan-medium`, `en_GB-jenny_dioco-medium` and `en_US-joe-medium` from the
[Piper voices](https://huggingface.co/rhasspy/piper-voices) collection. The
`voices/` directory is not committed; the script prints instructions if it is
empty, and the generated `.mp3` files under `public/audio/narration/` are
committed so the project runs without Piper installed.

Trademarks referenced in prose belong to their owners. This is a
non-commercial fan work and is not affiliated with or endorsed by anyone.

---

## Known limitations

See [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) for the full list. The short
version:

- Shadows are point-light shadows in the corridor only; nothing casts shadows
  in space, where a single directional light and image-based lighting do all
  the work.
- The characters are stylised low-poly figures on a shared rig with no facial
  animation and no finger articulation. They are built to read in silhouette.
- Depth of field is a two-tap circle-of-confusion approximation, not a
  gathering blur, so it can show a faint halo on very high-contrast edges.
- Narration is pre-rendered at build time. Editing `Script.ts` changes the
  subtitles immediately but needs `npm run narration` to update the audio.
