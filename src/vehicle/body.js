import * as THREE from 'three';
import { BufferGeometryUtils, Kit, bolt, profile, rbox, rivet, tube } from '../lib/geo.js';
import { SPEC as S } from './spec.js';

// ---------------------------------------------------------------------------
// The hull: frame, floor, front clip, cab, bed. Boxy 4x4 pickup in the Jeep
// Gladiator / Bronco neighbourhood.
//
// The flanks are four separately stamped panels a side (fender, both doors,
// bedside) with a real shut line between them and dark structure behind, since
// a seam painted onto one slab never reads. Wheel openings are cut into the
// panel outline rather than covered by a tube, and the flares are swept
// mouldings with a rolled lip.
// ---------------------------------------------------------------------------

const HW = S.bodyHalfWidth;
const SKIN = 0.05; // flank panel core thickness; the bevel adds ~12 mm a side
const BEVEL = 0.012;
const SKIN_X = HW - (SKIN * 0.5 + BEVEL); // centre plane of the flank skins
const SILL_Y = 0.6; // bottom edge of the flank panels
const ARCH_R = 0.57;

// front fascia planes
const FZ = 2.21; // centre of the fascia members (front face lands on 2.26)
const FIN_Z = 2.13;
const CAV_Z = 2.06;
const AP_TOP = 1.255;
const AP_BOT = 0.985;
const GRILLE_HALF = 0.497;
const LAMP_X = 0.724;
const LAMP_W = 0.322;
const LAMP_Y = (AP_TOP + AP_BOT) * 0.5;

// Texel density per material. Every panel, bracket and bolt then shares one
// object-space projection, so a 40 mm hinge and a 2 m door get the same size of
// grain instead of each being handed the whole texture.
const UV_SCALE = {
  mesh: 12,
  rubber: 2,
  alu: 1.6,
  steel: 1.3,
  steelDark: 1.3,
  chrome: 1.3,
  glass: 'keep',
  glassDark: 'keep',
  reflector: 'keep',
  lensClear: 'keep',
  lensRibbed: 'keep',
  headlight: 'keep',
  taillight: 'keep',
  amber: 'keep',
  reflectorRed: 'keep',
  decalName: 'keep',
  decalBadge: 'keep',
  decalNumber: 'keep',
};

const KEEP_ATTRS = ['position', 'normal', 'uv'];

// Lamp internals sit at the bottom of a deep bezel, so the shadow map throws a
// hard-edged black half across every reflector. Taking them out of the shadow
// pass stands in for the forward bounce a real reflector does, and it is what
// keeps a lamp reading as a lamp when the nose is facing away from the sun.
const UNSHADOWED = new Set(['reflector', 'headlight', 'lensClear', 'lensRibbed', 'amber', 'taillight']);

function flipWinding(geo) {
  if (geo.index) {
    const a = geo.index.array;
    for (let i = 0; i < a.length; i += 3) {
      const t = a[i];
      a[i] = a[i + 2];
      a[i + 2] = t;
    }
    geo.index.needsUpdate = true;
    return geo;
  }
  for (const attr of Object.values(geo.attributes)) {
    const arr = attr.array;
    const n = attr.itemSize;
    for (let i = 0; i + 2 < attr.count; i += 3) {
      for (let c = 0; c < n; c++) {
        const i0 = i * n + c;
        const i2 = (i + 2) * n + c;
        const t = arr[i0];
        arr[i0] = arr[i2];
        arr[i2] = t;
      }
    }
    attr.needsUpdate = true;
  }
  return geo;
}

function boxProjectUV(geo, scale) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const nz = Math.abs(nor.getZ(i));
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    let u;
    let v;
    if (nx >= ny && nx >= nz) {
      u = z;
      v = y;
    } else if (ny >= nx && ny >= nz) {
      u = x;
      v = z;
    } else {
      u = x;
      v = y;
    }
    uv.setXY(i, u * scale, v * scale);
  }
  uv.needsUpdate = true;
}

/**
 * Kit variant for the body. Two differences from the shared one, both about
 * shading rather than geometry:
 *
 *  - it keeps each primitive's own normals instead of recomputing them on the
 *    merged, de-indexed buffer, so rounded-box chamfers and turned cylinders
 *    keep their smooth highlight roll instead of facetting;
 *  - `addMirrored` transforms by a negative scale, which reverses triangle
 *    winding. Left alone that back-faces the mirrored half of every panel, so
 *    the winding is put back here.
 */
class BodyKit extends Kit {
  add(key, geo, xform) {
    super.add(key, geo, xform);
    const s = xform && xform.scale;
    const det = Array.isArray(s) ? s[0] * s[1] * s[2] : typeof s === 'number' ? s * s * s : 1;
    if (det < 0) {
      const list = this.buckets.get(key);
      flipWinding(list[list.length - 1]);
    }
    return this;
  }

  build(materials, { castShadow = true, receiveShadow = true, group = new THREE.Group() } = {}) {
    group.name = this.name;
    for (const [key, list] of this.buckets) {
      const mat = materials[key];
      if (!mat) {
        console.warn(`[BodyKit] missing material "${key}"`);
        continue;
      }
      const geos = list.map((g) => {
        const c = g.clone();
        if (!c.attributes.normal) c.computeVertexNormals();
        if (!c.attributes.uv) {
          const count = c.attributes.position.count;
          c.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
        }
        for (const name of Object.keys(c.attributes)) if (!KEEP_ATTRS.includes(name)) c.deleteAttribute(name);
        return c.index ? c.toNonIndexed() : c;
      });
      const merged = BufferGeometryUtils.mergeGeometries(geos, false);
      if (!merged) {
        console.warn(`[BodyKit] merge failed for "${key}"`);
        continue;
      }
      const scale = UV_SCALE[key];
      if (scale !== 'keep') boxProjectUV(merged, scale ?? 1);
      const mesh = new THREE.Mesh(merged, mat);
      mesh.name = `${this.name}_${key}`;
      mesh.castShadow = castShadow && !UNSHADOWED.has(key);
      mesh.receiveShadow = receiveShadow && !UNSHADOWED.has(key);
      group.add(mesh);
    }
    return group;
  }
}

// --- local geometry helpers -------------------------------------------------

/**
 * A stamped body-side panel. Points are absolute [z, y] in truck space and get
 * extruded across X, so wheel openings, sill steps and beltline tucks are just
 * part of the outline instead of separate parts laid on top.
 */
function sidePanel(pts, depth = SKIN, bevel = BEVEL) {
  const g = profile(
    pts.map(([z, y]) => [-z, y]),
    depth,
    { bevel, curveSegments: 4 },
  );
  g.rotateY(Math.PI / 2);
  return g;
}

/** Points along a wheel opening, front to rear, ending on the sill line. */
function archPoints(cz, radius, sillY, steps = 16) {
  const dy = Math.max(-0.999, Math.min(0.999, (sillY - S.axleY) / radius));
  const a0 = Math.asin(dy);
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (i / steps) * (Math.PI - 2 * a0);
    out.push([cz + Math.cos(a) * radius, S.axleY + Math.sin(a) * radius]);
  }
  return out;
}

/**
 * Sweep a closed cross-section around a wheel opening: a bolt-on flare with a
 * flat outer face, a rolled-under lip and crisp longitudinal edges. A torus
 * section reads as a length of tube; this reads as a moulding.
 *
 * `section` entries are [outwardX, radialOffset]; either winding is accepted.
 */
function archFlare({ radius, cz, sillY, section, steps = 22, pad = 0.06, cap = true }) {
  const dy = Math.max(-0.999, Math.min(0.999, (sillY - S.axleY) / radius));
  const a0 = Math.asin(dy) - pad;
  const a1 = Math.PI - a0;
  const m = section.length;

  let area = 0;
  for (let j = 0; j < m; j++) {
    const p = section[j];
    const q = section[(j + 1) % m];
    area += p[0] * q[1] - q[0] * p[1];
  }
  const flip = area < 0 ? -1 : 1;

  const ring = [];
  for (let j = 0; j < m; j++) {
    const p0 = section[j];
    const p1 = section[(j + 1) % m];
    const ds = p1[0] - p0[0];
    const dt = p1[1] - p0[1];
    const len = Math.hypot(ds, dt) || 1;
    ring.push({ p0, p1, ns: (dt / len) * flip, nt: (-ds / len) * flip });
  }

  const pos = [];
  const nor = [];
  const idx = [];
  const push = (s, t, ns, nt, a) => {
    const sa = Math.sin(a);
    const ca = Math.cos(a);
    pos.push(s, S.axleY + (radius + t) * sa, cz + (radius + t) * ca);
    nor.push(ns, nt * sa, nt * ca);
    return pos.length / 3 - 1;
  };

  for (let i = 0; i < steps; i++) {
    const a = a0 + (i / (steps - 1)) * (a1 - a0);
    for (const seg of ring) {
      push(seg.p0[0], seg.p0[1], seg.ns, seg.nt, a);
      push(seg.p1[0], seg.p1[1], seg.ns, seg.nt, a);
    }
  }

  const per = ring.length * 2;
  const e0 = [0, 0, 0];
  const e1 = [0, 0, 0];
  for (let i = 0; i < steps - 1; i++) {
    for (let j = 0; j < ring.length; j++) {
      const a0i = i * per + j * 2;
      const b0i = a0i + 1;
      const a1i = (i + 1) * per + j * 2;
      const b1i = a1i + 1;
      for (let c = 0; c < 3; c++) {
        e0[c] = pos[b0i * 3 + c] - pos[a0i * 3 + c];
        e1[c] = pos[a1i * 3 + c] - pos[a0i * 3 + c];
      }
      const cx = e0[1] * e1[2] - e0[2] * e1[1];
      const cy = e0[2] * e1[0] - e0[0] * e1[2];
      const cz2 = e0[0] * e1[1] - e0[1] * e1[0];
      const dot = cx * nor[a0i * 3] + cy * nor[a0i * 3 + 1] + cz2 * nor[a0i * 3 + 2];
      if (dot >= 0) idx.push(a0i, b0i, a1i, b0i, b1i, a1i);
      else idx.push(a0i, a1i, b0i, b0i, a1i, b1i);
    }
  }

  // caps, so the two open ends down by the sill are not see-through
  if (cap) {
    for (const [a, sign] of [[a0, -1], [a1, 1]]) {
      const base = pos.length / 3;
      const sa = Math.sin(a);
      const ca = Math.cos(a);
      const nx = 0;
      const ny = -ca * sign;
      const nz = sa * sign;
      for (const p of section) {
        pos.push(p[0], S.axleY + (radius + p[1]) * sa, cz + (radius + p[1]) * ca);
        nor.push(nx, ny, nz);
      }
      for (let j = 1; j < m - 1; j++) {
        if (sign > 0) idx.push(base, base + j, base + j + 1);
        else idx.push(base, base + j + 1, base + j);
      }
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  g.setIndex(idx);
  return g;
}

/**
 * Chamfered box for greebles. `rbox` defaults to two segments a side, which is
 * 300 triangles: right for a door skin, wasteful on a 30 mm bracket, and there
 * are several hundred brackets. One segment still leaves a facetted chamfer to
 * catch a highlight, at just over a third of the cost.
 */
function gbox(w, h, d, r = 0.006) {
  return rbox(w, h, d, r, 1);
}

/** Diamond-section rib: a swage line whose two facets take different light. */
function swage(len, size = 0.03) {
  const g = rbox(size, size, len, size * 0.22);
  g.rotateZ(Math.PI / 4);
  return g;
}

/**
 * Four walls lining an opening. A solid slab here would fill the aperture and
 * hide whatever is meant to sit inside it, which is exactly what makes a grille
 * or a lamp read as a decal on the nose.
 */
function recess(k, key, { cx = 0, cy, cz, w, h, d, wall = 0.022 }) {
  k.add(key, rbox(w, wall, d, 0.004), { pos: [cx, cy + (h - wall) * 0.5, cz] });
  k.add(key, rbox(w, wall, d, 0.004), { pos: [cx, cy - (h - wall) * 0.5, cz] });
  k.add(key, rbox(wall, h - wall * 2, d, 0.004), { pos: [cx + (w - wall) * 0.5, cy, cz] });
  k.add(key, rbox(wall, h - wall * 2, d, 0.004), { pos: [cx - (w - wall) * 0.5, cy, cz] });
}

/**
 * Stepped reflector bowl, opening down +Z. Built from concentric truncated cones
 * so each step takes the light at a different angle: a single sphere cap in a
 * chrome material has nothing to shade and just returns a warped mirror of the
 * forest, which is what makes CG lamps look like ball bearings.
 */
function reflectorBowl(k, { cx, cy, cz, r, depth, steps = 3, seg = 24 }) {
  const dz = depth / steps;
  for (let i = 0; i < steps; i++) {
    const outer = r * (1 - i * 0.26);
    const inner = outer - r * 0.14;
    const next = r * (1 - (i + 1) * 0.26);
    const z = cz - i * dz;
    // the flat land is most of the visible area, so the bowl keeps an even
    // brightness instead of splitting light/dark down the middle like a cone
    k.add('reflector', new THREE.RingGeometry(inner, outer, seg), { pos: [cx, cy, z] });
    k.add('reflector', new THREE.CylinderGeometry(inner, next, dz, seg, 1, true), {
      pos: [cx, cy, z - dz * 0.5],
      rot: [Math.PI / 2, 0, 0],
    });
  }
  k.add('reflector', new THREE.CircleGeometry(r * (1 - steps * 0.26), seg), { pos: [cx, cy, cz - depth] });
}

/**
 * Shallow lens cap, bulging down +Z. A flat disc of glass mirrors one direction
 * of the environment across its whole face and comes back as an even grey wash;
 * a curved one sweeps the highlight across the lens, which is what makes it read
 * as glass rather than as a painted circle.
 */
function lensDome(r, rise = 0.34, seg = 22) {
  const g = new THREE.SphereGeometry(r, seg, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
  g.scale(1, rise, 1);
  g.rotateX(Math.PI / 2);
  return g;
}

/** Recessed shut line between two flank panels. */
function shutLine(k, z, y0, y1, width = 0.032) {
  k.addMirrored('gap', rbox(0.06, y1 - y0, width, 0.004), {
    pos: [HW - 0.055, (y0 + y1) * 0.5, z],
  });
}

// --- deterministic noise, for splash lines and chip scatter ------------------
function hash1(i, seed = 0) {
  const s = Math.sin(i * 127.1 + seed * 311.7 + 0.37) * 43758.5453;
  return s - Math.floor(s);
}

/** Smooth 1D value noise in 0..1, so a drawn edge wanders instead of stepping. */
function wobble(t, seed = 0, octaves = 3) {
  let v = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    const x = t * freq;
    const i = Math.floor(x);
    const f = x - i;
    const s = f * f * (3 - 2 * f);
    v += (hash1(i, seed + o * 17) * (1 - s) + hash1(i + 1, seed + o * 17) * s) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.3;
  }
  return v / norm;
}

/**
 * Caked spray along the bottom of a flank panel.
 *
 * The dirt shader lays a smooth gradient up the panel, and a gradient reads as
 * shading rather than as mud. What says mud is an *edge*: a low crusted ridge
 * with an irregular top, and a spatter field above it that thins out with
 * height, so the eye finds a line where the spray stopped.
 */
function splashCrust(k, { z0, z1, yBase, rise = 0.055, seed = 1, cells = 12, depth = 0.024 }) {
  const pts = [[z0, yBase], [z1, yBase]];
  for (let i = cells; i >= 0; i--) {
    const t = i / cells;
    pts.push([z0 + (z1 - z0) * t, yBase + rise * (0.35 + wobble(t * cells * 0.5, seed) * 1.0)]);
  }
  k.addMirrored('trim', sidePanel(pts, depth, 0.004), { pos: [HW + 0.004, 0, 0] });
}

/**
 * Thrown spatter over a panel. Flat discs a few millimetres off the skin: the
 * silhouette is what registers, and 7 triangles buys one.
 */
function splashSpatter(k, { z0, z1, y0, y1, n = 40, seed = 3, key = 'trim', x = HW + 0.012, rMax = 0.019, clearArch = 0 }) {
  for (let i = 0; i < n; i++) {
    const t = hash1(i * 3 + 1, seed);
    const u = hash1(i * 3 + 2, seed);
    const h = u * u; // density falls off going up the panel
    const y = y0 + (y1 - y0) * h;
    const z = z0 + (z1 - z0) * t;
    // dots inside the opening would sit behind the flare, not on the panel
    if (clearArch && Math.hypot(z - clearArch, y - S.axleY) < ARCH_R + 0.1) continue;
    k.addMirrored(key, new THREE.CircleGeometry(0.0035 + hash1(i * 3 + 3, seed) * rMax * (1 - h * 0.8), 6), {
      pos: [x, y, z],
      rot: [0, Math.PI / 2, 0],
    });
  }
}

export function buildBody() {
  const k = new BodyKit('body');

  frame(k);
  floorAndRockers(k);
  flanks(k);
  frontClip(k);
  fascia(k);
  cab(k);
  wipers(k);
  bed(k);

  return k;
}

// --- ladder frame -----------------------------------------------------------
function frame(k) {
  const railL = S.noseZ - 0.15 - (S.tailZ + 0.12);
  const railZ = (S.noseZ - 0.15 + S.tailZ + 0.12) * 0.5;
  k.addMirrored('steelDark', rbox(0.12, 0.17, railL, 0.02), {
    pos: [S.frameHalfWidth, S.frameY - 0.09, railZ],
  });

  for (const z of [2.1, 1.5, 0.6, -0.5, -1.5, -2.25]) {
    k.add('steelDark', rbox(S.frameHalfWidth * 2 - 0.05, 0.1, 0.09, 0.015), {
      pos: [0, S.frameY - 0.09, z],
    });
  }
  for (let i = 0; i < 9; i++) {
    k.addMirrored('steelDark', new THREE.CylinderGeometry(0.035, 0.035, 0.125, 12), {
      pos: [S.frameHalfWidth, S.frameY - 0.09, -2.1 + i * 0.53],
      rot: [0, 0, Math.PI / 2],
    });
  }
  // fuel tank + transfer case lumps so the underside is not empty
  k.add('trim', rbox(0.62, 0.28, 0.5, 0.06), { pos: [0.18, S.frameY - 0.18, -0.95] });
  k.add('steelDark', rbox(0.34, 0.3, 0.55, 0.05), { pos: [-0.05, S.frameY - 0.1, 0.2] });
  k.add('alu', rbox(0.28, 0.26, 0.42, 0.04), { pos: [0.0, S.frameY - 0.05, 0.95] });
  k.add('steel', new THREE.CylinderGeometry(0.035, 0.035, 1.5, 12), {
    pos: [0, S.frameY - 0.2, -0.3],
    rot: [Math.PI / 2, 0, 0],
  });
  k.add('steelDark', tube(
    [
      [0.12, 0.44, 1.0],
      [0.3, 0.4, 0.2],
      [0.34, 0.38, -0.9],
      [0.4, 0.42, -1.72],
      [0.52, 0.45, -2.2],
      [0.66, 0.47, -2.52],
    ],
    0.038,
  ));
  // Muffler, heat shield and a turned-out tailpipe. The rear camera looks
  // straight into the corner the exhaust leaves from, and a 55 mm stub tucked
  // under the bumper never registered as an exhaust at all.
  k.add('steelDark', new THREE.CylinderGeometry(0.086, 0.086, 0.5, 16), {
    pos: [0.36, 0.4, -1.28],
    rot: [Math.PI / 2, 0, 0.03],
  });
  for (const dz of [-0.25, 0.25]) {
    k.add('steelDark', new THREE.CylinderGeometry(0.088, 0.05, 0.05, 14), {
      pos: [0.36, 0.4, -1.28 + dz],
      rot: [Math.PI / 2, 0, 0],
    });
  }
  k.add('alu', gbox(0.14, 0.014, 0.42, 0.006), { pos: [0.36, 0.49, -1.28] });
  for (const dz of [-0.16, 0.16]) {
    k.add('trim', gbox(0.035, 0.09, 0.025, 0.008), { pos: [0.36, 0.51, -1.28 + dz] });
  }
  k.add('steel', new THREE.CylinderGeometry(0.062, 0.05, 0.18, 14, 1, true), {
    pos: [0.7, 0.48, -2.6],
    rot: [Math.PI / 2 - 0.1, -0.32, 0],
  });
  k.add('gap', new THREE.CylinderGeometry(0.05, 0.05, 0.16, 14), {
    pos: [0.7, 0.48, -2.6],
    rot: [Math.PI / 2 - 0.1, -0.32, 0],
  });
  k.add('steelDark', new THREE.TorusGeometry(0.058, 0.008, 6, 16), {
    pos: [0.716, 0.482, -2.665],
    rot: [0.1, -0.32, 0],
  });
}

// --- floor pan, rockers, sliders -------------------------------------------
function floorAndRockers(k) {
  const floorZ = (S.cabFrontZ + S.bedRearZ) * 0.5;
  const floorL = S.cabFrontZ - S.bedRearZ;
  k.add('steelDark', rbox(HW * 2 - 0.06, 0.06, floorL, 0.02), {
    pos: [0, S.floorY - 0.03, floorZ],
  });

  // structure behind the shut lines, so a gap shows darkness rather than sky
  k.addMirrored('gap', rbox(0.05, 0.82, 3.14, 0.01), { pos: [HW - 0.145, 1.03, 0.67] });

  // sun-faded plastic rocker cladding under the doors
  const rockerL = S.cabFrontZ - S.cabRearZ + 0.42;
  const rockerZ = (S.cabFrontZ + S.cabRearZ) * 0.5;
  k.addMirrored('trim', rbox(0.075, 0.16, rockerL, 0.03), {
    pos: [HW - 0.012, SILL_Y - 0.03, rockerZ],
  });
  k.addMirrored('trimGloss', rbox(0.04, 0.032, rockerL - 0.08, 0.01), {
    pos: [HW + 0.018, SILL_Y + 0.028, rockerZ],
  });
  for (let i = 0; i < 7; i++) {
    k.addMirrored('steelDark', rivet(0.013, 0.007), {
      pos: [HW + 0.028, SILL_Y - 0.06, rockerZ - 0.9 + i * 0.3],
      rot: [0, 0, -Math.PI / 2],
    });
  }

  // rock sliders. The sill sits in the body's own shadow from every camera we
  // shoot, so it gets brushed step pads: bare aluminium picks the sky up out of
  // the env map and keeps the bottom edge of the silhouette from going to black.
  const sliderL = 1.85;
  k.addMirrored('plate', rbox(0.115, 0.075, sliderL, 0.025), {
    pos: [HW + 0.05, S.floorY - 0.3, rockerZ],
  });
  for (const dz of [-0.52, 0.52]) {
    k.addMirrored('alu', rbox(0.108, 0.014, 0.5, 0.005), {
      pos: [HW + 0.05, S.floorY - 0.258, rockerZ + dz],
    });
  }
  k.addMirrored('alu', rbox(0.03, 0.022, rockerL - 0.2, 0.006), {
    pos: [HW + 0.03, SILL_Y - 0.098, rockerZ],
  });
  k.addMirrored('steelDark', rbox(0.1, 0.05, sliderL - 0.1, 0.014), {
    pos: [HW + 0.052, S.floorY - 0.35, rockerZ],
  });
  for (const z of [-0.7, 0.05, 0.8]) {
    k.addMirrored('steelDark', rbox(0.26, 0.06, 0.075, 0.015), {
      pos: [HW - 0.09, S.floorY - 0.3, z],
    });
    k.addMirrored('steel', bolt(0.014, 0.011), {
      pos: [HW + 0.058, S.floorY - 0.26, z],
      rot: [0, 0, -Math.PI / 2],
    });
  }
  for (const dz of [-1, 1]) {
    k.addMirrored('steel', tube(
      [
        [HW + 0.05, S.floorY - 0.31, rockerZ + dz * sliderL * 0.5],
        [HW + 0.02, S.floorY - 0.2, rockerZ + dz * (sliderL * 0.5 + 0.18)],
      ],
      0.035,
    ), {});
  }
}

// --- body sides: four stamped panels a side, with real seams ---------------
function flanks(k) {
  const beltY = S.beltlineY;

  // 1. front fender, wheel opening cut into the outline
  k.addMirrored('paint', sidePanel([
    [2.14, 0.87],
    [2.06, SILL_Y],
    ...archPoints(S.frontAxleZ, ARCH_R, SILL_Y),
    [0.96, SILL_Y],
    [0.96, S.hoodY],
    [1.34, S.hoodY],
    [2.17, S.hoodY - 0.012],
    [2.17, 1.0],
  ]), { pos: [SKIN_X, 0, 0] });

  // 2 + 3. doors
  for (const [zf, zr] of [
    [0.944, 0.02],
    [0.004, S.cabRearZ],
  ]) {
    k.addMirrored('paint', sidePanel([
      [zf, SILL_Y],
      [zr, SILL_Y],
      [zr, beltY],
      [zf, beltY],
    ]), { pos: [SKIN_X, 0, 0] });
  }

  // 4. bedside, rear opening cut in
  k.addMirrored('paint', sidePanel([
    [-0.93, SILL_Y],
    ...archPoints(S.rearAxleZ, ARCH_R, SILL_Y),
    [S.bedRearZ, SILL_Y],
    [S.bedRearZ, S.bedTopY],
    [-0.93, S.bedTopY],
  ]), { pos: [SKIN_X, 0, 0] });

  shutLine(k, 0.952, SILL_Y + 0.02, S.hoodY - 0.01);
  shutLine(k, 0.012, SILL_Y + 0.02, beltY - 0.01);
  shutLine(k, -0.895, SILL_Y + 0.02, S.bedTopY - 0.02, 0.075);

  // Swage lines. A shoulder crease under the beltline and a lower kick, broken
  // at every shut line so the creases read as pressed into separate panels.
  for (const [zc, len] of [
    [1.58, 1.06],
    [0.49, 0.86],
    [-0.43, 0.82],
    [-1.66, 1.4],
  ]) {
    k.addMirrored('paint', swage(len, 0.058), { pos: [HW + 0.004, beltY - 0.17, zc] });
    k.addMirrored('paint', swage(len, 0.038), { pos: [HW, SILL_Y + 0.245, zc] });
  }
  // upper crease along the bedside, and a stamped shoulder over the rear arch
  k.addMirrored('paint', swage(1.42, 0.044), { pos: [HW + 0.002, S.bedTopY - 0.18, -1.66] });
  // Body-side moulding in faded plastic, broken at each shut line. Two creases
  // and a rub strip is the difference between a stamped flank and a flat wall.
  for (const [zc, len] of [[1.62, 0.92], [0.49, 0.86], [-0.43, 0.82], [-1.7, 1.3]]) {
    k.addMirrored('trim', rbox(0.055, 0.075, len, 0.018), { pos: [HW - 0.008, SILL_Y + 0.115, zc] });
    k.addMirrored('trimGloss', rbox(0.028, 0.016, len - 0.04, 0.005), {
      pos: [HW + 0.026, SILL_Y + 0.142, zc],
    });
  }
  for (const cz of [S.frontAxleZ, S.rearAxleZ]) {
    k.addMirrored('paint', archFlare({
      radius: ARCH_R + 0.128,
      cz,
      sillY: 1.0,
      steps: 14,
      pad: 0.0,
      cap: false,
      section: [
        [0.0, 0.024],
        [0.036, 0.019],
        [0.036, -0.019],
        [0.0, -0.024],
      ],
    }), { pos: [HW - 0.036, 0, 0] });
  }

  // gill vent let into the fender behind the front wheel
  for (const side of [-1, 1]) {
    k.add('gap', rbox(0.05, 0.19, 0.15, 0.008), { pos: [side * (HW - 0.024), 1.03, 1.06] });
    k.add('trim', rbox(0.045, 0.23, 0.19, 0.014), { pos: [side * (HW - 0.006), 1.03, 1.06] });
    k.add('gap', rbox(0.035, 0.16, 0.13, 0.006), { pos: [side * (HW + 0.008), 1.03, 1.06] });
    for (let i = 0; i < 3; i++) {
      k.add('trimGloss', rbox(0.04, 0.03, 0.13, 0.006), {
        pos: [side * (HW + 0.012), 0.975 + i * 0.055, 1.06],
        rot: [0.5, 0, 0],
      });
    }
  }

  for (const cz of [S.frontAxleZ, S.rearAxleZ]) wheelArch(k, cz);

  doorFurniture(k, beltY);
  flankHardware(k, beltY);
  roadSpray(k);

  // beltline moulding capping the doors
  k.addMirrored('trim', rbox(0.085, 0.05, 1.86, 0.016), { pos: [HW - 0.018, beltY + 0.022, 0.045] });
  k.addMirrored('trimGloss', rbox(0.05, 0.016, 1.84, 0.006), { pos: [HW + 0.016, beltY + 0.046, 0.045] });
}

// The flare is the single widest band of surface on the flank, so its section
// carries three separate facets — a shoulder rolling off the panel, a near
// vertical outer face, and a lip turned back under — plus a step at the top
// edge, so it stands off the fender and throws a shadow line the way a bolt-on
// arch does. One smooth tube here was most of why the front wheel view came
// back as a single tan shape.
// Big flat facets with a 12 mm chamfer at each crease, rather than a smooth
// roll. `archFlare` gives every section segment its own normal, so a long flat
// land and a near-vertical face come back as two clearly different values with
// a highlight on the chamfer between them — which is the whole point, since
// this band is what the wheel camera fills a third of its frame with.
const FLARE_SECTION = [
  [0.026, 0.1],
  [0.088, 0.088],
  [0.118, 0.05],
  [0.132, 0.022],
  [0.134, -0.048],
  [0.118, -0.078],
  [0.09, -0.092],
  [0.05, -0.096],
  [0.03, -0.072],
  [0.008, -0.02],
];

function wheelArch(k, cz) {
  const fx = HW - 0.03; // flare datum plane; +0.134 is the outer face
  // The flare body is the darker, less-dirtied plastic and the lip under it the
  // matt textured one. That is the wrong way round for a real flare, and it is
  // deliberate: the road-film shader keys off distance to the wheel centre, so
  // anything within half a metre of the hub in the matt material saturates to
  // mud and the whole arch came back as one tan sheet. In the gloss plastic the
  // flare holds a dark value with a Fresnel edge on every crease, and the mud
  // that lands on it reads as mud because the panel under it does not.
  k.addMirrored('trimGloss', archFlare({ radius: ARCH_R, cz, sillY: SILL_Y, section: FLARE_SECTION, steps: 24 }), {
    pos: [fx, 0, 0],
  });
  // separate lip moulding along the bottom of the flare, in the matt material:
  // its own substance rather than a fade-out, and the first thing the spray hits
  k.addMirrored('trim', archFlare({
    radius: ARCH_R - 0.082,
    cz,
    sillY: SILL_Y - 0.03,
    steps: 20,
    pad: 0.02,
    cap: false,
    section: [
      [0.02, 0.02],
      [0.096, 0.014],
      [0.098, -0.012],
      [0.02, -0.018],
    ],
  }), { pos: [fx, 0, 0] });
  // shadow gap under the flare's top edge, so it reads bolted on rather than
  // pressed into the panel
  k.addMirrored('gap', archFlare({
    radius: ARCH_R + 0.088,
    cz,
    sillY: SILL_Y + 0.02,
    steps: 18,
    pad: -0.03,
    cap: false,
    section: [[0.0, 0.014], [0.03, 0.011], [0.03, -0.011], [0.0, -0.014]],
  }), { pos: [HW - 0.03, 0, 0] });

  // rolled arch lip on the panel itself: a return flange turned inboard, which
  // is the dark crescent you should see inside the opening
  k.addMirrored('paintDark', archFlare({
    radius: ARCH_R - 0.016,
    cz,
    sillY: SILL_Y,
    steps: 18,
    section: [
      [-0.11, -0.016],
      [0.0, -0.016],
      [0.006, 0.006],
      [-0.03, 0.018],
      [-0.11, 0.016],
    ],
  }), { pos: [HW - 0.056, 0, 0] });

  archLiner(k, cz);

  // flare fasteners: hex head on a satin washer. A 13 mm dome flush with the
  // moulding was invisible from the wheel camera; a real flare bolt stands off
  // its own boss and carries a highlight.
  for (let i = 0; i < 9; i++) {
    const a = 0.2 + (i / 8) * (Math.PI - 0.4);
    const r = ARCH_R - 0.014;
    const y = S.axleY + Math.sin(a) * r;
    const z = cz + Math.cos(a) * r;
    k.addMirrored('alu', new THREE.CylinderGeometry(0.024, 0.026, 0.007, 12), {
      pos: [fx + 0.136, y, z],
      rot: [0, 0, Math.PI / 2],
    });
    k.addMirrored('steelDark', bolt(0.016, 0.013), { pos: [fx + 0.139, y, z], rot: [0, 0, -Math.PI / 2] });
  }
  // Caked spray up the outer face of the flare, thinning toward the shoulder.
  // On the dark flare this is the mud line: a crusted band low on the face with
  // a broken top edge, rather than a gradient.
  const seed = cz > 0 ? 61 : 67;
  for (let i = 0; i < 20; i++) {
    const a = 0.12 + hash1(i * 5 + 1, seed) * (Math.PI - 0.24);
    const u = hash1(i * 5 + 2, seed);
    const r = ARCH_R - 0.058 + u * u * 0.07;
    k.addMirrored('trim', new THREE.CircleGeometry(0.009 + hash1(i * 5 + 3, 71) * 0.018 * (1 - u * 0.6), 6), {
      pos: [fx + 0.138, S.axleY + Math.sin(a) * r, cz + Math.cos(a) * r],
      rot: [0, Math.PI / 2, 0],
    });
  }
  // and a crusted ridge low on the face, which is the mud *line*: an edge for
  // the eye to find rather than another gradient
  for (let i = 0; i < 22; i++) {
    const a = 0.1 + (i / 21) * (Math.PI - 0.2);
    const r = ARCH_R - 0.064 + wobble(i * 0.55, seed + 11) * 0.052;
    k.addMirrored('trim', new THREE.SphereGeometry(0.018 + wobble(i * 0.9, seed + 17) * 0.013, 7, 5), {
      pos: [fx + 0.132, S.axleY + Math.sin(a) * r, cz + Math.cos(a) * r],
      scale: [0.44, 1, 1],
    });
  }
  // Stone chipping through to bare metal along the flare's leading edge and on
  // the panel behind the opening — the two places a 4x4 loses its finish first.
  for (let i = 0; i < 9; i++) {
    const a = 0.16 + hash1(i * 3 + 1, seed + 5) * 0.62;
    const r = ARCH_R - 0.05 + hash1(i * 3 + 2, seed + 5) * 0.1;
    k.addMirrored('alu', new THREE.CircleGeometry(0.004 + hash1(i * 3 + 3, seed + 5) * 0.007, 5), {
      pos: [fx + 0.139, S.axleY + Math.sin(a) * r, cz + Math.cos(a) * r],
      rot: [0, Math.PI / 2, 0],
    });
  }
}

/**
 * Moulded inner liner. Built as three stepped bands rather than one smooth
 * half-pipe: the steps are what let the opening read as having depth, and the
 * push-pins are the only bright thing inside a cavity that never sees the sun.
 */
function archLiner(k, cz) {
  const bands = [
    [0.50, 0.20, 0.526],
    [0.665, 0.14, 0.542],
    [0.775, 0.09, 0.520],
  ];
  for (const [cx, len, r] of bands) {
    k.addMirrored('trim', new THREE.CylinderGeometry(r, r, len, 20, 1, true, -0.22, Math.PI + 0.44), {
      pos: [cx, S.axleY, cz],
      rot: [0, 0, Math.PI / 2],
    });
  }
  // dark backing behind the liner so the deepest part of the well goes to black
  k.addMirrored('gap', new THREE.CylinderGeometry(0.44, 0.44, 0.3, 16, 1, true, -0.3, Math.PI + 0.6), {
    pos: [0.56, S.axleY, cz],
    rot: [0, 0, Math.PI / 2],
  });
  // Radial stiffening ribs. The wheel camera looks straight past the tyre into
  // the opening, so this is the surface that fills its frame, not the flare —
  // the ribs have to run the full width of the liner and be closely enough
  // spaced to stripe it, or the well comes back as one smooth tan sheet.
  // 30 mm of radial standoff, not 3 mm: the wheel camera sees this surface at a
  // very shallow angle and a strip flush with the shell casts nothing. 0.505 is
  // the hard floor — below that a rib can reach the 0.445 tyre under travel.
  for (let i = 0; i < 17; i++) {
    const a = -0.1 + (i / 16) * (Math.PI + 0.2);
    k.addMirrored('trimGloss', gbox(0.42, 0.032, 0.028, 0.006), {
      pos: [0.61, S.axleY + Math.sin(a) * 0.521, cz + Math.cos(a) * 0.521],
      rot: [Math.PI / 2 - a, 0, 0],
    });
    if (i % 2) {
      k.addMirrored('trimGloss', gbox(0.2, 0.028, 0.024, 0.005), {
        pos: [0.735, S.axleY + Math.sin(a) * 0.537, cz + Math.cos(a) * 0.537],
        rot: [Math.PI / 2 - a, 0, 0],
      });
    }
  }
  // shadow line in each step between the liner's three bands
  for (const [cx, r] of [[0.588, 0.532], [0.722, 0.545]]) {
    k.addMirrored('gap', new THREE.CylinderGeometry(r, r, 0.014, 18, 1, true, -0.2, Math.PI + 0.4), {
      pos: [cx, S.axleY, cz],
      rot: [0, 0, Math.PI / 2],
    });
  }
  k.addMirrored('trim', new THREE.CylinderGeometry(0.556, 0.526, 0.03, 20, 1, true, -0.22, Math.PI + 0.44), {
    pos: [0.828, S.axleY, cz],
    rot: [0, 0, Math.PI / 2],
  });
  for (let i = 0; i < 7; i++) {
    const a = 0.28 + (i / 6) * (Math.PI - 0.56);
    k.addMirrored('alu', rivet(0.016, 0.008), {
      pos: [0.80, S.axleY + Math.sin(a) * 0.532, cz + Math.cos(a) * 0.532],
      rot: [0, 0, -Math.PI / 2],
    });
  }
  // Brake hose and loom clipped down the leading side of the well, plus the
  // bracket they hang off. Bright braid inside a cavity that never sees the sun
  // is the only thing in here with a hard highlight on it.
  k.addMirrored('steelDark', tube(
    [
      [0.44, S.axleY + 0.5, cz + 0.16],
      [0.5, S.axleY + 0.42, cz + 0.34],
      [0.56, S.axleY + 0.2, cz + 0.46],
      [0.6, S.axleY - 0.04, cz + 0.42],
    ],
    0.014,
    7,
  ));
  k.addMirrored('alu', tube(
    [
      [0.47, S.axleY + 0.48, cz + 0.2],
      [0.53, S.axleY + 0.4, cz + 0.36],
      [0.585, S.axleY + 0.18, cz + 0.45],
    ],
    0.009,
    6,
  ));
  for (const [ax, ay, az] of [
    [0.5, S.axleY + 0.42, cz + 0.34],
    [0.58, S.axleY + 0.12, cz + 0.47],
  ]) {
    k.addMirrored('steelDark', gbox(0.05, 0.03, 0.026, 0.006), { pos: [ax, ay, az] });
    k.addMirrored('alu', rivet(0.011, 0.006), { pos: [ax - 0.03, ay, az], rot: [0, 0, Math.PI / 2] });
  }
}

// --- door handles, hinges, graphics ----------------------------------------
function doorFurniture(k, beltY) {
  for (const side of [-1, 1]) {
    for (const hz of [0.16, -0.72]) doorHandle(k, side, hz, beltY);
    // Exposed hinges on each door's leading edge: two leaves round a vertical
    // barrel with a bright pin through it. The old pair were boxes at x = HW
    // − 45 mm, i.e. 45 mm *inside* the door skin, so nothing of them ever showed.
    for (const hz of [0.944, 0.012]) {
      for (const hy of [beltY - 0.09, SILL_Y + 0.19]) {
        for (const dz of [-0.031, 0.031]) {
          k.add('steelDark', gbox(0.024, 0.062, 0.062, 0.006), { pos: [side * (HW + 0.008), hy, hz + dz] });
          k.add('steel', bolt(0.009, 0.007), {
            pos: [side * (HW + 0.022), hy, hz + dz * 1.5],
            rot: [0, 0, -side * Math.PI / 2],
          });
        }
        k.add('steelDark', new THREE.CylinderGeometry(0.016, 0.016, 0.078, 10), {
          pos: [side * (HW + 0.019), hy, hz],
        });
        k.add('alu', new THREE.CylinderGeometry(0.007, 0.007, 0.098, 8), {
          pos: [side * (HW + 0.019), hy, hz],
        });
      }
    }
    // graphics sit in the band between the two swage lines
    k.add('decalNumber', new THREE.PlaneGeometry(0.24, 0.24), {
      pos: [side * (HW + 0.017), 1.0, 0.58],
      rot: [0, side * Math.PI * 0.5, 0],
    });
    k.add('decalName', new THREE.PlaneGeometry(0.6, 0.15), {
      pos: [side * (HW + 0.017), 1.1, -1.95],
      rot: [0, side * Math.PI * 0.5, 0],
    });
    k.add('decalBadge', new THREE.PlaneGeometry(0.23, 0.069), {
      pos: [side * (HW + 0.017), 1.005, -0.46],
      rot: [0, side * Math.PI * 0.5, 0],
    });
    // and one high on the front fender, on the strip over the arch
    k.add('decalBadge', new THREE.PlaneGeometry(0.2, 0.06), {
      pos: [side * (HW + 0.017), 1.212, 1.24],
      rot: [0, side * Math.PI * 0.5, 0],
    });
  }
}

/**
 * Lift handle in a recessed pocket. The old one was a dark chrome bar 30 mm
 * proud in a black slot, which from any beauty distance is indistinguishable
 * from a painted line: what a handle needs is a bezel with an edge, a paddle in
 * a *light* metal, and a lock barrel beside it.
 */
function doorHandle(k, side, hz, beltY) {
  const hy = beltY - 0.155;
  k.add('gap', gbox(0.06, 0.108, 0.24, 0.012), { pos: [side * (HW - 0.028), hy, hz] });
  for (const dy of [-0.055, 0.055]) {
    k.add('trimGloss', gbox(0.042, 0.018, 0.252, 0.006), { pos: [side * (HW - 0.001), hy + dy, hz] });
  }
  for (const dz of [-0.126, 0.126]) {
    k.add('trimGloss', gbox(0.042, 0.092, 0.018, 0.006), { pos: [side * (HW - 0.001), hy, hz + dz] });
  }
  k.add('alu', gbox(0.048, 0.034, 0.178, 0.009), { pos: [side * (HW + 0.019), hy + 0.014, hz - 0.014] });
  k.add('gap', gbox(0.03, 0.026, 0.17, 0.006), { pos: [side * (HW + 0.006), hy - 0.022, hz - 0.014] });
  k.add('trimGloss', gbox(0.036, 0.05, 0.042, 0.01), { pos: [side * (HW + 0.012), hy + 0.008, hz + 0.09] });
  k.add('alu', new THREE.CylinderGeometry(0.013, 0.013, 0.016, 12), {
    pos: [side * (HW + 0.008), hy - 0.008, hz - 0.168],
    rot: [0, 0, Math.PI / 2],
  });
  k.add('chrome', new THREE.TorusGeometry(0.017, 0.004, 6, 14), {
    pos: [side * (HW + 0.006), hy - 0.008, hz - 0.168],
    rot: [0, Math.PI / 2, 0],
  });
}

// --- markers, filler, mirror bracket, rub-strip brightwork ------------------
function flankHardware(k, beltY) {
  // bright insert down the body-side moulding. Chrome rather than satin alu so
  // it takes the road film with everything else instead of staying showroom
  // clean in the middle of a dirty panel.
  for (const [zc, len] of [[1.62, 0.92], [0.49, 0.86], [-0.43, 0.82], [-1.7, 1.3]]) {
    k.addMirrored('chrome', gbox(0.02, 0.012, len - 0.06, 0.004), {
      pos: [HW + 0.03, SILL_Y + 0.148, zc],
    });
  }

  // side marker lamps, one amber forward and one red aft — 80s US spec, and the
  // only saturated thing on a long green panel
  for (const side of [-1, 1]) {
    for (const [z, y, key] of [[2.03, 1.115, 'amber'], [-2.2, 1.05, 'reflectorRed']]) {
      k.add('gap', gbox(0.05, 0.08, 0.14, 0.008), { pos: [side * (HW - 0.012), y, z] });
      k.add('trimGloss', gbox(0.042, 0.07, 0.13, 0.01), { pos: [side * (HW + 0.008), y, z] });
      k.add(key, gbox(0.03, 0.046, 0.104, 0.008), { pos: [side * (HW + 0.024), y, z] });
      for (const dy of [-0.036, 0.036]) {
        k.add('chrome', gbox(0.028, 0.012, 0.128, 0.004), { pos: [side * (HW + 0.024), y + dy, z] });
      }
      k.add('steelDark', rivet(0.008, 0.005), {
        pos: [side * (HW + 0.032), y, z + 0.058],
        rot: [0, 0, -side * Math.PI / 2],
      });
    }
  }

  // fuel filler on the bedside, ahead of the rear arch: a hinged flap in a
  // pressed bowl with the cap sitting behind it
  const fz = -1.03;
  const fy = 1.14;
  k.add('gap', new THREE.CylinderGeometry(0.092, 0.092, 0.055, 20), {
    pos: [HW - 0.006, fy, fz],
    rot: [0, 0, Math.PI / 2],
  });
  k.add('paintDark', new THREE.CylinderGeometry(0.088, 0.082, 0.04, 20, 1, true), {
    pos: [HW + 0.004, fy, fz],
    rot: [0, 0, Math.PI / 2],
  });
  k.add('trim', new THREE.TorusGeometry(0.093, 0.011, 8, 22), {
    pos: [HW + 0.018, fy, fz],
    rot: [0, Math.PI / 2, 0],
  });
  k.add('alu', new THREE.CylinderGeometry(0.06, 0.058, 0.032, 18), {
    pos: [HW + 0.006, fy, fz],
    rot: [0, 0, Math.PI / 2],
  });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    k.add('trimGloss', gbox(0.014, 0.016, 0.03, 0.004), {
      pos: [HW + 0.022, fy + Math.sin(a) * 0.042, fz + Math.cos(a) * 0.042],
    });
  }
  // flap swung open on its hinge, plus the knuckle and the retaining strap
  k.add('paint', gbox(0.028, 0.176, 0.172, 0.009), { pos: [HW + 0.043, fy + 0.008, fz - 0.011], rot: [0, 0.5, 0] });
  k.add('trimGloss', new THREE.CylinderGeometry(0.011, 0.011, 0.15, 10), {
    pos: [HW + 0.026, fy + 0.008, fz - 0.09],
  });
  k.add('trim', gbox(0.012, 0.014, 0.09, 0.004), { pos: [HW + 0.05, fy - 0.06, fz - 0.05], rot: [0, 0.5, 0.5] });
}

/**
 * Road spray. Item three on the fix list was "a mud line where the spray
 * stops": the dirt shader already climbs the panels, but as a smooth gradient
 * it reads as shading. A crusted ridge with an irregular top plus a spatter
 * field that thins with height gives the eye an actual line to find.
 */
function roadSpray(k) {
  // The flank is densely populated below the lower swage — rocker cladding,
  // rub strip, crease — so the only clear band is 0.87 to 1.12, which is also
  // where a mud line actually sits on a truck this tall. The crust's bottom
  // edge tucks under the crease and its wavy top is the line.
  splashSpatter(k, {
    z0: 0.98, z1: 2.16, y0: 0.95, y1: 1.2, n: 40, seed: 12, rMax: 0.012, clearArch: S.frontAxleZ,
  });

  splashCrust(k, { z0: -0.86, z1: 0.94, yBase: 0.855, rise: 0.062, seed: 21, cells: 13 });
  splashSpatter(k, { z0: -0.86, z1: 0.94, y0: 0.88, y1: 1.11, n: 48, seed: 22, rMax: 0.016 });
  // stone chipping through to bare metal along the leading lower edge
  splashSpatter(k, { z0: -0.86, z1: -0.1, y0: 0.88, y1: 1.08, n: 16, seed: 23, key: 'alu', rMax: 0.005, x: HW + 0.008 });

  // bedside: a crust across the rear quarter, spray over the arch
  splashCrust(k, { z0: -2.37, z1: -2.07, yBase: 0.855, rise: 0.062, seed: 31, cells: 4 });
  splashSpatter(k, {
    z0: -2.38, z1: -0.95, y0: 0.88, y1: 1.22, n: 40, seed: 32, rMax: 0.016, clearArch: S.rearAxleZ,
  });
  splashSpatter(k, { z0: -2.36, z1: -2.1, y0: 0.9, y1: 1.1, n: 12, seed: 34, key: 'alu', rMax: 0.005, x: HW + 0.008 });

  // caked clumps on the inside of both liners, which is where mud really packs.
  // Radius is held at 0.505 so nothing can reach the 0.445 tyre under travel.
  for (const cz of [S.frontAxleZ, S.rearAxleZ]) {
    const seed = cz > 0 ? 5 : 9;
    for (let i = 0; i < 17; i++) {
      const a = 0.06 + (i / 16) * (Math.PI - 0.12);
      k.addMirrored('trim', new THREE.SphereGeometry(0.015 + wobble(i * 1.3, seed) * 0.018, 7, 5), {
        pos: [0.4 + wobble(i * 0.7, seed + 3) * 0.42, S.axleY + Math.sin(a) * 0.508, cz + Math.cos(a) * 0.508],
        scale: [1, 0.7, 0.9],
      });
    }
  }
}

// --- hood, fender crowns, cowl ---------------------------------------------
function frontClip(k) {
  const hoodL = S.hoodFrontZ - S.hoodRearZ;
  const hoodZ = (S.hoodFrontZ + S.hoodRearZ) * 0.5;

  // crowned hood: a transverse profile swept down the length, so the highlight
  // travels across it instead of sitting still on one flat plane
  const crown = (halfW, rise, drop) => [
    [-halfW, -drop],
    [halfW, -drop],
    [halfW, 0],
    [halfW * 0.78, rise * 0.48],
    [halfW * 0.4, rise * 0.86],
    [0, rise],
    [-halfW * 0.4, rise * 0.86],
    [-halfW * 0.78, rise * 0.48],
    [-halfW, 0],
  ];
  k.add('paint', profile(crown(0.795, 0.05, 0.07), hoodL, { bevel: 0.011 }), {
    pos: [0, S.hoodY, hoodZ],
    rot: [-0.022, 0, 0],
  });
  // power bulge with a shut line each side of it
  k.add('paint', profile(crown(0.34, 0.04, 0.03), hoodL - 0.44, { bevel: 0.012 }), {
    pos: [0, S.hoodY + 0.048, hoodZ - 0.04],
    rot: [-0.022, 0, 0],
  });
  k.addMirrored('gap', rbox(0.016, 0.05, hoodL - 0.42, 0.004), {
    pos: [0.352, S.hoodY + 0.05, hoodZ - 0.04],
    rot: [-0.022, 0, 0],
  });

  // hood shut lines to the fenders and the cowl
  k.addMirrored('gap', rbox(0.026, 0.07, hoodL, 0.005), { pos: [0.807, S.hoodY - 0.008, hoodZ] });
  k.add('gap', rbox(1.6, 0.07, 0.03, 0.005), { pos: [0, S.hoodY - 0.008, S.hoodRearZ - 0.016] });

  // Bolt-on louvred hood vents. Raised rather than cut in, because the hood is
  // one solid extrusion and a fake recess would just show hood surface.
  for (const side of [-1, 1]) {
    const vx = side * 0.52;
    const vz = hoodZ + 0.14;
    const vy = S.hoodY + 0.046;
    const rot = [-0.022, 0, 0];
    k.add('trim', rbox(0.3, 0.03, 0.36, 0.012), { pos: [vx, vy, vz], rot });
    k.add('trim', rbox(0.3, 0.05, 0.03, 0.008), { pos: [vx, vy + 0.024, vz + 0.165], rot });
    k.add('trim', rbox(0.3, 0.05, 0.03, 0.008), { pos: [vx, vy + 0.024, vz - 0.165], rot });
    k.add('trim', rbox(0.03, 0.05, 0.36, 0.008), { pos: [vx + 0.135, vy + 0.024, vz], rot });
    k.add('trim', rbox(0.03, 0.05, 0.36, 0.008), { pos: [vx - 0.135, vy + 0.024, vz], rot });
    k.add('gap', rbox(0.25, 0.012, 0.31, 0.003), { pos: [vx, vy + 0.012, vz], rot });
    for (let i = 0; i < 4; i++) {
      k.add('trimGloss', rbox(0.25, 0.013, 0.062, 0.004), {
        pos: [vx, vy + 0.034, vz + 0.108 - i * 0.072],
        rot: [-0.62, 0, 0],
      });
    }
    for (const dz of [-0.15, 0.15]) {
      for (const dx of [-0.12, 0.12]) {
        k.add('steelDark', rivet(0.011, 0.006), { pos: [vx + dx, vy + 0.016, vz + dz] });
      }
    }
  }
  // hood catches and hinges
  k.addMirrored('alu', rbox(0.07, 0.028, 0.11, 0.008), { pos: [0.45, S.hoodY + 0.045, S.hoodFrontZ - 0.07] });
  k.addMirrored('trimGloss', rbox(0.05, 0.05, 0.06, 0.012), { pos: [0.45, S.hoodY + 0.014, S.hoodFrontZ - 0.03] });
  k.addMirrored('steelDark', rbox(0.05, 0.05, 0.14, 0.01), { pos: [0.62, S.hoodY - 0.035, S.hoodRearZ + 0.05] });

  // fender crowns: the strip between the hood shut line and the flank
  k.addMirrored('paint', profile(
    [
      [-0.062, -0.07],
      [0.062, -0.07],
      [0.064, 0.004],
      [0.0, 0.026],
      [-0.06, 0.01],
    ],
    hoodL + 0.14,
    { bevel: 0.01 },
  ), { pos: [HW - 0.058, S.hoodY + 0.004, hoodZ - 0.05] });
  // Second brow line high on the fender crown. The strip between the arch and
  // the hood shut line is the one large panel the wheel camera fills its frame
  // with, and one crease at the beltline was not enough to break it up.
  k.addMirrored('paint', archFlare({
    radius: ARCH_R + 0.19,
    cz: S.frontAxleZ,
    sillY: 1.09,
    steps: 14,
    pad: 0.0,
    cap: false,
    section: [
      [0.0, 0.018],
      [0.03, 0.014],
      [0.03, -0.014],
      [0.0, -0.018],
    ],
  }), { pos: [HW - 0.03, 0, 0] });

  // cowl: a louvred plenum across the base of the screen with the wiper
  // spindles coming out of it
  k.add('trim', rbox(HW * 2 - 0.14, 0.075, 0.15, 0.022), { pos: [0, S.hoodY - 0.015, S.hoodRearZ - 0.07] });
  k.add('trimGloss', rbox(HW * 2 - 0.2, 0.022, 0.05, 0.008), { pos: [0, S.hoodY + 0.026, S.hoodRearZ - 0.115] });
  k.addMirrored('gap', gbox(0.52, 0.03, 0.11, 0.006), { pos: [0.36, S.hoodY + 0.03, S.hoodRearZ - 0.06] });
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      k.add('trimGloss', gbox(0.5, 0.014, 0.026, 0.005), {
        pos: [side * 0.36, S.hoodY + 0.038, S.hoodRearZ - 0.105 + i * 0.032],
        rot: [-0.55, 0, 0],
      });
    }
    // washer nozzle: a boss with two jets, sat on the cowl looking up the glass
    k.add('trimGloss', gbox(0.036, 0.016, 0.03, 0.007), { pos: [side * 0.5, S.hoodY + 0.038, S.hoodRearZ - 0.03] });
    for (const dx of [-0.009, 0.009]) {
      k.add('gap', new THREE.CylinderGeometry(0.0035, 0.0035, 0.012, 6), {
        pos: [side * 0.5 + dx, S.hoodY + 0.048, S.hoodRearZ - 0.032],
        rot: [-0.5, 0, 0],
      });
    }
  }
  // whip antenna off the fender top
  k.add('trim', rbox(0.055, 0.03, 0.055, 0.012), { pos: [HW - 0.06, S.hoodY + 0.028, S.hoodRearZ + 0.16] });
  k.add('trimGloss', new THREE.CylinderGeometry(0.004, 0.0085, 1.05, 8), {
    pos: [HW - 0.025, S.hoodY + 0.55, S.hoodRearZ + 0.02],
    rot: [-0.16, 0, -0.09],
  });
}

// --- front fascia: grille, lamp units, winch bumper ------------------------
function fascia(k) {
  // Body-colour surround built as horizontal bands with the two apertures left
  // open, so the grille and the lamps are holes in the front clip rather than
  // parts stuck onto its face.
  k.add('paint', rbox(1.77, 0.078, 0.1, 0.024), { pos: [0, AP_TOP + 0.039, FZ] });
  k.add('paint', rbox(1.77, 0.12, 0.1, 0.024), { pos: [0, AP_BOT - 0.06, FZ] });
  k.addMirrored('paint', rbox(0.065, 0.28, 0.1, 0.018), { pos: [0.53, LAMP_Y, FZ] });
  // sculpted brow over the top band
  k.add('paint', swage(1.72, 0.03), { pos: [0, AP_TOP + 0.062, FZ + 0.038], rot: [0, Math.PI / 2, 0] });

  // --- grille cavity ------------------------------------------------------
  const apH = AP_TOP - AP_BOT;
  recess(k, 'trim', { cy: LAMP_Y, cz: FZ - 0.008, w: GRILLE_HALF * 2 + 0.014, h: apH + 0.014, d: 0.11 });
  k.add('gap', rbox(GRILLE_HALF * 2, apH, 0.03, 0.006), { pos: [0, LAMP_Y, CAV_Z] });
  k.add('mesh', new THREE.PlaneGeometry(GRILLE_HALF * 2 - 0.02, apH - 0.02), {
    pos: [0, LAMP_Y, CAV_Z + 0.018],
  });
  // Fins with a machined leading edge. The bright vertical rhythm is what makes
  // a grille legible at a glance; a dark slot in a dark cavity does not.
  const fins = 9;
  for (let i = 0; i < fins; i++) {
    const x = (i - (fins - 1) / 2) * ((GRILLE_HALF * 2 - 0.05) / fins);
    k.add('trimGloss', rbox(0.042, apH - 0.03, 0.09, 0.008), { pos: [x, LAMP_Y, FIN_Z] });
    k.add('chrome', rbox(0.026, apH - 0.04, 0.022, 0.005), { pos: [x, LAMP_Y, FIN_Z + 0.05] });
  }
  // Horizontal chrome header and sill across the slots, plus a centre bar. The
  // nose sits in shade from this sun angle, so the only things that read at a
  // glance are the parts bright enough to pick the sky up out of the env map.
  for (const [y, th] of [
    [LAMP_Y + apH * 0.5 - 0.022, 0.03],
    [LAMP_Y, 0.024],
    [LAMP_Y - apH * 0.5 + 0.022, 0.03],
  ]) {
    k.add('chrome', rbox(GRILLE_HALF * 2 - 0.02, th, 0.05, 0.008), { pos: [0, y, FIN_Z + 0.036] });
  }
  // badge sits on the centre bar, bedded on a machined plinth
  k.add('alu', rbox(0.3, 0.088, 0.03, 0.012), { pos: [0, LAMP_Y, FIN_Z + 0.07] });
  k.add('decalBadge', new THREE.PlaneGeometry(0.26, 0.078), { pos: [0, LAMP_Y, FIN_Z + 0.087] });

  // --- headlamp units ----------------------------------------------------
  // One designed assembly a side: a stepped reflector bowl looking out of a
  // lined recess, a projector, a marker bar, and a nearly clear cover lens.
  // Three separate lenses to an aperture rather than one deep bowl. A single
  // recessed reflector sits in the body's own shadow at this sun angle and dies;
  // a cluster of circular lenses close to the mouth stays legible, and reads as
  // a designed unit instead of a hole with a mirror at the back of it.
  for (const side of [-1, 1]) {
    const hx = side * LAMP_X;
    const mainX = hx + side * 0.052;
    const stackX = hx - side * 0.1;
    recess(k, 'trim', { cx: hx, cy: LAMP_Y, cz: FZ - 0.008, w: LAMP_W - 0.006, h: apH - 0.006, d: 0.11 });
    // shroud has to clear the back of the bowls, or it fills them with black
    k.add('trimGloss', rbox(LAMP_W - 0.03, apH - 0.03, 0.05, 0.01), { pos: [hx, LAMP_Y, FZ - 0.05] });

    // main beam: shallow stepped bowl, projector hub, fluted cover lens
    reflectorBowl(k, { cx: mainX, cy: LAMP_Y, cz: FZ + 0.03, r: 0.086, depth: 0.03 });
    k.add('trimGloss', new THREE.CylinderGeometry(0.028, 0.022, 0.03, 16), {
      pos: [mainX, LAMP_Y, FZ + 0.002],
      rot: [Math.PI / 2, 0, 0],
    });
    k.add('headlight', new THREE.SphereGeometry(0.022, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), {
      pos: [mainX, LAMP_Y, FZ + 0.016],
      rot: [-Math.PI / 2, 0, 0],
    });
    k.add('chrome', new THREE.TorusGeometry(0.024, 0.006, 6, 18), { pos: [mainX, LAMP_Y, FZ + 0.018] });
    k.add('lensClear', lensDome(0.085), { pos: [mainX, LAMP_Y, FZ + 0.03] });
    k.add('chrome', new THREE.TorusGeometry(0.087, 0.008, 8, 24), { pos: [mainX, LAMP_Y, FZ + 0.032] });

    // inboard stack: amber indicator over a clear driving lamp
    for (const [dy, lens] of [[0.062, 'amber'], [-0.062, 'lensClear']]) {
      const sy = LAMP_Y + dy;
      reflectorBowl(k, { cx: stackX, cy: sy, cz: FZ + 0.026, r: 0.046, depth: 0.016, steps: 2, seg: 16 });
      if (lens === 'lensClear') {
        k.add('headlight', new THREE.SphereGeometry(0.013, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), {
          pos: [stackX, sy, FZ + 0.01],
          rot: [-Math.PI / 2, 0, 0],
        });
      }
      k.add(lens, lensDome(0.045), { pos: [stackX, sy, FZ + 0.026] });
      k.add('chrome', new THREE.TorusGeometry(0.047, 0.007, 6, 20), { pos: [stackX, sy, FZ + 0.028] });
    }
    // adjuster screws in the corners the lenses cannot reach
    for (const dy of [-1, 1]) {
      k.add('alu', bolt(0.011, 0.009), {
        pos: [stackX, LAMP_Y + dy * 0.116, FZ + 0.016],
        rot: [Math.PI / 2, 0, 0],
      });
    }
    // chrome bezel ring around the aperture mouth
    recess(k, 'chrome', {
      cx: hx,
      cy: LAMP_Y,
      cz: FZ + 0.046,
      w: LAMP_W - 0.008,
      h: apH - 0.008,
      d: 0.022,
      wall: 0.019,
    });

    // fender-top marker lamp
    k.add('trim', new THREE.CylinderGeometry(0.038, 0.04, 0.024, 14), {
      pos: [side * 0.79, S.hoodY + 0.026, S.hoodFrontZ - 0.16],
    });
    k.add('amber', new THREE.CylinderGeometry(0.024, 0.029, 0.028, 14), {
      pos: [side * 0.79, S.hoodY + 0.045, S.hoodFrontZ - 0.16],
    });
    k.add('chrome', new THREE.TorusGeometry(0.031, 0.005, 6, 14), {
      pos: [side * 0.79, S.hoodY + 0.038, S.hoodFrontZ - 0.16],
      rot: [Math.PI / 2, 0, 0],
    });
  }

  // side intakes let into the lower band, and a screened centre slot between the
  // grille and the top of the bumper
  k.addMirrored('gap', rbox(0.3, 0.075, 0.05, 0.008), { pos: [0.55, AP_BOT - 0.06, FZ + 0.036] });
  k.addMirrored('mesh', new THREE.PlaneGeometry(0.28, 0.06), { pos: [0.55, AP_BOT - 0.06, FZ + 0.05] });
  k.add('gap', rbox(0.92, 0.062, 0.05, 0.006), { pos: [0, AP_BOT - 0.058, FZ + 0.036] });
  k.add('mesh', new THREE.PlaneGeometry(0.88, 0.05), { pos: [0, AP_BOT - 0.058, FZ + 0.05] });
  k.add('chrome', rbox(0.94, 0.012, 0.03, 0.004), { pos: [0, AP_BOT - 0.02, FZ + 0.05] });

  // --- winch bumper -------------------------------------------------------
  // Full-width lower bar with two towers, and the centre left open so the
  // winch in details.js sits in a cradle instead of inside a solid block.
  const bz = 2.4;
  k.add('steelDark', rbox(1.9, 0.13, 0.21, 0.035), { pos: [0, 0.755, bz] });
  k.addMirrored('steelDark', rbox(0.44, 0.28, 0.2, 0.04), { pos: [0.7, 0.86, bz] });
  k.addMirrored('steelDark', rbox(0.2, 0.3, 0.34, 0.05), { pos: [0.92, 0.87, bz - 0.13], rot: [0, -0.28, 0] });
  k.add('gap', rbox(0.9, 0.2, 0.05, 0.006), { pos: [0, 0.9, bz - 0.1] });
  // Machined chamfer along the top and bottom of the whole bar, and a brushed
  // rub rail across it: a fabricated bumper is folded plate, not one dark block.
  // One chamfer along the top fold and chequer plate across the lower face. Two
  // full-width chamfers read as bolted-on tubing rather than as folded plate,
  // and the face below them was the last big dark flat on the nose.
  k.add('steel', swage(1.88, 0.024), { pos: [0, 0.822, bz + 0.104], rot: [0, Math.PI / 2, 0] });
  k.add('plate', rbox(1.86, 0.075, 0.024, 0.005), { pos: [0, 0.735, bz + 0.104] });
  for (let i = -4; i <= 4; i++) {
    k.add('steel', bolt(0.012, 0.009), { pos: [i * 0.21, 0.735, bz + 0.118], rot: [Math.PI / 2, 0, 0] });
  }
  k.addMirrored('alu', rbox(0.4, 0.03, 0.026, 0.005), { pos: [0.7, 0.955, bz + 0.104] });
  // recessed panel in each tower face, so the biggest flat on the nose is not
  // one dark rectangle either side of the lamp
  k.addMirrored('gap', rbox(0.16, 0.16, 0.04, 0.006), { pos: [0.56, 0.855, bz + 0.096] });
  k.addMirrored('plate', rbox(0.13, 0.13, 0.04, 0.008), { pos: [0.56, 0.855, bz + 0.106] });
  for (const dx of [-0.62, -0.5, 0.5, 0.62]) {
    for (const dy of [-0.048, 0.048]) {
      k.add('steel', bolt(0.01, 0.008), { pos: [dx, 0.855 + dy, bz + 0.12], rot: [Math.PI / 2, 0, 0] });
    }
  }
  for (const dx of [-0.62, -0.78, 0.62, 0.78]) {
    k.add('steel', bolt(0.014, 0.011), { pos: [dx, 0.955, bz + 0.115], rot: [Math.PI / 2, 0, 0] });
  }
  // chequer-plate tread on the tower tops, bolted down
  k.addMirrored('plate', rbox(0.42, 0.022, 0.22, 0.006), { pos: [0.7, 1.012, bz - 0.005] });
  for (const dx of [-0.86, -0.7, -0.54, 0.54, 0.7, 0.86]) {
    k.add('steel', bolt(0.016, 0.012), { pos: [dx, 1.02, bz - 0.005] });
  }
  // skid plate raked under the bumper
  k.add('plate', rbox(1.3, 0.03, 0.46, 0.01), { pos: [0, 0.63, bz - 0.16], rot: [0.5, 0, 0] });
  k.addMirrored('steelDark', rbox(0.09, 0.2, 0.09, 0.02), { pos: [0.52, 0.63, bz - 0.3] });
  // recovery points and fog lamps
  for (const side of [-1, 1]) {
    k.add('steelDark', rbox(0.13, 0.17, 0.16, 0.02), { pos: [side * 0.34, 0.76, bz + 0.03] });
    k.add('paintAccent', new THREE.TorusGeometry(0.055, 0.017, 10, 18, Math.PI * 1.4), {
      pos: [side * 0.34, 0.73, bz + 0.12],
      rot: [Math.PI / 2, 0, 0.45],
    });
    k.add('steel', new THREE.CylinderGeometry(0.015, 0.015, 0.12, 10), {
      pos: [side * 0.34, 0.785, bz + 0.12],
      rot: [0, 0, Math.PI / 2],
    });
    const fz = bz + 0.1;
    k.add('trim', new THREE.CylinderGeometry(0.068, 0.062, 0.08, 18, 1, true), {
      pos: [side * 0.74, 0.855, fz - 0.03],
      rot: [Math.PI / 2, 0, 0],
    });
    reflectorBowl(k, { cx: side * 0.74, cy: 0.855, cz: fz, r: 0.056, depth: 0.022, steps: 2, seg: 18 });
    k.add('trimGloss', new THREE.CylinderGeometry(0.018, 0.014, 0.026, 12), {
      pos: [side * 0.74, 0.855, fz - 0.03],
      rot: [Math.PI / 2, 0, 0],
    });
    k.add('headlight', new THREE.SphereGeometry(0.014, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), {
      pos: [side * 0.74, 0.855, fz - 0.018],
      rot: [-Math.PI / 2, 0, 0],
    });
    k.add('chrome', new THREE.TorusGeometry(0.057, 0.007, 8, 20), { pos: [side * 0.74, 0.855, fz - 0.002] });
    k.add('lensClear', lensDome(0.056, 0.4, 18), { pos: [side * 0.74, 0.855, fz + 0.008] });
    k.add('trim', new THREE.TorusGeometry(0.064, 0.012, 8, 18), { pos: [side * 0.74, 0.855, fz + 0.012] });
    // stone guard over the lens, bolted to the ring
    for (const dx of [-0.032, 0.032]) {
      k.add('alu', rbox(0.007, 0.1, 0.007, 0.002), { pos: [side * 0.74 + dx, 0.855, fz + 0.026] });
    }
    k.add('alu', rbox(0.096, 0.007, 0.007, 0.002), { pos: [side * 0.74, 0.855, fz + 0.026] });
    for (let i = 0; i < 3; i++) {
      const a = -0.6 + i * 0.6;
      k.add('alu', bolt(0.011, 0.009), {
        pos: [side * 0.74 + Math.sin(a) * 0.074, 0.855 + Math.cos(a) * 0.074, fz + 0.008],
        rot: [Math.PI / 2, 0, 0],
      });
    }
  }
}

// --- windscreen wipers ------------------------------------------------------
/**
 * A parked pair, opposed, sitting on the outside of the glass.
 *
 * Everything is laid out in the pane's own frame: `sp(x, s, o)` takes a
 * position across the screen, a distance up the rake and a standoff along the
 * pane normal. Three's default Euler order is XYZ, i.e. Rx·Ry·Rz, so a twist
 * put in Z happens *before* the rake in X — which means one rot triple
 * `[RAKE, 0, twist]` places a part built flat in XY anywhere on the pane at any
 * in-plane angle. The alternative is a quaternion per greeble.
 */
function wipers(k) {
  const zB = S.windshieldBottomZ;
  const zT = S.windshieldTopZ;
  const yB = S.beltlineY;
  const yT = S.roofY;
  const dz = zB - zT;
  const dy = yT - yB;
  const len = Math.hypot(dz, dy);
  const uy = dy / len;
  const uz = -dz / len;
  const RAKE = Math.atan2(dy, dz) - Math.PI / 2;
  const sp = (x, s, o = 0) => [x, yB + uy * s + uz * -o, zB + uz * s + uy * o];

  // Parked. The spindles come up out of the cowl plenum and the pair lies along
  // the bottom edge of the pane rising slightly inboard — the opposed "clap
  // hands" pattern an 80s truck with two separate motors ends up with. From the
  // driver's seat the dash top hides most of this, which is also true in a real
  // one; where it has to read is the hero and nose cameras, looking down over
  // the bonnet at the scuttle.
  for (const side of [-1, 1]) {
    const px = side * 0.585;
    const ps = 0.024;
    // spindle out of the cowl, with its nut
    k.add('trimGloss', new THREE.CylinderGeometry(0.026, 0.03, 0.055, 14), {
      pos: sp(px, ps, 0.022),
      rot: [RAKE + Math.PI / 2, 0, 0],
    });
    k.add('steelDark', new THREE.CylinderGeometry(0.014, 0.014, 0.05, 10), {
      pos: sp(px, ps, 0.05),
      rot: [RAKE + Math.PI / 2, 0, 0],
    });

    // arm: a cranked lower section into a slim upper section, both standing off
    // the glass so the blade is the only thing touching it
    const seg = (x0, s0, x1, s1, o, w, t, key) => {
      const l = Math.hypot(x1 - x0, s1 - s0);
      k.add(key, gbox(l, w, t, Math.min(w, t) * 0.3), {
        pos: sp((x0 + x1) * 0.5, (s0 + s1) * 0.5, o),
        rot: [RAKE, 0, Math.atan2(s1 - s0, x1 - x0)],
      });
      return l;
    };
    seg(px, ps, side * 0.46, 0.064, 0.042, 0.032, 0.019, 'trimGloss');
    seg(side * 0.478, 0.058, side * 0.15, 0.132, 0.034, 0.021, 0.014, 'trimGloss');
    // tension spring bridging the two sections
    k.add('steel', new THREE.CylinderGeometry(0.008, 0.008, 0.085, 8), {
      pos: sp(side * 0.4, 0.082, 0.028),
      rot: [RAKE, 0, Math.atan2(0.026, -side * 0.13) - Math.PI / 2],
    });

    // blade: rubber element, metal backing strip, claw bridge and four claws
    const b0x = side * 0.6;
    const b0s = 0.043;
    const b1x = side * 0.135;
    const b1s = 0.152;
    const tw = Math.atan2(b1s - b0s, b1x - b0x);
    const bl = Math.hypot(b1x - b0x, b1s - b0s);
    const bx = (b0x + b1x) * 0.5;
    const bs = (b0s + b1s) * 0.5;
    k.add('trim', gbox(bl, 0.016, 0.015, 0.004), { pos: sp(bx, bs, 0.012), rot: [RAKE, 0, tw] });
    k.add('alu', gbox(bl - 0.01, 0.009, 0.007, 0.002), { pos: sp(bx, bs, 0.024), rot: [RAKE, 0, tw] });
    k.add('trimGloss', gbox(bl * 0.62, 0.019, 0.014, 0.004), { pos: sp(bx, bs, 0.032), rot: [RAKE, 0, tw] });
    for (let i = 0; i < 4; i++) {
      const t = 0.12 + (i / 3) * 0.76;
      k.add('trimGloss', gbox(0.014, 0.03, 0.016, 0.004), {
        pos: sp(b0x + (b1x - b0x) * t, b0s + (b1s - b0s) * t, 0.021),
        rot: [RAKE, 0, tw],
      });
    }
    for (const t of [0, 1]) {
      k.add('trimGloss', gbox(0.018, 0.018, 0.016, 0.005), {
        pos: sp(b0x + (b1x - b0x) * t, b0s + (b1s - b0s) * t, 0.017),
        rot: [RAKE, 0, tw],
      });
    }
  }
}

// --- cab --------------------------------------------------------------------
function cab(k) {
  const cabL = S.cabFrontZ - S.cabRearZ;
  const cabZ = (S.cabFrontZ + S.cabRearZ) * 0.5;
  const beltY = S.beltlineY;
  const wsBottom = S.windshieldBottomZ;
  const wsTop = S.windshieldTopZ;

  // A pillars, each with the rubber channel the screen sits in
  for (const side of [-1, 1]) {
    k.add('paint', tube(
      [
        [side * (HW - 0.035), beltY - 0.02, wsBottom + 0.03],
        [side * (HW - 0.07), (beltY + S.roofY) * 0.5, (wsBottom + wsTop) * 0.5],
        [side * (HW - 0.105), S.roofY - 0.03, wsTop],
      ],
      0.055,
      12,
    ));
    k.add('trim', tube(
      [
        [side * (HW - 0.088), beltY - 0.02, wsBottom + 0.002],
        [side * (HW - 0.118), (beltY + S.roofY) * 0.5, (wsBottom + wsTop) * 0.5 - 0.03],
        [side * (HW - 0.152), S.roofY - 0.03, wsTop - 0.03],
      ],
      0.019,
      8,
    ));
  }
  k.add('paint', rbox(HW * 2 - 0.15, 0.1, 0.12, 0.032), { pos: [0, S.roofY - 0.045, wsTop + 0.025] });
  k.add('trim', rbox(HW * 2 - 0.21, 0.045, 0.05, 0.014), { pos: [0, S.roofY - 0.1, wsTop + 0.052] });

  const wsAngle = Math.atan2(S.roofY - beltY, wsBottom - wsTop);
  const wsLen = Math.hypot(S.roofY - beltY, wsBottom - wsTop);
  k.add('glass', new THREE.PlaneGeometry(HW * 2 - 0.22, wsLen - 0.03), {
    pos: [0, (S.roofY + beltY) * 0.5 - 0.01, (wsBottom + wsTop) * 0.5],
    rot: [wsAngle - Math.PI / 2, 0, 0],
  });

  // B pillar and rear cab wall
  for (const side of [-1, 1]) {
    k.add('paint', rbox(0.09, S.roofY - beltY, 0.1, 0.026), {
      pos: [side * (HW - 0.032), (S.roofY + beltY) * 0.5, S.cabRearZ + 0.055],
    });
    k.add('trim', rbox(0.05, S.roofY - beltY - 0.06, 0.05, 0.014), {
      pos: [side * (HW - 0.078), (S.roofY + beltY) * 0.5, S.cabRearZ + 0.09],
    });
  }
  k.add('paint', rbox(HW * 2 - 0.06, S.roofY - beltY - 0.02, 0.08, 0.03), {
    pos: [0, (S.roofY + beltY) * 0.5, S.cabRearZ + 0.02],
  });
  k.add('gap', rbox(1.32, 0.54, 0.05, 0.008), { pos: [0, beltY + 0.34, S.cabRearZ + 0.045] });
  k.add('glassDark', new THREE.PlaneGeometry(1.24, 0.46), { pos: [0, beltY + 0.34, S.cabRearZ + 0.07] });
  k.add('trim', rbox(1.36, 0.05, 0.045, 0.012), { pos: [0, beltY + 0.6, S.cabRearZ + 0.052] });
  k.add('trim', rbox(1.36, 0.045, 0.045, 0.012), { pos: [0, beltY + 0.09, S.cabRearZ + 0.052] });
  k.add('trim', rbox(0.34, 0.07, 0.05, 0.014), { pos: [0, S.roofY - 0.11, S.cabRearZ + 0.02] });
  k.add('taillight', rbox(0.3, 0.045, 0.03, 0.008), { pos: [0, S.roofY - 0.11, S.cabRearZ - 0.008] });

  // --- door glass: two panes with a real division bar --------------------
  const paneTop = S.roofY - 0.1;
  for (const side of [-1, 1]) {
    for (const [zf, zr] of [
      [0.9, 0.06],
      [0.02, S.cabRearZ + 0.07],
    ]) {
      const len = zf - zr;
      k.add('glass', new THREE.PlaneGeometry(len, paneTop - beltY - 0.07), {
        pos: [side * (HW - 0.045), (paneTop + beltY) * 0.5 - 0.03, (zf + zr) * 0.5],
        rot: [0, side * Math.PI * 0.5, 0],
      });
      k.add('trim', rbox(0.05, 0.028, len + 0.02, 0.008), {
        pos: [side * (HW - 0.03), paneTop - 0.022, (zf + zr) * 0.5],
      });
      k.add('trim', rbox(0.05, 0.026, len, 0.008), {
        pos: [side * (HW - 0.03), beltY + 0.05, (zf + zr) * 0.5],
      });
    }
    k.add('trim', rbox(0.055, paneTop - beltY, 0.03, 0.01), {
      pos: [side * (HW - 0.03), (paneTop + beltY) * 0.5, 0.04],
    });
  }

  // --- mirrors -----------------------------------------------------------
  // Head on a double stay off a bolted door bracket. A single tube reads as a
  // stalk; the second, lower stay is what makes it a truck mirror.
  for (const side of [-1, 1]) {
    const mz = S.cabFrontZ - 0.11;
    const bx = side * (HW + 0.012);
    k.add('trimGloss', gbox(0.028, 0.19, 0.115, 0.01), { pos: [bx, beltY + 0.08, mz] });
    k.add('trim', gbox(0.055, 0.13, 0.095, 0.018), { pos: [side * (HW + 0.03), beltY + 0.11, mz] });
    for (const dy of [-0.058, 0.058]) {
      k.add('steel', bolt(0.011, 0.008), {
        pos: [side * (HW + 0.026), beltY + 0.08 + dy, mz],
        rot: [0, 0, -side * Math.PI / 2],
      });
    }
    for (const [y0, y1] of [[beltY + 0.155, beltY + 0.31], [beltY + 0.055, beltY + 0.17]]) {
      k.add('trimGloss', tube(
        [
          [side * (HW + 0.045), y0, mz],
          [side * (HW + 0.14), (y0 + y1) * 0.5 + 0.01, mz + 0.01],
          [side * (HW + 0.215), y1, mz + 0.012],
        ],
        0.021,
        9,
      ));
    }
    k.add('trim', gbox(0.075, 0.255, 0.17, 0.03), { pos: [side * (HW + 0.245), beltY + 0.245, mz + 0.012] });
    k.add('gap', gbox(0.03, 0.222, 0.146, 0.008), { pos: [side * (HW + 0.276), beltY + 0.245, mz + 0.012] });
    k.add('chrome', new THREE.PlaneGeometry(0.142, 0.212), {
      pos: [side * (HW + 0.288), beltY + 0.245, mz + 0.012],
      rot: [0, side * Math.PI * 0.5, 0],
    });
    // convex spotter under the main head, and the front repeater on the shell
    k.add('trim', new THREE.CylinderGeometry(0.048, 0.05, 0.03, 16), {
      pos: [side * (HW + 0.268), beltY + 0.088, mz + 0.012],
      rot: [0, 0, side * Math.PI / 2],
    });
    k.add('chrome', new THREE.SphereGeometry(0.05, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), {
      pos: [side * (HW + 0.278), beltY + 0.088, mz + 0.012],
      rot: [0, 0, -side * Math.PI / 2],
      scale: [1, 0.34, 1],
    });
    k.add('amber', gbox(0.022, 0.026, 0.1, 0.006), {
      pos: [side * (HW + 0.276), beltY + 0.372, mz + 0.012],
    });
  }

  // --- roof --------------------------------------------------------------
  k.add('paintRoof', profile(
    [
      [-0.82, -0.075],
      [0.82, -0.075],
      [0.82, 0.0],
      [0.6, 0.03],
      [0.31, 0.05],
      [0, 0.056],
      [-0.31, 0.05],
      [-0.6, 0.03],
      [-0.82, 0.0],
    ],
    cabL + 0.06,
    { bevel: 0.014 },
  ), { pos: [0, S.roofY, cabZ - 0.02] });
  // drip rail along the roof edge, standing proud of the shoulder so it throws a
  // line down the side of the cab rather than hiding inside the roof bevel
  k.addMirrored('trim', rbox(0.05, 0.05, cabL + 0.02, 0.012), { pos: [HW - 0.034, S.roofY - 0.008, cabZ - 0.02] });
  k.addMirrored('trimGloss', rbox(0.026, 0.016, cabL - 0.02, 0.005), {
    pos: [HW - 0.014, S.roofY + 0.014, cabZ - 0.02],
  });
  for (const z of [-0.55, -0.05, 0.45]) {
    k.add('paintRoof', swage(HW * 2 - 0.44, 0.026), {
      pos: [0, S.roofY + 0.052, cabZ + z],
      rot: [0, Math.PI / 2, 0],
    });
  }
  k.add('trim', rbox(0.055, 0.03, 0.055, 0.012), { pos: [-(HW - 0.14), S.roofY + 0.07, S.cabRearZ + 0.18] });
  k.add('trimGloss', new THREE.CylinderGeometry(0.005, 0.009, 0.62, 8), {
    pos: [-(HW - 0.15), S.roofY + 0.38, S.cabRearZ + 0.14],
    rot: [-0.14, 0, 0.06],
  });
}

// --- bed --------------------------------------------------------------------
function bed(k) {
  const bedL = S.bedFrontZ - S.bedRearZ;
  const bedZ = (S.bedFrontZ + S.bedRearZ) * 0.5;
  const railY = S.bedTopY + 0.03;

  // spray-in liner: ribbed floor and inner walls
  k.add('bedLiner', rbox(HW * 2 - 0.18, 0.045, bedL - 0.05, 0.012), { pos: [0, S.bedFloorY, bedZ] });
  for (let i = 0; i < 7; i++) {
    k.add('bedLiner', rbox(0.06, 0.028, bedL - 0.1, 0.008), {
      pos: [-0.72 + i * 0.24, S.bedFloorY + 0.028, bedZ],
    });
  }
  k.addMirrored('bedLiner', rbox(0.05, S.bedTopY - S.bedFloorY + 0.06, bedL - 0.04, 0.012), {
    pos: [HW - 0.115, (S.bedTopY + S.bedFloorY) * 0.5, bedZ],
  });
  k.add('bedLiner', rbox(HW * 2 - 0.2, S.bedTopY - S.bedFloorY + 0.06, 0.05, 0.012), {
    pos: [0, (S.bedTopY + S.bedFloorY) * 0.5, S.bedFrontZ - 0.06],
  });
  // inner rail lip and tie-downs, so the bed is not an open dark box
  k.addMirrored('alu', rbox(0.04, 0.016, bedL - 0.08, 0.005), {
    pos: [HW - 0.135, S.bedTopY + 0.012, bedZ],
  });
  for (const side of [-1, 1]) {
    for (const z of [-0.52, 0.42]) {
      k.add('steelDark', rbox(0.04, 0.07, 0.08, 0.012), {
        pos: [side * (HW - 0.125), S.bedFloorY + 0.11, bedZ + z],
      });
      k.add('steel', new THREE.TorusGeometry(0.03, 0.009, 8, 14), {
        pos: [side * (HW - 0.155), S.bedFloorY + 0.115, bedZ + z],
        rot: [0, Math.PI / 2, 0],
      });
    }
  }

  // bedside shoulder and rail cap
  k.addMirrored('paint', rbox(0.1, 0.06, bedL, 0.02), { pos: [HW - 0.085, S.bedTopY + 0.005, bedZ] });
  k.addMirrored('trim', rbox(0.15, 0.055, bedL, 0.02), { pos: [HW - 0.045, railY, bedZ] });
  k.addMirrored('alu', rbox(0.06, 0.018, bedL - 0.06, 0.006), { pos: [HW - 0.005, railY + 0.032, bedZ] });
  for (const z of [-0.42, 0.16]) {
    k.addMirrored('gap', rbox(0.09, 0.03, 0.17, 0.006), { pos: [HW - 0.045, railY + 0.021, bedZ + z] });
    k.addMirrored('plate', rbox(0.085, 0.014, 0.16, 0.004), { pos: [HW - 0.045, railY + 0.03, bedZ + z] });
  }
  for (const side of [-1, 1]) {
    for (const z of [-0.5, 0.4]) {
      k.add('steelDark', rbox(0.05, 0.08, 0.09, 0.014), { pos: [side * (HW - 0.13), S.bedTopY - 0.1, bedZ + z] });
      k.add('steel', new THREE.TorusGeometry(0.026, 0.008, 8, 16), {
        pos: [side * (HW - 0.16), S.bedTopY - 0.1, bedZ + z],
        rot: [0, Math.PI / 2, 0],
      });
    }
  }

  // Vertical stampings between the bed's two horizontal creases. Everything
  // else on the flank runs fore-and-aft, so the middle of the bedside stayed a
  // plain band until something crossed it.
  for (const z of [-1.24, -1.66, -2.08]) {
    k.addMirrored('paint', swage(S.bedTopY - SILL_Y - 0.34, 0.03), {
      pos: [HW + 0.002, (S.bedTopY + SILL_Y) * 0.5 - 0.03, z],
      rot: [Math.PI / 2, 0, 0],
    });
  }

  // front bed wall, outside face
  k.add('paint', rbox(HW * 2 - 0.06, S.bedTopY - SILL_Y + 0.04, 0.07, 0.026), {
    pos: [0, (S.bedTopY + SILL_Y) * 0.5, S.bedFrontZ - 0.015],
  });
  k.add('trim', rbox(HW * 2 - 0.1, 0.05, 0.11, 0.016), { pos: [0, railY, S.bedFrontZ - 0.02] });

  // --- tailgate: a stamped border round a recessed centre field ----------
  const tgY0 = 0.99;
  const tgY1 = S.bedTopY;
  const tgCy = (tgY0 + tgY1) * 0.5;
  const outer = -2.4; // outermost skin plane, rear face at outer - 0.035
  // The recess liner has to sit *behind* the field it frames. It was 50 mm deep
  // at the same station as the field, so the field, the applique, the swages and
  // the model name were all enclosed inside an opaque near-black box and the
  // whole gate came back as a void from the rear camera.
  const fieldZ = outer + 0.03; // field centre; its rear face is at outer - 0.005
  const fieldFace = fieldZ - 0.035;
  k.add('paint', rbox(1.62, 0.075, 0.07, 0.022), { pos: [0, tgY1 - 0.038, outer] });
  k.add('paint', rbox(1.62, 0.07, 0.07, 0.022), { pos: [0, tgY0 + 0.032, outer] });
  k.addMirrored('paint', rbox(0.09, tgY1 - tgY0, 0.07, 0.022), { pos: [0.765, tgCy, outer] });
  k.add('gap', rbox(1.5, tgY1 - tgY0 - 0.09, 0.05, 0.006), { pos: [0, tgCy, outer + 0.055] });
  k.add('paint', rbox(1.44, tgY1 - tgY0 - 0.15, 0.07, 0.02), { pos: [0, tgCy, fieldZ] });
  k.add('paint', swage(1.4, 0.034), { pos: [0, tgCy + 0.105, fieldFace + 0.008], rot: [0, Math.PI / 2, 0] });
  k.add('paint', swage(1.4, 0.026), { pos: [0, tgCy - 0.135, fieldFace + 0.008], rot: [0, Math.PI / 2, 0] });
  k.add('decalName', new THREE.PlaneGeometry(1.14, 0.29), {
    pos: [0, tgCy - 0.02, fieldFace - 0.006],
    rot: [0, Math.PI, 0],
  });
  // Machined applique across the top of the field, and a diamond-plate kick
  // strip across the bottom. The tailgate faces away from the sun in every rear
  // shot, so it needs bare metal on it to catch the sky.
  k.add('alu', rbox(1.3, 0.03, 0.026, 0.006), { pos: [0, tgY1 - 0.055, fieldFace - 0.006] });
  for (const dx of [-0.6, -0.2, 0.2, 0.6]) {
    k.add('steel', bolt(0.012, 0.009), { pos: [dx, tgY1 - 0.055, fieldFace - 0.019], rot: [-Math.PI / 2, 0, 0] });
  }
  k.add('plate', rbox(1.36, 0.05, 0.022, 0.006), { pos: [0, tgY0 + 0.032, outer - 0.04] });
  // handle in a recess, hinges, latch strikers, top cap
  k.add('gap', rbox(0.34, 0.11, 0.05, 0.01), { pos: [0.3, tgY1 - 0.14, fieldFace + 0.03] });
  k.add('trimGloss', rbox(0.3, 0.075, 0.07, 0.018), { pos: [0.3, tgY1 - 0.145, fieldFace - 0.012] });
  k.add('chrome', rbox(0.24, 0.032, 0.04, 0.008), { pos: [0.3, tgY1 - 0.14, fieldFace - 0.042] });
  k.addMirrored('trim', rbox(0.16, 0.06, 0.08, 0.014), { pos: [0.64, tgY0 + 0.01, outer + 0.05] });
  k.addMirrored('steelDark', new THREE.CylinderGeometry(0.02, 0.02, 0.09, 12), {
    pos: [0.7, tgY0 + 0.01, outer + 0.03],
    rot: [0, 0, Math.PI / 2],
  });
  k.add('trim', rbox(1.64, 0.05, 0.11, 0.016), { pos: [0, railY, outer + 0.03] });
  k.add('alu', rbox(1.6, 0.016, 0.05, 0.005), { pos: [0, railY + 0.032, outer + 0.012] });

  // panel below the tailgate, closing the rear
  k.add('paint', rbox(HW * 2 - 0.08, tgY0 - SILL_Y + 0.04, 0.06, 0.022), {
    pos: [0, (tgY0 + SILL_Y) * 0.5, outer + 0.03],
  });

  // --- tail lamps: vertical units in the rear corners --------------------
  // Same construction as the front clusters: a chromed bezel round the mouth of
  // a lined aperture, with a reflector behind each lens. The rear of the truck
  // spends most of its screen time inside the dust plume, so the lamps need
  // brightwork round them or nothing back here registers at all.
  for (const side of [-1, 1]) {
    const tx = side * 0.735;
    const ty = 1.2;
    const lw = 0.235;
    const lh = 0.44;
    k.add('gap', rbox(0.275, 0.48, 0.08, 0.008), { pos: [tx, ty, outer + 0.03] });
    k.add('trimGloss', rbox(lw, lh, 0.075, 0.018), { pos: [tx, ty, outer + 0.032] });
    for (const [dy, h, key] of [
      [0.13, 0.16, 'taillight'],
      [-0.01, 0.1, 'amber'],
      [-0.13, 0.09, 'reflectorRed'],
    ]) {
      k.add('reflector', rbox(lw - 0.06, h - 0.018, 0.02, 0.005), { pos: [tx, ty + dy, outer + 0.006] });
      k.add(key, rbox(lw - 0.05, h, 0.036, 0.01), { pos: [tx, ty + dy, outer - 0.016] });
      k.add('chrome', rbox(lw - 0.03, 0.011, 0.026, 0.004), {
        pos: [tx, ty + dy + h * 0.5 + 0.014, outer - 0.014],
      });
    }
    recess(k, 'chrome', {
      cx: tx,
      cy: ty,
      cz: outer - 0.022,
      w: lw + 0.026,
      h: lh + 0.03,
      d: 0.02,
      wall: 0.018,
    });
    for (const dy of [0.235, -0.235]) {
      k.add('steel', bolt(0.012, 0.009), { pos: [tx, ty + dy, outer - 0.01], rot: [-Math.PI / 2, 0, 0] });
    }
  }

  // --- rear step bumper ---------------------------------------------------
  const rz = -2.55;
  k.add('steelDark', rbox(1.86, 0.2, 0.19, 0.04), { pos: [0, 0.84, rz] });
  k.add('plate', rbox(0.62, 0.024, 0.2, 0.007), { pos: [0, 0.952, rz] });
  k.addMirrored('plate', rbox(0.42, 0.024, 0.2, 0.007), { pos: [0.66, 0.952, rz] });
  k.addMirrored('steelDark', rbox(0.16, 0.24, 0.24, 0.035), { pos: [0.84, 0.83, rz + 0.03], rot: [0, 0.2, 0] });
  k.add('gap', rbox(0.44, 0.14, 0.06, 0.006), { pos: [0, 0.84, rz + 0.06] });
  // hitch receiver, drawbar and ball
  k.add('steelDark', rbox(0.16, 0.15, 0.44, 0.025), { pos: [0, 0.7, rz + 0.17] });
  k.add('steelDark', rbox(0.1, 0.1, 0.12, 0.014), { pos: [0, 0.7, rz - 0.11] });
  k.add('steel', new THREE.CylinderGeometry(0.028, 0.028, 0.14, 12), { pos: [0, 0.79, rz - 0.14] });
  k.add('steel', new THREE.SphereGeometry(0.04, 14, 10), { pos: [0, 0.87, rz - 0.14] });
  for (let i = -2; i <= 2; i++) {
    k.add('steel', bolt(0.015, 0.012), { pos: [i * 0.34, 0.9, rz - 0.098], rot: [-Math.PI / 2, 0, 0] });
  }
  // Machined chamfer along the bumper's top fold, and bolts across the face.
  // The rear three-quarter camera spends most of its frame on this bar and it
  // was one dark block with a bright step on top of it.
  k.add('steel', swage(1.84, 0.026), { pos: [0, 0.925, rz - 0.09], rot: [0, Math.PI / 2, 0] });
  k.add('steel', swage(1.84, 0.02), { pos: [0, 0.752, rz - 0.086], rot: [0, Math.PI / 2, 0] });
  for (let i = -3; i <= 3; i++) {
    k.add('steel', bolt(0.013, 0.01), { pos: [i * 0.26, 0.86, rz - 0.1], rot: [-Math.PI / 2, 0, 0] });
  }

  // recovery shackles bolted through the bumper, in faded orange
  for (const side of [-1, 1]) {
    k.add('steelDark', gbox(0.05, 0.13, 0.14, 0.014), { pos: [side * 0.52, 0.79, rz - 0.07] });
    k.add('paintAccent', new THREE.TorusGeometry(0.05, 0.016, 10, 18, Math.PI * 1.42), {
      pos: [side * 0.52, 0.755, rz - 0.16],
      rot: [Math.PI / 2, 0, 0.5],
    });
    k.add('steel', new THREE.CylinderGeometry(0.014, 0.014, 0.11, 10), {
      pos: [side * 0.52, 0.805, rz - 0.16],
      rot: [0, 0, Math.PI / 2],
    });
  }

  // reversing lamps let into the bumper face
  for (const side of [-1, 1]) {
    const lx = side * 0.3;
    k.add('gap', gbox(0.19, 0.11, 0.05, 0.008), { pos: [lx, 0.815, rz - 0.084] });
    k.add('trim', new THREE.CylinderGeometry(0.052, 0.048, 0.06, 16, 1, true), {
      pos: [lx, 0.815, rz - 0.07],
      rot: [Math.PI / 2, 0, 0],
    });
    k.add('reflector', new THREE.CircleGeometry(0.045, 18), { pos: [lx, 0.815, rz - 0.06], rot: [0, Math.PI, 0] });
    k.add('reflector', new THREE.CylinderGeometry(0.045, 0.03, 0.03, 16, 1, true), {
      pos: [lx, 0.815, rz - 0.078],
      rot: [Math.PI / 2, 0, 0],
    });
    k.add('headlight', new THREE.SphereGeometry(0.012, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), {
      pos: [lx, 0.815, rz - 0.086],
      rot: [Math.PI / 2, 0, 0],
    });
    k.add('lensClear', lensDome(0.043, 0.4, 16), { pos: [lx, 0.815, rz - 0.108], rot: [0, Math.PI, 0] });
    k.add('chrome', new THREE.TorusGeometry(0.046, 0.006, 8, 18), { pos: [lx, 0.815, rz - 0.106] });
  }

  // Licence plate slung under the bar on a bolted bracket. The bumper's own face
  // is fully taken — hitch, shackles, reversing lamps, seam bolts — so the plate
  // goes where a truck with a receiver actually ends up putting it.
  const px = -0.28;
  const py = 0.6;
  const pz = rz - 0.1;
  for (const dx of [-0.13, 0.13]) {
    k.add('steelDark', gbox(0.028, 0.1, 0.03, 0.006), { pos: [px + dx, 0.73, rz - 0.088] });
    k.add('steel', bolt(0.01, 0.008), { pos: [px + dx, 0.775, rz - 0.104], rot: [-Math.PI / 2, 0, 0] });
  }
  k.add('gap', gbox(0.42, 0.23, 0.05, 0.008), { pos: [px, py, pz] });
  k.add('steelDark', gbox(0.4, 0.21, 0.024, 0.007), { pos: [px, py, pz - 0.032] });
  k.add('alu', gbox(0.34, 0.158, 0.012, 0.004), { pos: [px, py, pz - 0.046] });
  k.add('decalNumber', new THREE.PlaneGeometry(0.2, 0.1), { pos: [px, py, pz - 0.054], rot: [0, Math.PI, 0] });
  for (const dx of [-0.12, 0.12]) {
    k.add('steel', bolt(0.009, 0.007), { pos: [px + dx, py + 0.058, pz - 0.056], rot: [-Math.PI / 2, 0, 0] });
  }
  // lamp hung off the bumper's lower rear edge, aimed down at the plate
  k.add('steelDark', gbox(0.026, 0.05, 0.026, 0.006), { pos: [px, 0.766, pz - 0.03] });
  k.add('trim', gbox(0.082, 0.042, 0.052, 0.012), { pos: [px, 0.736, pz - 0.038] });
  k.add('headlight', gbox(0.056, 0.012, 0.02, 0.004), { pos: [px, 0.716, pz - 0.038] });

  // corner marker reflectors on the tailgate's vertical border
  k.addMirrored('gap', gbox(0.075, 0.115, 0.03, 0.006), { pos: [0.765, 1.33, outer - 0.038] });
  k.addMirrored('reflectorRed', gbox(0.055, 0.095, 0.024, 0.006), { pos: [0.765, 1.33, outer - 0.052] });
  for (const dy of [-0.052, 0.052]) {
    k.addMirrored('chrome', gbox(0.07, 0.012, 0.026, 0.004), { pos: [0.765, 1.33 + dy, outer - 0.05] });
  }

  // spray tray under the tail, and caked spray across the panel below the gate
  k.add('plate', gbox(1.5, 0.026, 0.34, 0.008), { pos: [0, 0.72, rz + 0.28], rot: [-0.42, 0, 0] });
  for (let i = 0; i < 26; i++) {
    const t = hash1(i * 3 + 1, 41);
    const u = hash1(i * 3 + 2, 41);
    k.add('trim', new THREE.CircleGeometry(0.005 + hash1(i * 3 + 3, 41) * 0.016 * (1 - u * u * 0.7), 6), {
      pos: [-0.82 + t * 1.64, SILL_Y + 0.06 + u * u * 0.34, outer - 0.016],
      rot: [0, Math.PI, 0],
    });
  }
}
