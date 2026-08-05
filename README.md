# DEVIANT — Become Free

A cinematic, branching-narrative android thriller in the browser, in the spirit of
*Detroit: Become Human*. Five chapters, timed dialogue choices, quick-time actions,
crime-scene analysis, chapter flowcharts and two endings — about ten minutes of
playable story.

Everything you see is generated in code. There are no model files, no textures, no
photographs: characters, faces, clothing, sets, props, signage, skies and weather
are all built procedurally at load time with [three.js](https://threejs.org/).

```bash
npm install
npm run dev        # play at http://localhost:5173
npm run build      # typecheck + production bundle
```

Controls: `1-4` / `←` `→` `Enter` choose, `E` / `Q` for action prompts, `WASD` walk,
mouse to look and to analyse evidence, `Enter` to skip a line.

## What is in here

### Rendering

`src/engine/Post.ts` is a hand-written HDR post chain, run on a half-float target:

- SSAO reconstructed from depth only (no normal prepass), depth-aware blurred
- Bloom as a prefiltered mip pyramid with 13-tap Karis downsamples and tent upsamples
- A wide horizontal gather for anamorphic flare on neon
- Gather-based depth of field with a golden-angle bokeh kernel and foreground bias
- ACES filmic tonemap, lift/gain grade, split toning, chromatic aberration, barrel
  distortion, vignette, film grain, rain-on-lens refraction, glitch and "deviancy" passes
- Auto exposure measured from the HDR buffer (median-weighted), snapped on hard cuts so
  every shot is exposed like its own setup

`src/engine/Reflection.ts` renders a mirrored, clipped view for wet-street planar
reflections; `src/world/Materials.ts` combines it with procedural ripples, a puddle
mask and fresnel for the signature rainy-asphalt look.

`src/engine/ActorLights.ts` is a travelling three-point rig that follows whoever the
camera is on — set lighting alone leaves faces muddy at night, so the key follows the
actor the way it would on a film set.

### Characters

`src/world/FaceMaps.ts` defines one anatomical layout (eye line, brow, nose base,
mouth, chin, ear placement) that drives everything else:

- `src/world/Head.ts` lofts a sphere through width/depth/offset profiles into a skull,
  then sculpts brow ridge, sockets, cheekbones, nose, lips and jaw with gaussian
  displacement operators
- Detail far below vertex resolution — lip borders, nostril creases, eyelid folds,
  nasolabial folds, pores — is evaluated as a signed height field and baked into
  generated normal, albedo and roughness maps
- Nine facial morph targets drive expression and speech; `buildVisemes` turns a line of
  dialogue into a jaw/wide/round timeline, so lip sync needs no audio assets
- `src/world/Character.ts` builds the body as swept superellipse shells and capsules,
  computes skin weights analytically from bone-capsule distances, and layers idle
  breathing, weight shift, gaze chains with saccades, blinks, gestures and a walk cycle

### Sets

Five locations in `src/world/sets/`, each with its own grade, fog, weather, light rig
palette and camera marks: a rain-hammered street, a crime-scene apartment, a precinct
interrogation room, a derelict freight hall sanctuary, and a tower rooftop.

### Story

`src/story/script.ts` is the screenplay as data: staging, shot grammar (`cu`, `ots`,
`two`, `free` with dolly and push), dialogue, timed choices with meter effects and
flags, action prompts, analysis sequences, walk segments and flowcharts.
`src/story/StoryRunner.ts` interprets it, and every timer runs off the simulation clock
— including all UI animation — so an offline render at one frame per second is
frame-for-frame identical to real-time play.

## Offline tools

```bash
node tools/shots.mjs   --out shots/x --shots portrait-kai,street-wide   # framed stills
node tools/review.mjs  --out shots/y                                    # sample every chapter
node tools/render-demo.mjs --out render/demo --fps 24 --w 960 --h 540    # render the demo video
node tools/render-demo.mjs --check 1                                     # walk the script, no images
```

`shots.html` is a harness for reviewing single framed shots (including a clay-render
mode and a neutral portrait studio) without launching the game.
