import * as THREE from 'three';

/**
 * Propeller blade: round shank at the root widening to the widest chord around 40 % radius, then tapering to an
 * elliptically rounded tip. Twisted (coarse pitch at the root), slightly cambered. Root at origin, extends +Y;
 * the pitch axis sits at 35 % chord.
 */
export function bladeGeometry(length: number, rootChord: number, tipChord: number): THREE.BufferGeometry {
  const segs = 16, n = 12; // n points around the closed section
  const pos: number[] = [], idx: number[] = [], uv: number[] = [];
  const maxChord = rootChord * 1.35;
  const chordAt = (t: number) => {
    const grow = THREE.MathUtils.smoothstep(t, 0, 0.42);
    let c = rootChord * 0.75 + (maxChord - rootChord * 0.75) * grow;
    if (t > 0.42) c = maxChord + (tipChord - maxChord) * ((t - 0.42) / 0.58);
    // elliptical tip over the last 18 % of the radius
    if (t > 0.82) c *= Math.sqrt(Math.max(1 - Math.pow((t - 0.82) / 0.18, 2), 0));
    return Math.max(c, 0.012);
  };
  for (let i = 0; i <= segs; i++) {
    // denser rings toward the tip where the planform curves
    const t = i / segs;
    // clamp: at t = 1 the ratio rounds to 1 + 2e-16 and pow(negative, 1.6) is NaN (whole tip ring)
    const tt = t < 0.7 ? t : 0.7 + 0.3 * (1 - Math.pow(Math.max(0, 1 - (t - 0.7) / 0.3), 1.6));
    const y = tt * length;
    const chord = chordAt(tt);
    // thick, nearly round shank at the root blending into a thin airfoil outboard
    const tr = 0.075 + 0.55 * Math.pow(1 - tt, 3.2);
    const thick = chord * tr;
    const pitch = 0.95 - 0.7 * tt;
    const c = Math.cos(pitch), s = Math.sin(pitch);
    for (let j = 0; j < n; j++) {
      // walk around the section: leading edge -> upper surface -> trailing edge -> lower surface
      const a = (j / n) * Math.PI * 2;
      const u = -0.5 * Math.cos(a);                 // chordwise -0.5 .. 0.5 about the mid chord
      const upper = Math.sin(a) >= 0;
      const camber = 0.07 * chord * (1 - 4 * u * u) * (1 - Math.min(tr, 0.5) * 1.6);
      const half = 0.5 * thick * Math.sqrt(Math.max(0, 1 - 4 * u * u)) * Math.abs(Math.sin(a));
      const lx = (u + 0.15) * chord, lz = camber + (upper ? half : -half);
      pos.push(lx * c - lz * s, y, lx * s + lz * c);
      uv.push(j / n, tt);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < n; j++) {
    const j1 = (j + 1) % n;
    const a = i * n + j, b = a + n, a1 = i * n + j1, b1 = a1 + n;
    idx.push(a, b, a1, a1, b, b1);
  }
  // tip cap (the last ring is small but not a point)
  const tipBase = segs * n, centre = pos.length / 3;
  let cx = 0, cz = 0;
  for (let j = 0; j < n; j++) { cx += pos[(tipBase + j) * 3]; cz += pos[(tipBase + j) * 3 + 2]; }
  pos.push(cx / n, length, cz / n); uv.push(0.5, 1);
  for (let j = 0; j < n; j++) idx.push(centre, tipBase + j, tipBase + ((j + 1) % n));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Ogival spinner of base radius r and length len, base at the origin, pointing +X. */
export function spinnerGeometry(r: number, len: number, segments = 24): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const N = 14;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    // tangent ogive: full radius at the base, gently rounding to the point
    pts.push(new THREE.Vector2(r * Math.pow(Math.max(1 - Math.pow(t, 1.7), 0), 0.72), t * len));
  }
  const g = new THREE.LatheGeometry(pts, segments);
  g.rotateZ(-Math.PI / 2); // lathe axis +Y -> +X
  return g;
}
