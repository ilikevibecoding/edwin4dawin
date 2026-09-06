# `src/plane` — the aircraft

`PlaneModel` (`model.ts`) is the public API (`root`, `exteriorMeshes`, `interiorMeshes`, `materials`, `propeller`,
`propDisc`, `propBlades`, `cockpitEye`, hardpoints, `gaugeState`, `animate`, `setWaterline`, `setInstruments`,
`debugGauges`, ...). Its constructor is a fixed sequence of part builders that share one `BuildContext`
(`parts/context.ts`: root group, material table, the shared batches `fittings` / `white` / `airframe` / `cabin*` /
`textured`, the `mesh()` and `decal()` helpers, layout constants and the fuselage loft frame).

**Keep the builder order and the creation order inside each builder.** three.js sorts opaque objects by material id
and then by object id, and merged batches keep their parts in insertion order, so the order in which materials, meshes
and batch parts are created is part of the rendered result (the split was verified pixel-identical against the
monolithic version, see `bench/reports/acsplit/REPORT.md`). A shared batch is merged into its mesh by the last builder
that adds to it (`airframe`, `white`: tail; `fittings`: floats; `cabin*`, `textured`: the constructor).

`geometry.ts` and `textures.ts` are barrels over `geometry/` and `textures/`; import from the barrels.

## Who owns what

| Builder role | Files |
|---|---|
| geometry (fuselage, wing, tail, loft/profile helpers) | `parts/fuselage.ts`, `parts/wing.ts`, `parts/tail.ts`, `geometry/loft.ts`, `geometry/wing.ts`, `geometry/floats.ts`, `geometry/util.ts` |
| propeller | `parts/propeller.ts`, `geometry/propeller.ts`, `textures/prop.ts` |
| cockpit | `parts/cockpitPanel.ts` (InstrumentKit + panel), `parts/cockpitControls.ts`, `parts/cabin.ts`, `textures/panel.ts` (instrument atlas, gauges, GPS), `textures/cabin.ts` |
| pilot | `parts/pilot.ts` |
| materials | `parts/materials.ts` (material table, `withWaterBounce`, glass shader, wet-line hook), `textures/common.ts` (canvas helpers, `SURF`, `LIVERY`), `textures/fuselage.ts`, `textures/wing.ts`, `textures/floats.ts` |
| animation / physics | `parts/animate.ts` (per-frame animation, instrument update), `physics.ts`, `aircraft.ts`, `camera.ts` |
| not assigned by the brief | `parts/floats.ts` (hulls, struts, water rudders, wheels) and `parts/lights.ts` (lamps + glow sprites): closest to geometry; `textures/glass.ts` (glass dirt texture): closest to materials |

Shared by everyone (change with care, tell the others): `model.ts` (field list, builder sequence), `parts/context.ts`
(layout constants such as `SKIN`, `SILL`, `FLOOR`, `WING_POS`, `SEAT_Y`, the instrument / light channel tables, the
`BuildContext`), `geometry.ts` / `textures.ts` barrels.

## Build sequence (`PlaneModel` constructor)

1. `buildFuselageFrame` — loft stations, ring parameterisation, outer / inner grids, window cut-outs, texture layout
2. `buildMaterials` — paint, wing paint, float paint (wet line), glass, plain paint, parts, cabin, panel, instruments, GPS
3. `buildFuselageShell` — skin, lined cabin shell, bulkheads, reveals, floor, glass panes, windshield post, sills
4. `buildFittings` — door steps, exhaust stubs; intake scoop, cowl flaps
5. `buildPropeller` — spinner + hub, blades (own material), blur disc (own material) on its pivot
6. `buildWing` — wing panels, root fairing, flaps / ailerons on hinges, pitot
7. `buildTail` — stabiliser, elevator, fin, rudder, dorsal fillet; merges `airframe` and `white`
8. `buildLights` — lenses, lit skin patches, glow sprites (own materials)
9. `buildFloats` — hulls, struts, spreader bars, wires, water rudders, wheels; merges `fittings`
10. `buildCockpitPanel` — panel box and face, glare shield, compass, dome light, visors, overhead console, instruments, GPS
11. `buildCockpitControls` — pedestal, levers, pedals, yokes (with the pilot's hands), yoke placards
12. `buildSeats` — seats, baggage, belts, chart
13. `buildPilot` — torso, head, arms, legs
14. `buildCabinTrim` — door skins and trim, placards, headliner bows, vents, extinguisher
15. constructor — merges `cabinFixed`, `cabinShell`, `cabinKit`, `textured`; env-map intensities; initial instruments
