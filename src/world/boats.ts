import * as THREE from 'three';
import { Rng } from '../core/seed';
import { clamp, lerp, smoothstep } from '../core/noise';
import { balanceGroundIbl } from './terrain';

/**
 * Boats of the traffic batch: lofted hulls (sheer, flare, chine, raked stem, transom) with the deck fittings of
 * each kind, four levels of detail per variant, one vertex-attribute material for the whole batch (per-vertex
 * roughness / metalness, per-instance hull tint, night glow mask) and the motion model that floats a hull on
 * the CPU wave field (heave / roll / pitch from hull sample points, trim and squat with speed, lean in turns).
 *
 * Hull frame: +x forward (bow), +y up, +z starboard; the design waterline is y = 0.
 */

export type HullKind = 'speed' | 'yacht' | 'sail' | 'console' | 'cargo' | 'ferry' | 'cruise';

/** A vessel tied up somewhere (marina slips, the cruise berth): position, heading, the length the berth was laid
 *  out for and, for the special berths, the kind of vessel. */
export interface MooredBoat { x: number; z: number; rot: number; len: number; kind?: HullKind; }

// ------------------------------------------------------------------ finishes

/** A surface finish baked per vertex: linear colour, roughness, metalness, glow class (0 none, 0.5 warm cabin
 *  glow at night, 1 a lens that glows in its own colour), whether the instance hull tint multiplies it and
 *  whether it is baked as two opposed faces (sails, glass panes). */
export interface Finish { c: THREE.Color; r: number; m: number; e?: number; t?: boolean; ds?: boolean }

const C = (hex: number) => new THREE.Color(hex);
const fin = (hex: number, r: number, m = 0, extra: Partial<Finish> = {}): Finish => ({ c: C(hex), r, m, ...extra });

/** shared finishes (hull colours come from the variant) */
const F = {
  gel: fin(0xffffff, 0.2, 0.0, { t: true }),           // gel coat topsides, tinted per instance
  gelWhite: fin(0xf2f2ee, 0.22),                         // white gel coat of the superstructure
  gelCream: fin(0xe9e3d2, 0.24),
  plateWhite: fin(0xe6e7e4, 0.5, 0.1),                   // painted steel (ships)
  plateTint: fin(0xffffff, 0.5, 0.1, { t: true }),
  deckSkid: fin(0xe4e1d6, 0.9),                          // moulded non-skid
  deckGrey: fin(0x9a9d9c, 0.85),                         // painted steel deck
  deckGreen: fin(0x3f5a48, 0.85),
  teak: fin(0xa2784a, 0.7),
  teakGrey: fin(0x9d9484, 0.75),
  chrome: fin(0xe2e6ea, 0.14, 1.0),
  alu: fin(0xc4c8cc, 0.4, 0.8),
  darkMetal: fin(0x2a2d31, 0.45, 0.6),
  rubber: fin(0x1f2124, 0.9),
  glass: fin(0x16222c, 0.06, 0.9, { ds: true }),
  glassGlow: fin(0x16222c, 0.06, 0.9, { ds: true, e: 0.5 }),
  glassFlat: fin(0x121c26, 0.06, 0.9),                   // window bands on opaque walls (single-sided)
  glassFlatGlow: fin(0x121c26, 0.06, 0.9, { e: 0.5 }),
  upholWhite: fin(0xefece4, 0.7),
  upholGrey: fin(0x8a8d90, 0.75),
  upholNavy: fin(0x24334e, 0.75),
  sail: fin(0xf4f1e6, 0.9, 0, { ds: true }),
  fenderWhite: fin(0xe4e4dc, 0.85),
  fenderBlue: fin(0x2a4c7d, 0.85),
  rope: fin(0xd8d2be, 0.95),
  navRed: fin(0xff1e1e, 0.3, 0, { e: 1 }),
  navGreen: fin(0x18ff48, 0.3, 0, { e: 1 }),
  navWhite: fin(0xfff2d8, 0.3, 0, { e: 1 }),
  orange: fin(0xe0642a, 0.55),
  lifeRaft: fin(0xf0f0ea, 0.6),
  skin: fin(0xc79a72, 0.8),
  skinDark: fin(0x6b4a33, 0.8),
  hair: fin(0x2a1e16, 0.9),
  black: fin(0x151719, 0.7),
  antennaWhite: fin(0xf4f4f4, 0.6),
  pool: fin(0x3aa4d6, 0.08, 0.2),
  court: fin(0x3f7f4e, 0.9),
  wood: fin(0x6b4b2e, 0.85),
  regBlack: fin(0x141618, 0.5),
  regBlue: fin(0x142a5a, 0.5),
};
const SHIRTS = [0xf2f2f2, 0x2a4c8c, 0xd8433a, 0xe6b030, 0x3d8a4a, 0x222428, 0xe9a0c0, 0x8ecbe0].map((h) => fin(h, 0.85));
const TROUSERS = [0x2a2f3a, 0xc9bfa6, 0x1c1c1e, 0x3f4b63].map((h) => fin(h, 0.85));
const CONTAINERS = [0xb03a2e, 0x2e6fb0, 0x2f8f4e, 0xd07f1c, 0x6f7b85, 0xe4e6e4, 0x7a2f8a, 0x3a3f46].map((h) => fin(h, 0.6, 0.15));

// ------------------------------------------------------------------ geometry accumulator

const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(1, 1, 1);
const _nm = new THREE.Matrix3();
const Y_AXIS = new THREE.Vector3(0, 1, 0);

/** Accumulates triangles with the batch's vertex attributes: position, normal, colour, (roughness, metalness),
 *  glow class and hull-tint flag. `lod` is the level being built (0 near .. 3 far); parts are added with the
 *  highest level they survive to. */
export class Parts {
  private readonly pos: number[] = [];
  private readonly nrm: number[] = [];
  private readonly col: number[] = [];
  private readonly par: number[] = [];
  private readonly em: number[] = [];
  private readonly tint: number[] = [];

  constructor(readonly lod: number) {}

  get triangles(): number { return this.pos.length / 9; }

  vertex(x: number, y: number, z: number, nx: number, ny: number, nz: number, f: Finish): void {
    this.pos.push(x, y, z);
    this.nrm.push(nx, ny, nz);
    this.col.push(f.c.r, f.c.g, f.c.b);
    this.par.push(f.r, f.m);
    this.em.push(f.e ?? 0);
    this.tint.push(f.t ? 1 : 0);
  }

  /** Triangle with per-vertex normals; the winding is fixed to face along the given normals. */
  tri(a: number[], b: number[], c: number[], na: number[], nb: number[], nc: number[], f: Finish): void {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const gx = uy * vz - uz * vy, gy = uz * vx - ux * vz, gz = ux * vy - uy * vx;
    const d = gx * (na[0] + nb[0] + nc[0]) + gy * (na[1] + nb[1] + nc[1]) + gz * (na[2] + nb[2] + nc[2]);
    if (d >= 0) { this.vertex(a[0], a[1], a[2], na[0], na[1], na[2], f); this.vertex(b[0], b[1], b[2], nb[0], nb[1], nb[2], f); this.vertex(c[0], c[1], c[2], nc[0], nc[1], nc[2], f); }
    else { this.vertex(a[0], a[1], a[2], na[0], na[1], na[2], f); this.vertex(c[0], c[1], c[2], nc[0], nc[1], nc[2], f); this.vertex(b[0], b[1], b[2], nb[0], nb[1], nb[2], f); }
    if (f.ds) {
      const fa = [-na[0], -na[1], -na[2]], fb = [-nb[0], -nb[1], -nb[2]], fc = [-nc[0], -nc[1], -nc[2]];
      if (d >= 0) { this.vertex(a[0], a[1], a[2], fa[0], fa[1], fa[2], f); this.vertex(c[0], c[1], c[2], fc[0], fc[1], fc[2], f); this.vertex(b[0], b[1], b[2], fb[0], fb[1], fb[2], f); }
      else { this.vertex(a[0], a[1], a[2], fa[0], fa[1], fa[2], f); this.vertex(b[0], b[1], b[2], fb[0], fb[1], fb[2], f); this.vertex(c[0], c[1], c[2], fc[0], fc[1], fc[2], f); }
    }
  }

  /** Planar quad a-b-c-d (any consistent order); the face normal comes from the winding. */
  quad(a: number[], b: number[], c: number[], d: number[], f: Finish): void {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const n = [nx, ny, nz];
    this.tri(a, b, c, n, n, n, f);
    this.tri(a, c, d, n, n, n, f);
  }

  /** Bake a three.js geometry (indexed or not) transformed by `m`. */
  geometry(geo: THREE.BufferGeometry, f: Finish, m: THREE.Matrix4, color?: THREE.Color): void {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const p = g.getAttribute('position'), n = g.getAttribute('normal');
    _nm.getNormalMatrix(m);
    const ff = color ? { ...f, c: color } : f;
    const put = (i: number, flip: boolean) => {
      _v.set(p.getX(i), p.getY(i), p.getZ(i)).applyMatrix4(m);
      _n.set(n.getX(i), n.getY(i), n.getZ(i)).applyMatrix3(_nm).normalize();
      const s = flip ? -1 : 1;
      this.vertex(_v.x, _v.y, _v.z, s * _n.x, s * _n.y, s * _n.z, ff);
    };
    for (let i = 0; i < p.count; i++) put(i, false);
    if (f.ds) for (let t = 0; t < p.count; t += 3) { put(t, true); put(t + 2, true); put(t + 1, true); }
    if (g !== geo) g.dispose();
  }

  private place(x: number, y: number, z: number, rx: number, ry: number, rz: number, sx = 1, sy = 1, sz = 1): THREE.Matrix4 {
    _e.set(rx, ry, rz, 'YXZ');
    return _m.compose(_v.set(x, y, z), _q.setFromEuler(_e), _s.set(sx, sy, sz));
  }

  /** Box of size w (x) h (y) d (z) centred at (x, y, z), rotated by yaw ry, pitch rx (about x), roll rz. */
  box(f: Finish, w: number, h: number, d: number, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, color?: THREE.Color): void {
    const g = new THREE.BoxGeometry(w, h, d);
    this.geometry(g, f, this.place(x, y, z, rx, ry, rz), color);
    g.dispose();
  }

  /** Cylinder along its local y (height h) centred at (x, y, z); `open` leaves the caps off. */
  cyl(f: Finish, rBottom: number, rTop: number, h: number, x: number, y: number, z: number, seg = 6, rx = 0, ry = 0, rz = 0, open = false): void {
    const g = new THREE.CylinderGeometry(rTop, rBottom, h, seg, 1, open);
    this.geometry(g, f, this.place(x, y, z, rx, ry, rz));
    g.dispose();
  }

  sphere(f: Finish, r: number, x: number, y: number, z: number, w = 7, hseg = 5, sy = 1, sx = 1, sz = 1): void {
    const g = new THREE.SphereGeometry(r, w, hseg);
    this.geometry(g, f, this.place(x, y, z, 0, 0, 0, sx, sy, sz));
    g.dispose();
  }

  /** Straight tube of radius r from a to b (a rail, a stay, a mast section). */
  rod(f: Finish, r: number, a: number[], b: number[], seg = 4): void {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const l = Math.hypot(dx, dy, dz);
    if (l < 1e-4) return;
    _q.setFromUnitVectors(Y_AXIS, _n.set(dx / l, dy / l, dz / l));
    const g = new THREE.CylinderGeometry(r, r, l, seg, 1, true);
    this.geometry(g, f, _m.compose(_v.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _q, _s.set(1, 1, 1)));
    g.dispose();
  }

  /** Polyline of rods. */
  tube(f: Finish, r: number, pts: number[][], seg = 4): void {
    for (let i = 0; i < pts.length - 1; i++) this.rod(f, r, pts[i], pts[i + 1], seg);
  }

  build(): THREE.BufferGeometry {
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    out.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    out.setAttribute('aMatParams', new THREE.Float32BufferAttribute(this.par, 2));
    out.setAttribute('aEmissive', new THREE.Float32BufferAttribute(this.em, 1));
    out.setAttribute('aTint', new THREE.Float32BufferAttribute(this.tint, 1));
    out.computeBoundingBox();
    out.computeBoundingSphere();
    return out;
  }
}

/** The geometry mirrored about the hull's centre plane (z -> -z): the other tack of a sailing hull. */
export function mirrorZ(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color', 'aMatParams', 'aEmissive', 'aTint']) {
    const src = geo.getAttribute(name) as THREE.BufferAttribute;
    const n = src.count, size = src.itemSize;
    const arr = new Float32Array(n * size);
    for (let t = 0; t < n; t += 3) {
      // swap the second and third vertex of every triangle to keep the winding
      const order = [t, t + 2, t + 1];
      for (let k = 0; k < 3; k++) for (let c = 0; c < size; c++) {
        let v = (src.array as Float32Array)[order[k] * size + c];
        if ((name === 'position' || name === 'normal') && c === 2) v = -v;
        arr[(t + k) * size + c] = v;
      }
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}

/** The spec of a hull drawn at scale k (moored hulls are fitted to their berth). */
export function scaledSpec(s: BoatSpec, k: number): BoatSpec {
  if (k === 1) return s;
  return { ...s, len: s.len * k, lwl: s.lwl * k, beam: s.beam * k, draft: s.draft * k, height: s.height * k, wakeWidth: s.wakeWidth * k, samples: s.samples.map(([x, z]) => [x * k, z * k] as [number, number]) };
}

/** Bake the meshes of a group into one geometry in the group's local frame with the batch attributes (no tint,
 *  no glow): the airliners of the traffic batch. Instanced children are expanded with their instance colours. */
export function bakeGroupLocal(g: THREE.Group): THREE.BufferGeometry {
  g.updateMatrixWorld(true);
  const inv = g.matrixWorld.clone().invert();
  const parts = new Parts(0);
  const local = new THREE.Matrix4(), inst = new THREE.Matrix4(), col = new THREE.Color();
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    local.multiplyMatrices(inv, m.matrixWorld);
    const mat = m.material as THREE.MeshStandardMaterial;
    const f: Finish = { c: mat.color, r: mat.roughness, m: mat.metalness, ds: mat.side === THREE.DoubleSide };
    const im = o as THREE.InstancedMesh;
    if (im.isInstancedMesh) {
      for (let i = 0; i < im.count; i++) {
        im.getMatrixAt(i, inst);
        if (im.instanceColor) im.getColorAt(i, col);
        parts.geometry(m.geometry, f, inst.premultiply(local), im.instanceColor ? col.clone() : undefined);
      }
    } else parts.geometry(m.geometry, f, local);
    m.geometry.dispose();
  });
  return parts.build();
}

// ------------------------------------------------------------------ material

/**
 * The batch material: colour and PBR parameters per vertex, the hull colour per instance (BatchedMesh colour,
 * applied only to vertices flagged `aTint`), and a glow mask for the night: lenses (aEmissive 1) glow in their
 * own colour, cabin glass (0.5) in a warm interior light. `emissiveIntensity` is driven by the night factor.
 */
export function createBoatMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 1, vertexColors: true, emissive: 0xffffff, emissiveIntensity: 0 });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aMatParams;\nattribute float aEmissive;\nattribute float aTint;\nvarying vec2 vMatParams;\nvarying float vEmissive;')
      .replace('#include <color_vertex>', `vColor = vec3(1.0);
#ifdef USE_COLOR
vColor *= color;
#endif
#ifdef USE_BATCHING_COLOR
vColor *= mix(vec3(1.0), getBatchingColor(getIndirectIndex(gl_DrawID)), aTint);
#endif`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMatParams = aMatParams;\nvEmissive = aEmissive;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vMatParams;\nvarying float vEmissive;')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vMatParams.x;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vMatParams.y;')
      .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance *= step(0.25, vEmissive) * (vEmissive > 0.75 ? diffuseColor.rgb * 5.0 : vec3(1.0, 0.68, 0.38));');
    balanceGroundIbl(shader);
  };
  mat.customProgramCacheKey = () => 'traffic-boats-v1';
  return mat;
}

// ------------------------------------------------------------------ hull loft

interface HullForm {
  len: number; beam: number; draft: number; freeboard: number;
  /** extra sheer rise at the bow / stern as a fraction of the freeboard */
  sheerBow: number; sheerStern: number;
  /** stem overhang at the sheer and transom rake (m) */
  bowRake: number; transomRake: number;
  form: 'v' | 'round' | 'ship';
  deadriseAft: number; deadriseFwd: number; chineFlare: number; bowFlare: number;
  /** plan view: transom width as a fraction of the beam, where the beam peaks, up to where it stays full,
   *  bow fullness exponent (1.5 fine .. 2.5 bluff) */
  transomBeam: number; maxBeamAt: number; fullTo: number; entry: number;
  /** where the keel starts rising to the stem */
  forefootUp: number;
  /** ship: bilge radius as a fraction of the half beam; bulbous bow radius (m) */
  bilge: number; bulb: number;
  /** round: keel rise at the stern as a fraction of the draft */
  rocker: number;
}

const _sp = { x: 0, y: 0, z: 0 };

function planHalfBeam(h: HullForm, t: number): number {
  let s: number;
  if (t < h.maxBeamAt) s = h.transomBeam + (1 - h.transomBeam) * Math.pow(Math.sin((t / h.maxBeamAt) * Math.PI * 0.5), 1.3);
  else if (t < h.fullTo) s = 1;
  else { const u = (t - h.fullTo) / (1 - h.fullTo); s = Math.pow(Math.max(1 - Math.pow(u, h.entry), 0), 0.6); }
  return h.beam * 0.5 * s;
}
function sheerY(h: HullForm, t: number): number {
  return h.freeboard * (1 + h.sheerBow * Math.pow(smoothstep(0.25, 1, t), 1.7) + h.sheerStern * (1 - smoothstep(0, 0.3, t)));
}
function keelY(h: HullForm, t: number): number {
  let y = -h.draft;
  if (t > h.forefootUp) { const u = (t - h.forefootUp) / (1 - h.forefootUp); y = -h.draft * (1 - Math.pow(u, 1.8)); }
  if (h.form === 'round') y *= 1 - h.rocker * Math.pow(1 - smoothstep(0, 0.5, t), 2);
  return y;
}
/** rake shift of a hull point at height fraction f (0 keel .. 1 sheer) at station t */
function rakeX(h: HullForm, t: number, f: number): number {
  return h.bowRake * Math.pow(smoothstep(0.55, 1, t), 2) * f + h.transomRake * (1 - smoothstep(0, 0.08, t)) * f;
}
/** starboard half section point at station t (0 transom .. 1 stem), v (0 keel .. 1 sheer) */
function sectionPoint(h: HullForm, t: number, v: number, out: { x: number; y: number; z: number }): void {
  const hb = planHalfBeam(h, t), ys = sheerY(h, t), yk = keelY(h, t);
  let y: number, z: number;
  if (h.form === 'v') {
    const flare = h.chineFlare + h.bowFlare * smoothstep(0.45, 1, t);
    const hbC = hb / (1 + flare);
    const dr = lerp(h.deadriseAft, h.deadriseFwd, smoothstep(0.3, 0.92, t));
    const yc = Math.min(yk + hbC * Math.tan(dr), ys - 0.2 * (ys - yk));
    const vc = 0.42;
    if (v <= vc) { const s = v / vc; z = hbC * s; y = yk + (yc - yk) * Math.pow(s, 0.85); }
    else { const s = (v - vc) / (1 - vc); z = hbC + (hb - hbC) * Math.pow(s, 0.7); y = yc + (ys - yc) * s; }
  } else if (h.form === 'round') {
    const p = 0.8 + 0.6 * smoothstep(0.55, 1, t);
    z = hb * Math.pow(Math.sin(v * Math.PI * 0.5), p);
    y = yk + (ys - yk) * Math.pow(1 - Math.cos(v * Math.PI * 0.5), 0.9);
  } else {
    const r = Math.min(h.bilge * h.beam * 0.5, hb, (ys - yk) * 0.45);
    const flat = hb - r;
    if (v < 0.2) { z = flat * (v / 0.2); y = yk; }
    else if (v < 0.5) { const a = ((v - 0.2) / 0.3) * Math.PI * 0.5; z = flat + r * Math.sin(a); y = yk + r * (1 - Math.cos(a)); }
    else { z = hb; y = yk + r + (ys - yk - r) * ((v - 0.5) / 0.5); }
  }
  const f = (y - yk) / Math.max(ys - yk, 1e-3);
  out.x = -h.len / 2 + t * h.len + rakeX(h, t, f);
  out.y = y; out.z = z;
}
/** v at which the section at station t reaches height y (clamped to the section's range) */
function vAtHeight(h: HullForm, t: number, y: number): number {
  let lo = 0, hi = 1;
  sectionPoint(h, t, 0, _sp); if (y <= _sp.y) return 0;
  sectionPoint(h, t, 1, _sp); if (y >= _sp.y) return 1;
  for (let i = 0; i < 18; i++) { const mid = (lo + hi) / 2; sectionPoint(h, t, mid, _sp); if (_sp.y < y) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
/** the sheer point of station t: [x, y, halfBeam] */
function sheerPoint(h: HullForm, t: number): [number, number, number] {
  sectionPoint(h, t, 1, _sp);
  return [_sp.x, _sp.y, _sp.z];
}
/** hull surface point at station t and height y: [x, y, z] */
function hullAt(h: HullForm, t: number, y: number): [number, number, number] {
  sectionPoint(h, t, vAtHeight(h, t, y), _sp);
  return [_sp.x, _sp.y, _sp.z];
}
/** station parameter of a hull x coordinate (ignoring rake) */
function tOfX(h: HullForm, x: number): number { return clamp((x + h.len / 2) / h.len, 0, 1); }

/** A vertex row of the loft: at a fixed v or a fixed height; `eps` picks the finish just below / above the row
 *  (duplicated rows make hard colour edges and creases); `crease` splits the normals at the row. */
interface Row { v?: number; y?: number; eps: number; crease?: boolean }

/** Hull colours of a variant by height (wet antifouling below the waterline, boot stripe, tinted topsides,
 *  optional accent stripe under the sheer, painted plating for ships). */
interface HullPaint { anti: THREE.Color; boot: THREE.Color; accent: THREE.Color | null; bootTop: number; accentY: [number, number] | null; ship: boolean; }

function hullFinish(p: HullPaint, y: number, ysheer: number): Finish {
  if (y < 0) {
    // antifouling, wet and glossy right at the waterline, matt lower down
    const wet = 1 - smoothstep(0, 0.45, -y);
    const c = p.anti.clone().multiplyScalar(lerp(1, 0.6, wet));
    return { c, r: lerp(0.5, 0.08, wet), m: 0 };
  }
  if (y < p.bootTop) return { c: p.boot, r: p.ship ? 0.45 : 0.18, m: p.ship ? 0.1 : 0 };
  if (p.accentY && y >= p.accentY[0] + ysheer && y < p.accentY[1] + ysheer && p.accent) return { c: p.accent, r: p.ship ? 0.45 : 0.18, m: p.ship ? 0.1 : 0 };
  return p.ship ? F.plateTint : F.gel;
}

/** below-water paint of a hull's appendages (keel, rudder, bulb): the variant's antifouling colour */
const antiCache = new WeakMap<BoatVariant, Finish>();
function antiFinish(v: BoatVariant): Finish {
  let f = antiCache.get(v);
  if (!f) { f = { c: v.paint.anti, r: 0.5, m: 0 }; antiCache.set(v, f); }
  return f;
}

/** Loft the hull shell (both sides) and the transom. Returns the station list for the deck work. */
function loftHull(parts: Parts, h: HullForm, paint: HullPaint, stations: number[], rows: Row[]): void {
  const nS = stations.length, nR = rows.length;
  const P = new Float64Array(nS * nR * 3), N = new Float64Array(nS * nR * 3);
  const fins: Finish[] = new Array(nS * nR);
  const dt = 0.004, dv = 0.004;
  const pt = { x: 0, y: 0, z: 0 }, pa = { x: 0, y: 0, z: 0 }, pb = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < nS; i++) {
    const t = stations[i];
    const ys = sheerY(h, t);
    for (let j = 0; j < nR; j++) {
      const r = rows[j];
      const v = r.v !== undefined ? r.v : vAtHeight(h, t, r.y!);
      sectionPoint(h, t, v, pt);
      const k = (i * nR + j) * 3;
      P[k] = pt.x; P[k + 1] = pt.y; P[k + 2] = pt.z;
      // analytic normal from one-sided differences on the row's side of a crease
      const t0 = Math.max(0, t - dt), t1 = Math.min(1, t + dt);
      sectionPoint(h, t0, v, pa); sectionPoint(h, t1, v, pb);
      const tx = pb.x - pa.x, ty = pb.y - pa.y, tz = pb.z - pa.z;
      let v0 = v - dv, v1 = v + dv;
      if (r.crease || v <= dv) { if (r.eps < 0 || v <= dv) v0 = v; else v1 = v; }
      if (v1 > 1) { v1 = 1; v0 = 1 - dv; }
      v0 = Math.max(0, v0);
      sectionPoint(h, t, v0, pa); sectionPoint(h, t, v1, pb);
      const ux = pb.x - pa.x, uy = pb.y - pa.y, uz = pb.z - pa.z;
      // outward normal = t x v
      let nx = ty * uz - tz * uy, ny = tz * ux - tx * uz, nz = tx * uy - ty * ux;
      const l = Math.hypot(nx, ny, nz);
      if (l < 1e-9) { nx = 0; ny = 0; nz = 1; } else { nx /= l; ny /= l; nz /= l; }
      N[k] = nx; N[k + 1] = ny; N[k + 2] = nz;
      fins[i * nR + j] = hullFinish(paint, pt.y + r.eps, ys);
    }
  }
  const a: number[] = [0, 0, 0], b: number[] = [0, 0, 0], c: number[] = [0, 0, 0], d: number[] = [0, 0, 0];
  const na: number[] = [0, 0, 0], nb: number[] = [0, 0, 0], nc: number[] = [0, 0, 0], nd: number[] = [0, 0, 0];
  const get = (i: number, j: number, side: number, p: number[], n: number[]) => {
    const k = (i * nR + j) * 3;
    p[0] = P[k]; p[1] = P[k + 1]; p[2] = side * P[k + 2];
    n[0] = N[k]; n[1] = N[k + 1]; n[2] = side * N[k + 2];
  };
  for (const side of [1, -1]) {
    for (let i = 0; i < nS - 1; i++) for (let j = 0; j < nR - 1; j++) {
      const f = fins[i * nR + j];
      get(i, j, side, a, na); get(i + 1, j, side, b, nb); get(i + 1, j + 1, side, c, nc); get(i, j + 1, side, d, nd);
      // split colour: both triangles of the quad take the row's finish (per vertex it interpolates along the row)
      const fA = fins[i * nR + j], fB = fins[(i + 1) * nR + j], fC = fins[(i + 1) * nR + j + 1], fD = fins[i * nR + j + 1];
      this_tri(parts, a, b, c, na, nb, nc, fA, fB, fC);
      this_tri(parts, a, c, d, na, nc, nd, fA, fC, fD);
      void f;
    }
  }
  // transom: fan from the top centre over the stern station's outline
  const top = [P[(nR - 1) * 3], P[(nR - 1) * 3 + 1], 0];
  const rk = Math.atan2(h.transomRake, sheerY(h, 0) - keelY(h, 0));
  const tn = [-Math.cos(rk), Math.sin(rk), 0];
  for (const side of [1, -1]) for (let j = 0; j < nR - 1; j++) {
    get(0, j, side, a, na); get(0, j + 1, side, b, nb);
    const fA = fins[j], fB = fins[j + 1];
    this_tri(parts, top, a, b, tn, tn, tn, fins[nR - 1], fA, fB);
  }
}

/** A triangle whose three vertices carry their own finishes (colour edges interpolate across the strip). */
function this_tri(parts: Parts, a: number[], b: number[], c: number[], na: number[], nb: number[], nc: number[], fa: Finish, fb: Finish, fc: Finish): void {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const gx = uy * vz - uz * vy, gy = uz * vx - ux * vz, gz = ux * vy - uy * vx;
  if (gx * gx + gy * gy + gz * gz < 1e-14) return;
  const dd = gx * (na[0] + nb[0] + nc[0]) + gy * (na[1] + nb[1] + nc[1]) + gz * (na[2] + nb[2] + nc[2]);
  parts.vertex(a[0], a[1], a[2], na[0], na[1], na[2], fa);
  if (dd >= 0) { parts.vertex(b[0], b[1], b[2], nb[0], nb[1], nb[2], fb); parts.vertex(c[0], c[1], c[2], nc[0], nc[1], nc[2], fc); }
  else { parts.vertex(c[0], c[1], c[2], nc[0], nc[1], nc[2], fc); parts.vertex(b[0], b[1], b[2], nb[0], nb[1], nb[2], fb); }
}

/** Station and row sets per LOD for a hull with the given paint heights. */
function hullRows(h: HullForm, paint: HullPaint, lod: number): { stations: number[]; rows: Row[] } {
  const v = h.form === 'v';
  if (lod >= 3) {
    return { stations: [0, 0.3, 0.62, 0.86, 1], rows: [{ v: 0, eps: 0 }, { y: 0, eps: 0.001 }, { v: 1, eps: 0 }] };
  }
  if (lod === 2) {
    const rows: Row[] = [{ v: 0, eps: 0 }];
    if (v) rows.push({ v: 0.42, eps: -0.001, crease: true }, { v: 0.42, eps: 0.001, crease: true });
    else rows.push({ v: 0.3, eps: 0 });
    rows.push({ y: 0, eps: -0.001 }, { y: 0, eps: 0.001 }, { v: 1, eps: 0 });
    return { stations: [0, 0.2, 0.42, 0.62, 0.78, 0.9, 1], rows };
  }
  const rows: Row[] = [{ v: 0, eps: 0 }];
  if (v) rows.push({ v: 0.2, eps: 0 }, { v: 0.42, eps: -0.001, crease: true }, { v: 0.42, eps: 0.001, crease: true });
  else rows.push({ v: 0.18, eps: 0 }, { v: 0.36, eps: 0 }, { v: 0.52, eps: 0 });
  rows.push({ y: 0, eps: -0.001 }, { y: 0, eps: 0.001 }, { y: paint.bootTop, eps: -0.001 }, { y: paint.bootTop, eps: 0.001 });
  if (lod === 0) rows.push({ v: 0.78, eps: 0 });
  if (paint.accentY) {
    // the accent stripe follows the sheer: rows at fixed v near the sheer approximate it
    const ys = sheerY(h, 0.5);
    const va = vAtHeight(h, 0.5, ys + paint.accentY[0]), vb = vAtHeight(h, 0.5, ys + paint.accentY[1]);
    rows.push({ v: va, eps: -0.001 }, { v: va, eps: 0.001 }, { v: vb, eps: -0.001 }, { v: vb, eps: 0.001 });
  }
  rows.push({ v: 1, eps: 0 });
  // rows must be ordered by v; fixed-height rows are resolved per station, so sort by their mid-hull v
  const key = (r: Row) => (r.v !== undefined ? r.v : vAtHeight(h, 0.5, r.y!)) + r.eps * 0.01;
  rows.sort((p, q) => key(p) - key(q));
  const stations = lod === 0 ? [0, 0.05, 0.14, 0.26, 0.4, 0.54, 0.66, 0.76, 0.85, 0.92, 0.97, 1] : [0, 0.08, 0.24, 0.42, 0.6, 0.75, 0.87, 0.95, 1];
  return { stations, rows };
}

// ------------------------------------------------------------------ deck helpers

/** Flat deck strip between the sheer lines from station ta to tb at `drop` below the sheer, with a small crown. */
function deckStrip(parts: Parts, h: HullForm, ta: number, tb: number, drop: number, f: Finish, inset = 0.02, n = 6, crown = 0.03): void {
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= n; i++) pts.push(sheerPoint(h, lerp(ta, tb, i / n)));
  for (let i = 0; i < n; i++) {
    const [x0, y0, z0] = pts[i], [x1, y1, z1] = pts[i + 1];
    const a = [x0, y0 - drop, Math.max(z0 - inset, 0)], b = [x1, y1 - drop, Math.max(z1 - inset, 0)];
    const c = [x1, y1 - drop + crown, 0], d = [x0, y0 - drop + crown, 0];
    parts.quad(a, b, c, d, f);
    parts.quad([a[0], a[1], -a[2]], [d[0], d[1], d[2]], [c[0], c[1], c[2]], [b[0], b[1], -b[2]], f);
  }
}

/** Open cockpit between ta and tb: liner walls set in from the hull, a floor `depth` under the sheer, the two
 *  bulkheads and a gunwale cap along the sheer. */
function cockpit(parts: Parts, h: HullForm, ta: number, tb: number, depth: number, floorF: Finish, wallF: Finish, capF: Finish, n = 5, inset = 0.14): void {
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= n; i++) pts.push(sheerPoint(h, lerp(ta, tb, i / n)));
  const yFloor = Math.min(...pts.map((p) => p[1])) - depth;
  for (let i = 0; i < n; i++) {
    const [x0, y0, z0] = pts[i], [x1, y1, z1] = pts[i + 1];
    for (const s of [1, -1]) {
      // wall from the cap edge down to the floor edge (leaning in a little)
      const a = [x0, y0 - 0.02, s * (z0 - inset)], b = [x1, y1 - 0.02, s * (z1 - inset)];
      const c = [x1, yFloor, s * (z1 - inset - 0.18)], d = [x0, yFloor, s * (z0 - inset - 0.18)];
      if (s > 0) parts.quad(a, d, c, b, wallF); else parts.quad(a, b, c, d, wallF);
      // gunwale cap
      const e = [x0, y0, s * z0], g = [x1, y1, s * z1];
      if (s > 0) parts.quad(e, g, b, a, capF); else parts.quad(e, a, b, g, capF);
    }
    // floor
    parts.quad([x0, yFloor, z0 - inset - 0.18], [x0, yFloor, -(z0 - inset - 0.18)], [x1, yFloor, -(z1 - inset - 0.18)], [x1, yFloor, z1 - inset - 0.18], floorF);
  }
  // bulkheads
  const [xa, ya, za] = pts[0], [xb, yb, zb] = pts[n];
  parts.quad([xa, ya - 0.02, za - inset], [xa, ya - 0.02, -(za - inset)], [xa, yFloor, -(za - inset - 0.18)], [xa, yFloor, za - inset - 0.18], wallF);
  parts.quad([xb, yb - 0.02, -(zb - inset)], [xb, yb - 0.02, zb - inset], [xb, yFloor, zb - inset - 0.18], [xb, yFloor, -(zb - inset - 0.18)], wallF);
}

/** Rub rail along the sheer (both sides). */
function rubRail(parts: Parts, h: HullForm, f: Finish, n = 8, drop = 0.06, height = 0.07, stand = 0.03): void {
  for (let i = 0; i < n; i++) {
    const [x0, y0, z0] = sheerPoint(h, i / n), [x1, y1, z1] = sheerPoint(h, (i + 1) / n);
    for (const s of [1, -1]) {
      const a = [x0, y0 - drop, s * (z0 + stand)], b = [x1, y1 - drop, s * (z1 + stand)], c = [x1, y1 - drop - height, s * (z1 + stand)], d = [x0, y0 - drop - height, s * (z0 + stand)];
      if (s > 0) parts.quad(a, b, c, d, f); else parts.quad(a, d, c, b, f);
    }
  }
}

/** Stanchions with lifelines (two wires) along the side decks from ta to tb, both sides. */
function lifelines(parts: Parts, h: HullForm, ta: number, tb: number, height: number, inset: number, pitch: number, wires: number, postF: Finish, wireF: Finish): void {
  const len = (tb - ta) * h.len;
  const n = Math.max(1, Math.round(len / pitch));
  for (const s of [1, -1]) {
    const tops: number[][][] = [];
    for (let w = 0; w < wires; w++) tops.push([]);
    for (let i = 0; i <= n; i++) {
      const [x, y, z] = sheerPoint(h, lerp(ta, tb, i / n));
      const zz = s * (z - inset);
      parts.rod(postF, 0.014, [x, y - 0.02, zz], [x, y + height, zz], 4);
      for (let w = 0; w < wires; w++) tops[w].push([x, y + height * (1 - 0.42 * w), zz]);
    }
    for (let w = 0; w < wires; w++) parts.tube(wireF, 0.011, tops[w], 3);
  }
}

/** Bow pulpit: a rail around the foredeck from station ta to the stem, both sides joined at the bow. */
function bowRail(parts: Parts, h: HullForm, ta: number, height: number, inset: number, f: Finish, r = 0.016): void {
  const pts: number[][] = [];
  const n = 4;
  for (let i = 0; i <= n; i++) { const [x, y, z] = sheerPoint(h, lerp(ta, 0.985, i / n)); pts.push([x, y + height, Math.max(z - inset, 0.02)]); }
  const mirrored = pts.slice(0, -1).reverse().map((p) => [p[0], p[1], -p[2]]);
  const rail = [...pts, ...mirrored];
  parts.tube(f, r, rail, 4);
  for (const i of [0, 2]) for (const s of [1, -1]) { const p = pts[i]; parts.rod(f, r * 0.9, [p[0], p[1] - height, s * p[2]], [p[0], p[1], s * p[2]], 4); }
}

/** Mooring cleat (a low T of chrome). */
function cleat(parts: Parts, x: number, y: number, z: number, size = 0.22, f = F.chrome): void {
  parts.box(f, size, 0.035, 0.05, x, y + 0.075, z);
  parts.box(f, size * 0.35, 0.06, 0.04, x, y + 0.03, z);
}

/** Navigation lights: red / green at the bow sides, an all-round white at the top of the given mast point. */
function navLights(parts: Parts, h: HullForm, tBow: number, drop: number, white: number[] | null): void {
  const [x, y, z] = sheerPoint(h, tBow);
  parts.box(F.navGreen, 0.08, 0.06, 0.05, x, y - drop, z * 0.92 + 0.02);
  parts.box(F.navRed, 0.08, 0.06, 0.05, x, y - drop, -(z * 0.92 + 0.02));
  if (white) parts.box(F.navWhite, 0.07, 0.09, 0.07, white[0], white[1], white[2]);
}

/** A standing (or seated) person: trousers, shirt, head. */
function person(parts: Parts, x: number, y: number, z: number, yaw: number, seated: boolean, shirt: Finish, trousers: Finish, dark: boolean): void {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const legH = seated ? 0.42 : 0.82;
  parts.box(trousers, seated ? 0.45 : 0.28, legH, 0.3, x + (seated ? c * 0.12 : 0), y + legH / 2, z + (seated ? -s * 0.12 : 0), yaw);
  parts.box(shirt, 0.28, 0.58, 0.42, x, y + legH + 0.29, z, yaw);
  parts.sphere(dark ? F.skinDark : F.skin, 0.11, x, y + legH + 0.58 + 0.13, z, 6, 4);
  parts.box(F.hair, 0.2, 0.06, 0.2, x, y + legH + 0.58 + 0.23, z, yaw);
  void c;
}

/** Outboard motor hung on the transom at (x, y = transom top, z); `tilt` (rad, negative) swings the leg up and
 *  aft about the bracket pivot, as on a moored boat. */
function outboard(parts: Parts, x: number, yTop: number, z: number, f: Finish, lod: number, scale = 1, tilt = 0): void {
  const s = scale;
  const px = x + 0.02 * s, py = yTop + 0.06 * s;
  const c = Math.cos(tilt), sn = Math.sin(tilt);
  // parts as (finish, w, h, d, centre x, centre y) relative to the pivot, rotated about it
  const part = (fin: Finish, w: number, h: number, d: number, cx: number, cy: number) => {
    const rx = cx - px, ry = cy - py;
    parts.box(fin, w, h, d, px + rx * c - ry * sn, py + rx * sn + ry * c, z, 0, 0, tilt);
  };
  part(f, 0.58 * s, 0.5 * s, 0.4 * s, x - 0.3 * s, yTop + 0.28 * s);          // cowl
  part(f, 0.5 * s, 0.14 * s, 0.34 * s, x - 0.3 * s, yTop + 0.58 * s);         // cowl top
  part(F.darkMetal, 0.22 * s, 0.9 * s, 0.2 * s, x - 0.32 * s, yTop - 0.4 * s); // midsection
  part(F.darkMetal, 0.42 * s, 0.22 * s, 0.13 * s, x - 0.3 * s, yTop - 0.95 * s); // gearcase
  part(F.darkMetal, 0.28 * s, 0.22 * s, 0.05 * s, x - 0.22 * s, yTop - 1.14 * s); // skeg
  parts.box(F.darkMetal, 0.14 * s, 0.16 * s, 0.32 * s, px, py, z); // bracket
  if (lod <= 1) {
    const rx = -0.55 * s, ry = -1.01 * s;
    parts.cyl(F.chrome, 0.16 * s, 0.16 * s, 0.04 * s, px + rx * c - ry * sn, py + rx * sn + ry * c, z, 6, 0, 0, Math.PI / 2 + tilt);
  }
}

/** Small inflatable tender (RIB) centred at (x, y, z) pointing +x. */
function dinghy(parts: Parts, x: number, y: number, z: number, len: number, f: Finish): void {
  const w = len * 0.42;
  parts.cyl(f, 0.2, 0.2, len * 0.8, x - len * 0.05, y, z + w * 0.5, 6, 0, 0, Math.PI / 2);
  parts.cyl(f, 0.2, 0.2, len * 0.8, x - len * 0.05, y, z - w * 0.5, 6, 0, 0, Math.PI / 2);
  parts.cyl(f, 0.2, 0.2, w, x + len * 0.36, y, z, 6, Math.PI / 2, 0, 0);
  parts.box(F.upholGrey, len * 0.8, 0.12, w, x - len * 0.05, y - 0.08, z);
  parts.box(F.darkMetal, 0.1, 0.5, 0.2, x - len * 0.48, y + 0.05, z); // little outboard
}

/** The 3 x 5 glyphs of the registration font. */
const GLYPHS: Record<string, string[]> = {
  '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'], '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '###', '..#', '###'], '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'], '7': ['###', '..#', '.#.', '.#.', '.#.'], '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'], F: ['###', '#..', '###', '#..', '#..'], L: ['#..', '#..', '#..', '#..', '###'],
  N: ['#.#', '###', '###', '#.#', '#.#'], K: ['#.#', '#.#', '##.', '#.#', '#.#'], D: ['##.', '#.#', '#.#', '#.#', '##.'],
  A: ['.#.', '#.#', '###', '#.#', '#.#'], C: ['###', '#..', '#..', '#..', '###'], Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  B: ['##.', '#.#', '##.', '#.#', '##.'], R: ['##.', '#.#', '##.', '#.#', '#.#'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
  S: ['###', '#..', '###', '..#', '###'], M: ['#.#', '###', '#.#', '#.#', '#.#'], G: ['###', '#..', '#.#', '#.#', '###'],
  ' ': ['...', '...', '...', '...', '...'],
};

/** Registration string as block glyphs on the hull side at station t, height y (both sides read forward). */
function registration(parts: Parts, h: HullForm, text: string, t: number, y: number, cell: number, f: Finish): void {
  const charW = cell * 4;
  const total = text.length * charW;
  for (const s of [1, -1]) {
    for (let ci = 0; ci < text.length; ci++) {
      const g = GLYPHS[text[ci]] ?? GLYPHS[' '];
      // the string reads bow-first on both sides: forward is +x on starboard, so mirror the order on port
      const off = s > 0 ? -total / 2 + ci * charW : total / 2 - (ci + 1) * charW;
      for (let row = 0; row < 5; row++) {
        let col = 0;
        while (col < 3) {
          if (g[row][col] !== '#') { col++; continue; }
          let end = col;
          while (end < 3 && g[row][end] === '#') end++;
          const yTop = y + (2.5 - row) * cell, yBot = yTop - cell;
          const c0 = s > 0 ? col : 3 - end, c1 = s > 0 ? end : 3 - col;
          const x0 = off + c0 * cell, x1 = off + c1 * cell;
          const tx0 = tOfX(h, x0 + t * h.len - h.len / 2), tx1 = tOfX(h, x1 + t * h.len - h.len / 2);
          const p00 = hullAt(h, tx0, yBot), p10 = hullAt(h, tx1, yBot), p11 = hullAt(h, tx1, yTop), p01 = hullAt(h, tx0, yTop);
          const o = 0.02;
          const a = [p00[0], p00[1], s * (p00[2] + o)], b = [p10[0], p10[1], s * (p10[2] + o)], c = [p11[0], p11[1], s * (p11[2] + o)], d = [p01[0], p01[1], s * (p01[2] + o)];
          if (s > 0) parts.quad(a, b, c, d, f); else parts.quad(a, d, c, b, f);
          col = end;
        }
      }
    }
  }
}

/** Sail with camber between a luff (two points) and a clew, `slices` horizontal strips, bellying to +z (leeward) by `camber`. */
function sail(parts: Parts, luffBottom: number[], luffTop: number[], clew: number[], camber: number, slices: number, roach: number, f: Finish): void {
  const n = 4;
  const rowPts = (u: number): number[][] => {
    const lx = lerp(luffBottom[0], luffTop[0], u), ly = lerp(luffBottom[1], luffTop[1], u), lz = lerp(luffBottom[2], luffTop[2], u);
    // leech from the clew to the head, bowed out by the roach
    const ex = lerp(clew[0], luffTop[0], u) + (clew[0] - luffBottom[0]) * roach * Math.sin(u * Math.PI), ey = lerp(clew[1], luffTop[1], u), ez = lerp(clew[2], luffTop[2], u);
    const pts: number[][] = [];
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      const chord = Math.hypot(ex - lx, ey - ly);
      pts.push([lerp(lx, ex, s), lerp(ly, ey, s), lerp(lz, ez, s) + camber * chord * Math.sin(s * Math.PI) * Math.sqrt(1 - u * 0.9)]);
    }
    return pts;
  };
  let prev = rowPts(0);
  for (let j = 1; j <= slices; j++) {
    const cur = rowPts(j / slices);
    for (let i = 0; i < n; i++) {
      // triangles with smooth-ish normals from the quad
      parts.quad(prev[i], prev[i + 1], cur[i + 1], cur[i], f);
    }
    prev = cur;
  }
}

// ------------------------------------------------------------------ variants

/** Everything random about one boat, drawn once so all its LODs agree. */
export interface BoatVariant {
  kind: HullKind; moored: boolean; hull: HullForm; paint: HullPaint;
  canvas: Finish; uphol: Finish; deck: Finish; engine: Finish; fender: Finish;
  hardtop: boolean; bimini: boolean; radar: boolean; outboards: number; outboardSize: number; cover: boolean; fenders: number;
  crew: number; crewShirts: Finish[]; crewTrousers: Finish[]; crewDark: boolean[];
  dinghyMode: 'none' | 'tow' | 'davit'; sailsUp: boolean; keelDepth: number; dodger: boolean; wheel: boolean; reg: string;
  lightsOn: boolean; containers: number[]; stacks: number[]; twinScrew: boolean; tanks: boolean; bimTall: boolean;
  /** outboard legs tilted up out of the water (moored) */
  outboardUp: boolean;
  seedJitter: number[];
}

const HULL_TINTS = [0xf4f4f0, 0xf4f4f0, 0xf4f4f0, 0xece6d4, 0x16284a, 0x5a6168, 0x9a2f2a, 0x9cc2d8, 0x1c1e22, 0x2f5a3c, 0xd9b13a];
const ACCENTS = [0x16284a, 0x9a2f2a, 0xc79a3a, 0x151719, 0x2a7f8a, 0x5a6168];
const ANTIFOULING = [0x1a2440, 0x15171a, 0x5c1f1c, 0x1a2440];
const CANVAS = [0x2a4a78, 0x1c1e22, 0xb9a37d, 0x6b2a30, 0x5a6168, 0xf0efe8];
const ENGINES = [0x8a8f96, 0x1a1c1f, 0xdcdedf, 0xf2f2f2];
const REG_LETTERS = 'FLNKDACYBRTSMG';

export function hullTintColor(rng: Rng, avoid: THREE.Color | null): THREE.Color {
  for (let i = 0; i < 6; i++) {
    const c = C(rng.pick(HULL_TINTS));
    if (!avoid || Math.abs(c.r - avoid.r) + Math.abs(c.g - avoid.g) + Math.abs(c.b - avoid.b) > 0.05) return c;
  }
  return C(0xf4f4f0);
}

function hullFormOf(kind: HullKind, len: number, rng: Rng): HullForm {
  const d2r = Math.PI / 180;
  switch (kind) {
    case 'speed': return { len, beam: len * rng.range(0.31, 0.35), draft: 0.42 + len * 0.012, freeboard: 0.6 + len * 0.02, sheerBow: rng.range(0.3, 0.42), sheerStern: 0, bowRake: len * 0.05, transomRake: 0.14, form: 'v', deadriseAft: 20 * d2r, deadriseFwd: 48 * d2r, chineFlare: 0.1, bowFlare: 0.32, transomBeam: 0.84, maxBeamAt: 0.62, fullTo: 0.62, entry: 1.7, forefootUp: 0.45, bilge: 0, bulb: 0, rocker: 0 };
    case 'console': return { len, beam: len * rng.range(0.32, 0.36), draft: 0.4 + len * 0.012, freeboard: 0.7 + len * 0.028, sheerBow: rng.range(0.18, 0.28), sheerStern: 0.02, bowRake: len * 0.04, transomRake: 0.06, form: 'v', deadriseAft: 18 * d2r, deadriseFwd: 46 * d2r, chineFlare: 0.12, bowFlare: 0.36, transomBeam: 0.9, maxBeamAt: 0.6, fullTo: 0.62, entry: 1.75, forefootUp: 0.42, bilge: 0, bulb: 0, rocker: 0 };
    case 'yacht': return { len, beam: len * rng.range(0.25, 0.28), draft: len * 0.05, freeboard: len * rng.range(0.08, 0.09), sheerBow: rng.range(0.25, 0.35), sheerStern: 0, bowRake: len * 0.05, transomRake: len * 0.06, form: 'v', deadriseAft: 14 * d2r, deadriseFwd: 42 * d2r, chineFlare: 0.06, bowFlare: 0.26, transomBeam: 0.82, maxBeamAt: 0.6, fullTo: 0.64, entry: 1.9, forefootUp: 0.4, bilge: 0, bulb: 0, rocker: 0 };
    case 'sail': return { len, beam: len * rng.range(0.3, 0.33), draft: len * 0.045, freeboard: len * rng.range(0.082, 0.092), sheerBow: rng.range(0.18, 0.26), sheerStern: 0.06, bowRake: len * 0.035, transomRake: -len * 0.02, form: 'round', deadriseAft: 0, deadriseFwd: 0, chineFlare: 0, bowFlare: 0, transomBeam: rng.range(0.6, 0.72), maxBeamAt: 0.58, fullTo: 0.6, entry: 1.5, forefootUp: 0.5, bilge: 0, bulb: 0, rocker: 0.55 };
    case 'ferry': return { len, beam: 12, draft: 2.2, freeboard: 2.5, sheerBow: 0.35, sheerStern: 0.05, bowRake: 2.6, transomRake: 0.4, form: 'ship', deadriseAft: 0, deadriseFwd: 0, chineFlare: 0, bowFlare: 0, transomBeam: 0.86, maxBeamAt: 0.3, fullTo: 0.6, entry: 2.0, forefootUp: 0.72, bilge: 0.35, bulb: 0, rocker: 0 };
    case 'cargo': return { len, beam: len * 0.16, draft: len * 0.046, freeboard: len * 0.058, sheerBow: 0.14, sheerStern: 0.02, bowRake: len * 0.035, transomRake: len * 0.01, form: 'ship', deadriseAft: 0, deadriseFwd: 0, chineFlare: 0, bowFlare: 0, transomBeam: 0.8, maxBeamAt: 0.2, fullTo: 0.74, entry: 2.4, forefootUp: 0.82, bilge: 0.3, bulb: len * 0.024, rocker: 0 };
    case 'cruise': return { len, beam: 36, draft: 8.2, freeboard: 11.5, sheerBow: 0.14, sheerStern: 0.03, bowRake: 15, transomRake: 3, form: 'ship', deadriseAft: 0, deadriseFwd: 0, chineFlare: 0, bowFlare: 0, transomBeam: 0.7, maxBeamAt: 0.25, fullTo: 0.72, entry: 2.2, forefootUp: 0.8, bilge: 0.35, bulb: 4.5, rocker: 0 };
  }
}

/** Draw a variant of `kind`. `moored` boats carry fenders, covers and no crew; the boats under way carry crew.
 *  `maxDraft` caps the hull draft (a berth in shallower water than the class would normally draw). */
export function drawVariant(kind: HullKind, rng: Rng, moored: boolean, maxDraft = Infinity): BoatVariant {
  const len = kind === 'speed' ? rng.range(6.6, 9.4) : kind === 'console' ? rng.range(6.2, 8.6) : kind === 'yacht' ? rng.range(18, 32) : kind === 'sail' ? rng.range(8.5, 14.5) : kind === 'ferry' ? 42 : kind === 'cargo' ? rng.range(120, 180) : 290;
  const hull = hullFormOf(kind, len, rng);
  if (hull.draft > maxDraft) { hull.draft = Math.max(maxDraft, 0.3); if (hull.bulb > 0) hull.bulb = Math.min(hull.bulb, hull.draft * 0.45); }
  const ship = kind === 'ferry' || kind === 'cargo' || kind === 'cruise';
  const accentOn = !ship && rng.chance(kind === 'yacht' ? 0.85 : 0.55);
  const paint: HullPaint = {
    anti: C(kind === 'cruise' ? 0x9a2f2a : rng.pick(ANTIFOULING)),
    boot: C(kind === 'cargo' ? 0x9a2f2a : rng.chance(0.5) ? 0x16284a : 0x151719),
    accent: accentOn ? C(rng.pick(ACCENTS)) : null,
    bootTop: ship ? hull.freeboard * 0.22 : clamp(len * 0.014, 0.08, 0.22),
    accentY: accentOn ? [-clamp(len * 0.018, 0.12, 0.35), -clamp(len * 0.008, 0.05, 0.16)] : null,
    ship,
  };
  const crewN = moored ? 0 : kind === 'speed' ? rng.int(1, 3) : kind === 'console' ? rng.int(1, 2) : kind === 'sail' ? rng.int(2, 3) : kind === 'yacht' ? rng.int(1, 2) : 0;
  const crewShirts: Finish[] = [], crewTrousers: Finish[] = [], crewDark: boolean[] = [];
  for (let i = 0; i < 4; i++) { crewShirts.push(rng.pick(SHIRTS)); crewTrousers.push(rng.pick(TROUSERS)); crewDark.push(rng.chance(0.35)); }
  const containers: number[] = [], stacks: number[] = [];
  for (let i = 0; i < 400; i++) { containers.push(rng.int(0, CONTAINERS.length - 1)); stacks.push(rng.int(0, 3)); }
  const seedJitter: number[] = [];
  for (let i = 0; i < 24; i++) seedJitter.push(rng.next());
  let reg = '';
  reg = `${REG_LETTERS[rng.int(0, 1)]}${REG_LETTERS[rng.int(0, REG_LETTERS.length - 1)]} ${rng.int(1000, 9999)} ${REG_LETTERS[rng.int(0, REG_LETTERS.length - 1)]}${REG_LETTERS[rng.int(0, REG_LETTERS.length - 1)]}`;
  const canvasHex = rng.pick(CANVAS);
  return {
    kind, moored, hull, paint,
    canvas: fin(canvasHex, 0.9), uphol: rng.pick([F.upholWhite, F.upholWhite, F.upholGrey, F.upholNavy]),
    deck: kind === 'sail' ? (rng.chance(0.5) ? F.teak : F.deckSkid) : kind === 'yacht' ? (rng.chance(0.6) ? F.teak : F.deckSkid) : ship ? (kind === 'cargo' ? F.deckGreen : F.deckGrey) : F.deckSkid,
    engine: fin(rng.pick(ENGINES), 0.35, 0.1), fender: rng.chance(0.7) ? F.fenderWhite : F.fenderBlue,
    hardtop: kind === 'console' ? rng.chance(0.75) : kind === 'yacht' ? rng.chance(0.8) : false,
    bimini: kind === 'speed' ? rng.chance(0.4) : false,
    radar: rng.chance(kind === 'yacht' ? 0.9 : 0.35),
    outboards: kind === 'console' ? (len > 7.4 ? 2 : 1) : kind === 'speed' ? (rng.chance(0.55) ? 1 : 0) : 0,
    outboardSize: kind === 'console' ? clamp(len / 7.5, 0.85, 1.15) : 0.95,
    cover: moored && (kind === 'speed' || kind === 'console') && rng.chance(0.45),
    fenders: moored ? rng.int(2, 4) : 0,
    crew: crewN, crewShirts, crewTrousers, crewDark,
    dinghyMode: kind === 'sail' ? (moored ? (rng.chance(0.4) ? 'davit' : 'none') : (rng.chance(0.5) ? 'tow' : 'none')) : kind === 'yacht' ? 'davit' : 'none',
    sailsUp: kind === 'sail' && !moored && rng.chance(0.8),
    keelDepth: kind === 'sail' ? rng.pick([1.2, 1.55, 1.9]) : 0,
    dodger: kind === 'sail' && rng.chance(0.65), wheel: kind === 'sail' && len > 10.5,
    reg, lightsOn: moored ? rng.chance(0.2) : rng.chance(0.75),
    containers, stacks, twinScrew: rng.chance(0.5), tanks: rng.chance(0.5), bimTall: rng.chance(0.5),
    outboardUp: moored && rng.chance(0.7),
    seedJitter,
  };
}

// ------------------------------------------------------------------ kind builders

export interface BoatSpec {
  kind: HullKind;
  /** overall length (m, stem to transom) and waterline length */
  len: number; lwl: number; beam: number;
  /** deepest point below the waterline (keel, propeller) */
  draft: number;
  /** hull sample points for the buoyancy solver, local (x, z) */
  samples: [number, number][];
  /** the hull planes at speed */
  planing: boolean;
  /** height of the mast head / highest structure above the waterline */
  height: number;
  wakeWidth: number;
}

function specOf(v: BoatVariant): BoatSpec {
  const h = v.hull;
  const planing = v.kind === 'speed' || v.kind === 'console';
  const lx = h.len * (h.form === 'ship' ? 0.36 : 0.34), lz = h.beam * 0.42;
  const legDown = (v.kind === 'speed' || v.kind === 'console') && !(v.outboards > 0 && v.outboardUp);
  const draft = v.kind === 'sail' ? h.draft + v.keelDepth : v.kind === 'speed' || v.kind === 'console' ? h.draft + (legDown ? 0.55 : 0.08) : h.draft + (h.form === 'ship' ? 0.3 : 0.4);
  const height = v.kind === 'sail' ? h.len * 1.3 + h.freeboard : v.kind === 'cruise' ? 62 : v.kind === 'cargo' ? h.len * 0.2 : v.kind === 'ferry' ? 14 : v.kind === 'yacht' ? h.len * 0.3 : 2.6;
  return { kind: v.kind, len: h.len + h.bowRake, lwl: h.len, beam: h.beam, draft, samples: [[lx, 0], [-lx, 0], [0, lz], [0, -lz], [0, 0]], planing, height, wakeWidth: h.beam * (v.kind === 'sail' ? 0.9 : 1.4) };
}

function jit(v: BoatVariant, i: number, a: number, b: number): number { return lerp(a, b, v.seedJitter[i % v.seedJitter.length]); }

function buildSpeed(p: Parts, v: BoatVariant): void {
  const h = v.hull, lod = p.lod, L = h.len;
  const glass = v.lightsOn ? F.glassGlow : F.glass;
  if (lod <= 1) rubRail(p, h, F.rubber, lod === 0 ? 10 : 6);
  const tCock0 = 0.1, tCock1 = 0.64;
  const [xw, yw, zw] = sheerPoint(h, tCock1);
  if (lod <= 2) {
    // foredeck, cockpit liner and floor, aft sunpad over the engine box
    deckStrip(p, h, tCock1, 0.995, 0.03, v.deck, 0.02, lod === 0 ? 5 : 3);
    if (v.cover) {
      // mooring cover stretched from the windshield to the transom
      deckStrip(p, h, tCock0, tCock1, -0.02, v.canvas, 0.0, 3, 0.25);
      deckStrip(p, h, 0.0, tCock0, 0.03, v.deck, 0.02, 1);
    } else {
      cockpit(p, h, tCock0, tCock1, 0.62, v.uphol === F.upholNavy ? F.teakGrey : F.teak, F.gelWhite, v.deck, lod === 0 ? 5 : 3);
      deckStrip(p, h, 0.0, tCock0, 0.03, v.deck, 0.02, 1);
      const yFloor = yw - 0.62;
      // helm and companion seats, aft bench, dash
      const seatW = h.beam * 0.26;
      for (const s of [1, -1]) {
        p.box(v.uphol, 0.5, 0.42, seatW, xw - L * 0.16, yFloor + 0.28, s * h.beam * 0.22);
        p.box(v.uphol, 0.12, 0.5, seatW, xw - L * 0.16 - 0.28, yFloor + 0.7, s * h.beam * 0.22);
      }
      const [xa, ya, za] = sheerPoint(h, tCock0 + 0.06);
      p.box(v.uphol, 0.5, 0.36, za * 1.5, xa + 0.3, yFloor + 0.24, 0);
      p.box(v.uphol, 0.12, 0.5, za * 1.5, xa + 0.05, yFloor + 0.62, 0);
      p.box(F.gelWhite, 0.55, 0.32, zw * 1.6, xw - 0.32, yw - 0.12, 0); // dash
      void ya;
      if (lod === 0) {
        p.cyl(F.darkMetal, 0.17, 0.17, 0.03, xw - 0.5, yw + 0.14, -h.beam * 0.22, 8, 1.1); // wheel
        for (let i = 0; i < v.crew; i++) {
          const seated = i > 0 || v.crew > 2;
          const cx = i === 0 ? xw - L * 0.16 : i === 1 ? xw - L * 0.16 : xa + 0.3;
          const cz = i === 0 ? -h.beam * 0.22 : i === 1 ? h.beam * 0.22 : (v.seedJitter[3] - 0.5) * za;
          person(p, cx, yFloor + (seated ? 0.42 : 0), cz, 0, seated || i < 2, v.crewShirts[i], v.crewTrousers[i], v.crewDark[i]);
        }
      }
    }
  }
  // windshield: centre pane and two swept side panes, chrome frame
  const wsH = 0.5, rake = 0.45;
  const zc = zw * 0.7;
  const c0 = [xw + 0.1, yw, zc], c1 = [xw + 0.1, yw, -zc], c2 = [xw + 0.1 - rake * wsH, yw + wsH, -zc], c3 = [xw + 0.1 - rake * wsH, yw + wsH, zc];
  p.quad(c0, c1, c2, c3, glass);
  for (const s of [1, -1]) {
    const a = [xw + 0.1, yw, s * zc], b = [xw - 0.55, yw - 0.02, s * (zw - 0.06)], c = [xw - 0.55 - rake * wsH * 0.6, yw + wsH - 0.03, s * (zw - 0.06)], d = [xw + 0.1 - rake * wsH, yw + wsH, s * zc];
    if (s > 0) p.quad(a, b, c, d, glass); else p.quad(a, d, c, b, glass);
    if (lod <= 1) p.tube(F.chrome, 0.018, [b, c, d, [xw + 0.1 - rake * wsH, yw + wsH, 0]], 4);
  }
  if (lod <= 1) p.tube(F.chrome, 0.018, [[xw + 0.1, yw + 0.01, -zc], [xw + 0.1 - rake * wsH, yw + wsH, -zc], [xw + 0.1 - rake * wsH, yw + wsH, zc], [xw + 0.1, yw + 0.01, zc]], 4);
  // bimini over the cockpit (movers with the top up)
  if (v.bimini && lod <= 2 && !v.cover) {
    const bx = xw - L * 0.2, by = yw + 1.5, bl = L * 0.3;
    p.box(v.canvas, bl, 0.05, h.beam * 0.86, bx, by, 0);
    if (lod <= 1) for (const s of [1, -1]) {
      const [x0, y0, z0] = sheerPoint(h, tCock0 + 0.1);
      p.tube(F.alu, 0.016, [[x0, y0, s * (z0 - 0.1)], [bx - bl / 2 + 0.1, by - 0.03, s * (h.beam * 0.42)], [bx + bl / 2 - 0.1, by - 0.03, s * (h.beam * 0.42)], [xw - 0.7, yw + 0.15, s * (zw - 0.12)]], 4);
    }
  }
  // stern: sterndrive or outboard, swim platform with a ladder, cleats
  const [xt, yt, zt] = sheerPoint(h, 0);
  const xTransom = xt + h.transomRake;
  if (v.outboards > 0) outboard(p, xTransom, yt - 0.1, 0, v.engine, lod, 0.95, v.outboardUp ? -0.95 : 0);
  else if (lod <= 2) {
    p.box(F.darkMetal, 0.5, 0.42, 0.34, xTransom - 0.25, -0.1, 0); // sterndrive
    p.box(F.darkMetal, 0.3, 0.3, 0.1, xTransom - 0.55, -0.42, 0);
  }
  if (lod <= 2) {
    const pw = v.outboards > 0 ? zt * 0.62 : zt * 1.7;
    for (const s of v.outboards > 0 ? [1, -1] : [0]) p.box(F.teak, 0.7, 0.06, pw, xTransom - 0.35, yt - 0.35, s * zt * 0.6 * (v.outboards > 0 ? 1 : 0));
    if (lod <= 1) p.tube(F.chrome, 0.014, [[xTransom - 0.6, yt - 0.34, zt * 0.3], [xTransom - 0.6, yt - 0.9, zt * 0.3], [xTransom - 0.6, yt - 0.9, zt * 0.3 + 0.3], [xTransom - 0.6, yt - 0.34, zt * 0.3 + 0.3]], 4);
  }
  if (lod <= 1) {
    for (const s of [1, -1]) { cleat(p, xt - 0.4, yt - 0.02, s * (zt - 0.25)); const [xb, yb, zb] = sheerPoint(h, 0.86); cleat(p, xb, yb - 0.02, s * (zb - 0.2)); }
    bowRail(p, h, 0.7, 0.32, 0.12, F.chrome);
    navLights(p, h, 0.9, 0.1, [xt - 0.6, yt + 0.95, 0]);
    p.rod(F.chrome, 0.012, [xt - 0.6, yt - 0.02, 0], [xt - 0.6, yt + 0.92, 0], 4); // stern light pole
    p.rod(F.antennaWhite, 0.012, [xw - 0.4, yw, zw - 0.15], [xw - 0.7, yw + 1.4, zw - 0.05], 4); // VHF whip
  }
  if (lod === 0) {
    registration(p, h, v.reg, 0.78, sheerY(h, 0.78) * 0.5, 0.055, v.paint.accent && v.paint.accent.r < 0.2 ? F.regBlue : F.regBlack);
    if (v.fenders) for (let i = 0; i < v.fenders; i++) {
      const s = i % 2 === 0 ? 1 : -1;
      const t = 0.25 + (i * 0.37) % 0.55;
      const [x, y, z] = sheerPoint(h, t);
      p.cyl(v.fender, 0.11, 0.11, 0.55, x, y - 0.42, s * (z + 0.12), 6);
      p.rod(F.rope, 0.008, [x, y, s * (z - 0.05)], [x, y - 0.14, s * (z + 0.12)], 3);
    }
  }
}

function buildConsole(p: Parts, v: BoatVariant): void {
  const h = v.hull, lod = p.lod, L = h.len;
  const glass = v.lightsOn ? F.glassGlow : F.glass;
  if (lod <= 1) rubRail(p, h, F.rubber, lod === 0 ? 10 : 6);
  const t0 = 0.08, t1 = 0.86;
  const [xc, yc, zc] = sheerPoint(h, 0.5);
  const yFloor = Math.min(sheerY(h, t0), sheerY(h, 0.5)) - 0.68;
  const cw = h.beam * 0.36, cd = 0.95, ch = 1.0;
  void yc;
  if (lod <= 2) {
    if (v.cover) {
      deckStrip(p, h, t0, t1, -0.02, v.canvas, 0, 4, 0.3);
    } else {
      cockpit(p, h, t0, t1, 0.68, F.deckSkid, F.gelWhite, v.deck, lod === 0 ? 6 : 3);
      // raised casting deck forward, aft coolers / livewell
      const [xf, yf, zf] = sheerPoint(h, 0.8);
      p.box(F.deckSkid, L * 0.14, 0.02, zf * 1.5, xf + L * 0.03, yFloor + 0.35, 0);
      p.box(F.gelWhite, L * 0.14, 0.34, zf * 1.5, xf + L * 0.03, yFloor + 0.17, 0);
      const [xa, ya, za] = sheerPoint(h, t0 + 0.02);
      p.box(F.gelWhite, 0.55, 0.5, za * 1.5, xa + 0.35, yFloor + 0.25, 0);
      void ya; void yf;
    }
    deckStrip(p, h, t1, 0.995, 0.03, v.deck, 0.02, 3);
    deckStrip(p, h, 0, t0, 0.03, v.deck, 0.02, 1);
    // the console with its dash and small windshield, leaning post behind
    p.box(F.gelWhite, cd, ch, cw, xc - 0.1, yFloor + ch / 2, 0);
    p.box(F.gelWhite, 0.4, 0.25, cw, xc - 0.1 + cd / 2 - 0.2, yFloor + ch + 0.12, 0, 0, 0, -0.5);
    p.quad([xc + cd / 2 - 0.35, yFloor + ch + 0.22, cw * 0.5], [xc + cd / 2 - 0.35, yFloor + ch + 0.22, -cw * 0.5], [xc + cd / 2 - 0.6, yFloor + ch + 0.62, -cw * 0.5], [xc + cd / 2 - 0.6, yFloor + ch + 0.62, cw * 0.5], glass);
    if (!v.cover) {
      p.box(v.uphol, 0.45, 0.16, cw * 0.9, xc - cd / 2 - 0.5, yFloor + 0.86, 0);
      p.box(v.uphol, 0.1, 0.5, cw * 0.9, xc - cd / 2 - 0.75, yFloor + 1.2, 0);
      if (lod <= 1) for (const s of [1, -1]) p.rod(F.alu, 0.02, [xc - cd / 2 - 0.5, yFloor, s * cw * 0.35], [xc - cd / 2 - 0.5, yFloor + 0.8, s * cw * 0.35], 4);
    }
  }
  // T-top: four legs, hardtop or canvas, rocket launchers, antenna, radar
  if (v.hardtop && lod <= 2) {
    const ty = yFloor + 2.15, tl = 2.2, tw = h.beam * 0.62;
    p.box(v.canvas, tl, 0.06, tw, xc - 0.1, ty, 0);
    if (lod <= 1) {
      for (const sx of [1, -1]) for (const sz of [1, -1]) p.rod(F.alu, 0.025, [xc - 0.1 + sx * 0.4, yFloor + 0.3, sz * cw * 0.5], [xc - 0.1 + sx * tl * 0.42, ty - 0.03, sz * tw * 0.46], 5);
      p.tube(F.alu, 0.022, [[xc - 0.1 - tl * 0.42, ty - 0.03, -tw * 0.46], [xc - 0.1 - tl * 0.42, ty - 0.03, tw * 0.46]], 4);
      for (let i = 0; i < 5; i++) p.rod(F.alu, 0.02, [xc - 0.1 - tl * 0.46, ty + 0.03, (i - 2) * tw * 0.2], [xc - 0.1 - tl * 0.46 - 0.15, ty + 0.42, (i - 2) * tw * 0.2], 4);
      p.rod(F.antennaWhite, 0.012, [xc - 0.1 + tl * 0.4, ty + 0.03, tw * 0.44], [xc - 0.1 + tl * 0.4 + 0.1, ty + 2.4, tw * 0.44], 4);
      p.box(F.navWhite, 0.08, 0.1, 0.08, xc - 0.1, ty + 0.1, 0);
    }
    if (v.radar) p.cyl(F.gelWhite, 0.26, 0.24, 0.16, xc - 0.1 - 0.5, ty + 0.13, 0, 8);
  }
  // outboards on the transom
  const [xt, yt, zt] = sheerPoint(h, 0);
  const xTransom = xt + h.transomRake;
  const n = v.outboards;
  for (let i = 0; i < n; i++) outboard(p, xTransom, yt - 0.08, (i - (n - 1) / 2) * 0.75, v.engine, lod, v.outboardSize, v.outboardUp ? -0.95 : 0);
  if (lod <= 1) {
    bowRail(p, h, 0.66, 0.36, 0.12, F.chrome);
    for (const s of [1, -1]) { cleat(p, xt - 0.35, yt - 0.02, s * (zt - 0.22)); const [xb, yb, zb] = sheerPoint(h, 0.84); cleat(p, xb, yb - 0.02, s * (zb - 0.2)); }
    navLights(p, h, 0.92, 0.1, v.hardtop ? null : [xt - 0.5, yt + 1.0, 0]);
    if (!v.hardtop) p.rod(F.chrome, 0.012, [xt - 0.5, yt - 0.02, 0], [xt - 0.5, yt + 0.97, 0], 4);
  }
  if (lod === 0) {
    registration(p, h, v.reg, 0.78, sheerY(h, 0.78) * 0.5, 0.055, F.regBlack);
    if (!v.cover) for (let i = 0; i < v.crew; i++) {
      const cx = i === 0 ? xc - 0.1 - 0.95 / 2 - 0.55 : sheerPoint(h, 0.78)[0];
      const cz = i === 0 ? 0 : (v.seedJitter[5] - 0.5) * zc * 0.8;
      person(p, cx, yFloor + (i === 0 ? 0.35 : 0.37), cz, i === 0 ? 0 : v.seedJitter[6] * 6, i === 0, v.crewShirts[i], v.crewTrousers[i], v.crewDark[i]);
    }
    for (let i = 0; i < v.fenders; i++) {
      const s = i % 2 === 0 ? 1 : -1;
      const [x, y, z] = sheerPoint(h, 0.22 + (i * 0.41) % 0.6);
      p.cyl(v.fender, 0.11, 0.11, 0.55, x, y - 0.42, s * (z + 0.12), 6);
      p.rod(F.rope, 0.008, [x, y, s * (z - 0.05)], [x, y - 0.14, s * (z + 0.12)], 3);
    }
  }
}

function buildYacht(p: Parts, v: BoatVariant): void {
  const h = v.hull, lod = p.lod, L = h.len, B = h.beam;
  const glass = v.lightsOn ? F.glassFlatGlow : F.glassFlat;
  const glassDs = v.lightsOn ? F.glassGlow : F.glass;
  if (lod <= 1) rubRail(p, h, F.chrome, lod === 0 ? 10 : 6, 0.08, 0.06, 0.03);
  deckStrip(p, h, 0.0, 0.995, 0.05, v.deck, 0.04, lod === 0 ? 8 : lod === 1 ? 6 : 4);
  const ys = sheerY(h, 0.5);
  // main deck house with a raked windshield and a side window band, flybridge above it
  const hx0 = -L * 0.22, hx1 = L * 0.26, hw = B * 0.82, hh = L * 0.085;
  p.box(F.gelWhite, hx1 - hx0, hh, hw, (hx0 + hx1) / 2, ys + hh / 2, 0);
  // windshield: three raked panes wrapping the front
  const wsY0 = ys + hh * 0.45, wsY1 = ys + hh * 0.98, rk = hh * 0.55;
  p.quad([hx1 + 0.02, wsY0, hw * 0.34], [hx1 + 0.02, wsY0, -hw * 0.34], [hx1 + 0.02 - rk, wsY1, -hw * 0.34], [hx1 + 0.02 - rk, wsY1, hw * 0.34], glassDs);
  for (const s of [1, -1]) {
    const a = [hx1 + 0.02, wsY0, s * hw * 0.34], b = [hx1 - hh * 0.5, wsY0, s * (hw * 0.5 + 0.02)], c = [hx1 - hh * 0.5 - rk * 0.6, wsY1, s * (hw * 0.5 + 0.02)], d = [hx1 + 0.02 - rk, wsY1, s * hw * 0.34];
    if (s > 0) p.quad(a, b, c, d, glassDs); else p.quad(a, d, c, b, glassDs);
    // side window band
    const bx0 = hx0 + L * 0.02, bx1 = hx1 - hh * 0.6;
    const o = s * (hw / 2 + 0.015);
    if (s > 0) p.quad([bx0, wsY0, o], [bx1, wsY0, o], [bx1, wsY1 - 0.1, o], [bx0, wsY1 - 0.1, o], glass);
    else p.quad([bx0, wsY0, o], [bx0, wsY1 - 0.1, o], [bx1, wsY1 - 0.1, o], [bx1, wsY0, o], glass);
  }
  // flybridge: coaming tub, helm console, hardtop on posts, radar arch
  const fy = ys + hh, fx0 = hx0 + L * 0.06, fx1 = hx1 - hh * 0.9, fw = hw * 0.86;
  p.box(F.gelWhite, fx1 - fx0, 0.9, fw, (fx0 + fx1) / 2, fy + 0.45, 0);
  if (lod <= 1) {
    p.box(F.gelWhite, 0.9, 0.6, fw * 0.5, fx1 - 0.9, fy + 1.2, 0);
    p.box(v.uphol, 1.4, 0.4, fw * 0.6, fx0 + 1.2, fy + 1.1, 0);
    p.box(v.uphol, 0.8, 0.4, fw * 0.5, fx1 - 2.2, fy + 1.1, 0);
  }
  const arcX = (fx0 + fx1) / 2 - (fx1 - fx0) * 0.2, arcY = fy + 3.0;
  if (v.hardtop) {
    const htL = (fx1 - fx0) * 0.7;
    p.box(F.gelWhite, htL, 0.12, fw * 1.02, (fx0 + fx1) / 2 + (fx1 - fx0) * 0.08, fy + 2.85, 0);
    if (lod <= 1) for (const sx of [1, -1]) for (const sz of [1, -1]) p.rod(F.alu, 0.045, [(fx0 + fx1) / 2 + (fx1 - fx0) * 0.08 + sx * htL * 0.44, fy + 0.9, sz * fw * 0.46], [(fx0 + fx1) / 2 + (fx1 - fx0) * 0.08 + sx * htL * 0.46, fy + 2.8, sz * fw * 0.48], 5);
  }
  if (lod <= 2) {
    // radar arch
    for (const s of [1, -1]) p.box(F.gelWhite, 0.35, arcY - fy + 0.3 - (v.hardtop ? 2.9 : 0.9), 0.3, arcX, (v.hardtop ? fy + 2.9 : fy + 0.9) + (arcY + 0.3 - (v.hardtop ? fy + 2.9 : fy + 0.9)) / 2, s * fw * 0.44, 0, 0, s * -0.12);
    p.box(F.gelWhite, 0.4, 0.3, fw * 0.95, arcX, arcY + 0.45, 0);
    if (v.radar) p.cyl(F.gelWhite, 0.34, 0.3, 0.22, arcX, arcY + 0.72, 0, 8);
    if (lod <= 1) {
      p.rod(F.antennaWhite, 0.015, [arcX - 0.1, arcY + 0.6, fw * 0.3], [arcX - 0.3, arcY + 3.2, fw * 0.3], 4);
      p.rod(F.antennaWhite, 0.015, [arcX - 0.1, arcY + 0.6, -fw * 0.3], [arcX - 0.3, arcY + 2.6, -fw * 0.3], 4);
      p.box(F.navWhite, 0.1, 0.12, 0.1, arcX, arcY + 0.66 + (v.radar ? 0.25 : 0), fw * 0.1);
      p.box(F.gelWhite, 0.5, 0.35, 0.45, arcX + 0.3, arcY + 0.78, -fw * 0.2); // sat dome
    }
  }
  // aft cockpit: bench and table, transom door, swim platform with tender
  const [xt, yt, zt] = sheerPoint(h, 0);
  const xTransom = xt + h.transomRake;
  if (lod <= 1) {
    p.box(v.uphol, 0.6, 0.45, hw * 0.7, hx0 - 0.6, ys + 0.3, 0);
    p.box(F.teak, 1.0, 0.05, 0.7, hx0 - 1.7, ys + 0.7, 0);
    p.rod(F.alu, 0.04, [hx0 - 1.7, ys, 0], [hx0 - 1.7, ys + 0.68, 0], 5);
  }
  if (lod <= 2) {
    p.box(F.teak, L * 0.05, 0.08, zt * 1.85, xTransom - L * 0.025, 0.42, 0); // swim platform
    if (lod <= 1) {
      p.tube(F.chrome, 0.02, [[xTransom - L * 0.045, 0.47, zt * 0.2], [xTransom - L * 0.045, -0.6, zt * 0.2], [xTransom - L * 0.045, -0.6, zt * 0.2 + 0.35], [xTransom - L * 0.045, 0.47, zt * 0.2 + 0.35]], 4);
      if (v.dinghyMode === 'davit') {
        dinghy(p, xTransom - L * 0.02, 0.9, 0, Math.min(3.2, L * 0.13), F.fenderWhite);
      }
    }
  }
  // bow: rails, windlass, cleats, anchor pulpit, hull portholes
  if (lod <= 1) {
    lifelines(p, h, 0.28, 0.9, 0.72, 0.16, lod === 0 ? 2.2 : 4.5, lod === 0 ? 2 : 1, F.chrome, F.chrome);
    bowRail(p, h, 0.86, 0.72, 0.14, F.chrome, 0.02);
    const [xb, yb] = sheerPoint(h, 0.93);
    p.box(F.chrome, 0.5, 0.3, 0.4, xb - 0.3, yb + 0.1, 0);
    p.box(F.chrome, 1.0, 0.1, 0.3, xb + 0.5, yb - 0.02, 0);
    for (const t of [0.12, 0.5, 0.88]) for (const s of [1, -1]) { const [cx, cy, cz] = sheerPoint(h, t); cleat(p, cx, cy - 0.05, s * (cz - 0.28), 0.34); }
    navLights(p, h, 0.9, 0.35, null);
    const nP = lod === 0 ? 6 : 3;
    for (let i = 0; i < nP; i++) for (const s of [1, -1]) {
      const t = 0.3 + (i / nP) * 0.5;
      const py = ys * 0.55;
      const a = hullAt(h, t - 0.012, py - 0.18), b = hullAt(h, t + 0.012, py - 0.18), c = hullAt(h, t + 0.012, py + 0.18), d = hullAt(h, t - 0.012, py + 0.18);
      const o = 0.02;
      const q = [[a[0], a[1], s * (a[2] + o)], [b[0], b[1], s * (b[2] + o)], [c[0], c[1], s * (c[2] + o)], [d[0], d[1], s * (d[2] + o)]];
      if (s > 0) p.quad(q[0], q[1], q[2], q[3], glass); else p.quad(q[0], q[3], q[2], q[1], glass);
    }
  }
  if (lod === 0) {
    for (let i = 0; i < v.crew; i++) person(p, i === 0 ? fx1 - 1.6 : hx0 - 0.6, i === 0 ? fy + 0.9 : ys + 0.45, i === 0 ? 0 : fw * 0.15, i === 0 ? 0 : Math.PI, i > 0, v.crewShirts[i], v.crewTrousers[i], v.crewDark[i]);
    for (let i = 0; i < v.fenders; i++) {
      const s = i % 2 === 0 ? 1 : -1;
      const [x, y, z] = sheerPoint(h, 0.2 + (i * 0.37) % 0.6);
      p.cyl(v.fender, 0.16, 0.16, 0.8, x, y - 0.7, s * (z + 0.17), 6);
      p.rod(F.rope, 0.01, [x, y - 0.05, s * (z - 0.1)], [x, y - 0.3, s * (z + 0.17)], 3);
    }
  }
}

function buildSail(p: Parts, v: BoatVariant): void {
  const h = v.hull, lod = p.lod, L = h.len, B = h.beam;
  const glass = v.lightsOn ? F.glassFlatGlow : F.glassFlat;
  if (lod <= 1) rubRail(p, h, F.rubber, lod === 0 ? 10 : 6, 0.05, 0.05, 0.025);
  // fin keel with a bulb, spade rudder
  const kx = -L * 0.02, kc = L * 0.2, kd = v.keelDepth;
  p.box(antiFinish(v), kc, kd, 0.16 + L * 0.01, kx - kd * 0.2, -h.draft - kd / 2 + 0.05, 0, 0, 0, 0.18);
  if (v.keelDepth > 1.5 && lod <= 2) p.cyl(antiFinish(v), 0.16, 0.16, kc * 0.9, kx - kd * 0.35, -h.draft - kd + 0.12, 0, 6, 0, 0, Math.PI / 2);
  p.box(antiFinish(v), L * 0.05, 1.0 + L * 0.03, 0.06, -L * 0.42, -h.draft * 0.6 - 0.5 - L * 0.012, 0, 0, 0, 0.15);
  // deck, coachroof with windows, cockpit with coaming and benches
  const tC0 = 0.14, tC1 = 0.4;
  deckStrip(p, h, tC1, 0.995, 0.04, v.deck, 0.03, lod === 0 ? 6 : 4, 0.06);
  deckStrip(p, h, 0, tC0, 0.04, v.deck, 0.03, 1, 0.05);
  const [xc0, yc0] = sheerPoint(h, tC0), [xc1, yc1, zc1] = sheerPoint(h, tC1);
  const yFloor = Math.min(yc0, yc1) - 0.5;
  if (lod <= 2) {
    cockpit(p, h, tC0, tC1, 0.5, v.deck === F.teak ? F.teak : F.deckSkid, F.gelWhite, v.deck, 3, 0.35);
    for (const s of [1, -1]) {
      p.box(v.deck === F.teak ? F.teak : F.gelWhite, xc1 - xc0 - 0.3, 0.06, 0.55, (xc0 + xc1) / 2, yFloor + 0.42, s * (zc1 * 0.62 - 0.28)); // benches
      p.box(F.gelWhite, xc1 - xc0 + 0.2, 0.22, 0.12, (xc0 + xc1) / 2, yc1 + 0.1, s * (zc1 * 0.9)); // coaming
    }
    if (v.wheel) { p.cyl(F.gelWhite, 0.12, 0.1, 0.8, xc0 + 0.9, yFloor + 0.4, 0, 8); p.cyl(F.chrome, 0.42, 0.42, 0.04, xc0 + 0.9 - 0.08, yFloor + 0.95, 0, 12, 0, 0, Math.PI / 2, true); }
    else p.box(F.teak, 1.6, 0.06, 0.08, xc0 + 1.1, yFloor + 0.62, 0.0, 0, 0, -0.15);
  }
  const crX0 = xc1 + 0.1, crX1 = L * 0.24, crH = 0.55 + L * 0.012, crW = B * 0.62;
  p.box(F.gelWhite, crX1 - crX0, crH, crW, (crX0 + crX1) / 2, yc1 + crH / 2 - 0.02, 0);
  p.box(F.gelWhite, L * 0.12, crH * 0.5, crW * 0.85, crX1 + L * 0.05, yc1 + crH * 0.25, 0); // forward cabin top
  if (lod <= 2) for (const s of [1, -1]) {
    const o = s * (crW / 2 + 0.012);
    const wy0 = yc1 + crH * 0.4, wy1 = yc1 + crH * 0.85;
    const segs = lod === 0 ? 3 : 1;
    for (let i = 0; i < segs; i++) {
      const x0 = crX0 + 0.25 + (i / segs) * (crX1 - crX0 - 0.5), x1 = crX0 + 0.25 + ((i + 0.85) / segs) * (crX1 - crX0 - 0.5);
      if (s > 0) p.quad([x0, wy0, o], [x1, wy0, o], [x1, wy1, o], [x0, wy1, o], glass); else p.quad([x0, wy0, o], [x0, wy1, o], [x1, wy1, o], [x1, wy0, o], glass);
    }
  }
  if (lod <= 1) {
    p.box(F.gelWhite, 0.6, 0.12, 0.6, crX0 + 0.5, yc1 + crH + 0.05, 0); // companionway hatch
    if (v.dodger) { p.box(v.canvas, 0.9, 0.7, crW * 1.05, crX0 - 0.35, yc1 + crH + 0.2, 0); p.box(v.canvas, 0.5, 0.2, crW * 1.05, crX0 - 1.0, yc1 + crH + 0.45, 0, 0, 0, 0.45); }
  }
  // mast, boom, spreaders, standing rigging
  const mastT = 0.6;
  const [mx, my] = sheerPoint(h, mastT);
  const mastH = L * 1.28, mastTop = my + mastH;
  p.cyl(F.alu, 0.075 + L * 0.003, 0.05, mastH, mx, my + mastH / 2, 0, lod <= 1 ? 6 : 4);
  const boomY = my + 1.35 + L * 0.02, boomL = L * 0.36;
  const boomYaw = v.sailsUp ? -0.32 : 0;
  const boomEnd = [mx - boomL * Math.cos(boomYaw), boomY, boomL * Math.sin(boomYaw)];
  p.rod(F.alu, 0.06 + L * 0.002, [mx, boomY, 0], boomEnd, lod <= 1 ? 6 : 4);
  if (lod <= 1) {
    for (const k of [0.45, 0.72]) p.box(F.alu, 0.06, 0.05, B * (0.7 - (k - 0.45) * 0.6), mx, my + mastH * k, 0);
    p.box(F.antennaWhite, 0.2, 0.5, 0.2, mx, mastTop + 0.2, 0);
    p.box(F.navWhite, 0.08, 0.1, 0.08, mx, mastTop + 0.5, 0);
    p.rod(F.antennaWhite, 0.012, [mx, mastTop, -0.05], [mx, mastTop + 1.0, -0.05], 3);
    const [bx, by] = sheerPoint(h, 0.985);
    const [sx, sy, sz] = sheerPoint(h, 0.02);
    const [cx, cy, cz] = sheerPoint(h, mastT);
    p.rod(F.chrome, 0.013, [bx + h.bowRake * 0.1, by + 0.05, 0], [mx + 0.05, mastTop - 0.1, 0], 3); // forestay
    p.rod(F.chrome, 0.012, [sx - 0.1, sy + 0.05, 0], [mx - 0.05, mastTop - 0.1, 0], 3); // backstay
    for (const s of [1, -1]) {
      p.rod(F.chrome, 0.011, [cx, cy, s * (cz - 0.1)], [mx, my + mastH * 0.72, s * B * 0.19], 3); // cap shroud lower
      p.rod(F.chrome, 0.011, [mx, my + mastH * 0.72, s * B * 0.19], [mx, mastTop - 0.15, 0], 3);
      p.rod(F.chrome, 0.011, [cx + 0.1, cy, s * (cz - 0.1)], [mx, my + mastH * 0.45, s * B * 0.28], 3); // lower shroud
    }
    void sz;
  }
  if (v.sailsUp) {
    // mainsail set (bellied to leeward, +z), genoa on the forestay
    const [bx, by] = sheerPoint(h, 0.985);
    const slices = lod === 0 ? 6 : lod === 1 ? 4 : 2;
    sail(p, [mx, boomY + 0.1, 0], [mx, mastTop - 0.3, 0], [boomEnd[0] + 0.15 * Math.cos(boomYaw), boomY + 0.15, boomEnd[2] - 0.1], lod <= 2 ? 0.09 : 0, slices, 0.06, F.sail);
    const clew = [mx - L * 0.02, my + 0.9, B * 0.42];
    sail(p, [bx + h.bowRake * 0.1, by + 0.3, 0], [mx + 0.3, mastTop - L * 0.12, 0], clew, lod <= 2 ? 0.11 : 0, slices, 0.0, F.sail);
  } else {
    // sail cover on the boom, furled genoa on the forestay
    const [bx, by] = sheerPoint(h, 0.985);
    if (lod <= 2) {
      p.box(v.canvas, boomL * 0.96, 0.36, 0.34, mx - boomL * 0.48, boomY + 0.16, 0);
      p.box(v.canvas, boomL * 0.5, 0.42, 0.42, mx - boomL * 0.25, boomY + 0.2, 0);
      const top = [mx + 0.05, mastTop - 0.4, 0], bot = [bx + h.bowRake * 0.1, by + 0.15, 0];
      const g = new THREE.CylinderGeometry(0.06, 0.13 + L * 0.004, Math.hypot(top[0] - bot[0], top[1] - bot[1]), 6, 1, true);
      const dir = new THREE.Vector3(top[0] - bot[0], top[1] - bot[1], 0).normalize();
      _q.setFromUnitVectors(Y_AXIS, dir);
      p.geometry(g, F.sail, _m.compose(_v.set((top[0] + bot[0]) / 2, (top[1] + bot[1]) / 2, 0), _q, _s.set(1, 1, 1)));
      g.dispose();
    }
  }
  // rails, lifelines, cleats, lights, dinghy, crew
  if (lod <= 1) {
    bowRail(p, h, 0.88, 0.62, 0.1, F.chrome, 0.016);
    lifelines(p, h, 0.06, 0.86, 0.62, 0.1, lod === 0 ? 1.9 : 3.8, lod === 0 ? 2 : 1, F.chrome, F.chrome);
    const [sx, sy, sz] = sheerPoint(h, 0.02);
    p.tube(F.chrome, 0.016, [[sx, sy + 0.62, sz * 0.9], [sx - 0.1, sy + 0.62, 0], [sx, sy + 0.62, -sz * 0.9]], 4); // pushpit
    for (const t of [0.05, 0.9]) for (const s of [1, -1]) { const [cx, cy, cz] = sheerPoint(h, t); cleat(p, cx, cy - 0.04, s * (cz - 0.18)); }
    navLights(p, h, 0.9, 0.1, null);
    if (v.dinghyMode === 'davit') {
      for (const s of [1, -1]) p.tube(F.alu, 0.03, [[sx, sy, s * sz * 0.5], [sx - 1.2, sy + 1.4, s * sz * 0.5], [sx - 2.0, sy + 1.4, s * sz * 0.5]], 4);
      dinghy(p, sx - 1.6, sy + 0.9, 0, 2.6, F.fenderWhite);
    }
  }
  if (v.dinghyMode === 'tow' && lod <= 2) {
    const [sx, sy] = sheerPoint(h, 0.0);
    dinghy(p, sx - L * 0.55, 0.28, 0.6, 2.6, F.fenderWhite);
    if (lod <= 1) p.rod(F.rope, 0.012, [sx, sy - 0.1, 0.1], [sx - L * 0.55 + 1.3, 0.35, 0.6], 3);
  }
  if (lod === 0) {
    for (let i = 0; i < v.crew; i++) {
      const s = i % 2 === 0 ? 1 : -1;
      if (i === 0) person(p, xc0 + 0.9 + (v.wheel ? -0.55 : 0.6), yFloor, v.wheel ? 0 : s * 0.4, v.wheel ? 0 : Math.PI, false, v.crewShirts[i], v.crewTrousers[i], v.crewDark[i]);
      else person(p, (xc0 + xc1) / 2 + (i - 1.5) * 0.6, yFloor + 0.45, s * (zc1 * 0.62 - 0.28), s > 0 ? -Math.PI / 2 : Math.PI / 2, true, v.crewShirts[i], v.crewTrousers[i], v.crewDark[i]);
    }
    for (let i = 0; i < v.fenders; i++) {
      const s = i % 2 === 0 ? 1 : -1;
      const [x, y, z] = sheerPoint(h, 0.3 + (i * 0.33) % 0.5);
      p.cyl(v.fender, 0.1, 0.1, 0.5, x, y - 0.4, s * (z + 0.11), 6);
      p.rod(F.rope, 0.008, [x, y, s * (z - 0.05)], [x, y - 0.14, s * (z + 0.11)], 3);
    }
  }
}

function buildFerry(p: Parts, v: BoatVariant): void {
  const h = v.hull, lod = p.lod, L = h.len, B = h.beam;
  const glass = v.lightsOn ? F.glassFlatGlow : F.glassFlat;
  const ys = sheerY(h, 0.5);
  // main deck inside a bulwark, passenger cabin with a window band, upper deck with wheelhouse, funnel, mast
  deckStrip(p, h, 0.0, 0.995, 0.9, v.deck, 0.25, lod <= 1 ? 6 : 3, 0.05);
  if (lod <= 1) rubRail(p, h, F.rubber, 8, 1.2, 0.35, 0.18);
  const cx0 = -L * 0.36, cx1 = L * 0.3, cw = B * 0.84, ch = 2.7;
  p.box(F.plateWhite, cx1 - cx0, ch, cw, (cx0 + cx1) / 2, ys - 0.9 + ch / 2, 0);
  const wy0 = ys - 0.9 + 1.2, wy1 = ys - 0.9 + 2.3;
  for (const s of [1, -1]) {
    const o = s * (cw / 2 + 0.02);
    const n = lod <= 1 ? 8 : 1;
    for (let i = 0; i < n; i++) {
      const x0 = cx0 + 0.6 + (i / n) * (cx1 - cx0 - 1.2), x1 = cx0 + 0.6 + ((i + 0.86) / n) * (cx1 - cx0 - 1.2);
      if (s > 0) p.quad([x0, wy0, o], [x1, wy0, o], [x1, wy1, o], [x0, wy1, o], glass); else p.quad([x0, wy0, o], [x0, wy1, o], [x1, wy1, o], [x1, wy0, o], glass);
    }
  }
  p.quad([cx1 + 0.02, wy0, cw * 0.45], [cx1 + 0.02, wy0, -cw * 0.45], [cx1 + 0.02, wy1, -cw * 0.45], [cx1 + 0.02, wy1, cw * 0.45], glass);
  const uy = ys - 0.9 + ch;
  // upper deck: railing, rows of benches, wheelhouse forward
  const whX0 = cx1 - 5.5, whX1 = cx1 - 0.5, whW = cw * 0.7, whH = 2.5;
  p.box(F.plateWhite, whX1 - whX0, whH, whW, (whX0 + whX1) / 2, uy + whH / 2, 0);
  p.quad([whX1 + 0.02, uy + 1.0, whW * 0.5], [whX1 + 0.02, uy + 1.0, -whW * 0.5], [whX1 - 0.5, uy + 2.2, -whW * 0.5], [whX1 - 0.5, uy + 2.2, whW * 0.5], glass);
  for (const s of [1, -1]) { const o = s * (whW / 2 + 0.02); if (s > 0) p.quad([whX0 + 0.3, uy + 1.0, o], [whX1 - 0.3, uy + 1.0, o], [whX1 - 0.3, uy + 2.2, o], [whX0 + 0.3, uy + 2.2, o], glass); else p.quad([whX0 + 0.3, uy + 1.0, o], [whX0 + 0.3, uy + 2.2, o], [whX1 - 0.3, uy + 2.2, o], [whX1 - 0.3, uy + 1.0, o], glass); }
  p.cyl(F.plateWhite, 0.75, 0.6, 3.2, cx0 + 5, uy + 1.6, 0, 8, 0, 0, 0.2);
  p.cyl(F.black, 0.62, 0.62, 0.5, cx0 + 5 - 0.35, uy + 3.35, 0, 8, 0, 0, 0.2);
  if (lod <= 2) {
    p.rod(F.plateWhite, 0.12, [whX0 - 0.5, uy + whH, 0], [whX0 - 0.5, uy + whH + 6, 0], 6);
    p.box(F.plateWhite, 1.2, 0.3, 0.6, whX0 - 0.5, uy + whH + 4.2, 0);
    if (v.radar) p.box(F.plateWhite, 0.3, 0.25, 1.8, whX0 - 0.5, uy + whH + 5.2, 0, 0.6);
    p.box(F.navWhite, 0.15, 0.2, 0.15, whX0 - 0.5, uy + whH + 6.1, 0);
    for (const s of [1, -1]) p.box(s > 0 ? F.navGreen : F.navRed, 0.2, 0.2, 0.15, whX1 - 2, uy + whH + 0.1, s * (whW / 2 - 0.2));
    if (lod <= 1) {
      // rails around the upper deck, life-raft canisters, benches
      const rx0 = cx0 + 0.4, rx1 = whX0 - 1.0;
      for (const s of [1, -1]) {
        const o = s * (cw / 2 - 0.15);
        const posts: number[][] = [];
        for (let i = 0; i <= 10; i++) { const x = lerp(rx0, rx1, i / 10); p.rod(F.alu, 0.02, [x, uy, o], [x, uy + 1.05, o], 4); posts.push([x, uy + 1.05, o]); }
        p.tube(F.alu, 0.02, posts, 4);
        p.tube(F.alu, 0.015, posts.map((q) => [q[0], q[1] - 0.5, q[2]]), 3);
        for (let i = 0; i < 4; i++) p.cyl(F.lifeRaft, 0.32, 0.32, 1.1, rx0 + 3 + i * 5, uy + 0.75, s * (cw / 2 - 0.7), 6, 0, 0, Math.PI / 2);
      }
      const bench = new THREE.BoxGeometry(0.45, 0.45, 3.2);
      for (let i = 0; i < 7; i++) for (const s of [1, -1]) p.geometry(bench, v.uphol, _m.makeTranslation(rx0 + 4 + i * 2.6, uy + 0.25, s * 2.2));
      bench.dispose();
      const wstn = [L * 0.5 + h.bowRake - 1.0, ys + h.freeboard * h.sheerBow, 0];
      p.rod(F.alu, 0.05, [wstn[0], wstn[1] - 0.5, 0], [wstn[0], wstn[1] + 2.5, 0], 5);
      p.box(F.navWhite, 0.15, 0.2, 0.15, wstn[0], wstn[1] + 2.55, 0);
      for (const s of [1, -1]) for (const t of [0.06, 0.5, 0.9]) { const [qx, qy, qz] = sheerPoint(h, t); p.box(F.darkMetal, 0.6, 0.14, 0.14, qx, qy - 0.85, s * (qz - 0.35)); }
    }
  }
  // twin screws under the counter
  if (lod <= 2) for (const s of [1, -1]) p.cyl(F.darkMetal, 0.6, 0.6, 0.12, -L * 0.46, -h.draft + 0.6, s * B * 0.22, 6, 0, 0, Math.PI / 2);
}

function buildCargo(p: Parts, v: BoatVariant): void {
  const h = v.hull, lod = p.lod, L = h.len, B = h.beam;
  const glass = v.lightsOn ? F.glassFlatGlow : F.glassFlat;
  const ys = sheerY(h, 0.5);
  const deckY = ys - 1.1;
  deckStrip(p, h, 0.0, 0.995, 1.1, v.deck, 0.3, lod <= 1 ? 6 : 3, 0.1);
  // bulbous bow
  if (h.bulb > 0) p.sphere(antiFinish(v), h.bulb, L * 0.5 + h.bulb * 0.6, -h.draft + h.bulb * 0.9, 0, 8, 6, 0.9, 1.6, 1);
  // hatch coamings and container bays: 40 ft bays with a gap, stacks 1..4 high of coloured boxes
  const bayL = 12.6, gap = 1.4, cols = Math.max(4, Math.floor(B / 2.7));
  const x0 = -L * 0.22, x1 = L * 0.42;
  const bays = Math.floor((x1 - x0) / (bayL + gap));
  let ci = 0;
  const box = new THREE.BoxGeometry(12.19, 2.59, 2.44);
  for (let b = 0; b < bays; b++) {
    const bx = x0 + b * (bayL + gap) + bayL / 2;
    p.box(F.plateTint, bayL - 0.4, 1.4, cols * 2.5 + 0.6, bx, deckY + 0.7, 0);
    for (let c = 0; c < cols; c++) {
      const stack = 1 + v.stacks[(b * cols + c) % v.stacks.length];
      const z = (c - (cols - 1) / 2) * 2.5;
      if (lod <= 1) {
        for (let k = 0; k < stack; k++) { p.geometry(box, CONTAINERS[v.containers[ci % v.containers.length]], _m.makeTranslation(bx, deckY + 1.4 + 1.3 + k * 2.59, z)); ci++; }
      } else {
        p.box(CONTAINERS[v.containers[ci % v.containers.length]], 12.19, 2.59 * stack, 2.44, bx, deckY + 1.4 + stack * 1.3, z); ci++;
      }
    }
  }
  box.dispose();
  // accommodation block aft with the bridge, funnel, mast, free-fall lifeboat
  const ax = -L * 0.34, aw = B * 0.82, al = L * 0.075, ah = 5 * 2.8;
  p.box(F.plateWhite, al, ah, aw, ax, deckY + ah / 2, 0);
  const bh = 3.0, by = deckY + ah;
  p.box(F.plateWhite, al * 0.8, bh, B * 1.06, ax - al * 0.05, by + bh / 2, 0); // bridge with wings
  p.quad([ax - al * 0.05 + al * 0.4 + 0.02, by + 1.0, B * 0.5], [ax - al * 0.05 + al * 0.4 + 0.02, by + 1.0, -B * 0.5], [ax - al * 0.05 + al * 0.4 - 0.4, by + 2.6, -B * 0.5], [ax - al * 0.05 + al * 0.4 - 0.4, by + 2.6, B * 0.5], glass);
  if (lod <= 1) {
    for (let d = 0; d < 5; d++) for (const s of [1, -1]) {
      const o = s * (aw / 2 + 0.02);
      for (let w = 0; w < 5; w++) { const wx = ax - al * 0.4 + (w + 0.5) * (al / 5); const q = [[wx - 0.5, deckY + d * 2.8 + 1.2, o], [wx + 0.5, deckY + d * 2.8 + 1.2, o], [wx + 0.5, deckY + d * 2.8 + 2.2, o], [wx - 0.5, deckY + d * 2.8 + 2.2, o]]; if (s > 0) p.quad(q[0], q[1], q[2], q[3], glass); else p.quad(q[0], q[3], q[2], q[1], glass); }
    }
  }
  p.cyl(F.plateTint, 1.6, 1.4, 6, ax - al * 0.62, by + 3, 0, 8);
  p.cyl(F.black, 1.45, 1.45, 0.8, ax - al * 0.62, by + 6.2, 0, 8);
  if (lod <= 2) {
    p.rod(F.plateWhite, 0.25, [ax + al * 0.1, by + bh, 0], [ax + al * 0.1, by + bh + 9, 0], 6);
    p.box(F.plateWhite, 0.4, 0.4, 3.0, ax + al * 0.1, by + bh + 7.5, 0, 0.4);
    p.box(F.navWhite, 0.3, 0.3, 0.3, ax + al * 0.1, by + bh + 9.2, 0);
    p.box(F.orange, 7.5, 2.6, 2.8, ax - al * 0.5 - 3.0, deckY + ah * 0.55 + 1.5, -aw * 0.25, 0, 0, 0.6); // free-fall lifeboat
    p.rod(F.plateWhite, 0.2, [L * 0.47, ys + 0.1, 0], [L * 0.47, ys + 8, 0], 6);
    p.box(F.navWhite, 0.3, 0.3, 0.3, L * 0.47, ys + 8.2, 0);
    for (const s of [1, -1]) p.box(s > 0 ? F.navGreen : F.navRed, 0.35, 0.35, 0.3, ax - al * 0.05, by + bh + 0.2, s * (B * 0.53 - 0.2));
    // deck cranes between the bays
    if (v.twinScrew) for (const cxk of [x0 + (bayL + gap) * 1 - gap / 2, x0 + (bayL + gap) * 3 - gap / 2]) {
      p.cyl(F.plateTint, 1.3, 1.1, 5, cxk, deckY + 2.5, -B * 0.32, 8);
      p.box(F.plateTint, 2.4, 2.4, 2.4, cxk, deckY + 6.2, -B * 0.32);
      p.box(F.plateTint, 14, 0.8, 0.8, cxk + 5, deckY + 11, -B * 0.32, 0, 0, 0.75);
    }
  }
  if (lod <= 1) {
    // deck-edge railings, anchors
    for (const s of [1, -1]) {
      const pts: number[][] = [];
      for (let i = 0; i <= 12; i++) { const [rx, ry, rz] = sheerPoint(h, 0.02 + (i / 12) * 0.95); pts.push([rx, ry + 1.0, s * (rz - 0.25)]); p.rod(F.plateWhite, 0.03, [rx, ry, s * (rz - 0.25)], [rx, ry + 1.0, s * (rz - 0.25)], 4); }
      p.tube(F.plateWhite, 0.03, pts, 4);
      const [qx, qy, qz] = hullAt(h, 0.95, ys * 0.55);
      p.box(F.darkMetal, 1.4, 1.6, 0.4, qx, qy, s * (qz + 0.15));
    }
  }
  // propeller and rudder
  if (lod <= 2) { p.cyl(F.darkMetal, L * 0.014, L * 0.014, 0.4, -L * 0.47, -h.draft + L * 0.02, 0, 6, 0, 0, Math.PI / 2); p.box(antiFinish(v), L * 0.02, h.draft * 0.7, 0.5, -L * 0.49, -h.draft * 0.5, 0); }
}

function buildCruise(p: Parts, v: BoatVariant): void {
  const h = v.hull, lod = p.lod, L = h.len, B = h.beam;
  const glass = v.lightsOn ? F.glassFlatGlow : F.glassFlat;
  const ys = sheerY(h, 0.5);
  deckStrip(p, h, 0.0, 0.995, 0.0, F.deckGrey, 0.3, lod <= 1 ? 6 : 3, 0.1);
  if (h.bulb > 0) p.sphere(antiFinish(v), h.bulb, L * 0.5 + h.bulb * 0.5, -h.draft + h.bulb * 0.9, 0, 8, 6, 0.9, 1.7, 1);
  // hull portholes
  if (lod === 0) for (const s of [1, -1]) for (let i = 0; i < 44; i++) {
    const t = 0.08 + (i / 44) * 0.82;
    const [qx, qy, qz] = hullAt(h, t, ys * 0.42);
    p.box(F.glassFlat, 0.9, 0.9, 0.06, qx, qy, s * (qz + 0.02));
  }
  // superstructure tiers with balcony decks: each deck a glass band set back behind a balcony rail strip and
  // dividers, a forward-set wheelhouse with bridge wings, lifeboats hung along the promenade
  const tiers: [number, number, number, number][] = [[-L * 0.05, L * 0.78, B * 0.92, 5], [-L * 0.08, L * 0.66, B * 0.86, 4], [-L * 0.12, L * 0.44, B * 0.62, 2]];
  const deckH = 2.9;
  let y = ys;
  for (const [tx, tl, tw, decks] of tiers) {
    const th = decks * deckH;
    p.box(F.plateWhite, tl, th, tw - 2.4, tx, y + th / 2, 0); // the cabin block, balconies in front of it
    for (let d = 0; d < decks; d++) {
      const dy = y + d * deckH;
      for (const s of [1, -1]) {
        const o = s * (tw / 2 - 1.2 + 0.02);
        // glass doors band along the block face
        if (s > 0) p.quad([tx - tl / 2 + 2, dy + 0.5, o], [tx + tl / 2 - 2, dy + 0.5, o], [tx + tl / 2 - 2, dy + 2.4, o], [tx - tl / 2 + 2, dy + 2.4, o], glass);
        else p.quad([tx - tl / 2 + 2, dy + 0.5, o], [tx - tl / 2 + 2, dy + 2.4, o], [tx + tl / 2 - 2, dy + 2.4, o], [tx + tl / 2 - 2, dy + 0.5, o], glass);
        // balcony floor slab and rail strip
        p.box(F.plateWhite, tl - 2, 0.25, 1.25, tx, dy + 0.12, s * (tw / 2 - 0.62));
        p.box(F.glass, tl - 2, 1.0, 0.06, tx, dy + 0.75, s * (tw / 2 - 0.02));
        if (lod <= 1) {
          const nd = Math.floor((tl - 2) / 3.4);
          for (let i = 0; i <= nd; i++) p.box(F.plateWhite, 0.1, 2.5, 1.2, tx - (tl - 2) / 2 + i * 3.4, dy + 1.35, s * (tw / 2 - 0.62));
        }
      }
    }
    y += th;
  }
  const topY = y;
  // wheelhouse forward at the second tier, wings past the beam
  const whX = L * 0.29, whY = ys + 5 * deckH;
  p.box(F.plateWhite, L * 0.05, 3.6, B * 1.08, whX, whY + 1.8, 0);
  p.quad([whX + L * 0.025 + 0.02, whY + 1.1, B * 0.54], [whX + L * 0.025 + 0.02, whY + 1.1, -B * 0.54], [whX + L * 0.025 - 0.6, whY + 3.0, -B * 0.54], [whX + L * 0.025 - 0.6, whY + 3.0, B * 0.54], glass);
  // lifeboats on davits along the promenade (second tier level), orange with white canopies
  if (lod <= 2) {
    const n = lod <= 1 ? 9 : 4;
    for (let i = 0; i < n; i++) for (const s of [1, -1]) {
      const bx = -L * 0.24 + i * (L * 0.5 / n) + 4;
      const by = ys + 5 * deckH + 2.2, bz = s * (B * 0.46 + 1.9);
      p.box(F.orange, 9.0, 1.6, 3.4, bx, by, bz);
      p.box(F.lifeRaft, 8.6, 1.2, 3.0, bx, by + 1.3, bz);
      if (lod <= 1) for (const dx of [-3.2, 3.2]) p.box(F.plateWhite, 0.4, 3.2, 0.4, bx + dx, by + 2.4, bz * 0.94);
    }
  }
  // funnel (swept, winged), radar mast, pool deck and sports court on top
  const fx = -L * 0.2;
  p.box(F.plateWhite, 12, 9, 6, fx, topY + 4.5, 0, 0, 0, 0.3);
  p.box(F.plateWhite, 18, 1.6, 14, fx - 2, topY + 9.2, 0, 0, 0, 0.3);
  p.cyl(F.black, 2.2, 2.4, 2.0, fx - 3.2, topY + 10.5, 0, 10);
  p.rod(F.plateWhite, 0.5, [L * 0.2, topY, 0], [L * 0.2, topY + 12, 0], 6);
  if (lod <= 2) {
    p.box(F.plateWhite, 1.2, 0.8, 5.0, L * 0.2, topY + 9.5, 0);
    p.box(F.plateWhite, 0.5, 0.5, 4.0, L * 0.2, topY + 11, 0, 0.5);
    p.sphere(F.plateWhite, 1.4, L * 0.2 + 2.5, topY + 2.0, 0, 8, 6);
    p.box(F.navWhite, 0.4, 0.4, 0.4, L * 0.2, topY + 12.2, 0);
    p.box(F.pool, 14, 0.2, 7, -L * 0.02, topY + 0.15, 0);
    p.box(F.pool, 8, 0.2, 5, L * 0.08, topY + 0.15, 0);
    p.box(F.court, 22, 0.2, 12, -L * 0.36, topY - 3 * deckH + 0.15, 0);
    if (lod <= 1) {
      for (let i = 0; i < 12; i++) for (const s of [1, -1]) p.box(F.plateWhite, 0.4, 3.0, 0.4, -L * 0.36 - 11 + i * 2, topY - 3 * deckH + 1.5, s * 6, 0);
      p.box(F.plateWhite, 4, 2.5, 4, L * 0.02, topY + 1.25, B * 0.2); // deck bar
      p.box(v.canvas, 6, 0.2, 6, L * 0.02, topY + 3.0, B * 0.2);
    }
  }
  for (const s of [1, -1]) p.box(s > 0 ? F.navGreen : F.navRed, 0.5, 0.5, 0.4, whX, whY + 3.8, s * (B * 0.54 - 0.3));
  if (lod <= 2) for (const s of [1, -1]) p.cyl(F.darkMetal, 2.6, 2.6, 0.5, -L * 0.47, -h.draft + 3.2, s * B * 0.18, 8, 0, 0, Math.PI / 2);
}

/** Build LOD `lod` (0 near .. 3 far) of a variant. */
export function buildBoatLod(v: BoatVariant, lod: number): THREE.BufferGeometry {
  const parts = new Parts(lod);
  const { stations, rows } = hullRows(v.hull, v.paint, lod);
  loftHull(parts, v.hull, v.paint, stations, rows);
  switch (v.kind) {
    case 'speed': buildSpeed(parts, v); break;
    case 'console': buildConsole(parts, v); break;
    case 'yacht': buildYacht(parts, v); break;
    case 'sail': buildSail(parts, v); break;
    case 'ferry': buildFerry(parts, v); break;
    case 'cargo': buildCargo(parts, v); break;
    case 'cruise': buildCruise(parts, v); break;
  }
  return parts.build();
}

/** All LODs of a variant with its spec. */
export interface BoatModel { spec: BoatSpec; variant: BoatVariant; lods: THREE.BufferGeometry[]; triangles: number[] }

export function buildBoatModel(v: BoatVariant): BoatModel {
  const lods: THREE.BufferGeometry[] = [], triangles: number[] = [];
  for (let lod = 0; lod < 4; lod++) { const g = buildBoatLod(v, lod); lods.push(g); triangles.push(g.getAttribute('position').count / 3); }
  return { spec: specOf(v), variant: v, lods, triangles };
}

/** LOD switch distances (m) for a hull of length `len`: near, full, mid (beyond: far). Ships keep detail longer. */
export function lodDistances(len: number): [number, number, number] {
  const k = Math.sqrt(Math.max(len, 6) / 8);
  return [115 * k, 320 * k, 1500 * k];
}

// ------------------------------------------------------------------ motion

/**
 * Floats a hull on the wave field: heave, roll and pitch follow a plane fitted through the surface heights at
 * the hull's sample points with a damped second-order response (natural periods from the hull size), plus the
 * running trim and squat / lift of the hull with speed and the lean of a planing hull into a turn.
 * Angles in radians: roll positive = starboard down, pitch positive = bow up. Heave is the hull's vertical offset.
 */
export class BoatMotion {
  heave = 0; heaveV = 0;
  roll = 0; rollV = 0;
  pitch = 0; pitchV = 0;
  /** last surface heights at the sample points (diagnostics) */
  readonly heights: number[] = [];
  private readonly wHeave: number; private readonly wRoll: number; private readonly wPitch: number;
  private readonly lx: number; private readonly lz: number;
  private readonly hullSpeed: number;

  constructor(private readonly spec: BoatSpec) {
    const L = spec.lwl, B = spec.beam;
    // natural periods: heave ~0.55 sqrt(L) s (a runabout 1.4 s, a feeder 6.5 s), roll ~0.8 B (light damping), pitch a little longer than heave
    this.wHeave = (2 * Math.PI) / clamp(0.55 * Math.sqrt(L), 1.2, 7.5);
    this.wRoll = (2 * Math.PI) / clamp(0.85 * B, 1.6, 12);
    this.wPitch = (2 * Math.PI) / clamp(0.6 * Math.sqrt(L), 1.3, 8);
    this.lx = Math.abs(spec.samples[0][0]); this.lz = Math.abs(spec.samples[2][1]);
    this.hullSpeed = Math.sqrt(9.81 * L);
    for (let i = 0; i < spec.samples.length; i++) this.heights.push(0);
  }

  /** Bow-up running trim (rad) and vertical rise (m) of the hull at speed v. */
  runningTrim(v: number): { trim: number; rise: number } {
    const fr = v / this.hullSpeed;
    if (this.spec.planing) {
      // hump at Fr 0.5-0.8 (bow high, stern squatting), on the plane past ~1.0 the bow drops and the hull lifts
      const hump = smoothstep(0.25, 0.6, fr) * (1 - smoothstep(0.8, 1.25, fr));
      const plane = smoothstep(0.8, 1.3, fr);
      return { trim: 0.105 * hump + 0.045 * plane, rise: -0.025 * this.spec.lwl * hump + 0.03 * this.spec.lwl * plane };
    }
    if (this.spec.kind === 'yacht') {
      const hump = smoothstep(0.3, 0.6, fr);
      return { trim: 0.05 * hump, rise: -0.012 * this.spec.lwl * hump };
    }
    // displacement hulls squat a little as they approach hull speed
    return { trim: 0.012 * smoothstep(0.2, 0.5, fr), rise: -0.006 * this.spec.lwl * fr * fr };
  }

  /**
   * One step. `waveAt(x, z)` is the surface height; (hx, hz) the unit heading; `v` the speed; `yawRate` the
   * heading rate (rad/s, positive turning to starboard); `heelExtra` an imposed heel (sail pressure);
   * `slop` a residual harbour motion amplitude for sheltered water.
   */
  step(dt: number, x: number, z: number, hx: number, hz: number, waveAt: (x: number, z: number) => number, v: number, yawRate: number, heelExtra: number, slop: number, phase: number, time: number): void {
    const rx = -hz, rz = hx; // starboard
    const s = this.spec.samples, hs = this.heights;
    let mean = 0;
    for (let i = 0; i < s.length; i++) {
      const [lx, lz] = s[i];
      hs[i] = waveAt(x + hx * lx + rx * lz, z + hz * lx + rz * lz);
      mean += hs[i];
    }
    mean /= s.length;
    // residual harbour slop where the field is flat: a few centimetres of heave, a fraction of a degree of roll
    const slopH = slop * (0.03 * Math.sin(time * 0.9 + phase) + 0.02 * Math.sin(time * 1.7 + phase * 1.3));
    const slopR = slop * 0.012 * Math.sin(time * 1.1 + phase * 0.7);
    const { trim, rise } = this.runningTrim(v);
    const heaveT = mean + slopH + rise;
    const pitchT = Math.atan2(hs[0] - hs[1], 2 * this.lx) + trim;
    const lean = this.spec.planing ? 0.6 : -0.15;
    const rollT = Math.atan2(hs[3] - hs[2], 2 * this.lz) + slopR + heelExtra + lean * Math.atan((v * yawRate) / 9.81);
    // damped second order toward the targets (semi-implicit Euler)
    const h = Math.min(dt, 0.05);
    const zH = 0.55, zR = 0.22, zP = 0.5;
    this.heaveV += (this.wHeave * this.wHeave * (heaveT - this.heave) - 2 * zH * this.wHeave * this.heaveV) * h;
    this.heave += this.heaveV * h;
    this.rollV += (this.wRoll * this.wRoll * (rollT - this.roll) - 2 * zR * this.wRoll * this.rollV) * h;
    this.roll += this.rollV * h;
    this.pitchV += (this.wPitch * this.wPitch * (pitchT - this.pitch) - 2 * zP * this.wPitch * this.pitchV) * h;
    this.pitch += this.pitchV * h;
  }

  /** Start at rest on the current surface (no transient at spawn). */
  settle(x: number, z: number, hx: number, hz: number, waveAt: (x: number, z: number) => number, v: number): void {
    this.heaveV = 0; this.rollV = 0; this.pitchV = 0;
    this.heave = 0; this.roll = 0; this.pitch = 0;
    for (let i = 0; i < 40; i++) this.step(0.05, x, z, hx, hz, waveAt, v, 0, 0, 0, 0, 0);
  }
}
