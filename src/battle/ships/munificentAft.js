// Neck and aft hull of the Munificent-class frigate: the dark machinery neck with its row of reactor
// ports and lit bays, the dome (164 m arch: two armour shells either side of the dark spine trench,
// their front edge raked back from the eave to the top over the reactor sphere, eave soffits over the
// shallow dark lower hull and keel), the shells thinning past the bridge tower into the inward-curving
// stern blades, the thruster block between them, the tiered bridge tower, and the Banking Clan livery
// (blue bands, the white hexagon with the Confederacy emblem).
import * as THREE from "three";
import { bar, loftZ, quadAt, roundedRect, smoothstep, tubeZ } from "./munificentGeo.js";
import { bar2D, hexagon, loftStrips, ribbon } from "./munificentHull.js";
import { antennaCluster, dishMast, slotRow, slotWindow } from "./munificentDetail.js";
import { nozzleBell, sternSpill } from "./munificentEngines.js";
import { fanPoly } from "./munificentBow.js";
import {
  A_RIM,
  BLUE,
  BLUE_DK,
  BRIDGE,
  CORE,
  D2R,
  DOME_ARC,
  HULL,
  HULL_DK,
  HW,
  MACH,
  MACH_DK,
  MACH_LT,
  RIDGE_H,
  SHELL,
  SHELL_DK,
  SHELL_TH,
  SOOT,
  WHITE,
  WINDOW,
  Y,
  Z,
  domeNormal,
  domePoint,
  domeSection,
  domeTop,
  plankTone,
  shellFrontZ,
} from "./munificentSpec.js";

const TEX = 1 / 30;
const NECK_Z0 = -150; // the neck core starts just inside the hood's aft rim
const NECK_Z1 = 44; // and runs on under the raked shell edge

// shell surface point by arc length s (metres from the eave)
function surf(z, s, side, lift = 0) {
  return domePoint(z, DOME_ARC.aOfS(s), side, lift);
}

// dome plating tint: plank tones around the arch, grime along the eave, soot on the stern blades
export const domeTint = (side) => (x, y, z, o) => {
  const s = domeSection(z);
  const a = Math.atan2(y - s.yE, side * x - s.cx) / D2R;
  o.copy(HULL).multiplyScalar(plankTone(a));
  o.multiplyScalar(1 - 0.16 * (1 - smoothstep(-2, 22, a)));
  o.lerp(SOOT, 0.3 * smoothstep(300, 380, z) * (1 - smoothstep(20, 60, a)));
  o.lerp(SOOT, 0.06 * smoothstep(60, 120, z) * (1 - smoothstep(0, 90, z - 60)));
};

// ring of the starboard/port shell between arch angles a0..a1 (m points); the point order is chosen
// so that lofting along +z gives outward normals (reverse = inner face)
function shellRing(z, side, m, lift = 0, reverse = false, a0 = 0, a1 = A_RIM) {
  const out = [];
  for (let j = 0; j < m; j++) out.push(domePoint(z, a0 + ((a1 - a0) * j) / (m - 1), side, lift));
  if (side < 0 !== reverse) out.reverse();
  return out;
}
// ring across the raked front of the shell: t = 0 is the edge itself (eave forward, top set back),
// t = 1 the first full station at Z.domeFull
function frontRing(t, side, m, lift = 0, reverse = false, a0 = 0, a1 = A_RIM) {
  const out = [];
  for (let j = 0; j < m; j++) {
    const a = a0 + ((a1 - a0) * j) / (m - 1);
    const z0 = shellFrontZ(a);
    out.push(domePoint(z0 + (Z.domeFull - z0) * t, a, side, lift));
  }
  if (side < 0 !== reverse) out.reverse();
  return out;
}
const FRONT_T = { 0: [0, 0.2, 0.42, 0.66], 1: [0, 0.35, 0.7], 2: [0, 0.5] };

// polygon (u along +z, v along the arc) laid onto the shell around (zC, sC): fan from the centroid,
// each triangle subdivided k x k so the patch follows the curvature
function patch(add, poly, zC, sC, side, lift, k, mat, opts) {
  let cu = 0;
  let cv = 0;
  for (const [u, v] of poly) {
    cu += u / poly.length;
    cv += v / poly.length;
  }
  const P = (u, v) => surf(zC + u, sC + v, side, lift);
  const pos = [];
  const tri = (a, b, c) => pos.push(...P(...a), ...P(...b), ...P(...c));
  const sub = (A, B, C) => {
    for (let i = 0; i < k; i++)
      for (let j = 0; j < k - i; j++) {
        const p = (ia, ib) => {
          const wa = ia / k;
          const wb = ib / k;
          const wc = 1 - wa - wb;
          return [A[0] * wa + B[0] * wb + C[0] * wc, A[1] * wa + B[1] * wb + C[1] * wc];
        };
        tri(p(i, j), p(i + 1, j), p(i, j + 1));
        if (j < k - i - 1) tri(p(i + 1, j), p(i + 1, j + 1), p(i, j + 1));
      }
  };
  for (let i = 0; i < poly.length; i++) sub([cu, cv], poly[i], poly[(i + 1) % poly.length]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  const n = domeNormal(zC, DOME_ARC.aOfS(sC), side);
  const g0 = g.attributes.normal;
  if (g0.getX(0) * n[0] + g0.getY(0) * n[1] + g0.getZ(0) * n[2] < 0) {
    const p = g.attributes.position;
    for (let t = 0; t < p.count; t += 3) {
      const x = p.getX(t + 1);
      const y = p.getY(t + 1);
      const z = p.getZ(t + 1);
      p.setXYZ(t + 1, p.getX(t + 2), p.getY(t + 2), p.getZ(t + 2));
      p.setXYZ(t + 2, x, y, z);
    }
    g.computeVertexNormals();
  }
  add(g, mat, { texel: 1 / 8, ...opts });
}

// band between arc lengths sLo(z)..sHi(z) along the given z stations, m points across
function band(add, zs, sLo, sHi, side, m, mat, opts, lift = 0.45) {
  const rings = zs.map((z) => {
    const lo = sLo(z);
    const hi = sHi(z);
    const out = [];
    for (let j = 0; j < m; j++) out.push(surf(z, lo + ((hi - lo) * j) / (m - 1), side, lift));
    if (side < 0) out.reverse();
    return out;
  });
  add(loftStrips(rings, { texel: 1 / 8 }), mat, { uv: "keep", ...opts });
}

export function buildAft(add, rand, engines) {
  // ---------------------------------------------------------------------------
  // neck: dark machinery core with frame ribs, the row of reactor ports, tall lit bays and the antenna
  // deck; it runs on under the raked shell edge and carries the reactor sphere at its aft end
  // ---------------------------------------------------------------------------
  const neckTint = (x, y, z, o) => {
    o.set(MACH).multiplyScalar(0.82 * plankTone(y / 2.5 + 50));
    o.lerp(SOOT, 0.25 * (1 - smoothstep(Y.neckBot, Y.neckBot + 30, y)));
  };
  for (const lod of [0, 1, 2]) {
    const yc = (Y.neckTop + Y.neckBot) / 2;
    const hh = (Y.neckTop - Y.neckBot) / 2;
    add(
      loftZ(
        roundedRect(lod === 0 ? 3 : 1, 0.12, 0.12),
        [
          { z: NECK_Z0, sx: HW.neck, sy: hh, y: yc },
          { z: NECK_Z1, sx: HW.neck, sy: hh, y: yc },
        ],
        { capStart: true, capEnd: true, flat: true, texel: 1 / 12 },
      ),
      "dark",
      { uv: "keep", lod, tint: neckTint },
    );
    // reactor sphere standing in the dome's raked opening (ICS: a big sphere with an orange collar
    // round its forward face)
    {
      const sph = new THREE.SphereGeometry(30, lod === 0 ? 32 : lod === 1 ? 16 : 8, lod === 0 ? 20 : 9);
      sph.translate(0, 30, 34);
      add(sph, "dark", {
        texel: 1 / 8,
        lod,
        tint: (x, y, z, o) => o.set(MACH_LT).multiplyScalar(0.7 + 0.3 * smoothstep(0, 50, y)),
      });
      if (lod < 2) {
        const ring = new THREE.TorusGeometry(27.5, 2.4, 8, lod === 0 ? 36 : 16);
        ring.translate(0, 30, 22);
        add(ring, "paint", { texel: 1 / 6, lod, color: 0xb0603a });
      }
    }
    // deck ledges: the wing plane runs aft along both flanks of the neck as a flat shelf
    for (const side of [-1, 1]) {
      add(new THREE.BoxGeometry(11, 2.4, 160).translate(side * (HW.neck + 4.5), Y.wing - 0.4, -66), "hull", {
        texel: 1 / 6,
        lod,
        color: HULL_DK,
      });
      if (lod < 2)
        for (let k = 0; k < 7; k++)
          add(new THREE.BoxGeometry(2, 5, 2).translate(side * (HW.neck + 9), Y.wing - 4, -140 + k * 24), "dark", {
            texel: 1 / 3,
            lod,
            color: MACH_DK,
          });
    }
    // antenna deck ridge along the top
    add(new THREE.BoxGeometry(34, 10, 140).translate(0, Y.neckTop + 5, -68), "hull", {
      texel: 1 / 8,
      lod,
      color: HULL_DK,
    });
    if (lod === 2) continue;
    for (const side of [-1, 1]) {
      add(new THREE.BoxGeometry(18, 6, 96).translate(side * 27, Y.neckTop + 3, -72), "dark", {
        texel: 1 / 6,
        lod,
        color: MACH_LT,
      });
      // frame ribs standing proud of the flank every 24 m
      for (let k = 0; k < 8; k++) {
        const z = -140 + 24 * k;
        add(new THREE.BoxGeometry(2.4, Y.neckTop - Y.neckBot - 4, 3.2).translate(side * (HW.neck + 0.8), yc, z), "dark", {
          texel: 1 / 4,
          lod,
          color: MACH_LT,
        });
      }
      // reactor ports: octagonal frame, recessed dark disc, lit ring (WSMI: a row of six)
      for (let k = 0; k < 6; k++) {
        const z = -128 + 20 * k;
        const fr = new THREE.CylinderGeometry(7.8, 7.8, 1.8, 8);
        fr.rotateZ(Math.PI / 2);
        fr.rotateX(Math.PI / 8);
        fr.translate(side * (HW.neck + 0.9), -6, z);
        add(fr, "dark", { texel: 1 / 4, lod, color: MACH_LT });
        const disc = new THREE.CylinderGeometry(5.9, 5.9, 2.4, lod === 0 ? 16 : 8);
        disc.rotateZ(Math.PI / 2);
        disc.translate(side * (HW.neck + 0.9), -6, z);
        add(disc, "dark", { texel: 1 / 4, lod, color: CORE });
        if (lod === 0) {
          const ring = new THREE.TorusGeometry(4.1, 0.45, 6, 16);
          ring.rotateY(Math.PI / 2);
          ring.translate(side * (HW.neck + 2.2), -6, z);
          add(ring, "windows", { lod, color: 0x9fd0ff });
        }
      }
      // tall lit bays low on the flank
      for (let k = 0; k < 7; k++)
        slotWindow(add, {
          c: [side * HW.neck, -28, -128 + 19 * k],
          n: [side, 0, 0],
          along: [0, 0, 1],
          len: 9,
          h: 12,
          lod,
          panes: 2,
          glow: 0x9fc4b0,
          rim: MACH_DK,
        });
      // conduits along the flank
      for (const y of [8, 14])
        add(tubeZ(1.6, 1.6, 180, 8, side * (HW.neck + 1.1), y, -56, false), "dark", {
          texel: 1 / 4,
          lod,
          color: MACH_DK,
        });
    }
    // tanks and housings on the antenna deck
    for (const [z, r] of [
      [-134, 3.6],
      [-104, 4.2],
      [-58, 3.6],
      [-34, 4.2],
    ]) {
      const t = new THREE.CylinderGeometry(r, r, 26, lod === 0 ? 12 : 8);
      t.rotateZ(Math.PI / 2);
      t.translate(0, Y.neckTop + 10 + r * 0.8, z);
      add(t, "dark", { texel: 1 / 5, lod, color: MACH_LT });
    }
    for (const [x, z, w, h, l] of [
      [-9, -88, 10, 6, 14],
      [8, -120, 8, 4, 10],
      [10, -46, 9, 5, 12],
      [-7, -14, 12, 7, 10],
    ])
      add(new THREE.BoxGeometry(w, h, l).translate(x, Y.neckTop + 10 + h / 2, z), "dark", {
        texel: 1 / 5,
        lod,
        color: MACH,
      });
    // antenna forest on the ridge
    for (const z of [-124, -74, -24])
      antennaCluster(add, {
        base: [0, Y.neckTop + 10, z],
        up: [0, 1, 0],
        scale: 0.9,
        lod,
        mast: MACH_DK,
        plate: HULL_DK,
      });
    for (const side of [-1, 1])
      dishMast(add, {
        base: [side * 28, Y.neckTop + 6, -50],
        up: [0, 1, 0],
        height: 12,
        aim: [side * 0.4, 0.75, -0.55],
        r: 6,
        lod,
        mast: MACH_DK,
        dish: HULL_DK,
      });
    if (lod === 0)
      for (let k = 0; k < 14; k++) {
        const x = (rand() - 0.5) * 50;
        const z = -138 + rand() * 132;
        const h = 6 + rand() * 18;
        add(bar([x, Y.neckTop + 10, z], [x, Y.neckTop + 10 + h, z], 0.5, 0.5), "dark", {
          texel: 1 / 3,
          lod,
          color: MACH_DK,
        });
      }
  }

  // ---------------------------------------------------------------------------
  // dome: shells with the raked front edge that become the stern blades, the dark raked bulkhead in
  // the opening, trench, soffits, lower hull, keel, stern block
  // ---------------------------------------------------------------------------
  const shellZ = {
    0: [
      Z.domeFull, 85, 100, 120, 145, 170, 195, 215, Z.split, 250, 265, 280, 295, 310, 325, 340, 355,
      370, 385, 398, 406, Z.tip,
    ],
    1: [Z.domeFull, 100, 140, 180, 215, Z.split, 265, 295, 325, 355, 385, Z.tip],
    2: [Z.domeFull, 150, Z.split, 290, 350, Z.tip],
  };
  for (const lod of [0, 1, 2]) {
    const m = lod === 0 ? 21 : lod === 1 ? 11 : 6;
    const zs = shellZ[lod];
    for (const side of [-1, 1]) {
      add(
        loftStrips(
          [...FRONT_T[lod].map((t) => frontRing(t, side, m)), ...zs.map((z) => shellRing(z, side, m))],
          { texel: TEX },
        ),
        "hull",
        { uv: "keep", lod, tint: domeTint(side) },
      );
      // inner faces of the blades, the raked front edge, and the trench-side rim / eave edge strips
      const zIn = zs.filter((z) => z >= 215);
      if (lod < 2)
        add(loftStrips(zIn.map((z) => shellRing(z, side, m, -SHELL_TH, true)), { texel: 1 / 8 }), "dark", {
          uv: "keep",
          lod,
          tint: (x, y, z, o) => o.set(MACH_DK).multiplyScalar(0.75 + 0.25 * smoothstep(250, 330, z)),
        });
      add(
        loftStrips([frontRing(0, side, m), frontRing(0, side, m, -SHELL_TH)], {
          texel: 1 / 6,
          orient: [0, 20, 130],
        }),
        "dark",
        { uv: "keep", lod, color: MACH_DK },
      );
      const rimZ = [shellFrontZ(A_RIM), ...zs];
      add(
        loftStrips(
          rimZ.map((z) => [domePoint(z, A_RIM, side, 0), domePoint(z, A_RIM, side, -SHELL_TH)]),
          { texel: 1 / 6, orient: [side * 200, -100, 200] },
        ),
        "dark",
        { uv: "keep", lod, color: MACH_DK },
      );
      const eaveZ = [Z.neckEnd, ...zs];
      add(
        loftStrips(
          eaveZ.map((z) => [domePoint(z, 0, side, 0), domePoint(z, 0, side, -SHELL_TH)]),
          { texel: 1 / 6, orient: [0, 300, 200] },
        ),
        "dark",
        { uv: "keep", lod, color: MACH_DK },
      );
      // eave soffit: closes the overhang between the shell's inner eave edge and the lower hull
      const sofZ = eaveZ.filter((z) => z <= Z.eng);
      add(
        loftStrips(
          sofZ.map((z) => {
            const sec = domeSection(z);
            const ex = sec.cx + sec.hw - SHELL_TH;
            const ix = Math.max(0.5, Math.min(ex, HW.lower));
            return [
              [side * ix, Y.eave, z],
              [side * Math.max(0.5, ex), sec.yE, z],
            ];
          }),
          { texel: 1 / 8, orient: [0, 300, 150] },
        ),
        "dark",
        { uv: "keep", lod, color: MACH_DK },
      );
    }
    // raked bulkhead across the opening behind the shell edge: an inclined dark band from the inner
    // edge inward, then the recessed face the reactor sphere stands proud of
    {
      const n = lod === 0 ? 33 : lod === 1 ? 17 : 9;
      const edge = [];
      const inner = [];
      for (let j = 0; j < n; j++) {
        const a = (Math.PI * j) / (n - 1);
        const p = domePoint(shellFrontZ(a), a, 1, -SHELL_TH);
        edge.push(p);
        const cy = Y.eave + 0.42 * (Y.domeTop - Y.eave);
        inner.push([p[0] * 0.72, cy + (p[1] - cy) * 0.72, p[2] - 9]);
      }
      add(loftStrips([edge, inner], { texel: 1 / 8, orient: [0, 20, 150] }), "dark", {
        uv: "keep",
        lod,
        tint: (x, y, z, o) => o.set(MACH_DK).multiplyScalar(0.8 + 0.2 * smoothstep(-5, 50, y)),
      });
      add(fanPoly(inner, [0, 0, -1]), "dark", { texel: 1 / 8, lod, color: CORE });
    }
    // spine ridge between the shell rims: a dark raised deck that follows the sloping dome top (TCW
    // aft view / ICS: the shells are separate and the machinery spine stands proud between them)
    {
      const tz = lod === 0 ? [Z.domeFull, 100, 140, 180, 215, Z.split] : [Z.domeFull, 150, Z.split];
      const top = (z) => domeTop(z) + RIDGE_H;
      add(
        loftStrips(
          tz.map((z) => [
            [-HW.trench + 0.6, top(z), z],
            [HW.trench - 0.6, top(z), z],
          ]),
          { texel: 1 / 6, orient: [0, -200, 150] },
        ),
        "dark",
        { uv: "keep", lod, color: MACH_DK },
      );
      for (const side of [-1, 1])
        add(
          loftStrips(
            tz.map((z) => [
              [side * (HW.trench - 0.6), domeTop(z) - 12, z],
              [side * (HW.trench - 0.6), top(z), z],
            ]),
            { texel: 1 / 6, orient: [side * 200, 30, 150] },
          ),
          "dark",
          { uv: "keep", lod, color: CORE },
        );
      add(quadAt([0, domeTop(Z.domeFull) - 3, Z.domeFull - 0.2], [0, 0, -1], [1, 0, 0], HW.trench * 2 - 1.2, RIDGE_H * 2 + 6), "dark", {
        texel: 1 / 6,
        lod,
        color: MACH_DK,
      });
    }
    // lower hull, keel, stern block
    add(new THREE.BoxGeometry(HW.lower * 2, Y.eave - Y.lowerBot, Z.eng - Z.neckEnd).translate(0, (Y.eave + Y.lowerBot) / 2, (Z.eng + Z.neckEnd) / 2), "dark", {
      texel: 1 / 8,
      lod,
      tint: (x, y, z, o) => o.set(MACH_DK).multiplyScalar(0.85 + 0.3 * smoothstep(Y.lowerBot, Y.eave, y)),
    });
    add(new THREE.BoxGeometry(HW.keel * 2, Y.lowerBot - Y.keelBot, 230).translate(0, (Y.lowerBot + Y.keelBot) / 2, 95), "dark", {
      texel: 1 / 8,
      lod,
      color: MACH_DK,
    });
    add(new THREE.BoxGeometry(HW.stern * 2, 54, Z.eng - 226).translate(0, -2, (Z.eng + 226) / 2), "dark", {
      texel: 1 / 8,
      lod,
      color: MACH_DK,
    });
    // ventral tail: the keel runs on past the thrusters as a pointed blade (TCW stern view)
    add(
      loftZ(
        roundedRect(1, 0.15, 0.15),
        [
          { z: 206, sx: 16, sy: 6, y: Y.lowerBot - 4 },
          { z: 300, sx: 12, sy: 7, y: Y.lowerBot - 2 },
          { z: 360, sx: 6, sy: 5, y: Y.lowerBot + 2 },
          { z: 404, sx: 1.2, sy: 1.5, y: Y.lowerBot + 8 },
        ],
        { capStart: true, capEnd: true, flat: true, texel: 1 / 8 },
      ),
      "dark",
      { uv: "keep", lod, color: MACH_DK },
    );
    if (lod < 2) {
      // ridge greebles (boxes, tanks, masts) and yellow window rows along its walls
      for (let k = 0; k < (lod === 0 ? 14 : 7); k++) {
        const z = 72 + k * (lod === 0 ? 11 : 22) + rand() * 4;
        const w = 5 + rand() * 9;
        const h = 2.5 + rand() * 6;
        add(new THREE.BoxGeometry(w, h, 5 + rand() * 9).translate((rand() - 0.5) * 22, domeTop(z) + RIDGE_H + h / 2, z), "dark", {
          texel: 1 / 4,
          lod,
          color: rand() < 0.5 ? MACH : MACH_LT,
        });
      }
      for (const x of [-12.5, 12.5])
        for (const [z0, z1] of [
          [Z.domeFull + 4, 150],
          [150, Z.split - 6],
        ])
          add(
            bar([x, domeTop(z0) + RIDGE_H + 1.4, z0], [x, domeTop(z1) + RIDGE_H + 1.4, z1], 2.8, 2.8),
            "dark",
            { texel: 1 / 4, lod, color: MACH_LT },
          );
      if (lod === 0)
        for (let k = 0; k < 9; k++) {
          const z = 80 + k * 16 + rand() * 6;
          const x = (rand() - 0.5) * 24;
          const h = 5 + rand() * 12;
          const y0 = domeTop(z) + RIDGE_H;
          add(bar([x, y0, z], [x, y0 + h, z], 0.6, 0.6), "dark", { texel: 1 / 3, lod, color: MACH_DK });
        }
      for (const side of [-1, 1])
        for (const dy of [1.6, 4.2])
          for (let k = 0; k < 14; k++) {
            const z = Z.domeFull + 8 + k * 11.5;
            add(new THREE.BoxGeometry(0.3, 1.1, 7).translate(side * (HW.trench - 0.45), domeTop(z) + dy, z), "windows", {
              lod,
              color: WINDOW,
            });
          }
      // lower hull: pipes, tanks, boxes
      for (const side of [-1, 1]) {
        for (const y of [-9, -14.5, -28.5])
          add(tubeZ(2, 2, 270, 8, side * (HW.lower + 1.5), y, 155, false), "dark", {
            texel: 1 / 4,
            lod,
            color: y === -14.5 ? MACH_LT : MACH,
          });
        for (const z of [120, 215])
          add(tubeZ(6, 6, 54, lod === 0 ? 14 : 8, side * 46, Y.lowerBot + 2, z, false), "dark", {
            texel: 1 / 5,
            lod,
            color: MACH,
          });
        if (lod === 0)
          for (let k = 0; k < 9; k++) {
            const z = 30 + k * 29 + rand() * 6;
            add(
              new THREE.BoxGeometry(4 + rand() * 4, 6 + rand() * 8, 8 + rand() * 10).translate(side * (HW.lower + 2.5), -14 - rand() * 14, z),
              "dark",
              { texel: 1 / 4, lod, color: rand() < 0.5 ? MACH_DK : MACH },
            );
          }
        // running lights low on the shells
        for (const z of [110, 172])
          slotRow(add, {
            c: domePoint(z, 8 * D2R, side, 0),
            n: domeNormal(z, 8 * D2R, side),
            along: [0, 0, 1],
            count: 4,
            len: 7,
            gap: 4,
            h: 2.4,
            lod,
            panes: 2,
            glow: WINDOW,
            rim: MACH_DK,
          });
      }
      // stern block flanks: manifolds and housings around the thrusters
      for (const side of [-1, 1]) {
        add(tubeZ(15, 15, 22, lod === 0 ? 16 : 10, side * 24, 8, Z.eng - 11, false), "dark", {
          texel: 1 / 5,
          lod,
          color: MACH,
        });
        for (const y of [20, -14])
          add(tubeZ(2, 2, 60, 8, side * (HW.stern + 1.5), y, 270, false), "dark", {
            texel: 1 / 4,
            lod,
            color: MACH_LT,
          });
      }
    }
    // sensor domes on the deck ahead of the tower
    for (const side of [-1, 1]) {
      const p = domePoint(204, 70 * D2R, side, 0);
      const d = new THREE.SphereGeometry(6.5, lod === 0 ? 14 : 8, lod === 0 ? 8 : 5);
      d.scale(1, 0.75, 1);
      d.translate(p[0], p[1], p[2]);
      add(d, "hull", { texel: 1 / 4, lod, color: HULL_DK });
    }
  }

  // ---------------------------------------------------------------------------
  // thrusters: three in the upper row, two below, on the stern face between the blades
  // ---------------------------------------------------------------------------
  const nozzles = [
    [-24, 8, 11],
    [0, 10, 11],
    [24, 8, 11],
    [-13, -20, 8.5],
    [13, -20, 8.5],
  ];
  for (const lod of [0, 1, 2])
    for (const [x, y, r] of nozzles) {
      const e = nozzleBell(add, {
        x,
        y,
        zMouth: Z.eng + 8,
        r,
        depth: 24,
        protrude: 8,
        lod,
        shell: SHELL,
        shellDark: SHELL_DK,
      });
      if (lod === 0) {
        engines.push(e);
        sternSpill(add, { x, y, zPlate: Z.eng, r: r * 1.9, plate: SHELL_DK, lod });
      }
    }

  // ---------------------------------------------------------------------------
  // bridge tower at the trench end (ICS / WSMI): plinth, short stem, then a stack of pill-shaped decks
  // of which the second is the widest and overhangs aft, window strips along every deck, the green
  // glass band round the front of the main deck, masts on the cap
  // ---------------------------------------------------------------------------
  const deck0 = domeTop(Z.towerBase) + RIDGE_H;
  const tiers = [
    { w: 26, h: 9, len: 56, y: deck0 + 22.5, z: Z.towerBase + 14 },
    { w: 32, h: 9, len: 68, y: deck0 + 31.5, z: Z.towerBase + 20 },
    { w: 24, h: 8, len: 50, y: deck0 + 40, z: Z.towerBase + 18 },
    { w: 14, h: 5, len: 28, y: deck0 + 46.5, z: Z.towerBase + 14 },
  ];
  const pill = (add, t, lod, mat, opts) => {
    const seg = lod === 0 ? 16 : 8;
    add(new THREE.BoxGeometry(t.w, t.h, t.len - t.w).translate(0, t.y, t.z), mat, opts);
    for (const e of [-1, 1]) {
      const c = new THREE.CylinderGeometry(t.w / 2, t.w / 2, t.h, seg);
      c.translate(0, t.y, t.z + (e * (t.len - t.w)) / 2);
      add(c, mat, opts);
    }
  };
  for (const lod of [0, 1, 2]) {
    add(new THREE.BoxGeometry(HW.trench * 2 + 2, 14, 30).translate(0, deck0 - 3, Z.towerBase), "dark", {
      texel: 1 / 6,
      lod,
      color: MACH_DK,
    });
    add(new THREE.BoxGeometry(18, 20, 24).translate(0, deck0 + 9, Z.towerBase + 6), "hull", {
      texel: 1 / 6,
      lod,
      color: HULL_DK,
    });
    for (const [i, t] of tiers.entries())
      pill(add, t, lod, "hull", { texel: 1 / 6, lod, color: i === 3 ? HULL_DK : HULL });
    if (lod === 2) continue;
    // green glass band round the front of the main deck, window strips along every deck's flanks
    const main = tiers[1];
    const glass = new THREE.CylinderGeometry(main.w / 2 + 0.4, main.w / 2 + 0.4, 3.6, 16, 1, true, Math.PI / 2, Math.PI);
    glass.translate(0, main.y - 0.5, main.z - (main.len - main.w) / 2);
    add(glass, "windows", { lod, color: BRIDGE });
    for (const side of [-1, 1]) {
      add(new THREE.BoxGeometry(0.3, 3.4, main.len - main.w).translate(side * (main.w / 2 + 0.2), main.y - 0.5, main.z), "windows", {
        lod,
        color: BRIDGE,
      });
      for (const i of [0, 2])
        add(
          new THREE.BoxGeometry(0.3, 1.4, (tiers[i].len - tiers[i].w) * 0.9).translate(side * (tiers[i].w / 2 + 0.2), tiers[i].y, tiers[i].z),
          "windows",
          { lod, color: WINDOW },
        );
    }
    // mullions over the glass, masts and the antenna cluster on the cap
    if (lod === 0)
      for (let k = 0; k <= 8; k++) {
        const a = Math.PI / 2 + (Math.PI * k) / 8;
        const r = main.w / 2 + 0.6;
        const zc = main.z - (main.len - main.w) / 2;
        add(bar([Math.sin(a) * r, main.y - 3, zc + Math.cos(a) * r], [Math.sin(a) * r, main.y + 2, zc + Math.cos(a) * r], 0.6, 0.6), "dark", {
          texel: 1 / 3,
          lod,
          color: MACH_DK,
        });
      }
    const cap = tiers[3];
    add(bar([0, cap.y + 2, cap.z - 6], [0, cap.y + 22, cap.z - 6], 1, 1), "dark", { texel: 1 / 3, lod, color: MACH_DK });
    add(bar([0, cap.y + 2, cap.z + 8], [0, cap.y + 14, cap.z + 8], 0.8, 0.8), "dark", { texel: 1 / 3, lod, color: MACH_DK });
    if (lod === 0) {
      add(bar([-5, cap.y + 17, cap.z - 6], [5, cap.y + 17, cap.z - 6], 0.4, 0.4), "dark", { texel: 1 / 3, lod, color: MACH_DK });
      antennaCluster(add, {
        base: [0, cap.y + 2.5, cap.z + 1],
        up: [0, 1, 0],
        scale: 0.7,
        lod,
        mast: MACH_DK,
        plate: HULL_DK,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // livery: rim stripe, wide diagonal band, front diagonal, lower stripe, nose band, hexagon + emblem
  // ---------------------------------------------------------------------------
  const S_RIM = DOME_ARC.sOfA(A_RIM);
  for (const lod of [0, 1]) {
    for (const side of [-1, 1]) {
      const zl = lod === 0 ? [74, 100, 130, 160, 190, 215, 232] : [74, 150, 232];
      band(add, zl, () => S_RIM - 10, () => S_RIM - 2.5, side, 2, "paint", { lod, color: BLUE });
      const zb = lod === 0 ? [96, 114, 132, 150, 168, 186, 204, 222] : [96, 160, 222];
      const sc = (z) => S_RIM - 16 - ((S_RIM - 40) * (z - 96)) / 126;
      band(add, zb, (z) => sc(z) - 20, (z) => sc(z) + 20, side, lod === 0 ? 6 : 4, "paint", {
        lod,
        color: BLUE,
      });
      const zf = lod === 0 ? [74, 84, 94, 104, 114] : [74, 94, 114];
      const sf = (z) => S_RIM - 18 - ((S_RIM - 60) * (z - 74)) / 40;
      band(add, zf, (z) => sf(z) - 10, (z) => sf(z) + 10, side, 4, "paint", { lod, color: BLUE });
      const za = lod === 0 ? [196, 214, 232, 250, 268, 286, 302] : [196, 250, 302];
      const sa = (z) => S_RIM - 12 - ((S_RIM - 22) * (z - 196)) / 106;
      band(add, za, (z) => sa(z) - 15, (z) => sa(z) + 15, side, lod === 0 ? 5 : 3, "paint", {
        lod,
        color: BLUE,
      });
      const zlo = lod === 0 ? [40, 55, 72, 100, 150, 200, 232] : [40, 72, 150, 232];
      band(add, zlo, () => 15, () => 23, side, 2, "paint", { lod, color: BLUE });
      // band along the raked front edge of the shell
      const ze = lod === 0 ? [0.08, 0.16, 0.24] : [0.08, 0.24];
      const rings = ze.map((t) => {
        const out = [];
        const n = lod === 0 ? 12 : 6;
        for (let j = 0; j < n; j++) {
          const a = (30 + 55 * (j / (n - 1))) * D2R;
          const z0 = shellFrontZ(a);
          out.push(domePoint(z0 + (Z.domeFull - z0) * t, a, side, 0.45));
        }
        if (side < 0) out.reverse();
        return out;
      });
      add(loftStrips(rings, { texel: 1 / 8 }), "paint", { uv: "keep", lod, color: BLUE });
      // Banking Clan hexagon with the Confederacy emblem, mid-flank
      const zC = 156;
      const sC = 50;
      patch(add, hexagon(30), zC, sC, side, 0.95, lod === 0 ? 3 : 2, "paint", { lod, color: WHITE });
      patch(add, hexagon(7), zC, sC, side, 1.5, 1, "paint", { lod, color: BLUE_DK });
      if (lod === 0)
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const p0 = [Math.cos(a) * 6.5, Math.sin(a) * 6.5];
          const p1 = [Math.cos(a) * 27, Math.sin(a) * 27];
          patch(add, bar2D(p0, p1, 3.8), zC, sC, side, 1.5, 2, "paint", { lod, color: BLUE_DK });
        }
    }
  }
  // dark plank seams along the shells (LOD 0)
  for (const side of [-1, 1])
    for (const a of [16, 32, 48, 64]) {
      const zs = [];
      for (let z = 76; z < 232; z += 26) zs.push(z);
      zs.push(232);
      const pts = zs.map((z) => domePoint(z, a * D2R, side, 0));
      const nrm = zs.map((z) => domeNormal(z, a * D2R, side));
      const acr = nrm.map((n) => [n[1], -n[0], 0]);
      add(ribbon(pts, nrm, acr, 1.3, 0.28), "dark", { uv: "keep", lod: 0, color: MACH_DK });
    }
}
