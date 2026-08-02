# Working in this repo

BRICK WARS is a five-minute animated film that renders itself in three.js.
Everything is generated from code: LEGO-brick geometry, hand-authored SVG
decals, synthesized sound. Read `docs/ENGINE.md` before touching anything under
`src/` — it is the full API reference and the scene contract.

## The rule that breaks everything if you ignore it

**The film must be a pure function of time.** `update(t)` may be called with any
`t`, in any order, and must always produce the same image.

- Never call `Math.random()`. Use `hash11(i, salt)`, `noise1(x)`, `fbm1(x)` from
  `src/engine/rng.js`, or seed an `Rng` **at build time only**.
- Never integrate (`this.x += dt`). Compute state directly from `t`.
- Anything that spawns must be declared up front with a start time and evaluated
  analytically. The FX classes in `src/engine/fx.js` already work this way.

`tools/render.mjs` splits the timeline across parallel headless browsers. A
scene that accumulates state will tear at the shard boundaries.

## Layout

```
src/engine/    brick kit, SVG pipeline, effects, overlay, timeline, audio
src/kit/       minifigures, characters, ships — shared models
src/scenes/    one module per scene, in running order via index.js
src/story/     the screenplay: scene order, narration text, character voices
public/svg/    hand-authored SVG art (logos, crests, faces, decals, HUD)
public/audio/  generated narration, effects and score, plus manifest.json
tools/         tts, sfx, music, renderer, frame grabber, model preview
```

Scene durations come from `public/audio/manifest.json`, which `tools/tts.mjs`
generates by measuring the real narration audio. Do not hard-code them.

## Running and testing

The dev server is usually already up on port 5173; check before starting another.

```bash
npm run dev
node tools/shots.mjs --scene trench --n 8 --out /tmp/t --contact /tmp/t.png
node tools/preview.mjs --model xwing --out /tmp/xwing.png
node tools/render.mjs --scene trench --fps 24 --workers 3 --out /tmp/trench.mp4
npx vite build
```

There is no unit test suite — this is a visual project, so **verification means
looking at rendered frames**. After changing anything visual, render stills with
`tools/shots.mjs` and open the JPEGs with the image-capable read tool. Changing a
scene without looking at the result is not finished work.

For anything with sound, render a clip with `tools/render.mjs` and review it
with the `videoReview` subagent, which can actually listen to the audio track.

## Performance

The render VM has no GPU; WebGL runs on SwiftShader. Keep each scene under about
400k triangles and merge aggressively — `Bricks.build()` already produces one
mesh per material, so use it rather than creating many separate meshes. Turn
studs off (`{ studs: false }`) for anything far from camera.

## Cursor Cloud specific instructions

- Chrome is at `/usr/local/bin/google-chrome`; `ffmpeg` and `ffprobe` are on PATH.
- Piper (for narration) installs with `pip install --break-system-packages piper-tts`;
  voice models go in `tools/voices/` and are gitignored.
- Launching headless Chrome with `--headless=new --screenshot` directly can hang
  on this VM. Use the puppeteer helpers in `tools/browser.mjs` instead.
