// Venator-class attack cruiser (Republic), 1137 m, rebuilt against the reference stills and the DK
// cutaway. Original procedural geometry: a straight-tapered arrowhead with a split prow (two prongs
// around the notch), a flat light-grey dorsal deck carrying two long door halves whose wide red strips
// converge toward the nose either side of a grey centre strip, two red bow-wedge panels, grey shoulder
// wings with the Open Circle rings and eight heavy dual turbolaser turrets (tracking, instanced by the
// Fleet), red-striped raised shoulder plates at the widest point, flanks stepping down over a lit window
// trench to the angled lower hull, a long lit ventral hangar slot under the bow, a stepped rear
// superstructure with the sloped block that joins the two tall, aft-leaning bridge towers (T-shaped
// heads with window bands and sensor blocks), and a wide stern bank of deep nozzle bells (four mains,
// two medium outboard, four small above) whose plumes the fleet draws. Three complete LODs; geometry is
// built once and instanced. `buildVenatorOpen` parts the deck doors over a deep lit hangar bay.
//
// Files: venatorSpec.js (dimensions, palette, layout), venatorHull.js (loft, prongs, markings, heavy
// turret row), venatorTowers.js (superstructure), venatorDetail.js (engines, trench, plating, point
// defence), venatorTurrets.js (turret geometry), venatorKit.js (helpers).
import { assemble, part } from "./shipKit.js";
import { rng, mulColor } from "./venatorKit.js";
import { heavyTurret, lightTurret, HEAVY, LIGHT } from "./venatorTurrets.js";
import { buildHull } from "./venatorHull.js";
import { buildTowers } from "./venatorTowers.js";
import { buildDetail } from "./venatorDetail.js";
import { VENATOR, L, GREY_LIGHT, GREY_WING, DARK } from "./venatorSpec.js";

export { VENATOR };

// plating scales (tiles per metre) per LOD: the fine armour texture the other classes use (12 m tile up
// close); the big-panel look comes from the raised plate fields in venatorDetail / venatorTowers
const HULL_TEXEL = [1 / 12, 1 / 18, 1 / 24];

/**
 * Build the part list for one LOD. `open` parts the deck doors and adds a lit hangar bay.
 */
function buildLod(lod, { open = false, seed = 7 } = {}) {
  const parts = [];
  const ctx = {
    lod,
    fine: lod === 0,
    mid: lod <= 1,
    open,
    rand: rng(seed + lod * 101 + (open ? 5000 : 0)),
    hullTexel: HULL_TEXEL[lod],
    hardpoints: [],
    engines: [],
    turrets: [],
    add(geo, mat, opts = {}) {
      const p = part(geo, mat, { lod, ...opts });
      parts.push(p);
      return p;
    },
  };
  const { secs } = buildHull(ctx);
  buildTowers(ctx);
  buildDetail(ctx, secs);
  return {
    parts,
    hardpoints: ctx.hardpoints,
    engines: ctx.engines,
    turrets: ctx.turrets,
  };
}

function build(mats, { open = false } = {}) {
  const all = [];
  let hardpoints = [];
  let engines = [];
  let turrets = [];
  const triangles = [];
  for (const lod of [0, 1, 2]) {
    const r = buildLod(lod, { open });
    all.push(...r.parts);
    if (lod === 0) {
      hardpoints = r.hardpoints;
      engines = r.engines;
      turrets = r.turrets;
    }
    triangles.push(
      r.parts.reduce((a, p) => a + p.geo.attributes.position.count / 3, 0),
    );
  }
  const heavy = heavyTurret();
  const light = lightTurret();
  const model = assemble(
    {
      id: open ? "venatorOpen" : "venator",
      side: "republic",
      length: L,
      parts: all,
      hardpoints,
      engines,
      bounds: { radius: 600 },
      turretTypes: {
        heavy: {
          body: heavy.body,
          barrels: heavy.barrels,
          bodyMaterial: "hull",
          barrelMaterial: "dark",
          bodyColor: mulColor(GREY_LIGHT, 0.9),
          barrelColor: DARK,
          texel: 1 / 5,
          ...HEAVY,
        },
        light: {
          body: light.body,
          barrels: light.barrels,
          bodyMaterial: "hull",
          barrelMaterial: "dark",
          bodyColor: mulColor(GREY_WING, 1.0),
          barrelColor: DARK,
          texel: 1 / 3,
          ...LIGHT,
        },
      },
      turrets,
    },
    mats,
  );
  model.triangles = triangles;
  return model;
}

export function buildVenator(mats) {
  return build(mats, { open: false });
}

// Same ship with the dorsal doors parted over a deep lit hangar bay.
export function buildVenatorOpen(mats) {
  return build(mats, { open: true });
}
