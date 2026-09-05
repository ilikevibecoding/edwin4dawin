import * as THREE from 'three';
import { Kit, bolt, profile, rbox, rivet, tube } from '../lib/geo.js';
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
  // The two plastics carry the arch flares and the inner liners, which between
  // them fill most of the close wheel frame. At the default density of 1 a 1.2 m
  // flare gets a single wrap of the satin map, so its albedo mottle, its normal
  // and its roughness variation all resolve to a smear the size of the part and
  // the flare comes back as one flat value — the loudest single surface in the
  // shot. Several wraps across it is what puts grain back on.
  trim: 2.6,
  trimGloss: 3.2,
  bedLiner: 2.2,
  glass: 'keep',
  glassSide: 'keep',
  glassDark: 'keep',
  glassEdge: 2,
  gasket: 3,
  reflector: 'keep',
  lensClear: 'keep',
  lensRibbed: 'keep',
  headlight: 'keep',
  taillight: 'keep',
  amber: 'keep',
  reverseLamp: 'keep',
  reflectorRed: 'keep',
  decalName: 'keep',
  decalBadge: 'keep',
  decalNumber: 'keep',
  // the live mirror samples its render target through the pane's own uvs
  mirrorGlass: 'keep',
};

const KEEP_ATTRS = ['position', 'normal', 'uv', 'lampHot'];

/**
 * Lamp parts carry a `lampHot` vertex attribute for `applyLampGlow`: 1 where
 * the bulb sits behind the lens, 0 at the lens rim, so a lit lamp has a hot
 * core and a coloured edge instead of one flat emissive value. The keys here
 * get it written automatically as they are added, in the part's own frame
 * before placement; a bulb (`headlight`) is the source and is hot all over.
 */
export const LAMP_HOT = { headlight: 1, taillight: 'z', amber: 'z', reverseLamp: 'z', lensClear: 'z', lensRibbed: 'z' };

export function hotSpot(geo, mode = 'z') {
  const pos = geo.attributes.position;
  const n = pos.count;
  const hot = new Float32Array(n);
  if (typeof mode === 'number') {
    hot.fill(mode);
  } else {
    const [a, b] = mode === 'x' ? [1, 2] : mode === 'y' ? [0, 2] : [0, 1];
    let rMax = 1e-6;
    const r = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u = pos.array[i * 3 + a];
      const v = pos.array[i * 3 + b];
      r[i] = Math.hypot(u, v);
      if (r[i] > rMax) rMax = r[i];
    }
    for (let i = 0; i < n; i++) hot[i] = 1 - Math.min(1, r[i] / rMax);
  }
  geo.setAttribute('lampHot', new THREE.BufferAttribute(hot, 1));
  return geo;
}

/** Radial hot-spot for a lamp part, if its key wants one and it has none yet. */
export function lampReady(key, geo, mode = LAMP_HOT[key]) {
  if (mode === undefined || geo.attributes.lampHot) return geo;
  return hotSpot(geo.clone(), mode);
}

// Lamp internals sit at the bottom of a deep bezel, so the shadow map throws a
// hard-edged black half across every reflector. Taking them out of the shadow
// pass stands in for the forward bounce a real reflector does, and it is what
// keeps a lamp reading as a lamp when the nose is facing away from the sun.
// The panes too: a depth pass has no alpha, so a 26 per cent windscreen would
// throw a *solid* shadow across the whole dash and the cabin daylight model is
// built on the sun coming through it.
const UNSHADOWED = new Set(['reflector', 'barReflector', 'headlight', 'lensClear', 'lensRibbed', 'amber', 'taillight', 'reverseLamp', 'glass', 'glassSide', 'glassDark']);

/**
 * `Kit.emit` with the per-piece recentring done right.
 *
 * The shared emit splits a `sortPieces` material into one mesh per pane and
 * moves each onto its own origin so three can sort them by distance. It reads
 * the centre it needs off `geo.boundingSphere.center`, translates the geometry
 * by it, and then recomputes the sphere — which updates that same Vector3 in
 * place to zero before it is copied into `mesh.position`. Every pane on the
 * truck therefore sat at the truck's origin, inside the chassis, and the truck
 * has had no exterior glass since the sort fix went in: what read as a
 * windscreen in the beauty shots was the cabin's own interior dust film. The
 * shared kit is not this module's to change, so the piece path is redone here
 * and the merged path is handed straight back to it.
 *
 * Pieces also hand their offset to any object-space shader on the material
 * (`uClOff` in the cabin light), since recentring is exactly the transform
 * those shaders assume never happens.
 */
export function emitPieces(kit, group, key, mat, geos, { castShadow = true, receiveShadow = true, finish, prefix = kit.name } = {}) {
  if (!mat.userData?.sortPieces) return kit.emit(group, key, mat, geos, { castShadow, receiveShadow, finish, prefix });
  const offsets = Object.values(mat.userData)
    .map((bag) => bag && typeof bag === 'object' && bag.uClOff)
    .filter(Boolean);
  geos.forEach((geo, i) => {
    if (finish) finish(geo, key);
    geo.computeBoundingSphere();
    const c = geo.boundingSphere.center.clone();
    geo.translate(-c.x, -c.y, -c.z);
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(c);
    mesh.name = `${prefix}_${key}_${i}`;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    if (offsets.length) {
      mesh.onBeforeRender = () => {
        for (const o of offsets) o.value.copy(c);
      };
    }
    group.add(mesh);
  });
  return undefined;
}

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
    super.add(key, lampReady(key, geo), xform);
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
      emitPieces(this, group, key, mat, geos, {
        castShadow: castShadow && !UNSHADOWED.has(key),
        receiveShadow: receiveShadow && !UNSHADOWED.has(key),
        finish: (g, k) => {
          const scale = UV_SCALE[k];
          if (scale !== 'keep') boxProjectUV(g, scale ?? 1);
        },
      });
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
function archFlare({ radius, cz, sillY, section, steps = 22, pad = 0.06, cap = true, arc }) {
  const dy = Math.max(-0.999, Math.min(0.999, (sillY - S.axleY) / radius));
  const a0 = arc ? arc[0] : Math.asin(dy) - pad;
  const a1 = arc ? arc[1] : Math.PI - Math.asin(dy) + pad;
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

/**
 * A pressed crease, sectioned so that nothing on it can mirror the skyline.
 *
 * The brightwork reflection is graded by the *reflected ray*, and its hottest
 * zone by far is a narrow band at the horizon. Any near-horizontal land on the
 * flank, seen from a camera even slightly above it, sends its reflected ray
 * straight into that band — so a horizontal land is not "a facet that catches
 * some sky", it is a mirror aimed at the one bright thing in the environment.
 * Both earlier sections had one: the 45-degree diamond, and then the flat-topped
 * step meant to replace it. Each produced the same artefact, a hard pale seam
 * running the length of the bedside and two of them blown to pure white across
 * the tailgate.
 *
 * So this section has no near-horizontal surface anywhere. The panel steps out
 * over a shoulder pitched about 20 degrees off vertical, holds a vertical land,
 * and returns on an underside that faces down. The steepest thing on it looks 39
 * degrees above the horizon, well clear of the band; the crease then reads off
 * the value break between the two lands and the shadow under the return, which
 * is how a pressed crease reads in a photograph anyway.
 */
function swage(len, size = 0.03) {
  // Section depth, of which the inner third stays buried in the panel: every call
  // site places the crease a couple of millimetres off the skin and relied on the
  // old centred box to bridge the rest, so an outline starting at x = 0 would hang
  // clear of the panel it is pressed into.
  const d = size * 0.3;
  const x0 = -d * 0.32;
  return profile(
    [
      [x0, size * 0.5],
      [x0 + d, size * 0.02],
      [x0 + d, -size * 0.3],
      [x0 + d * 0.45, -size * 0.46],
      [x0, -size * 0.5],
    ],
    len,
    { bevel: 0.0008, curveSegments: 2 },
  );
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

/**
 * A rectangular pane cut from a sphere of radius `R`, bulging towards +Z.
 *
 * A flat plane in a mirror material returns one value of the graded reflection
 * over its whole area, because every pixel on it shares a normal — which is
 * exactly what made the old mirror face read as a dark grey rectangle. At
 * R = 0.45 m a 170 mm pane sweeps its reflected ray through about 45 degrees,
 * enough to cross the trail / tree line / sky bands in `applyBrightwork`, and
 * the continuous curvature also takes the gate off the skyline streak.
 *
 * A sphere rather than the ad-hoc quadratic this replaced: that one clamped its
 * falloff, and the crease where the clamp bit showed up in the reflection as a
 * ring inset from the frame.
 */
function convexPane(w, h, R, sw = 8, sh = 10) {
  const g = new THREE.PlaneGeometry(w, h, sw, sh);
  const p = g.attributes.position;
  // corners land on z = 0, so the pane's own depth is its sag and nothing else
  const base = Math.sqrt(Math.max(1e-6, R * R - (w * w + h * h) * 0.25));
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    p.setZ(i, Math.sqrt(Math.max(1e-6, R * R - x * x - y * y)) - base);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * True spherical cap on +Z, rather than `lensDome`'s squashed hemisphere. A
 * hemisphere's rim is tangent to the view direction, so a mirror material puts
 * the skyline band on it at full strength in a one-pixel line and bloom turns
 * that into a white blob — which is what the old convex spotter was doing. A cap
 * stops at a stated slope and never presents a grazing edge.
 */
function sphericalCap(r, rise, seg = 16, rings = 3) {
  const R = (r * r + rise * rise) / (2 * rise);
  const theta = Math.asin(Math.min(1, r / R));
  const g = new THREE.SphereGeometry(R, seg, rings, 0, Math.PI * 2, 0, theta);
  g.translate(0, rise - R, 0);
  g.rotateX(Math.PI / 2);
  return g;
}

/** Recessed shut line between two flank panels. */
function shutLine(k, z, y0, y1, width = 0.032) {
  k.addMirrored('gap', rbox(0.06, y1 - y0, width, 0.004), {
    pos: [HW - 0.055, (y0 + y1) * 0.5, z],
  });
}

/**
 * A crowned skin: a transverse section swept along Z. Points are absolute
 * [height, outward] in truck space, so a panel's crown, creases and turned-under
 * edges are all in the section and the sky sweeps across the face instead of
 * returning one value off one plane.
 */
function crownX(pts, len, bevel = 0.008) {
  const g = profile(
    pts.map(([y, x]) => [y, -x]),
    len,
    { bevel, curveSegments: 2 },
  );
  g.rotateZ(Math.PI / 2);
  return g;
}

/** As `crownX`, for a panel facing along Z: absolute [across, aft], swept up Y. */
function crownZ(pts, height, bevel = 0.008) {
  const g = profile(
    pts.map(([x, z]) => [x, -z]),
    height,
    { bevel, curveSegments: 2 },
  );
  g.rotateX(-Math.PI / 2);
  return g;
}

/**
 * Flank skin section, sill to beltline. The face is crowned about a centimetre
 * across its height and broken by a pressed crease two thirds up, so a door is
 * two subtly different planes with a line between them rather than one slab.
 */
function flankSection(y0, y1, { face = HW, crown = 0.011, crease = 0.62, step = 0.005, depth = 0.062 } = {}) {
  const h = y1 - y0;
  const base = face - crown;
  const at = (t, extra = 0) => [y0 + h * t, base + Math.sin(t * Math.PI) * crown + extra];
  // The crease runs in and out over two facets each side rather than one. A single
  // facet taking the whole step turned inboard at about 22 degrees off vertical,
  // and a picker found the clipping line on the bedside sitting exactly on it: the
  // curvature gate hands a crease that sharp the skyline band at full strength.
  // Splitting the step halves each facet's pitch, which moves the reflected ray far
  // enough off the horizon to matter, and a pressed crease is a radius anyway.
  const pts = [
    at(0),
    at(0.14),
    at(0.32),
    at(crease - 0.06),
    at(crease - 0.028, -step * 0.46),
    at(crease, -step),
    at(crease + 0.03, -step * 0.66),
    at(crease + 0.075, -step * 0.32),
    at(0.86, -step * 0.12),
    at(1),
  ];
  return [...pts, [y1, face - depth], [y0, face - depth]];
}

/**
 * A long member split into a few shorter pressings, each with its own edge
 * radius and a millimetre or two of misalignment, optionally sagging in the
 * middle. One 1.9 m box returns a dead straight specular line down its fold,
 * and a straight unbroken outline is the loudest CG tell on the truck.
 *
 * `axis` is the long one; `pos` is the whole run's centre. Axis-aligned only.
 */
function brokenBar(
  k,
  key,
  { w, h, d, r = 0.02, pos, axis = 'x', segs = 4, sag = 0, cut = 0.0018, jit = 0.0016, seed = 1, seg = 1, rot, mirror = false, drop = 0 },
) {
  const L = axis === 'x' ? w : axis === 'y' ? h : d;
  const cuts = [0];
  for (let i = 1; i < segs; i++) cuts.push((i + (hash1(i * 3, seed) - 0.5) * 0.5) / segs);
  cuts.push(1);
  for (let i = 0; i < segs; i++) {
    const t0 = cuts[i];
    const t1 = cuts[i + 1];
    const len = (t1 - t0) * L - cut;
    if (len <= cut) continue;
    if (drop && hash1(i * 3 + 9, seed) < drop) continue;
    const c = ((t0 + t1) * 0.5 - 0.5) * L;
    const droop = sag * Math.sin((t0 + t1) * 0.5 * Math.PI);
    const j1 = (hash1(i * 3 + 1, seed) - 0.5) * jit * 2;
    const j2 = (hash1(i * 3 + 2, seed) - 0.5) * jit * 2;
    const rr = Math.max(0.002, r * (0.55 + hash1(i * 3 + 5, seed) * 0.95));
    const dim = axis === 'x' ? [len, h, d] : axis === 'y' ? [w, len, d] : [w, h, len];
    const off = axis === 'x' ? [c, j1 - droop, j2] : axis === 'y' ? [j1, c, j2] : [j1, j2 - droop, c];
    const g = rbox(dim[0], dim[1], dim[2], rr, seg);
    const p = [pos[0] + off[0], pos[1] + off[1], pos[2] + off[2]];
    if (mirror) k.addMirrored(key, g, { pos: p, rot });
    else k.add(key, g, { pos: p, rot });
  }
}

/** `brokenBar` for a diamond-section crease: a run of swage segments. */
function brokenSwage(k, key, { len, size = 0.03, pos, axis = 'z', segs = 4, seed = 1, sag = 0, jit = 0.0016, mirror = false }) {
  const cuts = [0];
  for (let i = 1; i < segs; i++) cuts.push((i + (hash1(i * 3, seed) - 0.5) * 0.5) / segs);
  cuts.push(1);
  for (let i = 0; i < segs; i++) {
    const t0 = cuts[i];
    const t1 = cuts[i + 1];
    const l = (t1 - t0) * len - 0.005;
    if (l <= 0.012) continue;
    const c = ((t0 + t1) * 0.5 - 0.5) * len;
    const s = size * (0.8 + hash1(i * 3 + 4, seed) * 0.4);
    const droop = sag * Math.sin((t0 + t1) * 0.5 * Math.PI);
    const j = (hash1(i * 3 + 1, seed) - 0.5) * jit * 2;
    const g = swage(l, s);
    const rot = axis === 'x' ? [0, Math.PI / 2, 0] : undefined;
    const off = axis === 'x' ? [c, j - droop, 0] : [0, j - droop, c];
    const p = [pos[0] + off[0], pos[1] + off[1], pos[2] + off[2]];
    if (mirror) k.addMirrored(key, g, { pos: p, rot });
    else k.add(key, g, { pos: p, rot });
  }
}

/**
 * Knocks along a fold. Each is a small hard facet laid on the edge and turned a
 * few degrees out of line; a chip is a pair of values, so roughly half are the
 * dark gap material (a bite out of the corner) and half bare metal where the
 * finish has gone. Plain boxes on purpose: a chamfer would round off the only
 * thing these are for, which is a crisp interruption.
 */
function edgeKnocks(k, { from, to, n = 8, seed = 1, len = 0.05, size = 0.013, bright = 'alu', dark = 'gap', mirror = false }) {
  const d = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const ax = Math.abs(d[0]) >= Math.abs(d[1]) && Math.abs(d[0]) >= Math.abs(d[2]) ? 0 : Math.abs(d[1]) >= Math.abs(d[2]) ? 1 : 2;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.18 + hash1(i * 7 + 1, seed) * 0.64) / n;
    const dim = [size * (0.5 + hash1(i * 7 + 2, seed) * 0.9), size * (0.45 + hash1(i * 7 + 3, seed) * 0.8), size];
    dim[ax] = len * (0.4 + hash1(i * 7 + 4, seed) * 1.4);
    const key = hash1(i * 7 + 5, seed) > 0.52 ? bright : dark;
    const xf = {
      pos: [from[0] + d[0] * t, from[1] + d[1] * t, from[2] + d[2] * t],
      rot: [
        (hash1(i * 7 + 6, seed) - 0.5) * 0.5,
        (hash1(i * 7 + 7, seed) - 0.5) * 0.5,
        (hash1(i * 7 + 8, seed) - 0.5) * 0.5,
      ],
    };
    const g = new THREE.BoxGeometry(dim[0], dim[1], dim[2]);
    if (mirror) k.addMirrored(key, g, xf);
    else k.add(key, g, xf);
  }
}

/**
 * Weld bead round a joint: a ring whose section swells and pinches the way a
 * hand-run bead does. The wobble is built from sines of the ring angle so it
 * stays continuous round the seam instead of breaking into noise.
 */
function weldBead(k, key, { pos, r, tube: tr = 0.008, rot = [0, 0, 0], seed = 1, seg = 14, mirror = false }) {
  const g = new THREE.TorusGeometry(r, tr, 5, seg);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const a = Math.atan2(y, x);
    const f = 0.72 + (0.5 + 0.5 * Math.sin(a * 7 + seed)) * 0.46 + (0.5 + 0.5 * Math.sin(a * 17 + seed * 3)) * 0.22;
    const rad = Math.hypot(x, y) || 1;
    const nr = r + (rad - r) * f;
    p.setXY(i, (x / rad) * nr, (y / rad) * nr);
    p.setZ(i, p.getZ(i) * f);
  }
  g.computeVertexNormals();
  if (mirror) k.addMirrored(key, g, { pos, rot });
  else k.add(key, g, { pos, rot });
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

  // Structure behind the shut lines, so a gap shows darkness rather than sky.
  // Capped at the beltline: it used to run 110 mm past it, inboard of the door
  // glass, and from the seats that was a solid black band across the bottom of
  // every side window (raycast from the interior frame: `body_gap` at 0.91 m,
  // in front of `body_glassSide`).
  k.addMirrored('gap', rbox(0.05, S.beltlineY - 0.62, 3.14, 0.01), { pos: [HW - 0.145, (S.beltlineY + 0.62) * 0.5, 0.67] });

  // sun-faded plastic rocker cladding under the doors
  const rockerL = S.cabFrontZ - S.cabRearZ + 0.42;
  const rockerZ = (S.cabFrontZ + S.cabRearZ) * 0.5;
  // One length of cladding per door, so the shut line runs through it the way it
  // runs through everything else on the flank
  for (const [zc, len, dy] of [[rockerZ + 0.7, 1.34, 0.0], [rockerZ - 0.7, 1.32, -0.0022]]) {
    k.addMirrored('trim', rbox(0.075, 0.16, len, 0.03), {
      pos: [HW - 0.012, SILL_Y - 0.03 + dy, zc],
    });
  }
  k.addMirrored('trimGloss', rbox(0.04, 0.032, rockerL - 0.08, 0.01), {
    pos: [HW + 0.018, SILL_Y + 0.028, rockerZ],
  });
  for (let i = 0; i < 7; i++) {
    k.addMirrored('steelDark', rivet(0.013, 0.007), {
      pos: [HW + 0.028, SILL_Y - 0.06, rockerZ - 0.9 + i * 0.3],
      rot: [0, 0, -Math.PI / 2],
    });
  }
  // Drain slots along the bottom of the sill, and a grommet where the loom drops
  // through into the cladding. Every closed section on a real vehicle is drilled
  // somewhere at its lowest point or it fills with water; nothing in CG ever is.
  for (const dz of [-1.06, -0.62, -0.02, 0.46, 0.98]) {
    k.addMirrored('gap', rbox(0.05, 0.012, 0.055, 0.004, 1), {
      pos: [HW - 0.014, SILL_Y - 0.104, rockerZ + dz],
    });
  }
  k.addMirrored('rubber', new THREE.TorusGeometry(0.016, 0.006, 6, 12), {
    pos: [HW - 0.03, SILL_Y - 0.108, rockerZ + 0.72],
    rot: [0, 0, Math.PI / 2],
  });
  // Brake and fuel lines clipped along the sill, in the recess between the rocker
  // cladding and the slider — which is where the close camera looks straight in
  // and found nothing but a shadow. Two lines of different gauge and finish,
  // because a pair of identical tubes reads as a moulded feature.
  for (const [i, dy] of [0.0, 0.03].entries()) {
    k.addMirrored(i === 0 ? 'alu' : 'trim', tube(
      [
        [HW + 0.004, S.floorY - 0.15 - dy, rockerZ + 1.2],
        [HW - 0.006, S.floorY - 0.142 - dy, rockerZ + 0.3],
        [HW + 0.001, S.floorY - 0.152 - dy, rockerZ - 0.62],
        [HW - 0.008, S.floorY - 0.144 - dy, rockerZ - 1.28],
      ],
      0.0065 + i * 0.0025,
      6,
    ), {});
  }
  for (const dz of [-1.02, -0.34, 0.44, 1.1]) {
    k.addMirrored('steel', rbox(0.02, 0.052, 0.014, 0.004, 1), {
      pos: [HW + 0.008, S.floorY - 0.166, rockerZ + dz],
    });
    k.addMirrored('steel', bolt(0.008, 0.006), {
      pos: [HW + 0.02, S.floorY - 0.166, rockerZ + dz],
      rot: [0, 0, -Math.PI / 2],
    });
  }

  // Rock sliders. The step pads were bare aluminium, on the theory that the sill
  // sits in the body's own shadow and needs something that picks the sky up out
  // of the env map. Measured, that made them the brightest surface on the whole
  // truck at 0.675 luma — brighter than sunlit paint, on the part that sits
  // directly in the spray off the front tyre. A step pad is serrated steel plate
  // anyway; the bottom edge is kept off black by the thin scuff strip below.
  const sliderL = 1.85;
  // Two fabricated lengths with the joint showing, not one 1.85 m extrusion. This
  // bar is dead level and side-lit in the close frame, so as a single box it was
  // the last perfectly straight bright line under the truck.
  brokenBar(k, 'plate', {
    w: 0.115,
    h: 0.075,
    d: sliderL,
    r: 0.025,
    axis: 'z',
    pos: [HW + 0.05, S.floorY - 0.3, rockerZ],
    segs: 2,
    seed: 65,
    cut: 0.014,
    jit: 0.0022,
    mirror: true,
  });
  for (const dz of [-0.52, 0.52]) {
    k.addMirrored('plate', rbox(0.108, 0.014, 0.5, 0.005), {
      pos: [HW + 0.05, S.floorY - 0.258, rockerZ + dz],
    });
  }
  // Wear strip along the bottom of the cladding, in three scuffed lengths. As one
  // 2.7 m bar of satin aluminium it was the longest dead-straight highlight left
  // on the truck and it ran under both doors in a single stroke.
  brokenBar(k, 'alu', {
    w: 0.03,
    h: 0.022,
    d: rockerL - 0.2,
    r: 0.006,
    axis: 'z',
    pos: [HW + 0.03, SILL_Y - 0.098, rockerZ],
    segs: 3,
    seed: 77,
    cut: 0.016,
    jit: 0.002,
    sag: 0.0018,
    mirror: true,
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

  // 2 + 3. doors. Crowned skins rather than flat slabs, and hung a fraction out
  // of line with each other: two doors at exactly the same standoff with exactly
  // the same crown is a thing no truck this age has ever managed.
  for (const [zf, zr, dx, dy, crown] of [
    [0.944, 0.02, 0.0, 0.0, 0.012],
    [0.004, S.cabRearZ, -0.0018, -0.0013, 0.0104],
  ]) {
    k.addMirrored('paint', crownX(flankSection(SILL_Y + dy, beltY + dy, { face: HW + dx, crown }), zf - zr), {
      pos: [0, 0, (zf + zr) * 0.5],
    });
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
  // Crease scale, not rib scale: a couple of centimetres of relief. Each panel's
  // pair also sits a millimetre or two off its neighbour's, because a crease
  // that lines up perfectly across four separate pressings never happens.
  for (const [i, [zc, len]] of [
    [1.58, 1.06],
    [0.49, 0.86],
    [-0.43, 0.82],
    [-1.66, 1.4],
  ].entries()) {
    const dy = (hash1(i * 5 + 1, 3) - 0.5) * 0.004;
    const dy2 = (hash1(i * 5 + 2, 3) - 0.5) * 0.004;
    // In short segments, not one pressing per panel. Whatever section a crease is
    // given, the outboard-facing part of it reads as high curvature to the graded
    // reflection, and the curvature gate hands high-curvature surfaces the skyline
    // band at full strength while sparing the flat panel behind — so a proud rib on
    // this flank will always pick the band up. Picking a section that cannot see the
    // sky was tried twice and neither worked, because the band is at the horizon and
    // the camera is at flank height. What does work is denying it a straight run:
    // three short creases at slightly different heights and depths give three short
    // highlights of different values instead of one dead-straight 1.4 m line
    // aliasing into a stitched pale seam.
    brokenSwage(k, 'paint', { len, size: 0.034, pos: [HW + 0.004, beltY - 0.17 + dy, zc], segs: 2, seed: 100 + i, jit: 0.0022, mirror: true });
    brokenSwage(k, 'paint', { len, size: 0.024, pos: [HW, SILL_Y + 0.245 + dy2, zc], segs: 2, seed: 110 + i, jit: 0.002, mirror: true });
  }
  // upper crease along the bedside, and a stamped shoulder over the rear arch
  brokenSwage(k, 'paint', { len: 1.42, size: 0.028, pos: [HW + 0.002, S.bedTopY - 0.18, -1.66], segs: 3, seed: 121, jit: 0.0024, mirror: true });

  // Crowned bands over the two panels the wheel camera fills its frame with.
  // Both are pressings above their wheel opening, so they can be swept sections
  // with a real crown instead of the flat outline extrusions underneath: the
  // band's edges are the character lines and its face sweeps the sky across it.
  k.addMirrored('paint', crownX(flankSection(1.06, 1.284, { face: HW + 0.008, crown: 0.007, crease: 0.44, step: 0.003, depth: 0.05 }), 1.16), {
    pos: [0, 0, 1.556],
  });
  // The rear band comes in two pressings with a shut between them and a couple of
  // millimetres of misalignment. As one 1.4 m sweep its crease was the longest dead
  // straight line left on the flank, and a straight crease is what the graded
  // reflection turns into a stitched seam.
  for (const [zc, len, cr, crease] of [
    [-1.36, 0.72, 0.0085, 0.58],
    [-2.055, 0.66, 0.0075, 0.55],
  ]) {
    k.addMirrored('paint', crownX(flankSection(1.06, 1.4, { face: HW + 0.008, crown: cr, crease, step: 0.004, depth: 0.05 }), len), {
      pos: [0, 0, zc],
    });
  }
  // Body-side moulding in faded plastic, broken at each shut line. Two creases
  // and a rub strip is the difference between a stamped flank and a flat wall.
  for (const [i, [zc, len]] of [[1.62, 0.92], [0.49, 0.86], [-0.43, 0.82], [-1.7, 1.3]].entries()) {
    k.addMirrored('trim', rbox(0.055, 0.075, len, 0.018), { pos: [HW - 0.008, SILL_Y + 0.115, zc] });
    // the gloss insert is a clip-in strip, so it comes in short lengths that
    // have each shifted a little; the run on the front fender has lost one
    brokenBar(k, 'trimGloss', {
      w: 0.028,
      h: 0.016,
      d: len - 0.04,
      r: 0.005,
      axis: 'z',
      pos: [HW + 0.026, SILL_Y + 0.142, zc],
      segs: 3,
      seed: 40 + i,
      cut: 0.02,
      jit: 0.0022,
      drop: i === 0 ? 0.34 : 0,
      mirror: true,
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

  // beltline moulding capping the doors, one length per door and each sitting a
  // couple of millimetres off its neighbour, because two separately hung doors
  // never line their trim up
  for (const [zc, len, dy] of [[0.5, 0.9, 0.0015], [-0.44, 0.88, -0.0018]]) {
    k.addMirrored('trim', rbox(0.085, 0.05, len, 0.016), { pos: [HW - 0.018, beltY + 0.022 + dy, zc] });
  }
  for (const [zc, len, s] of [[0.48, 0.9, 51], [-0.43, 0.86, 52]]) {
    brokenBar(k, 'trimGloss', {
      w: 0.05,
      h: 0.016,
      d: len,
      r: 0.006,
      axis: 'z',
      pos: [HW + 0.016, beltY + 0.046, zc],
      segs: 2,
      seed: s,
      cut: 0.012,
      jit: 0.0018,
      mirror: true,
    });
  }
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
// The outer face is crowned and split by a moulded reveal down its middle. As
// one 70 mm land at a constant offset it measured 0.44 luma over its whole
// height — a black plastic flare returning the same value as sunlit paint, in
// one unbroken sheet, filling a third of the close frame. A crown plus a groove
// turns that into four bands with a shadow line between them, which is what
// makes the part read as a moulding instead of a painted region.
const FLARE_SECTION = [
  [0.026, 0.1],
  [0.088, 0.088],
  [0.118, 0.05],
  [0.1325, 0.022],
  [0.1362, 0.004],
  [0.1298, -0.004],
  [0.1358, -0.015],
  [0.1342, -0.032],
  [0.128, -0.048],
  [0.118, -0.078],
  [0.09, -0.092],
  [0.05, -0.096],
  [0.03, -0.072],
  [0.008, -0.02],
];

/**
 * Outward offset of the flare's outer skin at a radial offset `t`. Anything stuck
 * to the flare — cake, spray, stone chips — has to follow the section or it hangs
 * in space: the shoulder land pulls in by more than a hundred millimetres across
 * its width, so a crust laid at one fixed X stood 50 mm off the moulding at the
 * top of the arch and read as a string of berries floating beside the truck.
 */
function flareX(t) {
  const outer = FLARE_SECTION.slice(0, 12);
  for (let i = 0; i < outer.length - 1; i++) {
    const [x0, t0] = outer[i];
    const [x1, t1] = outer[i + 1];
    if (t <= t0 && t >= t1) return x0 + (x1 - x0) * ((t0 - t) / (t0 - t1 || 1));
  }
  return t > outer[0][1] ? outer[0][0] : outer[outer.length - 1][0];
}

function wheelArch(k, cz) {
  const fx = HW - 0.03; // flare datum plane; +0.134 is the outer face
  // The flare body is the darker, less-dirtied plastic and the lip under it the
  // matt textured one. That is the wrong way round for a real flare, and it is
  // deliberate: the road-film shader keys off distance to the wheel centre, so
  // anything within half a metre of the hub in the matt material saturates to
  // mud and the whole arch came back as one tan sheet. In the gloss plastic the
  // flare holds a dark value with a Fresnel edge on every crease, and the mud
  // that lands on it reads as mud because the panel under it does not.
  //
  // Measured on the close frame the gloss flare comes back at 0.49 luma against
  // green paint at 0.52 — black plastic returning the same value as sunlit
  // bodywork. That is the analytic brightwork wall in a file this agent does not
  // own, and swapping the key to the bedliner bought 0.05 luma while throwing
  // away the object-space grain that was the only thing breaking the surface up.
  // So the value is a request to the materials owner, and what is fixed here is
  // the shape: the section below is crowned and grooved so the face reads as
  // bands rather than a sheet.
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

  // Bolted rock guard across the middle of the flare's face, in the key that
  // takes arch cake and nothing else. The flare's own plastic is very dark —
  // 0.007 to 0.024 linear — but the shared road-film term saturates this close to
  // a wheel centre and lays about 0.2 linear of warm tan over the whole face, so
  // it measures 0.49 luma: the same value as sunlit paint, over the largest
  // surface in the close frame. That fix belongs in the material. What geometry
  // can do is stop it being one unbroken band, and a guard strip is what a truck
  // that has been down this track would have anyway.
  k.addMirrored('gap', archFlare({
    radius: ARCH_R - 0.006,
    cz,
    sillY: SILL_Y + 0.06,
    steps: 20,
    pad: -0.02,
    cap: false,
    section: [
      [0.106, 0.014],
      [0.1425, 0.0105],
      [0.1445, -0.002],
      [0.139, -0.011],
      [0.106, -0.014],
    ],
  }), { pos: [fx, 0, 0] });
  const gSeed = cz > 0 ? 131 : 137;
  for (let i = 0; i < 12; i++) {
    const a = 0.2 + ((i + (hash1(i * 3 + 1, gSeed) - 0.5) * 0.8) / 11) * (Math.PI - 0.4);
    const r = ARCH_R - 0.006 + (hash1(i * 3 + 2, gSeed) - 0.5) * 0.01;
    if (hash1(i * 3 + 3, gSeed) < 0.12) continue;
    k.addMirrored('steelDark', rivet(0.0085 + hash1(i * 3 + 2, gSeed) * 0.004, 0.006), {
      pos: [fx + 0.1465, S.axleY + Math.sin(a) * r, cz + Math.cos(a) * r],
      rot: [0, 0, -Math.PI / 2],
    });
  }

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

  // Flare fasteners: hex head on a washer. Nine identical 50 mm washers evenly
  // spaced round the arc read as a machined bolt circle, so the spacing wanders,
  // the sizes vary, two have been replaced with something smaller and one is
  // missing altogether. The heads are steel rather than bare aluminium: at this
  // size a bright disc every 200 mm was the palest thing in the close frame.
  const fSeed = cz > 0 ? 91 : 97;
  for (let i = 0; i < 10; i++) {
    if (i === 6) continue;
    const a = 0.18 + ((i + (hash1(i * 4 + 1, fSeed) - 0.5) * 0.7) / 9) * (Math.PI - 0.36);
    // Below the guard strip, on the exposed lower band of the flare face
    const r = ARCH_R - 0.042 + (hash1(i * 4 + 2, fSeed) - 0.5) * 0.012;
    const s = 0.62 + hash1(i * 4 + 3, fSeed) * 0.5;
    const y = S.axleY + Math.sin(a) * r;
    const z = cz + Math.cos(a) * r;
    k.addMirrored('steelDark', new THREE.CylinderGeometry(0.016 * s, 0.018 * s, 0.006, 10), {
      pos: [fx + 0.1315, y, z],
      rot: [0, 0, Math.PI / 2],
    });
    k.addMirrored('steelDark', bolt(0.0105 * s, 0.009), {
      pos: [fx + 0.1345, y, z],
      rot: [0, 0, -Math.PI / 2 + (hash1(i * 4 + 4, fSeed) - 0.5) * 0.5],
    });
  }
  // Knocks along the flare's outer edge. This is the one long unbroken curve the
  // close camera sees end to end, and a flare that has been through trees has a
  // scuffed, dented lip rather than a clean one.
  for (let i = 0; i < 11; i++) {
    const a = 0.14 + ((i + (hash1(i * 6 + 1, fSeed + 3) - 0.5) * 0.8) / 10) * (Math.PI - 0.28);
    // On the top corner of the outer face, which is the edge that meets branches.
    // These were at ARCH_R + 0.128, which is the *paint* eyebrow's radius, at the
    // flare's X — a hundred millimetres off any surface, so eleven little boxes
    // hung in the air beside the arch.
    const t = 0.018 + (hash1(i * 6 + 2, fSeed + 3) - 0.5) * 0.012;
    const r = ARCH_R + t;
    const w = 0.02 + hash1(i * 6 + 3, fSeed + 3) * 0.05;
    k.addMirrored(hash1(i * 6 + 4, fSeed + 3) > 0.6 ? 'gap' : 'trim', new THREE.BoxGeometry(0.014, 0.012, w), {
      pos: [fx + flareX(t) - 0.002, S.axleY + Math.sin(a) * r, cz + Math.cos(a) * r],
      rot: [Math.PI / 2 - a + (hash1(i * 6 + 5, fSeed + 3) - 0.5) * 0.4, 0, (hash1(i * 6 + 6, fSeed + 3) - 0.5) * 0.4],
    });
  }
  // Solid cake along the shoulder land.
  //
  // The shoulder is the widest part of the moulding — 92 mm of X travel — and its
  // normal is radial, so over the top of the arch it points straight up. Measured
  // it came back at 0.477 luma against sunlit paint at 0.502: a black plastic
  // flare returning the value of bodywork, as one pale sheet, the largest single
  // mass in the close frame. The value comes from the shared road-film dust term,
  // which is not in this file, and forty scattered pads only stippled it.
  //
  // A horizontal ledge directly above a spinning tyre is where thrown earth
  // actually accumulates, so the honest fix is to bury it: three swept bands of
  // cake, in the one key that takes arch mud and nothing else, overlapping in the
  // middle and stopping at staggered angles so the crust has a broken outline
  // instead of a moulded one. Each band's underside is buried 5-13 mm inside the
  // flare's own section, so there is no gap to see under.
  const cakeBand = (crest, reach) => [
    [0.028, 0.099 + crest * 0.002],
    [0.052, 0.095 + crest * 0.022],
    [0.086, 0.088 + crest * 0.02],
    [0.112, 0.058 + crest * 0.014],
    [0.118 + reach * 0.008, 0.04 + crest * 0.008],
    [0.114, 0.042],
    [0.086, 0.082],
    [0.03, 0.094],
  ];
  for (const [aa, bb, crest, reach] of [
    [0.24, 1.18, 1.0, 0.9],
    [1.02, 2.04, 0.72, 1.0],
    [1.86, 2.88, 0.94, 0.7],
  ]) {
    k.addMirrored('gap', archFlare({
      radius: ARCH_R,
      cz,
      sillY: SILL_Y,
      section: cakeBand(crest, reach),
      steps: 12,
      arc: [aa, bb],
    }), { pos: [fx, 0, 0] });
  }

  // Caked spray up the outer face of the flare, thinning toward the shoulder.
  // On the dark flare this is the mud line: a crusted band low on the face with
  // a broken top edge, rather than a gradient.
  const seed = cz > 0 ? 61 : 67;
  for (let i = 0; i < 20; i++) {
    const a = 0.12 + hash1(i * 5 + 1, seed) * (Math.PI - 0.24);
    const u = hash1(i * 5 + 2, seed);
    const t = -0.058 + u * u * 0.07;
    const r = ARCH_R + t;
    k.addMirrored(hash1(i * 5 + 4, 73) > 0.6 ? 'trim' : 'gap', new THREE.CircleGeometry(0.009 + hash1(i * 5 + 3, 71) * 0.018 * (1 - u * 0.6), 6), {
      pos: [fx + flareX(t) + 0.0025, S.axleY + Math.sin(a) * r, cz + Math.cos(a) * r],
      rot: [0, Math.PI / 2, 0],
    });
  }
  // And a crusted ridge low on the face, which is the mud *line*: an edge for
  // the eye to find rather than another gradient. Evenly spaced round spheres of
  // one size came back as a ring of golf balls bolted to the arch, so these run
  // at two densities, skip where the crust has fallen off, and are flattened hard
  // against the panel — a 6 mm crust, not a 30 mm ball.
  // The shoulder land is the one part of a flare that faces the sky, so it is
  // where thrown earth actually stays, and spread over the moulding's full radial
  // width it is also the only thing available here that cuts the flare's pale
  // area down — its value comes from a shared dust term this file cannot reach.
  // Each pad sits on the section at its own radius and is squashed to 3 mm: at a
  // third of the radius as a ball, and laid at one fixed X, forty of them came
  // back as a string of dark berries hanging beside the arch.
  for (let i = 0; i < 40; i++) {
    if (wobble(i * 1.7, seed + 23) < 0.34) continue;
    const a = 0.08 + ((i + (hash1(i * 3 + 1, seed + 29) - 0.5) * 1.1) / 39) * (Math.PI - 0.16);
    const t = -0.07 + wobble(i * 0.55, seed + 11) * 0.15;
    const r = ARCH_R + t;
    const s = 0.5 + wobble(i * 0.9, seed + 17) * 1.1;
    // Mostly `gap`, which is the one key that takes arch cake and nothing else.
    // In the mid-grey plastic these read as a row of pale gravel chips glued to
    // the flare; a crust has to be darker than the panel it is stuck to.
    k.addMirrored(wobble(i * 2.3, seed + 41) > 0.78 ? 'trim' : 'gap', new THREE.SphereGeometry(0.01 + s * 0.012, 6, 4), {
      pos: [fx + flareX(t) + 0.0015, S.axleY + Math.sin(a) * r, cz + Math.cos(a) * r],
      scale: [0.14, 1, 0.8 + s * 0.6],
      rot: [(hash1(i * 3 + 2, seed + 29) - 0.5) * 1.2, 0, 0],
    });
  }
  // Stone chipping through to bare metal along the flare's leading edge and on
  // the panel behind the opening — the two places a 4x4 loses its finish first.
  for (let i = 0; i < 9; i++) {
    const a = 0.16 + hash1(i * 3 + 1, seed + 5) * 0.62;
    const t = -0.05 + hash1(i * 3 + 2, seed + 5) * 0.1;
    const r = ARCH_R + t;
    // Steel, not bare aluminium: at 5 mm across, a satin disc against dark
    // plastic resolves to a white speck and nine of them read as snow.
    k.addMirrored('steel', new THREE.CircleGeometry(0.004 + hash1(i * 3 + 3, seed + 5) * 0.007, 5), {
      pos: [fx + flareX(t) + 0.002, S.axleY + Math.sin(a) * r, cz + Math.cos(a) * r],
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
  // Push-pins holding the liner up. Two sizes, wandering spacing, one gone and
  // the hole it left behind: a row of seven identical bright domes at an exact
  // pitch is the one thing in the wheel well that looked machined.
  for (let i = 0; i < 9; i++) {
    const a = 0.26 + ((i + (hash1(i * 4 + 1, 13) - 0.5) * 0.8) / 8) * (Math.PI - 0.52);
    const s = 0.66 + hash1(i * 4 + 2, 13) * 0.5;
    const p = [0.8 + (hash1(i * 4 + 3, 13) - 0.5) * 0.03, S.axleY + Math.sin(a) * 0.532, cz + Math.cos(a) * 0.532];
    if (i === 5) {
      k.addMirrored('gap', new THREE.CylinderGeometry(0.011, 0.011, 0.02, 8), { pos: p, rot: [0, 0, Math.PI / 2] });
      continue;
    }
    k.addMirrored('trimGloss', rivet(0.012 * s, 0.007 * s), { pos: p, rot: [0, 0, -Math.PI / 2] });
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
  // Reveal down the body-side moulding, not brightwork. A 16 mm chrome insert is
  // sub-pixel wide at any sane viewing distance, so all a mirror material can do
  // with it is return one blown highlight per segment — three chopped bars per
  // side came back as a dotted line of white sparks stitched along the flank,
  // which was the loudest artificial thing left in the rear frame. A dark
  // recessed groove is what the eye actually reads as a moulding, and it costs
  // the same triangles.
  for (const [i, [zc, len]] of [[1.62, 0.92], [0.49, 0.86], [-0.43, 0.82], [-1.7, 1.3]].entries()) {
    brokenBar(k, 'gap', {
      w: 0.014,
      h: 0.012,
      d: len - 0.06,
      r: 0.003,
      axis: 'z',
      pos: [HW + 0.019, SILL_Y + 0.148, zc],
      segs: 3,
      seed: 60 + i,
      cut: 0.026,
      jit: 0.0018,
      drop: i === 0 ? 0.7 : 0.24,
      mirror: true,
    });
    // one short scuffed alu wear plate per moulding, where a boot goes in
    if (i % 2 === 0) {
      k.addMirrored('steel', rbox(0.022, 0.026, 0.14, 0.005), {
        pos: [HW + 0.02, SILL_Y + 0.148, zc - len * 0.22],
      });
    }
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
  // Fabricated from three lengths of box with the welds showing, each folded on
  // its own press and none of them quite in line. As one 1.9 m rounded box the
  // top fold ran the full width of the frame as one unbroken specular.
  brokenBar(k, 'steelDark', {
    w: 1.9,
    h: 0.13,
    d: 0.21,
    r: 0.035,
    axis: 'x',
    pos: [0, 0.755, bz],
    segs: 3,
    seed: 11,
    cut: 0.004,
    jit: 0.0022,
    seg: 2,
  });
  for (const dx of [-0.31, 0.33]) {
    weldBead(k, 'steel', { pos: [dx, 0.755, bz + 0.104], r: 0.062, tube: 0.0075, seed: 4 + dx });
  }
  edgeKnocks(k, {
    from: [-0.88, 0.818, bz + 0.1],
    to: [0.88, 0.818, bz + 0.1],
    n: 11,
    seed: 12,
    len: 0.05,
    size: 0.014,
    bright: 'steel',
  });
  k.addMirrored('steelDark', rbox(0.44, 0.28, 0.2, 0.04), { pos: [0.7, 0.86, bz] });
  k.addMirrored('steelDark', rbox(0.2, 0.3, 0.34, 0.05), { pos: [0.92, 0.87, bz - 0.13], rot: [0, -0.28, 0] });
  k.add('gap', rbox(0.9, 0.2, 0.05, 0.006), { pos: [0, 0.9, bz - 0.1] });
  // Machined chamfer along the top and bottom of the whole bar, and a brushed
  // rub rail across it: a fabricated bumper is folded plate, not one dark block.
  // One chamfer along the top fold and chequer plate across the lower face. Two
  // full-width chamfers read as bolted-on tubing rather than as folded plate,
  // and the face below them was the last big dark flat on the nose.
  brokenSwage(k, 'steel', { len: 1.88, size: 0.024, pos: [0, 0.822, bz + 0.104], axis: 'x', segs: 4, seed: 15 });
  brokenBar(k, 'plate', {
    w: 1.86,
    h: 0.075,
    d: 0.024,
    r: 0.005,
    axis: 'x',
    pos: [0, 0.735, bz + 0.104],
    segs: 3,
    seed: 17,
    cut: 0.01,
    jit: 0.0018,
  });
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

/**
 * Door mirror.
 *
 * The old one was a plastic box on two stalks with a flat plane in it, and from
 * three metres it read as a pale pill: one value on the shell, one value on the
 * face, no bracket, no bezel, and nothing to say which side the glass was on.
 * Four things fix that, and all of them are on the real hardware:
 *
 *  - the face is *convex*, so it grades trail-to-treeline-to-sky across itself
 *    instead of returning the one value a flat mirror in a static environment
 *    has to return;
 *  - it sits in a bezel with a shadow gap round it, which is what tells you the
 *    glass is set into something rather than painted on it;
 *  - the back shell is drafted and has a parting seam, so the object has a
 *    light side and a dark side of its own;
 *  - the arm lands on a gasketed foot bolted to the door skin rather than
 *    disappearing into the beltline moulding, which is where it used to
 *    intersect the trim it was supposed to be bolted beside.
 *
 * The head faces the driver. Through round 4 the glass was aimed 13 degrees
 * aft of straight outboard — a head whose face pointed at the verge — so from
 * every seat camera the pane was culled and the reflection, painted or live,
 * never faced the eye (critic A: "a fixed horizon card and no flank"; critic
 * B: "shows nothing at fast"). A door mirror is aimed at the driver: its
 * normal points aft and about twenty degrees inboard, so the reflected ray
 * from the seat runs back down the flank with the rear door and the bed side
 * filling the inboard fifth of the glass, and it is pitched a degree or so
 * down so the horizon sits in the upper half of the pane rather than along
 * the sill. From ahead you read the back shell, from the seat the mirror.
 */
function doorMirror(k, sd, beltY) {
  // Fore-aft datum. The clear band on the door skin runs from the top of the
  // upper swage (1.177) to the underside of the beltline moulding (1.350), and
  // z is picked to clear the snorkel, which passes 130 mm forward of it.
  const mz = 0.8;
  // Yaw of the glass normal off straight outboard, toward aft: 112 degrees
  // puts the normal 22 degrees inboard of straight aft. Solved for the
  // driver's eye at (0.3, 1.6, -0.16): at 110 the pane's centre reflected
  // straight down the truck's axis and the live pass at `high` showed plain
  // to the inboard edge with no flank in it (the eye is 0.25 m inboard of
  // the glass, so a ray parallel to the flank never meets it). Two more
  // degrees of toe turn the reflected ray four degrees inboard — the centre
  // ray meets the body side 3.6 m back, past the rear corner, and the
  // inboard-edge ray meets it 1.4 m back — so the flank fills roughly the
  // inboard third of the glass, which is what a mirror set for driving shows.
  // The pane's own convexity widens the view either side of that.
  const A = 1.955;
  // Pitch of the whole head about the glass plane's horizontal, downward. The
  // eye sits 40 mm under the pane's centre, so with a level pane the horizon
  // reflects at 73 % of the way down the glass; 1.5 degrees of pitch lifts it
  // to 40 %.
  const P = 0.026;
  const ca = Math.cos(A);
  const sa = Math.sin(A);
  // Head frame: `out` is the glass normal, `across` lies in the glass plane
  // (outboard-ish), `up` is the pane's vertical — all three pitched by P.
  const hx = sd * (HW + 0.25);
  const hy = beltY + 0.285;
  const hz = mz + 0.005;
  const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(sd * sa, 0, ca), -sd * P);
  const _o = new THREE.Vector3();
  const put = (du, dv, dw) => {
    _o.set(sd * ca * du + sd * sa * dv, dw, -sa * du + ca * dv).applyQuaternion(qPitch);
    return [hx + _o.x, hy + _o.y, hz + _o.z];
  };
  const pitched = (euler) => new THREE.Quaternion().setFromEuler(new THREE.Euler(...euler)).premultiply(qPitch);
  // maps a box's local X onto `out`, its local Z onto the glass plane
  const RY = sd > 0 ? A : Math.PI - A;
  const BOX = pitched([0, RY, 0]);
  // maps a plane's or a torus's local Z onto `out`
  const FACE = pitched([0, sd * (Math.PI / 2 + A), 0]);
  const OUTB = pitched([0, RY, -Math.PI / 2]); // a bolt driven along `out`
  // a bolt driven inboard-to-outboard, into the door skin: fixed to the body,
  // not to the head's yaw
  const OUTX = [0, sd > 0 ? 0 : Math.PI, -Math.PI / 2];

  // --- foot: gasket, cast bracket, three bolts ----------------------------
  k.add('gap', gbox(0.01, 0.196, 0.166, 0.003), { pos: [sd * (HW - 0.004), beltY - 0.065, mz] });
  k.add('rubber', gbox(0.016, 0.176, 0.146, 0.006), { pos: [sd * (HW - 0.001), beltY - 0.065, mz] });
  k.add('steelDark', gbox(0.03, 0.152, 0.126, 0.014), { pos: [sd * (HW + 0.019), beltY - 0.065, mz] });
  k.add('steelDark', gbox(0.052, 0.098, 0.084, 0.022), { pos: [sd * (HW + 0.046), beltY - 0.062, mz] });
  for (const [dy, dz] of [[0.058, 0.0], [-0.052, 0.036], [-0.052, -0.036]]) {
    k.add('alu', rivet(0.014, 0.004), {
      pos: [sd * (HW + 0.035), beltY - 0.065 + dy, mz + dz],
      rot: OUTX,
    });
    k.add('steel', bolt(0.0095, 0.008), {
      pos: [sd * (HW + 0.038), beltY - 0.065 + dy, mz + dz],
      rot: OUTX,
    });
  }
  // wiring for the repeater, tucked into the foot behind a grommet
  k.add('rubber', new THREE.TorusGeometry(0.011, 0.005, 5, 10), {
    pos: [sd * (HW + 0.013), beltY - 0.128, mz - 0.03],
    rot: [Math.PI / 2, 0, 0],
  });

  // --- arms: upper stalk, lower stay, and the tie between them ------------
  // Both stays end inside the back shell, inboard of the knuckle: with the head
  // facing aft the shell's depth runs fore-aft, so the ends are given in the
  // head's own frame rather than in body space.
  const armTop = [
    [sd * (HW + 0.062), beltY - 0.028, mz + 0.008],
    [sd * (HW + 0.136), beltY + 0.096, mz + 0.03],
    put(-0.05, -0.05, -0.04),
  ];
  const armLow = [
    [sd * (HW + 0.056), beltY - 0.115, mz - 0.03],
    [sd * (HW + 0.132), beltY + 0.005, mz + 0.0],
    put(-0.05, -0.055, -0.125),
  ];
  k.add('steelDark', tube(armTop, 0.019, 9));
  k.add('steelDark', tube(armLow, 0.0145, 8));
  k.add('steelDark', gbox(0.038, 0.05, 0.05, 0.012), { pos: armTop[0] });
  k.add('steelDark', gbox(0.034, 0.044, 0.044, 0.01), { pos: armLow[0] });
  // Turned ferrules where each stay leaves its socket. A powder-coated arm is
  // the same value as the shell it carries and as the moulding it bolts to, so
  // the whole assembly was one dark mass in the wheel framing; these are the
  // only bright things on it and they sit at the two joints, which is where a
  // real one is machined back to bare metal anyway.
  for (const [a, r] of [[armTop, 0.021], [armLow, 0.016]]) {
    const d = new THREE.Vector3().fromArray(a[1]).sub(new THREE.Vector3().fromArray(a[0]));
    k.add('alu', new THREE.CylinderGeometry(r, r, 0.016, 12), {
      pos: new THREE.Vector3().fromArray(a[0]).addScaledVector(d.normalize(), 0.03).toArray(),
      quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d),
    });
  }
  // swaged flats where a stay is pressed before it is drilled
  k.add('steelDark', gbox(0.028, 0.052, 0.03, 0.006), {
    pos: [sd * (HW + 0.168), beltY + 0.082, mz - 0.014],
    rot: [0, 0, sd * 0.9],
  });
  k.add('steel', bolt(0.008, 0.007), {
    pos: [sd * (HW + 0.172), beltY + 0.082, mz - 0.014],
    rot: OUTX,
  });

  // --- head ---------------------------------------------------------------
  // back shell in two drafted steps, so the object has an outline that changes
  // depth rather than one slab silhouette
  k.add('trim', rbox(0.05, 0.302, 0.186, 0.03), { pos: put(-0.03, 0, 0), quat: BOX });
  k.add('trim', gbox(0.03, 0.244, 0.142, 0.034), { pos: put(-0.062, 0, 0), quat: BOX });
  // moulding ribs down the back, and the drain notch at the bottom of the shell
  for (const dv of [-0.042, 0.042]) {
    k.add('trim', gbox(0.014, 0.19, 0.016, 0.005), { pos: put(-0.072, dv, 0.004), quat: BOX });
  }
  k.add('gap', gbox(0.026, 0.005, 0.048, 0.001), { pos: put(-0.036, -0.01, -0.149), quat: BOX });
  // the parting seam between the shell and the bezel: two mouldings clipped
  // together always show one, and it is the line that says this is a housing
  k.add('gap', gbox(0.008, 0.306, 0.19, 0.002), { pos: put(-0.006, 0, 0), quat: BOX });
  // knuckle: the head pivots on the arm, so there is a boss and a pinch bolt
  k.add('trimGloss', new THREE.SphereGeometry(0.031, 12, 8), { pos: put(-0.07, -0.014, -0.032) });
  k.add('trimGloss', new THREE.CylinderGeometry(0.021, 0.024, 0.032, 12), {
    pos: put(-0.084, -0.014, -0.032),
    quat: OUTB,
  });
  k.add('alu', new THREE.CylinderGeometry(0.026, 0.026, 0.009, 12), {
    pos: put(-0.077, -0.014, -0.032),
    quat: OUTB,
  });
  k.add('steel', bolt(0.0085, 0.008), { pos: put(-0.05, -0.05, -0.052), quat: OUTB });

  // Bezel round the aperture, in `steel` over a `trim` shell. Every part of this
  // object was a black plastic key and the whole head resolved to one value; a
  // mid-grey frame is most of a stop above the shell, which is the cheapest
  // value break available and it lands exactly where the eye is already looking.
  //
  // Everything from here forward is stacked out from the shell's front face at
  // du = -0.005, and the order matters. The panes sat *behind* that face for two
  // rounds: a convex pane's rim is its deepest point, so the shell and the well
  // slab both stood in front of the glass everywhere except a disc in the
  // middle, which clipped a rectangular mirror down to an ellipse and buried the
  // rest in a cavity. Measured, the aperture read 0.065 luma flat across.
  for (const dw of [-0.137, 0.137]) {
    k.add('steel', gbox(0.026, 0.026, 0.184, 0.007), { pos: put(0.008, 0, dw), quat: BOX });
  }
  for (const dv of [-0.081, 0.081]) {
    k.add('steel', gbox(0.026, 0.302, 0.022, 0.007), { pos: put(0.008, dv, 0), quat: BOX });
  }
  // dark well behind the glass, so the aperture has a shadow line all round
  k.add('gap', gbox(0.02, 0.254, 0.146, 0.004), { pos: put(-0.015, 0, 0), quat: BOX });
  // Bright retaining lip, between the frame and the glass. This is the 1 cm tier
  // on the one part of the mirror that is read from three metres, and it is what
  // keeps the aperture legible while the glass is dark: a thin lit line all the
  // way round says recessed pane, where a dark frame against dark glass says
  // hole.
  for (const dw of [-0.1235, 0.1235]) {
    k.add('alu', gbox(0.008, 0.009, 0.152, 0.002), { pos: put(0.004, 0, dw), quat: BOX });
  }
  for (const dv of [-0.0715, 0.0715]) {
    k.add('alu', gbox(0.008, 0.256, 0.009, 0.002), { pos: put(0.004, dv, 0), quat: BOX });
  }
  // The bezel lip proper: 4 mm of dark rubber between the bright retaining lip
  // and the glass, lapping the pane's edge. A pane set straight into bright
  // metal reads as a decal on it; the dark line is the depth of the aperture,
  // and the alu lip outside it is the bevel that catches the highlight. Sized
  // over the main pane and the spot pane together, with a run each side of the
  // divider bar so both apertures are lipped.
  for (const dw of [-0.1185, -0.0565, -0.0395, 0.1185]) {
    k.add('gasket', gbox(0.006, 0.004, 0.142, 0.0015), { pos: put(0.006, 0, dw), quat: BOX });
  }
  for (const dv of [-0.0665, 0.0665]) {
    k.add('gasket', gbox(0.006, 0.246, 0.004, 0.0015), { pos: put(0.006, dv, 0), quat: BOX });
  }
  // The aperture is split, which is both what a truck mirror looks like and the
  // only way this object gets a value range across its front: the main pane is
  // aimed level and grades trail-to-sky, the spot pane under it is aimed down
  // and holds the dark end, and the divider between them is a hard black line.
  // `mirrorGlass`, not `chrome` or `reflector`. The reflector's brightwork has
  // no curvature gate and a narrow tree band, which on paper is the better grade
  // for a pane, but it carries a stamped albedo and a normal map meant for a
  // headlamp bowl and at this size they resolve to speckle. Chrome stood in for
  // a while and its 0.26 roughness smears the graded skyline flat.
  k.add('mirrorGlass', convexPane(0.136, 0.163, 0.32), { pos: put(-0.003, 0, 0.042), quat: FACE });
  k.add('steel', gbox(0.024, 0.014, 0.134, 0.004), { pos: put(0.004, 0, -0.048), quat: BOX });
  k.add('gap', gbox(0.016, 0.006, 0.136, 0.001), { pos: put(-0.004, 0, -0.048), quat: BOX });
  // pitch is about the glass plane's own horizontal, which no Euler order gives
  const spotQ = new THREE.Quaternion()
    .setFromAxisAngle(new THREE.Vector3(sd * sa, 0, ca), -sd * 0.19)
    .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, sd * (Math.PI / 2 + A + 0.1), 0)))
    .premultiply(qPitch);
  k.add('mirrorGlass', convexPane(0.136, 0.067, 0.3), { pos: put(-0.004, 0, -0.0895), quat: spotQ });

  // --- convex spotter, hung under the head in its own housing -------------
  k.add('trim', gbox(0.046, 0.062, 0.086, 0.016), { pos: put(-0.018, -0.002, -0.186), quat: BOX });
  k.add('gap', new THREE.CylinderGeometry(0.028, 0.028, 0.018, 12), {
    pos: put(-0.001, -0.002, -0.186),
    quat: OUTB,
  });
  k.add('chrome', sphericalCap(0.028, 0.009), { pos: put(0.003, -0.002, -0.186), quat: FACE });
  k.add('alu', new THREE.TorusGeometry(0.031, 0.0055, 5, 14), {
    pos: put(0.007, -0.002, -0.186),
    quat: FACE,
  });

  // --- side repeater on the leading edge ----------------------------------
  // Down twice now: from a 110 mm bar, which tiled the lens normal map once and
  // read as a moulded orange brick, and then from 34 x 52, where the lens was
  // still the brightest saturated thing within a metre of it and pulled the eye
  // off the glass. A repeater is a small part sunk into a moulding, so it is
  // sunk: the housing stands proud, the lens does not, and the shadow round it
  // is what stops a flat emissive rectangle reading as a sticker.
  // On the forward face of the shell now that the head faces aft: the lens
  // points up the road, outboard of the knuckle boss.
  k.add('trim', gbox(0.03, 0.062, 0.05, 0.01), { pos: put(-0.084, 0.03, 0.03), quat: BOX });
  k.add('gap', gbox(0.012, 0.048, 0.038, 0.002), { pos: put(-0.094, 0.03, 0.03), quat: BOX });
  k.add('amber', gbox(0.01, 0.038, 0.028, 0.003), { pos: put(-0.0955, 0.03, 0.03), quat: BOX });
  for (const dw of [-0.026, 0.026]) {
    k.add('chrome', gbox(0.012, 0.006, 0.034, 0.002), { pos: put(-0.094, 0.03, 0.03 + dw), quat: BOX });
  }
}

/**
 * A pane in its rubber.
 *
 * Three parts, from the glass outwards:
 *
 *  - the sheet itself, one quad in the pane material;
 *  - its cut edge, a 7 mm rim in `glassEdge` the thickness of the sheet
 *    (6 mm), standing 2.5 mm proud of the outer face — the one line on a
 *    window that catches a highlight. It used to be a 14 mm frame flush with
 *    the quad, which read from outside as a green rule and from the seats as a
 *    black band along the sill, since nothing in the cab lights the cut face;
 *  - the gasket, a 16 mm EPDM channel with a 5 mm radius, lapping the outer
 *    3 mm of the sheet and standing 7 mm proud on both faces. It is
 *    what separates glass from paint in every exterior view and is the sill
 *    seen from inside. Corners are lapped rather than mitred: the two long
 *    runs go full width and the short ones sit between them, which is also
 *    how a real channel is fitted.
 *
 * `mirror` adds the pane on both sides, the far one with its uvs mirrored too,
 * so the film reads the same way round on both doors.
 */
function pane(k, key, w, h, { pos, rot, mirror = false }) {
  const T = 0.006; // sheet thickness
  const E = 0.007; // rim width
  const G = 0.016; // gasket width
  const GD = 0.02; // gasket depth (proud on both faces)
  const LAP = 0.003; // how far the gasket lips over the glass
  const add = mirror ? (key2, g, x) => k.addMirrored(key2, g, x) : (key2, g, x) => k.add(key2, g, x);
  add(key, new THREE.PlaneGeometry(w, h), { pos, rot });
  // the rim sits mostly behind the outer face, 2.5 mm proud of it
  for (const [bw, bh, x, y] of [
    [w, E, 0, h * 0.5 - E * 0.5],
    [w, E, 0, -(h * 0.5 - E * 0.5)],
    [E, h - E * 2, w * 0.5 - E * 0.5, 0],
    [E, h - E * 2, -(w * 0.5 - E * 0.5), 0],
  ]) {
    add('glassEdge', new THREE.BoxGeometry(bw, bh, T).translate(x, y, 0.0025 - T * 0.5), { pos, rot });
  }
  const gw = w + 2 * (G - LAP);
  const gh = h + 2 * (G - LAP);
  for (const [bw, bh, x, y] of [
    [gw, G, 0, gh * 0.5 - G * 0.5],
    [gw, G, 0, -(gh * 0.5 - G * 0.5)],
    [G, gh - G * 2, gw * 0.5 - G * 0.5, 0],
    [G, gh - G * 2, -(gw * 0.5 - G * 0.5), 0],
  ]) {
    add('gasket', rbox(bw, bh, GD, 0.005, 2).translate(x, y, 0), { pos, rot });
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
  pane(k, 'glass', HW * 2 - 0.22, wsLen - 0.03, {
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
  // The rear wall is four panels round a real aperture. It used to be one slab
  // with the glass, its seal and its trims all placed *inside* it — eighty
  // millimetres of paint between the pane and the camera — so from behind the
  // cab was a blank green wall with a lamp on it, and from the driver's seat
  // the "window" was the back of that slab. Now the pane is on the aft face
  // where the bed camera sees it and the cab is open through it.
  {
    const wallD = 0.08;
    const wallZ = S.cabRearZ + 0.02;
    const wallW = HW * 2 - 0.06;
    const apW = 1.28;
    const apY0 = beltY + 0.11;
    const apY1 = beltY + 0.57;
    const wallY0 = beltY;
    const wallY1 = S.roofY - 0.02;
    k.add('paint', rbox(wallW, apY0 - wallY0, wallD, 0.03), { pos: [0, (apY0 + wallY0) * 0.5, wallZ] });
    k.add('paint', rbox(wallW, wallY1 - apY1, wallD, 0.03), { pos: [0, (apY1 + wallY1) * 0.5, wallZ] });
    for (const side of [-1, 1]) {
      k.add('paint', rbox((wallW - apW) * 0.5, apY1 - apY0 + 0.02, wallD, 0.024), {
        pos: [side * (apW + (wallW - apW) * 0.5) * 0.5, (apY0 + apY1) * 0.5, wallZ],
      });
    }
    // rubber seal lining the aperture, standing a few millimetres proud of the
    // paint on the outside and finishing it on the inside
    const sealZ = S.cabRearZ - 0.02;
    for (const [w, h, x, y] of [
      [apW + 0.04, 0.04, 0, apY1],
      [apW + 0.04, 0.04, 0, apY0],
      [0.04, apY1 - apY0, apW * 0.5, (apY0 + apY1) * 0.5],
      [0.04, apY1 - apY0, -apW * 0.5, (apY0 + apY1) * 0.5],
    ]) {
      k.add('gap', rbox(w, h, 0.09, 0.006), { pos: [x, y, sealZ] });
    }
    // Turned to face aft. A PlaneGeometry's front is +z, which here pointed
    // into the cab, so the pane model took the outside of the rear glass for
    // its cabin side: reflection cut to a fifth, dust thinned, the one window
    // on the truck that did not match the others.
    pane(k, 'glassDark', apW - 0.02, apY1 - apY0 - 0.02, { pos: [0, beltY + 0.34, S.cabRearZ - 0.05], rot: [0, Math.PI, 0] });
    k.add('trim', rbox(1.4, 0.05, 0.045, 0.012), { pos: [0, apY1 + 0.03, S.cabRearZ - 0.04] });
    k.add('trim', rbox(1.4, 0.045, 0.045, 0.012), { pos: [0, apY0 - 0.03, S.cabRearZ - 0.04] });
  }
  k.add('trim', rbox(0.34, 0.07, 0.05, 0.014), { pos: [0, S.roofY - 0.11, S.cabRearZ + 0.02] });
  k.add('taillight', rbox(0.3, 0.045, 0.03, 0.008), { pos: [0, S.roofY - 0.11, S.cabRearZ - 0.008] });

  // --- door glass: two panes with a real division bar --------------------
  const paneTop = S.roofY - 0.1;
  for (const [zf, zr] of [
    [0.9, 0.06],
    [0.02, S.cabRearZ + 0.07],
  ]) {
    const len = zf - zr;
    // Right-hand pane and its mirror: a +90 yaw puts the quad's +u aft, so the
    // film's wind streaks trail the right way, and the mirrored copy keeps that
    // rather than reversing it the way a -90 yaw would.
    pane(k, 'glassSide', len, paneTop - beltY - 0.07, {
      pos: [HW - 0.045, (paneTop + beltY) * 0.5 - 0.03, (zf + zr) * 0.5],
      rot: [0, Math.PI * 0.5, 0],
      mirror: true,
    });
  }
  for (const side of [-1, 1]) {
    for (const [zf, zr] of [
      [0.9, 0.06],
      [0.02, S.cabRearZ + 0.07],
    ]) {
      const len = zf - zr;
      // Header and belt mouldings, butted to the gasket rather than crossing
      // the glass: the belt moulding used to sit 45 mm up the pane, so from the
      // seats it was a black bar across the bottom of every door window.
      k.add('trim', rbox(0.05, 0.028, len + 0.02, 0.008), {
        pos: [side * (HW - 0.03), paneTop - 0.032, (zf + zr) * 0.5],
      });
      k.add('trim', rbox(0.05, 0.026, len, 0.008), {
        pos: [side * (HW - 0.03), beltY - 0.012, (zf + zr) * 0.5],
      });
    }
    k.add('trim', rbox(0.055, paneTop - beltY, 0.03, 0.01), {
      pos: [side * (HW - 0.03), (paneTop + beltY) * 0.5, 0.04],
    });
  }

  // --- mirrors -----------------------------------------------------------
  for (const side of [-1, 1]) doorMirror(k, side, beltY);

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
  brokenBar(k, 'trimGloss', {
    w: 0.026,
    h: 0.016,
    d: cabL - 0.02,
    r: 0.005,
    axis: 'z',
    pos: [HW - 0.014, S.roofY + 0.014, cabZ - 0.02],
    segs: 3,
    seed: 55,
    cut: 0.014,
    jit: 0.0015,
    mirror: true,
  });
  // roof-edge drain slots, where the drip rail lets water off over the doors
  for (const dz of [-0.5, 0.1, 0.62]) {
    k.addMirrored('gap', new THREE.BoxGeometry(0.03, 0.012, 0.03), {
      pos: [HW - 0.03, S.roofY - 0.026, cabZ + dz],
    });
  }
  for (const z of [-0.55, -0.05, 0.45]) {
    k.add('paintRoof', swage(HW * 2 - 0.44, 0.026), {
      pos: [0, S.roofY + 0.052, cabZ + z],
      rot: [0, Math.PI / 2, 0],
    });
  }
  // Roof aerial: base, rubber grommet where it passes through the panel, and a
  // whip with a real curve in it. A dead straight rod is the same tell as a dead
  // straight panel edge — every aerial that has been under a branch has a set.
  const ax = -(HW - 0.14);
  const az = S.cabRearZ + 0.18;
  k.add('trim', rbox(0.055, 0.03, 0.055, 0.012), { pos: [ax, S.roofY + 0.07, az] });
  k.add('rubber', new THREE.TorusGeometry(0.018, 0.008, 6, 12), {
    pos: [ax, S.roofY + 0.086, az],
    rot: [Math.PI / 2, 0, 0],
  });
  k.add('trimGloss', tube(
    [
      [ax, S.roofY + 0.09, az],
      [ax + 0.02, S.roofY + 0.34, az - 0.05],
      [ax + 0.075, S.roofY + 0.58, az - 0.13],
      [ax + 0.16, S.roofY + 0.7, az - 0.26],
    ],
    0.0055,
    6,
  ));
  k.add('trimGloss', new THREE.SphereGeometry(0.009, 6, 4), { pos: [ax + 0.16, S.roofY + 0.7, az - 0.26] });
  // and the coax off the base, clipped down the rear pillar
  k.add('rubber', tube(
    [
      [ax, S.roofY + 0.06, az],
      [ax - 0.01, S.roofY + 0.01, az - 0.06],
      [ax - 0.02, S.roofY - 0.06, az - 0.08],
    ],
    0.0055,
    6,
  ));
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
  brokenBar(k, 'steel', {
    w: 0.04,
    h: 0.016,
    d: bedL - 0.08,
    r: 0.005,
    axis: 'z',
    pos: [HW - 0.135, S.bedTopY + 0.012, bedZ],
    segs: 3,
    seed: 91,
    cut: 0.01,
    jit: 0.0016,
    mirror: true,
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

  // Bedside shoulder and rail cap. Two jobs: the shoulder was the longest unbroken
  // painted edge left on the truck — 2.4 m of constant 20 mm fillet — so it runs in
  // three pressings with the radius and the height varying between them; and it is
  // now wide enough to reach the skin.
  //
  // The flank panels are extruded outlines with a 12 mm bevel all round, and along
  // the bedside's top that bevel is a 12 mm strip pitched up at 45 degrees, running
  // 1.5 m dead straight. A picker put the row of evenly spaced bright specks on the
  // bedside exactly there — local y 1.42 on the skin plane at x = 0.88 — and at six
  // pixels of pitch it was a thin bright line aliasing, not hardware. A real bed
  // rail is folded and capped rather than left as a raw edge, so the shoulder
  // pressing covers it.
  brokenBar(k, 'paint', {
    w: 0.14,
    h: 0.06,
    d: bedL,
    r: 0.02,
    axis: 'z',
    pos: [HW - 0.063, S.bedTopY + 0.005, bedZ],
    segs: 3,
    seed: 59,
    cut: 0.005,
    jit: 0.0015,
    seg: 2,
    mirror: true,
  });
  brokenBar(k, 'trim', {
    w: 0.15,
    h: 0.055,
    d: bedL,
    r: 0.02,
    axis: 'z',
    pos: [HW - 0.045, railY, bedZ],
    segs: 3,
    seed: 67,
    cut: 0.006,
    jit: 0.0016,
    mirror: true,
  });
  // Rail wear cap in three sections with a sag between the mounts. This was the
  // longest unbroken bright line on the truck and, side lit, the one thing that
  // said "extruded in software" from thirty metres. Ribbed black plastic rather
  // than bare alu: the cap is 60 mm wide and 2 m long, and in aluminium it read
  // as a strip light running the length of the bed however short the sections got.
  brokenBar(k, 'trimGloss', {
    w: 0.06,
    h: 0.018,
    d: bedL - 0.06,
    r: 0.006,
    axis: 'z',
    pos: [HW - 0.005, railY + 0.032, bedZ],
    segs: 3,
    seed: 93,
    cut: 0.012,
    jit: 0.0018,
    sag: 0.0022,
    mirror: true,
  });
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
  // Crowned field, not a flat plate. A 1.4 m plate square to the light returns
  // one specular value over its whole area and blooms into a white slab — the
  // single worst thing in the rear frame. A 13 mm crown across the width sweeps
  // that highlight into a band and leaves the corners dark.
  const tgCrown = 0.013;
  const tgField = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    tgField.push([-0.72 + 1.44 * t, fieldFace - Math.sin(t * Math.PI) * tgCrown]);
  }
  tgField.push([0.72, fieldZ + 0.035], [-0.72, fieldZ + 0.035]);
  // Swept 40 mm taller than the aperture it fills, so both ends of the sweep — and
  // with them the 8 mm bevel ring at each end — finish inside the border pressings
  // rather than in the open. The lower ring was an 8 mm ledge facing straight up,
  // 1.44 m wide, and it was the last thing in the rear frame still clipping to
  // white: a picker put the line on it at local y 1.057, and its face normal came
  // back as (0, 0.98, -0.2).
  k.add('paint', crownZ(tgField, tgY1 - tgY0 - 0.11), { pos: [0, tgCy, 0] });
  brokenSwage(k, 'paint', { len: 1.4, size: 0.03, pos: [0, tgCy + 0.105, fieldFace - 0.004], axis: 'x', segs: 3, seed: 71 });
  brokenSwage(k, 'paint', { len: 1.4, size: 0.023, pos: [0, tgCy - 0.135, fieldFace - 0.004], axis: 'x', segs: 3, seed: 73 });
  // Moved off centre and down a size: the spare on the swing-out now hangs over
  // the middle of the gate, so the wordmark lives on the far side of it.
  k.add('decalName', new THREE.PlaneGeometry(0.5, 0.132), {
    pos: [-0.44, tgCy - 0.02, fieldFace - 0.0135],
    rot: [0, Math.PI, 0.004],
  });
  // Machined applique across the top of the field and a diamond-plate kick strip
  // across the bottom. Both come in short lengths with the joins showing: as one
  // 1.3 m bar the applique caught the whole sky at once and leaked light across
  // the gate, which is the same failure as the flat field behind it.
  // Dark anodised, not bright steel, and pitched back about fifteen degrees. In
  // `steel` this bar was the second of the two strips clipping to white across the
  // gate: a 26 mm land held dead level, 1.3 m long, pointed at the horizon band.
  // `steelDark` is the key already tuned to hold flat stock down, and the pitch
  // lifts the reflected ray clear of the band.
  brokenBar(k, 'steelDark', {
    w: 1.3,
    h: 0.026,
    d: 0.02,
    r: 0.005,
    axis: 'x',
    pos: [0, tgY1 - 0.055, fieldFace - 0.012],
    rot: [-0.27, 0, 0],
    segs: 3,
    seed: 81,
    cut: 0.014,
    jit: 0.0022,
  });
  for (const dx of [-0.6, -0.2, 0.2, 0.6]) {
    k.add('steel', bolt(0.011, 0.008), { pos: [dx, tgY1 - 0.055, fieldFace - 0.024], rot: [-Math.PI / 2, 0, 0] });
  }
  brokenBar(k, 'plate', {
    w: 1.36,
    h: 0.05,
    d: 0.022,
    r: 0.006,
    axis: 'x',
    pos: [0, tgY0 + 0.032, outer - 0.04],
    segs: 3,
    seed: 83,
    cut: 0.01,
    jit: 0.0018,
  });
  // handle in a recess, hinges, latch strikers, top cap
  k.add('gap', rbox(0.34, 0.11, 0.05, 0.01), { pos: [0.3, tgY1 - 0.14, fieldFace + 0.018] });
  k.add('trimGloss', rbox(0.3, 0.075, 0.07, 0.018), { pos: [0.3, tgY1 - 0.145, fieldFace - 0.024] });
  k.add('chrome', rbox(0.24, 0.032, 0.04, 0.008), { pos: [0.3, tgY1 - 0.14, fieldFace - 0.054] });
  k.addMirrored('trim', rbox(0.16, 0.06, 0.08, 0.014), { pos: [0.64, tgY0 + 0.01, outer + 0.05] });
  k.addMirrored('steelDark', new THREE.CylinderGeometry(0.02, 0.02, 0.09, 12), {
    pos: [0.7, tgY0 + 0.01, outer + 0.03],
    rot: [0, 0, Math.PI / 2],
  });
  // Tailgate top cap — a black rubber moulding hooked down over the gate's skin.
  //
  // This started as a flat-topped box 110 mm deep and 1.64 m wide with a second
  // flat bar laid on it, and the pair were the brightest thing in the rear frame
  // by a wide margin: 0.60 luma against 0.36 paint, clipping to pure white. Two
  // horizontal lands running across the truck, seen from a camera just above them,
  // send their reflected ray into the horizon band — the hottest zone of the
  // graded environment by an order of magnitude.
  //
  // Pitching the top *back* to break the horizontal was worse, not better: it
  // turned a foreshortened band into a 90 mm face presented square to the camera,
  // and the strip went from a hot line to a wide pale slab. Geometry alone cannot
  // win this one, because the lift is coming from the material's analytic sky
  // terms. `gap` is the only key on the truck carrying neither a brightwork band
  // worth the name (0.2 strength against trim's 0.42) nor a large ambient (0.7
  // against 1.7), and it takes arch cake — which is what a tailgate cap on a trail
  // truck actually looks like. So the cap is dark rubber, low, with its crest
  // rolled to the rear and the land pitched slightly forward so what little sky it
  // does see it throws back over the bed.
  // In three clipped lengths with a shut between them and a millimetre or so of
  // step, because a cap this long is a clip-in moulding and never one piece.
  for (const [cx, len, dy, dz] of [
    [-0.55, 0.52, 0.0, 0.0],
    [0.0, 0.55, -0.0012, 0.0008],
    [0.55, 0.51, 0.0009, -0.0006],
  ]) {
    k.add('gap', profile(
      [
        [-0.058, -0.03],
        [-0.058, 0.006],
        [0.0, 0.02],
        [0.038, 0.026],
        [0.058, 0.014],
        [0.066, -0.014],
        [0.066, -0.044],
        [0.048, -0.05],
        [0.04, -0.032],
      ],
      len,
      { bevel: 0.003, curveSegments: 2 },
    ), { pos: [cx, railY + dy, outer + 0.03 + dz], rot: [0, Math.PI / 2, 0] });
  }
  // Grit along the crest, which on a tailgate is the one ledge nothing ever wipes.
  // Sat on the section rather than at a fixed height: the previous pass put these
  // at a flat y and the cap's roll left them hanging 26 mm above it.
  for (let i = 0; i < 14; i++) {
    if (hash1(i * 3 + 1, 87) < 0.3) continue;
    const s = 0.5 + hash1(i * 3 + 2, 87) * 1.2;
    k.add('trim', new THREE.SphereGeometry(0.007 + s * 0.006, 6, 4), {
      pos: [-0.74 + (i / 13) * 1.48 + (hash1(i * 3 + 3, 87) - 0.5) * 0.05, railY + 0.024, outer - 0.008],
      scale: [1 + s * 0.5, 0.32, 0.7],
    });
  }

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
    // tail/brake over indicator over reverse, with the reflex strip along the
    // bottom of the unit — the reverse cell was missing, so the truck had no
    // way of showing it was backing up
    for (const [dy, h, key] of [
      [0.14, 0.14, 'taillight'],
      [0.02, 0.085, 'amber'],
      [-0.075, 0.085, 'reverseLamp'],
      [-0.16, 0.05, 'reflectorRed'],
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
  brokenBar(k, 'steelDark', {
    w: 1.86,
    h: 0.2,
    d: 0.19,
    r: 0.04,
    axis: 'x',
    pos: [0, 0.84, rz],
    segs: 3,
    seed: 21,
    cut: 0.004,
    jit: 0.0024,
    seg: 2,
  });
  for (const dx of [-0.34, 0.29]) {
    weldBead(k, 'steel', { pos: [dx, 0.84, rz - 0.094], r: 0.058, tube: 0.008, seed: 6 + dx });
  }
  edgeKnocks(k, {
    from: [-0.86, 0.932, rz - 0.088],
    to: [0.86, 0.932, rz - 0.088],
    n: 12,
    seed: 22,
    len: 0.055,
    size: 0.015,
    bright: 'steel',
  });
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
  brokenSwage(k, 'steel', { len: 1.84, size: 0.026, pos: [0, 0.925, rz - 0.09], axis: 'x', segs: 4, seed: 25 });
  brokenSwage(k, 'steel', { len: 1.84, size: 0.02, pos: [0, 0.752, rz - 0.086], axis: 'x', segs: 3, seed: 27 });
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
    // A reversing lamp, so it lights when the truck backs up and at no other
    // time. It was a `headlight` bulb under a clear cover, which came on with
    // the headlamps and had the truck reversing all night.
    k.add('reverseLamp', lensDome(0.043, 0.4, 16), { pos: [lx, 0.815, rz - 0.108], rot: [0, Math.PI, 0] });
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
  // Plates never stay flat. This one is in two halves with a kink down the middle
  // and a corner turned up, hung off one bolt at a slight angle — three cheap
  // boxes instead of one, and the only thing on the back of the truck that is
  // visibly not square to anything.
  for (const [i, sx] of [-1, 1].entries()) {
    k.add('alu', gbox(0.171, 0.158, 0.011, 0.004), {
      pos: [px + sx * 0.086, py + 0.001, pz - 0.046 - (i === 0 ? 0.0022 : 0)],
      rot: [0, sx * 0.055, sx * 0.014],
    });
  }
  k.add('alu', gbox(0.062, 0.05, 0.01, 0.004), { pos: [px + 0.14, py - 0.058, pz - 0.05], rot: [0.24, 0.1, 0.06] });
  k.add('decalNumber', new THREE.PlaneGeometry(0.2, 0.1), { pos: [px, py + 0.002, pz - 0.055], rot: [0, Math.PI, 0.01] });
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
