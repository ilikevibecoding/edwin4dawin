# LEGO Star Wars — A New Hope (brick-built)

A ~5 minute procedurally generated LEGO Star Wars animated short, rendered in
three.js and narrated with locally synthesised character voices.

Nothing here is an imported asset. Every brick, minifigure, starship, set,
sound effect and note of music is generated from code at load time. There are
no `.glb` files, no textures on disk, no stock audio — the repository is
JavaScript, a handful of open fonts, and the audio the build script renders.

## Watch it

```bash
npm install
npm run audio      # synthesise narration, sfx and score (a few minutes, cached)
npm run dev        # then open the printed URL and press Play
```

Render it to a video file instead:

```bash
npm run capture -- --fps=24 --w=960 --h=540 --segments=3
# -> render/film.mp4
```

Pick the resolution deliberately. There is no GPU here, so every frame is
rasterised by SwiftShader on the CPU and the cost is close to linear in pixels:
on four cores the trench chapter is about a second a frame at 960x540 and three
seconds at 1280x720, which is the difference between a two hour render and a six
hour one. Roughly a third of that is the bloom pass alone.

## How it is put together

### The brick kit — `src/lego/`

A LEGO parts system on the real stud grid: `1 world unit = 1 stud = 8 mm`, so
a minifig is 5 units tall and a Star Destroyer is 340.

- `parts.js` — chamfered boxes, studs, cylinders, cones, domes, slopes, wedges,
  curved windscreens and arbitrary extruded profiles, all cached.
- `brick.js` — `BrickBuilder` collects part placements, culls the studs that
  end up underneath other parts, and bakes everything down to a few merged
  meshes. Solid parts share one vertex-coloured material, so an entire ship is
  usually a single draw call.
- `palette.js` — the actual LEGO colour names and hexes.
- `materials.js` — ABS plastic (clearcoat + env reflections), transparent,
  metallic, chrome, rubber and unlit "glow" finishes.
- `minifig.js` — a minifig rig with correct proportions, a hip-swing walk cycle
  with the characteristic waddle, a pose library, cloth capes and a lightsaber.
- `svg.js` — the printing pipeline: SVG strings are rasterised into textures for
  faces, torso prints, helmet decals and insignia, or extruded into geometry.

Every printed element in the film is authored as SVG. Minifig heads are UV'd so
the print wraps the cylinder with the face centred on the front, and torsos use
a six-cell atlas so a printed torso is still one draw call.

### The film engine — `src/engine/`

- `app.js` — the timeline. Chapters are functions of their local time, which is
  what lets the same code drive live playback (clocked by the audio element)
  and offline capture (clocked by a fixed frame step) without drifting.
- `camera.js` — a data-driven shot list: position, target, fov, roll, shake and
  handheld noise, interpolated with easing, or a chase camera bolted to a moving
  object.
- `effects.js` — pooled laser bolts, explosions that burst models into loose
  bricks (the only correct way to blow up something made of LEGO), billboard
  fire and smoke, engine flares, holograms and dust motes.
- `fx.js` — bloom, film grain, vignette, chromatic fringe, letterbox and fades.
- `lighting.js` — reusable lighting rigs (space, desert, sunset, interior, dark)
  and procedurally generated environment maps.

### Assets

- `src/ships/` — corvette, Star Destroyer, X-wing, TIE fighter, escape pod,
  sandcrawler, landspeeder, turrets.
- `src/chars/` — Vader, Leia, Luke, Han, Obi-Wan, stormtroopers, rebel troopers,
  imperial officers, R2-D2, C-3PO, Jawas, pilots.
- `src/sets/` — starfield, desert planet, twin suns, corvette corridor, dune
  fields, moisture farm, hermit hut, battle-station surface and trench, hangar
  and the medal hall.
- `src/scenes/` — the nine chapters.

### Audio — `tools/`

- `tts.mjs` — narration through a local neural TTS, one voice per character,
  then per-character processing (Vader is pitched down through a mask, the
  protocol droid is band-passed and metallic, the pilot is on a radio).
- `sfx.mjs` — hand-written synthesis for blasters, sabers, explosions, engines,
  droid beeps, doors and wind.
- `music.mjs` — an original orchestral-style score generated from scratch.
- `build-audio.mjs` — lays the script out in time, mixes everything to one
  master track, and writes `src/story/timing.json`, which is what the film's
  chapters key their choreography off.

## Working on it

The most useful tool here is the asset lab, which renders any single model
headlessly so you can look at it:

```bash
npm run shot -- --m=xwing --out=/tmp/x.png --az=40 --el=18 --bg=space --grid=0
npm run shot -- --m=vader --out=/tmp/v.png --dist=14 --spin=0 --diag=1
```

And single frames of the film itself:

```bash
npm run frame -- --times=0,20,60,120 --dir=/tmp/frames
```

The hard part of building something like this is not writing it, it is *seeing*
it — a five minute film is nine thousand frames and there is no way to watch
them. So the review loop is a contact sheet: sample the whole timeline at a
fixed interval and tile the results into labelled grids.

```bash
npm run sheet -- --every=4 --dir=/tmp/sheet            # whole film, ~75 s
npm run sheet -- --from=82 --to=120 --every=2 --dir=/tmp/corridor
```

Both `sheet` and `frame` step the simulation forward at 1/30 s between samples
rather than seeking cold, because the effect pools are stateful: without it a
sheet of the corridor firefight shows eighty blaster bolts hanging in the air
that no viewer would ever see.

See `docs/BRICK_KIT.md` for the full parts API.

## Notes

The film renders on a software rasteriser with no GPU, so the whole thing is
built to a budget: merged geometry, culled studs, pooled particles.

`--segments` splits the timeline across parallel headless browsers, which buys
much less than it looks like it should: SwiftShader is itself multi-threaded and
one browser already saturates the machine, so three workers finish at roughly
the rate one does. It is still worth using, because a segment that dies takes
only its own slice of the film with it.

The story beats are the ones everyone knows. The narration is original prose,
and the score is an original composition in a similar idiom — no melodies or
dialogue are reproduced from the films.
