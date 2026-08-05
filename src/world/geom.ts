import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp, lerp, smoothstep } from '../engine/math';

export { mergeGeometries };

export interface Profile {
  /** [radius, y] pairs, bottom to top. */
  points: [number, number][];
  segments?: number;
}

/** Lathe a radius profile into a solid of revolution. */
export function lathe(profile: Profile, radialSegments = 24): THREE.BufferGeometry {
  const pts = profile.points.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y));
  const g = new THREE.LatheGeometry(pts, radialSegments);
  g.computeVertexNormals();
  return g;
}

/** Rounded box via a subdivided box pushed onto a superellipsoid. */
export function roundedBox(
  w: number,
  h: number,
  d: number,
  radius = 0.02,
  seg = 3,
): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d, Math.max(1, seg), Math.max(1, seg), Math.max(1, seg));
  const pos = g.attributes.position as THREE.BufferAttribute;
  const hx = w / 2;
  const hy = h / 2;
  const hz = d / 2;
  const r = Math.min(radius, hx * 0.9, hy * 0.9, hz * 0.9);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // Clamp to the inner box then push outward by the corner radius.
    const cx = clamp(v.x, -(hx - r), hx - r);
    const cy = clamp(v.y, -(hy - r), hy - r);
    const cz = clamp(v.z, -(hz - r), hz - r);
    const dir = new THREE.Vector3(v.x - cx, v.y - cy, v.z - cz);
    if (dir.lengthSq() > 1e-9) dir.normalize().multiplyScalar(r);
    pos.setXYZ(i, cx + dir.x, cy + dir.y, cz + dir.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Capsule aligned to +Y, origin at the bottom cap centre. */
export function limb(rTop: number, rBottom: number, length: number, radialSeg = 14): THREE.BufferGeometry {
  const points: [number, number][] = [];
  const capSteps = 5;
  for (let i = capSteps; i >= 0; i--) {
    const a = (i / capSteps) * (Math.PI / 2);
    points.push([rBottom * Math.cos(a), -rBottom * Math.sin(a) * 0.75]);
  }
  points.push([lerp(rBottom, rTop, 0.35), length * 0.35]);
  points.push([lerp(rBottom, rTop, 0.7), length * 0.7]);
  for (let i = 0; i <= capSteps; i++) {
    const a = (i / capSteps) * (Math.PI / 2);
    points.push([rTop * Math.cos(a), length + rTop * Math.sin(a) * 0.75]);
  }
  return lathe({ points }, radialSeg);
}

export function sphere(r: number, wSeg = 20, hSeg = 14): THREE.BufferGeometry {
  return new THREE.SphereGeometry(r, wSeg, hSeg);
}

/** Extrude a closed 2D outline along +Z with optional bevel. */
export function extrude(outline: [number, number][], depth: number, bevel = 0): THREE.BufferGeometry {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 2,
    curveSegments: 8,
  });
  g.center();
  g.computeVertexNormals();
  return g;
}

export function transform(
  g: THREE.BufferGeometry,
  t: { pos?: [number, number, number]; rot?: [number, number, number]; scale?: [number, number, number] | number },
): THREE.BufferGeometry {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler(...(t.rot ?? [0, 0, 0]));
  q.setFromEuler(e);
  const s = typeof t.scale === 'number' ? [t.scale, t.scale, t.scale] : (t.scale ?? [1, 1, 1]);
  m.compose(new THREE.Vector3(...(t.pos ?? [0, 0, 0])), q, new THREE.Vector3(s[0], s[1], s[2]));
  g.applyMatrix4(m);
  return g;
}

/** Displace vertices by a smooth radial falloff - the workhorse for face sculpting. */
export function sculpt(
  geo: THREE.BufferGeometry,
  center: THREE.Vector3,
  radius: number,
  amount: THREE.Vector3 | number,
  opts: { falloff?: number; mask?: (p: THREE.Vector3) => number; scaleXYZ?: [number, number, number] } = {},
) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const normal = geo.attributes.normal as THREE.BufferAttribute | undefined;
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const s = opts.scaleXYZ ?? [1, 1, 1];
  const falloff = opts.falloff ?? 2;
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const dx = (p.x - center.x) / s[0];
    const dy = (p.y - center.y) / s[1];
    const dz = (p.z - center.z) / s[2];
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz) / radius;
    if (d >= 1) continue;
    let w = Math.pow(1 - d * d, falloff);
    if (opts.mask) w *= opts.mask(p);
    if (w <= 0) continue;
    if (typeof amount === 'number') {
      if (normal) {
        n.fromBufferAttribute(normal, i);
        pos.setXYZ(i, p.x + n.x * amount * w, p.y + n.y * amount * w, p.z + n.z * amount * w);
      }
    } else {
      pos.setXYZ(i, p.x + amount.x * w, p.y + amount.y * w, p.z + amount.z * w);
    }
  }
  pos.needsUpdate = true;
}

/** Crease along a parametric curve - used for lip line, jaw edge, nostrils. */
export function crease(
  geo: THREE.BufferGeometry,
  curve: (t: number) => THREE.Vector3,
  radius: number,
  depth: number,
  samples = 24,
  dir?: THREE.Vector3,
) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const p = new THREE.Vector3();
  const c = new THREE.Vector3();
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= samples; i++) pts.push(curve(i / samples));
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    let best = 1e9;
    let bestPt = pts[0];
    for (const pt of pts) {
      const d = p.distanceToSquared(pt);
      if (d < best) {
        best = d;
        bestPt = pt;
      }
    }
    const d = Math.sqrt(best) / radius;
    if (d >= 1) continue;
    const w = Math.pow(1 - d * d, 2);
    const push = dir ?? c.copy(p).sub(bestPt).normalize().negate();
    pos.setXYZ(i, p.x + push.x * depth * w, p.y + push.y * depth * w, p.z + push.z * depth * w);
  }
  pos.needsUpdate = true;
}

export function smoothGeometry(geo: THREE.BufferGeometry, iterations = 1, strength = 0.5) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const index = geo.index;
  if (!index) return;
  const count = pos.count;
  const neighbours: number[][] = Array.from({ length: count }, () => []);
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i);
    const b = index.getX(i + 1);
    const c = index.getX(i + 2);
    neighbours[a].push(b, c);
    neighbours[b].push(a, c);
    neighbours[c].push(a, b);
  }
  for (let it = 0; it < iterations; it++) {
    const src = new Float32Array(pos.array as Float32Array);
    for (let i = 0; i < count; i++) {
      const nb = neighbours[i];
      if (!nb.length) continue;
      let x = 0;
      let y = 0;
      let z = 0;
      for (const j of nb) {
        x += src[j * 3];
        y += src[j * 3 + 1];
        z += src[j * 3 + 2];
      }
      x /= nb.length;
      y /= nb.length;
      z /= nb.length;
      pos.setXYZ(
        i,
        lerp(src[i * 3], x, strength),
        lerp(src[i * 3 + 1], y, strength),
        lerp(src[i * 3 + 2], z, strength),
      );
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

/** Cheap vertical AO baked to a color attribute (grounds props without extra passes). */
export function bakeGradient(
  geo: THREE.BufferGeometry,
  low: THREE.Color,
  high: THREE.Color,
  minY: number,
  maxY: number,
) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = smoothstep(minY, maxY, pos.getY(i));
    c.copy(low).lerp(high, t);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

export interface BoneSegment {
  name: string;
  a: THREE.Vector3;
  b: THREE.Vector3;
  radius: number;
}

function distToSegment(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abz = b.z - a.z;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const apz = p.z - a.z;
  const len2 = abx * abx + aby * aby + abz * abz;
  const t = len2 > 1e-9 ? clamp((apx * abx + apy * aby + apz * abz) / len2) : 0;
  const dx = apx - abx * t;
  const dy = apy - aby * t;
  const dz = apz - abz * t;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Compute smooth skin weights analytically from bone capsule distances.
 * Lets us skin procedurally generated bodies without authoring weights by hand.
 */
export function autoSkin(geo: THREE.BufferGeometry, segments: BoneSegment[], boneOrder: string[], falloff = 1.9) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const skinIndex = new Uint16Array(pos.count * 4);
  const skinWeight = new Float32Array(pos.count * 4);
  const p = new THREE.Vector3();
  const scores: { idx: number; w: number }[] = [];
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    scores.length = 0;
    for (const seg of segments) {
      const boneIdx = boneOrder.indexOf(seg.name);
      if (boneIdx < 0) continue;
      const d = Math.max(0.0005, distToSegment(p, seg.a, seg.b) - seg.radius * 0.35);
      scores.push({ idx: boneIdx, w: 1 / Math.pow(d / seg.radius, falloff * 2) });
    }
    scores.sort((x, y) => y.w - x.w);
    const top = scores.slice(0, 4);
    const total = top.reduce((s, x) => s + x.w, 0) || 1;
    for (let k = 0; k < 4; k++) {
      skinIndex[i * 4 + k] = top[k]?.idx ?? 0;
      skinWeight[i * 4 + k] = (top[k]?.w ?? 0) / total;
    }
  }
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndex, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
  return geo;
}
