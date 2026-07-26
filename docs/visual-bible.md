# Visual Bible — Northstar Rescue (v1 draft by lead; Fable 1 owns refinement)

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

## Typography & UI (tokens live in `src/ui/styles.css`)

- Family: Segoe UI/Inter system stack; mono for numbers (Cascadia/Consolas).
- Display: uppercase, letterspacing 0.22–0.4em. Body 13–15px, `--ink` on `--bg-panel`.
- Iconography: 1.5–2px stroke, 45° corner cuts, original silhouettes only.
- HUD: minimal, edges anchored, max ~4% screen coverage per corner; accent cyan for
  interactive, amber for caution, red only for damage/danger.

## Readability guarantees (verify in every review)

1. Enemy silhouette contrast ≥ clearly visible at 25m in every lit zone.
2. Doors/objectives identifiable without HUD.
3. No crushed blacks; no blown-out windows (tone mapping headroom).
4. Glass reads as glass (reflection/frame/tint) but never opaque.
5. Decals/wear never conspicuously repeat within one camera view.
