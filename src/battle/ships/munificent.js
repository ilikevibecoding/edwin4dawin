// Munificent-class star frigate (Separatist), 825 m long, 426 m across the prow. Original procedural
// geometry after the film's design language: a long thin rounded spine with an exposed dorsal machinery
// channel, a wide crescent "pincer" prow whose two prongs curve outward and forward from the spine head
// (heavy gun mounts at the tips, a notch between), a bulbous sooty aft section with a ring of engine
// nozzles, a tall dorsal fin and a ventral fin on the bulb, sensor masts, turrets along the spine, lit
// window slots, tan/sand plating with grey-brown recesses and rust-toned panel accents. Three LODs.
import * as THREE from "three";
import { assemble } from "./shipKit.js";
import {
  bar,
  blade,
  bladeU,
  channelRect,
  col,
  discZ,
  flipFaces,
  loftZ,
  mirrorV,
  mix,
  mpart,
  plateZ,
  rng,
  roundedRect,
  smoothstep,
  superellipse,
  superellipseU,
  sweep,
  table,
  tubeZ,
} from "./munificentGeo.js";

export const MUNIFICENT = { length: 825, width: 426, height: 300 };

// palette (vertex tints over the shared plating / machinery textures)
const TAN = col(0xb39d78);
const TAN_LT = col(0xc4ae8a);
const TAN_DK = col(0x9d8868);
const SOOT = col(0x3e3632);
const RECESS = 0x8a7c6c; // grey-brown machinery
const RECESS_DK = 0x5c524a;
const CORE = 0x4c443e;
const RUST = 0x8a4f2e;
const RUST_DK = 0x6e3f27;
const WINDOW = 0xffe6c4;
const GLOW = 0xb4e2ff;
const PLUME = col(0x66b4ff);

export function buildMunificent(mats) {
  const L = MUNIFICENT.length;
  const parts = [];
  const hardpoints = [];
  const engines = [];
  const add = (geo, mat, opts) => parts.push(mpart(geo, mat, opts));
  const rand = rng(7331);

  // ---------------------------------------------------------------------------
  // prow: one crescent swept from the port tip through the spine head to the starboard tip
  // ---------------------------------------------------------------------------
  const curve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(0, 0, -240),
    new THREE.Vector3(90, 0, -240),
    new THREE.Vector3(172, 0, -290),
    new THREE.Vector3(185, 0, -395),
  );
  const HC = [
    [0, 46],
    [0.2, 66],
    [0.4, 76],
    [0.6, 62],
    [0.8, 38],
    [0.9, 28],
    [1, 22],
  ]; // half chord
  const HT = [
    [0, 25],
    [0.2, 24],
    [0.4, 21],
    [0.6, 16],
    [0.8, 11],
    [0.9, 8.5],
    [1, 7],
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
  for (const lod of [0, 1, 2]) {
    const nHalf = lod === 0 ? 24 : lod === 1 ? 13 : 7;
    const prof = lod === 2 ? roundedRect(1, 0.3, 0.36) : prowProfile;
    const stations = prowSamples(nHalf).map((s) =>
      prowStation(Math.abs(s), s < 0 ? -1 : 1),
    );
    add(sweep(prof, stations, { capStart: true, capEnd: true }), "hull", {
      texel: 1 / 13,
      lod,
      tint: (x, y, z, out) => {
        // darker under-surface and a hint of paint fade toward the tips
        const under = y < 0 ? 0.92 : 1;
        const tips = 1 - 0.06 * smoothstep(120, 190, Math.abs(x));
        out.copy(TAN_DK).multiplyScalar(under * tips);
      },
    });
  }
  // raised plate groups over the crescent's top and bottom, spanwise seams between them
  const topStrip = [
    [-0.66, 0.97],
    [-0.6, 1],
    [0.6, 1],
    [0.66, 0.97],
  ];
  const botStrip = mirrorV(topStrip);
  for (const lod of [0, 1]) {
    const nSeg = lod === 0 ? 7 : 4;
    const gap = 0.007;
    for (const side of [-1, 1]) {
      for (let j = 0; j < nSeg; j++) {
        const s0 = (j / nSeg) * 0.92 + (j === 0 ? 0.0 : gap);
        const s1 = ((j + 1) / nSeg) * 0.92 - gap;
        const nSt = lod === 0 ? 5 : 3;
        const ss = [];
        for (let i = 0; i < nSt; i++) ss.push(s0 + ((s1 - s0) * i) / (nSt - 1));
        const stations = (side < 0 ? ss.slice().reverse() : ss).map((s) =>
          prowStation(s, side, 0.985, 1, 1.4),
        );
        const tone = j % 2 ? TAN_LT : TAN;
        const k = (j % 2 ? 1.0 : 0.95) + rand() * 0.05;
        add(sweep(topStrip, stations, { closed: false }), "hull", {
          texel: 1 / 11,
          lod,
          tint: (x, y, z, o) => o.copy(tone).multiplyScalar(k),
        });
        add(sweep(botStrip, stations, { closed: false }), "hull", {
          texel: 1 / 11,
          lod,
          tint: (x, y, z, o) => o.copy(tone).multiplyScalar(k * 0.94),
        });
      }
    }
  }
  // rust-painted leading-edge arcs (top-front and bottom-front corners) on the mid-span plates
  {
    const per = 4; // points per corner in roundedRect(3, ...)
    const arcTop = prowProfile
      .slice(0, per)
      .map(([u, v]) => [u * 1.012, v * 1.012]);
    const arcBot = prowProfile
      .slice(3 * per, 4 * per)
      .map(([u, v]) => [u * 1.012, v * 1.012]);
    for (const lod of [0, 1])
      for (const side of [-1, 1])
        for (const [s0, s1] of [
          [0.16, 0.3],
          [0.34, 0.5],
          [0.58, 0.7],
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
          if (lod === 0)
            add(sweep(arcBot, stations, { closed: false }), "paint", {
              color: RUST_DK,
              lod,
              uv: "keep",
            });
        }
  }
  // dark machinery band along the whole underside of the crescent and along the trailing face
  for (const lod of [0, 1]) {
    const stations = prowSamples(lod === 0 ? 16 : 9)
      .filter((s) => Math.abs(s) < 0.94)
      .map((s) => prowStation(Math.abs(s), s < 0 ? -1 : 1, 1, 1, 0.45));
    add(
      sweep(
        [
          [-0.52, -1],
          [-0.2, -1],
        ],
        stations,
        { closed: false },
      ),
      "dark",
      { color: RECESS, texel: 1 / 5, lod },
    );
    const trail = prowSamples(lod === 0 ? 16 : 9)
      .filter((s) => Math.abs(s) < 0.9)
      .map((s) => prowStation(Math.abs(s), s < 0 ? -1 : 1, 1.012, 0.95, 0));
    add(
      sweep(
        [
          [-1, -0.55],
          [-1, -0.15],
        ],
        trail,
        { closed: false },
      ),
      "dark",
      { color: RECESS_DK, texel: 1 / 5, lod },
    );
    // machinery band along the notch (leading) faces near the centre
    const lead = prowSamples(lod === 0 ? 16 : 9)
      .filter((s) => Math.abs(s) < 0.62)
      .map((s) => prowStation(Math.abs(s), s < 0 ? -1 : 1, 1.012, 0.95, 0));
    add(
      sweep(
        [
          [1, -0.2],
          [1, -0.6],
        ],
        lead,
        { closed: false },
      ),
      "dark",
      { color: RECESS_DK, texel: 1 / 5, lod },
    );
    // raised spar along the aft third of the crescent top
    const spar = prowSamples(lod === 0 ? 18 : 9)
      .filter((s) => Math.abs(s) < 0.9)
      .map((s) => prowStation(Math.abs(s), s < 0 ? -1 : 1, 1, 1, 2.9));
    add(
      sweep(
        [
          [-0.5, 0.985],
          [-0.44, 1],
          [-0.2, 1],
          [-0.14, 0.985],
        ],
        spar,
        { closed: false },
      ),
      "hull",
      { color: TAN_DK, texel: 1 / 8, lod },
    );
  }
  // window slots: two rows along the trailing face near the spine head, one along the notch faces
  const prowWindows = (lod, sA, sB, uSide, vRow, step) => {
    for (const side of [-1, 1]) {
      for (let s = sA; s + step <= sB; s += step * 2) {
        const f0 = prowFrame(s, side);
        const f1 = prowFrame(s + step, side);
        const p0 = f0.p
          .clone()
          .addScaledVector(f0.N, uSide * (f0.hc + 0.35))
          .addScaledVector(f0.B, vRow * f0.ht);
        const p1 = f1.p
          .clone()
          .addScaledVector(f1.N, uSide * (f1.hc + 0.35))
          .addScaledVector(f1.B, vRow * f1.ht);
        add(bar(p0.toArray(), p1.toArray(), 0.7, 1.1), "windows", {
          color: WINDOW,
          lod,
          uv: "keep",
        });
      }
    }
  };
  for (const lod of [0, 1]) {
    prowWindows(lod, 0.03, 0.34, -1, 0.25, 0.018);
    if (lod === 0) prowWindows(lod, 0.05, 0.3, -1, -0.15, 0.018);
    prowWindows(lod, 0.02, 0.26, 1, 0.2, 0.02);
  }
  // vents (irregular dark grilles behind the spar) and hatch boxes along the crescent top (LOD 0)
  for (const side of [-1, 1]) {
    for (let s = 0.08; s < 0.8; s += 0.035 + rand() * 0.05) {
      const len = 0.012 + rand() * 0.02;
      const f0 = prowFrame(s, side);
      const f1 = prowFrame(s + len, side);
      const u = -0.66 - rand() * 0.1;
      const p0 = f0.p
        .clone()
        .addScaledVector(f0.N, u * f0.hc)
        .addScaledVector(f0.B, f0.ht + 1.5);
      const p1 = f1.p
        .clone()
        .addScaledVector(f1.N, u * f1.hc)
        .addScaledVector(f1.B, f1.ht + 1.5);
      add(bar(p0.toArray(), p1.toArray(), 2.5 + rand() * 4, 0.9), "dark", {
        color: rand() < 0.5 ? RECESS : RECESS_DK,
        texel: 1 / 3,
        lod: 0,
      });
    }
    for (let s = 0.12; s < 0.7; s += 0.09) {
      const f0 = prowFrame(s, side);
      const f1 = prowFrame(s + 0.025, side);
      const u = 0.1 + (rand() - 0.5) * 0.5;
      const p0 = f0.p
        .clone()
        .addScaledVector(f0.N, u * f0.hc)
        .addScaledVector(f0.B, f0.ht + 1.6);
      const p1 = f1.p
        .clone()
        .addScaledVector(f1.N, u * f1.hc)
        .addScaledVector(f1.B, f1.ht + 1.6);
      add(bar(p0.toArray(), p1.toArray(), 5 + rand() * 4, 1.6), "hull", {
        color: TAN_LT,
        texel: 1 / 5,
        lod: 0,
      });
    }
  }
  // heavy gun mounts at the prong tips (dorsal and ventral), barrels reaching past the tips
  for (const side of [-1, 1]) {
    const f = prowFrame(0.86, side);
    const top = f.ht;
    for (const up of [1, -1]) {
      const cx = f.p.x;
      const cz = f.p.z;
      const baseY = up * (top + 1.2);
      for (const lod of [0, 1, 2]) {
        const seg = lod === 0 ? 14 : lod === 1 ? 10 : 6;
        const base = new THREE.CylinderGeometry(11, 12.5, 3, seg);
        base.translate(cx, baseY, cz);
        add(base, "hull", { color: TAN, texel: 1 / 6, lod });
        if (lod < 2) {
          const dome = new THREE.SphereGeometry(
            10,
            lod === 0 ? 14 : 9,
            lod === 0 ? 8 : 5,
          );
          dome.scale(1, 0.62, 1.15);
          dome.translate(cx, baseY + up * 2.2, cz);
          add(dome, "hull", { color: TAN_DK, texel: 1 / 5, lod });
        } else {
          const h = new THREE.BoxGeometry(18, 9, 20);
          h.translate(cx, baseY + up * 3, cz);
          add(h, "hull", { color: TAN_DK, texel: 1 / 5, lod });
        }
        const nb = lod === 0 ? 2 : 1;
        for (let b = 0; b < nb; b++) {
          const bx = cx + (nb === 2 ? (b ? 4.6 : -4.6) : 0);
          add(
            tubeZ(
              2.3,
              2.9,
              62,
              lod === 0 ? 8 : 5,
              bx,
              baseY + up * 4.2,
              cz - 40,
              false,
            ),
            "dark",
            { color: RECESS_DK, texel: 1 / 3, lod },
          );
          if (lod === 0)
            add(
              tubeZ(3.1, 3.1, 7, 8, bx, baseY + up * 4.2, cz - 66, false),
              "dark",
              {
                color: RECESS,
                texel: 1 / 3,
                lod,
              },
            );
        }
      }
      hardpoints.push({
        pos: [cx, up * (top + 5.4), cz - 70],
        dir: [side * 0.05, up * 0.12, -1],
        kind: "heavy",
        range: 13000,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // spine head: transition block from the crescent centre into the spine, with windows, guns and masts
  // ---------------------------------------------------------------------------
  const HEAD = [
    { z: -216, sx: 50, sy: 22 },
    { z: -192, sx: 46, sy: 27 },
    { z: -150, sx: 40, sy: 29.5 },
    { z: -104, sx: 28.2, sy: 26.2 },
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
    add(loftZ(roundedRect(lod === 2 ? 1 : 3, 0.35, 0.35), HEAD), "hull", {
      color: TAN,
      texel: 1 / 12,
      lod,
    });
  for (const lod of [0, 1]) {
    for (const side of [-1, 1]) {
      const rows = lod === 0 ? [7, -3] : [7];
      for (const y of rows)
        for (let z = -188; z <= -122; z += 11)
          add(
            new THREE.BoxGeometry(0.7, 1.1, 5.5).translate(
              side * (headSX(z) + 0.3),
              y,
              z,
            ),
            "windows",
            { color: WINDOW, lod, uv: "keep" },
          );
      // dark flank recess bands on the head
      add(
        new THREE.BoxGeometry(0.6, 3.2, 70).translate(
          side * (headSX(-160) + 0.2),
          -12,
          -160,
        ),
        "dark",
        { color: RECESS, texel: 1 / 4, lod },
      );
    }
    // ventral bay under the head: dark recess with a lit mouth, and a collar ring at the head / spine joint
    add(
      new THREE.BoxGeometry(34, 1.4, 64).translate(
        0,
        -headSY(-160) + 0.2,
        -160,
      ),
      "dark",
      {
        color: RECESS_DK,
        texel: 1 / 5,
        lod,
      },
    );
    add(
      new THREE.BoxGeometry(22, 4, 30).translate(0, -headSY(-165) - 1.6, -165),
      "dark",
      {
        color: 0x2e2824,
        texel: 1 / 4,
        lod,
      },
    );
    add(
      new THREE.BoxGeometry(18, 0.6, 24).translate(
        0,
        -headSY(-165) - 3.5,
        -165,
      ),
      "windows",
      {
        color: 0xffd9a0,
        lod,
        uv: "keep",
      },
    );
    for (const side of [-1, 1])
      add(
        new THREE.BoxGeometry(2, 4.2, 32).translate(
          side * 12,
          -headSY(-165) - 1.5,
          -165,
        ),
        "hull",
        {
          color: TAN_DK,
          texel: 1 / 4,
          lod,
        },
      );
    add(
      loftZ(
        roundedRect(3, 0.35, 0.35),
        [
          { z: -117, sx: headSX(-113) + 1.1, sy: headSY(-113) + 1.1 },
          { z: -109, sx: headSX(-113) + 1.1, sy: headSY(-113) + 1.1 },
        ],
        { capStart: true, capEnd: true },
      ),
      "dark",
      { color: RECESS, texel: 1 / 4, lod },
    );
  }
  // sensor masts on the head
  for (const lod of [0, 1])
    for (const side of [-1, 1]) {
      const y0 = headSY(-138);
      add(
        new THREE.CylinderGeometry(0.8, 1.2, 30, 6).translate(
          side * 12,
          y0 + 15,
          -138,
        ),
        "dark",
        {
          color: RECESS,
          texel: 1 / 3,
          lod,
        },
      );
      add(
        new THREE.CylinderGeometry(4.2, 4.2, 0.8, 10).translate(
          side * 12,
          y0 + 30,
          -138,
        ),
        "hull",
        {
          color: TAN_LT,
          texel: 1 / 3,
          lod,
        },
      );
    }

  // ---------------------------------------------------------------------------
  // spine: segmented tan plates over a dark core, exposed dorsal machinery channel
  // ---------------------------------------------------------------------------
  const Z0 = -120;
  const Z1 = 262;
  const spineSX = (z) => 27 + ((z - Z0) / (Z1 - Z0)) * 4;
  const spineSY = (z) => 25 + ((z - Z0) / (Z1 - Z0)) * 3;
  const CH = channelRect(3, 0.35, 0.35, 0.34, 0.24, 0.42);
  const CH_LOW = channelRect(1, 0.35, 0.35, 0.34, 0.24, 0.42);
  const floorY = (z) => spineSY(z) * (1 - 0.42);
  // core (LOD 0/1) shows through the seams between plates
  for (const lod of [0, 1])
    add(
      loftZ(CH.loop, [
        { z: Z0, sx: spineSX(Z0) * 0.965, sy: spineSY(Z0) * 0.965 },
        { z: Z1, sx: spineSX(Z1) * 0.965, sy: spineSY(Z1) * 0.965 },
      ]),
      "dark",
      { color: CORE, texel: 1 / 5, lod },
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
        { closed: false },
      ),
      "dark",
      { color: RECESS, texel: 1 / 5, lod },
    );
  // LOD 2: one continuous hull strip
  add(
    loftZ(
      CH_LOW.hull,
      [
        { z: Z0, sx: spineSX(Z0), sy: spineSY(Z0) },
        { z: Z1, sx: spineSX(Z1), sy: spineSY(Z1) },
      ],
      { closed: false },
    ),
    "hull",
    { color: TAN, texel: 1 / 12, lod: 2 },
  );
  const NSEG = 8;
  const segLen = (Z1 - Z0) / NSEG;
  const segScale = (j) => (j % 2 ? 1 : 1.03);
  const segTone = [];
  for (let j = 0; j < NSEG; j++) segTone.push(0.95 + rand() * 0.1);
  for (const lod of [0, 1]) {
    for (let j = 0; j < NSEG; j++) {
      const z0 = Z0 + j * segLen + (j ? 0.8 : 0);
      const z1 = Z0 + (j + 1) * segLen - (j < NSEG - 1 ? 0.8 : 0);
      const k = segScale(j);
      const tone = segTone[j];
      const base = j % 3 === 1 ? TAN_LT : TAN;
      add(
        loftZ(
          CH.hull,
          [
            { z: z0, sx: spineSX(z0) * k, sy: spineSY(z0) * k },
            { z: z1, sx: spineSX(z1) * k, sy: spineSY(z1) * k },
          ],
          { closed: false },
        ),
        "hull",
        {
          texel: 1 / 12,
          lod,
          tint: (x, y, z, o) =>
            o.copy(base).multiplyScalar(tone * (y < -8 ? 0.93 : 1)),
        },
      );
      const zc = (z0 + z1) / 2;
      const len = z1 - z0;
      for (const side of [-1, 1]) {
        const fx = spineSX(zc) * k + 0.35;
        // dark recess bands along the flanks
        add(
          new THREE.BoxGeometry(0.7, 4, len - 8).translate(side * fx, 5, zc),
          "dark",
          {
            color: RECESS,
            texel: 1 / 4,
            lod,
          },
        );
        if (lod === 0)
          add(
            new THREE.BoxGeometry(0.6, 2.4, len - 14).translate(
              side * fx,
              -9,
              zc,
            ),
            "dark",
            {
              color: RECESS_DK,
              texel: 1 / 4,
              lod,
            },
          );
        // window slots on every other plate
        if (j % 2 === 1)
          for (let w = 0; w < 4; w++)
            add(
              new THREE.BoxGeometry(0.7, 1.0, 4.5).translate(
                side * fx,
                0.5,
                z0 + 10 + w * 9,
              ),
              "windows",
              { color: WINDOW, lod, uv: "keep" },
            );
        // rust panel accents
        if (j === 2 || j === 5)
          add(
            new THREE.BoxGeometry(0.3, 6, 16).translate(
              side * (fx - 0.1),
              -2.5,
              zc + 6,
            ),
            "paint",
            {
              color: j === 2 ? RUST : RUST_DK,
              lod,
              uv: "keep",
            },
          );
      }
      if (j === 4)
        for (const side of [-1, 1])
          add(
            new THREE.BoxGeometry(7, 0.3, 22).translate(
              side * spineSX(zc) * 0.58,
              spineSY(zc) * k + 0.15,
              zc,
            ),
            "paint",
            { color: RUST, lod, uv: "keep" },
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
        { color: RECESS, texel: 1 / 3, lod },
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
      { color: i % 3 ? RECESS : 0xa09284, texel: 1 / 3, lod: 0 },
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
      { color: WINDOW, lod: 0, uv: "keep" },
    );
  }
  // greebles on the lower flanks
  for (let i = 0; i < 34; i++) {
    const z = Z0 + 20 + rand() * (Z1 - Z0 - 40);
    const side = rand() < 0.5 ? -1 : 1;
    const j = Math.min(NSEG - 1, Math.floor((z - Z0) / segLen));
    const fx = spineSX(z) * segScale(j) + 0.6;
    const w = 1.5 + rand() * 3;
    add(
      new THREE.BoxGeometry(w, 1.5 + rand() * 3, 2 + rand() * 5).translate(
        side * fx,
        -17 + rand() * 6,
        z,
      ),
      rand() < 0.7 ? "dark" : "hull",
      { color: rand() < 0.7 ? RECESS : TAN_DK, texel: 1 / 3, lod: 0 },
    );
  }
  // keel: twin conduit run with clamps along the spine underside, three recessed ventral bays with lit mouths
  const bellyY = (z) =>
    -spineSY(z) * segScale(Math.min(NSEG - 1, Math.floor((z - Z0) / segLen)));
  for (const lod of [0, 1]) {
    for (const px of [-6.5, 6.5])
      add(
        loftZ(superellipse(lod === 0 ? 8 : 6, 2), [
          {
            z: Z0 + 10,
            sx: 1.6,
            sy: 1.6,
            x: px,
            y: -spineSY(Z0 + 10) * 1.03 - 1.5,
          },
          {
            z: Z1 - 12,
            sx: 1.6,
            sy: 1.6,
            x: px,
            y: -spineSY(Z1 - 12) * 1.03 - 1.5,
          },
        ]),
        "dark",
        { color: RECESS, texel: 1 / 2, lod },
      );
    const BAYS = [-80, 110, 210]; // clear of the belly turrets at z = -40, 60, 160
    for (let z = Z0 + 22; z < Z1 - 14; z += lod === 0 ? 24 : 48) {
      if (BAYS.some((zc) => Math.abs(z - zc) < 18)) continue;
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
    for (const zc of BAYS) {
      add(
        new THREE.BoxGeometry(20, 2.2, 30).translate(0, bellyY(zc) - 0.5, zc),
        "dark",
        {
          color: RECESS_DK,
          texel: 1 / 4,
          lod,
        },
      );
      add(
        new THREE.BoxGeometry(15, 0.5, 23).translate(0, bellyY(zc) - 1.7, zc),
        "windows",
        {
          color: 0xffd9a0,
          lod,
          uv: "keep",
        },
      );
      for (const side of [-1, 1])
        add(
          new THREE.BoxGeometry(1.6, 2.8, 32).translate(
            side * 10.8,
            bellyY(zc) - 0.6,
            zc,
          ),
          "hull",
          {
            color: TAN_DK,
            texel: 1 / 4,
            lod,
          },
        );
    }
  }

  // ---------------------------------------------------------------------------
  // turrets: heavy pair on the head, light pairs along the spine top and belly
  // ---------------------------------------------------------------------------
  const turret = (x, y, z, size, up, lod, tint = TAN) => {
    const seg = lod === 0 ? 12 : 8;
    const base = new THREE.CylinderGeometry(
      size * 1.1,
      size * 1.2,
      size * 0.8,
      seg,
    );
    base.translate(x, y + up * size * 0.2, z);
    add(base, "hull", { color: tint, texel: 1 / 5, lod });
    const h = new THREE.BoxGeometry(size * 1.7, size * 0.8, size * 1.9);
    h.translate(x, y + up * size * 0.95, z + size * 0.15);
    add(h, "dark", { color: RECESS, texel: 1 / 4, lod });
    if (lod === 0) {
      const dome = new THREE.SphereGeometry(size * 0.6, 10, 6);
      dome.scale(1, 0.6, 1.1);
      dome.translate(x, y + up * size * 1.35, z + size * 0.1);
      add(dome, "hull", { color: tint, texel: 1 / 4, lod });
    }
    const len = size * 4.4;
    const nb = lod === 0 ? 2 : 1;
    for (let b = 0; b < nb; b++) {
      const bx = x + (nb === 2 ? (b ? 0.34 : -0.34) * size : 0);
      add(
        tubeZ(
          size * 0.15,
          size * 0.19,
          len,
          lod === 0 ? 7 : 5,
          bx,
          y + up * size * 1.0,
          z - size * 0.8 - len / 2,
          false,
        ),
        "dark",
        { color: RECESS_DK, texel: 1 / 3, lod },
      );
    }
    return [x, y + up * size, z - size * 0.8 - len];
  };
  for (const side of [-1, 1]) {
    const hz = -166;
    let muzzle;
    for (const lod of [0, 1])
      muzzle = turret(side * 21, headSY(hz), hz, 8.5, 1, lod);
    hardpoints.push({
      pos: muzzle,
      dir: [side * 0.4, 0.45, -0.8],
      kind: "heavy",
      range: 12000,
    });
  }
  for (let i = 0; i < 6; i++) {
    const z = -84 + i * 58;
    const j = Math.min(NSEG - 1, Math.floor((z - Z0) / segLen));
    const k = segScale(j);
    for (const side of [-1, 1]) {
      const x = side * spineSX(z) * 0.52;
      let muzzle;
      for (const lod of [0, 1])
        muzzle = turret(x, spineSY(z) * k, z, 4.6, 1, lod);
      hardpoints.push({
        pos: muzzle,
        dir: [side * 0.55, 0.5, -0.6],
        kind: "light",
        range: 7000,
      });
    }
  }
  for (let i = 0; i < 3; i++) {
    const z = -40 + i * 100;
    const j = Math.min(NSEG - 1, Math.floor((z - Z0) / segLen));
    const k = segScale(j);
    for (const side of [-1, 1]) {
      const x = side * spineSX(z) * 0.5;
      let muzzle;
      for (const lod of [0, 1])
        muzzle = turret(x, -spineSY(z) * k, z, 4.2, -1, lod, TAN_DK);
      hardpoints.push({
        pos: muzzle,
        dir: [side * 0.55, -0.6, -0.5],
        kind: "light",
        range: 7000,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // aft bulb: sooty toward the stern, plating rings, equator band, vents, hatches, masts, windows
  // ---------------------------------------------------------------------------
  const BULB = [
    { z: 250, sx: 31, sy: 28 },
    { z: 280, sx: 45, sy: 41 },
    { z: 310, sx: 60, sy: 54 },
    { z: 340, sx: 69, sy: 61 },
    { z: 370, sx: 68, sy: 60 },
    { z: 395, sx: 59, sy: 53 },
    { z: 412.5, sx: 46, sy: 43 },
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
  const bulbTint = (x, y, z, o) => {
    const soot = 0.82 * smoothstep(330, 412, z);
    mix(TAN, SOOT, soot, o);
    if (y < 0) o.multiplyScalar(0.94);
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
    superellipse(lod === 0 ? 22 : lod === 1 ? 14 : 10, 2.6);
  for (const lod of [0, 1, 2]) {
    if (lod === 2) {
      add(
        loftZ(bulbProfile(lod), bulbStations(250, 412.5, 6, 1), {
          capEnd: true,
        }),
        "hull",
        {
          texel: 1 / 12,
          lod,
          tint: bulbTint,
        },
      );
      continue;
    }
    // three plating rings, the middle one raised
    add(
      loftZ(bulbProfile(lod), bulbStations(250, 301, lod === 0 ? 6 : 4, 1)),
      "hull",
      {
        texel: 1 / 12,
        lod,
        tint: bulbTint,
      },
    );
    add(
      loftZ(
        bulbProfile(lod),
        bulbStations(300, 362, lod === 0 ? 7 : 4, 1.025),
        {
          capStart: true,
          capEnd: true,
        },
      ),
      "hull",
      {
        texel: 1 / 12,
        lod,
        tint: (x, y, z, o) => {
          bulbTint(x, y, z, o);
          o.multiplyScalar(1.04);
        },
      },
    );
    add(
      loftZ(bulbProfile(lod), bulbStations(361, 412.5, lod === 0 ? 7 : 4, 1), {
        capEnd: true,
      }),
      "hull",
      { texel: 1 / 12, lod, tint: bulbTint },
    );
    // dark equator band and rust ring
    add(
      loftZ(bulbProfile(lod), bulbStations(335, 343, 2, 1.04), {
        capStart: true,
        capEnd: true,
      }),
      "dark",
      { color: RECESS, texel: 1 / 5, lod },
    );
    add(loftZ(bulbProfile(lod), bulbStations(318, 323, 2, 1.032)), "paint", {
      color: RUST,
      lod,
      uv: "keep",
    });
    // windows around the bulb shoulders
    for (const side of [-1, 1])
      for (let z = 292; z <= 330; z += 7.5) {
        const v = 9 / bulbSY(z);
        add(
          new THREE.BoxGeometry(0.7, 1.1, 4.4).translate(
            side * (bulbSX(z) * superellipseU(v, 2.6) + 0.3),
            9,
            z,
          ),
          "windows",
          { color: WINDOW, lod, uv: "keep" },
        );
      }
    // sensor masts off the bulb flanks
    for (const side of [-1, 1]) {
      add(bar([side * 62, 4, 332], [side * 100, 16, 322], 1.6), "dark", {
        color: RECESS,
        texel: 1 / 3,
        lod,
      });
      add(
        new THREE.SphereGeometry(3.4, 8, 6).translate(side * 100, 16, 322),
        "hull",
        {
          color: TAN_LT,
          texel: 1 / 3,
          lod,
        },
      );
    }
  }
  // vents and hatches around the bulb (LOD 0)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    const z = 376;
    const dir = new THREE.Vector3(
      Math.cos(a) * bulbSX(z),
      Math.sin(a) * bulbSY(z),
      0,
    );
    const r = dir.length();
    dir.normalize();
    const p0 = dir
      .clone()
      .multiplyScalar(r - 3)
      .setZ(z)
      .toArray();
    const p1 = dir
      .clone()
      .multiplyScalar(r + 1.4)
      .setZ(z)
      .toArray();
    add(bar(p0, p1, 7, 3.2), "dark", {
      color: RECESS_DK,
      texel: 1 / 3,
      lod: 0,
    });
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.6;
    const z = 288 + (i % 3) * 8;
    const dir = new THREE.Vector3(
      Math.cos(a) * bulbSX(z),
      Math.sin(a) * bulbSY(z),
      0,
    );
    const r = dir.length();
    dir.normalize();
    const p0 = dir
      .clone()
      .multiplyScalar(r - 2)
      .setZ(z)
      .toArray();
    const p1 = dir
      .clone()
      .multiplyScalar(r + 0.8)
      .setZ(z)
      .toArray();
    add(bar(p0, p1, 4.5, 5.5), "hull", {
      color: i % 2 ? TAN_LT : TAN_DK,
      texel: 1 / 3,
      lod: 0,
    });
  }

  // ---------------------------------------------------------------------------
  // fins: tall dorsal blade and a shorter ventral blade on the bulb
  // ---------------------------------------------------------------------------
  const DFIN = [
    { z: 256, yB: 20, yT: 42, sx: 5 },
    { z: 284, yB: 30, yT: 100, sx: 7.5 },
    { z: 318, yB: 48, yT: 146, sx: 8.5 },
    { z: 350, yB: 55, yT: 156, sx: 8 },
    { z: 382, yB: 54, yT: 126, sx: 6.2 },
    { z: 406, yB: 44, yT: 76, sx: 3.6 },
  ];
  const VFIN = [
    { z: 262, yB: -38, yT: -20, sx: 4.5 },
    { z: 290, yB: -92, yT: -32, sx: 7 },
    { z: 325, yB: -124, yT: -50, sx: 8 },
    { z: 356, yB: -128, yT: -56, sx: 7.5 },
    { z: 385, yB: -104, yT: -54, sx: 5.8 },
    { z: 406, yB: -66, yT: -44, sx: 3.2 },
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
    mix(TAN, SOOT, 0.55 * smoothstep(372, 410, z), o);
  // half thickness of the dorsal fin at (z, y)
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
  for (const lod of [0, 1, 2]) {
    const st = lod === 2 ? [DFIN[0], DFIN[2], DFIN[3], DFIN[5]] : DFIN;
    const sv = lod === 2 ? [VFIN[0], VFIN[2], VFIN[3], VFIN[5]] : VFIN;
    add(loftZ(blade(), finStations(st)), "hull", {
      texel: 1 / 10,
      lod,
      tint: finTint,
    });
    add(loftZ(mirrorV(blade()), finStations(sv)), "hull", {
      texel: 1 / 10,
      lod,
      tint: finTint,
    });
  }
  for (const lod of [0, 1]) {
    for (const side of [-1, 1]) {
      // dark spar panels and a rust stripe along the dorsal fin's leading region
      const xa = finX(DFIN, 300, 60, 1) + 0.25;
      const xb = finX(DFIN, 328, 132, 1) + 0.25;
      add(bar([side * xa, 60, 300], [side * xb, 132, 328], 0.5, 7), "dark", {
        color: RECESS,
        texel: 1 / 4,
        lod,
      });
      const xr0 = finX(DFIN, 292, 46, 1) + 0.2;
      const xr1 = finX(DFIN, 314, 104, 1) + 0.2;
      add(bar([side * xr0, 46, 292], [side * xr1, 104, 314], 0.3, 5), "paint", {
        color: RUST,
        lod,
        uv: "keep",
      });
      const xd0 = finX(DFIN, 352, 72, 1) + 0.25;
      const xd1 = finX(DFIN, 394, 104, 1) + 0.25;
      add(bar([side * xd0, 72, 352], [side * xd1, 104, 394], 0.5, 9), "dark", {
        color: RECESS_DK,
        texel: 1 / 4,
        lod,
      });
      // window row near the top of the dorsal fin, a second lower row at LOD 0
      for (let z = 316; z <= 368; z += 6.5)
        add(
          new THREE.BoxGeometry(0.7, 1.0, 4).translate(
            side * (finX(DFIN, z, 132, 1) + 0.3),
            132,
            z,
          ),
          "windows",
          { color: WINDOW, lod, uv: "keep" },
        );
      if (lod === 0)
        for (let z = 330; z <= 372; z += 7)
          add(
            new THREE.BoxGeometry(0.7, 0.9, 3.5).translate(
              side * (finX(DFIN, z, 92, 1) + 0.3),
              92,
              z,
            ),
            "windows",
            { color: WINDOW, lod, uv: "keep" },
          );
      // ventral fin dark panel and rust stripe
      const xv0 = finX(VFIN, 305, -74, -1) + 0.25;
      const xv1 = finX(VFIN, 350, -110, -1) + 0.25;
      add(
        bar([side * xv0, -74, 305], [side * xv1, -110, 350], 0.5, 8),
        "dark",
        {
          color: RECESS,
          texel: 1 / 4,
          lod,
        },
      );
      const xw0 = finX(VFIN, 296, -50, -1) + 0.2;
      const xw1 = finX(VFIN, 320, -100, -1) + 0.2;
      add(
        bar([side * xw0, -50, 296], [side * xw1, -100, 320], 0.3, 4),
        "paint",
        {
          color: RUST_DK,
          lod,
          uv: "keep",
        },
      );
    }
    // mast and dish on the fin top, raked antenna off the trailing corner, ventral probe
    add(
      new THREE.CylinderGeometry(1.0, 1.4, 34, 6).translate(0, 156 + 17, 344),
      "dark",
      {
        color: RECESS,
        texel: 1 / 3,
        lod,
      },
    );
    add(
      new THREE.CylinderGeometry(5.5, 5.5, 0.9, 10).translate(0, 190, 344),
      "hull",
      {
        color: TAN_LT,
        texel: 1 / 3,
        lod,
      },
    );
    add(new THREE.SphereGeometry(1.8, 8, 6).translate(0, 192, 344), "dark", {
      color: RECESS,
      texel: 1 / 3,
      lod,
    });
    add(bar([0, 118, 392], [0, 142, 432], 1.2), "dark", {
      color: RECESS,
      texel: 1 / 3,
      lod,
    });
    add(
      new THREE.CylinderGeometry(1.0, 0.7, 26, 6).translate(0, -128 - 13, 342),
      "dark",
      {
        color: RECESS,
        texel: 1 / 3,
        lod,
      },
    );
  }
  // longitudinal ribs around the bulb (LOD 0)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.15;
    if (Math.abs(Math.sin(a)) > 0.93) continue; // leave the fin roots clear
    for (let z = 284; z < 396; z += 14) {
      const at = (zz) => {
        const d = new THREE.Vector3(
          Math.cos(a) * bulbSX(zz),
          Math.sin(a) * bulbSY(zz),
          0,
        );
        const r = d.length();
        d.normalize();
        return d
          .multiplyScalar(r + 0.7)
          .setZ(zz)
          .toArray();
      };
      add(bar(at(z), at(Math.min(396, z + 13)), 2.6, 2.2), "hull", {
        color: i % 2 ? TAN_DK : TAN,
        texel: 1 / 4,
        lod: 0,
        tint: (x, y, zz, o) => bulbTint(x, y, zz, o),
      });
    }
  }

  // ---------------------------------------------------------------------------
  // engines: a ring of eight nozzles around a larger central one on the stern face
  // ---------------------------------------------------------------------------
  const zS = 412.5;
  for (const lod of [0, 1, 2])
    add(
      plateZ(
        superellipse(lod === 0 ? 22 : 12, 2.6),
        46 * 0.94,
        43 * 0.94,
        zS - 0.4,
        zS + 1.2,
      ),
      "dark",
      {
        color: 0x6a5f56,
        texel: 1 / 5,
        lod,
      },
    );
  // soft engine glow spill over the stern plate
  for (const lod of [0, 1])
    add(discZ(44, 16, 0, 0, zS + 1.8), "plumeAdd", {
      lod,
      uv: "keep",
      tint: (px, py, pz, o) => o.copy(PLUME).multiplyScalar(0.22),
    });
  const nozzles = [{ x: 0, y: 0, r: 15 }];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    nozzles.push({ x: Math.cos(a) * 30, y: Math.sin(a) * 26.5, r: 9 });
  }
  for (const { x, y, r } of nozzles) {
    for (const lod of [0, 1, 2]) {
      const seg = lod === 0 ? 16 : lod === 1 ? 10 : 7;
      if (lod < 2) {
        add(tubeZ(r + 1.8, r + 0.5, 22, seg, x, y, zS + 12), "dark", {
          texel: 1 / 4,
          lod,
          tint: (px, py, pz, o) =>
            o
              .setHex(0x6a5f56)
              .multiplyScalar(1 - 0.45 * smoothstep(zS + 4, zS + 23, pz)),
        });
        add(
          flipFaces(tubeZ(r + 0.5, r * 0.45, 20, seg, x, y, zS + 13)),
          "dark",
          {
            color: 0x3c3632,
            texel: 1 / 4,
            lod,
          },
        );
        if (lod === 0) {
          // rim ring and three braces
          add(
            tubeZ(r + 2.4, r + 2.4, 1.6, seg, x, y, zS + 22.4, false),
            "dark",
            {
              color: 0x8a7c6c,
              texel: 1 / 3,
              lod,
            },
          );
        }
      } else {
        add(tubeZ(r + 1.8, r + 0.5, 12, seg, x, y, zS + 7), "dark", {
          color: 0x5a504a,
          texel: 1 / 4,
          lod,
        });
      }
      add(discZ(r * 0.5, seg, x, y, zS + 4), "engineGlow", {
        color: GLOW,
        lod,
        uv: "keep",
      });
      if (lod < 2)
        add(discZ(r * 0.25, 8, x, y, zS + 4.6), "engineGlow", {
          lod,
          uv: "keep",
          tint: (px, py, pz, o) => o.setRGB(1.6, 1.7, 1.8),
        });
      // additive plume cone fading to black
      const len = r * 7.5;
      add(
        tubeZ(
          r * 0.12,
          r * 0.92,
          len,
          lod === 0 ? 12 : 8,
          x,
          y,
          zS + 23 + len / 2,
        ),
        "plumeAdd",
        {
          lod,
          uv: "keep",
          tint: (px, py, pz, o) => {
            const k = Math.min(1, Math.max(0, (pz - (zS + 23)) / len));
            o.copy(PLUME).multiplyScalar(1.5 * (1 - k) ** 1.7);
          },
        },
      );
    }
    engines.push({ pos: [x, y, zS + 4], r });
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
    },
    mats,
  );
}
