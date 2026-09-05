// Venator main hull: the tagged cross-section loft (belly, angled lower hull, two flank ledges with the
// dark window trench between them, deck lip, grey wings, raised door halves over the centre seam or the
// open bay, the ventral bow hangar slot), the two bow prongs around the notch, the deck markings (red
// door strips converging toward the nose, the two bow-wedge panels, shoulder stripes, Open Circle rings)
// and the heavy turret row on the shoulders. Geometry is object space, non-indexed, added through
// ctx.add(geo, materialKey, opts).
import * as THREE from "three";
import {
  loftProfile,
  loftFrame,
  deckStrip,
  prismPoly,
  ringFacing,
  quadFacing,
  flipGeometry,
  mulColor,
} from "./venatorKit.js";
import { boxMM } from "./shipKit.js";
import { HEAVY } from "./venatorTurrets.js";
import {
  Z,
  L,
  halfW,
  yTop,
  yBot,
  flankSteps,
  bellyHalf,
  NOTCH_HALF,
  PRONG_END,
  CENTRE_HALF,
  DOOR_Z0,
  DOOR_Z1,
  DOOR_H,
  WEDGE_Z0,
  WEDGE_Z1,
  WEDGE_BORDER,
  doorEdge,
  redInner,
  inDoors,
  BAY_HALF,
  BAY_DEPTH,
  SEAM_HALF,
  SEAM_DEPTH,
  VENT_Z0,
  VENT_Z1,
  VENT_HALF,
  VENT_DEPTH,
  inVent,
  SHOULDER_Z0,
  SHOULDER_Z1,
  SHOULDER_X0,
  SHOULDER_X1,
  TURRET_ZR,
  turretX,
  GREY_DECK,
  GREY_WING,
  GREY_FLANK,
  GREY_LOWER,
  GREY_BELLY,
  GREY_STERN,
  DARK_RECESS,
  DARK_TRENCH,
  DARK_SEAM,
  DARK,
  RED,
  RED_DARK,
  INSIGNIA,
  HANGAR_WARM,
  HANGAR_BLUE,
  WINDOW_COOL,
  sootAt,
} from "./venatorSpec.js";

// ---- cross section: 13 starboard points mirrored to a 26-point loop, counter-clockwise seen from +z.
// Edge j runs from point j to j+1; the tags below name the tint zone / material of each strip.
export function hullProfile(zr, { gap = 0, depth = 0, vent = false } = {}) {
  const hw = halfW(zr);
  const f = flankSteps(zr);
  const yt = f.yt;
  const yb = f.yb;
  const wB = Math.max(bellyHalf(zr), (vent ? VENT_HALF : 0) + 6);
  const s = vent ? VENT_HALF : 0;
  const hs = vent ? VENT_DEPTH : 0;
  const door = inDoors(zr);
  const xw = door ? doorEdge(zr) : 0;
  const dh = door ? DOOR_H : 0;
  const g = door ? gap : 0;
  const h = door ? depth : 0;
  const R = [
    [s, yb + hs],
    [s, yb],
    [wB, yb],
    [hw - 1, f.yLowBot],
    [hw - 1, f.yTrBot],
    [hw - f.recess, f.yTrBot],
    [hw - f.recess, f.yLipBot],
    [hw, f.yLipBot],
    [hw, yt],
    [xw, yt],
    [xw, yt + dh],
    [g, yt + dh],
    [g, yt + dh - h],
  ];
  const left = R.map(([x, y]) => [-x, y]).reverse();
  return [...R, ...left];
}
const R_TAGS = [
  "dark", // 0 ventral slot wall
  "belly", // 1 belly
  "lower", // 2 angled lower hull
  "flank", // 3 lower lip face
  "dark", // 4 trench floor (lower lip top)
  "dark", // 5 trench wall
  "dark", // 6 deck lip underside
  "flank", // 7 deck lip face
  "wing", // 8 wing deck
  "deck", // 9 door outer step
  "deck", // 10 door top
  "dark", // 11 seam / bay wall
];
export const HULL_TAGS = [
  ...R_TAGS,
  "dark", // 12 seam / bay floor
  ...R_TAGS.slice().reverse(), // 13..24 port side
  "dark", // 25 ventral slot ceiling
];
// profile edge indices for placing detail: starboard edge k is mirrored to port edge 24 - k, whose
// parameter t runs the opposite way (port t = 1 - starboard t)
export const EDGE = {
  bellyR: 1,
  lowerR: 2,
  lowLipR: 3,
  trenchFloorR: 4,
  trenchWallR: 5,
  deckLipR: 7,
  wingR: 8,
  doorR: 10,
  bellyL: 23,
  lowerL: 22,
  lowLipL: 21,
  trenchFloorL: 20,
  trenchWallL: 19,
  deckLipL: 17,
  wingL: 16,
  doorL: 14,
};

const SECTIONS_FULL = [
  PRONG_END,
  150,
  190,
  240,
  300,
  360,
  430,
  500,
  580,
  660,
  740,
  830,
  900,
  980,
  1040,
  1090,
  1120,
  L,
];
const SECTIONS_MID = [PRONG_END, 190, 300, 430, 580, 740, 830, 1040, L];
const SECTIONS_FAR = [PRONG_END, 300, 580, 830, 1040, L];

// pairs of sections a hair apart give the recesses abrupt end walls
function withBreaks(zrs, breaks) {
  const list = [...zrs];
  for (const b of breaks) list.push(b, b + 0.01);
  return list.filter((z, i, a) => a.indexOf(z) === i).sort((a, b) => a - b);
}

export function hullSections(lod, open) {
  const base =
    lod === 0 ? SECTIONS_FULL : lod === 1 ? SECTIONS_MID : SECTIONS_FAR;
  const breaks = [DOOR_Z0, DOOR_Z1];
  if (lod < 2) breaks.push(VENT_Z0, VENT_Z1);
  const zrs = withBreaks(base, breaks);
  const gap = open ? BAY_HALF : lod < 2 ? SEAM_HALF : 0;
  const depth = open ? BAY_DEPTH : lod < 2 ? SEAM_DEPTH : 0;
  return zrs.map((zr) => ({
    z: Z(zr),
    pts: hullProfile(zr, { gap, depth, vent: lod < 2 && inVent(zr) }),
  }));
}

// bow prongs: the same stepped flank as the hull on the outside, a flat dark wall toward the notch
function prongProfile(zr) {
  const hw = halfW(zr);
  const f = flankSteps(zr);
  const xi = NOTCH_HALF;
  const wB = Math.max(bellyHalf(zr), xi + 6);
  return [
    [xi, f.yb],
    [wB, f.yb],
    [hw - 1, f.yLowBot],
    [hw - 1, f.yTrBot],
    [hw - f.recess, f.yTrBot],
    [hw - f.recess, f.yLipBot],
    [hw, f.yLipBot],
    [hw, f.yt],
    [xi, f.yt],
  ];
}
const PRONG_TAGS = [
  "belly",
  "lower",
  "flank",
  "dark",
  "dark",
  "dark",
  "flank",
  "wing",
  "dark", // notch wall
];

export const ZONE_TINT = {
  deck: GREY_DECK,
  wing: GREY_WING,
  flank: GREY_FLANK,
  lower: GREY_LOWER,
  belly: GREY_BELLY,
  stern: GREY_STERN,
};

/**
 * Add the hull, prongs and deck markings for one LOD. Returns { secs } (the hull sections, for frames).
 */
export function buildHull(ctx) {
  const { lod, fine, mid, add, hullTexel, open, rand } = ctx;
  const sootTint = (geo) => {
    const pos = geo.attributes.position;
    const col = geo.attributes.color;
    if (!col) return;
    for (let i = 0; i < pos.count; i++) {
      const s = sootAt(pos.getZ(i));
      col.setXYZ(i, col.getX(i) * s[0], col.getY(i) * s[1], col.getZ(i) * s[2]);
    }
    col.needsUpdate = true;
  };

  // ---- main loft
  const secs = hullSections(lod, open);
  const geos = loftProfile(secs, {
    tags: HULL_TAGS,
    capStart: false,
    capEnd: true,
    capTag: "stern",
    uv: hullTexel,
  });
  for (const [zone, tint] of Object.entries(ZONE_TINT)) {
    if (!geos[zone]) continue;
    const p = add(geos[zone], "hull", { color: tint, uv: "keep" });
    sootTint(p.geo);
  }
  if (geos.dark) {
    const p = add(geos.dark, "dark", { color: DARK_TRENCH, texel: 1 / 10 });
    sootTint(p.geo);
  }

  // ---- prongs and the notch
  for (const s of [-1, 1]) {
    const zrs =
      lod === 2 ? [0, 60, PRONG_END + 0.5] : [0, 30, 70, 100, PRONG_END + 0.5];
    const psecs = zrs.map((zr) => ({
      z: Z(zr),
      pts: prongProfile(zr).map(([x, y]) => [s * x, y]),
    }));
    const pg = loftProfile(psecs, {
      tags: PRONG_TAGS,
      capStart: true,
      capEnd: false,
      capTag: "deck", // the blunt nose faces are the light armour of the deck
      uv: hullTexel,
    });
    for (const [zone, tint] of Object.entries(ZONE_TINT))
      if (pg[zone]) add(pg[zone], "hull", { color: tint, uv: "keep" });
    if (pg.dark) add(pg.dark, "dark", { color: DARK_TRENCH, texel: 1 / 8 });
    // nose face: the tractor-beam / sensor emitters (three dark discs) and a dark seam across the face
    if (mid) {
      const yt = yTop(0);
      const yb = yBot(0);
      const xc = s * ((NOTCH_HALF + halfW(0)) / 2);
      const w = halfW(0) - NOTCH_HALF - 8;
      for (const [dx, dy] of [
        [-0.3, 0.6],
        [0.3, 0.6],
        [0, 0.28],
      ]) {
        const r = Math.min(4, (yt - yb) * 0.1);
        add(
          new THREE.CylinderGeometry(r, r, 1.6, 12)
            .rotateX(Math.PI / 2)
            .translate(xc + dx * w * 0.5, yb + (yt - yb) * dy, Z(0) - 0.7),
          "dark",
          { color: DARK, texel: 1 / 3 },
        );
      }
      add(
        boxMM(
          [xc - w / 2, yb + (yt - yb) * 0.45, Z(0) - 0.3],
          [xc + w / 2, yb + (yt - yb) * 0.45 + 0.8, Z(0) + 0.1],
        ),
        "dark",
        { color: DARK_SEAM, texel: 1 / 4 },
      );
    }
    if (mid) {
      // tractor-beam emitter rings on the notch walls near the tip, and a lit slot at the back
      for (const zr of [22, 52]) {
        const y = (yTop(zr) + yBot(zr)) / 2;
        add(
          ringFacing(
            [s * (NOTCH_HALF + 0.3), y, Z(zr)],
            [-s, 0, 0],
            [0, 1, 0],
            2.5,
            5,
            12,
          ),
          "dark",
          { color: DARK, texel: 1 / 3 },
        );
        add(
          quadFacing(
            [s * (NOTCH_HALF + 0.2), y, Z(zr)],
            [-s, 0, 0],
            [0, 1, 0],
            4.6,
            4.6,
          ),
          "windows",
          { color: HANGAR_BLUE, uv: "keep" },
        );
      }
    }
  }
  // notch back wall (the hull's open front) with a lit hangar mouth
  {
    const zr = PRONG_END;
    const yt = yTop(zr);
    const yb = yBot(zr);
    add(
      quadFacing(
        [0, (yt + yb) / 2, Z(zr) + 0.05],
        [0, 0, -1],
        [0, 1, 0],
        NOTCH_HALF * 2,
        yt - yb,
      ),
      "dark",
      { color: DARK_RECESS, texel: 1 / 8 },
    );
    if (mid) {
      // a small lit docking mouth at the bottom of the notch wall
      add(
        quadFacing(
          [0, yb + 9, Z(zr) - 0.3],
          [0, 0, -1],
          [0, 1, 0],
          NOTCH_HALF * 2 - 16,
          6,
        ),
        "windows",
        { color: HANGAR_WARM, uv: "keep" },
      );
    }
  }

  // ---- ventral hangar slot: lit ceiling strips facing down (the slot itself is part of the loft)
  if (mid) {
    const yc = (zr) => yBot(zr) + VENT_DEPTH - 0.2;
    for (const dx of [-18, 0, 18])
      add(
        flipGeometry(
          deckStrip(
            [VENT_Z0 + 8, VENT_Z1 - 8],
            () => dx - 3,
            () => dx + 3,
            yc,
            Z,
            { lift: 0 },
          ),
        ),
        "windows",
        { color: dx === 0 ? HANGAR_WARM : HANGAR_BLUE, uv: "keep" },
      );
  }

  // ---- deck markings (paint material). The door top is at yTop + DOOR_H, the wedge on the bare deck.
  const zrsDoor = [];
  for (let zr = DOOR_Z0 + 1.5; zr < DOOR_Z1 - 1.5; zr += lod === 2 ? 180 : 45)
    zrsDoor.push(zr);
  zrsDoor.push(DOOR_Z1 - 1.5);
  const inner = redInner(DOOR_Z0 + 0.01, open);
  for (const s of [-1, 1]) {
    // door red strip: inner edge a grey margin in from the centre strip, outer edge 3 m inside the door
    // edge (both converge toward the bow with the deck)
    add(
      deckStrip(
        zrsDoor,
        (zr) => s * redInner(zr, open),
        (zr) => s * (doorEdge(zr) - 3),
        (zr) => yTop(zr) + DOOR_H,
        Z,
        {
          minW: 4,
        },
      ),
      "paint",
      { color: RED, texel: 1 / 12 },
    );
    // bow wedge panel: converging trapezoid with a grey border to the deck edge
    const zrsW =
      lod === 2 ? [WEDGE_Z0, WEDGE_Z1] : [WEDGE_Z0, 170, 210, WEDGE_Z1];
    add(
      deckStrip(
        zrsW,
        () => s * CENTRE_HALF,
        (zr) => s * (halfW(zr) - WEDGE_BORDER),
        yTop,
        Z,
        { minW: 4 },
      ),
      "paint",
      { color: RED, texel: 1 / 12 },
    );
    if (mid) {
      // door front face in the shadowed red, so the step reads from ahead
      const xw = doorEdge(DOOR_Z0 + 0.01);
      add(
        quadFacing(
          [
            s * ((inner + xw - 3) / 2),
            yTop(DOOR_Z0) + DOOR_H / 2,
            Z(DOOR_Z0) - 0.1,
          ],
          [0, 0, -1],
          [0, 1, 0],
          xw - 3 - inner,
          DOOR_H,
        ),
        "paint",
        { color: RED_DARK, texel: 1 / 4 },
      );
      // panel lines across the red strips (dark grooves every ~55 m) and along the centre edge
      if (fine) {
        for (let zr = DOOR_Z0 + 55; zr < DOOR_Z1 - 20; zr += 55) {
          const xw = doorEdge(zr) - 3;
          const xi = redInner(zr, open);
          add(
            boxMM(
              [Math.min(s * xi, s * xw), yTop(zr) + DOOR_H + 0.16, Z(zr) - 0.4],
              [Math.max(s * xi, s * xw), yTop(zr) + DOOR_H + 0.3, Z(zr) + 0.4],
            ),
            "dark",
            { color: 0x50242a, texel: 1 / 4 },
          );
        }
      }
    }
  }
  // grey centre strip between the door halves is bare deck; the seam is in the loft. Insignia rings on
  // the wings and lower flanks (Open Circle mark: ring + inner arc)
  for (const s of [-1, 1]) {
    const zr = 560;
    const xc = s * ((doorEdge(zr) + halfW(zr)) / 2);
    const y = yTop(zr) + 0.2;
    add(
      ringFacing([xc, y, Z(zr)], [0, 1, 0], [0, 0, -1], 13.5, 17.5, 28),
      "paint",
      {
        color: INSIGNIA,
        texel: 1 / 8,
      },
    );
    if (mid)
      add(
        ringFacing([xc, y, Z(zr)], [0, 1, 0], [0, 0, -1], 6, 9.5, 20, 1.2),
        "paint",
        {
          color: INSIGNIA,
          texel: 1 / 8,
        },
      );
    // lower flank ring near the stern (faded)
    if (mid) {
      const j = s > 0 ? EDGE.lowerR : EDGE.lowerL;
      const fr = loftFrame(secs, j, 0.5, Z(880));
      const c = fr.p.clone().addScaledVector(fr.n, 0.2);
      add(
        ringFacing(c.toArray(), fr.n.toArray(), [0, 1, 0], 10, 13, 24),
        "paint",
        {
          color: mulColor(INSIGNIA, 0.75),
          texel: 1 / 8,
        },
      );
    }
  }

  // ---- shoulders: raised wing plates at the widest point with four red stripes across them
  for (const s of [-1, 1]) {
    const x0 = (zr) => s * SHOULDER_X0(zr);
    const x1 = (zr) => s * SHOULDER_X1(zr);
    const plan = [
      [x0(SHOULDER_Z0), Z(SHOULDER_Z0)],
      [x1(SHOULDER_Z0), Z(SHOULDER_Z0)],
      [x1(SHOULDER_Z1), Z(SHOULDER_Z1)],
      [x0(SHOULDER_Z1), Z(SHOULDER_Z1)],
    ];
    const pl = prismPoly(plan, yTop(SHOULDER_Z0), yTop(SHOULDER_Z0) + 5, {
      inset: 3,
      capTag: "top",
    });
    add(pl.hull, "hull", { color: GREY_FLANK, texel: hullTexel });
    add(pl.top, "hull", { color: GREY_WING, texel: hullTexel });
    // four red stripes across the plate
    const yS = yTop(SHOULDER_Z0) + 5.15;
    for (let i = 0; i < 4; i++) {
      const za = SHOULDER_Z0 + 14 + i * 27;
      const zb = za + 13;
      add(
        deckStrip(
          [za, zb],
          (zr) => x0(zr) + s * 3,
          (zr) => x1(zr) - s * 4,
          () => yS,
          Z,
          { lift: 0 },
        ),
        "paint",
        { color: RED, texel: 1 / 8 },
      );
    }
  }

  // ---- heavy turret row on the wings (tracking turrets are drawn by the Fleet; the far LOD gets boxes)
  for (const s of [-1, 1]) {
    for (const zr of TURRET_ZR) {
      const tx = s * turretX(zr);
      const tz = Z(zr);
      const y = yTop(zr);
      // barbette: a low octagonal pedestal
      add(
        new THREE.CylinderGeometry(17, 18.5, 2.6, 8).translate(tx, y + 1.3, tz),
        "hull",
        {
          color: GREY_FLANK,
          texel: 1 / 8,
        },
      );
      if (lod === 2) {
        add(
          boxMM([tx - 13, y + 2.6, tz - 12], [tx + 13, y + 15, tz + 12]),
          "hull",
          {
            color: GREY_WING,
            texel: 1 / 6,
          },
        );
        add(
          boxMM([tx - 6, y + 12, tz - 46], [tx + 6, y + 16, tz - 8]),
          "dark",
          {
            color: DARK,
            texel: 1 / 6,
          },
        );
      }
      if (lod === 0) {
        const fwd = [s * 0.35, 0, -1];
        ctx.turrets.push({
          type: "heavy",
          pos: [tx, y + 2.6, tz],
          up: [0, 1, 0],
          forward: fwd,
        });
        ctx.hardpoints.push({
          pos: [tx, y + 2.6 + HEAVY.pivotY, tz],
          dir: new THREE.Vector3(...fwd)
            .normalize()
            .toArray()
            .map((v) => +v.toFixed(3)),
          kind: "heavy",
          range: 14000,
          turret: ctx.turrets.length - 1,
        });
      }
    }
  }

  // ---- notch-side hangar lights along the ventral slot walls and the wing edge running lights
  if (fine) {
    for (const s of [-1, 1]) {
      for (let zr = VENT_Z0 + 20; zr < VENT_Z1 - 10; zr += 40) {
        const y = yBot(zr) + VENT_DEPTH * 0.55;
        add(
          quadFacing(
            [s * (VENT_HALF - 0.2), y, Z(zr)],
            [-s, 0, 0],
            [0, 1, 0],
            6,
            2.2,
          ),
          "windows",
          {
            color: WINDOW_COOL,
            uv: "keep",
          },
        );
      }
    }
  }
  void rand;
  return { secs };
}
