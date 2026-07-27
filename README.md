# OPERATION BLACKSITE

A Call-of-Duty-style first-person shooter built entirely in **Three.js** — no game engine, no premade scenes. Golden-hour urban warfare in a war-torn city district, with killstreaks, cinematic airstrikes, and a full HDR rendering pipeline.

![Engine](https://img.shields.io/badge/engine-three.js-049EF4) ![Build](https://img.shields.io/badge/build-vite-646CFF) ![License](https://img.shields.io/badge/license-MIT-green)

## Play

```bash
npm install
npm run dev        # http://localhost:5173
```

Production build: `npm run build` then `npm run preview`.

## Controls

| Input | Action |
|---|---|
| WASD | Move |
| Shift | Sprint |
| C / Ctrl | Crouch — press while sprinting to **slide** |
| Space | Jump |
| Mouse | Aim · LMB fire · **RMB aim-down-sights** |
| R | Reload |
| G | Frag grenade |
| 1 / 2 | M4A1 / M1911 |
| 3 | **UAV** killstreak (3 killstreak) |
| 4 | **Airstrike** killstreak (5 killstreak) — opens the tactical map, click to call it in |
| Tab (hold) | Scoreboard |
| Esc | Pause |

## Features

### Rendering
- HDR pipeline: ACES filmic tone mapping, N8AO ambient occlusion, mip-blur bloom, SMAA, subtle chromatic aberration, vignette, film grain, dithering, ADS depth-of-field
- HDRI sky + image-based lighting (Poly Haven, CC0), 4K PCF-soft sun shadows
- Real PBR texture sets (albedo/normal/roughness/AO) on every surface

### The map
A hand-orchestrated procedural war-torn district: modular buildings with inset windows, balconies and fire escapes, collapsed corners with rubble and rebar, shop fronts with awnings and shutter doors, abandoned and burnt vehicles, sandbag emplacements, T-walls, HESCOs, power poles with sagging catenary wires, market stalls, layered street grime — plus a hazy skyline, drifting dust, and distant war-smoke.

### Gunplay
- Procedurally modeled M4A1 (red-dot optic, ~90 parts) and M1911 viewmodels with gloved hands
- Fully procedural animation: idle sway, locomotion bob, sprint carry, ADS, choreographed 3-phase reloads, recoil springs, shell ejection, landing dips
- Hitscan ballistics against a BVH-accelerated collision world, headshots, tracers, per-surface impact effects

### Combat
- Soldier AI (animated GLTF characters with gear): patrol/hunt/combat/cover/flank/suppressed behaviors, A* navigation, burst fire, hit reactions, procedural deaths
- Killstreaks: UAV (live minimap intel) and **Airstrike** — satellite tactical map target selection, three F-16s in echelon with contrails, visible bomb release, and a 9-bomb stick walking through the target
- Health regen, damage direction indicators, killfeed, hitmarkers, score popups

### Audio (100% procedural WebAudio — zero audio files)
Layered gunshots with urban echo tails, distance-filtered enemy fire, cinematic explosions with debris patter, footsteps/slides/landings, reload choreography, jet screams and bomb whistles, ambient wind + distant artillery, UI feedback, damage muffle and heartbeat.

### HUD
MW-style: minimap with radar sweep and enemy fire pings, compass strip, ammo cluster, killstreak slots with progress rings, damage arcs, killfeed, objective banners, scoreboard, loading/menu/pause/game-over screens.

## Development

Deterministic screenshot harness (used for the visual QA loops that shaped the game):

```bash
npm run dev &
node scripts/screenshot.mjs "crossroads?hud=0" "street?fx=explosion&t=2"
```

URL params: `pose` (named camera poses), `t` (sim seconds), `fx` (muzzle|firing|explosion|airstrike|grenade), `fxt` (fx lead time), `hud=0`, `nobots=1`, `seed`, plus dev params like `enemyat=x,z`, `tacmap=1`, `uidemo=...`.

`review/*/VERDICT.md` contains the AAA-bar art-director critiques from each QA round.

## Credits

- Textures & HDRIs: [Poly Haven](https://polyhaven.com) (CC0)
- Soldier model: three.js examples (MIT)
- Fonts: Rajdhani, Oswald (OFL)
- Everything else — geometry, animation, audio, effects — is generated in code.
