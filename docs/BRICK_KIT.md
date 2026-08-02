# Brick kit API

Everything in this film is built from LEGO parts placed on a stud grid, then
merged into a handful of draw calls. Read this before adding models.

## Units

`1 world unit = 1 stud = 8 mm.`

| constant | value | meaning |
| --- | --- | --- |
| `STUD` | 1.0 | stud pitch |
| `PLATE` | 0.4 | plate height (3.2 mm) |
| `BRICK` | 1.2 | brick height (3 plates) |
| `P(n)`, `B(n)` | | n plates / n bricks in world units |

A minifig is ~5 units tall. An X-wing should be ~28 units long. A Star
Destroyer set piece can be 400+ units. Keep real proportions — if a real LEGO
set of the thing exists, match roughly its stud count.

## Building a model

```js
import { BrickBuilder, PLATE, BRICK, P, B } from '../lego/brick.js';
import { C, FINISH } from '../lego/palette.js';

const bb = new BrickBuilder({ studs: true, bevel: true, cullStuds: true });

// x, z = CENTRE of the footprint; y = BOTTOM of the part. All in studs.
bb.brick(0, 0, 0, 2, 4, { color: C.red });           // 2x4 brick
bb.plate(0, BRICK, 0, 6, 8, { color: C.lightBluishGray });
bb.tile(0, BRICK + PLATE, 0, 2, 2, { color: C.black });   // no studs
bb.slope(3, 0, 0, 2, 2, { h: BRICK, color: C.blue, rot: Math.PI / 2 });
bb.wedge(0, 0, 6, 8, 6, { h: PLATE, color: C.white, mirror: true });
bb.cyl(0, 0, 0, 0.5, BRICK, { color: C.tan });        // round brick
bb.cone(0, BRICK, 0, 0.5, BRICK, { color: C.tan });
bb.sphere(0, 4, 0, 1.2, { color: C.white, dome: true });
bb.bar(0, 2, 0, 0.07, 4, { color: C.flatSilver, finish: FINISH.METAL });
bb.prism([[0,0],[3,0],[3,1],[1,2]], 2, { x: 0, y: 0, z: 0, color: C.darkBluishGray });
bb.custom(anyBufferGeometry, { x, y, z, rx, ry, rz, color });

bb.mirrorX((b) => { /* build the left wing only */ });  // right wing for free

const group = bb.build();   // THREE.Group, merged, few draw calls
```

Notes:

- `rot` is yaw in radians. Slopes point their tall edge at `+X` when `rot = 0`.
- Studs covered by another part are culled automatically (`cullStuds`).
- For very large structures pass `{ studs: false, bevel: false }` to the
  constructor — 10 000 studs will not survive software rendering.
- `bb.node('engineL', x, y, z)` returns an `Object3D` placed in the model and
  exposed on `group.userData.nodes.engineL`. Use it for engine glow, gun
  muzzles, seats, hardpoints — scenes rely on these.

## Colours and finishes

`src/lego/palette.js` has the real LEGO colour names (`C.lightBluishGray`,
`C.reddishBrown`, `C.transLightBlue`, ...). Use them; do not invent hex codes.

Finishes: `FINISH.SOLID` (default), `TRANS`, `METAL`, `CHROME`, `RUBBER`,
`GLOW` (unlit + additive, for engines / bolts / sabers).

```js
bb.cyl(0, 0, 0, 0.6, 1, { color: C.transNeonOrange, finish: FINISH.GLOW });
```

## Minifigs

```js
import { Minifig, Lightsaber, FIG } from '../lego/minifig.js';

const fig = new Minifig({
  name: 'pilot',
  skin: C.yellow,
  torso: C.white, arms: C.white, hands: C.yellow,
  hips: C.black, legs: C.black,
  face: FACE_SVG,             // SVG string, viewBox "0 0 512 256"
  torsoFront: TORSO_SVG,      // SVG string, square-ish viewBox
  torsoBack: TORSO_BACK_SVG,
  headgear: (f) => buildHelmet(),   // returns Object3D parented to the head
  cape: { color: C.black, w: 1.8, h: 3.2 },
});
fig.setPose('aim');            // idle stand_wide hold_two hold_right aim point
                               // saber_guard saber_high panic surrender salute
                               // reach sit fallen
fig.walk(dt, 1.0);             // hip-swing walk cycle with the minifig waddle
fig.lookAt(vec3);
fig.attach('R', saber.object3D);
fig.update(dt, t);             // call every frame (drives capes)
scene.add(fig.object3D);       // feet sit at y = 0
```

## SVG prints

Faces and torso printing are authored as SVG strings and rasterised.

- Face SVG: `viewBox="0 0 512 256"`. This wraps the whole head, so keep the
  art between x≈150 and x≈360 or it will run around the back of the head.
  The background is filled with the skin colour automatically.
- Torso SVG: drawn into a 128×192-ish cell; use `viewBox="0 0 128 192"` and
  fill edge-to-edge. Background is the torso colour.
- Helmet/hull decals: `svgTexture(svg, { w, h, background })` returns a
  `THREE.CanvasTexture`.
- `svgExtrude(svg, { depth, size })` turns SVG paths into 3D geometry (logos).

Do not use external image files. Author the SVG inline in a `.js` module as a
template string so it stays diff-able.

## Registering a model

```js
import { register } from '../registry.js';
register('xwing', (opts) => buildXwing(opts), { notes: 'T-65, 28 studs long' });
```

Then check your work headlessly:

```bash
npm run shot -- --m=xwing --out=/tmp/xwing.png --az=40 --el=18 --bg=space
npm run shot -- --m=xwing --out=/tmp/x2.png --az=90 --el=0 --grid=0 --dist=45
```

Options: `--m` model, `--az/--el` camera azimuth/elevation in degrees,
`--dist` distance (auto if omitted), `--bg` studio|space|desert|interior|sunset|dark,
`--grid=0` hide the baseplate, `--spin=0` freeze rotation, `--t` time in seconds,
`--w/--h` resolution, `--nopost=1` skip bloom/grade, `--diag=1` draw-call stats.

**Always look at the PNG you produced.** Rendering is the only way to know if a
model reads correctly. Iterate until it looks like the real thing.

## Animation hooks

A registered factory may return a `THREE.Group` with
`group.userData.update = (t, dt) => {}` — the lab and the film both call it.

## Performance budget

Software rendering (SwiftShader, no GPU). Keep it tight:

- A hero model: < 60k triangles, < 12 draw calls.
- A background set piece: < 120k triangles total.
- Prefer `{ studs: false }` on anything more than ~30 studs across that is
  never seen up close.
- No `MeshTransmissionMaterial`, no SSR, no heavy custom shaders.
