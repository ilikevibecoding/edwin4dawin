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
  BLOCK,
  blockHalfW,
  RAMP_TOP,
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
  const xe = wallX(zr) - chamfer(zr) - RAIL.inset;
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
        const n = wDeck > 30 ? 2 : 1;
        for (let k = 0; k < n; k++) {
          // t runs from the chamfer (0) to the groove (1) on starboard, reversed on port; keep the
          // plates inboard of the rail (t >= 0.2)
          let t = 0.2 + (0.8 * (k + 0.5)) / n;
          if (s < 0) t = 1 - t;
          if (rand() < 0.12) continue;
          const w = (wDeck / n) * (0.78 + rand() * 0.14);
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
  // raised deck rails (zr 118–226): trapezoid ridges lofted along the deck edge, growing from low
  // kerbs at the shoulders to tall ridges beside the bridge, red crest, chevrons at the aft end
  for (const s of [-1, 1]) {
    const secs = [RAIL.z0, 150, 182, 190, 206, RAIL.z1].map((zr) =>
      railSection(zr, s),
    );
    const rail = loftProfile(secs, {
      tags: ["hull", "hull", "trim", "hull"],
      capTag: "hull",
      uv: 1 / 6,
    });
    add(rail.hull, "hull", { color: mulColor(PAL.deck, 0.96), uv: "keep" });
    add(rail.trim, "paint", { color: PAL.red, texel: 1 / 8 });
    if (mid) {
      // Republic chevrons: alternating red/white bands across the crest at the rail's aft end
      for (let k = 0; k < 5; k++) {
        const zk = 205 + k * 2.6;
        const { xe, yTop } = railAt(zk + 1.3);
        const col = k % 2 ? lin(0.86, 0.85, 0.82) : PAL.red;
        add(
          mbox(
            s,
            xe - RAIL.foot + (RAIL.foot - RAIL.crest) / 2 - 0.2,
            xe - (RAIL.foot - RAIL.crest) / 2 + 0.2,
            yTop + 0.02,
            yTop + 0.2,
            zk,
            zk + 2.3,
          ),
          "paint",
          { color: col, texel: 1 / 8 },
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
      const yc = T * 0.5;
      const xw = wallXAt(zr, yc);
      const h = Math.min(4.6, T * 0.5);
      add(
        mbox(s, xw - 0.4, xw + 0.14, yc - h / 2, yc + h / 2, zr - 5, zr + 5),
        "dark",
        {
          color: PAL.recess,
          texel: 1 / 4,
        },
      );
      if (mid) {
        add(
          mbox(
            s,
            xw,
            xw + 0.55,
            yc + h / 2,
            yc + h / 2 + 0.7,
            zr - 5.6,
            zr + 5.6,
          ),
          "hull",
          {
            color: PAL.wall,
            texel: 1 / 4,
          },
        );
        add(
          mbox(
            s,
            xw,
            xw + 0.55,
            yc - h / 2 - 0.7,
            yc - h / 2,
            zr - 5.6,
            zr + 5.6,
          ),
          "hull",
          {
            color: PAL.wall,
            texel: 1 / 4,
          },
        );
        for (const dz of [-1.3, 1.3]) {
          const g = new THREE.CylinderGeometry(0.42, 0.5, 6.5, 6);
          g.rotateZ(Math.PI / 2);
          g.translate(s * (xw + 2.6), yc, Z(zr + dz));
          add(g, "dark", { color: PAL.dark, texel: 1 / 3 });
        }
        const mant = mbox(
          s,
          xw - 0.2,
          xw + 1.4,
          yc - 1.3,
          yc + 1.3,
          zr - 2.4,
          zr + 2.4,
        );
        add(mant, "dark", { color: PAL.dark, texel: 1 / 3 });
      }
    }
    if (!fine) continue;
    // window rows between the bays: two rows of small lit panes
    for (let zr = 14; zr < 226; zr += 5.5) {
      if (bayZ.some((b) => Math.abs(zr - b) < 8)) continue;
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
      if (bayZ.some((b) => Math.abs(zr - b) < 6.5)) continue;
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
      return -0.42 * K + ((xa - xc) / Math.max(1, W - xc)) * (0.42 * K - 2.2);
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
        [70, 105],
        [112, 150],
        [156, 186],
        [192, 224],
      ]) {
        const zc = (z0 + z1) / 2;
        const x0 = 0.6 * wOut(z0) + 3;
        const x1 = 0.6 * wOut(z1) + 3;
        const ang = Math.atan2(x1 - x0, z1 - z0);
        const len = Math.hypot(x1 - x0, z1 - z0);
        const g = new THREE.BoxGeometry(3.4, 0.2, len);
        g.rotateY(ang * s);
        const xc = (x0 + x1) / 2;
        g.translate(s * xc, bellyY(zc, xc) - 0.12, Z(zc));
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
    }
  }
}

// -------------------------------------------------------------------------------------------------
// nose block and trench: forward tubes, a dark vent slit, trench-floor machinery
// -------------------------------------------------------------------------------------------------
export function noseDetail(ctx) {
  const { add, fine, mid } = ctx;
  if (!mid) return;
  for (const s of [-1, 1]) {
    // twin forward ordnance tubes on each side of the centre deck ahead of the spine's wedge, in a
    // low housing, muzzles reaching forward over the prong tops
    const yT = wallTop(98) + 1.5;
    for (const dx of [0, 1.9]) {
      const x = s * (SLOT_X + 1.6 + dx);
      add(cylZ(0.55, 0.62, 16, 8).translate(x, yT, Z(94)), "dark", {
        color: PAL.dark,
        texel: 1 / 3,
      });
    }
    add(
      mbox(s, SLOT_X + 0.6, SLOT_X + 5, wallTop(98) + 0.2, yT + 1.2, 92, 104),
      "hull",
      {
        color: PAL.wall,
        texel: 1 / 4,
      },
    );
  }
  if (!fine) return;
  // dark slit on the nose wedge and a pair of hatches on the centre deck
  add(mbox(1, -3.8, 3.8, 5.5, 7.5, 61.2, 61.7), "dark", {
    color: PAL.recess,
    texel: 1 / 3,
  });
  for (const zr of [70, 80])
    add(
      mbox(1, -2.5, 2.5, wallTop(zr) + 0.6, wallTop(zr) + 0.95, zr - 2, zr + 2),
      "dark",
      {
        color: PAL.dark,
        texel: 1 / 3,
      },
    );
}

// -------------------------------------------------------------------------------------------------
// aft wings: top plates and a red band along the swept leading edge
// -------------------------------------------------------------------------------------------------
export function wingDetail(ctx) {
  const { add, mid, fine } = ctx;
  for (const s of [-1, 1]) {
    if (mid)
      add(wing(s, 0.12, WING.halfH, WING.halfH + 0.6), "hull", {
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
    g.translate(
      (s * (a[0] + b[0])) / 2,
      WING.halfH + 0.7,
      Z((a[1] + b[1]) / 2),
    );
    add(g, "paint", { color: PAL.red, texel: 1 / 8 });
    if (fine) {
      for (const zr of [281, 287])
        add(
          mbox(s, 22, 30, WING.halfH + 0.6, WING.halfH + 1.1, zr, zr + 2.4),
          "dark",
          {
            color: PAL.dark,
            texel: 1 / 4,
          },
        );
      add(mbox(s, 24, 34, -WING.halfH - 0.9, -WING.halfH, 270, 288), "dark", {
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
  for (const s of [-1, 1]) {
    // red band along the block's top chamfer
    for (const [z0, z1] of [
      [209, 231],
      [236, 268],
    ]) {
      const zc = (z0 + z1) / 2;
      const bx0 = blockHalfW(z0) - 1.2;
      const bx1 = blockHalfW(z1) - 1.2;
      const t0 = z0 <= BLOCK.z1 ? BLOCK.top : RAMP_TOP(z0);
      const t1 = z1 <= BLOCK.z1 ? BLOCK.top : RAMP_TOP(z1);
      const len = Math.hypot(z1 - z0, t1 - t0);
      const g = new THREE.BoxGeometry(2, 0.18, len - 1);
      g.rotateX(-Math.atan2(t1 - t0, z1 - z0));
      g.rotateY(Math.atan2(bx1 - bx0, z1 - z0) * s);
      g.translate(s * ((bx0 + bx1) / 2 - 0.4), (t0 + t1) / 2 + 0.12, Z(zc));
      add(g, "paint", { color: PAL.red, texel: 1 / 8 });
    }
    if (!fine) continue;
    // vents on the block sides, hatches on the ramp
    for (const zr of [212, 220, 228]) {
      const bx = blockHalfW(zr);
      add(
        mbox(
          s,
          bx + 0.05,
          bx + 0.3,
          BLOCK.top - 5.5,
          BLOCK.top - 2,
          zr - 2.4,
          zr + 2.4,
        ),
        "dark",
        {
          color: PAL.recess,
          texel: 1 / 3,
        },
      );
    }
    for (let zr = 238; zr < 268; zr += 9) {
      const x = s * (3 + rand() * (blockHalfW(zr) - 7));
      const t = RAMP_TOP(zr);
      const g = new THREE.BoxGeometry(3 + rand() * 2, 0.5, 4);
      g.rotateX(Math.atan2(18.5, 40));
      g.translate(x, t + 0.1, Z(zr));
      add(g, "dark", { color: PAL.dark, texel: 1 / 3 });
    }
  }
  if (!mid) return;
  // machinery cluster behind the neck on the block top and a dish
  add(mbox(1, -5, 5, BLOCK.top, BLOCK.top + 1.6, 219, 227), "dark", {
    color: PAL.dark,
    texel: 1 / 3,
  });
  if (fine) {
    add(facetedDome(1.8, 1.4, 8, 2).translate(5.5, BLOCK.top, Z(224)), "hull", {
      color: PAL.block,
      texel: 1 / 3,
    });
    add(
      tube([-5, BLOCK.top + 1.6, Z(223)], [-5, BLOCK.top + 6, Z(223)], 0.18, 5),
      "dark",
      { color: PAL.dark },
    );
  }
}
