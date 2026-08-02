# Modeling conventions

Everything in this film is built from code. No binary art assets, no imported
meshes, no external textures. Bricks come from `src/lego/bricks.js`, printed
detail comes from SVG strings in `src/lego/svgtex.js`.

## Units and orientation

| symbol  | value | meaning                          |
| ------- | ----- | -------------------------------- |
| `STUD`  | 1.0   | stud pitch (8mm), the X/Z grid   |
| `PLATE` | 0.4   | one plate of height              |
| `BRICK` | 1.2   | one brick of height (3 plates)   |

- **A minifig is 5.0 units tall** (4 bricks). All human-scale props follow that.
- **Forward is `-Z`** for every model: ships fly toward `-Z`, minifigs face `-Z`.
  This matches `Object3D.lookAt()`, which aims the object's `-Z` at the target.
- **Up is `+Y`.** Models are anchored so `y = 0` is the natural resting plane
  (feet, keel, floor), centered on X/Z, unless documented otherwise.
- Ships are **model scale**, not minifig scale: they are sized like LEGO sets so
  that scenes can pose them together. Each ship documents its length in
  `group.userData.length`.

## The brick kit — `src/lego/bricks.js`

```js
import {
  brick, plate, tile, slope, prism, wedge, cyl, cone, sphere, ring, dish, bar,
  panel, studGrid, at, rot, group, mirrorX, bake, mat, glow, norm, rng,
  C, STUD, PLATE, BRICK,
} from '../lego/bricks.js';
```

- `brick(w, d, h, {color, studs, ...})` — w/d in studs, h in world units.
  Centered on X/Z, base at `y = 0`.
- `plate(w, d, o)` / `tile(w, d, h, o)` — plate is `PLATE` tall; tile has no studs.
- `slope(w, d, h, hFront, o)` — high edge at `-X`, falls to `hFront` at `+X`.
- `prism(points2D, h, o)` — extrude an XZ polygon upward. The workhorse for
  ship hulls: `prism([[-4,10],[4,10],[0,-14]], PLATE, {color: C.white})`.
- `wedge(w, d, h, o)` — triangle, tip at `-Z`.
- `cyl(r, h, {rTop, seg, studs, glow, opacity})`, `cone`, `sphere`, `ring`, `dish`, `bar`.
- `panel(w, h, texture)` — flat decal quad in the XY plane facing `+Z`.
- `mat(color, o)` / `glow(color, opacity)` — cached materials. Use `glow()` for
  anything that should read as light (engines, bolts, sabers, windows at night).
- `at(obj, x, y, z)` and `rot(obj, rx, ry, rz)` return the object, so they nest:
  `g.add(at(rot(brick(2,4,BRICK,{color:C.red}), 0, Math.PI/2, 0), 3, BRICK, -1))`
- `bake(group)` merges every mesh sharing a material into one mesh. Call it on
  finished **static** models: it cuts draw calls by 10-100x. Meshes tagged
  `userData.noBake = true` survive as separate objects (use for parts that must
  animate or be looked up later).
- `rng(seed)` — deterministic PRNG. **Never use `Math.random()`**: renders must
  be reproducible frame for frame.

## Printed detail — `src/lego/svgtex.js`

```js
import { svgTexture, svg, textTexture, texturesReady } from '../lego/svgtex.js';
const face = svgTexture(svg([0, 0, 128, 128], `<rect .../><path .../>`), { w: 256 });
```

Use it for minifig faces, helmet decals, torso prints, control panels, insignia,
hull markings and screens. Attach with `panel()`, or pass as `mat(color,{map})`.

## Model contract

Every exported factory:

1. takes an options object with sensible defaults,
2. returns a `THREE.Group` anchored per the rules above,
3. sets `group.userData.length` / `.width` / `.height` when size matters,
4. exposes animated sub-objects on `group.userData` (e.g. `engines`, `wings`),
5. optionally exposes `group.userData.update = (t) => {}` for self-animation,
6. is **pure**: same arguments produce the same mesh, every time.

## Previewing a model

A dev server runs on `http://127.0.0.1:5173`. To inspect any factory:

```
node tools/shot.mjs "http://127.0.0.1:5173/preview.html?m=/src/models/ships.js&f=xwing&r=0.3&e=0.25" /tmp/xwing.png --w 1100 --h 760
```

Query params: `m` module, `f` export, `args` JSON array, `r` turntable (0..1),
`e` elevation (0..1), `z` zoom, `t` time, `bg` hex, `grid=0`.

The tool prints the model's bounding box, mesh count and any page errors, then
writes the PNG. **Look at the PNG.** Iterate until the silhouette reads clearly
from at least three angles.
