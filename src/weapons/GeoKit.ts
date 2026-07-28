import * as THREE from 'three';
import { mergeGeometries } from '../world/Level';

/**
 * Geometry primitives for the first-person weapon.
 *
 * A view model is looked at more than any other object in the game, so the
 * primitives it is built from have to hold up at 20 cm from the camera. The
 * three things that matter at that distance are: edges must be chamfered
 * (a perfectly sharp edge has no specular highlight and reads as untextured
 * cardboard), shading seams must not appear where two primitives meet, and
 * texel density must be consistent across parts.
 *
 * Everything here therefore carries analytic normals rather than relying on
 * `computeVertexNormals`, which averages across the duplicated vertices that
 * primitive generators emit and leaves visible facets along every rounded
 * corner.
 */

// ---------------------------------------------------------------- transforms

export interface Xform {
  x?: number;
  y?: number;
  z?: number;
  /** Euler angles, applied in YXZ order. */
  rx?: number;
  ry?: number;
  rz?: number;
  sx?: number;
  sy?: number;
  sz?: number;
  /** Uniform scale, multiplied into the per-axis values. */
  s?: number;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler(0, 0, 0, 'YXZ');
const _v = new THREE.Vector3();
const _sc = new THREE.Vector3();

function matrixOf(t: Xform | undefined): THREE.Matrix4 {
  if (!t) return _m.identity();
  const s = t.s ?? 1;
  _e.set(t.rx ?? 0, t.ry ?? 0, t.rz ?? 0, 'YXZ');
  _q.setFromEuler(_e);
  _sc.set((t.sx ?? 1) * s, (t.sy ?? 1) * s, (t.sz ?? 1) * s);
  return _m.compose(_v.set(t.x ?? 0, t.y ?? 0, t.z ?? 0), _q, _sc);
}

/** Reverses triangle winding, for geometry mirrored by a negative scale. */
function flipWinding(geo: THREE.BufferGeometry): void {
  const idx = geo.getIndex();
  if (!idx) return;
  const a = idx.array as Uint16Array | Uint32Array;
  for (let i = 0; i < a.length; i += 3) {
    const t = a[i];
    a[i] = a[i + 2];
    a[i + 2] = t;
  }
  idx.needsUpdate = true;
}

/**
 * Accumulates transformed copies of source primitives into one merged
 * geometry, and owns the lifetime of the sources.
 *
 * The previous build code disposed sources by hand at the end of a hundred-line
 * function, which meant every new part was a chance to leak one. Here a source
 * handed to `add` is disposed by `build`, once, whether it was used once or
 * forty times.
 */
export class GeoBatch {
  private readonly parts: THREE.BufferGeometry[] = [];
  private readonly sources = new Set<THREE.BufferGeometry>();

  /** Adds a transformed copy. The batch takes ownership of `geo`. */
  add(geo: THREE.BufferGeometry, t?: Xform): this {
    this.sources.add(geo);
    const g = geo.clone();
    const m = matrixOf(t);
    g.applyMatrix4(m);
    if (m.determinant() < 0) flipWinding(g);
    this.parts.push(g);
    return this;
  }

  /** Adds a transformed copy using an explicit matrix. */
  addMatrix(geo: THREE.BufferGeometry, m: THREE.Matrix4): this {
    this.sources.add(geo);
    const g = geo.clone();
    g.applyMatrix4(m);
    if (m.determinant() < 0) flipWinding(g);
    this.parts.push(g);
    return this;
  }

  /** Adds a copy and its mirror image across the YZ plane. */
  addMirrored(geo: THREE.BufferGeometry, t?: Xform): this {
    this.add(geo, t);
    const mirrored: Xform = { ...t, x: -(t?.x ?? 0), sx: -(t?.sx ?? 1) };
    // Mirroring a rotated part has to negate the rotations that would
    // otherwise send it the wrong way round.
    mirrored.ry = -(t?.ry ?? 0);
    mirrored.rz = -(t?.rz ?? 0);
    return this.add(geo, mirrored);
  }

  /** Adds the same part repeated along an axis. */
  addRepeat(
    geo: THREE.BufferGeometry,
    count: number,
    base: Xform,
    step: { x?: number; y?: number; z?: number },
  ): this {
    for (let i = 0; i < count; i++) {
      this.add(geo, {
        ...base,
        x: (base.x ?? 0) + (step.x ?? 0) * i,
        y: (base.y ?? 0) + (step.y ?? 0) * i,
        z: (base.z ?? 0) + (step.z ?? 0) * i,
      });
    }
    return this;
  }

  get empty(): boolean {
    return this.parts.length === 0;
  }

  /**
   * Merges and returns the batch. `tileMetres` drives the generated box UVs so
   * every part in the weapon shares one texel density regardless of its size.
   */
  build(tileMetres = 0.35): THREE.BufferGeometry {
    const merged = mergeGeometries(this.parts) ?? new THREE.BufferGeometry();
    for (const p of this.parts) p.dispose();
    for (const s of this.sources) s.dispose();
    this.parts.length = 0;
    this.sources.clear();
    applyBoxUV(merged, tileMetres);
    merged.computeBoundingSphere();
    return merged;
  }
}

/**
 * Triplanar-style UVs chosen per vertex from the dominant normal axis.
 *
 * Every part is unwrapped in the same world scale, so a 2 mm screw head and a
 * 200 mm receiver get the same grain size out of the shared material. Per-face
 * 0..1 box UVs — what the primitive generators give you — stretch the same
 * texture over both and the difference is glaring on adjacent parts.
 */
export function applyBoxUV(geo: THREE.BufferGeometry, tileMetres: number): void {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute | undefined;
  const nor = geo.getAttribute('normal') as THREE.BufferAttribute | undefined;
  if (!pos || !nor) return;
  const uv = new Float32Array(pos.count * 2);
  const inv = 1 / Math.max(tileMetres, 1e-4);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const nz = Math.abs(nor.getZ(i));
    let u: number;
    let v: number;
    if (nx >= ny && nx >= nz) {
      u = z;
      v = y;
    } else if (ny >= nz) {
      u = x;
      v = z;
    } else {
      u = x;
      v = y;
    }
    uv[i * 2] = u * inv;
    uv[i * 2 + 1] = v * inv;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

// ------------------------------------------------------------- rounded box --

/**
 * A box with genuinely rounded edges and analytic normals.
 *
 * Built by projecting a subdivided cube onto the rounded-box distance field:
 * every vertex is clamped into the inner core and pushed back out along the
 * offset direction, which is also exactly the surface normal. That gives
 * continuous shading round every corner with no seam, which a
 * `computeVertexNormals` pass cannot because the generator emits three
 * separate vertices at each corner.
 */
export function roundedBox(
  w: number,
  h: number,
  d: number,
  r: number,
  seg = 2,
): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(w, h, d, seg, seg, seg);
  const hx = w / 2;
  const hy = h / 2;
  const hz = d / 2;
  const rr = Math.max(0, Math.min(r, hx * 0.999, hy * 0.999, hz * 0.999));
  if (rr <= 1e-6) return geo;
  const cx = hx - rr;
  const cy = hy - rr;
  const cz = hz - rr;
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const nor = geo.getAttribute('normal') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const qx = Math.max(-cx, Math.min(cx, x));
    const qy = Math.max(-cy, Math.min(cy, y));
    const qz = Math.max(-cz, Math.min(cz, z));
    const dx = x - qx;
    const dy = y - qy;
    const dz = z - qz;
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-9) continue;
    const s = rr / len;
    pos.setXYZ(i, qx + dx * s, qy + dy * s, qz + dz * s);
    nor.setXYZ(i, dx / len, dy / len, dz / len);
  }
  pos.needsUpdate = true;
  nor.needsUpdate = true;
  return geo;
}

/** A rounded box whose corner radius is half its smallest dimension: a slot. */
export function stadium(w: number, h: number, d: number, seg = 2): THREE.BufferGeometry {
  return roundedBox(w, h, d, Math.min(w, h, d) * 0.5, seg);
}

/**
 * A rounded box that changes cross-section along Z.
 *
 * Nothing organic is a constant prism, and finger segments least of all: a
 * phalanx is a quarter narrower at the joint than at its base. Normals are
 * carried through the taper with the inverse transpose of the map's Jacobian
 * rather than recomputed, which keeps the rounded corners seamless.
 */
export function taperedBox(
  wBack: number,
  hBack: number,
  wFront: number,
  hFront: number,
  d: number,
  r: number,
  seg = 2,
): THREE.BufferGeometry {
  const geo = roundedBox(Math.max(wBack, wFront), Math.max(hBack, hFront), d, r, seg);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const nor = geo.getAttribute('normal') as THREE.BufferAttribute;
  const w0 = wBack / Math.max(wBack, wFront);
  const w1 = wFront / Math.max(wBack, wFront);
  const h0 = hBack / Math.max(hBack, hFront);
  const h1 = hFront / Math.max(hBack, hFront);
  const halfD = d / 2;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const t = THREE.MathUtils.clamp((z + halfD) / d, 0, 1);
    const a = w0 + (w1 - w0) * t;
    const b = h0 + (h1 - h0) * t;
    const da = (w1 - w0) / d;
    const db = (h1 - h0) / d;
    pos.setXYZ(i, x * a, y * b, z);
    const nx = nor.getX(i) / a;
    const ny = nor.getY(i) / b;
    const nz = nor.getZ(i) - (nor.getX(i) * x * da) / a - (nor.getY(i) * y * db) / b;
    const l = Math.hypot(nx, ny, nz) || 1;
    nor.setXYZ(i, nx / l, ny / l, nz / l);
  }
  pos.needsUpdate = true;
  nor.needsUpdate = true;
  return geo;
}

// ---------------------------------------------------------------- revolve ---

export interface Contour {
  /** Radius from the Z axis. */
  r: number;
  /** Position along Z. */
  z: number;
  /** Share normals with the neighbouring band instead of creasing. */
  smooth?: boolean;
}

/**
 * Surface of revolution about the Z axis, from a contour traversed so the
 * material stays on one side.
 *
 * Start at the axis on the front face, run outward, back along the body, and
 * inward again at the rear; the outward normal is then always the contour
 * tangent turned a quarter turn. Because that rule is direction-based rather
 * than sign-based it handles bores for free: a band that travels forward at a
 * small radius comes out with inward-facing normals, which is precisely a
 * drilled hole.
 *
 * This replaces stacks of `CylinderGeometry`, which cannot express a barrel
 * step, a crown chamfer or a counterbore without a seam at every joint.
 */
export function revolve(contour: Contour[], seg = 16): THREE.BufferGeometry {
  const n = contour.length;
  if (n < 2) return new THREE.BufferGeometry();

  const bandNr: number[] = [];
  const bandNa: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dr = contour[i + 1].r - contour[i].r;
    const dz = contour[i + 1].z - contour[i].z;
    const l = Math.hypot(dr, dz) || 1;
    bandNr.push(dz / l);
    bandNa.push(-dr / l);
  }

  // Normal at contour point `i` as seen from band `b`; a point flagged smooth
  // averages the two bands that meet there so the joint shades continuously.
  const normalAt = (i: number, b: number): [number, number] => {
    if (contour[i].smooth && i > 0 && i < n - 1) {
      const nr = bandNr[i - 1] + bandNr[i];
      const na = bandNa[i - 1] + bandNa[i];
      const l = Math.hypot(nr, na) || 1;
      return [nr / l, na / l];
    }
    return [bandNr[b], bandNa[b]];
  };

  const ringVerts = seg + 1;
  const bands = n - 1;
  const vertexCount = bands * 2 * ringVerts;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const indices: number[] = [];

  let vi = 0;
  for (let b = 0; b < bands; b++) {
    for (let end = 0; end < 2; end++) {
      const ci = b + end;
      const [nr, na] = normalAt(ci, b);
      const { r, z } = contour[ci];
      for (let k = 0; k <= seg; k++) {
        const a = (k / seg) * Math.PI * 2;
        const c = Math.cos(a);
        const s = Math.sin(a);
        positions[vi * 3] = r * c;
        positions[vi * 3 + 1] = r * s;
        positions[vi * 3 + 2] = z;
        normals[vi * 3] = nr * c;
        normals[vi * 3 + 1] = nr * s;
        normals[vi * 3 + 2] = na;
        vi++;
      }
    }
    const a0 = b * 2 * ringVerts;
    const b0 = a0 + ringVerts;
    for (let k = 0; k < seg; k++) {
      indices.push(a0 + k, a0 + k + 1, b0 + k + 1);
      indices.push(a0 + k, b0 + k + 1, b0 + k);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setIndex(indices);
  return geo;
}

/** Convenience: a cylinder along Z with chamfered ends. */
export function rod(
  radius: number,
  zFront: number,
  zBack: number,
  chamfer = radius * 0.18,
  seg = 12,
): THREE.BufferGeometry {
  const c = Math.min(chamfer, (zBack - zFront) * 0.4);
  return revolve(
    [
      { r: 0, z: zFront },
      { r: radius - c, z: zFront },
      { r: radius, z: zFront + c },
      { r: radius, z: zBack - c },
      { r: radius - c, z: zBack },
      { r: 0, z: zBack },
    ],
    seg,
  );
}

// ---------------------------------------------------------------- extrude ---

/**
 * Prism swept along Z from a closed 2D section.
 *
 * The section must wind counter-clockwise seen from +Z. Side faces are flat
 * shaded unless `smooth` is set, which is what a machined octagonal handguard
 * wants: crisp facets, not a soft tube.
 */
export function extrude(
  section: Array<[number, number]>,
  zFront: number,
  zBack: number,
  opts: {
    capFront?: boolean;
    capBack?: boolean;
    smooth?: boolean;
    /** Side faces to leave open, indexed by their starting section point. */
    skipEdges?: number[];
  } = {},
): THREE.BufferGeometry {
  const { capFront = true, capBack = true, smooth = false } = opts;
  const skip = new Set(opts.skipEdges ?? []);
  const n = section.length;
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  const edgeNormal = (i: number): [number, number] => {
    const [x0, y0] = section[i];
    const [x1, y1] = section[(i + 1) % n];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const l = Math.hypot(dx, dy) || 1;
    return [dy / l, -dx / l];
  };

  if (smooth) {
    // One ring, normals averaged from the two edges meeting at each corner.
    const base = positions.length / 3;
    for (let i = 0; i < n; i++) {
      const [pnx, pny] = edgeNormal((i - 1 + n) % n);
      const [nnx, nny] = edgeNormal(i);
      const ax = pnx + nnx;
      const ay = pny + nny;
      const l = Math.hypot(ax, ay) || 1;
      for (const z of [zFront, zBack]) {
        positions.push(section[i][0], section[i][1], z);
        normals.push(ax / l, ay / l, 0);
      }
    }
    for (let i = 0; i < n; i++) {
      if (skip.has(i)) continue;
      const a = base + i * 2;
      const b = base + ((i + 1) % n) * 2;
      indices.push(a, b, b + 1, a, b + 1, a + 1);
    }
  } else {
    for (let i = 0; i < n; i++) {
      if (skip.has(i)) continue;
      const [nx, ny] = edgeNormal(i);
      const [x0, y0] = section[i];
      const [x1, y1] = section[(i + 1) % n];
      const base = positions.length / 3;
      positions.push(x0, y0, zFront, x1, y1, zFront, x1, y1, zBack, x0, y0, zBack);
      for (let k = 0; k < 4; k++) normals.push(nx, ny, 0);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }

  const cap = (z: number, nz: number): void => {
    let cx = 0;
    let cy = 0;
    for (const p of section) {
      cx += p[0];
      cy += p[1];
    }
    cx /= n;
    cy /= n;
    const base = positions.length / 3;
    positions.push(cx, cy, z);
    normals.push(0, 0, nz);
    for (let i = 0; i < n; i++) {
      positions.push(section[i][0], section[i][1], z);
      normals.push(0, 0, nz);
    }
    for (let i = 0; i < n; i++) {
      const a = base + 1 + i;
      const b = base + 1 + ((i + 1) % n);
      if (nz < 0) indices.push(base, b, a);
      else indices.push(base, a, b);
    }
  };
  if (capFront) cap(zFront, -1);
  if (capBack) cap(zBack, 1);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  return geo;
}

/** Rounded-rectangle section, for handguards and receiver bodies. */
export function roundRectSection(
  w: number,
  h: number,
  r: number,
  cornerSteps = 3,
): Array<[number, number]> {
  const hw = w / 2;
  const hh = h / 2;
  const rr = Math.min(r, hw, hh);
  const pts: Array<[number, number]> = [];
  const corners: Array<[number, number, number]> = [
    [hw - rr, hh - rr, 0],
    [-(hw - rr), hh - rr, Math.PI / 2],
    [-(hw - rr), -(hh - rr), Math.PI],
    [hw - rr, -(hh - rr), Math.PI * 1.5],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= cornerSteps; i++) {
      const a = a0 + (i / cornerSteps) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
  }
  return pts;
}

/** Regular n-gon section with a flat top and bottom, for a machined tube. */
export function polySection(w: number, h: number, sides = 8): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  const off = Math.PI / sides;
  for (let i = 0; i < sides; i++) {
    const a = off + (i / sides) * Math.PI * 2;
    pts.push([(Math.cos(a) * w) / 2, (Math.sin(a) * h) / 2]);
  }
  return pts;
}

// ------------------------------------------------------------------- rails --

/**
 * Optics rail. Deliberately *not* MIL-STD-1913 to the letter.
 *
 * It was, and the result is the clearest lesson in this file about the
 * difference between being correct and looking right. The real standard is a
 * 10.16 mm pitch with a 5.35 mm slot, so the surface alternates between tooth
 * and void every five millimetres. Held at arm's length in a 960-wide frame
 * that pitch lands on about eight pixels, and with a 4.8 mm tooth standing
 * over a flat-bottomed slot the top faces caught the key light while the slots
 * went to black — an eight-pixel bright blob, an eight-pixel dark blob, forty
 * times along the weapon. Reviewed independently, two people called it a
 * bicycle chain and a belt of ammunition. Nobody called it a rail.
 *
 * Three changes, all of them trading spec accuracy for legibility:
 *
 *  - The visible period is doubled to 20.3 mm by cutting a slot every second
 *    pitch. Thirty-odd pixels of period is comfortably above the frequency
 *    where a hard light/dark edge pair starts to beat against the pixel grid.
 *  - Tooth stand-off drops from 4.8 mm to 2.4 mm, which halves the depth of
 *    shadow a slot can hold. The slots stop being black.
 *  - Every tooth is a truncated pyramid rather than a box, so its ends are
 *    45-degree ramps. A ramp takes the highlight from the top face down to the
 *    slot floor as a gradient across three or four pixels instead of a step,
 *    and a gradient cannot alias into a bead.
 *
 * `slots` false gives the bare chamfered bar, for the runs of rail that end up
 * underneath an optic where no slot will ever be seen.
 */
export function picatinnyRail(
  length: number,
  width = 0.0212,
  opts: { slots?: boolean } = {},
): THREE.BufferGeometry {
  const batch = new GeoBatch();
  const pitch = 0.02032;
  const slot = 0.00535;
  const tooth = pitch - slot;
  const baseH = 0.0042;
  const toothH = 0.0024;

  // Continuous base bar with the classic chamfered flanks.
  const baseSection: Array<[number, number]> = [
    [width / 2 - 0.0016, 0],
    [width / 2, 0.0016],
    [width / 2, baseH],
    [-width / 2, baseH],
    [-width / 2, 0.0016],
    [-width / 2 + 0.0016, 0],
  ];
  batch.add(extrude(baseSection, -length / 2, length / 2, { capFront: true, capBack: true }));

  if (opts.slots === false) {
    // Plain bar: raise the top to full height and chamfer it, so a rail with
    // no slots is still a rail and not a flat strip.
    const capSection: Array<[number, number]> = [
      [width / 2, 0],
      [width / 2, toothH - 0.0009],
      [width / 2 - 0.0009, toothH],
      [-(width / 2 - 0.0009), toothH],
      [-width / 2, toothH - 0.0009],
      [-width / 2, 0],
    ];
    batch.add(extrude(capSection, -length / 2, length / 2), { y: baseH - 0.0002 });
    return batch.build(0.06);
  }

  // Teeth, as truncated pyramids: the top face is inset by the tooth height on
  // all four sides, giving 45 degrees on the flanks and on the ends alike.
  const chamfer = toothH;
  const toothGeo = taperedBoxXZ(width, tooth, width - chamfer * 2, tooth - chamfer * 2, toothH);
  const count = Math.max(1, Math.round((length - slot) / pitch));
  const span = (count - 1) * pitch;
  for (let i = 0; i < count; i++) {
    batch.add(toothGeo, { y: baseH - 0.0002, z: -span / 2 + i * pitch });
  }
  return batch.build(0.06);
}

/**
 * A truncated pyramid standing on the XZ plane: `wb` by `db` at the bottom,
 * `wt` by `dt` at the top, `h` tall. Flat-shaded on purpose — the whole point
 * of the shape is that its five faces each take a distinctly different amount
 * of light, which is what makes a slot read as a slot.
 */
function taperedBoxXZ(
  wb: number,
  db: number,
  wt: number,
  dt: number,
  h: number,
): THREE.BufferGeometry {
  const hb = [wb / 2, db / 2];
  const ht = [Math.max(wt, 0) / 2, Math.max(dt, 0) / 2];
  const v: number[][] = [
    [-hb[0], 0, -hb[1]],
    [hb[0], 0, -hb[1]],
    [hb[0], 0, hb[1]],
    [-hb[0], 0, hb[1]],
    [-ht[0], h, -ht[1]],
    [ht[0], h, -ht[1]],
    [ht[0], h, ht[1]],
    [-ht[0], h, ht[1]],
  ];
  const faces = [
    [4, 5, 6, 7], // top
    [0, 1, 5, 4], // -z end
    [3, 7, 6, 2], // +z end
    [1, 2, 6, 5], // +x flank
    [0, 4, 7, 3], // -x flank
  ];
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (const f of faces) {
    a.fromArray(v[f[0]]);
    b.fromArray(v[f[1]]);
    c.fromArray(v[f[2]]);
    n.crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
    const base = positions.length / 3;
    for (const idx of f) {
      positions.push(v[idx][0], v[idx][1], v[idx][2]);
      normals.push(n.x, n.y, n.z);
      uvs.push(v[idx][0] * 40 + 0.5, v[idx][2] * 40 + 0.5);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

/**
 * A flat panel lying in the XY plane at z = 0, facing +Z, with a row of
 * recessed pockets running along Y.
 *
 * This is how the M-LOK slots are cut. A slot drawn as a dark decal or as a
 * proud block reads as a sticker the instant the weapon rotates; a genuine
 * pocket with tapered walls picks up a shadow on one side and a highlight on
 * the lip, which is the whole reason the negative space on a handguard looks
 * machined. Building the panel separately and leaving the corresponding face
 * out of the handguard extrusion is far cheaper than any form of CSG.
 */
export function slottedPanel(
  width: number,
  length: number,
  slots: number,
  slotW: number,
  slotL: number,
  depth: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  const quad = (
    p0: [number, number, number],
    p1: [number, number, number],
    p2: [number, number, number],
    p3: [number, number, number],
    nrm: [number, number, number],
  ): void => {
    const base = positions.length / 3;
    positions.push(...p0, ...p1, ...p2, ...p3);
    for (let i = 0; i < 4; i++) normals.push(...nrm);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  const hw = width / 2;
  const hl = length / 2;
  const sw = slotW / 2;
  const pitch = slots > 1 ? (length - slotL - 0.012) / (slots - 1) : 0;
  const first = slots > 1 ? -(pitch * (slots - 1)) / 2 : 0;
  const centres: number[] = [];
  for (let i = 0; i < slots; i++) centres.push(first + pitch * i);

  // Face, minus the openings: two full-length side strips and the gaps
  // between consecutive slots.
  quad([-hw, -hl, 0], [-sw, -hl, 0], [-sw, hl, 0], [-hw, hl, 0], [0, 0, 1]);
  quad([sw, -hl, 0], [hw, -hl, 0], [hw, hl, 0], [sw, hl, 0], [0, 0, 1]);
  let y = -hl;
  for (const c of centres) {
    const y0 = c - slotL / 2;
    if (y0 > y) quad([-sw, y, 0], [sw, y, 0], [sw, y0, 0], [-sw, y0, 0], [0, 0, 1]);
    y = c + slotL / 2;
  }
  if (hl > y) quad([-sw, y, 0], [sw, y, 0], [sw, hl, 0], [-sw, hl, 0], [0, 0, 1]);

  // Pockets. A two-degree draft on the walls is what makes the near wall
  // catch light while the far one falls into shadow.
  const draft = depth * 0.16;
  for (const c of centres) {
    const y0 = c - slotL / 2;
    const y1 = c + slotL / 2;
    const iw = sw - draft;
    const iy0 = y0 + draft;
    const iy1 = y1 - draft;
    const z = -depth;
    quad([-sw, y1, 0], [-sw, y0, 0], [-iw, iy0, z], [-iw, iy1, z], [1, 0, 0.3]);
    quad([sw, y0, 0], [sw, y1, 0], [iw, iy1, z], [iw, iy0, z], [-1, 0, 0.3]);
    quad([sw, y0, 0], [iw, iy0, z], [-iw, iy0, z], [-sw, y0, 0], [0, 1, 0.3]);
    quad([-sw, y1, 0], [-iw, iy1, z], [iw, iy1, z], [sw, y1, 0], [0, -1, 0.3]);
    quad([-iw, iy0, z], [iw, iy0, z], [iw, iy1, z], [-iw, iy1, z], [0, 0, 1]);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  geo.normalizeNormals();
  return geo;
}

// ------------------------------------------------------------------ detail --

/** A fastener head: hex socket cap, the standard on every modern rail. */
export function screwHead(radius = 0.0026, height = 0.0016): THREE.BufferGeometry {
  const batch = new GeoBatch();
  batch.add(
    revolve(
      [
        { r: 0, z: -height },
        { r: radius, z: -height },
        { r: radius, z: 0 },
        { r: 0, z: 0 },
      ],
      10,
    ),
  );
  // The socket: a dark hexagonal pit, which is what actually makes it read.
  batch.add(
    revolve(
      [
        { r: 0, z: -height + 0.0009 },
        { r: radius * 0.52, z: -height + 0.0009 },
        { r: radius * 0.52, z: -height - 0.0001 },
      ],
      6,
    ),
    { z: 0 },
  );
  return batch.build(0.06);
}

/** Panel of moulded grip texture: a lattice of tiny raised pyramids. */
export function gripTexture(
  w: number,
  h: number,
  cols: number,
  rows: number,
  relief = 0.0011,
): THREE.BufferGeometry {
  const batch = new GeoBatch();
  const cw = w / cols;
  const ch = h / rows;
  const stud = roundedBox(cw * 0.78, ch * 0.78, relief * 2, relief * 0.42, 1);
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      batch.add(stud, {
        x: -w / 2 + cw * (i + 0.5),
        y: -h / 2 + ch * (j + 0.5),
        z: 0,
      });
    }
  }
  return batch.build(0.06);
}
