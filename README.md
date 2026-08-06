# Neo Detroit

A cinematic, branching-narrative android game that runs in a browser — a *Detroit: Become
Human* homage built on three.js and WebGL2. Three playable chapters, roughly ten minutes
of gameplay, with timed dialogue choices, quick-time sequences, a crime-scene
reconstruction beat, and endings that are assembled from the flags a playthrough sets.

```
npm install
npm run dev            # play at http://localhost:5173
```

`W A S D` look · `Q` scan · `E` interact · mouse or `A`/`D` to pick a choice · `Enter` to
confirm · `F` fullscreen.

## What is in here

**A renderer built for one look.** Rain-soaked neo-noir at night: physically based
materials lit almost entirely by practicals, planar reflections on every wet surface,
volumetric shafts, three layers of rain, and a post chain of exposure → depth of field →
bloom → ACES → film grade with split toning, anamorphic smear, grain and lens water. Every
art-direction constant lives in `src/render/LookConfig.ts` so the whole game can be graded
from one file.

**Everything is procedural.** There are no authored textures and no authored levels.
Concrete, asphalt, brushed metal, fabric, ceramic, building facades with lit windows,
puddle ripple normals and neon signage are all generated at load into canvases
(`src/render/Textures.ts`), and the three sets are assembled from a kit of parts
(`src/sets/Kit.ts`). The night sky is generated as an HDR environment map, not loaded.

**A cast made from three generic models.** The characters are restyles: materials are
replaced with procedural PBR sets, costume meshes are hidden or repurposed, and android
hardware — temple LED, armband, model plate, glowing chassis seams — is generated and
attached to bones (`src/actors/Cast.ts`). Blink morph targets and a hair shell are derived
from the head geometry itself, because the source avatars ship with neither
(`src/actors/FaceMorphs.ts`).

**Animation retargeting.** Clips live on three different source rigs and the cast is built
on a fourth. `src/actors/Retarget.ts` transfers them by taking each bone's rotation delta
from its own rest pose into a body-space frame, which is what makes one animation library
work across rigs that disagree about both rest shape and local axis conventions. Acting on
top is additive: a library of body-space poses (`src/actors/Poses.ts`) is layered over the
mixer output, so "lean in", "shield the child" and "aim" can be blended onto a breathing
idle without authoring clips.

**A director, not a cutscene player.** Chapters are async functions written against
`src/story/Director.ts`, so a scene reads like a screenplay: cut to a framing, play a line,
offer a timed choice, branch on the result. Shots are derived from where the actors
actually are (`src/cine/Framing.ts`) rather than hard-coded, and the camera operator adds
the imperfections that make a virtual camera read as a real one — hand-held float, a slow
push on dialogue, focus that takes a moment to catch up.

**Sound with no audio files except the voices.** Dialogue is rendered offline with
espeak-ng, one file per line, with a per-character vocal profile and a viseme track for lip
sync (`tools/build-voices.mjs`). The score, the rain, the thunder, the impacts and the
interface blips are synthesised at runtime from oscillators and filtered noise
(`src/audio/Audio.ts`).

## Chapters

1. **The Ledge** — a hostage negotiation on a roof in the rain. Reconstruct the scene, then
   talk a deviant android down. His stress track responds to almost every line, and the
   climax is a quick-time reach that only saves both of them if the negotiation went well.
2. **House Rules** — the same night, in a small room. Cass has an order stack she is
   required to obey, and every choice is a decision about whether to break it.
3. **The Square** — three thousand androids and a police line. Who is standing behind you
   depends on what happened in the first two chapters.

The end of each chapter shows the flowchart of that chapter's graph with the path taken
highlighted, and the epilogue is assembled from the flags the run set.

## Rendering the demo video

The machine this was developed on has no GPU, so WebGL runs on SwiftShader at roughly one
cinematic frame per second — far too slow to record in real time. Instead the game runs in
a deterministic fixed-timestep mode and is advanced exactly one frame per screenshot, with
a scripted player feeding the same input layer a person would use
(`src/story/Autoplay.ts`). The soundtrack is rebuilt offline from a cue log the Director
writes as it plays, so picture and sound land on the same timeline.

```
npm run voices                                   # render the dialogue pack
npm run render -- --out artifacts/demo.mp4 --w 1280 --h 720 --fps 24
node tools/flowtest.mjs --speed 6                # walk the whole script quickly
```

## Development tools

| Command | What it does |
| --- | --- |
| `npm run dev` | Play the game |
| `npm run typecheck` | `tsc --noEmit` |
| `node tools/shot.mjs --url /lab.html --out shots/x.png` | Capture the look-development shot list |
| `node tools/shot.mjs --url /actorlab.html --out shots/p.png` | Capture the character/pose contact sheet |
| `node tools/flowtest.mjs` | Play the whole story headless and report its length |
| `node tools/render-video.mjs` | Record the demo |

`lab.html` renders a fixed set of framings from the real chapter sets and reports luminance
percentiles for each, so exposure can be judged numerically instead of by eye across
iterations; `?dbg=noenv,nofog,nowet,nolights,nopost` removes one contribution at a time
when something is lifting a surface and it is not obvious which light is doing it.
`actorlab.html` isolates the cast under neutral light for posing and costume work.
