# SEASIDE STRIKE — Architecture & Team Contract

A Call-of-Duty-style first-person shooter in Three.js (r185) + `postprocessing` + `n8ao` + Rapier physics, Vite dev server.
Level: a sunlit Mediterranean seaside plaza (reference: BO4 "Seaside"). Weapon: M4A1-style carbine with an EOTech-style
holographic sight and gloved arms (reference: MW2019 first-person view).

## Running

```
npm install
npm run dev              # http://localhost:5173  (one shared dev server; HMR picks up edits)
npm run shot -- --out /tmp/shots/x.png --view plaza_wide      # headless screenshot (see tools/shot.mjs header)
```

URL params: `?quality=low|medium|high|ultra` `&shot=1` (deterministic fixed-step, no pointer lock gate, muted)
`&noEnemies=1` `&god=1` `&debug=1` (stats overlay) `&streaks=1` (air strike available immediately) `&fov=62` `&skyYaw=deg`.

## Directory ownership (one team per directory — do not edit other teams' files)

| Directory | Owner | Contents |
|---|---|---|
| `src/core/`, `src/player/`, `src/game/`, `src/main.js`, `index.html` | integration (lead) | Game loop, input, assets, physics, settings, debug API, player controller, match flow |
| `src/rendering/` | graphics | `RenderSystem` (renderer, cameras, sky/IBL, CSM sun, post stack), quality scaling, camera FX |
| `src/world/` | environment | The Seaside plaza map: geometry, materials, props, trees, lights, nav graph, spawns, minimap |
| `src/weapons/` | weapons | Rifle + holo sight geometry & materials, arms/hands, view-model animation, weapon logic |
| `src/ai/`, `src/combat/` | gameplay | Enemy soldiers (Soldier.glb), AI, hitboxes, damage |
| `src/ui/`, `src/styles/hud.css`, `src/styles/menu.css` | ui | COD-style HUD, menus, killfeed, hitmarkers, air-strike targeting map overlay |
| `src/fx/`, `src/killstreaks/` | vfx | Particles, decals, muzzle flash, tracers, casings, explosions, air strike sequence |
| `src/audio/` | audio | Web Audio synthesized + spatial sound |

Shared files (`Game.js`, `Player.js`, `Physics.js`, `Assets.js`, `Debug.js`) are edited only by the lead. If you need a
hook that does not exist, implement it inside your own module and note it in your final report.

## The `game` context

Every system is constructed with `game` and reaches siblings through it:

```
game.settings   Settings   (quality preset, fov, shotMode, params)
game.events     EventBus   on(name, fn) / off / once / emit(name, payload)
game.input      Input      isDown('fire') justPressed('reload') mouseDelta pointerLocked
game.assets     Assets     loadPBR(id) createPBRMaterial(id, opts) loadHDR(id) loadModel(id) spawnModel(id) canvasTexture(canvas)
game.physics    Physics    Rapier wrapper (see below)
game.render     RenderSystem  renderer scene camera weaponCamera csm registerMaterial(m) setupObject(o) setViewModel(o) shake() setAds()
game.scene / game.camera
game.world      World      getPlayerSpawn() getEnemySpawns() getNavGraph() getObjective() getBounds() getMinimap() getGroundHeight(x,z)
game.player     Player     position (feet) eyePosition forward yaw pitch velocity isGrounded isSprinting isCrouching isAiming speedFactor bobPhase bobAmount health addViewPunch(p,y) damage(n) spawn()
game.weapons    WeaponSystem  current {ammo magSize reserve state isAiming} viewModelRoot getMuzzleWorldPosition(out) fire() reload() setAiming(b) setVisible(b)
game.combat     Combat     fireRay({origin,direction,damage,spread,source}) explode({position,radius,damage,kind,source})
game.enemies    Enemies    list aliveCount spawn(sp) spawnWave(n) damage(enemy, amount, info)
game.fx         Effects    muzzleFlash impact explosion tracer spawnCasing decal blood
game.killstreaks Killstreaks  airstrike {available state beginTargeting() cancelTargeting() callAt(x,z)} kills killsRequired
game.hud / game.menu / game.audio / game.gameMode / game.debug
game.time (simulated seconds) game.frame game.state ('menu'|'playing'|'paused'|'dead'|'ended') game.isPlaying
```

Update order per frame: input → player → weapons → enemies → killstreaks → combat → physics.step → fx → gameMode → hud → audio → render.
`dt` passed to gameplay systems is 0 while not simulating (menu/paused) — always guard `if (dt <= 0)` for time-based logic.

## Events (name → payload)

```
weapon:fire            { origin, direction, muzzle, weapon, spread }          (weapons → combat resolves, fx flash/tracer, audio)
weapon:casing          { position, velocity, angularVelocity }                (weapons → fx spawns physics casing)
weapon:reload:start    { duration }      weapon:reload:end {}      weapon:empty {}      weapon:aim { aiming }
weapon:ammo            { ammo, magSize, reserve }
bullet:hit             { point, normal, surface, distance, direction, data, entity, source }   surface: stone|plaster|brick|wood|metal|dirt|glass|foliage|water|flesh
enemy:spawned          { enemy }
enemy:damaged          { enemy, damage, point, headshot, source, direction }
enemy:killed           { enemy, position, headshot, source, cause: 'bullet'|'explosion' }
enemy:fire             { enemy, origin, direction }
player:damaged         { amount, from, health }     player:health { health, max }     player:died { from }     player:respawn { position }
player:jump / player:land { position, impact }      footstep { position, sprint, crouch, surface }
explosion              { position, radius, damage, kind: 'bomb'|'grenade', source }       (combat.explode → fx, audio, hud shake)
killstreak:ready       { name }          killstreak:targeting { name, active }          killstreak:called { name, position }
killstreak:jets        { position, direction }      killstreak:impact { position }
score                  { points, reason, total }    objective:progress { progress(-1..1), owner, contested, playerIn }
match:time             { remaining, teamScore }     match:end { winner, teamScore, score }      wave { index, count }
ui:hitmarker           { headshot, kill }           camera:shake { intensity, duration }
game:state             { state, prev }              game:ready {}      frame:end { dt }
```

## Physics (Rapier) conventions

- Static world: `physics.addStaticMesh(mesh, { surface })`, `addStaticBox(pos, halfExtents, quat, { surface })`, `addStaticCylinder`, `addStaticBoxFromObject(obj, data)`.
- Dynamic: `physics.addDynamicBody({ position, shape: {type:'box',hx,hy,hz}|{type:'sphere',r}|{type:'capsule',halfHeight,r}, mass, restitution, linvel, angvel, object })`
  returns a wrapper `{ body, collider, object, sync(), remove() }`; `object` is auto-synced each step. Cap counts (`settings.quality.maxCasings/maxDebris`).
- Characters: `physics.createCharacter({ position, radius, halfHeight, membership, filter, data })` → `{ move(desiredTranslation) → applied, grounded, teleport(v), getPosition(out) }`.
- Raycast: `physics.raycast(origin, dir, maxDist, { filter: groups(GROUP.ALL, GROUP.WORLD|GROUP.ENEMY), exclude })` → `{ point, normal, distance, collider, data }`.
- Collision groups in `src/core/Physics.js`: `GROUP.WORLD | PLAYER | ENEMY | DEBRIS | TRIGGER`, helper `groups(membership, filter)`.
- Every collider carries user data `{ type: 'world'|'enemy'|'player'|'dynamic', surface, entity?, part?: 'head'|'body'|'limb' }` via `physics.setUserData`.

## Rendering conventions

- Layers: `LAYER.WORLD = 0` (main camera), `LAYER.VIEWMODEL = 1` (weapon camera, own FOV, depth cleared, drawn after N8AO). Use `render.setViewModel(obj)`.
- Shadows: cascaded shadow maps. **Any material created after load must be registered**: `render.setupObject(object3d)` (or `render.registerMaterial(mat)`), otherwise it is lit by all cascades and looks 3× too bright. Materials in the scene at load time are registered automatically.
- Tone mapping is AGX in the composer (`renderer.toneMapping = NoToneMapping`). Emissive values > 1 bloom (threshold 1.0).
- Textures: use `assets.createPBRMaterial(id, { repeat, roughness, normalScale, ... })` for the Poly Haven sets listed in `public/assets/index.json`. Models: `assets.spawnModel(id)`.
- Sky: HDRI `kloofendal_48d_partly_cloudy_puresky`; sun direction is derived from it (`render.sunDirection`, points toward the sun). `render.setSkyRotation(yaw)` rotates sky + sun together.
- `render.shake(intensity, duration)`; `render.setAds(0|1, zoom)`; `render.baseFov`.
- Budget: aim for < 1500 draw calls and < 2.5M triangles on screen at `high`; use `InstancedMesh` for repeated props and merge static geometry per material.

## Screenshot / review tooling

`tools/shot.mjs` drives headless Chrome (SwiftShader software GL — slow but deterministic; one shot ≈ 20–60 s):

```
node tools/shot.mjs --out /tmp/shots/a.png --view weapon_hero --w 1600 --h 900
node tools/shot.mjs --out /tmp/shots/b.png --pos 0,0,12 --yaw 20 --pitch -3 --nohud
node tools/shot.mjs --out /tmp/shots/c.png --freecam 10,6,20 --lookat 0,2,0 --fov 40 --noweapon --nohud
node tools/shot.mjs --out /tmp/shots/d.png --exec "game.killstreaks.airstrike.callAt(0,-6)" --wait 3.4
node tools/shot.mjs --list
```

Register review views for your area with `game.debug.registerView('name', { pos:[x,y,z], yaw, pitch, hud?, weapon?, ads? })`
from your module's constructor/load. `--exec` code runs in page context with `game`, `THREE`, `debug` in scope and may `await`
(`await debug.waitTime(1.5)`, `await debug.waitFrames(2)`).

## Quality bar

The reference is current Call of Duty (MW2019 / BO4). Every visible element must read as physically plausible: real
proportions, PBR materials with roughness variation and edge wear, contact shadows, no flat untextured surfaces, no
z-fighting, no missing shadows, nothing floating, silhouettes broken up with detail. A harsh visual critic compares
screenshots side-by-side with the references; iterate until they pass.
