// Carrack-class light cruiser (Republic in this battle), 350 m long, 74 m across the prow, 63.8 m over
// the hull (keel to stern-block top; 76 m over the sensor dish and the ventral strut). Original
// procedural geometry after the reference side diagram, front drawing and CG renders: a faceted chisel
// "head" 92 m long (blunt 7 m nose face, a 33 deg front chamfer carrying the wrap-around bridge glass,
// an 19 deg upper chamfer, a near-flat crest sloping down onto the deck, outward-leaning upper side
// faces with the side panes, a vertical shoulder band at the 74 m beam, a two-facet underside to a
// narrow bottom strip, and an aft-bottom chamfer over the keel), a two-step collar, a slim chamfered
// mid-hull box (46 m beam, deck at 25, ledge at -12.2, set-back keel to -21.8) crossed by four proud
// white frames, a flank fairing with rails, a window row and rack blocks along the ledge, three deck
// conduits, a sensor ball and the dorsal dish, an antenna mast, a dark ventral keel blade and the
// landing strut, a taller stern block (top 36.6) with a long ramped front, an elliptical reactor dome
// each side and a raked stern carrying eight ion engines in two columns of four long pods (top row
// aft-most). Light warm grey plating, dark keel and recesses, maroon Republic stripes, teal glass.
// Tracking heavy turrets on the head and block tops, light twin mounts on the flanks and keel, fixed
// bow guns in the shoulder band. Three complete LODs; everything is instanced by the Fleet.
import * as THREE from "three";
import { assemble } from "./shipKit.js";
import {
  bar,
  col,
  mix,
  mpart,
  rng,
  smoothstep,
  table,
  tubeZ,
  quadAt,
} from "./munificentGeo.js";
import {
  antennaCluster,
  dishMast,
  hatch,
  lippedPlate,
  slotRow,
} from "./munificentDetail.js";
import { nozzleBell } from "./munificentEngines.js";
import { carrackTurret } from "./carrackTurrets.js";
import {
  domeUp,
  inflatePts,
  lin,
  loftTagged,
  ribbon,
  roundedBoxZ,
  sideDome,
} from "./carrackGeo.js";

export const CARRACK = { length: 350, width: 74, height: 76 };

const L = CARRACK.length;
// d = metres aft of the nose tip -> object z (origin at the hull centre, forward is -z)
const Z = (d) => d - L / 2;

// palette: linear albedo multipliers on the shared plating (mean ~0.62 after the material's x1.4)
const HULL = lin(0.72, 0.69, 0.62); // light warm grey-white
const HULL_TOP = lin(0.78, 0.75, 0.68);
const HULL_LOW = lin(0.63, 0.61, 0.56); // lower chamfers (one cream tone in the CG renders, only shading differs)
const BELLY = lin(0.5, 0.5, 0.52); // undersides, cool grey (the CG hull is one cream tone; shadow does the rest)
const KEEL = lin(0.4, 0.41, 0.45); // set-back keel
const STERN = lin(0.3, 0.28, 0.26); // heat-stained pod tails
const DARK = 0xb8bcc4; // machinery greebles on the dark texture (reads mid-dark grey)
const RECESS = 0x8a8e96; // deep recesses
const SEAM = 0x6e7178; // panel seams
const MAROON = 0x681e1b; // Open Circle maroon
const GLASS = 0x1e5a52; // bridge viewport (unlit teal glass)
const WINDOW = 0xd8bc90;
const FRAME = 0xd0cdc6; // the four proud white frames (flat paint)
const SHELL = col(0x6a6560);
const SHELL_DK = col(0x3a3733);
const TURRET_DARK = col(0xa0a4ac);

const TEX = 1 / 34; // main plating scale (tiles per metre; plates 4.5-10 m like the CG hull)
const DECK = 25; // mid-hull deck height
const LEDGE = -12.2; // the upper box ends here; the keel is set back below
const KEEL_BOT = -21.8;

// ---------------------------------------------------------------------------
// head: every section is the master half-profile x(y) scaled by the plan taper k(d) and clipped to the
// silhouette [headBot(d), headTop(d)] (reference side diagram and front drawing). Six points per side:
//   P0 top edge / crease | P1 shoulder top | P2 shoulder bottom | P3 facet break | P4 strip top | P5 bottom
// faces: 0 top | 1,11 upper side | 2,10 shoulder band | 3,9 steep facet | 4,8 lower chamfer |
//        5,7 bottom strip | 6 bottom   (port first)
// ---------------------------------------------------------------------------
const HEAD_END = 92;
const LEAN = 0.72; // upper side face: metres outward per metre down
const SH_TOP = 1.5; // vertical shoulder band at the 74 m beam
const SH_BOT = -1.5;
const BRK = -10; // facet break between the steep facet and the 45 deg lower chamfer
const STRIP_TOP = -23.6; // vertical bottom strip
const XW = 37;
const XB = 31;
const XS = 13;
// master half-profile (full section) and the outward normal of the facet at height y
function profX(y) {
  if (y >= SH_TOP) return XW - LEAN * (y - SH_TOP);
  if (y >= SH_BOT) return XW;
  if (y >= BRK) return XW + ((XB - XW) * (SH_BOT - y)) / (SH_BOT - BRK);
  if (y >= STRIP_TOP) return XB + ((XS - XB) * (BRK - y)) / (BRK - STRIP_TOP);
  return XS;
}
function profN(y) {
  // facet direction top -> bottom, normal = (-dy, dx)
  const seg =
    y >= SH_TOP
      ? [LEAN, -1]
      : y >= SH_BOT
        ? [0, -1]
        : y >= BRK
          ? [XB - XW, BRK - SH_BOT]
          : y >= STRIP_TOP
            ? [XS - XB, STRIP_TOP - BRK]
            : [0, -1];
  const l = Math.hypot(seg[0], seg[1]);
  return [-seg[1] / l, seg[0] / l];
}
const headTop = (d) =>
  table(
    [
      [0, -0.1],
      [8, 4.7],
      [27, 17.5],
      [52, 26],
      [58, 27.3],
      [64, 27],
      [HEAD_END, DECK],
    ],
    d,
  );
const headBot = (d) =>
  table(
    [
      [0, -7.4],
      [2, -8],
      [4, -9.6],
      [6, -12.7],
      [8, -16.3],
      [10, -18],
      [14, -19.6],
      [18, -21.1],
      [22, -22.6],
      [26, -24.4],
      [30, -25.9],
      [33, -26.8],
      [52, -26.6],
      [62, -25.4],
      [77, -24.4],
      [90, LEDGE],
      [HEAD_END, LEDGE],
    ],
    d,
  );
const headK = (d) =>
  table(
    [
      [0, 0.52],
      [3, 0.64],
      [6, 0.74],
      [10, 0.86],
      [14, 0.93],
      [18, 0.97],
      [24, 1],
    ],
    d,
  );
function headSide(d) {
  const yT = headTop(d);
  const yB = headBot(d);
  const k = headK(d);
  const clampY = (y) => Math.min(yT, Math.max(yB, y));
  return [yT, SH_TOP, SH_BOT, BRK, STRIP_TOP, yB].map((lv) => {
    const y = clampY(lv);
    return [profX(y) * k, y];
  });
}
function headPts(d) {
  const R = headSide(d);
  const pts = [R[0], [-R[0][0], R[0][1]]];
  for (let i = 1; i < 6; i++) pts.push([-R[i][0], R[i][1]]);
  for (let i = 5; i >= 1; i--) pts.push(R[i]);
  return pts;
}
const headStation = (d) => ({ d, z: Z(d), pts: headPts(d) });
// point on the head surface at (d, y) on `side` (+1 starboard), lifted `off` along the facet normal
function headAt(d, y, side, off = 0) {
  const k = headK(d);
  const n = profN(y);
  return [side * (profX(y) * k + n[0] * off), y + n[1] * off, Z(d)];
}
const headTopX = (d) => profX(headTop(d)) * headK(d); // half width of the top face

// ---------------------------------------------------------------------------
// collar + mid hull: chamfered upper box over the set-back keel (38 wide) with a ledge at -12.2
// faces: 0 top | 1 L top chamfer | 2 L side | 3 L ledge | 4 L keel side | 5 L keel chamfer | 6 bottom |
//        7 R keel chamfer | 8 R keel side | 9 R ledge | 10 R side | 11 R top chamfer
// ---------------------------------------------------------------------------
const boxPts = (hw, c) => [
  [hw - c, DECK],
  [-(hw - c), DECK],
  [-hw, DECK - c],
  [-hw, LEDGE],
  [-19, LEDGE],
  [-19, -18],
  [-15, KEEL_BOT],
  [15, KEEL_BOT],
  [19, -18],
  [19, LEDGE],
  [hw, LEDGE],
  [hw, DECK - c],
];
const BODY = boxPts(23, 6);
const COLLAR_A = boxPts(25.5, 8);
const COLLAR_B = boxPts(24, 6.5);
const BOX = [
  [23, LEDGE],
  [23, 19],
  [17, DECK],
  [-17, DECK],
  [-23, 19],
  [-23, LEDGE],
];
// keel box alone (under the head's aft-bottom chamfer); the top edge is inside the head
const KEEL_ONLY = [
  [-19, LEDGE],
  [-19, -18],
  [-15, KEEL_BOT],
  [15, KEEL_BOT],
  [19, -18],
  [19, LEDGE],
];
// raised frames (reference: two close together, then two spaced)
const RIB_D = [164, 178, 209, 238];
const RIB_Z = RIB_D.map(Z);
const KEEL_D0 = 79;
const COLLAR_D0 = 92;
const COLLAR_D1 = 99;
const BODY_D0 = 106;
const BLOCK_D0 = 246; // block front (the top ramp starts here)
const BODY_D1 = 300; // the body box runs under the block to the stern face

// stern block: chamfered box; faces: 0 top | 1 L top chamfer | 2 L side | 3 L low chamfer | 4 bottom |
// 5 R low chamfer | 6 R side | 7 R top chamfer
function blockPts(yTop, hw, yBot, cx, cy, cLow) {
  return [
    [hw - cx, yTop],
    [-(hw - cx), yTop],
    [-hw, yTop - cy],
    [-hw, yBot + cLow],
    [-(hw - cLow), yBot],
    [hw - cLow, yBot],
    [hw, yBot + cLow],
    [hw, yTop - cy],
  ];
}
const BLOCK_HW = 27;
const BLOCK_TOP = 36.6;
const BLOCK_RAMP_D1 = 298;
const blockTopAt = (d) =>
  table(
    [
      [BLOCK_D0, 27.8],
      [BLOCK_RAMP_D1, BLOCK_TOP],
      [325, BLOCK_TOP],
      [330, 34],
    ],
    d,
  );
const blockBotAt = (d) =>
  table(
    [
      [260, KEEL_BOT],
      [274, KEEL_BOT],
      [300, -27.2],
      [330, -27.2],
    ],
    d,
  );
// engine pods: two columns of four long rounded pods (y bottom, y top, aft face d, nozzle radius);
// the rows step further aft going up (raked stern, reference side view and CG renders)
const POD_X = 13.5;
const POD_HW = 11.4;
const POD_D0 = 300; // pod fronts sit inside the block
const POD_ROWS = [
  { y0: -27, y1: -16.6, aft: 330, r: 4.7 },
  { y0: -15.2, y1: -1.2, aft: 335, r: 6.1 },
  { y0: 0.2, y1: 13.8, aft: 340, r: 6.1 },
  { y0: 15.2, y1: 32.4, aft: 345, r: 6.4 },
];
// stern block stations: ramped top, lower block from d = 258, underside sloping to -27.2, then the
// raked stern face stepping up the pod rows (each step hides behind the pod below it)
const BLOCK_ST = [
  { d: BLOCK_D0, top: 27.8, bot: LEDGE, cLow: 0 },
  { d: 258, top: blockTopAt(258), bot: LEDGE, cLow: 0 },
  { d: 260, top: blockTopAt(260), bot: KEEL_BOT, cLow: 4 },
  { d: 274, top: blockTopAt(274), bot: KEEL_BOT, cLow: 4 },
  { d: 300, top: BLOCK_TOP, bot: -27.2, cLow: 5 },
  { d: 305, top: BLOCK_TOP, bot: -27.2, cLow: 5 },
  { d: 310, top: BLOCK_TOP, bot: POD_ROWS[0].y1, cLow: 0 },
  { d: 316, top: BLOCK_TOP, bot: POD_ROWS[1].y1, cLow: 0 },
  { d: 322, top: BLOCK_TOP, bot: POD_ROWS[2].y1, cLow: 0 },
  { d: 325, top: BLOCK_TOP, bot: 30, cLow: 0 },
  { d: 330, top: 34, bot: POD_ROWS[3].y1, cLow: 0 },
].map((s) => ({
  z: Z(s.d),
  pts: blockPts(
    s.top,
    BLOCK_HW,
    s.bot,
    3.5,
    Math.min(7, s.top - s.bot),
    s.cLow,
  ),
}));

export function buildCarrack(mats) {
  const parts = [];
  const hardpoints = [];
  const engines = [];
  const turrets = [];
  const add = (geo, mat, opts) => parts.push(mpart(geo, mat, opts));
  const rand = rng(4242);

  // per-section plate tone (sections split at the frames) and a soot gradient on the pod tails
  const secTone = [];
  for (let i = 0; i < 8; i++) secTone.push(1 + (rand() - 0.5) * 0.1);
  const sectionOf = (z) => {
    let i = 0;
    for (const r of RIB_Z) if (z > r) i++;
    if (z > Z(BLOCK_D0)) i = 5;
    if (z > Z(300)) i = 6;
    return i;
  };
  const shade = (base, k = 1) => {
    return (x, y, z, o) => {
      o.copy(base).multiplyScalar(k * secTone[sectionOf(z)]);
    };
  };
  const sootAft = (base) => (x, y, z, o) => {
    mix(base, STERN, 0.7 * smoothstep(Z(318), Z(346), z), o);
  };

  const bucketMat = {
    seam: ["dark", { color: SEAM, texel: 1 / 4 }],
    belly: ["hull", { tint: shade(BELLY), texel: TEX }],
    low: ["hull", { tint: shade(HULL_LOW), texel: TEX }],
    steep: ["hull", { tint: shade(HULL, 0.97), texel: TEX }],
    strip: ["hull", { tint: shade(HULL_LOW, 0.95), texel: TEX }],
    top: ["hull", { tint: shade(HULL_TOP), texel: TEX }],
    hull: ["hull", { tint: shade(HULL), texel: TEX }],
    ledge: ["dark", { color: RECESS, texel: 1 / 4 }],
    keel: ["hull", { tint: shade(KEEL), texel: 1 / 16 }],
    stern: ["dark", { color: 0x9a9088, texel: 1 / 5 }],
  };
  const addBuckets = (map, lod) => {
    for (const [key, geo] of map) {
      const [mat, opts] = bucketMat[key];
      add(geo, mat, { ...opts, lod });
    }
  };

  // ---------------------------------------------------------------------------
  // head loft (thin station pairs at d = 49 and 71 cut the vertical panel seams into the sides)
  // ---------------------------------------------------------------------------
  const HEAD_D = [
    0,
    2,
    3,
    4,
    6,
    8,
    10,
    10.4,
    11.4,
    14,
    18,
    19.5,
    22,
    24,
    27,
    27.3,
    29,
    30.9,
    33,
    36,
    42,
    48.7,
    49.3,
    52,
    58,
    64,
    70.7,
    71.3,
    77,
    82,
    86,
    90,
    HEAD_END,
  ];
  const HEAD_D_LOW = [0, 4, 8, 14, 22, 27, 33, 52, 58, 64, 77, 90, HEAD_END];
  const F = {
    top: (i) => i === 0,
    side: (i) => i === 1 || i === 11,
    band: (i) => i === 2 || i === 10,
    steep: (i) => i === 3 || i === 9,
    chamfer: (i) => i === 4 || i === 8,
    strip: (i) => i === 5 || i === 7,
    bottom: (i) => i === 6,
  };
  const headTag = (lod) => (s, i, A, B) => {
    if (
      lod < 2 &&
      B.d - A.d < 0.7 &&
      (F.side(i) || F.band(i) || F.steep(i) || F.chamfer(i))
    )
      return "seam";
    if (F.bottom(i)) return "belly";
    if (F.chamfer(i)) return "low";
    if (F.steep(i)) return "steep";
    if (F.strip(i)) return "strip";
    if (F.top(i)) return "top";
    return "hull";
  };
  for (const lod of [0, 1, 2]) {
    const ds = lod === 2 ? HEAD_D_LOW : HEAD_D;
    addBuckets(
      loftTagged(ds.map(headStation), headTag(lod), {
        capStart: "hull",
        capEnd: "hull",
      }),
      lod,
    );
  }
  // bridge glass: the front pane on the front chamfer (inset 1.5 m from the creases) and the side
  // panes on the upper side faces (reference: 1.5 m under the crease, flat bottom edge at y = 3.5,
  // pointed aft end at d = 30.9), plus the dark mullion band along the creases
  const PANE_D = [10.4, 10.8, 11.4, 13, 16, 19.5, 22, 24, 27, 27.3, 29, 30.9];
  const sideTop = (d) =>
    d <= 27.3
      ? headTop(d) - 1.5
      : 16.1 + ((d - 27.3) * (12.3 - 16.1)) / (30.9 - 27.3);
  const sideBot = (d) =>
    table(
      [
        [10.4, 3.4],
        [10.8, 2.8],
        [11.4, 2.4],
        [19.5, 2.4],
        [30.9, 12.3],
      ],
      d,
    );
  for (const lod of [0, 1, 2]) {
    const ds = lod === 2 ? [10.4, 14, 19.5, 27.3, 30.9] : PANE_D;
    for (const side of [-1, 1])
      add(
        ribbon(
          ds.map((d) => headAt(d, Math.min(sideBot(d), sideTop(d)), side, 0.2)),
          ds.map((d) => headAt(d, sideTop(d), side, 0.2)),
          [side, 0.6, 0],
        ),
        "windows",
        { color: GLASS, lod, uv: "keep" },
      );
    const fd =
      lod === 2 ? [10.4, 18, 27.3] : [10.4, 11.4, 14, 18, 22, 27, 27.3];
    add(
      ribbon(
        fd.map((d) => [-(headTopX(d) - 1.5), headTop(d) + 0.2, Z(d)]),
        fd.map((d) => [headTopX(d) - 1.5, headTop(d) + 0.2, Z(d)]),
        [0, 1, -0.6],
      ),
      "windows",
      { color: GLASS, lod, uv: "keep" },
    );
    // hull-coloured mullion band along the creases separating the front pane from the side panes
    // (reference CG renders: a light frame, not a dark channel)
    if (lod < 2)
      for (const side of [-1, 1]) {
        const md = [9.4, 11.4, 14, 18, 22, 27, 28.6];
        add(
          ribbon(
            md.map((d) => headAt(d, headTop(d) - 1.6, side, 0.3)),
            md.map((d) => headAt(d, headTop(d), side, 0.3)),
            [side, 0.6, 0],
          ),
          "hull",
          { color: HULL_TOP, texel: 1 / 10, lod },
        );
        add(
          ribbon(
            md.map((d) => [side * headTopX(d), headTop(d) + 0.3, Z(d)]),
            md.map((d) => [side * (headTopX(d) - 1.6), headTop(d) + 0.3, Z(d)]),
            [0, 1, -0.6],
          ),
          "hull",
          { color: HULL_TOP, texel: 1 / 10, lod },
        );
      }
  }
  // maroon stripe across the head top: from the port crease just aft of the glass, diagonally aft to
  // the centreline at the collar (reference CG renders, both bow views)
  for (const lod of [0, 1]) {
    const sd = [31, 36, 42, 48, 52, 56, 60, 64, 70, 76, 82, 88];
    const cx = (d) =>
      -(headTopX(d) - 1) + ((d - 31) / (88 - 31)) * (headTopX(d) + 3);
    add(
      ribbon(
        sd.map((d) => [cx(d) - 2.6, headTop(d) + 0.12, Z(d)]),
        sd.map((d) => [cx(d) + 2.6, headTop(d) + 0.12, Z(d)]),
        [0, 1, 0],
      ),
      "paint",
      { color: MAROON, lod, uv: "keep" },
    );
  }
  // diagonal panel seams on the upper side faces (reference diagram) and on the lower chamfers; each
  // bar stays on one planar facet
  for (const side of [-1, 1])
    for (const [d0, y0, d1, y1] of [
      [31, 12, 47.5, 0.6],
      [49.3, -10.2, 53.5, -23],
      [71.3, -10.2, 76, -23],
    ])
      add(
        bar(headAt(d0, y0, side, 0.12), headAt(d1, y1, side, 0.12), 0.4, 0.4),
        "dark",
        { color: SEAM, texel: 1 / 3, lod: 0 },
      );
  // low plates on the crest, nose hatch, shoulder-band ports, facet fittings and a lower hatch
  for (const [x, d, len, wid] of [
    [-5, 63, 12, 8],
    [7, 68, 8, 5],
  ])
    lippedPlate(add, {
      c: [x, headTop(d), Z(d)],
      n: [0, 1, 0],
      along: [0, 0, 1],
      len,
      wid,
      lod: 0,
      color: HULL_TOP,
      lipColor: RECESS,
    });
  hatch(add, {
    c: [0, -3.8, Z(0)],
    n: [0, 0, -1],
    along: [1, 0, 0],
    w: 6,
    h: 3.6,
    lod: 0,
    color: HULL,
    rimColor: RECESS,
    big: true,
  });
  for (const side of [-1, 1]) {
    slotRow(add, {
      c: headAt(46, 0, side, 0.05),
      n: [side, 0, 0],
      along: [0, 0, 1],
      count: 2,
      len: 1.2,
      gap: 0.8,
      h: 1.8,
      lod: 0,
      panes: 1,
      glow: WINDOW,
      rim: RECESS,
    });
    const p = headAt(28, -6, side);
    const n = profN(-6);
    for (const lod of [0, 1])
      lippedPlate(add, {
        c: p,
        n: [side * n[0], n[1], 0],
        along: [0, 0, 1],
        len: 10,
        wid: 3,
        lod,
        color: HULL,
        lipColor: RECESS,
      });
    const q = headAt(56, -17, side);
    const m = profN(-17);
    lippedPlate(add, {
      c: q,
      n: [side * m[0], m[1], 0],
      along: [0, 0, 1],
      len: 9,
      wid: 4,
      lod: 0,
      color: HULL_LOW,
      lipColor: RECESS,
    });
  }

  // ---------------------------------------------------------------------------
  // collar + mid hull: the keel box from under the head, two collar steps, the box to the stern face
  // ---------------------------------------------------------------------------
  const bodyTag = (s, i) => {
    if (i === 0) return "top";
    if (i === 3 || i === 9) return "ledge";
    if (i >= 4 && i <= 8) return "keel";
    return "hull";
  };
  const bodyPtsAt = (d) => {
    if (d < COLLAR_D1 + 0.005) return COLLAR_A;
    if (d < BODY_D0 + 0.005) return COLLAR_B;
    return BODY;
  };
  for (const lod of [0, 1, 2]) {
    const ds = [
      COLLAR_D0,
      COLLAR_D1,
      COLLAR_D1 + 0.01,
      BODY_D0,
      BODY_D0 + 0.01,
      ...(lod === 2 ? [] : RIB_D),
      BODY_D1,
    ];
    addBuckets(
      loftTagged(
        ds.map((d) => ({ z: Z(d), pts: bodyPtsAt(d) })),
        bodyTag,
        { capStart: "hull", capEnd: "hull" },
      ),
      lod,
    );
    addBuckets(
      loftTagged(
        [
          { z: Z(KEEL_D0), pts: KEEL_ONLY },
          { z: Z(COLLAR_D0), pts: KEEL_ONLY },
        ],
        (s, i) => (i === 5 ? null : "keel"),
        { capStart: "keel" },
      ),
      lod,
    );
  }
  // raised frames wrapping the upper box (reference CG renders: bright white bands, 3.4 m wide, 2 m
  // proud, the brightest elements of the hull) — flat paint so they read white against the plating
  const ribPts = inflatePts(BOX, 2);
  for (const lod of [0, 1, 2])
    for (const zr of RIB_Z) {
      const m = loftTagged(
        [
          { z: zr - 1.7, pts: ribPts },
          { z: zr + 1.7, pts: ribPts },
        ],
        () => "rib",
        { capStart: "rib", capEnd: "rib" },
      );
      add(m.get("rib"), "paint", { color: FRAME, texel: 1 / 8, lod });
    }
  // flank fairing behind the collar: top at the deck chamfer, front edge sloping down to y = 4.2 at
  // d = 138, level to the second frame; two rails along it
  for (const lod of [0, 1])
    for (const side of [-1, 1]) {
      const shape = new THREE.Shape();
      shape.moveTo(Z(100), 19);
      shape.lineTo(Z(178), 19);
      shape.lineTo(Z(178), 4.2);
      shape.lineTo(Z(138), 4.2);
      shape.lineTo(Z(100), 13.9);
      shape.closePath();
      const g = new THREE.ExtrudeGeometry(shape, {
        depth: 1.2,
        bevelEnabled: false,
      });
      g.rotateY(-Math.PI / 2);
      g.translate(side > 0 ? 24.2 : -23, 0, 0);
      add(g, "hull", { tint: shade(HULL, 0.97), texel: TEX, lod });
      for (const y of [15.6, 17.6])
        add(
          tubeZ(
            0.5,
            0.5,
            Z(176) - Z(108),
            lod ? 6 : 8,
            side * 24.6,
            y,
            Z(142),
            false,
          ),
          "dark",
          { color: DARK, texel: 1 / 3, lod },
        );
    }
  // maroon stripes: along the port top chamfer between the frames, and on the starboard deck aft
  // of the second frame (reference stern render)
  for (const lod of [0, 1]) {
    const segs = [
      [BODY_D0 + 3, RIB_D[0] - 3],
      [RIB_D[0] + 3, RIB_D[1] - 3],
      [RIB_D[1] + 3, RIB_D[2] - 3],
      [RIB_D[2] + 3, RIB_D[3] - 3],
      [RIB_D[3] + 3, BLOCK_D0 - 2],
    ];
    segs.forEach(([d0, d1], i) => {
      const g = new THREE.BoxGeometry(3, 0.25, d1 - d0);
      g.rotateZ(Math.PI / 4);
      g.translate(-20.1, 22.1, Z((d0 + d1) / 2));
      add(g, "paint", { color: MAROON, lod, uv: "keep" });
      if (i >= 2)
        add(
          new THREE.BoxGeometry(4, 0.25, d1 - d0).translate(
            12,
            DECK + 0.1,
            Z((d0 + d1) / 2),
          ),
          "paint",
          { color: MAROON, lod, uv: "keep" },
        );
    });
  }
  // three conduits on the deck converging toward the collar, the sensor ball on its pedestal
  for (const lod of [0, 1]) {
    for (const [x0, x1] of [
      [0, 0],
      [9, 3.5],
      [-9, -3.5],
    ])
      add(
        bar([x0, DECK + 0.9, Z(160)], [x1, DECK + 0.9, Z(93)], 1.8, 1.8),
        "dark",
        {
          color: DARK,
          texel: 1 / 3,
          lod,
        },
      );
    add(
      new THREE.CylinderGeometry(1.4, 1.6, 1.8, lod ? 8 : 12).translate(
        -10,
        DECK + 0.9,
        Z(119),
      ),
      "dark",
      { color: DARK, texel: 1 / 3, lod },
    );
    add(
      new THREE.SphereGeometry(2.4, lod ? 10 : 16, lod ? 6 : 10).translate(
        -10,
        DECK + 3.4,
        Z(119),
      ),
      "hull",
      { color: HULL_TOP, texel: 1 / 4, lod },
    );
    add(domeUp(9, DECK, Z(116), 2.2, lod ? 8 : 12, lod ? 3 : 5), "hull", {
      color: HULL_TOP,
      texel: 1 / 4,
      lod,
    });
  }
  // collar window column (three small lit slots on each flank of the aft collar step)
  for (const lod of [0, 1])
    for (const side of [-1, 1])
      for (const y of [12, 8, 4])
        slotRow(add, {
          c: [side * 24.05, y, Z(102.5)],
          n: [side, 0, 0],
          along: [0, 0, 1],
          count: 1,
          len: 2.6,
          h: 1.6,
          lod,
          panes: 1,
          glow: WINDOW,
          rim: RECESS,
        });
  // flank window row above the ledge (reference groups of 3 / 2 / 5 / 3 / 1 between d = 108..168)
  for (const lod of [0, 1])
    for (const side of [-1, 1])
      for (const [dc, count] of [
        [111, 3],
        [125.5, 2],
        [139, 5],
        [157, 3],
        [166, 1],
      ])
        slotRow(add, {
          c: [side * 23.05, -5.6, Z(dc)],
          n: [side, 0, 0],
          along: [0, 0, 1],
          count,
          len: 2,
          gap: 1,
          h: 1.5,
          lod,
          panes: 1,
          glow: WINDOW,
          rim: RECESS,
        });
  // forward rack tube under the ledge with clamps; aft rack blocks hanging at the ledge; shelf rail
  for (const side of [-1, 1]) {
    for (const lod of [0, 1])
      add(
        tubeZ(
          2.3,
          2.3,
          Z(176) - Z(106),
          lod ? 6 : 10,
          side * 20.6,
          LEDGE - 2.5,
          Z(141),
          false,
        ),
        "dark",
        { color: DARK, texel: 1 / 3, lod },
      );
    for (let d = 112; d < 176; d += 16)
      add(
        new THREE.BoxGeometry(3.4, 3.2, 2).translate(
          side * 20.8,
          LEDGE - 1.4,
          Z(d),
        ),
        "dark",
        {
          color: RECESS,
          texel: 1 / 3,
          lod: 0,
        },
      );
    for (const lod of [0, 1])
      for (const [d0, d1] of [
        [180, 194],
        [196, 207],
        [212, 226],
        [228, 244],
      ])
        add(
          new THREE.BoxGeometry(3, 2.4, d1 - d0).translate(
            side * 20.5,
            LEDGE - 1.2,
            Z((d0 + d1) / 2),
          ),
          "dark",
          { color: DARK, texel: 1 / 3, lod },
        );
    add(
      new THREE.BoxGeometry(1, 1.2, Z(244) - Z(180)).translate(
        side * 23.5,
        LEDGE + 1.2,
        Z(212),
      ),
      "dark",
      {
        color: RECESS,
        texel: 1 / 3,
        lod: 0,
      },
    );
  }
  // keel: plate lines along the keel sides and the bottom chamfer
  for (const side of [-1, 1])
    for (const [x, y] of [
      [19.15, -14],
      [19.15, -16.5],
      [17.15, -19.95],
    ])
      add(
        new THREE.BoxGeometry(0.5, 0.5, Z(BLOCK_D0) - Z(BODY_D0 + 2)).translate(
          side * x,
          y,
          Z((BODY_D0 + 2 + BLOCK_D0) / 2),
        ),
        "dark",
        { color: SEAM, texel: 1 / 3, lod: 0 },
      );
  // deck hatches between the frames, vent grilles on the top chamfer (reference d = 150-157, 200-208)
  for (let j = 0; j < RIB_D.length - 1; j++) {
    const dc = (RIB_D[j] + RIB_D[j + 1]) / 2;
    hatch(add, {
      c: [-8, DECK, Z(dc + (j % 2 ? 4 : -4))],
      n: [0, 1, 0],
      along: [0, 0, 1],
      w: 5,
      h: 6,
      lod: 0,
      color: HULL_TOP,
      rimColor: RECESS,
      big: true,
    });
    hatch(add, {
      c: [3, DECK, Z(dc + (j % 2 ? -7 : 7))],
      n: [0, 1, 0],
      along: [0, 0, 1],
      w: 3,
      h: 3.5,
      lod: 0,
      color: HULL,
      rimColor: RECESS,
    });
  }
  for (const side of [-1, 1])
    for (const dc of [153.5, 204]) {
      const n = [side * 0.707, 0.707, 0];
      const c = [side * 20.3, 21.7, Z(dc)];
      add(quadAt(c, n, [0, 0, 1], 7, 1.8, 0.06), "dark", {
        color: RECESS,
        texel: 1 / 3,
        lod: 0,
      });
      for (let i = 0; i < 4; i++)
        add(
          quadAt(
            [c[0], c[1], c[2] - 2.6 + i * 1.73],
            n,
            [0, 0, 1],
            0.6,
            1.4,
            0.12,
          ),
          "hull",
          {
            color: HULL_TOP,
            texel: 1 / 3,
            lod: 0,
          },
        );
    }

  // ---------------------------------------------------------------------------
  // dorsal sensor dish on a braced mast (14 m dish, top 14 m over the deck), antenna cluster before
  // the stern block
  // ---------------------------------------------------------------------------
  for (const lod of [0, 1, 2])
    dishMast(add, {
      base: [0, DECK, Z(131)],
      up: [0, 1, 0],
      height: 8,
      aim: [0, 0.5, -0.87],
      r: 7,
      lod: lod === 0 ? 0 : 1,
      mast: DARK,
      dish: HULL_TOP,
      braceSpan: 0.6,
    });
  for (const lod of [0, 1])
    antennaCluster(add, {
      base: [5, DECK, Z(239)],
      up: [0, 1, 0],
      scale: 0.6,
      lod,
      mast: DARK,
      plate: HULL,
    });

  // ---------------------------------------------------------------------------
  // ventral keel blade (reference diagram: d 97-214, 6.6 m deep, lit lower edge aft) and the landing
  // strut with its foot pad (d = 218)
  // ---------------------------------------------------------------------------
  for (const lod of [0, 1, 2]) {
    add(
      new THREE.BoxGeometry(3.6, 6.6, Z(214) - Z(97)).translate(
        0,
        KEEL_BOT - 3.3,
        Z(155.5),
      ),
      "hull",
      { tint: shade(KEEL, 0.9), texel: 1 / 16, lod },
    );
    if (lod < 2)
      add(
        new THREE.BoxGeometry(4, 1, Z(214) - Z(164)).translate(
          0,
          KEEL_BOT - 6.2,
          Z(189),
        ),
        "hull",
        { color: HULL, texel: 1 / 4, lod },
      );
  }
  for (const lod of [0, 1]) {
    add(bar([0, KEEL_BOT, Z(217)], [0, -36.5, Z(219)], 1.6, 1.6), "dark", {
      color: DARK,
      texel: 1 / 3,
      lod,
    });
    add(new THREE.BoxGeometry(5, 1, 8).translate(0, -37, Z(219.5)), "dark", {
      color: DARK,
      texel: 1 / 3,
      lod,
    });
  }

  // ---------------------------------------------------------------------------
  // stern block: ramped front, lower block, sloping underside, reactor domes, seams, hatches, top plates
  // ---------------------------------------------------------------------------
  const blockTag = (s, i) => {
    if (i === 0) return "top";
    if (i === 4) return "belly";
    if (i === 3 || i === 5) return "low";
    return "hull";
  };
  for (const lod of [0, 1, 2])
    addBuckets(
      loftTagged(BLOCK_ST, blockTag, { capStart: "hull", capEnd: "stern" }),
      lod,
    );
  // dark recessed panel under the sloping underside (reference aft photo)
  add(
    quadAt(
      [0, blockBotAt(287) - 0.1, Z(287)],
      [0, -1, -0.208],
      [0, 0, 1],
      14,
      30,
      0,
    ),
    "dark",
    { color: RECESS, texel: 1 / 4, lod: 0 },
  );
  // elliptical reactor domes (42 x 19.4 m, 5.5 m proud) with a dark base ring
  for (const lod of [0, 1, 2])
    for (const side of [-1, 1]) {
      add(
        sideDome(
          side * BLOCK_HW,
          18.5,
          Z(294),
          21,
          9.7,
          5.5,
          side,
          lod === 0 ? 24 : lod === 1 ? 14 : 8,
          lod === 0 ? 8 : lod === 1 ? 5 : 3,
        ),
        "hull",
        { tint: shade(HULL, 1.02), texel: 1 / 8, lod },
      );
      if (lod < 2)
        add(
          sideDome(
            side * (BLOCK_HW - 0.2),
            18.5,
            Z(294),
            22,
            10.6,
            0.9,
            side,
            lod === 0 ? 24 : 14,
            2,
          ),
          "dark",
          { color: RECESS, texel: 1 / 4, lod },
        );
      // vertical seam across the block side below the dome (reference diagram d = 301)
      add(
        new THREE.BoxGeometry(0.3, 28, 0.6).translate(
          side * (BLOCK_HW + 0.05),
          -6,
          Z(301),
        ),
        "dark",
        { color: SEAM, texel: 1 / 3, lod: 0 },
      );
    }
  // low equipment plate on the block top with two vent slots on its front, raised side plates, edge bars
  for (const lod of [0, 1]) {
    add(
      new THREE.BoxGeometry(16, 0.9, 20).translate(0, BLOCK_TOP + 0.45, Z(311)),
      "hull",
      { tint: shade(HULL_TOP, 0.98), texel: 1 / 6, lod },
    );
    if (lod === 0)
      for (const s of [-1, 1])
        add(
          quadAt(
            [s * 3, BLOCK_TOP + 0.45, Z(301) - 0.1],
            [0, 0, -1],
            [0, 1, 0],
            2.6,
            0.6,
            0.05,
          ),
          "windows",
          {
            color: WINDOW,
            lod,
            uv: "keep",
          },
        );
  }
  for (const s of [-1, 1]) {
    lippedPlate(add, {
      c: [s * 16, BLOCK_TOP, Z(319)],
      n: [0, 1, 0],
      along: [0, 0, 1],
      len: 10,
      wid: 8,
      lod: 0,
      color: HULL_TOP,
      lipColor: RECESS,
    });
    for (const lod of [0, 1])
      add(
        new THREE.BoxGeometry(1, 1, Z(324) - Z(300)).translate(
          s * 22.5,
          BLOCK_TOP + 0.5,
          Z(312),
        ),
        "hull",
        { tint: shade(HULL_TOP, 1.03), texel: 1 / 4, lod },
      );
  }
  // hatches on the block flanks below the dome
  for (const side of [-1, 1])
    for (const [y, d] of [
      [-6, 268],
      [-17, 283],
      [-6, 298],
    ])
      hatch(add, {
        c: [side * BLOCK_HW, y, Z(d)],
        n: [side, 0, 0],
        along: [0, 0, 1],
        w: 6,
        h: 5,
        lod: 0,
        color: HULL,
        rimColor: RECESS,
        big: true,
      });

  // ---------------------------------------------------------------------------
  // engines: two columns of four long rounded pods on the raked stern, one deep nozzle bell each
  // ---------------------------------------------------------------------------
  for (const lod of [0, 1, 2])
    for (const row of POD_ROWS)
      for (const side of [-1, 1]) {
        const cx = side * POD_X;
        const cy = (row.y0 + row.y1) / 2;
        const hh = (row.y1 - row.y0) / 2;
        const zAft = Z(row.aft);
        add(
          roundedBoxZ(
            cx,
            cy,
            Z(POD_D0),
            zAft,
            POD_HW,
            hh,
            lod === 2 ? 1 : 2,
            0.3,
          ),
          "hull",
          { tint: sootAft(HULL), texel: 1 / 14, lod },
        );
        const entry = nozzleBell(add, {
          x: cx,
          y: cy,
          zMouth: zAft + 0.3,
          r: row.r,
          depth: 14,
          protrude: 1.6,
          lod,
          shell: SHELL,
          shellDark: SHELL_DK,
        });
        if (lod === 0) engines.push(entry);
      }

  // ---------------------------------------------------------------------------
  // weapons: tracking turrets (instanced by the Fleet) and fixed bow guns in the shoulder band
  // ---------------------------------------------------------------------------
  const heavy = carrackTurret(4.8, HULL, TURRET_DARK, 1, { rate: 0.5 });
  const light = carrackTurret(3.2, HULL, TURRET_DARK, 0, {
    rate: 1.1,
    yawLimit: 2.8,
  });
  const pad = (pos, up, r, lod) => {
    const g = new THREE.CylinderGeometry(r, r + 0.5, 0.8, lod ? 8 : 12);
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(...up).normalize(),
    );
    g.applyQuaternion(q);
    const u = new THREE.Vector3(...up).normalize().multiplyScalar(0.3);
    g.translate(pos[0] + u.x, pos[1] + u.y, pos[2] + u.z);
    add(g, "hull", { color: HULL_LOW, texel: 1 / 4, lod });
  };
  const mount = (type, pos, up, dir, kind, range) => {
    const def = type === "heavy" ? heavy : light;
    for (const lod of [0, 1]) pad(pos, up, def.size * 1.15, lod);
    const k = turrets.length;
    const u = new THREE.Vector3(...up).normalize();
    turrets.push({
      type,
      pos: pos.map((v, i) => v + u.getComponent(i) * 0.6),
      up,
      forward: [0, 0, -1],
    });
    const tip = new THREE.Vector3(...pos)
      .addScaledVector(u, def.pivotY + 0.6)
      .add(new THREE.Vector3(0, 0, -def.barrelLen));
    hardpoints.push({ pos: tip.toArray(), dir, kind, range, turret: k });
  };
  // heavy turbolasers: two on the head crest, two on the stern-block top
  for (const s of [-1, 1]) {
    mount(
      "heavy",
      [s * 9, headTop(81), Z(81)],
      [0, 1, 0],
      [s * 0.2, 0.35, -0.9],
      "heavy",
      12000,
    );
    mount(
      "heavy",
      [s * 15, BLOCK_TOP, Z(306)],
      [0, 1, 0],
      [s * 0.3, 0.4, -0.85],
      "heavy",
      12000,
    );
  }
  // light twin mounts: two per flank between the aft frames, three on the keel
  for (const s of [-1, 1]) {
    for (const d of [193, 224])
      mount(
        "light",
        [s * 23, 9, Z(d)],
        [s, 0, 0],
        [s * 0.6, 0, -0.8],
        "light",
        7000,
      );
    mount(
      "light",
      [s * 9, KEEL_BOT, Z(150)],
      [0, -1, 0],
      [s * 0.3, -0.6, -0.75],
      "light",
      7000,
    );
  }
  mount(
    "light",
    [0, KEEL_BOT, Z(232)],
    [0, -1, 0],
    [0, -0.6, -0.8],
    "light",
    7000,
  );
  // fixed bow guns: a housing proud of the shoulder band each side with twin tubes running forward
  for (const s of [-1, 1]) {
    const x = s * (XW + 0.5);
    for (const lod of [0, 1]) {
      add(new THREE.BoxGeometry(2.6, 2.6, 6).translate(x, 0, Z(27)), "dark", {
        color: DARK,
        texel: 1 / 3,
        lod,
      });
      for (const b of [-0.7, 0.7])
        add(tubeZ(0.4, 0.5, 9, lod ? 5 : 6, x + b, 0, Z(19.5), false), "dark", {
          color: RECESS,
          texel: 1 / 3,
          lod,
        });
    }
    hardpoints.push({
      pos: [x, 0, Z(14.5)],
      dir: [s * 0.1, 0, -1],
      kind: "light",
      range: 6000,
    });
  }

  return assemble(
    {
      id: "carrack",
      side: "republic",
      length: L,
      parts,
      hardpoints,
      engines,
      bounds: { radius: 190 },
      turretTypes: { heavy, light },
      turrets,
    },
    mats,
  );
}
