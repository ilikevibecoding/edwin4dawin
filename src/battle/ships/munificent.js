// Munificent-class star frigate (Separatist), 825 m long, ~430 m across the prow. Original procedural
// geometry after the film's design language: a long ribbed spine with an exposed dorsal machinery
// channel over a dark core, a deep crescent "pincer" prow whose two jaw arms thicken toward the neck
// and curve forward around a 190 m notch (spinal guns at the tips, recessed sensor slots on the inner
// faces), a bulbous sooty aft section with a recessed stern carrying a ring of deep engine bells, a
// thick dorsal fin with a set-back window tier and a shorter ventral fin, braced sensor dishes, a lit
// ventral docking bay, tracking heavy turrets on the neck and light turrets along the spine, plating at
// three scales (raised lipped plates, ribbed flank panels, hatches) with per-plate tone variation, and
// weathering (soot aft of the guns and around the nozzles, seam grime, paint fade, scorch rings).
import * as THREE from "three";
import { assemble } from "./shipKit.js";
import {
  bar,
  blade,
  bladeU,
  channelRect,
  col,
  jitter,
  loftZ,
  mirrorV,
  mix,
  mpart,
  openBoxInterior,
  plateZ,
  quadAt,
  frameAt,
  ringZ,
  rng,
  roundedRect,
  smoothstep,
  superellipse,
  superellipsePoint,
  sweep,
  table,
  tubeZ,
} from "./munificentGeo.js";
import { turretType } from "./munificentTurrets.js";
import { nozzleBell, sootStreak, sternSpill } from "./munificentEngines.js";
import {
  antennaCluster,
  dishMast,
  hatch,
  ribbedPanel,
  scorchRing,
  slotRow,
  slotWindow,
} from "./munificentDetail.js";

export const MUNIFICENT = { length: 825, width: 430, height: 290 };

// palette: vertex tints over the shared plating (albedo ~0.62 before tint) / machinery textures.
// Calibrated so sunlit tan lands near sRGB 175 and shadow faces near 50.
const TAN = col(0xdcc296);
const TAN_LT = TAN.clone().multiplyScalar(1.08);
const TAN_DK = TAN.clone().multiplyScalar(0.84);
const TAN_FADE = col(0xe2d2b8); // paint fade: lighter, less saturated
const SOOT = col(0x2e2824);
const RECESS = 0x9a8c7a; // grey-brown machinery
const RECESS_DK = 0x6a5e54;
const CORE = 0x504740;
const RUST = 0x7e4a2c;
const RUST_DK = 0x62391f;
const WINDOW = 0xffe6c4;
const WINDOW_COOL = 0x9ad4ff;
const SHELL = col(0x6a5f56); // nozzle bells
const SHELL_DK = col(0x3a332e);
const PLATE = col(0x4c443e); // stern plate

export function buildMunificent(mats) {
  const L = MUNIFICENT.length;
  const parts = [];
  const hardpoints = [];
  const engines = [];
  const turrets = [];
  const add = (geo, mat, opts) => parts.push(mpart(geo, mat, opts));
  const rand = rng(7331);
  const TEX = 1 / 30; // large plating scale on the main hull surfaces (plates 4-9 m)

  // ---------------------------------------------------------------------------
  // prow: one crescent swept from the port tip through the spine head to the starboard tip
  // ---------------------------------------------------------------------------
  const curve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(0, 0, -160),
    new THREE.Vector3(108, 0, -160),
    new THREE.Vector3(200, 0, -236),
    new THREE.Vector3(204, 0, -396),
  );
  const HC = [
    [0, 46],
    [0.2, 55],
    [0.4, 53],
    [0.6, 44],
    [0.8, 31],
    [0.9, 23],
    [1, 16],
  ]; // half chord
  const HT = [
    [0, 23],
    [0.2, 21.5],
    [0.4, 18.5],
    [0.6, 14.5],
    [0.8, 10.5],
    [0.9, 8.2],
    [1, 6.5],
  ]; // half thickness
  const tipScale = (s) =>
    s > 0.93
      ? 0.3 + 0.7 * Math.sqrt(Math.max(0, 1 - ((s - 0.93) / 0.07) ** 2))
      : 1;
  // frame along the crescent: s in [0,1] from the centre to the tip on side ±1; travel is port -> starboard
  const prowFrame = (s, side) => {
    const p = curve.getPointAt(s);
    const t = curve.getTangentAt(s);
    if (side < 0) {
      p.x = -p.x;
      t.x = -t.x;
      t.negate();
    }
    const N = new THREE.Vector3(0, 1, 0).cross(t).normalize(); // profile u (leading / inboard side)
    const B = new THREE.Vector3().crossVectors(t, N).normalize(); // profile v (up)
    return { p, t, N, B, hc: table(HC, s), ht: table(HT, s) };
  };
  const prowStation = (s, side, kx = 1, ky = 1, dy = 0) => {
    const f = prowFrame(s, side);
    const k = tipScale(s);
    return {
      p: [f.p.x, f.p.y, f.p.z],
      t: [f.t.x, f.t.y, f.t.z],
      sx: f.hc * k * kx,
      sy: f.ht * k * ky + dy,
    };
  };
  // point on the crescent surface at (s, side, u, v) plus its outward normal
  const prowSurf = (s, side, u, v, lift = 0) => {
    const f = prowFrame(s, side);
    const k = tipScale(s);
    const n = f.N.clone()
      .multiplyScalar(u * f.ht)
      .addScaledVector(f.B, v * f.hc)
      .normalize();
    if (Math.abs(u) > 0.99 && Math.abs(v) < 0.6)
      n.copy(f.N).multiplyScalar(Math.sign(u));
    if (Math.abs(v) > 0.99 && Math.abs(u) < 0.6)
      n.copy(f.B).multiplyScalar(Math.sign(v));
    const p = f.p
      .clone()
      .addScaledVector(f.N, u * f.hc * k)
      .addScaledVector(f.B, v * f.ht * k)
      .addScaledVector(n, lift);
    return { p: p.toArray(), n: n.toArray(), t: f.t.toArray() };
  };
  // s samples across the whole crescent: [-1 .. 1] (negative = port)
  const prowSamples = (nHalf) => {
    const out = [];
    const ss = [];
    for (let i = 0; i < nHalf; i++) ss.push((i / (nHalf - 1)) * 0.93);
    ss.push(0.965, 1);
    for (let i = ss.length - 1; i >= 0; i--) out.push(-ss[i]);
    for (let i = 1; i < ss.length; i++) out.push(ss[i]);
    return out;
  };
  const prowProfile = roundedRect(3, 0.3, 0.36);
  // base crescent tint: darker than the plates (it shows in the seams as grime), fading toward the tips
  const prowBase = (x, y, z, out) => {
    const fade = smoothstep(120, 200, Math.abs(x));
    mix(TAN, TAN_FADE, 0.35 * fade, out);
    out.multiplyScalar(0.74 * (y < 0 ? 0.94 : 1));
  };
  for (const lod of [0, 1, 2]) {
    const nHalf = lod === 0 ? 26 : lod === 1 ? 13 : 7;
    const prof = lod === 2 ? roundedRect(1, 0.3, 0.36) : prowProfile;
    const stations = prowSamples(nHalf).map((s) =>
      prowStation(Math.abs(s), s < 0 ? -1 : 1),
    );
    add(
      sweep(prof, stations, { capStart: true, capEnd: true, texel: TEX }),
      "hull",
      {
        uv: "keep",
        lod,
        tint: lod === 2 ? (x, y, z, o) => o.copy(TAN) : prowBase,
      },
    );
  }
  // raised, lipped plate groups over the crescent's top and bottom with stepped (staggered) edges
  const plateTint = (base, s0, s1, tone) => (x, y, z, o) => {
    const fade = smoothstep(120, 200, Math.abs(x));
    mix(base, TAN_FADE, 0.45 * fade, o).multiplyScalar(tone);
  };
  for (const lod of [0, 1]) {
    const nSeg = lod === 0 ? 7 : 4;
    const gap = 0.006;
    for (const side of [-1, 1]) {
      for (let j = 0; j < nSeg; j++) {
        const s0 = (j / nSeg) * 0.92 + (j === 0 ? 0.0 : gap);
        const s1 = ((j + 1) / nSeg) * 0.92 - gap;
        const nSt = lod === 0 ? 5 : 3;
        const ss = [];
        for (let i = 0; i < nSt; i++) ss.push(s0 + ((s1 - s0) * i) / (nSt - 1));
        const ord = side < 0 ? ss.slice().reverse() : ss;
        const stepped = j % 2 ? [-0.7, 0.56] : [-0.56, 0.7];
        // open strips face outward when they run counter-clockwise round the section: top strips go
        // from +u to -u (mirrorV reverses them for the underside)
        const strip = [
          [stepped[1], 0.97],
          [stepped[1] - 0.06, 1],
          [stepped[0] + 0.06, 1],
          [stepped[0], 0.97],
        ];
        const lip = [
          [stepped[1] + 0.05, 0.985],
          [stepped[0] - 0.05, 0.985],
        ];
        const tone = 1 + (rand() - 0.5) * 0.16;
        const base = j % 3 === 1 ? TAN_LT : TAN;
        const dy = j % 2 ? 1.5 : 1.9;
        for (const [prof, lp, up] of [
          [strip, lip, 1],
          [mirrorV(strip), mirrorV(lip), -1],
        ]) {
          const st = ord.map((s) => prowStation(s, side, 0.985, 1, dy));
          const stL = ord.map((s) => prowStation(s, side, 0.99, 1, dy * 0.45));
          add(sweep(lp, stL, { closed: false, texel: 1 / 8 }), "dark", {
            color: RECESS_DK,
            uv: "keep",
            lod,
          });
          add(sweep(prof, st, { closed: false, texel: TEX }), "hull", {
            uv: "keep",
            lod,
            tint: plateTint(base, s0, s1, tone * (up < 0 ? 0.93 : 1)),
          });
        }
      }
    }
  }
  // rust-painted leading-edge arcs on two mid-span plates per side
  {
    const per = 4;
    const arcTop = prowProfile
      .slice(0, per)
      .map(([u, v]) => [u * 1.012, v * 1.012]);
    for (const lod of [0, 1])
      for (const side of [-1, 1])
        for (const [s0, s1] of [
          [0.2, 0.31],
          [0.36, 0.5],
        ]) {
          const ss = [s0, (s0 + s1) / 2, s1];
          const stations = (side < 0 ? ss.slice().reverse() : ss).map((s) =>
            prowStation(s, side, 1, 1, 0),
          );
          add(sweep(arcTop, stations, { closed: false }), "paint", {
            color: RUST,
            lod,
            uv: "keep",
          });
        }
  }
  // dark machinery bands: underside, trailing face, notch faces; raised spar along the aft third of the top
  for (const lod of [0, 1]) {
    const stations = prowSamples(lod === 0 ? 16 : 9)
      .filter((s) => Math.abs(s) < 0.94)
      .map((s) => prowStation(Math.abs(s), s < 0 ? -1 : 1, 1, 1, 0.45));
    add(
      sweep(
        [
          [-0.5, -1],
          [-0.2, -1],
        ],
        stations,
        { closed: false, texel: 1 / 5 },
      ),
      "dark",
      { color: RECESS, uv: "keep", lod },
    );
    const trail = prowSamples(lod === 0 ? 16 : 9)
      .filter((s) => Math.abs(s) < 0.9)
      .map((s) => prowStation(Math.abs(s), s < 0 ? -1 : 1, 1.012, 0.95, 0));
    add(
      sweep(
        [
          [-1, -0.15],
          [-1, -0.55],
        ],
        trail,
        { closed: false, texel: 1 / 5 },
      ),
      "dark",
      { color: RECESS_DK, uv: "keep", lod },
    );
    const lead = prowSamples(lod === 0 ? 16 : 9)
      .filter((s) => Math.abs(s) < 0.62)
      .map((s) => prowStation(Math.abs(s), s < 0 ? -1 : 1, 1.012, 0.95, 0));
    add(
      sweep(
        [
          [1, -0.6],
          [1, -0.2],
        ],
        lead,
        { closed: false, texel: 1 / 5 },
      ),
      "dark",
      { color: RECESS_DK, uv: "keep", lod },
    );
    const spar = prowSamples(lod === 0 ? 18 : 9)
      .filter((s) => Math.abs(s) < 0.9)
      .map((s) => prowStation(Math.abs(s), s < 0 ? -1 : 1, 1, 1, 3.1));
    add(
      sweep(
        [
          [-0.14, 0.985],
          [-0.2, 1],
          [-0.44, 1],
          [-0.5, 0.985],
        ],
        spar,
        { closed: false, texel: 1 / 8 },
      ),
      "hull",
      { color: TAN_DK, uv: "keep", lod },
    );
  }
  // window slots: trailing face near the spine head (two rows) and along the notch faces
  for (const lod of [0, 1])
    for (const side of [-1, 1]) {
      for (const [s, vRow, len] of [
        [0.08, 0.3, 14],
        [0.16, 0.3, 14],
        [0.25, 0.3, 12],
        [0.12, -0.2, 12],
        [0.22, -0.2, 12],
      ]) {
        if (lod === 1 && vRow < 0) continue;
        const q = prowSurf(s, side, -1, vRow);
        slotWindow(add, {
          c: q.p,
          n: q.n,
          along: q.t,
          len,
          h: 2.4,
          lod,
          panes: 3,
          glow: WINDOW,
          rim: RECESS_DK,
        });
      }
      for (const s of [0.1, 0.2, 0.3]) {
        const q = prowSurf(s, side, 1, 0.25);
        slotWindow(add, {
          c: q.p,
          n: q.n,
          along: q.t,
          len: 12,
          h: 2.2,
          lod,
          panes: 3,
          glow: WINDOW,
          rim: RECESS_DK,
        });
      }
      // recessed sensor slot on each arm's inner (notch) face: dark inset frame with a cool strip
      const q = prowSurf(0.58, side, 1, 0.05);
      add(frameAt(q.p, q.n, q.t, 30, 7, 1.0, 0.7, 0.06), "dark", {
        color: RECESS_DK,
        texel: 1 / 4,
        lod,
      });
      add(quadAt(q.p, q.n, q.t, 28, 5, 0.06), "dark", {
        color: 0x2a2622,
        texel: 1 / 3,
        lod,
      });
      add(quadAt(q.p, q.n, q.t, 22, 0.9, 0.12), "windows", {
        color: WINDOW_COOL,
        lod,
        uv: "keep",
      });
    }
  // hatches at two scales and vents along the crescent top (LOD 0; big hatches also at LOD 1)
  for (const side of [-1, 1]) {
    for (const [s, u, w, h] of [
      [0.14, 0.12, 9, 11],
      [0.36, -0.15, 8, 10],
      [0.6, 0.05, 7, 9],
    ])
      for (const lod of [0, 1]) {
        const q = prowSurf(s, side, u, 1, 1.9);
        hatch(add, {
          c: q.p,
          n: q.n,
          along: q.t,
          w,
          h,
          lod,
          color: TAN_LT,
          rimColor: RECESS_DK,
          big: true,
        });
      }
    for (let s = 0.06; s < 0.84; s += 0.055 + rand() * 0.04) {
      const u = -0.3 + rand() * 0.75;
      const q = prowSurf(s, side, u, 1, 1.9);
      hatch(add, {
        c: q.p,
        n: q.n,
        along: q.t,
        w: 3 + rand() * 1.5,
        h: 3.5 + rand() * 1.5,
        lod: 0,
        color: rand() < 0.5 ? TAN_LT : TAN_DK,
        rimColor: RECESS_DK,
      });
    }
    for (let s = 0.1; s < 0.8; s += 0.05 + rand() * 0.05) {
      const q = prowSurf(s, side, -0.72 - rand() * 0.08, 1, 1.9);
      add(quadAt(q.p, q.n, q.t, 4 + rand() * 4, 1.6, 0.3), "dark", {
        color: rand() < 0.5 ? RECESS : RECESS_DK,
        texel: 1 / 3,
        lod: 0,
      });
    }
  }
  // heavy spinal gun mounts at the arm tips (dorsal and ventral), barrels reaching past the tips
  for (const side of [-1, 1]) {
    const f = prowFrame(0.86, side);
    const top = f.ht;
    for (const up of [1, -1]) {
      const cx = f.p.x;
      const cz = f.p.z;
      const baseY = up * (top + 1.2);
      for (const lod of [0, 1, 2]) {
        const seg = lod === 0 ? 14 : lod === 1 ? 10 : 6;
        const base = new THREE.CylinderGeometry(10, 11.5, 3, seg);
        base.translate(cx, baseY, cz);
        add(base, "hull", { color: TAN, texel: 1 / 6, lod });
        if (lod < 2) {
          const dome = new THREE.CylinderGeometry(6.5, 9, 6, 8);
          dome.translate(cx, baseY + up * 3.5, cz);
          add(dome, "hull", { color: TAN_DK, texel: 1 / 5, lod });
          const mant = new THREE.BoxGeometry(11, 5, 7);
          mant.translate(cx, baseY + up * 4, cz - 8);
          add(mant, "dark", { color: RECESS_DK, texel: 1 / 4, lod });
        } else {
          const h = new THREE.BoxGeometry(16, 9, 18);
          h.translate(cx, baseY + up * 3, cz);
          add(h, "hull", { color: TAN_DK, texel: 1 / 5, lod });
        }
        const nb = lod === 0 ? 2 : 1;
        for (let b = 0; b < nb; b++) {
          const bx = cx + (nb === 2 ? (b ? 3.2 : -3.2) : 0);
          add(
            tubeZ(
              1.6,
              2.1,
              36,
              lod === 0 ? 8 : 5,
              bx,
              baseY + up * 4,
              cz - 28,
              false,
            ),
            "dark",
            { color: RECESS_DK, texel: 1 / 3, lod },
          );
          if (lod === 0)
            add(
              tubeZ(2.3, 2.3, 4, 8, bx, baseY + up * 4, cz - 44, false),
              "dark",
              {
                color: RECESS,
                texel: 1 / 3,
                lod,
              },
            );
        }
      }
      // scorch behind the gun (soot on the arm top/bottom aft of the mount)
      const q = prowSurf(0.78, side, 0, up, 1.9);
      scorchRing(add, {
        c: q.p,
        n: q.n,
        r: 9,
        base: (x, y, z, o) => plateTint(TAN, 0, 0, 1)(x, y, z, o),
        soot: SOOT,
        strength: 0.55,
        lod: 0,
        seg: 12,
      });
      hardpoints.push({
        pos: [cx, up * (top + 5.2), cz - 46],
        dir: [side * 0.05, up * 0.12, -1],
        kind: "heavy",
        range: 13000,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // spine head / neck: transition block from the crescent centre into the spine
  // ---------------------------------------------------------------------------
  const HEAD = [
    { z: -124, sx: 44, sy: 22 },
    { z: -108, sx: 42, sy: 25.5 },
    { z: -78, sx: 38, sy: 26.5 },
    { z: -52, sx: 29, sy: 25.5 },
  ];
  const headSX = (z) =>
    table(
      HEAD.map((h) => [h.z, h.sx]),
      z,
    );
  const headSY = (z) =>
    table(
      HEAD.map((h) => [h.z, h.sy]),
      z,
    );
  for (const lod of [0, 1, 2])
    add(
      loftZ(roundedRect(lod === 2 ? 1 : 3, 0.35, 0.35), HEAD, { texel: TEX }),
      "hull",
      {
        uv: "keep",
        lod,
        tint: (x, y, z, o) => o.copy(TAN).multiplyScalar(y < -8 ? 0.92 : 0.97),
      },
    );
  for (const lod of [0, 1]) {
    for (const side of [-1, 1]) {
      // window slots on the flanks, dark recess band below
      slotRow(add, {
        c: [side * (headSX(-88) + 0.1), 7, -88],
        n: [side, 0, 0],
        along: [0, 0, 1],
        count: 3,
        len: 12,
        gap: 4,
        h: 2.4,
        lod,
        panes: 3,
        glow: WINDOW,
        rim: RECESS_DK,
      });
      add(
        new THREE.BoxGeometry(0.6, 3.2, 56).translate(
          side * (headSX(-90) + 0.2),
          -12,
          -90,
        ),
        "dark",
        { color: RECESS, texel: 1 / 4, lod },
      );
      // ribbed flank panel on the lower head
      if (lod === 0)
        ribbedPanel(add, {
          c: [side * headSX(-90), -19, -90],
          n: [side, 0, 0],
          along: [0, 0, 1],
          len: 44,
          wid: 6,
          nRibs: 3,
          lod,
          color: TAN_DK,
        });
    }
    // collar ring at the head / spine joint
    add(
      loftZ(
        roundedRect(3, 0.35, 0.35),
        [
          { z: -58, sx: headSX(-55) + 1.1, sy: headSY(-55) + 1.1 },
          { z: -50, sx: headSX(-55) + 1.1, sy: headSY(-55) + 1.1 },
        ],
        { capStart: true, capEnd: true, texel: 1 / 4 },
      ),
      "dark",
      { color: RECESS, uv: "keep", lod },
    );
    // ventral hangar mouth under the head: recessed box with a lit interior
    {
      const yb = -headSY(-90);
      add(
        frameAt([0, yb, -90], [0, -1, 0], [0, 0, 1], 44, 24, 1.6, 0.8, 0.1),
        "hull",
        {
          color: TAN_DK,
          texel: 1 / 6,
          lod,
        },
      );
      add(
        openBoxInterior([0, yb + 4.5, -90], [10.8, 4.5, 20.4], "-y"),
        "dark",
        {
          color: 0x3a3430,
          texel: 1 / 4,
          lod,
        },
      );
      add(
        quadAt([0, yb + 8.9, -90], [0, -1, 0], [0, 0, 1], 30, 3, 0),
        "windows",
        {
          color: 0xffd9a0,
          lod,
          uv: "keep",
        },
      );
      if (lod === 0)
        for (const s of [-1, 1])
          add(
            quadAt([s * 7, yb + 8.9, -90], [0, -1, 0], [0, 0, 1], 26, 1.2, 0),
            "windows",
            {
              color: WINDOW,
              lod,
              uv: "keep",
            },
          );
    }
  }
  // heavy tracking turrets on the neck (base pads baked; the housings are instanced turret meshes)
  const heavy = turretType(8.5, TAN, RECESS_DK, 1, { rate: 0.5 });
  const light = turretType(4.2, TAN, RECESS_DK, 0, {
    rate: 0.9,
    yawLimit: 2.8,
  });
  for (const side of [-1, 1]) {
    const hz = -92;
    const hy = headSY(hz);
    for (const lod of [0, 1]) {
      const pad = new THREE.CylinderGeometry(
        11.5,
        12.5,
        1.4,
        lod === 0 ? 16 : 10,
      );
      pad.translate(side * 19, hy + 0.5, hz);
      add(pad, "hull", { color: TAN_DK, texel: 1 / 5, lod });
    }
    const k = turrets.length;
    turrets.push({
      type: "heavy",
      pos: [side * 19, hy + 1.2, hz],
      up: [0, 1, 0],
      forward: [0, 0, -1],
    });
    hardpoints.push({
      pos: [side * 19, hy + 8, hz - 30],
      dir: [side * 0.35, 0.45, -0.8],
      kind: "heavy",
      range: 12000,
      turret: k,
    });
    // soot streak aft of each heavy turret on the head top
    const pts = [];
    const nrm = [];
    for (let z = hz + 12; z <= -54; z += 6) {
      pts.push([side * 19, headSY(z), z]);
      nrm.push([0, 1, 0]);
    }
    sootStreak(add, {
      points: pts,
      normals: nrm,
      halfW: (i) => 5 + i * 0.9,
      base: (x, y, z, o) => o.copy(TAN).multiplyScalar(0.97),
      soot: SOOT,
      strength: (i) => 0.75 * (1 - i / pts.length) ** 1.2,
      lod: 0,
      texel: TEX,
    });
  }
  // braced sensor dishes on the head
  for (const lod of [0, 1])
    for (const side of [-1, 1])
      dishMast(add, {
        base: [side * 13, headSY(-70), -70],
        up: [0, 1, 0],
        height: 24,
        aim: [side * 0.35, 0.45, -0.82],
        r: 5.5,
        lod,
        mast: RECESS,
        dish: TAN_LT,
      });

  // ---------------------------------------------------------------------------
  // spine: ribbed tan plates over a dark core, exposed dorsal machinery channel, ventral docking bay
  // ---------------------------------------------------------------------------
  const Z0 = -52;
  const Z1 = 262;
  const spineSX = (z) => 27 + ((z - Z0) / (Z1 - Z0)) * 4;
  const spineSY = (z) => 25 + ((z - Z0) / (Z1 - Z0)) * 3;
  const CH = channelRect(3, 0.35, 0.35, 0.34, 0.24, 0.42, 0.42);
  const CH_LOW = channelRect(1, 0.35, 0.35, 0.34, 0.24, 0.42);
  const floorY = (z) => spineSY(z) * (1 - 0.42);
  const NSEG = 8;
  const segLen = (Z1 - Z0) / NSEG;
  const BAY = 4; // segment carrying the ventral docking bay
  const segScale = (j) => (j % 2 ? 1 : 1.03);
  // core (LOD 0/1) shows through the seams between plates
  for (const lod of [0, 1])
    add(
      loftZ(
        CH.loop,
        [
          { z: Z0, sx: spineSX(Z0) * 0.965, sy: spineSY(Z0) * 0.965 },
          { z: Z1, sx: spineSX(Z1) * 0.965, sy: spineSY(Z1) * 0.965 },
        ],
        { texel: 1 / 5 },
      ),
      "dark",
      { color: CORE, uv: "keep", lod },
    );
  // channel floor and walls
  for (const lod of [0, 1, 2])
    add(
      loftZ(
        CH.channel,
        [
          { z: Z0, sx: spineSX(Z0), sy: spineSY(Z0) },
          { z: Z1, sx: spineSX(Z1), sy: spineSY(Z1) },
        ],
        { closed: false, texel: 1 / 5 },
      ),
      "dark",
      { color: RECESS, uv: "keep", lod },
    );
  // LOD 2: one continuous hull strip
  add(
    loftZ(
      CH_LOW.hull,
      [
        { z: Z0, sx: spineSX(Z0), sy: spineSY(Z0) },
        { z: Z1, sx: spineSX(Z1), sy: spineSY(Z1) },
      ],
      { closed: false, texel: TEX },
    ),
    "hull",
    { color: TAN, uv: "keep", lod: 2 },
  );
  const segTone = [];
  for (let j = 0; j < NSEG; j++)
    segTone.push(jitter(j % 3 === 1 ? TAN_LT : TAN, rand, 0.08));
  for (const lod of [0, 1]) {
    for (let j = 0; j < NSEG; j++) {
      const z0 = Z0 + j * segLen + (j ? 0.8 : 0);
      const z1 = Z0 + (j + 1) * segLen - (j < NSEG - 1 ? 0.8 : 0);
      const k = segScale(j);
      const base = segTone[j];
      const tint = (x, y, z, o) => {
        o.copy(base).multiplyScalar(y < -8 ? 0.93 : 1);
        // grime along the segment seams
        const e = Math.min(z - z0, z1 - z);
        o.multiplyScalar(1 - 0.18 * (1 - smoothstep(0, 4, e)));
      };
      const st = [
        { z: z0, sx: spineSX(z0) * k, sy: spineSY(z0) * k },
        {
          z: (z0 + z1) / 2,
          sx: spineSX((z0 + z1) / 2) * k,
          sy: spineSY((z0 + z1) / 2) * k,
        },
        { z: z1, sx: spineSX(z1) * k, sy: spineSY(z1) * k },
      ];
      const profs = j === BAY ? [CH.hullLeft, CH.hullRight] : [CH.hull];
      for (const prof of profs)
        add(loftZ(prof, st, { closed: false, texel: TEX }), "hull", {
          uv: "keep",
          lod,
          tint,
        });
      const zc = (z0 + z1) / 2;
      const len = z1 - z0;
      for (const side of [-1, 1]) {
        const fx = spineSX(zc) * k;
        // longitudinal ribs on the flanks (LOD 0), dark recess band low on the flank
        if (lod === 0)
          for (const ry of [-13.5, -7.5, 7.5, 13.5])
            add(
              new THREE.BoxGeometry(0.6, 1.3, len - 5).translate(
                side * (fx + 0.25),
                ry,
                zc,
              ),
              "hull",
              {
                color: base.clone().multiplyScalar(ry > 0 ? 1.04 : 0.96),
                texel: 1 / 4,
                lod,
              },
            );
        add(
          new THREE.BoxGeometry(0.7, 2.6, len - 8).translate(
            side * (fx + 0.35),
            -18.5,
            zc,
          ),
          "dark",
          {
            color: RECESS,
            texel: 1 / 4,
            lod,
          },
        );
        // recessed window slots between the inner ribs on every other segment
        if (j % 2 === 1)
          slotRow(add, {
            c: [side * (fx + 0.1), 0.5, zc],
            n: [side, 0, 0],
            along: [0, 0, 1],
            count: 2,
            len: 12,
            gap: 5,
            h: 2.4,
            lod,
            panes: 3,
            glow: WINDOW,
            rim: RECESS_DK,
          });
        // dark inset panel with a small hatch on the plain segments
        else if (lod === 0) {
          add(
            new THREE.BoxGeometry(0.5, 5, 14).translate(
              side * (fx + 0.1),
              0.5,
              zc - 6,
            ),
            "dark",
            {
              color: RECESS_DK,
              texel: 1 / 3,
              lod,
            },
          );
          hatch(add, {
            c: [side * (fx + 0.2), 0.5, zc + 10],
            n: [side, 0, 0],
            along: [0, 0, 1],
            w: 4,
            h: 3.2,
            lod,
            color: TAN_LT,
            rimColor: RECESS_DK,
          });
        }
        // rust panel accents
        if (j === 2 || j === 5)
          add(
            new THREE.BoxGeometry(0.3, 5, 14).translate(
              side * (fx + 0.15),
              -3,
              zc + 8,
            ),
            "paint",
            {
              color: j === 2 ? RUST : RUST_DK,
              lod,
              uv: "keep",
            },
          );
        // hatches on the top shoulders beside the channel
        if (lod === 0)
          hatch(add, {
            c: [
              side * spineSX(zc) * k * 0.62,
              spineSY(zc) * k * 0.985,
              zc + (j % 2 ? 8 : -8),
            ],
            n: [0, 1, 0],
            along: [0, 0, 1],
            w: 5,
            h: 6,
            lod,
            color: j % 2 ? TAN_DK : TAN_LT,
            rimColor: RECESS_DK,
            big: true,
          });
      }
      if (j === 3)
        for (const side of [-1, 1])
          add(
            new THREE.BoxGeometry(7, 0.3, 20).translate(
              side * spineSX(zc) * 0.58,
              spineSY(zc) * k + 0.15,
              zc,
            ),
            "paint",
            {
              color: RUST,
              lod,
              uv: "keep",
            },
          );
    }
  }
  // machinery in the channel: pipes, cross braces, equipment boxes, small lights
  for (const lod of [0, 1]) {
    for (const px of [-3.4, 3.4])
      add(
        loftZ(superellipse(lod === 0 ? 8 : 6, 2), [
          { z: Z0 + 6, sx: 1.3, sy: 1.3, x: px, y: floorY(Z0 + 6) + 1.4 },
          { z: Z1 - 8, sx: 1.3, sy: 1.3, x: px, y: floorY(Z1 - 8) + 1.4 },
        ]),
        "dark",
        { color: 0xa09284, texel: 1 / 2, lod },
      );
    const step = lod === 0 ? 38 : 76;
    for (let z = Z0 + 24; z < Z1 - 10; z += step)
      add(
        new THREE.BoxGeometry(0.66 * spineSX(z) * 2, 1.3, 2.4).translate(
          0,
          spineSY(z) - 1.0,
          z,
        ),
        "dark",
        {
          color: RECESS,
          texel: 1 / 3,
          lod,
        },
      );
  }
  for (let z = Z0 + 14, i = 0; z < Z1 - 12; z += 26, i++) {
    const side = i % 2 ? 1 : -1;
    add(
      new THREE.BoxGeometry(4.2, 3, 6.5).translate(
        side * 3.8,
        floorY(z) + 1.5,
        z,
      ),
      "dark",
      {
        color: i % 3 ? RECESS : 0xa09284,
        texel: 1 / 3,
        lod: 0,
      },
    );
    if (i % 2 === 0)
      add(
        new THREE.BoxGeometry(2.2, 2.2, 3).translate(
          -side * 4.5,
          floorY(z) + 1.1,
          z + 8,
        ),
        "hull",
        {
          color: TAN_DK,
          texel: 1 / 3,
          lod: 0,
        },
      );
    add(
      new THREE.BoxGeometry(0.5, 0.5, 2.6).translate(
        side * (0.3 * spineSX(z)),
        spineSY(z) - 3.5,
        z + 4,
      ),
      "windows",
      {
        color: WINDOW,
        lod: 0,
        uv: "keep",
      },
    );
  }
  // greebles on the lower flanks
  for (let i = 0; i < 30; i++) {
    const z = Z0 + 20 + rand() * (Z1 - Z0 - 40);
    const side = rand() < 0.5 ? -1 : 1;
    const j = Math.min(NSEG - 1, Math.floor((z - Z0) / segLen));
    const fx = spineSX(z) * segScale(j) + 0.6;
    const w = 1.5 + rand() * 3;
    add(
      new THREE.BoxGeometry(w, 1.5 + rand() * 3, 2 + rand() * 5).translate(
        side * fx,
        -21 + rand() * 4,
        z,
      ),
      rand() < 0.7 ? "dark" : "hull",
      {
        color: rand() < 0.7 ? RECESS : TAN_DK,
        texel: 1 / 3,
        lod: 0,
      },
    );
  }
  // keel: twin conduit runs with clamps (split around the bay), the recessed docking bay, small hatches
  const bellyY = (z) =>
    -spineSY(z) * segScale(Math.min(NSEG - 1, Math.floor((z - Z0) / segLen)));
  const bayZ0 = Z0 + BAY * segLen + 0.8;
  const bayZ1 = Z0 + (BAY + 1) * segLen - 0.8;
  const bayZc = (bayZ0 + bayZ1) / 2;
  for (const lod of [0, 1]) {
    for (const [za, zb] of [
      [Z0 + 10, bayZ0 - 6],
      [bayZ1 + 6, Z1 - 12],
    ])
      for (const px of [-6.5, 6.5])
        add(
          loftZ(superellipse(lod === 0 ? 8 : 6, 2), [
            { z: za, sx: 1.6, sy: 1.6, x: px, y: -spineSY(za) * 1.03 - 1.5 },
            { z: zb, sx: 1.6, sy: 1.6, x: px, y: -spineSY(zb) * 1.03 - 1.5 },
          ]),
          "dark",
          { color: RECESS, texel: 1 / 2, lod },
        );
    for (let z = Z0 + 22; z < Z1 - 14; z += lod === 0 ? 24 : 48) {
      if (z > bayZ0 - 10 && z < bayZ1 + 10) continue;
      add(
        new THREE.BoxGeometry(17, 2.4, 3).translate(0, bellyY(z) - 0.9, z),
        "dark",
        {
          color: RECESS_DK,
          texel: 1 / 3,
          lod,
        },
      );
    }
    // docking bay: the hull segment above is open between |x| < 0.42 sx; walls, lit ceiling, machinery
    {
      const k = segScale(BAY);
      const sx = spineSX(bayZc) * k;
      const sy = spineSY(bayZc) * k;
      const yb = -sy;
      const hw = 0.42 * sx;
      const depth = 11;
      add(
        openBoxInterior(
          [0, yb + depth / 2, bayZc],
          [hw, depth / 2, (bayZ1 - bayZ0) / 2],
          "-y",
        ),
        "dark",
        {
          color: 0x3a3430,
          texel: 1 / 4,
          lod,
        },
      );
      add(
        frameAt(
          [0, yb, bayZc],
          [0, -1, 0],
          [0, 0, 1],
          bayZ1 - bayZ0 + 3,
          2 * hw + 3,
          1.5,
          0.7,
          0.1,
        ),
        "hull",
        {
          color: TAN_DK,
          texel: 1 / 6,
          lod,
        },
      );
      // lit ceiling strips and pad markers
      for (const s of [-1, 1])
        add(
          quadAt(
            [s * hw * 0.55, yb + depth - 0.1, bayZc],
            [0, -1, 0],
            [0, 0, 1],
            bayZ1 - bayZ0 - 8,
            1.6,
            0,
          ),
          "windows",
          {
            color: 0xffd9a0,
            lod,
            uv: "keep",
          },
        );
      add(
        quadAt([0, yb + depth - 0.1, bayZc], [0, -1, 0], [0, 0, 1], 14, 10, 0),
        "windows",
        {
          color: 0xb8e0ff,
          lod,
          uv: "keep",
        },
      );
      if (lod === 0) {
        for (const [dx, dz, w] of [
          [-6, -8, 5],
          [5, 6, 4],
          [0, -2, 3],
        ])
          add(
            new THREE.BoxGeometry(w, 3, w + 2).translate(
              dx,
              yb + depth - 1.6,
              bayZc + dz,
            ),
            "dark",
            {
              color: RECESS,
              texel: 1 / 3,
              lod,
            },
          );
        for (const s of [-1, 1])
          for (let z = bayZ0 + 4; z < bayZ1 - 3; z += 6)
            add(
              new THREE.BoxGeometry(0.6, 0.6, 1.2).translate(
                s * (hw - 0.6),
                yb + 0.4,
                z,
              ),
              "windows",
              {
                color: 0xff9a60,
                lod,
                uv: "keep",
              },
            );
      }
    }
    // small ventral hatches
    for (const zc of [-30, 70, 200])
      hatch(add, {
        c: [0, bellyY(zc) - 0.2, zc],
        n: [0, -1, 0],
        along: [0, 0, 1],
        w: 14,
        h: 18,
        lod,
        color: TAN_DK,
        rimColor: RECESS_DK,
        big: true,
      });
  }

  // ---------------------------------------------------------------------------
  // light tracking turrets along the spine top and belly
  // ---------------------------------------------------------------------------
  for (let i = 0; i < 6; i++) {
    const z = -30 + i * 52;
    const j = Math.min(NSEG - 1, Math.floor((z - Z0) / segLen));
    const k = segScale(j);
    for (const side of [-1, 1]) {
      const x = side * spineSX(z) * 0.5;
      const y = spineSY(z) * k;
      for (const lod of [0, 1]) {
        const pad = new THREE.CylinderGeometry(
          5.2,
          5.8,
          1.0,
          lod === 0 ? 12 : 8,
        );
        pad.translate(x, y + 0.3, z);
        add(pad, "hull", { color: TAN_DK, texel: 1 / 4, lod });
      }
      const kk = turrets.length;
      turrets.push({
        type: "light",
        pos: [x, y + 0.8, z],
        up: [0, 1, 0],
        forward: [0, 0, -1],
      });
      hardpoints.push({
        pos: [x, y + 5, z - 12],
        dir: [side * 0.55, 0.5, -0.6],
        kind: "light",
        range: 7000,
        turret: kk,
      });
    }
  }
  for (let i = 0; i < 3; i++) {
    const z = -20 + i * 100;
    const j = Math.min(NSEG - 1, Math.floor((z - Z0) / segLen));
    const k = segScale(j);
    for (const side of [-1, 1]) {
      const x = side * spineSX(z) * 0.48;
      const y = -spineSY(z) * k;
      for (const lod of [0, 1]) {
        const pad = new THREE.CylinderGeometry(
          5.2,
          5.8,
          1.0,
          lod === 0 ? 12 : 8,
        );
        pad.translate(x, y - 0.3, z);
        add(pad, "hull", { color: TAN_DK, texel: 1 / 4, lod });
      }
      const kk = turrets.length;
      turrets.push({
        type: "light",
        pos: [x, y - 0.8, z],
        up: [0, -1, 0],
        forward: [0, 0, -1],
      });
      hardpoints.push({
        pos: [x, y - 5, z - 12],
        dir: [side * 0.55, -0.6, -0.5],
        kind: "light",
        range: 7000,
        turret: kk,
      });
    }
  }
  // scorch rings at fixed points on the spine flanks and top
  for (const [side, z, y] of [
    [1, 30, 4],
    [-1, 150, -6],
  ]) {
    const j = Math.min(NSEG - 1, Math.floor((z - Z0) / segLen));
    scorchRing(add, {
      c: [side * (spineSX(z) * segScale(j) + 0.35), y, z],
      n: [side, 0, 0],
      r: 7,
      base: (x, yy, zz, o) => o.copy(segTone[j]),
      soot: SOOT,
      strength: 0.8,
      lod: 0,
    });
  }

  // ---------------------------------------------------------------------------
  // aft bulb: sooty toward the stern, plating rings, equator band, vents, hatches, dishes, windows
  // ---------------------------------------------------------------------------
  const BULB = [
    { z: 250, sx: 31, sy: 28 },
    { z: 280, sx: 45, sy: 41 },
    { z: 310, sx: 60, sy: 54 },
    { z: 340, sx: 69, sy: 61 },
    { z: 370, sx: 68, sy: 60 },
    { z: 395, sx: 60, sy: 54 },
    { z: 412.5, sx: 50, sy: 46 },
  ];
  const bulbSX = (z) =>
    table(
      BULB.map((b) => [b.z, b.sx]),
      z,
    );
  const bulbSY = (z) =>
    table(
      BULB.map((b) => [b.z, b.sy]),
      z,
    );
  const P_BULB = 2.6;
  const nozzleAngles = [];
  for (let i = 0; i < 8; i++)
    nozzleAngles.push((i / 8) * Math.PI * 2 + Math.PI / 8);
  // soot: rises toward the stern, strongest in the streaks behind each outer nozzle
  const bulbSoot = (x, y, z) => {
    const a = Math.atan2(
      y / Math.max(1, bulbSY(z)),
      x / Math.max(1, bulbSX(z)),
    );
    let near = Math.PI;
    for (const na of nozzleAngles) {
      const d = Math.abs(Math.atan2(Math.sin(a - na), Math.cos(a - na)));
      if (d < near) near = d;
    }
    const streak = Math.exp(-(near * near) / (2 * 0.16 * 0.16));
    return (
      0.55 * smoothstep(330, 412, z) + 0.35 * streak * smoothstep(300, 405, z)
    );
  };
  const bulbTint = (x, y, z, o) => {
    mix(TAN, SOOT, Math.min(0.92, bulbSoot(x, y, z)), o);
    if (y < 0) o.multiplyScalar(0.94);
    return o;
  };
  const bulbStations = (z0, z1, n, k) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const z = z0 + ((z1 - z0) * i) / (n - 1);
      out.push({ z, sx: bulbSX(z) * k, sy: bulbSY(z) * k });
    }
    return out;
  };
  const bulbProfile = (lod) =>
    superellipse(lod === 0 ? 40 : lod === 1 ? 16 : 10, P_BULB);
  // point on the bulb surface at parameter angle a, and its outward normal (approximate)
  const bulbSurf = (a, z, k = 1, lift = 0) => {
    const [u, v] = superellipsePoint(a, P_BULB);
    const n = new THREE.Vector3(u / bulbSX(z), v / bulbSY(z), 0).normalize();
    return {
      p: [u * bulbSX(z) * k + n.x * lift, v * bulbSY(z) * k + n.y * lift, z],
      n: n.toArray(),
    };
  };
  for (const lod of [0, 1, 2]) {
    if (lod === 2) {
      add(
        loftZ(bulbProfile(lod), bulbStations(250, 412.5, 6, 1), { texel: TEX }),
        "hull",
        {
          uv: "keep",
          lod,
          tint: bulbTint,
        },
      );
      continue;
    }
    // three plating rings, the middle one raised, seams grimy
    add(
      loftZ(bulbProfile(lod), bulbStations(250, 301, lod === 0 ? 8 : 4, 1), {
        texel: TEX,
      }),
      "hull",
      {
        uv: "keep",
        lod,
        tint: (x, y, z, o) =>
          bulbTint(x, y, z, o).multiplyScalar(
            1 - 0.15 * smoothstep(297, 301, z),
          ),
      },
    );
    add(
      loftZ(
        bulbProfile(lod),
        bulbStations(300, 362, lod === 0 ? 10 : 5, 1.025),
        { capStart: true, capEnd: true, texel: TEX },
      ),
      "hull",
      {
        uv: "keep",
        lod,
        tint: (x, y, z, o) => bulbTint(x, y, z, o).multiplyScalar(1.04),
      },
    );
    add(
      loftZ(bulbProfile(lod), bulbStations(361, 412.5, lod === 0 ? 12 : 6, 1), {
        texel: TEX,
      }),
      "hull",
      {
        uv: "keep",
        lod,
        tint: (x, y, z, o) =>
          bulbTint(x, y, z, o).multiplyScalar(
            1 - 0.15 * (1 - smoothstep(361, 366, z)),
          ),
      },
    );
    // dark equator band and a thin rust ring
    add(
      loftZ(bulbProfile(lod), bulbStations(335, 343, 2, 1.04), {
        capStart: true,
        capEnd: true,
        texel: 1 / 5,
      }),
      "dark",
      { color: RECESS, uv: "keep", lod },
    );
    add(loftZ(bulbProfile(lod), bulbStations(319, 322.5, 2, 1.032)), "paint", {
      color: RUST,
      lod,
      uv: "keep",
    });
    // recessed window slots around the bulb shoulders
    for (const side of [-1, 1])
      for (const [a, z] of [
        [side > 0 ? 0.15 : Math.PI - 0.15, 296],
        [side > 0 ? 0.15 : Math.PI - 0.15, 314],
        [side > 0 ? 0.15 : Math.PI - 0.15, 332],
      ]) {
        const q = bulbSurf(a, z, 1.025);
        slotWindow(add, {
          c: q.p,
          n: q.n,
          along: [0, 0, 1],
          len: 12,
          h: 2.4,
          lod,
          panes: 3,
          glow: WINDOW,
          rim: RECESS_DK,
        });
      }
    // braced dishes off the bulb flanks
    for (const side of [-1, 1]) {
      const q = bulbSurf(side > 0 ? 0.08 : Math.PI - 0.08, 330);
      dishMast(add, {
        base: q.p,
        up: q.n,
        height: 30,
        aim: [side * 0.6, 0.3, -0.74],
        r: 7,
        lod,
        mast: RECESS,
        dish: TAN_LT,
        braceSpan: 0.45,
      });
    }
  }
  // soot streaks forward of each outer nozzle (LOD 0/1) and the bulb hatch/vent field (LOD 0)
  for (const lod of [0, 1])
    for (const a of nozzleAngles) {
      const pts = [];
      const nrm = [];
      for (let z = 326; z <= 411; z += 8.5) {
        const q = bulbSurf(a, z, z > 361 || z < 300 ? 1 : 1.025);
        pts.push(q.p);
        nrm.push(q.n);
      }
      sootStreak(add, {
        points: pts,
        normals: nrm,
        halfW: (i) => 5 + i * 0.7,
        base: (x, y, z, o) =>
          mix(TAN, SOOT, 0.55 * smoothstep(330, 412, z), o).multiplyScalar(
            y < 0 ? 0.94 : 1,
          ),
        soot: SOOT,
        strength: (i) => 0.85 * smoothstep(0, pts.length - 1, i) ** 0.7,
        lod,
        texel: TEX,
      });
    }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    const q = bulbSurf(a, 376, 1, 0);
    add(quadAt(q.p, q.n, [0, 0, 1], 3.2, 7, 0.4), "dark", {
      color: RECESS_DK,
      texel: 1 / 3,
      lod: 0,
    });
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.6;
    if (Math.abs(Math.sin(a)) > 0.93) continue;
    const z = 286 + (i % 3) * 8;
    const q = bulbSurf(a, z, 1, 0);
    hatch(add, {
      c: q.p,
      n: q.n,
      along: [0, 0, 1],
      w: 4.5,
      h: 5.5,
      lod: 0,
      color: i % 2 ? TAN_LT : TAN_DK,
      rimColor: RECESS_DK,
    });
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.9;
    if (Math.abs(Math.sin(a)) > 0.9) continue;
    const q = bulbSurf(a, 352, 1.025, 0);
    hatch(add, {
      c: q.p,
      n: q.n,
      along: [0, 0, 1],
      w: 8,
      h: 9,
      lod: 0,
      color: TAN_LT,
      rimColor: RECESS_DK,
      big: true,
    });
  }
  // longitudinal ribs around the bulb (LOD 0), clear of the fin roots
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.15;
    if (Math.abs(Math.sin(a)) > 0.93) continue;
    for (let z = 284; z < 396; z += 14) {
      const q0 = bulbSurf(a, z, z > 300 && z < 362 ? 1.025 : 1, 0.7);
      const q1 = bulbSurf(
        a,
        Math.min(396, z + 13),
        z + 13 > 300 && z + 13 < 362 ? 1.025 : 1,
        0.7,
      );
      add(bar(q0.p, q1.p, 2.6, 2.2), "hull", {
        texel: 1 / 4,
        lod: 0,
        tint: (x, y, zz, o) =>
          bulbTint(x, y, zz, o).multiplyScalar(i % 2 ? 0.92 : 1.02),
      });
    }
  }
  scorchRing(add, {
    c: bulbSurf(0.7, 300, 1.025).p,
    n: bulbSurf(0.7, 300, 1.025).n,
    r: 9,
    base: bulbTint,
    soot: SOOT,
    strength: 0.8,
    lod: 0,
  });

  // ---------------------------------------------------------------------------
  // fins: thick dorsal blade with a set-back window tier, shorter ventral blade
  // ---------------------------------------------------------------------------
  const DFIN = [
    { z: 268, yB: 20, yT: 40, sx: 8 },
    { z: 292, yB: 30, yT: 96, sx: 15 },
    { z: 318, yB: 46, yT: 128, sx: 17 },
    { z: 346, yB: 54, yT: 134, sx: 16 },
    { z: 374, yB: 54, yT: 116, sx: 13 },
    { z: 398, yB: 46, yT: 74, sx: 8 },
  ];
  const VFIN = [
    { z: 270, yB: -38, yT: -20, sx: 7 },
    { z: 294, yB: -82, yT: -32, sx: 12 },
    { z: 322, yB: -110, yT: -48, sx: 14 },
    { z: 350, yB: -114, yT: -54, sx: 13 },
    { z: 376, yB: -96, yT: -52, sx: 10 },
    { z: 398, yB: -62, yT: -44, sx: 6 },
  ];
  const finStations = (F) =>
    F.map((f) => ({
      z: f.z,
      x: 0,
      y: (f.yB + f.yT) / 2,
      sx: f.sx,
      sy: (f.yT - f.yB) / 2,
    }));
  const finTint = (x, y, z, o) =>
    mix(TAN, SOOT, 0.5 * smoothstep(372, 404, z), o);
  // half thickness of a fin at (z, y)
  const finX = (F, z, y, up) => {
    const yb = table(
      F.map((f) => [f.z, f.yB]),
      z,
    );
    const yt = table(
      F.map((f) => [f.z, f.yT]),
      z,
    );
    const sx = table(
      F.map((f) => [f.z, f.sx]),
      z,
    );
    const c = (yb + yt) / 2;
    const sy = (yt - yb) / 2;
    const v = up * ((y - c) / sy);
    return sx * bladeU(v);
  };
  const TIER = [
    { z: 320, x: 0, y: 128, sx: 3.2, sy: 14 },
    { z: 330, x: 0, y: 131, sx: 4.6, sy: 18 },
    { z: 356, x: 0, y: 131, sx: 4.6, sy: 18 },
    { z: 370, x: 0, y: 126, sx: 3.6, sy: 14 },
  ];
  for (const lod of [0, 1, 2]) {
    const st = lod === 2 ? [DFIN[0], DFIN[2], DFIN[3], DFIN[5]] : DFIN;
    const sv = lod === 2 ? [VFIN[0], VFIN[2], VFIN[3], VFIN[5]] : VFIN;
    add(loftZ(blade(), finStations(st), { texel: TEX }), "hull", {
      uv: "keep",
      lod,
      tint: finTint,
    });
    add(loftZ(mirrorV(blade()), finStations(sv), { texel: TEX }), "hull", {
      uv: "keep",
      lod,
      tint: finTint,
    });
    // set-back upper tier on the dorsal fin
    add(
      loftZ(roundedRect(lod === 2 ? 1 : 2, 0.4, 0.25), TIER, {
        capStart: true,
        capEnd: true,
        texel: 1 / 12,
      }),
      "hull",
      {
        color: TAN_LT,
        uv: "keep",
        lod,
      },
    );
  }
  for (const lod of [0, 1]) {
    for (const side of [-1, 1]) {
      // raised spine rib along the leading edge and a mid-chord rib on each flank
      const xa = finX(DFIN, 296, 70, 1) + 0.3;
      const xb = finX(DFIN, 322, 122, 1) + 0.3;
      add(bar([side * xa, 70, 296], [side * xb, 122, 322], 2.2, 3), "hull", {
        color: TAN_LT,
        texel: 1 / 4,
        lod,
      });
      const xm0 = finX(DFIN, 316, 60, 1) + 0.3;
      const xm1 = finX(DFIN, 350, 116, 1) + 0.3;
      add(
        bar([side * xm0, 60, 316], [side * xm1, 116, 350], 1.6, 2.6),
        "hull",
        { color: TAN_DK, texel: 1 / 4, lod },
      );
      // dark spar panels, rust stripe, recessed windows on the tier and along the fin
      const xd0 = finX(DFIN, 352, 72, 1) + 0.25;
      const xd1 = finX(DFIN, 392, 98, 1) + 0.25;
      add(bar([side * xd0, 72, 352], [side * xd1, 98, 392], 0.5, 8), "dark", {
        color: RECESS_DK,
        texel: 1 / 4,
        lod,
      });
      const xr0 = finX(DFIN, 300, 50, 1) + 0.25;
      const xr1 = finX(DFIN, 318, 96, 1) + 0.25;
      add(bar([side * xr0, 50, 300], [side * xr1, 96, 318], 0.3, 5), "paint", {
        color: RUST,
        lod,
        uv: "keep",
      });
      slotRow(add, {
        c: [side * 4.65, 136, 345],
        n: [side, 0, 0],
        along: [0, 0, 1],
        count: 3,
        len: 9,
        gap: 3,
        h: 2.4,
        lod,
        panes: 3,
        glow: WINDOW,
        rim: RECESS_DK,
      });
      slotRow(add, {
        c: [side * 4.65, 126, 345],
        n: [side, 0, 0],
        along: [0, 0, 1],
        count: 2,
        len: 9,
        gap: 3,
        h: 2.0,
        lod,
        panes: 2,
        glow: WINDOW,
        rim: RECESS_DK,
      });
      if (lod === 0)
        slotRow(add, {
          c: [side * (finX(DFIN, 352, 92, 1) + 0.1), 92, 352],
          n: [side, 0, 0],
          along: [0, 0, 1],
          count: 2,
          len: 9,
          gap: 4,
          h: 2.2,
          lod,
          panes: 2,
          glow: WINDOW,
          rim: RECESS_DK,
        });
      // ventral fin dark panel and rust stripe
      const xv0 = finX(VFIN, 305, -70, -1) + 0.25;
      const xv1 = finX(VFIN, 350, -100, -1) + 0.25;
      add(
        bar([side * xv0, -70, 305], [side * xv1, -100, 350], 0.5, 8),
        "dark",
        { color: RECESS, texel: 1 / 4, lod },
      );
      const xw0 = finX(VFIN, 296, -48, -1) + 0.2;
      const xw1 = finX(VFIN, 320, -92, -1) + 0.2;
      add(
        bar([side * xw0, -48, 296], [side * xw1, -92, 320], 0.3, 4),
        "paint",
        { color: RUST_DK, lod, uv: "keep" },
      );
    }
    // dish and antenna cluster on the tier top, raked antenna off the trailing corner, ventral probe
    dishMast(add, {
      base: [0, 149, 336],
      up: [0, 1, 0],
      height: 16,
      aim: [0, 0.55, -0.83],
      r: 6.5,
      lod,
      mast: RECESS,
      dish: TAN_LT,
      braceSpan: 0.35,
    });
    antennaCluster(add, {
      base: [0, 149, 358],
      up: [0, 1, 0],
      scale: 0.8,
      lod,
      mast: RECESS,
      plate: TAN_DK,
    });
    add(bar([0, 100, 388], [0, 124, 426], 1.2), "dark", {
      color: RECESS,
      texel: 1 / 3,
      lod,
    });
    add(
      new THREE.CylinderGeometry(1.0, 0.7, 24, 6).translate(0, -114 - 12, 340),
      "dark",
      { color: RECESS, texel: 1 / 3, lod },
    );
  }

  // ---------------------------------------------------------------------------
  // stern: recessed engine plate inside a thick rim, nine deep nozzle bells with lit interiors
  // ---------------------------------------------------------------------------
  const zS = 412.5;
  const sternTint = (x, y, z, o) => mix(TAN, SOOT, 0.72, o);
  for (const lod of [0, 1, 2]) {
    const prof = bulbProfile(lod);
    const outer = prof.map(([u, v]) => [u * bulbSX(zS), v * bulbSY(zS)]);
    const inner = prof.map(([u, v]) => [
      u * bulbSX(zS) * 0.9,
      v * bulbSY(zS) * 0.9,
    ]);
    add(ringZ(outer, inner, zS - 6, zS), "hull", {
      texel: 1 / 8,
      lod,
      tint: sternTint,
    });
    add(
      plateZ(prof, bulbSX(zS) * 0.905, bulbSY(zS) * 0.905, zS - 6.8, zS - 5.8),
      "dark",
      {
        color: PLATE.getHex(),
        texel: 1 / 5,
        lod,
      },
    );
  }
  const nozzles = [{ x: 0, y: 0, r: 15 }];
  for (const a of nozzleAngles)
    nozzles.push({ x: Math.cos(a) * 30, y: Math.sin(a) * 26.5, r: 8.5 });
  for (const { x, y, r } of nozzles) {
    let entry;
    for (const lod of [0, 1, 2]) {
      entry = nozzleBell(add, {
        x,
        y,
        zMouth: zS + 2,
        r,
        depth: r > 10 ? 30 : 24,
        protrude: 8,
        lod,
        shell: SHELL,
        shellDark: SHELL_DK,
      });
      if (lod < 2)
        sternSpill(add, {
          x,
          y,
          zPlate: zS - 5.8,
          r: r + 6.5,
          plate: PLATE,
          lod,
        });
    }
    engines.push(entry);
  }
  // pipework between the nozzles on the stern plate (LOD 0)
  for (let i = 0; i < 8; i++) {
    const a0 = nozzleAngles[i];
    const a1 = nozzleAngles[(i + 1) % 8];
    const p0 = [Math.cos(a0) * 41, Math.sin(a0) * 37, zS - 5];
    const p1 = [Math.cos(a1) * 41, Math.sin(a1) * 37, zS - 5];
    add(bar(p0, p1, 1.6, 1.6), "dark", { color: RECESS, texel: 1 / 2, lod: 0 });
  }

  return assemble(
    {
      id: "munificent",
      side: "separatist",
      length: L,
      parts,
      hardpoints,
      engines,
      bounds: { radius: 450 },
      turretTypes: { heavy, light },
      turrets,
    },
    mats,
  );
}
