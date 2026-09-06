// Bow of the Munificent-class frigate: the hood (an elliptical cowl that thins to a wedge lip at the
// crescent nose and stays open aft over the transceiver drums), the machinery deck and drums under it,
// the sensor cross (dorsal and ventral blades, the 426 m lateral wing on its dark spar) and the hood
// livery.
import * as THREE from "three";
import { bar, slabProfile, smoothstep, sweep, tubeZ, wingProfile } from "./munificentGeo.js";
import { loftStrips, ribbon } from "./munificentHull.js";
import { antennaCluster, slotRow } from "./munificentDetail.js";
import {
  BLUE,
  D2R,
  HOOD_ARC,
  HULL,
  HULL_DK,
  HULL_LT,
  HW,
  MACH,
  MACH_DK,
  MACH_LT,
  OCHRE,
  SHELL_TH,
  SOOT,
  WHITE,
  WINDOW,
  Y,
  Z,
  hoodNormal,
  hoodPoint,
  hoodSection,
  noseShift,
  plankTone,
} from "./munificentSpec.js";

const TEX = 1 / 30;

// flat convex polygon (fan) from 3D points, wound so the normal follows `nrm`
export function fanPoly(pts, nrm) {
  const pos = [];
  for (let i = 1; i + 1 < pts.length; i++) pos.push(...pts[0], ...pts[i], ...pts[i + 1]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  const n = g.attributes.normal;
  if (n.getX(0) * nrm[0] + n.getY(0) * nrm[1] + n.getZ(0) * nrm[2] < 0) {
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
  return g;
}

// hood plating tint: fore-aft plank tones, grime toward the eaves, paler toward the nose
export const hoodTint = (x, y, z, o) => {
  const s = hoodSection(z);
  const a = Math.atan2(y - s.yF, x) / D2R;
  o.copy(HULL).multiplyScalar(plankTone(a + 2));
  const eave = Math.min(a, 180 - a);
  o.multiplyScalar(1 - 0.14 * (1 - smoothstep(4, 26, eave)));
  o.lerp(HULL_LT, 0.25 * smoothstep(-330, Z.nose, z));
  o.lerp(SOOT, 0.08 * smoothstep(-170, Z.hoodEnd, z));
};

const hoodRing = (z, a0, a1, m, lift = 0) => {
  const out = [];
  for (let j = 0; j < m; j++)
    out.push(hoodPoint(z, (a0 + ((a1 - a0) * j) / (m - 1)) * D2R, lift));
  return out;
};

// band on the hood between arc lengths sLo(z)..sHi(z) (metres from the starboard eave), m points across
function bandOnHood(add, zs, sLo, sHi, m, mat, opts, lift = 0.45) {
  const rings = zs.map((z) => {
    const out = [];
    const lo = sLo(z);
    const hi = sHi(z);
    for (let j = 0; j < m; j++)
      out.push(hoodPoint(z, HOOD_ARC.aOfS(lo + ((hi - lo) * j) / (m - 1)), lift));
    return out;
  });
  add(loftStrips(rings, { texel: 1 / 8 }), mat, { uv: "keep", ...opts });
}

export function buildBow(add, rand) {
  const zNose = Z.nose;
  // ---------------------------------------------------------------------------
  // hood plating: one closed cowl from the nose lip to the open aft rim
  // ---------------------------------------------------------------------------
  const frontZ = {
    0: [zNose, -409, -404, -398, -390, -380, -368, -355, -340, -322, -300, -280, -262, -244, -226, -208, -190, -172, -158, Z.hoodEnd],
    1: [zNose, -405, -394, -378, -352, -318, -282, -246, -210, -176, Z.hoodEnd],
    2: [zNose, -403, -388, -362, -318, -268, -210, Z.hoodEnd],
  };
  for (const lod of [0, 1, 2]) {
    const allZ = frontZ[lod];
    const m = lod === 0 ? 29 : lod === 1 ? 17 : 9;
    add(loftStrips(allZ.map((z) => hoodRing(z, 0, 180, m)), { texel: TEX }), "hull", {
      uv: "keep",
      lod,
      tint: hoodTint,
    });
    // inner face of the cowl (seen through the aft arch)
    if (lod < 2) {
      const zsIn = allZ.filter((z) => z >= -300);
      add(loftStrips(zsIn.map((z) => hoodRing(z, 180, 0, m, -SHELL_TH)), { texel: 1 / 8 }), "dark", {
        uv: "keep",
        lod,
        tint: (x, y, z, o) => o.set(MACH_DK).multiplyScalar(0.7 + 0.3 * smoothstep(-300, -170, z)),
      });
    }
    // shovel floor from the lip back to the machinery deck
    {
      const zs = frontZ[lod].filter((z) => z <= -300);
      zs.push(-296);
      const m = lod === 0 ? 13 : lod === 1 ? 7 : 5;
      const rings = zs.map((z) => {
        const s = hoodSection(z);
        const out = [];
        for (let j = 0; j < m; j++) {
          const x = -s.hw + (2 * s.hw * j) / (m - 1);
          out.push([x, s.yF, z + noseShift(x, z)]);
        }
        return out;
      });
      add(loftStrips(rings, { texel: TEX }), "hull", {
        uv: "keep",
        lod,
        tint: (x, y, z, o) => o.copy(HULL_DK).multiplyScalar(0.92 * plankTone(x / 6)),
      });
    }
    // nose lip: close the wedge between the arch and the floor
    {
      const m = lod === 0 ? 25 : 13;
      const top = hoodRing(zNose, 0, 180, m);
      const flat = top.map((p) => [p[0], hoodSection(zNose).yF, p[2]]);
      add(loftStrips([top, flat], { texel: 1 / 6, orient: [0, 10, zNose + 120] }), "dark", {
        uv: "keep",
        lod,
        color: MACH_DK,
      });
    }
    // aft rim of the cowl
    if (lod < 2) {
      const m = lod === 0 ? 25 : 13;
      add(
        loftStrips(
          [hoodRing(Z.hoodEnd, 0, 180, m), hoodRing(Z.hoodEnd, 0, 180, m, -SHELL_TH)],
          { texel: 1 / 6, orient: [0, 10, Z.hoodEnd - 100] },
        ),
        "dark",
        { uv: "keep", lod, color: MACH_DK },
      );
    }
  }

  // ---------------------------------------------------------------------------
  // machinery deck under the cowl, transceiver drums, conduits
  // ---------------------------------------------------------------------------
  for (const lod of [0, 1, 2]) {
    const deckHW = 50;
    add(
      new THREE.BoxGeometry(deckHW * 2, Y.hoodFloor - Y.deckBot, Z.hoodEnd + 322).translate(
        0,
        (Y.hoodFloor + Y.deckBot) / 2,
        (Z.hoodEnd - 322) / 2,
      ),
      "dark",
      { texel: 1 / 8, lod, color: MACH_DK },
    );
    if (lod === 2) continue;
    // drums lying fore-aft on the deck, seen through the open aft rim
    const seg = lod === 0 ? 18 : 10;
    for (const x of [-40, -14, 14, 40]) {
      const r = 11;
      add(tubeZ(r, r, 90, seg, x, Y.hoodFloor + r - 1, -200, false), "dark", {
        texel: 1 / 6,
        lod,
        tint: (px, py, pz, o) =>
          o.set(MACH_LT).multiplyScalar(0.8 + 0.25 * smoothstep(-6, 12, py)),
      });
      if (lod === 0)
        for (const z of [-238, -200, -162])
          add(tubeZ(r + 1.2, r + 1.2, 3, seg, x, Y.hoodFloor + r - 1, z, true), "dark", {
            texel: 1 / 6,
            lod,
            color: MACH_DK,
          });
    }
    // conduits between the drums and along the deck flanks
    for (const x of [-27, 0, 27])
      add(tubeZ(2.2, 2.2, 100, 8, x, Y.hoodFloor + 1.5, -200, false), "dark", {
        texel: 1 / 4,
        lod,
        color: MACH,
      });
    for (const side of [-1, 1])
      for (const y of [-13, -20, -26])
        add(tubeZ(1.8, 1.8, 160, 8, side * (deckHW + 1.4), y, -226, false), "dark", {
          texel: 1 / 4,
          lod,
          color: y === -20 ? MACH_LT : MACH,
        });
    // frames and boxes on the exposed underside (the dark machinery under the cowl)
    if (lod === 0)
      for (const side of [-1, 1])
        for (let k = 0; k < 8; k++) {
          const z = -296 + k * 20 + rand() * 4;
          add(
            new THREE.BoxGeometry(3 + rand() * 4, 5 + rand() * 9, 7 + rand() * 8).translate(side * (deckHW + 2.5), -12 - rand() * 12, z),
            "dark",
            { texel: 1 / 4, lod, color: rand() < 0.5 ? MACH_DK : MACH },
          );
        }
  }

  // ---------------------------------------------------------------------------
  // sensor cross: dorsal blade, ventral blade, lateral wing on its spar
  // ---------------------------------------------------------------------------
  const finTint = (x, y, z, o) => {
    o.copy(HULL).multiplyScalar(0.96 * plankTone(y / 4.5));
    o.lerp(HULL_DK, 0.35 * (1 - smoothstep(0, 1, Math.abs(x) / 5)));
  };
  const blade = (lod, y0, y1, chord0, chord1, th0, th1, rake) => {
    const prof = slabProfile(0.26, 0.42);
    const n = lod === 0 ? 6 : lod === 1 ? 3 : 1;
    const st = [];
    const dir = y1 > y0 ? 1 : -1;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      st.push({
        p: [0, y0 + (y1 - y0) * t, Z.fin - rake * t],
        sx: (th0 + (th1 - th0) * t) / 2,
        sy: (chord0 + (chord1 - chord0) * t) / 2,
        t: [0, dir, 0],
      });
    }
    add(sweep(prof, st, { up: [0, 0, -1], capEnd: true, flat: true, texel: 1 / 10 }), "hull", {
      uv: "keep",
      lod,
      tint: finTint,
    });
    if (lod === 2) return;
    // stacked horizontal plating bands and vertical seams on both faces
    const h = y1 - y0;
    const nb = lod === 0 ? 9 : 4;
    for (let k = 0; k < nb; k++) {
      const t = 0.1 + (0.82 * k) / (nb - 1);
      const y = y0 + h * t;
      const th = th0 + (th1 - th0) * t;
      const ch = chord0 + (chord1 - chord0) * t;
      for (const s of [-1, 1])
        add(
          new THREE.BoxGeometry(0.5, 1.3, ch * 0.8).translate(s * (th / 2 + 0.2), y, Z.fin - rake * t),
          "dark",
          { texel: 1 / 3, lod, color: MACH_DK },
        );
    }
    if (lod === 0)
      for (const u of [-0.3, 0.05, 0.4]) {
        for (const s of [-1, 1])
          add(
            bar(
              [s * (th0 / 2 + 0.15), y0 + h * 0.06, Z.fin + u * chord0 * 0.5],
              [s * (th1 / 2 + 0.15), y0 + h * 0.94, Z.fin - rake * 0.94 + u * chord1 * 0.5],
              0.5,
              0.5,
            ),
            "dark",
            { texel: 1 / 3, lod, color: MACH_DK },
          );
      }
    // head block with a lit sensor band
    const yh = y1 + dir * 3.5;
    add(
      new THREE.BoxGeometry(th1 + 3.5, 7, chord1 * 0.82).translate(0, yh, Z.fin - rake - 1.5),
      "hull",
      { texel: 1 / 5, lod, color: HULL_DK },
    );
    for (const s of [-1, 1])
      add(
        new THREE.BoxGeometry(0.3, 1.6, chord1 * 0.6).translate(s * (th1 / 2 + 1.9), yh, Z.fin - rake - 1.5),
        "windows",
        { lod, color: WINDOW },
      );
  };
  for (const lod of [0, 1, 2]) {
    blade(lod, Y.hoodPeak - 8, Y.finTop - 7, 46, 38, 9.5, 6.5, 6);
    blade(lod, Y.deckBot + 4, Y.lowFinBot + 6, 42, 32, 8.5, 5.5, 0);
    if (lod === 0) {
      add(bar([0, Y.finTop - 1, Z.fin - 9], [0, Y.finTop + 12, Z.fin - 9], 0.8, 0.8), "dark", {
        texel: 1 / 3,
        lod,
        color: MACH_DK,
      });
      add(bar([0, Y.finTop + 3, Z.fin - 14], [0, Y.finTop + 3, Z.fin - 4], 0.5, 0.5), "dark", {
        texel: 1 / 3,
        lod,
        color: MACH_DK,
      });
    }
  }

  // lateral wing: lens plank, tapering 42 -> 26 m chord and 8 -> 3.5 m thick (TCW: a thin plate about
  // a tenth of the half-span in chord)
  const chordAt = (x) => 42 - 16 * Math.max(0, (Math.abs(x) - 40) / 173);
  const thickAt = (x) => 8 - 4.5 * Math.max(0, (Math.abs(x) - 40) / 173);
  const wingTint = (x, y, z, o) => {
    o.copy(HULL).multiplyScalar(0.98 * plankTone(x / 11 + 100));
    o.multiplyScalar(y < Y.wing - 0.3 ? 0.88 : 1);
    o.lerp(SOOT, 0.1 * smoothstep(Z.fin + 8, Z.fin + 24, z));
  };
  for (const lod of [0, 1, 2]) {
    const xs =
      lod === 0
        ? [213, 209, 200, 186, 166, 142, 114, 84, 50]
        : lod === 1
          ? [213, 205, 180, 140, 90]
          : [213, 200, 120];
    const stX = [...xs.map((x) => -x), ...xs.slice().reverse()];
    add(
      sweep(
        wingProfile(0.1, 0.7),
        stX.map((x) => ({
          p: [x, Y.wing, Z.fin],
          sx: chordAt(x) / 2,
          sy: thickAt(x) / 2,
          t: [1, 0, 0],
        })),
        { capStart: true, capEnd: true, flat: true, texel: 1 / 10 },
      ),
      "hull",
      { uv: "keep", lod, tint: wingTint },
    );
    // spar: a dark beam through the hood carrying the wing and both blades
    add(new THREE.BoxGeometry(130, 16, 40).translate(0, Y.wing, Z.fin), "dark", {
      texel: 1 / 6,
      lod,
      color: MACH_DK,
    });
    add(new THREE.BoxGeometry(40, 18, 30).translate(0, 22, Z.fin), "dark", {
      texel: 1 / 6,
      lod,
      color: MACH,
    });
    for (const side of [-1, 1]) {
      // wing tips: sensor pods
      add(new THREE.BoxGeometry(7, 6, 26).translate(side * 213, Y.wing, Z.fin), "dark", {
        texel: 1 / 4,
        lod,
        color: MACH_DK,
      });
      if (lod === 2) continue;
      add(bar([side * 214, Y.wing + 2, Z.fin], [side * 214, Y.wing + 15, Z.fin], 0.6, 0.6), "dark", {
        texel: 1 / 3,
        lod,
        color: MACH_DK,
      });
      // ochre edge stripes and the dark spar seam on the upper surface
      const xs2 = lod === 0 ? [74, 92, 112, 134, 156, 178, 196, 206] : [74, 140, 206];
      for (const [u0, u1] of [
        [0.8, 0.58],
        [-0.58, -0.8],
      ]) {
        const rings = xs2.map((x) => {
          const c = chordAt(x) / 2;
          const th = thickAt(x) / 2;
          const vAt = (u) => 0.78 - (Math.max(0, Math.abs(u) - 0.7) / 0.3) * 0.68;
          return [
            [side * x, Y.wing + th * vAt(u0) + 0.3, Z.fin - u0 * c],
            [side * x, Y.wing + th * vAt(u1) + 0.3, Z.fin - u1 * c],
          ];
        });
        add(loftStrips(rings, { texel: 1 / 6, orient: [side * 160, -200, Z.fin] }), "paint", {
          uv: "keep",
          lod,
          color: OCHRE,
        });
      }
      add(
        loftStrips(
          xs2.map((x) => [
            [side * x, Y.wing + thickAt(x) / 2 + 0.25, Z.fin - 1.6],
            [side * x, Y.wing + thickAt(x) / 2 + 0.25, Z.fin + 1.6],
          ]),
          { texel: 1 / 6, orient: [side * 160, -200, Z.fin] },
        ),
        "dark",
        { uv: "keep", lod, color: MACH_DK },
      );
      // small white hexagon on the upper surface near the tip
      {
        const x = side * 168;
        const y = Y.wing + thickAt(168) / 2 * 0.98 + 0.4;
        const pts = [];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
          pts.push([x + Math.cos(a) * 6.5, y, Z.fin + Math.sin(a) * 6.5]);
        }
        add(fanPoly(pts, [0, 1, 0]), "paint", { texel: 1 / 4, lod, color: WHITE });
      }
      // wing root fairing where the plank leaves the cowl, greebles and leading-edge lights outboard
      add(new THREE.BoxGeometry(12, 11, 46).translate(side * 70, Y.wing + 0.5, Z.fin), "hull", {
        texel: 1 / 5,
        lod,
        color: HULL_DK,
      });
      if (lod === 0) {
        for (let k = 0; k < 6; k++) {
          const x = side * (78 + k * 5.2);
          add(
            new THREE.BoxGeometry(3.2, 1.6 + rand() * 2, 5 + rand() * 8).translate(x, Y.wing + thickAt(x) / 2 + 1, Z.fin - 6 + rand() * 12),
            "dark",
            { texel: 1 / 3, lod, color: MACH },
          );
        }
        for (let k = 0; k < 9; k++) {
          const x = side * (110 + k * 10.5);
          const c = chordAt(x) / 2;
          add(
            new THREE.BoxGeometry(3, 1.4, 2.4).translate(x, Y.wing + thickAt(x) / 2 * 0.5 + 0.4, Z.fin - c * 0.94),
            "dark",
            { texel: 1 / 3, lod, color: MACH_DK },
          );
        }
      }
      // lit strips along the leading and trailing edges (TCW: yellow-lit wing edges)
      if (lod < 2)
        for (const s of [-1, 1]) {
          const xs3 = lod === 0 ? [80, 110, 140, 170, 204] : [80, 204];
          add(
            loftStrips(
              xs3.map((x) => {
                const zE = Z.fin + s * (chordAt(x) / 2) * 0.985;
                return [
                  [side * x, Y.wing - 0.45, zE],
                  [side * x, Y.wing + 0.45, zE],
                ];
              }),
              { texel: 1 / 4, orient: [side * 140, Y.wing, Z.fin] },
            ),
            "windows",
            { uv: "keep", lod, color: WINDOW },
          );
        }
    }
  }

  // ---------------------------------------------------------------------------
  // hood livery: two blue plank stripes along the top per side and a diagonal band on each flank
  // ---------------------------------------------------------------------------
  const sTotal = HOOD_ARC.total;
  const sA = HOOD_ARC.sOfA(56 * D2R);
  for (const lod of [0, 1]) {
    const zs = lod === 0 ? [-392, -380, -365, -345, -320, -295, -270, -245, -220, -195, -170, -158] : [-392, -360, -310, -250, -200, -158];
    for (const side of [-1, 1]) {
      const sc = side > 0 ? sA : sTotal - sA;
      bandOnHood(add, zs, () => sc - 4.2, () => sc + 4.2, 2, "paint", { lod, color: BLUE });
      // two diagonal bands on each flank (TCW), rising toward the top going aft
      for (const [zStart, span] of [
        [-398, 98],
        [-262, 90],
      ]) {
        const zd = lod === 0 ? [0, 0.14, 0.3, 0.48, 0.66, 0.84, 1].map((t) => zStart + span * t) : [0, 0.5, 1].map((t) => zStart + span * t);
        const sc2 = (z) => {
          const t = (z - zStart) / span;
          const a = (18 + 30 * t) * D2R;
          const s = HOOD_ARC.sOfA(a);
          return side > 0 ? s : sTotal - s;
        };
        bandOnHood(add, zd, (z) => sc2(z) - 6.5, (z) => sc2(z) + 6.5, 3, "paint", { lod, color: BLUE });
      }
    }
  }
  // dark plank seams along the hood (LOD 0)
  for (const a of [12, 46, 90, 134, 168]) {
    const zs = [];
    for (let z = -396; z < -150; z += 22) zs.push(z);
    zs.push(-150);
    const pts = zs.map((z) => hoodPoint(z, a * D2R, 0));
    const nrm = zs.map((z) => hoodNormal(z, a * D2R));
    const acr = nrm.map((n) => [n[1], -n[0], 0]);
    add(ribbon(pts, nrm, acr, 1.3, 0.28), "dark", { uv: "keep", lod: 0, color: MACH_DK });
  }
  // window rows low on the flanks and antenna clusters on the ridge
  for (const lod of [0, 1])
    for (const side of [-1, 1]) {
      const a = (side > 0 ? 11 : 169) * D2R;
      for (const z of [-330, -282, -234, -180])
        slotRow(add, {
          c: hoodPoint(z, a, 0),
          n: hoodNormal(z, a),
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
  for (const z of [-262, -166])
    antennaCluster(add, {
      base: hoodPoint(z, Math.PI / 2, 0),
      up: [0, 1, 0],
      scale: 0.8,
      lod: 0,
      mast: MACH_DK,
      plate: HULL_DK,
    });
}
