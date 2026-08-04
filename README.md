# The Black Gale — an animated 3D pirate ship

A three-masted galleon you can sail around an open sea, rendered with
[three.js](https://threejs.org). Everything — the hull, the rigging, the wood
grain, the Jolly Roger, the water — is generated in code, so the whole scene
ships as **one self-contained HTML file with no assets and no network calls**.

## Just open it

Download [`pirate-ship.html`](pirate-ship.html) and open it in any browser
(desktop or mobile — it works on Android and iOS too). That is the entire thing:
double-click it, no server, no install, works offline.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Set / take in sail | `W` `S` or `↑` `↓` | joystick up / down |
| Put the helm over | `A` `D` or `←` `→` | joystick left / right |
| Full broadside | `Space` | **Fire broadside** button |
| Fire one side | `Q` (port) / `E` (starboard) | — |
| Orbit the ship | drag | one-finger drag |
| Zoom | scroll wheel | pinch |
| Change camera | `C` | **Camera** button |
| Back on station | `R` | **Reset** button |
| Show / hide controls | `H` | **Controls** button |

Three cameras: **orbit** (free look around her), **chase** (locked off the
quarter) and **helm** (standing at the wheel, looking down the deck).

## Take the model with you

**Download .glb** exports the ship — hull, rigging, sails, guns, deck clutter,
with all of its generated textures baked in — as a standard glTF binary you can
drop into Blender, Unity, Unreal, `<model-viewer>` or any other glTF tool.

## What is in the scene

- **Hull** lofted from a table of cross sections, so every fitting (gunports,
  channels, the anchor, the transom board) is placed by querying the same
  curves the planking is built from.
- **Rig** with three masts, tops and crosstrees, yards, shrouds, ratlines,
  stays and backstays, square courses and topsails, two headsails on the
  bowsprit and a gaff spanker on the mizzen. Every sail bellies and ripples with
  the wind, and furls up to the yard as you take in sail.
- **Twenty-six guns**: broadside batteries behind hinged gunports plus stern
  chasers. They recoil, cough smoke and throw round shot that splashes into the
  sea.
- **Ocean** built from a sum of Gerstner waves evaluated in the vertex shader,
  with a radial grid that stays dense near the ship and reaches to the horizon.
  The same wave function runs on the CPU for buoyancy, so the hull rises,
  pitches and rolls on exactly the water you can see.
- **Wake, spray and foam** that ride the swell, plus circling gulls, a lit
  stern lantern, a drifting cloud deck and a sun you can see glittering on the
  water.

## Developing

```bash
npm install
npm run build     # bundle src/ + three.js into pirate-ship.html
npm run dev       # rebuild on change and serve on http://localhost:8080
```

`pirate-ship.html` is a build artifact and is committed so the scene can be
opened straight from a checkout. Regenerate it with `npm run build` after any
change under `src/` or `templates/`.

### Layout

| Path | What it does |
| --- | --- |
| `src/main.js` | scene setup, HUD wiring and the frame loop |
| `src/waves.js` | the Gerstner wave set, shared by the water shader and the physics |
| `src/ocean.js` | water geometry, shading, foam and the hull's contact shadow |
| `src/sky.js` | sky dome, procedural clouds and the lighting rig |
| `src/ship/hull.js` | station table, lofted planking, decks, bulwarks, transom |
| `src/ship/rig.js` | masts, spars, sails, flags and cordage |
| `src/ship/details.js` | raised decks, guns, helm, ground tackle, deck clutter |
| `src/ship/merge.js` | bakes the static parts into a few draw calls |
| `src/effects.js` | wake, spray, powder smoke, round shot and gulls |
| `src/quality.js` | GPU detection and the three quality tiers |
| `src/textures.js` | every texture, painted on a 2D canvas at load |

### Performance

The scene starts on **high** and steps down to **medium** or **low** on its own
if frames come in slowly; software WebGL (SwiftShader, llvmpipe) is detected up
front and starts low with multisampling off. Pin a tier with a query string:

```
pirate-ship.html?quality=low
```

### Scripting it

The page exposes `window.pirateShip` with `scene`, `camera`, `renderer`, `ship`,
`ocean`, `effects`, `cameraRig` and `quality`, which is handy for embedding:

```js
pirateShip.ship.state.sailSet = 1;   // crack on all sail
pirateShip.ship.fire('both');        // full broadside
pirateShip.cameraRig.setMode('helm');
```

### Tests

```bash
node scripts/smoke-test.mjs   # headless load: fails on any console error, reports fps
node scripts/gallery.mjs      # renders a set of fixed angles to screenshots/
```

Both drive headless Chrome through `puppeteer-core`; set `CHROME_PATH` if your
browser is not at `/usr/local/bin/google-chrome`.
