# Visual Bible — Northstar Rescue (v2 — maintained by Fable 1, art direction)

## Concept

**"Cold daylight, warm pockets, held breath."**
A snowbound corporate headquarters on a stormy morning: bright overcast daylight floods in
through curtain walls and bounces off snow; inside, neutral fluorescent office light keeps
work areas legible; occupied pockets glow warm (desk lamps, break room, executive wood);
service spaces run darker with clear navigation lighting. Restrained red exists only for
danger, fire equipment, and objective accents.

Grounded stylized realism: believable materials/scale/lighting with slightly bold, readable
silhouettes. NOT: primitive boxes, flat placeholder shading, asset-store mismatch, gloom.

## Color script (hex tokens)

| Token | Hex | Use |
|---|---|---|
| sky/fog | #aec4d8 | exterior atmosphere, window views |
| snow | #dfe6ec | ground, sills, roof caps |
| wall neutral | #b6b1a8 | painted drywall base |
| wall cool | #9fabb4 | feature walls, service |
| ceiling tile | #cfccc2 | acoustic grid |
| carpet slate | #5f6668 | open office floors |
| carpet blue | #4d5a66 | meeting/waiting floors |
| corporate blue | #2f5d7c | branding, accent walls, signage fields |
| accent cyan | #6fc3e8 | UI, glass tint highlights, screens |
| warm amber | #e8b45f | lamps, occupied pockets, loadout accents |
| wood | #7a5b3e | executive wing, reception counter |
| danger red | #8e3b34 | fire equipment, alarms, hostile armbands |
| kestrel dark | #2e3236 | hostile clothing base |

Rule: no pure #000 or #fff anywhere in materials. Interior blacks floor at ~#1d1f22.

## Lighting plan (per zone, implemented in `src/map/lightplan.js`)

- Exterior: bright overcast key (cold directional sun from SSE) + strong sky/snow hemisphere.
- Lobby/atrium: daylight-dominant + neutral ceiling fills; skylight shaft light.
- Open office: even fluorescent (slightly green-white), window-side daylight gradient.
- Executive wing: warm 3000K pools, darker valleys between.
- Break room: warm + appliance glow.
- Service/loading: sparse cool practicals, readable but moody; emissive exit signs.
- Server room: low ambient + blue-cyan rack glow + status LEDs.
- Emergency accents: restrained red, never area-dominant.
- HARD RULE: enemies, doors, and objectives must read at gameplay distances in every space.

## Materials standards

- PBR via `getMaterial(name)` only. Every family gets base color + roughness variation;
  normal maps for surfaces viewed within 3m; metalness only on true metals.
- Roughness bands: carpet/fabric 0.92–1.0 · drywall 0.8–0.9 · wood veneer 0.5–0.65 ·
  laminate 0.4–0.55 · plastics 0.5–0.75 · painted metal 0.45–0.6 · brushed metal 0.3–0.4 ·
  glass 0.05–0.15 · snow 0.7–0.9 (with subtle sparkle normal).
- NO baked lighting/AO in base color; subtle grime gradients allowed (bottom-up wear on walls).
- Texture density: architecture ~96–128 px/m (tileable 512–1024), hero props 256 px/m,
  tiny props atlased. UI resolution-independent.
- Tiling: use `worldUVs()` from `src/materials/uvtools.js` so 1 UV unit = 1 m consistently.

## Shape language & scale

- Architecture: crisp rectangles with 45° chamfered details; visible edges get bevels/trim
  (baseboards 90mm, door casings 60mm, window mullions 50mm). No razor edges near the camera.
- Furniture: soft-radius boxes (RoundedBox or chamfer), believable thickness (tabletops 30mm,
  panels 20mm, metal legs 25–40mm).
- Characters: 1.8m baseline, slightly chunky limbs, oversized silhouette breakers (vests,
  hoods, pouches). Hostiles = dark utility + red armband; hostages = light civilian layers.
- Standards: door 0.9–1.0×2.05m · ceiling 2.7 (F1) / 3.0 (F0) · desk h 0.74 · chair seat 0.46 ·
  counter 0.9 · monitor 0.61×0.37 · cubicle panel h 1.5 · rack 0.6×1.07×2.0.

## UI (owned by Fable 1; tokens live in `src/ui/styles.css`)

### Token table (authoritative — use these, never ad-hoc values)

| Token | Value | Use |
|---|---|---|
| `--ink` | #eaf2f8 | primary text |
| `--ink-dim` | #a7bccc | secondary text, labels |
| `--ink-faint` | #64798a | metadata, captions, disabled |
| `--bg-deep` | #060b12 | page base |
| `--bg-panel` | rgba(9,16,26,.88) | menu panel fill |
| `--bg-panel-lite` | rgba(15,26,39,.78) | nested cards |
| `--bg-inset` | rgba(6,11,18,.55) | inset wells (objectives, stats) |
| `--bg-hud` | rgba(6,11,17,.62) | HUD plates (keeps AA over snow) |
| `--edge` | rgba(126,168,200,.24) | hairlines |
| `--edge-bright` | rgba(150,200,235,.6) | emphasized hairlines, spines |
| `--edge-faint` | rgba(126,168,200,.12) | row separators |
| `--accent` | #6fc3e8 | interactive, selection, "you/friendly" |
| `--accent-deep` | #2f5d7c | gradients paired with accent |
| `--accent-warm` | #e8b45f | caution, low ammo, LOCATED, tips |
| `--danger` | #e05545 | damage/danger only, LOST, empty mag |
| `--ok` | #6fd08c | completion, extraction, SAFE |

- Type: `--font` Segoe UI/Inter stack; `--mono` Cascadia/Consolas for every numeral,
  timer, coordinate, and dossier metadata. Display text uppercase, letterspacing
  0.22–0.44em (indent matched). Body 12.5–14px; subtitles 16px.
- Geometry: corner cuts `--cut` 12px (panels) / `--cut-sm` 8px (buttons, cards, HUD
  plates), always top-left + bottom-right, 45°. Hairline borders are built as a 1px
  gradient shell behind a clipped `::before` fill — never CSS `border` on a clipped box.
- HUD: edges anchored at `--hud-inset` (26px, 20px under 1440px wide), max ~4% screen
  coverage per corner; left blocks carry a 2px left spine, right blocks a right spine.

### Iconography rules

- Original silhouettes only; author in 140×48 (weapons), 48×48 (insignia), 14×14
  (state glyphs), 64×64 (emblem). Fill-based (layered `body`/`dark` fills), strokes
  reserved for rings/ticks at 1–2px. 45° cuts echo the panel language.
- Weapons face muzzle-right on a centreline near y=22; detail cuts (ports, vents,
  serrations) use the dark layer, never outlines.
- Every status colour is paired with a distinct shape (see accessibility below).

### Motion

- Entrance: one 0.5–1.1s ease-out rise per screen, staggered ≤0.65s; infinite loops
  limited to slow drifts (logotype ring 40s, loading ring 7s) and sub-1Hz pulses.
- `reducedMotion` setting mirrors to `body.reduced-motion` and, with the OS
  `prefers-reduced-motion` query, collapses all animation/transitions to ~0.
- `?test=1` adds `body.ui-static` (animations & backdrop blur off) so automation and
  screenshots are deterministic on software renderers.

### Accessibility

- HUD text ≥ AA against `--bg-hud` (`--ink` 12.7:1, `--ink-dim` 8.0:1, `--ink-faint`
  3.4:1 — faint is decorative only). All text over the 3D scene sits on a plate.
- Never colour-only: hostage states pair colour with glyph shapes (dashed circle
  UNKNOWN, diamond LOCATED, triangle WITH YOU, pause bars HOLDING, check SAFE, cross
  LOST); objectives pair green with a check + strike; low/empty ammo pairs colour with
  a blink; minimap secured = triangle vs located = dot; difficulty tiers differ by
  insignia shape, not just accent.
- Subtitles: 16px, high-contrast plate, toggleable.

### Do / don't (reference shots in `artifacts/shots/`)

- DO present menus as panels floating over the live scene with scrims
  (`ui-menus--briefing.png`); DON'T fill the screen with opaque cards.
- DO use the amber CLASSIFIED/dossier flavour only on briefing surfaces; DON'T spread
  document chrome into the HUD.
- DO keep the HUD to four anchored corner clusters + centre prompts
  (`ui-hud--combat-idle.png`); DON'T stack new widgets mid-screen.
- DO shape-code map markers (diamond exfil, triangle secured); DON'T add coloured
  dots that collide with hostile/danger reds.
- DO respect `body.ui-static` and `body.reduced-motion` in any new animation.

## Readability guarantees (verify in every review)

1. Enemy silhouette contrast ≥ clearly visible at 25m in every lit zone.
2. Doors/objectives identifiable without HUD.
3. No crushed blacks; no blown-out windows (tone mapping headroom).
4. Glass reads as glass (reflection/frame/tint) but never opaque.
5. Decals/wear never conspicuously repeat within one camera view.
