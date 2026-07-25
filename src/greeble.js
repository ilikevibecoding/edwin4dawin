/**
 * greeble.js — kit-bash primitives. Every function returns a BufferGeometry in
 * local space so ship.js can transform + merge them per material family
 * (which is what keeps the draw call count down).
 */
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32, scaleUV } from './materials.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();

/** Box with per-face UVs scaled to world size (uv unit = `tile` metres). */
export function boxGeo(w, h, d, tile = 1) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (tile > 0) {
    const uv = g.attributes.uv;
    const dims = [
      [d, h], [d, h], // +x -x
      [w, d], [w, d], // +y -y
      [w, h], [w, h], // +z -z
    ];
    for (let f = 0; f < 6; f++) {
      const [su, sv] = dims[f];
      for (let i = f * 4; i < f * 4 + 4; i++) {
        uv.setXY(i, uv.getX(i) * (su / tile), uv.getY(i) * (sv / tile));
      }
    }
    uv.needsUpdate = true;
  }
  return g;
}

export function cylGeo(rTop, rBot, h, seg = 12, tile = 0, openEnded = false) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, openEnded);
  if (tile > 0) scaleUV(g, (Math.PI * 2 * rTop) / tile, h / tile);
  return indexed(g);
}

export function tubeGeo(points, radius, radialSeg = 8, tubularSeg = null) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p))));
  const len = curve.getLength();
  const g = new THREE.TubeGeometry(curve, tubularSeg ?? Math.max(6, Math.round(len * 3)), radius, radialSeg, false);
  return indexed(g);
}

export function torusGeo(r, tube, radial = 8, tubular = 20, arc = Math.PI * 2) {
  return indexed(new THREE.TorusGeometry(r, tube, radial, tubular, arc));
}

export function sphereGeo(r, w = 12, h = 8) {
  return indexed(new THREE.SphereGeometry(r, w, h));
}

export function planeGeo(w, h, tile = 0) {
  const g = new THREE.PlaneGeometry(w, h);
  if (tile > 0) scaleUV(g, w / tile, h / tile);
  return indexed(g);
}

function indexed(g) {
  return g.index ? g : mergeVertices(g);
}

/** Transform helper: returns a *new* geometry moved/rotated/scaled. */
export function xform(geo, { pos = [0, 0, 0], rot = [0, 0, 0], scale = null } = {}) {
  const g = geo.clone();
  _q.setFromEuler(_e.set(rot[0], rot[1], rot[2]));
  _m.compose(_v.set(pos[0], pos[1], pos[2]), _q, new THREE.Vector3(...(scale ?? [1, 1, 1])));
  g.applyMatrix4(_m);
  return g;
}

export function mergeAll(geos) {
  const list = geos.filter(Boolean).map(indexed);
  if (list.length === 0) return null;
  if (list.length === 1) return list[0];
  return mergeGeometries(list, false);
}

/* ------------------------------------------------------------------- pieces */

/** Structural rib: an inverted-U frame hugging a corridor cross-section. */
export function ribGeo(width, height, thickness = 0.09, depth = 0.14) {
  const t = thickness;
  return mergeAll([
    xform(boxGeo(t, height, depth, 0.5), { pos: [-width / 2 + t / 2, height / 2, 0] }),
    xform(boxGeo(t, height, depth, 0.5), { pos: [width / 2 - t / 2, height / 2, 0] }),
    xform(boxGeo(width, t, depth, 0.5), { pos: [0, height - t / 2, 0] }),
    // gussets
    xform(boxGeo(t * 2.4, t * 2.4, depth * 0.9, 0.5), { pos: [-width / 2 + t * 1.6, height - t * 1.6, 0], rot: [0, 0, Math.PI / 4] }),
    xform(boxGeo(t * 2.4, t * 2.4, depth * 0.9, 0.5), { pos: [width / 2 - t * 1.6, height - t * 1.6, 0], rot: [0, 0, Math.PI / 4] }),
  ]);
}

/** Door frame with a chunky lintel; opening is `w` x `h`, wall thickness `d`. */
export function doorFrameGeo(w, h, d = 0.24, jamb = 0.13) {
  const parts = [
    xform(boxGeo(jamb, h + jamb, d, 0.5), { pos: [-w / 2 - jamb / 2, (h + jamb) / 2, 0] }),
    xform(boxGeo(jamb, h + jamb, d, 0.5), { pos: [w / 2 + jamb / 2, (h + jamb) / 2, 0] }),
    xform(boxGeo(w + jamb * 2, jamb, d, 0.5), { pos: [0, h + jamb / 2, 0] }),
    // hinge greebles
    xform(boxGeo(0.07, 0.16, d * 1.2, 0.3), { pos: [-w / 2 - jamb / 2, h * 0.72, 0] }),
    xform(boxGeo(0.07, 0.16, d * 1.2, 0.3), { pos: [-w / 2 - jamb / 2, h * 0.28, 0] }),
    xform(boxGeo(0.14, 0.1, d * 1.25, 0.3), { pos: [w / 2 + jamb / 2, h * 0.55, 0] }),
  ];
  return mergeAll(parts);
}

/** Bundle of conduits running along +Z for `len` metres. */
export function conduitBundleGeo(len, count = 4, radius = 0.045, spread = 0.16, seed = 1) {
  const rnd = mulberry32(seed);
  const parts = [];
  for (let i = 0; i < count; i++) {
    const r = radius * (0.6 + rnd() * 0.9);
    const x = (i - (count - 1) / 2) * (spread / Math.max(1, count - 1)) * 2;
    const y = (rnd() - 0.5) * 0.05;
    parts.push(xform(cylGeo(r, r, len, 8, 0.4), { pos: [x, y, 0], rot: [Math.PI / 2, 0, 0] }));
    // clamps
    const clamps = Math.max(2, Math.round(len / 1.6));
    for (let c = 0; c < clamps; c++) {
      const z = -len / 2 + (len * (c + 0.5)) / clamps;
      parts.push(xform(cylGeo(r * 1.5, r * 1.5, 0.05, 8, 0.2), { pos: [x, y, z], rot: [Math.PI / 2, 0, 0] }));
    }
  }
  return mergeAll(parts);
}

/** Big pipe with elbows + flanges along a polyline. */
export function pipeRunGeo(points, radius = 0.07, flangeEvery = 2) {
  const parts = [tubeGeo(points, radius, 10)];
  for (let i = 0; i < points.length; i += flangeEvery) {
    const p = points[i];
    parts.push(xform(cylGeo(radius * 1.7, radius * 1.7, radius * 0.9, 10, 0.2), {
      pos: [p[0], p[1], p[2]], rot: [Math.PI / 2, 0, 0],
    }));
  }
  return mergeAll(parts);
}

/** Vent grille: slatted recess. */
export function ventGeo(w, h, slats = 6, depth = 0.05) {
  const parts = [xform(boxGeo(w, h, depth * 0.6, 0.4), { pos: [0, 0, -depth * 0.5] })];
  const sh = h / slats;
  for (let i = 0; i < slats; i++) {
    parts.push(xform(boxGeo(w * 0.92, sh * 0.5, depth, 0.3), {
      pos: [0, -h / 2 + sh * (i + 0.5), 0], rot: [0.35, 0, 0],
    }));
  }
  return mergeAll(parts);
}

/**
 * Machinery panel: a backplate divided into a grid, each cell filled with a
 * plausible mechanical module (recessed bay, finned heatsink, valve, gauge,
 * breaker row, junction block...). Grid alignment is what makes it read as
 * built hardware rather than random boxes glued to a wall. Faces +Z.
 */
export function greebleClusterGeo(seed, w, h, density = 1) {
  const rnd = mulberry32(seed);
  const parts = [];
  const plate = 0.022;
  parts.push(xform(boxGeo(w, h, plate, 0.4), { pos: [0, 0, plate / 2] }));
  // plate lip
  parts.push(xform(boxGeo(w, 0.014, plate * 1.6, 0.2), { pos: [0, h / 2 - 0.007, plate * 0.8] }));
  parts.push(xform(boxGeo(w, 0.014, plate * 1.6, 0.2), { pos: [0, -h / 2 + 0.007, plate * 0.8] }));

  const cols = Math.max(2, Math.round(w / (0.2 / Math.min(1.6, density))));
  const rows = Math.max(2, Math.round(h / (0.2 / Math.min(1.6, density))));
  const cw = w / cols, ch = h / rows;
  const used = new Set();

  for (let ry = 0; ry < rows; ry++) {
    for (let rx = 0; rx < cols; rx++) {
      if (used.has(ry * cols + rx)) continue;
      // occasionally span two cells horizontally
      let spanX = 1;
      if (rx < cols - 1 && rnd() < 0.28 && !used.has(ry * cols + rx + 1)) { spanX = 2; used.add(ry * cols + rx + 1); }
      const cx = (rx + spanX / 2) * cw - w / 2;
      const cy = (ry + 0.5) * ch - h / 2;
      const bw = cw * spanX * 0.84, bh = ch * 0.8;
      const kind = rnd();

      if (kind < 0.14) continue;                                   // bare plate
      if (kind < 0.34) {
        // raised module with a bevel cap and a bolt pair
        const d = 0.018 + rnd() * 0.045;
        parts.push(xform(boxGeo(bw, bh, d, 0.25), { pos: [cx, cy, plate + d / 2] }));
        parts.push(xform(boxGeo(bw * 0.82, bh * 0.8, d * 0.35, 0.25), { pos: [cx, cy, plate + d + d * 0.16] }));
        for (const s of [-1, 1]) {
          parts.push(xform(cylGeo(0.008, 0.009, 0.012, 6, 0.1), { pos: [cx + s * bw * 0.42, cy + bh * 0.36, plate + d], rot: [Math.PI / 2, 0, 0] }));
        }
      } else if (kind < 0.5) {
        // recessed bay with fins
        parts.push(xform(boxGeo(bw, bh, 0.012, 0.25), { pos: [cx, cy, plate * 0.4] }));
        const fins = 3 + Math.floor(rnd() * 4);
        for (let f = 0; f < fins; f++) {
          parts.push(xform(boxGeo(bw * 0.88, bh / (fins * 2.1), 0.03 + rnd() * 0.02, 0.2), {
            pos: [cx, cy - bh * 0.36 + (bh * 0.72 * f) / Math.max(1, fins - 1), plate + 0.014],
          }));
        }
      } else if (kind < 0.62) {
        // valve / handwheel
        const r = Math.min(bw, bh) * 0.34;
        parts.push(xform(cylGeo(r * 1.15, r * 1.15, 0.03, 12, 0.2), { pos: [cx, cy, plate + 0.015], rot: [Math.PI / 2, 0, 0] }));
        parts.push(xform(torusGeo(r, r * 0.16, 6, 14), { pos: [cx, cy, plate + 0.05] }));
        parts.push(xform(cylGeo(0.012, 0.012, 0.05, 8, 0.1), { pos: [cx, cy, plate + 0.03], rot: [Math.PI / 2, 0, 0] }));
        for (let s = 0; s < 3; s++) {
          const a = (s / 3) * Math.PI * 2 + rnd();
          parts.push(xform(boxGeo(r * 0.9, 0.012, 0.012, 0.1), { pos: [cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5, plate + 0.05], rot: [0, 0, a] }));
        }
      } else if (kind < 0.72) {
        // gauge cluster
        const r = Math.min(bw, bh) * 0.3;
        parts.push(xform(cylGeo(r, r, 0.026, 14, 0.2), { pos: [cx, cy, plate + 0.013], rot: [Math.PI / 2, 0, 0] }));
        parts.push(xform(torusGeo(r * 1.05, r * 0.1, 6, 16), { pos: [cx, cy, plate + 0.026] }));
        parts.push(xform(boxGeo(r * 0.9, 0.008, 0.008, 0.1), { pos: [cx, cy, plate + 0.03], rot: [0, 0, 0.7] }));
      } else if (kind < 0.84) {
        // breaker / switch row
        const n = 3 + Math.floor(rnd() * 3);
        parts.push(xform(boxGeo(bw, bh * 0.7, 0.016, 0.25), { pos: [cx, cy, plate + 0.008] }));
        for (let i = 0; i < n; i++) {
          const sx2 = cx - bw * 0.38 + (bw * 0.76 * i) / Math.max(1, n - 1);
          parts.push(xform(boxGeo(bw * 0.1, bh * 0.34, 0.022, 0.1), { pos: [sx2, cy, plate + 0.026], rot: [(rnd() - 0.5) * 0.5, 0, 0] }));
        }
      } else if (kind < 0.93) {
        // junction block with cable stubs
        const d = 0.03 + rnd() * 0.03;
        parts.push(xform(boxGeo(bw * 0.72, bh * 0.62, d, 0.25), { pos: [cx, cy, plate + d / 2] }));
        for (let i = 0; i < 3; i++) {
          const px = cx - bw * 0.2 + i * bw * 0.2;
          parts.push(xform(cylGeo(0.011, 0.011, 0.05, 6, 0.1), { pos: [px, cy - bh * 0.34, plate + d * 0.6], rot: [0.7, 0, 0] }));
        }
      } else {
        // pipe stub crossing the cell
        const r = 0.016 + rnd() * 0.014;
        const horiz = rnd() < 0.5;
        parts.push(xform(cylGeo(r, r, horiz ? bw : bh, 8, 0.2), {
          pos: [cx, cy, plate + r + 0.008], rot: horiz ? [0, 0, Math.PI / 2] : [0, 0, 0],
        }));
        for (const s of [-1, 1]) {
          parts.push(xform(cylGeo(r * 1.6, r * 1.6, 0.016, 8, 0.1), {
            pos: [cx + (horiz ? (s * bw) / 2 : 0), cy + (horiz ? 0 : (s * bh) / 2), plate + r + 0.008],
            rot: horiz ? [0, 0, Math.PI / 2] : [0, 0, 0],
          }));
        }
      }
    }
  }
  return mergeAll(parts);
}

/** Box with rounded edges — soft silhouettes for mattresses, pillows, cushions. */
export function roundedBoxGeo(w, h, d, r = 0.06, seg = 8) {
  const iw = Math.max(0.001, w - r * 2);
  const ih = Math.max(0.001, h - r * 2);
  const id = Math.max(0.001, d - r * 2);
  const parts = [
    xform(boxGeo(iw, h, id, 0.5), {}),
    xform(boxGeo(w, ih, id, 0.5), {}),
    xform(boxGeo(iw, ih, d, 0.5), {}),
  ];
  // edge cylinders along X, Y, Z
  for (const sy of [-1, 1]) {
    for (const sz of [-1, 1]) {
      parts.push(xform(cylGeo(r, r, iw, seg, 0.3), { pos: [0, (sy * ih) / 2, (sz * id) / 2], rot: [0, 0, Math.PI / 2] }));
    }
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      parts.push(xform(cylGeo(r, r, ih, seg, 0.3), { pos: [(sx * iw) / 2, 0, (sz * id) / 2] }));
    }
  }
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      parts.push(xform(cylGeo(r, r, id, seg, 0.3), { pos: [(sx * iw) / 2, (sy * ih) / 2, 0], rot: [Math.PI / 2, 0, 0] }));
    }
  }
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        parts.push(xform(sphereGeo(r, seg, Math.max(4, seg / 2)), { pos: [(sx * iw) / 2, (sy * ih) / 2, (sz * id) / 2] }));
      }
    }
  }
  return mergeAll(parts);
}

/**
 * Soft cloth laid over something: a displaced grid with sag, fold ridges and
 * drooping edges, closed off with a skirt so it is not paper-thin. This is what
 * makes a bunk read as a made bed — stacked boxes read as planks no matter how
 * many you use.
 *
 * Origin at the centre of the top surface; +Z is the long axis by convention.
 */
export function softClothGeo({
  w = 1.0, d = 2.0, nx = 14, nz = 26, seed = 1,
  amp = 0.022,          // gentle undulation of the surface
  folds = [],           // [{ z, h, sigma, x, xs }] ridge definitions in local units
  edgeDrop = 0.06,      // how far the perimeter sags below the centre
  skirt = 0.16,         // depth of the closing skirt
  headBulge = 0,        // extra height near -Z (a body/pillow under the cloth)
  tile = 0.6,
} = {}) {
  const rnd = mulberry32(seed);
  const ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];

  const height = (x, z) => {
    const u = x / (w / 2);          // -1..1
    const v = z / (d / 2);
    let h = 0;
    // broad undulation
    h += amp * Math.sin(2.6 * x + ph[0]) * Math.cos(1.9 * z + ph[1]);
    h += amp * 0.6 * Math.sin(3.4 * z + ph[2]);
    // fold ridges
    for (const f of folds) {
      const dz = (z - f.z) / (f.sigma ?? 0.1);
      let g = Math.exp(-dz * dz);
      if (f.x !== undefined) {
        const dx = (x - f.x) / (f.xs ?? 0.35);
        g *= Math.exp(-dx * dx);
      }
      h += (f.h ?? 0.05) * g;
    }
    // a body-shaped rise toward the head end
    if (headBulge) h += headBulge * Math.exp(-Math.pow((v + 0.55) / 0.45, 2));
    // perimeter droop: fabric falls away at the edges
    const edge = Math.max(Math.abs(u), Math.abs(v));
    const fall = Math.pow(Math.max(0, (edge - 0.72) / 0.28), 2);
    h -= edgeDrop * fall;
    return h;
  };

  const pos = [];
  const uv = [];
  const idx = [];
  const at = (i, j) => j * (nx + 1) + i;
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = -w / 2 + (i / nx) * w;
      const z = -d / 2 + (j / nz) * d;
      pos.push(x, height(x, z), z);
      uv.push(((x + w / 2) / w) * (w / tile), ((z + d / 2) / d) * (d / tile));
    }
  }
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), e = at(i, j + 1);
      idx.push(a, e, c, a, c, b);
    }
  }
  // skirt: walk the boundary, drop a wall down from it
  const ring = [];
  for (let i = 0; i <= nx; i++) ring.push(at(i, 0));
  for (let j = 1; j <= nz; j++) ring.push(at(nx, j));
  for (let i = nx - 1; i >= 0; i--) ring.push(at(i, nz));
  for (let j = nz - 1; j >= 1; j--) ring.push(at(0, j));
  const base = pos.length / 3;
  for (let k = 0; k < ring.length; k++) {
    const p = ring[k] * 3;
    pos.push(pos[p], pos[p + 1] - skirt, pos[p + 2]);
    uv.push(k / tile, 0);
  }
  for (let k = 0; k < ring.length; k++) {
    const k2 = (k + 1) % ring.length;
    const t0 = ring[k], t1 = ring[k2];
    const b0 = base + k, b1 = base + k2;
    idx.push(t0, b0, b1, t0, b1, t1);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * Hanging cloth: one continuous closed shell, swept along X, with pleats that
 * deepen toward the free hem and a hem that sags in the middle.
 *
 * `drapeGeo` below builds a *row of separate slabs*, which at arm's length reads
 * as three pieces of cardboard rather than a towel. This is the replacement for
 * anything the player can walk up to: a towel folded over a rail, a shower
 * curtain on a track, a jacket on a hook.
 *
 * Local frame: the rail axis runs along X through y = 0, the cloth hangs down -Y
 * and the front face looks toward +Z. Set `backH: 0` for a single panel hanging
 * from a track (no fold-over).
 */
export function hangClothGeo({
  w = 0.34,            // width along the rail
  h = 0.5,             // drop of the front panel
  backH = null,        // drop of the back panel (null = same as front, 0 = none)
  railR = 0.022,       // radius the cloth wraps over at the top
  thickness = 0.012,
  nx = 18,             // stations across the width
  pleats = 3.0,        // pleat cycles across the width
  amp = 0.03,          // pleat depth at the hem
  topAmp = 0.25,       // pleat depth at the rail, as a fraction of `amp`
  hemSag = 0.02,       // how far the middle of the hem hangs below the corners
  seed = 1,
  tile = 0.5,
} = {}) {
  const rnd = mulberry32(seed);
  const ph0 = rnd() * 6.283, ph1 = rnd() * 6.283;
  const hb = backH === null ? h * 0.82 : backH;

  // ---- profile in the YZ plane: {y, z, ny, nz, free, s}
  // `free` is 0 where the cloth is gathered over the rail and 1 at a free hem.
  const prof = [];
  const push = (y, z, ny, nz, free) => {
    const p = prof[prof.length - 1];
    const s = p ? p.s + Math.hypot(y - p.y, z - p.z) : 0;
    prof.push({ y, z, ny, nz, free, s });
  };
  const NP = 9;                            // segments per flat panel
  if (railR > 0 && hb > 0) {
    for (let k = 0; k <= NP; k++) push(-h + (h * k) / NP, railR, 0, 1, 1 - k / NP);
    for (let k = 1; k <= 6; k++) {
      const a = (Math.PI * k) / 6;
      push(Math.sin(a) * railR, Math.cos(a) * railR, Math.sin(a), Math.cos(a), 0);
    }
    for (let k = 1; k <= NP; k++) push(-(hb * k) / NP, -railR, 0, -1, k / NP);
  } else {
    // single panel on a track: a slight cylindrical lead-in at the top so the
    // gathered edge is not a hard corner
    for (let k = 0; k <= NP + 2; k++) {
      const u = k / (NP + 2);
      push(-h * (1 - u), 0, 0, 1, 1 - u);
    }
  }

  const half = thickness / 2;
  const nProf = prof.length;
  const pos = [], uv = [], idx = [];
  const ring = nProf * 2;                  // points per cross-section

  for (let i = 0; i <= nx; i++) {
    const u = i / nx;
    const x = -w / 2 + u * w;
    const wave = Math.sin(u * Math.PI * 2 * pleats + ph0) * 0.72
      + Math.sin(u * Math.PI * 2 * pleats * 0.5 + ph1) * 0.28;
    const sag = -hemSag * Math.sin(u * Math.PI);
    for (let side = 0; side < 2; side++) {
      const o = side === 0 ? half : -half;
      for (let k = 0; k < nProf; k++) {
        const p = side === 0 ? prof[k] : prof[nProf - 1 - k];
        const d = amp * (topAmp + (1 - topAmp) * p.free) * wave;
        pos.push(x, p.y + p.ny * (o + d) + sag * p.free, p.z + p.nz * (o + d));
        uv.push((x + w / 2) / tile, p.s / tile);
      }
    }
  }
  for (let i = 0; i < nx; i++) {
    for (let k = 0; k < ring; k++) {
      const k2 = (k + 1) % ring;
      const a = i * ring + k, b = i * ring + k2;
      const c = (i + 1) * ring + k2, e = (i + 1) * ring + k;
      idx.push(a, b, c, a, c, e);
    }
  }
  // side caps: stitch the two offset sheets together at x = ±w/2
  for (const i of [0, nx]) {
    const base = i * ring;
    for (let k = 0; k < nProf - 1; k++) {
      const a = base + k, b = base + k + 1;
      const c = base + ring - 2 - k, e = base + ring - 1 - k;
      if (i === 0) idx.push(a, e, c, a, c, b);
      else idx.push(a, b, c, a, c, e);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Hanging fabric with folds (curtain, towel, jacket). Faces +Z, hangs down from y=0. */
export function drapeGeo(w, h, folds = 6, depth = 0.035, seed = 1) {
  const rnd = mulberry32(seed);
  const parts = [];
  const fw = w / folds;
  for (let i = 0; i < folds; i++) {
    const x = -w / 2 + fw * (i + 0.5);
    const z = Math.sin((i / folds) * Math.PI * 3 + rnd()) * depth;
    parts.push(xform(boxGeo(fw * 1.05, h, 0.018, 0.4), { pos: [x, -h / 2, z], rot: [0, 0, (rnd() - 0.5) * 0.02] }));
  }
  return mergeAll(parts);
}

/** Row of bolts along X. */
export function boltRowGeo(len, count, r = 0.016, h = 0.014) {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const x = -len / 2 + (len * (i + 0.5)) / count;
    parts.push(xform(cylGeo(r, r * 1.15, h, 6, 0.1), { pos: [x, 0, 0], rot: [Math.PI / 2, 0, 0] }));
  }
  return mergeAll(parts);
}

/** Drooping cable between two points. */
export function cableGeo(a, b, sag = 0.25, radius = 0.012) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const pts = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const p = A.clone().lerp(B, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    pts.push(p);
  }
  return tubeGeo(pts, radius, 6);
}

/** Storage crate with a lid lip and corner blocks. */
export function crateGeo(w, h, d, seed = 1) {
  const rnd = mulberry32(seed);
  const parts = [
    xform(boxGeo(w, h, d, 0.5), { pos: [0, h / 2, 0] }),
    xform(boxGeo(w * 1.03, h * 0.09, d * 1.03, 0.4), { pos: [0, h * 0.96, 0] }),
    xform(boxGeo(w * 0.55, h * 0.06, d * 0.06, 0.3), { pos: [0, h * 0.55, d / 2] }),
  ];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      parts.push(xform(boxGeo(w * 0.1, h, d * 0.1, 0.4), { pos: [(sx * w) / 2, h / 2, (sz * d) / 2] }));
    }
  }
  if (rnd() > 0.4) parts.push(xform(cylGeo(0.03, 0.03, 0.04, 8, 0.2), { pos: [w * 0.3, h * 0.7, d / 2], rot: [Math.PI / 2, 0, 0] }));
  return mergeAll(parts);
}

/** Handrail: a bar with two stanchions. */
export function handrailGeo(len, h = 0.06, r = 0.022) {
  return mergeAll([
    xform(cylGeo(r, r, len, 8, 0.3), { pos: [0, 0, 0], rot: [0, 0, Math.PI / 2] }),
    xform(cylGeo(r * 0.8, r * 0.8, h, 6, 0.2), { pos: [-len / 2 + r, -h / 2, 0] }),
    xform(cylGeo(r * 0.8, r * 0.8, h, 6, 0.2), { pos: [len / 2 - r, -h / 2, 0] }),
  ]);
}

/** Recessed light housing (the dark bezel around an emissive strip). */
export function lightHousingGeo(w, h, d = 0.07) {
  return mergeAll([
    xform(boxGeo(w, h, d, 0.3), { pos: [0, 0, -d / 2] }),
    xform(boxGeo(w + 0.05, 0.03, d * 0.7, 0.3), { pos: [0, h / 2 + 0.015, -d * 0.3] }),
    xform(boxGeo(w + 0.05, 0.03, d * 0.7, 0.3), { pos: [0, -h / 2 - 0.015, -d * 0.3] }),
  ]);
}

/** Wall-mounted equipment box with a sloped face. */
export function equipBoxGeo(w, h, d, seed = 1) {
  const parts = [
    xform(boxGeo(w, h, d, 0.4), { pos: [0, 0, d / 2] }),
    xform(boxGeo(w * 0.9, h * 0.12, d * 0.2, 0.3), { pos: [0, h * 0.32, d * 1.02] }),
  ];
  parts.push(xform(greebleClusterGeo(seed, w * 0.8, h * 0.5, 1.2), { pos: [0, -h * 0.12, d] }));
  return mergeAll(parts);
}
