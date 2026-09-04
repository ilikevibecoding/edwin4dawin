// Hologram primitives shared by d1-nav and d1-tactical: an additive star-point cloud and an additive line set.
// Both are ONE draw call each and animate entirely in the vertex shader from a uTime uniform (no per-frame
// geometry uploads). Line vertices carry an animation class (aAnim) so one LineSegments object can hold a
// static grid, a rotating chart, a pulsing route and a radar sweep at the same time.
//
//   aAnim 0: static
//   aAnim 1: rotates about uCenter (y axis) at uSpin rad/s, offset by aPhase
//   aAnim 2: rotates like 1 and carries a travelling brightness pulse (aPhase = 0..1 position along the line)
//   aAnim 3: hovers (small vertical bob, aPhase = per-object offset)
//   aAnim 4: sweep — rotates about uCenter at uSweep rad/s, offset by aPhase (fan of trailing lines)
//   aAnim 5: blinks (aPhase = duty offset)
//   aAnim 6: rotates about a second centre uCenter2 (y axis) at uSpin2 rad/s (a planet turning on its own axis)
// Colours are per vertex, so a segment can fade along its length (feathered grid edges: colour → black).
import * as THREE from "three";

const LINE_VERT = /* glsl */ `
uniform float uTime;
uniform float uSpin;
uniform float uSweep;
uniform float uSpin2;
uniform vec3 uCenter;
uniform vec3 uCenter2;
attribute vec3 aColor;
attribute float aAnim;
attribute float aPhase;
varying vec3 vColor;
varying float vAlpha;
vec3 spinAbout(vec3 p, vec3 c0, float a) {
  float c = cos(a), s = sin(a);
  vec3 q = p - c0;
  return c0 + vec3(c * q.x + s * q.z, q.y, -s * q.x + c * q.z);
}
vec3 spin(vec3 p, float a) { return spinAbout(p, uCenter, a); }
void main() {
  vec3 p = position;
  float alpha = 1.0;
  if (aAnim > 0.5 && aAnim < 1.5) {
    p = spin(p, uTime * uSpin + aPhase);
  } else if (aAnim > 1.5 && aAnim < 2.5) {
    p = spin(p, uTime * uSpin);
    alpha = 0.55 + 0.45 * sin(uTime * 3.0 - aPhase * 12.566);
  } else if (aAnim > 2.5 && aAnim < 3.5) {
    p.y += 0.012 * sin(uTime * 1.3 + aPhase);
  } else if (aAnim > 3.5 && aAnim < 4.5) {
    p = spin(p, uTime * uSweep + aPhase);
  } else if (aAnim > 4.5 && aAnim < 5.5) {
    alpha = fract(uTime * 1.5 + aPhase) < 0.5 ? 1.0 : 0.15;
  } else if (aAnim > 5.5) {
    p = spinAbout(p, uCenter2, uTime * uSpin2 + aPhase);
  }
  vColor = aColor;
  vAlpha = alpha;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const LINE_FRAG = /* glsl */ `
uniform float uOpacity;
varying vec3 vColor;
varying float vAlpha;
void main() {
  gl_FragColor = vec4(vColor * vAlpha * uOpacity, 1.0);
}`;

const STAR_VERT = /* glsl */ `
uniform float uTime;
uniform float uSpin;
uniform float uSpin2;
uniform vec3 uCenter;
uniform vec3 uCenter2;
uniform float uHalfHeight;
attribute vec3 aColor;
attribute float aSize;
attribute float aPhase;
attribute float aAnim;
varying vec3 vColor;
varying float vTw;
void main() {
  // aAnim 0: turns with the chart about uCenter; aAnim 1: turns about uCenter2 (planet surface)
  bool alt = aAnim > 0.5;
  float a = uTime * (alt ? uSpin2 : uSpin);
  vec3 c0 = alt ? uCenter2 : uCenter;
  float c = cos(a), s = sin(a);
  vec3 q = position - c0;
  vec3 p = c0 + vec3(c * q.x + s * q.z, q.y, -s * q.x + c * q.z);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float tw = 0.78 + 0.22 * sin(uTime * 2.1 + aPhase);
  // aSize is a world-space diameter; projectionMatrix[1][1] * halfHeight converts metres at depth -mv.z to pixels
  gl_PointSize = max(1.0, aSize * tw * projectionMatrix[1][1] * uHalfHeight / max(0.2, -mv.z));
  vColor = aColor;
  vTw = tw;
  gl_Position = projectionMatrix * mv;
}`;

const STAR_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vTw;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r2 = dot(d, d);
  if (r2 > 0.25) discard;
  float k = smoothstep(0.25, 0.02, r2);
  gl_FragColor = vec4(vColor * k * vTw, 1.0);
}`;

function holoMaterial(vert, frag, center, extra = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSpin: { value: 0.06 },
      uSweep: { value: 0.9 },
      uSpin2: { value: 0.2 },
      uOpacity: { value: 1 },
      uHalfHeight: { value: 360 },
      uCenter: { value: new THREE.Vector3(...center) },
      uCenter2: { value: new THREE.Vector3(...center) },
      ...extra,
    },
    vertexShader: vert,
    fragmentShader: frag,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
  });
}

/** Accumulates line segments with colour + animation class, then builds one additive LineSegments. */
export class HoloLines {
  constructor(center, { spin = 0.06, sweep = 0.9, center2 = null, spin2 = 0.2 } = {}) {
    this.pos = [];
    this.col = [];
    this.anim = [];
    this.phase = [];
    this.center = center;
    this.spin = spin;
    this.sweep = sweep;
    this.center2 = center2 || center;
    this.spin2 = spin2;
  }
  // colorB (optional) = colour at the far end, for segments that fade along their length
  seg(a, b, color, anim = 0, phaseA = 0, phaseB = phaseA, colorB = color) {
    this.pos.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    this.col.push(color[0], color[1], color[2], colorB[0], colorB[1], colorB[2]);
    this.anim.push(anim, anim);
    this.phase.push(phaseA, phaseB);
  }
  /**
   * Rectangular grid whose lines fade out toward the rectangle's edge over `feather` metres (no hard border).
   * Lines are cut into short pieces so the per-vertex fade follows the edge distance.
   */
  gridFaded(x0, x1, z0, z1, y, { step = 0.2, major = 1.0, minorColor, majorColor, feather = 0.2, piece = 0.1, anim = 0 } = {}) {
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const fade = (x, z) => {
      const d = Math.min(x - x0, x1 - x, z - z0, z1 - z);
      const t = Math.max(0, Math.min(1, d / feather));
      return t * t * (3 - 2 * t);
    };
    const scaled = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
    const isMajor = (v, origin) => Math.abs(((v - origin) / major) % 1) < 1e-3 || Math.abs((((v - origin) / major) % 1) - 1) < 1e-3;
    const run = (fixed, alongX) => {
      const lo = alongX ? x0 : z0;
      const hi = alongX ? x1 : z1;
      const col = isMajor(fixed, alongX ? cz : cx) ? majorColor : minorColor;
      const n = Math.max(1, Math.round((hi - lo) / piece));
      for (let i = 0; i < n; i++) {
        const u0 = lo + ((hi - lo) * i) / n;
        const u1 = lo + ((hi - lo) * (i + 1)) / n;
        const a = alongX ? [u0, y, fixed] : [fixed, y, u0];
        const b = alongX ? [u1, y, fixed] : [fixed, y, u1];
        const fa = fade(a[0], a[2]);
        const fb = fade(b[0], b[2]);
        if (fa < 0.02 && fb < 0.02) continue;
        this.seg(a, b, scaled(col, fa), anim, 0, 0, scaled(col, fb));
      }
    };
    const nx = Math.round((x1 - x0) / step);
    for (let i = 0; i <= nx; i++) run(x0 + (i * (x1 - x0)) / nx, false);
    const nz = Math.round((z1 - z0) / step);
    for (let i = 0; i <= nz; i++) run(z0 + (i * (z1 - z0)) / nz, true);
  }
  /** Label tag: leader line from `at` rising in direction dirXZ, an underline and short "text" bars above it. */
  tag(at, dirXZ, { color, colorDim = color, rise = 0.12, lead = 0.16, len = 0.18, anim = 0, phase = 0, bars = 2 } = {}) {
    const [ux, uz] = dirXZ;
    const l = [at[0] + ux * lead, at[1] + rise, at[2] + uz * lead];
    this.seg(at, l, colorDim, anim, phase);
    this.seg(l, [l[0] + ux * len, l[1], l[2] + uz * len], color, anim, phase);
    for (let i = 0; i < bars; i++) {
      const yy = l[1] + 0.03 + i * 0.03;
      const f = i === 0 ? 0.7 : 0.45;
      this.seg([l[0], yy, l[2]], [l[0] + ux * len * f, yy, l[2] + uz * len * f], colorDim, anim, phase);
    }
  }
  /** Wireframe sphere: `lat` latitude rings and `lon` meridians (anim 6 turns it about center2). */
  sphereWire(c, r, color, { lat = 5, lon = 8, n = 40, anim = 6, phase = 0, colorLat = color } = {}) {
    for (let i = 1; i <= lat; i++) {
      const ph = (i / (lat + 1)) * Math.PI;
      const rr = r * Math.sin(ph);
      const y = c[1] + r * Math.cos(ph);
      this.circle([c[0], y, c[2]], rr, colorLat, { n, anim, phase });
    }
    for (let k = 0; k < lon; k++) {
      const th = (k / lon) * Math.PI;
      const pts = [];
      for (let i = 0; i <= n / 2; i++) {
        const ph = (i / (n / 2)) * Math.PI;
        pts.push([c[0] + r * Math.sin(ph) * Math.cos(th), c[1] + r * Math.cos(ph), c[2] + r * Math.sin(ph) * Math.sin(th)]);
      }
      this.poly(pts, color, anim, { phase });
    }
  }
  // open polyline; phase runs 0..1 along it when phased is true (for the travelling pulse of aAnim 2)
  poly(points, color, anim = 0, { phased = false, phase = 0, closed = false } = {}) {
    const n = points.length;
    const m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) {
      const j = (i + 1) % n;
      const pa = phased ? i / m : phase;
      const pb = phased ? (i + 1) / m : phase;
      this.seg(points[i], points[j], color, anim, pa, pb);
    }
  }
  // horizontal circle (axis y) centred at c with radius r
  circle(c, r, color, { n = 48, anim = 0, phase = 0, a0 = 0, a1 = Math.PI * 2, dashed = 0 } = {}) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      pts.push([c[0] + Math.sin(a) * r, c[1], c[2] + Math.cos(a) * r]);
    }
    if (dashed > 0) {
      for (let i = 0; i < n; i += dashed * 2) this.seg(pts[i], pts[Math.min(n, i + dashed)], color, anim, phase);
    } else this.poly(pts, color, anim, { phase });
  }
  // dashed straight line
  dashed(a, b, color, { dash = 0.06, gap = 0.04, anim = 0, phase = 0 } = {}) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const dz = b[2] - a[2];
    const L = Math.hypot(dx, dy, dz);
    if (L < 1e-6) return;
    for (let s = 0; s < L; s += dash + gap) {
      const e = Math.min(L, s + dash);
      const p = [a[0] + (dx * s) / L, a[1] + (dy * s) / L, a[2] + (dz * s) / L];
      const q = [a[0] + (dx * e) / L, a[1] + (dy * e) / L, a[2] + (dz * e) / L];
      this.seg(p, q, color, anim, phase);
    }
  }
  // small diamond marker in the horizontal plane (optionally with a vertical axis)
  diamond(c, r, color, { anim = 0, phase = 0, vertical = false } = {}) {
    const pts = [
      [c[0] + r, c[1], c[2]],
      [c[0], c[1], c[2] + r],
      [c[0] - r, c[1], c[2]],
      [c[0], c[1], c[2] - r],
    ];
    this.poly(pts, color, anim, { phase, closed: true });
    if (vertical) {
      const v = [
        [c[0], c[1] + r, c[2]],
        [c[0] + r, c[1], c[2]],
        [c[0], c[1] - r, c[2]],
        [c[0] - r, c[1], c[2]],
      ];
      this.poly(v, color, anim, { phase, closed: true });
    }
  }
  // axis-aligned wire box
  box(min, max, color, anim = 0, phase = 0) {
    const [x0, y0, z0] = min;
    const [x1, y1, z1] = max;
    const c = (x, y, z) => [x, y, z];
    const e = [
      [c(x0, y0, z0), c(x1, y0, z0)],
      [c(x1, y0, z0), c(x1, y0, z1)],
      [c(x1, y0, z1), c(x0, y0, z1)],
      [c(x0, y0, z1), c(x0, y0, z0)],
      [c(x0, y1, z0), c(x1, y1, z0)],
      [c(x1, y1, z0), c(x1, y1, z1)],
      [c(x1, y1, z1), c(x0, y1, z1)],
      [c(x0, y1, z1), c(x0, y1, z0)],
      [c(x0, y0, z0), c(x0, y1, z0)],
      [c(x1, y0, z0), c(x1, y1, z0)],
      [c(x1, y0, z1), c(x1, y1, z1)],
      [c(x0, y0, z1), c(x0, y1, z1)],
    ];
    for (const [a, b] of e) this.seg(a, b, color, anim, phase);
  }
  // rectangular grid in the horizontal plane y, minor/major spacing, clipped to a circle if radius given
  grid(x0, x1, z0, z1, y, { step = 0.2, major = 1.0, minorColor, majorColor, radius = 0, center = null, anim = 0 } = {}) {
    const cx = center ? center[0] : (x0 + x1) / 2;
    const cz = center ? center[2] : (z0 + z1) / 2;
    const clipSeg = (a, b) => {
      if (!radius) return [a, b];
      // clip the segment to the circle (both endpoints inside → keep; use parametric intersection otherwise)
      const dx = b[0] - a[0];
      const dz = b[2] - a[2];
      const fx = a[0] - cx;
      const fz = a[2] - cz;
      const A = dx * dx + dz * dz;
      const Bq = 2 * (fx * dx + fz * dz);
      const C = fx * fx + fz * fz - radius * radius;
      const disc = Bq * Bq - 4 * A * C;
      if (disc < 0) return null;
      const sq = Math.sqrt(disc);
      const t0 = Math.max(0, (-Bq - sq) / (2 * A));
      const t1 = Math.min(1, (-Bq + sq) / (2 * A));
      if (t1 <= t0) return null;
      return [
        [a[0] + dx * t0, a[1], a[2] + dz * t0],
        [a[0] + dx * t1, a[1], a[2] + dz * t1],
      ];
    };
    const isMajor = (v, origin) => Math.abs(((v - origin) / major) % 1) < 1e-3 || Math.abs((((v - origin) / major) % 1) - 1) < 1e-3;
    const nx = Math.round((x1 - x0) / step);
    for (let i = 0; i <= nx; i++) {
      const x = x0 + (i * (x1 - x0)) / nx;
      const s = clipSeg([x, y, z0], [x, y, z1]);
      if (s) this.seg(s[0], s[1], isMajor(x, cx) ? majorColor : minorColor, anim);
    }
    const nz = Math.round((z1 - z0) / step);
    for (let i = 0; i <= nz; i++) {
      const z = z0 + (i * (z1 - z0)) / nz;
      const s = clipSeg([x0, y, z], [x1, y, z]);
      if (s) this.seg(s[0], s[1], isMajor(z, cz) ? majorColor : minorColor, anim);
    }
  }
  build(name = "holo-lines") {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("aColor", new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute("aAnim", new THREE.Float32BufferAttribute(this.anim, 1));
    g.setAttribute("aPhase", new THREE.Float32BufferAttribute(this.phase, 1));
    g.computeBoundingSphere();
    const mat = holoMaterial(LINE_VERT, LINE_FRAG, this.center);
    mat.uniforms.uSpin.value = this.spin;
    mat.uniforms.uSweep.value = this.sweep;
    mat.uniforms.uSpin2.value = this.spin2;
    mat.uniforms.uCenter2.value.set(...this.center2);
    const obj = new THREE.LineSegments(g, mat);
    obj.name = name;
    obj.frustumCulled = false;
    obj.renderOrder = 10;
    return obj;
  }
}

/** Accumulates star points (world position, colour, world-space diameter), builds one additive Points object. */
export class HoloStars {
  constructor(center, { spin = 0.06, center2 = null, spin2 = 0.2 } = {}) {
    this.pos = [];
    this.col = [];
    this.size = [];
    this.phase = [];
    this.anim = [];
    this.center = center;
    this.spin = spin;
    this.center2 = center2 || center;
    this.spin2 = spin2;
  }
  add(p, color, size, phase = 0, anim = 0) {
    this.pos.push(p[0], p[1], p[2]);
    this.col.push(color[0], color[1], color[2]);
    this.size.push(size);
    this.phase.push(phase);
    this.anim.push(anim);
  }
  get count() {
    return this.size.length;
  }
  build(name = "holo-stars") {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("aColor", new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute("aSize", new THREE.Float32BufferAttribute(this.size, 1));
    g.setAttribute("aPhase", new THREE.Float32BufferAttribute(this.phase, 1));
    g.setAttribute("aAnim", new THREE.Float32BufferAttribute(this.anim, 1));
    g.computeBoundingSphere();
    const mat = holoMaterial(STAR_VERT, STAR_FRAG, this.center);
    mat.uniforms.uSpin.value = this.spin;
    mat.uniforms.uSpin2.value = this.spin2;
    mat.uniforms.uCenter2.value.set(...this.center2);
    const obj = new THREE.Points(g, mat);
    obj.name = name;
    obj.frustumCulled = false;
    obj.renderOrder = 11;
    return obj;
  }
}

// Per-frame driver: set uTime on every holo object and keep the point-size scale in step with the viewport.
export function tickHolo(objects, t) {
  const hh = typeof window !== "undefined" ? window.innerHeight / 2 : 360;
  for (const o of objects) {
    const u = o.material.uniforms;
    u.uTime.value = t;
    if (u.uHalfHeight) u.uHalfHeight.value = hh;
  }
}

// Holo colour presets (linear, > 1 blooms)
export const HOLO = {
  cyan: [0.35, 0.95, 1.25],
  cyanDim: [0.08, 0.26, 0.34],
  cyanFaint: [0.03, 0.1, 0.14],
  blue: [0.3, 0.55, 1.6],
  blueDim: [0.08, 0.16, 0.42],
  white: [1.2, 1.35, 1.6],
  amber: [1.6, 0.85, 0.25],
  amberDim: [0.4, 0.22, 0.06],
  red: [1.7, 0.3, 0.22],
  redDim: [0.42, 0.08, 0.06],
};
