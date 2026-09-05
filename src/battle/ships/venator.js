// Venator-class attack cruiser (Republic), 1137 m. Original procedural geometry after the film's design
// language: a long arrowhead wedge with a wide flat dorsal flight deck (two door halves over a deep lit
// seam, maroon edge panels, a split maroon bow wedge, ring insignia), shoulder wings with red trim,
// recessed machinery trenches under the wings, a split-prow bow with a lit ventral hangar mouth, a raised
// rear block carrying twin bridge towers with flared heads and window rows, eight heavy dual turbolaser
// turrets on the shoulders (tracking, instanced by the Fleet) and a stern cluster of deep nozzle bells whose
// plumes the fleet's engine system draws. Plating is built at three scales: 40–80 m bevelled plate groups
// with dark panel-line grooves between them, medium inset panels, and a fine plating texture on the base
// hull. Hull tints are linear albedo targets: warm cream deck, mid grey upper flanks, dark neutral belly.
// Three complete LODs; geometry is built once and instanced. `buildVenatorOpen` parts the deck doors over
// a deep lit hangar bay.
import * as THREE from "three";
import { assemble, boxMM, cylY, part } from "./shipKit.js";
import {
  rng,
  lerp,
  clamp,
  pw,
  loftProfile,
  loftFrame,
  loftEdgeLength,
  mapToLoft,
  frameMatrix,
  orientedBox,
  surfaceBox,
  quadFacing,
  ringFacing,
  cylZ,
  tube,
  nozzle,
  shadeGeometry,
  partition,
  jitterColor,
  mulColor,
  mixColor,
  lin,
  framePlate,
  plateMM,
  tintDecal,
  scorchDecal,
  groove,
  grooveMM,
  facetedDome,
} from "./venatorKit.js";
import { heavyTurret, lightTurret, HEAVY, LIGHT } from "./venatorTurrets.js";

export const VENATOR = { length: 1137, width: 548, height: 268 };

const L = VENATOR.length;
const zBow = -L / 2;
// zr = metres aft of the bow tip
const Z = (zr) => zBow + zr;

// ---- palette. Hull tints are linear albedo multipliers on the plating map (mean ~0.62 after the
// material's x1.4 normalisation). Calibrated against debugAPI.capturePixels on venator_close through the
// sun (5.4 x (1, .96, .9)) and ACES: the deck lands at sRGB ~204/192/170 (hue 39, sat .17 — the film's
// warm cream), a flank in the sun's shadow near 50, the belly (planet glow only) near 63. Brighter tints
// (0.95 on the deck measured 218 at sat .04) sit on the flat part of the ACES curve and read as
// blown-out neutral white, so the whole palette stays below ~0.7.
const CREAM = lin(0.72, 0.585, 0.375); // dorsal deck, door tops, terraces
const CREAM_TOWER = lin(0.68, 0.56, 0.37);
const FLANK = lin(0.5, 0.455, 0.4); // shoulder chamfer, wing edge band, block walls
const LOWER = lin(0.39, 0.39, 0.4); // angled lower flank: dark neutral, a step above the belly
const BELLY = lin(0.37, 0.37, 0.38); // belly, prong undersides, keel — one tint, no hue
const STERN = lin(0.24, 0.215, 0.195); // heat-stained stern armour
const DARK = 0xc8ccd2; // machinery greebles (dark texture x light tint = readable dark grey)
const DARK_RECESS = 0x9a9ea6; // trench walls, hangar interiors
const DARK_SEAM = 0x6e7178; // panel-line grooves
const MAROON = 0x681e1b; // Open Circle maroon, a touch toward brick
const RED_TRIM = 0x86271f;
const WINDOW_WARM = 0xffe2b0; // bridge heads (bright enough to bloom a little)
const WINDOW_COOL = 0xd6e6ff;
// the long wing-edge and block rows sit under the bloom threshold so they read as rows of lit windows
// instead of fusing into one glowing line at 700 m
const ROW_WARM = 0xd8bc90;
const ROW_COOL = 0xb4c4e0;
const HANGAR_WARM = 0xffd9a0;
const HANGAR_BLUE = 0x9cc8ff;
// soot: darker and warmer than the base
const sootOf = (base, k) =>
  mulColor(base, 1 - 0.55 * k, 1 - 0.6 * k, 1 - 0.66 * k);
// paint fade: lighter and desaturated (kept well under white so faded plates do not bloom)
const fadeOf = (base, k) => mixColor(base, lin(0.8, 0.73, 0.62), k);

// plating scales (tiles per metre): fine seams on the base hull, coarser on the raised plate groups
const HULL_TEXEL = [1 / 14, 1 / 22, 1 / 24];
const PLATE_TEXEL = 1 / 30;

// ---- hull parameterisation
const halfW = (zr) =>
  zr <= 830
    ? 52 + 222 * (zr / 830)
    : zr <= 1030
      ? 274
      : 274 - 22 * ((zr - 1030) / 107);
const yTop = (zr) =>
  pw(
    [
      [0, 12],
      [108, 30],
      [250, 44],
      [1137, 44],
    ],
    zr,
  );
const yBot = (zr) =>
  pw(
    [
      [0, -8],
      [108, -26],
      [150, -40],
      [280, -52],
      [450, -62],
      [660, -72],
      [860, -80],
      [1010, -84],
      [1137, -80],
    ],
    zr,
  );
const recess = (zr) =>
  pw(
    [
      [330, 0],
      [420, 20],
      [1000, 20],
      [1080, 0],
    ],
    zr,
  );
const trenchH = (zr) =>
  pw(
    [
      [108, 4],
      [300, 4],
      [420, 26],
      [1000, 26],
      [1090, 8],
    ],
    zr,
  );
const notchW = (zr) =>
  pw(
    [
      [108, 46],
      [250, 46],
      [330, 0],
    ],
    zr,
  );
const notchH = (zr) =>
  pw(
    [
      [108, 26],
      [150, 24],
      [210, 20],
      [280, 10],
      [330, 0],
    ],
    zr,
  );
const CHAMFER = 16;
const SHOULDER = 9;
const LIP = 7;
const wDeck = (zr) => halfW(zr) - CHAMFER;
const yTrenchTop = (zr) => yTop(zr) - SHOULDER - LIP;
const yTrenchBot = (zr) => yTrenchTop(zr) - trenchH(zr);
const wBelly = (zr) => halfW(zr) * 0.5;

// 22-point cross section, counter-clockwise seen from astern (bottom edge running +x). The deck carries a
// centreline recess of half width g and depth h: the deep seam between the doors on the closed ship, the
// hangar bay on the open one (zero on the far LOD).
function hullProfile(zr, hangar = null) {
  const g = hangar ? hangar.gap(zr) : 0;
  const h = hangar ? hangar.depth(zr) : 0;
  const hw = halfW(zr);
  const yt = yTop(zr);
  const yb = yBot(zr);
  const wd = wDeck(zr);
  const ySh = yt - SHOULDER;
  const yTT = yTrenchTop(zr);
  const yTB = yTrenchBot(zr);
  const r = recess(zr);
  const wLow = hw - 4;
  const yLow = yTB - 10;
  const wB = wBelly(zr);
  const nW = notchW(zr);
  const nH = notchH(zr);
  const right = [
    [wB, yb],
    [wLow, yLow],
    [hw - r, yTB],
    [hw - r, yTT],
    [hw, yTT],
    [hw, ySh],
    [wd, yt],
  ];
  return [
    [-wB, yb],
    [-nW, yb],
    [-nW, yb + nH],
    [nW, yb + nH],
    [nW, yb],
    ...right,
    [g, yt],
    [g, yt - h],
    [-g, yt - h],
    [-g, yt],
    ...right
      .slice()
      .reverse()
      .map(([x, y]) => [-x, y]),
  ];
}
// zone tags: each zone is a separate geometry so it can carry its own tint (all on the `hull` material)
const HULL_TAGS = [
  "belly", // 0 belly (port half)
  "dark", // 1 hangar notch wall
  "dark", // 2 hangar notch ceiling
  "dark", // 3 hangar notch wall
  "belly", // 4 belly (starboard half)
  "lower", // 5 lower flank
  "dark", // 6 trench floor
  "dark", // 7 trench wall
  "dark", // 8 wing underside
  "flank", // 9 wing edge
  "flank", // 10 shoulder chamfer
  "deck", // 11 deck (starboard)
  "dark", // 12 seam / hangar wall
  "dark", // 13 seam / hangar floor
  "dark", // 14 seam / hangar wall
  "deck", // 15 deck (port)
  "flank", // 16 shoulder chamfer
  "flank", // 17 wing edge
  "dark", // 18 wing underside
  "dark", // 19 trench wall
  "dark", // 20 trench floor
  "lower", // 21 lower flank
];
const EDGE = {
  bellyL: 0,
  bellyR: 4,
  flankR: 5,
  trenchFloorR: 6,
  trenchWallR: 7,
  wingUnderR: 8,
  wingEdgeR: 9,
  chamferR: 10,
  deckR: 11,
  deckL: 15,
  chamferL: 16,
  wingEdgeL: 17,
  wingUnderL: 18,
  trenchWallL: 19,
  trenchFloorL: 20,
  flankL: 21,
};
const SECTIONS_FULL = [
  108, 150, 210, 250, 280, 330, 420, 520, 640, 760, 830, 920, 1000, 1030, 1080,
  1110, 1137,
];
const SECTIONS_FAR = [108, 250, 330, 520, 830, 1030, 1137];
// centreline recess: paired sections a hair apart give it abrupt end walls
const DOOR_Z0 = 255;
const DOOR_Z1 = 800;
const HANGAR_DEPTH = 64;
const HANGAR_HALF = 44;
const SEAM_HALF = 4.5;
const SEAM_DEPTH = 3.5;
const inDoors = (zr) => zr > DOOR_Z0 + 0.005 && zr < DOOR_Z1 + 0.005;
const OPEN_HANGAR = {
  gap: (zr) => (inDoors(zr) ? HANGAR_HALF : 0),
  depth: () => HANGAR_DEPTH,
};
const CLOSED_SEAM = {
  gap: (zr) => (inDoors(zr) ? SEAM_HALF : 0),
  depth: () => SEAM_DEPTH,
};

function hullSections(zrs, hangar = null) {
  let list = zrs;
  if (hangar) {
    list = [...zrs, DOOR_Z0, DOOR_Z0 + 0.01, DOOR_Z1, DOOR_Z1 + 0.01].filter(
      (z, i, a) => a.indexOf(z) === i,
    );
    list.sort((a, b) => a - b);
  }
  return list.map((zr) => ({ z: Z(zr), pts: hullProfile(zr, hangar) }));
}

// bow prongs: x from the notch edge to the hull edge, split by the dark notch
const prongIn = (zr) =>
  pw(
    [
      [-4, 30],
      [0, 26],
      [40, 20],
      [108, 5],
      [116, 4],
    ],
    zr,
  );
const prongOut = (zr) => (zr < 0 ? 44 : halfW(zr));
const prongBot = (zr) =>
  pw(
    [
      [-4, -2],
      [0, -4],
      [40, -8],
      [108, -12],
    ],
    zr,
  );
const prongTop = (zr) => (zr < 0 ? 8 : yTop(zr));
// underside shares the belly tint (no colour seam at the hull join), sides the flank tint, top the deck
const PRONG_TAGS = ["belly", "lower", "flank", "flank", "deck", "dark"];
function prongSections(s, zrs) {
  return zrs.map((zr) => {
    const xi = prongIn(zr);
    const xo = prongOut(zr);
    const yb = prongBot(zr);
    const yt = prongTop(zr);
    const c = Math.min(3, (xo - xi) * 0.2, (yt - yb) * 0.2);
    const pts = [
      [xi, yb],
      [xo - c, yb],
      [xo, yb + c],
      [xo, yt - c],
      [xo - c, yt],
      [xi, yt],
    ].map(([x, y]) => [s * x, y]);
    return { z: Z(zr), pts };
  });
}

// loft along +y from [{ y, pts: [[x, z], ...] }]
function yLoft(secs, opts) {
  const out = loftProfile(
    secs.map(({ y, pts }) => ({ z: y, pts: pts.map(([x, z]) => [x, -z]) })),
    opts,
  );
  for (const g of Object.values(out)) g.rotateX(-Math.PI / 2);
  return out;
}
const oct = (hx, hz, c) => [
  [-hx + c, -hz],
  [hx - c, -hz],
  [hx, -hz + c],
  [hx, hz - c],
  [hx - c, hz],
  [-hx + c, hz],
  [-hx, hz - c],
  [-hx, -hz + c],
];
// mirrored box: x range given for the starboard side, s = -1 mirrors it
const mbox = (s, x0, x1, y0, y1, z0, z1) =>
  s > 0
    ? boxMM([x0, y0, z0], [x1, y1, z1])
    : boxMM([-x1, y0, z0], [-x0, y1, z1]);
// flat surface frame (horizontal face at height y, v along +z)
const flat = (x, y, z, up = 1) => ({
  p: new THREE.Vector3(x, y, z),
  n: new THREE.Vector3(0, up, 0),
  u: new THREE.Vector3(up, 0, 0),
  v: new THREE.Vector3(0, 0, 1),
});

// ---- layout constants
const DOOR_X1 = 96;
const DECK_Y = 44;
const BLOCK_Z0 = 790;
const BLOCK_Z1 = 1085;
const T1_Y = 62;
const T2_Y = 84;
const TOWER_X = 58;
const TOWER_ZR = 960;
const TOWER_TOP = 158;
const HEAD_TOP = 186;
const TURRET_ZR = [420, 530, 640, 750];
const turretX = (zr) => 96 + 0.5 * (wDeck(zr) - 96);
const BELLY_BAYS = [
  [520, 640, 30, 86],
  [720, 850, 46, 112],
];
// half widths of the two block terraces along zr (front ramps then a gentle widening)
const T1_W = (zr) =>
  zr < BLOCK_Z0 + 22
    ? 148 + (2 * (zr - BLOCK_Z0)) / 22
    : lerp(150, 158, (zr - BLOCK_Z0 - 22) / (BLOCK_Z1 - BLOCK_Z0 - 22));
const T2_W = (zr) =>
  zr < 876
    ? 116 + (2 * (zr - 850)) / 26
    : lerp(118, 128, (zr - 876) / (1070 - 876));
// tower shaft half sizes along y (tapers toward the head)
const SHAFT_HX = (y) =>
  lerp(15.5, 12.5, clamp((y - 92) / (TOWER_TOP - 92), 0, 1));
const SHAFT_HZ = (y) =>
  lerp(21.5, 18, clamp((y - 92) / (TOWER_TOP - 92), 0, 1));
// bridge head: flared octagon (widest just above the tall window row) with a set-back top
const HEAD_HX = (y) =>
  pw(
    [
      [TOWER_TOP - 0.5, 12],
      [TOWER_TOP + 3, 30],
      [TOWER_TOP + 14, 36],
      [HEAD_TOP - 6, 35],
      [HEAD_TOP - 1, 26],
      [HEAD_TOP, 22],
    ],
    y,
  );
const HEAD_HZ = (y) =>
  pw(
    [
      [TOWER_TOP - 0.5, 16],
      [TOWER_TOP + 3, 22],
      [TOWER_TOP + 14, 25.5],
      [HEAD_TOP - 6, 25],
      [HEAD_TOP - 1, 18],
      [HEAD_TOP, 15],
    ],
    y,
  );
// fixed weathering points on the flat decks: scorch rings, kept clear of raised plates
const SCORCH_POINTS = [
  { x: -58, y: DECK_Y + 6, z: Z(470), r: 9 },
  { x: 66, y: DECK_Y + 6, z: Z(690), r: 7 },
  { x: -176, y: DECK_Y, z: Z(600), r: 8 },
  { x: 206, y: DECK_Y, z: Z(740), r: 6.5 },
  { x: 90, y: T2_Y, z: Z(900), r: 7 },
  { x: -136, y: T1_Y, z: Z(1000), r: 6 },
];
// [x, y, radius]: four mains in a dark stern band, two outer auxiliaries, four small upper nozzles
const ENGINES = [
  [-150, -24, 32],
  [-52, -24, 32],
  [52, -24, 32],
  [150, -24, 32],
  [-224, -14, 18],
  [224, -14, 18],
  [-115, 30, 10],
  [-40, 30, 10],
  [40, 30, 10],
  [115, 30, 10],
];

// soot and heat toward the stern: darker and warmer with distance past zr 900
function sootK(z) {
  const k = clamp((z - Z(900)) / (Z(1137) - Z(900)), 0, 1);
  return k * k;
}
function sootAt(z) {
  const k = sootK(z);
  return [1 - 0.34 * k, 1 - 0.38 * k, 1 - 0.45 * k];
}
function sootColor(color, z) {
  const s = sootAt(z);
  return mulColor(color, s[0], s[1], s[2]);
}

/**
 * Build the part list for one LOD. `open` parts the deck doors and adds a lit hangar bay.
 */
function buildLod(lod, { open = false, seed = 7 } = {}) {
  const rand = rng(seed + lod * 101 + (open ? 5000 : 0));
  const parts = [];
  const hardpoints = [];
  const engines = [];
  const turrets = [];
  const add = (geo, mat, opts = {}) => {
    const p = part(geo, mat, { lod, ...opts });
    parts.push(p);
    return p;
  };
  const fine = lod === 0;
  const mid = lod <= 1;
  const hullTexel = HULL_TEXEL[lod];
  const hullOpts = (color) => ({ color, uv: "keep" });
  const plateTexel = lod === 0 ? PLATE_TEXEL : 1 / 40;

  // -------------------------------------------------------------------------
  // plating helpers: bevelled plate groups with panel-line grooves, inset panels, fade patches, hatches
  // -------------------------------------------------------------------------
  // tint for one raised plate: +-8% jitter (+-14% on the dark belly/flank tints, where 8% is invisible
  // under the planet fill), a warm/cool drift, some faded (lighter, desaturated)
  const plateTint = (base, z, { fade = 0.14 } = {}) => {
    let c = jitterColor(rand, base, base.r > 0.45 ? 0.08 : 0.14, 0.02);
    if (rand() < fade) c = fadeOf(c, 0.25 + rand() * 0.3);
    return sootColor(c, z);
  };
  /**
   * Plate field over a rectangle of a flat horizontal face at height y. rect = { u0, u1, v0, v1 } in x/z
   * (starboard coordinates; `s` mirrors). clipU1(z) bounds the outer edge (deck taper); avoid(c) skips.
   */
  const flatField = (
    s,
    rect,
    y,
    base,
    {
      max = 60,
      keep = 0.22,
      skip = 0.22,
      inset = 0.12,
      clipU1 = null,
      avoid = null,
      grooves = true,
      thick = [0.6, 1.5],
      bevel = [0.8, 1.6],
      sub = fine,
      texel = plateTexel,
    } = {},
  ) => {
    const cells = partition(rand, rect, { max, keep });
    const sx = (x) => s * x;
    const gcol = DARK_SEAM;
    for (const c of cells) {
      let u1 = c.u1;
      if (clipU1) {
        u1 = Math.min(u1, clipU1(c.v0), clipU1(c.v1));
        if (u1 - c.u0 < 8) continue;
      }
      const cu = (c.u0 + u1) / 2;
      const cv = (c.v0 + c.v1) / 2;
      if (avoid && avoid({ ...c, u1 }, cu, cv)) continue;
      // panel-line grooves along the cell's forward and inboard edges (neighbours share the others)
      if (grooves && mid) {
        const g0 = Math.min(c.u0, u1);
        const g1 = Math.max(c.u0, u1);
        add(grooveMM(sx(g0) - 0.35, sx(g0) + 0.35, c.v0, c.v1, y), "dark", {
          color: gcol,
          texel: 1 / 4,
        });
        add(
          grooveMM(
            Math.min(sx(g0), sx(g1)),
            Math.max(sx(g0), sx(g1)),
            c.v0 - 0.35,
            c.v0 + 0.35,
            y,
          ),
          "dark",
          { color: gcol, texel: 1 / 4 },
        );
      }
      const r = rand();
      if (r < skip) continue;
      const in0 = 1.6;
      const xa = Math.min(sx(c.u0 + in0), sx(u1 - in0));
      const xb = Math.max(sx(c.u0 + in0), sx(u1 - in0));
      // leave the plating bare where a scorch decal sits
      if (
        SCORCH_POINTS.some(
          (w) =>
            Math.abs(w.y - y) < 0.5 &&
            w.x + w.r > xa - 1 &&
            w.x - w.r < xb + 1 &&
            w.z + w.r > c.v0 - 1 &&
            w.z - w.r < c.v1 + 1,
        )
      )
        continue;
      if (r < skip + inset) {
        // darker inset panel, flush with the base plating
        add(grooveMM(xa, xb, c.v0 + in0, c.v1 - in0, y, 0.05), "hull", {
          color: sootColor(mulColor(base, 0.62, 0.62, 0.64), cv),
          texel: hullTexel,
        });
        continue;
      }
      const th = thick[0] + rand() * (thick[1] - thick[0]);
      const bv = bevel[0] + rand() * (bevel[1] - bevel[0]);
      add(
        plateMM(xa, xb, c.v0 + in0, c.v1 - in0, y, th, bv, { texel }),
        "hull",
        { color: plateTint(base, cv), uv: "keep" },
      );
      if (!sub) continue;
      const r2 = rand();
      const w = xb - xa;
      const d = c.v1 - c.v0 - 2 * in0;
      if (r2 < 0.3) {
        // smaller plate on top, off-centre
        const w2 = w * (0.3 + rand() * 0.35);
        const d2 = d * (0.3 + rand() * 0.35);
        const ox = (rand() - 0.5) * (w - w2) * 0.8;
        const oz = (rand() - 0.5) * (d - d2) * 0.8;
        add(
          plateMM(
            sx(cu) + ox - w2 / 2,
            sx(cu) + ox + w2 / 2,
            cv + oz - d2 / 2,
            cv + oz + d2 / 2,
            y + th,
            0.4 + rand() * 0.5,
            0.6,
            { texel: 1 / 18 },
          ),
          "hull",
          { color: plateTint(base, cv, { fade: 0.2 }), uv: "keep" },
        );
      } else if (r2 < 0.48) {
        // hatch row
        const n = 2 + Math.floor(rand() * 3);
        for (let i = 0; i < n; i++)
          add(
            boxMM(
              [sx(cu) - 1.8 + (i - (n - 1) / 2) * 5.2, y + th, cv - 1.8],
              [sx(cu) + 1.8 + (i - (n - 1) / 2) * 5.2, y + th + 0.45, cv + 1.8],
            ),
            "dark",
            { color: DARK, texel: 1 / 4 },
          );
      } else if (r2 < 0.58) {
        // vent grille block
        add(
          boxMM(
            [sx(cu) - 4, y + th, cv - 1.6],
            [sx(cu) + 4, y + th + 1.1, cv + 1.6],
          ),
          "dark",
          { color: DARK, texel: 1 / 4 },
        );
      } else if (r2 < 0.66) {
        // short pipe run with two supports
        const len = Math.min(24, d - 6);
        add(
          cylZ(0.7, 0.7, len, 6).translate(sx(cu), y + th + 0.9, cv),
          "dark",
          { color: DARK, texel: 1 / 3 },
        );
        for (const dz of [-len / 2 + 2, len / 2 - 2])
          add(
            boxMM(
              [sx(cu) - 1, y + th, cv + dz - 0.6],
              [sx(cu) + 1, y + th + 0.9, cv + dz + 0.6],
            ),
            "dark",
            { color: DARK, texel: 1 / 3 },
          );
      }
    }
  };
  /**
   * Plate field on a loft strip (edge j of `secs`): cells in (t across the strip, z along it); plates are
   * placed on the strip's actual surface frame so they follow the twisted, tapering faces.
   */
  const stripField = (
    secs,
    j,
    base,
    { t0 = 0.06, t1 = 0.94, zr0, zr1, max = 60, keep = 0.22, skip = 0.3 },
    filter = null,
  ) => {
    const NOM = 100;
    const cells = partition(
      rand,
      { u0: t0 * NOM, u1: t1 * NOM, v0: Z(zr0), v1: Z(zr1) },
      { max, keep },
    );
    for (const c of cells) {
      const cv = (c.v0 + c.v1) / 2;
      const ta = c.u0 / NOM;
      const tb = c.u1 / NOM;
      if (filter && filter(cv, ta, tb, c)) continue;
      const len = loftEdgeLength(secs, j, cv);
      const fr = loftFrame(secs, j, (ta + tb) / 2, cv);
      if (mid) {
        // grooves along the cell's forward edge and its low-t edge
        const fa = loftFrame(secs, j, (ta + tb) / 2, c.v0);
        add(groove(fa, (tb - ta) * len, 0.7), "dark", {
          color: DARK_SEAM,
          texel: 1 / 4,
        });
        const fb = loftFrame(secs, j, ta, cv);
        add(groove(fb, 0.7, c.v1 - c.v0), "dark", {
          color: DARK_SEAM,
          texel: 1 / 4,
        });
      }
      const r = rand();
      if (r < skip) continue;
      const w = (tb - ta) * len - 3;
      const d = c.v1 - c.v0 - 3;
      if (w < 4 || d < 4) continue;
      if (r < skip + 0.1) {
        add(groove(fr, w, d, { lift: 0.05 }), "hull", {
          color: sootColor(mulColor(base, 0.62, 0.62, 0.64), cv),
          texel: hullTexel,
        });
        continue;
      }
      const th = 0.6 + rand() * 1.1;
      add(
        framePlate(fr, w, d, th, 0.7 + rand() * 0.8, {
          texel: plateTexel,
          sink: 0.5,
        }),
        "hull",
        {
          color: plateTint(base, cv),
          uv: "keep",
        },
      );
      if (fine && rand() < 0.35)
        add(
          framePlate(
            fr,
            w * 0.45,
            d * 0.4,
            th + 0.5,
            0.6,
            { texel: 1 / 18, sink: 0.4 },
            (rand() - 0.5) * w * 0.4,
            (rand() - 0.5) * d * 0.3,
          ),
          "hull",
          { color: plateTint(base, cv, { fade: 0.2 }), uv: "keep" },
        );
      else if (fine && rand() < 0.3)
        add(
          surfaceBox(fr, [4, th + 0.5, 4], {
            du: (rand() - 0.5) * w * 0.5,
            dv: (rand() - 0.5) * d * 0.5,
          }),
          "dark",
          {
            color: DARK,
            texel: 1 / 4,
          },
        );
    }
  };
  // decal that hugs a loft strip: flat plane in XY (x across the strip, y along z) wrapped with mapToLoft
  const loftDecal = (secs, j, t, z, w, d, colorFn, nu = 2, nv = 4) => {
    const g = new THREE.PlaneGeometry(w, d, nu, nv).toNonIndexed();
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      colorFn(pos.getX(i) / (w / 2), pos.getY(i) / (d / 2), c);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return mapToLoft(secs, j, t, z, g, 0.12);
  };
  const loftScorch = (secs, j, t, z, r, inner, outer) => {
    const g = new THREE.CircleGeometry(r, 14).toNonIndexed();
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const k = Math.min(1, Math.hypot(pos.getX(i), pos.getY(i)) / r);
      const tt = k * k;
      col[i * 3] = lerp(inner.r, outer.r, tt);
      col[i * 3 + 1] = lerp(inner.g, outer.g, tt);
      col[i * 3 + 2] = lerp(inner.b, outer.b, tt);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return mapToLoft(secs, j, t, z, g, 0.12);
  };
  // soot streak colour: full soot at the aft edge (v = +1) fading forward, fading to the base at the sides
  const streakFn =
    (base, strength = 1) =>
    (u, v, c) => {
      const across = Math.max(0, 1 - u * u);
      const along = clamp((v + 1) / 2, 0, 1);
      const k = across * along * along * strength;
      c.copy(mixColor(base, sootOf(base, 1), k));
    };

  // -------------------------------------------------------------------------
  // main hull
  // -------------------------------------------------------------------------
  const secs = hullSections(
    lod === 2 ? SECTIONS_FAR : SECTIONS_FULL,
    open ? OPEN_HANGAR : lod === 2 ? null : CLOSED_SEAM,
  );
  const hullGeos = loftProfile(secs, {
    tags: HULL_TAGS,
    capTag: "lower",
    uv: hullTexel,
  });
  const zoneTint = { deck: CREAM, flank: FLANK, lower: LOWER, belly: BELLY };
  for (const [zone, tint] of Object.entries(zoneTint)) {
    if (!hullGeos[zone]) continue;
    const p = add(hullGeos[zone], "hull", hullOpts(tint));
    shadeGeometry(p.geo, (x, y, z, c) => {
      const s = sootAt(z);
      c.r *= s[0];
      c.g *= s[1];
      c.b *= s[2];
      if (zone === "lower") {
        // grime under the shoulder wings: the top of the lower flank sits in the wing's shadow
        const zr = z - zBow;
        const yTB = yTrenchBot(zr);
        if (y > yTB - 24 && y < yTB + 1) {
          const k = clamp((y - (yTB - 24)) / 24, 0, 1);
          c.multiplyScalar(1 - 0.3 * k);
        }
      }
    });
  }
  const darkHull = add(hullGeos.dark, "dark", {
    color: DARK_RECESS,
    texel: 1 / 10,
  });
  shadeGeometry(darkHull.geo, (x, y, z, c) => {
    const s = sootAt(z);
    c.r *= s[0];
    c.g *= s[1];
    c.b *= s[2];
  });
  // bow prongs with the dark split notch between them
  for (const s of [-1, 1]) {
    const pz = lod === 2 ? [-4, 0, 112] : [-4, 0, 40, 108, 116];
    const prongSecs = prongSections(s, pz);
    const pr = loftProfile(prongSecs, { tags: PRONG_TAGS, uv: hullTexel });
    for (const [zone, tint] of Object.entries(zoneTint))
      if (pr[zone]) add(pr[zone], "hull", hullOpts(tint));
    add(pr.dark, "dark", { color: DARK_RECESS, texel: 1 / 8 });
    if (mid) {
      // large bevelled plates on the sloping prong tops (edge 4), then hatches and a groove between
      for (let zr = 12; zr < 100; zr += fine ? 18 + rand() * 10 : 30) {
        const zc = Z(zr + 9);
        const fr = loftFrame(prongSecs, 4, 0.5, zc);
        if (fr.n.y < 0) fr.n.negate();
        const wTop = prongOut(zr) - prongIn(zr);
        const w = wTop * (0.5 + rand() * 0.3);
        const dd = 14 + rand() * 6;
        add(
          framePlate(
            fr,
            w,
            dd,
            0.7 + rand() * 0.6,
            0.8,
            { texel: plateTexel, sink: 0.4 },
            (rand() - 0.5) * (wTop - w) * 0.6,
          ),
          "hull",
          { color: plateTint(CREAM, zc), uv: "keep" },
        );
        add(groove(fr, wTop - 2, 0.6, { dv: -dd / 2 - 2 }), "dark", {
          color: DARK_SEAM,
          texel: 1 / 4,
        });
        if (fine && rand() < 0.5)
          add(
            surfaceBox(fr, [2.4, 1.1, 2.4], {
              du: (rand() - 0.5) * wTop * 0.5,
              dv: dd / 2 + 2,
            }),
            "dark",
            { color: DARK, texel: 1 / 3 },
          );
      }
      // plates on the prong undersides too (dark neutral, so the belly reads as armour, not a slab)
      if (fine)
        for (let zr = 20; zr < 100; zr += 26) {
          const zc = Z(zr + 10);
          const fr = loftFrame(prongSecs, 0, 0.5, zc);
          if (fr.n.y > 0) fr.n.negate();
          const wB = prongOut(zr) - prongIn(zr);
          add(
            framePlate(fr, wB * 0.6, 18, 0.8, 0.8, {
              texel: plateTexel,
              sink: 0.4,
            }),
            "hull",
            { color: plateTint(BELLY, zc), uv: "keep" },
          );
        }
    }
    if (fine) {
      // light strips on the inner notch walls of the prongs
      for (const zr of [30, 62, 94]) {
        const fr = loftFrame(prongSecs, 5, 0.5, Z(zr));
        if (fr.n.x * s > 0) fr.n.negate();
        const p = fr.p.clone().addScaledVector(fr.n, 0.2);
        add(
          quadFacing(p.toArray(), fr.n.toArray(), [0, 1, 0], 10, 0.8),
          "windows",
          { color: HANGAR_BLUE, uv: "keep" },
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // dorsal flight deck: doors, seam, maroon panels, bow wedge, insignia, plate groups
  // -------------------------------------------------------------------------
  // the open ship slides each door outboard until its inner edge meets the hangar cut-out
  const x0 = open ? HANGAR_HALF : SEAM_HALF + 0.15;
  const doorShift = x0 - (SEAM_HALF + 0.15);
  const z0 = Z(DOOR_Z0);
  const z1 = Z(DOOR_Z1);
  // outer door edge: the full door width, clipped to the deck (matters when the doors are slid outboard)
  const doorX1 = (zr) => Math.min(DOOR_X1 + doorShift, wDeck(zr) - 6);
  // first zr at which the door edge can reach x (the deck widens linearly toward the stern)
  const zrFit = (x) =>
    doorX1(DOOR_Z0) >= x
      ? DOOR_Z0
      : clamp(((x + 6 + CHAMFER - 52) / 222) * 830, DOOR_Z0, DOOR_Z1);
  const top = DECK_Y + 6;
  if (!open) {
    if (lod === 2) {
      add(boxMM([-4.5, DECK_Y - 1.5, z0], [4.5, DECK_Y + 4.2, z1]), "dark", {
        color: DARK_SEAM,
        texel: 1 / 6,
      });
    } else {
      // the seam floor is the hull recess (dark); lit edge strips along its bottom corners, cross ribs
      const yf = DECK_Y - SEAM_DEPTH;
      for (const s of [-1, 1])
        add(
          quadFacing(
            [s * (SEAM_HALF - 0.8), yf + 0.15, (z0 + z1) / 2],
            [0, 1, 0],
            [0, 0, -1],
            0.6,
            z1 - z0 - 12,
          ),
          "windows",
          { color: mulColor(HANGAR_WARM, 0.75), uv: "keep" },
        );
      if (fine)
        for (let zz = DOOR_Z0 + 30; zz < DOOR_Z1 - 20; zz += 60)
          add(
            boxMM(
              [-SEAM_HALF + 0.3, yf, Z(zz) - 1],
              [SEAM_HALF - 0.3, yf + 1.2, Z(zz) + 1],
            ),
            "dark",
            { color: DARK, texel: 1 / 3 },
          );
    }
  }
  // door sill across the front of both doors
  add(
    plateMM(-100, 100, z0 - 7, z0 + 1, DECK_Y, 2.6, 0.8, { texel: plateTexel }),
    "hull",
    { color: mulColor(CREAM, 0.94), uv: "keep" },
  );
  for (const s of [-1, 1]) {
    const prof = (zr) => {
      const x1 = doorX1(zr);
      const pts =
        lod === 2
          ? [
              [x0, DECK_Y - 1],
              [x1, DECK_Y - 1],
              [x1, DECK_Y + 6],
              [x0, DECK_Y + 6],
            ]
          : [
              [x0, DECK_Y - 1],
              [x1, DECK_Y - 1],
              [x1, DECK_Y + 4],
              [x1 - 3, DECK_Y + 6],
              [x0 + 1.2, DECK_Y + 6],
              [x0, DECK_Y + 5.2],
            ];
      return { z: Z(zr), pts: pts.map(([x, y]) => [s * x, y]) };
    };
    const zK = zrFit(DOOR_X1 + doorShift);
    const doorZr =
      zK > DOOR_Z0 && zK < DOOR_Z1
        ? [DOOR_Z0, zK, DOOR_Z1]
        : [DOOR_Z0, DOOR_Z1];
    add(
      loftProfile(doorZr.map(prof), { uv: hullTexel }).hull,
      "hull",
      hullOpts(CREAM),
    );
    if (mid) {
      // door front face: a dark seam and vent grilles, so the 7 m step reads as a door end
      const xf = doorX1(DOOR_Z0);
      add(
        mbox(s, x0 + 2, xf - 2, DECK_Y + 2.2, DECK_Y + 2.7, z0 - 0.35, z0),
        "dark",
        { color: DARK_SEAM, texel: 1 / 4 },
      );
      if (fine)
        for (let x = x0 + 8; x < xf - 10; x += 14)
          add(
            mbox(s, x, x + 6, DECK_Y + 3.4, DECK_Y + 5, z0 - 0.5, z0),
            "dark",
            { color: DARK, texel: 1 / 3 },
          );
      // lit edge along the door's inner top lip (warm spill from the seam / bay)
      add(
        quadFacing(
          [s * (x0 + 0.5), top + 0.06, (z0 + z1) / 2],
          [0, 1, 0],
          [0, 0, -1],
          0.5,
          z1 - z0 - 16,
        ),
        "windows",
        { color: mulColor(HANGAR_WARM, open ? 0.9 : 0.5), uv: "keep" },
      );
    }
    // maroon outer-edge panels in three long segments, thin inner stripe, forward block
    const zOuter = zrFit(x0 + 90);
    for (const [a0, b] of [
      [270, 400],
      [414, 560],
      [574, 722],
    ]) {
      const a = Math.max(a0, zOuter);
      if (b - a < 30) continue;
      add(mbox(s, x0 + 68, x0 + 87, top, top + 0.5, Z(a), Z(b)), "paint", {
        color: MAROON,
        texel: 1 / 16,
      });
    }
    add(mbox(s, x0 + 4, x0 + 12, top, top + 0.5, Z(268), Z(786)), "paint", {
      color: MAROON,
      texel: 1 / 16,
    });
    add(mbox(s, x0 + 26, x0 + 56, top, top + 0.5, Z(262), Z(292)), "paint", {
      color: MAROON,
      texel: 1 / 16,
    });
    if (mid) {
      // hull-grey separator plates between the maroon segments
      for (const zz of [407, 567])
        if (zz > zOuter)
          add(
            plateMM(
              Math.min(s * (x0 + 66), s * (x0 + 89)),
              Math.max(s * (x0 + 66), s * (x0 + 89)),
              Z(zz - 4),
              Z(zz + 4),
              top,
              0.7,
              0.5,
              { texel: plateTexel },
            ),
            "hull",
            { color: jitterColor(rand, CREAM, 0.05), uv: "keep" },
          );
      // ring insignia (original mark: ring with a forward gap and a centre dot)
      const cx = s * (x0 + 42);
      add(
        ringFacing(
          [cx, top + 0.45, Z(600)],
          [0, 1, 0],
          [-1, 0, 0],
          16,
          21,
          lod === 0 ? 40 : 18,
          0.9,
        ),
        "paint",
        { color: MAROON, texel: 1 / 16 },
      );
      const dot = new THREE.CircleGeometry(4, lod === 0 ? 16 : 8);
      dot.rotateX(-Math.PI / 2);
      dot.translate(cx, top + 0.45, Z(600));
      add(dot, "paint", { color: MAROON, texel: 1 / 16 });
      // plate groups on the door tops between the stripes (large, bevelled, grooved)
      flatField(
        s,
        { u0: x0 + 14, u1: x0 + 66, v0: Z(296), v1: Z(786) },
        top,
        CREAM,
        {
          max: fine ? 62 : 90,
          keep: 0.25,
          skip: 0.18,
          clipU1: (z) => doorX1(z - zBow) - 4,
          avoid: (c, cu, cv) => Math.hypot(cu - (x0 + 42), cv - Z(600)) < 34,
        },
      );
      // running lights along the outer door edge
      if (fine)
        for (let zz = 280; zz < 790; zz += 36)
          add(
            quadFacing(
              [s * (doorX1(zz) - 3.8), top + 0.3, Z(zz)],
              [0, 1, 0],
              [0, 0, -1],
              1.2,
              1.2,
            ),
            "windows",
            {
              color: zz % 72 === 280 % 72 ? 0xffffff : WINDOW_WARM,
              uv: "keep",
            },
          );
    }
  }
  // split maroon bow wedge following the sloping bow deck
  {
    const zrs = lod === 2 ? [74, 108, 240] : [74, 90, 108, 150, 200, 240];
    for (const s of [-1, 1]) {
      const secsW = zrs.map((zr) => {
        const xi = zr < 108 ? prongIn(zr) + 3 : 4.5;
        const xo = Math.min(
          10 + (zr - 40) * 0.4,
          zr < 108 ? halfW(zr) - 8 : 96,
        );
        const y = yTop(zr) + 0.08;
        return {
          z: Z(zr),
          pts: [
            [xi, y],
            [Math.max(xi + 0.5, xo), y],
            [Math.max(xi + 0.5, xo), y + 0.6],
            [xi, y + 0.6],
          ].map(([x, yy]) => [s * x, yy]),
        };
      });
      const g = loftProfile(secsW, { defaultTag: "paint", capTag: "paint" });
      add(g.paint, "paint", { color: MAROON, texel: 1 / 16 });
    }
    if (mid) {
      // grey border plate framing the wedge's rear edge, and plate groups on the bow deck beside the wedge
      add(
        plateMM(-92, 92, Z(240), Z(247), DECK_Y - 0.3, 1.4, 0.6, {
          texel: plateTexel,
        }),
        "hull",
        { color: mulColor(CREAM, 0.95), uv: "keep" },
      );
      for (const s of [-1, 1]) {
        for (const [zra, zrb] of fine
          ? [
              [120, 158],
              [162, 200],
              [204, 238],
            ]
          : [[120, 238]]) {
          const zc = Z((zra + zrb) / 2);
          const xo = Math.min(10 + ((zra + zrb) / 2 - 40) * 0.4, 96) + 8;
          const xEdge = wDeck(zra) - 4;
          if (xEdge - xo < 12) continue;
          const y = yTop((zra + zrb) / 2);
          const fr = flat(s * ((xo + xEdge) / 2), y, zc);
          // the bow deck slopes (yTop rises to zr 250): tilt the frame to the slope
          const slope = (yTop(zrb) - yTop(zra)) / (Z(zrb) - Z(zra));
          fr.n.set(0, 1, -slope).normalize();
          add(
            framePlate(fr, xEdge - xo - 3, Z(zrb) - Z(zra) - 3, 0.8, 0.9, {
              texel: plateTexel,
              sink: 0.5,
            }),
            "hull",
            { color: plateTint(CREAM, zc), uv: "keep" },
          );
        }
      }
    }
  }

  // hangar bay revealed when the doors are open: the hull loft carries the cut-out (floor, walls, end
  // walls); this adds the lighting and the clutter that make it read as a working deck
  if (open) {
    const gap = HANGAR_HALF;
    const floorY = DECK_Y - HANGAR_DEPTH;
    const zc = (z0 + z1) / 2;
    for (const s of [-1, 1]) {
      // warm light strips along the walls at three heights, blue landing strips on the floor
      const strip = (yy, col, w) =>
        add(
          quadFacing(
            [s * (gap - 0.25), yy, zc],
            [-s, 0, 0],
            [0, 1, 0],
            z1 - z0 - 16,
            w,
          ),
          "windows",
          { color: col, uv: "keep" },
        );
      strip(floorY + 5, HANGAR_WARM, 1.4);
      strip(floorY + 30, mulColor(HANGAR_WARM, 0.8), 1.0);
      strip(DECK_Y - 5, HANGAR_WARM, 1.0);
      add(
        quadFacing(
          [s * (gap * 0.6), floorY + 0.15, zc],
          [0, 1, 0],
          [0, 0, -1],
          1.6,
          z1 - z0 - 30,
        ),
        "windows",
        { color: HANGAR_BLUE, uv: "keep" },
      );
    }
    // floor light panels: the big glow that reads from a distance
    for (let zz = DOOR_Z0 + 40; zz < DOOR_Z1 - 40; zz += 60)
      add(
        quadFacing(
          [0, floorY + 0.2, Z(zz)],
          [0, 1, 0],
          [0, 0, -1],
          gap * 1.1,
          10,
        ),
        "windows",
        { color: mulColor(HANGAR_WARM, 0.5), uv: "keep" },
      );
    if (mid) {
      // wall ribs spanning the full depth, with a gallery ledge at mid height
      for (const s of [-1, 1]) {
        for (let zz = DOOR_Z0 + 20; zz < DOOR_Z1 - 20; zz += 45)
          add(
            mbox(
              s,
              gap - 3.5,
              gap - 0.4,
              floorY,
              DECK_Y - 2,
              Z(zz) - 1.5,
              Z(zz) + 1.5,
            ),
            "hull",
            { color: FLANK, uv: "planar", texel: 1 / 8 },
          );
        add(
          mbox(
            s,
            gap - 4,
            gap - 0.3,
            floorY + 32,
            floorY + 34,
            z0 + 12,
            z1 - 12,
          ),
          "hull",
          { color: FLANK, texel: 1 / 8 },
        );
        if (fine)
          for (let zz = DOOR_Z0 + 32; zz < DOOR_Z1 - 30; zz += 45) {
            // gallery doors and equipment on the walls
            add(
              mbox(
                s,
                gap - 0.6,
                gap - 0.1,
                floorY + 35,
                floorY + 41,
                Z(zz) - 3,
                Z(zz) + 3,
              ),
              "windows",
              { color: mulColor(HANGAR_WARM, 0.5), uv: "keep" },
            );
            add(
              mbox(
                s,
                gap - 3,
                gap - 0.3,
                floorY + 8,
                floorY + 14,
                Z(zz) + 10,
                Z(zz) + 18,
              ),
              "dark",
              { color: DARK, texel: 1 / 3 },
            );
          }
      }
      // cross beams high in the bay, with lamps
      for (let zz = DOOR_Z0 + 60; zz < DOOR_Z1 - 40; zz += 90) {
        add(
          boxMM(
            [-gap, DECK_Y - 12, Z(zz) - 1.5],
            [gap, DECK_Y - 9.5, Z(zz) + 1.5],
          ),
          "dark",
          {
            color: DARK,
            texel: 1 / 4,
          },
        );
        if (fine)
          for (const xx of [-24, 0, 24])
            add(
              quadFacing(
                [xx, DECK_Y - 12.2, Z(zz)],
                [0, -1, 0],
                [0, 0, 1],
                3,
                1.2,
              ),
              "windows",
              { color: 0xffffff, uv: "keep" },
            );
      }
      // parked craft silhouettes: fuselage + wing slabs + tail, in rows either side of the centre lane
      for (let i = 0; i < (fine ? 14 : 6); i++) {
        const s = i % 2 ? -1 : 1;
        const zz = Z(
          DOOR_Z0 + 50 + i * ((DOOR_Z1 - DOOR_Z0 - 100) / (fine ? 14 : 6)),
        );
        const xx = s * (14 + rand() * 12);
        const yaw = (rand() - 0.5) * 0.4;
        const craft = [
          boxMM([-2, 0, -8], [2, 3, 8]),
          boxMM([-9, 1.4, -1.5], [9, 2.2, 1.5]),
          boxMM([-0.6, 3, 4], [0.6, 6, 8]),
        ];
        for (const g of craft) {
          g.rotateY(yaw);
          g.translate(xx, floorY, zz);
          add(g, "dark", { color: DARK, texel: 1 / 3 });
        }
      }
      // gantries and crates
      for (let i = 0; i < (fine ? 16 : 6); i++) {
        const w = 4 + rand() * 8;
        const h = 2 + rand() * 4;
        const d = 4 + rand() * 10;
        const xx = (rand() < 0.5 ? -1 : 1) * (28 + rand() * 12);
        const zz = Z(DOOR_Z0 + 30 + rand() * (DOOR_Z1 - DOOR_Z0 - 60));
        add(
          boxMM(
            [xx - w / 2, floorY, zz - d / 2],
            [xx + w / 2, floorY + h, zz + d / 2],
          ),
          "dark",
          {
            color: DARK,
            texel: 1 / 5,
          },
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // shoulder wings: red trim, plate groups, deck-edge ridge, edge windows
  // -------------------------------------------------------------------------
  for (const s of [-1, 1]) {
    // thin red trim following the diagonal wing edge, plus two red blocks near the front
    const zrs = lod === 2 ? [340, 790] : [340, 430, 520, 610, 700, 790];
    const secsT = zrs.map((zr) => {
      const xo = wDeck(zr) - 6;
      const y = yTop(zr) + 0.05;
      return {
        z: Z(zr),
        pts: [
          [xo - 1.6, y],
          [xo, y],
          [xo, y + 0.5],
          [xo - 1.6, y + 0.5],
        ].map(([x, yy]) => [s * x, yy]),
      };
    });
    const g = loftProfile(secsT, { defaultTag: "paint", capTag: "paint" });
    add(g.paint, "paint", { color: RED_TRIM, texel: 1 / 16 });
    if (mid) {
      add(
        mbox(s, 104, 128, DECK_Y + 0.05, DECK_Y + 0.55, Z(362), Z(424)),
        "paint",
        { color: RED_TRIM, texel: 1 / 16 },
      );
      add(
        mbox(s, 106, 146, DECK_Y + 0.05, DECK_Y + 0.55, Z(646), Z(672)),
        "paint",
        { color: RED_TRIM, texel: 1 / 16 },
      );
      // raised ridge along the deck edge from the doors' front to the block (a lofted bevelled bar)
      const ridgeZr = [330, 430, 520, 610, 700, 786];
      const ridge = loftProfile(
        ridgeZr.map((zr) => {
          const xo = wDeck(zr) - 1.2;
          const y = yTop(zr);
          return {
            z: Z(zr),
            pts: [
              [xo - 3.2, y - 0.3],
              [xo, y - 0.3],
              [xo - 0.5, y + 1.5],
              [xo - 2.7, y + 1.5],
            ].map(([x, yy]) => [s * x, yy]),
          };
        }),
        { uv: 1 / 12 },
      );
      add(ridge.hull, "hull", hullOpts(mulColor(CREAM, 0.92)));
    }
    if (mid) {
      // plate groups on the wing top: partition the bounding rectangle, clip to the diagonal edge; keep
      // clear of the turret bases and the red trim blocks
      flatField(
        s,
        { u0: 100, u1: 252, v0: Z(334), v1: Z(786) },
        DECK_Y,
        CREAM,
        {
          max: fine ? 58 : 90,
          keep: 0.22,
          skip: 0.2,
          clipU1: (z) => wDeck(z - zBow) - 6,
          avoid: (c, cu, cv) => {
            for (const tz of TURRET_ZR)
              if (Math.hypot(cu - turretX(tz), cv - Z(tz)) < 34) return true;
            if (c.u0 < 150 && cv > Z(356) && cv < Z(430)) return true;
            if (c.u0 < 150 && cv > Z(640) && cv < Z(678)) return true;
            return false;
          },
        },
      );
      // turret base plinths: an octagonal skirt plate under each heavy turret
      for (const zr of TURRET_ZR) {
        const tx = s * turretX(zr);
        add(
          cylY(19, 20.5, 1.4, fine ? 16 : 8).translate(tx, DECK_Y + 0.7, Z(zr)),
          "hull",
          { color: mulColor(CREAM, 0.9), texel: 1 / 8 },
        );
      }
      // chamfer plates: long thin strips on the sloped shoulder band
      if (fine) {
        const jEdge = s > 0 ? EDGE.chamferR : EDGE.chamferL;
        for (let zr = 350; zr < 1060; zr += 34) {
          if (rand() < 0.25) continue;
          const zz = Z(zr + 17);
          const fr = loftFrame(secs, jEdge, 0.5, zz);
          const len = 24 + rand() * 6;
          add(
            framePlate(fr, 9, len, 0.7 + rand() * 0.5, 0.6, {
              texel: plateTexel,
              sink: 0.4,
            }),
            "hull",
            {
              color: plateTint(FLANK, zz),
              uv: "keep",
            },
          );
        }
      }
    }
    // window rows along the wing edge face (a 7 m tall vertical band along the whole flank)
    if (fine) {
      const jEdge = s > 0 ? EDGE.wingEdgeR : EDGE.wingEdgeL;
      let zr = 340;
      while (zr < 1020) {
        const run = 6 + Math.floor(rand() * 10);
        for (let i = 0; i < run && zr < 1020; i++, zr += 3.2) {
          const fr = loftFrame(secs, jEdge, 0.5, Z(zr));
          const p = fr.p.clone().addScaledVector(fr.n, 0.12);
          add(
            quadFacing(p.toArray(), fr.n.toArray(), [0, 1, 0], 1.7, 1.15),
            "windows",
            { color: rand() < 0.8 ? ROW_WARM : ROW_COOL, uv: "keep" },
          );
        }
        zr += 12 + rand() * 40;
      }
    } else if (mid) {
      const jEdge = s > 0 ? EDGE.wingEdgeR : EDGE.wingEdgeL;
      for (let zr = 360; zr < 1000; zr += 90) {
        const fr = loftFrame(secs, jEdge, 0.5, Z(zr + 20));
        const p = fr.p.clone().addScaledVector(fr.n, 0.15);
        add(
          quadFacing(p.toArray(), fr.n.toArray(), [0, 1, 0], 34, 1.1),
          "windows",
          { color: ROW_WARM, uv: "keep" },
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // rear block: two terraces, hump between the towers, plating, greeble field
  // -------------------------------------------------------------------------
  const terrace = (zr0, zr1, w0, w1, yTopT, slope) => {
    const prof = (w, yt) => [
      [-w, DECK_Y - 1],
      [w, DECK_Y - 1],
      [w, yt - 4],
      [w - 4, yt],
      [-w + 4, yt],
      [-w, yt - 4],
    ];
    const secsB = [
      { z: Z(zr0), pts: prof(w0, DECK_Y + 4) },
      { z: Z(zr0 + slope), pts: prof(w0 + 2, yTopT) },
      { z: Z(zr1), pts: prof(w1, yTopT) },
    ];
    return loftProfile(secsB, { uv: hullTexel });
  };
  {
    const t1 = terrace(BLOCK_Z0, BLOCK_Z1, 148, 158, T1_Y, 22);
    const p1 = add(t1.hull, "hull", hullOpts(CREAM));
    shadeGeometry(p1.geo, (x, y, z, c, nx, ny) => {
      const s = sootAt(z);
      c.r *= s[0];
      c.g *= s[1];
      c.b *= s[2];
      // side walls in the flank tone
      if (Math.abs(ny) < 0.5) c.multiply(lin(0.76, 0.77, 0.81));
    });
    const t2 = terrace(850, 1070, 116, 128, T2_Y, 26);
    const p2 = add(t2.hull, "hull", hullOpts(CREAM));
    shadeGeometry(p2.geo, (x, y, z, c, nx, ny) => {
      const s = sootAt(z);
      c.r *= s[0];
      c.g *= s[1];
      c.b *= s[2];
      if (Math.abs(ny) < 0.5) c.multiply(lin(0.76, 0.77, 0.81));
    });
    // hump between the tower shafts (sloped front), the high walkway, and an aft antenna platform
    const hump = loftProfile(
      [
        {
          z: Z(924),
          pts: [
            [-40, T2_Y - 1],
            [40, T2_Y - 1],
            [40, T2_Y + 2],
            [-40, T2_Y + 2],
          ],
        },
        {
          z: Z(940),
          pts: [
            [-40, T2_Y - 1],
            [40, T2_Y - 1],
            [40, T2_Y + 16],
            [-40, T2_Y + 16],
          ],
        },
        {
          z: Z(990),
          pts: [
            [-40, T2_Y - 1],
            [40, T2_Y - 1],
            [40, T2_Y + 16],
            [-40, T2_Y + 16],
          ],
        },
        {
          z: Z(1002),
          pts: [
            [-40, T2_Y - 1],
            [40, T2_Y - 1],
            [40, T2_Y + 6],
            [-40, T2_Y + 6],
          ],
        },
      ],
      { uv: hullTexel },
    );
    add(hump.hull, "hull", hullOpts(mulColor(CREAM, 0.94)));
    add(boxMM([-44, 130, Z(950)], [44, 134.5, Z(972)]), "hull", {
      color: mulColor(CREAM, 0.92),
      texel: 1 / 8,
    });
    add(boxMM([-34, T2_Y - 1, Z(1010)], [34, T2_Y + 9, Z(1062)]), "hull", {
      color: sootColor(mulColor(CREAM, 0.95), Z(1040)),
      texel: 1 / 10,
    });
    if (mid) {
      add(boxMM([-44, 128.5, Z(949)], [44, 130, Z(973)]), "dark", {
        color: DARK,
        texel: 1 / 4,
      });
      // window row on the hump front and walkway lights
      for (let i = 0; i < (fine ? 10 : 2); i++) {
        const x = -30 + (i + 0.5) * (60 / (fine ? 10 : 2));
        const n = new THREE.Vector3(0, 16, -14).normalize();
        const c = new THREE.Vector3(x, T2_Y + 9, Z(931)).addScaledVector(
          n,
          0.3,
        );
        add(
          quadFacing(c.toArray(), n.toArray(), [0, 1, 0], fine ? 2 : 22, 1.2),
          "windows",
          { color: ROW_WARM, uv: "keep" },
        );
      }
      // plate groups on the terrace tops and the ledges, avoiding the towers and hump
      const towerClear = (c, cu, cv) => {
        const zr = cv - zBow;
        if (zr > 918 && zr < 1006 && Math.abs(cu) < 82) return true;
        if (zr > 1004 && zr < 1068 && Math.abs(cu) < 40) return true;
        return false;
      };
      flatField(
        1,
        { u0: -112, u1: 112, v0: Z(882), v1: Z(1064) },
        T2_Y,
        CREAM,
        {
          max: fine ? 56 : 90,
          keep: 0.2,
          skip: 0.28,
          avoid: towerClear,
        },
      );
      for (const s of [-1, 1]) {
        flatField(
          s,
          { u0: 122, u1: 146, v0: Z(818), v1: Z(1078) },
          T1_Y,
          CREAM,
          {
            max: fine ? 34 : 60,
            keep: 0.2,
            skip: 0.3,
            avoid: (c, cu, cv) => Math.abs(cv - Z(845)) < 18,
          },
        );
        // ridge along the terrace-1 outer edge and the terrace-2 edge
        for (const [wAt, y, zra, zrb] of [
          [T1_W, T1_Y, 812, 1082],
          [T2_W, T2_Y, 876, 1068],
        ]) {
          const rz = [zra, (zra + zrb) / 2, zrb];
          const rg = loftProfile(
            rz.map((zr) => {
              const xo = wAt(zr) - 1;
              return {
                z: Z(zr),
                pts: [
                  [xo - 3, y - 0.3],
                  [xo, y - 0.3],
                  [xo - 0.4, y + 1.4],
                  [xo - 2.6, y + 1.4],
                ].map(([x, yy]) => [s * x, yy]),
              };
            }),
            { uv: 1 / 12 },
          );
          add(rg.hull, "hull", hullOpts(mulColor(CREAM, 0.92)));
        }
        // ledge faces and terrace-2 side walls: layered wall plates
        if (fine) {
          for (const [wAt, y0, y1, zra, zrb] of [
            [T1_W, DECK_Y + 1, T1_Y - 13, 824, 1080],
            [T2_W, T1_Y + 1, T2_Y - 9, 884, 1064],
          ]) {
            const cells = partition(
              rand,
              { u0: y0, u1: y1, v0: Z(zra), v1: Z(zrb) },
              { max: 40, keep: 0.2 },
            );
            for (const c of cells) {
              if (rand() < 0.4) continue;
              const cv = (c.v0 + c.v1) / 2;
              const cy = (c.u0 + c.u1) / 2;
              const x = s * wAt(cv - zBow);
              const fr = {
                p: new THREE.Vector3(x, cy, cv),
                n: new THREE.Vector3(s, 0, 0),
                u: new THREE.Vector3(0, -s, 0),
                v: new THREE.Vector3(0, 0, 1),
              };
              add(
                framePlate(
                  fr,
                  c.u1 - c.u0 - 2.4,
                  c.v1 - c.v0 - 2.4,
                  0.5 + rand() * 0.9,
                  0.6,
                  { texel: plateTexel, sink: 0.3 },
                ),
                "hull",
                { color: plateTint(FLANK, cv), uv: "keep" },
              );
            }
          }
        }
      }
      // dark expansion grooves across terrace 2 and the ledges
      for (const zr of [905, 1005])
        add(grooveMM(-110, 110, Z(zr) - 0.6, Z(zr) + 0.6, T2_Y), "dark", {
          color: DARK_SEAM,
          texel: 1 / 4,
        });
      add(grooveMM(-0.6, 0.6, Z(884), Z(1066), T2_Y), "dark", {
        color: DARK_SEAM,
        texel: 1 / 4,
      });
      // block-face window rows (terrace fronts and sides); the side faces taper, so x follows zr
      const rowsOn = (xAt, y, zrA, zrB, nx) => {
        let zr = zrA;
        while (zr < zrB) {
          const run = fine ? 5 + Math.floor(rand() * 8) : 1;
          const w = fine ? 1.8 : 30;
          const step = fine ? 3.4 : 60;
          for (let i = 0; i < run && zr < zrB; i++, zr += step) {
            const x = xAt(fine ? zr : zr + w / 2);
            add(
              quadFacing(
                [x + nx * 0.15, y, Z(zr + (fine ? 0 : w / 2))],
                [nx, 0, 0],
                [0, 1, 0],
                w,
                1.2,
              ),
              "windows",
              { color: rand() < 0.8 ? ROW_WARM : ROW_COOL, uv: "keep" },
            );
          }
          zr += fine ? 10 + rand() * 30 : 20;
        }
      };
      for (const s of [-1, 1]) {
        rowsOn((zr) => s * T1_W(zr), T1_Y - 7, 830, 1075, s);
        rowsOn((zr) => s * T1_W(zr), T1_Y - 11, 850, 1060, s);
        rowsOn((zr) => s * T2_W(zr), T2_Y - 6, 890, 1060, s);
      }
      // sloped front faces: y on the ramp gives zr; the normal is the ramp normal
      for (const [zr0, slope, yt, y, w] of [
        [BLOCK_Z0, 22, T1_Y, T1_Y - 7, 120],
        [850, 26, T2_Y, T2_Y - 8, 90],
      ]) {
        const zr = zr0 + (slope * (y - (DECK_Y + 4))) / (yt - (DECK_Y + 4));
        const slopeN = new THREE.Vector3(
          0,
          slope,
          -(yt - DECK_Y - 4),
        ).normalize();
        const n = fine ? Math.floor(w / 3.4) : 3;
        for (let i = 0; i < n; i++) {
          if (fine && rand() < 0.18) continue;
          const x = -w / 2 + (i + 0.5) * (w / n);
          const c = new THREE.Vector3(x, y, Z(zr)).addScaledVector(slopeN, 0.3);
          add(
            quadFacing(
              c.toArray(),
              slopeN.toArray(),
              [0, 1, 0],
              fine ? 1.8 : w / n - 4,
              1.2,
            ),
            "windows",
            { color: ROW_WARM, uv: "keep" },
          );
        }
      }
      // shield generator domes on the terrace-1 ledges near the front corners
      for (const s of [-1, 1]) {
        add(
          facetedDome(11, 9, fine ? 12 : 8, fine ? 4 : 2).translate(
            s * 134,
            T1_Y,
            Z(845),
          ),
          "hull",
          {
            color: mulColor(CREAM, 0.96),
            texel: 1 / 8,
          },
        );
        add(
          cylY(12.5, 13, 2, fine ? 16 : 8).translate(s * 134, T1_Y + 1, Z(845)),
          "dark",
          {
            color: DARK,
            texel: 1 / 4,
          },
        );
      }
      // aft sensor cluster: faceted dome with a dish on top, four masts, two comm dishes
      {
        const base = [0, T2_Y + 9, Z(1036)];
        add(
          cylY(9, 10, 3, 8).translate(base[0], base[1] + 1.5, base[2]),
          "dark",
          {
            color: DARK,
            texel: 1 / 4,
          },
        );
        add(
          facetedDome(8.5, 7, 8, 3).translate(base[0], base[1] + 3, base[2]),
          "hull",
          {
            color: mulColor(CREAM_TOWER, 0.9),
            texel: 1 / 6,
          },
        );
        add(
          cylY(0.8, 1.2, 8, 6).translate(base[0], base[1] + 13, base[2]),
          "dark",
          {
            color: DARK,
            texel: 1 / 3,
          },
        );
        const dish = new THREE.CylinderGeometry(
          6,
          0.8,
          2.4,
          fine ? 14 : 8,
          1,
          false,
        );
        dish.rotateX(-1.1);
        dish.translate(base[0], base[1] + 18.5, base[2] - 1);
        add(dish, "hull", { color: CREAM_TOWER, texel: 1 / 4 });
        for (const [dx, dz] of [
          [-22, -16],
          [22, -16],
          [-22, 16],
          [22, 16],
        ])
          add(
            cylY(0.6, 0.9, 28, 6).translate(dx, T2_Y + 9 + 14, Z(1036) + dz),
            "dark",
            {
              color: DARK,
              texel: 1 / 3,
            },
          );
      }
      // two more dish/mast clusters on the terrace-2 wings
      for (const s of [-1, 1]) {
        const cx = s * 84;
        const cz = Z(1044);
        add(
          boxMM([cx - 7, T2_Y - 0.2, cz - 7], [cx + 7, T2_Y + 3, cz + 7]),
          "hull",
          {
            color: sootColor(mulColor(CREAM, 0.92), cz),
            texel: 1 / 6,
          },
        );
        add(cylY(0.7, 1.0, 20, 6).translate(cx, T2_Y + 13, cz), "dark", {
          color: DARK,
          texel: 1 / 3,
        });
        const d1 = new THREE.CylinderGeometry(
          5,
          0.6,
          2,
          fine ? 12 : 8,
          1,
          false,
        );
        d1.rotateX(-0.8);
        d1.rotateY(s * 0.6);
        d1.translate(cx, T2_Y + 9, cz - 4);
        add(d1, "hull", { color: CREAM_TOWER, texel: 1 / 4 });
        if (fine) {
          const d2 = new THREE.CylinderGeometry(3.4, 0.5, 1.6, 10, 1, false);
          d2.rotateX(-0.6);
          d2.rotateY(-s * 0.9);
          d2.translate(cx + s * 5, T2_Y + 21, cz + 3);
          add(d2, "hull", { color: CREAM_TOWER, texel: 1 / 4 });
          add(
            boxMM([cx - 5, T2_Y + 3, cz - 2], [cx + 5, T2_Y + 5.5, cz + 2]),
            "dark",
            {
              color: DARK,
              texel: 1 / 3,
            },
          );
        }
      }
      // hatch rows along the terrace-1 ledges and across terrace 2 behind the towers
      if (fine) {
        for (const s of [-1, 1])
          for (let zr = 860; zr < 1070; zr += 8) {
            if (rand() < 0.2) continue;
            add(
              boxMM(
                [s * 125 - 1.6, T1_Y, Z(zr) - 1.6],
                [s * 125 + 1.6, T1_Y + 0.5, Z(zr) + 1.6],
              ),
              "dark",
              { color: DARK, texel: 1 / 3 },
            );
          }
        for (let x = -100; x <= 100; x += 8) {
          if (Math.abs(x) < 46 || rand() < 0.2) continue;
          add(
            boxMM([x - 1.6, T2_Y, Z(1012)], [x + 1.6, T2_Y + 0.5, Z(1015.2)]),
            "dark",
            {
              color: DARK,
              texel: 1 / 3,
            },
          );
        }
      }
    }
    if (mid) {
      // greeble field on the terraces: hatches, boxes, domes, dishes, masts, vents, pipes
      const N = fine ? 150 : 30;
      for (let i = 0; i < N; i++) {
        const onT2 = rand() < 0.62;
        const y = onT2 ? T2_Y : T1_Y;
        const zr = onT2 ? 880 + rand() * 180 : 815 + rand() * 260;
        let x;
        if (onT2) {
          x = (rand() - 0.5) * 2 * 108;
          // keep clear of the tower shafts, the hump, the aft platform and the dish clusters
          if (zr > 918 && zr < 1006 && Math.abs(x) < 80) continue;
          if (zr > 1004 && zr < 1068 && Math.abs(x) < 38) continue;
          if (zr > 1030 && zr < 1060 && Math.abs(Math.abs(x) - 84) < 12)
            continue;
        } else {
          const side = rand() < 0.5 ? -1 : 1;
          x = side * (122 + rand() * 24);
          if (Math.abs(zr - 845) < 16) continue;
        }
        const zz = Z(zr);
        const kind = rand();
        const col = sootColor(jitterColor(rand, CREAM, 0.08, 0.02), zz);
        if (kind < 0.32) {
          const w = 5 + rand() * 16;
          const d = 5 + rand() * 16;
          const h = 1.5 + rand() * 7;
          add(
            boxMM(
              [x - w / 2, y - 0.3, zz - d / 2],
              [x + w / 2, y + h, zz + d / 2],
            ),
            "hull",
            {
              color: col,
              texel: 1 / 8,
            },
          );
          if (fine && rand() < 0.5)
            add(
              boxMM(
                [x - w / 2 + 1, y + h, zz - d / 2 + 1],
                [x + w / 2 - 1, y + h + 0.4, zz + d / 2 - 1],
              ),
              "dark",
              { color: DARK, texel: 1 / 4 },
            );
        } else if (kind < 0.55) {
          const w = 3 + rand() * 4;
          add(
            boxMM(
              [x - w / 2, y - 0.2, zz - w / 2],
              [x + w / 2, y + 0.5, zz + w / 2],
            ),
            "dark",
            {
              color: DARK,
              texel: 1 / 4,
            },
          );
        } else if (kind < 0.66) {
          const r = 3 + rand() * 5;
          add(
            facetedDome(r, r * 0.8, 8, fine ? 3 : 2).translate(x, y, zz),
            "hull",
            {
              color: col,
              texel: 1 / 6,
            },
          );
        } else if (kind < 0.76) {
          const h = 12 + rand() * 26;
          add(cylY(0.7, 1.1, h, 6).translate(x, y + h / 2, zz), "dark", {
            color: DARK,
            texel: 1 / 3,
          });
          if (fine)
            add(
              boxMM([x - 1.6, y, zz - 1.6], [x + 1.6, y + 1.4, zz + 1.6]),
              "dark",
              {
                color: DARK,
                texel: 1 / 3,
              },
            );
        } else if (kind < 0.85) {
          add(
            boxMM([x - 4, y - 0.2, zz - 1.5], [x + 4, y + 1.6, zz + 1.5]),
            "dark",
            {
              color: DARK,
              texel: 1 / 4,
            },
          );
        } else if (kind < 0.93) {
          // comm dish on a short mast, tilted up
          add(cylY(0.6, 0.9, 6, 6).translate(x, y + 3, zz), "dark", {
            color: DARK,
            texel: 1 / 3,
          });
          const dish = new THREE.CylinderGeometry(
            4 + rand() * 3,
            0.6,
            2.2,
            fine ? 12 : 8,
            1,
            false,
          );
          dish.rotateX(-0.9 + rand() * 0.4);
          dish.translate(x, y + 7.5, zz);
          add(dish, "hull", { color: col, texel: 1 / 4 });
        } else {
          const len = 20 + rand() * 40;
          add(
            cylZ(1 + rand() * 0.8, 1 + rand() * 0.8, len, 6).translate(
              x,
              y + 1.4,
              zz,
            ),
            "dark",
            {
              color: DARK,
              texel: 1 / 3,
            },
          );
        }
      }
      // pipe runs along the terrace-1 ledge edges and terrace 2's outer edges
      for (const s of [-1, 1])
        for (const [zrA, zrB, xx, r, y] of [
          [862, 1000, 144, 1.6, T1_Y],
          [1005, 1075, 144, 1.2, T1_Y],
          [890, 1060, 110, 1.3, T2_Y],
        ]) {
          add(
            cylZ(r, r, Z(zrB) - Z(zrA), 6).translate(
              s * xx,
              y + r,
              (Z(zrA) + Z(zrB)) / 2,
            ),
            "dark",
            { color: DARK, texel: 1 / 3 },
          );
          if (fine)
            for (let zr = zrA + 10; zr < zrB; zr += 34)
              add(
                mbox(
                  s,
                  xx - 2.2,
                  xx + 2.2,
                  y,
                  y + r * 1.2,
                  Z(zr) - 0.8,
                  Z(zr) + 0.8,
                ),
                "dark",
                { color: DARK, texel: 1 / 3 },
              );
        }
    }
  }

  // -------------------------------------------------------------------------
  // twin bridge towers
  // -------------------------------------------------------------------------
  for (const s of [-1, 1]) {
    const tx = s * TOWER_X;
    const tz = Z(TOWER_ZR);
    if (lod === 2) {
      add(
        boxMM([tx - 14, T2_Y - 1, tz - 20], [tx + 14, TOWER_TOP, tz + 20]),
        "hull",
        {
          color: CREAM_TOWER,
          texel: 1 / 10,
        },
      );
      add(
        boxMM([tx - 36, TOWER_TOP, tz - 25.5], [tx + 36, HEAD_TOP, tz + 25]),
        "hull",
        {
          color: CREAM_TOWER,
          texel: 1 / 10,
        },
      );
      add(
        boxMM(
          [tx - 30, TOWER_TOP + 10, tz - 25.9],
          [tx + 30, TOWER_TOP + 13.2, tz - 25.3],
        ),
        "windows",
        { color: WINDOW_WARM, uv: "keep" },
      );
      continue;
    }
    // shaft: octagonal, tapering
    const shaft = yLoft(
      [
        { y: T2_Y - 1, pts: oct(17, 23, 4) },
        { y: T2_Y + 8, pts: oct(15.5, 21.5, 4) },
        { y: TOWER_TOP, pts: oct(12.5, 18, 3.5) },
      ],
      { uv: 1 / 12 },
    );
    for (const g of Object.values(shaft)) g.translate(tx, 0, tz);
    add(shaft.hull, "hull", hullOpts(CREAM_TOWER));
    // shaft ribs, mid collars
    if (fine) {
      for (const [dx, dz] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const vertical = dz === 0;
        const y0 = T2_Y + 6;
        const y1 = TOWER_TOP - 4;
        const n = 5;
        for (let k = 0; k < n; k++) {
          const ya = y0 + (k * (y1 - y0)) / n;
          const yb = y0 + ((k + 1) * (y1 - y0)) / n - 1.5;
          const ym = (ya + yb) / 2;
          const hx = SHAFT_HX(ym) + 1.5;
          const hz = SHAFT_HZ(ym) + 1.5;
          add(
            boxMM(
              [
                tx + dx * hx - (vertical ? 0.9 : 5 + (k % 2) * 3),
                ya,
                tz + dz * hz - (vertical ? 5 + (k % 2) * 3 : 0.9),
              ],
              [
                tx + dx * hx + (vertical ? 0.9 : 5 + (k % 2) * 3),
                yb,
                tz + dz * hz + (vertical ? 5 + (k % 2) * 3 : 0.9),
              ],
            ),
            "hull",
            {
              color: mulColor(CREAM_TOWER, 0.9 + (k % 2) * 0.08),
              texel: 1 / 6,
            },
          );
        }
      }
    }
    for (const yc of fine ? [104, 122, 140] : [122]) {
      const hx = SHAFT_HX(yc) + 1.4;
      const hz = SHAFT_HZ(yc) + 1.4;
      add(
        boxMM([tx - hx, yc - 1.2, tz - hz], [tx + hx, yc + 1.2, tz + hz]),
        "dark",
        {
          color: DARK,
          texel: 1 / 4,
        },
      );
    }
    // head: neck, flared bridge module (widest above the tall window row), set-back cap
    const headYs = [
      TOWER_TOP - 0.5,
      TOWER_TOP + 3,
      TOWER_TOP + 14,
      HEAD_TOP - 6,
      HEAD_TOP - 1,
      HEAD_TOP,
    ];
    const head = yLoft(
      headYs.map((y) => ({
        y,
        pts: oct(HEAD_HX(y), HEAD_HZ(y), Math.min(6, HEAD_HX(y) * 0.2)),
      })),
      { uv: 1 / 12 },
    );
    for (const g of Object.values(head)) g.translate(tx, 0, tz);
    add(head.hull, "hull", hullOpts(CREAM_TOWER));
    // dark bands where the window rows sit, then the windows themselves
    const rowA = TOWER_TOP + 11.5; // tall bridge row
    const rowB = TOWER_TOP + 18.7; // upper row
    for (const [y, hh] of [
      [rowA, 2.7],
      [rowB, 1.25],
    ]) {
      const hx = HEAD_HX(y) + 0.25;
      const hz = HEAD_HZ(y) + 0.25;
      add(
        boxMM([tx - hx, y - hh, tz - hz], [tx + hx, y + hh, tz + hz]),
        "dark",
        {
          color: DARK_SEAM,
          texel: 1 / 4,
        },
      );
    }
    const winRow = (y, faceX, faceZ, nx, nz, len, h) => {
      // a row of windows along a face; faceX/faceZ = face plane coordinate; (nx, nz) = outward normal
      if (!fine) {
        const c =
          nx !== 0
            ? [tx + faceX + nx * 0.3, y, tz]
            : [tx, y, tz + faceZ + nz * 0.3];
        add(quadFacing(c, [nx, 0, nz], [0, 1, 0], len - 6, h), "windows", {
          color: WINDOW_WARM,
          uv: "keep",
        });
        return;
      }
      const n = Math.floor(len / 3.0);
      for (let i = 0; i < n; i++) {
        if (rand() < 0.12) continue;
        const t = -len / 2 + (i + 0.5) * (len / n);
        const c =
          nx !== 0
            ? [tx + faceX + nx * 0.3, y, tz + t]
            : [tx + t, y, tz + faceZ + nz * 0.3];
        add(quadFacing(c, [nx, 0, nz], [0, 1, 0], 1.9, h), "windows", {
          color: rand() < 0.85 ? WINDOW_WARM : WINDOW_COOL,
          uv: "keep",
        });
      }
    };
    // rows stay on the flat faces of the octagon (inside the 6 m corner chamfers)
    const hxA = HEAD_HX(rowA) + 0.3;
    const hzA = HEAD_HZ(rowA) + 0.3;
    const hxB = HEAD_HX(rowB) + 0.3;
    const hzB = HEAD_HZ(rowB) + 0.3;
    winRow(rowA, 0, -hzA, 0, -1, 2 * (hxA - 6) - 3, 2.6); // bridge front, tall row
    winRow(rowB, 0, -hzB, 0, -1, 2 * (hxB - 6) - 3, 1.3);
    winRow(rowA, -hxA, 0, -1, 0, 2 * (hzA - 6) - 2, 1.6);
    winRow(rowA, hxA, 0, 1, 0, 2 * (hzA - 6) - 2, 1.6);
    winRow(rowB, -hxB, 0, -1, 0, 2 * (hzB - 6) - 2, 1.1);
    winRow(rowB, hxB, 0, 1, 0, 2 * (hzB - 6) - 2, 1.1);
    winRow(rowA, 0, hzA, 0, 1, 2 * (hxA - 6) - 14, 1.4);
    // shaft windows: small rows on the front and both sides, following the taper
    for (const y of fine ? [96, 112, 130, 148] : [100, 134]) {
      winRow(y, 0, -SHAFT_HZ(y), 0, -1, fine ? 14 : 20, 1.1);
      winRow(y, -SHAFT_HX(y), 0, -1, 0, fine ? 18 : 24, 1.0);
      winRow(y, SHAFT_HX(y), 0, 1, 0, fine ? 18 : 24, 1.0);
    }
    // roof: raised cap plate, sensor dome, antenna spars, dish, equipment
    add(
      plateMM(tx - 18, tx + 18, tz - 11, tz + 11, HEAD_TOP, 1.2, 0.8, {
        texel: plateTexel,
      }),
      "hull",
      { color: mulColor(CREAM_TOWER, 0.95), uv: "keep" },
    );
    add(
      facetedDome(5.5, 4.5, 8, fine ? 3 : 2).translate(
        tx + s * 4,
        HEAD_TOP + 1.2,
        tz + 5,
      ),
      "hull",
      {
        color: CREAM_TOWER,
        texel: 1 / 5,
      },
    );
    add(
      cylY(0.8, 1.2, 30, 6).translate(tx - s * 14, HEAD_TOP + 15, tz - 6),
      "dark",
      {
        color: DARK,
        texel: 1 / 3,
      },
    );
    add(
      cylY(0.5, 0.8, 22, 6).translate(tx + s * 16, HEAD_TOP + 11, tz + 8),
      "dark",
      {
        color: DARK,
        texel: 1 / 3,
      },
    );
    if (fine) {
      add(
        boxMM(
          [tx - s * 14 - 1.5, HEAD_TOP + 22, tz - 9],
          [tx - s * 14 + 1.5, HEAD_TOP + 22.6, tz - 3],
        ),
        "dark",
        { color: DARK, texel: 1 / 2 },
      );
      add(
        boxMM(
          [tx - s * 14 - 6, HEAD_TOP + 26, tz - 6.4],
          [tx - s * 14 + 6, HEAD_TOP + 26.5, tz - 5.6],
        ),
        "dark",
        { color: DARK, texel: 1 / 2 },
      );
      const dish = new THREE.CylinderGeometry(3.4, 0.5, 1.8, 12, 1, false);
      dish.rotateX(-0.7);
      dish.rotateY(s * 0.5);
      dish.translate(tx + s * 16, HEAD_TOP + 23, tz + 8);
      add(dish, "hull", { color: CREAM_TOWER, texel: 1 / 3 });
      for (let i = 0; i < 6; i++)
        add(
          boxMM(
            [tx - 24 + i * 9, HEAD_TOP + 1.2, tz - 12],
            [tx - 20 + i * 9, HEAD_TOP + 2.4 + (i % 2), tz - 8],
          ),
          "dark",
          { color: DARK, texel: 1 / 3 },
        );
      // under-head equipment: boxes and a conduit ring hanging beneath the flared overhang
      for (const [dx, dz] of [
        [-24, -14],
        [24, -14],
        [-24, 14],
        [24, 14],
        [0, -18],
        [0, 18],
      ])
        add(
          boxMM(
            [tx + dx - 3, TOWER_TOP - 2, tz + dz - 3],
            [tx + dx + 3, TOWER_TOP + 3.5, tz + dz + 3],
          ),
          "dark",
          { color: DARK, texel: 1 / 3 },
        );
      for (const [dx, dz, sx, sz] of [
        [0, -19, 40, 1.2],
        [0, 19, 40, 1.2],
        [-27, 0, 1.2, 30],
        [27, 0, 1.2, 30],
      ])
        add(
          boxMM(
            [tx + dx - sx / 2, TOWER_TOP + 0.5, tz + dz - sz / 2],
            [tx + dx + sx / 2, TOWER_TOP + 1.7, tz + dz + sz / 2],
          ),
          "dark",
          { color: DARK, texel: 1 / 3 },
        );
    }
    // running lights on the tower cap and mast
    add(
      quadFacing(
        [tx - s * 14, HEAD_TOP + 30.4, tz - 6],
        [0, 1, 0],
        [0, 0, -1],
        1.4,
        1.4,
      ),
      "windows",
      { color: 0xffffff, uv: "keep" },
    );
  }

  // -------------------------------------------------------------------------
  // turrets: heavy dual turbolasers on the shoulders (tracking, drawn by the Fleet), light emplacements
  // on the wing edges, lower flanks and block ledges; hardpoints fire from the barrel tips
  // -------------------------------------------------------------------------
  for (const s of [-1, 1]) {
    for (const zr of TURRET_ZR) {
      const tx = s * turretX(zr);
      const tz = Z(zr);
      const y = yTop(zr) + 1.4;
      if (lod === 2) {
        add(boxMM([tx - 13, y, tz - 12], [tx + 13, y + 12, tz + 12]), "hull", {
          color: mulColor(CREAM, 0.9),
          texel: 1 / 6,
        });
      }
      if (lod === 0) {
        const fwd = [s * 0.42, 0, -1];
        turrets.push({
          type: "heavy",
          pos: [tx, y, tz],
          up: [0, 1, 0],
          forward: fwd,
        });
        hardpoints.push({
          pos: [tx, y + HEAVY.pivotY, tz],
          dir: new THREE.Vector3(...fwd)
            .normalize()
            .toArray()
            .map((v) => +v.toFixed(3)),
          kind: "heavy",
          range: 14000,
          turret: turrets.length - 1,
        });
      }
    }
  }
  if (lod === 0) {
    const light = (pos, dir, up) => {
      const d = new THREE.Vector3(...dir).normalize();
      turrets.push({ type: "light", pos, up, forward: d.toArray() });
      hardpoints.push({
        pos: pos.map((v) => +v.toFixed(2)),
        dir: d.toArray().map((v) => +v.toFixed(3)),
        kind: "light",
        range: 6000,
        turret: turrets.length - 1,
      });
    };
    for (const s of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const zr = 380 + i * 105;
        const x = s * (wDeck(zr) - 9);
        light([x, yTop(zr) + 1.4, Z(zr)], [s * 0.55, 0.2, -0.8], [0, 1, 0]);
      }
      // on the lower flank (angled hull)
      const jF = s > 0 ? EDGE.flankR : EDGE.flankL;
      for (const zr of [480, 680, 880]) {
        const fr = loftFrame(secs, jF, 0.55, Z(zr));
        const dir = fr.n
          .clone()
          .multiplyScalar(0.9)
          .add(new THREE.Vector3(0, 0, -0.5))
          .normalize();
        light(
          fr.p.clone().addScaledVector(fr.n, 1.0).toArray(),
          dir.toArray(),
          fr.n.toArray(),
        );
      }
      // block ledges
      for (const zr of [900, 1040])
        light(
          [s * (T1_W(zr) - 7), T1_Y + 1.4, Z(zr)],
          [s, 0.3, -0.3],
          [0, 1, 0],
        );
    }
  }
  if (mid) {
    // pads under the light emplacements so they sit on a mount, not bare plating
    for (const s of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const zr = 380 + i * 105;
        add(
          cylY(4.2, 4.6, 1.4, 8).translate(
            s * (wDeck(zr) - 9),
            yTop(zr) + 0.7,
            Z(zr),
          ),
          "hull",
          {
            color: mulColor(CREAM, 0.9),
            texel: 1 / 4,
          },
        );
      }
      const jF = s > 0 ? EDGE.flankR : EDGE.flankL;
      for (const zr of [480, 680, 880]) {
        const fr = loftFrame(secs, jF, 0.55, Z(zr));
        add(surfaceBox(fr, [10, 1.4, 10], { sink: 0.4 }), "hull", {
          color: mulColor(LOWER, 1.1),
          texel: 1 / 4,
        });
      }
      for (const zr of [900, 1040])
        add(
          cylY(4.2, 4.6, 1.4, 8).translate(
            s * (T1_W(zr) - 7),
            T1_Y + 0.7,
            Z(zr),
          ),
          "hull",
          {
            color: mulColor(CREAM, 0.9),
            texel: 1 / 4,
          },
        );
    }
  }

  // -------------------------------------------------------------------------
  // stern: heat-stained plate, nozzle bells with depth (plumes come from the fleet's engine system)
  // -------------------------------------------------------------------------
  {
    const zs = Z(1137);
    // stern plate: heat-stained hull armour with a dark recessed band that the main nozzles sit in
    add(boxMM([-248, -76, zs - 1], [248, 42, zs + 1.2]), "hull", {
      color: STERN,
      texel: hullTexel,
    });
    add(boxMM([-244, -62, zs + 1.2], [244, 14, zs + 1.9]), "dark", {
      color: DARK_RECESS,
      texel: 1 / 8,
    });
    // mounting pylons between the main nozzles, spanning the band and standing proud
    for (const px of [0, -101, 101, -195, 195]) {
      const hw = Math.abs(px) > 150 ? 5 : 6;
      add(boxMM([px - hw, -66, zs + 1.2], [px + hw, 17.5, zs + 5]), "hull", {
        color: mulColor(STERN, 0.9),
        texel: 1 / 6,
      });
      if (fine)
        add(boxMM([px - 2.5, -62, zs + 5], [px + 2.5, 14, zs + 6.2]), "dark", {
          color: DARK,
          texel: 1 / 3,
        });
    }
    // upper ledge under the small nozzles and a lower keel bumper
    add(boxMM([-200, 14, zs + 1.2], [200, 17.5, zs + 6]), "hull", {
      color: mulColor(STERN, 0.95),
      texel: 1 / 6,
    });
    add(boxMM([-140, -76, zs + 1.2], [140, -68, zs + 5]), "hull", {
      color: mulColor(STERN, 0.85),
      texel: 1 / 6,
    });
    if (mid) {
      // radiator fins across the upper stern between the small nozzles
      for (let i = 0; i < (fine ? 16 : 6); i++) {
        const x = -170 + i * (340 / (fine ? 15 : 5));
        if (Math.abs(Math.abs(x) - 115) < 13 || Math.abs(Math.abs(x) - 40) < 13)
          continue;
        add(boxMM([x - 1, 22, zs + 1.2], [x + 1, 40, zs + 3.5]), "dark", {
          color: DARK,
          texel: 1 / 3,
        });
      }
      // conduits along the band above the outer nozzles
      for (const s of [-1, 1])
        add(
          cylZ(1.4, 1.4, 60, 6)
            .rotateY(Math.PI / 2)
            .translate(s * 214, 12, zs + 3.2),
          "dark",
          {
            color: DARK,
            texel: 1 / 3,
          },
        );
      // scorch halos on the plate around the main and auxiliary nozzles
      if (fine)
        for (const [ex, ey, r] of ENGINES.slice(0, 6)) {
          const ring = new THREE.RingGeometry(
            r * 1.18,
            r * 1.75,
            16,
            1,
          ).toNonIndexed();
          const pos = ring.attributes.position;
          const col = new Float32Array(pos.count * 3);
          const inner = sootOf(STERN, 1);
          for (let i = 0; i < pos.count; i++) {
            const k = clamp(
              (Math.hypot(pos.getX(i), pos.getY(i)) - r * 1.18) / (r * 0.57),
              0,
              1,
            );
            col[i * 3] = lerp(inner.r, STERN.r, k);
            col[i * 3 + 1] = lerp(inner.g, STERN.g, k);
            col[i * 3 + 2] = lerp(inner.b, STERN.b, k);
          }
          ring.setAttribute("color", new THREE.BufferAttribute(col, 3));
          ring.translate(ex, ey, zs + 1.3);
          add(ring, "hull", { color: null, texel: hullTexel });
        }
    }
    for (const [ex, ey, r] of ENGINES) {
      const seg =
        lod === 0 ? (r > 20 ? 20 : r > 12 ? 16 : 12) : lod === 1 ? 12 : 8;
      const nz = nozzle(r, {
        seg,
        detail: lod === 0 ? (r > 12 ? 2 : 1) : lod === 1 ? 1 : 0,
        rings: 2,
        vanes: 8,
      });
      for (const g of nz.dark) {
        g.translate(ex, ey, zs + 1.2);
        add(g, "dark", { color: sootColor(DARK, zs + 60), texel: 1 / 8 });
      }
      // plume radius: the fleet's glow disc reads out to ~0.8 r and the plume flares to 1.3 r, so 0.85 x
      // the bell mouth keeps the glow inside the bell with the dark rim, rings and vanes visible around it
      if (lod === 0)
        engines.push({ pos: [ex, ey, zs + 1.2 + nz.mouth], r: r * 0.85 });
    }
  }

  // -------------------------------------------------------------------------
  // belly: keel spine with lit recesses, docking bays, plate groups; lower flank layers; trench machinery
  // -------------------------------------------------------------------------
  if (mid) {
    // keel spine: a hollow channel along the centreline whose ceiling is dark and lit in bays
    const spineZr = [400, 600, 800, 1000, 1080];
    const spine = loftProfile(
      spineZr.map((zr) => {
        const y = yBot(zr);
        return {
          z: Z(zr),
          pts: [
            [-14, y + 0.5],
            [14, y + 0.5],
            [12.5, y - 5],
            [10, y - 5],
            [10, y - 2],
            [-10, y - 2],
            [-10, y - 5],
            [-12.5, y - 5],
          ],
        };
      }),
      {
        tags: ["hull", "hull", "hull", "dark", "dark", "dark", "hull", "hull"],
        uv: hullTexel,
      },
    );
    add(spine.hull, "hull", hullOpts(mulColor(BELLY, 1.15)));
    add(spine.dark, "dark", { color: DARK_RECESS, texel: 1 / 6 });
    for (let zr = 420; zr < 1080; zr += 70) {
      const y = yBot(zr);
      add(
        boxMM([-14.5, y - 5.5, Z(zr) - 1.5], [14.5, y + 0.5, Z(zr) + 1.5]),
        "hull",
        {
          color: mulColor(BELLY, 1.25),
          texel: 1 / 6,
        },
      );
      if (fine) {
        const zm = Z(zr + 35);
        const ym = yBot(zr + 35) - 2.2;
        add(quadFacing([0, ym, zm], [0, -1, 0], [0, 0, 1], 3, 40), "windows", {
          color:
            zr % 140 === 0
              ? mulColor(HANGAR_BLUE, 0.7)
              : mulColor(HANGAR_WARM, 0.7),
          uv: "keep",
        });
      }
    }
    for (const s of [-1, 1]) {
      // two recessed docking bays per side, kept inside the flat belly (half width hw/2)
      for (const [zrA, zrB, xA, xB] of BELLY_BAYS) {
        const zc = Z((zrA + zrB) / 2);
        const jB = s > 0 ? EDGE.bellyR : EDGE.bellyL;
        const fr = loftFrame(secs, jB, 0.5, zc);
        const cx = s * ((xA + xB) / 2);
        const ymid = fr.p.y;
        const w = xB - xA;
        const d = Z(zrB) - Z(zrA);
        // dark recess plate, a raised hull frame around it, door leaves parted over a dim lit slot
        const m = frameMatrix(
          new THREE.Vector3(cx, ymid + 0.4, zc),
          fr.n,
          fr.v,
        );
        add(orientedBox([w, 1.2, d], m), "dark", {
          color: DARK_RECESS,
          texel: 1 / 8,
        });
        const mm = frameMatrix(
          new THREE.Vector3(cx, ymid - 0.35, zc),
          fr.n,
          fr.v,
        );
        add(orientedBox([w * 0.34, 0.6, d * 0.3], mm), "windows", {
          color: mulColor(HANGAR_WARM, 0.55),
          uv: "keep",
        });
        for (const k of [-1, 1]) {
          const md = frameMatrix(
            new THREE.Vector3(cx, ymid - 0.7, zc + k * (d * 0.29)),
            fr.n,
            fr.v,
          );
          add(orientedBox([w - 4, 1.6, d * 0.34], md), "hull", {
            color: sootColor(mulColor(BELLY, 1.1), zc),
            texel: plateTexel,
          });
          const mf = frameMatrix(
            new THREE.Vector3(cx, ymid - 0.9, zc + k * (d / 2 + 1.5)),
            fr.n,
            fr.v,
          );
          add(orientedBox([w + 6, 2.2, 3], mf), "hull", {
            color: sootColor(mulColor(BELLY, 1.25), zc),
            texel: 1 / 8,
          });
          const ms = frameMatrix(
            new THREE.Vector3(cx + k * (w / 2 + 1.5), ymid - 0.9, zc),
            fr.n,
            fr.v,
          );
          add(orientedBox([3, 2.2, d + 6], ms), "hull", {
            color: sootColor(mulColor(BELLY, 1.25), zc),
            texel: 1 / 8,
          });
        }
        if (fine) {
          for (const k of [-1, 1]) {
            const me = frameMatrix(
              new THREE.Vector3(cx + k * (w / 2 - 1.2), ymid - 0.25, zc),
              fr.n,
              fr.v,
            );
            add(orientedBox([0.8, 0.5, d - 4], me), "windows", {
              color: mulColor(HANGAR_BLUE, 0.7),
              uv: "keep",
            });
          }
          // small lit door-edge markers along the slot
          for (const k of [-1, 1])
            for (let i = 0; i < 4; i++) {
              const ml = frameMatrix(
                new THREE.Vector3(
                  cx - w * 0.3 + (i + 0.5) * ((w * 0.6) / 4),
                  ymid - 1.6,
                  zc + k * (d * 0.115),
                ),
                fr.n,
                fr.v,
              );
              add(orientedBox([1.2, 0.3, 0.8], ml), "windows", {
                color: WINDOW_WARM,
                uv: "keep",
              });
            }
        }
      }
      // belly plate groups (dark neutral), following the belly's slope
      const jB = s > 0 ? EDGE.bellyR : EDGE.bellyL;
      stripField(
        secs,
        jB,
        BELLY,
        {
          t0: s > 0 ? 0.16 : 0.06,
          t1: s > 0 ? 0.94 : 0.84,
          zr0: 340,
          zr1: 1080,
          max: fine ? 64 : 100,
          keep: 0.22,
          skip: 0.28,
        },
        (cv, ta, tb) => {
          const zr = cv - zBow;
          const wb = wBelly(zr);
          // x extent of the cell (edge runs -wB..0 on the port half, 0..wB on the starboard one)
          const xa = s > 0 ? ta * wb : (1 - tb) * wb;
          const xb = s > 0 ? tb * wb : (1 - ta) * wb;
          if (xa < 17) return true; // keel spine
          for (const [zrA, zrB, xA, xB] of BELLY_BAYS)
            if (zr > zrA - 8 && zr < zrB + 8 && xb > xA - 6 && xa < xB + 6)
              return true;
          return false;
        },
      );
    }
    // lower flank: two layered bands of long plates (upper band prouder), then smaller plates and the
    // flank insignia
    for (const s of [-1, 1]) {
      const jF = s > 0 ? EDGE.flankR : EDGE.flankL;
      // edge parameter t runs top-down on the starboard flank and bottom-up on the port one
      const tt = (t) => (s > 0 ? t : 1 - t);
      const insigniaClear = (zc, len) => Math.abs(zc - Z(600)) < len / 2 + 40;
      // t = 0 is the belly edge: the upper band (under the wing, in its shadow) stands prouder
      for (const [ta, tb, proud] of [
        [0.08, 0.44, 0.9],
        [0.5, 0.92, 1.6],
      ]) {
        let zr = 340;
        while (zr < 1075) {
          const len = fine ? 48 + rand() * 50 : 90 + rand() * 60;
          const zrb = Math.min(zr + len, 1078);
          const zc = Z((zr + zrb) / 2);
          const gapAfter = 3 + rand() * 3;
          if (!insigniaClear(zc, zrb - zr) && rand() > 0.12) {
            const fr = loftFrame(secs, jF, tt((ta + tb) / 2), zc);
            const elen = loftEdgeLength(secs, jF, zc);
            add(
              framePlate(fr, (tb - ta) * elen - 2, zrb - zr - 3, proud, 0.9, {
                texel: plateTexel,
                sink: 0.6,
              }),
              "hull",
              { color: plateTint(LOWER, zc), uv: "keep" },
            );
            if (fine && rand() < 0.5)
              add(
                framePlate(
                  fr,
                  (tb - ta) * elen * 0.4,
                  (zrb - zr) * 0.35,
                  proud + 0.6,
                  0.6,
                  { texel: 1 / 18, sink: 0.4 },
                  (rand() - 0.5) * (tb - ta) * elen * 0.4,
                  (rand() - 0.5) * (zrb - zr) * 0.4,
                ),
                "hull",
                { color: plateTint(LOWER, zc, { fade: 0.2 }), uv: "keep" },
              );
          }
          // groove across the flank at the plate joint
          if (mid) {
            const fg = loftFrame(secs, jF, 0.5, Z(zrb + gapAfter / 2));
            add(groove(fg, loftEdgeLength(secs, jF, Z(zrb)) - 4, 0.8), "dark", {
              color: DARK_SEAM,
              texel: 1 / 4,
            });
          }
          zr = zrb + gapAfter;
        }
      }
      // long groove between the two bands
      if (mid)
        for (const [zra, zrb] of [
          [340, 520],
          [520, 760],
          [760, 1000],
          [1000, 1078],
        ]) {
          const fg = loftFrame(secs, jF, tt(0.47), Z((zra + zrb) / 2));
          add(groove(fg, 0.8, Z(zrb) - Z(zra) - 1), "dark", {
            color: DARK_SEAM,
            texel: 1 / 4,
          });
        }
      // flank insignia: ring with a gap, painted on the angled lower flank
      {
        const ring = new THREE.RingGeometry(
          25,
          32,
          fine ? 40 : 18,
          1,
          0.35,
          Math.PI * 2 - 0.7,
        );
        ring.rotateZ(-Math.PI / 2);
        add(mapToLoft(secs, jF, 0.5, Z(600), ring, 0.35), "paint", {
          color: MAROON,
          texel: 1 / 16,
        });
        const dot = new THREE.CircleGeometry(6.5, fine ? 16 : 8);
        add(mapToLoft(secs, jF, 0.5, Z(600), dot, 0.35), "paint", {
          color: MAROON,
          texel: 1 / 16,
        });
      }
      // trench machinery: ribs, pipes, boxes, hanging modules and small lit bay doors on the recessed wall
      const jW = s > 0 ? EDGE.trenchWallR : EDGE.trenchWallL;
      const jU = s > 0 ? EDGE.wingUnderR : EDGE.wingUnderL;
      const jFl = s > 0 ? EDGE.trenchFloorR : EDGE.trenchFloorL;
      // long conduit runs following the trench wall and the wing underside, section by section.
      const runAlong = (j, t, off, r, zrA, zrB, color) => {
        const tw = s > 0 ? t : 1 - t;
        const stops = [
          zrA,
          ...SECTIONS_FULL.filter((z) => z > zrA && z < zrB),
          zrB,
        ];
        for (let i = 0; i + 1 < stops.length; i++) {
          const fa = loftFrame(secs, j, tw, Z(stops[i]));
          const fb = loftFrame(secs, j, tw, Z(stops[i + 1]));
          add(
            tube(
              fa.p.addScaledVector(fa.n, off),
              fb.p.addScaledVector(fb.n, off),
              r,
              6,
            ),
            "dark",
            {
              color,
              texel: 1 / 3,
            },
          );
        }
      };
      runAlong(jW, 0.14, 2.6, 2.4, 432, 1000, sootColor(DARK, Z(700)));
      if (fine) {
        runAlong(
          jW,
          0.5,
          1.9,
          1.5,
          450,
          985,
          sootColor(mulColor(DARK, 0.9), Z(700)),
        );
        runAlong(jW, 0.8, 1.6, 1.1, 460, 990, sootColor(DARK, Z(700)));
        runAlong(jU, 0.82, 1.8, 1.6, 445, 990, sootColor(DARK, Z(700)));
        runAlong(jFl, 0.5, 1.2, 1.0, 450, 990, sootColor(DARK, Z(700)));
      }
      for (let zr = 440; zr < 990; zr += fine ? 46 : 92) {
        const fr = loftFrame(secs, jW, 0.5, Z(zr));
        // structural rib spanning the trench height, standing proud of the wall
        const h = trenchH(zr);
        const ribM = frameMatrix(
          fr.p.clone().addScaledVector(fr.n, 6),
          fr.n,
          fr.v,
        );
        add(orientedBox([h - 1, 12, 3.2], ribM), "hull", {
          color: sootColor(mulColor(FLANK, 0.85), Z(zr)),
          texel: 1 / 6,
        });
      }
      for (let i = 0; i < (fine ? 56 : 14); i++) {
        const zr = 430 + rand() * 560;
        const t = 0.15 + rand() * 0.7;
        const fr = loftFrame(secs, jW, t, Z(zr));
        const kind = rand();
        if (kind < 0.3) {
          const len = 30 + rand() * 90;
          const r = 1.2 + rand() * 1.6;
          const m = frameMatrix(
            fr.p.clone().addScaledVector(fr.n, r + 0.5),
            fr.n,
            fr.v,
          );
          const pipe = new THREE.CylinderGeometry(r, r, len, 6);
          pipe.rotateX(Math.PI / 2);
          pipe.applyMatrix4(m);
          add(pipe, "dark", { color: DARK, texel: 1 / 3 });
        } else if (kind < 0.7) {
          // machinery block, some with a lit indicator strip
          const bw = 4 + rand() * 9;
          const bh = 2 + rand() * 7;
          const bd = 6 + rand() * 18;
          add(surfaceBox(fr, [bw, bh, bd]), "dark", {
            color: DARK,
            texel: 1 / 4,
          });
          if (fine && rand() < 0.4) {
            const p = fr.p.clone().addScaledVector(fr.n, bh - 0.25 + 0.3);
            add(
              quadFacing(p.toArray(), fr.n.toArray(), [0, 1, 0], 0.6, bd * 0.5),
              "windows",
              {
                color: rand() < 0.5 ? WINDOW_COOL : 0xff8060,
                uv: "keep",
              },
            );
          }
        } else {
          // lit bay door: dark frame with a warm lit slot
          add(surfaceBox(fr, [9, 0.6, 12]), "dark", {
            color: DARK_SEAM,
            texel: 1 / 3,
          });
          const p = fr.p.clone().addScaledVector(fr.n, 0.75);
          add(
            quadFacing(p.toArray(), fr.n.toArray(), [0, 1, 0], 7, 5),
            "windows",
            {
              color: HANGAR_WARM,
              uv: "keep",
            },
          );
        }
      }
      // hanging modules and machinery under the wing overhang
      if (fine)
        for (let i = 0; i < 30; i++) {
          const zr = 440 + rand() * 540;
          const fr = loftFrame(secs, jU, 0.3 + rand() * 0.5, Z(zr));
          if (rand() < 0.4) {
            // hanging module: a stalk and a heavier box below it
            const h1 = 2 + rand() * 3;
            add(surfaceBox(fr, [1.4, h1, 1.4]), "dark", {
              color: DARK,
              texel: 1 / 3,
            });
            const p = fr.p.clone().addScaledVector(fr.n, h1);
            const m = frameMatrix(p.addScaledVector(fr.n, 2.5), fr.n, fr.v);
            add(orientedBox([5 + rand() * 4, 5, 6 + rand() * 6], m), "dark", {
              color: DARK,
              texel: 1 / 3,
            });
          } else {
            add(
              surfaceBox(fr, [
                3 + rand() * 6,
                1.5 + rand() * 3,
                4 + rand() * 10,
              ]),
              "dark",
              {
                color: DARK,
                texel: 1 / 3,
              },
            );
          }
        }
      // trench floor machinery (the ledge at the bottom of the trench)
      if (fine)
        for (let i = 0; i < 16; i++) {
          const zr = 450 + rand() * 520;
          const fr = loftFrame(secs, jFl, 0.25 + rand() * 0.5, Z(zr));
          add(
            surfaceBox(fr, [3 + rand() * 5, 1.5 + rand() * 4, 5 + rand() * 12]),
            "dark",
            {
              color: DARK,
              texel: 1 / 3,
            },
          );
        }
    }
  }

  // -------------------------------------------------------------------------
  // weathering: soot streaks forward of the nozzles, scorch rings at fixed weathering points
  // -------------------------------------------------------------------------
  if (fine) {
    // belly streaks ahead of the four mains (the belly is the underside of the exhaust band)
    for (const s of [-1, 1]) {
      const jB = s > 0 ? EDGE.bellyR : EDGE.bellyL;
      for (const [xm, w, len] of [
        [40, 26, 170],
        [105, 30, 150],
      ]) {
        const zc = Z(1137 - len / 2 - 2);
        const wb = wBelly(zc - zBow);
        const t = s > 0 ? xm / wb : 1 - xm / wb;
        add(
          loftDecal(
            secs,
            jB,
            t,
            zc,
            w,
            len,
            streakFn(sootColor(BELLY, zc), 0.9),
            2,
            5,
          ),
          "hull",
          {
            color: null,
            texel: hullTexel,
          },
        );
      }
      // lower flank streaks ahead of the outer auxiliaries
      const jF = s > 0 ? EDGE.flankR : EDGE.flankL;
      add(
        loftDecal(
          secs,
          jF,
          s > 0 ? 0.3 : 0.7,
          Z(1050),
          34,
          150,
          streakFn(sootColor(LOWER, Z(1050)), 0.8),
          2,
          5,
        ),
        "hull",
        {
          color: null,
          texel: hullTexel,
        },
      );
    }
    // aft deck streaks behind the block, ahead of the four small upper nozzles, and on the terrace-1
    // ledges' aft ends where the stern band's heat washes over the edge
    for (const xm of [-115, -40, 40, 115])
      add(
        tintDecal(
          flat(xm, DECK_Y, Z(1111)),
          20,
          48,
          streakFn(sootColor(CREAM, Z(1120)), 0.95),
          2,
          4,
        ),
        "hull",
        {
          color: null,
          texel: hullTexel,
        },
      );
    for (const xm of [-138, 138])
      add(
        tintDecal(
          flat(xm, T1_Y, Z(1040)),
          16,
          84,
          streakFn(sootColor(CREAM, Z(1060)), 0.7),
          2,
          4,
        ),
        "hull",
        {
          color: null,
          texel: hullTexel,
        },
      );
    // scorch rings at the fixed weathering points (deck, wings, terraces, belly)
    const scorch = (frame, r, base) =>
      add(
        scorchDecal(frame, r, sootOf(base, 1).toArray(), base.toArray(), 16),
        "hull",
        {
          color: null,
          texel: hullTexel,
        },
      );
    for (const w of SCORCH_POINTS) scorch(flat(w.x, w.y, w.z), w.r, CREAM);
    const sootB = sootOf(BELLY, 1);
    add(loftScorch(secs, EDGE.bellyR, 0.55, Z(450), 9, sootB, BELLY), "hull", {
      color: null,
      texel: hullTexel,
    });
    add(loftScorch(secs, EDGE.bellyL, 0.4, Z(940), 8, sootB, BELLY), "hull", {
      color: null,
      texel: hullTexel,
    });
  }

  // -------------------------------------------------------------------------
  // ventral forward hangar mouth: lit interior strips and machinery in the notch
  // -------------------------------------------------------------------------
  if (mid) {
    for (const zr of fine ? [125, 150, 180, 215, 250, 285] : [130, 190, 260]) {
      const y = yBot(zr) + notchH(zr) - 0.4;
      const w = notchW(zr) * 2 - 8;
      add(
        quadFacing([0, y, Z(zr)], [0, -1, 0], [0, 0, 1], w * 0.9, 1.4),
        "windows",
        {
          color: HANGAR_WARM,
          uv: "keep",
        },
      );
    }
    for (const s of [-1, 1]) {
      // blue guide strips along the notch walls, and machinery blocks hanging from the ceiling
      const zr0 = 118;
      const zr1 = 300;
      const zm = (zr0 + zr1) / 2;
      const yW = yBot(zm) + notchH(zm) * 0.35;
      add(
        quadFacing(
          [s * (notchW(zm) - 0.6), yW, Z(zm)],
          [-s, 0, 0],
          [0, 1, 0],
          Z(zr1) - Z(zr0),
          0.8,
        ),
        "windows",
        { color: HANGAR_BLUE, uv: "keep" },
      );
      if (fine)
        for (let i = 0; i < 8; i++) {
          const zr = 125 + rand() * 150;
          const y = yBot(zr) + notchH(zr);
          const x = s * (6 + rand() * (notchW(zr) - 14));
          add(
            boxMM(
              [x - 3, y - 4 - rand() * 3, Z(zr) - 3],
              [x + 3, y + 0.5, Z(zr) + 3],
            ),
            "dark",
            {
              color: DARK,
              texel: 1 / 3,
            },
          );
        }
    }
    // lip lights around the mouth
    for (const s of [-1, 1])
      add(
        quadFacing(
          [s * 62, yBot(108) + 2, Z(108) - 0.3],
          [0, 0, -1],
          [0, 1, 0],
          16,
          0.8,
        ),
        "windows",
        {
          color: HANGAR_BLUE,
          uv: "keep",
        },
      );
  }

  // -------------------------------------------------------------------------
  // running lights along the hull edges
  // -------------------------------------------------------------------------
  if (mid) {
    const nav = (pos, dir, color) =>
      add(quadFacing(pos, dir, [0, 1, 0], 1.6, 1.6), "windows", {
        color,
        uv: "keep",
      });
    for (const s of [-1, 1]) {
      const col = s > 0 ? 0x40ff70 : 0xff3838;
      nav([s * 37, prongTop(-4) + 0.3, Z(-3.8)], [0, 1, 0], col);
      nav(
        [s * (halfW(830) + 0.3), yTop(830) - SHOULDER - 2, Z(830)],
        [s, 0, 0],
        col,
      );
      nav(
        [s * (halfW(1030) + 0.3), yTop(1030) - SHOULDER - 2, Z(1030)],
        [s, 0, 0],
        col,
      );
      nav([s * 248, 42, Z(1137) + 1.6], [0, 0, 1], 0xffffff);
      nav([s * 150, T1_Y + 0.3, Z(BLOCK_Z0 + 12)], [0, 1, 0], 0xffffff);
      nav([s * 150, T1_Y + 0.3, Z(BLOCK_Z1 - 8)], [0, 1, 0], 0xffffff);
      for (const zr of [450, 700])
        nav(
          [s * (halfW(zr) * 0.5 + 2), yBot(zr) - 0.3, Z(zr)],
          [0, -1, 0],
          0xffffff,
        );
    }
  }

  return { parts, hardpoints, engines, turrets };
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
          bodyColor: mulColor(CREAM, 0.92),
          barrelColor: DARK,
          texel: 1 / 5,
          ...HEAVY,
        },
        light: {
          body: light.body,
          barrels: light.barrels,
          bodyMaterial: "hull",
          barrelMaterial: "dark",
          bodyColor: mulColor(CREAM, 0.9),
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

// Same ship with the dorsal doors slid apart over a deep lit hangar bay.
export function buildVenatorOpen(mats) {
  return build(mats, { open: true });
}
