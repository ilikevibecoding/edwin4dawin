# AEGIS LINE

A first-person, fully procedural **fictional** air-defence interceptor demonstration
built with [Three.js](https://threejs.org/) and [Vite](https://vitejs.dev/).

You are the duty operator at an invented interceptor range in the desert. Walk the
site, inspect the launchers, take the fire-control console, and defend the pad
against inbound ballistic targets under three lighting conditions.

> **Entertainment only.** Every system, range, speed, radar behaviour, guidance law,
> probability and procedure in this build is invented and balanced for gameplay.
> PALISADE, HALBERD and SENTINEL are fictional names. Nothing here represents real
> hardware performance, real doctrine or real operating procedure. The realism is
> concentrated in the graphics, animation, audio and atmosphere.

## Running it

Requires Node 20 or newer.

```bash
npm install
npm run dev        # http://127.0.0.1:5173
```

```bash
npm run build      # production bundle in dist/
npm run preview    # serve the built bundle
npm test           # Playwright gameplay suite (21 tests)
npm run shots      # capture the reference screenshot set
```

Playwright needs a browser once: `npx playwright install chromium --with-deps`.

## Controls

| input | action |
|---|---|
| mouse | look (click the view to capture the pointer) |
| `W` `A` `S` `D` | walk |
| `Shift` | sprint |
| `Tab` | open / close the fire-control console |
| `E` | assign the selected battery to the track under the reticle, or take the console when standing at it |
| `F` | authorize launch |
| `T` | cycle to the next track |
| `B` | cycle to the next battery |
| `R` | restart the scenario |
| `M` | mute audio |
| `P` | performance readout |
| `Esc` | release the pointer |

## The engagement loop

1. Take the console (walk into the shelter and press `E`, or press `Tab` anywhere).
2. Choose conditions: **DAY**, **SUNSET** or **NIGHT**.
3. Choose a scenario: **SINGLE TRACK**, **SATURATION** or **NIGHT RAID**.
4. Choose an interceptor battery.
5. Press **START BALLISTIC MISSILES**.
6. Watch the radar form tracks, select one, press **ASSIGN**, then **AUTHORIZE LAUNCH**.
7. Step outside and watch the intercept, or run the whole engagement from the console.
8. Read the result — intercepted, missed, decoy or impact, always with the reason.
9. Press `R` to run it again. Spawn points, arcs and timing vary on every run.

Either control method works: the console with the mouse, or the outdoor view where a
screen-centre prompt names the track under the reticle and `E` / `F` assign and
authorize.

## The batteries

All three are fictional. The differences exist to make the layered defence readable.

| | PALISADE PAC-T | HALBERD HA-2 | SENTINEL LR-1 |
|---|---|---|---|
| role | terminal | high altitude | long-range test article |
| inspiration | Patriot-class silhouette | THAAD-class silhouette | entirely invented |
| tubes / rounds | 4 / 8 | 8 / 8 | 2 / 3 |
| preparation | fast | slower | slowest |
| preferred band | low, close to the pad | wide, high | very high |
| character | quick reaction, hard manoeuvring | long dramatic contrails | biggest plume, longest flight |

## Architecture

Everything is generated at runtime — no models, textures or audio files are loaded.
Geometry comes from primitives, instancing and custom buffer geometry; every map is
painted into a canvas; every sound is synthesised from oscillators and noise buffers.

```
src/
  main.js          renderer, game state machine, input, adaptive quality, test API
  player.js        pointer-lock controller, capsule collision, head bob, footsteps
  base.js          terrain, command shelter, radar station, perimeter, site dressing
  batteries.js     the three launchers and their pads
  threats.js       inbound ballistic bodies, decoys, scenario waves
  interceptors.js  interceptor rounds, flight phases, kill assessment
  physics.js       atmosphere, integrator, steering, intercept solve, collision world
  effects.js       contrails, plumes, explosions, debris, shockwaves, dust, decals
  weather.js       sky, sun/moon, stars, fog, the three condition presets
  post.js          bloom, filmic grade, anti-aliasing
  radar.js         track formation, PPI scope, 3D track hologram
  audio.js         procedural WebAudio synthesis
  ui.js            HUD, world markers, console overlay, settings, accessibility
  core/            seeded RNG and noise, pooling, textures, materials, kit-bash, merging
```

Notes on the parts that are easy to get wrong:

- **Determinism.** All randomness runs through the seeded `Rng`, so `?seed=1234`
  reproduces a site layout and a scenario exactly. That is what makes the headless
  screenshot and gameplay tests stable.
- **Static merging.** The site is kit-bashed from ~1500 small primitives and then
  merged into one mesh per material (`core/merge.js`), which is what keeps the frame
  under 700 draw calls. Anything animated must be tagged `markDynamic`.
- **Simulation / presentation split.** `stepSim(dt)` runs at a fixed 1/60 and stays
  under a millisecond; camera-dependent and canvas work happens once per rendered
  frame.
- **Adaptive quality.** The game watches its own frame time and moves between
  low/medium/high to hold 60 fps, mostly by trading particle count for per-particle
  opacity. It can be pinned from the console options.

## Accessibility

Reduced motion (disables head bob and strong camera shake), high-contrast HUD, HUD
scale, audio captions for cues, volume and look-sensitivity sliders, and a
performance readout. All in the console options panel.

## Development notes

`AGENTS.md` documents the conventions, the performance rules and the headless tools
in `tools/`. `PROGRESS.md` is the build log: each iteration's scores, what the
screenshots revealed, and the bugs that were found and fixed.

## Licence

Unlicensed sample project.
