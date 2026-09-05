// Lucrehulk sub-assemblies: the arm tips (raised roof plates, the hooked docking pills that bend down
// over the end faces, stacked docking tubes, the lit hangar slot, the claw), the core ship (sphere with
// its equatorial groove, latitude bands, window rows, bridge tower with the T-bar, twin aft towers,
// blue panels), the neck and its deck, the stern block with its spire cluster, disc and gantry, and the
// six engine pods on the stern of the ring.
import * as THREE from "three";
import {
  D2R,
  TAU,
  TriBuf,
  addQuad,
  arcBox,
  arcStrip,
  bar,
  boxIn,
  cylIn,
  frameToWorld,
  polar,
  radialDir,
  roundedRect,
  spherePatch,
  superellipse,
  sweepArc,
  sweepPath,
  tangentDir,
  tube,
  v3,
} from "./lucrehulkGeo.js";
import { LUCREHULK as K, PAL } from "./lucrehulkSpec.js";

const R_MID = (K.rOut + K.rIn) / 2;

// end-of-arm frame: origin on the end face at mid width, u radial outward, v up, w into the bow gap
export function tipFrame(side) {
  const thE = side > 0 ? K.gap : TAU - K.gap;
  const t = tangentDir(thE);
  return {
    o: polar(R_MID, thE, 0),
    u: radialDir(thE),
    v: [0, 1, 0],
    w: side > 0 ? v3.scale(t, -1) : t,
    thE,
    side,
  };
}

/** One arm tip. `add(geo, mat, opts)` appends a part. */
export function buildTip(add, side, TEX) {
  const F = tipFrame(side);
  const s = side;
  const thE = F.thE;
  const a0 = s > 0 ? thE : thE - K.tipArc;
  const a1 = s > 0 ? thE + K.tipArc : thE;
  const top = K.halfH;
  const roofY = top + 40;
  // raised roof plates (top and bottom) with chamfered flanks
  for (const lod of [0, 1, 2]) {
    const n = lod === 0 ? 10 : lod === 1 ? 5 : 3;
    add(
      sweepArc(
        [
          [1030, top],
          [1450, top],
          [1420, roofY],
          [1060, roofY],
        ],
        a0,
        a1,
        n,
        { capStart: true, capEnd: true, texel: TEX },
      ),
      "hull",
      { color: PAL.greyLt, uv: "keep", lod },
    );
    add(
      sweepArc(
        [
          [1030, -top],
          [1060, -roofY],
          [1420, -roofY],
          [1450, -top],
        ],
        a0,
        a1,
        n,
        { capStart: true, capEnd: true, texel: TEX },
      ),
      "hull",
      { color: PAL.greyDk, uv: "keep", lod },
    );
  }
  // the hooked pill: a wide rounded slab along the roof, a quarter bend down over the end face, then a
  // vertical drum
  const rp = 1175;
  const yp = roofY + 50;
  const Rb = 124;
  for (const lod of [0, 1, 2]) {
    const stations = [];
    const nArc = lod === 0 ? 12 : lod === 1 ? 6 : 3;
    const span = 32 * D2R;
    const ease = 2.2 * D2R;
    for (let i = 0; i <= nArc; i++) {
      const th = thE + s * (span - ((span - ease) * i) / nArc);
      stations.push({ p: polar(rp, th, yp) });
    }
    const E = stations[stations.length - 1].p;
    const w = F.w;
    const nb = lod === 0 ? 6 : lod === 1 ? 4 : 2;
    for (let i = 1; i <= nb; i++) {
      const al = (i / nb) * (Math.PI / 2);
      stations.push({
        p: v3.mad(
          v3.mad(E, w, Rb * Math.sin(al)),
          [0, 1, 0],
          -Rb * (1 - Math.cos(al)),
        ),
      });
    }
    const B = stations[stations.length - 1].p;
    stations.push({ p: [B[0], -50, B[2]] });
    const prof = superellipse(lod === 0 ? 20 : lod === 1 ? 12 : 8, 3.4, 92, 52);
    add(
      sweepPath(prof, stations, { capEnd: true, capStart: true, texel: TEX }),
      "hull",
      {
        uv: "keep",
        lod,
        tint: (x, y, z, o) =>
          o.copy(PAL.grey).multiplyScalar(y < 0 ? 0.9 : 1.02),
      },
    );
    // ribbed collar where the drum meets the end face
    if (lod < 2)
      add(
        sweepPath(
          superellipse(lod === 0 ? 20 : 12, 3.4, 98, 58),
          [
            { p: [B[0], 40, B[2]], t: [0, -1, 0] },
            { p: [B[0], 22, B[2]], t: [0, -1, 0] },
          ],
          { capEnd: true, capStart: true, texel: 1 / 6 },
        ),
        "dark",
        { color: PAL.band, uv: "keep", lod },
      );
    // seam groove along the slab's crown
    if (lod === 0) {
      const g = [];
      for (let i = 0; i <= nArc; i++) {
        const th = thE + s * (span - 1.5 * D2R - ((span - 4 * D2R) * i) / nArc);
        g.push({ p: polar(rp, th, yp + 51.6) });
      }
      add(
        sweepPath(
          [
            [-2.5, -1],
            [2.5, -1],
            [2.5, 1],
            [-2.5, 1],
          ],
          g,
          { texel: 1 / 4 },
        ),
        "dark",
        { color: PAL.seam, uv: "keep", lod },
      );
    }
  }
  // docking clamp housing and the stacked docking tubes on the inner half of the end face
  for (const lod of [0, 1]) {
    add(boxIn(F, [-215, 0, 4], [230, 2 * top - 30, 36]), "dark", {
      color: PAL.band,
      texel: 1 / 8,
      lod,
    });
    for (const vk of [66, 0, -66]) {
      add(
        cylIn(F, [-215, vk, 40], "w", 30, 30, 150, lod === 0 ? 14 : 8),
        "hull",
        {
          color: PAL.greyDk,
          texel: 1 / 8,
          lod,
        },
      );
      add(
        cylIn(F, [-215, vk, 116], "w", 24, 24, 3, lod === 0 ? 14 : 8),
        "dark",
        {
          color: PAL.recess,
          texel: 1 / 4,
          lod,
        },
      );
      if (lod === 0)
        add(cylIn(F, [-215, vk, 92], "w", 34, 34, 8, 14), "dark", {
          color: PAL.bandDk,
          texel: 1 / 4,
          lod,
        });
    }
    // recessed hangar slot, lit
    add(boxIn(F, [40, -72, 3], [250, 62, 8]), "dark", {
      color: PAL.bandDk,
      texel: 1 / 6,
      lod,
    });
    {
      const b = new TriBuf();
      addQuad(b, frameToWorld(F, [40, -72, 7.6]), F.w, F.u, 232, 46, 0, 1 / 8);
      add(b.build(), "windows", { color: PAL.hangar, uv: "keep", lod });
    }
    // dark recessed panels over the outer half of the end face
    for (const [u, v, w, h] of [
      [200, 46, 200, 42],
      [190, -26, 180, 34],
      [-40, 86, 150, 28],
    ])
      add(boxIn(F, [u, v, 2], [w, h, 5]), "dark", {
        color: PAL.band,
        texel: 1 / 6,
        lod,
      });
    // claw below the outer corner
    add(
      bar(
        frameToWorld(F, [150, -top, -40]),
        frameToWorld(F, [150, -top - 90, 60]),
        32,
        28,
      ),
      "dark",
      {
        color: PAL.band,
        texel: 1 / 6,
        lod,
      },
    );
    add(boxIn(F, [150, -top - 102, 92], [76, 26, 72]), "dark", {
      color: PAL.bandDk,
      texel: 1 / 6,
      lod,
    });
    for (const du of [-24, 24])
      add(boxIn(F, [150 + du, -top - 102, 150], [14, 16, 60]), "dark", {
        color: PAL.band,
        texel: 1 / 4,
        lod,
      });
    // window row across the end face top, plus a row of tiny lights on the clamp housing
    if (lod === 0) {
      const b = new TriBuf();
      for (let u = -80; u <= 320; u += 26)
        addQuad(
          b,
          frameToWorld(F, [u, top - 18, 0.6]),
          F.w,
          F.u,
          11,
          4,
          0,
          1 / 4,
        );
      for (let v = -90; v <= 90; v += 20)
        addQuad(
          b,
          frameToWorld(F, [-320, v, 22.6]),
          F.w,
          F.u,
          8,
          3.2,
          0,
          1 / 4,
        );
      add(b.build(), "windows", { color: PAL.window, uv: "keep", lod });
    }
  }
  // Separatist insignia on a blue field covering the outer half of the roof plate
  const thM = thE + s * 13 * D2R;
  for (const lod of [0, 1]) {
    add(
      arcStrip(
        1272,
        1412,
        roofY + 0.8,
        Math.min(thM - 9 * D2R, thM + 9 * D2R),
        Math.max(thM - 9 * D2R, thM + 9 * D2R),
        6,
        { texel: 1 / 40 },
      ),
      "paint",
      {
        color: PAL.indigo,
        uv: "keep",
        lod,
      },
    );
    add(
      hexMark(polar(1342, thM, roofY + 1.6), [0, 1, 0], radialDir(thM), 62),
      "paint",
      {
        color: PAL.mark,
        uv: "keep",
        lod,
      },
    );
  }
}

// Separatist hex mark: hexagon ring, six spokes and a hub, flat, facing n
export function hexMark(c, n, along, R) {
  const b = new TriBuf();
  const N = v3.norm(n);
  const A = v3.norm(v3.mad(along, N, -v3.dot(along, N)));
  const B = v3.cross(N, A);
  const P = (r, a) => v3.mad(v3.mad(c, A, r * Math.cos(a)), B, r * Math.sin(a));
  const uv = [0, 0];
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * TAU;
    const a1 = ((i + 1) / 6) * TAU;
    b.flatQuad(P(R, a0), P(R, a1), P(R * 0.82, a1), P(R * 0.82, a0), N);
    const am = (a0 + a1) / 2;
    const d = 0.09 * R;
    const q = (r, off) => P(Math.hypot(r, off), am + Math.atan2(off, r));
    b.flatQuad(
      q(0.28 * R, -d),
      q(0.72 * R, -d),
      q(0.72 * R, d),
      q(0.28 * R, d),
      N,
    );
    b.tri(c, P(0.2 * R, a0), P(0.2 * R, a1), N, N, N, uv, uv, uv);
  }
  return b.build();
}

/** Core ship: sphere, bands, windows, towers, blue panels. */
export function buildCore(add, TEX) {
  const R = K.sphereR;
  for (const lod of [0, 1, 2]) {
    const g = new THREE.SphereGeometry(
      R,
      lod === 0 ? 56 : lod === 1 ? 28 : 14,
      lod === 0 ? 36 : lod === 1 ? 18 : 8,
    );
    // scale the sphere's own uvs to metres so plating stays even around the equator
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, uv.getX(i) * TAU * R * TEX, uv.getY(i) * Math.PI * R * TEX);
    add(g, "hull", {
      uv: "keep",
      lod,
      tint: (x, y, z, o) =>
        o
          .copy(PAL.grey)
          .multiplyScalar(
            0.94 + 0.08 * Math.max(0, Math.min(1, (y + R) / (2 * R))),
          ),
    });
    // equatorial groove (a flat dark belt at LOD 2)
    const n = lod === 0 ? 96 : lod === 1 ? 48 : 24;
    add(
      sweepArc(
        lod < 2
          ? [
              [R - 4, -14],
              [R + 6, -14],
              [R + 6, 14],
              [R - 4, 14],
            ]
          : [
              [R + 1, -14],
              [R + 1, 14],
            ],
        0,
        TAU,
        n,
        { texel: 1 / 8, closed: lod < 2 },
      ),
      "dark",
      { color: PAL.band, uv: "keep", lod },
    );
    if (lod === 2) continue;
    // latitude plating bands hugging the surface
    for (const latD of [-52, -28, 28, 52]) {
      const la = latD * D2R;
      const p = [R * Math.cos(la), R * Math.sin(la)];
      const t = [-Math.sin(la), Math.cos(la)];
      const nn = [Math.cos(la), Math.sin(la)];
      const h = 9;
      const th = 4;
      // LOD 0: a raised band with flanks; LOD 1: a flat strip lifted off the surface
      const prof =
        lod === 0
          ? [
              [p[0] - h * t[0], p[1] - h * t[1]],
              [p[0] - h * t[0] + th * nn[0], p[1] - h * t[1] + th * nn[1]],
              [p[0] + h * t[0] + th * nn[0], p[1] + h * t[1] + th * nn[1]],
              [p[0] + h * t[0], p[1] + h * t[1]],
            ]
          : [
              [p[0] - h * t[0] + 0.8 * nn[0], p[1] - h * t[1] + 0.8 * nn[1]],
              [p[0] + h * t[0] + 0.8 * nn[0], p[1] + h * t[1] + 0.8 * nn[1]],
            ];
      add(
        sweepArc(prof, 0, TAU, n, { texel: 1 / 8, closed: lod === 0 }),
        "hull",
        { color: PAL.greyDk, uv: "keep", lod },
      );
    }
    // window rows
    if (lod === 0) {
      const b = new TriBuf();
      let seed = 3;
      for (const latD of [-40, -15, 14, 40]) {
        const la = latD * D2R;
        for (let lo = 0; lo < TAU; lo += 2.6 * D2R) {
          seed = (seed * 1664525 + 1013904223) >>> 0;
          if (seed / 4294967296 < 0.3) continue;
          const nrm = [
            Math.cos(la) * Math.sin(lo),
            Math.sin(la),
            -Math.cos(la) * Math.cos(lo),
          ];
          addQuad(
            b,
            v3.scale(nrm, R + 0.6),
            nrm,
            tangentDir(lo),
            9,
            3.6,
            0,
            1 / 4,
          );
        }
      }
      add(b.build(), "windows", { color: PAL.window, uv: "keep", lod });
    } else {
      for (const latD of [-40, -15, 14, 40]) {
        const la = latD * D2R;
        const p = [R * Math.cos(la), R * Math.sin(la)];
        const t = [-Math.sin(la), Math.cos(la)];
        const prof = [
          [p[0] + 2.4 * t[0] + 0.6, p[1] + 2.4 * t[1]],
          [p[0] - 2.4 * t[0] + 0.6, p[1] - 2.4 * t[1]],
        ];
        add(
          sweepArc(prof, 0, TAU, n, { closed: false, texel: 1 / 4 }),
          "windows",
          {
            color: new THREE.Color(PAL.window).multiplyScalar(0.55),
            uv: "keep",
            lod,
          },
        );
      }
    }
    // meridian seams between the plating latitudes
    {
      const b = new TriBuf();
      for (let lo = 0; lo < 360; lo += 30)
        spherePatch(
          R,
          -62 * D2R,
          62 * D2R,
          (lo - 0.35) * D2R,
          (lo + 0.35) * D2R,
          lod === 0 ? 14 : 8,
          1,
          0.5,
          [0, 0, 0],
          1 / 8,
          b,
        );
      add(b.build(), "dark", { color: PAL.seam, uv: "keep", lod });
    }
    // blue chevron panels on the sphere: wide at one latitude, tapering toward the other
    const taper = (a, b2, c, d) => [
      (t) => (a + (c - a) * t) * D2R,
      (t) => (b2 + (d - b2) * t) * D2R,
    ];
    const patches = [
      [6, 26, ...taper(34, 70, 44, 60)],
      [6, 26, ...taper(290, 326, 300, 316)],
      [-34, -16, ...taper(158, 202, 168, 192)],
      [28, 48, ...taper(170, 190, 160, 200)],
      [-48, -30, ...taper(42, 60, 36, 66)],
      [-48, -30, ...taper(300, 318, 294, 324)],
    ];
    for (const [la0, la1, lo0, lo1] of patches)
      add(
        spherePatch(
          R,
          la0 * D2R,
          la1 * D2R,
          lo0,
          lo1,
          lod === 0 ? 4 : 2,
          lod === 0 ? 8 : 4,
          0.9,
          [0, 0, 0],
          1 / 40,
        ).build(),
        "paint",
        {
          color: PAL.indigo,
          uv: "keep",
          lod,
        },
      );
  }
  // polar caps, bridge pedestal + tower + T-bar, dish, twin aft towers, ventral pedestal
  const capY = Math.sqrt(R * R - 100 * 100);
  for (const lod of [0, 1, 2]) {
    const seg = lod === 0 ? 24 : lod === 1 ? 12 : 8;
    const cy = (r0, r1, h, y, color, mat = "hull") => {
      const g = new THREE.CylinderGeometry(r0, r1, h, seg);
      g.translate(0, y, 0);
      add(g, mat, { color, texel: 1 / 10, lod });
    };
    cy(100, 104, 16, capY + 6, PAL.greyLt);
    cy(48, 54, 52, capY + 14 + 26, PAL.greyDk);
    const bx = (sx, sy, sz, x, y, z, color, mat = "hull") => {
      const g = new THREE.BoxGeometry(sx, sy, sz);
      g.translate(x, y, z);
      add(g, mat, { color, texel: 1 / 10, lod });
    };
    const towerBase = capY + 66;
    bx(46, 82, 46, 0, towerBase + 41, 0, PAL.grey);
    bx(176, 20, 30, 0, towerBase + 92, 0, PAL.greyLt);
    bx(30, 14, 46, 0, towerBase + 109, 0, PAL.greyDk);
    // twin aft towers where the gantry from the stern lands
    for (const sx of [-1, 1]) {
      const zt = 190;
      const xt = sx * 64;
      const ys = Math.sqrt(R * R - xt * xt - zt * zt);
      bx(46, 428 - (ys - 12), 60, xt, (ys - 12 + 428) / 2, zt, PAL.greyDk);
      if (lod < 2) bx(30, 18, 40, xt, 436, zt, PAL.grey);
    }
    // ventral cap and pedestal
    cy(100, 104, 16, -(capY + 6), PAL.greyShade);
    cy(60, 66, 40, -(capY + 14 + 20), PAL.greyShade);
    if (lod < 2) {
      bx(120, 40, 90, 0, -(capY + 54), 0, PAL.greyDk);
      // sensor dish on the T-bar
      const d = new THREE.CylinderGeometry(22, 22, 4, seg);
      d.rotateX(Math.PI / 2 - 0.5);
      d.translate(60, towerBase + 122, -10);
      add(d, "hull", { color: PAL.greyLt, texel: 1 / 6, lod });
      add(
        tube([60, towerBase + 102, 0], [60, towerBase + 118, -8], 3, 3, 6),
        "dark",
        {
          color: PAL.band,
          texel: 1 / 3,
          lod,
        },
      );
    }
  }
  // windows on the tower and T-bar
  {
    const b = new TriBuf();
    const y0 = capY + 66 + 92;
    for (let x = -80; x <= 80; x += 12) {
      addQuad(b, [x, y0, -15.4], [0, 0, -1], [1, 0, 0], 8, 4, 0, 1 / 4);
      addQuad(b, [x, y0, 15.4], [0, 0, 1], [1, 0, 0], 8, 4, 0, 1 / 4);
    }
    for (let y = capY + 80; y < capY + 140; y += 16)
      for (const sx of [-1, 1])
        addQuad(b, [sx * 23.4, y, 0], [sx, 0, 0], [0, 0, 1], 24, 3.5, 0, 1 / 4);
    add(b.build(), "windows", { color: PAL.windowCool, uv: "keep", lod: 0 });
  }
}

/** Neck between the sphere and the stern of the ring, its deck and the raised gantry. */
export function buildNeck(add, TEX) {
  const top = K.halfH;
  const deckY = top + 30; // deck slab top
  for (const lod of [0, 1, 2]) {
    // wide flat neck, slightly narrower where it meets the sphere
    const prof = superellipse(
      lod === 0 ? 24 : lod === 1 ? 14 : 8,
      3,
      200,
      top - 4,
    );
    add(
      sweepPath(
        prof,
        [
          { p: [0, 4, 250], t: [0, 0, 1], sx: 0.86 },
          { p: [0, 4, 560], t: [0, 0, 1] },
          { p: [0, 4, 900], t: [0, 0, 1] },
        ],
        { texel: TEX, capStart: true },
      ),
      "hull",
      {
        uv: "keep",
        lod,
        tint: (x, y, z, o) =>
          o.copy(PAL.grey).multiplyScalar(y < -40 ? 0.9 : 1),
      },
    );
    // deck slab on top of the neck
    const g = new THREE.BoxGeometry(300, 34, 560);
    g.translate(0, deckY - 17, 620);
    add(g, "hull", { color: PAL.greyLt, texel: TEX, lod });
    if (lod === 2) continue;
    // dark collar rings
    for (const z of [420, 700])
      add(
        sweepPath(
          superellipse(lod === 0 ? 24 : 14, 3, 206, top + 2),
          [
            { p: [0, 4, z - 10], t: [0, 0, 1] },
            { p: [0, 4, z + 10], t: [0, 0, 1] },
          ],
          { capStart: true, capEnd: true, texel: 1 / 8 },
        ),
        "dark",
        { color: PAL.band, uv: "keep", lod },
      );
    // window strips along the deck flanks and small deck houses
    {
      const b = new TriBuf();
      for (const sx of [-1, 1]) {
        if (lod === 0)
          for (let z = 360; z < 880; z += 24)
            addQuad(
              b,
              [sx * 150.4, deckY - 14, z],
              [sx, 0, 0],
              [0, 0, 1],
              14,
              4,
              0,
              1 / 4,
            );
        else
          addQuad(
            b,
            [sx * 150.4, deckY - 14, 620],
            [sx, 0, 0],
            [0, 0, 1],
            520,
            3,
            0,
            1 / 4,
          );
      }
      add(b.build(), "windows", { color: PAL.window, uv: "keep", lod });
    }
    for (const [x, z, w, h, l] of [
      [-70, 420, 50, 26, 90],
      [64, 520, 40, 34, 60],
      [-40, 760, 70, 20, 120],
      [80, 820, 30, 40, 40],
    ]) {
      const g2 = new THREE.BoxGeometry(w, h, l);
      g2.translate(x, deckY + h / 2, z);
      add(g2, "hull", { color: PAL.greyDk, texel: 1 / 12, lod });
    }
  }
  // raised gantry from the stern block to the twin towers on the sphere
  for (const lod of [0, 1]) {
    add(bar([0, 424, 230], [0, 424, 1290], 34, 26), "hull", {
      color: PAL.greyDk,
      texel: 1 / 10,
      lod,
    });
    for (const z of [520, 800, 1060])
      add(bar([0, deckY, z], [0, 412, z], 22, 22), "dark", {
        color: PAL.band,
        texel: 1 / 8,
        lod,
      });
    if (lod === 0)
      for (let z = 260; z < 1280; z += 60)
        add(bar([-22, 416, z], [22, 416, z], 4, 8), "dark", {
          color: PAL.bandDk,
          texel: 1 / 4,
          lod,
        });
  }
}

/** Stern block on the ring deck with the spire cluster, disc and hatches. */
export function buildSternBlock(add, TEX) {
  const top = K.halfH;
  const a0 = 152 * D2R;
  const a1 = 208 * D2R;
  const blockTop = top + 100;
  const prof = [
    [900, top],
    [1440, top],
    [1440, top + 62],
    [1405, blockTop],
    [935, blockTop],
    [900, top + 62],
  ];
  for (const lod of [0, 1, 2]) {
    const n = lod === 0 ? 24 : lod === 1 ? 12 : 6;
    add(
      sweepArc(prof, a0, a1, n, { capStart: true, capEnd: true, texel: TEX }),
      "hull",
      {
        color: PAL.greyLt,
        uv: "keep",
        lod,
      },
    );
    // dark band and window strip on the aft face of the block
    if (lod < 2) {
      add(
        sweepArc(
          [
            [1441, top + 14],
            [1441, top + 34],
          ],
          a0 + 0.01,
          a1 - 0.01,
          n,
          { closed: false, texel: 1 / 8 },
        ),
        "dark",
        {
          color: PAL.band,
          uv: "keep",
          lod,
        },
      );
      add(
        sweepArc(
          [
            [1441.5, top + 44],
            [1441.5, top + 49],
          ],
          a0 + 0.02,
          a1 - 0.02,
          n,
          { closed: false, texel: 1 / 4 },
        ),
        "windows",
        {
          color: new THREE.Color(PAL.window).multiplyScalar(
            lod === 0 ? 1 : 0.6,
          ),
          uv: "keep",
          lod,
        },
      );
      // circumferential seam on the block top
      add(
        arcStrip(1160, 1166, blockTop + 0.6, a0 + 0.02, a1 - 0.02, n, {
          texel: 1 / 8,
        }),
        "dark",
        { color: PAL.bandDk, uv: "keep", lod },
      );
    }
  }
  // spires: stacked boxes, tallest at the centre
  const spires = [
    [180, 1300, 36, 440],
    [176, 1180, 30, 380],
    [185, 1235, 28, 320],
    [172, 1330, 24, 260],
    [189, 1350, 26, 350],
    [168, 1240, 22, 210],
    [192, 1150, 22, 230],
    [180, 1080, 20, 190],
    [163, 1320, 20, 270],
    [196, 1290, 20, 250],
    [158, 1200, 18, 200],
    [201, 1210, 18, 220],
    [174, 1400, 16, 170],
    [187, 1120, 16, 160],
  ];
  spires.forEach(([thD, r, w, h], i) => {
    const th = thD * D2R;
    const c = polar(r, th, 0);
    const u = radialDir(th);
    const t = tangentDir(th);
    const F = { o: [c[0], blockTop, c[2]], u, v: [0, 1, 0], w: t };
    for (const lod of [0, 1, 2]) {
      if (lod === 2 && i > 2) break;
      if (lod === 2) {
        add(boxIn(F, [0, h / 2, 0], [w, h, w]), "hull", {
          color: PAL.grey,
          texel: 1 / 12,
          lod,
        });
        continue;
      }
      // tapering pale tower: plinth, shaft, upper stage, mast, with dark collars between the stages
      add(boxIn(F, [0, 0.1 * h, 0], [w * 1.5, 0.2 * h, w * 1.5]), "hull", {
        color: PAL.greyDk,
        texel: 1 / 24,
        lod,
      });
      add(boxIn(F, [0, 0.42 * h, 0], [w, 0.46 * h, w]), "hull", {
        color: PAL.greyLt,
        texel: 1 / 24,
        lod,
      });
      add(boxIn(F, [0, 0.76 * h, 0], [w * 0.66, 0.24 * h, w * 0.66]), "hull", {
        color: PAL.greyLt,
        texel: 1 / 24,
        lod,
      });
      add(boxIn(F, [0, 0.94 * h, 0], [w * 0.3, 0.14 * h, w * 0.3]), "hull", {
        color: PAL.greyLt,
        texel: 1 / 24,
        lod,
      });
      add(boxIn(F, [0, 1.03 * h, 0], [w * 0.1, 0.06 * h, w * 0.1]), "dark", {
        color: PAL.band,
        texel: 1 / 4,
        lod,
      });
      if (lod === 0) {
        for (const [yy, ww] of [
          [0.2, 1.0],
          [0.65, 0.66],
          [0.88, 0.3],
        ])
          add(
            boxIn(F, [0, yy * h, 0], [w * ww * 1.12, 0.018 * h, w * ww * 1.12]),
            "dark",
            { color: PAL.bandDk, texel: 1 / 4, lod },
          );
        // service box on the shaft and a few lit slits
        add(
          boxIn(F, [w * 0.55, 0.45 * h, 0], [w * 0.3, 0.16 * h, w * 0.5]),
          "dark",
          { color: PAL.band, texel: 1 / 4, lod },
        );
        const b = new TriBuf();
        for (let y = 0.3 * h; y < 0.62 * h; y += 0.11 * h) {
          addQuad(
            b,
            frameToWorld(F, [0, y, w * 0.501]),
            t,
            u,
            w * 0.5,
            2.4,
            0,
            1 / 4,
          );
          addQuad(
            b,
            frameToWorld(F, [0, y, -w * 0.501]),
            v3.scale(t, -1),
            u,
            w * 0.5,
            2.4,
            0,
            1 / 4,
          );
        }
        add(b.build(), "windows", { color: PAL.windowCool, uv: "keep", lod });
      }
    }
  });
  // large disc antenna on a mast, facing aft, and a smaller one facing forward
  for (const lod of [0, 1]) {
    const seg = lod === 0 ? 28 : 14;
    const c = polar(1200, 180 * D2R, blockTop);
    add(tube(c, [c[0], c[1] + 130, c[2]], 9, 9, 8), "dark", {
      color: PAL.band,
      texel: 1 / 4,
      lod,
    });
    const d = new THREE.CylinderGeometry(84, 84, 10, seg);
    d.rotateX(Math.PI / 2);
    d.translate(c[0], c[1] + 150, c[2] + 20);
    add(d, "hull", { color: PAL.greyLt, texel: 1 / 10, lod });
    const hub = new THREE.CylinderGeometry(14, 14, 14, seg);
    hub.rotateX(Math.PI / 2);
    hub.translate(c[0], c[1] + 150, c[2] + 30);
    add(hub, "dark", { color: PAL.bandDk, texel: 1 / 4, lod });
    const c2 = polar(1000, 186 * D2R, blockTop);
    add(tube(c2, [c2[0], c2[1] + 80, c2[2]], 6, 6, 8), "dark", {
      color: PAL.band,
      texel: 1 / 4,
      lod,
    });
    const d2 = new THREE.CylinderGeometry(40, 40, 8, seg);
    d2.rotateX(Math.PI / 2 - 0.6);
    d2.translate(c2[0], c2[1] + 90, c2[2] - 8);
    add(d2, "hull", { color: PAL.greyLt, texel: 1 / 8, lod });
  }
  // hatches and low houses on the block top (LOD 0)
  for (const [thD, r, w, l, h] of [
    [160, 1120, 40, 60, 14],
    [200, 1130, 50, 40, 18],
    [158, 1380, 30, 70, 10],
    [203, 1390, 36, 50, 12],
    [170, 1000, 60, 30, 20],
    [191, 990, 44, 44, 16],
  ]) {
    const th = thD * D2R;
    const c = polar(r, th, blockTop);
    const F = { o: c, u: radialDir(th), v: [0, 1, 0], w: tangentDir(th) };
    add(boxIn(F, [0, h / 2, 0], [w, h, l]), "hull", {
      color: PAL.greyDk,
      texel: 1 / 8,
      lod: 0,
    });
  }
}

/**
 * Six engine pods hugging the stern of the ring wall, each a chamfered housing in the local radial
 * frame with a recessed mouth and three nozzles; returns the engines[] entries for the framework.
 */
export function buildEngines(add, engines) {
  const pods = [-27, -16, -5, 5, 16, 27];
  const H = 2 * K.wallY - 14; // pod height, just inside the wall height
  for (const dD of pods) {
    const th = Math.PI + dD * D2R;
    const F = {
      o: polar(K.rOut - 24, th, 0),
      u: radialDir(th),
      v: [0, 1, 0],
      w: tangentDir(th),
    };
    // rounded-slab housing swept radially outward from inside the wall to the mouth
    const slab = (u0, u1, hw, hh, rc, k, mat, color, lod, texel) =>
      add(
        sweepPath(
          roundedRect(hw, hh, rc, k),
          [
            { p: frameToWorld(F, [u0, 0, 0]), t: F.u },
            { p: frameToWorld(F, [u1, 0, 0]), t: F.u },
          ],
          { capStart: true, capEnd: true, texel },
        ),
        mat,
        { color, uv: "keep", lod },
      );
    for (const lod of [0, 1, 2]) {
      const k = lod === 0 ? 3 : lod === 1 ? 2 : 1;
      slab(0, 128, 123, H / 2, 26, k, "hull", PAL.greyDk, lod, 1 / 24);
      if (lod === 2) continue;
      // lip frame around the mouth and the dark recessed mouth plate
      slab(116, 134, 129, H / 2 + 4, 28, k, "hull", PAL.greyShade, lod, 1 / 12);
      slab(127, 135, 116, H / 2 - 12, 22, k, "dark", PAL.recess, lod, 1 / 6);
      const seg = lod === 0 ? 24 : 12;
      for (const wk of [-78, 0, 78]) {
        add(cylIn(F, [128, 0, wk], "u", 34, 30, 26, seg, true), "dark", {
          color: PAL.nozzle,
          texel: 1 / 6,
          lod,
        });
        if (lod === 0)
          add(cylIn(F, [106, 0, wk], "u", 30, 11, 44, seg, true), "dark", {
            color: PAL.nozzleDk,
            texel: 1 / 6,
            lod,
          });
        const disc = new THREE.CircleGeometry(24, seg);
        disc.rotateY(Math.PI - th); // +Z normal -> radial outward
        const c = frameToWorld(F, [118, 0, wk]);
        disc.translate(c[0], c[1], c[2]);
        add(disc, "engineGlow", { color: PAL.glow, uv: "keep", lod });
      }
      // fuel lines and a spine along the pod top
      if (lod === 0) {
        for (const wk of [-70, 0, 70])
          add(
            tube(
              frameToWorld(F, [-10, H / 2 + 5, wk]),
              frameToWorld(F, [112, H / 2 + 5, wk]),
              6,
              6,
              8,
            ),
            "dark",
            {
              color: PAL.band,
              texel: 1 / 3,
              lod,
            },
          );
        add(boxIn(F, [40, H / 2 + 6, 0], [90, 12, 40]), "dark", {
          color: PAL.bandDk,
          texel: 1 / 4,
          lod,
        });
      }
    }
    for (const wk of [-78, 0, 78])
      engines.push({ pos: frameToWorld(F, [140, 0, wk]), r: 32 });
  }
}

// disc sensor / battery emplacement on the outer bevel (static greeble)
export function buildDishBattery(add, th, y, up) {
  const c = polar(1512, th, y);
  const u = radialDir(th);
  const t = tangentDir(th);
  const F = { o: c, u, v: [0, up, 0], w: t };
  for (const lod of [0, 1]) {
    add(boxIn(F, [0, 20, 0], [52, 40, 46]), "hull", {
      color: PAL.greyDk,
      texel: 1 / 8,
      lod,
    });
    add(boxIn(F, [-38, 12, 0], [30, 24, 36]), "dark", {
      color: PAL.band,
      texel: 1 / 6,
      lod,
    });
    const mastTop = frameToWorld(F, [8, 62, 0]);
    add(tube(frameToWorld(F, [8, 38, 0]), mastTop, 5, 5, 6), "dark", {
      color: PAL.band,
      texel: 1 / 3,
      lod,
    });
    const d = new THREE.CylinderGeometry(34, 34, 6, lod === 0 ? 20 : 10);
    // disc faces outward and up at 45°
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(u[0], up * 1, u[2]).normalize(),
    );
    d.applyQuaternion(q);
    d.translate(
      mastTop[0] + u[0] * 10,
      mastTop[1] + up * 10,
      mastTop[2] + u[2] * 10,
    );
    add(d, "hull", { color: PAL.greyLt, texel: 1 / 6, lod });
  }
}

// arc-shaped recessed hangar mouth with lit interior on a cylindrical wall at radius r
export function wallHangar(add, r, th, y, halfArc, halfH, lod, inward, color) {
  const a0 = th - halfArc;
  const a1 = th + halfArc;
  // frame: dark box around the opening, set into the wall
  const rF0 = inward ? r - 2 : r - 12;
  const rF1 = inward ? r + 12 : r + 2;
  add(
    arcBox(
      rF0,
      rF1,
      y - halfH - 4,
      y + halfH + 4,
      a0 - 0.002,
      a1 + 0.002,
      lod === 0 ? 2 : 1,
      1 / 8,
    ),
    "dark",
    {
      color: PAL.bandDk,
      texel: 1 / 8,
      uv: "keep",
      lod,
    },
  );
  const b = new TriBuf();
  const rr = inward ? r - 2.6 : r + 2.6;
  const prof = inward
    ? [
        [rr, y + halfH],
        [rr, y - halfH],
      ]
    : [
        [rr, y - halfH],
        [rr, y + halfH],
      ];
  sweepArc(prof, a0, a1, 2, { closed: false, texel: 1 / 8, buf: b });
  add(b.build(), "windows", { color, uv: "keep", lod });
}
