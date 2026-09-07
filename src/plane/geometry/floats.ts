import * as THREE from 'three';
import { sectionAt, sectionPoint, type Section } from './loft';

/** Float hull station: chine height `yc`, half beam `w` at the chine, deck `top` above it, keel `bot` below. */
export interface FloatStation {
  x: number;
  yc: number;
  w: number;
  top: number;
  bot: number;
  /** deck / side roundness (superellipse exponent of the upper half; higher = squarer deck edge) */
  n?: number;
  /** bottom convexity exponent (1 = straight V from the chine to the keel) */
  vee?: number;
  /** emit this station twice with no quads between the copies: a hard edge across the hull (the step) */
  split?: boolean;
}

/** texture v of the hull's features (starboard side; port is mirrored): deck edge, chine, keel */
export const FLOAT_V = { edge: 0.12, chine: 0.22, keel: 0.5 } as const;

/**
 * Float hull loft with hard chine and keel lines: every station's ring runs deck centre -> rounded deck edge and
 * side down to the chine (duplicated vertex) -> V bottom to the keel (duplicated) -> mirrored. The upper half is
 * sampled with extra vertices where it turns (the rolled deck edge of a boxy EDO section is a 10 cm radius between
 * a flat deck and a vertical side: spaced by arc length alone it came out as two 45-degree facets), and texture v is
 * fixed per feature (deck 0-0.12 to the edge, side 0.12-0.22 to the chine, keel 0.5, port side mirrored) so the
 * float paint puts its deck, boot-top and keel bands exactly on those features at every station. A split station
 * (the step) is emitted as a vertical face between its two copies with its own vertices, so the step is closed and
 * hard-edged. Stations run bow -> stern along -X.
 */
export function floatHull(stations: FloatStation[], deckSegs = 14, bottomSegs = 5): THREE.BufferGeometry {
  const { edge: V_EDGE, chine: V_CHINE, keel: V_KEEL } = FLOAT_V;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const ring: { y: number; z: number; v: number }[] = [];
  const rows: { pos: number[]; x: number }[] = [];
  const ringOf = (s: FloatStation) => {
    ring.length = 0;
    const n = s.n ?? 3.0, vee = s.vee ?? 1.15;
    const half: { y: number; z: number; v: number }[] = [];
    // deck + side: superellipse upper quarter from the crown (t = 0) to the chine (t = 0.25), sampled finely; the
    // vertices are then spaced by arc length plus 0.3 m per radian of turning, so the rolled edge gets its share
    const sec: Section = { x: s.x, yc: s.yc, w: s.w, top: s.top, bot: s.bot, n };
    const N = 160, TURN = 0.3;
    const sy: number[] = [], sz: number[] = [], arc = [0], wgt = [0];
    const p: [number, number] = [0, 0];
    let edgeArc = -1, prevAng = 0;
    for (let i = 0; i <= N; i++) {
      sectionPoint(sec, 0.25 * (i / N), p);
      sy.push(p[0]); sz.push(p[1]);
      if (i > 0) {
        const dy = sy[i] - sy[i - 1], dz = sz[i] - sz[i - 1], ds = Math.hypot(dy, dz);
        const ang = Math.atan2(-dy, dz); // 0 along the flat deck .. pi/2 straight down the side
        arc.push(arc[i - 1] + ds);
        wgt.push(wgt[i - 1] + ds + TURN * Math.abs(ang - (i > 1 ? prevAng : ang)));
        if (edgeArc < 0 && ang >= Math.PI / 4) edgeArc = arc[i]; // the deck edge: where the skin turns past 45 degrees
        prevAng = ang;
      }
    }
    const total = arc[N], edgeA = edgeArc < 0 ? total * 0.5 : edgeArc;
    const vOf = (a: number) => (a <= edgeA ? V_EDGE * (a / Math.max(edgeA, 1e-6)) : V_EDGE + (V_CHINE - V_EDGE) * ((a - edgeA) / Math.max(total - edgeA, 1e-6)));
    half.push({ y: sy[0], z: sz[0], v: 0 });
    let i = 1;
    for (let k = 1; k < deckSegs; k++) {
      const target = wgt[N] * (k / deckSegs);
      while (i < N && wgt[i] < target) i++;
      const f = (target - wgt[i - 1]) / Math.max(wgt[i] - wgt[i - 1], 1e-9);
      const a = arc[i - 1] + (arc[i] - arc[i - 1]) * f;
      half.push({ y: sy[i - 1] + (sy[i] - sy[i - 1]) * f, z: sz[i - 1] + (sz[i] - sz[i - 1]) * f, v: vOf(a) });
    }
    half.push({ y: s.yc, z: s.w, v: V_CHINE });
    // chine duplicate, then the V bottom to the keel
    half.push({ y: s.yc, z: s.w, v: V_CHINE });
    for (let k = 1; k <= bottomSegs; k++) {
      const f = k / bottomSegs; // 0 at the chine .. 1 at the keel
      const z = s.w * (1 - f);
      half.push({ y: s.yc - s.bot * (1 - Math.pow(1 - f, vee)), z, v: V_CHINE + (V_KEEL - V_CHINE) * f });
    }
    for (const h of half) ring.push(h);
    // keel duplicate and the port side mirrored (bottom first, then deck) back to the crown
    for (let i = half.length - 1; i >= 0; i--) ring.push({ y: half[i].y, z: -half[i].z, v: 1 - half[i].v });
    return ring;
  };
  let total = 0;
  for (let i = 1; i < stations.length; i++) total += Math.abs(stations[i].x - stations[i - 1].x);
  let dist = 0;
  const emitRow = (s: FloatStation, u: number) => {
    const r = ringOf(s);
    const row: number[] = [];
    for (const q of r) { row.push(pos.length / 3); pos.push(s.x, q.y, q.z); uv.push(u, q.v); }
    rows.push({ pos: row, x: s.x });
  };
  // a split station is emitted four times: forebody end, the two rows of the step face, afterbody start; only
  // the face rows are joined to each other (so the step face has its own vertices and a hard edge all round)
  const noQuads = new Set<number>();
  for (let i = 0; i < stations.length; i++) {
    const s = stations[i];
    if (i > 0) dist += Math.abs(s.x - stations[i - 1].x);
    const u = dist / Math.max(total, 1e-6);
    emitRow(s, u);
    if (s.split && i + 1 < stations.length && stations[i + 1].split && stations[i + 1].x === s.x) {
      noQuads.add(rows.length - 1);
      emitRow(s, u); emitRow(stations[i + 1], u);
      noQuads.add(rows.length - 1);
      emitRow(stations[i + 1], u);
      i++;
    }
  }
  const R = rows[0].pos.length;
  for (let i = 0; i < rows.length - 1; i++) {
    if (noQuads.has(i)) continue;
    const a = rows[i].pos, b = rows[i + 1].pos;
    for (let j = 0; j < R - 1; j++) {
      // stations run along -X and the ring is counter-clockwise seen from +X: (a[j], b[j], a[j+1]) winds outward
      idx.push(a[j], b[j], a[j + 1], a[j + 1], b[j], b[j + 1]);
    }
  }
  // end caps (stem face, transom): fans over their own copy of the ring so the edge stays hard, facing away from
  // the body (the ring is counter-clockwise seen from +X)
  const cap = (row: number[], x: number, nx: number) => {
    const c = pos.length / 3;
    let cy = 0;
    for (let j = 0; j < R - 1; j++) cy += pos[row[j] * 3 + 1];
    pos.push(x, cy / (R - 1), 0); uv.push(nx > 0 ? 0 : 1, 0.5);
    const base = pos.length / 3;
    for (let j = 0; j < R; j++) { pos.push(pos[row[j] * 3], pos[row[j] * 3 + 1], pos[row[j] * 3 + 2]); uv.push(nx > 0 ? 0 : 1, 0.5); }
    for (let j = 0; j < R - 1; j++) {
      if (nx > 0) idx.push(c, base + j, base + j + 1);
      else idx.push(c, base + j + 1, base + j);
    }
  };
  cap(rows[0].pos, rows[0].x, 1);
  cap(rows[rows.length - 1].pos, rows[rows.length - 1].x, -1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // the crown vertex opens and closes each ring: give both copies one normal
  const nrm = g.getAttribute('normal') as THREE.BufferAttribute;
  for (const r of rows) {
    const a = r.pos[0], b = r.pos[R - 1];
    const n = new THREE.Vector3(nrm.getX(a) + nrm.getX(b), nrm.getY(a) + nrm.getY(b), nrm.getZ(a) + nrm.getZ(b)).normalize();
    nrm.setXYZ(a, n.x, n.y, n.z); nrm.setXYZ(b, n.x, n.y, n.z);
  }
  return g;
}

const asSections = (stations: FloatStation[]): Section[] => stations.map((f) => ({ x: f.x, yc: f.yc, w: f.w, top: f.top, bot: f.bot, n: f.n }));

/**
 * Deck height of the hull at station x, `dz` off the float's own centreline: the deck is the crowned upper half of
 * the section, so a fitting 20 cm off centre sits ~1 cm lower than one on the crown line.
 */
export function deckHeight(stations: FloatStation[], x: number, dz = 0): number {
  const s = sectionAt(asSections(stations), x);
  const n = s.n ?? 3.0, f = Math.min(Math.abs(dz) / s.w, 1);
  return s.yc + s.top * Math.pow(Math.max(1 - Math.pow(f, n), 0), 1 / n);
}

/** Chine height and half beam of the hull at station x. */
export function chineAt(stations: FloatStation[], x: number): { y: number; w: number } {
  const s = sectionAt(asSections(stations), x);
  return { y: s.yc, w: s.w };
}

/**
 * Streamlined strut between a and b: a symmetric airfoil section (NACA 00xx thickness law, chord `chord`, thickness
 * `thick`) lofted along the strut axis with the chord in the plane of the axis and the airflow (`flow`, +X unless
 * the strut is parallel to it), the axis at 40 % chord. Either end can flare into a root fairing (`flareA`/`flareB`
 * = section scale at the end, blending back to 1 over `cuff` metres along a concave fillet curve). Smooth normals
 * round the nose, a hard trailing edge (the ring's first and last vertices share the TE position), flat end caps.
 */
export function airfoilStrutGeometry(a: THREE.Vector3, b: THREE.Vector3, chord: number, thick: number, o: { flow?: THREE.Vector3; flareA?: number; flareB?: number; cuff?: number; segs?: number } = {}): THREE.BufferGeometry {
  const axis = b.clone().sub(a), L = axis.length();
  axis.normalize();
  let flow = (o.flow ?? new THREE.Vector3(1, 0, 0)).clone();
  flow.addScaledVector(axis, -flow.dot(axis));
  if (flow.lengthSq() < 1e-6) flow = new THREE.Vector3(0, 0, 1).addScaledVector(axis, -axis.z);
  flow.normalize();
  const side = new THREE.Vector3().crossVectors(axis, flow).normalize();
  // section outline: TE -> upper surface -> LE -> lower surface -> TE, cosine-spaced along the chord
  const segs = o.segs ?? 9, prof: [number, number][] = [];
  const t = thick / chord;
  const yt = (x: number) => 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x * x * x - 0.1036 * x * x * x * x);
  for (let i = 0; i <= segs; i++) { const x = 0.5 * (1 + Math.cos(Math.PI * (i / segs))); prof.push([x, yt(x)]); }   // 1 -> 0 (upper)
  for (let i = 1; i <= segs; i++) { const x = 0.5 * (1 - Math.cos(Math.PI * (i / segs))); prof.push([x, -yt(x)]); }  // 0 -> 1 (lower)
  const R = prof.length; // ring vertices; prof[0] and prof[R-1] share the TE position
  // stations along the axis: the flared cuffs get four stations each on a concave fillet
  const cuff = Math.min(o.cuff ?? 0.12, L * 0.3);
  const st: { t: number; s: number }[] = [];
  const fillet = (f: number) => 1 - Math.pow(1 - f, 2.2); // 0 at the fitting .. 1 where the cuff meets the plain strut
  const fA = o.flareA ?? 1, fB = o.flareB ?? 1;
  if (fA !== 1) for (const f of [0, 0.3, 0.6, 1]) st.push({ t: (cuff / L) * f, s: 1 + (fA - 1) * (1 - fillet(f)) }); else st.push({ t: 0, s: 1 });
  if (fB !== 1) for (const f of [1, 0.6, 0.3, 0]) st.push({ t: 1 - (cuff / L) * f, s: 1 + (fB - 1) * (1 - fillet(f)) }); else st.push({ t: 1, s: 1 });
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const P = (ti: number, j: number, out: THREE.Vector3) => {
    const { t: tt, s } = st[ti];
    const [c, h] = prof[j];
    return out.copy(a).addScaledVector(axis, tt * L).addScaledVector(flow, (c - 0.4) * chord * s).addScaledVector(side, h * chord * s);
  };
  const v = new THREE.Vector3();
  for (let i = 0; i < st.length; i++) for (let j = 0; j < R; j++) { P(i, j, v); pos.push(v.x, v.y, v.z); uv.push(st[i].t, j / (R - 1)); }
  for (let i = 0; i < st.length - 1; i++) for (let j = 0; j < R - 1; j++) {
    const p0 = i * R + j, p1 = p0 + R;
    // (flow, side, axis) is right-handed and the ring runs TE -> upper (+side) -> LE -> lower: counter-clockwise
    // seen from +axis, so (p0, p0+1, p1) winds outward
    idx.push(p0, p0 + 1, p1, p0 + 1, p1 + 1, p1);
  }
  // end caps with their own vertices (hard edge), facing away from the strut
  const cap = (ti: number, outward: number) => {
    const c = pos.length / 3;
    const ctr = a.clone().addScaledVector(axis, st[ti].t * L);
    pos.push(ctr.x, ctr.y, ctr.z); uv.push(st[ti].t, 0.5);
    const base = pos.length / 3;
    for (let j = 0; j < R; j++) { P(ti, j, v); pos.push(v.x, v.y, v.z); uv.push(st[ti].t, j / (R - 1)); }
    for (let j = 0; j < R - 1; j++) {
      if (outward > 0) idx.push(c, base + j, base + j + 1);
      else idx.push(c, base + j + 1, base + j);
    }
  };
  cap(0, -1);
  cap(st.length - 1, 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * Spray rail: the flat strip riveted along a float's forebody chine that throws the bow wave down and out. Runs
 * from x0 (bow end) to x1 (the step) on the float's +Z side, buried 4 mm into the chine, standing `width` out with
 * its outer edge `droop` lower, `thick` thick; mirror it (scale z -1) for the other side of the hull.
 */
export function sprayRailGeometry(stations: FloatStation[], x0: number, x1: number, width: number, droop: number, thick: number, segs = 12): THREE.BufferGeometry {
  const pos: number[] = [], idx: number[] = [];
  const quad = (a: number, b: number, c: number, d: number) => idx.push(a, b, c, a, c, d);
  // per station: inner-top, outer-top, outer-bottom, inner-bottom (4 vertices, the top and bottom faces share none)
  for (let i = 0; i <= segs; i++) {
    const x = x0 + (x1 - x0) * (i / segs);
    const c = chineAt(stations, x);
    const zi = c.w - 0.004, zo = c.w + width, yi = c.y - 0.002, yo = c.y - droop;
    pos.push(x, yi, zi, x, yo, zo, x, yo - thick, zo, x, yi - thick, zi);
  }
  for (let i = 0; i < segs; i++) {
    const a = i * 4, b = a + 4; // a: this station (bow side), b: the next one aft
    quad(a, b, b + 1, a + 1);         // top face (+Y): bow-inner, aft-inner, aft-outer, bow-outer
    quad(a + 1, b + 1, b + 2, a + 2); // outer edge (+Z)
    quad(a + 3, a + 2, b + 2, b + 3); // bottom face (-Y)
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((segs + 1) * 8).fill(0), 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
