import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { flatUv } from './util';

/**
 * A plain part (horn, rod, bracket) merged into a wing-paint batch next to `wingPanel` geometries: it gets the white
 * vertex colour the panels carry and samples one texel of the paint at (u, v).
 */
export function withPaint<T extends THREE.BufferGeometry>(geo: T, u: number, v: number): T {
  flatUv(geo, u, v);
  const n = geo.getAttribute('position').count;
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  return geo;
}

// ------------------------------------------------------------------ wings

export interface WingSpec {
  span: number;      // one side, root to tip
  rootChord: number;
  tipChord: number;
  sweep: number;     // tip x offset of the 30% chord line (negative = aft)
  dihedral: number;  // radians
  thickness: number; // t/c
  twist: number;     // tip incidence change (radians, negative = washout)
  camber?: number;   // max camber / chord
  /** trailing-edge half thickness / chord (a real skin-and-rivet TE is a few mm thick, never a knife edge) */
  te?: number;
}

const DEFAULT_TE = 0.0035;

function thicknessY(x: number, thickness: number, te = DEFAULT_TE): number {
  // NACA 4-digit half thickness (closed TE) plus a linear ramp that opens the trailing edge to `te`
  return 5 * thickness * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4) + te * x;
}
function camberY(x: number, camber: number): number {
  return camber * Math.sin(Math.PI * x);
}

export function wingChord(spec: WingSpec, z: number): number {
  return spec.rootChord + (spec.tipChord - spec.rootChord) * (z / spec.span);
}
/** Leading-edge x in the wing frame (origin at the root 30% chord point). */
export function wingXLE(spec: WingSpec, z: number): number {
  return 0.3 * wingChord(spec, z) + spec.sweep * (z / spec.span);
}
export function wingXTE(spec: WingSpec, z: number): number {
  return wingXLE(spec, z) - wingChord(spec, z);
}
/** Lower-surface height (wing frame) at chordwise position x and span station z. */
export function wingLowerY(spec: WingSpec, x: number, z: number): number {
  const c = wingChord(spec, z);
  const p = THREE.MathUtils.clamp((wingXLE(spec, z) - x) / c, 0, 1);
  return Math.tan(spec.dihedral) * z + (camberY(p, spec.camber ?? 0.02) - thicknessY(p, spec.thickness, spec.te)) * c;
}
export function wingUpperY(spec: WingSpec, x: number, z: number): number {
  const c = wingChord(spec, z);
  const p = THREE.MathUtils.clamp((wingXLE(spec, z) - x) / c, 0, 1);
  return Math.tan(spec.dihedral) * z + (camberY(p, spec.camber ?? 0.02) + thicknessY(p, spec.thickness, spec.te)) * c;
}

export type WingPart = 'full' | 'front' | 'rear';

interface ProfilePt {
  x: number; y: number; u: number;
  /** point of the hinge face / control-surface nose inside the hinge gap (plain paint spot, shaded) */
  flat?: boolean;
  /** shade of a `flat` point (multiplies the paint; default HINGE_SHADE) */
  shade?: number;
}

/**
 * Closed profile loop in chord units (x: 0 leading edge .. 1 trailing edge). Runs from the trailing edge (or hinge)
 * forward along the upper surface, around the nose and back along the lower surface. Corners are duplicated so
 * they shade as hard edges; the loop's last point repeats the first (UV seam).
 *  full  : complete airfoil
 *  front : airfoil ahead of the hinge at chord fraction f, closed by the flat hinge face
 *  rear  : control surface behind chord fraction f, closed by a rounded nose that bulges `noseBulge` (chord) forward
 *          into the hinge gap (a real aileron / flap / rudder nose is a rolled sheet sitting in the cove, not a plank
 *          end: from the quarter views the gap reads as a dark slot with a lit curve inside it)
 */
function profileLoop(part: WingPart, f: number, thickness: number, camber: number, n: number, te = DEFAULT_TE, noseBulge = 0): ProfilePt[] {
  const up = (x: number): ProfilePt => ({ x, y: camberY(x, camber) + thicknessY(x, thickness, te), u: 0.5 - 0.5 * x });
  const lo = (x: number): ProfilePt => ({ x, y: camberY(x, camber) - thicknessY(x, thickness, te), u: 0.5 + 0.5 * x });
  const pts: ProfilePt[] = [];
  if (part === 'rear') {
    // blunt trailing edge: upper and lower skins end `te` apart and a tiny flat closes them
    pts.push(up(1));
    for (let k = 1; k < n; k++) pts.push(up(f + (1 - f) * (1 - k / n)));
    pts.push(up(f));
    // nose: a half ellipse from the upper skin edge around to the lower one, darkest where it turns under
    const yc = camberY(f, camber), yt = thicknessY(f, thickness, te), NOSE = 6;
    for (let k = 0; k <= NOSE; k++) {
      const th = (Math.PI * k) / NOSE;
      pts.push({ x: f - noseBulge * Math.sin(th), y: yc + yt * Math.cos(th), u: 0.02, flat: true, shade: 0.62 - 0.30 * Math.sin(th * 0.5) });
    }
    pts.push(lo(f));
    for (let k = 1; k < n; k++) pts.push(lo(f + (1 - f) * (k / n)));
    pts.push(lo(1), { ...up(1), u: 1 });
    return pts;
  }
  // One chord grid (quadratic: dense at the leading edge) shared by every part, so the surface vertices of a
  // 'front' panel coincide with those of a neighbouring 'full' panel and the seams can be welded smooth. The
  // grid points behind the hinge collapse onto it, so the loop length never depends on the hinge fraction
  // (which varies along a tapered panel with a straight hinge) and rings stay in lockstep.
  const grid = (k: number) => Math.pow(1 - k / n, 2);
  const xmax = part === 'front' ? f : 1;
  pts.push(up(xmax));
  if (part === 'front') pts.push(up(xmax));
  const inner: number[] = [];
  for (let k = 1; k <= n; k++) inner.push(Math.min(grid(k), xmax));
  for (const x of inner) pts.push(up(x));                          // upper surface to the leading edge (last item, x = 0)
  for (let i = inner.length - 2; i >= 0; i--) pts.push(lo(inner[i])); // lower surface back from the leading edge
  pts.push(lo(xmax));
  if (part === 'front') pts.push({ ...lo(xmax), flat: true });
  pts.push({ ...up(xmax), u: part === 'front' ? 0.5 - 0.5 * xmax : 1, flat: part === 'front' });
  return pts;
}

export interface PanelOptions {
  z0: number;
  z1: number;
  segments: number;
  part: WingPart;
  /** hinge line x in the wing frame (constant -> straight hinge); required for front/rear parts */
  hingeX?: number;
  /** gap between a rear part's nose and the hinge face */
  gap?: number;
  /** flat caps at the ends: fill the given profile region (the rear region at a notch wall, full at a stub) */
  capStart?: WingPart;
  capEnd?: WingPart;
  /** elliptical tip rounding appended after z1 (length along the span) */
  tipRound?: number;
  /** points per surface */
  n?: number;
  /** texture v of span station z (default z / span) */
  vOf?: (z: number) => number;
}

/** vertex colour of the flat faces inside a hinge gap (multiplies the paint so the gap reads as a dark line) */
const HINGE_SHADE = 0.22;

/**
 * Lofted wing panel along +Z in the wing frame (origin at the root 30% chord point, leading edge toward +X).
 * UV: u chordwise (0 trailing edge, 0.5 leading edge, 1 trailing edge under), v spanwise fraction. A `color`
 * attribute is white except on the hinge-gap faces, which are shaded dark (use a material with vertexColors).
 */
export function wingPanel(spec: WingSpec, o: PanelOptions): THREE.BufferGeometry {
  const camber = spec.camber ?? 0.02;
  const n = o.n ?? 12;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [], col: number[] = [];
  const rings: { z: number; scale: number }[] = [];
  for (let i = 0; i <= o.segments; i++) rings.push({ z: o.z0 + (o.z1 - o.z0) * (i / o.segments), scale: 1 });
  if (o.tipRound && o.tipRound > 0) {
    const K = 6;
    for (let k = 1; k <= K; k++) {
      const phi = (k / K) * Math.PI / 2;
      rings.push({ z: o.z1 + o.tipRound * Math.sin(phi), scale: Math.max(Math.cos(phi), 0.02) });
    }
  }
  const hingeFraction = (z: number) => {
    const chord = wingChord(spec, z), xle = wingXLE(spec, z);
    return o.hingeX !== undefined ? (xle - o.hingeX) / chord : 0.75;
  };
  // the profile at span station z for a region: a rear part sits `gap` behind the hinge with its nose rolled
  // forward into the cove; rings and caps must use the same loop or the cap fans stick out into the gap
  const loopAt = (z: number, region: WingPart): ProfilePt[] => {
    const chord = wingChord(spec, z), f = hingeFraction(z);
    if (region === 'rear' && o.part === 'rear') {
      const g = (o.gap ?? 0.015) / chord;
      return profileLoop('rear', f + g, spec.thickness, camber, n, spec.te, g * 0.55);
    }
    // (a 'rear' cap on a fixed panel is the notch's end wall: it fills the cove from the hinge face back)
    return profileLoop(region, f, spec.thickness, camber, n, spec.te);
  };
  let P = 0;
  const place = (p: ProfilePt, z: number, zPlan: number, scale: number, out: number[]) => {
    const chord = wingChord(spec, zPlan), xle = wingXLE(spec, zPlan);
    const tw = spec.twist * (zPlan / spec.span);
    const px = 0.5 + (p.x - 0.5) * scale, py = p.y * scale;
    const lx = (px - 0.3) * chord, ly = py * chord;
    const c = Math.cos(tw), s = Math.sin(tw);
    // positive twist raises the leading edge
    const rx = lx * c + ly * s, ry = -lx * s + ly * c;
    out.push(-rx + (xle - 0.3 * chord), Math.tan(spec.dihedral) * z + ry, z);
  };
  const vOf = o.vOf ?? ((z: number) => Math.min(1, z / spec.span));
  for (const r of rings) {
    const zPlan = Math.min(r.z, o.z1);
    const loop = loopAt(zPlan, o.part);
    P = loop.length;
    for (const p of loop) {
      place(p, r.z, zPlan, r.scale, pos);
      const v = vOf(Math.min(r.z, o.z1));
      // flat gap faces sample one plain spot of the paint (their u would otherwise sweep the whole chord)
      if (p.flat) { const s = p.shade ?? HINGE_SHADE; uv.push(0.02, v); col.push(s, s, s); }
      else { uv.push(p.u, v); col.push(1, 1, 1); }
    }
  }
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < P - 1; j++) {
      const a = i * P + j, b = a + P;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  // caps: flat fans over a profile region at an end station
  const cap = (z: number, region: WingPart, facingPlusZ: boolean) => {
    const loop = loopAt(z, region);
    const base = pos.length / 3;
    const tmp: number[] = [];
    for (const p of loop) place(p, z, z, 1, tmp);
    let cx = 0, cy = 0;
    const m = loop.length - 1;
    for (let k = 0; k < m; k++) { cx += tmp[k * 3]; cy += tmp[k * 3 + 1]; }
    // the end wall of a notch (a cap over the rear region of a fixed panel) is the rib face inside the gap: shaded
    // like the hinge face so the slot reads dark to its ends
    const capShade = o.part !== 'rear' && region === 'rear' ? HINGE_SHADE : 1;
    pos.push(cx / m, cy / m, z); uv.push(0.02, vOf(z)); col.push(capShade, capShade, capShade);
    for (let k = 0; k < m; k++) { pos.push(tmp[k * 3], tmp[k * 3 + 1], tmp[k * 3 + 2]); uv.push(capShade < 1 ? 0.02 : loop[k].u, vOf(z)); col.push(capShade, capShade, capShade); }
    // the loop runs clockwise seen from +Z (trailing edge -> forward along the top -> back along the bottom)
    for (let k = 0; k < m; k++) {
      const a = base + 1 + k, b = base + 1 + ((k + 1) % m);
      if (facingPlusZ) idx.push(base, b, a);
      else idx.push(base, a, b);
    }
  };
  if (o.capStart) cap(o.z0, o.capStart, false);
  if (o.capEnd) cap(o.z1, o.capEnd, true);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * Weld coincident vertices (same position, uv and colour) and recompute smooth normals over the welded mesh.
 * Merged panels that share their surface vertices shade continuously; deliberately duplicated corners (hinge
 * faces, chines) keep their hard edge because their uv / colour differ.
 */
export function weldSmooth(geo: THREE.BufferGeometry, tolerance = 1e-4): THREE.BufferGeometry {
  geo.deleteAttribute('normal');
  const g = mergeVertices(geo, tolerance);
  g.computeVertexNormals();
  return g;
}
