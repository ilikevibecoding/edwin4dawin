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

export function buildBody() {
  const k = new BodyKit('body');

  frame(k);
  floorAndRockers(k);
  flanks(k);
  frontClip(k);
  fascia(k);
  cab(k);
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
      [0.4, 0.42, -1.8],
      [0.55, 0.46, -2.35],
    ],
    0.038,
  ));
  k.add('steel', new THREE.CylinderGeometry(0.055, 0.05, 0.16, 14), {
    pos: [0.62, 0.47, -2.46],
    rot: [Math.PI / 2, 0, 0.1],
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
      radius: ARCH_R + 0.115,
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

  // wheel arch mouldings
  const flareSection = [
    [0.0, 0.075],
    [0.055, 0.062],
    [0.098, 0.022],
    [0.101, -0.052],
    [0.083, -0.094],
    [0.04, -0.088],
    [0.014, -0.05],
    [0.0, -0.02],
  ];
  for (const cz of [S.frontAxleZ, S.rearAxleZ]) {
    k.addMirrored('trim', archFlare({ radius: ARCH_R, cz, sillY: SILL_Y, section: flareSection }), {
      pos: [HW - 0.03, 0, 0],
    });
    // rolled inner lip on the panel itself, plus a liner so there is no hole
    k.addMirrored('paintDark', archFlare({
      radius: ARCH_R - 0.014,
      cz,
      sillY: SILL_Y,
      steps: 16,
      section: [
        [-0.1, -0.014],
        [0.0, -0.014],
        [0.0, 0.014],
        [-0.1, 0.014],
      ],
    }), { pos: [HW - 0.055, 0, 0] });
    k.addMirrored('trim', new THREE.CylinderGeometry(ARCH_R - 0.035, ARCH_R - 0.035, 0.36, 22, 1, true, 0, Math.PI), {
      pos: [HW - 0.24, S.axleY, cz],
      rot: [0, 0, Math.PI / 2],
    });
    for (let i = 0; i <= 7; i++) {
      const a = 0.26 + (i / 7) * (Math.PI - 0.52);
      k.addMirrored('steelDark', rivet(0.013, 0.008), {
        pos: [HW + 0.072, S.axleY + Math.sin(a) * (ARCH_R + 0.055), cz + Math.cos(a) * (ARCH_R + 0.055)],
        rot: [0, 0, -Math.PI / 2],
      });
    }
  }

  // door furniture, hinges and graphics
  for (const side of [-1, 1]) {
    for (const hz of [0.16, -0.72]) {
      k.add('gap', rbox(0.06, 0.09, 0.22, 0.012), { pos: [side * (HW - 0.026), beltY - 0.15, hz] });
      k.add('trimGloss', rbox(0.045, 0.055, 0.185, 0.016), { pos: [side * (HW - 0.012), beltY - 0.155, hz] });
      k.add('chrome', rbox(0.032, 0.03, 0.14, 0.01), { pos: [side * (HW + 0.014), beltY - 0.148, hz - 0.012] });
    }
    k.add('alu', new THREE.CylinderGeometry(0.011, 0.011, 0.016, 10), {
      pos: [side * (HW + 0.006), beltY - 0.155, 0.33],
      rot: [0, 0, Math.PI / 2],
    });
    for (const hz of [0.93, 0.03, -0.01, -0.85]) {
      k.add('steelDark', rbox(0.05, 0.055, 0.045, 0.012), { pos: [side * (HW - 0.045), beltY - 0.06, hz] });
      k.add('steelDark', rbox(0.05, 0.055, 0.045, 0.012), { pos: [side * (HW - 0.045), SILL_Y + 0.17, hz] });
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
  }

  // beltline moulding capping the doors
  k.addMirrored('trim', rbox(0.085, 0.05, 1.86, 0.016), { pos: [HW - 0.018, beltY + 0.022, 0.045] });
  k.addMirrored('trimGloss', rbox(0.05, 0.016, 1.84, 0.006), { pos: [HW + 0.016, beltY + 0.046, 0.045] });

  // fuel filler, driver's side only
  k.add('gap', new THREE.CylinderGeometry(0.086, 0.086, 0.05, 20), {
    pos: [-(HW - 0.005), 1.16, -1.03],
    rot: [0, 0, Math.PI / 2],
  });
  k.add('trim', new THREE.TorusGeometry(0.088, 0.012, 8, 22), {
    pos: [-(HW + 0.014), 1.16, -1.03],
    rot: [0, Math.PI / 2, 0],
  });
  k.add('alu', new THREE.CylinderGeometry(0.062, 0.062, 0.03, 18), {
    pos: [-(HW + 0.004), 1.16, -1.03],
    rot: [0, 0, Math.PI / 2],
  });
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
  // eyebrow crease above the front flare
  k.addMirrored('paint', archFlare({
    radius: ARCH_R + 0.08,
    cz: S.frontAxleZ,
    sillY: 0.98,
    steps: 14,
    pad: 0.0,
    cap: false,
    section: [
      [0.0, 0.02],
      [0.032, 0.016],
      [0.032, -0.016],
      [0.0, -0.02],
    ],
  }), { pos: [HW - 0.032, 0, 0] });

  // cowl, wipers, washer jets
  k.add('trim', rbox(HW * 2 - 0.14, 0.075, 0.15, 0.022), { pos: [0, S.hoodY - 0.015, S.hoodRearZ - 0.07] });
  k.add('trimGloss', rbox(HW * 2 - 0.2, 0.022, 0.05, 0.008), { pos: [0, S.hoodY + 0.026, S.hoodRearZ - 0.115] });
  for (const side of [-1, 1]) {
    k.add('trimGloss', new THREE.CylinderGeometry(0.014, 0.014, 0.52, 10), {
      pos: [side * 0.28, S.hoodY + 0.032, S.hoodRearZ - 0.1],
      rot: [0, 0, Math.PI / 2 + side * 0.25],
    });
    k.add('trim', rbox(0.44, 0.014, 0.022, 0.005), {
      pos: [side * 0.28, S.hoodY + 0.058, S.hoodRearZ - 0.1],
      rot: [0, 0, side * 0.25],
    });
    k.add('trimGloss', new THREE.SphereGeometry(0.014, 10, 8), {
      pos: [side * 0.5, S.hoodY + 0.026, S.hoodRearZ - 0.02],
    });
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
  for (const side of [-1, 1]) {
    k.add('trim', rbox(0.06, 0.11, 0.09, 0.018), { pos: [side * (HW + 0.02), beltY + 0.1, S.cabFrontZ - 0.1] });
    k.add('trimGloss', tube(
      [
        [side * (HW + 0.035), beltY + 0.12, S.cabFrontZ - 0.1],
        [side * (HW + 0.13), beltY + 0.19, S.cabFrontZ - 0.09],
        [side * (HW + 0.2), beltY + 0.23, S.cabFrontZ - 0.085],
      ],
      0.024,
      10,
    ));
    k.add('trim', rbox(0.07, 0.21, 0.15, 0.035), { pos: [side * (HW + 0.235), beltY + 0.25, S.cabFrontZ - 0.085] });
    k.add('gap', rbox(0.03, 0.18, 0.13, 0.01), { pos: [side * (HW + 0.263), beltY + 0.25, S.cabFrontZ - 0.085] });
    k.add('chrome', new THREE.PlaneGeometry(0.125, 0.165), {
      pos: [side * (HW + 0.275), beltY + 0.25, S.cabFrontZ - 0.085],
      rot: [0, side * Math.PI * 0.5, 0],
    });
    k.add('amber', rbox(0.02, 0.02, 0.1, 0.005), { pos: [side * (HW + 0.27), beltY + 0.148, S.cabFrontZ - 0.085] });
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
  k.addMirrored('trim', rbox(0.045, 0.05, cabL + 0.02, 0.012), { pos: [HW - 0.058, S.roofY + 0.012, cabZ - 0.02] });
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
  const outer = -2.4; // outermost skin plane
  const fieldZ = outer + 0.075;
  k.add('paint', rbox(1.62, 0.075, 0.07, 0.022), { pos: [0, tgY1 - 0.038, outer] });
  k.add('paint', rbox(1.62, 0.07, 0.07, 0.022), { pos: [0, tgY0 + 0.032, outer] });
  k.addMirrored('paint', rbox(0.09, tgY1 - tgY0, 0.07, 0.022), { pos: [0.765, tgCy, outer] });
  k.add('gap', rbox(1.5, tgY1 - tgY0 - 0.09, 0.05, 0.006), { pos: [0, tgCy, outer + 0.04] });
  k.add('paint', rbox(1.44, tgY1 - tgY0 - 0.15, 0.06, 0.02), { pos: [0, tgCy, fieldZ] });
  k.add('paint', swage(1.4, 0.034), { pos: [0, tgCy + 0.105, fieldZ - 0.03], rot: [0, Math.PI / 2, 0] });
  k.add('paint', swage(1.4, 0.026), { pos: [0, tgCy - 0.135, fieldZ - 0.028], rot: [0, Math.PI / 2, 0] });
  k.add('decalName', new THREE.PlaneGeometry(1.14, 0.29), {
    pos: [0, tgCy - 0.02, fieldZ - 0.032],
    rot: [0, Math.PI, 0],
  });
  // Machined applique across the top of the field. The tailgate faces away from
  // the sun in every rear shot, so it needs bare metal to catch the sky.
  k.add('alu', rbox(1.3, 0.03, 0.026, 0.006), { pos: [0, tgY1 - 0.055, fieldZ - 0.03] });
  for (const dx of [-0.6, -0.2, 0.2, 0.6]) {
    k.add('steel', bolt(0.012, 0.009), { pos: [dx, tgY1 - 0.055, fieldZ - 0.042], rot: [-Math.PI / 2, 0, 0] });
  }
  // handle in a recess, hinges, latch strikers, top cap
  k.add('gap', rbox(0.34, 0.11, 0.05, 0.01), { pos: [0.3, tgY1 - 0.14, fieldZ + 0.01] });
  k.add('trimGloss', rbox(0.3, 0.075, 0.07, 0.018), { pos: [0.3, tgY1 - 0.145, fieldZ - 0.015] });
  k.add('chrome', rbox(0.24, 0.032, 0.04, 0.008), { pos: [0.3, tgY1 - 0.14, fieldZ - 0.045] });
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
  // licence plate, frame and lamp
  k.add('steelDark', rbox(0.4, 0.2, 0.02, 0.008), { pos: [-0.34, 1.0, rz - 0.105] });
  k.add('plate', rbox(0.36, 0.17, 0.012, 0.004), { pos: [-0.34, 1.0, rz - 0.118] });
  k.add('trim', rbox(0.07, 0.045, 0.06, 0.012), { pos: [-0.34, 1.115, rz - 0.075] });
  k.add('headlight', rbox(0.05, 0.014, 0.02, 0.004), { pos: [-0.34, 1.095, rz - 0.098] });
  k.addMirrored('reflectorRed', rbox(0.12, 0.05, 0.02, 0.006), { pos: [0.5, 0.98, rz - 0.1] });
}
