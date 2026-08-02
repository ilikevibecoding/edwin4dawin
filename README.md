# BRICK WARS

A five-minute animated film that renders itself.

Every frame is generated procedurally in three.js: the ships, the characters,
the deserts and the battle station are assembled brick by brick from a LEGO
construction kit written in JavaScript. Every logo, insignia, minifigure face
and hull decal is hand-authored SVG, extruded into 3-D or composited onto
plastic. The narration is neural text to speech, shaped into seven character
voices. The sound effects and the orchestral score are synthesized from
waveforms in Node. Nothing is imported — there are no model files, no textures,
no audio samples and no stock assets in this repository.

It is an experiment in the kind of thing nobody would ever sit down and build by
hand, and which is now more or less free to make.

```
npm install
node tools/tts.mjs        # narration  (needs piper, see below)
node tools/sfx.mjs        # sound effects
node tools/music.mjs      # score
npm run dev               # watch it at http://localhost:5173
node tools/render.mjs     # export out/brickwars.mp4
```

## The film

| # | scene | what happens |
| --- | --- | --- |
| 0 | `crawl` | Starfield, title logo, the scrolling opening text, tilt down to a planet |
| 1 | `chase` | A rebel corvette runs; an Imperial destroyer fills the sky behind it |
| 2 | `boarding` | The corridor, the door blown to bricks, troopers, and a tall black silhouette |
| 3 | `plans` | Leia loads the stolen plans into an astromech; the escape pod launches |
| 4 | `tatooine` | Dunes, a sandcrawler, jawas, a hologram, and two suns going down |
| 5 | `deathstar` | The battle station, the flaw in the plans, the squadron launching |
| 6 | `trench` | The trench run, TIEs, the targeting computer switched off, and the explosion |
| 7 | `medals` | A hall of white brick, and a medal ceremony |

## How it works

### Everything is a pure function of time

`film.renderFrame(renderer, t)` may be called with any `t`, in any order, and
always produces the same image. No scene accumulates state, nothing calls
`Math.random()` at frame time, and every particle, laser bolt and piece of
debris is evaluated analytically from its spawn time.

That constraint buys two things. Scrubbing the timeline in the browser is exact,
and — more importantly — the offline renderer can split the movie into
contiguous time ranges and render them in **parallel headless browsers**, then
stitch the frames back together. The VM has no GPU, so WebGL runs on
SwiftShader, where reading a finished frame back out of the canvas costs roughly
ten times more than drawing it. Sharding is what makes a five-minute film
practical to export.

### The brick kit — `src/engine/brick.js`

A builder that works in LEGO coordinates (`x`/`z` in studs, `y` in plates, one
brick = three plates) and emits real elements: studded bricks and plates, smooth
tiles, slopes, wedges, cylinders, cones, dishes, tyres and bars. Bevelled edges
come from convex hulls of inset face rectangles, which guarantees correct
winding and gives every part the chamfer that makes moulded ABS read as
moulded ABS.

`build()` merges everything into **one mesh per material**, so a two-thousand
brick star destroyer costs a handful of draw calls. It also records where every
individual element ended up, which is what `BrickBurst` uses to blow a finished
model apart into the bricks it was built from — the film's signature effect.

### The minifigure — `src/kit/minifig.js`

A posable figure at true minifig proportions: tapered torso, C-clip hands,
cylindrical head. Faces are SVG decals composited over the head colour into a
wrap-around texture, positioned so the print lands on +z. `poseWalk`,
`poseRun`, `poseAim` and friends are pure functions of `t`, so a corridor full
of stormtroopers marches deterministically.

### Sound

`tools/tts.mjs` synthesises every line of `src/story/script.js` with
[Piper](https://github.com/OHF-Voice/piper1-gpl), then shapes each character
with an ffmpeg chain — Vader is pitched to a 70 Hz fundamental and run through
chorus and a mask resonance, the Imperial officer is band-limited and
bit-crushed into a comms speaker, Obi-Wan is a long reverb tail. It measures the
real durations and writes `public/audio/manifest.json`, and **scene lengths are
derived from that**, so narration can never be clipped by a scene that is too
short.

`tools/sfx.mjs` and `tools/music.mjs` generate the effects and the score as raw
waveforms — oscillators, filtered noise, FM, comb reverbs, a small orchestral
synthesizer and a note scheduler. The score is an original composition.

The browser plays all of it through Web Audio; the offline renderer mixes the
identical cue list with ffmpeg. Because both read the same list, picture and
sound stay locked without any synchronisation logic.

## Tools

| command | what it does |
| --- | --- |
| `npm run dev` | interactive viewer, scrubber, scene picker, sound |
| `node tools/render.mjs` | export the film to mp4 (`--scene`, `--fps`, `--workers`, `--t0/--t1`, `--w/--h`) |
| `node tools/shots.mjs --scene trench --n 8 --contact /tmp/t.png` | still frames and a contact sheet |
| `node tools/preview.mjs --model xwing` | turntable render of any kit model |
| `node tools/tts.mjs` | narration (incremental; `--force` to rebuild) |
| `node tools/sfx.mjs`, `node tools/music.mjs` | effects and score |

`docs/ENGINE.md` is the full API reference for the brick kit, the effects
library and the scene contract.

## Setting up narration

Narration needs Piper and its voice models, which are not committed (they are
about 300 MB). The generated mp3s **are** committed, so the film runs out of the
box; you only need this if you change the script.

```bash
pip install --break-system-packages piper-tts
mkdir -p tools/voices && cd tools/voices
python3 -m piper.download_voices \
  en_GB-alan-medium en_US-ryan-high en_US-amy-medium \
  en_GB-northern_english_male-medium en_US-joe-medium en_GB-cori-high
```

## Requirements

Node 20+, ffmpeg, and a Chrome/Chromium binary for the offline renderer (set
`CHROME_BIN` if it is not at `/usr/local/bin/google-chrome`).

## A note on the source material

The story, the narration, the score and the artwork are all original work made
for this demo: an affectionate homage in plastic. Star Wars and LEGO are
trademarks of their respective owners, and this project is not affiliated with
or endorsed by either.
