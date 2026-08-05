# AEGIS LINE - contributor notes

Fictional first-person ballistic-missile-interceptor range demo. Three.js + Vite.
Everything is procedural: no downloaded models, textures or audio.

## Hard rules

1. **Fiction only.** All systems, ranges, speeds, radar behaviour, guidance logic,
   probabilities and procedures are invented and balanced for gameplay. Never add
   real performance envelopes, real procedures or anything actionable. Names
   (PALISADE, HALBERD, SENTINEL) are fictional.
2. **No assets.** Build geometry from primitives, instancing, custom buffer
   geometry, shaders and canvas-generated textures. No file loading of any kind.
3. **Frozen scope.** First-person site + three batteries + three scenarios + three
   lighting conditions. No new modes, vehicles to drive, infantry, progression,
   multiplayer or open world.
4. **Pool everything transient.** Missiles, smoke, sparks, debris, flares,
   explosions and decals all come from `Pool` / preallocated systems.
5. **Determinism.** All randomness goes through `Rng` (`src/core/rng.js`) seeded
   from the `seed` query parameter so screenshots are reproducible.

## Layout

```
src/
  main.js          renderer, game state machine, input, window.__GAME test API
  player.js        pointer-lock FPS controller, capsule collision, head bob
  base.js          terrain, shelter, radar station, perimeter, props
  batteries.js     PALISADE / HALBERD / SENTINEL launchers and their pads
  threats.js       inbound ballistic bodies, decoys, scenario waves
  interceptors.js  interceptor rounds, guidance phases, kill assessment
  physics.js       atmosphere, integrator, steering, collision world
  effects.js       trails, plumes, explosions, debris, shockwaves, decals
  weather.js       sky, sun/moon, stars, fog, day/sunset/night presets
  post.js          bloom + filmic grade + AA chain
  radar.js         track formation, PPI scope canvas, 3D track hologram
  audio.js         procedural WebAudio synthesis
  ui.js            HUD, world markers, command console overlay, settings
  style.css        interface styling
  core/
    rng.js         seeded PRNG + simplex noise
    pool.js        fixed-capacity object pool
    textures.js    procedural canvas textures (cached)
    materials.js   shared material library
    kit.js         reusable kit-bash props (cables, ladders, trucks, fences...)
    merge.js       static geometry merging (draw-call reduction)
```

## Performance rules

- Static geometry is merged after construction by `mergeStatic()`. **Anything whose
  transform is animated, whose material is swapped, or whose visibility is toggled
  must be tagged with `markDynamic(obj)`** or it will be baked into a merged mesh
  and stop animating. Tagging an object protects it and makes it its own merge root,
  so nested animated assemblies (turntable inside chassis, erector inside turntable)
  each need their own tag.
- Simulation and presentation are split. `stepSim(dt)` runs at a fixed 1/60 and must
  stay cheap; camera-dependent and canvas work belongs in `_render`. The radar scope
  canvas repaints at 20 Hz, the status panel at 5 Hz.
- Budget targets: < 800 draw calls, < 900k triangles, < 1 ms per sim step.

## Testing

The dev server usually already runs on `http://127.0.0.1:5173`. Start it with
`npm run dev` if not.

| tool | purpose |
|---|---|
| `node tools/quick.mjs out.png '["day",[x,y,z],[lookX,lookY,lookZ]]' 'extraJS'` | one screenshot from an arbitrary viewpoint (`y` may be `null` to sit on the ground); `extraJS` is evaluated in the page before rendering |
| `node tools/gallery.mjs shots/dir --w 1280 --h 720 [--only a,b]` | full site tour + scripted engagements |
| `node tools/sim.mjs [runs]` | headless gameplay matrix (no rendering, fast) |
| `node tools/perf.mjs` | draw calls, triangles, sim/render cost |
| `npx playwright test` | the committed Playwright suite |

Headless rendering uses SwiftShader, so absolute frame times are not meaningful.
Use draw calls, triangle counts and sim step cost as the perf signal.

### Test API (`window.__GAME`)

`configure({condition, scenario, battery})`, `start()`, `restart()`, `sim(steps)`
(simulate only), `step(steps)` (simulate + render), `render()`, `teleport(x,y,z)`,
`lookAt(x,y,z)`, `freezePlayer(bool)`, `hideHud(bool)`, `openConsole()`,
`closeConsole()`, `selectTrack(i)`, `assign()`, `authorize()`, `autoPilot()`,
`autoPlay(seconds)`, `state()`, `perfProbe(frames)`, `debugLight()`,
`setPostEnabled(bool)`, `setBloom(strength, threshold, radius)`.

`window.__gameInstance` exposes the live `Game` for ad-hoc probing.

## Cursor Cloud specific instructions

- Screenshots take roughly 10-15 s each under SwiftShader. Prefer `tools/sim.mjs`
  for logic checks and reserve screenshots for visual verification.
- Never run more than about four concurrent headless browsers on this VM; software
  rasterisation is CPU bound and they will starve each other.
