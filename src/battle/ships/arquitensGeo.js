// Structural geometry for the Arquitens: hull cross sections (prongs, kite main body, aft body with the
// ramped block), the fork's nose block and trench filler, the bridge, the three engine nacelles with
// their connecting bar and the swept ledge struts. Everything is object space (forward -Z, up +Y) with
// heights on the ledge datum; `Y0` is applied by the assembler in arquitens.js. Lofts are built with
// venatorKit's tagged `loftProfile`, so each hull zone (deck, wall, belly, trim stripe, dark recess)
// comes back as its own geometry and gets its own tint or material.
import * as THREE from "three";
import { loftProfile, cylZ, nozzle, pw } from "./venatorKit.js";
import { boxMM, prism } from "./shipKit.js";
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
  blockTop,
  NECK,
  HEAD,
  NACELLE,
  BAR,
  WING,
} from "./arquitensSpec.js";

// size of the red chamfer along the top edge of the flank wall (narrow on the thin prong tips)
export const chamfer = (zr) =>
  pw(
    [
      [0, 1.5],
      [105, 2.8],
      [232, 2.8],
      [272, 1.6],
    ],
    zr,
  );
export { blockHalfW };

// axis-aligned box in ship coordinates: x range (starboard, `s` mirrors), y range, zr range
export function mbox(s, x0, x1, y0, y1, zr0, zr1) {
  const a = s * x0;
  const b = s * x1;
  return boxMM(
    [Math.min(a, b), Math.min(y0, y1), Z(Math.min(zr0, zr1))],
    [Math.max(a, b), Math.max(y0, y1), Z(Math.max(zr0, zr1))],
  );
}

// ---- cross sections ------------------------------------------------------------------------------
// One prong of the fork (starboard for s = 1): a box beam with the ledge and chamfered wall on its
// outer side, a chined underside and a vertical inner wall facing the trench.
export const PRONG_TAGS = [
  "belly",
  "belly",
  "trim",
  "ledge",
  "wall",
  "trim",
  "deck",
  "inner",
];
export function prongSection(zr, s) {
  const xo = wOut(zr);
  const xw = wallX(zr);
  const T = wallTop(zr);
  const K = keelP(zr);
  const c = chamfer(zr);
  // the underside continues the main hull's V: deepest at the inner wall, a chine at 60 % of the width
  const pts = [
    [SLOT_X, -K],
    [Math.max(SLOT_X + 2.5, 0.6 * xo), -K * 0.42],
    [xo, -3],
    [xo, 0],
    [xw, 0],
    [xw - 0.5, T - c * 0.8],
    [xw - c, T],
    [SLOT_X, T + 0.4],
  ];
  return { z: Z(zr), pts: pts.map(([x, y]) => [s * x, y]) };
}

// Main body (zr 103–232): keel, chine, ledge, wall, red chamfer, shallow pyramid deck, dark groove,
// raised spine with red flanks and shoulders and the light ridge along its crest; mirrored to a closed
// 23-point profile.
export const MAIN_TAGS = [
  "belly",
  "belly",
  "trim",
  "ledge",
  "wall",
  "trim",
  "deck",
  "slot",
  "trim",
  "trim",
  "spine",
  "spineTop",
  "spine",
  "trim",
  "trim",
  "slot",
  "deck",
  "trim",
  "wall",
  "ledge",
  "trim",
  "belly",
  "belly",
];
export function mainSection(zr) {
  const W = wOut(zr);
  const xw = wallX(zr);
  const T = wallTop(zr);
  const Dc = deckC(zr);
  const K = keel(zr);
  const R = spineUp(zr);
  const c = chamfer(zr);
  // the ridge is only proud of the spine once the wedge front has risen
  const ridge = Math.min(RIDGE_H, R * 0.5);
  const half = [
    [0, -K],
    [0.6 * W, -0.42 * K],
    [W, -3],
    [W, 0],
    [xw, 0],
    [xw - 0.5, T - c * 0.8],
    [xw - c, T],
    [SPINE_X + GROOVE_W, Dc],
    [SPINE_X, Dc - 0.15],
    [SPINE_X - 0.6, Dc + R],
    [RIDGE_X, Dc + R],
    [RIDGE_X, Dc + R + ridge],
  ];
  return mirrored(zr, half);
}

// Aft body (zr 226–272): the same lower hull with a flat deck between the chamfers; the ramped block
// sits on it as its own loft. `shrink` pulls the section slightly inside the main body where the two
// lofts overlap so the flanks do not z-fight.
export const AFT_TAGS = [
  "belly",
  "belly",
  "trim",
  "ledge",
  "wall",
  "trim",
  "deck",
  "trim",
  "wall",
  "ledge",
  "trim",
  "belly",
  "belly",
];
export function aftSection(zr, shrink = 1) {
  const W = wOut(zr) * shrink;
  const xw = wallX(zr) * shrink;
  const T = wallTop(zr) * shrink;
  const K = keel(zr) * shrink;
  const c = chamfer(zr);
  const half = [
    [0, -K],
    [0.6 * W, -0.42 * K],
    [W, -3 * shrink],
    [W, 0],
    [xw, 0],
    [xw - 0.5, T - c * 0.8],
    [xw - c, T],
  ];
  return mirrored(zr, half);
}

function mirrored(zr, half) {
  const pts = half.concat(
    half
      .slice(1)
      .reverse()
      .map(([x, y]) => [-x, y]),
  );
  return { z: Z(zr), pts };
}

// Superstructure (zr 196–272): the spine's low pedestal under the bridge neck, the step up into the
// ramp block's crest right behind the head, the flare to the aft body's width and the long ramp down
// to the transom. Chamfered top edges.
export function blockSections(lod) {
  const zs =
    lod === 0
      ? [196, 198, 200, 215, 218, 221, 226, 232, 245, 258, 272]
      : [196, 200, 215, 221, 232, 272];
  return zs.map((zr) => {
    const bx = Math.min(
      blockHalfW(zr),
      wallX(zr) - chamfer(zr) - (zr > BLOCK.z1 ? 1.2 : 2.5),
    );
    const base = zr <= BLOCK.z1 ? deckC(zr) - 1 : wallTop(zr) - 0.8;
    const top = blockTop(zr);
    const ch = Math.min(1.2, (top - base) * 0.4);
    return {
      z: Z(zr),
      pts: [
        [-bx, base],
        [bx, base],
        [bx, top - ch],
        [bx - ch, top],
        [-(bx - ch), top],
        [-bx, top - ch],
      ],
    };
  });
}
export const BLOCK_TAGS = [
  "block",
  "block",
  "block",
  "blockTop",
  "block",
  "block",
];

// Nose block closing the fork's crotch: a wedge front (zr 57–62) rising to a centre deck a step above
// the prong tops that runs aft to the main deck (zr 104), where the spine's red wedge takes over.
export function noseSections() {
  const hw = SLOT_X - 0.3;
  const top = (zr) =>
    zr < 62
      ? pw(
          [
            [57, 2],
            [62, wallTop(62) + 0.6],
          ],
          zr,
        )
      : wallTop(zr) + 0.6;
  return [57, 59.5, 62, 82, 104].map((zr) => {
    const t = top(zr);
    const ch = Math.min(1, (t + 2) * 0.3);
    return {
      z: Z(zr),
      pts: [
        [-hw, -2],
        [hw, -2],
        [hw, t - ch],
        [hw - ch, t],
        [-(hw - ch), t],
        [-hw, t - ch],
      ],
    };
  });
}
export const NOSE_TAGS = ["wall", "wall", "wall", "block", "wall", "wall"];

// Dark trench floor between the prongs' inner walls from their undersides up to y = -2 (8–10 m below
// the prong tops), running from just behind the tips to the nose block; the fork is open through only
// at the very tips (zr < 14).
export function fillerSections() {
  const hw = SLOT_X - 0.1;
  return [14, 40, 57, 82, 104].map((zr) => ({
    z: Z(zr),
    pts: [
      [-hw, -keelP(zr) + 0.4],
      [hw, -keelP(zr) + 0.4],
      [hw, -2],
      [-hw, -2],
    ],
  }));
}

// ---- bridge --------------------------------------------------------------------------------------
// Neck (a boxy pedestal on the block) and the wide head with a leaning front face.
export function bridgeNeck() {
  return boxMM(
    [-NECK.halfW, NECK.y0 - 0.5, Z(NECK.z0)],
    [NECK.halfW, NECK.y1 + 0.2, Z(NECK.z1)],
  );
}
// Head: a wide flat box with a small bevel round the front face; the cap plate on top (see
// headCap) overhangs it slightly so the bridge reads as the show's T.
export function headSections() {
  const H = HEAD;
  const sec = (zr, hw, y0, y1, ch) => ({
    z: Z(zr),
    pts: [
      [-hw, y0],
      [hw, y0],
      [hw, y1 - ch],
      [hw - ch, y1],
      [-(hw - ch), y1],
      [-hw, y1 - ch],
    ],
  });
  return [
    sec(H.z0, H.halfW - 0.9, H.y0 + 0.7, H.y1 - 1.2, 0.5),
    sec(H.z0 + 1.2, H.halfW, H.y0, H.y1 - 0.6, 0.6),
    sec(H.z1, H.halfW, H.y0, H.y1 - 0.6, 0.6),
  ];
}
export function headCap() {
  const H = HEAD;
  return boxMM(
    [-(H.halfW + H.lip), H.y1 - 0.9, Z(H.z0 - H.lip)],
    [H.halfW + H.lip, H.y1, Z(H.z1 + H.lip)],
  );
}

// ---- engines -------------------------------------------------------------------------------------
export function nacelleDefs() {
  const N = NACELLE;
  return [
    { x: -N.outer.x, r: N.outer.r },
    { x: N.centre.x, r: N.centre.r },
    { x: N.outer.x, r: N.outer.r },
  ];
}
function circle(r, seg) {
  const pts = [];
  for (let k = 0; k < seg; k++) {
    const a = (k / seg) * Math.PI * 2;
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return pts;
}
/**
 * One nacelle: rounded front dome, plain body, stepped-down nozzle shroud with interior depth (the
 * fleet draws the glow/plume from `engines[]`). Returns { hull: [geos], dark: [geos], mouth: model z }.
 */
export function nacelle({ x, r }, lod) {
  const N = NACELLE;
  const seg = lod === 0 ? 24 : lod === 1 ? 16 : 10;
  const hull = [];
  const dark = [];
  const y = N.y;
  const zBody0 = N.z0 + N.domeLen;
  // dome: lofted circles closing to a flat front disc
  const domeSecs = (
    lod === 0
      ? [
          [0, 0.22],
          [0.12, 0.5],
          [0.3, 0.74],
          [0.55, 0.9],
          [0.8, 0.98],
          [1, 1],
        ]
      : [
          [0, 0.3],
          [0.3, 0.72],
          [1, 1],
        ]
  ).map(([f, k]) => ({ z: Z(N.z0 + f * N.domeLen), pts: circle(r * k, seg) }));
  const dome = loftProfile(domeSecs, { capEnd: false }).hull;
  dome.translate(x, y, 0);
  hull.push(dome);
  // dark hub disc in the middle of the dome (the show's darker centre cap)
  if (lod < 2)
    dark.push(
      cylZ(r * 0.14, r * 0.22, 0.8, seg).translate(x, y, Z(N.z0 - 0.2)),
    );
  // body: open cylinder from the dome to the nozzle step
  const bodyLen = N.nozzleZ - zBody0;
  hull.push(
    cylZ(r, r, bodyLen, seg, true).translate(x, y, Z(zBody0 + bodyLen / 2)),
  );
  // step ring down to the nozzle shroud
  const nr = N.nozzleR;
  const step = new THREE.RingGeometry(nr * 1.14, r, seg, 1)
    .toNonIndexed()
    .translate(x, y, Z(N.nozzleZ));
  dark.push(step);
  const lip = N.z1 - N.nozzleZ;
  const nz = nozzle(nr, {
    depth: nr * 1.1,
    lip,
    seg,
    rings: 2,
    vanes: 8,
    detail: lod === 0 ? 2 : lod === 1 ? 1 : 0,
  });
  for (const g of nz.dark) dark.push(g.translate(x, y, Z(N.nozzleZ)));
  return { hull, dark, mouth: Z(N.nozzleZ + nz.mouth) };
}

// Horizontal bar joining the three nacelles (through the centre one), plus the swept ledge struts
// from the wings' aft corners out to the outer nacelles.
export function engineBar() {
  const B = BAR;
  return boxMM([-B.x, B.y - B.halfH, Z(B.z0)], [B.x, B.y + B.halfH, Z(B.z1)]);
}
export function wing(s, inset = 0, y0 = WING.y0, y1 = WING.y1) {
  // prism() maps the plan's second coordinate to -z; `inset` shrinks the plan for a stacked top plate
  const c = WING.pts.reduce(
    (a, p) => [a[0] + p[0] / 5, a[1] + p[1] / 5],
    [0, 0],
  );
  const pts = WING.pts.map(([x, zr]) => {
    const dx = x - c[0];
    const dz = zr - c[1];
    const k = 1 - inset;
    return [s * (c[0] + dx * k), -Z(c[1] + dz * k)];
  });
  if (s < 0) pts.reverse();
  return prism(pts, y0, y1);
}
