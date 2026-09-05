// Surface detail shared by the Separatist Munificent and Recusant: recessed window slots (a raised dark
// rim, a dark backing and lit strips inside), hatches at two scales, ribbed panels, raised plates with
// darker lips, braced sensor masts with concave dishes and feed horns, antenna clusters and scorch
// rings. Every helper takes the model's add(geo, mat, opts) and a LOD and places geometry at a surface
// point c with outward normal n and an in-surface direction `along`.
import * as THREE from "three";
import { bar, dishGeo, discAt, frameAt, mix, quadAt } from "./munificentGeo.js";

const _n = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _p = new THREE.Vector3();

function frame(n, along) {
  _n.set(...n).normalize();
  _a.set(...along);
  _a.addScaledVector(_n, -_a.dot(_n)).normalize();
  _b.crossVectors(_n, _a).normalize();
}
const at = (c, da, db, dn) =>
  _p
    .set(...c)
    .addScaledVector(_a, da)
    .addScaledVector(_b, db)
    .addScaledVector(_n, dn)
    .toArray();

/**
 * Recessed window slot: rim (dark, 0.5 m proud) around a dark backing with `panes` lit strips inside.
 * LOD 0 builds the rim; LOD 1 keeps the backing + one strip; LOD 2 nothing.
 */
export function slotWindow(
  add,
  { c, n, along, len, h = 2.2, lod = 0, panes = 3, glow, rim, back = 0x2a2622 },
) {
  if (lod > 1) return;
  const border = 0.55;
  if (lod === 0)
    add(frameAt(c, n, along, len, h, border, 0.5, 0.06), "dark", {
      color: rim,
      texel: 1 / 3,
      lod,
    });
  const il = len - 2 * border;
  const ih = h - 2 * border;
  add(quadAt(c, n, along, il + 0.02, ih + 0.02, 0.05), "dark", {
    color: back,
    texel: 1 / 3,
    lod,
  });
  if (lod === 0 && panes > 1) {
    frame(n, along);
    const gap = 0.6;
    const pl = (il - gap * (panes - 1)) / panes;
    for (let i = 0; i < panes; i++) {
      const da = -il / 2 + pl / 2 + i * (pl + gap);
      add(
        quadAt(at(c, da, 0, 0), n, along, pl - 0.3, ih - 0.5, 0.1),
        "windows",
        { color: glow, lod, uv: "keep" },
      );
    }
  } else
    add(quadAt(c, n, along, il - 0.4, ih - 0.5, 0.1), "windows", {
      color: glow,
      lod,
      uv: "keep",
    });
}

/** Row of slots along `along` from c, `count` slots of `len` with `gap` between. */
export function slotRow(add, opts) {
  const { c, n, along, count, len, gap = 4 } = opts;
  frame(n, along);
  const total = count * len + (count - 1) * gap;
  for (let i = 0; i < count; i++) {
    const da = -total / 2 + len / 2 + i * (len + gap);
    slotWindow(add, { ...opts, c: at(c, da, 0, 0) });
  }
}

/**
 * Hatch: raised lid over a darker rim plate; large hatches get a cross seam and a hinge bar at LOD 0.
 */
export function hatch(
  add,
  { c, n, along, w, h, lod = 0, color, rimColor, big = false },
) {
  frame(n, along);
  const box = (da, db, dn, sa, sb, sn) => {
    const g = new THREE.BoxGeometry(sa, sn, sb);
    const q = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(_a, _n, _b.clone().negate()),
    );
    g.applyQuaternion(q);
    const p = at(c, da, db, dn);
    g.translate(p[0], p[1], p[2]);
    return g;
  };
  add(box(0, 0, 0.12, w + 1.0, h + 1.0, 0.24), "dark", {
    color: rimColor,
    texel: 1 / 3,
    lod,
  });
  add(box(0, 0, 0.45, w, h, 0.42), "hull", { color, texel: 1 / 4, lod });
  if (big && lod === 0) {
    add(box(0, 0, 0.7, 0.5, h - 0.6, 0.12), "dark", {
      color: rimColor,
      texel: 1 / 3,
      lod,
    });
    add(box(0, 0, 0.7, w - 0.6, 0.5, 0.12), "dark", {
      color: rimColor,
      texel: 1 / 3,
      lod,
    });
  }
}

/** Ribbed panel: `nRibs` parallel ribs across `wid`, running `len` along `along`, 0.55 m proud. */
export function ribbedPanel(
  add,
  { c, n, along, len, wid, nRibs = 4, lod = 0, color, ribW = 1.3 },
) {
  frame(n, along);
  const q = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(_a, _n, _b.clone().negate()),
  );
  for (let i = 0; i < nRibs; i++) {
    const db = -wid / 2 + (wid * (i + 0.5)) / nRibs;
    const g = new THREE.BoxGeometry(len, 0.55, ribW);
    g.applyQuaternion(q);
    const p = at(c, 0, db, 0.27);
    g.translate(p[0], p[1], p[2]);
    add(g, "hull", { color, texel: 1 / 4, lod });
  }
}

/** Raised plate (0.5 m) with a darker, slightly larger lip under it (the "raised edge"). */
export function lippedPlate(
  add,
  { c, n, along, len, wid, lod = 0, color, lipColor, lift = 0 },
) {
  frame(n, along);
  const q = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(_a, _n, _b.clone().negate()),
  );
  const mk = (sa, sb, sn, dn) => {
    const g = new THREE.BoxGeometry(sa, sn, sb);
    g.applyQuaternion(q);
    const p = at(c, 0, 0, dn);
    g.translate(p[0], p[1], p[2]);
    return g;
  };
  add(mk(len + 1.6, wid + 1.6, 0.28, lift + 0.14), "dark", {
    color: lipColor,
    texel: 1 / 4,
    lod,
  });
  add(mk(len, wid, 0.5, lift + 0.42), "hull", { color, texel: 1 / 12, lod });
}

/**
 * Braced sensor mast with a concave dish: mast from `base` along `up` by `height`, two diagonal braces,
 * a dish of radius r aimed along `aim` at the top with a feed horn on three struts (LOD 0).
 */
export function dishMast(
  add,
  { base, up, height, aim, r, lod = 0, mast, dish, braceSpan = 0.5 },
) {
  const u = new THREE.Vector3(...up).normalize();
  const top = new THREE.Vector3(...base).addScaledVector(u, height).toArray();
  add(bar(base, top, 1.2, 1.2), "dark", { color: mast, texel: 1 / 3, lod });
  const side = new THREE.Vector3()
    .crossVectors(u, new THREE.Vector3(...aim))
    .normalize();
  if (side.lengthSq() < 0.5) side.set(1, 0, 0);
  if (lod === 0)
    for (const s of [-1, 1]) {
      const foot = new THREE.Vector3(...base)
        .addScaledVector(side, s * height * braceSpan)
        .toArray();
      const knee = new THREE.Vector3(...base)
        .addScaledVector(u, height * 0.62)
        .toArray();
      add(bar(foot, knee, 0.6, 0.6), "dark", {
        color: mast,
        texel: 1 / 3,
        lod,
      });
    }
  const depth = r * 0.28;
  const focus = (r * r) / (4 * depth);
  const seg = lod === 0 ? 16 : 10;
  const rings = lod === 0 ? 4 : 2;
  const aimV = new THREE.Vector3(...aim).normalize();
  const centre = new THREE.Vector3(...top).addScaledVector(aimV, 1.0).toArray();
  add(dishGeo(r, depth, seg, rings, aim, centre), "hull", {
    color: dish,
    texel: 1 / 4,
    lod,
  });
  if (lod === 0) {
    const fp = new THREE.Vector3(...centre)
      .addScaledVector(aimV, focus)
      .toArray();
    const horn = new THREE.CylinderGeometry(r * 0.08, r * 0.14, r * 0.3, 6);
    horn.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        aimV,
      ),
    );
    horn.translate(fp[0], fp[1], fp[2]);
    add(horn, "dark", { color: mast, texel: 1 / 3, lod });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      const rimPt = new THREE.Vector3(...centre)
        .addScaledVector(aimV, depth)
        .addScaledVector(side, Math.cos(a) * r)
        .addScaledVector(
          new THREE.Vector3().crossVectors(aimV, side),
          Math.sin(a) * r,
        )
        .toArray();
      add(bar(rimPt, fp, 0.3, 0.3), "dark", { color: mast, texel: 1 / 3, lod });
    }
  }
}

/** Antenna cluster: three thin masts of different heights, a box and a whip on a base plate. */
export function antennaCluster(
  add,
  { base, up, scale = 1, lod = 0, mast, plate },
) {
  const u = new THREE.Vector3(...up).normalize();
  const side = new THREE.Vector3()
    .crossVectors(
      u,
      Math.abs(u.z) < 0.9
        ? new THREE.Vector3(0, 0, 1)
        : new THREE.Vector3(1, 0, 0),
    )
    .normalize();
  const fwd = new THREE.Vector3().crossVectors(side, u).normalize();
  const P = (ds, df, dh) =>
    new THREE.Vector3(...base)
      .addScaledVector(side, ds * scale)
      .addScaledVector(fwd, df * scale)
      .addScaledVector(u, dh * scale)
      .toArray();
  const pb = new THREE.BoxGeometry(9 * scale, 1.2 * scale, 7 * scale);
  pb.applyQuaternion(
    new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(side, u, fwd),
    ),
  );
  const pc = P(0, 0, 0.6);
  pb.translate(pc[0], pc[1], pc[2]);
  add(pb, "hull", { color: plate, texel: 1 / 4, lod });
  const masts =
    lod === 0
      ? [
          [-3, -2, 22, 0.6],
          [1.5, 1.5, 34, 0.7],
          [3.5, -2.2, 15, 0.5],
        ]
      : [[1.5, 1.5, 34, 0.9]];
  for (const [ds, df, h, w] of masts) {
    add(bar(P(ds, df, 1), P(ds, df, h), w, w), "dark", {
      color: mast,
      texel: 1 / 3,
      lod,
    });
    if (lod === 0)
      add(
        bar(P(ds - 2.2, df, h * 0.8), P(ds + 2.2, df, h * 0.8), 0.35, 0.35),
        "dark",
        { color: mast, texel: 1 / 3, lod },
      );
  }
  if (lod === 0) {
    const bx = new THREE.BoxGeometry(2.6 * scale, 2.2 * scale, 3 * scale);
    const c = P(-2.6, 2.2, 2.2);
    bx.translate(c[0], c[1], c[2]);
    add(bx, "dark", { color: mast, texel: 1 / 3, lod });
  }
}

/** Scorch ring: dark centre fading to the base tint at the rim; base(x, y, z, out) writes the hull tint. */
export function scorchRing(
  add,
  { c, n, r, base, soot, strength = 0.85, lod = 0, seg = 16 },
) {
  add(discAt(c, n, r, seg, 0.32), "hull", {
    texel: 1 / 12,
    lod,
    tint: (x, y, z, o, across) => {
      base(x, y, z, o);
      // dark core, a lighter heat ring, then the hull
      const k =
        across < 0.55
          ? strength
          : strength * (1 - (across - 0.55) / 0.45) ** 1.3;
      mix(o, soot, k, o);
    },
  });
}
