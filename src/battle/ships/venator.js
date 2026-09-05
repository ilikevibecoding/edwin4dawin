// Venator-class attack cruiser (Republic), 1137 m. Original procedural geometry after the film's design
// language: a long arrowhead wedge with a wide flat dorsal flight deck (two door halves with a deep seam,
// maroon edge panels, a split maroon bow wedge, ring insignia), shoulder wings with red trim, recessed
// machinery trenches under the wings, a split-prow bow with a lit ventral hangar mouth, a raised rear block
// carrying twin bridge towers with window rows, eight heavy dual turbolaser turrets on the shoulders and a
// stern cluster of deep nozzles with blue-white cores and additive haze. Three complete LODs; geometry is
// built once and instanced by the Fleet. `buildVenatorOpen` is the same ship with the deck doors parted.
import * as THREE from "three";
import { assemble, boxMM, cylY, part } from "./shipKit.js";
import {
  rng,
  lerp,
  clamp,
  pw,
  loftProfile,
  loftFrame,
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
  radialColors,
  fadeZ,
  partition,
  jitterColor,
  mulColor,
} from "./venatorKit.js";

export const VENATOR = { length: 1137, width: 548, height: 268 };

const L = VENATOR.length;
const zBow = -L / 2;
const zStern = L / 2;
// zr = metres aft of the bow tip
const Z = (zr) => zBow + zr;

// ---- palette (vertex tints; the hull/dark textures are multiplied by these in linear space)
const HULL = 0xcdc6ba; // warm light grey armour
const HULL_TOWER = 0xc4bdb2;
const DARK = 0xc8ccd2; // machinery greebles (dark texture x light tint = readable dark grey)
const DARK_RECESS = 0x9a9ea6; // trench walls, hangar interiors
const DARK_SEAM = 0x8a8d94;
const MAROON = 0x621a1a;
const RED_TRIM = 0x7e2320;
const WINDOW_WARM = 0xffe2b0;
const WINDOW_COOL = 0xd6e6ff;
const HANGAR_WARM = 0xffd9a0;
const HANGAR_BLUE = 0x9cc8ff;

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
      [300, 42],
      [500, 44],
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

// 18-point cross section, counter-clockwise seen from astern (bottom edge running +x)
function hullProfile(zr) {
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
  const wBelly = hw * 0.5;
  const nW = notchW(zr);
  const nH = notchH(zr);
  const right = [
    [wBelly, yb],
    [wLow, yLow],
    [hw - r, yTB],
    [hw - r, yTT],
    [hw, yTT],
    [hw, ySh],
    [wd, yt],
  ];
  return [
    [-wBelly, yb],
    [-nW, yb],
    [-nW, yb + nH],
    [nW, yb + nH],
    [nW, yb],
    ...right,
    ...right
      .slice()
      .reverse()
      .map(([x, y]) => [-x, y]),
  ];
}
const HULL_TAGS = [
  "hull", // 0 belly (port half)
  "dark", // 1 hangar notch wall
  "dark", // 2 hangar notch ceiling
  "dark", // 3 hangar notch wall
  "hull", // 4 belly (starboard half)
  "hull", // 5 lower flank
  "dark", // 6 trench floor
  "dark", // 7 trench wall
  "dark", // 8 wing underside
  "hull", // 9 wing edge
  "hull", // 10 shoulder chamfer
  "hull", // 11 deck
  "hull", // 12 shoulder chamfer
  "hull", // 13 wing edge
  "dark", // 14 wing underside
  "dark", // 15 trench wall
  "dark", // 16 trench floor
  "hull", // 17 lower flank
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
  deck: 11,
  chamferL: 12,
  wingEdgeL: 13,
  wingUnderL: 14,
  trenchWallL: 15,
  trenchFloorL: 16,
  flankL: 17,
};
const SECTIONS_FULL = [
  108, 150, 210, 280, 330, 420, 520, 640, 760, 830, 920, 1000, 1030, 1080, 1110,
  1137,
];
const SECTIONS_FAR = [108, 210, 330, 520, 830, 1030, 1137];

function hullSections(zrs) {
  return zrs.map((zr) => ({ z: Z(zr), pts: hullProfile(zr) }));
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
const PRONG_TAGS = ["hull", "hull", "hull", "hull", "hull", "dark"];
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
  s > 0 ? boxMM([x0, y0, z0], [x1, y1, z1]) : boxMM([-x1, y0, z0], [-x0, y1, z1]);

// ---- layout constants
const DOOR_Z0 = 255;
const DOOR_Z1 = 800;
const DOOR_X0 = 4;
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
  zr < 876 ? 116 + (2 * (zr - 850)) / 26 : lerp(118, 128, (zr - 876) / (1070 - 876));
// tower shaft half sizes along y (tapers toward the head)
const SHAFT_HX = (y) =>
  lerp(15.5, 12.5, clamp((y - 92) / (TOWER_TOP - 92), 0, 1));
const SHAFT_HZ = (y) =>
  lerp(21.5, 18, clamp((y - 92) / (TOWER_TOP - 92), 0, 1));
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

// soot and heat toward the stern: darker and warmer with distance past zr 880
function sootAt(z) {
  const k = clamp((z - Z(880)) / (Z(1137) - Z(880)), 0, 1);
  return [1 - 0.34 * k * k, 1 - 0.38 * k * k, 1 - 0.45 * k * k];
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
  const add = (geo, mat, opts = {}) => {
    const p = part(geo, mat, { lod, ...opts });
    parts.push(p);
    return p;
  };
  const fine = lod === 0;
  const mid = lod <= 1;

  // -------------------------------------------------------------------------
  // main hull
  // -------------------------------------------------------------------------
  const secs = hullSections(lod === 2 ? SECTIONS_FAR : SECTIONS_FULL);
  const hullGeos = loftProfile(secs, { tags: HULL_TAGS });
  const hullPart = add(hullGeos.hull, "hull", { color: HULL, texel: 1 / 22 });
  shadeGeometry(hullPart.geo, (x, y, z, c) => {
    const s = sootAt(z);
    c.r *= s[0];
    c.g *= s[1];
    c.b *= s[2];
    // grime under the shoulder wings: the top of the lower flank sits in the wing's shadow
    const zr = z - zBow;
    const yTB = yTrenchBot(zr);
    if (Math.abs(x) > halfW(zr) * 0.6 && y > yTB - 22 && y < yTB + 1) {
      const k = clamp((y - (yTB - 22)) / 22, 0, 1);
      c.multiplyScalar(1 - 0.28 * k);
    }
  });
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
    const pr = loftProfile(prongSecs, { tags: PRONG_TAGS });
    add(pr.hull, "hull", { color: HULL, texel: 1 / 18 });
    add(pr.dark, "dark", { color: DARK_RECESS, texel: 1 / 8 });
    if (fine) {
      // raised plates and a few hatches on the sloping prong tops (edge 4 is the top face)
      for (let zr = 14; zr < 104; zr += 9 + rand() * 6) {
        const fr = loftFrame(prongSecs, 4, 0.2 + rand() * 0.6, Z(zr));
        if (fr.n.y < 0) fr.n.negate();
        const wTop = prongOut(zr) - prongIn(zr);
        const w = wTop * (0.2 + rand() * 0.3);
        add(surfaceBox(fr, [w, 0.6 + rand() * 0.6, 7 + rand() * 5]), "hull", { color: jitterColor(rand, HULL, 0.07, 0.02), texel: 1 / 10 });
        if (rand() < 0.4) add(surfaceBox(fr, [2.4, 1.1, 2.4], { du: (rand() - 0.5) * w * 0.5 }), "dark", { color: DARK, texel: 1 / 3 });
      }
      // light strips on the inner notch walls of the prongs
      for (const zr of [30, 62, 94]) {
        const fr = loftFrame(prongSecs, 5, 0.5, Z(zr));
        if (fr.n.x * s > 0) fr.n.negate();
        const p = fr.p.clone().addScaledVector(fr.n, 0.2);
        add(quadFacing(p.toArray(), fr.n.toArray(), [0, 1, 0], 10, 0.8), "windows", { color: HANGAR_BLUE, uv: "keep" });
      }
    }
  }

  // -------------------------------------------------------------------------
  // dorsal flight deck: doors, seam, maroon panels, bow wedge, insignia
  // -------------------------------------------------------------------------
  const doorShift = open ? 58 : 0;
  const z0 = Z(DOOR_Z0);
  const z1 = Z(DOOR_Z1);
  // centre seam groove (deep) and a lit hangar when the doors are parted
  if (!open) {
    add(boxMM([-4.5, DECK_Y - 1.5, z0], [4.5, DECK_Y + 4.2, z1]), "dark", {
      color: DARK_SEAM,
      texel: 1 / 6,
    });
    // door sills at both ends
    add(boxMM([-100, DECK_Y, z0 - 7], [100, DECK_Y + 2.6, z0 + 1]), "hull", {
      color: HULL,
      texel: 1 / 12,
    });
  }
  for (const s of [-1, 1]) {
    const x0 = DOOR_X0 + doorShift;
    const x1 = DOOR_X1 + doorShift;
    if (lod === 2) {
      add(mbox(s, x0, x1, DECK_Y - 1, DECK_Y + 6, z0, z1), "hull", {
        color: HULL,
        texel: 1 / 16,
      });
    } else {
      const prof = [
        [x0, DECK_Y - 1],
        [x1, DECK_Y - 1],
        [x1, DECK_Y + 4],
        [x1 - 3, DECK_Y + 6],
        [x0 + 2.5, DECK_Y + 6],
        [x0, DECK_Y + 4],
      ].map(([x, y]) => [s * x, y]);
      const g = loftProfile([
        { z: z0, pts: prof },
        { z: z1, pts: prof },
      ]);
      add(g.hull, "hull", { color: HULL, texel: 1 / 16 });
    }
    const top = DECK_Y + 6;
    // maroon outer-edge panels in three long segments, thin inner stripe, forward block
    for (const [a, b] of [
      [270, 400],
      [414, 560],
      [574, 722],
    ])
      add(mbox(s, x0 + 68, x0 + 87, top, top + 0.5, Z(a), Z(b)), "paint", { color: MAROON, texel: 1 / 16 });
    add(mbox(s, x0 + 4, x0 + 12, top, top + 0.5, Z(268), Z(786)), "paint", { color: MAROON, texel: 1 / 16 });
    add(mbox(s, x0 + 26, x0 + 56, top, top + 0.5, Z(262), Z(292)), "paint", { color: MAROON, texel: 1 / 16 });
    if (mid) {
      // hull-grey separator plates between the maroon segments
      for (const zz of [407, 567])
        add(mbox(s, x0 + 66, x0 + 89, top, top + 0.6, Z(zz - 4), Z(zz + 4)), "hull", {
          color: jitterColor(rand, HULL, 0.05),
          texel: 1 / 10,
        });
      // transverse door seams and two longitudinal panel lines
      for (let zz = 300; zz < 790; zz += 55)
        add(mbox(s, x0 + 4, x0 + 88, top - 0.15, top + 0.25, Z(zz) - 0.45, Z(zz) + 0.45), "dark", {
          color: DARK_SEAM,
          texel: 1 / 4,
        });
      for (const xx of [x0 + 30, x0 + 62])
        add(mbox(s, xx - 0.4, xx + 0.4, top - 0.15, top + 0.25, Z(295), Z(790)), "dark", {
          color: DARK_SEAM,
          texel: 1 / 4,
        });
      // ring insignia (original mark: ring with a forward gap and a centre dot)
      const cx = s * (x0 + 42);
      add(
        ringFacing([cx, top + 0.45, Z(600)], [0, 1, 0], [-1, 0, 0], 16, 21, lod === 0 ? 40 : 18, 0.9),
        "paint", { color: MAROON, texel: 1 / 16 },
      );
      const dot = new THREE.CircleGeometry(4, lod === 0 ? 16 : 8);
      dot.rotateX(-Math.PI / 2);
      dot.translate(cx, top + 0.45, Z(600));
      add(dot, "paint", { color: MAROON, texel: 1 / 16 });
    }
    if (fine) {
      // intermediate transverse seams, a hatch row beside the centre seam, deck-edge running lights
      for (let zz = 327; zz < 790; zz += 55)
        add(mbox(s, x0 + 14, x0 + 64, top - 0.15, top + 0.22, Z(zz) - 0.35, Z(zz) + 0.35), "dark", {
          color: DARK_SEAM,
          texel: 1 / 4,
        });
      for (let zz = 300; zz < 786; zz += 18) {
        if (rand() < 0.25) continue;
        add(mbox(s, x0 + 14.5, x0 + 17.5, top + 0.5, top + 0.85, Z(zz) - 1.5, Z(zz) + 1.5), "dark", { color: DARK, texel: 1 / 3 });
      }
      for (let zz = 280; zz < 790; zz += 36)
        add(quadFacing([s * (x1 - 3.8), top + 0.3, Z(zz)], [0, 1, 0], [0, 0, -1], 1.2, 1.2), "windows", {
          color: zz % 72 === 280 % 72 ? 0xffffff : WINDOW_WARM,
          uv: "keep",
        });
      // raised plate groups on the door tops between the stripes
      const cells = partition(rand, { u0: x0 + 16, u1: x0 + 66, v0: Z(296), v1: Z(786) }, { max: 24, keep: 0.2 });
      for (const c of cells) {
        const cu = (c.u0 + c.u1) / 2;
        const cv = (c.v0 + c.v1) / 2;
        if (Math.hypot(cu - (x0 + 42), cv - Z(600)) < 30) continue;
        if (rand() < 0.42) continue;
        const inset = 1.4;
        const th = 0.5 + rand() * 0.8;
        add(mbox(s, c.u0 + inset, c.u1 - inset, top - 0.2, top + th, c.v0 + inset, c.v1 - inset), "hull", {
          color: jitterColor(rand, HULL, 0.07, 0.015),
          texel: 1 / 12,
        });
        if (rand() < 0.3) {
          const w = (c.u1 - c.u0) * (0.35 + rand() * 0.3);
          const d = (c.v1 - c.v0) * (0.35 + rand() * 0.3);
          add(mbox(s, cu - w / 2, cu + w / 2, top + th, top + th + 0.5, cv - d / 2, cv + d / 2), "hull", {
            color: jitterColor(rand, HULL, 0.08, 0.02),
            texel: 1 / 8,
          });
        } else if (rand() < 0.35) {
          add(mbox(s, cu - 2.2, cu + 2.2, top + th, top + th + 0.4, cv - 2.2, cv + 2.2), "dark", {
            color: DARK,
            texel: 1 / 4,
          });
        }
      }
    }
  }
  // split maroon bow wedge following the sloping bow deck
  {
    const zrs = lod === 2 ? [74, 108, 240] : [74, 90, 108, 150, 200, 240];
    for (const s of [-1, 1]) {
      const secsW = zrs.map((zr) => {
        const xi = zr < 108 ? prongIn(zr) + 3 : 4.5;
        const xo = Math.min(10 + (zr - 40) * 0.4, zr < 108 ? halfW(zr) - 8 : 96);
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
      // grey border plates framing the wedge's rear edge and a dark seam ahead of the doors
      add(boxMM([-92, DECK_Y - 0.6, Z(240)], [92, DECK_Y + 1.4, Z(247)]), "hull", {
        color: HULL,
        texel: 1 / 10,
      });
    }
  }

  // hangar bay revealed when the doors are open
  if (open) {
    const gap = DOOR_X0 + doorShift;
    const floorY = DECK_Y - 30;
    add(boxMM([-gap, floorY - 2, z0], [gap, floorY, z1]), "dark", {
      color: DARK_RECESS,
      texel: 1 / 10,
    });
    for (const s of [-1, 1]) {
      add(mbox(s, gap - 2, gap, floorY, DECK_Y + 0.5, z0, z1), "dark", {
        color: DARK_RECESS,
        texel: 1 / 8,
      });
      // warm light strips along the walls, blue landing strips on the floor
      const strip = (yy, col, w) =>
        add(quadFacing([s * (gap - 2.2), yy, (z0 + z1) / 2], [-s, 0, 0], [0, 1, 0], z1 - z0 - 20, w), "windows", {
          color: col,
          uv: "keep",
        });
      strip(floorY + 4, HANGAR_WARM, 1.2);
      strip(DECK_Y - 4, HANGAR_WARM, 0.8);
      add(quadFacing([s * (gap * 0.5), floorY + 0.15, (z0 + z1) / 2], [0, 1, 0], [0, 0, -1], 1.6, z1 - z0 - 30), "windows", {
        color: HANGAR_BLUE,
        uv: "keep",
      });
    }
    add(boxMM([-gap, floorY, z0 - 6], [gap, DECK_Y, z0]), "dark", { color: DARK_RECESS, texel: 1 / 8 });
    add(boxMM([-gap, floorY, z1], [gap, DECK_Y, z1 + 6]), "dark", { color: DARK_RECESS, texel: 1 / 8 });
    // floor light panels: the big glow that reads from a distance
    for (let zz = DOOR_Z0 + 40; zz < DOOR_Z1 - 40; zz += 60)
      add(quadFacing([0, floorY + 0.2, Z(zz)], [0, 1, 0], [0, 0, -1], gap * 1.4, 14), "windows", {
        color: mulColor(HANGAR_WARM, 0.85),
        uv: "keep",
      });
    if (mid) {
      // gantries and parked craft as dark blocks
      for (let i = 0; i < (fine ? 26 : 10); i++) {
        const w = 6 + rand() * 12;
        const h = 3 + rand() * 6;
        const d = 8 + rand() * 14;
        const xx = (rand() - 0.5) * (gap * 1.5);
        const zz = Z(DOOR_Z0 + 30 + rand() * (DOOR_Z1 - DOOR_Z0 - 60));
        add(boxMM([xx - w / 2, floorY, zz - d / 2], [xx + w / 2, floorY + h, zz + d / 2]), "dark", {
          color: DARK,
          texel: 1 / 5,
        });
      }
      for (const s of [-1, 1])
        for (let zz = DOOR_Z0 + 20; zz < DOOR_Z1 - 20; zz += 45)
          add(mbox(s, gap - 6, gap - 2, floorY, DECK_Y - 2, Z(zz) - 1.5, Z(zz) + 1.5), "hull", {
            color: HULL,
            texel: 1 / 6,
          });
    }
  }

  // -------------------------------------------------------------------------
  // shoulder wings: red trim, plating fields, edge windows
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
      add(mbox(s, 104, 128, DECK_Y + 0.05, DECK_Y + 0.55, Z(362), Z(424)), "paint", { color: RED_TRIM, texel: 1 / 16 });
      add(mbox(s, 106, 146, DECK_Y + 0.05, DECK_Y + 0.55, Z(646), Z(672)), "paint", { color: RED_TRIM, texel: 1 / 16 });
    }
    if (mid) {
      // plating on the wing top: partition the bounding rectangle, clip to the diagonal edge
      const cells = partition(
        rand,
        { u0: 100, u1: 252, v0: Z(330), v1: Z(786) },
        { max: fine ? 26 : 44, keep: 0.2 },
      );
      for (const c of cells) {
        const zr0 = c.v0 - zBow;
        const limit = wDeck(zr0) - 3;
        if (c.u0 > limit - 6) continue;
        const u1 = Math.min(c.u1, limit);
        const cu = (c.u0 + u1) / 2;
        const cv = (c.v0 + c.v1) / 2;
        const tx = 96 + 0.5 * (wDeck(cv - zBow) - 96);
        let nearTurret = false;
        for (const tz of TURRET_ZR) if (Math.hypot(cu - tx, cv - Z(tz)) < 26) nearTurret = true;
        if (nearTurret) continue;
        if (rand() < (fine ? 0.4 : 0.55)) continue;
        const inset = 1.6;
        const th = 0.6 + rand() * 1.2;
        const y = yTop(cv - zBow);
        add(mbox(s, c.u0 + inset, u1 - inset, y - 0.3, y + th, c.v0 + inset, c.v1 - inset), "hull", {
          color: sootColor(jitterColor(rand, HULL, 0.07, 0.02), cv),
          texel: 1 / 12,
        });
        if (!fine) continue;
        const r = rand();
        if (r < 0.3) {
          const w = (u1 - c.u0) * (0.3 + rand() * 0.35);
          const d = (c.v1 - c.v0) * (0.3 + rand() * 0.35);
          const ox = (rand() - 0.5) * (u1 - c.u0 - w) * 0.8;
          const oz = (rand() - 0.5) * (c.v1 - c.v0 - d) * 0.8;
          add(mbox(s, cu + ox - w / 2, cu + ox + w / 2, y + th, y + th + 0.5 + rand() * 0.5, cv + oz - d / 2, cv + oz + d / 2), "hull", {
            color: sootColor(jitterColor(rand, HULL, 0.08, 0.02), cv),
            texel: 1 / 8,
          });
        } else if (r < 0.5) {
          add(mbox(s, cu - 2.5, cu + 2.5, y + th, y + th + 0.45, cv - 2.5, cv + 2.5), "dark", {
            color: DARK,
            texel: 1 / 4,
          });
        } else if (r < 0.62) {
          // vent grille block
          add(mbox(s, cu - 4, cu + 4, y + th, y + th + 1.2, cv - 1.6, cv + 1.6), "dark", {
            color: DARK,
            texel: 1 / 4,
          });
        } else if (r < 0.7) {
          // short pipe run with two supports
          const len = Math.min(24, (c.v1 - c.v0) - 6);
          const pipe = cylZ(0.7, 0.7, len, 6).translate(s * cu, y + th + 0.9, cv);
          add(pipe, "dark", { color: DARK, texel: 1 / 3 });
          for (const dz of [-len / 2 + 2, len / 2 - 2])
            add(mbox(s, cu - 1, cu + 1, y + th, y + th + 0.9, cv + dz - 0.6, cv + dz + 0.6), "dark", {
              color: DARK,
              texel: 1 / 3,
            });
        }
      }
      // chamfer plates: long thin strips on the sloped shoulder band
      if (fine) {
        const jEdge = s > 0 ? EDGE.chamferR : EDGE.chamferL;
        for (let zr = 350; zr < 1060; zr += 34) {
          if (rand() < 0.25) continue;
          const zz = Z(zr + 17);
          const fr = loftFrame(secs, jEdge, 0.5, zz);
          const len = 24 + rand() * 6;
          add(surfaceBox(fr, [9, 0.7 + rand() * 0.5, len]), "hull", {
            color: sootColor(jitterColor(rand, HULL, 0.07, 0.02), zz),
            texel: 1 / 10,
          });
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
          add(quadFacing(p.toArray(), fr.n.toArray(), [0, 1, 0], 1.7, 1.15), "windows", {
            color: rand() < 0.8 ? WINDOW_WARM : WINDOW_COOL,
            uv: "keep",
          });
        }
        zr += 12 + rand() * 40;
      }
    } else if (mid) {
      const jEdge = s > 0 ? EDGE.wingEdgeR : EDGE.wingEdgeL;
      for (let zr = 360; zr < 1000; zr += 90) {
        const fr = loftFrame(secs, jEdge, 0.5, Z(zr + 20));
        const p = fr.p.clone().addScaledVector(fr.n, 0.15);
        add(quadFacing(p.toArray(), fr.n.toArray(), [0, 1, 0], 34, 1.1), "windows", {
          color: WINDOW_WARM,
          uv: "keep",
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // rear block: two terraces, hump between the towers, plating, greeble field
  // -------------------------------------------------------------------------
  // plate field on a flat horizontal rectangle at height y (raised plates with sub-plates and hatches)
  const plateRect = (x0, x1, zr0, zr1, y, { max = 26, skip = 0.4, avoid = null, thick = [0.6, 1.6] } = {}) => {
    const cells = partition(rand, { u0: x0, u1: x1, v0: Z(zr0), v1: Z(zr1) }, { max, keep: 0.2 });
    for (const c of cells) {
      const cu = (c.u0 + c.u1) / 2;
      const cv = (c.v0 + c.v1) / 2;
      if (avoid && avoid(c)) continue;
      if (rand() < skip) continue;
      const inset = 1.5;
      const th = thick[0] + rand() * (thick[1] - thick[0]);
      const col = sootColor(jitterColor(rand, HULL, 0.08, 0.02), cv);
      add(boxMM([c.u0 + inset, y - 0.3, c.v0 + inset], [c.u1 - inset, y + th, c.v1 - inset]), "hull", {
        color: col,
        texel: 1 / 12,
      });
      if (!fine) continue;
      const r = rand();
      if (r < 0.3) {
        const w = (c.u1 - c.u0) * (0.3 + rand() * 0.35);
        const d = (c.v1 - c.v0) * (0.3 + rand() * 0.35);
        const ox = (rand() - 0.5) * (c.u1 - c.u0 - w) * 0.8;
        const oz = (rand() - 0.5) * (c.v1 - c.v0 - d) * 0.8;
        add(boxMM([cu + ox - w / 2, y + th, cv + oz - d / 2], [cu + ox + w / 2, y + th + 0.5 + rand() * 0.5, cv + oz + d / 2]), "hull", {
          color: sootColor(jitterColor(rand, HULL, 0.08, 0.02), cv),
          texel: 1 / 8,
        });
      } else if (r < 0.5) {
        add(boxMM([cu - 2.4, y + th, cv - 2.4], [cu + 2.4, y + th + 0.4, cv + 2.4]), "dark", { color: DARK, texel: 1 / 4 });
      } else if (r < 0.6) {
        add(boxMM([cu - 4, y + th, cv - 1.5], [cu + 4, y + th + 1.1, cv + 1.5]), "dark", { color: DARK, texel: 1 / 4 });
      }
    }
  };
  // plate field on a vertical face x = xAt(zr) facing nx, between y0..y1
  const plateWall = (xAt, nx, y0, y1, zr0, zr1, { max = 18, skip = 0.45 } = {}) => {
    const cells = partition(rand, { u0: y0, u1: y1, v0: Z(zr0), v1: Z(zr1) }, { max, keep: 0.2 });
    for (const c of cells) {
      if (rand() < skip) continue;
      const cv = (c.v0 + c.v1) / 2;
      const th = 0.5 + rand() * 1.0;
      const x = xAt(cv - zBow);
      const xa = nx > 0 ? x - 0.3 : x - th;
      const xb = nx > 0 ? x + th : x + 0.3;
      add(boxMM([xa, c.u0 + 1.2, c.v0 + 1.2], [xb, c.u1 - 1.2, c.v1 - 1.2]), "hull", {
        color: sootColor(jitterColor(rand, HULL, 0.08, 0.02), cv),
        texel: 1 / 10,
      });
    }
  };
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
    return loftProfile(secsB);
  };
  {
    const t1 = terrace(BLOCK_Z0, BLOCK_Z1, 148, 158, T1_Y, 22);
    const p1 = add(t1.hull, "hull", { color: HULL, texel: 1 / 14 });
    fadeZ(p1.geo, Z(880), Z(1137), [1, 1, 1], [0.7, 0.66, 0.6]);
    shadeGeometry(p1.geo, (x, y, z, c) => c.multiply(new THREE.Color(HULL)));
    const t2 = terrace(850, 1070, 116, 128, T2_Y, 26);
    const p2 = add(t2.hull, "hull", { color: HULL, texel: 1 / 14 });
    fadeZ(p2.geo, Z(880), Z(1137), [1, 1, 1], [0.74, 0.7, 0.65]);
    shadeGeometry(p2.geo, (x, y, z, c) => c.multiply(new THREE.Color(HULL)));
    // hump between the tower shafts (sloped front), the high walkway, and an aft antenna platform
    const hump = loftProfile([
      { z: Z(924), pts: [[-40, T2_Y - 1], [40, T2_Y - 1], [40, T2_Y + 2], [-40, T2_Y + 2]] },
      { z: Z(940), pts: [[-40, T2_Y - 1], [40, T2_Y - 1], [40, T2_Y + 16], [-40, T2_Y + 16]] },
      { z: Z(990), pts: [[-40, T2_Y - 1], [40, T2_Y - 1], [40, T2_Y + 16], [-40, T2_Y + 16]] },
      { z: Z(1002), pts: [[-40, T2_Y - 1], [40, T2_Y - 1], [40, T2_Y + 6], [-40, T2_Y + 6]] },
    ]);
    add(hump.hull, "hull", { color: mulColor(HULL, 0.94), texel: 1 / 10 });
    add(boxMM([-44, 130, Z(950)], [44, 134.5, Z(972)]), "hull", {
      color: mulColor(HULL, 0.92),
      texel: 1 / 8,
    });
    add(boxMM([-34, T2_Y - 1, Z(1010)], [34, T2_Y + 9, Z(1062)]), "hull", {
      color: sootColor(mulColor(HULL, 0.95), Z(1040)),
      texel: 1 / 10,
    });
    if (mid) {
      add(boxMM([-44, 128.5, Z(949)], [44, 130, Z(973)]), "dark", { color: DARK, texel: 1 / 4 });
      // window row on the hump front and walkway lights
      for (let i = 0; i < (fine ? 10 : 2); i++) {
        const x = -30 + (i + 0.5) * (60 / (fine ? 10 : 2));
        const n = new THREE.Vector3(0, 16, -14).normalize();
        const c = new THREE.Vector3(x, T2_Y + 9, Z(931)).addScaledVector(n, 0.3);
        add(quadFacing(c.toArray(), n.toArray(), [0, 1, 0], fine ? 2 : 22, 1.2), "windows", { color: WINDOW_WARM, uv: "keep" });
      }
      // plating on the terrace tops and the ledges, avoiding the towers and hump
      const towerClear = (c) => {
        const cu = (c.u0 + c.u1) / 2;
        const cv = (c.v0 + c.v1) / 2;
        const zr = cv - zBow;
        if (zr > 918 && zr < 1006 && Math.abs(cu) < 80) return true;
        if (zr > 1004 && zr < 1068 && Math.abs(cu) < 38) return true;
        return false;
      };
      plateRect(-112, 112, 882, 1064, T2_Y, { max: fine ? 24 : 40, skip: 0.35, avoid: towerClear });
      for (const s of [-1, 1]) {
        const a = s > 0 ? 122 : -146;
        const b = s > 0 ? 146 : -122;
        plateRect(a, b, 818, 1078, T1_Y, { max: fine ? 16 : 28, skip: 0.4 });
        // ledge faces and terrace-2 side walls
        if (fine) {
          plateWall((zr) => s * T1_W(zr), s, DECK_Y + 1, T1_Y - 13, 824, 1080, { max: 20 });
          plateWall((zr) => s * T2_W(zr), s, T1_Y + 1, T2_Y - 9, 884, 1064, { max: 20 });
        }
      }
      // dark expansion grooves across terrace 2 and the ledges
      for (const zr of [905, 1005]) {
        add(boxMM([-110, T2_Y - 0.4, Z(zr) - 0.6], [110, T2_Y + 0.15, Z(zr) + 0.6]), "dark", { color: DARK_SEAM, texel: 1 / 4 });
      }
      add(boxMM([-0.6, T2_Y - 0.4, Z(884)], [0.6, T2_Y + 0.15, Z(1066)]), "dark", { color: DARK_SEAM, texel: 1 / 4 });
      // block-face window rows (terrace fronts and sides); the side faces taper, so x follows zr
      const rowsOn = (xAt, y, zrA, zrB, nx) => {
        let zr = zrA;
        while (zr < zrB) {
          const run = fine ? 5 + Math.floor(rand() * 8) : 1;
          const w = fine ? 1.8 : 30;
          const step = fine ? 3.4 : 60;
          for (let i = 0; i < run && zr < zrB; i++, zr += step) {
            const x = xAt(fine ? zr : zr + w / 2);
            add(quadFacing([x + nx * 0.15, y, Z(zr + (fine ? 0 : w / 2))], [nx, 0, 0], [0, 1, 0], w, 1.2), "windows", {
              color: rand() < 0.8 ? WINDOW_WARM : WINDOW_COOL,
              uv: "keep",
            });
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
        const slopeN = new THREE.Vector3(0, slope, -(yt - DECK_Y - 4)).normalize();
        const n = fine ? Math.floor(w / 3.4) : 3;
        for (let i = 0; i < n; i++) {
          if (fine && rand() < 0.18) continue;
          const x = -w / 2 + (i + 0.5) * (w / n);
          const c = new THREE.Vector3(x, y, Z(zr)).addScaledVector(slopeN, 0.3);
          add(quadFacing(c.toArray(), slopeN.toArray(), [0, 1, 0], fine ? 1.8 : w / n - 4, 1.2), "windows", {
            color: WINDOW_WARM,
            uv: "keep",
          });
        }
      }
      // shield generator domes on the terrace-1 ledges near the front corners, and a sensor globe aft
      for (const s of [-1, 1]) {
        const dome = new THREE.SphereGeometry(11, fine ? 18 : 10, fine ? 10 : 6, 0, Math.PI * 2, 0, Math.PI / 2);
        dome.translate(s * 134, T1_Y, Z(845));
        add(dome, "hull", { color: mulColor(HULL, 0.96), texel: 1 / 8 });
        add(cylY(12.5, 13, 2, fine ? 18 : 10).translate(s * 134, T1_Y + 1, Z(845)), "dark", { color: DARK, texel: 1 / 4 });
      }
      {
        const globe = new THREE.SphereGeometry(7, fine ? 16 : 8, fine ? 10 : 6);
        globe.translate(0, T2_Y + 9 + 9, Z(1036));
        add(globe, "dark", { color: DARK, texel: 1 / 5 });
        add(cylY(1.2, 2, 6, 8).translate(0, T2_Y + 9 + 3, Z(1036)), "dark", { color: DARK, texel: 1 / 3 });
        for (const [dx, dz] of [
          [-22, -16],
          [22, -16],
          [-22, 16],
          [22, 16],
        ])
          add(cylY(0.6, 0.9, 28, 6).translate(dx, T2_Y + 9 + 14, Z(1036) + dz), "dark", { color: DARK, texel: 1 / 3 });
      }
    }
    if (mid) {
      // greeble field on the terraces: hatches, boxes, domes, dishes, masts, vents, pipes
      const N = fine ? 170 : 34;
      for (let i = 0; i < N; i++) {
        const onT2 = rand() < 0.62;
        const y = onT2 ? T2_Y : T1_Y;
        const zr = onT2 ? 880 + rand() * 180 : 815 + rand() * 260;
        let x;
        if (onT2) {
          x = (rand() - 0.5) * 2 * 108;
          // keep clear of the tower shafts, the hump and the aft platform
          if (zr > 918 && zr < 1006 && Math.abs(x) < 80) continue;
          if (zr > 1004 && zr < 1068 && Math.abs(x) < 38) continue;
        } else {
          const side = rand() < 0.5 ? -1 : 1;
          x = side * (122 + rand() * 24);
          if (Math.abs(zr - 845) < 16) continue;
        }
        const zz = Z(zr);
        const kind = rand();
        const col = sootColor(jitterColor(rand, HULL, 0.08, 0.02), zz);
        if (kind < 0.32) {
          const w = 5 + rand() * 16;
          const d = 5 + rand() * 16;
          const h = 1.5 + rand() * 7;
          add(boxMM([x - w / 2, y - 0.3, zz - d / 2], [x + w / 2, y + h, zz + d / 2]), "hull", {
            color: col,
            texel: 1 / 8,
          });
          if (fine && rand() < 0.5)
            add(boxMM([x - w / 2 + 1, y + h, zz - d / 2 + 1], [x + w / 2 - 1, y + h + 0.4, zz + d / 2 - 1]), "dark", {
              color: DARK,
              texel: 1 / 4,
            });
        } else if (kind < 0.55) {
          const w = 3 + rand() * 4;
          add(boxMM([x - w / 2, y - 0.2, zz - w / 2], [x + w / 2, y + 0.5, zz + w / 2]), "dark", {
            color: DARK,
            texel: 1 / 4,
          });
        } else if (kind < 0.66) {
          const r = 3 + rand() * 5;
          const dome = new THREE.SphereGeometry(r, fine ? 12 : 8, fine ? 7 : 5, 0, Math.PI * 2, 0, Math.PI / 2);
          dome.translate(x, y, zz);
          add(dome, "hull", { color: col, texel: 1 / 6 });
        } else if (kind < 0.76) {
          const h = 12 + rand() * 26;
          add(cylY(0.7, 1.1, h, 6).translate(x, y + h / 2, zz), "dark", { color: DARK, texel: 1 / 3 });
          if (fine) add(boxMM([x - 1.6, y, zz - 1.6], [x + 1.6, y + 1.4, zz + 1.6]), "dark", { color: DARK, texel: 1 / 3 });
        } else if (kind < 0.85) {
          add(boxMM([x - 4, y - 0.2, zz - 1.5], [x + 4, y + 1.6, zz + 1.5]), "dark", {
            color: DARK,
            texel: 1 / 4,
          });
        } else if (kind < 0.93) {
          // comm dish on a short mast, tilted up
          const mast = cylY(0.6, 0.9, 6, 6).translate(x, y + 3, zz);
          add(mast, "dark", { color: DARK, texel: 1 / 3 });
          const dish = new THREE.CylinderGeometry(4 + rand() * 3, 0.6, 2.2, fine ? 14 : 8, 1, false);
          dish.rotateX(-0.9 + rand() * 0.4);
          dish.translate(x, y + 7.5, zz);
          add(dish, "hull", { color: col, texel: 1 / 4 });
        } else {
          const len = 20 + rand() * 40;
          const pipe = cylZ(1 + rand() * 0.8, 1 + rand() * 0.8, len, 6).translate(x, y + 1.4, zz);
          add(pipe, "dark", { color: DARK, texel: 1 / 3 });
        }
      }
      // pipe runs along the terrace-1 ledge edges
      for (const s of [-1, 1])
        for (const [zrA, zrB, xx, r] of [
          [862, 1000, 144, 1.6],
          [1005, 1075, 144, 1.2],
        ]) {
          add(cylZ(r, r, Z(zrB) - Z(zrA), 6).translate(s * xx, T1_Y + r, (Z(zrA) + Z(zrB)) / 2), "dark", {
            color: DARK,
            texel: 1 / 3,
          });
          if (fine)
            for (let zr = zrA + 10; zr < zrB; zr += 34)
              add(mbox(s, xx - 2.2, xx + 2.2, T1_Y, T1_Y + r * 1.2, Z(zr) - 0.8, Z(zr) + 0.8), "dark", {
                color: DARK,
                texel: 1 / 3,
              });
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
      add(boxMM([tx - 14, T2_Y - 1, tz - 20], [tx + 14, TOWER_TOP, tz + 20]), "hull", {
        color: HULL_TOWER,
        texel: 1 / 10,
      });
      add(boxMM([tx - 32, TOWER_TOP, tz - 23], [tx + 32, HEAD_TOP, tz + 21]), "hull", {
        color: HULL_TOWER,
        texel: 1 / 10,
      });
      add(boxMM([tx - 27, TOWER_TOP + 10, tz - 23.4], [tx + 27, TOWER_TOP + 13.2, tz - 22.8]), "windows", {
        color: WINDOW_WARM,
        uv: "keep",
      });
      continue;
    }
    // shaft: octagonal, tapering
    const shaft = yLoft([
      { y: T2_Y - 1, pts: oct(17, 23, 4) },
      { y: T2_Y + 8, pts: oct(15.5, 21.5, 4) },
      { y: TOWER_TOP, pts: oct(12.5, 18, 3.5) },
    ]);
    for (const g of Object.values(shaft)) g.translate(tx, 0, tz);
    add(shaft.hull, "hull", { color: HULL_TOWER, texel: 1 / 9 });
    // shaft ribs, mid collars, and a service ladder groove on the outboard face
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
              [tx + dx * hx - (vertical ? 0.9 : 5 + (k % 2) * 3), ya, tz + dz * hz - (vertical ? 5 + (k % 2) * 3 : 0.9)],
              [tx + dx * hx + (vertical ? 0.9 : 5 + (k % 2) * 3), yb, tz + dz * hz + (vertical ? 5 + (k % 2) * 3 : 0.9)],
            ),
            "hull",
            { color: mulColor(HULL_TOWER, 0.9 + (k % 2) * 0.08), texel: 1 / 6 },
          );
        }
      }
    }
    for (const yc of fine ? [104, 122, 140] : [122]) {
      const hx = SHAFT_HX(yc) + 1.4;
      const hz = SHAFT_HZ(yc) + 1.4;
      add(boxMM([tx - hx, yc - 1.2, tz - hz], [tx + hx, yc + 1.2, tz + hz]), "dark", { color: DARK, texel: 1 / 4 });
    }
    // head: neck, bevelled bridge module, cap
    const head = yLoft([
      { y: TOWER_TOP - 0.5, pts: oct(12, 16, 3) },
      { y: TOWER_TOP + 4, pts: oct(32, 23, 5) },
      { y: HEAD_TOP - 5, pts: oct(32, 23, 5) },
      { y: HEAD_TOP, pts: oct(26, 18, 4) },
    ]);
    for (const g of Object.values(head)) g.translate(tx, 0, tz);
    add(head.hull, "hull", { color: HULL_TOWER, texel: 1 / 8 });
    // dark bands where the window rows sit, then the windows themselves
    const rowA = TOWER_TOP + 11.5; // tall bridge row
    const rowB = TOWER_TOP + 18.7; // upper row
    add(boxMM([tx - 32.2, rowA - 2.5, tz - 23.2], [tx + 32.2, rowA + 3, tz + 23.2]), "dark", {
      color: DARK_SEAM,
      texel: 1 / 4,
    });
    add(boxMM([tx - 32.2, rowB - 1.2, tz - 23.2], [tx + 32.2, rowB + 1.3, tz + 23.2]), "dark", {
      color: DARK_SEAM,
      texel: 1 / 4,
    });
    const winRow = (y, faceX, faceZ, nx, nz, len, h) => {
      // a row of windows along a face; faceX/faceZ = face plane coordinate; (nx, nz) = outward normal
      if (!fine) {
        const c = nx !== 0 ? [tx + faceX + nx * 0.3, y, tz] : [tx, y, tz + faceZ + nz * 0.3];
        add(quadFacing(c, [nx, 0, nz], [0, 1, 0], len - 6, h), "windows", { color: WINDOW_WARM, uv: "keep" });
        return;
      }
      const n = Math.floor(len / 3.0);
      for (let i = 0; i < n; i++) {
        if (rand() < 0.12) continue;
        const t = -len / 2 + (i + 0.5) * (len / n);
        const c = nx !== 0 ? [tx + faceX + nx * 0.3, y, tz + t] : [tx + t, y, tz + faceZ + nz * 0.3];
        add(quadFacing(c, [nx, 0, nz], [0, 1, 0], 1.9, h), "windows", {
          color: rand() < 0.85 ? WINDOW_WARM : WINDOW_COOL,
          uv: "keep",
        });
      }
    };
    winRow(rowA, 0, -23, 0, -1, 60, 2.6); // bridge front, tall row
    winRow(rowB, 0, -23, 0, -1, 54, 1.3);
    winRow(rowA, -32, 0, -1, 0, 40, 1.6);
    winRow(rowA, 32, 0, 1, 0, 40, 1.6);
    winRow(rowB, -32, 0, -1, 0, 36, 1.1);
    winRow(rowB, 32, 0, 1, 0, 36, 1.1);
    winRow(rowA, 0, 23, 0, 1, 40, 1.4);
    // shaft windows: small rows on the front and both sides, following the taper
    for (const y of fine ? [96, 112, 130, 148] : [100, 134]) {
      winRow(y, 0, -SHAFT_HZ(y), 0, -1, fine ? 14 : 20, 1.1);
      winRow(y, -SHAFT_HX(y), 0, -1, 0, fine ? 18 : 24, 1.0);
      winRow(y, SHAFT_HX(y), 0, 1, 0, fine ? 18 : 24, 1.0);
    }
    // roof: raised cap plate, sensor dome, antenna spars, dish, equipment
    add(boxMM([tx - 20, HEAD_TOP, tz - 12], [tx + 20, HEAD_TOP + 1.2, tz + 12]), "hull", { color: mulColor(HULL_TOWER, 0.95), texel: 1 / 6 });
    const dome = new THREE.SphereGeometry(5.5, fine ? 14 : 8, fine ? 8 : 5, 0, Math.PI * 2, 0, Math.PI / 2);
    dome.translate(tx + s * 4, HEAD_TOP + 1.2, tz + 5);
    add(dome, "hull", { color: HULL_TOWER, texel: 1 / 5 });
    add(cylY(0.8, 1.2, 30, 6).translate(tx - s * 14, HEAD_TOP + 15, tz - 6), "dark", { color: DARK, texel: 1 / 3 });
    add(cylY(0.5, 0.8, 22, 6).translate(tx + s * 16, HEAD_TOP + 11, tz + 8), "dark", { color: DARK, texel: 1 / 3 });
    if (fine) {
      add(boxMM([tx - s * 14 - 1.5, HEAD_TOP + 22, tz - 9], [tx - s * 14 + 1.5, HEAD_TOP + 22.6, tz - 3]), "dark", { color: DARK, texel: 1 / 2 });
      add(boxMM([tx - s * 14 - 6, HEAD_TOP + 26, tz - 6.4], [tx - s * 14 + 6, HEAD_TOP + 26.5, tz - 5.6]), "dark", { color: DARK, texel: 1 / 2 });
      const dish = new THREE.CylinderGeometry(3.4, 0.5, 1.8, 12, 1, false);
      dish.rotateX(-0.7);
      dish.rotateY(s * 0.5);
      dish.translate(tx + s * 16, HEAD_TOP + 23, tz + 8);
      add(dish, "hull", { color: HULL_TOWER, texel: 1 / 3 });
      for (let i = 0; i < 6; i++)
        add(boxMM([tx - 24 + i * 9, HEAD_TOP + 1.2, tz - 12], [tx - 20 + i * 9, HEAD_TOP + 2.4 + (i % 2), tz - 8]), "dark", {
          color: DARK,
          texel: 1 / 3,
        });
      // under-head equipment: dark boxes hanging beneath the overhang
      for (const [dx, dz] of [
        [-22, -12],
        [22, -12],
        [-22, 12],
        [22, 12],
      ])
        add(boxMM([tx + dx - 3, TOWER_TOP - 2, tz + dz - 3], [tx + dx + 3, TOWER_TOP + 4, tz + dz + 3]), "dark", { color: DARK, texel: 1 / 3 });
    }
    // running lights on the tower cap and mast
    add(quadFacing([tx - s * 14, HEAD_TOP + 30.4, tz - 6], [0, 1, 0], [0, 0, -1], 1.4, 1.4), "windows", {
      color: 0xffffff,
      uv: "keep",
    });
  }

  // -------------------------------------------------------------------------
  // heavy dual turbolaser turrets on the shoulders (4 per side) + hardpoints
  // -------------------------------------------------------------------------
  const barrelLen = 40;
  for (const s of [-1, 1]) {
    for (const zr of TURRET_ZR) {
      const tx = s * (96 + 0.5 * (wDeck(zr) - 96));
      const tz = Z(zr);
      const y = yTop(zr);
      const yaw = -s * 0.3; // rotate -Z toward outboard
      const pitch = 0.1;
      const dir = new THREE.Vector3(-Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), -Math.cos(pitch) * Math.cos(yaw));
      const pivot = new THREE.Vector3(tx, y + 12, tz);
      if (lod === 2) {
        add(boxMM([tx - 13, y, tz - 12], [tx + 13, y + 12, tz + 12]), "hull", { color: mulColor(HULL, 0.9), texel: 1 / 6 });
      } else {
        // base ring and armoured body
        add(cylY(16, 17, 3, fine ? 18 : 10).translate(tx, y + 1.5, tz), "hull", {
          color: mulColor(HULL, 0.9),
          texel: 1 / 6,
        });
        const body = yLoft([
          { y: y + 3, pts: oct(14, 13, 4) },
          { y: y + 9, pts: oct(13, 12.5, 3.5) },
          { y: y + 14, pts: oct(10, 10, 3) },
        ]);
        for (const g of Object.values(body)) {
          g.rotateY(yaw);
          g.translate(tx, 0, tz);
        }
        add(body.hull, "hull", { color: mulColor(HULL, 0.93), texel: 1 / 6 });
        // mantlet and twin barrels along -Z, then pitched and yawed into place
        const gun = [];
        gun.push(new THREE.BoxGeometry(18, 7, 6).translate(0, 0, -11));
        for (const bx of [-4.6, 4.6]) {
          const b = cylZ(1.3, 1.9, barrelLen, fine ? 10 : 6).translate(bx, 0.5, -14 - barrelLen / 2);
          gun.push(b);
          if (fine) {
            gun.push(cylZ(2.2, 2.2, 3, 10).translate(bx, 0.5, -14 - barrelLen + 3));
            gun.push(cylZ(2.1, 2.1, 4, 10).translate(bx, 0.5, -20));
          }
        }
        for (const g of gun) {
          g.rotateX(pitch);
          g.rotateY(yaw);
          g.translate(pivot.x, pivot.y, pivot.z);
          add(g, "dark", { color: DARK, texel: 1 / 4 });
        }
        if (fine) {
          // sensor box and hatch on top of the turret
          add(boxMM([tx - 3, y + 14, tz - 2], [tx + 3, y + 16.5, tz + 4]), "dark", { color: DARK, texel: 1 / 3 });
          add(boxMM([tx + s * 5 - 2, y + 14, tz + 5], [tx + s * 5 + 2, y + 14.4, tz + 8]), "dark", { color: DARK, texel: 1 / 3 });
        }
      }
      if (lod === 0) {
        const tip = pivot.clone().add(new THREE.Vector3(0, 0.5, -14).applyEuler(new THREE.Euler(pitch, yaw, 0, "YXZ"))).addScaledVector(dir, barrelLen);
        hardpoints.push({ pos: tip.toArray().map((v) => +v.toFixed(2)), dir: dir.toArray().map((v) => +v.toFixed(3)), kind: "heavy", range: 14000 });
      }
    }
  }

  // light emplacements: wing edge, lower flanks, block sides
  if (mid) {
    const lightGun = (pos, dir, up, scale = 1) => {
      const d = new THREE.Vector3(...dir).normalize();
      const m = frameMatrix(new THREE.Vector3(...pos), new THREE.Vector3(...up), d);
      const base = new THREE.CylinderGeometry(3.2 * scale, 3.6 * scale, 1.6 * scale, fine ? 10 : 6);
      base.translate(0, 0.8 * scale, 0);
      base.applyMatrix4(m);
      add(base, "hull", { color: mulColor(HULL, 0.9), texel: 1 / 4 });
      const body = new THREE.BoxGeometry(5 * scale, 3.4 * scale, 6 * scale);
      body.translate(0, 3.2 * scale, 0);
      body.applyMatrix4(m);
      add(body, "dark", { color: DARK, texel: 1 / 3 });
      const bl = 12 * scale;
      for (const bx of fine ? [-1.3, 1.3] : [0]) {
        const b = cylZ(0.45 * scale, 0.6 * scale, bl, 6);
        b.translate(bx * scale, 3.6 * scale, (3 * scale + bl / 2));
        b.applyMatrix4(m);
        add(b, "dark", { color: DARK, texel: 1 / 2 });
      }
      const tip = new THREE.Vector3(0, 3.6 * scale, 3 * scale + bl).applyMatrix4(m);
      if (lod === 0) hardpoints.push({ pos: tip.toArray().map((v) => +v.toFixed(2)), dir: d.toArray().map((v) => +v.toFixed(3)), kind: "light", range: 6000 });
    };
    for (const s of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const zr = 380 + i * 105;
        const x = s * (wDeck(zr) - 8);
        lightGun([x, yTop(zr), Z(zr)], [s * 0.9, 0.25, -0.6], [0, 1, 0]);
      }
      // on the lower flank (angled hull)
      const jF = s > 0 ? EDGE.flankR : EDGE.flankL;
      for (const zr of [480, 680, 880]) {
        const fr = loftFrame(secs, jF, 0.55, Z(zr));
        const dir = fr.n.clone().multiplyScalar(0.9).add(new THREE.Vector3(0, 0, -0.5)).normalize();
        lightGun(fr.p.toArray(), dir.toArray(), fr.n.toArray(), 1.2);
      }
      // block ledges
      for (const zr of [900, 1040]) lightGun([s * (T1_W(zr) - 6), T1_Y, Z(zr)], [s, 0.3, -0.3], [0, 1, 0]);
    }
  }

  // -------------------------------------------------------------------------
  // stern: engine plate, nozzles with depth, cores, haze
  // -------------------------------------------------------------------------
  {
    const zs = Z(1137);
    const sootHull = (k) => sootColor(mulColor(HULL, k), zs + 40);
    // stern plate: heat-stained hull armour with a dark recessed band that the main nozzles sit in
    add(boxMM([-248, -76, zs - 1], [248, 42, zs + 1.2]), "hull", { color: sootHull(0.9), texel: 1 / 12 });
    add(boxMM([-244, -62, zs + 1.2], [244, 14, zs + 1.9]), "dark", { color: DARK_RECESS, texel: 1 / 8 });
    // mounting pylons between the main nozzles, spanning the band and standing proud
    for (const px of [0, -101, 101, -195, 195]) {
      const hw = Math.abs(px) > 150 ? 5 : 6;
      add(boxMM([px - hw, -66, zs + 1.2], [px + hw, 17.5, zs + 5]), "hull", { color: sootHull(0.84), texel: 1 / 6 });
      if (fine) add(boxMM([px - 2.5, -62, zs + 5], [px + 2.5, 14, zs + 6.2]), "dark", { color: DARK, texel: 1 / 3 });
    }
    // upper ledge under the small nozzles and a lower keel bumper
    add(boxMM([-200, 14, zs + 1.2], [200, 17.5, zs + 6]), "hull", { color: sootHull(0.86), texel: 1 / 6 });
    add(boxMM([-140, -76, zs + 1.2], [140, -68, zs + 5]), "hull", { color: sootHull(0.8), texel: 1 / 6 });
    if (mid) {
      // radiator fins across the upper stern between the small nozzles
      for (let i = 0; i < (fine ? 16 : 6); i++) {
        const x = -170 + i * (340 / (fine ? 15 : 5));
        if (Math.abs(Math.abs(x) - 115) < 13 || Math.abs(Math.abs(x) - 40) < 13) continue;
        add(boxMM([x - 1, 22, zs + 1.2], [x + 1, 40, zs + 3.5]), "dark", { color: DARK, texel: 1 / 3 });
      }
      // conduits along the band above the outer nozzles
      for (const s of [-1, 1])
        add(cylZ(1.4, 1.4, 60, 6).rotateY(Math.PI / 2).translate(s * 214, 12, zs + 3.2), "dark", { color: DARK, texel: 1 / 3 });
    }
    for (const [ex, ey, r] of ENGINES) {
      const seg = lod === 0 ? 24 : lod === 1 ? 12 : 8;
      const nz = nozzle(r, { seg, detail: lod === 0 ? 2 : lod === 1 ? 1 : 0, rings: 2, vanes: 8, haze: 3.4 });
      for (const g of nz.dark) {
        g.translate(ex, ey, zs + 1.2);
        add(g, "dark", { color: sootColor(DARK, zs + 60), texel: 1 / 8 });
      }
      for (const { geo, radial } of nz.glow) {
        geo.translate(ex, ey, zs + 1.2);
        const p = add(geo, "engineGlow", { uv: "keep" });
        radialColors(p.geo, [ex, ey, 0], radial[0], radial[1], radial[2]);
      }
      for (const { geo, fade, radial } of nz.haze) {
        geo.translate(ex, ey, zs + 1.2);
        const p = add(geo, "plumeAdd", { uv: "keep" });
        if (fade) fadeZ(p.geo, zs + 1.2 + fade[0], zs + 1.2 + fade[1], [0.45, 0.65, 1.0], [0, 0, 0]);
        else radialColors(p.geo, [ex, ey, 0], radial[0], radial[1], radial[2]);
      }
      if (lod === 0) engines.push({ pos: [ex, ey, zs + 1.2 + r * 0.45], r });
    }
  }

  // -------------------------------------------------------------------------
  // belly: docking bays, keel spine, plating; flank trenches with machinery
  // -------------------------------------------------------------------------
  if (mid) {
    // keel spine along the belly centreline
    const spine = [];
    for (const zr of [400, 600, 800, 1000, 1080]) {
      const y = yBot(zr);
      spine.push({
        z: Z(zr),
        pts: [
          [-14, y + 0.5],
          [14, y + 0.5],
          [12, y - 5],
          [-12, y - 5],
        ],
      });
    }
    const sp = loftProfile(spine);
    add(sp.hull, "hull", { color: mulColor(HULL, 0.95), texel: 1 / 10 });
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
        const m = frameMatrix(new THREE.Vector3(cx, ymid + 0.4, zc), fr.n, fr.v);
        add(orientedBox([w, 1.2, d], m), "dark", { color: DARK_RECESS, texel: 1 / 8 });
        const mm = frameMatrix(new THREE.Vector3(cx, ymid - 0.35, zc), fr.n, fr.v);
        add(orientedBox([w * 0.34, 0.6, d * 0.3], mm), "windows", { color: mulColor(HANGAR_WARM, 0.55), uv: "keep" });
        for (const k of [-1, 1]) {
          const md = frameMatrix(new THREE.Vector3(cx, ymid - 0.7, zc + k * (d * 0.29)), fr.n, fr.v);
          add(orientedBox([w - 4, 1.6, d * 0.34], md), "hull", { color: sootColor(mulColor(HULL, 0.88), zc), texel: 1 / 8 });
          const mf = frameMatrix(new THREE.Vector3(cx, ymid - 0.9, zc + k * (d / 2 + 1.5)), fr.n, fr.v);
          add(orientedBox([w + 6, 2.2, 3], mf), "hull", { color: sootColor(mulColor(HULL, 0.94), zc), texel: 1 / 8 });
          const ms = frameMatrix(new THREE.Vector3(cx + k * (w / 2 + 1.5), ymid - 0.9, zc), fr.n, fr.v);
          add(orientedBox([3, 2.2, d + 6], ms), "hull", { color: sootColor(mulColor(HULL, 0.94), zc), texel: 1 / 8 });
        }
        if (fine) {
          for (const k of [-1, 1]) {
            const me = frameMatrix(new THREE.Vector3(cx + k * (w / 2 - 1.2), ymid - 0.25, zc), fr.n, fr.v);
            add(orientedBox([0.8, 0.5, d - 4], me), "windows", { color: mulColor(HANGAR_BLUE, 0.7), uv: "keep" });
          }
          // small lit door-edge markers along the slot
          for (const k of [-1, 1])
            for (let i = 0; i < 4; i++) {
              const ml = frameMatrix(
                new THREE.Vector3(cx - w * 0.3 + (i + 0.5) * (w * 0.6 / 4), ymid - 1.6, zc + k * (d * 0.115)),
                fr.n,
                fr.v,
              );
              add(orientedBox([1.2, 0.3, 0.8], ml), "windows", { color: WINDOW_WARM, uv: "keep" });
            }
        }
      }
      // belly plating field
      const jB = s > 0 ? EDGE.bellyR : EDGE.bellyL;
      const cells = partition(rand, { u0: 22, u1: 132, v0: Z(340), v1: Z(1080) }, { max: fine ? 34 : 60, keep: 0.2 });
      for (const c of cells) {
        const cu = (c.u0 + c.u1) / 2;
        const cv = (c.v0 + c.v1) / 2;
        const zr = cv - zBow;
        const wb = halfW(zr) * 0.5 - 6;
        if (c.u1 > wb) continue;
        // skip the bays
        let hit = false;
        for (const [zrA, zrB, xA, xB] of BELLY_BAYS)
          if (cv > Z(zrA) - 6 && cv < Z(zrB) + 6 && c.u1 > xA - 6 && c.u0 < xB + 6) hit = true;
        if (hit || rand() < 0.45) continue;
        // the belly is flat across x, so only the frame's y, slope and normal matter
        const fr = loftFrame(secs, jB, 0.5, cv);
        const w = c.u1 - c.u0 - 3;
        const d = c.v1 - c.v0 - 3;
        const th = 0.6 + rand() * 1.2;
        const centre = new THREE.Vector3(s * cu, fr.p.y, cv);
        const m = frameMatrix(centre.addScaledVector(fr.n, th / 2 - 0.3), fr.n, fr.v);
        add(orientedBox([w, th, d], m), "hull", {
          color: sootColor(jitterColor(rand, HULL, 0.07, 0.02), cv),
          texel: 1 / 12,
        });
        if (fine && rand() < 0.3) {
          const m2 = frameMatrix(new THREE.Vector3(s * cu, fr.p.y, cv).addScaledVector(fr.n, th + 0.25), fr.n, fr.v);
          add(orientedBox([w * 0.5, 0.5, d * 0.5], m2), "dark", { color: DARK, texel: 1 / 4 });
        }
      }
    }
    // lower flank plating + insignia + trench machinery
    const flankLen = (zr) =>
      Math.hypot(halfW(zr) - 4 - halfW(zr) * 0.5, yTrenchBot(zr) - 10 - yBot(zr));
    for (const s of [-1, 1]) {
      const jF = s > 0 ? EDGE.flankR : EDGE.flankL;
      // partition in "nominal metres" across a 120 m flank; converted to the local flank length per cell
      const NOM = 120;
      const cells = partition(rand, { u0: 7, u1: NOM - 7, v0: Z(330), v1: Z(1080) }, { max: fine ? 36 : 60, keep: 0.25 });
      for (const c of cells) {
        const cv = (c.v0 + c.v1) / 2;
        const zr = cv - zBow;
        const t0 = c.u0 / NOM;
        const t1 = c.u1 / NOM;
        const d = c.v1 - c.v0;
        const len = Math.min(d - 3, 70);
        // keep every plate clear of the insignia's footprint (its extent, not just its centre)
        if (Math.abs(zr - 600) < len / 2 + 36 && t0 < 0.8 && t1 > 0.2) continue;
        if (rand() < 0.5) continue;
        const fr = loftFrame(secs, jF, (t0 + t1) / 2, cv);
        const w = (t1 - t0) * flankLen(zr) - 3;
        const th = 0.6 + rand() * 1.1;
        add(surfaceBox(fr, [w, th, len]), "hull", {
          color: sootColor(jitterColor(rand, HULL, 0.08, 0.02), cv),
          texel: 1 / 12,
        });
        if (fine && rand() < 0.35)
          add(surfaceBox(fr, [w * 0.45, th + 0.5, Math.min(d - 3, 70) * 0.4], { du: (rand() - 0.5) * w * 0.4 }), "hull", {
            color: sootColor(jitterColor(rand, HULL, 0.08, 0.02), cv),
            texel: 1 / 8,
          });
      }
      // flank insignia: ring with a gap, painted on the angled lower flank
      {
        // wrapped onto the (slightly twisted) flank strip so the whole ring stays flush; gap faces forward
        const ring = new THREE.RingGeometry(25, 32, fine ? 40 : 18, 1, 0.35, Math.PI * 2 - 0.7);
        ring.rotateZ(-Math.PI / 2);
        add(mapToLoft(secs, jF, 0.5, Z(600), ring, 0.35), "paint", { color: MAROON, texel: 1 / 16 });
        const dot = new THREE.CircleGeometry(6.5, fine ? 16 : 8);
        add(mapToLoft(secs, jF, 0.5, Z(600), dot, 0.35), "paint", { color: MAROON, texel: 1 / 16 });
      }
      // trench machinery: ribs, pipes, boxes and small lit bay doors on the recessed wall
      const jW = s > 0 ? EDGE.trenchWallR : EDGE.trenchWallL;
      const jU = s > 0 ? EDGE.wingUnderR : EDGE.wingUnderL;
      // long conduit runs following the trench wall and the wing underside, section by section.
      // Edge parameter t runs bottom-up on the starboard wall and top-down on the port one.
      const runAlong = (j, t, off, r, zrA, zrB, color) => {
        const tt = s > 0 ? t : 1 - t;
        const stops = [zrA, ...SECTIONS_FULL.filter((z) => z > zrA && z < zrB), zrB];
        for (let i = 0; i + 1 < stops.length; i++) {
          const fa = loftFrame(secs, j, tt, Z(stops[i]));
          const fb = loftFrame(secs, j, tt, Z(stops[i + 1]));
          add(tube(fa.p.addScaledVector(fa.n, off), fb.p.addScaledVector(fb.n, off), r, 6), "dark", { color, texel: 1 / 3 });
        }
      };
      runAlong(jW, 0.14, 2.6, 2.4, 432, 1000, sootColor(DARK, Z(700)));
      if (fine) {
        runAlong(jW, 0.5, 1.9, 1.5, 450, 985, sootColor(mulColor(DARK, 0.9), Z(700)));
        runAlong(jU, 0.82, 1.8, 1.6, 445, 990, sootColor(DARK, Z(700)));
      }
      for (let zr = 440; zr < 990; zr += fine ? 46 : 92) {
        const fr = loftFrame(secs, jW, 0.5, Z(zr));
        // structural rib spanning the trench height, standing proud of the wall
        const h = trenchH(zr);
        const ribM = frameMatrix(fr.p.clone().addScaledVector(fr.n, 6), fr.n, fr.v);
        add(orientedBox([h - 1, 12, 3.2], ribM), "hull", { color: sootColor(mulColor(HULL, 0.85), Z(zr)), texel: 1 / 6 });
      }
      if (mid) {
        for (let i = 0; i < (fine ? 34 : 12); i++) {
          const zr = 430 + rand() * 560;
          const t = 0.15 + rand() * 0.7;
          const fr = loftFrame(secs, jW, t, Z(zr));
          const kind = rand();
          if (kind < 0.35) {
            const len = 30 + rand() * 90;
            const r = 1.2 + rand() * 1.6;
            const m = frameMatrix(fr.p.clone().addScaledVector(fr.n, r + 0.5), fr.n, fr.v);
            const pipe = new THREE.CylinderGeometry(r, r, len, 6);
            pipe.rotateX(Math.PI / 2);
            pipe.applyMatrix4(m);
            add(pipe, "dark", { color: DARK, texel: 1 / 3 });
          } else if (kind < 0.75) {
            add(surfaceBox(fr, [4 + rand() * 8, 2 + rand() * 6, 6 + rand() * 16]), "dark", { color: DARK, texel: 1 / 4 });
          } else {
            // lit bay door: dark frame with a warm lit slot
            add(surfaceBox(fr, [9, 0.6, 12]), "dark", { color: DARK_SEAM, texel: 1 / 3 });
            const p = fr.p.clone().addScaledVector(fr.n, 0.75);
            add(quadFacing(p.toArray(), fr.n.toArray(), [0, 1, 0], 7, 5), "windows", { color: HANGAR_WARM, uv: "keep" });
          }
        }
        // machinery under the wing overhang
        if (fine)
          for (let i = 0; i < 18; i++) {
            const zr = 440 + rand() * 540;
            const fr = loftFrame(secs, jU, 0.3 + rand() * 0.5, Z(zr));
            add(surfaceBox(fr, [3 + rand() * 6, 1.5 + rand() * 3, 4 + rand() * 10]), "dark", { color: DARK, texel: 1 / 3 });
          }
      }
    }
  }

  // -------------------------------------------------------------------------
  // ventral forward hangar mouth: lit interior strips and machinery in the notch
  // -------------------------------------------------------------------------
  if (mid) {
    for (const zr of fine ? [125, 150, 180, 215, 250, 285] : [130, 190, 260]) {
      const y = yBot(zr) + notchH(zr) - 0.4;
      const w = notchW(zr) * 2 - 8;
      add(quadFacing([0, y, Z(zr)], [0, -1, 0], [0, 0, 1], w * 0.9, 1.4), "windows", { color: HANGAR_WARM, uv: "keep" });
    }
    for (const s of [-1, 1]) {
      // blue guide strips along the notch walls, and machinery blocks hanging from the ceiling
      const zr0 = 118;
      const zr1 = 300;
      const zm = (zr0 + zr1) / 2;
      const yW = yBot(zm) + notchH(zm) * 0.35;
      add(quadFacing([s * (notchW(zm) - 0.6), yW, Z(zm)], [-s, 0, 0], [0, 1, 0], Z(zr1) - Z(zr0), 0.8), "windows", { color: HANGAR_BLUE, uv: "keep" });
      if (fine)
        for (let i = 0; i < 8; i++) {
          const zr = 125 + rand() * 150;
          const y = yBot(zr) + notchH(zr);
          const x = s * (6 + rand() * (notchW(zr) - 14));
          add(boxMM([x - 3, y - 4 - rand() * 3, Z(zr) - 3], [x + 3, y + 0.5, Z(zr) + 3]), "dark", { color: DARK, texel: 1 / 3 });
        }
    }
    // lip lights around the mouth
    for (const s of [-1, 1])
      add(quadFacing([s * 62, yBot(108) + 2, Z(108) - 0.3], [0, 0, -1], [0, 1, 0], 16, 0.8), "windows", { color: HANGAR_BLUE, uv: "keep" });
  }

  // -------------------------------------------------------------------------
  // running lights along the hull edges
  // -------------------------------------------------------------------------
  if (mid) {
    const nav = (pos, dir, color) => add(quadFacing(pos, dir, [0, 1, 0], 1.6, 1.6), "windows", { color, uv: "keep" });
    for (const s of [-1, 1]) {
      const col = s > 0 ? 0x40ff70 : 0xff3838;
      nav([s * 37, prongTop(-4) + 0.3, Z(-3.8)], [0, 1, 0], col);
      nav([s * (halfW(830) + 0.3), yTop(830) - SHOULDER - 2, Z(830)], [s, 0, 0], col);
      nav([s * (halfW(1030) + 0.3), yTop(1030) - SHOULDER - 2, Z(1030)], [s, 0, 0], col);
      nav([s * 248, 42, Z(1137) + 1.6], [0, 0, 1], 0xffffff);
      nav([s * 150, T1_Y + 0.3, Z(BLOCK_Z0 + 12)], [0, 1, 0], 0xffffff);
      nav([s * 150, T1_Y + 0.3, Z(BLOCK_Z1 - 8)], [0, 1, 0], 0xffffff);
      for (const zr of [450, 700]) nav([s * (halfW(zr) * 0.5 + 2), yBot(zr) - 0.3, Z(zr)], [0, -1, 0], 0xffffff);
    }
  }

  return { parts, hardpoints, engines };
}

function build(mats, { open = false } = {}) {
  const all = [];
  let hardpoints = [];
  let engines = [];
  const triangles = [];
  for (const lod of [0, 1, 2]) {
    const r = buildLod(lod, { open });
    all.push(...r.parts);
    if (lod === 0) {
      hardpoints = r.hardpoints;
      engines = r.engines;
    }
    triangles.push(r.parts.reduce((a, p) => a + p.geo.attributes.position.count / 3, 0));
  }
  const model = assemble(
    {
      id: open ? "venatorOpen" : "venator",
      side: "republic",
      length: L,
      parts: all,
      hardpoints,
      engines,
      bounds: { radius: 600 },
    },
    mats,
  );
  model.triangles = triangles;
  return model;
}

export function buildVenator(mats) {
  return build(mats, { open: false });
}

// Same ship with the dorsal doors slid apart over a lit hangar bay.
export function buildVenatorOpen(mats) {
  return build(mats, { open: true });
}
