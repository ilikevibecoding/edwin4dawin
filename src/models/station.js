// The Kyber Star: a battle station the size of a small moon, plus the modular
// trench pieces used for the attack run and the hangar interior for the duel.

import * as THREE from 'three';
import { box, cyl, dome, dish, prismoid, ngonPlate, addMesh, mergeAll, mat, greebleField } from '../gfx/build.js';
import { hull, paint, emissive, glowPlane, greebled, glass } from '../gfx/materials.js';
import { stationSurface, greebleTexture, radialGlow } from '../gfx/textures.js';
import { RNG } from '../util/rng.js';
import { TAU } from '../util/math.js';

/**
 * The station itself. `detail` scatters instanced surface structures over the
 * sphere; drop it to 0 for the far-away shots.
 */
export function kyberStation({ radius = 6000, detail = 1, seed = 4, superlaserLat = 0.62 } = {}) {
  const g = new THREE.Group();
  g.name = 'kyberStation';
  const R = radius;

  const shellMat = new THREE.MeshLambertMaterial({ map: stationSurface({ seed }) });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(R, 72, 48), shellMat);
  g.add(shell);

  // Equatorial trench: a dark inset band plus a lip above and below it.
  const trench = new THREE.Group();
  g.add(trench);
  const bandMat = greebled({ color: 0xffffff, seed: 61, repeat: [64, 1], base: [82, 86, 92], lights: 0.05 });
  addMesh(trench, cyl(R * 0.998, R * 0.998, R * 0.016, 96, { openEnded: true }), bandMat);
  const lipMat = greebled({ color: 0xffffff, seed: 62, repeat: [80, 1], base: [120, 124, 130], lights: 0.02 });
  addMesh(trench, cyl(R * 1.004, R * 1.004, R * 0.004, 96, { openEnded: true }), lipMat, { pos: [0, R * 0.011, 0] });
  addMesh(trench, cyl(R * 1.004, R * 1.004, R * 0.004, 96, { openEnded: true }), lipMat, { pos: [0, -R * 0.011, 0] });

  // Superlaser dish: a crater with eight emitters and a focusing point.
  const lat = superlaserLat;
  const dishGroup = new THREE.Group();
  const dr = R * 0.19;
  const dirV = new THREE.Vector3(Math.cos(lat) * 0.55, Math.sin(lat), Math.cos(lat) * 0.84).normalize();
  dishGroup.position.copy(dirV).multiplyScalar(R * 0.968);
  dishGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirV);
  g.add(dishGroup);
  addMesh(dishGroup, cyl(dr * 1.16, dr * 1.24, R * 0.03, 40), greebled({ color: 0xffffff, seed: 63, repeat: [16, 1], base: [116, 120, 128] }), { pos: [0, -R * 0.012, 0] });
  addMesh(dishGroup, dish(dr, dr * 0.42, { segments: 40, rings: 8 }), paint(0x5a5f66, { flat: false }), { pos: [0, R * 0.004, 0] });
  const emitters = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const e = addMesh(dishGroup, cyl(dr * 0.05, dr * 0.06, dr * 0.13, 8),
      emissive(0x6affc0, { blending: THREE.NormalBlending, depthWrite: true }),
      { pos: [Math.cos(a) * dr * 0.72, -dr * 0.16, Math.sin(a) * dr * 0.72] });
    emitters.push(e);
  }
  const focus = addMesh(dishGroup, new THREE.SphereGeometry(dr * 0.08, 12, 8), emissive(0x8fffd8, { opacity: 0 }), { pos: [0, dr * 0.1, 0] });
  g.userData.superlaser = { group: dishGroup, emitters, focus, radius: dr };

  // Surface structures: instanced boxes standing on the sphere.
  if (detail > 0) {
    const count = Math.round(2200 * detail);
    const r = new RNG(seed + 3);
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const inst = new THREE.InstancedMesh(geo, greebled({ color: 0xffffff, seed: 64, repeat: [1, 1], base: [128, 132, 140], lights: 0.05 }), count);
    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);
    const p = { x: 0, y: 0, z: 0 };
    let n = 0;
    for (let i = 0; i < count; i++) {
      r.onSphere(p);
      const v = new THREE.Vector3(p.x, p.y, p.z);
      // Keep the equatorial trench and the dish clear.
      if (Math.abs(v.y) < 0.02) continue;
      if (v.distanceTo(dirV) < 0.22) continue;
      const w = r.float(R * 0.004, R * 0.03);
      const h = r.float(R * 0.002, R * 0.012);
      dummy.position.copy(v).multiplyScalar(R + h * 0.4);
      dummy.quaternion.setFromUnitVectors(up, v);
      dummy.rotateY(r.float(0, TAU));
      dummy.scale.set(w, h, w * r.float(0.4, 2.2));
      dummy.updateMatrix();
      inst.setMatrixAt(n++, dummy.matrix);
    }
    inst.count = n;
    inst.instanceMatrix.needsUpdate = true;
    g.add(inst);
  }

  g.userData.radius = R;
  return g;
}

/**
 * One 300 m module of the attack trench. Segments are recycled during the run,
 * so each one is seeded differently to hide the repetition.
 */
export function trenchSegment({ length = 300, width = 180, depth = 220, seed = 1, lights = true } = {}) {
  const g = new THREE.Group();
  const L = length;
  const W = width;
  const D = depth;
  const r = new RNG(seed);
  const wallMat = greebled({ color: 0xffffff, seed: 70 + (seed % 5), repeat: [5, 7], base: [136, 141, 150], lights: 0.06 });
  const floorMat = greebled({ color: 0xffffff, seed: 80 + (seed % 5), repeat: [4, 9], base: [126, 130, 140], lights: 0.04 });
  const dark = paint(0x4a4e55);

  addMesh(g, box(W, 6, L), floorMat, { pos: [0, -D, 0] });
  for (const sx of [-1, 1]) {
    addMesh(g, box(8, D, L), wallMat, { pos: [sx * W * 0.5, -D * 0.5, 0] });
    // Wall detail. The size distribution is deliberately skewed small: a few
    // big pilasters read as structure, and a lot of little boxes read as
    // machinery rather than as a voxel wall.
    const parts = [];
    for (let i = 0; i < 26; i++) {
      const z = -L / 2 + (i / 26) * L + r.float(0, L / 26);
      const y = -r.float(D * 0.06, D * 0.92);
      const w = r.float(4, 15);
      const h = r.float(6, D * 0.26);
      const bg = box(w, h, r.float(5, 22));
      bg.translate(sx * (W * 0.5 - 4 - w * 0.5), y, z);
      parts.push([bg, null]);
    }
    for (let i = 0; i < 220; i++) {
      const z = r.float(-L / 2, L / 2);
      const y = -r.float(D * 0.02, D * 0.98);
      const w = r.float(0.8, 4.5);
      const h = r.float(0.8, 5.5);
      const bg = box(w, h, r.float(1.2, 7));
      bg.translate(sx * (W * 0.5 - 4 - w * 0.5), y, z);
      parts.push([bg, null]);
    }
    // Horizontal service ledges and vertical conduit runs.
    for (let i = 0; i < 7; i++) {
      const y = -r.float(D * 0.1, D * 0.92);
      const bg = box(r.float(2.5, 6), r.float(1.5, 4), L * 0.99);
      bg.translate(sx * (W * 0.5 - 6), y, 0);
      parts.push([bg, null]);
    }
    for (let i = 0; i < 16; i++) {
      const z = r.float(-L / 2, L / 2);
      const bg = box(r.float(1.5, 3.5), D * r.float(0.3, 0.95), r.float(1.5, 3.5));
      bg.translate(sx * (W * 0.5 - 6), -D * 0.5, z);
      parts.push([bg, null]);
    }
    g.add(new THREE.Mesh(mergeAll(parts), wallMat));
    parts.forEach(([p]) => p.dispose());
  }
  // Floor greebles.
  const fg = greebleField({ seed: seed + 40, count: 90, width: W * 0.9, depth: L * 0.95, y: -D + 3, sizeMin: 2, sizeMax: 14, heightMin: 1, heightMax: 9 });
  g.add(new THREE.Mesh(fg, floorMat));

  // Occasional bridge across the trench, and the surface lip.
  if (r.bool(0.35)) {
    addMesh(g, box(W * 1.02, 10, 26), dark, { pos: [0, -D * r.float(0.12, 0.3), r.float(-L * 0.3, L * 0.3)] });
  }
  for (const sx of [-1, 1]) {
    addMesh(g, box(70, 8, L), greebled({ color: 0xffffff, seed: 90, repeat: [3, 8], base: [132, 136, 144], lights: 0.04 }),
      { pos: [sx * (W * 0.5 + 33), 0, 0] });
  }

  if (lights) {
    const lampMat = emissive(0xffbe74, { blending: THREE.NormalBlending, depthWrite: true });
    const coolMat = emissive(0x8fd0ff, { blending: THREE.NormalBlending, depthWrite: true });
    for (let i = 0; i < 14; i++) {
      const z = -L / 2 + (i + 0.5) * (L / 14);
      for (const sx of [-1, 1]) {
        addMesh(g, box(1.2, 1.2, 3.4), r.bool(0.75) ? lampMat : coolMat,
          { pos: [sx * (W * 0.5 - 9), -D * r.float(0.12, 0.9), z] });
      }
    }
    // A strip light running along the base of each wall gives the floor shape.
    for (const sx of [-1, 1]) {
      addMesh(g, box(0.8, 0.8, L * 0.96), emissive(0xffa858, { blending: THREE.NormalBlending, depthWrite: true }),
        { pos: [sx * (W * 0.5 - 10), -D + 10, 0] });
    }
  }
  return g;
}

/** The two-metre thermal exhaust port at the end of the trench. */
export function exhaustPort({ scale = 6 } = {}) {
  const g = new THREE.Group();
  const s = scale;
  addMesh(g, cyl(3.4 * s, 4.2 * s, 1.2 * s, 20), paint(0x6e737a, { flat: false }), { pos: [0, 0.6 * s, 0] });
  addMesh(g, cyl(2.2 * s, 2.6 * s, 1.6 * s, 20), paint(0x2a2d32), { pos: [0, 1.0 * s, 0] });
  const hole = addMesh(g, new THREE.CircleGeometry(2.0 * s, 20), new THREE.MeshBasicMaterial({ color: 0x05070a }),
    { pos: [0, 1.85 * s, 0], rot: [-Math.PI / 2, 0, 0] });
  const glow = addMesh(g, new THREE.PlaneGeometry(11 * s, 11 * s), glowPlane({ color: 0xff8a3a, opacity: 0 }),
    { pos: [0, 1.9 * s, 0], rot: [-Math.PI / 2, 0, 0] });
  glow.renderOrder = 5;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    addMesh(g, box(1.6 * s, 1.4 * s, 1.6 * s), paint(0x8a9098), { pos: [Math.cos(a) * 4.6 * s, 0.7 * s, Math.sin(a) * 4.6 * s] });
  }
  g.userData.glow = glow;
  g.userData.hole = hole;
  return g;
}

/**
 * Hangar bay interior: a deep grey box with a magnetically sealed opening at
 * one end. Deliberately over-scaled -- the duel needs the empty space.
 */
export function hangarBay({ width = 90, height = 34, depth = 130 } = {}) {
  const g = new THREE.Group();
  const W = width;
  const H = height;
  const D = depth;
  const floorMat = greebled({ color: 0xffffff, seed: 101, repeat: [10, 14], base: [104, 108, 116], lights: 0.02 });
  const wallMat = greebled({ color: 0xffffff, seed: 102, repeat: [8, 3], base: [118, 122, 130], lights: 0.06 });
  const dark = paint(0x3c4046);

  addMesh(g, box(W, 1.5, D), floorMat, { pos: [0, -0.75, 0] });
  addMesh(g, box(W, 1.5, D), dark, { pos: [0, H, 0] });
  for (const sx of [-1, 1]) {
    addMesh(g, box(1.5, H, D), wallMat, { pos: [sx * W * 0.5, H / 2, 0] });
    // Catwalk + support ribs.
    addMesh(g, box(5, 0.6, D * 0.9), dark, { pos: [sx * (W * 0.5 - 3), H * 0.55, 0] });
    for (let i = 0; i < 7; i++) {
      addMesh(g, box(2.4, H, 2.4), dark, { pos: [sx * (W * 0.5 - 1.4), H / 2, -D * 0.45 + (i / 6) * D * 0.9] });
    }
  }
  // Back wall with a lit doorway.
  addMesh(g, box(W, H, 1.5), wallMat, { pos: [0, H / 2, -D * 0.5] });
  addMesh(g, box(9, 12, 0.6), paint(0x1b1e22), { pos: [0, 6, -D * 0.5 + 1.2] });
  addMesh(g, box(7.4, 10.4, 0.3), emissive(0xbfe0ff, { blending: THREE.NormalBlending, depthWrite: true }), { pos: [0, 5.6, -D * 0.5 + 1.6] });

  // Opening to space at +Z, held by a shimmering containment field.
  addMesh(g, box(W, 6, 2), dark, { pos: [0, H - 3, D * 0.5] });
  addMesh(g, box(6, H, 2), dark, { pos: [-W * 0.5 + 3, H / 2, D * 0.5] });
  addMesh(g, box(6, H, 2), dark, { pos: [W * 0.5 - 3, H / 2, D * 0.5] });
  const field = addMesh(g, new THREE.PlaneGeometry(W - 12, H - 6),
    new THREE.MeshBasicMaterial({ color: 0x6fa8ff, transparent: true, opacity: 0.055, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
    { pos: [0, (H - 6) / 2, D * 0.5 - 1] });
  field.renderOrder = 6;
  g.userData.field = field;

  // Overhead light rigs.
  const lamps = [];
  for (let i = 0; i < 6; i++) {
    const z = -D * 0.4 + (i / 5) * D * 0.8;
    for (const sx of [-1, 1]) {
      addMesh(g, box(9, 0.7, 3), emissive(0xffeed0, { blending: THREE.NormalBlending, depthWrite: true }), { pos: [sx * W * 0.24, H - 1.4, z] });
      const glow = addMesh(g, new THREE.PlaneGeometry(26, 16), glowPlane({ color: 0xffe6bb, opacity: 0.09 }), { pos: [sx * W * 0.24, H - 4, z], rot: [Math.PI / 2, 0, 0] });
      glow.renderOrder = 3;
      const lamp = new THREE.PointLight(0xffe9c8, 260, 90, 2);
      lamp.position.set(sx * W * 0.24, H - 3, z);
      g.add(lamp);
      lamps.push(lamp);
    }
  }
  g.userData.lamps = lamps;

  // Floor markings.
  for (let i = 0; i < 4; i++) {
    addMesh(g, box(W * 0.8, 0.06, 0.5), paint(0xd8c46a), { pos: [0, 0.05, -D * 0.3 + i * D * 0.2] });
  }
  return g;
}
