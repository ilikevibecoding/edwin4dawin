// Surface detail for the Arquitens (LOD 0, a subset at LOD 1): bevelled deck plates with panel-line
// grooves, the raised deck rails with red bands and the Republic chevrons, recessed broadside gun bays
// and window rows on the flank walls, belly machinery with red chine stripes, prong-tip markings,
// forward tubes beside the nose block, wing plates and block greebles. Everything takes the build
// context { add, rand, fine, mid, texel, mainSecs, prongSecs } from arquitens.js; heights are on the
// ledge datum (the assembler shifts by Y0).
import * as THREE from "three";
import {
  loftProfile,
  loftFrame,
  framePlate,
  groove,
  quadFacing,
  tube,
  cylZ,
  jitterColor,
  mulColor,
  mixColor,
  lin,
  pw,
  facetedDome,
} from "./venatorKit.js";
import {
  Z,
  SLOT_X,
  SPINE_X,
  RIDGE_X,
  RIDGE_H,
  GROOVE_W,
  wOut,
  wallX,
  wallTop,
  deckC,
  spineUp,
  keel,
  keelP,
  TRENCH,
  floorY,
  BLOCK,
  blockHalfW,
  blockTop,
  RAIL,
  railH,
  HEAD,
  WING,
  PAL,
} from "./arquitensSpec.js";
import { chamfer, mbox, wing } from "./arquitensGeo.js";

const PLATE_TEXEL = 1 / 14;

// x of the flank wall surface at height y (the wall leans in 0.5 m over its height)
const wallXAt = (zr, y) =>
  wallX(zr) -
  (0.5 * Math.max(0, y)) / Math.max(1, wallTop(zr) - chamfer(zr) * 0.8);

// deck rail at zr: outer foot x, deck height under it, height and crest level
export function railAt(zr) {
  const xe = pw(RAIL.xOut, zr);
  const y = deckHeightAt(zr, xe - RAIL.foot / 2) - 0.3;
  const h = railH(zr) + 0.3;
  return { xe, y, h, yTop: y + h };
}
// trapezoid cross section of the rail (starboard for s = 1), sunk 0.3 m into the deck
function railSection(zr, s) {
  const { xe, y, h } = railAt(zr);
  const lip = (RAIL.foot - RAIL.crest) / 2;
  return {
    z: Z(zr),
    pts: [
      [s * (xe - RAIL.foot), y],
      [s * xe, y],
      [s * (xe - lip), y + h],
      [s * (xe - RAIL.foot + lip), y + h],
    ],
  };
}

// -------------------------------------------------------------------------------------------------
// deck: plates, grooves, rails with red bands, chevrons
// -------------------------------------------------------------------------------------------------
export function deckDetail(ctx) {
  const { add, rand, fine, mid, mainSecs, prongSecs } = ctx;
  const plateTint = (base) => {
    let c = jitterColor(rand, base, 0.07, 0.02);
    if (rand() < 0.12) c = mixColor(c, lin(0.86, 0.84, 0.8), 0.35);
    return c;
  };
  const plateOn = (secs, j, t, zr, w, d, color, h = 0.45) => {
    const fr = loftFrame(secs, j, t, Z(zr));
    if (fr.n.y < 0) fr.n.negate();
    add(
      framePlate(fr, w, d, h, 0.5, { texel: PLATE_TEXEL, sink: 0.25 }),
      "hull",
      { color, uv: "keep" },
    );
  };
  const grooveOn = (secs, j, t, zr, w, len, du = 0) => {
    const fr = loftFrame(secs, j, t, Z(zr));
    if (fr.n.y < 0) fr.n.negate();
    add(groove(fr, w, len, { du }), "dark", { color: PAL.seam, texel: 1 / 4 });
  };
  if (fine) {
    // main deck: one or two big bevelled plates across per bay (the show's panels are 15–25 m),
    // bays ~22 m long with a groove between them
    for (const s of [-1, 1]) {
      const j = s > 0 ? 6 : 16;
      for (let zr = 110; zr < 226; zr += 22) {
        const zc = Math.min(zr + 10.5, 224);
        const wDeck = wallX(zc) - chamfer(zc) - (SPINE_X + GROOVE_W) - 7;
        if (wDeck < 8) continue;
        const n = wDeck > 30 ? 3 : 2;
        const xEdge = wallX(zc) - chamfer(zc);
        const xIn = SPINE_X + GROOVE_W;
        const { xe } = railAt(zc);
        for (let k = 0; k < n; k++) {
          // t runs from the chamfer (0) to the groove (1) on starboard, reversed on port; skip
          // plates that would cut through the rail
          let t = 0.08 + (0.84 * (k + 0.5)) / n;
          const xc = xEdge - t * (xEdge - xIn);
          const w = ((xEdge - xIn) / n) * (0.72 + rand() * 0.14);
          if (xc + w / 2 > xe - RAIL.foot - 0.6 && xc - w / 2 < xe + 0.6)
            continue;
          if (s < 0) t = 1 - t;
          if (rand() < 0.12) continue;
          plateOn(mainSecs, j, t, zc, w, 14 + rand() * 5, plateTint(PAL.deck));
        }
        grooveOn(mainSecs, j, s > 0 ? 0.6 : 0.4, zr, wDeck * 0.8, 0.5);
      }
      // a long groove along the deck at 55 % of the width
      for (let zr = 112; zr < 215; zr += 30) {
        const zc = Math.min(zr + 15, 224);
        grooveOn(
          mainSecs,
          j,
          s > 0 ? 0.55 : 0.45,
          zc,
          0.45,
          Math.min(30, 2 * (224 - zc) + 2),
        );
      }
    }
    // prong tops: plates in a single row, grooves across
    for (const s of [-1, 1]) {
      const secs = prongSecs[s];
      for (let zr = 12; zr < 100; zr += 16) {
        const zc = zr + 7.5;
        const wTop = wallX(zc) - chamfer(zc) - SLOT_X;
        if (wTop < 5) continue;
        if (rand() < 0.2) continue;
        plateOn(
          secs,
          6,
          0.5,
          zc,
          wTop * 0.7,
          11 + rand() * 3,
          plateTint(PAL.deck),
          0.4,
        );
        grooveOn(secs, 6, 0.5, zr, wTop * 0.9, 0.45);
      }
    }
  }
  // raised deck rails (zr 112–230): straight trapezoid ridges from the shoulders into the block's
  // flanks, light crest with red sloped flanks, taller aft; a blunt light nose cap at the forward end
  for (const s of [-1, 1]) {
    const secs = [RAIL.z0, 140, 170, 190, 205, 218, RAIL.z1].map((zr) =>
      railSection(zr, s),
    );
    const rail = loftProfile(secs, {
      tags: ["hull", "trim", "hull", "trim"],
      capTag: "hull",
      uv: 1 / 6,
    });
    add(rail.hull, "hull", { color: mulColor(PAL.deck, 0.96), uv: "keep" });
    add(rail.trim, "paint", { color: PAL.red, texel: 1 / 8 });
    if (fine) {
      // dark hatches along the crest and a groove along the crest's centreline
      const lip = (RAIL.foot - RAIL.crest) / 2;
      for (const zr of [128, 158, 188]) {
        const { xe, yTop } = railAt(zr);
        add(
          mbox(
            s,
            xe - RAIL.foot + lip + 0.4,
            xe - lip - 0.4,
            yTop,
            yTop + 0.3,
            zr - 2,
            zr + 2,
          ),
          "dark",
          { color: PAL.dark, texel: 1 / 3 },
        );
      }
    }
  }
  // dark hatches along the spine's ridge and a machinery cluster where it meets the block
  if (fine) {
    for (const zr of [140, 162, 184]) {
      const yTop = deckC(zr) + spineUp(zr) + RIDGE_H;
      add(
        mbox(
          1,
          -RIDGE_X + 0.6,
          RIDGE_X - 0.6,
          yTop,
          yTop + 0.35,
          zr - 2.5,
          zr + 2.5,
        ),
        "dark",
        {
          color: PAL.dark,
          texel: 1 / 3,
        },
      );
    }
  }
}

// deck height at (x, zr): the pyramid slope between the wall chamfer and the spine groove
export function deckHeightAt(zr, x) {
  const xa = Math.abs(x);
  const xEdge = wallX(zr) - chamfer(zr);
  const xIn = SPINE_X + GROOVE_W;
  const T = wallTop(zr);
  const Dc = deckC(zr);
  if (xa >= xEdge) return T;
  if (xa <= xIn) return Dc;
  return T + ((Dc - T) * (xEdge - xa)) / Math.max(1, xEdge - xIn);
}

// -------------------------------------------------------------------------------------------------
// flank walls: recessed broadside bays, window rows, panel grooves
// -------------------------------------------------------------------------------------------------
export function wallDetail(ctx, bayZ) {
  const { add, fine, mid, rand } = ctx;
  for (const s of [-1, 1]) {
    // gun bays: a dark recess with a lighter frame and twin barrels reaching out of the wall
    for (const zr of bayZ) {
      const T = wallTop(zr);
      const yc = T * 0.52;
      const xw = wallXAt(zr, yc);
      const h = Math.min(6, T * 0.6);
      const hl = 6.2;
      add(
        mbox(s, xw - 0.5, xw + 0.14, yc - h / 2, yc + h / 2, zr - hl, zr + hl),
        "dark",
        {
          color: PAL.recess,
          texel: 1 / 4,
        },
      );
      if (mid) {
        // raised frame round the bay (sill and lintel plus end posts)
        for (const [y0, y1] of [
          [yc + h / 2, yc + h / 2 + 0.8],
          [yc - h / 2 - 0.8, yc - h / 2],
        ])
          add(
            mbox(s, xw, xw + 0.6, y0, y1, zr - hl - 0.7, zr + hl + 0.7),
            "hull",
            {
              color: PAL.wall,
              texel: 1 / 4,
            },
          );
        for (const dz of [-hl - 0.7, hl])
          add(
            mbox(
              s,
              xw,
              xw + 0.6,
              yc - h / 2,
              yc + h / 2,
              zr + dz,
              zr + dz + 0.7,
            ),
            "hull",
            { color: PAL.wall, texel: 1 / 4 },
          );
        // twin turbolaser on a trunnion block inside the bay, barrels reaching well out of the wall
        for (const dz of [-1.5, 1.5]) {
          const g = new THREE.CylinderGeometry(0.5, 0.62, 10, 6);
          g.rotateZ(Math.PI / 2);
          g.translate(s * (xw + 4.2), yc + 0.2, Z(zr + dz));
          add(g, "dark", { color: PAL.dark, texel: 1 / 3 });
          const collar = new THREE.CylinderGeometry(0.9, 0.9, 2.2, 6);
          collar.rotateZ(Math.PI / 2);
          collar.translate(s * (xw + 1.6), yc + 0.2, Z(zr + dz));
          add(collar, "dark", { color: PAL.dark, texel: 1 / 3 });
        }
        const mant = mbox(
          s,
          xw - 0.3,
          xw + 1.2,
          yc - 1.6,
          yc + 1.8,
          zr - 2.8,
          zr + 2.8,
        );
        add(mant, "dark", { color: PAL.dark, texel: 1 / 3 });
      }
    }
    if (!fine) continue;
    // window rows between the bays: two rows of small lit panes
    for (let zr = 14; zr < 226; zr += 5.5) {
      if (bayZ.some((b) => Math.abs(zr - b) < 9.5)) continue;
      const T = wallTop(zr);
      if (T < 6) continue;
      for (const f of [0.7, 0.4]) {
        if (rand() < 0.3) continue;
        const y = T * f;
        add(
          quadFacing(
            [s * (wallXAt(zr, y) + 0.1), y, Z(zr)],
            [s, 0, 0],
            [0, 1, 0],
            1.3,
            0.7,
          ),
          "windows",
          { color: rand() < 0.7 ? PAL.rowWarm : PAL.windowCool },
        );
      }
    }
    // vertical panel grooves on the wall every ~11 m and a horizontal groove at 30 % height
    for (let zr = 20; zr < 228; zr += 11) {
      if (bayZ.some((b) => Math.abs(zr - b) < 8)) continue;
      const T = wallTop(zr);
      const yc = T * 0.5;
      add(
        mbox(
          s,
          wallXAt(zr, yc) - 0.1,
          wallXAt(zr, yc) + 0.06,
          0.6,
          T - chamfer(zr) - 0.6,
          zr - 0.22,
          zr + 0.22,
        ),
        "dark",
        {
          color: PAL.seam,
          texel: 1 / 3,
        },
      );
    }
    for (const [z0, z1] of [
      [12, 104],
      [110, 226],
    ]) {
      const zc = (z0 + z1) / 2;
      const y0 = wallTop(z0) * 0.28;
      const y1 = wallTop(z1) * 0.28;
      const g = new THREE.BoxGeometry(0.16, 0.36, z1 - z0);
      g.rotateX(-Math.atan2(y1 - y0, z1 - z0));
      g.translate(
        s * (wallXAt(zc, (y0 + y1) / 2) + 0.04),
        (y0 + y1) / 2,
        Z(zc),
      );
      add(g, "dark", { color: PAL.seam, texel: 1 / 3 });
    }
  }
}

// -------------------------------------------------------------------------------------------------
// belly: keel ridge, machinery panels, red chine stripes, hatches, ventral turret pads
// -------------------------------------------------------------------------------------------------
export function bellyDetail(ctx) {
  const { add, fine, mid, rand } = ctx;
  // belly surface height at (x, zr): the V between the keel and the chine
  const bellyY = (zr, x) => {
    const W = wOut(zr);
    const K = zr < 105 ? keelP(zr) : keel(zr);
    const xa = Math.abs(x);
    const xc = 0.6 * W;
    if (xa >= xc)
      return -0.42 * K + ((xa - xc) / Math.max(1, W - xc)) * (0.42 * K - 3);
    return -K + (xa / xc) * (K - 0.42 * K);
  };
  if (mid) {
    // keel ridge along the centreline of the main hull
    for (const [z0, z1] of [
      [110, 175],
      [175, 240],
    ]) {
      const zc = (z0 + z1) / 2;
      const y0 = -keel(z0);
      const y1 = -keel(z1);
      const g = new THREE.BoxGeometry(5, 2.4, z1 - z0);
      g.rotateX(-Math.atan2(y1 - y0, z1 - z0));
      g.translate(0, (y0 + y1) / 2 - 0.6, Z(zc));
      add(g, "dark", { color: PAL.dark, texel: 1 / 5 });
    }
    // red stripes along the chine (both sides), broken into segments that follow the plan
    for (const s of [-1, 1])
      for (const [z0, z1] of [
        [66, 100],
        [108, 182],
        [190, 228],
      ]) {
        const zc = (z0 + z1) / 2;
        const x0 = 0.6 * wOut(z0) + 3;
        const x1 = 0.6 * wOut(z1) + 3;
        const xc = (x0 + x1) / 2;
        const ang = Math.atan2(x1 - x0, z1 - z0);
        const len = Math.hypot(x1 - x0, z1 - z0);
        const y0 = bellyY(z0, x0);
        const y1 = bellyY(z1, x1);
        const g = new THREE.BoxGeometry(5, 0.2, len);
        // lie on the belly: tilt across the V, pitch along the keel's fall, then swing to the plan
        g.rotateZ(
          s * Math.atan2(bellyY(zc, xc + 1.5) - bellyY(zc, xc - 1.5), 3),
        );
        g.rotateX(-Math.atan2(y1 - y0, len));
        g.rotateY(ang * s);
        g.translate(s * xc, (y0 + y1) / 2 - 0.1, Z(zc));
        add(g, "paint", { color: PAL.red, texel: 1 / 8 });
      }
  }
  if (!fine) return;
  // machinery panels: dark boxes proud of the belly in a loose grid
  for (let zr = 70; zr < 240; zr += 9 + rand() * 6) {
    for (const s of [-1, 1]) {
      const W = wOut(zr);
      const x = s * (6 + rand() * (0.55 * W - 8));
      const w = 3 + rand() * 6;
      const d = 4 + rand() * 7;
      const y = bellyY(zr, x);
      const g = new THREE.BoxGeometry(w, 0.7, d);
      // tilt to the belly slope (tangent along +x)
      g.rotateZ(Math.atan2(bellyY(zr, x + 2) - bellyY(zr, x - 2), 4));
      g.translate(x, y - 0.25, Z(zr));
      add(g, rand() < 0.7 ? "dark" : "hull", {
        color: rand() < 0.7 ? PAL.dark : mulColor(PAL.belly, 1.12),
        texel: 1 / 4,
      });
    }
  }
  // ventral aft dome (the round feature under the aft hull) and a pair of intake vents
  add(
    facetedDome(5, 3, 8, 3)
      .rotateX(Math.PI)
      .translate(0, -keel(236) + 0.3, Z(236)),
    "hull",
    { color: mulColor(PAL.belly, 1.1), texel: 1 / 4 },
  );
  for (const s of [-1, 1])
    add(
      mbox(s, 8, 16, -keel(250) + 1.2 - 1, -keel(250) + 1.2, 246, 262),
      "dark",
      {
        color: PAL.recess,
        texel: 1 / 4,
      },
    );
}

// -------------------------------------------------------------------------------------------------
// prong tips: yellow marks and lit windows on the blunt end faces, twin antenna spikes
// -------------------------------------------------------------------------------------------------
export function tipDetail(ctx) {
  const { add, fine, mid } = ctx;
  for (const s of [-1, 1]) {
    const xo = wOut(1.5);
    const xc = s * ((SLOT_X + xo) / 2);
    const T = wallTop(1.5);
    const K = keelP(1.5);
    const zf = Z(1.5) - 0.08;
    if (mid) {
      add(
        quadFacing(
          [xc, T - 1.3, zf],
          [0, 0, -1],
          [0, 1, 0],
          xo - SLOT_X - 1.6,
          0.5,
        ),
        "paint",
        {
          color: PAL.yellow,
        },
      );
      add(
        quadFacing(
          [xc, -K + 1.4, zf],
          [0, 0, -1],
          [0, 1, 0],
          xo - SLOT_X - 1.6,
          0.5,
        ),
        "paint",
        {
          color: PAL.yellow,
        },
      );
    }
    if (fine) {
      for (const y of [T - 3.2, (T - K) / 2])
        add(
          quadFacing([xc, y, zf], [0, 0, -1], [0, 1, 0], 2.2, 0.9),
          "windows",
          {
            color: PAL.windowWarm,
          },
        );
      // antenna spikes on the outer top edge of each prong near the tip
      for (const zr of [40, 46]) {
        const x = s * (wallX(zr) - chamfer(zr) - 1.2);
        add(
          tube([x, wallTop(zr), Z(zr)], [x, wallTop(zr) + 7, Z(zr)], 0.16, 5),
          "dark",
          {
            color: PAL.dark,
          },
        );
      }
      // paired sensor spikes reaching forward from the tip face: a long one low and inboard, a
      // shorter one high and outboard, each on a small dark boss
      for (const [xf, yf, len] of [
        [SLOT_X + 2.4, -K + 2.6, 6.5],
        [xo - 2.6, T - 2.4, 4.5],
      ]) {
        const x = s * xf;
        add(
          new THREE.BoxGeometry(1.1, 1.1, 0.9).translate(x, yf, zf - 0.35),
          "dark",
          { color: PAL.dark, texel: 1 / 3 },
        );
        add(tube([x, yf, zf], [x, yf, zf - len], 0.14, 4), "dark", {
          color: PAL.dark,
        });
      }
    }
  }
}

// -------------------------------------------------------------------------------------------------
// wedge and trench: the red arrowhead at the spine's head, forward tubes, trench-floor machinery
// -------------------------------------------------------------------------------------------------
// forward ordnance tubes: two pairs of fat launch tubes lying on the deck either side of the wedge
export const TUBES = {
  x: 10.8,
  dx: 2.7,
  r: 1.25,
  y: deckC(112) + 1.6,
  z0: 96,
  z1: 120,
};
export function noseDetail(ctx) {
  const { add, fine, mid, addZones, loft } = ctx;
  if (!mid) return;
  // the spine's terminus: a bold red arrowhead wedge rising 4.6 m above the deck at the head of the
  // trench (the show's red block), lofted from a point at the deck's apex out past the spine's width
  // and back into the spine's flanks
  const wedge = [
    [100, 0.5, 0.8],
    [106, 4.2, 2.8],
    [114, 7.6, 4.6],
    [124, 8.2, 4.6],
    [131, 7.6, 3.8],
  ].map(([zr, hw, up]) => {
    const base = deckC(zr) - 0.4;
    const top = deckC(zr) + up;
    const ch = Math.min(1.2, hw * 0.3);
    return {
      z: Z(zr),
      pts: [
        [-hw, base],
        [hw, base],
        [hw, top - ch],
        [hw - ch, top],
        [-(hw - ch), top],
        [-hw, top - ch],
      ],
    };
  });
  addZones(
    loft(wedge, ["trim", "trim", "trim", "block", "trim", "trim"], "trim"),
    1 / 8,
  );
  if (fine) {
    // panel seams across the wedge's top and a dark sensor slit on its front slope
    for (const zr of [112, 120])
      add(
        mbox(
          1,
          -6.2,
          6.2,
          deckC(zr) + 4.6,
          deckC(zr) + 4.75,
          zr - 0.2,
          zr + 0.2,
        ),
        "dark",
        {
          color: PAL.seam,
          texel: 1 / 3,
        },
      );
    add(
      mbox(1, -2.2, 2.2, deckC(106) + 1.6, deckC(106) + 2.3, 105.6, 106.4),
      "dark",
      {
        color: PAL.recess,
        texel: 1 / 3,
      },
    );
  }
  for (const s of [-1, 1]) {
    // twin fat tubes on a low housing on the deck beside the wedge, muzzles reaching forward over the
    // crotch to the head of the trench
    for (const dx of [0, TUBES.dx]) {
      const x = s * (TUBES.x + dx);
      add(
        cylZ(
          TUBES.r,
          TUBES.r * 1.06,
          TUBES.z1 - TUBES.z0,
          fine ? 10 : 8,
        ).translate(x, TUBES.y, Z((TUBES.z0 + TUBES.z1) / 2)),
        "dark",
        { color: PAL.dark, texel: 1 / 3 },
      );
      // muzzle ring and a dark bore
      if (fine) {
        add(
          cylZ(TUBES.r * 1.12, TUBES.r * 1.12, 1.2, 10).translate(
            x,
            TUBES.y,
            Z(TUBES.z0 + 0.6),
          ),
          "hull",
          { color: PAL.ledge, texel: 1 / 3 },
        );
        add(
          new THREE.CircleGeometry(TUBES.r * 0.8, 10)
            .rotateY(Math.PI)
            .translate(x, TUBES.y, Z(TUBES.z0) - 0.05),
          "dark",
          { color: PAL.recess, texel: 1 / 3 },
        );
      }
    }
    add(
      mbox(
        s,
        TUBES.x - TUBES.r - 0.4,
        TUBES.x + TUBES.dx + TUBES.r + 0.4,
        deckHeightAt(112, TUBES.x) - 0.3,
        TUBES.y + 0.2,
        104,
        TUBES.z1 + 1,
      ),
      "hull",
      { color: PAL.wall, texel: 1 / 4 },
    );
  }
  if (!fine) return;
  // trench floor: dark machinery blocks and a pipe run along the floor between the prongs' inner walls
  for (const zr of [24, 42, 60, 78]) {
    const y = floorY(zr);
    add(mbox(1, -3.2, 3.2, y, y + 0.9, zr - 2.2, zr + 2.2), "dark", {
      color: PAL.dark,
      texel: 1 / 3,
    });
  }
  for (const s of [-1, 1]) {
    const z0 = TRENCH.z0 + 4;
    const z1 = TRENCH.rampZ0 - 2;
    add(
      tube(
        [s * 3.6, floorY(z0) + 0.5, Z(z0)],
        [s * 3.6, floorY(z1) + 0.5, Z(z1)],
        0.3,
        6,
      ),
      "dark",
      { color: PAL.dark },
    );
  }
}

// -------------------------------------------------------------------------------------------------
// aft wings: top plates and a red band along the swept leading edge
// -------------------------------------------------------------------------------------------------
export function wingDetail(ctx) {
  const { add, mid, fine } = ctx;
  const yTop = WING.y1;
  for (const s of [-1, 1]) {
    if (mid)
      add(wing(s, 0.12, yTop, yTop + 0.5), "hull", {
        color: PAL.deck,
        texel: 1 / 6,
      });
    // leading-edge stripe: a thin box along the swept edge
    const [a, b] = [WING.pts[1], WING.pts[2]];
    const ang = Math.atan2(b[0] - a[0], b[1] - a[1]);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const g = new THREE.BoxGeometry(2.6, 0.2, len - 3);
    g.translate(-1.5 * s, 0, 0);
    g.rotateY(ang * s);
    g.translate((s * (a[0] + b[0])) / 2, yTop + 0.6, Z((a[1] + b[1]) / 2));
    add(g, "paint", { color: PAL.red, texel: 1 / 8 });
    if (fine) {
      // Republic chevrons across the strut's top near the nacelle, machinery on its underside
      for (let k = 0; k < 3; k++) {
        const zr = 264 + k * 3.6;
        add(
          mbox(s, 30 + k * 3, 48, yTop + 0.5, yTop + 0.68, zr, zr + 1.8),
          "paint",
          {
            color: k % 2 ? lin(0.86, 0.85, 0.82) : PAL.red,
            texel: 1 / 8,
          },
        );
      }
      add(mbox(s, 24, 40, WING.y0 - 0.8, WING.y0, 258, 274), "dark", {
        color: PAL.dark,
        texel: 1 / 4,
      });
    }
  }
}

// -------------------------------------------------------------------------------------------------
// superstructure block and ramp: hatches, vents, side stripes, greebles behind the bridge
// -------------------------------------------------------------------------------------------------
export function blockDetail(ctx) {
  const { add, fine, mid, rand } = ctx;
  const rampSlope = Math.atan2(
    blockTop(BLOCK.crestZ) - blockTop(272),
    272 - BLOCK.crestZ,
  );
  for (const s of [-1, 1]) {
    // red band along the block's top chamfer: under the head and down the ramp
    for (const [z0, z1] of [
      [201, 214],
      [223, 268],
    ]) {
      const zc = (z0 + z1) / 2;
      const bx0 = blockHalfW(z0) - 1.2;
      const bx1 = blockHalfW(z1) - 1.2;
      const t0 = blockTop(z0);
      const t1 = blockTop(z1);
      const len = Math.hypot(z1 - z0, t1 - t0);
      const g = new THREE.BoxGeometry(2, 0.18, len - 1);
      g.rotateX(-Math.atan2(t1 - t0, z1 - z0));
      g.rotateY(Math.atan2(bx1 - bx0, z1 - z0) * s);
      g.translate(s * ((bx0 + bx1) / 2 - 0.4), (t0 + t1) / 2 + 0.12, Z(zc));
      add(g, "paint", { color: PAL.red, texel: 1 / 8 });
    }
    // Republic chevrons: alternating red/white bands across the flat corner decks outboard of the
    // ramp block's flanks at the kite's aft corners
    if (mid) {
      for (let k = 0; k < 5; k++) {
        const z0 = 226 + k * 3.3;
        const z1 = z0 + 2.5;
        const zc = (z0 + z1) / 2;
        const x0 = blockHalfW(zc) + 0.3;
        const x1 = wallX(zc) - chamfer(zc) - 0.3;
        if (x1 - x0 < 2) continue;
        const y = zc < 232 ? deckHeightAt(zc, (x0 + x1) / 2) : wallTop(zc);
        add(mbox(s, x0, x1, y + 0.03, y + 0.22, z0, z1), "paint", {
          color: k % 2 ? lin(0.86, 0.85, 0.82) : PAL.red,
          texel: 1 / 8,
        });
      }
    }
    // docking ring on each flank of the ramp block behind the bridge (the show's side docking ports)
    if (mid) {
      const zr = 229;
      const bx = blockHalfW(zr);
      const y = blockTop(zr) - 4.6;
      const ring = new THREE.CylinderGeometry(2.4, 2.4, 0.9, 12);
      ring.rotateZ(Math.PI / 2);
      ring.translate(s * (bx + 0.35), y, Z(zr));
      add(ring, "hull", { color: PAL.ledge, texel: 1 / 3 });
      const port = new THREE.CylinderGeometry(1.6, 1.6, 1.1, 12);
      port.rotateZ(Math.PI / 2);
      port.translate(s * (bx + 0.35), y, Z(zr));
      add(port, "dark", { color: PAL.recess, texel: 1 / 3 });
    }
    if (!fine) continue;
    // vents on the ramp's flanks, hatches on the ramp
    for (const zr of [237, 245, 253]) {
      const bx = blockHalfW(zr);
      const t = blockTop(zr);
      add(
        mbox(s, bx + 0.05, bx + 0.3, t - 5.5, t - 2.4, zr - 2.4, zr + 2.4),
        "dark",
        {
          color: PAL.recess,
          texel: 1 / 3,
        },
      );
    }
    for (let zr = 238; zr < 268; zr += 9) {
      const x = s * (3 + rand() * (blockHalfW(zr) - 7));
      const t = blockTop(zr);
      const g = new THREE.BoxGeometry(3 + rand() * 2, 0.5, 4);
      g.rotateX(rampSlope);
      g.translate(x, t + 0.1, Z(zr));
      add(g, "dark", { color: PAL.dark, texel: 1 / 3 });
    }
  }
  if (!mid) return;
  // machinery cluster on the ramp crest behind the head and a dish
  const tc = blockTop(224);
  add(mbox(1, -5, 5, tc, tc + 1.6, 221, 228), "dark", {
    color: PAL.dark,
    texel: 1 / 3,
  });
  if (fine) {
    add(facetedDome(1.8, 1.4, 8, 2).translate(5.5, tc, Z(225)), "hull", {
      color: PAL.block,
      texel: 1 / 3,
    });
    add(tube([-5, tc + 1.6, Z(224)], [-5, tc + 6, Z(224)], 0.18, 5), "dark", {
      color: PAL.dark,
    });
  }
}
