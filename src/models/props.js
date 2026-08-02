// Set dressing: the things that make an empty plane look like somebody lives
// there (or, in the Empire's case, shoots from there).

import * as THREE from 'three';
import { box, cyl, dome, prismoid, ngonPlate, addMesh, mergeAll, mat, greebleField } from '../gfx/build.js';
import { hull, paint, emissive, glowPlane, greebled, glass, stone, plaster } from '../gfx/materials.js';
import { RNG } from '../util/rng.js';

/** Moisture vaporator: the only crop on a desert farm. */
export function vaporator({ scale = 1, seed = 1 } = {}) {
  const g = new THREE.Group();
  const s = scale;
  const metal = paint(0x9a9384, { flat: false });
  const dark = paint(0x4d4740);
  addMesh(g, cyl(0.5 * s, 0.62 * s, 0.28 * s, 10), dark, { pos: [0, 0.14 * s, 0] });
  addMesh(g, cyl(0.14 * s, 0.17 * s, 2.5 * s, 8), metal, { pos: [0, 1.4 * s, 0] });
  addMesh(g, cyl(0.3 * s, 0.24 * s, 0.5 * s, 10), metal, { pos: [0, 2.75 * s, 0] });
  addMesh(g, dome(0.3 * s, { segments: 10, rings: 5 }), metal, { pos: [0, 2.98 * s, 0] });
  const r = new RNG(seed);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + r.float(0, 1);
    addMesh(g, box(0.08 * s, 1.5 * s, 0.24 * s), metal,
      { pos: [Math.cos(a) * 0.32 * s, 1.9 * s, Math.sin(a) * 0.32 * s], rot: [0, -a, 0.06] });
  }
  addMesh(g, cyl(0.02 * s, 0.02 * s, 0.7 * s, 4), dark, { pos: [0, 3.35 * s, 0] });
  return g;
}

/** Domed desert dwelling with a sunken entry. */
export function desertHut({ scale = 1 } = {}) {
  const g = new THREE.Group();
  const s = scale;
  const wall = plaster({ seed: 64, repeat: [3, 2], base: [214, 192, 156] });
  addMesh(g, cyl(3.4 * s, 3.8 * s, 1.6 * s, 18), wall, { pos: [0, 0.8 * s, 0] });
  addMesh(g, dome(3.4 * s, { segments: 18, rings: 9 }), wall, { pos: [0, 1.6 * s, 0], scale: [1, 0.62, 1] });
  addMesh(g, box(1.5 * s, 1.9 * s, 0.5 * s), paint(0x3a332a), { pos: [0, 0.95 * s, 3.75 * s] });
  addMesh(g, box(1.2 * s, 1.5 * s, 0.1 * s), emissive(0xffbb66, { blending: THREE.NormalBlending, depthWrite: true }), { pos: [0, 0.85 * s, 3.95 * s] });
  addMesh(g, cyl(0.06 * s, 0.06 * s, 3 * s, 4), paint(0x6a6152), { pos: [2.2 * s, 3 * s, -1.4 * s] });
  addMesh(g, box(1.2 * s, 0.1 * s, 1.2 * s), paint(0x8a8172), { pos: [-2.4 * s, 2.5 * s, 1.2 * s], rot: [0.3, 0.4, 0] });
  return g;
}

/** Weathered rock spire / mesa chunk. */
export function rockSpire({ scale = 1, seed = 1, tall = 1 } = {}) {
  const r = new RNG(seed);
  const g = new THREE.Group();
  const s = scale;
  const rockMat = stone({ seed: 88, repeat: [2, 2], base: [172, 136, 100] });
  let y = 0;
  let rad = 3 * s;
  const layers = r.int(3, 5);
  for (let i = 0; i < layers; i++) {
    const h = r.float(1.4, 3.2) * s * tall;
    const sides = r.int(5, 8);
    const top = rad * r.float(0.55, 0.85);
    const poly = [];
    const polyTop = [];
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * Math.PI * 2 + r.float(-0.1, 0.1);
      const jitter = r.float(0.85, 1.15);
      poly.push([Math.cos(a) * rad * jitter, Math.sin(a) * rad * jitter]);
      polyTop.push([Math.cos(a) * top * jitter, Math.sin(a) * top * jitter]);
    }
    addMesh(g, prismoid(poly, polyTop, h, { uvScale: 0.09 }), rockMat, { pos: [r.float(-0.3, 0.3) * s, y, r.float(-0.3, 0.3) * s] });
    y += h * 0.95;
    rad = top;
  }
  return g;
}

/** Twin-barrel turbolaser emplacement. Rotates to track a target. */
export function turret({ scale = 1, color = 0x7f858d, bolt = 0x63ff5a } = {}) {
  const g = new THREE.Group();
  const s = scale;
  const metal = paint(color, { flat: false });
  const dark = paint(0x3a3d43);
  addMesh(g, cyl(1.5 * s, 1.8 * s, 0.6 * s, 12), dark, { pos: [0, 0.3 * s, 0] });
  const yaw = new THREE.Group();
  yaw.position.y = 0.6 * s;
  g.add(yaw);
  addMesh(yaw, cyl(1.15 * s, 1.3 * s, 0.9 * s, 12), metal, { pos: [0, 0.45 * s, 0] });
  const pitch = new THREE.Group();
  pitch.position.y = 0.9 * s;
  yaw.add(pitch);
  addMesh(pitch, box(1.7 * s, 0.9 * s, 1.5 * s), metal);
  const tips = [];
  for (const sx of [-1, 1]) {
    addMesh(pitch, cyl(0.17 * s, 0.2 * s, 4.4 * s, 8, { alongZ: true }), dark, { pos: [sx * 0.45 * s, 0.1 * s, 2 * s] });
    addMesh(pitch, cyl(0.26 * s, 0.26 * s, 0.5 * s, 8, { alongZ: true }), metal, { pos: [sx * 0.45 * s, 0.1 * s, 3.9 * s] });
    const tip = new THREE.Object3D();
    tip.position.set(sx * 0.45 * s, 0.1 * s, 4.2 * s);
    pitch.add(tip);
    tips.push(tip);
  }
  g.userData.yaw = yaw;
  g.userData.pitch = pitch;
  g.userData.tips = tips;
  g.userData.boltColor = bolt;
  g.userData.aim = (target) => {
    const local = g.worldToLocal(target.clone());
    yaw.rotation.y = Math.atan2(local.x, local.z);
    const flat = Math.hypot(local.x, local.z);
    pitch.rotation.x = -Math.atan2(local.y - 0.9 * s, flat);
  };
  return g;
}

/** Circular landing pad with edge lights and a lift ring. */
export function landingPad({ radius = 22, scale = 1 } = {}) {
  const g = new THREE.Group();
  const R = radius * scale;
  const deck = greebled({ color: 0xffffff, seed: 41, repeat: [8, 8], base: [120, 118, 112], lights: 0.03 });
  addMesh(g, cyl(R, R * 1.04, 2.4 * scale, 28), deck, { pos: [0, -1.2 * scale, 0] });
  addMesh(g, cyl(R * 0.7, R * 0.7, 0.25 * scale, 24), paint(0x6a6862), { pos: [0, 0.05 * scale, 0] });
  const lights = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const l = addMesh(g, cyl(0.35 * scale, 0.35 * scale, 0.3 * scale, 8),
      emissive(0xff9c3a, { blending: THREE.NormalBlending, depthWrite: true }),
      { pos: [Math.cos(a) * R * 0.92, 0.2 * scale, Math.sin(a) * R * 0.92] });
    lights.push(l);
  }
  g.userData.lights = lights;
  g.userData.blink = (t) => {
    lights.forEach((l, i) => {
      const k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 3 - i * 0.5));
      l.material = l.material;
      l.scale.setScalar(0.8 + k * 0.5);
    });
  };
  return g;
}

/** Cargo crate cluster, for foreground interest. */
export function crates({ count = 6, seed = 2, scale = 1 } = {}) {
  const r = new RNG(seed);
  const g = new THREE.Group();
  const mats = [paint(0x8a7f6b), paint(0x6f6a5e), paint(0x55606a)];
  for (let i = 0; i < count; i++) {
    const w = r.float(0.8, 1.9) * scale;
    const h = r.float(0.6, 1.5) * scale;
    const d = r.float(0.8, 1.7) * scale;
    addMesh(g, box(w, h, d), r.pick(mats), {
      pos: [r.float(-3, 3) * scale, h / 2, r.float(-3, 3) * scale],
      rot: [0, r.float(0, Math.PI), 0],
    });
  }
  return g;
}

/** Interior corridor module, 6 m square, used for the boarding sequence. */
export function corridorSection({ length = 8, scale = 1, seed = 1, lit = true } = {}) {
  const g = new THREE.Group();
  const s = scale;
  const L = length * s;
  const wall = hull({ base: [150, 155, 163], seed: 34, repeat: [1, 1], density: 2, grime: 0.3, rivets: false });
  const dark = paint(0x494d54);
  const W = 3.2 * s;
  const H = 3.4 * s;
  addMesh(g, box(W * 2, 0.3 * s, L), greebled({ color: 0xffffff, seed: 35, repeat: [6, 10], base: [120, 124, 132], lights: 0.01 }), { pos: [0, -0.15 * s, 0] });
  addMesh(g, box(W * 2, 0.3 * s, L), dark, { pos: [0, H, 0] });
  for (const sx of [-1, 1]) {
    addMesh(g, box(0.3 * s, H, L), wall, { pos: [sx * W, H / 2, 0] });
    // Ribs and pipe runs.
    for (let i = 0; i < 5; i++) {
      addMesh(g, box(0.42 * s, H, 0.42 * s), dark, { pos: [sx * (W - 0.26 * s), H / 2, -L / 2 + (i + 0.5) * (L / 5)] });
    }
    addMesh(g, box(0.3 * s, 0.3 * s, L), dark, { pos: [sx * (W - 0.3 * s), H * 0.82, 0] });
    addMesh(g, box(0.24 * s, 0.24 * s, L), dark, { pos: [sx * (W - 0.3 * s), H * 0.2, 0] });
    addMesh(g, box(0.4 * s, 0.12 * s, L), paint(0x5d636b), { pos: [sx * (W - 0.22 * s), H * 0.52, 0] });
  }
  if (lit) {
    for (let i = 0; i < 3; i++) {
      addMesh(g, box(1.6 * s, 0.12 * s, 0.5 * s), emissive(0xfff2d8, { blending: THREE.NormalBlending, depthWrite: true }),
        { pos: [0, H - 0.12 * s, -L / 2 + (i + 0.5) * (L / 3)] });
      const glow = addMesh(g, new THREE.PlaneGeometry(3.4 * s, 2.4 * s), glowPlane({ color: 0xffe9c0, opacity: 0.16 }),
        { pos: [0, H - 0.5 * s, -L / 2 + (i + 0.5) * (L / 3)], rot: [Math.PI / 2, 0, 0] });
      glow.renderOrder = 3;
    }
  }
  return g;
}

/** Blast door at the end of a corridor; slides or gets cut open. */
export function blastDoor({ scale = 1, width = 6.4, height = 3.4 } = {}) {
  const g = new THREE.Group();
  const s = scale;
  const metal = hull({ base: [146, 150, 158], seed: 36, repeat: [1, 1], density: 2, grime: 0.35, rivets: false });
  const dark = paint(0x3f434a);
  addMesh(g, box(width * s, height * s, 0.4 * s), metal, { pos: [0, (height / 2) * s, 0] });
  addMesh(g, box(width * s * 1.06, 0.4 * s, 0.6 * s), dark, { pos: [0, height * s, 0] });
  addMesh(g, box(0.5 * s, height * s, 0.6 * s), dark, { pos: [0, (height / 2) * s, 0] });
  for (let i = 0; i < 4; i++) {
    addMesh(g, box(width * s * 0.9, 0.12 * s, 0.5 * s), dark, { pos: [0, (0.5 + i * 0.72) * s, 0.05 * s] });
  }
  return g;
}
