// Venator rear superstructure, matched to the reference render: the two turret shelves rising aft
// beside the red band (the heavy turrets stand on them), the light sill where the band meets the block,
// the pillar block (a plated light ramp at 48 degrees from the sill to the roof with real relief —
// grille rows under the shafts, a raised bordered plate, side strips, steps at the foot — shaded sides
// with a few dark vertical slots and seams, a steep light "leg" under each shaft flaring out to the
// shelf so the shaft lines run down to the deck), the dark bridge box seen through the gap between the
// two slender shafts (light fronts with two dark slots each, plain sides with dark slots near the top)
// standing on the roof, the light hammerheads (a bevelled top slab overhanging the shaft on every side,
// a dark recessed window band under it, a light chin tapering back into the shaft, a dark sensor block
// with a light drum and the mast on top over the rear half) and the steps down behind the block.
// Proportions from venatorSpec (PLATFORM / BLOCK / TOWER); only recesses are dark, as in the reference.
import * as THREE from "three";
import {
  loftProfile,
  yLoft,
  quadFacing,
  tube,
  lin,
  staggered,
  framePlate,
  flipGeometry,
  facetedDome,
  mulColor,
} from "./venatorKit.js";
import { boxMM } from "./shipKit.js";
import {
  Z,
  DECK_Y,
  SILL_Y,
  PLATFORM,
  platY,
  BLOCK,
  AFT,
  TOWER,
  TURRET_X,
  TURRET_R,
  GREY_HULL,
  GREY_LIGHT,
  GREY_RAMP,
  GREY_BLOCK,
  GREY_SIDE,
  GREY_FLANK,
  GREY_SHELF,
  GREY_RECESS,
  DARK,
  DARK_RECESS,
  DARK_SEAM,
  ROW_WARM,
  ROW_COOL,
  HANGAR_WARM,
  sootAt,
} from "./venatorSpec.js";

const GREY_HEAD_TOP = lin(0.62, 0.6, 0.53); // head slab tops: lighter than the deck, short of bloom
const GREY_ROW = lin(0.2, 0.2, 0.19); // the ramp's grille rows: softer than a recess

const rect = (hx, z0, z1) => [
  [-hx, Z(z0)],
  [hx, Z(z0)],
  [hx, Z(z1)],
  [-hx, Z(z1)],
];
// one-sided plan rectangle from x = s*xa to s*xb (tags keep their geometric meaning when mirrored)
const sideRect = (s, xa, xb, z0, z1) => [
  [s * xa, Z(z0)],
  [s * xb, Z(z0)],
  [s * xb, Z(z1)],
  [s * xa, Z(z1)],
];
// side tags for a 4-point plan: front (edge 0: at z0), outer side, back, inner side
const SIDE_TAGS = ["front", "side", "back", "inner"];
const PRISM = { tags: SIDE_TAGS, capStart: false, capEnd: true, capTag: "top" };

// box lying on a sloped face: `fr` = { p (centre on the face), n (unit normal), u (across), v (up-slope) }
function faceBox(fr, w, h, d, lift = 0) {
  const g = new THREE.BoxGeometry(w, d, h); // w along u, d along n, h along v
  const m = new THREE.Matrix4().makeBasis(fr.u, fr.n, fr.v);
  m.setPosition(fr.p.clone().addScaledVector(fr.n, d / 2 + lift));
  g.applyMatrix4(m);
  return g;
}

export function buildTowers(ctx) {
  const { fine, mid, add, hullTexel, rand } = ctx;
  const addPrism = (pl, tints, texel = hullTexel) => {
    for (const [tag, geo] of Object.entries(pl)) {
      if (tag === "bottom") continue;
      const tint = tints[tag] ?? tints.side ?? GREY_HULL;
      add(geo, "hull", { color: tint, texel });
    }
  };
  // light front, dark panelled sides and back
  const panelled = {
    front: GREY_LIGHT,
    side: GREY_SIDE,
    back: GREY_SIDE,
    inner: GREY_SIDE,
    top: GREY_HULL,
  };
  const b = BLOCK.base;
  const T = TOWER;
  const P = PLATFORM;
  const LG = BLOCK.legs;

  // staggered raised plates with dark seam gaps on a planar face: frameAt(y, z) -> face frame (u along
  // +z, v up the face), rect = { u0, u1 } in z and { v0, v1 } in y (metres), inside(z, y) keeps the
  // field off the parts of the face the ramp edge or the leg front cut away
  const plateWall = (
    frameAt,
    rect,
    col,
    { min = 10, max = 34, skip = 0.32, inside = null } = {},
  ) => {
    if (!fine) return;
    for (const c of staggered(rand, rect, { min, max })) {
      if (
        inside &&
        !(
          inside(c.u0, c.v0) &&
          inside(c.u1, c.v0) &&
          inside(c.u0, c.v1) &&
          inside(c.u1, c.v1)
        )
      )
        continue;
      const w = c.u1 - c.u0;
      const h = c.v1 - c.v0;
      const zm = (c.u0 + c.u1) / 2;
      const ym = (c.v0 + c.v1) / 2;
      add(faceBox(frameAt(c.v0, zm), w, 0.5, 0.2, 0.02), "dark", {
        color: DARK_SEAM,
        texel: 1 / 4,
      });
      add(faceBox(frameAt(ym, c.u0), 0.5, h, 0.2, 0.02), "dark", {
        color: DARK_SEAM,
        texel: 1 / 4,
      });
      if (!fine || rand() < skip || w < 6 || h < 6) continue;
      add(
        framePlate(frameAt(ym, zm), w - 2.2, h - 2.2, 0.5 + rand() * 0.9, 0.7, {
          texel: hullTexel,
          sink: 0.4,
        }),
        "hull",
        { color: col, uv: "keep" },
      );
    }
  };

  // ---- turret shelves: one per side from the front step to the block's rear, the top continuing the
  // band's slope; the inner edge is buried in the band / block so only the top and outer wall show
  for (const s of [-1, 1]) {
    const sec = (zr) => ({
      z: Z(zr),
      pts: [
        [s * P.xIn, DECK_Y - 0.3],
        [s * P.xOut, DECK_Y - 0.3],
        [s * P.xOut, platY(zr)],
        [s * P.xIn, platY(zr)],
      ],
    });
    const tail = {
      z: Z(P.z1 + P.tail),
      pts: [
        [s * P.xIn, DECK_Y - 0.3],
        [s * P.xOut, DECK_Y - 0.3],
        [s * P.xOut, DECK_Y + 0.5],
        [s * P.xIn, DECK_Y + 0.5],
      ],
    };
    addPrism(
      loftProfile([sec(P.z0), sec(P.z1), tail], {
        tags: ["bottom", "side", "top", "inner"],
        capStart: true,
        capEnd: true,
        capTag: "cap",
      }),
      { side: GREY_FLANK, top: GREY_SHELF, inner: GREY_FLANK, cap: GREY_FLANK },
    );
  }
  // pedestal under the block (the band ends at the sill; the block's foot continues down to the deck)
  add(
    boxMM([-b.hxFoot, DECK_Y - 0.3, Z(b.z0)], [b.hxFoot, SILL_Y, Z(b.z1)]),
    "hull",
    { color: GREY_BLOCK, texel: hullTexel },
  );
  // light sill across the band's end where the ramp starts
  add(
    boxMM(
      [-b.hxSill, SILL_Y - 3.5, Z(b.z0 - 5)],
      [b.hxSill, SILL_Y + 1, Z(b.z0 + 4)],
    ),
    "hull",
    { color: GREY_FLANK, texel: 1 / 6 },
  );

  // ---- the pillar block: the plated ramp front rising from the sill to the roof, shaded sides leaning
  // in a little, the rear face leaning forward
  const H = b.y1 - b.yFoot;
  const fz = (y) => b.zFoot + (b.zTop0 - b.zFoot) * ((y - b.yFoot) / H); // front z at height y
  const hxAt = (y) => b.hxFoot + (b.hx1 - b.hxFoot) * ((y - b.yFoot) / H);
  addPrism(
    yLoft(
      [
        { y: b.yFoot - 0.3, pts: rect(b.hxFoot, b.zFoot, b.z1Foot) },
        { y: b.y1, pts: rect(b.hx1, b.zTop0, b.z1) },
      ],
      PRISM,
    ),
    {
      front: GREY_RAMP,
      side: GREY_BLOCK,
      back: GREY_BLOCK,
      inner: GREY_BLOCK,
      top: GREY_HULL,
    },
  );

  // ---- legs: under each shaft a steep light buttress from the roof down to the shelf, flaring
  // outboard, its dark sides running back to the block's rear
  const yLegFoot = platY(LG.zFoot);
  const legT = (y) => (y - yLegFoot) / (b.y1 - yLegFoot);
  const legFrontZ = (y) => LG.zFoot + (LG.zTop - LG.zFoot) * legT(y);
  const legRearZ = (y) => LG.z1Foot + (LG.z1Top - LG.z1Foot) * legT(y);
  for (const s of [-1, 1])
    addPrism(
      yLoft(
        [
          {
            y: yLegFoot - 0.3,
            pts: sideRect(s, LG.xInFoot, LG.xOutFoot, LG.zFoot, LG.z1Foot),
          },
          {
            y: b.y1 + 0.2,
            pts: sideRect(s, LG.xInTop, LG.xOutTop, LG.zTop, LG.z1Top),
          },
        ],
        PRISM,
      ),
      panelled,
    );

  // frame on the block's front face at height y, x offset
  const rampN = new THREE.Vector3(0, b.zTop0 - b.zFoot, -H).normalize();
  const rampV = new THREE.Vector3(0, H, b.zTop0 - b.zFoot).normalize();
  const rampFrame = (y, x) => ({
    p: new THREE.Vector3(x, y, Z(fz(y))),
    n: rampN,
    u: new THREE.Vector3(1, 0, 0),
    v: rampV,
  });
  const faceLen = Math.hypot(H, b.zTop0 - b.zFoot);
  if (mid) {
    // ramp face relief, as in the reference (raised plates 0.7-1.7 m proud and dark recessed rows, so
    // the shading breaks the plate up): a band of full-width grille rows directly under the shafts —
    // dark rows between raised light bars — with a slotted box over them on the port third, a tall
    // raised panel along the starboard third, a large raised plate low in the centre inside a thin dark
    // border, short raised strips outboard of it, thin seams between, and low steps at the foot
    const fy = (f) => b.yFoot + H * f;
    const fullW = (f) => hxAt(fy(f)) * 2 - 4;
    const seam = (f, x, w, h = 0.6) =>
      add(faceBox(rampFrame(fy(f), x), w, h, 0.25, 0.05), "dark", {
        color: DARK_SEAM,
        texel: 1 / 4,
      });
    const plate = (f, x, w, h, d, lift = 0.05) =>
      add(faceBox(rampFrame(fy(f), x), w, h, d, lift), "hull", {
        color: GREY_RAMP,
        texel: hullTexel,
      });
    const slot = (f, x, w, h, lift = 0.05) =>
      add(faceBox(rampFrame(fy(f), x), w, h, 0.3, lift), "hull", {
        color: GREY_RECESS,
        texel: 1 / 6,
      });
    const row = (f, x, w, h) =>
      add(faceBox(rampFrame(fy(f), x), w, h, 0.3, 0.05), "hull", {
        color: GREY_ROW,
        texel: 1 / 6,
      });
    // grille band under the shafts: dark rows between raised light bars, full width
    const g0 = 0.71;
    const g1 = 0.96;
    const rows = fine ? 5 : 3;
    const pitch = (g1 - g0) / rows;
    for (let i = 0; i < rows; i++) {
      const fa = g0 + pitch * i;
      const fs = fa + pitch * 0.2;
      const fb = fa + pitch * 0.66;
      row(fs, 0, fullW(fs), faceLen * pitch * 0.3);
      plate(fb, 0, fullW(fb), faceLen * pitch * 0.56, 1.0);
    }
    // the raised slotted box on the upper port third (over the band), as in the reference
    plate(0.83, -9.5, 17, 9, 1.7);
    if (fine)
      for (const k of [-2, -1, 0, 1, 2])
        slot(0.83, -9.5 + k * 2.8, 1.6, 5.2, 1.75);
    // the tall raised panel along the starboard third
    {
      const f0 = 0.06;
      const f1 = 0.68;
      const fm = (f0 + f1) / 2;
      const xa = 7;
      const xb = hxAt(fy(fm)) - 2.5;
      plate(fm, (xa + xb) / 2, xb - xa, faceLen * (f1 - f0), 0.7);
      seam(fm, xa - 0.5, 0.5, faceLen * (f1 - f0));
      if (fine)
        for (const f of [0.17, 0.26]) {
          slot(f, (xa + xb) / 2, 4.5, 4.5, 0.75);
          plate(f, (xa + xb) / 2, 3.3, 3.3, 0.8, 0.8);
        }
    }
    // the big raised plate low in the centre (a little to port) inside its dark border
    {
      const f0 = 0.14;
      const f1 = 0.5;
      const fm = (f0 + f1) / 2;
      const w = hxAt(fy(fm)) * 2 * 0.48;
      const h = faceLen * (f1 - f0);
      slot(fm, -4, w, h);
      plate(fm, -4, w - 2.0, h - 2.0, 1.3, 0.3);
      if (fine) {
        seam(fm, -4, 0.5, h - 4);
        seam(fm, -4, w - 4, 0.5);
      }
    }
    // short raised strips outboard of it on the port side, small dark hatches between
    for (const [i, f] of (fine
      ? [0.19, 0.28, 0.37, 0.46]
      : [0.24, 0.42]
    ).entries()) {
      const hx = hxAt(fy(f));
      plate(f, -(hx * 0.8), hx * 0.3 - 1, 2.4, 0.9);
      if (fine && i % 2 === 1) slot(f + 0.045, -(hx * 0.8), 2.6, 2.0);
    }
    // seams between the elements
    for (const f of [0.58, 0.65]) seam(f, 0, fullW(f) - 1);
    if (fine) {
      seam(0.09, 0, fullW(0.09) - 1);
      slot(0.61, -7, 4, 1.6);
      slot(0.61, 7, 4, 1.6);
    }
    // low steps at the ramp foot
    for (let i = 0; i < 3; i++) {
      const ya = b.yFoot + i * 2.0;
      const yb = ya + 2.0;
      add(
        boxMM(
          [-(b.hxFoot + 1.5), ya - 0.2, Z(fz(yb)) - (3 - i) * 2.4],
          [b.hxFoot + 1.5, yb, Z(fz(ya)) + 0.5],
        ),
        "hull",
        { color: GREY_RAMP, texel: hullTexel },
      );
    }
    // light corner strips along the ramp's side edges
    for (const s of [-1, 1])
      for (let i = 0; i < 3; i++) {
        const ym = b.yFoot + (H * (i + 0.5)) / 3;
        add(
          faceBox(
            rampFrame(ym, s * (hxAt(ym) - 1.0)),
            2.0,
            faceLen / 3 + 0.4,
            0.6,
            0.2,
          ),
          "hull",
          { color: GREY_LIGHT, texel: 1 / 6 },
        );
      }
    // the block's shaded sides between the ramp edge and the leg, and the legs' outer sides: no light
    // stripes (they read as steps from the side) — subtle horizontal seams and a few dark vertical
    // slots near the top. Both faces lean, so the marks sit in frames aligned to each face.
    const leanFrame = (s, x0, y0, x1, y1) => {
      // frame on the side face through (x0, y0) -> (x1, y1) in the x-y plane (s = side), u along +z
      const v = new THREE.Vector3(s * (x1 - x0), y1 - y0, 0).normalize();
      const n = new THREE.Vector3(s * v.y, -s * v.x, 0);
      return (y, z) => {
        const t = (y - y0) / (y1 - y0);
        return {
          p: new THREE.Vector3(s * (x0 + (x1 - x0) * t), y, z),
          n,
          u: new THREE.Vector3(0, 0, 1),
          v,
        };
      };
    };
    const sideMarks = (frameAt, y0, y1, zRange) => {
      // zRange(y) -> [za, zb] world z of the face at height y
      const at = (f) => y0 + (y1 - y0) * f;
      if (fine)
        for (const f of [0.32, 0.6]) {
          const [za, zb] = zRange(at(f));
          if (zb - za < 10) continue;
          add(
            faceBox(frameAt(at(f), (za + zb) / 2), zb - za - 6, 0.6, 0.2, 0.05),
            "dark",
            { color: DARK_SEAM, texel: 1 / 4 },
          );
        }
      const fs = 0.8;
      const [za, zb] = zRange(at(fs));
      if (zb - za < 10) return;
      const n = fine ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const z = za + ((zb - za) * (i + 0.5)) / n;
        add(
          faceBox(
            frameAt(at(fs), z),
            2.4,
            Math.min(11, (y1 - y0) * 0.16),
            0.5,
            0.05,
          ),
          "hull",
          { color: GREY_RECESS, texel: 1 / 6 },
        );
      }
    };
    for (const s of [-1, 1]) {
      sideMarks(
        leanFrame(s, b.hxFoot, b.yFoot, b.hx1, b.y1),
        b.yFoot,
        b.y1,
        (y) => [Z(fz(y)) + 5, Z(Math.min(legFrontZ(y), b.z1)) - 4],
      );
      sideMarks(
        leanFrame(s, LG.xOutFoot, yLegFoot, LG.xOutTop, b.y1),
        yLegFoot,
        b.y1,
        (y) => [Z(legFrontZ(y)) + 6, Z(legRearZ(y)) - 6],
      );
      plateWall(
        leanFrame(s, b.hxFoot, b.yFoot, b.hx1, b.y1),
        { u0: Z(fz(b.yFoot)), u1: Z(b.z1), v0: b.yFoot + 2, v1: b.y1 - 2 },
        GREY_BLOCK,
        {
          inside: (z, y) =>
            z > Z(fz(y)) + 2 && z < Z(Math.min(legFrontZ(y), b.z1)) - 2,
        },
      );
      plateWall(
        leanFrame(s, LG.xOutFoot, yLegFoot, LG.xOutTop, b.y1),
        {
          u0: Z(LG.zTop),
          u1: Z(LG.z1Foot),
          v0: yLegFoot + 2,
          v1: b.y1 - 2,
        },
        GREY_SIDE,
        {
          inside: (z, y) => z > Z(legFrontZ(y)) + 2 && z < Z(legRearZ(y)) - 2,
        },
      );
      // plate seams across the leg fronts
      if (fine) {
        const legN = new THREE.Vector3(
          0,
          LG.zFoot - LG.zTop,
          -(b.y1 - yLegFoot),
        ).normalize();
        const legV = new THREE.Vector3(
          0,
          b.y1 - yLegFoot,
          LG.zTop - LG.zFoot,
        ).normalize();
        const legFrame = (f) => {
          const y = yLegFoot + (b.y1 - yLegFoot) * f;
          const xi = LG.xInFoot + (LG.xInTop - LG.xInFoot) * f;
          const xo = LG.xOutFoot + (LG.xOutTop - LG.xOutFoot) * f;
          return {
            w: xo - xi,
            fr: {
              p: new THREE.Vector3(s * ((xi + xo) / 2), y, Z(legFrontZ(y))),
              n: legN,
              u: new THREE.Vector3(1, 0, 0),
              v: legV,
            },
          };
        };
        for (const f of [0.25, 0.5, 0.75]) {
          const { w, fr } = legFrame(f);
          add(faceBox(fr, w - 1, 0.7, 0.2, 0.05), "dark", {
            color: DARK_SEAM,
            texel: 1 / 4,
          });
        }
        // a column of small dark windows down the leg's light front
        for (const f of [0.12, 0.3, 0.48, 0.66, 0.84]) {
          const { fr } = legFrame(f);
          add(faceBox(fr, 2.4, 2.4, 0.3, 0.3), "hull", {
            color: GREY_RECESS,
            texel: 1 / 6,
          });
        }
      }
    }
  }

  // ---- bridge deck joining the shafts behind their fronts (seen through the gap): a low light block
  // with a dark hood on top and a lit window row across its front, as in the reference
  const br = BLOCK.bridge;
  add(boxMM([-br.hx, b.y1 - 0.2, Z(br.z0)], [br.hx, br.y1, Z(br.z1)]), "hull", {
    color: GREY_RAMP,
    texel: hullTexel,
  });
  add(
    boxMM(
      [-br.hx + 1.5, br.y1 - 0.1, Z(br.z0) + 3],
      [br.hx - 1.5, br.y1 + br.hoodH, Z(br.z1) - 4],
    ),
    "hull",
    { color: GREY_RECESS, texel: hullTexel },
  );
  if (mid) {
    add(
      quadFacing(
        [0, (b.y1 + br.y1) / 2, Z(br.z0) - 0.3],
        [0, 0, -1],
        [0, 1, 0],
        br.hx * 1.5,
        1.3,
      ),
      "windows",
      { color: ROW_WARM, uv: "keep" },
    );
  }

  // ---- aft body: behind the shafts the block steps down in three terraces (sloped risers, flat
  // treads, widening as it descends) to a stern shelf, then the aft foot face carrying the dark stern
  // hangar mouth above the engine bank. One loft, so the shafts' rear faces stand clear above it.
  const A = AFT;
  const yDeck = DECK_Y;
  const aftSec = ([zr, hx, y]) => {
    const hb = hx + A.batter * (y - yDeck);
    return {
      z: Z(zr),
      pts: [
        [-hb, yDeck - 0.3],
        [hb, yDeck - 0.3],
        [hx, y],
        [-hx, y],
      ],
    };
  };
  const sooted = (col, zr) => {
    const k = sootAt(Z(zr));
    return mulColor(col, k[0], k[1], k[2]);
  };
  const aft = loftProfile(A.sections.map(aftSec), {
    tags: ["bottom", "side", "top", "side"],
    capStart: false,
    capEnd: false,
  });
  for (const [tag, geo] of Object.entries(aft))
    if (tag !== "bottom")
      add(geo, "hull", {
        color: tag === "top" ? sooted(GREY_HULL, 990) : sooted(GREY_BLOCK, 990),
        texel: hullTexel,
      });
  const last = A.sections[A.sections.length - 1];
  const zAft = Z(last[0]);
  const hxAft = last[1];
  const yAft = last[2];
  // aft foot face: the battered trapezoid end of the loft with the hangar mouth cut out of it
  const hg = A.hangar;
  const faceCol = sooted(GREY_BLOCK, last[0]);
  const hbAft = hxAft + A.batter * (yAft - yDeck);
  {
    const shape = new THREE.Shape([
      new THREE.Vector2(-hbAft, yDeck - 0.3),
      new THREE.Vector2(hbAft, yDeck - 0.3),
      new THREE.Vector2(hxAft, yAft),
      new THREE.Vector2(-hxAft, yAft),
    ]);
    shape.holes.push(
      new THREE.Path([
        new THREE.Vector2(-hg.hx, hg.y0),
        new THREE.Vector2(-hg.hx, hg.y1),
        new THREE.Vector2(hg.hx, hg.y1),
        new THREE.Vector2(hg.hx, hg.y0),
      ]),
    );
    add(new THREE.ShapeGeometry(shape).translate(0, 0, zAft), "hull", {
      color: faceCol,
      texel: hullTexel,
    });
  }
  // the hangar: an inward-facing dark box, a lit floor strip along the back wall, a few small lights
  add(
    flipGeometry(
      boxMM([-hg.hx, hg.y0, zAft - hg.depth], [hg.hx, hg.y1, zAft + 0.5]),
    ),
    "dark",
    { color: DARK_RECESS, texel: 1 / 8 },
  );
  add(
    quadFacing(
      [0, hg.y0 + 0.6, zAft - hg.depth + 2.5],
      [0, 1, 0],
      [0, 0, 1],
      hg.hx * 2 - 4,
      2.2,
    ),
    "windows",
    { color: HANGAR_WARM, uv: "keep" },
  );
  if (mid) {
    add(
      quadFacing(
        [0, (hg.y0 + hg.y1) / 2, zAft - hg.depth + 0.4],
        [0, 0, 1],
        [0, 1, 0],
        hg.hx * 2 - 8,
        1.2,
      ),
      "windows",
      { color: ROW_WARM, uv: "keep" },
    );
    for (const x of fine ? [-14, -7, 0, 7, 14] : [-8, 8])
      add(
        quadFacing(
          [x, hg.y1 - 0.4, zAft - hg.depth * 0.45],
          [0, -1, 0],
          [0, 0, 1],
          1.4,
          1.4,
        ),
        "windows",
        { color: 0xffffff, uv: "keep" },
      );
    // hangar rim: a dark lintel and posts standing a little proud of the face
    add(
      boxMM(
        [-hg.hx - 2, hg.y1 - 0.2, zAft - 1],
        [hg.hx + 2, hg.y1 + 2.2, zAft + 1.6],
      ),
      "dark",
      { color: DARK, texel: 1 / 4 },
    );
    for (const sx of [-1, 1])
      add(
        boxMM(
          [
            Math.min(sx * (hg.hx + 0.2), sx * (hg.hx + 2)),
            hg.y0 - 0.5,
            zAft - 1,
          ],
          [Math.max(sx * (hg.hx + 0.2), sx * (hg.hx + 2)), hg.y1, zAft + 1.6],
        ),
        "dark",
        { color: DARK, texel: 1 / 4 },
      );
  }

  // relief on the aft body: staggered raised plates with dark seams on the treads, side walls and the
  // foot face; window rows and dark slots on the risers; dishes, masts and vents on the terraces
  const aftFrames = [];
  for (let i = 0; i + 1 < A.sections.length; i++) {
    const [z0, hx0, y0] = A.sections[i];
    const [z1, hx1, y1] = A.sections[i + 1];
    aftFrames.push({ z0, z1, hx0, hx1, y0, y1, riser: y1 < y0 - 1 });
  }
  if (mid) {
    // horizontal-surface plate field (treads, stern shelf)
    const treadField = (z0, z1, hx, y, zr) => {
      const cells = staggered(
        rand,
        { u0: -hx + 2, u1: hx - 2, v0: Z(z0) + 2, v1: Z(z1) - 2 },
        { min: 9, max: 30 },
      );
      for (const c of cells) {
        add(
          boxMM([c.u0 - 0.25, y - 0.2, c.v0], [c.u0 + 0.25, y + 0.06, c.v1]),
          "dark",
          { color: DARK_SEAM, texel: 1 / 4 },
        );
        add(
          boxMM([c.u0, y - 0.2, c.v0 - 0.25], [c.u1, y + 0.06, c.v0 + 0.25]),
          "dark",
          { color: DARK_SEAM, texel: 1 / 4 },
        );
        if (!fine || rand() < 0.3) continue;
        const w = c.u1 - c.u0 - 2;
        const d = c.v1 - c.v0 - 2;
        if (w < 4 || d < 4) continue;
        add(
          boxMM(
            [c.u0 + 1, y - 0.3, c.v0 + 1],
            [c.u1 - 1, y + 0.4 + rand() * 0.8, c.v1 - 1],
          ),
          "hull",
          { color: sooted(GREY_HULL, zr), texel: hullTexel },
        );
      }
    };
    // battered side wall of a segment: p(t, y) = (sx (hx(t) + batter (yTop(t) - y)), y, z(t)); frame with
    // u along the wall, v up the slope, n outward
    const wallField = (seg, sx) => {
      const { z0, z1, hx0, hx1, y0, y1 } = seg;
      const dz = Z(z1) - Z(z0);
      const at = (t, y) =>
        new THREE.Vector3(
          sx * (hx0 + (hx1 - hx0) * t + A.batter * (y0 + (y1 - y0) * t - y)),
          y,
          Z(z0) + dz * t,
        );
      const len = at(1, yDeck).distanceTo(at(0, yDeck));
      const u = at(1, yDeck).sub(at(0, yDeck)).normalize();
      const v = new THREE.Vector3(-sx * A.batter, 1, 0).normalize();
      const n = new THREE.Vector3().crossVectors(u, v);
      if (n.x * sx < 0) n.negate();
      n.normalize();
      const top = Math.min(y0, y1);
      const frameAt = (a, b) => ({ p: at(a / len, b), n, u, v });
      // a lit window row along the wall of each tread, a little above mid-height
      if (y0 === y1 && len > 14)
        add(
          quadFacing(
            frameAt(len / 2, yDeck + (top - yDeck) * 0.62)
              .p.addScaledVector(n, 0.3)
              .toArray(),
            n.toArray(),
            v.toArray(),
            len - 8,
            1.3,
          ),
          "windows",
          { color: ROW_WARM, uv: "keep" },
        );
      if (!fine) return;
      const cells = staggered(
        rand,
        { u0: 2, u1: len - 2, v0: yDeck + 2, v1: top - 1.5 },
        { min: 9, max: 30 },
      );
      for (const c of cells) {
        const w = c.u1 - c.u0;
        const h = c.v1 - c.v0;
        add(
          faceBox(frameAt((c.u0 + c.u1) / 2, c.v0), w, 0.5, 0.2, 0.02),
          "dark",
          { color: DARK_SEAM, texel: 1 / 4 },
        );
        add(
          faceBox(frameAt(c.u0, (c.v0 + c.v1) / 2), 0.5, h, 0.2, 0.02),
          "dark",
          { color: DARK_SEAM, texel: 1 / 4 },
        );
        if (!fine || rand() < 0.3 || w < 6 || h < 6) continue;
        add(
          framePlate(
            frameAt((c.u0 + c.u1) / 2, (c.v0 + c.v1) / 2),
            w - 2.2,
            h - 2.2,
            0.5 + rand() * 0.9,
            0.7,
            { texel: hullTexel, sink: 0.4 },
          ),
          "hull",
          { color: sooted(GREY_BLOCK, (z0 + z1) / 2), uv: "keep" },
        );
      }
    };
    for (const seg of aftFrames) {
      const { z0, z1, hx0, hx1, y0, y1 } = seg;
      if (seg.riser) {
        // riser frame: n up-aft, v up the slope
        const dz = Z(z1) - Z(z0);
        const dy = y0 - y1;
        const n = new THREE.Vector3(0, dz, dy).normalize();
        const v = new THREE.Vector3(0, dy, -dz).normalize();
        const slope = Math.hypot(dz, dy);
        const frameAt = (x, f) => ({
          p: new THREE.Vector3(x, y0 - dy * f, Z(z0) + dz * f),
          n,
          u: new THREE.Vector3(1, 0, 0),
          v,
        });
        const hx = Math.min(hx0, hx1) - 2;
        // lit window row a third of the way up, dark slots above it, a seam under the top edge
        add(
          quadFacing(
            frameAt(0, 0.4).p.clone().addScaledVector(n, 0.35).toArray(),
            n.toArray(),
            v.toArray(),
            hx * 2 - 6,
            1.4,
          ),
          "windows",
          { color: ROW_COOL, uv: "keep" },
        );
        // small dark vents in a row above the windows, a seam under the top edge, two short raised
        // plates offset left and right so the face breaks up without stripes
        const nSlots = fine ? 5 : 3;
        for (let i = 0; i < nSlots; i++) {
          const x = -hx + 5 + ((hx * 2 - 10) * (i + 0.5)) / nSlots;
          add(faceBox(frameAt(x, 0.66), 2.2, slope * 0.12, 0.3, 0.05), "dark", {
            color: DARK_RECESS,
            texel: 1 / 6,
          });
        }
        if (fine) {
          add(faceBox(frameAt(0, 0.93), hx * 2 - 3, 0.6, 0.2, 0.05), "dark", {
            color: DARK_SEAM,
            texel: 1 / 4,
          });
          for (const sx of [-1, 1])
            add(
              framePlate(
                frameAt(sx * hx * 0.45, 0.14 + (sx > 0 ? 0.04 : 0)),
                hx * 0.7,
                slope * 0.14,
                0.6,
                0.6,
                { texel: hullTexel, sink: 0.3 },
              ),
              "hull",
              { color: sooted(GREY_HULL, z0), uv: "keep" },
            );
        }
      } else if (fine) {
        treadField(z0, z1, Math.min(hx0, hx1), y0, (z0 + z1) / 2);
      }
      for (const sx of [-1, 1]) wallField(seg, sx);
    }
    // foot face relief: seams and raised plates on the lintel and the posts
    if (fine) {
      const frameAt = (x, y) => ({
        p: new THREE.Vector3(x, y, zAft + 0.4),
        n: new THREE.Vector3(0, 0, 1),
        u: new THREE.Vector3(1, 0, 0),
        v: new THREE.Vector3(0, 1, 0),
      });
      const cells = staggered(
        rand,
        { u0: -hxAft + 1.5, u1: hxAft - 1.5, v0: hg.y1 + 3, v1: yAft - 1.5 },
        { min: 8, max: 26 },
      );
      for (const c of cells) {
        add(
          faceBox(
            frameAt(c.u0, (c.v0 + c.v1) / 2),
            0.5,
            c.v1 - c.v0,
            0.2,
            0.02,
          ),
          "dark",
          { color: DARK_SEAM, texel: 1 / 4 },
        );
        if (!fine || rand() < 0.35 || c.u1 - c.u0 < 6 || c.v1 - c.v0 < 5)
          continue;
        add(
          framePlate(
            frameAt((c.u0 + c.u1) / 2, (c.v0 + c.v1) / 2),
            c.u1 - c.u0 - 2,
            c.v1 - c.v0 - 2,
            0.5 + rand() * 0.8,
            0.6,
            { texel: hullTexel, sink: 0.4 },
          ),
          "hull",
          { color: faceCol, uv: "keep" },
        );
      }
      add(
        quadFacing(
          [0, yAft - 4, zAft + 0.7],
          [0, 0, 1],
          [0, 1, 0],
          hxAft * 2 - 10,
          1.2,
        ),
        "windows",
        { color: ROW_WARM, uv: "keep" },
      );
    }
    // greebles: a dish and a mast on each side of the middle tread, vents and boxes on the stern shelf
    const mid2 = aftFrames[3];
    for (const sx of [-1, 1]) {
      const x = sx * (mid2.hx0 - 6);
      const zc = Z((mid2.z0 + mid2.z1) / 2);
      add(
        facetedDome(3.2, 1.4, 8, 2).translate(x, mid2.y0 + 1.0, zc - 6),
        "hull",
        {
          color: GREY_FLANK,
          texel: 1 / 6,
        },
      );
      add(
        new THREE.CylinderGeometry(1.2, 1.6, 1.2, 8).translate(
          x,
          mid2.y0 + 0.6,
          zc - 6,
        ),
        "dark",
        { color: DARK, texel: 1 / 3 },
      );
      add(
        tube([x, mid2.y0, zc + 8], [x, mid2.y0 + 14, zc + 8], 0.5, 6),
        "dark",
        {
          color: DARK,
          texel: 1 / 3,
        },
      );
      add(
        boxMM(
          [x - 2, mid2.y0 + 11, zc + 7.5],
          [x + 2, mid2.y0 + 11.5, zc + 8.5],
        ),
        "dark",
        { color: DARK, texel: 1 / 3 },
      );
    }
    if (fine) {
      const shelf = aftFrames[5];
      for (let i = 0; i < 10; i++) {
        const x = (rand() - 0.5) * (shelf.hx0 * 2 - 10);
        const zr = shelf.z0 + 6 + rand() * (shelf.z1 - shelf.z0 - 14);
        const w = 2.5 + rand() * 4;
        const d = 2.5 + rand() * 5;
        add(
          boxMM(
            [x - w / 2, shelf.y0 - 0.3, Z(zr) - d / 2],
            [x + w / 2, shelf.y0 + 0.6 + rand() * 1.6, Z(zr) + d / 2],
          ),
          rand() < 0.5 ? "dark" : "hull",
          { color: rand() < 0.5 ? DARK : sooted(GREY_FLANK, zr), texel: 1 / 4 },
        );
      }
    }
  }

  // ---- the two shafts: slender, deep, leaning aft a little, standing on the roof / leg tops
  const shaftH = T.y1 - T.y0;
  const shaftN = new THREE.Vector3(0, T.lean, -shaftH).normalize();
  const shaftV = new THREE.Vector3(0, shaftH, T.lean).normalize();
  for (const s of [-1, 1]) {
    const cx = s * T.x;
    const xa = T.x - T.hx;
    const xb = T.x + T.hx;
    addPrism(
      yLoft(
        [
          {
            y: T.y0 - 0.5,
            pts: sideRect(s, xa, xb, T.zFront, T.zFront + T.depth),
          },
          {
            y: T.y1 + 0.2,
            pts: sideRect(
              s,
              xa,
              xb,
              T.zFront + T.lean,
              T.zFront + T.lean + T.depth,
            ),
          },
        ],
        PRISM,
      ),
      panelled,
    );
    const shaftFrame = (f, dx = 0) => ({
      p: new THREE.Vector3(
        cx + dx,
        T.y0 + shaftH * f,
        Z(T.zFront + T.lean * f),
      ),
      n: shaftN,
      u: new THREE.Vector3(1, 0, 0),
      v: shaftV,
    });
    if (mid) {
      // front: horizontal seams between plate rows, small dark recesses, a lit slit near the top
      for (const f of fine ? [0.25, 0.5, 0.75] : [0.5])
        add(faceBox(shaftFrame(f), T.hx * 2 - 1.2, 0.7, 0.2, 0.05), "dark", {
          color: DARK_SEAM,
          texel: 1 / 4,
        });
      if (fine)
        for (const [f, dx] of [
          [0.36, -0.35],
          [0.62, 0.3],
        ])
          add(
            faceBox(shaftFrame(f, dx * T.hx), T.hx * 0.8, 2.6, 0.5, -0.55),
            "hull",
            {
              color: GREY_RECESS,
              texel: 1 / 6,
            },
          );
      // sides (outer and inner): plain, with three dark vertical slots near the top and two subtle
      // horizontal seams — no light stripes
      for (const sx of [-1, 1]) {
        const xf = cx + sx * T.hx;
        const xa = Math.min(xf, xf + sx * 0.5);
        const xb = Math.max(xf, xf + sx * 0.5);
        const ys = T.y0 + shaftH * 0.78;
        for (const k of fine ? [0.2, 0.5, 0.8] : [0.35, 0.7]) {
          const z = Z(T.zFront + T.lean * 0.78 + T.depth * k);
          add(boxMM([xa, ys - 5, z - 1.2], [xb, ys + 5, z + 1.2]), "hull", {
            color: GREY_RECESS,
            texel: 1 / 6,
          });
        }
        if (fine)
          for (const f of [0.28, 0.55]) {
            const y = T.y0 + shaftH * f;
            add(
              boxMM(
                [Math.min(xf, xf + sx * 0.25), y - 0.3, Z(T.zFront + 4)],
                [
                  Math.max(xf, xf + sx * 0.25),
                  y + 0.3,
                  Z(T.zFront + T.depth - 4),
                ],
              ),
              "dark",
              { color: DARK_SEAM, texel: 1 / 4 },
            );
          }
        // staggered raised plates over the lower two thirds of the side (the shaft leans aft a little,
        // so the frame follows it)
        plateWall(
          (y, z) => ({
            p: new THREE.Vector3(xf, y, z + (T.lean * (y - T.y0)) / shaftH),
            n: new THREE.Vector3(sx, 0, 0),
            u: new THREE.Vector3(0, 0, 1),
            v: new THREE.Vector3(0, 1, 0),
          }),
          {
            u0: Z(T.zFront) + 2,
            u1: Z(T.zFront + T.depth) - 2,
            v0: T.y0 + 2,
            v1: T.y0 + shaftH * 0.7,
          },
          GREY_SIDE,
          { min: 8, max: 26, skip: 0.3 },
        );
      }
    }

    // ---- head: a light hammerhead — the bevelled top slab overhanging the shaft on every side (most
    // to the front, 46 m), a dark recessed window band under it along the front and around the corners,
    // below that a light chin tapering back and in to the shaft (hanging below the shaft top at the
    // front, sloping up to it), a dark sensor block with a light shallow drum and the mast on top over
    // the rear half. Every face is light hull grey; only the band and the sensor block are dark.
    const hxa = T.headX - T.headHx;
    const hxb = T.headX + T.headHx;
    const xlo = Math.min(s * hxa, s * hxb);
    const xhi = Math.max(s * hxa, s * hxb);
    const zf0 = Z(T.frontZ0);
    const z1 = Z(T.headZ1);
    const yVis = T.visorY0;
    const yBand = yVis - T.band;
    const slabSec = (y, dz) => ({
      y,
      pts: sideRect(s, hxa, hxb, T.frontZ0 + dz, T.headZ1),
    });
    addPrism(
      yLoft(
        [
          slabSec(yVis, 2.4),
          slabSec(yVis + 1.4, 0.8),
          slabSec(yVis + 3.0, 0),
          slabSec(T.headY1 - 2.4, 0),
          slabSec(T.headY1 - 1.0, 0.9),
          slabSec(T.headY1, 2.2),
        ],
        PRISM,
      ),
      {
        front: GREY_LIGHT,
        side: GREY_LIGHT,
        inner: GREY_LIGHT,
        back: GREY_FLANK,
        top: GREY_HEAD_TOP,
      },
      1 / 8,
    );
    // the slab's underside (the loft has no bottom cap)
    add(boxMM([xlo, yVis - 0.3, zf0 + 2.2], [xhi, yVis + 0.2, z1]), "hull", {
      color: GREY_LIGHT,
      texel: 1 / 8,
    });
    // dark recessed window band under the slab, wrapping the front corners
    add(
      boxMM(
        [xlo + 0.9, yBand, zf0 + 0.9],
        [xhi - 0.9, yVis + 0.05, zf0 + T.bandDepth],
      ),
      "hull",
      { color: GREY_RECESS, texel: 1 / 6 },
    );
    // light filler behind the band up to the slab
    add(
      boxMM(
        [xlo + 1.0, yBand - 0.05, zf0 + T.bandDepth - 0.05],
        [xhi - 1.0, yVis + 0.05, z1 - 0.6],
      ),
      "hull",
      { color: GREY_LIGHT, texel: 1 / 8 },
    );
    // the chin: trapezoid section (wide under the band, narrow on the shaft), its underside sloping
    // from chinDrop below the shaft top at the front up to the shaft top at the shaft's front face
    const chinSec = (dz, y0) => ({
      z: zf0 + dz,
      pts: [
        [cx - T.chinHx, y0],
        [cx + T.chinHx, y0],
        [xhi - 1.0, yBand - T.chinLip],
        [xhi - 1.0, yBand + 0.05],
        [xlo + 1.0, yBand + 0.05],
        [xlo + 1.0, yBand - T.chinLip],
      ],
    });
    const chin = loftProfile(
      [
        chinSec(1.6, T.headY0 - T.chinDrop),
        chinSec(T.zFront + T.lean - T.frontZ0 + 1, T.headY0),
        chinSec(T.headZ1 - T.frontZ0 - 0.6, T.headY0),
      ],
      {
        tags: ["bottom", "side", "side", "top", "side", "side"],
        capStart: true,
        capEnd: true,
        capTag: "cap",
      },
    );
    for (const [tag, geo] of Object.entries(chin))
      if (tag !== "top")
        add(geo, "hull", {
          color: tag === "bottom" ? GREY_HULL : GREY_LIGHT,
          texel: 1 / 8,
        });
    if (mid)
      for (const sx of [-1, 1]) {
        const xf = sx > 0 ? xhi : xlo;
        plateWall(
          (y, z) => ({
            p: new THREE.Vector3(xf, y, z),
            n: new THREE.Vector3(sx, 0, 0),
            u: new THREE.Vector3(0, 0, 1),
            v: new THREE.Vector3(0, 1, 0),
          }),
          { u0: zf0 + 4, u1: z1 - 1.5, v0: yVis + 3.6, v1: T.headY1 - 1.2 },
          GREY_LIGHT,
          { min: 7, max: 36, skip: 0.25 },
        );
      }
    if (fine) {
      // a seam along the slab's sides where it meets the band's rear, and a hatch on the chin's front
      for (const sx of [-1, 1]) {
        const xf = sx > 0 ? xhi : xlo;
        add(
          boxMM(
            [Math.min(xf, xf + sx * 0.25), yVis + 5.5, zf0 + 6],
            [Math.max(xf, xf + sx * 0.25), yVis + 6.1, z1 - 6],
          ),
          "dark",
          { color: DARK_SEAM, texel: 1 / 4 },
        );
      }
      add(
        boxMM(
          [cx - 3, T.headY0 - T.chinDrop + 3, zf0 + 1.0],
          [cx + 3, T.headY0 - T.chinDrop + 6, zf0 + 1.7],
        ),
        "hull",
        { color: GREY_RECESS, texel: 1 / 6 },
      );
    }
    // dark sensor block over the rear half (its lid a shade lighter), the light shallow drum on it, the
    // mast with its light, two small dark boxes behind
    const seg = fine ? 16 : mid ? 10 : 8;
    const se = T.sensor;
    const scx = s * T.headX;
    add(
      boxMM(
        [scx - se.hx, T.headY1 - 0.3, Z(se.z0)],
        [scx + se.hx, se.y1, Z(se.z1)],
      ),
      "hull",
      { color: GREY_RECESS, texel: hullTexel },
    );
    add(
      boxMM(
        [scx - se.hx - 0.4, se.y1 - 0.1, Z(se.z0) - 0.4],
        [scx + se.hx + 0.4, se.y1 + 0.6, Z(se.z1) + 0.4],
      ),
      "hull",
      { color: GREY_BLOCK, texel: 1 / 8 },
    );
    const dz = Z(T.drumZ);
    add(
      new THREE.CylinderGeometry(T.drumR, T.drumR, 2.6, seg).translate(
        scx,
        se.y1 + 0.6 + 1.3,
        dz,
      ),
      "hull",
      { color: GREY_LIGHT, texel: 1 / 6 },
    );
    if (mid) {
      add(
        new THREE.CylinderGeometry(
          T.drumR * 0.5,
          T.drumR * 0.82,
          1.6,
          seg,
        ).translate(scx, se.y1 + 0.6 + 2.6 + 0.8, dz),
        "hull",
        { color: GREY_LIGHT, texel: 1 / 6 },
      );
      for (const ddz of [8, 14])
        add(
          boxMM(
            [scx - se.hx - 3, T.headY1, Z(se.z1 + ddz)],
            [scx + se.hx + 3, T.headY1 + 3.5, Z(se.z1 + ddz + 3)],
          ),
          "dark",
          { color: DARK, texel: 1 / 3 },
        );
      const mx = scx + s * 3;
      const mz = Z(se.z1 - 8);
      add(
        tube([mx, se.y1 + 0.6, mz], [mx, T.mastY1 - 1.5, mz], 0.6, 6),
        "dark",
        {
          color: DARK,
          texel: 1 / 3,
        },
      );
      add(
        boxMM(
          [mx - 3.5, T.mastY1 - 4, mz - 0.5],
          [mx + 3.5, T.mastY1 - 3.3, mz + 0.5],
        ),
        "dark",
        { color: DARK, texel: 1 / 3 },
      );
      add(
        quadFacing([mx, T.mastY1 - 1.2, mz], [0, 1, 0], [0, 0, -1], 1.1, 1.1),
        "windows",
        {
          color: 0xffffff,
          uv: "keep",
        },
      );
    }
  }

  // ---- greebles on the shelf tops: a few hatches, vents and small boxes either side of the turret row
  if (fine) {
    for (let i = 0; i < 22; i++) {
      const s = rand() < 0.5 ? -1 : 1;
      const zr = P.z0 + 12 + rand() * (P.z1 - P.z0 - 30);
      const outer = rand() < 0.6;
      const xa = outer ? TURRET_X + TURRET_R + 5 : LG.xOutFoot + 4;
      const xb = outer ? P.xOut - 5 : TURRET_X - TURRET_R - 5;
      if (xb - xa < 6) continue;
      const x = s * (xa + rand() * (xb - xa));
      const w = 3 + rand() * 5;
      const d = 3 + rand() * 7;
      const h = 0.6 + rand() * 2.0;
      const y = platY(zr) + 0.4;
      add(
        boxMM(
          [x - w / 2, y - 0.6, Z(zr) - d / 2],
          [x + w / 2, y + h, Z(zr) + d / 2],
        ),
        rand() < 0.6 ? "hull" : "dark",
        { color: rand() < 0.6 ? GREY_FLANK : DARK, texel: 1 / 4 },
      );
    }
  }
}
