// Acclamator-class assault ship (Republic), 752 m. Original procedural geometry after the film model
// (MF49 profile) and the Clone Wars renders: a clean arrowhead wedge (460 m across the stern, no deck
// doors) with a comparatively thick (85 m at the stern) flat-sided hull. The flanks step down once: a
// light deck lip, a thin upper wall, then the dark greebled and lit machinery trench (~18 m the whole
// length, recessed under a ledge and wrapping around the stern), a proud ledge and the tall lower slab
// (about half the flank, leaning in ~30 degrees) down to the broad flat belly. A shallow maroon dorsal
// spine (~40 m across at its end) runs from the bow to a single stepped superstructure at 44–86 % of the
// length: a long shallow front ramp up to tier 1 (28 m above the deck, 27 % of the stern width), a tier-2
// pedestal, a thin forward-leaning conning neck at 75 % of the length and a flat 112 m bridge head that
// reads as a T from above (long rounded stem with a blue viewport band, athwartships crossbar over the
// neck, sensor dome and mast aft). A flat aft deck follows the block to the broad stern, which carries a
// wide bank of four nozzle bells (two large in cylindrical pods set low in the stern wall flanking the
// ventral keel's end, two medium higher and outboard under the machinery band); a ventral keel with
// boarding-ramp doors runs to the stern. Heavy quad turbolaser turrets sit on the aft deck outboard of
// the block and hang from belly barbettes, light emplacements line the deck edges. Light grey plating with
// dark panel lines, five red stripes on each aft wing parallel to the leading edges and two roundels
// flanking the ramp. Three complete LODs; geometry is built once and instanced.
import * as THREE from "three";
import { assemble, boxMM, cylY, part } from "./shipKit.js";
import {
  rng,
  lerp,
  clamp,
  pw,
  loftProfile,
  loftFrame,
  surfaceBox,
  quadFacing,
  cylZ,
  tube,
  nozzle,
  mulColor,
  jitterColor,
  lin,
  framePlate,
  facetedDome,
} from "./venatorKit.js";
import {
  yLoft,
  octRect,
  frustum,
  frustumOct,
  decalQuad,
  decalDisc,
  windowRow,
  orientedBoxAt,
} from "./acclamatorKit.js";
import { heavyTurret, lightTurret, HEAVY, LIGHT } from "./acclamatorTurrets.js";

export const ACCLAMATOR = { length: 752, width: 460, height: 207 };

const L = ACCLAMATOR.length;
const LH = 735; // hull from the bow tip to the stern wall; the nozzle bells reach ~765
const WMAX = 230;
const zBow = -L / 2;
// zr = metres aft of the bow tip
const Z = (zr) => zBow + zr;

// ---- palette (linear albedo multipliers on the plating map, see venator.js for the calibration).
// The Acclamator is a cooler, neutral light grey (not the Venator's cream): sat ~0.04, the deck a mid-light
// grey that still reads pale next to the dark trench.
const DECK = lin(0.6, 0.59, 0.565);
const DECK_LIGHT = lin(0.66, 0.65, 0.625);
const UPPER = lin(0.52, 0.515, 0.495); // upper flank wall
const FLANK = lin(0.46, 0.455, 0.44);
const LOWER = lin(0.44, 0.44, 0.45);
const CHAMFER = lin(0.47, 0.47, 0.475); // the tall lower slab, lit like the deck
const BELLY = lin(0.32, 0.34, 0.4);
const STERN = lin(0.3, 0.29, 0.28);
const BLOCK = lin(0.54, 0.53, 0.505);
const DARK = 0xc8ccd2; // machinery greebles (dark texture x light tint = readable dark grey)
const DARK_RECESS = 0x9a9ea6; // trench walls, shelves
const DARK_SEAM = 0x6e7178; // panel-line grooves, ledge undersides
const MAROON = 0x6a1d1b;
const RED = 0x8c2a22;
const YELLOW = 0xc79a3a;
const WINDOW_WARM = 0xffe2b0;
const BRIDGE_BLUE = 0x8fc0ff;
const ROW_COOL = 0xa8c0e0; // trench lights, under the bloom threshold
const ROW_WARM = 0xd8bc90;

const HULL_TEXEL = [1 / 12, 1 / 18, 1 / 24];

// ---- hull parameterisation (zr metres aft of the bow tip)
const halfW = (zr) => Math.max(1.2, (WMAX * zr) / LH);
const yTop = (zr) =>
  pw(
    [
      [0, 2],
      [40, 11],
      [120, 20],
      [260, 29],
      [480, 38],
      [LH, 41],
    ],
    zr,
  );
const yBot = (zr) =>
  pw(
    [
      [0, -2],
      [40, -9],
      [120, -19],
      [260, -29],
      [480, -39],
      [620, -44],
      [LH, -44],
    ],
    zr,
  );
// deck roof: the two deck planes drop this much from the centre ridge to the edge
const pitchOf = (zr) => (5 * halfW(zr)) / WMAX;
// flank stack heights (film model): a thin upper wall right under the deck lip, the machinery trench of
// a nearly constant ~18 m along the whole hull, a proud ledge under it and the tall lower slab (about
// half of the flank) down to the belly
const upperH = (zr) =>
  pw(
    [
      [40, 0],
      [120, 3],
      [400, 7],
      [LH, 10],
    ],
    zr,
  );
const trenchH = (zr) =>
  pw(
    [
      [30, 0],
      [80, 11],
      [200, 17],
      [LH, 17],
    ],
    zr,
  );
const wallH = (zr) =>
  pw(
    [
      [30, 0],
      [120, 3],
      [LH, 4],
    ],
    zr,
  );
const insetD = (zr) => Math.min(8, halfW(zr) * 0.4); // deck edge inboard of the upper wall
const insetU = (zr) => Math.min(3, halfW(zr) * 0.15); // upper wall inboard of the lower wall
const insetT = (zr) => Math.min(8, halfW(zr) * 0.3); // trench wall inboard of the lower wall
const chamferH = (zr) => Math.min(4, halfW(zr) * 0.25);
const yEdge = (zr) => yTop(zr) - pitchOf(zr);
const yLipTop = (zr) => yEdge(zr) - chamferH(zr);
const yTT = (zr) => yLipTop(zr) - upperH(zr); // trench top (ledge underside)
const yShelf = (zr) => yTT(zr) - trenchH(zr);
const yWallBot = (zr) => yShelf(zr) - wallH(zr);
// the lower slab leans in ~30 degrees to a belly nearly as wide as the deck (flat-sided hull)
const wBelly = (zr) => halfW(zr) * 0.86;
const wDeck = (zr) => halfW(zr) - insetD(zr);
// deck height at (x, zr) on the two deck planes
const deckY = (x, zr) =>
  yTop(zr) - pitchOf(zr) * clamp(Math.abs(x) / wDeck(zr), 0, 1);
// belly height at (x, zr) (flat belly, then the chamfer up to the lower wall)
const bellyY = (x, zr) => {
  const ax = Math.abs(x);
  const wB = wBelly(zr);
  if (ax <= wB) return yBot(zr);
  const t = clamp((ax - wB) / (halfW(zr) - wB), 0, 1);
  return lerp(yBot(zr), yWallBot(zr), t);
};

// deck plate bands: the deck edge is split at these fractions (edge -> centre) so each band is its own
// plate zone with its own tone, giving the big trapezoidal plates that follow the wedge
const BAND = [0.36, 0.66];

// 21-point cross section, counter-clockwise seen from astern (bottom edge running +x)
function hullProfile(zr) {
  const W = halfW(zr);
  const yt = yTop(zr);
  const yb = yBot(zr);
  const ye = yEdge(zr);
  const yl = yLipTop(zr);
  const ytt = yTT(zr);
  const ys = yShelf(zr);
  const yw = yWallBot(zr);
  const wB = wBelly(zr);
  const iD = insetD(zr);
  const iU = insetU(zr);
  const iT = insetT(zr);
  const wd = W - iD;
  const right = [
    [wB, yb],
    [W, yw],
    [W, ys],
    [W - iT, ys],
    [W - iT, ytt],
    [W - iU, ytt],
    [W - iU, yl],
    [wd, ye],
    [wd * (1 - BAND[0]), lerp(ye, yt, BAND[0])],
    [wd * (1 - BAND[1]), lerp(ye, yt, BAND[1])],
  ];
  return [
    [-wB, yb],
    ...right,
    [0, yt],
    ...right
      .slice(1)
      .reverse()
      .map(([x, y]) => [-x, y]),
  ];
}
const HULL_TAGS = [
  "belly", // 0
  "chamfer", // 1 ventral chamfer R
  "lower", // 2 lower wall R
  "shelf", // 3 trench floor R
  "trench", // 4 trench wall R
  "ledge", // 5 ledge underside R
  "upper", // 6 upper wall R
  "chamferTop", // 7 deck edge chamfer R
  "deckOuter", // 8
  "deckMid", // 9
  "deckInner", // 10
  "deckInner", // 11 (L)
  "deckMid", // 12
  "deckOuter", // 13
  "chamferTop", // 14
  "upper", // 15
  "ledge", // 16
  "trench", // 17
  "shelf", // 18
  "lower", // 19
  "chamfer", // 20
];
const EDGE = {
  belly: 0,
  chamferR: 1,
  lowerR: 2,
  trenchR: 4,
  upperR: 6,
  deckOuterR: 8,
  deckMidR: 9,
  deckInnerR: 10,
  deckInnerL: 11,
  deckMidL: 12,
  deckOuterL: 13,
  upperL: 15,
  trenchL: 17,
  lowerL: 19,
  chamferL: 20,
};
// zone -> [material, tint]
const ZONES = {
  belly: ["hull", BELLY],
  chamfer: ["hull", CHAMFER],
  lower: ["hull", LOWER],
  shelf: ["dark", DARK_RECESS],
  trench: ["dark", mulColor(DARK_RECESS, 0.9)],
  ledge: ["dark", DARK_SEAM],
  upper: ["hull", UPPER],
  chamferTop: ["hull", DECK_LIGHT],
  deckOuter: ["hull", mulColor(DECK, 0.96)],
  deckMid: ["hull", DECK],
  deckInner: ["hull", mulColor(DECK, 1.04)],
  stern: ["hull", STERN],
};

// stations per LOD: every breakpoint of the piecewise profile functions is a station so the loft is the
// exact surface the detail placement assumes
const STATIONS = [
  [
    0,
    6,
    12,
    24,
    40,
    64,
    72,
    80,
    120,
    160,
    205,
    260,
    315,
    375,
    430,
    480,
    535,
    590,
    620,
    660,
    700,
    LH,
  ],
  [0, 12, 40, 64, 80, 120, 200, 260, 375, 480, 620, LH],
  [0, 40, 120, 260, 480, 620, LH],
];

// frame on a deck plane at (x, zr): the deck is three edge strips per side
function deckFrame(secs, x, zr) {
  const wd = wDeck(zr);
  const f = clamp(1 - Math.abs(x) / wd, 0, 0.9999); // 0 at the edge .. 1 at the centre
  const s = x >= 0 ? 1 : -1;
  let j;
  let t;
  if (f < BAND[0]) {
    j = s > 0 ? EDGE.deckOuterR : EDGE.deckOuterL;
    t = f / BAND[0];
  } else if (f < BAND[1]) {
    j = s > 0 ? EDGE.deckMidR : EDGE.deckMidL;
    t = (f - BAND[0]) / (BAND[1] - BAND[0]);
  } else {
    j = s > 0 ? EDGE.deckInnerR : EDGE.deckInnerL;
    t = (f - BAND[1]) / (1 - BAND[1]);
  }
  if (s < 0) t = 1 - t;
  return loftFrame(secs, j, t, Z(zr));
}
// frame on a flank wall edge, tb = 0 at the bottom .. 1 at the top (right edges run upward)
function wallFrame(secs, s, edgeR, edgeL, tb, zr) {
  return loftFrame(secs, s > 0 ? edgeR : edgeL, s > 0 ? tb : 1 - tb, Z(zr));
}
const trenchFrame = (secs, s, tb, zr) =>
  wallFrame(secs, s, EDGE.trenchR, EDGE.trenchL, tb, zr);
const upperFrame = (secs, s, tb, zr) =>
  wallFrame(secs, s, EDGE.upperR, EDGE.upperL, tb, zr);
const lowerFrame = (secs, s, tb, zr) =>
  wallFrame(secs, s, EDGE.lowerR, EDGE.lowerL, tb, zr);

// superstructure tiers, neck and head (zr, metres; hx0/hx1 are the half-widths at the base and the top).
// Tier 1 is a long low block (28 m above the deck, 27 % of the stern width, the deck wings staying open
// outboard of it) from 44 % to 86 % of the length, entered by a long shallow (~17 degree) front ramp;
// a flat aft deck follows it to the stern. Tier 2 is a short pedestal under the neck.
const RAMP_FOOT = 330;
const T1 = {
  y0: 30,
  y1: 64,
  hx0: 62,
  hx1: 56,
  z0: RAMP_FOOT,
  z1: 660,
  zf: 85,
  zb: 12,
};
const T2 = {
  y0: 63,
  y1: 79,
  hx0: 40,
  hx1: 34,
  z0: 520,
  z1: 616,
  zf: 14,
  zb: 10,
};
// neck: a thin pylon (32 m fore-aft, 34 m tall) rising from the aft half of tier 2 and leaning ~20
// degrees toward the bow, its centre at 75 % of the length
const NECK = {
  y0: 78,
  y1: 112,
  hx0: 14,
  hx1: 11,
  z0: 548,
  z1: 580,
  zf: -12,
  zb: 12,
};
// head: a flat 112 m stem (rounded nose 68 m forward of the neck's top) with the 64 m athwartships
// crossbar over the neck's top, reading as a T from above; 14 m thick, its aft end at 77 % of the length
const HEAD = { y0: 111, y1: 125 };
const STEM = { hx0: 14, hx1: 11, z0: 468, z1: 580 };
const BAR = { hx0: 32, hx1: 29, z0: 536, z1: 574 };
const Z_DOME = STEM.z0 + 72; // sensor dome and mast on the head's aft top
const tierBlock = (T, opts) =>
  frustum(T.y0, T.y1, T.hx0, Z(T.z0), Z(T.z1), T.hx1, T.zf, T.zb, opts);
// outward normal of a tier's side face (x > 0) and its front face
const sideNormal = (T) =>
  new THREE.Vector3(T.y1 - T.y0, T.hx0 - T.hx1, 0).normalize();
const frontNormal = (T) =>
  new THREE.Vector3(0, T.zf, -(T.y1 - T.y0)).normalize();
const sideX = (T, y) => lerp(T.hx0, T.hx1, (y - T.y0) / (T.y1 - T.y0));
const frontZ = (T, y) => Z(T.z0) + (T.zf * (y - T.y0)) / (T.y1 - T.y0);
const backZ = (T, y) => Z(T.z1) - (T.zb * (y - T.y0)) / (T.y1 - T.y0);

// ventral keel: half-widths (top / bottom) and depth below the belly, bow end to the stern
const KEEL = { hxTop: 30, hxBot: 22, z0: 290, z1: 758 };
const keelD = (zr) =>
  pw(
    [
      [290, 0],
      [340, 16],
      [758, 16],
    ],
    zr,
  );

// engines: [x, y, r, zEnd(zr)] — two large bells in cylindrical pods set low in the stern wall (their
// bottoms 5 m under the belly line, emerging from the aft belly) flanking the keel and running ~40 m
// past the stern, two medium bells higher and outboard, just under the stern's machinery band: a wide
// bank of four
const NACELLE = { x: 56, y: -28, r: 21, z0: 640, z1: 775 };
const MEDIUM = { x: 102, y: -14, r: 11 };
const ENGINES = [
  [-NACELLE.x, NACELLE.y, 19, NACELLE.z1],
  [NACELLE.x, NACELLE.y, 19, NACELLE.z1],
  [-MEDIUM.x, MEDIUM.y, MEDIUM.r, LH + 4],
  [MEDIUM.x, MEDIUM.y, MEDIUM.r, LH + 4],
];

// heavy turret stations [zr, x]: dorsal shoulders (the deck outboard of the superstructure, keeping the
// forward wedge clean) and ventral barbettes on the flat belly
const HEAVY_DORSAL = [
  [500, 128],
  [700, 134],
];
const HEAVY_VENTRAL = [
  [420, 58],
  [600, 84],
];

function buildLod(lod) {
  const parts = [];
  const hardpoints = [];
  const engines = [];
  const turrets = [];
  const fine = lod === 0;
  const mid = lod <= 1;
  const hullTexel = HULL_TEXEL[lod];
  const rand = rng(4200 + lod);
  const add = (geo, mat, opts = {}) => {
    parts.push(part(geo, mat, { texel: hullTexel, ...opts, lod }));
  };
  const quad4 = (a, b, c, d) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3),
    );
    return g;
  };

  // -------------------------------------------------------------------------
  // hull loft
  // -------------------------------------------------------------------------
  const secs = STATIONS[lod].map((zr) => ({ z: Z(zr), pts: hullProfile(zr) }));
  const hull = loftProfile(secs, {
    tags: HULL_TAGS,
    capTag: "stern",
    uv: hullTexel,
  });
  for (const [zone, geo] of Object.entries(hull)) {
    const [mat, color] = ZONES[zone];
    add(geo, mat, { color, uv: "keep" });
  }

  // -------------------------------------------------------------------------
  // dorsal spine: a broad shallow maroon ridge, 0.3 of the deck width, from the bow to the foot of
  // the superstructure ramp: sloped walls, grey rails along the edges, two recessed channels flanking a
  // raised centre strip
  // -------------------------------------------------------------------------
  const SPINE_END = RAMP_FOOT - 2;
  // half-width: ~40 m across where it meets the ramp (about 0.17 of the hull width there)
  const spineHW = (zr) =>
    pw(
      [
        [24, 1.4],
        [120, 6],
        [250, 11],
        [SPINE_END, 0.2 * wDeck(SPINE_END)],
      ],
      zr,
    );
  const spineH = (zr) =>
    pw(
      [
        [24, 1.5],
        [150, 4.5],
        [SPINE_END, 7],
      ],
      zr,
    );
  {
    const zs = fine
      ? [24, 60, 110, 170, 240, 320, 400, SPINE_END]
      : mid
        ? [24, 110, 240, 400, SPINE_END]
        : [24, 240, SPINE_END];
    const sp = loftProfile(
      zs.map((zr) => {
        const y0 = yTop(zr) - 0.6;
        const w = spineHW(zr);
        const h = spineH(zr);
        const r = w * 0.1; // grey rail width along each edge
        const c1 = w * 0.52; // channel outer edge
        const c0 = w * 0.2; // centre strip half-width
        const d = h * 0.35; // channel depth
        const yt = y0 + h;
        return {
          z: Z(zr),
          pts: [
            [-w, y0],
            [w, y0],
            [w * 0.9, yt],
            [w * 0.9 - r, yt],
            [c1, yt],
            [c1, yt - d],
            [c0, yt - d],
            [c0, yt + 0.8],
            [-c0, yt + 0.8],
            [-c0, yt - d],
            [-c1, yt - d],
            [-c1, yt],
            [-(w * 0.9 - r), yt],
            [-w * 0.9, yt],
          ],
        };
      }),
      {
        tags: [
          "buried",
          "wall",
          "rail",
          "top",
          "chwall",
          "channel",
          "chwall",
          "ridge",
          "chwall",
          "channel",
          "chwall",
          "top",
          "rail",
          "wall",
        ],
        capStart: false,
        capEnd: true,
        capTag: "wall",
        uv: 1 / 16,
      },
    );
    add(sp.top, "paint", { color: MAROON, uv: "keep" });
    add(sp.ridge, "paint", { color: mulColor(MAROON, 1.12), uv: "keep" });
    add(sp.wall, "paint", { color: mulColor(MAROON, 0.75), uv: "keep" });
    add(sp.chwall, "paint", { color: mulColor(MAROON, 0.6), uv: "keep" });
    add(sp.channel, "paint", { color: mulColor(MAROON, 0.7), uv: "keep" });
    add(sp.rail, "hull", { color: mulColor(DECK, 0.9), uv: "keep" });
    if (mid) {
      // transverse seams across the spine top every ~45 m, and raised panels in the channels
      for (let zr = 80; zr < SPINE_END - 10; zr += 45) {
        const w = spineHW(zr) * 0.9 * 2;
        const yt = yTop(zr) - 0.6 + spineH(zr);
        add(
          boxMM(
            [-w / 2, yt - 0.1, Z(zr) - 0.5],
            [w / 2, yt + 0.1, Z(zr) + 0.5],
          ),
          "dark",
          { color: DARK_SEAM, texel: 1 / 4 },
        );
        if (fine && zr > 150) {
          for (const s of [-1, 1]) {
            const cw = spineHW(zr) * 0.32;
            const cx = s * spineHW(zr) * 0.36;
            const d = spineH(zr) * 0.35;
            add(
              boxMM(
                [cx - cw * 0.4, yt - d - 0.05, Z(zr + 8)],
                [cx + cw * 0.4, yt - d + 1.2, Z(zr + 30)],
              ),
              "paint",
              { color: mulColor(MAROON, 0.85), texel: 1 / 6 },
            );
          }
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // superstructure: long shallow ramp up to tier 1, tier 2, forward-leaning neck, T-shaped head
  // -------------------------------------------------------------------------
  {
    add(tierBlock(T1), "hull", { color: BLOCK });
    add(tierBlock(T2), "hull", { color: mulColor(BLOCK, 1.03) });
    add(tierBlock(NECK), "hull", { color: mulColor(BLOCK, 0.95) });
    // head: long stem (fore-aft, narrowing toward the nose) and the athwartships crossbar over the neck
    {
      const stemPts = (hxN, hxB, z0, z1, c) => [
        [-hxN + c, z0],
        [hxN - c, z0],
        [hxN, z0 + c],
        [hxB, z1 - c],
        [hxB - c, z1],
        [-hxB + c, z1],
        [-hxB, z1 - c],
        [-hxN, z0 + c],
      ];
      add(
        yLoft(
          [
            {
              y: HEAD.y0,
              pts: stemPts(11, STEM.hx0, Z(STEM.z0), Z(STEM.z1), 6),
            },
            {
              y: HEAD.y1,
              pts: stemPts(8.5, STEM.hx1, Z(STEM.z0) + 3, Z(STEM.z1) - 3, 4.5),
            },
          ],
          { capStart: true },
        ).hull,
        "hull",
        { color: DECK_LIGHT },
      );
    }
    add(
      frustumOct(
        HEAD.y0,
        HEAD.y1,
        BAR.hx0,
        Z(BAR.z0),
        Z(BAR.z1),
        BAR.hx1,
        2,
        2,
        8,
        6,
        { capStart: true },
      ),
      "hull",
      { color: DECK_LIGHT },
    );
    // raised strip and sensor dome on the head
    add(
      frustum(
        HEAD.y1 - 0.2,
        HEAD.y1 + 2.2,
        6,
        Z(STEM.z0 + 10),
        Z(STEM.z0 + 68),
        4.5,
        3,
        3,
      ),
      "hull",
      { color: mulColor(DECK_LIGHT, 0.95), texel: 1 / 8 },
    );
    add(
      facetedDome(8, 4.5, lod === 2 ? 6 : 8, lod === 2 ? 2 : 3).translate(
        0,
        HEAD.y1 - 0.2,
        Z(Z_DOME),
      ),
      "hull",
      { color: mulColor(DECK_LIGHT, 0.95), texel: 1 / 6 },
    );
    // maroon panel up the ramp where the spine ends (the spine's width, nearly the full ramp height)
    {
      const yA = yTop(RAMP_FOOT) + 0.4;
      const yB = T1.y1 - 1.2;
      const n = frontNormal(T1);
      const c = [0, (yA + yB) / 2, (frontZ(T1, yA) + frontZ(T1, yB)) / 2];
      const h = Math.hypot(yB - yA, frontZ(T1, yB) - frontZ(T1, yA));
      add(
        quadFacing(
          [c[0] + n.x * 0.25, c[1] + n.y * 0.25, c[2] + n.z * 0.25],
          n.toArray(),
          [0, 1, 0],
          spineHW(SPINE_END) * 2,
          h,
        ),
        "paint",
        { color: MAROON, uv: "keep" },
      );
      if (mid)
        add(
          quadFacing(
            [c[0] + n.x * 0.4, c[1] + n.y * 0.4, c[2] + n.z * 0.4],
            n.toArray(),
            [0, 1, 0],
            spineHW(SPINE_END) * 0.4,
            h - 2,
          ),
          "paint",
          { color: mulColor(MAROON, 0.7), uv: "keep" },
        );
    }
    if (mid) {
      add(
        tube([0, HEAD.y1 + 4, Z(Z_DOME)], [0, HEAD.y1 + 20, Z(Z_DOME)], 0.7, 6),
        "dark",
        { color: DARK, texel: 1 / 3 },
      );
      add(
        boxMM(
          [-3, HEAD.y1 + 13, Z(Z_DOME) - 1],
          [3, HEAD.y1 + 14, Z(Z_DOME) + 1],
        ),
        "dark",
        { color: DARK, texel: 1 / 3 },
      );
      // bridge viewport: blue band wrapping the stem's front and front corners
      const yv = HEAD.y0 + 7.5;
      const zf = Z(STEM.z0) + 1.5;
      add(
        quadFacing([0, yv, zf - 0.3], [0, 3, -16], [0, 1, 0], 9, 4.2),
        "windows",
        { color: BRIDGE_BLUE, uv: "keep" },
      );
      // the stem's flank at mid-height runs from x 9.75 at the nose corner to 12.5 at the back
      const flankX = (dz) => 9.75 + (2.75 * (dz - 5.25)) / 102;
      const flankN = (s) => [s * 0.98, 0.19, -s * 0.038];
      for (const s of [-1, 1]) {
        // 45-degree corner faces of the clipped front
        add(
          quadFacing(
            [s * 7.1, yv, zf + 2.6],
            [s * 0.7, 0.13, -0.7],
            [0, 1, 0],
            7.4,
            4.0,
          ),
          "windows",
          { color: BRIDGE_BLUE, uv: "keep" },
        );
        // the band continues a short way along the stem flanks
        add(
          quadFacing(
            [s * (flankX(12) + 0.3), yv, zf + 12],
            flankN(s),
            [0, 1, 0],
            10,
            3.6,
          ),
          "windows",
          { color: BRIDGE_BLUE, uv: "keep" },
        );
        // stem flanks: a row of windows
        {
          const dz = Z((STEM.z0 + STEM.z1) / 2 + 4) - zf;
          for (const g of windowRow(
            [s * (flankX(dz) + 0.3), yv, zf + dz],
            flankN(s),
            [s * 0.039, 0, 1],
            fine ? 12 : 6,
            fine ? 6 : 12,
            2.6,
            1.5,
          ))
            add(g, "windows", { color: ROW_WARM, uv: "keep" });
        }
        // crossbar front face outboard of the stem, two rows
        for (const yy of fine ? [HEAD.y0 + 4.5, HEAD.y0 + 9.5] : [yv]) {
          for (const g of windowRow(
            [s * 22.5, yy, Z(BAR.z0) + 1],
            [0, 2, -16],
            [1, 0, 0],
            fine ? 7 : 4,
            fine ? 2.6 : 4.6,
            1.6,
            1.4,
          ))
            add(g, "windows", { color: BRIDGE_BLUE, uv: "keep" });
        }
      }
      // crossbar back face (skipping the stem's tail, which runs 6 m past the bar)
      {
        const nB = fine ? 18 : 9;
        const pB = fine ? 3.2 : 6.4;
        for (const g of windowRow(
          [0, yv, Z(BAR.z1) - 1],
          [0, 2, 16],
          [1, 0, 0],
          nB,
          pB,
          1.8,
          1.4,
          (i) => Math.abs((i - (nB - 1) / 2) * pB) < 13.5,
        ))
          add(g, "windows", { color: ROW_WARM, uv: "keep" });
      }
      // tier window rows on the sloped side faces
      for (const s of [-1, 1]) {
        for (const [T, ys, z0, z1] of [
          [T2, fine ? [68, 75] : [72], 536, 604],
          [T1, fine ? [44, 54] : [49], 400, 648],
        ]) {
          const n = sideNormal(T);
          for (const yy of ys) {
            const zc = Z((z0 + z1) / 2);
            const n1 = Math.round((z1 - z0) / (fine ? 5.5 : 11));
            for (const g of windowRow(
              [s * sideX(T, yy), yy, zc],
              [s * n.x, n.y, 0],
              [0, 0, 1],
              n1,
              fine ? 5.5 : 11,
              2.4,
              1.4,
              (i) => (i * 7 + (yy | 0)) % 9 === 0,
            ))
              add(g, "windows", { color: ROW_WARM, uv: "keep" });
          }
        }
      }
      // tier-2 front face row and the block's rear face: two tall lit panels plus a window row
      {
        const n = frontNormal(T2);
        for (const g of windowRow(
          [0, 73, frontZ(T2, 73)],
          n.toArray(),
          [1, 0, 0],
          fine ? 14 : 7,
          fine ? 5 : 10,
          2.4,
          1.4,
          (i) => Math.abs(i - (fine ? 7.5 : 3.5)) < 2,
        ))
          add(g, "windows", { color: ROW_WARM, uv: "keep" });
        const nb = new THREE.Vector3(0, T1.zb, T1.y1 - T1.y0).normalize();
        for (const s of [-1, 1])
          add(
            quadFacing(
              [s * 26, 50, backZ(T1, 50) + 0.3],
              nb.toArray(),
              [0, 1, 0],
              3,
              16,
            ),
            "windows",
            { color: ROW_COOL, uv: "keep" },
          );
        for (const g of windowRow(
          [0, 44, backZ(T1, 44) + 0.25],
          nb.toArray(),
          [1, 0, 0],
          fine ? 18 : 9,
          fine ? 6 : 12,
          2.2,
          1.4,
          (i) => Math.abs(i - (fine ? 8.5 : 4)) < 1.6,
        ))
          add(g, "windows", { color: ROW_WARM, uv: "keep" });
      }
    }
    if (mid) {
      // tier faces: walkway rims along the top edges, vertical seams, a horizontal seam and recessed
      // panels on the sloped side faces; seams on tier 2's front face
      const sideQuad = (T, s, yc, zr, w, h, lift = 0.15) => {
        const n = sideNormal(T);
        return quadFacing(
          [s * (sideX(T, yc) + n.x * lift), yc + n.y * lift, Z(zr)],
          [s * n.x, n.y, 0],
          [0, 1, 0],
          w,
          h,
        );
      };
      const frontQuad = (T, x, yc, w, h, lift = 0.15) => {
        const n = frontNormal(T);
        return quadFacing(
          [x, yc + n.y * lift, frontZ(T, yc) + n.z * lift],
          n.toArray(),
          [0, 1, 0],
          w,
          h,
        );
      };
      for (const [T, tone, rimGap] of [
        [T1, 0.9, 0],
        [T2, 0.92, 0],
      ]) {
        const zA = T.z0 + T.zf + 2;
        const zB = T.z1 - T.zb - 2;
        const rimColor = mulColor(BLOCK, tone);
        for (const s of [-1, 1]) {
          add(
            boxMM(
              [s * (T.hx1 - 2.4) - 1, T.y1 - 0.2, Z(zA)],
              [s * (T.hx1 - 2.4) + 1, T.y1 + 1.6, Z(zB)],
            ),
            "hull",
            { color: rimColor, texel: 1 / 4 },
          );
          // front rim (split around the neck on tier 2)
          add(
            boxMM(
              [s > 0 ? rimGap : -(T.hx1 - 2.4), T.y1 - 0.2, Z(zA) - 1],
              [s > 0 ? T.hx1 - 2.4 : -rimGap, T.y1 + 1.6, Z(zA) + 1],
            ),
            "hull",
            { color: rimColor, texel: 1 / 4 },
          );
          // side face: vertical seams, horizontal seam, recessed panels
          const slant = Math.hypot(T.y1 - T.y0, T.hx0 - T.hx1);
          const ym = T.y0 + (T.y1 - T.y0) * 0.5;
          const zf = T.z0 + T.zf * 0.5;
          const zb = T.z1 - T.zb * 0.5;
          for (let zr = zf + 14; zr < zb - 6; zr += fine ? 26 : 52)
            add(sideQuad(T, s, ym, zr, 0.7, slant * 0.92), "dark", {
              color: DARK_SEAM,
              uv: "keep",
            });
          const yh = T.y0 + (T.y1 - T.y0) * 0.6;
          add(sideQuad(T, s, yh, (zf + zb) / 2 + 3, zb - zf - 8, 0.9), "dark", {
            color: DARK_SEAM,
            uv: "keep",
          });
          if (fine)
            for (let zr = zf + 27; zr < zb - 12; zr += 52)
              add(
                sideQuad(
                  T,
                  s,
                  T.y0 + (T.y1 - T.y0) * 0.3,
                  zr,
                  9,
                  slant * 0.28,
                  0.2,
                ),
                "dark",
                {
                  color: DARK_RECESS,
                  uv: "keep",
                },
              );
        }
      }
      // tier 2 front face: seams either side of the neck
      for (const x of fine ? [-46, -30, 30, 46] : [-38, 38])
        add(
          frontQuad(
            T2,
            x,
            (T2.y0 + T2.y1) / 2,
            1.0,
            Math.hypot(T2.y1 - T2.y0, T2.zf) * 0.9,
          ),
          "dark",
          {
            color: DARK_SEAM,
            uv: "keep",
          },
        );
      // neck: a collar at the top, vertical seams on the side faces
      add(
        boxMM(
          [-(NECK.hx1 + 0.7), NECK.y1 - 3.2, Z(NECK.z0 + NECK.zf) - 0.7],
          [NECK.hx1 + 0.7, NECK.y1 - 0.6, Z(NECK.z1 - NECK.zb) + 0.7],
        ),
        "hull",
        { color: mulColor(BLOCK, 0.88), texel: 1 / 4 },
      );
      for (const s of [-1, 1])
        for (const k of [0.35, 0.65]) {
          const ym = (NECK.y0 + NECK.y1) / 2;
          const zr = lerp(NECK.z0 + NECK.zf * 0.5, NECK.z1 - NECK.zb * 0.5, k);
          add(
            sideQuad(NECK, s, ym, zr, 0.9, (NECK.y1 - NECK.y0) * 0.8),
            "dark",
            {
              color: DARK_SEAM,
              uv: "keep",
            },
          );
        }
      // ledge machinery, sensor domes and a dish on tier 2
      for (const s of [-1, 1]) {
        for (let zr = 530; zr < 645; zr += fine ? 14 : 28) {
          if (Math.abs(zr - 636) < 12) continue; // light emplacement
          const w = 3 + rand() * 3;
          const d = 5 + rand() * 6;
          const h = 2 + rand() * 3;
          const x = s * (T2.hx0 + 3 + rand() * (T1.hx1 - T2.hx0 - 8));
          const darkBox = rand() < 0.4;
          add(
            boxMM(
              [x - w / 2, T1.y1 - 0.3, Z(zr) - d / 2],
              [x + w / 2, T1.y1 + h, Z(zr) + d / 2],
            ),
            darkBox ? "dark" : "hull",
            {
              color: darkBox ? DARK : mulColor(BLOCK, 0.9),
              texel: 1 / 4,
            },
          );
        }
        // machinery along the front of tier 1's top, ahead of tier 2
        for (let x = 12; x < T1.hx1 - 8; x += fine ? 11 : 22) {
          const d = 3 + rand() * 4;
          add(
            boxMM(
              [s * x - 3.5, T1.y1 - 0.3, Z(505) - d / 2],
              [s * x + 3.5, T1.y1 + 1.5 + rand() * 2.5, Z(505) + d / 2],
            ),
            "dark",
            { color: DARK, texel: 1 / 4 },
          );
        }
        add(
          facetedDome(5, 3.5, 8, 2).translate(s * 28, T2.y1 - 0.2, Z(598)),
          "hull",
          { color: mulColor(BLOCK, 0.92), texel: 1 / 4 },
        );
        add(
          boxMM(
            [s * 26 - 4, T2.y1 - 0.3, Z(548)],
            [s * 26 + 4, T2.y1 + 4, Z(564)],
          ),
          "dark",
          { color: DARK, texel: 1 / 4 },
        );
      }
      if (fine) {
        add(cylY(0.5, 0.5, 18, 6).translate(-18, T1.y1 + 9, Z(634)), "dark", {
          color: DARK,
          texel: 1 / 3,
        });
        add(cylY(3.5, 0.6, 1.2, 8).translate(18, T1.y1 + 1.2, Z(634)), "dark", {
          color: DARK,
          texel: 1 / 3,
        });
        // panel seams up the ramp
        for (const x of [-50, -25, 25, 50]) {
          const yA = yTop(RAMP_FOOT) + 0.3;
          const yB = T1.y1 - 0.5;
          const n = frontNormal(T1);
          const c = [x, (yA + yB) / 2, (frontZ(T1, yA) + frontZ(T1, yB)) / 2];
          const h = Math.hypot(yB - yA, frontZ(T1, yB) - frontZ(T1, yA));
          add(
            quadFacing(
              [c[0] + n.x * 0.12, c[1] + n.y * 0.12, c[2] + n.z * 0.12],
              n.toArray(),
              [0, 1, 0],
              1.2,
              h,
            ),
            "dark",
            { color: DARK_SEAM, uv: "keep" },
          );
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // stern: the trench wraps around the stern wall as a dark lit band; keel end face between the two
  // large bells; nacelles; four nozzle bells
  // -------------------------------------------------------------------------
  {
    const zs = Z(LH);
    const bandTop = yTT(LH);
    const bandBot = yShelf(LH);
    add(boxMM([-224, bandBot, zs - 1], [224, bandTop, zs + 1.2]), "dark", {
      color: mulColor(DARK_RECESS, 0.9),
      texel: 1 / 8,
    });
    // ledge over the band and the shelf under it, continuing the flank step across the stern
    add(
      boxMM([-227, bandTop, zs - 1], [227, bandTop + 1.2, zs + 3.2]),
      "hull",
      {
        color: mulColor(UPPER, 0.9),
        texel: 1 / 6,
      },
    );
    add(
      boxMM([-230, bandBot - 1.2, zs - 1], [230, bandBot, zs + 3.6]),
      "hull",
      {
        color: LOWER,
        texel: 1 / 6,
      },
    );
    if (mid) {
      // band machinery and lights
      for (let x = -215; x < 215; x += fine ? 9 : 27) {
        if (rand() < 0.7) {
          const w = 3 + rand() * 4;
          const h = (bandTop - bandBot) * (0.3 + rand() * 0.35);
          const y0 = bandBot + 1 + rand() * (bandTop - bandBot - h - 2);
          add(
            boxMM(
              [x - w / 2, y0, zs + 1.2],
              [x + w / 2, y0 + h, zs + 2.4 + rand() * 1.6],
            ),
            "dark",
            { color: jitterColor(rand, DARK, 0.1, 0.02), texel: 1 / 3 },
          );
        }
        if (rand() < 0.6)
          add(
            quadFacing(
              [x + 4, bandTop - 4, zs + 1.55],
              [0, 0, 1],
              [0, 1, 0],
              1.0,
              1.6,
            ),
            "windows",
            { color: ROW_COOL, uv: "keep" },
          );
      }
      // upper stern wall: vertical seams and a row of small hatches under the deck edge
      for (let x = -200; x <= 200; x += fine ? 40 : 80) {
        if (Math.abs(x) < 20) continue;
        add(
          boxMM(
            [x - 0.6, bandTop + 1.4, zs + 0.2],
            [x + 0.6, yLipTop(LH) - 1, zs + 0.5],
          ),
          "dark",
          {
            color: DARK_SEAM,
            texel: 1 / 4,
          },
        );
      }
    }
    // keel end face: the ventral column runs out between the two large bells
    // (its loft cap is drawn by the keel loft below; here a dark seam and vents)
    if (mid) {
      add(
        boxMM(
          [-1, yBot(LH) - keelD(LH) - 1, Z(KEEL.z1) + 0.1],
          [1, yBot(LH) + 0.6, Z(KEEL.z1) + 0.6],
        ),
        "dark",
        {
          color: DARK_SEAM,
          texel: 1 / 4,
        },
      );
      for (const yy of [-49, -55])
        for (const s of [-1, 1])
          add(
            boxMM(
              [s * 12 - 6, yy - 1, Z(KEEL.z1) + 0.1],
              [s * 12 + 6, yy + 1, Z(KEEL.z1) + 0.6],
            ),
            "dark",
            {
              color: DARK,
              texel: 1 / 3,
            },
          );
    }
    // large-bell pods: cylinders set into the lower stern wall either side of the keel, their bottoms
    // emerging under the aft belly, running ~40 m past the stern and flaring into a dark collar at the bell
    const segN = fine ? 24 : mid ? 14 : 8;
    const podZ0 = NACELLE.z0;
    for (const s of [-1, 1]) {
      const x = s * NACELLE.x;
      add(
        cylZ(
          NACELLE.r,
          NACELLE.r * 0.94,
          NACELLE.z1 - podZ0,
          segN,
          true,
        ).translate(x, NACELLE.y, Z((podZ0 + NACELLE.z1) / 2)),
        "hull",
        { color: mulColor(LOWER, 0.95), texel: 1 / 10 },
      );
      add(
        cylZ(NACELLE.r + 1.8, NACELLE.r + 1.8, 7, segN).translate(
          x,
          NACELLE.y,
          Z(NACELLE.z1) - 5,
        ),
        "hull",
        { color: STERN, texel: 1 / 6 },
      );
      if (mid) {
        add(
          cylZ(NACELLE.r + 1.0, NACELLE.r + 1.0, 4, segN).translate(
            x,
            NACELLE.y,
            Z(LH + 14),
          ),
          "dark",
          { color: DARK, texel: 1 / 4 },
        );
        // conduits along the outboard and lower flanks of the pod's exposed run
        for (const da of [-0.5, -0.15, 0.2])
          add(
            cylZ(1.0, 1.0, 30, 6).translate(
              x + s * NACELLE.r * Math.cos(da) * 0.98,
              NACELLE.y + NACELLE.r * Math.sin(da) * 0.98,
              Z(LH + 17),
            ),
            "dark",
            { color: DARK, texel: 1 / 3 },
          );
      }
    }
    // medium bells: short shrouds standing proud of the stern wall, outboard of the pods
    for (const s of [-1, 1])
      add(
        cylZ(
          MEDIUM.r + 3.5,
          MEDIUM.r + 4.5,
          10,
          fine ? 16 : 10,
          true,
        ).translate(s * MEDIUM.x, MEDIUM.y, zs + 4),
        "hull",
        { color: STERN, texel: 1 / 6 },
      );
    for (const [ex, ey, r, zEnd] of ENGINES) {
      const seg = fine ? 20 : mid ? 12 : 8;
      const nz = nozzle(r, {
        seg,
        detail: fine ? 2 : mid ? 1 : 0,
        rings: 2,
        vanes: 8,
      });
      for (const g of nz.dark) {
        g.translate(ex, ey, Z(zEnd));
        add(g, "dark", { color: mulColor(DARK, 0.7), texel: 1 / 8 });
      }
      // the fleet's glow disc reads to ~0.8 r: 0.85 x the bell keeps the rim and vanes visible
      if (lod === 0)
        engines.push({ pos: [ex, ey, Z(zEnd) + nz.mouth], r: r * 0.85 });
    }
    if (mid) {
      // vertical conduit runs on the lower stern wall between the keel and the pods
      for (const x of fine ? [-30, -24, 24, 30] : [-27, 27])
        add(
          boxMM(
            [x - 1, yBot(LH) + 6, zs + 0.6],
            [x + 1, bandBot - 8, zs + 2.2],
          ),
          "dark",
          {
            color: DARK,
            texel: 1 / 3,
          },
        );
    }
  }

  // -------------------------------------------------------------------------
  // belly: keel with boarding-ramp doors, turret barbettes, hatches
  // -------------------------------------------------------------------------
  {
    const kz = fine
      ? [290, 340, 400, 460, 520, 580, 640, 700, KEEL.z1]
      : mid
        ? [290, 340, 520, 700, KEEL.z1]
        : [290, 340, KEEL.z1];
    // counter-clockwise seen from astern: bottom edge first, so the loft frames face outward
    const keelSecs = kz.map((zr) => {
      const zc = Math.min(zr, LH);
      const yb = yBot(zc) + 0.8;
      const d = keelD(zr);
      return {
        z: Z(zr),
        pts: [
          [-KEEL.hxBot, yb - d - 0.8],
          [KEEL.hxBot, yb - d - 0.8],
          [KEEL.hxTop, yb],
          [-KEEL.hxTop, yb],
        ],
      };
    });
    const keel = loftProfile(keelSecs, {
      tags: ["bottom", "side", "buried", "side"],
      capStart: false,
      capEnd: true,
      capTag: "end",
      uv: hullTexel,
    });
    add(keel.side, "hull", { color: mulColor(BELLY, 1.08), uv: "keep" });
    add(keel.bottom, "hull", { color: BELLY, uv: "keep" });
    add(keel.end, "hull", { color: STERN, uv: "keep" });
    if (mid) {
      // ramp doors (dark) with a centre seam, on the keel bottom (edge 0 of the keel loft)
      for (const [z0, z1] of [
        [372, 436],
        [508, 572],
      ]) {
        const fr = loftFrame(keelSecs, 0, 0.5, Z((z0 + z1) / 2));
        add(decalQuad(fr, 24, z1 - z0, 0, { lift: 0.15 }), "dark", {
          color: DARK_RECESS,
          texel: 1 / 6,
          uv: "keep",
        });
        add(decalQuad(fr, 1.2, z1 - z0, 0, { lift: 0.25 }), "dark", {
          color: DARK_SEAM,
          texel: 1 / 4,
          uv: "keep",
        });
        if (fine) {
          // lit ramp threshold lights either side
          for (const s of [-1, 1])
            add(
              decalQuad(fr, 0.8, z1 - z0 - 6, 0, { du: s * 13, lift: 0.3 }),
              "windows",
              {
                color: ROW_WARM,
                uv: "keep",
              },
            );
        }
      }
      // boarding hatches on the keel sides
      for (const s of [-1, 1])
        for (const zr of [400, 470, 610, 690])
          add(
            decalQuad(loftFrame(keelSecs, s > 0 ? 1 : 3, 0.5, Z(zr)), 8, 8, 0, {
              lift: 0.15,
            }),
            "dark",
            { color: DARK_RECESS, texel: 1 / 4, uv: "keep" },
          );
    }
    // barbettes on the flat belly either side of the keel (the heavy turrets hang from them)
    for (const [zr, x] of HEAVY_VENTRAL)
      for (const s of [-1, 1]) {
        const yb = bellyY(s * x, zr);
        add(
          cylY(16, 17.5, 8, fine ? 16 : 10).translate(s * x, yb - 2.8, Z(zr)),
          "hull",
          { color: mulColor(BELLY, 1.1), texel: 1 / 6 },
        );
        if (lod === 2)
          add(
            boxMM(
              [s * x - 11, yb - 18, Z(zr) - 11],
              [s * x + 11, yb - 6, Z(zr) + 11],
            ),
            "hull",
            { color: mulColor(BELLY, 1.05), texel: 1 / 6 },
          );
      }
    if (mid) {
      // hatch rows and longitudinal seams on the belly
      for (const s of [-1, 1]) {
        for (let zr = 250; zr <= 700; zr += fine ? 60 : 120) {
          const x =
            s * (KEEL.hxTop + 10 + (wBelly(zr) - KEEL.hxTop - 10) * 0.55);
          if (Math.abs(x) < KEEL.hxTop + 9) continue;
          add(
            boxMM(
              [x - 7, yBot(zr) - 0.18, Z(zr) - 10],
              [x + 7, yBot(zr) + 0.5, Z(zr) + 10],
            ),
            "dark",
            { color: DARK_RECESS, texel: 1 / 5 },
          );
        }
      }
      if (fine)
        for (const k of [0.45, 0.8]) {
          const x0 = wBelly(200) * k;
          const x1 = wBelly(LH) * k;
          for (const s of [-1, 1])
            add(
              quad4(
                [s * (x0 - 0.5), yBot(200) - 0.08, Z(200)],
                [s * (x0 + 0.5), yBot(200) - 0.08, Z(200)],
                [s * (x1 + 0.5), yBot(LH) - 0.08, Z(LH)],
                [s * (x1 - 0.5), yBot(LH) - 0.08, Z(LH)],
              ),
              "dark",
              { color: DARK_SEAM, texel: 1 / 4 },
            );
        }
    }
  }

  // -------------------------------------------------------------------------
  // deck markings: red wing stripes parallel to the leading edges, roundels ahead of the superstructure
  // -------------------------------------------------------------------------
  {
    const wedge = Math.atan(WMAX / LH);
    for (const s of [-1, 1]) {
      // stripes: five 10 m bars, 76 m long, from 0.55 to 0.9 of the deck half-width, aft wing quarter
      const zc = 640;
      const nS = 5;
      for (let i = 0; i < nS; i++) {
        const k = 0.55 + (i / (nS - 1)) * 0.35;
        const x = s * wDeck(zc) * k;
        const fr = deckFrame(secs, x, zc);
        add(decalQuad(fr, 10, 76, -s * wedge, { lift: 0.14 }), "paint", {
          color: RED,
          texel: 1 / 12,
          uv: "keep",
        });
      }
      // roundel: yellow disc with a red ring (30 m) level with the ramp's middle, just outboard of the
      // block's foot (0.74 of the deck half-width)
      const fr = deckFrame(secs, s * wDeck(365) * 0.74, 365);
      const seg = fine ? 32 : mid ? 18 : 10;
      add(decalDisc(fr, 0, 12.5, seg, { lift: 0.14 }), "paint", {
        color: YELLOW,
        texel: 1 / 12,
        uv: "keep",
      });
      add(decalDisc(fr, 12.5, 15, seg, { lift: 0.14 }), "paint", {
        color: RED,
        texel: 1 / 12,
        uv: "keep",
      });
      if (mid)
        add(decalDisc(fr, 4.5, 6.5, seg, { lift: 0.2 }), "paint", {
          color: RED,
          texel: 1 / 12,
          uv: "keep",
        });
    }
  }

  // -------------------------------------------------------------------------
  // deck panel lines and plates: dark grooves on the band boundaries (parallel to the leading edges),
  // transverse seams, raised plates and hatches
  // -------------------------------------------------------------------------
  if (mid) {
    const deckPt = (x, zr, lift = 0.1) => {
      const fr = deckFrame(secs, x, zr);
      return fr.p.addScaledVector(fr.n, lift).toArray();
    };
    // longitudinal seams along the band boundaries and half-way across the outer band
    for (const s of [-1, 1]) {
      for (const [k, zr0] of [
        [1 - BAND[0], 70],
        [1 - BAND[1], 100],
        [1 - BAND[0] / 2, 130],
      ]) {
        const zr1 = k > 0.5 ? 728 : RAMP_FOOT - 2;
        const hw = 1.3;
        const x0 = s * wDeck(zr0) * k;
        const x1 = s * wDeck(zr1) * k;
        add(
          quad4(
            deckPt(x0 - hw, zr0),
            deckPt(x0 + hw, zr0),
            deckPt(x1 + hw, zr1),
            deckPt(x1 - hw, zr1),
          ),
          "dark",
          { color: DARK_SEAM, texel: 1 / 4 },
        );
      }
      // transverse seams, staggered per band
      const bands = [
        [0, 1 - BAND[0], 110, 82],
        [1 - BAND[1], 1 - BAND[0], 150, 74],
        [0.08, 1 - BAND[1], 190, 66],
      ];
      for (const [k0, k1, start, step] of bands) {
        for (let zr = start; zr < 720; zr += step) {
          if (k1 <= 1 - BAND[1] + 1e-6 && zr > RAMP_FOOT - 4) break; // inner band ends at the ramp
          let kb = k1;
          if (zr > RAMP_FOOT - 4 && zr < T1.z1 + 4) {
            // superstructure footprint: stop the seam short of tier 1's foot
            kb = Math.min(k1, (wDeck(zr) - T1.hx0 - 5) / wDeck(zr));
            if (kb <= k0 + 0.05) continue;
          }
          const xa = s * wDeck(zr) * k0;
          const xb = s * wDeck(zr) * kb;
          add(
            quad4(
              deckPt(xa, zr - 0.7),
              deckPt(xb, zr - 0.7),
              deckPt(xb, zr + 0.7),
              deckPt(xa, zr + 0.7),
            ),
            "dark",
            { color: DARK_SEAM, texel: 1 / 4 },
          );
        }
      }
    }
    if (fine) {
      // raised plates inside the cells (rectangular, sized under the local cell width), hatches
      for (const s of [-1, 1]) {
        for (let zr = 150; zr < RAMP_FOOT - 10; zr += 78) {
          for (const [ka, kb] of [
            [0.06, 0.28],
            [0.32, 0.48],
            [0.5, 0.66],
          ]) {
            if (rand() < 0.35) continue;
            if (zr > 320 && zr < 410 && kb > 0.45) continue; // roundel
            const wd0 = wDeck(zr - 24);
            const w = (kb - ka) * wd0 * 0.8;
            const xc = s * wDeck(zr) * ((ka + kb) / 2);
            const fr = deckFrame(secs, xc, zr);
            add(
              framePlate(fr, w, 44 + rand() * 12, 0.5, 0.8, {
                texel: 1 / 20,
                sink: 0.3,
              }),
              "hull",
              { color: jitterColor(rand, DECK, 0.05, 0.01), uv: "keep" },
            );
          }
        }
        // hatches: small dark squares just outboard of the spine
        for (let zr = 120; zr < RAMP_FOOT - 10; zr += 40) {
          if (rand() < 0.4) continue;
          const fr = deckFrame(
            secs,
            s * (spineHW(zr) + 6 + wDeck(zr) * 0.05),
            zr,
          );
          add(decalQuad(fr, 5, 7, 0, { lift: 0.14 }), "dark", {
            color: DARK_RECESS,
            texel: 1 / 4,
            uv: "keep",
          });
        }
        // wing plates aft of the stripes, between tier 1's foot and the aft heavy turret
        for (const zr of [560, 720]) {
          const fr = deckFrame(
            secs,
            s * wDeck(zr) * (zr < 600 ? 0.72 : 0.86),
            zr,
          );
          add(
            framePlate(fr, wDeck(zr) * 0.18, 30, 0.5, 0.8, {
              texel: 1 / 20,
              sink: 0.3,
            }),
            "hull",
            { color: jitterColor(rand, DECK, 0.05, 0.01), uv: "keep" },
          );
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // flanks: upper wall seams and hatches; trench machinery in two rows split by a walkway, ribs and
  // window rows; lower wall hatches; ventral chamfer bay doors
  // -------------------------------------------------------------------------
  if (mid) {
    for (const s of [-1, 1]) {
      // upper wall: vertical seams every ~36 m, a horizontal seam at 60 % height, hatches
      for (let zr = 150; zr < 730; zr += fine ? 36 : 72) {
        const fr = upperFrame(secs, s, 0.5, zr);
        add(decalQuad(fr, upperH(zr) - 1.5, 1.1, 0, { lift: 0.12 }), "dark", {
          color: DARK_SEAM,
          texel: 1 / 4,
          uv: "keep",
        });
        if (fine && rand() < 0.5 && upperH(zr) > 6) {
          const fh = upperFrame(
            secs,
            s,
            0.35 + rand() * 0.3,
            zr + 14 + rand() * 8,
          );
          add(decalQuad(fh, upperH(zr) * 0.45, 6, 0, { lift: 0.14 }), "dark", {
            color: DARK_RECESS,
            texel: 1 / 4,
            uv: "keep",
          });
        }
      }
      if (fine) {
        for (let zr = 150; zr < 730; zr += 60) {
          const fr = upperFrame(secs, s, 0.62, zr + 30);
          add(decalQuad(fr, 1.0, 60, 0, { lift: 0.12 }), "dark", {
            color: DARK_SEAM,
            texel: 1 / 4,
            uv: "keep",
          });
        }
      }
      // trench: walkway ledge at mid-height, machinery above and below, ribs, lights
      const step = fine ? 5 : 21;
      for (let zr = 90; zr < 730; zr += step) {
        const tH = trenchH(zr);
        for (const [tb0, tb1] of fine
          ? [
              [0.55, 0.92],
              [0.06, 0.42],
            ]
          : [[0.3, 0.9]]) {
          if (rand() < (fine ? 0.8 : 0.9)) {
            const h = tH * (tb1 - tb0) * (0.5 + rand() * 0.45);
            const d = 3 + rand() * 3.5;
            const th = 1.2 + rand() * 1.8;
            const fr = trenchFrame(
              secs,
              s,
              (tb0 + tb1) / 2 + (rand() - 0.5) * 0.1,
              zr + rand() * 2,
            );
            add(surfaceBox(fr, [h, th, d], { sink: 0.3 }), "dark", {
              color: jitterColor(rand, DARK, 0.1, 0.02),
              texel: 1 / 3,
            });
          }
        }
        if (fine && (zr - 90) % 35 === 0) {
          const fr = trenchFrame(secs, s, 0.5, zr + 3.5);
          add(surfaceBox(fr, [tH - 1, 1.4, 1.6], { sink: 0.3 }), "hull", {
            color: mulColor(FLANK, 0.85),
            texel: 1 / 3,
          });
        }
      }
      if (fine) {
        // walkway: a thin continuous ledge along the trench at mid-height
        for (let zr = 100; zr < 730; zr += 30) {
          const fr = trenchFrame(secs, s, 0.48, zr + 15);
          add(surfaceBox(fr, [0.8, 2.2, 30], { sink: 0.2 }), "hull", {
            color: mulColor(FLANK, 0.8),
            texel: 1 / 3,
          });
        }
      }
      // window rows: upper row dense, lower row sparse
      const rows = fine
        ? [
            [0.78, 0.7],
            [0.25, 0.4],
          ]
        : [[0.78, 0.5]];
      for (const [tb, p] of rows) {
        for (let zr = 100; zr < 730; zr += fine ? 3.4 : 6.8) {
          if (rand() > p) continue;
          const fr = trenchFrame(secs, s, tb, zr);
          add(decalQuad(fr, 1.0, 1.6, 0, { lift: 0.4 }), "windows", {
            color: rand() < 0.85 ? ROW_COOL : WINDOW_WARM,
            uv: "keep",
          });
        }
      }
      // lower wall: hatches
      if (fine)
        for (let zr = 200; zr < 720; zr += 60) {
          const fr = lowerFrame(secs, s, 0.5, zr);
          add(decalQuad(fr, wallH(zr) * 0.55, 7, 0, { lift: 0.15 }), "dark", {
            color: DARK_RECESS,
            texel: 1 / 4,
            uv: "keep",
          });
        }
      // lower slab: a long dark groove at a third of its height from the stern to mid-length, recessed
      // doors aft, and fine vertical panel seams
      for (let zr = 340; zr < 720; zr += fine ? 40 : 80) {
        const fr = loftFrame(
          secs,
          s > 0 ? EDGE.chamferR : EDGE.chamferL,
          0.34,
          Z(zr + 20),
        );
        add(decalQuad(fr, 3.2, 40, 0, { lift: 0.15 }), "dark", {
          color: DARK_RECESS,
          texel: 1 / 4,
          uv: "keep",
        });
      }
      for (const zr of fine ? [430, 560, 690] : [560])
        add(
          decalQuad(
            loftFrame(secs, s > 0 ? EDGE.chamferR : EDGE.chamferL, 0.68, Z(zr)),
            12,
            22,
            0,
            { lift: 0.15 },
          ),
          "hull",
          { color: mulColor(CHAMFER, 0.86), texel: 1 / 8, uv: "keep" },
        );
      if (fine)
        for (let zr = 180; zr < 720; zr += 45) {
          const fr = loftFrame(
            secs,
            s > 0 ? EDGE.chamferR : EDGE.chamferL,
            0.5,
            Z(zr),
          );
          const hSlab = yWallBot(zr) - bellyY(wBelly(zr), zr);
          add(decalQuad(fr, hSlab * 0.9, 1.0, 0, { lift: 0.12 }), "dark", {
            color: DARK_SEAM,
            texel: 1 / 4,
            uv: "keep",
          });
        }
    }
  }

  // -------------------------------------------------------------------------
  // turrets: heavy quads on the dorsal shoulders and the ventral barbettes (tracking, drawn by the
  // Fleet), light emplacements on the deck edges, tier tops and lower walls; hardpoints fire from the
  // barrel tips. LOD 2 draws static stand-ins.
  // -------------------------------------------------------------------------
  const heavyAt = (pos, up, fwd) => {
    turrets.push({ type: "heavy", pos, up, forward: fwd });
    const upV = new THREE.Vector3(...up).normalize();
    const d = new THREE.Vector3(...fwd).normalize();
    hardpoints.push({
      pos: [
        +(pos[0] + upV.x * HEAVY.pivotY).toFixed(2),
        +(pos[1] + upV.y * HEAVY.pivotY).toFixed(2),
        +(pos[2] + upV.z * HEAVY.pivotY).toFixed(2),
      ],
      dir: d.toArray().map((v) => +v.toFixed(3)),
      kind: "heavy",
      range: 14000,
      turret: turrets.length - 1,
    });
  };
  const lightAt = (pos, dir, up) => {
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
    for (const [zr, x] of HEAVY_DORSAL) {
      const tx = s * x;
      const y = deckY(tx, zr) + 1.2;
      // mount ring so the turret sits on a pad, not bare plating
      add(
        cylY(14.5, 15.5, 1.6, fine ? 16 : 10).translate(tx, y - 0.8, Z(zr)),
        "hull",
        {
          color: mulColor(DECK, 0.9),
          texel: 1 / 5,
        },
      );
      if (lod === 2)
        add(
          boxMM([tx - 11, y, Z(zr) - 10], [tx + 11, y + 10, Z(zr) + 10]),
          "hull",
          {
            color: mulColor(DECK, 0.88),
            texel: 1 / 6,
          },
        );
      if (lod === 0) heavyAt([tx, y, Z(zr)], [0, 1, 0], [s * 0.42, 0.12, -1]);
    }
    for (const [zr, x] of HEAVY_VENTRAL) {
      const tx = s * x;
      const yb = bellyY(tx, zr) - 6.8;
      if (lod === 0) heavyAt([tx, yb, Z(zr)], [0, -1, 0], [s * 0.4, -0.3, -1]);
    }
  }
  const LIGHT_DECK_ZR = [190, 265, 340, 415];
  const LIGHT_TIER_ZR = [460, 636];
  if (lod === 0) {
    for (const s of [-1, 1]) {
      // deck edge emplacements
      for (const zr of LIGHT_DECK_ZR) {
        const x = s * (wDeck(zr) - 9);
        lightAt(
          [x, deckY(x, zr) + 1.2, Z(zr)],
          [s * 0.6, 0.2, -0.8],
          [0, 1, 0],
        );
      }
      // tier-1 top, outboard of tier 2
      for (const zr of LIGHT_TIER_ZR)
        lightAt([s * 50, T1.y1 + 1, Z(zr)], [s, 0.35, -0.3], [0, 1, 0]);
      // lower wall, angled out
      for (const zr of [450, 650]) {
        const fr = lowerFrame(secs, s, 0.5, zr);
        const dir = fr.n
          .clone()
          .multiplyScalar(0.9)
          .add(new THREE.Vector3(0, 0, -0.5))
          .normalize();
        lightAt(
          fr.p.clone().addScaledVector(fr.n, 0.8).toArray(),
          dir.toArray(),
          fr.n.toArray(),
        );
      }
    }
  }
  if (mid) {
    for (const s of [-1, 1]) {
      for (const zr of LIGHT_DECK_ZR) {
        const x = s * (wDeck(zr) - 9);
        add(
          cylY(3.8, 4.2, 1.2, 8).translate(x, deckY(x, zr) + 0.6, Z(zr)),
          "hull",
          {
            color: mulColor(DECK, 0.9),
            texel: 1 / 4,
          },
        );
      }
      for (const zr of LIGHT_TIER_ZR)
        add(
          cylY(3.8, 4.2, 1.2, 8).translate(s * 50, T1.y1 + 0.5, Z(zr)),
          "hull",
          {
            color: mulColor(BLOCK, 0.9),
            texel: 1 / 4,
          },
        );
      for (const zr of [450, 650]) {
        const fr = lowerFrame(secs, s, 0.5, zr);
        add(surfaceBox(fr, [4, 1.2, 8], { sink: 0.4 }), "hull", {
          color: mulColor(LOWER, 1.1),
          texel: 1 / 4,
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // bow: a small ventral chin sensor
  // -------------------------------------------------------------------------
  if (mid) {
    add(
      orientedBoxAt(
        [3, 3, 14],
        [0, yBot(30) - 0.6, Z(30)],
        [0, 1, 0],
        [0, 0, 1],
      ),
      "dark",
      { color: DARK, texel: 1 / 3 },
    );
  }

  return { parts, hardpoints, engines, turrets };
}

export function buildAcclamator(mats) {
  const all = [];
  let hardpoints = [];
  let engines = [];
  let turrets = [];
  const triangles = [];
  for (const lod of [0, 1, 2]) {
    const r = buildLod(lod);
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
      id: "acclamator",
      side: "republic",
      length: L,
      parts: all,
      hardpoints,
      engines,
      bounds: { radius: 440 },
      turretTypes: {
        heavy: {
          body: heavy.body,
          barrels: heavy.barrels,
          bodyMaterial: "hull",
          barrelMaterial: "dark",
          bodyColor: mulColor(DECK, 0.92),
          barrelColor: DARK,
          texel: 1 / 5,
          ...HEAVY,
        },
        light: {
          body: light.body,
          barrels: light.barrels,
          bodyMaterial: "hull",
          barrelMaterial: "dark",
          bodyColor: mulColor(DECK, 0.9),
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
