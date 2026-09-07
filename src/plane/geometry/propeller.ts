import * as THREE from 'three';

/**
 * Propeller blade: round shank at the root widening to the widest chord around 40 % radius, then tapering to an
 * elliptically rounded tip. Twisted (coarse pitch at the root), slightly cambered. Root at origin, extends +Y;
 * the pitch axis sits at 35 % chord.
 */
export function bladeGeometry(length: number, rootChord: number, tipChord: number): THREE.BufferGeometry {
  const segs = 16, n = 12; // n points around the closed section
  const pos: number[] = [], idx: number[] = [], uv: number[] = [];
  const chordAt = (t: number) => bladeChordAt(t, rootChord, tipChord);
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
    // the section is built with its chord along the flight axis (feathered); turning it by 90 deg - blade angle
    // about the radial axis leaves the chord at the blade angle from the plane of rotation: coarse (54 deg) at the
    // shank, fine (14 deg) at the tip. Turning it by the blade angle itself, as before, gave a blade twisted the
    // wrong way round (a near-feathered tip and a flat shank) that read as thin slivers from ahead.
    const pitch = Math.PI / 2 - bladePitchAt(tt);
    const c = Math.cos(pitch), s = Math.sin(pitch);
    for (let j = 0; j < n; j++) {
      // walk around the section: leading edge -> upper surface -> trailing edge -> lower surface
      const a = (j / n) * Math.PI * 2;
      const u = -0.5 * Math.cos(a);                 // chordwise -0.5 .. 0.5 about the mid chord
      const upper = Math.sin(a) >= 0;
      const camber = 0.07 * chord * (1 - 4 * u * u) * (1 - Math.min(tr, 0.5) * 1.6);
      const half = 0.5 * thick * Math.sqrt(Math.max(0, 1 - 4 * u * u)) * Math.abs(Math.sin(a));
      // The prop turns +Y -> +Z (rotation.x increases): for the blade standing at +Y the leading edge must lead
      // into +Z and stand forward (+X) of the trailing edge, and the cambered back must face forward. Before the
      // pitch rotation (about the radial axis, positive = LE toward +Z) that puts the LE at +lx and the convex
      // side at -lz; the earlier build had both mirrored, a reverse-pitch blade whose flat face pointed forward.
      const lx = -(u + 0.15) * chord, lz = -(camber + (upper ? half : -half));
      pos.push(lx * c - lz * s, y, lx * s + lz * c);
      uv.push(j / n, tt);
    }
  }
  // winding: the section is walked LE -> upper (-z side) -> TE -> lower as `a` grows, so (ring, next-around,
  // next-ring) is counter-clockwise seen from outside the blade; the other order made an inside-out blade whose
  // faces were culled and whose normals lit the far surface (seen through it) from the wrong side
  for (let i = 0; i < segs; i++) for (let j = 0; j < n; j++) {
    const j1 = (j + 1) % n;
    const a = i * n + j, b = a + n, a1 = i * n + j1, b1 = a1 + n;
    idx.push(a, a1, b, a1, b1, b);
  }
  // tip cap (the last ring is small but not a point)
  const tipBase = segs * n, centre = pos.length / 3;
  let cx = 0, cz = 0;
  for (let j = 0; j < n; j++) { cx += pos[(tipBase + j) * 3]; cz += pos[(tipBase + j) * 3 + 2]; }
  pos.push(cx / n, length, cz / n); uv.push(0.5, 1);
  for (let j = 0; j < n; j++) idx.push(centre, tipBase + ((j + 1) % n), tipBase + j);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * Annulus sector in the propeller disc plane (x = 0, +X forward), radii `r0..r1`, sweeping `span` radians from
 * `start` toward decreasing angle (angle theta about +X: 0 = +Y, pi/2 = +Z, the direction the prop turns), with a
 * polar UV: u = 0 at `start` growing toward the tail of the sweep, v = 0 at r0 .. 1 at r1. The motion-blur streak
 * behind a blade is one of these with `span` = the blade spacing; the full blur disc is one with `span` = 2 pi
 * (the u seam wraps with the texture's RepeatWrapping). u therefore increases against the direction of rotation,
 * which the polar normal map relies on (see `propBlurMaps`).
 */
export function propSectorGeometry(r0: number, r1: number, start: number, span: number, segsA: number, segsR: number): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], nrm: number[] = [], idx: number[] = [];
  for (let i = 0; i <= segsA; i++) {
    const u = i / segsA, a = start - u * span, c = Math.cos(a), s = Math.sin(a);
    for (let j = 0; j <= segsR; j++) {
      const v = j / segsR, r = r0 + (r1 - r0) * v;
      pos.push(0, r * c, r * s); nrm.push(1, 0, 0); uv.push(u, v);
    }
  }
  const R = segsR + 1;
  for (let i = 0; i < segsA; i++) for (let j = 0; j < segsR; j++) {
    const a = i * R + j, b = a + R;
    // wound to face +X (seen from ahead of the aircraft); the material is double-sided for the seat view
    idx.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Blade planform chord (m) at radial fraction t (shared by the blade loft and the blur textures). */
export function bladeChordAt(t: number, rootChord: number, tipChord: number): number {
  const maxChord = rootChord * 1.35;
  const grow = THREE.MathUtils.smoothstep(t, 0, 0.42);
  let c = rootChord * 0.75 + (maxChord - rootChord * 0.75) * grow;
  if (t > 0.42) c = maxChord + (tipChord - maxChord) * ((t - 0.42) / 0.58);
  if (t > 0.82) c *= Math.sqrt(Math.max(1 - Math.pow((t - 0.82) / 0.18, 2), 0));
  return Math.max(c, 0.012);
}

/** Blade angle (rad, from the plane of rotation) at radial fraction t: coarse at the shank, fine at the tip. */
export const bladePitchAt = (t: number): number => 0.95 - 0.7 * t;

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
