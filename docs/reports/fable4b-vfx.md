# Fable 4b — VFX & Atmosphere Report

Owner: Fable 4b (VFX & atmosphere artist)
Files owned: `src/fx/vfx.js`, `src/fx/weather.js`, `src/world/vehicles.js`,
`assets/manifest/characters.js` (appended entries), this report.

---

## 1. Combat VFX inventory (`src/fx/vfx.js`)

Everything is pooled, deterministic (`worldRng`), quality-scaled
(`qualityPreset().particleScale`), and canvas-textured. No per-frame material
creation; `dispose()` unsubscribes all events and disposes every material,
geometry, and texture created by the module.

| Effect | Trigger | Implementation |
| --- | --- | --- |
| Muzzle flash | `vfx.muzzleFlash(pos, dir, weaponId)` | Layered additive star sprite (canvas 6-spoke star + hot core) sized/tinted per family — pistol small, SMG rapid small, carbine medium, shotgun wide, rifle long lance (extra stretched lance quad). Short warm `PointLight` from a pooled light set, plus a drifting smoke wisp. |
| Shell casings | Each un-suppressed shot | Pooled brass boxes (pool 40), ejected right+up from the muzzle with spin, gravity, up to 2 bounces via `world.groundAt`, fade at ~2.2 s. Guarded `sfx('casing')` (silent no-op until the audio agent registers it). |
| Tracers | Player every 3rd shot; enemy always (`enemy-shot`) | Thin camera-facing quad (0.026 m wide) with additive gradient + head glow sprite, 60–100 ms fade. Warm-white/amber per the visual bible. |
| Impacts | `impact {kind, point, normal, light, exitWound}` | Per-surface debris + puff: concrete (gray chips + dust), drywall (white burst, slow hang), wood (elongated splinters), metal (yellow-white sparks + brief point light), glass (glitter shards), carpet/fabric (fluff), tile (chips), snow (soft white puff), flesh (small dark-red mist — fully skipped under `reducedBlood`). `exitWound` scales up ~35%. Calls sibling `spawnImpactDecal`/`spawnBloodDecal` through a guarded dynamic import. |
| Glass shatter | `glassbreak {pane, point}` | 20–40 shard quads distributed across the pane bounds, gravity + tumble + additive sparkle, plus edge fragments left near the frame. |
| Smoke grenade | `spawnSmoke(pos, radius, duration)` (API unchanged) | ~14 pooled soft spheres in 3 gray tones, two large core blobs anchor the center (no see-through middle), slow roil (per-blob scale pulse), 1.2 s fade-in / 2 s fade-out. `smokeBlocks(a,b)` LOS check preserved. |
| Flashbang | `muzzleFlash(pos, dir, null)` path | White sphere flash + additive ray sprite + brief lingering glow sprite. (Screen whiteout itself is game-side.) |
| Death feedback | `kill {entity, headshot}` | Small dark puff at the body; headshot adds a single tiny distinct spark. Both respect `reducedBlood` (puff stays neutral gray, no red). |
| Ambient emitters | `registerAmbientEmitter(spec)` | Persistent diegetic sources registered by `vehicles.js`: van exhaust wisp and the green extraction signal smoke column. Ticked from `vfx.update(dt)`, cleared on dispose. |

Pools (allocated once per session): flash sprites, smoke wisps/blobs, debris
meshes (shared cached materials), casings (40), tracers + head glows, glass
shards, point lights. All spawns respect `particleScale`; when a pool is
exhausted the oldest-free slot policy simply skips the spawn (no growth).

## 2. Weather (`src/fx/weather.js`)

- Exterior snowfall: one `THREE.Points` system (~600–1200 by quality, halved
  under `reducedMotion`) in a 26 m radius × 12 m tall cylinder that follows the
  player, wrapping vertically. Soft round canvas sprite, size attenuation.
- Wind: constant lateral drift + multi-sine gust noise (gusts disabled under
  `reducedMotion`).
- Outdoor-only constraint: flakes above roof level (y > 4.2) live everywhere;
  full-height flakes only inside plaza / courtyard / north-backdrop rects.
  Any flake entering the building footprint (x 0..64, z 0..44, y < 4) is
  respawned at the cylinder top. Verified: no flakes inside the lobby.
- Ground wisps: streaking snow sheets (canvas streak texture) sliding across
  the plaza, shown only while the player is outdoors.
- Subtle by design — visibility preserved (see `f4b_spawn_snow.png`).

## 3. Extraction van (`src/world/vehicles.js`)

"AEGIS TRU" armored response van at `MAP.EXTRACTION.vanAt` (60.4, 8), nose
east, rear doors open west toward the extraction zone (hostage walk-to point
x = van−1.6 is inside the open-door pocket; collider footprint matches the
placeholder so extraction pathing is unchanged — verified by the S40-S42
rescue+extraction Playwright test).

- ~2.1 × 2.2 × 5.2 m, geometry merged per material via a small batch helper
  (~20 draw calls for the whole vehicle incl. lights and signal prop).
- Beveled armor panels (45° chamfer strips), door seams, canvas livery with
  star-north roundel + "AEGIS" / "TRU" / "TACTICAL RESPONSE UNIT" text,
  mirrored correctly per side.
- Blue emissive light bar on the cab roof, grille + bullbar, side mirrors,
  wheels with aluminum hub detail.
- Rear doors thrown open 118°; interior visible: dark rubber floor, two bench
  seats with frames, bulkhead window, warm dome lamp (`PointLight` 4.5/4 m).
- Headlights on: emissive lenses + additive beam sprites + ground glow pool.
- Idling exhaust wisp and the green signal smoke column (emissive-lit canister
  + green `PointLight` + continuous smoke via ambient emitters).
- `castShadow` on body meshes. Exported `createExtractionVan(world, group)`
  signature and collider registration unchanged.

## 4. Manifest

Appended `VFX-002` (combat VFX suite), `WTH-001` (weather system), and
`VEH-001` (extraction van) to `assets/manifest/characters.js` without touching
sibling entries.

## 5. Screenshots (artifacts/)

- `f4b_muzzle_burst.png` — carbine flash mid-burst, star core + warm light, casing mid-flight.
- `f4b_impact_drywall.png` — white dust burst on drywall.
- `f4b_impact_metal.png` — yellow-white sparks on the metal utility door.
- `f4b_glass_shatter.png` — pane burst, shards falling with sparkle.
- `f4b_smoke_tuned.png` — smoke bloom from outside (plaza entrance).
- `f4b_flash_burst.png` — flashbang burst + whiteout.
- `f4b_casings_floor.png` — brass scattered on lobby carpet after a burst.
- `f4b_spawn_snow.png` — snowfall at plaza spawn.
- `f4b_lobby_nosnow.png` — lobby interior clean; flakes only through windows.
- `f4b_van_close.png`, `f4b_van_side.png` — van rear/interior and three-quarter views.
- `f4b_tracers_fight.png` — enemy tracers crossing the frame in a lobby fight.

All probes finished with zero console errors.

## 6. Test results

- Playwright: **14/14 pass** (`npx playwright test --retries=2`: 13 passed
  outright, 1 flaky that passed on retry). Plain runs without retries were
  repeatedly hit by "Execution context was destroyed … navigation" — Vite
  full-page reloads caused by sibling agents saving `src/game/navigation.js`
  / `hostage.js` / `weapons.js` mid-run; every affected test (including
  `S40-S42 rescue+extraction`, which confirms the van collider keeps the
  extraction path walkable) passed when re-run. See "Discrepancies".

## 7. Performance

Measured via `qa.perf()` (SwiftShader headless, 1280×720):

| View | drawCalls | triangles |
| --- | --- | --- |
| Garage / extraction (van + signal smoke + exhaust) | **237** | 77 k |
| Lobby idle (no combat VFX active) | 960 | 160 k |
| Lobby mid-burst (flash + casings + tracer + impacts + wisps) | 1068 | 162 k |
| Lobby settled after fight | 968 | 160 k |

- Allocation stability: 220 rounds fired against 4 unfrozen assault enemies —
  drawCalls went 1169 → 1055 → 1055 (before / after fire / after settle);
  no growth, pools stable, zero errors.
- My marginal costs: ~1–3 calls idle indoors (snow Points), ~+8 residual after
  combat (decals), ~+108 at the worst mid-burst instant.

## 8. Discrepancies / notes

1. **Lobby baseline exceeds the 260 draw-call budget by itself (~960).** This
   is world/prop geometry owned by sibling agents; my combat VFX adds ~108 at
   peak and returns to baseline. The extraction/van view (my heaviest owned
   view) is 237 < 260. Flagging for whoever owns prop batching.
2. **Playwright suite is flaky while siblings edit** — Vite full-page reloads
   destroy the page context mid-test. Every observed failure was this exact
   error; each failing test passes on re-run.
3. `sfx('casing')` is emitted behind a try-guard; it is silent until the audio
   agent registers that sound.
4. `spawnImpactDecal`/`spawnBloodDecal` are wired through a guarded dynamic
   import; decals appeared correctly once the sibling module landed.
