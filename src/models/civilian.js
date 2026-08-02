// Working ships: the battered light freighter that gets everyone off Tessaru,
// the scrap haulers' sandcrawler, and a farm speeder.

import * as THREE from 'three';
import { box, cyl, dome, prismoid, ngonPlate, greebleField, mergeAll, mat, addMesh } from '../gfx/build.js';
import { hull, paint, emissive, glowPlane, glass, greebled } from '../gfx/materials.js';
import { RNG } from '../util/rng.js';

/**
 * Light freighter: a 34 m saucer with a forward cargo fork, an offset cockpit
 * pod on the starboard side and one enormous engine strip across the back.
 * Nose +Z.
 */
export function freighter({ scale = 1, seed = 8 } = {}) {
  const g = new THREE.Group();
  g.name = 'freighter';
  const s = scale;
  const plate = hull({ color: 0xffffff, base: [176, 172, 158], seed: 33, repeat: [3, 3], density: 5, grime: 0.55 });
  const grey = paint(0x82807a);
  const dark = paint(0x3d3b38);

  const R = 14 * s;
  // Hull: two shallow cones back to back gives the saucer a soft edge.
  addMesh(g, cyl(R * 0.82, R, 1.9 * s, 26), plate, { pos: [0, 0.95 * s, 0] });
  addMesh(g, cyl(R, R * 0.82, 1.9 * s, 26), plate, { pos: [0, -0.95 * s, 0] });
  addMesh(g, cyl(R * 0.44, R * 0.52, 1.5 * s, 20), plate, { pos: [0, 2.5 * s, -1 * s] });

  // Deck greebles top and bottom.
  const topG = greebleField({ seed: seed, count: 190, width: R * 1.5, depth: R * 1.5, y: 1.85 * s, sizeMin: 0.3 * s, sizeMax: 1.9 * s, heightMin: 0.15 * s, heightMax: 1.1 * s, mask: (x, z) => Math.hypot(x, z) < R * 0.94 });
  g.add(new THREE.Mesh(topG, greebled({ color: 0xffffff, seed: 77, repeat: [6, 6], base: [150, 148, 138] })));
  const botG = greebleField({ seed: seed + 1, count: 120, width: R * 1.5, depth: R * 1.5, y: 1.85 * s, sizeMin: 0.3 * s, sizeMax: 1.6 * s, heightMin: 0.15 * s, heightMax: 0.9 * s, mask: (x, z) => Math.hypot(x, z) < R * 0.9 });
  botG.rotateX(Math.PI);
  g.add(new THREE.Mesh(botG, greebled({ color: 0xffffff, seed: 78, repeat: [6, 6], base: [138, 136, 128] })));

  // Forward cargo fork.
  for (const sx of [-1, 1]) {
    addMesh(g, prismoid(
      [[-1.9 * s, -5 * s], [1.9 * s, -5 * s], [1.4 * s, 5 * s], [-1.4 * s, 5 * s]],
      [[-1.7 * s, -5 * s], [1.7 * s, -5 * s], [1.2 * s, 5 * s], [-1.2 * s, 5 * s]],
      2.6 * s, { uvScale: 0.1 }), plate, { pos: [sx * 4.4 * s, -1.3 * s, R * 0.86] });
    addMesh(g, box(0.9 * s, 0.7 * s, 2 * s), dark, { pos: [sx * 4.4 * s, 0.2 * s, R * 0.86 + 5.4 * s] });
  }

  // Starboard cockpit pod on a short tube.
  const cock = new THREE.Group();
  cock.position.set(R * 0.62, -0.2 * s, R * 0.44);
  cock.rotation.y = -0.42;
  g.add(cock);
  addMesh(cock, cyl(1.5 * s, 1.7 * s, 6.4 * s, 12, { alongZ: true }), plate, { pos: [0, 0, 1.6 * s] });
  addMesh(cock, ngonPlate(2.2 * s, 8, 2.4 * s, { rotate: Math.PI / 8 }), plate, { pos: [0, 0, 5.6 * s], rot: [Math.PI / 2, 0, 0] });
  addMesh(cock, ngonPlate(1.75 * s, 8, 0.3 * s, { rotate: Math.PI / 8 }), emissive(0x8fd4ff, { blending: THREE.NormalBlending, depthWrite: true }), { pos: [0, 0, 6.85 * s], rot: [Math.PI / 2, 0, 0] });

  // Dorsal quad turret + dish.
  addMesh(g, cyl(1.5 * s, 1.7 * s, 0.9 * s, 12), grey, { pos: [0, 3.3 * s, -1 * s] });
  addMesh(g, dome(1.35 * s, { segments: 12, rings: 6 }), glass(0x1b2733, 0.75), { pos: [0, 3.6 * s, -1 * s] });
  const dish = new THREE.Group();
  dish.position.set(-R * 0.3, 2.2 * s, -R * 0.35);
  g.add(dish);
  addMesh(dish, cyl(0.22 * s, 0.26 * s, 1.6 * s, 6), grey, { pos: [0, 0.8 * s, 0] });
  addMesh(dish, new THREE.CircleGeometry(1.9 * s, 14), grey, { pos: [0, 1.7 * s, 0], rot: [-1.1, 0, 0] });
  g.userData.dish = dish;

  // Engine strip across the stern.
  const strip = new THREE.Group();
  strip.position.set(0, 0.2 * s, -R * 0.96);
  g.add(strip);
  addMesh(strip, box(R * 1.15, 2.1 * s, 1.2 * s), dark);
  const core = addMesh(strip, box(R * 1.02, 1.05 * s, 0.4 * s), emissive(0x9fd0ee, { blending: THREE.NormalBlending, depthWrite: true }), { pos: [0, 0, -0.5 * s] });
  const halo = addMesh(strip, new THREE.PlaneGeometry(R * 1.55, 6 * s), glowPlane({ color: 0x9fd6ff, opacity: 0.5 }), { pos: [0, 0, -2.4 * s] });
  halo.renderOrder = 4;
  g.userData.engineGlows = [halo];
  g.userData.engineCores = [core];
  g.userData.setThrottle = (v) => {
    halo.scale.set(1, 0.55 + v * 0.9, 1);
    halo.material.opacity = 0.18 + v * 0.4;
    core.material.opacity = 0.55 + v * 0.45;
  };
  g.userData.setThrottle(0.7);

  // Retractable gear for the takeoff shot.
  const gear = new THREE.Group();
  g.add(gear);
  for (const [gx, gz] of [[0, R * 0.55], [-R * 0.55, -R * 0.4], [R * 0.55, -R * 0.4]]) {
    addMesh(gear, cyl(0.4 * s, 0.4 * s, 4.2 * s, 8), grey, { pos: [gx, -3.4 * s, gz] });
    addMesh(gear, box(2.2 * s, 0.5 * s, 2.2 * s), dark, { pos: [gx, -5.6 * s, gz] });
  }
  g.userData.gear = gear;
  g.userData.setGear = (down) => { gear.visible = down; };
  return g;
}

/** Sandcrawler: a rusted trapezoid the size of an office block, on treads. */
export function sandcrawler({ scale = 1, seed = 12 } = {}) {
  const g = new THREE.Group();
  const s = scale;
  const W = 24 * s;
  const L = 38 * s;
  const H = 22 * s;
  const rust = hull({ color: 0xffffff, base: [150, 112, 74], seed: 91, repeat: [3, 2], density: 4, grime: 0.7 });
  const dark = paint(0x3a2f26);

  addMesh(g, prismoid(
    [[-W / 2, -L / 2], [W / 2, -L / 2], [W / 2, L / 2], [-W / 2, L / 2]],
    [[-W * 0.28, -L * 0.4], [W * 0.28, -L * 0.4], [W * 0.3, L * 0.34], [-W * 0.3, L * 0.34]],
    H, { uvScale: 0.05 }), rust, { pos: [0, 5 * s, 0] });
  // Sloped bow.
  addMesh(g, prismoid(
    [[-W / 2, -L * 0.1], [W / 2, -L * 0.1], [W * 0.42, L * 0.12], [-W * 0.42, L * 0.12]],
    [[-W * 0.44, -L * 0.1], [W * 0.44, -L * 0.1], [W * 0.3, L * 0.1], [-W * 0.3, L * 0.1]],
    H * 0.55, { uvScale: 0.05 }), rust, { pos: [0, 5 * s, L * 0.52] });
  // Loading ramp + lit interior.
  addMesh(g, box(W * 0.42, 0.6 * s, L * 0.22), dark, { pos: [0, 3.2 * s, L * 0.56], rot: [-0.42, 0, 0] });
  addMesh(g, box(W * 0.36, H * 0.2, 0.4 * s), emissive(0xffb257, { blending: THREE.NormalBlending, depthWrite: true }), { pos: [0, 8 * s, L * 0.5] });

  // Treads.
  for (const sx of [-1, 1]) {
    addMesh(g, box(W * 0.16, 5 * s, L * 0.94), dark, { pos: [sx * W * 0.44, 2.5 * s, 0] });
    for (let i = 0; i < 7; i++) {
      addMesh(g, cyl(2.2 * s, 2.2 * s, W * 0.2, 10), paint(0x2b241d),
        { pos: [sx * W * 0.44, 2.4 * s, -L * 0.4 + (i / 6) * L * 0.8], rot: [0, 0, Math.PI / 2] });
    }
  }
  // Exhaust stacks and antennae.
  const r = new RNG(seed);
  for (let i = 0; i < 8; i++) {
    addMesh(g, cyl(0.5 * s, 0.7 * s, r.float(2, 5) * s, 6), dark,
      { pos: [r.float(-W * 0.24, W * 0.24), H + 5 * s, r.float(-L * 0.34, L * 0.28)] });
  }
  addMesh(g, cyl(0.16 * s, 0.16 * s, 9 * s, 4), dark, { pos: [W * 0.2, H + 9 * s, -L * 0.3] });
  return g;
}

/** Open-topped farm speeder, hovering a metre off the sand. */
export function speeder({ scale = 1 } = {}) {
  const g = new THREE.Group();
  const s = scale;
  const shell = hull({ color: 0xffffff, base: [172, 164, 148], seed: 55, repeat: [2, 2], density: 3, grime: 0.6 });
  const dark = paint(0x4c463d);
  addMesh(g, prismoid(
    [[-1.15 * s, -2.6 * s], [1.15 * s, -2.6 * s], [0.85 * s, 2.9 * s], [-0.85 * s, 2.9 * s]],
    [[-1.0 * s, -2.4 * s], [1.0 * s, -2.4 * s], [0.62 * s, 2.7 * s], [-0.62 * s, 2.7 * s]],
    0.75 * s, { uvScale: 0.3 }), shell);
  addMesh(g, box(1.9 * s, 0.5 * s, 1.4 * s), dark, { pos: [0, 0.5 * s, -0.9 * s] });
  for (const sx of [-1, 1]) {
    addMesh(g, cyl(0.55 * s, 0.55 * s, 3.4 * s, 10, { alongZ: true }), shell, { pos: [sx * 1.5 * s, 0.35 * s, 0.4 * s] });
    addMesh(g, new THREE.CircleGeometry(0.4 * s, 10), emissive(0xff9a4a, { blending: THREE.NormalBlending, depthWrite: true }), { pos: [sx * 1.5 * s, 0.35 * s, -1.32 * s], rot: [0, Math.PI, 0] });
  }
  addMesh(g, box(1.5 * s, 0.12 * s, 0.7 * s), dark, { pos: [0, 0.78 * s, 1.4 * s] });
  return g;
}
