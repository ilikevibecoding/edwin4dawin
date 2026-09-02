import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Geometry toolkit: a generic parametric surface builder (u along, v around) with analytic normals from
 * central differences, plus loft helpers for organic tubes (fingers, palm, cuff, sleeve).
 */

const _p = new THREE.Vector3();
const _pu0 = new THREE.Vector3();
const _pu1 = new THREE.Vector3();
const _pv0 = new THREE.Vector3();
const _pv1 = new THREE.Vector3();
const _n = new THREE.Vector3();

/**
 * Build an indexed BufferGeometry from fn(u, v, out) with nu × nv quads. u ∈ [0,1] runs along the part,
 * v ∈ [0,1] around it. Normals = ∂p/∂u × ∂p/∂v (flip with `invert`). Degenerate poles (caps) fall back to ±∂p/∂u.
 * `uv(u, v, p, out)` fills real-world texture coordinates; `color(u, v, p, out)` optional vertex colours.
 */
export function paramSurface(fn, nu, nv, { uv = null, color = null, invert = false } = {}) {
  const count = (nu + 1) * (nv + 1);
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const col = color ? new Float32Array(count * 3) : null;
  const eu = 0.5 / nu;
  const ev = 0.5 / nv;
  const st = [0, 0];
  const rgb = [1, 1, 1];
  let k = 0;
  for (let i = 0; i <= nu; i++) {
    const u = i / nu;
    for (let j = 0; j <= nv; j++) {
      const v = j / nv;
      fn(u, v, _p);
      pos[k * 3] = _p.x;
      pos[k * 3 + 1] = _p.y;
      pos[k * 3 + 2] = _p.z;
      fn(Math.min(1, u + eu), v, _pu1);
      fn(Math.max(0, u - eu), v, _pu0);
      _pu1.sub(_pu0);
      fn(u, Math.min(1, v + ev), _pv1);
      fn(u, Math.max(0, v - ev), _pv0);
      _pv1.sub(_pv0);
      _n.crossVectors(_pu1, _pv1);
      if (_n.lengthSq() < 1e-18) {
        _n.copy(_pu1);
        if (u < 0.5) _n.negate();
      }
      _n.normalize();
      if (invert) _n.negate();
      nor[k * 3] = _n.x;
      nor[k * 3 + 1] = _n.y;
      nor[k * 3 + 2] = _n.z;
      if (uv) {
        uv(u, v, _p, st);
        uvs[k * 2] = st[0];
        uvs[k * 2 + 1] = st[1];
      } else {
        uvs[k * 2] = v;
        uvs[k * 2 + 1] = u;
      }
      if (col) {
        rgb[0] = rgb[1] = rgb[2] = 1;
        color(u, v, _p, rgb);
        col[k * 3] = rgb[0];
        col[k * 3 + 1] = rgb[1];
        col[k * 3 + 2] = rgb[2];
      }
      k++;
    }
  }
  const idx = [];
  const row = nv + 1;
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const a = i * row + j;
      const b = a + row;
      if (!invert) idx.push(a, b, a + 1, b, b + 1, a + 1);
      else idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  if (col) g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

/** Superellipse point: semi-axes a (x), b (y), exponent n (2 = ellipse, 4+ = rounded rectangle). */
export function superellipse(a, b, n, theta, out) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const e = 2 / n;
  out.x = a * Math.sign(c) * Math.pow(Math.abs(c), e);
  out.y = b * Math.sign(s) * Math.pow(Math.abs(s), e);
  return out;
}

/** Smooth C1 interpolation through a list of keyframes [{ t, ...values }] → values at t (per key). */
export function keyframes(keys) {
  const names = Object.keys(keys[0]).filter((k) => k !== 't');
  return (t, out = {}) => {
    let i = 0;
    while (i < keys.length - 2 && t > keys[i + 1].t) i++;
    const a = keys[i];
    const b = keys[i + 1];
    let s = (t - a.t) / (b.t - a.t);
    s = s < 0 ? 0 : s > 1 ? 1 : s;
    s = s * s * (3 - 2 * s);
    for (const n of names) out[n] = a[n] + (b[n] - a[n]) * s;
    return out;
  };
}

/**
 * Rounded-end loft along +Y: cross-section given by `section(y, theta, out2)` (x = across, y = thickness →
 * mapped to local x/z) evaluated over y ∈ [y0, y1]; hemispherical-ish caps of depth cap0 / cap1 shrink the
 * section to a point. thetaFn maps v ∈ [0,1] → θ so half shells can be generated (θ = 0 → +Z dorsal side).
 */
export function loftY({ y0, y1, cap0, cap1, section, thetaFn, nu, nv, uv, color, deform = null, invert = false }) {
  const L = y1 - y0;
  const s2 = new THREE.Vector2();
  const total = cap0 + L + cap1;
  const fn = (u, v, out) => {
    const theta = thetaFn(v, u);
    const a = u * total; // arc-length like parameter along the part
    let y;
    let scale;
    if (cap0 > 0 && a < cap0) {
      const k = 1 - a / cap0; // 1 at the pole → 0 at the body start
      y = y0 - cap0 * Math.sin(k * Math.PI * 0.5);
      scale = Math.cos(k * Math.PI * 0.5);
    } else if (cap1 > 0 && a > cap0 + L) {
      const k = (a - cap0 - L) / cap1;
      y = y1 + cap1 * Math.sin(k * Math.PI * 0.5);
      scale = Math.cos(k * Math.PI * 0.5);
    } else {
      y = y0 + (a - cap0);
      scale = 1;
    }
    const yc = Math.min(y1, Math.max(y0, y));
    section(yc, theta, s2);
    out.set(s2.x * scale, y, s2.y * scale);
    if (deform) deform(out, yc, theta, scale);
    return out;
  };
  return paramSurface(fn, nu, nv, { uv, color, invert });
}

/**
 * Raised patch conforming to a lofted body: the body's section scaled by `base` plus `pad(s, t)` metres of
 * radial thickness over y ∈ [ya, yb], θ ∈ [-beta, beta] (θ = 0 → +Z). Used for moulded TPR knuckle guards,
 * padding and the Velcro tab. s ∈ [0,1] along y, t ∈ [0,1] across.
 */
export function shellPatch({ ya, yb, beta, thetaCenter = 0, section, pad, base = 0.97, nu = 8, nv = 8, uv, color, deform = null }) {
  const s2 = new THREE.Vector2();
  const fn = (u, v, out) => {
    const y = ya + (yb - ya) * u;
    const theta = thetaCenter + beta * (1 - 2 * v);
    section(y, theta, s2);
    const len = Math.hypot(s2.x, s2.y) || 1e-6;
    const k = base + pad(u, v) / len;
    out.set(s2.x * k, y, s2.y * k);
    if (deform) deform(out, y, theta, 1);
    return out;
  };
  return paramSurface(fn, nu, nv, { uv, color });
}

/** Rounded-edge thickness profile for shellPatch: full `t` in the middle, falling to 0 at the borders. */
export function padProfile(t, edgeU = 0.25, edgeV = 0.25) {
  return (u, v) => {
    const eu = Math.min(u, 1 - u) / edgeU;
    const ev = Math.min(v, 1 - v) / edgeV;
    const a = eu >= 1 ? 1 : Math.sin(Math.min(1, Math.max(0, eu)) * Math.PI * 0.5);
    const b = ev >= 1 ? 1 : Math.sin(Math.min(1, Math.max(0, ev)) * Math.PI * 0.5);
    return t * a * b;
  };
}

/** Mirror a geometry across x = 0 (positions, normals, winding). */
export function mirrorX(g) {
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    pos.setX(i, -pos.getX(i));
    if (nor) nor.setX(i, -nor.getX(i));
  }
  const idx = g.index;
  if (idx) {
    for (let i = 0; i < idx.count; i += 3) {
      const b = idx.getX(i + 1);
      idx.setX(i + 1, idx.getX(i + 2));
      idx.setX(i + 2, b);
    }
  }
  return g;
}

/** Concatenate geometries into one without groups (same material). */
export function concat(list) {
  const geos = list.filter(Boolean);
  if (geos.length === 1) return geos[0];
  const merged = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  return merged;
}

/** Merge geometries into one with material groups in order (materialIndex = position in list). */
export function mergeGroups(list) {
  const geos = [];
  const slots = [];
  list.forEach((g, i) => {
    if (g) {
      geos.push(g);
      slots.push(i);
    }
  });
  const merged = mergeGeometries(geos, true);
  merged.groups.forEach((grp, k) => {
    grp.materialIndex = slots[k];
  });
  for (const g of geos) g.dispose();
  return merged;
}

/** Rounded box centred on the origin with a real-world UV scale. */
export function roundedBox(w, h, d, r, tile, segments = 3) {
  const nu = segments * 2 + 1;
  const g = new THREE.BoxGeometry(1, 1, 1, nu, nu, nu).toNonIndexed();
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const uvs = g.attributes.uv;
  const bx = w / 2 - r;
  const by = h / 2 - r;
  const bz = d / 2 - r;
  const half = 0.5 / nu;
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    n.copy(p);
    n.x -= Math.sign(n.x) * half;
    n.y -= Math.sign(n.y) * half;
    n.z -= Math.sign(n.z) * half;
    n.normalize();
    const x = bx * Math.sign(p.x) + n.x * r;
    const y = by * Math.sign(p.y) + n.y * r;
    const z = bz * Math.sign(p.z) + n.z * r;
    pos.setXYZ(i, x, y, z);
    nor.setXYZ(i, n.x, n.y, n.z);
    // planar-ish UVs by dominant normal axis, in metres / tile
    const ax = Math.abs(n.x);
    const ay = Math.abs(n.y);
    const az = Math.abs(n.z);
    if (az >= ax && az >= ay) uvs.setXY(i, x / tile, y / tile);
    else if (ax >= ay) uvs.setXY(i, z / tile, y / tile);
    else uvs.setXY(i, x / tile, z / tile);
  }
  return g;
}

export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
