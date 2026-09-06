// Neck and aft hull of the Munificent-class frigate: the dark machinery neck with its row of reactor
// ports and lit bays, the dome (164 m arch: two armour shells either side of the dark spine trench,
// their front edge raked back from the eave to the top over the reactor sphere, eave soffits over the
// shallow dark lower hull and keel), the shells thinning past the bridge tower into the inward-curving
// stern blades, the thruster block between them, the tiered bridge tower, and the Banking Clan livery
// (blue bands, the white hexagon with the Confederacy emblem).
import * as THREE from "three";
import {
  bar,
  loftZ,
  quadAt,
  roundedRect,
  smoothstep,
  tubeZ,
} from "./munificentGeo.js";
import {
  bar2D,
  hexagon,
  loftStrips,
  ribbon,
  surfacePatch,
} from "./munificentHull.js";
import {
  antennaCluster,
  dishMast,
  slotRow,
  slotWindow,
} from "./munificentDetail.js";
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
  GRIME,
  HULL,
  HULL_DK,
  HW,
  LOWER_TURRET_Z,
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
  streak,
} from "./munificentSpec.js";

const TEX = 1 / 30;
const NECK_Z0 = Z.hoodEnd - 10; // the neck core starts just inside the hood's aft rim
const NECK_Z1 = Z.domeFull + 14; // and runs on under the raked shell edge
const NECK_LEN = Z.neckEnd - Z.hoodEnd; // the exposed run between the hood rim and the dome eave
const POD_Y = -20; // centre height of the ventral engine pod
const POD_AFT = 24; // how far its stern face stands aft of the main stern face
// evenly spaced stations along the exposed neck, inset from both ends
const neckZ = (n, inset = 8) =>
  Array.from(
    { length: n },
    (_, k) => Z.hoodEnd + inset + ((NECK_LEN - 2 * inset) * k) / (n - 1),
  );

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
  o.lerp(GRIME, 0.45 * (1 - smoothstep(-14, -2, a)));
  o.lerp(GRIME, streak(z) * (0.12 + 0.3 * (1 - smoothstep(0, 70, a))));
  o.lerp(SOOT, 0.3 * smoothstep(300, 380, z) * (1 - smoothstep(20, 60, a)));
  o.lerp(SOOT, 0.06 * smoothstep(60, 120, z) * (1 - smoothstep(0, 90, z - 60)));
};

// ring of the starboard/port shell between arch angles a0..a1 (m points); the point order is chosen
// so that lofting along +z gives outward normals (reverse = inner face)
// skirt: the shells run on below the eave as a slightly flared apron (TCW: the shell edges hang well
// below the barrel's equator and hide most of the lower hull); k in (0, 1], 1 = the bottom edge
const SKIRT_D = 12;
const SKIRT_FLARE = 2.5;
function skirtPoint(z, k, side, lift = 0) {
  const s = domeSection(z);
  return [side * (s.cx + s.hw + SKIRT_FLARE * k + lift), s.yE - SKIRT_D * k, z];
}
const SKIRT_K = [1, 0.5];
function shellRing(z, side, m, lift = 0, reverse = false, a0 = 0, a1 = A_RIM) {
  const out = [];
  if (a0 === 0) for (const k of SKIRT_K) out.push(skirtPoint(z, k, side, lift));
  for (let j = 0; j < m; j++)
    out.push(domePoint(z, a0 + ((a1 - a0) * j) / (m - 1), side, lift));
  if (side < 0 !== reverse) out.reverse();
  return out;
}
// ring across the raked front of the shell: t = 0 is the edge itself (eave forward, top set back),
// t = 1 the first full station at Z.domeFull
function frontRing(t, side, m, lift = 0, reverse = false, a0 = 0, a1 = A_RIM) {
  const out = [];
  const zE = shellFrontZ(0);
  if (a0 === 0)
    for (const k of SKIRT_K)
      out.push(skirtPoint(zE + (Z.domeFull - zE) * t, k, side, lift));
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
  const g = surfacePatch(
    poly,
    (u, v) => surf(zC + u, sC + v, side, lift),
    domeNormal(zC, DOME_ARC.aOfS(sC), side),
    k,
  );
  add(g, mat, { texel: 1 / 8, ...opts });
}

// band between arc lengths sLo(z)..sHi(z) along the given z stations, m points across
function band(add, zs, sLo, sHi, side, m, mat, opts, lift = 0.45) {
  const rings = zs.map((z) => {
    const lo = sLo(z);
    const hi = sHi(z);
    const out = [];
    for (let j = 0; j < m; j++)
      out.push(surf(z, lo + ((hi - lo) * j) / (m - 1), side, lift));
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
      const zS = Z.domeFull - 4;
      const sph = new THREE.SphereGeometry(
        30,
        lod === 0 ? 32 : lod === 1 ? 16 : 8,
        lod === 0 ? 20 : 9,
      );
      sph.translate(0, 31, zS);
      add(sph, "dark", {
        texel: 1 / 8,
        lod,
        tint: (x, y, z, o) =>
          o.set(MACH_LT).multiplyScalar(0.7 + 0.3 * smoothstep(0, 50, y)),
      });
      if (lod < 2) {
        const ring = new THREE.TorusGeometry(27.5, 2.4, 8, lod === 0 ? 36 : 16);
        ring.translate(0, 31, zS - 12);
        add(ring, "paint", { texel: 1 / 6, lod, color: 0xb0603a });
      }
    }
    // deck ledges: the wing plane runs aft along both flanks of the neck as a flat shelf
    for (const side of [-1, 1]) {
      add(
        new THREE.BoxGeometry(11, 2.4, NECK_LEN + 4).translate(
          side * (HW.neck + 4.5),
          Y.wing - 0.4,
          (Z.hoodEnd + Z.neckEnd) / 2,
        ),
        "hull",
        {
          texel: 1 / 6,
          lod,
          color: HULL_DK,
        },
      );
      if (lod < 2)
        for (const z of neckZ(5, 6))
          add(
            new THREE.BoxGeometry(2, 5, 2).translate(
              side * (HW.neck + 9),
              Y.wing - 4,
              z,
            ),
            "dark",
            {
              texel: 1 / 3,
              lod,
              color: MACH_DK,
            },
          );
    }
    // antenna deck ridge along the top; it runs on into the raked opening up to the reactor sphere
    add(
      new THREE.BoxGeometry(34, 10, NECK_LEN + 20).translate(
        0,
        Y.neckTop + 5,
        Z.hoodEnd + 2 + (NECK_LEN + 20) / 2,
      ),
      "hull",
      {
        texel: 1 / 8,
        lod,
        color: HULL_DK,
      },
    );
    if (lod === 2) continue;
    for (const side of [-1, 1]) {
      add(
        new THREE.BoxGeometry(18, 6, NECK_LEN - 20).translate(
          side * 27,
          Y.neckTop + 3,
          (Z.hoodEnd + Z.neckEnd) / 2 - 2,
        ),
        "dark",
        {
          texel: 1 / 6,
          lod,
          color: MACH_LT,
        },
      );
      // frame ribs standing proud of the flank between the ports
      for (const z of neckZ(6, 5)) {
        add(
          new THREE.BoxGeometry(2.4, Y.neckTop - Y.neckBot - 4, 3.2).translate(
            side * (HW.neck + 0.8),
            yc,
            z,
          ),
          "dark",
          {
            texel: 1 / 4,
            lod,
            color: MACH_LT,
          },
        );
      }
      // reactor ports: octagonal frame, recessed dark disc, lit ring (WSMI: a row of five)
      for (const z of neckZ(5, 17)) {
        const fr = new THREE.CylinderGeometry(7.8, 7.8, 1.8, 8);
        fr.rotateZ(Math.PI / 2);
        fr.rotateX(Math.PI / 8);
        fr.translate(side * (HW.neck + 0.9), -6, z);
        add(fr, "dark", { texel: 1 / 4, lod, color: MACH_LT });
        const disc = new THREE.CylinderGeometry(
          5.9,
          5.9,
          2.4,
          lod === 0 ? 16 : 8,
        );
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
      for (const z of neckZ(6, 10))
        slotWindow(add, {
          c: [side * HW.neck, -28, z],
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
        add(
          tubeZ(
            1.6,
            1.6,
            NECK_LEN + 12,
            8,
            side * (HW.neck + 1.1),
            y,
            (Z.hoodEnd + Z.neckEnd) / 2 + 4,
            false,
          ),
          "dark",
          {
            texel: 1 / 4,
            lod,
            color: MACH_DK,
          },
        );
    }
    // tanks and housings on the antenna deck
    for (const [z, r] of [
      [Z.hoodEnd + 8, 3.6],
      [Z.hoodEnd + 36, 4.2],
      [Z.neckEnd - 42, 3.6],
      [Z.neckEnd - 14, 4.2],
    ]) {
      const t = new THREE.CylinderGeometry(r, r, 26, lod === 0 ? 12 : 8);
      t.rotateZ(Math.PI / 2);
      t.translate(0, Y.neckTop + 10 + r * 0.8, z);
      add(t, "dark", { texel: 1 / 5, lod, color: MACH_LT });
    }
    for (const [x, z, w, h, l] of [
      [-9, Z.hoodEnd + 52, 10, 6, 14],
      [8, Z.hoodEnd + 20, 8, 4, 10],
      [10, Z.neckEnd - 28, 9, 5, 12],
      [-7, Z.neckEnd + 4, 12, 7, 10],
    ])
      add(
        new THREE.BoxGeometry(w, h, l).translate(x, Y.neckTop + 10 + h / 2, z),
        "dark",
        {
          texel: 1 / 5,
          lod,
          color: MACH,
        },
      );
    // antenna forest on the ridge
    for (const z of neckZ(3, 18))
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
        base: [side * 28, Y.neckTop + 6, (Z.hoodEnd + Z.neckEnd) / 2 + 12],
        up: [0, 1, 0],
        height: 12,
        aim: [side * 0.4, 0.75, -0.55],
        r: 6,
        lod,
        mast: MACH_DK,
        dish: HULL_DK,
      });
    if (lod === 0)
      for (let k = 0; k < 12; k++) {
        const x = (rand() - 0.5) * 50;
        const z = Z.hoodEnd + 4 + rand() * (NECK_LEN + 8);
        const h = 6 + rand() * 18;
        add(
          bar([x, Y.neckTop + 10, z], [x, Y.neckTop + 10 + h, z], 0.5, 0.5),
          "dark",
          {
            texel: 1 / 3,
            lod,
            color: MACH_DK,
          },
        );
      }
  }

  // ---------------------------------------------------------------------------
  // dome: shells with the raked front edge that become the stern blades, the dark raked bulkhead in
  // the opening, trench, soffits, lower hull, keel, stern block
  // ---------------------------------------------------------------------------
  const shellZ = {
    0: [
      Z.domeFull,
      50,
      70,
      90,
      110,
      130,
      150,
      170,
      195,
      215,
      Z.split,
      250,
      265,
      280,
      295,
      310,
      325,
      340,
      355,
      370,
      385,
      398,
      406,
      Z.tip,
    ],
    1: [
      Z.domeFull,
      70,
      110,
      150,
      185,
      215,
      Z.split,
      265,
      295,
      325,
      355,
      385,
      Z.tip,
    ],
    2: [Z.domeFull, 130, Z.split, 290, 350, Z.tip],
  };
  for (const lod of [0, 1, 2]) {
    const m = lod === 0 ? 21 : lod === 1 ? 11 : 6;
    const zs = shellZ[lod];
    for (const side of [-1, 1]) {
      add(
        loftStrips(
          [
            ...FRONT_T[lod].map((t) => frontRing(t, side, m)),
            ...zs.map((z) => shellRing(z, side, m)),
          ],
          { texel: TEX },
        ),
        "hull",
        { uv: "keep", lod, tint: domeTint(side) },
      );
      // inner faces of the blades, the raked front edge, and the trench-side rim / eave edge strips
      const zIn = zs.filter((z) => z >= 215);
      if (lod < 2)
        add(
          loftStrips(
            zIn.map((z) => shellRing(z, side, m, -SHELL_TH, true)),
            { texel: 1 / 8 },
          ),
          "dark",
          {
            uv: "keep",
            lod,
            tint: (x, y, z, o) =>
              o
                .set(MACH_DK)
                .multiplyScalar(0.75 + 0.25 * smoothstep(250, 330, z)),
          },
        );
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
          rimZ.map((z) => [
            domePoint(z, A_RIM, side, 0),
            domePoint(z, A_RIM, side, -SHELL_TH),
          ]),
          { texel: 1 / 6, orient: [side * 200, -100, 200] },
        ),
        "dark",
        { uv: "keep", lod, color: MACH_DK },
      );
      const eaveZ = [Z.neckEnd, ...zs];
      add(
        loftStrips(
          eaveZ.map((z) => [
            skirtPoint(z, 1, side, 0),
            skirtPoint(z, 1, side, -SHELL_TH),
          ]),
          { texel: 1 / 6, orient: [0, 300, 200] },
        ),
        "dark",
        { uv: "keep", lod, color: MACH_DK },
      );
      // soffit: closes the overhang between the skirt's inner bottom edge and the lower hull
      const sofZ = eaveZ.filter((z) => z <= Z.eng);
      add(
        loftStrips(
          sofZ.map((z) => {
            const sec = domeSection(z);
            const ex = sec.cx + sec.hw + SKIRT_FLARE - SHELL_TH;
            const ix = Math.max(0.5, Math.min(ex, HW.lower));
            return [
              [side * ix, sec.yE - SKIRT_D, z],
              [side * Math.max(0.5, ex), sec.yE - SKIRT_D, z],
            ];
          }),
          { texel: 1 / 8, orient: [0, 300, 150] },
        ),
        "dark",
        { uv: "keep", lod, color: MACH_DK },
      );
      // front cap of the skirt cavity between the lower hull and the skirt
      add(
        quadAt(
          [
            side *
              (HW.lower + (HW.dome + SKIRT_FLARE - SHELL_TH - HW.lower) / 2),
            Y.eave - SKIRT_D / 2,
            Z.neckEnd + 0.2,
          ],
          [0, 0, -1],
          [1, 0, 0],
          HW.dome + SKIRT_FLARE - SHELL_TH - HW.lower,
          SKIRT_D,
        ),
        "dark",
        { texel: 1 / 6, lod, color: MACH_DK },
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
      add(
        loftStrips([edge, inner], { texel: 1 / 8, orient: [0, 20, 150] }),
        "dark",
        {
          uv: "keep",
          lod,
          tint: (x, y, z, o) =>
            o.set(MACH_DK).multiplyScalar(0.8 + 0.2 * smoothstep(-5, 50, y)),
        },
      );
      add(fanPoly(inner, [0, 0, -1]), "dark", {
        texel: 1 / 8,
        lod,
        color: CORE,
      });
    }
    // spine ridge between the shell rims: a dark raised deck that follows the sloping dome top (TCW
    // aft view / ICS: the shells are separate and the machinery spine stands proud between them)
    {
      const tz =
        lod === 0
          ? [Z.domeFull, 70, 110, 150, 185, 215, Z.split]
          : [Z.domeFull, 130, Z.split];
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
      add(
        quadAt(
          [0, domeTop(Z.domeFull) - 3, Z.domeFull - 0.2],
          [0, 0, -1],
          [1, 0, 0],
          HW.trench * 2 - 1.2,
          RIDGE_H * 2 + 6,
        ),
        "dark",
        {
          texel: 1 / 6,
          lod,
          color: MACH_DK,
        },
      );
    }
    // lower hull, keel, stern block
    add(
      new THREE.BoxGeometry(
        HW.lower * 2,
        Y.eave - Y.lowerBot,
        Z.eng - Z.neckEnd,
      ).translate(0, (Y.eave + Y.lowerBot) / 2, (Z.eng + Z.neckEnd) / 2),
      "dark",
      {
        texel: 1 / 8,
        lod,
        tint: (x, y, z, o) =>
          o
            .set(MACH_DK)
            .multiplyScalar(0.85 + 0.3 * smoothstep(Y.lowerBot, Y.eave, y)),
      },
    );
    add(
      new THREE.BoxGeometry(HW.keel * 2, Y.lowerBot - Y.keelBot, 240).translate(
        0,
        (Y.lowerBot + Y.keelBot) / 2,
        88,
      ),
      "dark",
      {
        texel: 1 / 8,
        lod,
        color: MACH_DK,
      },
    );
    add(
      new THREE.BoxGeometry(HW.stern * 2, 54, Z.eng - 226).translate(
        0,
        -2,
        (Z.eng + 226) / 2,
      ),
      "dark",
      {
        texel: 1 / 8,
        lod,
        color: MACH_DK,
      },
    );
    // ventral engine pod: the lower pair of thrusters sits in its own housing that protrudes aft
    // below the stern face (TCW stern view), the keel running on under it as a pointed tail blade
    add(
      loftZ(
        roundedRect(lod === 0 ? 2 : 1, 0.3, 0.3),
        [
          { z: Z.eng - 34, sx: 20, sy: 9, y: POD_Y },
          { z: Z.eng - 6, sx: 23, sy: 12.5, y: POD_Y },
          { z: Z.eng + POD_AFT, sx: 23, sy: 12.5, y: POD_Y },
        ],
        { capStart: true, capEnd: true, flat: true, texel: 1 / 8 },
      ),
      "dark",
      {
        uv: "keep",
        lod,
        tint: (x, y, z, o) =>
          o.set(MACH_DK).multiplyScalar(0.9 + 0.25 * smoothstep(-30, -12, y)),
      },
    );
    add(
      loftZ(
        roundedRect(1, 0.15, 0.15),
        [
          { z: 206, sx: 16, sy: 6, y: Y.lowerBot - 4 },
          { z: 290, sx: 12, sy: 8, y: Y.lowerBot - 10 },
          { z: 360, sx: 6, sy: 5, y: Y.lowerBot - 6 },
          { z: 404, sx: 1.2, sy: 1.5, y: Y.lowerBot + 2 },
        ],
        { capStart: true, capEnd: true, flat: true, texel: 1 / 8 },
      ),
      "dark",
      { uv: "keep", lod, color: MACH_DK },
    );
    if (lod < 2) {
      // ridge greebles (boxes, tanks, masts) and yellow window rows along its walls
      for (let k = 0; k < (lod === 0 ? 16 : 8); k++) {
        const z = Z.domeFull + 12 + k * (lod === 0 ? 11.5 : 23) + rand() * 4;
        const w = 5 + rand() * 9;
        const h = 2.5 + rand() * 6;
        add(
          new THREE.BoxGeometry(w, h, 5 + rand() * 9).translate(
            (rand() - 0.5) * 22,
            domeTop(z) + RIDGE_H + h / 2,
            z,
          ),
          "dark",
          {
            texel: 1 / 4,
            lod,
            color: rand() < 0.5 ? MACH : MACH_LT,
          },
        );
      }
      for (const x of [-12.5, 12.5])
        for (const [z0, z1] of [
          [Z.domeFull + 4, 130],
          [130, Z.split - 6],
        ])
          add(
            bar(
              [x, domeTop(z0) + RIDGE_H + 1.4, z0],
              [x, domeTop(z1) + RIDGE_H + 1.4, z1],
              2.8,
              2.8,
            ),
            "dark",
            { texel: 1 / 4, lod, color: MACH_LT },
          );
      if (lod === 0)
        for (let k = 0; k < 11; k++) {
          const z = Z.domeFull + 14 + k * 16 + rand() * 6;
          const x = (rand() - 0.5) * 24;
          const h = 5 + rand() * 12;
          const y0 = domeTop(z) + RIDGE_H;
          add(bar([x, y0, z], [x, y0 + h, z], 0.6, 0.6), "dark", {
            texel: 1 / 3,
            lod,
            color: MACH_DK,
          });
        }
      for (const side of [-1, 1])
        for (const dy of [1.6, 4.2])
          for (let k = 0; k < 16; k++) {
            const z = Z.domeFull + 8 + k * 11.5;
            add(
              new THREE.BoxGeometry(0.3, 1.1, 7).translate(
                side * (HW.trench - 0.45),
                domeTop(z) + dy,
                z,
              ),
              "windows",
              {
                lod,
                color: WINDOW,
              },
            );
          }
      // lower hull: pipes, tanks, boxes
      for (const side of [-1, 1]) {
        for (const y of [-18.5, -28.2])
          add(
            tubeZ(
              1.8,
              1.8,
              Z.eng - 10 - Z.neckEnd,
              8,
              side * (HW.lower + 1.5),
              y,
              (Z.eng - 10 + Z.neckEnd) / 2,
              false,
            ),
            "dark",
            {
              texel: 1 / 4,
              lod,
              color: y === -18.5 ? MACH_LT : MACH,
            },
          );
        for (const z of [100, 215])
          add(
            tubeZ(
              6,
              6,
              54,
              lod === 0 ? 14 : 8,
              side * 46,
              Y.lowerBot + 2,
              z,
              false,
            ),
            "dark",
            {
              texel: 1 / 5,
              lod,
              color: MACH,
            },
          );
        if (lod === 0)
          for (let k = 0; k < 10; k++) {
            const z = Z.neckEnd + 12 + k * 29 + rand() * 6;
            if (LOWER_TURRET_Z.some((tz) => Math.abs(tz - z) < 15)) continue;
            add(
              new THREE.BoxGeometry(
                4 + rand() * 4,
                6 + rand() * 8,
                8 + rand() * 10,
              ).translate(side * (HW.lower + 2.5), -14 - rand() * 14, z),
              "dark",
              { texel: 1 / 4, lod, color: rand() < 0.5 ? MACH_DK : MACH },
            );
          }
        // running lights low on the shells
        for (const z of [80, 150])
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
        add(
          tubeZ(
            15,
            15,
            22,
            lod === 0 ? 16 : 10,
            side * 24,
            8,
            Z.eng - 11,
            false,
          ),
          "dark",
          {
            texel: 1 / 5,
            lod,
            color: MACH,
          },
        );
        for (const y of [20, -14])
          add(
            tubeZ(2, 2, 60, 8, side * (HW.stern + 1.5), y, 270, false),
            "dark",
            {
              texel: 1 / 4,
              lod,
              color: MACH_LT,
            },
          );
      }
    }
    // sensor domes on the deck ahead of the tower
    for (const side of [-1, 1]) {
      const p = domePoint(204, 70 * D2R, side, 0);
      const d = new THREE.SphereGeometry(
        6.5,
        lod === 0 ? 14 : 8,
        lod === 0 ? 8 : 5,
      );
      d.scale(1, 0.75, 1);
      d.translate(p[0], p[1], p[2]);
      add(d, "hull", { texel: 1 / 4, lod, color: HULL_DK });
    }
  }

  // ---------------------------------------------------------------------------
  // thrusters: three in the upper row on the stern face between the blades, two below on the ventral
  // pod's face
  // ---------------------------------------------------------------------------
  const nozzles = [
    [-24, 8, 11, 0],
    [0, 10, 11, 0],
    [24, 8, 11, 0],
    [-12, POD_Y, 8.5, POD_AFT],
    [12, POD_Y, 8.5, POD_AFT],
  ];
  for (const lod of [0, 1, 2])
    for (const [x, y, r, dz] of nozzles) {
      const e = nozzleBell(add, {
        x,
        y,
        zMouth: Z.eng + dz + 8,
        r,
        depth: 24,
        protrude: 8,
        lod,
        shell: SHELL,
        shellDark: SHELL_DK,
      });
      if (lod === 0) {
        engines.push(e);
        sternSpill(add, {
          x,
          y,
          zPlate: Z.eng + dz,
          r: r * 1.9,
          plate: SHELL_DK,
          lod,
        });
      }
    }

  // ---------------------------------------------------------------------------
  // bridge module at the trench end (TCW): a dark plinth and stem, then a wide flat deck — wedge
  // forward, rounded aft — whose aft end overhangs the stern as a bay of green-lit glass; yellow
  // window rows along the flanks, a smaller upper deck carrying two tall thin masts
  // ---------------------------------------------------------------------------
  const deck0 = domeTop(Z.towerBase) + RIDGE_H;
  const MAIN = {
    y: deck0 + 17,
    h: 9,
    hw: 19,
    z0: Z.towerBase - 16,
    z1: Z.towerBase + 76,
  };
  const UPPER = {
    y: MAIN.y + MAIN.h / 2 + 3,
    h: 6,
    hw: 8,
    z0: Z.towerBase,
    z1: Z.towerBase + 46,
  };
  // slab with a pill plan: wedge or rounded front, rounded aft end, built as z stations
  const slab = (d, seg, wedge) => {
    const r = d.hw;
    const st = [];
    const ring = (z, sx) =>
      st.push({ z, sx: Math.max(0.6, sx), sy: d.h / 2, y: d.y });
    if (wedge) {
      ring(d.z0, r * 0.3);
      ring(d.z0 + r * 0.9, r * 0.8);
      ring(d.z0 + r * 1.8, r);
    } else
      for (const a of [90, 60, 30, 0]) {
        const t = a * D2R;
        ring(d.z0 + r - r * Math.sin(t), r * Math.cos(t));
      }
    for (const a of [0, 30, 55, 75, 90]) {
      const t = a * D2R;
      ring(d.z1 - r + r * Math.sin(t), r * Math.cos(t));
    }
    return loftZ(roundedRect(seg, 0.25, 0.25), st, {
      capStart: true,
      capEnd: true,
      flat: true,
      texel: 1 / 6,
    });
  };
  for (const lod of [0, 1, 2]) {
    const seg = lod === 0 ? 3 : 1;
    add(
      new THREE.BoxGeometry(HW.trench * 2 + 2, 14, 30).translate(
        0,
        deck0 - 3,
        Z.towerBase,
      ),
      "dark",
      {
        texel: 1 / 6,
        lod,
        color: MACH_DK,
      },
    );
    add(
      new THREE.BoxGeometry(22, 14, 40).translate(
        0,
        deck0 + 6,
        Z.towerBase + 14,
      ),
      "dark",
      {
        texel: 1 / 6,
        lod,
        color: MACH,
      },
    );
    // structure under the overhanging aft half of the deck
    add(
      new THREE.BoxGeometry(12, 8, 50).translate(
        0,
        MAIN.y - MAIN.h / 2 - 3.5,
        Z.towerBase + 38,
      ),
      "dark",
      {
        texel: 1 / 6,
        lod,
        color: MACH_DK,
      },
    );
    add(slab(MAIN, seg, true), "hull", {
      uv: "keep",
      lod,
      tint: (x, y, z, o) =>
        o.copy(HULL).multiplyScalar(0.94 * plankTone(z / 3 + 7)),
    });
    add(slab(UPPER, seg, false), "hull", { uv: "keep", lod, color: HULL_DK });
    if (lod === 2) continue;
    // green glass bay round the aft end of the main deck, running on along the flanks
    const zc1 = MAIN.z1 - MAIN.hw;
    const glass = new THREE.CylinderGeometry(
      MAIN.hw + 0.4,
      MAIN.hw + 0.4,
      4.2,
      lod === 0 ? 20 : 10,
      1,
      true,
      -Math.PI / 2,
      Math.PI,
    );
    glass.translate(0, MAIN.y - 0.6, zc1);
    add(glass, "windows", { lod, color: BRIDGE });
    for (const side of [-1, 1]) {
      add(
        new THREE.BoxGeometry(0.3, 4.0, 22).translate(
          side * (MAIN.hw + 0.2),
          MAIN.y - 0.6,
          zc1 - 11,
        ),
        "windows",
        {
          lod,
          color: BRIDGE,
        },
      );
      add(
        new THREE.BoxGeometry(0.3, 1.3, 40).translate(
          side * (MAIN.hw + 0.2),
          MAIN.y + 2.4,
          MAIN.z0 + 38,
        ),
        "windows",
        {
          lod,
          color: WINDOW,
        },
      );
      add(
        new THREE.BoxGeometry(0.3, 1.2, 30).translate(
          side * (UPPER.hw + 0.2),
          UPPER.y,
          (UPPER.z0 + UPPER.z1) / 2,
        ),
        "windows",
        {
          lod,
          color: WINDOW,
        },
      );
    }
    // mullions over the glass bay
    if (lod === 0)
      for (let k = 0; k <= 10; k++) {
        const a = -Math.PI / 2 + (Math.PI * k) / 10;
        const r = MAIN.hw + 0.6;
        add(
          bar(
            [Math.sin(a) * r, MAIN.y - 3.2, zc1 + Math.cos(a) * r],
            [Math.sin(a) * r, MAIN.y + 1.6, zc1 + Math.cos(a) * r],
            0.6,
            0.6,
          ),
          "dark",
          { texel: 1 / 3, lod, color: MACH_DK },
        );
      }
    // two tall thin masts on the upper deck, a sensor cluster aft of them
    const topY = UPPER.y + UPPER.h / 2;
    const masts = [
      [-3, Z.towerBase + 12, 26],
      [3.5, Z.towerBase + 20, 19],
    ];
    for (const [x, z, h] of masts) {
      add(bar([x, topY, z], [x, topY + h, z], 1, 1), "dark", {
        texel: 1 / 3,
        lod,
        color: MACH_DK,
      });
      if (lod === 0)
        for (const f of [0.35, 0.7])
          add(
            new THREE.BoxGeometry(2.4, 1.2, 1.2).translate(x, topY + h * f, z),
            "dark",
            {
              texel: 1 / 3,
              lod,
              color: MACH,
            },
          );
    }
    if (lod === 0)
      antennaCluster(add, {
        base: [0, topY, Z.towerBase + 36],
        up: [0, 1, 0],
        scale: 0.6,
        lod,
        mast: MACH_DK,
        plate: HULL_DK,
      });
  }

  // ---------------------------------------------------------------------------
  // livery: rim stripe, wide diagonal band, front diagonal, lower stripe, nose band, hexagon + emblem
  // ---------------------------------------------------------------------------
  const S_RIM = DOME_ARC.sOfA(A_RIM);
  // the hexagon sits on the wide diagonal band on the dome's forward third (WSMI: 52-80 m; TCW and ICS:
  // mid-flank a little further aft)
  const zC = 108;
  const sC = 50;
  for (const lod of [0, 1]) {
    for (const side of [-1, 1]) {
      const zl =
        lod === 0 ? [40, 70, 100, 130, 160, 190, 215, 232] : [40, 130, 232];
      band(
        add,
        zl,
        () => S_RIM - 10,
        () => S_RIM - 2.5,
        side,
        2,
        "paint",
        { lod, color: BLUE },
      );
      // wide diagonal band from the rim down and aft through the hexagon
      const zb =
        lod === 0 ? [50, 68, 86, 104, 122, 140, 158, 176] : [50, 114, 176];
      const sc = (z) => sC + (zC - z) * 0.36;
      band(
        add,
        zb,
        (z) => sc(z) - 20,
        (z) => sc(z) + 20,
        side,
        lod === 0 ? 6 : 4,
        "paint",
        {
          lod,
          color: BLUE,
        },
      );
      const zf = lod === 0 ? [36, 46, 56, 66, 76] : [36, 56, 76];
      const sf = (z) => S_RIM - 18 - ((S_RIM - 60) * (z - 36)) / 40;
      band(
        add,
        zf,
        (z) => sf(z) - 10,
        (z) => sf(z) + 10,
        side,
        4,
        "paint",
        { lod, color: BLUE },
      );
      const za =
        lod === 0 ? [196, 214, 232, 250, 268, 286, 302] : [196, 250, 302];
      const sa = (z) => S_RIM - 12 - ((S_RIM - 22) * (z - 196)) / 106;
      band(
        add,
        za,
        (z) => sa(z) - 15,
        (z) => sa(z) + 15,
        side,
        lod === 0 ? 5 : 3,
        "paint",
        {
          lod,
          color: BLUE,
        },
      );
      const zlo =
        lod === 0 ? [0, 20, 40, 72, 100, 150, 200, 232] : [0, 40, 150, 232];
      band(
        add,
        zlo,
        () => 15,
        () => 23,
        side,
        2,
        "paint",
        { lod, color: BLUE },
      );
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
      add(loftStrips(rings, { texel: 1 / 8 }), "paint", {
        uv: "keep",
        lod,
        color: BLUE,
      });
      // Banking Clan hexagon with the Confederacy emblem on the band
      patch(add, hexagon(30), zC, sC, side, 0.95, lod === 0 ? 3 : 2, "paint", {
        lod,
        color: WHITE,
      });
      patch(add, hexagon(7), zC, sC, side, 1.5, 1, "paint", {
        lod,
        color: BLUE_DK,
      });
      if (lod === 0)
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const p0 = [Math.cos(a) * 6.5, Math.sin(a) * 6.5];
          const p1 = [Math.cos(a) * 27, Math.sin(a) * 27];
          patch(add, bar2D(p0, p1, 3.8), zC, sC, side, 1.5, 2, "paint", {
            lod,
            color: BLUE_DK,
          });
        }
    }
  }
  // dark plank seams along the shells (LOD 0)
  for (const side of [-1, 1])
    for (const a of [16, 32, 48, 64]) {
      const zs = [];
      for (let z = Z.domeFull + 10; z < 232; z += 24) zs.push(z);
      zs.push(232);
      const pts = zs.map((z) => domePoint(z, a * D2R, side, 0));
      const nrm = zs.map((z) => domeNormal(z, a * D2R, side));
      const acr = nrm.map((n) => [n[1], -n[0], 0]);
      add(ribbon(pts, nrm, acr, 1.3, 0.28), "dark", {
        uv: "keep",
        lod: 0,
        color: MACH_DK,
      });
    }
}
