import * as THREE from 'three';
import { arcSpread, sectionAt, sectionPoint, type Section } from './loft';

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

/**
 * Float hull loft with hard chine and keel lines: every station's ring runs deck centre -> rounded deck edge and
 * side down to the chine (duplicated vertex) -> V bottom to the keel (duplicated) -> mirrored. Texture v is fixed
 * per ring vertex (deck 0-0.12, side 0.12-0.22, chine 0.22, keel 0.5, port side mirrored) so the float paint
 * can put its deck, waterline and keel bands exactly on those features. Stations run bow -> stern along -X.
 */
export function floatHull(stations: FloatStation[], deckSegs = 8, bottomSegs = 5): THREE.BufferGeometry {
  const V_CHINE = 0.22;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const ring: { y: number; z: number; v: number }[] = [];
  const rows: { pos: number[]; x: number }[] = [];
  const ringOf = (s: FloatStation) => {
    ring.length = 0;
    const n = s.n ?? 3.0, vee = s.vee ?? 1.15;
    const half: { y: number; z: number; v: number }[] = [];
    // deck + side: superellipse upper half from the crown (t = 0) to the chine (t = 0.25), by arc length
    const sec: Section = { x: s.x, yc: s.yc, w: s.w, top: s.top, bot: s.bot, n };
    const ts: number[] = [];
    arcSpread(sec, 0, 0.25, deckSegs, ts);
    const p: [number, number] = [0, 0];
    half.push({ y: s.yc + s.top, z: 0, v: 0 });
    for (let k = 0; k < ts.length; k++) {
      sectionPoint(sec, ts[k], p);
      half.push({ y: p[0], z: p[1], v: V_CHINE * ((k + 1) / deckSegs) });
    }
    // chine duplicate, then the V bottom to the keel
    half.push({ y: s.yc, z: s.w, v: V_CHINE });
    for (let k = 1; k <= bottomSegs; k++) {
      const f = k / bottomSegs; // 0 at the chine .. 1 at the keel
      const z = s.w * (1 - f);
      half.push({ y: s.yc - s.bot * (1 - Math.pow(1 - f, vee)), z, v: V_CHINE + (0.5 - V_CHINE) * f });
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
  const splitRows: number[] = [];
  for (let i = 0; i < stations.length; i++) {
    const s = stations[i];
    if (i > 0) dist += Math.abs(s.x - stations[i - 1].x);
    emitRow(s, dist / Math.max(total, 1e-6));
    if (s.split) { splitRows.push(rows.length - 1); emitRow(s, dist / Math.max(total, 1e-6)); }
  }
  const R = rows[0].pos.length;
  for (let i = 0; i < rows.length - 1; i++) {
    if (splitRows.includes(i)) continue; // no quads between the two copies of a split station
    const a = rows[i].pos, b = rows[i + 1].pos;
    for (let j = 0; j < R - 1; j++) {
      // stations run along -X and the ring is counter-clockwise seen from +X: (a[j], b[j], a[j+1]) winds outward
      idx.push(a[j], b[j], a[j + 1], a[j + 1], b[j], b[j + 1]);
    }
  }
  // end caps: fans facing away from the body (the ring is counter-clockwise seen from +X)
  const cap = (row: number[], x: number, nx: number) => {
    const c = pos.length / 3;
    let cy = 0;
    for (let j = 0; j < R - 1; j++) cy += pos[row[j] * 3 + 1];
    pos.push(x, cy / (R - 1), 0); uv.push(nx > 0 ? 0 : 1, 0.5);
    for (let j = 0; j < R - 1; j++) {
      if (nx > 0) idx.push(c, row[j], row[j + 1]);
      else idx.push(c, row[j + 1], row[j]);
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
