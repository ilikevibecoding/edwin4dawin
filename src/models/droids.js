// The two droids. They carry the plot, so they get more polygons than anyone
// else on the ground.

import * as THREE from 'three';
import { box, cyl, dome, addMesh, ngonPlate } from '../gfx/build.js';
import { paint, emissive, glass, glowPlane } from '../gfx/materials.js';
import { RNG } from '../util/rng.js';

/**
 * Astromech: 1.1 m barrel, rotating dome, two outboard legs and a retractable
 * centre foot. userData.step(t) drives the waddle.
 */
export function astromech({ scale = 1, accent = 0x2f6fd0 } = {}) {
  const g = new THREE.Group();
  const s = scale;
  const white = paint(0xdadcdd, { flat: false });
  const grey = paint(0x9aa0a6, { flat: false });
  const dark = paint(0x35383c);
  const blue = paint(accent, { flat: false });

  const bodyH = 0.72 * s;
  const bodyR = 0.3 * s;
  const body = new THREE.Group();
  body.position.y = 0.42 * s;
  g.add(body);
  addMesh(body, cyl(bodyR, bodyR, bodyH, 14), white);
  // Panel details around the barrel.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    addMesh(body, box(0.16 * s, 0.2 * s, 0.03 * s), i % 2 ? blue : grey,
      { pos: [Math.sin(a) * bodyR, 0.12 * s, Math.cos(a) * bodyR], rot: [0, a, 0] });
    addMesh(body, box(0.13 * s, 0.1 * s, 0.03 * s), dark,
      { pos: [Math.sin(a + 0.5) * bodyR, -0.18 * s, Math.cos(a + 0.5) * bodyR], rot: [0, a + 0.5, 0] });
  }
  addMesh(body, cyl(bodyR * 1.02, bodyR * 1.02, 0.05 * s, 14), grey, { pos: [0, bodyH * 0.28, 0] });
  addMesh(body, cyl(bodyR * 1.02, bodyR * 1.02, 0.05 * s, 14), grey, { pos: [0, -bodyH * 0.3, 0] });

  // Dome.
  const domeG = new THREE.Group();
  domeG.position.y = bodyH * 0.5;
  body.add(domeG);
  addMesh(domeG, dome(bodyR, { segments: 16, rings: 8 }), white);
  addMesh(domeG, cyl(bodyR * 0.99, bodyR * 0.99, 0.04 * s, 16), blue, { pos: [0, 0.02 * s, 0] });
  addMesh(domeG, box(0.12 * s, 0.09 * s, 0.02 * s), dark, { pos: [0, 0.13 * s, bodyR * 0.94] });
  const eye = addMesh(domeG, cyl(0.035 * s, 0.035 * s, 0.02 * s, 10, { alongZ: true }),
    emissive(0xff4a3a, { blending: THREE.NormalBlending, depthWrite: true }), { pos: [0, 0.13 * s, bodyR * 0.96] });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.8;
    addMesh(domeG, box(0.06 * s, 0.05 * s, 0.02 * s), blue,
      { pos: [Math.sin(a) * bodyR * 0.82, 0.2 * s, Math.cos(a) * bodyR * 0.82], rot: [0, a, 0] });
  }
  addMesh(domeG, cyl(0.02 * s, 0.02 * s, 0.14 * s, 6), grey, { pos: [bodyR * 0.4, 0.3 * s, -bodyR * 0.3] });

  // Legs.
  const legs = [];
  for (const sx of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(sx * bodyR * 1.05, 0.42 * s, 0);
    g.add(leg);
    addMesh(leg, box(0.14 * s, 0.5 * s, 0.24 * s), grey, { pos: [0, -0.16 * s, 0] });
    addMesh(leg, box(0.2 * s, 0.16 * s, 0.42 * s), dark, { pos: [0, -0.42 * s, 0.04 * s] });
    addMesh(leg, cyl(0.09 * s, 0.09 * s, 0.16 * s, 8), dark, { pos: [0, -0.44 * s, 0.16 * s], rot: [0, 0, Math.PI / 2] });
    legs.push(leg);
  }
  const centre = new THREE.Group();
  g.add(centre);
  addMesh(centre, box(0.12 * s, 0.44 * s, 0.16 * s), grey, { pos: [0, 0.22 * s, -bodyR * 0.75] });
  addMesh(centre, box(0.16 * s, 0.12 * s, 0.3 * s), dark, { pos: [0, 0.05 * s, -bodyR * 0.8] });
  g.userData.centreLeg = centre;
  g.userData.dome = domeG;
  g.userData.eye = eye;
  g.userData.legs = legs;

  // Waddle: rock side to side and bob, the way a barrel on two legs must.
  g.userData.step = (t, speed = 1) => {
    const p = t * speed * 6.0;
    body.rotation.z = Math.sin(p) * 0.09;
    body.position.y = 0.42 * s + Math.abs(Math.sin(p)) * 0.02 * s;
    legs[0].rotation.x = Math.sin(p) * 0.12;
    legs[1].rotation.x = -Math.sin(p) * 0.12;
  };
  g.userData.lookAround = (t) => {
    domeG.rotation.y = Math.sin(t * 0.7) * 0.9 + Math.sin(t * 1.9) * 0.25;
  };
  return g;
}

/** Protocol droid: fussy, gold, and permanently at a slight forward stoop. */
export function protocolDroid({ scale = 1 } = {}) {
  const g = new THREE.Group();
  const s = scale;
  const gold = paint(0xc9a03c, { flat: false });
  const goldDark = paint(0x8a6c22, { flat: false });
  const dark = paint(0x2b2620);

  const hips = new THREE.Group();
  hips.position.y = 0.86 * s;
  g.add(hips);
  const torso = new THREE.Group();
  hips.add(torso);
  addMesh(torso, cyl(0.2 * s, 0.24 * s, 0.5 * s, 12), gold, { pos: [0, 0.24 * s, 0] });
  addMesh(torso, box(0.3 * s, 0.16 * s, 0.2 * s), goldDark, { pos: [0, 0.44 * s, 0.04 * s] });
  addMesh(torso, box(0.1 * s, 0.14 * s, 0.06 * s), dark, { pos: [0, 0.3 * s, 0.2 * s] });
  addMesh(torso, cyl(0.18 * s, 0.2 * s, 0.16 * s, 12), goldDark, { pos: [0, -0.05 * s, 0] });

  // Head.
  const head = new THREE.Group();
  head.position.set(0, 0.62 * s, 0);
  torso.add(head);
  addMesh(head, cyl(0.05 * s, 0.05 * s, 0.1 * s, 8), goldDark, { pos: [0, -0.06 * s, 0] });
  addMesh(head, cyl(0.13 * s, 0.14 * s, 0.2 * s, 12), gold);
  addMesh(head, dome(0.13 * s, { segments: 12, rings: 6 }), gold, { pos: [0, 0.09 * s, 0] });
  addMesh(head, box(0.2 * s, 0.1 * s, 0.05 * s), goldDark, { pos: [0, 0.02 * s, 0.11 * s] });
  for (const sx of [-1, 1]) {
    addMesh(head, cyl(0.032 * s, 0.032 * s, 0.03 * s, 10, { alongZ: true }),
      emissive(0xfff2c0, { blending: THREE.NormalBlending, depthWrite: true }), { pos: [sx * 0.055 * s, 0.03 * s, 0.13 * s] });
  }
  addMesh(head, box(0.09 * s, 0.03 * s, 0.03 * s), dark, { pos: [0, -0.05 * s, 0.12 * s] });

  const limbs = { arms: [], legs: [] };
  for (const sx of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(sx * 0.24 * s, 0.42 * s, 0);
    torso.add(shoulder);
    addMesh(shoulder, cyl(0.07 * s, 0.07 * s, 0.06 * s, 8), goldDark, { rot: [0, 0, Math.PI / 2] });
    addMesh(shoulder, cyl(0.055 * s, 0.06 * s, 0.32 * s, 8), gold, { pos: [0, -0.18 * s, 0] });
    const elbow = new THREE.Group();
    elbow.position.y = -0.34 * s;
    shoulder.add(elbow);
    addMesh(elbow, cyl(0.05 * s, 0.055 * s, 0.3 * s, 8), gold, { pos: [0, -0.15 * s, 0] });
    addMesh(elbow, box(0.08 * s, 0.12 * s, 0.06 * s), goldDark, { pos: [0, -0.34 * s, 0.01 * s] });
    limbs.arms.push({ shoulder, elbow });

    const hip = new THREE.Group();
    hip.position.set(sx * 0.11 * s, -0.06 * s, 0);
    hips.add(hip);
    addMesh(hip, cyl(0.07 * s, 0.075 * s, 0.4 * s, 8), gold, { pos: [0, -0.2 * s, 0] });
    const knee = new THREE.Group();
    knee.position.y = -0.4 * s;
    hip.add(knee);
    addMesh(knee, cyl(0.06 * s, 0.065 * s, 0.38 * s, 8), gold, { pos: [0, -0.19 * s, 0] });
    addMesh(knee, box(0.12 * s, 0.06 * s, 0.24 * s), goldDark, { pos: [0, -0.4 * s, 0.04 * s] });
    limbs.legs.push({ hip, knee });
  }

  g.userData.rig = { hips, torso, head, ...limbs };
  g.userData.step = (t, speed = 1) => {
    const p = t * speed * 3.6;
    const a = Math.sin(p);
    limbs.legs[0].hip.rotation.x = a * 0.42;
    limbs.legs[1].hip.rotation.x = -a * 0.42;
    limbs.legs[0].knee.rotation.x = Math.max(0, -a) * 0.55;
    limbs.legs[1].knee.rotation.x = Math.max(0, a) * 0.55;
    limbs.arms[0].shoulder.rotation.x = -a * 0.3;
    limbs.arms[1].shoulder.rotation.x = a * 0.3;
    limbs.arms[0].elbow.rotation.x = -0.5 - Math.max(0, a) * 0.2;
    limbs.arms[1].elbow.rotation.x = -0.5 - Math.max(0, -a) * 0.2;
    hips.position.y = 0.86 * s + Math.abs(Math.cos(p)) * 0.02 * s;
    torso.rotation.x = 0.1;
    torso.rotation.z = Math.sin(p) * 0.03;
  };
  g.userData.step(0);
  return g;
}
