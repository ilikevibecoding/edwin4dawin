// Venator rear superstructure, matched to the reference render: the two turret shelves rising aft
// beside the red band (the heavy turrets stand on them), the light sill where the band meets the block,
// the pillar block (a plated light ramp at 48 degrees from the sill to the roof, shaded sides, a steep
// light "leg" under each shaft flaring out to the shelf so the shaft lines run down to the deck), the
// dark bridge box seen through the gap between the two slender shafts (light fronts, dark panelled
// sides) standing on the roof, the heads (light front sections overhanging far ahead of the shafts with
// a dark chin and a round pod under each, dark panelled rears with a lighter top plate, a sensor body,
// light drum and mast on top) and the steps down behind the block. Proportions from venatorSpec
// (PLATFORM / BLOCK / TOWER); only fronts and tops are light, as in the reference.
import * as THREE from "three";
import {
  loftProfile,
  yLoft,
  quadFacing,
  cylZ,
  tube,
  lin,
} from "./venatorKit.js";
import { boxMM } from "./shipKit.js";
import {
  Z,
  DECK_Y,
  SILL_Y,
  PLATFORM,
  platY,
  BLOCK,
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
  DARK_SEAM,
  WINDOW_WARM,
  WINDOW_COOL,
  ROW_WARM,
  ROW_COOL,
} from "./venatorSpec.js";

const GREY_DIM = lin(0.21, 0.21, 0.24); // the bridge box's top: a little lighter than the opening

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
    addPrism(
      loftProfile([sec(P.z0), sec(P.z1)], {
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
  const legFrontZ = (y) =>
    LG.zFoot + (LG.zTop - LG.zFoot) * ((y - yLegFoot) / (b.y1 - yLegFoot));
  for (const s of [-1, 1])
    addPrism(
      yLoft(
        [
          {
            y: yLegFoot - 0.3,
            pts: sideRect(s, LG.xInFoot, LG.xOutFoot, LG.zFoot, LG.z1),
          },
          {
            y: b.y1 + 0.2,
            pts: sideRect(s, LG.xInTop, LG.xOutTop, LG.zTop, LG.z1),
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
    // ramp face: one large light plate with sparse crisp features, as in the reference — thin seams
    // every ~28 m up the slope, the port third standing a little proud behind a seam, a lit window-row
    // frame near the top, a raised bar, a square frame with a dark centre, a few short dark slots
    const fy = (f) => b.yFoot + H * f;
    const seam = (f, x, w, h = 0.6) =>
      add(faceBox(rampFrame(fy(f), x), w, h, 0.25, 0.05), "dark", {
        color: DARK_SEAM,
        texel: 1 / 4,
      });
    const plate = (f, x, w, h, d, col = GREY_RAMP, lift = 0.05) =>
      add(faceBox(rampFrame(fy(f), x), w, h, d, lift), "hull", {
        color: col,
        texel: col === GREY_RAMP ? hullTexel : 1 / 6,
      });
    const slot = (f, x, w, h, lift = 0.9) =>
      add(faceBox(rampFrame(fy(f), x), w, h, 0.3, lift), "hull", {
        color: GREY_RECESS,
        texel: 1 / 6,
      });
    for (const f of [0.17, 0.42, 0.67, 0.88]) seam(f, 0, hxAt(fy(f)) * 2 - 4.5);
    {
      const f0 = 0.05;
      const f1 = 0.72;
      const fm = (f0 + f1) / 2;
      const xa = -6.5;
      const xb = -(hxAt(fy(fm)) - 2.6);
      plate((f0 + f1) / 2, (xa + xb) / 2, xa - xb, faceLen * (f1 - f0), 0.6);
      seam(fm, xa + 0.5, 0.5, faceLen * (f1 - f0));
    }
    plate(0.795, -9.5, 19.5, 10, 1.0, GREY_LIGHT);
    if (fine)
      for (const k of [-3, -1, 1, 3])
        slot(0.795, -9.5 + k * 2.2, 2.4, 4.6, 1.1);
    add(faceBox(rampFrame(fy(0.795), -9.5), 16, 0.9, 0.15, 1.45), "windows", {
      color: ROW_WARM,
      uv: "keep",
    });
    plate(0.635, -8, 16, 3, 1.5);
    plate(0.38, 3, 10, 15, 1.2);
    slot(0.38, 3, 6, 9, 1.15);
    if (fine) {
      slot(0.575, 0, 1.2, 8);
      slot(0.575, -4, 1.2, 8);
      slot(0.275, -1.5, 14, 3);
      slot(0.13, 4, 1.5, 5);
      slot(0.2, 4, 1.5, 5);
      add(faceBox(rampFrame(fy(0.93), -2), 12, 0.7, 0.15, 0.5), "windows", {
        color: ROW_COOL,
        uv: "keep",
      });
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
    // the block's shaded sides between the ramp edge and the leg: a lit window row and a light line
    for (const s of [-1, 1]) {
      for (const [f, col, isRow] of fine
        ? [
            [0.16, ROW_COOL, true],
            [0.3, ROW_WARM, true],
            [0.5, GREY_FLANK, false],
            [0.68, ROW_COOL, true],
            [0.84, ROW_WARM, true],
          ]
        : [[0.45, ROW_WARM, true]]) {
        const y = b.yFoot + H * f;
        const za = fz(y) + 5;
        const zb = Math.min(legFrontZ(y), b.z1) - 4;
        if (zb - za < 8) continue;
        const xf = s * (hxAt(y) + 0.3);
        if (isRow)
          add(
            quadFacing(
              [xf, y, Z((za + zb) / 2)],
              [s, 0, 0],
              [0, 1, 0],
              zb - za,
              1.3,
            ),
            "windows",
            { color: col, uv: "keep" },
          );
        else
          add(
            boxMM(
              [Math.min(xf, xf + s * 0.4), y - 0.5, Z(za)],
              [Math.max(xf, xf + s * 0.4), y + 0.5, Z(zb)],
            ),
            "hull",
            { color: col, texel: 1 / 6 },
          );
      }
      // lit window rows along the legs' dark outer sides (they run back to the block's rear)
      for (const [f, col] of fine
        ? [
            [0.3, ROW_WARM],
            [0.62, ROW_COOL],
          ]
        : [[0.45, ROW_WARM]]) {
        const y = yLegFoot + (b.y1 - yLegFoot) * f;
        const xo = LG.xOutFoot + (LG.xOutTop - LG.xOutFoot) * f;
        const za = legFrontZ(y) + 6;
        const zb = LG.z1 - 6;
        add(
          quadFacing(
            [s * (xo + 0.3), y, Z((za + zb) / 2)],
            [s, 0, 0],
            [0, 1, 0],
            (zb - za) * 0.8,
            1.2,
          ),
          "windows",
          { color: col, uv: "keep" },
        );
      }
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

  // ---- bridge box joining the shafts behind their fronts (seen through the gap): a dark opening in
  // the reference, its top a little lighter
  const br = BLOCK.bridge;
  add(boxMM([-br.hx, b.y1 - 0.2, Z(br.z0)], [br.hx, br.y1, Z(br.z1)]), "hull", {
    color: GREY_RECESS,
    texel: hullTexel,
  });
  add(
    boxMM(
      [-br.hx + 0.5, br.y1 - 0.1, Z(br.z0)],
      [br.hx - 0.5, br.y1 + 0.8, Z(br.z1)],
    ),
    "hull",
    { color: GREY_DIM, texel: 1 / 8 },
  );
  if (mid) {
    add(
      boxMM(
        [-br.hx + 2, b.y1 + 4, Z(br.z0) - 0.5],
        [br.hx - 2, br.y1 - 4, Z(br.z0) + 0.4],
      ),
      "hull",
      { color: GREY_RECESS, texel: 1 / 6 },
    );
    add(
      quadFacing(
        [0, (b.y1 + br.y1) / 2, Z(br.z0) - 0.7],
        [0, 0, -1],
        [0, 1, 0],
        br.hx * 1.4,
        1.3,
      ),
      "windows",
      { color: ROW_WARM, uv: "keep" },
    );
  }

  // ---- steps behind the block, down toward the stern (on the wing deck)
  const yDeck = DECK_Y;
  for (const st of BLOCK.steps) {
    addPrism(
      yLoft(
        [
          { y: yDeck - 0.3, pts: rect(st.hx, st.z0, st.z1) },
          { y: st.y1, pts: rect(st.hx - 2, st.z0, st.z1 - 2) },
        ],
        PRISM,
      ),
      {
        side: GREY_BLOCK,
        front: GREY_BLOCK,
        back: GREY_BLOCK,
        inner: GREY_BLOCK,
        top: GREY_HULL,
      },
    );
    if (mid) {
      const h = st.y1 - yDeck;
      add(
        boxMM(
          [-st.hx + 6, yDeck + h * 0.3, Z(st.z1) - 1.5],
          [st.hx - 6, yDeck + h * 0.7, Z(st.z1) + 0.3],
        ),
        "hull",
        { color: GREY_RECESS, texel: 1 / 8 },
      );
      add(
        quadFacing(
          [0, yDeck + h * 0.5, Z(st.z1) + 0.5],
          [0, 0, 1],
          [0, 1, 0],
          st.hx * 1.3,
          1.5,
        ),
        "windows",
        { color: ROW_WARM, uv: "keep" },
      );
    }
  }
  // block rear face: a dark recessed band with windows above the first step
  if (mid) {
    const s0 = BLOCK.steps[0];
    add(
      boxMM(
        [-b.hx1 + 4, s0.y1 + 5, Z(b.z1) - 1.5],
        [b.hx1 - 4, b.y1 - 6, Z(b.z1) + 0.3],
      ),
      "hull",
      { color: GREY_RECESS, texel: 1 / 8 },
    );
    add(
      quadFacing(
        [0, (s0.y1 + b.y1) / 2, Z(b.z1) + 0.5],
        [0, 0, 1],
        [0, 1, 0],
        b.hx1 * 1.3,
        1.6,
      ),
      "windows",
      { color: ROW_COOL, uv: "keep" },
    );
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
      add(faceBox(shaftFrame(0.9), T.hx * 1.4, 0.9, 0.15, 0.2), "windows", {
        color: WINDOW_WARM,
        uv: "keep",
      });
      // dark sides (outer and inner): lit window rows and a light panel line
      for (const sx of [-1, 1]) {
        const xf = cx + sx * T.hx;
        for (const f of fine ? [0.3, 0.7] : [0.5]) {
          const y = T.y0 + shaftH * f;
          add(
            quadFacing(
              [xf + sx * 0.15, y, Z(T.zFront + T.lean * f + T.depth * 0.5)],
              [sx, 0, 0],
              [0, 1, 0],
              T.depth * 0.62,
              1.0,
            ),
            "windows",
            { color: f === 0.3 ? ROW_WARM : ROW_COOL, uv: "keep" },
          );
        }
        if (fine) {
          const y = T.y0 + shaftH * 0.5;
          add(
            boxMM(
              [Math.min(xf, xf + sx * 0.4), y - 0.5, Z(T.zFront + 5)],
              [Math.max(xf, xf + sx * 0.4), y + 0.5, Z(T.zFront + T.depth - 5)],
            ),
            "hull",
            { color: GREY_FLANK, texel: 1 / 6 },
          );
        }
      }
    }

    // ---- head: the dark panelled rear slab on the shaft top with a lighter top plate; the front
    // section overhanging far forward: a wide light upper slab (the T's top) over a dark window slot,
    // below it only the outboard jaw is light (with a dark chin), inboard a dark block carries the round
    // pod hanging under the slab; then the sensor body with its light drum and the mast on top
    const xlo = Math.min(s * (T.headX - T.headHx), s * (T.headX + T.headHx));
    const xhi = Math.max(s * (T.headX - T.headHx), s * (T.headX + T.headHx));
    const xIn = s > 0 ? xlo : xhi; // inboard edge
    const xOut = s > 0 ? xhi : xlo; // outboard edge
    const zf0 = Z(T.frontZ0);
    const zf1 = Z(T.frontZ1);
    const z1 = Z(T.headZ1);
    const yChin = T.headY0 + T.chin;
    const yVis = T.visorY0;
    add(boxMM([xlo, T.headY0, zf1 - 0.5], [xhi, T.headY1 - 0.8, z1]), "hull", {
      color: GREY_SIDE,
      texel: hullTexel,
    });
    add(
      boxMM(
        [xlo + 0.6, T.headY1 - 0.9, zf1 - 0.5],
        [xhi - 0.6, T.headY1, z1 - 0.6],
      ),
      "hull",
      { color: GREY_FLANK, texel: 1 / 8 },
    );
    // upper slab, full width
    add(boxMM([xlo, yVis, zf0], [xhi, T.headY1, zf1]), "hull", {
      color: GREY_LIGHT,
      texel: 1 / 8,
    });
    // outboard jaw under it, set forward a little, with the dark chin along its bottom
    const jawIn = xOut - s * T.jawW;
    add(
      boxMM(
        [Math.min(xOut, jawIn), yChin, zf0 - 1],
        [Math.max(xOut, jawIn), yVis - 1.6, zf1],
      ),
      "hull",
      { color: GREY_LIGHT, texel: 1 / 8 },
    );
    add(
      boxMM(
        [Math.min(xOut, jawIn) + 0.3, T.headY0, zf0 + 1],
        [Math.max(xOut, jawIn) - 0.3, yChin + 0.1, zf1],
      ),
      "hull",
      { color: GREY_RECESS, texel: 1 / 8 },
    );
    // the dark window slot between the jaw and the slab, recessed, wrapping onto the outboard side
    add(
      boxMM([xlo + 0.3, yVis - 1.7, zf0 + 0.6], [xhi - 0.3, yVis + 0.1, zf1]),
      "hull",
      { color: GREY_RECESS, texel: 1 / 6 },
    );
    // inboard dark recess under the slab carrying the pod
    const podX = s * T.podX;
    add(
      boxMM(
        [Math.min(xIn + s * 1, podX + T.podR * 0.8), T.podY, zf0 + 4],
        [Math.max(xIn + s * 1, podX + T.podR * 0.8), yVis - 1.5, zf1],
      ),
      "hull",
      { color: GREY_RECESS, texel: 1 / 8 },
    );
    // pod: a forward-facing can with a dark mouth
    const seg = fine ? 16 : mid ? 10 : 8;
    const pc = [podX, T.podY, Z(T.podZ0) + T.podLen / 2];
    add(cylZ(T.podR, T.podR, T.podLen, seg).translate(...pc), "hull", {
      color: GREY_LIGHT,
      texel: 1 / 6,
    });
    add(
      cylZ(T.podR * 0.7, T.podR * 0.7, 1.2, seg).translate(
        pc[0],
        pc[1],
        Z(T.podZ0) - 0.4,
      ),
      "dark",
      { color: DARK, texel: 1 / 3 },
    );
    if (mid) {
      add(
        quadFacing(
          [(xlo + xhi) / 2, yVis - 0.8, zf0 + 0.4],
          [0, 0, -1],
          [0, 1, 0],
          xhi - xlo - 3,
          0.9,
        ),
        "windows",
        { color: WINDOW_WARM, uv: "keep" },
      );
      // outboard side of the jaw / slab: a lit row; the dark rear's sides: lit rows and a light line
      add(
        quadFacing(
          [xOut + s * 0.4, yVis - 0.8, (zf0 + zf1) / 2],
          [s, 0, 0],
          [0, 1, 0],
          T.frontZ1 - T.frontZ0 - 6,
          0.9,
        ),
        "windows",
        { color: WINDOW_COOL, uv: "keep" },
      );
      for (const sx of [-1, 1]) {
        const xf = sx > 0 ? xhi : xlo;
        for (const [dy, col] of fine
          ? [
              [7, ROW_WARM],
              [16, ROW_COOL],
            ]
          : [[12, ROW_WARM]])
          add(
            quadFacing(
              [xf + sx * 0.3, T.headY0 + dy, (zf1 + z1) / 2],
              [sx, 0, 0],
              [0, 1, 0],
              (T.headZ1 - T.frontZ1) * 0.7,
              1.0,
            ),
            "windows",
            { color: col, uv: "keep" },
          );
        if (fine)
          add(
            boxMM(
              [Math.min(xf, xf + sx * 0.4), T.headY0 + 11.5, zf1 + 4],
              [Math.max(xf, xf + sx * 0.4), T.headY0 + 12.5, z1 - 4],
            ),
            "hull",
            { color: GREY_FLANK, texel: 1 / 6 },
          );
      }
    }
    // sensor body on the head: dark box, light top plate and drum, mast + light
    const se = T.sensor;
    const scx = s * T.headX;
    add(
      boxMM(
        [scx - se.hx, T.headY1 - 0.5, Z(se.z0)],
        [scx + se.hx, se.y1, Z(se.z1)],
      ),
      "hull",
      { color: GREY_SIDE, texel: hullTexel },
    );
    add(
      boxMM(
        [scx - se.hx - 0.5, se.y1 - 0.1, Z(se.z0) - 0.5],
        [scx + se.hx + 0.5, se.y1 + 0.8, Z(se.z1) + 0.5],
      ),
      "hull",
      { color: GREY_LIGHT, texel: 1 / 8 },
    );
    add(
      new THREE.CylinderGeometry(
        T.drumR,
        T.drumR,
        T.drumY1 - se.y1 - 0.8,
        seg,
      ).translate(scx, (se.y1 + 0.8 + T.drumY1) / 2, Z(se.z0 + 12)),
      "hull",
      { color: GREY_LIGHT, texel: 1 / 6 },
    );
    if (mid) {
      for (const sx of [-1, 1])
        add(
          quadFacing(
            [
              scx + sx * (se.hx + 0.3),
              (T.headY1 + se.y1) / 2,
              Z((se.z0 + se.z1) / 2),
            ],
            [sx, 0, 0],
            [0, 1, 0],
            (se.z1 - se.z0) * 0.6,
            1.0,
          ),
          "windows",
          { color: ROW_COOL, uv: "keep" },
        );
      for (const dz of [8, 14])
        add(
          boxMM(
            [scx - se.hx - 3, T.headY1, Z(se.z1 + dz)],
            [scx + se.hx + 3, T.headY1 + 3.5, Z(se.z1 + dz + 3)],
          ),
          "dark",
          { color: DARK, texel: 1 / 3 },
        );
      const mx = scx + s * 3;
      const mz = Z(se.z1 - 8);
      add(
        tube([mx, se.y1 + 0.8, mz], [mx, T.mastY1 - 1.5, mz], 0.6, 6),
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
