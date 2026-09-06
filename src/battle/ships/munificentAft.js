// Neck and aft hull of the Munificent-class frigate: the boxy neck with its reactor ports and window
// bands, the dome (flat 168 m arch: rounded nose, two armour shells either side of the dark spine
// trench, eave soffits over the dark lower hull and keel), the shells thinning past the bridge tower
// into the inward-curving stern blades, the thruster block between them, the bridge tower, and the
// Banking Clan livery (blue bands, the white hexagon with the Confederacy emblem).
import * as THREE from "three";
import { bar, loftZ, quadAt, roundedRect, smoothstep, tubeZ } from "./munificentGeo.js";
import { bar2D, hexagon, loftStrips, ribbon } from "./munificentHull.js";
import { antennaCluster, dishMast, slotRow, slotWindow } from "./munificentDetail.js";
import { nozzleBell, sternSpill } from "./munificentEngines.js";
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
  SHELL,
  SHELL_DK,
  SHELL_TH,
  SOOT,
  WHITE,
  WINDOW,
  Y,
  Z,
  archPt,
  domeNormal,
  domePoint,
  domeSection,
  domeTop,
  plankTone,
} from "./munificentSpec.js";

const TEX = 1 / 30;
const NOSE_LEN = Z.domeFull - 12.5;
// quarter-ellipsoid nose: section scale by z
const noseScale = (z) =>
  z >= Z.domeFull ? 1 : Math.sqrt(Math.max(0, 1 - ((Z.domeFull - z) / NOSE_LEN) ** 2));

// shell surface point by arc length s (metres from the eave) including the nose scaling
function surf(z, s, side, lift = 0) {
  const k = noseScale(z);
  if (k >= 1) return domePoint(z, DOME_ARC.aOfS(s), side, lift);
  const a = DOME_ARC.aOfS(s / k);
  const [px, py] = archPt(a, HW.dome * k + lift, (Y.domeTop - Y.eave) * k + lift);
  return [side * px, Y.eave + py, z];
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
  // neck: rounded box with the reactor ports, tall window band and the antenna deck
  // ---------------------------------------------------------------------------
  const neckTint = (x, y, z, o) => {
    o.copy(HULL_DK).multiplyScalar(0.9 * plankTone(y / 3 + 50));
    o.lerp(SOOT, 0.18 * (1 - smoothstep(Y.neckBot, Y.neckBot + 40, y)));
  };
  for (const lod of [0, 1, 2]) {
    const yc = (Y.neckTop + Y.neckBot) / 2;
    const hh = (Y.neckTop - Y.neckBot) / 2;
    add(
      loftZ(
        roundedRect(lod === 0 ? 3 : 1, 0.14, 0.14),
        [
          { z: -142, sx: HW.neck, sy: hh, y: yc },
          { z: Z.neckEnd, sx: HW.neck, sy: hh, y: yc },
        ],
        { capStart: true, capEnd: true, flat: true, texel: 1 / 12 },
      ),
      "hull",
      { uv: "keep", lod, tint: neckTint },
    );
    // antenna deck ridge and flank blocks
    add(new THREE.BoxGeometry(36, 11, 132).translate(0, Y.neckTop + 5.5, -60), "hull", {
      texel: 1 / 8,
      lod,
      color: HULL_DK,
    });
    if (lod === 2) continue;
    for (const side of [-1, 1]) {
      add(new THREE.BoxGeometry(22, 6, 90).translate(side * 38, Y.neckTop + 3, -65), "dark", {
        texel: 1 / 6,
        lod,
        color: MACH,
      });
      // reactor ports: octagonal frame, recessed dark disc
      for (let k = 0; k < 5; k++) {
        const z = -122 + 27 * k;
        const fr = new THREE.CylinderGeometry(10, 10, 1.8, 8);
        fr.rotateZ(Math.PI / 2);
        fr.rotateX(Math.PI / 8);
        fr.translate(side * (HW.neck + 0.9), -7, z);
        add(fr, "dark", { texel: 1 / 4, lod, color: MACH_LT });
        const disc = new THREE.CylinderGeometry(7.6, 7.6, 2.4, lod === 0 ? 16 : 8);
        disc.rotateZ(Math.PI / 2);
        disc.translate(side * (HW.neck + 0.9), -7, z);
        add(disc, "dark", { texel: 1 / 4, lod, color: CORE });
        if (lod === 0) {
          const ring = new THREE.TorusGeometry(5.2, 0.5, 6, 16);
          ring.rotateY(Math.PI / 2);
          ring.translate(side * (HW.neck + 2.2), -7, z);
          add(ring, "windows", { lod, color: 0x9fd0ff });
        }
      }
      // tall lit window band low on the flank
      for (let k = 0; k < 6; k++)
        slotWindow(add, {
          c: [side * HW.neck, -47, -124 + 23 * k],
          n: [side, 0, 0],
          along: [0, 0, 1],
          len: 9,
          h: 7,
          lod,
          panes: 3,
          glow: 0x9fc4b0,
          rim: MACH_DK,
        });
      // conduits and panel insets
      for (const y of [-26, -33])
        add(tubeZ(1.9, 1.9, 148, 8, side * (HW.neck + 1.2), y, -64, false), "dark", {
          texel: 1 / 4,
          lod,
          color: MACH,
        });
      if (lod === 0)
        for (let k = 0; k < 6; k++)
          add(
            new THREE.BoxGeometry(0.8, 9, 16).translate(side * (HW.neck + 0.3), 12, -118 + k * 24),
            "dark",
            { texel: 1 / 4, lod, color: MACH_DK },
          );
    }
    // antenna forest on the ridge
    for (const z of [-112, -62, -14])
      antennaCluster(add, {
        base: [0, Y.neckTop + 11, z],
        up: [0, 1, 0],
        scale: 0.9,
        lod,
        mast: MACH_DK,
        plate: HULL_DK,
      });
    for (const side of [-1, 1])
      dishMast(add, {
        base: [side * 34, Y.neckTop + 6, -40],
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
        const x = (rand() - 0.5) * 60;
        const z = -128 + rand() * 128;
        const h = 6 + rand() * 18;
        add(bar([x, Y.neckTop + 11, z], [x, Y.neckTop + 11 + h, z], 0.5, 0.5), "dark", {
          texel: 1 / 3,
          lod,
          color: MACH_DK,
        });
      }
  }

  // ---------------------------------------------------------------------------
  // dome: nose, shells that become the stern blades, trench, soffits, lower hull, keel, stern block
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
      add(loftStrips(zs.map((z) => shellRing(z, side, m)), { texel: TEX }), "hull", {
        uv: "keep",
        lod,
        tint: domeTint(side),
      });
      // inner faces of the blades and the trench-side rim / eave edge strips
      const zIn = zs.filter((z) => z >= 215);
      if (lod < 2)
        add(loftStrips(zIn.map((z) => shellRing(z, side, m, -SHELL_TH, true)), { texel: 1 / 8 }), "dark", {
          uv: "keep",
          lod,
          tint: (x, y, z, o) => o.set(MACH_DK).multiplyScalar(0.75 + 0.25 * smoothstep(250, 330, z)),
        });
      add(
        loftStrips(
          zs.map((z) => [domePoint(z, A_RIM, side, 0), domePoint(z, A_RIM, side, -SHELL_TH)]),
          { texel: 1 / 6, orient: [side * 200, -100, 200] },
        ),
        "dark",
        { uv: "keep", lod, color: MACH_DK },
      );
      add(
        loftStrips(
          zs.map((z) => [domePoint(z, 0, side, 0), domePoint(z, 0, side, -SHELL_TH)]),
          { texel: 1 / 6, orient: [0, 300, 200] },
        ),
        "dark",
        { uv: "keep", lod, color: MACH_DK },
      );
      // eave soffit: closes the overhang between the shell's inner eave edge and the lower hull
      const sofZ = [12.6, ...zs.filter((z) => z <= Z.eng)];
      add(
        loftStrips(
          sofZ.map((z) => {
            const k = noseScale(z);
            const sec = domeSection(z);
            const ex = (k < 1 ? HW.dome * k : sec.cx + sec.hw) - SHELL_TH;
            const ey = k < 1 ? Y.eave : sec.yE;
            const ix = Math.max(0.5, Math.min(ex, HW.lower));
            return [
              [side * ix, Y.eave, z],
              [side * Math.max(0.5, ex), ey, z],
            ];
          }),
          { texel: 1 / 8, orient: [0, 300, 150] },
        ),
        "dark",
        { uv: "keep", lod, color: MACH_DK },
      );
    }
    // nose: quarter-ellipsoid over the full arch
    {
      const n = lod === 0 ? 41 : lod === 1 ? 21 : 11;
      const nz = lod === 0 ? [13.2, 15, 18, 23, 29, 36, 44, 52, 61, Z.domeFull] : lod === 1 ? [13.2, 17, 26, 38, 54, Z.domeFull] : [13.2, 24, 46, Z.domeFull];
      const rings = nz.map((z) => {
        const k = noseScale(z);
        const out = [];
        for (let j = 0; j < n; j++) {
          const [px, py] = archPt((Math.PI * j) / (n - 1), HW.dome * k, (Y.domeTop - Y.eave) * k);
          out.push([px, Y.eave + py, z]);
        }
        return out;
      });
      add(loftStrips(rings, { texel: TEX }), "hull", {
        uv: "keep",
        lod,
        tint: (x, y, z, o) => {
          const a = Math.atan2(y - Y.eave, x) / D2R;
          o.copy(HULL).multiplyScalar(plankTone(a));
          o.multiplyScalar(1 - 0.14 * (1 - smoothstep(-2, 22, Math.min(a, 180 - a))));
        },
      });
    }
    // trench: floor and walls follow the sloping dome top (10 m deep)
    {
      const tz = lod === 0 ? [Z.domeFull, 100, 140, 180, 215, Z.split] : [Z.domeFull, 150, Z.split];
      add(
        loftStrips(
          tz.map((z) => [
            [-HW.trench, domeTop(z) - 10, z],
            [HW.trench, domeTop(z) - 10, z],
          ]),
          { texel: 1 / 6, orient: [0, -200, 150] },
        ),
        "dark",
        { uv: "keep", lod, color: CORE },
      );
      for (const side of [-1, 1])
        add(
          loftStrips(
            tz.map((z) => [
              [side * (HW.trench - 0.2), domeTop(z) - 10.2, z],
              [side * (HW.trench - 0.2), domeTop(z) - 0.4, z],
            ]),
            { texel: 1 / 6, orient: [side * 200, 30, 150] },
          ),
          "dark",
          { uv: "keep", lod, color: MACH_DK },
        );
      add(quadAt([0, domeTop(Z.domeFull) - 5, Z.domeFull + 0.2], [0, 0, 1], [1, 0, 0], HW.trench * 2, 10), "dark", {
        texel: 1 / 6,
        lod,
        color: MACH_DK,
      });
    }
    // lower hull, keel, stern block
    add(new THREE.BoxGeometry(HW.lower * 2, Y.eave - Y.lowerBot, Z.eng - 12).translate(0, (Y.eave + Y.lowerBot) / 2, (Z.eng + 12) / 2), "dark", {
      texel: 1 / 8,
      lod,
      tint: (x, y, z, o) => o.set(MACH_DK).multiplyScalar(0.85 + 0.3 * smoothstep(Y.lowerBot, Y.eave, y)),
    });
    add(new THREE.BoxGeometry(HW.keel * 2, Y.lowerBot - Y.keelBot, 104).translate(0, (Y.lowerBot + Y.keelBot) / 2, 64), "dark", {
      texel: 1 / 8,
      lod,
      color: MACH_DK,
    });
    add(new THREE.BoxGeometry(HW.stern * 2, 58, Z.eng - 228).translate(0, -7, (Z.eng + 228) / 2), "dark", {
      texel: 1 / 8,
      lod,
      color: MACH_DK,
    });
    if (lod < 2) {
      // trench greebles and yellow window rows along its walls
      for (let k = 0; k < (lod === 0 ? 12 : 6); k++) {
        const z = 70 + k * (lod === 0 ? 14.5 : 29) + rand() * 4;
        const w = 5 + rand() * 9;
        const h = 2.5 + rand() * 5;
        add(new THREE.BoxGeometry(w, h, 6 + rand() * 12).translate((rand() - 0.5) * 20, domeTop(z) - 10 + h / 2, z), "dark", {
          texel: 1 / 4,
          lod,
          color: rand() < 0.5 ? MACH : MACH_LT,
        });
      }
      for (const x of [-13.5, 13.5])
        for (const [z0, z1] of [
          [Z.domeFull + 4, 150],
          [150, Z.split - 6],
        ])
          add(
            bar([x, domeTop(z0) - 8.4, z0], [x, domeTop(z1) - 8.4, z1], 2.8, 2.8),
            "dark",
            { texel: 1 / 4, lod, color: MACH_LT },
          );
      for (const side of [-1, 1])
        for (const dy of [-6.6, -3.2])
          for (let k = 0; k < 14; k++) {
            const z = Z.domeFull + 8 + k * 11.5;
            add(new THREE.BoxGeometry(0.3, 1.1, 7).translate(side * (HW.trench - 0.45), domeTop(z) + dy, z), "windows", {
              lod,
              color: WINDOW,
            });
          }
      // lower hull: pipes, tanks, boxes
      for (const side of [-1, 1]) {
        for (const y of [-11, -19, -28])
          add(tubeZ(2.2, 2.2, 270, 8, side * (HW.lower + 1.6), y, 155, false), "dark", {
            texel: 1 / 4,
            lod,
            color: y === -19 ? MACH_LT : MACH,
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
    // sensor domes on the deck aft
    for (const side of [-1, 1]) {
      const p = domePoint(226, 70 * D2R, side, 0);
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
  // bridge tower at the trench end: plinth, stem, long bridge module with the green glass front
  // ---------------------------------------------------------------------------
  for (const lod of [0, 1, 2]) {
    const deck = domeTop(Z.split);
    add(new THREE.BoxGeometry(HW.trench * 2 + 2, 15, 34).translate(0, deck - 4, Z.split + 1), "dark", {
      texel: 1 / 6,
      lod,
      color: MACH_DK,
    });
    add(new THREE.BoxGeometry(18, 84 - deck, 24).translate(0, (84 + deck) / 2, 254), "hull", {
      texel: 1 / 6,
      lod,
      color: HULL_DK,
    });
    add(new THREE.BoxGeometry(26, 10, 30).translate(0, deck + 8, 254), "dark", {
      texel: 1 / 6,
      lod,
      color: MACH,
    });
    add(new THREE.BoxGeometry(26, 13, 66).translate(0, 91.5, 257), "hull", {
      texel: 1 / 6,
      lod,
      color: HULL,
    });
    const nose = new THREE.CylinderGeometry(13, 13, 13, lod === 0 ? 16 : 8);
    nose.translate(0, 91.5, 224);
    add(nose, "hull", { texel: 1 / 6, lod, color: HULL });
    add(new THREE.BoxGeometry(20, 6, 46).translate(0, 101, 263), "hull", {
      texel: 1 / 6,
      lod,
      color: HULL_DK,
    });
    if (lod === 2) continue;
    // green glass: wraps the front half of the module nose and runs down both flanks
    const glass = new THREE.CylinderGeometry(13.4, 13.4, 5.5, 16, 1, true, Math.PI / 2, Math.PI);
    glass.translate(0, 90, 224);
    add(glass, "windows", { lod, color: BRIDGE });
    for (const side of [-1, 1]) {
      add(new THREE.BoxGeometry(0.3, 3.2, 44).translate(side * 13.2, 90, 250), "windows", {
        lod,
        color: BRIDGE,
      });
      add(new THREE.BoxGeometry(0.3, 1.2, 30).translate(side * 10.2, 101, 262), "windows", {
        lod,
        color: WINDOW,
      });
    }
    // mullions over the glass, aft block, masts
    if (lod === 0)
      for (let k = 0; k <= 8; k++) {
        const a = Math.PI / 2 + (Math.PI * k) / 8;
        add(bar([Math.sin(a) * 13.6, 87, 224 + Math.cos(a) * 13.6], [Math.sin(a) * 13.6, 93, 224 + Math.cos(a) * 13.6], 0.6, 0.6), "dark", {
          texel: 1 / 3,
          lod,
          color: MACH_DK,
        });
      }
    add(new THREE.BoxGeometry(14, 8, 22).translate(0, 108, 276), "dark", {
      texel: 1 / 6,
      lod,
      color: MACH,
    });
    add(bar([0, 112, 280], [0, 132, 280], 1, 1), "dark", { texel: 1 / 3, lod, color: MACH_DK });
    add(bar([0, 104, 248], [0, 124, 248], 0.8, 0.8), "dark", { texel: 1 / 3, lod, color: MACH_DK });
    if (lod === 0) {
      add(bar([-5, 126, 280], [5, 126, 280], 0.4, 0.4), "dark", { texel: 1 / 3, lod, color: MACH_DK });
      antennaCluster(add, {
        base: [0, 104, 270],
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
      // nose band around the front
      const zn = lod === 0 ? [21, 25, 29, 33] : [21, 33];
      band(
        add,
        zn,
        (z) => noseScale(z) * DOME_ARC.sOfA(30 * D2R),
        (z) => noseScale(z) * DOME_ARC.sOfA(Math.PI / 2),
        side,
        lod === 0 ? 8 : 4,
        "paint",
        { lod, color: BLUE },
        0.6,
      );
      // Banking Clan hexagon with the Confederacy emblem
      const zC = 138;
      const sC = 46;
      patch(add, hexagon(27), zC, sC, side, 0.5, lod === 0 ? 3 : 2, "paint", { lod, color: WHITE });
      patch(add, hexagon(6.5), zC, sC, side, 1.1, 1, "paint", { lod, color: BLUE_DK });
      if (lod === 0)
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const p0 = [Math.cos(a) * 6, Math.sin(a) * 6];
          const p1 = [Math.cos(a) * 24.5, Math.sin(a) * 24.5];
          patch(add, bar2D(p0, p1, 3.6), zC, sC, side, 1.1, 2, "paint", { lod, color: BLUE_DK });
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
