# ASHFALL PROTOCOL

A AAA-grade first-person shooter built entirely in **Three.js** — modern-warfare urban combat with killstreak air strikes, cinematic post-processing, and fully procedural content (every texture, model, and sound is generated at runtime; zero binary assets).

## Play

```bash
npm install
npm run dev
```

Open http://localhost:5173 and click to deploy.

## Controls

| Input | Action |
| --- | --- |
| WASD | Move |
| Shift | Sprint |
| C / Ctrl | Crouch (tap while sprinting to slide) |
| Space | Jump |
| Mouse | Aim |
| LMB | Fire |
| RMB | Aim down sights |
| R | Reload |
| 4 | Call in air strike (earned at 4 kills) |

## Highlights

- **Rendering**: ACES filmic tone mapping, N8AO ground-truth ambient occlusion, mip-blurred bloom, SMAA, chromatic aberration, film grain, vignette, PMREM environment reflections, 4K PCF shadow maps, exponential height fog.
- **World**: "Dust District" — a war-torn urban combat map with procedurally textured buildings (plaster, brick, concrete via canvas-generated PBR maps with derived normal maps), ruins, a minaret landmark, wrecked vehicles, sandbag emplacements, and a hazy golden-hour warzone atmosphere.
- **Gunplay**: procedurally modeled AX-4 carbine viewmodel with ADS, recoil patterns, tracers, shell casings, muzzle flash lighting, impact decals and surface-aware particle effects.
- **AI**: squad-based enemy soldiers with cover-seeking combat behavior, burst fire, flanking, and procedural death animation.
- **Air strikes**: killstreak reward — a three-jet formation carpet-bombs where you're aiming, with falling ordnance, staggered detonations, shockwaves, craters, and distance-scaled screen shake.
- **Audio**: 100% synthesized WebAudio SFX — layered gunshots, distance-filtered enemy fire, sub-bass explosions, jet flybys, bomb whistles, wind ambience.

## Screenshot tooling

Deterministic screenshots for visual review (requires the dev server running):

```bash
npm run shot -- --out shots/a.png --px 0 --pz 58 --yaw 0 --pitch 0 --scene street --t 1.5
```

Scenes: `street` (staged enemies, holding fire), `combat` (mid-firefight), `airstrike` (strike in progress; use `--t` to pick the phase), `empty`.
