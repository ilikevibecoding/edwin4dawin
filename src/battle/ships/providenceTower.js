// Command tower and secondary fins of the Providence-class: stepped slab tiers (72 m thick at the
// base tapering to 21 m) with set-back ledges, orange edge trims, a wide faceted bridge head with a
// recessed window band, plus the superstructure detail: sensor domes, comm dish, antenna spars,
// equipment panels, hatch rows along the tower base, window rows, the fin insignia, rust streaks.
import * as THREE from "three";
import { box, cylY } from "./shipKit.js";
import {
  clamp01,
  colorize,
  hash,
  headRings,
  headScale,
  loftRings,
  placeOn,
  rgb,
  ringCap,
  ringSlab,
  rng,
  slabRings,
  slabThick,
} from "./providenceGeo.js";
import {
  FORE_FIN,
  PAL,
  TOWER,
  VENTRAL_FIN,
  barAlong,
  tierFns,
} from "./providenceSpec.js";

const UP = new THREE.Vector3(0, 1, 0);

export function buildTower(ctx) {
  buildStack(ctx, TOWER, "main");
  buildStack(ctx, FORE_FIN, "fore");
  buildStack(ctx, VENTRAL_FIN, "ventral");
  mainTowerDetail(ctx);
  secondaryDetail(ctx);
}

// surface point and outward normal on a tier face (side ±1) at height y, longitudinal z
export function tierSurface(t, side, y, z) {
  const fns = tierFns(t);
  const surf = (yy, zz) => {
    const zl = fns.zLead(yy);
    const c = fns.zTrail(yy) - zl;
    const f = clamp01((zz - zl) / c);
    return new THREE.Vector3(
      side * fns.halfT(yy) * slabThick(f, t.tail),
      yy,
      zz,
    );
  };
  const p = surf(y, z);
  const ty = surf(y + 1, z).sub(surf(y - 1, z));
  const tz = surf(y, z + 1).sub(surf(y, z - 1));
  const n = new THREE.Vector3().crossVectors(tz, ty).normalize();
  if (n.x * side < 0) n.negate();
  return { p, n };
}
// place a local geometry (up +Y = out of the face) on a tier face, standing `out` metres proud
function onTier(t, side, y, z, geo, out = 0.4) {
  const { p, n } = tierSurface(t, side, y, z);
  placeOn(geo, p.addScaledVector(n, out), n, UP);
  return geo;
}

const faceTint = (baseHex, seed) => (i, j) => {
  const base = rgb(baseHex);
  const g = hash(i * 3 + 1, j * 5 + 2, seed);
  const tone = 0.94 + g * 0.12;
  return [base[0] * tone, base[1] * tone, base[2] * tone];
};

// ---------------------------------------------------------------------------
// tiers + trims + head for one stack (tower or fin)
// ---------------------------------------------------------------------------
function buildStack({ add }, spec, name) {
  const dir = spec.dir;
  const main = name === "main";
  const texel = main ? 1 / 30 : 1 / 20;
  for (const lod of [0, 1, 2]) {
    spec.tiers.forEach((t, k) => {
      const fns = tierFns(t);
      const { rings, sharp } = slabRings({
        y0: t.y0,
        y1: t.y1,
        n: lod === 0 ? 4 : 2,
        ...fns,
        tail: t.tail,
      });
      add(
        loftRings(rings, {
          sharp,
          faceColor: faceTint(PAL.finFace, 7 + k),
          uv: (i, j, p) => [p[2] * texel, p[1] * texel],
        }),
        "hull",
        { lod, keepColor: true },
      );
      // ledge: the exposed tier top
      add(
        ringCap(rings[rings.length - 1], [0, dir, 0], {
          color: rgb(PAL.dorsal, 0.95),
          texel: 1 / 12,
        }),
        "hull",
        { lod, keepColor: true },
      );
      // orange trims hugging the nose and the blunt tail of every tier
      if (lod < 2 || (main && k < 2)) {
        const n = lod === 0 ? 3 : 2;
        const ys = [];
        for (let q = 0; q < n; q++)
          ys.push(t.y0 + ((t.y1 - t.y0) * q) / (n - 1));
        const nose = ys.map((y) => {
          const zl = fns.zLead(y);
          const c = fns.zTrail(y) - zl;
          const th = fns.halfT(y);
          const ring = [[0, y, zl - 0.35]];
          const fs = [0.003, 0.01, 0.022];
          for (const f of fs)
            ring.push([th * slabThick(f, t.tail) + 0.35, y, zl + c * f]);
          for (let q = fs.length - 1; q >= 0; q--)
            ring.push([
              -(th * slabThick(fs[q], t.tail) + 0.35),
              y,
              zl + c * fs[q],
            ]);
          return ring;
        });
        add(
          loftRings(nose, {
            sharp: new Set([0, 3, 4]),
            faceColor: () => rgb(PAL.trim),
          }),
          "paint",
          { lod, keepColor: true },
        );
        const tail = ys.map((y) => {
          const zl = fns.zLead(y);
          const c = fns.zTrail(y) - zl;
          const zt = fns.zTrail(y);
          const th = fns.halfT(y);
          const a = th * t.tail + 0.35;
          const b = th * slabThick(0.975, t.tail) + 0.35;
          return [
            [a, y, zt + 0.35],
            [-a, y, zt + 0.35],
            [-b, y, zl + c * 0.975],
            [b, y, zl + c * 0.975],
          ];
        });
        add(
          loftRings(tail, {
            sharp: new Set([0, 1, 2, 3]),
            faceColor: () => rgb(PAL.trim),
          }),
          "paint",
          { lod, keepColor: true },
        );
      }
    });
    buildHead(add, spec.head, lod, main, name);
  }
}

// faceted bridge head: rounded-rectangle loft with the recessed window band, front and tail caps,
// windows in the band (discrete at LOD 0, bars at LOD 1/2)
function buildHead(add, head, lod, main, name) {
  const nZ =
    lod === 0 ? (main ? 10 : 6) : lod === 1 ? (main ? 6 : 4) : main ? 4 : 2;
  const { rings, sharp, bandSegs } = headRings({ ...head, nZ });
  const DARK = rgb(0x1a1d22);
  const tint = faceTint(PAL.flank, 31);
  add(
    loftRings(rings, {
      sharp,
      faceColor: (i, j, c, n) => (bandSegs.has(j) ? DARK : tint(i, j)),
      uv: (i, j, p, arc) => [p[2] / 16, arc / 16],
    }),
    "hull",
    { lod, keepColor: true },
  );
  add(
    ringCap(rings[0], [0, 0, -1], {
      color: rgb(PAL.flank, 0.92),
      texel: 1 / 10,
    }),
    "hull",
    { lod, keepColor: true },
  );
  add(
    ringCap(rings[rings.length - 1], [0, 0, 1], {
      color: rgb(PAL.flank, 0.85),
      texel: 1 / 10,
    }),
    "hull",
    { lod, keepColor: true },
  );
  if (!head.band) return;
  const { cy, z0, z1, halfW, inset } = head;
  const yb = (cy0, k) => cy0 + ((head.band[0] + head.band[1]) / 2) * k;
  const xb = (k) => (halfW - inset) * k + 0.18;
  const wh = Math.min(1.6, (head.band[1] - head.band[0]) * 0.65);
  if (lod === 0) {
    const pitch = main ? 2.7 : 2.2;
    for (const side of [-1, 1])
      for (let z = z0 + 5; z <= z1 - 8; z += pitch) {
        if (hash(Math.round(z * 10), side + 4, 61) < 0.12) continue;
        const k = headScale(head, z);
        add(box(side * xb(k), yb(cy, k), z, 0.3, wh, pitch * 0.55), "windows", {
          color: PAL.windowWarm,
          lod,
          uv: "keep",
        });
      }
    // bridge windows across the front face
    const k0 = headScale(head, z0);
    const xMax = (halfW - head.r) * k0;
    for (let x = -xMax; x <= xMax + 0.01; x += pitch)
      add(box(x, yb(cy, k0), z0 - 0.15, pitch * 0.55, wh, 0.3), "windows", {
        color: PAL.windowWarm,
        lod,
        uv: "keep",
      });
    return;
  }
  // LOD 1/2: continuous window bars
  const zs = [z0 + 4, z0 + (z1 - z0) * 0.3, z0 + (z1 - z0) * 0.6, z1 - 8];
  for (const side of [-1, 1])
    add(
      barAlong(
        zs,
        (z) => {
          const k = headScale(head, z);
          return [side * xb(k), yb(cy, k)];
        },
        0.3,
        wh,
        { color: rgb(PAL.windowWarm, 0.95) },
      ),
      "windows",
      { lod, keepColor: true },
    );
  const k0 = headScale(head, z0);
  add(
    box(0, yb(cy, k0), z0 - 0.15, (halfW - head.r) * 2 * k0, wh, 0.3),
    "windows",
    { color: PAL.windowWarm, lod, uv: "keep" },
  );
}

// ---------------------------------------------------------------------------
// main tower detail
// ---------------------------------------------------------------------------
function mainTowerDetail({ add }) {
  const tiers = TOWER.tiers;
  const head = TOWER.head;
  const rand = rng(77);
  const zAt = (t, y, f) => {
    const fns = tierFns(t);
    return fns.zLead(y) + (fns.zTrail(y) - fns.zLead(y)) * f;
  };
  for (const side of [-1, 1]) {
    // dark equipment panels with a raised frame and a lit slit: big on the base tier, smaller above
    const panels = [
      [0, 74, 0.34, 26, 18],
      [0, 80, 0.62, 18, 14],
      [0, 70, 0.82, 14, 12],
      [1, 138, 0.55, 20, 14],
      [1, 122, 0.78, 12, 10],
      [2, 196, 0.62, 12, 10],
    ];
    for (const [k, y, f, w, h] of panels) {
      const t = tiers[k];
      const z = zAt(t, y, f);
      add(
        onTier(t, side, y, z, box(0, 0.3, 0, w + 1.4, 0.6, h + 1.4)),
        "hull",
        {
          color: new THREE.Color(PAL.dorsal).multiplyScalar(0.85),
          texel: 1 / 8,
          lod: 0,
        },
      );
      add(onTier(t, side, y, z, box(0, 0.7, 0, w, 0.8, h)), "dark", {
        color: PAL.darkLit,
        texel: 1 / 4,
        lod: 0,
      });
      add(
        onTier(t, side, y + h * 0.3, z, box(0, 1.2, 0, w * 0.7, 0.3, 0.6)),
        "windows",
        { color: PAL.windowCool, lod: 0, uv: "keep" },
      );
    }
    // raised vertical strips on the two lower tiers
    for (const k of [0, 1]) {
      const t = tiers[k];
      for (let i = 0; i < 5; i++) {
        const y0 = t.y0 + 6 + rand() * (t.y1 - t.y0 - 30);
        const hh = 12 + rand() * Math.min(30, t.y1 - y0 - 6);
        const f = 0.2 + rand() * 0.55;
        const z = zAt(t, y0 + hh / 2, f);
        add(
          onTier(
            t,
            side,
            y0 + hh / 2,
            z,
            box(0, 0.45, 0, 2.5 + rand() * 2.5, 0.9, hh),
          ),
          "hull",
          {
            color: new THREE.Color(PAL.dorsal).multiplyScalar(
              0.9 + rand() * 0.3,
            ),
            texel: 1 / 10,
            lod: 0,
          },
        );
      }
    }
    // horizontal panel lines (thin dark bars) across every tier
    for (const [k, y] of [
      [0, 62],
      [0, 92],
      [1, 112],
      [1, 156],
      [2, 180],
      [2, 214],
      [3, 233],
    ]) {
      const t = tiers[k];
      const za = zAt(t, y, 0.06);
      const zb = zAt(t, y, 0.92);
      add(
        onTier(
          t,
          side,
          y,
          (za + zb) / 2,
          box(0, 0.2, 0, zb - za, 0.4, 0.9),
          0.3,
        ),
        "dark",
        { color: 0x2c3037, texel: 1 / 4, lod: 0 },
      );
    }
    // hatch rows along the tower base
    const t0 = tiers[0];
    for (const [y, pitch, skip] of [
      [53, 4.6, 0],
      [62, 9.2, 0.3],
    ])
      for (let z = zAt(t0, y, 0.05); z < zAt(t0, y, 0.9); z += pitch) {
        if (skip && hash(Math.round(z), side + y, 3) < skip) continue;
        add(
          onTier(t0, side, y, z, box(0, 0.3, 0, 2.2, 0.6, 2.2), 0.2),
          "dark",
          {
            color: 0x2e3238,
            texel: 1 / 2,
            lod: 0,
          },
        );
      }
    // small equipment boxes scattered on the base tier
    for (let i = 0; i < 8; i++) {
      const y = 66 + rand() * 28;
      const z = zAt(t0, y, 0.12 + rand() * 0.75);
      add(
        onTier(
          t0,
          side,
          y,
          z,
          box(0, 0.8, 0, 2 + rand() * 4, 1.6, 2 + rand() * 3),
        ),
        "dark",
        { color: PAL.darkLit, texel: 1 / 3, lod: 0 },
      );
    }
    // insignia: dark hexagon plate with a rust frame ring on both faces of the second tier
    const t1 = tiers[1];
    const zi = zAt(t1, 132, 0.52);
    for (const lod of [0, 1, 2]) {
      const hex = new THREE.CylinderGeometry(15.5, 15.5, 0.5, 6);
      hex.rotateY(Math.PI / 6);
      add(onTier(t1, side, 132, zi, hex, 0.45), "paint", {
        color: PAL.insignia,
        lod,
        uv: "keep",
      });
      if (lod < 2)
        add(
          onTier(
            t1,
            side,
            132,
            zi,
            ringSlab(19.5, 16, 6, 0.7, Math.PI / 6),
            0.2,
          ),
          "paint",
          { color: PAL.rust, lod, uv: "keep" },
        );
    }
    // window rows on the upper tiers (discrete at LOD 0, bars at LOD 1)
    for (const [k, y, pitch, skip] of [
      [3, 240, 3.6, 0.15],
      [3, 254, 3.6, 0.3],
      [2, 200, 4.0, 0.5],
    ]) {
      const t = tiers[k];
      const za = zAt(t, y, 0.06);
      const zb = zAt(t, y, 0.92);
      for (let z = za; z <= zb; z += pitch) {
        if (hash(Math.round(z), side + y, 3) < skip) continue;
        add(
          onTier(t, side, y, z, box(0, 0.25, 0, 1.5, 0.5, 1.1), 0.1),
          "windows",
          {
            color: PAL.windowWarm,
            lod: 0,
            uv: "keep",
          },
        );
      }
      if (k === 3)
        add(
          onTier(
            t,
            side,
            y,
            (za + zb) / 2,
            box(0, 0.25, 0, zb - za, 0.5, 1.1),
            0.1,
          ),
          "windows",
          {
            color: PAL.windowWarm,
            lod: 1,
            uv: "keep",
          },
        );
    }
    // rust streaks running down from the ledges and behind the nose trims
    for (const t of tiers) {
      for (let i = 0; i < 5; i++) {
        const len = 5 + rand() * 9;
        const f = 0.12 + rand() * 0.75;
        const yTop = t.y1 - 0.4;
        const z = zAt(t, yTop - len / 2, f);
        add(
          onTier(
            t,
            side,
            yTop - len / 2,
            z,
            box(0, 0.12, 0, 0.7 + rand() * 0.6, 0.25, len),
            0.05,
          ),
          "paint",
          {
            color: new THREE.Color(PAL.rust).multiplyScalar(0.75),
            lod: 0,
            uv: "keep",
          },
        );
      }
      for (let i = 0; i < 3; i++) {
        const y = t.y0 + 8 + rand() * (t.y1 - t.y0 - 16);
        const len = 6 + rand() * 10;
        const z = zAt(t, y, 0.04 + rand() * 0.04);
        add(
          onTier(t, side, y, z, box(0, 0.12, 0, 0.6, 0.25, len), 0.05),
          "paint",
          {
            color: new THREE.Color(PAL.rust).multiplyScalar(0.7),
            lod: 0,
            uv: "keep",
          },
        );
      }
    }
  }
  // sensor domes on the ledges (behind the tier above) and a blister on the head
  const dome = (x, y, z, r, mat, colorHex, lods = [0, 1]) => {
    for (const lod of lods) {
      const seg = lod === 0 ? 14 : 8;
      add(
        new THREE.SphereGeometry(r, seg, Math.ceil(seg * 0.6)).translate(
          x,
          y,
          z,
        ),
        mat,
        { color: colorHex, texel: 1 / 4, lod },
      );
    }
  };
  dome(0, 100, 410, 5.5, "hull", PAL.belly);
  dome(0, 165, 343, 4.2, "dark", PAL.darkLit);
  dome(0, 225, 293.5, 3, "dark", PAL.darkLit, [0]);
  dome(0, head.cy + head.halfH * 0.92, head.z0 + 68, 5, "hull", PAL.belly);
  // comm dish on the third ledge (tilted up and aft) and a small one on the head
  const dish = (x, y, z, r, tilt, lod = 0) => {
    const g = cylY(r, r * 0.3, 1.1, 14);
    g.rotateX(-tilt);
    g.translate(x, y, z);
    add(g, "dark", { color: 0x50555e, texel: 1 / 3, lod });
    add(cylY(0.5, 0.7, 5, 6).translate(x, y - 2.5, z), "dark", {
      color: 0x3a3e46,
      texel: 1 / 2,
      lod,
    });
  };
  dish(0, 230.5, 299, 4.5, -1.1);
  dish(-6, head.cy + head.halfH + 2.5, head.z1 - 20, 3.2, -0.75);
  // antenna spars on the head top and behind it
  const mast = (x, y, z, h, r = 0.5, lods = [0, 1]) => {
    for (const lod of lods)
      add(cylY(r * 0.6, r, h, 5).translate(x, y + h / 2, z), "dark", {
        color: 0x3a3e46,
        texel: 1 / 2,
        lod,
      });
  };
  const top = head.cy + head.halfH;
  mast(0, top - 1, head.z0 + 46, 30, 0.6);
  mast(4, top - 1, head.z0 + 96, 20, 0.45);
  mast(0, 225, 299.5, 16, 0.4, [0]);
  mast(0, 100, 416, 14, 0.4, [0]);
  // chin under the head's overhang, sill boxes under the band, running lights
  add(box(0, head.cy - head.halfH * 0.72, head.z0 + 24, 12, 4, 22), "dark", {
    color: PAL.darkLit,
    texel: 1 / 4,
    lod: 0,
  });
  add(box(0, head.cy - head.halfH * 0.86, head.z0 + 34, 16, 2.6, 8), "dark", {
    color: PAL.darkLit,
    texel: 1 / 4,
    lod: 0,
  });
  for (const side of [-1, 1])
    add(
      box(
        side * (head.halfW + 0.2),
        head.cy - 4.5,
        head.z0 + 64,
        0.5,
        1.2,
        1.2,
      ),
      "windows",
      { color: side < 0 ? 0xff3030 : 0x30ff60, lod: 0, uv: "keep" },
    );
}

// ---------------------------------------------------------------------------
// forward sensor fin and ventral fin: masts, panels, a lit slit each
// ---------------------------------------------------------------------------
function secondaryDetail({ add }) {
  const foreT = FORE_FIN.tiers[0];
  const ventT = VENTRAL_FIN.tiers[0];
  const foreHead = FORE_FIN.head;
  const ventHead = VENTRAL_FIN.head;
  for (const side of [-1, 1]) {
    add(onTier(foreT, side, 72, 128, box(0, 0.4, 0, 18, 0.8, 16)), "dark", {
      color: PAL.darkLit,
      texel: 1 / 4,
      lod: 0,
    });
    add(onTier(foreT, side, 78, 128, box(0, 0.9, 0, 12, 0.3, 0.6)), "windows", {
      color: PAL.windowCool,
      lod: 0,
      uv: "keep",
    });
    add(onTier(ventT, side, -96, 400, box(0, 0.4, 0, 28, 0.8, 20)), "dark", {
      color: PAL.darkLit,
      texel: 1 / 4,
      lod: 0,
    });
    for (let z = 300; z <= 470; z += 5.2) {
      if (hash(Math.round(z), side + 5, 3) < 0.3) continue;
      add(
        onTier(ventT, side, -80, z, box(0, 0.25, 0, 1.4, 0.5, 1.0), 0.1),
        "windows",
        {
          color: PAL.windowCool,
          lod: 0,
          uv: "keep",
        },
      );
    }
  }
  const mast = (x, y, z, h, up = 1, lod = 0) =>
    add(cylY(0.3, 0.5, h, 5).translate(x, y + (up * h) / 2, z), "dark", {
      color: 0x3a3e46,
      texel: 1 / 2,
      lod,
    });
  const foreTop = foreHead.cy + foreHead.halfH;
  mast(0, foreTop - 0.5, foreHead.z0 + 22, 20);
  mast(0, foreTop - 0.5, foreHead.z0 + 44, 12);
  add(
    new THREE.SphereGeometry(3, 12, 8).translate(
      0,
      foreTop - 0.5,
      foreHead.z0 + 34,
    ),
    "dark",
    { color: PAL.darkLit, texel: 1 / 4, lod: 0 },
  );
  mast(0, ventHead.cy - ventHead.halfH + 0.5, ventHead.z0 + 30, 14, -1);
  // dish on the ventral head looking down-aft
  const d = cylY(3.4, 1.2, 1.0, 12);
  d.rotateX(Math.PI - 0.8);
  d.translate(0, ventHead.cy - ventHead.halfH - 2.5, ventHead.z0 + 50);
  add(
    colorize(d, () => rgb(0x50555e)),
    "dark",
    { texel: 1 / 3, lod: 0, keepColor: true },
  );
}
