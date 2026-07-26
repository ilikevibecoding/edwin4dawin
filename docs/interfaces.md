# Northstar Rescue — Shared Interface Contract

Owner: **Opus 1**. This file is the single source of truth for how modules talk
to each other. No agent may change a signature listed here without Opus 1
updating this document first.

Stack (locked, do not migrate): **Vite 6 + Three.js r171 + WebGL2 + vanilla ES modules**,
Playwright for automation, `three-mesh-bvh` for accelerated raycasts.
All assets are generated in code (Canvas2D textures, BufferGeometry, WebAudio).
There are no binary asset files, therefore no missing-asset failure mode.

Units: **1 unit = 1 metre**, **+X east, +Y up, +Z south**. Yaw 0 faces -Z (north).

---

## 1. Core services

```js
import { bus, EV }        from 'src/core/events.js';   // synchronous event bus
import { settings }       from 'src/core/settings.js'; // player settings + quality preset
import { reg, OWNERS }    from 'src/core/assets.js';   // asset manifest registration
import { makeRng, rngFor} from 'src/core/rng.js';      // deterministic RNG
```

`settings.preset` → `{ pixelRatioCap, resolutionScale, shadowMapSize, shadowsEnabled,
localShadowLights, maxDynamicLights, anisotropy, antialias, ssaoEnabled, bloomEnabled,
decalBudget, particleBudget, clutterDensity, lodBias, reflections }`

### Asset registration (mandatory)

Every production asset must call `reg({...})` exactly once, with all of:
`id, name, category, owner, files, usedIn, dimensions, pivot, materials, textures,
collision, lod, status, acceptance` plus optional `animations`, `audio`, `evidence`,
`discrepancies`.

---

## 2. Art layer

```js
import { mat }            from 'src/art/materials.js'; // mat('carpet.slate') -> THREE.Material
import * as G             from 'src/art/geometry.js';  // bevelBox, box, cyl, sphere, capsule,
                                                       // torus, lathe, extrude, plane,
                                                       // buildParts, mergeParts, matrixFrom, makeLod
import * as T             from 'src/art/textures.js';  // procedural texture foundry
import { C, UI, UNITS }   from 'src/art/palette.js';   // visual bible constants
```

**House rule:** `G.bevelBox(w,h,d,bevel)` is the default primitive. A sharp
`G.box()` is only acceptable for hidden collision proxies and far LODs.

Material family names are listed in `allFamilyNames()` in `src/art/materials.js`.

---

## 3. Part lists and batching

Static geometry is authored as **part lists**, not Object3D trees:

```js
{ geometry: THREE.BufferGeometry, matName: 'wood.veneer',
  matrix: THREE.Matrix4, uvScale?: number, noProject?: boolean }
```

Helper: `KIT.part(geometry, matName, [x,y,z], [rx,ry,rz], [sx,sy,sz])`
(from `src/map/kit.js`) builds one.

Colliders are world-space AABBs:

```js
{ x0,y0,z0, x1,y1,z1, surface: 'drywall'|'carpet'|'concrete'|'metal'|'glass'|
  'wood'|'ceramic'|'vinyl'|'plastic'|'rubber'|'snow'|'tile', tag?: string, noClip?: boolean }
```

Helper: `KIT.collider(x0,y0,z0,x1,y1,z1,surface,tag)`.

`batchParts(parts, opts)` from `src/map/merge.js` world-space box-projects UVs and
merges into one mesh per material with a BVH attached.

---

## 4. Level

```js
level.root          // THREE.Group
level.doors         // DoorSystem  -> .doors[], .byId, .nearest(pos, r), .nearby(pos, r), .reset()
level.glass         // GlassSystem -> .panes[], .paneFromObject(obj), .reset()
level.nav           // NavGraph    -> .findPath(fromVec3, toVec3), .nearest(vec3),
                    //                .pointsInRoom(roomId, n, rng), .randomPoint(rng, filter)
level.lights        // LightRig    -> .setScenario('day'|'overcast'|'dusk'|'blackout'|'neutral')
level.screens       // [{ mesh, kind }] emissive screens for the QA gallery
```

Collision singleton:

```js
import { collision } from 'src/map/collision.js';
collision.moveCapsule(pos, delta, radius, height, stepHeight) -> { x,y,z,grounded,hitWall,... }
collision.raycast(origin, dirVec3, maxDistance, extraTargets) -> { point, normal, distance, object, matName } | null
collision.lineOfSight(fromVec3, toVec3, ignoreObj) -> boolean
collision.groundAt(x, z, fromY) -> { y, surface } | null
```

Layout data: `src/map/layout.js` exports `ROOMS, ROOM_BY_ID, OPENINGS, STAIRS,
CHECKPOINTS, HOSTAGE_SPOTS, EXTRACTION_ZONE, roomAt(x,z,floor), FLOOR_Y`.

---

## 5. Module contracts owned by individual agents

### `src/props/library.js` — Fable 3

```js
export const PROPS = {
  'prop.deskStandard': {
    id, name, size:[w,h,d], build(opts) -> { parts, colliders, dynamic?, screens? },
    tags: [...]
  },
  ...
};
export function prop(id, opts) -> { parts, colliders, ... } // parts already offset by opts.pos/rot
export function registerPropManifest();
```

`opts` always accepts `{ pos:[x,y,z], rot: yawRadians, rng, variant, scale }`.
`build` returns parts in **local space**; `prop()` applies the transform.

### `src/props/dress.js` — Fable 3

```js
export function buildProps() -> { parts, colliders, dynamic?: THREE.Group, screens: [], count: number }
```

### `src/characters/models.js` — Fable 4

```js
export function buildOperatorArms(opts) -> { group, bones, materials }
export function buildHostile(variantId, opts) -> { group, rig, hitboxes, height }
export function buildHostage(variantId, opts) -> { group, rig, hitboxes, height }
export const HOSTILE_VARIANTS, HOSTAGE_VARIANTS, HEAD_VARIANTS;
export function registerCharacterManifest();
```

`rig` = `{ root, hips, spine, chest, head, armL:{upper,fore,hand}, armR:{...},
legL:{thigh,shin,foot}, legR:{...}, weaponMount }` — all THREE.Object3D.
`hitboxes` = `[{ name:'head'|'chest'|'stomach'|'armL'|'armR'|'legL'|'legR',
box: THREE.Box3 (local), multiplier: number, bone: Object3D }]`.

### `src/characters/animation.js` — Fable 4

```js
export class CharacterAnimator {
  constructor(rig, { kind:'hostile'|'hostage', seed })
  play(state, opts)   // 'idle','walk','run','crouchIdle','crouchWalk','turnL','turnR',
                      // 'aim','fire','reload','flinch','takeCover','investigate','search',
                      // 'death1','death2','death3','fear','follow','stop','extract','surrender'
  update(dt, { speed, aiming, lookYaw, lookPitch })
  get current()
}
```

### `src/weapons/models.js` — Fable 4

```js
export function buildWeaponModel(weaponId, { firstPerson: boolean }) ->
  { group, parts:{ receiver, slide?, magazine, muzzle, ejectionPort, sights, bolt?, foregrip? },
    muzzleTip: THREE.Object3D, ejectPoint: THREE.Object3D, sightPoint: THREE.Object3D }
export function registerWeaponModelManifest();
```

Weapon ids: `pistol.vsc9`, `smg.kestrel`, `rifle.northwind`, `shotgun.borealis`,
`dmr.meridian`, `knife.talon`, `flash.halo`, `smoke.veil`.

### `src/ui/*` — Fable 1

```js
// src/ui/hud.js
export class Hud { constructor(rootEl); update(state); show(); hide(); notify(text, kind); }
// src/ui/menus.js
export class MenuSystem { constructor(rootEl, game); show(screenId); hide(); get active(); }
// src/ui/icons.js — canvas/SVG icon factories, no external files
```

### `src/vfx/*` — Fable 4

```js
// src/vfx/index.js
export class VfxSystem {
  constructor(scene, camera)
  update(dt)
  muzzleFlash(pos, dir, family)      // 'pistol'|'smg'|'rifle'|'shotgun'|'dmr'
  impact(point, normal, surface, opts)
  tracer(from, to, opts)
  shell(pos, dir, family)
  bloodHit(point, normal)
  glassShatter(payload)              // from EV.GLASS_BROKEN
  smokeVolume(pos, radius, duration)
  flashBang(pos)
  breathVapor(pos, dir)
  snowfall(enabled)
  reset()
}
```

### `src/audio/*` — Opus 1 + Fable 4

```js
// src/audio/index.js
export class AudioSystem {
  constructor()
  async unlock()
  update(dt, listenerPos, listenerQuat, room)
  play(id, opts)   // opts: { pos, volume, rate, room }
  stopAll()
  setRoom(roomId)
}
```

---

## 6. Deterministic test surface (Opus 4 consumes, Opus 1 owns)

```js
window.render_game_to_text()  -> JSON string
window.advanceTime(ms)        -> steps the simulation deterministically
window.__northstar            -> { game, qa, version }
window.__northstar.qa         -> teleport, giveWeapon, spawnEnemy, freezeAI, setLighting,
                                 showAssetIds, openGallery, resetMission, setObjective,
                                 showCollision, showNav, screenshotState
```

`render_game_to_text()` fields are specified in `docs/architecture.md`.
