// Venator main hull, matched to the reference render: the tagged cross-section loft (belly, the lower
// slab leaning in, the dark machinery trench under the single deck lip, the flat grey wings, the raised
// red door band with its side walls, grey lip and dark centre seam, the converging red bow stripes on
// the flat bow deck, the ventral bow hangar slot), the blunt light nose block with its two emitter
// triplets, the deck markings (red edge trim, shoulder stripes, gold roundels), the window rows along
// the band walls and the heavy turret row on the shelves. Geometry is object space, non-indexed, added
// through ctx.add(geo, materialKey, opts).
import * as THREE from "three";
import {
  loftProfile,
  loftFrame,
  deckStrip,
  ringFacing,
  quadFacing,
  flipGeometry,
  mulColor,
  cylZ,
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
  NOSE,
  DOOR_Z0,
  DOOR_Z1,
  WEDGE_Z0,
  TRIM_Z0,
  TRIM_Z1,
  bandH,
  bandTop,
  doorEdge,
  centreHalf,
  redOuter,
  redInner,
  bayHalf,
  inDoors,
  inWedge,
  ROUNDEL_ZR,
  roundelX,
  BAY_HALF,
  BAY_DEPTH,
  SEAM_HALF,
  SEAM_DEPTH,
  VENT_Z0,
  VENT_Z1,
  VENT_HALF,
  VENT_DEPTH,
  inVent,
  SHOULDER,
  TURRET_ZR,
  TURRET_R,
  turretX,
  platY,
  GREY_HULL,
  GREY_LIGHT,
  GREY_FLANK,
  GREY_LOWER,
  GREY_BELLY,
  GREY_STERN,
  DARK_RECESS,
  DARK_TRENCH,
  DARK,
  RED,
  INSIGNIA,
  HANGAR_WARM,
  HANGAR_BLUE,
  WINDOW_COOL,
  ROW_WARM,
  ROW_COOL,
  sootAt,
} from "./venatorSpec.js";

// ---- cross section: 14 starboard points mirrored to a 28-point loop, counter-clockwise seen from +z.
// Edge j runs from point j to j+1; the tags below name the tint zone / material of each strip. Inside
// the door zone the band is a raised slab: the wing deck runs in to the band wall's foot, the wall
// rises to the band top, then the grey lip, the red half, the grey centre strip and the seam (or the
// open bay). On the bow wedge the two red stripes lie on the flat deck (the wall has no height).
export function hullProfile(
  zr,
  { gap = 0, depth = 0, vent = false, open = false } = {},
) {
  const hw = halfW(zr);
  const f = flankSteps(zr);
  const yt = f.yt;
  const yb = f.yb;
  const wB = Math.max(bellyHalf(zr), (vent ? VENT_HALF : 0) + 6);
  const s = vent ? VENT_HALF : 0;
  const hs = vent ? VENT_DEPTH : 0;
  let xw = 0;
  let ro = 0;
  let ri = 0;
  let yB = yt;
  let g = 0;
  let h = 0;
  if (inDoors(zr)) {
    xw = doorEdge(zr);
    ro = redOuter(zr);
    ri = redInner(zr, open);
    yB = bandTop(zr);
    g = open ? bayHalf(zr) : gap;
    h = g > 0 ? depth : 0;
  } else if (inWedge(zr)) {
    xw = doorEdge(zr);
    ro = redOuter(zr);
    ri = centreHalf(zr);
  }
  const R = [
    [s, yb + hs],
    [s, yb],
    [wB, yb],
    [hw - 1, f.yTrBot],
    [hw - f.recess, f.yTrBot],
    [hw - f.recess, f.yLipBot],
    [hw, f.yLipBot],
    [hw, yt],
    [xw, yt],
    [xw, yB],
    [ro, yB],
    [ri, yB],
    [g, yB],
    [g, yB - h],
  ];
  const left = R.map(([x, y]) => [-x, y]).reverse();
  return [...R, ...left];
}
const R_TAGS = [
  "dark", // 0 ventral slot wall
  "belly", // 1 belly
  "lower", // 2 angled lower slab
  "dark", // 3 trench floor
  "dark", // 4 trench wall
  "dark", // 5 deck lip underside
  "flank", // 6 deck lip face
  "wing", // 7 wing deck
  "wall", // 8 the band's side wall
  "lip", // 9 grey lip along the band's edge
  "door", // 10 red door half / bow stripe
  "deck", // 11 grey centre strip
  "dark", // 12 seam / bay wall
];
export const HULL_TAGS = [
  ...R_TAGS,
  "dark", // 13 seam / bay floor
  ...R_TAGS.slice().reverse(), // 14..26 port side
  "dark", // 27 ventral slot ceiling
];
// profile edge indices for placing detail: starboard edge k is mirrored to port edge 26 - k, whose
// parameter t runs the opposite way (port t = 1 - starboard t)
export const EDGE = {
  bellyR: 1,
  lowerR: 2,
  trenchFloorR: 3,
  trenchWallR: 4,
  deckLipR: 6,
  wingR: 7,
  wallR: 8,
  doorR: 10,
  bellyL: 25,
  lowerL: 24,
  trenchFloorL: 23,
  trenchWallL: 22,
  deckLipL: 20,
  wingL: 19,
  wallL: 18,
  doorL: 16,
};

// sections include every kink of halfW / yTop / yBot (90, 250, 300, 600, 925) so the silhouette is exact
const SECTIONS_FULL = [
  NOSE.z1,
  40,
  90,
  130,
  180,
  250,
  300,
  360,
  430,
  500,
  580,
  600,
  640,
  720,
  830,
  925,
  980,
  1035,
  1090,
  1120,
  L,
];
const SECTIONS_MID = [
  NOSE.z1,
  90,
  180,
  250,
  300,
  430,
  600,
  640,
  720,
  925,
  1035,
  L,
];
const SECTIONS_FAR = [NOSE.z1, 90, 250, 300, 600, 640, 925, L];

// pairs of sections a hair apart give the recesses and the door band abrupt end walls
function withBreaks(zrs, breaks) {
  const list = [...zrs];
  for (const b of breaks) list.push(b, b + 0.01);
  return list.filter((z, i, a) => a.indexOf(z) === i).sort((a, b) => a - b);
}

export function hullSections(lod, open) {
  const base =
    lod === 0 ? SECTIONS_FULL : lod === 1 ? SECTIONS_MID : SECTIONS_FAR;
  const breaks = [WEDGE_Z0, DOOR_Z0, DOOR_Z1];
  if (lod < 2) breaks.push(VENT_Z0, VENT_Z1);
  const zrs = withBreaks(base, breaks);
  const gap = open ? BAY_HALF : lod < 2 ? SEAM_HALF : 0;
  const depth = open ? BAY_DEPTH : lod < 2 ? SEAM_DEPTH : 0;
  return zrs.map((zr) => ({
    z: Z(zr),
    pts: hullProfile(zr, {
      gap,
      depth,
      open,
      vent: lod < 2 && inVent(zr),
    }),
  }));
}

export const ZONE_TINT = {
  deck: GREY_HULL,
  lip: GREY_HULL,
  wing: GREY_HULL,
  wall: GREY_FLANK,
  flank: GREY_FLANK,
  lower: GREY_LOWER,
  belly: GREY_BELLY,
  stern: GREY_STERN,
  nose: GREY_LIGHT,
};

/**
 * Add the hull, nose and deck markings for one LOD. Returns { secs } (the hull sections, for frames).
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
    capStart: true,
    capEnd: true,
    capTag: "stern",
    uv: hullTexel,
  });
  // the start cap (the nose face around the nose block) shares the stern tag; recolour it by z
  for (const [zone, tint] of Object.entries(ZONE_TINT)) {
    if (!geos[zone]) continue;
    const p = add(geos[zone], "hull", { color: tint, uv: "keep" });
    if (zone === "stern") {
      const pos = p.geo.attributes.position;
      const col = p.geo.attributes.color;
      const nose = new THREE.Color(ZONE_TINT.nose);
      for (let i = 0; i < pos.count; i++)
        if (pos.getZ(i) < Z(L / 2)) col.setXYZ(i, nose.r, nose.g, nose.b);
    }
    sootTint(p.geo);
  }
  if (geos.door) add(geos.door, "paint", { color: RED, uv: "keep" });
  if (geos.dark) {
    const p = add(geos.dark, "dark", { color: DARK_TRENCH, texel: 1 / 10 });
    sootTint(p.geo);
  }

  // ---- nose: the blunt light block at the tip carrying two triplets of round emitters in dark frames,
  // the deck slab above it set back a little, a red-tipped fitting underneath
  const N = NOSE;
  add(boxMM([-N.hx, N.y0, Z(0)], [N.hx, N.y1, Z(N.z1 + 2)]), "hull", {
    color: GREY_LIGHT,
    texel: 1 / 6,
  });
  add(
    boxMM(
      [-N.hx + 2, N.y1 - 0.1, Z(4)],
      [N.hx - 2, yTop(N.z1) + 0.05, Z(N.z1 + 2)],
    ),
    "hull",
    { color: GREY_LIGHT, texel: 1 / 6 },
  );
  for (const s of [-1, 1]) {
    const xa = s * (N.canX - 4);
    const xb = s * (N.canX + 4);
    add(
      boxMM(
        [Math.min(xa, xb), N.cans[0] - 3.5, Z(0) - 0.5],
        [Math.max(xa, xb), N.cans[2] + 3.5, Z(0) + 0.6],
      ),
      "dark",
      { color: DARK_RECESS, texel: 1 / 4 },
    );
    if (mid)
      for (const cy of N.cans)
        add(
          cylZ(N.canR, N.canR, 3.2, lod === 0 ? 12 : 8).translate(
            s * N.canX,
            cy,
            Z(0) - 0.9,
          ),
          "hull",
          { color: GREY_LIGHT, texel: 1 / 4 },
        );
  }
  add(boxMM([-9, yBot(0) - 3, Z(1)], [9, yBot(0) + 1.5, Z(14)]), "paint", {
    color: RED,
    texel: 1 / 4,
  });
  if (mid) {
    // dark underside fittings either side of the red tip
    for (const s of [-1, 1])
      add(
        boxMM(
          [Math.min(s * 10, s * 19), yBot(0) - 1.5, Z(2)],
          [Math.max(s * 10, s * 19), yBot(0) + 1, Z(12)],
        ),
        "dark",
        { color: DARK, texel: 1 / 4 },
      );
  }

  // ---- ventral hangar slot: lit ceiling strips facing down (the slot itself is part of the loft)
  if (mid) {
    const yc = (zr) => yBot(zr) + VENT_DEPTH - 0.2;
    for (const dx of [-16, 0, 16])
      add(
        flipGeometry(
          deckStrip(
            [VENT_Z0 + 8, VENT_Z1 - 8],
            () => dx - 2.5,
            () => dx + 2.5,
            yc,
            Z,
            { lift: 0 },
          ),
        ),
        "windows",
        { color: dx === 0 ? HANGAR_WARM : HANGAR_BLUE, uv: "keep" },
      );
  }

  // ---- open variant: the flight deck floor of the dorsal bay, lit with landing strips, hangar lamps
  // along the bay walls and a scatter of dark equipment (the bay itself is the loft's recess)
  if (open) {
    const yFloor = (zr) => bandTop(zr) - BAY_DEPTH;
    const lit = lod === 2 ? [0] : [-12, 0, 12];
    for (const dx of lit)
      add(
        deckStrip(
          [DOOR_Z0 + 12, DOOR_Z1 - 12],
          () => dx - 1.2,
          () => dx + 1.2,
          yFloor,
          Z,
          { lift: 0.3 },
        ),
        "windows",
        { color: dx === 0 ? HANGAR_WARM : HANGAR_BLUE, uv: "keep" },
      );
    if (mid) {
      for (let zr = DOOR_Z0 + 30; zr < DOOR_Z1 - 20; zr += fine ? 40 : 80) {
        const bh = bayHalf(zr);
        for (const s of [-1, 1])
          add(
            quadFacing(
              [s * (bh - 0.3), yFloor(zr) + BAY_DEPTH * 0.7, Z(zr)],
              [-s, 0, 0],
              [0, 1, 0],
              12,
              2.4,
            ),
            "windows",
            { color: HANGAR_WARM, uv: "keep" },
          );
        if (fine && rand() < 0.7) {
          const x = (rand() - 0.5) * 2 * (bh - 10);
          const w = 3 + rand() * 6;
          const d = 6 + rand() * 12;
          add(
            boxMM(
              [x - w / 2, yFloor(zr) + 0.2, Z(zr) - d / 2],
              [x + w / 2, yFloor(zr) + 2 + rand() * 5, Z(zr) + d / 2],
            ),
            "dark",
            { color: DARK, texel: 1 / 3 },
          );
        }
      }
    }
  }

  // ---- deck markings (paint material): the red halves and bow stripes are loft strips; here the red
  // trim segments along the deck edge beside the bow stripes and the gold roundels
  // the far LOD is drawn from 9 km up: lift the paint further off the deck so it cannot z-fight
  const paintLift = lod === 2 ? 1.2 : 0.15;
  if (mid)
    for (const s of [-1, 1])
      for (let za = TRIM_Z0; za < TRIM_Z1 - 10; za += 34) {
        const zb = Math.min(za + 22, TRIM_Z1 - 2);
        add(
          deckStrip(
            [za, zb],
            (zr) => s * (halfW(zr) - 1.5),
            (zr) => s * (halfW(zr) - 6),
            yTop,
            Z,
            { minW: 2, lift: paintLift },
          ),
          "paint",
          { color: RED, texel: 1 / 8 },
        );
      }
  // gold roundels (Open Circle) on the wings outboard of the band, faded ones on the lower flank
  for (const s of [-1, 1]) {
    const zr = ROUNDEL_ZR;
    const xc = s * roundelX(zr);
    const y = yTop(zr) + paintLift;
    add(ringFacing([xc, y, Z(zr)], [0, 1, 0], [0, 0, -1], 8, 11, 28), "paint", {
      color: INSIGNIA,
      texel: 1 / 8,
    });
    add(
      new THREE.CircleGeometry(8, 24)
        .rotateX(-Math.PI / 2)
        .translate(xc, y, Z(zr)),
      "paint",
      { color: mulColor(INSIGNIA, 0.55), texel: 1 / 8 },
    );
    if (mid)
      add(
        ringFacing(
          [xc, y + 0.05, Z(zr)],
          [0, 1, 0],
          [0, 0, -1],
          3.6,
          5.8,
          20,
          1.2,
        ),
        "paint",
        { color: INSIGNIA, texel: 1 / 8 },
      );
    if (mid) {
      const j = s > 0 ? EDGE.lowerR : EDGE.lowerL;
      const fr = loftFrame(secs, j, 0.5, Z(880));
      const c = fr.p.clone().addScaledVector(fr.n, 0.2);
      add(
        ringFacing(c.toArray(), fr.n.toArray(), [0, 1, 0], 9, 12, 24),
        "paint",
        { color: mulColor(INSIGNIA, 0.7), texel: 1 / 8 },
      );
    }
  }

  // ---- shoulder stripes: red stripes running fore-aft along the wings' aft outer corners
  for (const s of [-1, 1]) {
    const n = lod === 2 ? 2 : SHOULDER.n;
    for (let i = 0; i < n; i++) {
      const off = SHOULDER.inset + i * SHOULDER.pitch * (SHOULDER.n / n);
      add(
        deckStrip(
          [SHOULDER.z0, SHOULDER.z1],
          (zr) => s * (halfW(zr) - off - SHOULDER.w),
          (zr) => s * (halfW(zr) - off),
          yTop,
          Z,
          { lift: paintLift },
        ),
        "paint",
        { color: RED, texel: 1 / 8 },
      );
    }
  }

  // ---- window rows along the band's side walls (they face outboard over the wings)
  if (mid)
    for (const s of [-1, 1]) {
      const j = s > 0 ? EDGE.wallR : EDGE.wallL;
      for (let zr = DOOR_Z0 + 60; zr < DOOR_Z1 - 30; zr += fine ? 34 : 68) {
        if (bandH(zr) < 6) continue;
        const rows = fine && bandH(zr) > 12 ? [0.35, 0.65] : [0.5];
        for (const t of rows) {
          const fr = loftFrame(secs, j, s > 0 ? t : 1 - t, Z(zr));
          const c = fr.p.clone().addScaledVector(fr.n, 0.2);
          add(
            quadFacing(
              c.toArray(),
              fr.n.toArray(),
              [0, 1, 0],
              fine ? 22 : 50,
              1.3,
            ),
            "windows",
            { color: t < 0.5 ? ROW_WARM : ROW_COOL, uv: "keep" },
          );
        }
      }
    }

  // ---- heavy turret row on the shelves (tracking turrets are drawn by the Fleet; the far LOD gets boxes)
  for (const s of [-1, 1]) {
    for (const zr of TURRET_ZR) {
      const tx = s * turretX(zr);
      const tz = Z(zr);
      const yT = platY(zr);
      add(
        new THREE.CylinderGeometry(TURRET_R, TURRET_R + 1.5, 2.6, 8).translate(
          tx,
          yT + 1.3,
          tz,
        ),
        "hull",
        { color: GREY_FLANK, texel: 1 / 8 },
      );
      if (lod === 2) {
        add(
          boxMM([tx - 13, yT + 2.6, tz - 12], [tx + 13, yT + 15, tz + 12]),
          "hull",
          { color: GREY_HULL, texel: 1 / 6 },
        );
        add(
          boxMM([tx - 6, yT + 12, tz - 46], [tx + 6, yT + 16, tz - 8]),
          "dark",
          { color: DARK, texel: 1 / 6 },
        );
      }
      if (lod === 0) {
        const fwd = [s * 0.35, 0, -1];
        ctx.turrets.push({
          type: "heavy",
          pos: [tx, yT + 2.6, tz],
          up: [0, 1, 0],
          forward: fwd,
        });
        ctx.hardpoints.push({
          pos: [tx, yT + 2.6 + HEAVY.pivotY, tz],
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

  // ---- hangar lights along the ventral slot walls
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
            2.0,
          ),
          "windows",
          { color: WINDOW_COOL, uv: "keep" },
        );
      }
    }
  }
  return { secs };
}
