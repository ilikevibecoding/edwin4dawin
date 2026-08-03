# STAR WARS — The Kyber Star

A ~6½ minute animated short that runs in a browser tab. Every ship, planet,
explosion, note of music and sound effect is generated procedurally in code.
Nothing is loaded from a modelling package, a texture library or a sample pack:
there are no `.glb` files, no `.png` textures and no `.wav` samples in this
repository. The only binary assets are four open-licence webfonts and the
text-to-speech voice track, which is itself generated offline from the
screenplay by a script in `tools/`.

> An original story told in the register of a 1977 space opera. It is a homage,
> not a reproduction: the characters, the ship names, the battle station and
> every note of the score are new.

```
open index.html through a local web server, then press BEGIN
```

## Running it

```bash
node tools/serve.mjs          # any static server works; this one has no deps
# then open http://localhost:8080
```

Requires a browser with WebGL2 and ES module import maps (any current
Chrome/Firefox/Safari). Nothing is bundled and there is no build step — the
page loads `src/main.js` directly.

Playback controls: space to pause, arrow keys to skip ±10 s, and a scrubber
that appears when you move the mouse.

## What it does

Ten sequences, cut together on a single master timeline:

| # | Sequence | What happens |
|---|----------|--------------|
| 0 | `opening` | Blue card, logo, the crawl, tilt down to the planet |
| 1 | `pursuit` | A corvette runs; a Star Destroyer keeps entering frame |
| 2 | `boarding` | Breaching charge, troopers, and the Dark Lord |
| 3 | `pod` | An escape pod falls out of orbit |
| 4 | `desert` | Two droids, a lot of sand, a scrap hauler |
| 5 | `sunset` | The binary sunset, and the reason to leave |
| 6 | `departure` | Lift-off, climb-out, and the jump to lightspeed |
| 7 | `duel` | Two lightsabers in a hangar bay |
| 8 | `trench` | The attack run, the two-metre port, the explosion |
| 9 | `finale` | Going home, and the titles |

## How it is put together

```
src/
  core/       renderer + post stack, the director/timeline, camera rigs
  gfx/        procedural textures, materials, geometry construction kit
  models/     every ship, droid, character and piece of the battle station
  worlds/     planets, deep space, desert terrain, sky domes
  fx/         laser bolts, explosions, sparks, debris
  audio/      oscillator orchestra, the score, sound effects, the mixer
  scenes/     the ten sequences and the shared scene kit
  data/       the screenplay, and the generated voice-line manifest
tools/        offline renderer, TTS pipeline, audit tooling
```

A few things worth pointing at:

**Geometry.** `src/gfx/build.js` has one workhorse primitive, `prismoid()`,
which extrudes between two polygons and optionally gives each corner its own
height. The Star Destroyer's dart hull, the corvette's hammerhead, TIE solar
arrays, trench walls and sandcrawler bodies are all one call to it.

**Detail without triangles.** Every surface texture is drawn into a `<canvas>`
at runtime (`src/gfx/textures.js`): recursively subdivided hull plating with
panel lines and grime, lit-window emissive maps, equirectangular planet and
nebula maps built from value noise, TIE solar cells, weathered stone, adobe
plaster. Greeble fields of small boxes get merged into single buffers.

**Timeline.** `src/core/film.js` owns one clock. Sequences are built when the
playhead reaches them and disposed when it leaves, with the next one
pre-built during the outgoing fade so the hitch lands on a black frame.
Because every sequence is a pure function of its local time, the offline
renderer can step the same code at a fixed 1/24 s and get identical frames.

**Sound.** There are no audio samples. `src/audio/synth.js` is a small
orchestra of oscillators — brass, horns, strings, choir, timpani, harp — and
`src/audio/score.js` is the actual music, written as note data. One melody
carries the film: a fanfare over the titles, a lone horn in the desert, slow
strings at the sunset, full brass at the end. The Empire gets a four-note march
that never resolves. Effects (blasters, explosions, TIE screams, lightsaber
hum, a respirator) are synthesised the same way in `src/audio/sfx.js`.

Everything is scheduled declaratively into a `BaseAudioContext`, so the exact
same code plays live in the browser and renders the film's soundtrack offline
through an `OfflineAudioContext`.

**Voices.** `src/data/script.js` is the single source of truth for the crawl,
the subtitles and the voice track. `tools/tts.py` runs each line through
[piper](https://github.com/OHF-Voice/piper1-gpl) and then gives every character
a different treatment in ffmpeg — the Dark Lord is pitched down with a long
tail, pilots go through a radio band-pass, the protocol droid gets a tremolo.
Durations are measured and baked into `src/data/vo-manifest.js` so the edit can
be cut around the actual length of each line.

## Rendering a video

```bash
node tools/render.mjs --w=1280 --h=720 --fps=24 --out=build/film.mp4
node tools/render.mjs --from=294 --to=358 --out=build/trench.mp4   # one sequence
node tools/render.mjs --workers=3 --out=build/film.mp4             # parallel
```

The renderer drives headless Chrome frame by frame, pipes JPEGs straight into
ffmpeg, renders the soundtrack separately through `OfflineAudioContext`, and
muxes the two. On a machine without a GPU (software rasteriser) expect roughly
2 frames per second per worker.

## Auditing it

The hard part of making something like this without a person watching is not
writing the code, it is *checking the result*. Two tools exist for that:

```bash
node tools/shots.mjs --model=xwing --angles=25,110 --elev=14,55   # model turntable
node tools/shots.mjs --film --times=51,58,66 --w=800 --h=450      # frames from the film
```
`tools/shots.mjs` renders stills and stitches them into a contact sheet, which
is how every model and every shot in this film was reviewed.

```bash
python3 tools/check-audio.py --model=/path/to/vosk-model
```
`tools/check-audio.py` runs the voice track back through speech recognition and
diffs the transcript against the screenplay, reporting a word error rate per
line. That is how the Dark Lord's processing got dialled back: pitched down far
enough to sound good, he stopped being intelligible, and the transcript said so.

## Regenerating the voice track

```bash
python3 -m venv /tmp/ttsenv && /tmp/ttsenv/bin/pip install piper-tts
/tmp/ttsenv/bin/python -m piper.download_voices --download-dir /tmp/voices \
  en_US-ryan-high en_GB-alan-medium en_GB-northern_english_male-medium \
  en_US-amy-medium en_US-joe-medium en_US-lessac-high

node tools/export-script.mjs
python3 tools/tts.py --piper /tmp/ttsenv/bin/piper --voices /tmp/voices
```

## Credits and licence

Star Wars is a trademark of Lucasfilm Ltd. This is an unaffiliated,
non-commercial fan project: an original story and original music, made as a
technical demonstration of how far procedural generation can be pushed inside a
single web page.

Fonts: [News Cycle](https://fonts.google.com/specimen/News+Cycle),
[Anton](https://fonts.google.com/specimen/Anton) and
[Orbitron](https://fonts.google.com/specimen/Orbitron), all SIL Open Font
License. [three.js](https://threejs.org) is MIT licensed and vendored in
`vendor/`.
