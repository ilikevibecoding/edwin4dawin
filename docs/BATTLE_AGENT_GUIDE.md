# Battle of Coruscant — contributor guide (workstream agents)

Read `docs/BATTLE_OF_CORUSCANT_PLAN.md` first (scene design + the 18-point ship rubric).

## Rules

- Own only the files listed in your brief. Put new helpers in **new files** in your area; do not edit
  `src/battle/main.js`, `fleet.js`, `ships/shipKit.js`, `weapons.js`/`explosions.js` unless your brief
  says so. Request framework changes in your report.
- Original geometry and textures only; no downloaded assets. Everything is procedural (see
  `src/textures.js` TexGen, `src/exterior/hullTextures.js` for plating generators).
- Units are metres. Ship forward is **-Z**, up **+Y**, origin at the hull centre.
- Performance is a requirement: all ship geometry is instanced; keep LOD 0 ≤ 60k triangles, LOD 1 ≤ 12k,
  LOD 2 ≤ 2k per capital ship class; ≤ 6 materials per class (each material × LOD is one draw call for the
  whole class). Fighters ≤ 300 triangles each, one material for all types.
- Run Prettier (`npx prettier --write <files>`) before reporting.

## Framework

### Ship model (`src/battle/ships/*.js`)

```js
import { assemble, part, box, boxMM, cylZ, cylY, lofted, prism, COLORS } from "./shipKit.js";
export function buildVenator(mats) {
  const parts = [];
  // part(geometry, materialKey, { color, texel, lod, uv: "planar" | "keep", name })
  parts.push(part(lofted(sections, 4), "hull", { color: COLORS.republicHull, texel: 1 / 18, lod: 0 }));
  ...
  return assemble({ id: "venator", side: "republic", length: 1137, parts, hardpoints, engines, bounds: { radius: 600 } }, mats);
}
```

- Material keys (`shipMaterials()` in `shipKit.js`): `hull` (tiled armour plating, tinted by vertex
  colour), `dark` (machinery/recess texture), `paint` (flat painted panels: stripes, insignia), `windows`
  (unlit emissive, vertex colour = light colour), `engineGlow` (unlit), `plumeAdd` (additive, for haze
  cones). `part()` tints the geometry with `color`; `texel` is tiles per metre for object-space planar UVs.
- `lod` 0/1/2: every LOD must be a complete ship on its own (the Fleet draws exactly one LOD per ship,
  chosen by distance: < 2.2 km, < 9 km, beyond).
- `hardpoints: [{ pos: [x,y,z], dir: [x,y,z], kind: "heavy" | "light", range }]` — bolts leave `pos`
  along roughly `dir`; the choreography only fires when the target is within ~105° of `dir`.
- `engines: [{ pos, r }]` — used for plume effects.
- `assemble()` samples 600 surface points from the LOD-0 `hull` parts for impact placement; make the
  main hull the `hull` material so hits land on armour.
- `lofted(sections, nx)` builds a closed hull from `[{ z, halfW, yBottom, yTop }]` cross sections
  (flat-sided; add your own bevels with extra sections). `prism(points, y0, y1)` extrudes a plan-view
  polygon. Use `THREE.BufferGeometry` freely; `part()` accepts any geometry.

### Scene systems

- `Fleet` (`fleet.js`): `fleet.ships` (`Ship`: `position`, `quaternion`, `velocity`, `angular`, `matrix`,
  `health`, `damage`, `fires`, `target`, `model`), `ship.hardpointWorld(i, pos, dir)`,
  `ship.randomSurfacePoint(out)`.
- `Bolts` (`weapons.js`): `bolts.fire(from, to, { color, speed, length, radius, damage, target, side, kind })`,
  `bolts.onHit(bolt)`.
- `Explosions` (`explosions.js`): `hit(pos, size, ship, local)`, `flak(pos, size)`, `fire(ship, local, size)`
  (persistent), `blast(pos, size)`, `spawn(pos, { kind, size, life, color, ship, local, loop })`.
- `Fighters` (`fighters.js`): `fighters.all` (`pos`, `vel`, `side`, `anchor`, `home`), `deploy(ships)`,
  `update(dt, t, fireCallback)`.
- Lighting: `battlePatch(material, sun)` from `battleShader.js` adds the sun + Coruscant fill to any
  `MeshStandardMaterial` (`sun = makeBattleSun()` uniforms: `dir`, `color`, `fillUp`, `fillDown`, `planetDir`).

## Running and checking

```bash
# your worktree has node_modules symlinked; pick your own port
npx vite --host 127.0.0.1 --port 53XX --strictPort
node tools/check.mjs --base http://127.0.0.1:53XX/battle.html --out /tmp/<name> venator_close venator_medium venator_far
node tools/check.mjs --base http://127.0.0.1:53XX/battle.html --list
```

Views (`debugAPI.views`): `wide`, `lines`, `planet_low`, `<class>_close|_medium|_far`, `venator_bow`,
`venator_towers`, `venator_belly`, cinematic shots `hero`, `broadside`, `towers_cine`, `chase`, `low_city`.
The debug API also offers `advanceSim(seconds)` (runs the battle without rendering), `setPaused(true)` +
`renderFrame()`, `battleStats()`, `getStats()` (calls, triangles, frameMs), `capturePixels(x, y, w, h)`.
`battle.html?scale=0.5` halves the fleet and fighter counts. Screenshots are the evidence: look at them
critically at all three distances before reporting.

## Report format

What changed (files), what was tested (commands, screenshots, triangle counts per LOD, draw calls), what
remains unfinished, and any framework changes you need from the integrator.
