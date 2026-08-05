# ARCHITECTURE — module contracts

All modules are factories receiving a shared `ctx` and returning an API object. Modules never
import each other directly (except types/defs); they communicate via `ctx.<module>` and
`ctx.events`. **Specialist agents: stay inside your owned files, keep these contracts stable,
and never edit `main.js` — report needed interface changes instead.**

```
ctx = {
  scene, camera, renderer, canvas,
  time: { now, dt, unscaledDt, timeScale, frame },      // seconds, scaled
  rng,  // seeded gameplay RNG (determinism!)  vrng: seeded visual RNG
  settings: { reducedMotion, volume, quality },
  events: { on(name, fn) -> off, emit(name, payload) },
  world: { colliders: [], wind: Vector3, sunDir: Vector3, trailTint?: Color },
  textures, weather, base, effects, player, batteries, threats,
  interceptors, radar, audio, ui, post, game,
}
```

Key events: `threat-spawned/-tracked/-destroyed/-impact`, `track-assigned`,
`launch-authorized`, `interceptor-launched`, `intercept-success/-miss`,
`scenario-started/-ended`, `battery-ready/-launching`, `time-of-day`, `footstep`,
`fx-launch`, `fx-explosion`, `ui-click`, `pointer-lock`.

| Module | Owns | Public API (do not break) |
|--------|------|--------------------------|
| `util.js` | RNG/pool/events/math | `Rand`, `Events`, `Pool`, easing/angle helpers |
| `textures.js` | canvas textures | `createTextures()` → memoized texture fns |
| `physics.js` | flight math, capsule collision | `GRAVITY`, `ballisticVelocityFor`, `propagateBallistic`, `timeToGround`, `predictIntercept`, `steerVelocity`, `makeColliderBox/Cyl`, `resolveCapsule` |
| `weather.js` | sky shader, presets, sun/hemi/fog, env maps, wind | `setTimeOfDay(t, instant?)`, `update(dt)`, `timeOfDay`, `floodlightsOn`, `sun` |
| `base.js` | terrain (`terrainHeight(x,z)` export), mountains, all base assets, colliders | `consoleScreen`, `holoAnchor`, `consolePos`, `batteryPads`, `generators`, `radarHead`, `setSearchlights(on)`, `update(dt,t)` |
| `batteries.js` | 3 launcher rigs + state machines | `BATTERY_DEFS`, `list`, `get(id)`, `update(dt)`, `resetAll()`; Battery: `state/displayState`, `ammo`, `canAccept()`, `pointAt(pos)`, `launch(track)`, `muzzle(outPos,outDir)`, `rig.group` |
| `threats.js` | scenarios + ballistic threats | `SCENARIOS`, `startScenario(name, rng)`, `active`, `pendingCount`, `allSpawned`, `destroy(threat, point)`, `clear()`, `update(dt)` |
| `interceptors.js` | interceptor flight + kill logic | `launch(battery, track, muzzlePos, muzzleDir)`, `active`, `clear()`, `update(dt)` |
| `effects.js` | particles, trails, flashes, debris, rings, scorch | `acquireTrail(cfg)/releaseTrail`, `launchBlast`, `explosionAir`, `explosionGround`, `coverPop`, `muzzlePuff`, `flash`, `ring`, `scorchAt`, `throwDebris`, `update(dt, now)`, `setViewport(h, fov)`, `clearAll()` |
| `radar.js` | tracks, PPI canvas, holo table | `tracks`, `activeTracks()`, `getTrack(id)`, `trackFor(threat)`, `selectTrack(id)`, `selectedTrackId`, `pickTrack(raycaster)`, `clear()`, `update(dt)` |
| `audio.js` | procedural WebAudio | `unlock()`, `setMuted(v)`, `setVolume(v)`, `update(dt)`, one-shot synths |
| `post.js` | composer chain | `render(dt)`, `setSize(w,h,pr)`, `setQuality(q)`, `bloom`, `grade` |
| `ui.js` | DOM HUD + console + modals | `handlers` (set by main), `update(snapshot)`, `toast`, `showBanner`, `setPrompt`, `showConsole`, `showDebrief/hideDebrief`, `showSettings`, `crosshair(v)` |
| `player.js` | FPS controller | `position`, `teleport(x,y,z,yaw,pitch)`, `setEnabled(v)`, `lockPointer/unlockPointer`, `addShake(amt)`, `update(dt)` |
| `main.js` | integration, game state, input, test API | `window.__game` (see tests/helpers.js) |

Rules that keep this project healthy:
- **Determinism:** all gameplay randomness through `ctx.rng`, visual-only through `ctx.vrng`.
- **Pooling:** never allocate meshes/particles at runtime; use pools sized at boot.
- **Perf budget:** < 400 draw calls, < 1.5M triangles, 60 fps target on mid-range GPUs.
- **No downloaded assets.** Canvas/shader/procedural only.
- **Scope frozen:** no new modes, vehicles, infantry, progression, multiplayer, open world.
