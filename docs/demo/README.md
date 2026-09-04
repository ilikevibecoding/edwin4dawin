# Demo recording

`neo_detroit_demo_360p.mp4` — a 9 minute 30 second playthrough of all three
chapters, captured from the game itself. Scripted input, nothing pre-baked; the
choices it makes are one path through the branching script, so the outcomes and
the closing cards are specific to that run.

640x360, H.264 Main profile, AAC stereo, 15 MB. Deliberately small and
conservatively encoded so it downloads quickly and plays anywhere, including
inline in a browser or a pull request.

## Regenerating it

The recording is reproducible: the game runs on a fixed timestep with seeded
randomness and scripted input, so the same commit produces the same film.

```sh
npm install
npx vite --host 0.0.0.0 --port 5173 &                     # the game has to be served
node tools/render-video.mjs --out .render/master.mp4 \
  --w 960 --h 540 --fps 24 --tier video --keep-frames
```

That writes 13,700 frames to `.render/frames`, mixes the soundtrack against the
cue log the capture recorded, and encodes. It takes about four hours on a
software rasteriser, and it is resumable: kill it and run it again and it
re-simulates without drawing to catch up, which costs seconds rather than hours.
`tools/render-loop.sh` wraps it to restart across browser crashes.

To re-encode from frames already on disk without re-rendering — which is how
this file was made — see the ffmpeg invocation in `tools/render-video.mjs`. The
light `hqdn3d` pass is worth keeping: film grain is close to incompressible, and
taming it slightly cuts the file by a third at no visible cost at this size.
