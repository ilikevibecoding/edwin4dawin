# ASHFALL PROTOCOL

A cinematic first-person shooter built entirely in **Three.js** — modern-warfare urban combat with killstreak air strikes, film-grade post-processing, and fully procedural content (every texture, model, and sound is generated at runtime; zero binary assets).

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

- **Rendering**: AGX filmic tone mapping with shadow-lifted grade, N8AO ambient occlusion, mip-blurred bloom, SMAA, chromatic aberration, luminance-weighted film grain, vignette, PMREM environment reflections, 4K PCF shadow maps, exponential warm-dust fog, faked GI bounce light from the sunlit facades into the shadow side of the street.
- **World**: "Dust District" — a war-torn desert town with procedurally weathered architecture (canvas-baked PBR plaster/brick/asphalt with macro stains, sill streaks, bullet-pock clusters, posters, floor trims and parapet coping), rubble-bitten shelled buildings, roof furniture, a minaret landmark, bunting and power lines, and a golden-hour warzone atmosphere.
- **Vehicles**: parametric sedan/wagon/pickup builders with panel-seam paint atlases, inset reflective glass, shadowed wheel wells, chrome trim, per-instance stance/wear variation, and matching burned hulks.
- **Gunplay**: procedurally modeled AX-4 carbine viewmodel (~250 primitives) with textured tactical gloves, ADS, recoil, tracers, sun-catching brass, a combustion-lobe muzzle flash that actually lights the street, impact decals, and surface-aware particles.
- **AI**: squad-based enemy soldiers — baked cloth-shaded camo, MOLLE plate carriers, covered faces (balaclava/shemagh + goggles), rifle-space hand mounts, contrapposto idles — with cover-seeking combat behavior, burst fire, flanking, and procedural death animation.
- **Air strikes**: killstreak reward — a three-jet vic (panel-lined livery, roundels, afterburner glow, dissipating contrails) carpet-bombs your marker with arcing ordnance, staged soot-rolling detonations that flush the facades with light, ember fountains, and a street-filling dust aftermath.
- **Audio**: 100% synthesized WebAudio SFX — layered gunshots, distance-filtered enemy fire, sub-bass explosions, jet flybys, bomb whistles, wind ambience.
- **HUD**: MW-style compass tape on a scrim, segmented health with ghost damage, killstreak pips with jet icon, killfeed, hairline crosshair, directional damage indicators.

## Development methodology

Built by an orchestrator agent fanning out specialist sub-agents (architecture, vehicles, characters, aircraft, VFX, lighting, post) in seven rounds. After each round, a separate "harsh art-director" agent blind-judged the game's canonical screenshots side-by-side against real Call of Duty stills (randomized A/B, no labels) and scored both on a 0–100 AAA scale; its notes drove the next round's tasking. The blind score climbed from ~30 (prototype) to the mid-to-high 50s ("disciplined ambitious indie") where it plateaued — the remaining gap to shipped-COD marketing stills is photoreal humans, scanned materials, and true volumetrics, beyond what runtime-procedural primitives can express. Judging artifacts live in `judge/`.

## Screenshot tooling

Deterministic screenshots for visual review (requires the dev server running):

```bash
npm run shot -- --out shots/a.png --px 0 --pz 58 --yaw 0 --pitch 0 --scene street --t 1.5
```

Scenes: `street` (staged enemies, holding fire), `combat` (mid-firefight), `airstrike` (strike in progress; use `--t` to pick the phase), `closeup` (character presentation), `empty`.
