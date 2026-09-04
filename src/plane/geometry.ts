import * as THREE from 'three';

/** Cross-section of a lofted body at station x. Widths/heights are half-extents from (x, yc). */
export interface Section {
  x: number;
  yc: number;
  w: number;
  top: number;
  bot: number;
  /** superellipse exponent (2 = ellipse, higher = boxier) */
  n?: number;
  /** exponent for the lower half (V-shaped hulls use < 2) */
  nBot?: number;
}

/**
 * Loft a smooth closed surface through cross-sections along +X. UV: u along the body (0 at the
 * first section), v around the circumference (0 at the top, 0.5 at the belly).
 */
export function loft(sections: Section[], radial = 28, closeEnds = true): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const S = sections.length;
  let total = 0;
  const dist: number[] = [0];
  for (let i = 1; i < S; i++) { total += Math.abs(sections[i].x - sections[i - 1].x); dist.push(total); }
  for (let i = 0; i < S; i++) {
    const s = sections[i];
    const n = s.n ?? 2.2, nb = s.nBot ?? n;
    for (let j = 0; j <= radial; j++) {
      const t = j / radial;
      const a = t * Math.PI * 2 - Math.PI / 2; // start at the top
      const c = Math.cos(a), si = Math.sin(a);
      const upper = si <= 0; // y up is -sin in this parameterisation -> flip below
      const ex = upper ? n : nb;
      const px = Math.sign(c) * Math.pow(Math.abs(c), 2 / ex) * s.w;
      const py = -Math.sign(si) * Math.pow(Math.abs(si), 2 / ex) * (upper ? s.top : s.bot);
      pos.push(s.x, s.yc + py, px);
      uv.push(dist[i] / Math.max(total, 1e-6), t);
    }
  }
  for (let i = 0; i < S - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // fix the seam normals (first and last ring vertex share a position)
  const nrm = g.getAttribute('normal') as THREE.BufferAttribute;
  for (let i = 0; i < S; i++) {
    const a = i * (radial + 1), b = a + radial;
    const nx = (nrm.getX(a) + nrm.getX(b)) / 2, ny = (nrm.getY(a) + nrm.getY(b)) / 2, nz = (nrm.getZ(a) + nrm.getZ(b)) / 2;
    nrm.setXYZ(a, nx, ny, nz); nrm.setXYZ(b, nx, ny, nz);
  }
  if (closeEnds) {
    // cap ends with a fan (small caps; the sections are already tiny at the ends)
    for (const end of [0, S - 1]) {
      const s = sections[end];
      const centerIndex = pos.length / 3;
      pos.push(s.x, s.yc + (s.top - s.bot) * 0.0, 0);
      uv.push(end === 0 ? 0 : 1, 0.5);
      const base = end * (radial + 1);
      for (let j = 0; j < radial; j++) {
        if (end === 0) idx.push(centerIndex, base + j + 1, base + j);
        else idx.push(centerIndex, base + j, base + j + 1);
      }
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
  }
  return g;
}

/** Symmetric-ish airfoil outline (NACA-like) as a closed polyline, chord 1 along +X (leading edge at x=0). */
export function airfoilPoints(thickness = 0.14, camber = 0.03, n = 14): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  const yt = (x: number) => 5 * thickness * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
  const yc = (x: number) => camber * Math.sin(Math.PI * x) * 1.0;
  // upper surface from trailing edge to leading edge
  for (let i = 0; i <= n; i++) { const x = 1 - i / n; const xx = 1 - Math.cos((i / n) * Math.PI / 2); void xx; pts.push(new THREE.Vector2(x, yc(x) + yt(x))); }
  // lower surface from leading edge to trailing edge
  for (let i = 1; i < n; i++) { const x = i / n; pts.push(new THREE.Vector2(x, yc(x) - yt(x))); }
  return pts;
}

export interface WingSpec {
  span: number;      // one side, root to tip
  rootChord: number;
  tipChord: number;
  sweep: number;     // tip x offset (negative = trailing edge swept back)
  dihedral: number;  // radians
  thickness: number;
  twist: number;     // tip incidence change (radians)
  /** span fraction range for the control surface cut-out (rendered separately) */
}

/** Lofts a wing half along +Z (right wing). UV: u chordwise, v spanwise. */
export function wingGeometry(spec: WingSpec, segments = 8): THREE.BufferGeometry {
  const profile = airfoilPoints(spec.thickness, 0.025, 12);
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const P = profile.length;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const te = Math.pow(t, 1.0);
    const chord = spec.rootChord + (spec.tipChord - spec.rootChord) * te;
    const z = spec.span * t;
    const y = Math.tan(spec.dihedral) * z;
    const xOff = spec.sweep * te;
    const twist = spec.twist * t;
    for (let j = 0; j <= P; j++) {
      const p = profile[j % P];
      // local coords: x chord (leading edge at chord*0.25 forward), y thickness
      let lx = (p.x - 0.3) * chord, ly = p.y * chord;
      const c = Math.cos(twist), s = Math.sin(twist);
      const rx = lx * c - ly * s, ry = lx * s + ly * c;
      lx = rx; ly = ry;
      pos.push(-lx + xOff, y + ly, z); // leading edge toward +X means chord runs -X: flip so LE forward
      uv.push(j / P, t);
    }
  }
  for (let i = 0; i < segments; i++) for (let j = 0; j < P; j++) {
    const a = i * (P + 1) + j, b = a + P + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  // tip cap
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Thin tapered plate for control surfaces, spinner blades etc. Centred at the hinge line (x=0), extends -X. */
export function plateGeometry(spanZ: number, chordRoot: number, chordTip: number, thick: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(1, 1, 1);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = z + 0.5; // 0 root .. 1 tip
    const chord = chordRoot + (chordTip - chordRoot) * t;
    // taper thickness toward the trailing edge
    const thickScale = 1 - 0.8 * (0.5 - x);
    p.setXYZ(i, (x - 0.5) * chord, y * thick * thickScale, z * spanZ);
  }
  g.computeVertexNormals();
  return g;
}

/** Propeller blade: twisted, tapered, slightly cambered. Root at origin, extends +Y. */
export function bladeGeometry(length: number, rootChord: number, tipChord: number): THREE.BufferGeometry {
  const segs = 10;
  const pos: number[] = [], idx: number[] = [], uv: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const y = t * length;
    const chord = rootChord + (tipChord - rootChord) * Math.pow(t, 1.4);
    const pitch = 0.95 - 0.7 * t; // strong twist near the root
    const c = Math.cos(pitch), s = Math.sin(pitch);
    for (let j = 0; j <= 4; j++) {
      const u = j / 4 - 0.5;
      const camber = 0.08 * chord * (1 - 4 * u * u);
      const lx = u * chord, lz = camber;
      pos.push(lx * c - lz * s, y, lx * s + lz * c);
      uv.push(j / 4, t);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < 4; j++) {
    const a = i * 5 + j, b = a + 5;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Tube between two points. */
export function strut(a: THREE.Vector3, b: THREE.Vector3, radius: number, mat: THREE.Material, segments = 8): THREE.Mesh {
  const len = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(radius, radius, len, segments);
  const m = new THREE.Mesh(g, mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  m.castShadow = true;
  return m;
}

/** Streamlined (airfoil-section) strut between two points; wider than thick. */
export function fairedStrut(a: THREE.Vector3, b: THREE.Vector3, width: number, thick: number, mat: THREE.Material): THREE.Mesh {
  const len = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(0.5, 0.5, len, 10);
  g.scale(width, 1, thick);
  const m = new THREE.Mesh(g, mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  m.castShadow = true;
  return m;
}
