# BRICK WARS — engine API

A procedurally generated, LEGO-styled Star Wars story rendered in three.js.
Everything on screen is built from code: no meshes, no textures, no models are
imported. Bricks come from a stud-grid construction kit, decals come from
hand-authored SVG, sound comes from a Piper narration pass plus synthesized
effects and score.

## The one rule: the film is a pure function of time

`update(t)` may be called with **any t, in any order**, and must always produce
the same image. The offline renderer splits the movie across parallel headless
browsers, so a scene that accumulates state (`this.x += dt`) will tear.

- Never call `Math.random()` anywhere. Use `hash11(i, salt)` / `noise1(x)` /
  `fbm1(x)` for per-frame values, or seed an `Rng` **at build time** only.
- Never integrate. Compute positions directly from `t`.
- Anything that "spawns" (bolts, sparks, debris) must be declared up front with
  a start time and evaluated analytically. The FX classes already work this way.

## Scene module contract

```js
// src/scenes/03-plans.js
import * as THREE from 'three';

export const meta = {
  id: 'plans',          // must match the id in src/story/script.js
  title: 'The Little Droid',
  duration: 40,         // fallback; the real value comes from the audio manifest
  letterbox: 0.105,     // height of each cinematic bar, in ortho units (0 = none)
  hardCutIn: false,     // true skips the fade up from black
};

export async function build(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, ctx.aspect, 0.1, 5000);
  // ...build everything here (async is fine: await SVG loads, etc.)

  return {
    scene,
    camera,
    update(t) {         // t is SCENE-LOCAL seconds, 0 .. ctx.duration
      // pose the camera and everything else from t
    },
    bloom: { strength: 0.62, radius: 0.62, threshold: 0.72 }, // optional
  };
}
```

`ctx` contains:

| field | meaning |
| --- | --- |
| `ctx.duration` | this scene's exact length in seconds |
| `ctx.aspect` | 16/9 |
| `ctx.lines` | narration lines in this scene: `{ speaker, text, local, dur }`, `local` is the scene-local start time |
| `ctx.sfx(localT, name, {gain, rate})` | schedule a sound effect (call during build) |
| `ctx.quality` | `'high'` |

Scenes own their own lighting, background and fog. The film handles fades,
letterbox bars and subtitles.

## Units

One stud = `PITCH` = 1.0 world unit. One plate of height = `PLATE` = 0.4. One
brick = 3 plates = 1.2. A minifigure is about 5 units tall. Pick a scale per
scene and stay consistent inside it; scenes are independent.

## The brick kit — `src/engine/brick.js`

```js
import { Bricks, COLORS } from '../engine/index.js';

const b = new Bricks();
b.brick(x, y, z, w, d, color, opts);   // 3 plates tall, studded
b.plate(x, y, z, w, d, color, opts);   // 1 plate tall, studded
b.tile (x, y, z, w, d, color, opts);   // 1 plate tall, smooth
b.box  (x, y, z, w, d, h, color, opts) // h in plates
b.panel(x, y, z, w, d, h, color, opts) // box with no studs
b.slope(x, y, z, w, d, h, color, { dir:'+x'|'-x'|'+z'|'-z', inverted:false })
b.wedge(x, y, z, w, d, h, color, { rot: 0..3 })   // right-triangular
b.cyl  (x, y, z, r, h, color, { segments, rTop, stud, rot:[rx,ry,rz] })
b.cone (x, y, z, rBottom, rTop, h, color)
b.sphere(x, y, z, r, color, { segments })
b.dish (x, y, z, r, depth, color)      // radar dish
b.torus(x, y, z, r, tube, color)
b.wheel(x, y, z, r, width, tyreColor, hubColor)
b.bar  ([x1,y1,z1], [x2,y2,z2], r, color)   // world units, any angle
b.addGeometry(threeGeometry, { x, y, z, rot:[x,y,z], color, opts })

const model = b.build();               // -> THREE.Group, merged per material
```

**Coordinates are LEGO units, anchored at the minimum corner**: `x`/`z` in
studs, `y` in plates. `b.brick(0,0,0, 2,4, red)` fills studs x:0..2, z:0..4 and
rises from y=0 to y=3.

Transform stack, for sub-assemblies:

```js
b.push();
b.translate(x, y, z);   // LEGO units
b.translateWorld(x, y, z);
b.rotateY(angle); b.rotateX(a); b.rotateZ(a);
b.scale(s); b.mirrorX();
b.brick(...);           // placed under the current transform
b.pop();
b.merge(otherBricksBuilder);  // splice another builder in at the current transform
```

`opts` accepts `{ studs:false, finish:'plastic'|'glossy'|'rubber'|'metal'|'chrome'|'gold'|'trans', emissive:0xffffff, emissiveIntensity:2, opacity:0.5, transparent:true, tag:'name' }`.

`build()` merges every part into **one mesh per material**, so a 2000-brick
model costs a handful of draw calls. It also records
`model.userData.parts` (each part's world centre, rotation, size, colour) — feed
that to `BrickBurst` to blow the model apart into individual bricks.

`model.userData.triangles` reports the triangle count. **Budget: keep each
scene under about 400k triangles.** Use `studs:false` for anything far from
camera, and build big shapes from big elements rather than thousands of 1x1s.

## Colours — `src/engine/palette.js`

`COLORS` holds real LEGO colour names: `white, lightBluishGray, darkBluishGray,
black, trueBlack, red, darkRed, brightOrange, orange, yellow, tan, darkTan,
brown, reddishBrown, green, brightGreen, darkGreen, sandGreen, blue, darkBlue,
mediumBlue, brightLightBlue, sandBlue, darkAzure, purple, lime, oliveGreen,
flatSilver, pearlGold, chromeGold, chromeSilver, transClear, transRed,
transNeonOrange, transYellow, transGreen, transLightBlue, transDarkBlue,
lightFlesh, mediumFlesh, darkFlesh`. `KIT` has story-specific aliases
(`laserRed`, `laserGreen`, `saberBlue`, `engineBlue`, `hologram`, `sand`, ...).

Prefer real LEGO colours over arbitrary hex — it is most of why the film reads
as plastic.

## Minifigures — `src/kit/minifig.js`

```js
import { buildMinifig, poseWalk, poseRun, poseStand, poseAim, lookAt,
         holdInHand, hairPiece, cape, blaster, lightsaber, FIG } from '../kit/minifig.js';

const fig = await buildMinifig({
  shirt, legs, hips, arms, hands, head,     // colours
  face: 'svg/face-determined.svg',          // optional decal
  torsoPrint: 'svg/torso-rebel-trooper.svg',
  scale: 1, seed: 3,
});
scene.add(fig.root);
poseWalk(fig, t, { speed: 2.4 });
```

`fig` exposes `root, body, pelvis, legL, legR, torso, armL, armR, handL, handR,
neck, head, accessory` — all THREE.Groups you can rotate directly. `FIG` has the
proportions (`FIG.height` ≈ 5.05, `FIG.shoulderY`, `FIG.headY`, ...). Put hats,
hair and helmets in `fig.accessory` (parented to the head).

## Characters and ships

`src/kit/characters.js` and `src/kit/ships-*.js` provide the cast and the
hardware. Import them rather than rebuilding — consistency across scenes is the
point. See those files' exports for the current list.

## Effects — `src/engine/fx.js`

All are constructed once and driven by `update(t)`.

- `new Starfield({count, radius})` — deep star sphere. `.object`, `.update(t)`, `.opacity`.
- `new BoltPool({color, length, width})` — laser fire. `.add({t0, from, to, speed})`,
  `.burst({t0, n, dt, from, to, spread})`, `.update(t, camera)`.
- `new BrickBurst(model.userData.parts, {t0, origin, speed, spin, gravity, matrixWorld})` —
  a built model exploding into its own bricks. This is the film's signature effect.
- `new Sparks({t0, life, speed, color, origin, cone:{axis,spread}})`
- `new Fireball({t0, life, radius, position})`
- `new Thruster({color, radius, length, position, dir})` — set `.throttle`.
- `new Beam({color, radiusTop, radiusBottom, height})` — tractor beam / projector cone.
- `new Hyperspace({count, length})` — set `.intensity`.
- `new Smoke({t0, life, origin, rise, spread, size})`
- `hologramMaterial(color)` — flickering scanline material; set `uniforms.uTime.value = t`.
- `glowSprite(color, size)`, `additiveMaterial(color)`, `radialTexture()`, `flareTexture()`
- `shake(camera, t, amount, freq, seed)` — call **after** positioning the camera.

## Lighting and camera — `src/engine/stage.js`

Use the shared rigs so the eight scenes look like one film.

```js
import { standardLights, cameraRig, handheld, nebulaBackdrop } from '../engine/stage.js';

const lights = standardLights(scene, 'space');   // also: interior, desert, hangar, trench, hall
lights.key.intensity *= 1.2;                     // nudge afterwards if needed

cameraRig(camera, t, {
  pos:   [[0,[0,6,40]], [4,[0,9,18]], [9,[12,4,6]]],
  look:  [[0,[0,4,0]],  [9,[2,2,0]]],
  fov:   [[0,52], [4,34]],
  shake: [[3,0], [3.2,0.5], [4.2,0]],
  ease:  ease.inOutCubic,
});
handheld(camera, t, 0.05);        // subtle continuous drift, call after positioning
```

Each preset sets a key/fill/rim/hemisphere rig, a background colour and
(sometimes) fog, and returns the lights so you can adjust them.

## SVG — `src/engine/svg.js`

```js
const logo = await extrudeSVG('svg/logo-brickwars.svg', { depth: 0.5, size: 30, color: 0xf2cd37 });
const tex  = await svgTexture('svg/hud-targeting.svg', { w: 512, h: 512 });
const img  = await svgImage('svg/face-luke.svg');   // raw <img> for canvas compositing
```

Paths are relative to `public/`, so `'svg/foo.svg'`. See `public/svg/README.md`
for the catalogue.

## Easing — `src/engine/ease.js` (exported as `ease` from the barrel)

`range(t,a,b)` (clamped 0..1 progress), `smooth`, `smoother`, `outCubic`,
`outQuint`, `outExpo`, `outBack`, `outElastic`, `outBounce`, `inOutCubic`,
`pulse(t, start, up, hold, down)`, `track([[t,v],...], t)` (keyframes, values may
be numbers or arrays), `spline([[x,y,z],...], u)`, `lerp`, `clamp`.

`track` is the workhorse for camera choreography:

```js
const p = ease.track([[0,[0,6,40]], [4,[0,9,18]], [9,[12,4,6]]], t, ease.inOutCubic);
camera.position.set(...p);
camera.lookAt(...ease.track([[0,[0,4,0]], [9,[2,2,0]]], t));
```

## Sound

Call `ctx.sfx(localTime, 'name', { gain })` **during build** to schedule an
effect. Names come from `public/audio/sfx/index.json`. The film plays them live
via Web Audio and the offline renderer mixes the identical cue list with ffmpeg,
so they stay in sync automatically.

## Reviewing your work

```bash
npm run dev                                    # already running on :5173
node tools/shots.mjs --scene trench --n 8 --out /tmp/trench --contact /tmp/trench.png
node tools/shots.mjs --scene trench --times 0,2,4,6 --out /tmp/trench
```

Then **open the JPEGs with the Read tool and actually look at them.** Iterate.
A scene that has never been looked at is not finished.

For motion, render a short clip:

```bash
node tools/render.mjs --scene trench --fps 24 --workers 3 --out /tmp/trench.mp4
```
