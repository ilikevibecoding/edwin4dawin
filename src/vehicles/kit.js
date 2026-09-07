import * as THREE from 'three';
import { BufferGeometryUtils, transform } from '../lib/geo.js';
import { clamp, lerp, smoothstep } from '../textures/core.js';
import { AGE_KEYS, SWAY_KEYS, UV_KEEP, UV_SCALE } from './materials.js';

// ---------------------------------------------------------------------------
// The fleet kit-basher.
//
// A `VehicleKit` accumulates one vehicle's pieces in that vehicle's own space
// (+Z nose, +Y up, ground at y = 0, origin between the axles). `finish()` then
// bakes everything the shader will need per vertex — albedo, road-film reach,
// sway — while it still knows where the wheels are, transforms the result into
// world space and hands it to the shared `FleetBuckets`, which emits one merged
// mesh per material for the whole camp. Glass panes are the exception: they go
// back under the vehicle's own root so they can sort against each other.
// ---------------------------------------------------------------------------

const _col = new THREE.Color();
const _n = new THREE.Vector3();
const _nm = new THREE.Matrix3();

export const LIN = (hex) => {
  _col.set(hex);
  return [_col.r, _col.g, _col.b];
};
export const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const scale3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

/** Deterministic 0..1 hash of a position, for jitter that survives a reload. */
export function hash3(x, y, z, seed = 0) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 19.19) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Road film as vertex colour: dust settles on up-facing surfaces, undersides go
 * dark, and a position hash keeps a run of identical brackets from reading as
 * one stamping. This is the fallback for everything the per-pixel dirt does not
 * reach — and a first pass of value range for everything it does.
 */
export function grime(baseHex, { dust = 0x8b7c5d, up = 0.5, down = 0.42, jitter = 0.08, seed = 0, edge = 0, edgeTint = 0x9c968b } = {}) {
  const base = Array.isArray(baseHex) ? baseHex : LIN(baseHex);
  const dst = LIN(dust);
  const et = LIN(edgeTint);
  return (x, y, z, nx, ny, nz = 0) => {
    const t = clamp(ny * 0.75 + 0.25) ** 1.6 * up;
    let c = mix3(base, dst, t);
    const j = jitter ? (hash3(x, y, z, seed) - 0.5) * jitter * 2 : 0;
    const k = 1 - clamp(-ny) ** 1.2 * down + j;
    if (edge > 0) {
      const e = edgeWear(x, y, z, nx, ny, nz, seed) * edge;
      if (e > 0) c = mix3(c, et, e);
    }
    return [c[0] * k, c[1] * k, c[2] * k];
  };
}

/**
 * Edge-wear mask: a chamfered box's bevel vertices carry diagonal normals, so
 * "how far off an axis the normal is" is "how close to a panel edge". Paint
 * rubs through on those edges first, in patches rather than as a rule, so the
 * mask is broken up by a coarse position hash.
 */
export function edgeWear(x, y, z, nx, ny, nz, seed = 0) {
  const m = Math.max(Math.abs(nx), Math.abs(ny), Math.abs(nz));
  if (m > 0.93) return 0;
  const onEdge = smoothstep(0.93, 0.72, m);
  const h = hash3(Math.round(x * 9), Math.round(y * 9), Math.round(z * 9), seed + 5);
  return onEdge * smoothstep(0.35, 0.85, h);
}

/**
 * Old paint: chalked on the sun-facing tops, and rust blooming out of the
 * fixing points and along the bottom edges of the panels. `fixings` are local
 * points where the panel is bolted through; rust streaks run down from them.
 */
export function aged(baseHex, { age = 0.5, fixings = [], rust = 0x6e3a1c, chalk = 0xb9b2a1, seed = 1, floorY = 0.5, edge = 0.5, edgeTint = 0x8f8a80 } = {}) {
  const base = LIN(baseHex);
  const ru = LIN(rust);
  const ch = LIN(chalk);
  const et = LIN(edgeTint);
  return (x, y, z, nx, ny, nz = 0) => {
    const up = clamp(ny);
    const h = hash3(Math.round(x * 20), Math.round(y * 20), Math.round(z * 20), seed);
    let c = mix3(base, ch, up * up * age * 0.55 * (0.6 + h * 0.8));
    if (edge > 0) {
      const e = edgeWear(x, y, z, nx, ny, nz, seed) * edge;
      if (e > 0) c = mix3(c, et, e);
    }
    let r = 0;
    for (const f of fixings) {
      const dx = x - f[0];
      const dz = z - f[2];
      const dy = f[1] - y;
      // a teardrop below the fixing, fading with distance and only downward
      if (dy < -0.02) continue;
      const w = Math.hypot(dx, dz) / (0.025 + dy * 0.35);
      r = Math.max(r, (1 - smoothstep(0.3, 1.0, w)) * (1 - smoothstep(0.0, 0.45, dy)));
    }
    // bottom edges of a panel hold water and rust first
    r = Math.max(r, (1 - smoothstep(floorY - 0.02, floorY + 0.16, y)) * smoothstep(0.35, 0.8, h));
    c = mix3(c, ru, clamp(r * age * 1.4) * (0.6 + h * 0.6));
    return c;
  };
}

/**
 * Box-projected uvs from the dominant normal axis, in vehicle space, so a 40 mm
 * bracket and a 2 m door get the same grain size.
 */
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
}

function flipWinding(geo) {
  for (const attr of Object.values(geo.attributes)) {
    const a = attr.array;
    const n = attr.itemSize;
    for (let i = 0; i + 2 < attr.count; i += 3) {
      for (let c = 0; c < n; c++) {
        const p = (i + 1) * n + c;
        const q = (i + 2) * n + c;
        const t = a[p];
        a[p] = a[q];
        a[q] = t;
      }
    }
  }
  return geo;
}

const KEEP = ['position', 'normal', 'uv'];

function prep(geo) {
  let g = geo;
  if (!g.attributes.normal) g.computeVertexNormals();
  if (g.index) g = g.toNonIndexed();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  for (const name of Object.keys(g.attributes)) if (!KEEP.includes(name)) g.deleteAttribute(name);
  return g;
}

/** All the fleet's static geometry, one bucket per material. */
export class FleetBuckets {
  constructor() {
    this.buckets = new Map();
    this.tris = 0;
  }

  push(key, geo) {
    if (!this.buckets.has(key)) this.buckets.set(key, []);
    this.buckets.get(key).push(geo);
    this.tris += geo.attributes.position.count / 3;
  }

  build(materials, group) {
    const unshadowed = new Set(['reflector', 'headOff', 'headOn', 'tailOff', 'tailOn', 'amber', 'amberOn', 'lampBlue', 'lampBlueOn', 'lampWarmOn', 'pool']);
    let calls = 0;
    for (const [key, list] of this.buckets) {
      const mat = materials[key];
      if (!mat) {
        console.warn(`[fleet] missing material "${key}"`);
        continue;
      }
      const merged = list.length === 1 ? list[0] : BufferGeometryUtils.mergeGeometries(list, false);
      if (!merged) {
        console.warn(`[fleet] merge failed for "${key}"`);
        continue;
      }
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, mat);
      mesh.name = `fleet_${key}`;
      mesh.castShadow = !unshadowed.has(key);
      mesh.receiveShadow = !unshadowed.has(key);
      if (key === 'pool') {
        mesh.renderOrder = 2;
        // The AO prepass swaps every material for a MeshNormalMaterial, which
        // would draw the ground decals as solid quads over the dirt and hand
        // GTAO a hard rectangle to shade (the hero's contact mesh does the same).
        mesh.onBeforeRender = (renderer, scene, camera, geometry, material) => {
          if (material.isMeshNormalMaterial) geometry.setDrawRange(0, 0);
        };
        mesh.onAfterRender = (renderer, scene, camera, geometry, material) => {
          if (material.isMeshNormalMaterial) geometry.setDrawRange(0, Infinity);
        };
      }
      group.add(mesh);
      calls++;
    }
    return calls;
  }
}

export class VehicleKit {
  /**
   * @param spec { wheels: [{x, z, r}], track, dust, mud }
   */
  constructor(name, spec) {
    this.name = name;
    this.spec = spec;
    this.pieces = [];
    this.panes = [];
    // ground contacts registered by addWheel / the jockey wheel: { x, z, r, travel }
    // in vehicle space. The placer probes the terrain under each one and the
    // pieces tagged with its id ride up or down to meet it.
    this.contacts = [];
    this.drops = [];
  }

  /** Register a ground contact; returns its id for tagging pieces. `travel` is how far it may move to reach the ground. */
  contact({ x, z, r, travel = 0.12 }) {
    this.contacts.push({ x, z, r, travel });
    return this.contacts.length - 1;
  }

  /**
   * add(key, geo, { pos, rot, quat, scale, tint, shade, flap, wear, contact, stretchBelow })
   * Geometry is cloned; `wear` scales the road film. `contact` ties the piece to
   * a ground contact so it follows the terrain; with `stretchBelow: y` only the
   * vertices under that height move (a telescoping post).
   */
  add(key, geo, opts = {}) {
    const g = opts.pos || opts.rot || opts.quat || opts.scale ? transform(geo.clone(), opts) : geo.clone();
    const s = opts.scale;
    const det = Array.isArray(s) ? s[0] * s[1] * s[2] : typeof s === 'number' ? s * s * s : 1;
    const p = prep(g);
    if (det < 0) flipWinding(p);
    this.pieces.push({ key, geo: p, tint: opts.tint, shade: opts.shade, flap: opts.flap, wear: opts.wear ?? 1, contact: opts.contact, stretchBelow: opts.stretchBelow });
    return this;
  }

  /** The same part either side of the centreline. */
  addMirrored(key, geo, opts = {}) {
    this.add(key, geo, opts);
    const pos = opts.pos ? [-opts.pos[0], opts.pos[1], opts.pos[2]] : [0, 0, 0];
    const rot = opts.rot ? [opts.rot[0], -opts.rot[1], -opts.rot[2]] : undefined;
    const sc = opts.scale
      ? Array.isArray(opts.scale)
        ? [-opts.scale[0], opts.scale[1], opts.scale[2]]
        : [-opts.scale, opts.scale, opts.scale]
      : [-1, 1, 1];
    return this.add(key, geo, { ...opts, pos, rot, scale: sc });
  }

  /** A glass pane: kept as its own mesh under the vehicle so panes sort. */
  pane(key, geo, opts = {}) {
    const g = opts.pos || opts.rot || opts.quat || opts.scale ? transform(geo.clone(), opts) : geo.clone();
    this.panes.push({ key, geo: prep(g) });
    return this;
  }

  /** Per-vertex road-film reach in vehicle space. */
  wearAt(x, y, z) {
    const { wheels, track = 0.8 } = this.spec;
    let arch = 0;
    for (const w of wheels) {
      const dz = (z - w.z) * 0.55;
      const dy = (y - w.r) * 1.0;
      const d = Math.hypot(dz, dy);
      const behind = z < w.z ? 1 : 0.45;
      arch = Math.max(arch, (1 - smoothstep(w.r * 0.15, w.r * 2.5, d)) * behind);
    }
    const r = wheels.length ? wheels[0].r : 0.4;
    const flank = track < 0.25 ? 1 : smoothstep(track * 0.3, track * 0.7, Math.abs(x));
    const lift = 1 - smoothstep(r * 2.0, r * 3.6, y);
    const sill = 1 - smoothstep(r * 0.9, r * 2.1, y);
    return clamp(Math.max(arch * lift, sill * sill * 0.8) * flank);
  }

  /**
   * Bake attributes, move into world space, hand off. `matrix` is the vehicle's
   * world transform; returns the vehicle's own group holding its panes.
   */
  finish(matrix, fleet, materials, { root }) {
    const { dust = 0.6, mud = 0.5, age = 0.3 } = this.spec;
    _nm.getNormalMatrix(matrix);
    const dir = new THREE.Vector3();
    const pos = new THREE.Vector3();

    for (const piece of this.pieces) {
      const g = piece.geo;
      const key = piece.key;
      const p = g.attributes.position;
      const nrm = g.attributes.normal;
      const n = p.count;
      // suspension: the wheel (and whatever else hangs off that contact) meets the ground
      const drop = piece.contact !== undefined ? this.drops[piece.contact] || 0 : 0;
      if (drop) {
        const cut = piece.stretchBelow;
        for (let i = 0; i < n; i++) {
          const py = p.getY(i);
          if (cut === undefined || py < cut) p.setY(i, py + drop);
        }
      }
      if (!UV_KEEP.has(key)) boxProjectUV(g, UV_SCALE[key] ?? 1);

      const col = new Float32Array(n * 3);
      const wear = new Float32Array(n * 4);
      const base = piece.tint !== undefined ? LIN(piece.tint) : [1, 1, 1];
      const sway = SWAY_KEYS.has(key);
      const flap = sway ? new Float32Array(n * 2) : null;
      // the paint's coat thins with the vehicle's age: one value per vehicle
      const aged = AGE_KEYS.has(key) ? new Float32Array(n).fill(age) : null;
      for (let i = 0; i < n; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        const z = p.getZ(i);
        const nx = nrm.getX(i);
        const ny = nrm.getY(i);
        const nz = nrm.getZ(i);
        const c = piece.shade ? piece.shade(x, y, z, nx, ny, nz) : base;
        col[i * 3] = c[0];
        col[i * 3 + 1] = c[1];
        col[i * 3 + 2] = c[2];
        wear[i * 4] = this.wearAt(x, y, z) * piece.wear;
        wear[i * 4 + 1] = y;
        wear[i * 4 + 2] = dust;
        wear[i * 4 + 3] = mud;
        if (flap) {
          const f = piece.flap ? (typeof piece.flap === 'function' ? piece.flap(x, y, z) : piece.flap) : [0, 0];
          flap[i * 2] = f[0];
          flap[i * 2 + 1] = f[1];
        }
        // to world
        pos.set(x, y, z).applyMatrix4(matrix);
        p.setXYZ(i, pos.x, pos.y, pos.z);
        dir.set(nx, ny, nz).applyMatrix3(_nm).normalize();
        nrm.setXYZ(i, dir.x, dir.y, dir.z);
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.setAttribute('aWear', new THREE.BufferAttribute(wear, 4));
      if (flap) g.setAttribute('aFlap', new THREE.BufferAttribute(flap, 2));
      if (aged) g.setAttribute('aAge', new THREE.BufferAttribute(aged, 1));
      fleet.push(key, g);
    }

    for (const [i, pane] of this.panes.entries()) {
      const mat = materials[pane.key];
      if (!mat) {
        console.warn(`[fleet] missing pane material "${pane.key}"`);
        continue;
      }
      const g = pane.geo;
      g.computeBoundingSphere();
      const c = g.boundingSphere.center.clone();
      g.translate(-c.x, -c.y, -c.z);
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, mat);
      mesh.position.copy(c);
      mesh.name = `${this.name}_${pane.key}_${i}`;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      root.add(mesh);
    }
    return root;
  }
}
