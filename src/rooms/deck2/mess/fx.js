// Animated emitters for one room in ONE draw call.
//
// The kit merges geometry per material key and the result is static, so anything that has to move,
// blink or sweep lives here instead: EmitBatch collects boxes/cylinders into groups, build() merges
// them into a single mesh with an unlit, additive, vertex-coloured material (HDR floats — values above
// the bloom threshold glow exactly like the kit's emissive keys) and adds it to the room group. Per
// frame the room calls set(group, k) / rgb(group, r, g, b) and then commit(); the writes go straight
// into the existing colour attribute (no allocation in update). Off = black = invisible under additive
// blending, so beams and chases leave no dark slabs where they currently are not.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _one = new THREE.Vector3(1, 1, 1);

export class EmitBatch {
  constructor() {
    this.items = [];
    this.groups = [];
    this.mesh = null;
    this.colors = null;
  }

  /** New group with a base colour (THREE.Color | hex) at `intensity`; returns its index. */
  group(color, intensity = 1) {
    const c = color instanceof THREE.Color ? color : new THREE.Color(color);
    this.groups.push({ base: [c.r * intensity, c.g * intensity, c.b * intensity], start: 0, count: 0 });
    return this.groups.length - 1;
  }

  add(g, geo, pos, rot = null, quat = null) {
    if (quat) _q.copy(quat);
    else if (rot) _q.setFromEuler(_e.set(rot[0], rot[1], rot[2]));
    else _q.identity();
    _m.compose(_p.set(pos[0], pos[1], pos[2]), _q, _one);
    geo.applyMatrix4(_m);
    for (const key of Object.keys(geo.attributes)) if (key !== "position") geo.deleteAttribute(key);
    this.items.push({ g, geo });
  }

  box(g, cx, cy, cz, sx, sy, sz, rot = null) {
    this.add(g, new THREE.BoxGeometry(sx, sy, sz), [cx, cy, cz], rot);
  }

  /** Cylinder along an axis ('x'|'y'|'z'); `open` drops the caps; theta* select a facet of the drum. */
  cyl(g, cx, cy, cz, r, len, axis = "y", { segments = 12, open = false, thetaStart = 0, thetaLength = Math.PI * 2, rot = null } = {}) {
    const geo = new THREE.CylinderGeometry(r, r, len, segments, 1, open, thetaStart, thetaLength);
    const base = axis === "x" ? [0, 0, Math.PI / 2] : axis === "z" ? [Math.PI / 2, 0, 0] : null;
    this.add(g, geo, [cx, cy, cz], rot || base);
  }

  /** Merge everything into one additive mesh under `parent` (kit-style: one draw call). */
  build(parent) {
    this.items.sort((a, b) => a.g - b.g); // group order → one contiguous vertex range per group
    let v = 0;
    for (const it of this.items) {
      const grp = this.groups[it.g];
      const n = it.geo.attributes.position.count;
      if (grp.count === 0) grp.start = v;
      grp.count += n;
      v += n;
    }
    const merged = mergeGeometries(this.items.map((it) => it.geo), false);
    this.colors = new Float32Array(v * 3);
    const attr = new THREE.BufferAttribute(this.colors, 3);
    attr.setUsage(THREE.DynamicDrawUsage);
    merged.setAttribute("color", attr);
    merged.computeBoundingSphere();
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    this.mesh = new THREE.Mesh(merged, mat);
    this.mesh.name = "fx_emitters";
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    parent.add(this.mesh);
    for (let g = 0; g < this.groups.length; g++) this.set(g, 1);
    this.commit();
    this.items.length = 0;
    return this.mesh;
  }

  /** Group colour = base × k. */
  set(g, k) {
    const b = this.groups[g].base;
    this.rgb(g, b[0] * k, b[1] * k, b[2] * k);
  }

  rgb(g, r, gg, b) {
    const grp = this.groups[g];
    const c = this.colors;
    const end = (grp.start + grp.count) * 3;
    for (let i = grp.start * 3; i < end; i += 3) {
      c[i] = r;
      c[i + 1] = gg;
      c[i + 2] = b;
    }
  }

  /** Upload the frame's writes (call once per update). */
  commit() {
    if (this.mesh) this.mesh.geometry.attributes.color.needsUpdate = true;
  }
}

// ---- time functions (pure in t, so frozen-time screenshots are reproducible) ------------------------
export const hash = (i) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
/** Smooth value noise in [0,1): `rate` steps per second, `seed` decorrelates instances. */
export function noise(t, rate, seed = 0) {
  const u = t * rate + seed * 17.31;
  const i = Math.floor(u);
  let f = u - i;
  f = f * f * (3 - 2 * f);
  return hash(i) * (1 - f) + hash(i + 1) * f;
}
/** 1 while the phase of `period` is inside [from, to), else 0. */
export const gate = (t, period, from, to) => {
  const p = t - Math.floor(t / period) * period;
  return p >= from && p < to ? 1 : 0;
};
/** 0..1 breathing. */
export const breathe = (t, period, phase = 0) => 0.5 + 0.5 * Math.sin((2 * Math.PI * t) / period + phase);
export const gauss = (x, s) => Math.exp((-x * x) / (2 * s * s));
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

/**
 * Swap a merged kit mesh's shared material for a private clone (so the room can animate it without
 * touching other rooms). Returns the clone, or null until the kit has been built (call from update()).
 */
export function ownKitMaterial(kit, key) {
  const mesh = kit.meshes.find((m) => m.name === "kit_" + key);
  if (!mesh) return null;
  if (!mesh.userData.ownMaterial) {
    mesh.material = mesh.material.clone();
    mesh.userData.ownMaterial = true;
  }
  return mesh.material;
}
