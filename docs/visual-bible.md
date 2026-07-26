# Visual Bible — Northstar Rescue (Fable 1)

## Fantasy
A lone tactical operator moves through a snow-locked corporate headquarters at
dawn. Outside: blizzard white, cold blue. Inside: humming fluorescents, warm
pools of desk light, the quiet dread of an occupied office.

## Pillars
1. **Grounded stylized realism** — believable proportions/materials, slightly
   simplified detail; readable silhouettes over noise.
2. **Cold vs warm contrast** — exterior daylight ice-blue (#a9bccc sky,
   #cfe0f2 sun); interior fluorescent neutral-green (#e8f0e9); warm accents
   (#f5dfc0 desk lamps, #e8d9b8 service areas); danger/objective red used
   sparingly (#e0554a).
3. **Readable combat** — mid-value walls, darker floor, lighter ceiling;
   enemies always separate from background (dark silhouettes + red band).

## Identity
- Company: **Northstar Logistics Group** ("NLG"), 8-point star in a circle,
  deep navy (#14365c) + ice cyan (#8fd8ff). Departments: Dispatch, Finance,
  Records, IT Operations.
- Hostiles: **Kestrel Syndicate** — matte olive/graphite softshells, dark
  chest rigs, red armbands (readability accent). No real-world insignia.
- UI: arctic navy panels, 1px steel-blue lines, ice-cyan accents, uppercase
  letterspaced type (system stack), mono digits for numbers.

## Scale standards (1 unit = 1 m)
- Ceilings: offices 3.0, corridors 2.85, service 2.6, lobby 7.0, garage 4.6.
- Doors 2.06 × 0.95–1.3; desks h 0.74; seats h 0.45; counters h 0.92;
  cubicle panels h 1.5; monitors 0.61 wide (27").
- Character height 1.78 m; eye 1.62 m.

## Material standards
- PBR via `MeshStandardMaterial`: albedo + roughness + normal (procedural
  canvas, 256–1024 px, tileable). No baked lighting in albedo. Roughness must
  vary between families: carpet 0.95, drywall 0.85, laminate 0.55, painted
  metal 0.45, stainless 0.3, glass 0.05–0.5.
- Edge treatment: visible architectural edges get trim geometry or bevel;
  props use `bevelBoxGeo` for chamfered corners at close view.

## Lighting plan
- Sun: low winter angle from NW, cold (#cfe0f2), casts long window shafts.
- Sky/hemi fill: #b9cde2 over #3f4347.
- Interior fixtures per room style (see `lighting.js` table): fluorescent
  strips (neutral-green), exec warm, server cool blue + rack LEDs, service
  amber, emergency red accents near exits.
- Never crush blacks below readable; never blow out windows fully.

## Anti-goals
Primitive-box look, uniform roughness, dead-even lighting, saturated primary
colors, decals repeating conspicuously, dark-hiding unfinished areas.
