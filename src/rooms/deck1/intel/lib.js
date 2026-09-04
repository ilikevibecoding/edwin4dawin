// Small kit-bash helpers for the intel room (Agent B / subagent 3); same as comms/lib.js so the folders stay independent.
import * as THREE from "three";
import { IMP } from "../shared/palette.js";

const UP = new THREE.Vector3(0, 1, 0);
const _d = new THREE.Vector3();
const _q = new THREE.Quaternion();

// Thin cylinder from world point a to b. sag > 0 bends it into a hanging cable (3+ pieces).
export function cable(kit, mat, a, b, r, { color = IMP.black, sag = 0, segs = 6, pieces = 1 } = {}) {
  const pa = new THREE.Vector3(a[0], a[1], a[2]);
  const pb = new THREE.Vector3(b[0], b[1], b[2]);
  const n = sag > 0 ? Math.max(pieces, 3) : pieces;
  let prev = pa.clone();
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const p = pa.clone().lerp(pb, t);
    p.y -= sag * 4 * t * (1 - t);
    segment(kit, mat, prev, p, r, color, segs);
    prev = p;
  }
}

function segment(kit, mat, p0, p1, r, color, segs) {
  _d.subVectors(p1, p0);
  const len = _d.length();
  if (len < 1e-4) return;
  _q.setFromUnitVectors(UP, _d.normalize());
  const mx = (p0.x + p1.x) / 2;
  const my = (p0.y + p1.y) / 2;
  const mz = (p0.z + p1.z) / 2;
  kit.add(mat, new THREE.CylinderGeometry(r, r, len + r * 0.6, segs), { pos: [mx, my, mz], quat: _q.clone(), color, uv: "keep" });
}

// Small indicator: a tiny emissive box proud of a face. axis = face normal ('x'|'z'|'y'), sign = direction.
export function led(kit, mat, x, y, z, axis, sign, size = 0.02, depth = 0.008) {
  if (axis === "x") kit.box(mat, x + (sign * depth) / 2, y, z, depth, size, size);
  else if (axis === "z") kit.box(mat, x, y, z + (sign * depth) / 2, size, size, depth);
  else kit.box(mat, x, y + (sign * depth) / 2, z, size, depth, size);
}

/**
 * Local frame for props: origin (cx, cy, cz), yaw in quarter turns (0 → prop front faces -z, 1 → faces -x,
 * 2 → faces +z, 3 → faces +x). Local axes: +u right (as seen from the operator side), +v up, +w toward
 * the operator (so the front/screen side is at -w).
 */
export class Local {
  constructor(kit, cx, cy, cz, facing = 0) {
    this.kit = kit;
    this.c = [cx, cy, cz];
    this.a = (facing * Math.PI) / 2;
    this.q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.a, 0));
    this.cos = Math.cos(this.a);
    this.sin = Math.sin(this.a);
  }
  pos(u, v, w) {
    return [this.c[0] + u * this.cos + w * this.sin, this.c[1] + v, this.c[2] - u * this.sin + w * this.cos];
  }
  quat(tilt = 0, roll = 0, yaw = 0) {
    if (!tilt && !roll && !yaw) return this.q;
    return this.q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, yaw, roll)));
  }
  box(mat, u, v, w, su, sv, sw, opts = {}) {
    const { tilt = 0, roll = 0, yaw = 0, ...rest } = opts;
    return this.kit.add(mat, new THREE.BoxGeometry(su, sv, sw), { pos: this.pos(u, v, w), quat: this.quat(tilt, roll, yaw), ...rest });
  }
  // cylinder along a local axis 'u' | 'v' | 'w'
  cyl(mat, u, v, w, r, len, axis = "v", opts = {}) {
    const { segments = 10, ...rest } = opts;
    const g = new THREE.CylinderGeometry(r, r, len, segments);
    const local = axis === "u" ? new THREE.Euler(0, 0, Math.PI / 2) : axis === "w" ? new THREE.Euler(Math.PI / 2, 0, 0) : new THREE.Euler(0, 0, 0);
    const q = this.q.clone().multiply(new THREE.Quaternion().setFromEuler(local));
    return this.kit.add(mat, g, { pos: this.pos(u, v, w), quat: q, uv: "keep", ...rest });
  }
  add(mat, geo, u, v, w, opts = {}) {
    const { tilt = 0, roll = 0, ...rest } = opts;
    return this.kit.add(mat, geo, { pos: this.pos(u, v, w), quat: this.quat(tilt, roll), ...rest });
  }
  // decal/screen plane facing -w (the front) or +w (back toward the operator)
  plane(mat, u, v, w, su, sv, opts = {}) {
    const { face = 1, ...rest } = opts; // face 1 → normal toward +w (operator), -1 → toward -w
    const g = new THREE.PlaneGeometry(su, sv);
    if (face < 0) g.rotateY(Math.PI);
    return this.kit.add(mat, g, { pos: this.pos(u, v, w), quat: this.q, ...rest });
  }
  collider(u0, u1, v0, v1, w0, w1, tag) {
    const pts = [this.pos(u0, v0, w0), this.pos(u1, v0, w0), this.pos(u0, v0, w1), this.pos(u1, v0, w1)];
    const min = [Infinity, v0 + this.c[1], Infinity];
    const max = [-Infinity, v1 + this.c[1], -Infinity];
    for (const p of pts) {
      min[0] = Math.min(min[0], p[0]);
      max[0] = Math.max(max[0], p[0]);
      min[2] = Math.min(min[2], p[2]);
      max[2] = Math.max(max[2], p[2]);
    }
    this.kit.collider(min, max, tag);
  }
}

// Emissive screen material over a canvas texture (shared recipe, but rougher / less env reflection so the many
// red-lit panels do not pick up specular blobs from the pool lights).
export function screenMaterial(tex, intensity = 1.3) {
  return new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: intensity, roughness: 0.45, metalness: 0, envMapIntensity: 0.3 });
}

/**
 * Minimal corridor-frame-compatible object for spine/dressing.js ribs(): the two facing wall frames (`sides`
 * keys into `walls`), the across extent c0..c1 and a box() mapping (along a, y, across c) to world.
 * alongZ = false → `a` runs along x (main room), true → along z (vestibule).
 */
export function ribFrame(walls, sides, c0, c1, floorY, ceilY, alongZ = false) {
  return {
    floorY,
    ceilY,
    sides,
    walls,
    c0,
    c1,
    box(kit, mat, a0, a1, y0, y1, cc0, cc1, opts = {}) {
      const lo = Math.min(a0, a1);
      const hi = Math.max(a0, a1);
      const clo = Math.min(cc0, cc1);
      const chi = Math.max(cc0, cc1);
      if (alongZ) kit.boxMM(mat, [clo, y0, lo], [chi, y1, hi], opts);
      else kit.boxMM(mat, [lo, y0, clo], [hi, y1, chi], opts);
    },
  };
}

// Deterministic picker
export function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length) % arr.length];
}
