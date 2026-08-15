import * as THREE from 'three';
import { beveledBox, latheProfile, mesh, merge, instanceBolts, addCollider } from './geom.js';
import { makeGaugeFace, makeLabelTexture } from './textures.js';

export function createBoltRing(radius, count, material, y, zRot = 0) {
  const pos = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + zRot;
    pos.push({
      x: Math.cos(a) * radius,
      y,
      z: Math.sin(a) * radius,
      rx: Math.PI / 2,
      ry: 0,
      rz: 0,
    });
  }
  return instanceBolts(pos, material, 0.012, 0.018);
}

export function createValveAssembly(mats, scale = 1) {
  const g = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(0.07 * scale, 14, 10), mats.oilyMachine);
  const neck = mesh(new THREE.CylinderGeometry(0.028 * scale, 0.032 * scale, 0.08 * scale, 12), mats.gunmetal, 0, 0.08 * scale, 0);
  const wheel = mesh(new THREE.TorusGeometry(0.07 * scale, 0.01 * scale, 8, 16), mats.warning, 0, 0.14 * scale, 0, Math.PI / 2, 0, 0);
  const spokeGeo = new THREE.CylinderGeometry(0.006 * scale, 0.006 * scale, 0.12 * scale, 6);
  for (let i = 0; i < 3; i++) {
    const s = mesh(spokeGeo, mats.brushedMetal, 0, 0.14 * scale, 0, 0, 0, (i / 3) * Math.PI);
    g.add(s);
  }
  const hub = mesh(new THREE.CylinderGeometry(0.016 * scale, 0.016 * scale, 0.02 * scale, 10), mats.brushedMetal, 0, 0.14 * scale, 0);
  const inlet = mesh(new THREE.CylinderGeometry(0.032 * scale, 0.032 * scale, 0.08 * scale, 12), mats.pipe, 0.07 * scale, 0, 0, 0, 0, Math.PI / 2);
  const outlet = mesh(new THREE.CylinderGeometry(0.032 * scale, 0.032 * scale, 0.08 * scale, 12), mats.pipe, -0.07 * scale, 0, 0, 0, 0, Math.PI / 2);
  const flangeA = mesh(new THREE.CylinderGeometry(0.05 * scale, 0.05 * scale, 0.012 * scale, 14), mats.gunmetal, 0.11 * scale, 0, 0, 0, 0, Math.PI / 2);
  const flangeB = mesh(new THREE.CylinderGeometry(0.05 * scale, 0.05 * scale, 0.012 * scale, 14), mats.gunmetal, -0.11 * scale, 0, 0, 0, 0, Math.PI / 2);
  g.add(body, neck, wheel, hub, inlet, outlet, flangeA, flangeB);
  g.userData.kind = 'valve';
  return g;
}

export function createGauge(mats, seed = 1, label = 'PSI', max = 300) {
  const g = new THREE.Group();
  const face = makeGaugeFace(seed, label, max);
  const housing = mesh(new THREE.CylinderGeometry(0.055, 0.058, 0.028, 20), mats.gunmetal, 0, 0, 0, Math.PI / 2, 0, 0);
  const glass = mesh(new THREE.CircleGeometry(0.048, 20), mats.thickGlass, 0, 0, 0.015);
  const dial = mesh(new THREE.CircleGeometry(0.046, 20), new THREE.MeshStandardMaterial({ map: face, roughness: 0.45, metalness: 0 }), 0, 0, 0.012);
  const needle = mesh(new THREE.BoxGeometry(0.004, 0.038, 0.002), mats.warning, 0, 0.01, 0.014);
  needle.userData.base = face.userData.needle * Math.PI * 1.4 - Math.PI * 0.7;
  needle.rotation.z = needle.userData.base;
  const mount = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 8), mats.brushedMetal, 0, -0.04, 0);
  g.add(housing, glass, dial, needle, mount);
  g.userData.needle = needle;
  g.userData.kind = 'gauge';
  return g;
}

export function createPump(mats, scale = 1) {
  const g = new THREE.Group();
  const body = mesh(latheProfile([
    [0.0, -0.16],
    [0.12, -0.16],
    [0.14, -0.1],
    [0.15, 0.02],
    [0.13, 0.1],
    [0.08, 0.14],
    [0.0, 0.14],
  ].map((p) => [p[0] * scale, p[1] * scale]), 22), mats.oilyMachine);
  const motor = mesh(new THREE.CylinderGeometry(0.09 * scale, 0.09 * scale, 0.16 * scale, 18), mats.machineBlue, 0, 0.22 * scale, 0);
  const fins = new THREE.Group();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const fin = mesh(beveledBox(0.012 * scale, 0.12 * scale, 0.04 * scale, 0.003), mats.gunmetal, Math.cos(a) * 0.095 * scale, 0.22 * scale, Math.sin(a) * 0.095 * scale);
    fin.lookAt(0, 0.22 * scale, 0);
    fins.add(fin);
  }
  const inlet = mesh(new THREE.CylinderGeometry(0.04 * scale, 0.04 * scale, 0.14 * scale, 12), mats.pipe, 0.16 * scale, -0.04 * scale, 0, 0, 0, Math.PI / 2);
  const outlet = mesh(new THREE.CylinderGeometry(0.036 * scale, 0.036 * scale, 0.12 * scale, 12), mats.pipeBlue, 0, 0.02 * scale, 0.16 * scale, Math.PI / 2, 0, 0);
  const base = mesh(beveledBox(0.22 * scale, 0.04 * scale, 0.18 * scale, 0.008), mats.gunmetal, 0, -0.18 * scale, 0);
  const plate = mesh(beveledBox(0.1 * scale, 0.08 * scale, 0.02 * scale, 0.004), mats.chippedPaint, 0.1 * scale, 0.06 * scale, 0);
  g.add(body, motor, fins, inlet, outlet, base, plate);
  g.userData.kind = 'pump';
  g.userData.spin = fins;
  return g;
}

export function createCompressor(mats) {
  const g = new THREE.Group();
  g.add(mesh(beveledBox(0.42, 0.28, 0.28, 0.012), mats.machineBlue, 0, 0.16, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.22, 16), mats.oilyMachine, -0.08, 0.34, 0, 0, 0, Math.PI / 2));
  g.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.22, 16), mats.oilyMachine, 0.1, 0.34, 0, 0, 0, Math.PI / 2));
  g.add(mesh(new THREE.TorusGeometry(0.07, 0.018, 8, 16), mats.pipeCopper, 0.22, 0.22, 0.08, 0, Math.PI / 2, 0));
  g.add(mesh(beveledBox(0.48, 0.05, 0.32, 0.006), mats.gunmetal, 0, 0.02, 0));
  const fan = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 12), mats.brushedMetal, 0.24, 0.16, 0, 0, 0, Math.PI / 2);
  g.add(fan);
  g.userData.spin = fan;
  g.userData.kind = 'compressor';
  return g;
}

export function createMotor(mats) {
  const g = new THREE.Group();
  const housing = mesh(latheProfile([
    [0.0, -0.55],
    [0.28, -0.55],
    [0.32, -0.48],
    [0.34, -0.2],
    [0.34, 0.35],
    [0.3, 0.5],
    [0.18, 0.58],
    [0.0, 0.58],
  ], 28), mats.oilyMachine);
  housing.rotation.z = Math.PI / 2;
  const jacket = mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.7, 28), mats.machineBlue, 0, 0, 0, 0, 0, Math.PI / 2);
  const finGeos = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const fg = beveledBox(0.018, 0.08, 0.55, 0.003);
    fg.rotateX(a);
    fg.translate(0, Math.sin(a) * 0.38, Math.cos(a) * 0.38);
    finGeos.push(fg);
  }
  g.add(mesh(merge(finGeos), mats.gunmetal));
  const ringF = mesh(new THREE.TorusGeometry(0.36, 0.03, 10, 28), mats.gunmetal, -0.36, 0, 0, 0, Math.PI / 2, 0);
  const ringA = mesh(new THREE.TorusGeometry(0.36, 0.03, 10, 28), mats.gunmetal, 0.36, 0, 0, 0, Math.PI / 2, 0);
  const shaft = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.55, 16), mats.brushedMetal, 0.62, 0, 0, 0, 0, Math.PI / 2);
  const coupling = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 16), mats.gunmetal, 0.82, 0, 0, 0, 0, Math.PI / 2);
  const plate = mesh(beveledBox(0.28, 0.22, 0.04, 0.006), mats.chippedPaint, 0, 0.22, 0.3);
  const terminal = mesh(beveledBox(0.18, 0.12, 0.14, 0.006), mats.plastic, -0.2, 0.28, 0);
  const base = mesh(beveledBox(1.05, 0.1, 0.55, 0.01), mats.gunmetal, 0.1, -0.4, 0);
  const feetL = mesh(beveledBox(0.9, 0.08, 0.1, 0.006), mats.oilyMachine, 0.05, -0.42, 0.22);
  const feetR = mesh(beveledBox(0.9, 0.08, 0.1, 0.006), mats.oilyMachine, 0.05, -0.42, -0.22);
  const bolts = createBoltRing(0.34, 12, mats.brushedMetal, 0, 0);
  bolts.rotation.z = Math.PI / 2;
  bolts.position.x = -0.36;
  g.add(housing, jacket, ringF, ringA, shaft, coupling, plate, terminal, base, feetL, feetR, bolts);
  g.userData.kind = 'motor';
  g.userData.shaft = shaft;
  return g;
}

export function createGearbox(mats) {
  const g = new THREE.Group();
  g.add(mesh(beveledBox(0.55, 0.42, 0.48, 0.016), mats.oilyMachine, 0, 0.05, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 20), mats.gunmetal, 0.3, 0.08, 0, 0, 0, Math.PI / 2));
  g.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 16), mats.gunmetal, -0.3, 0.02, 0, 0, 0, Math.PI / 2));
  g.add(mesh(beveledBox(0.2, 0.08, 0.16, 0.004), mats.chippedPaint, 0, 0.28, 0.2));
  g.add(mesh(beveledBox(0.62, 0.08, 0.52, 0.008), mats.gunmetal, 0, -0.2, 0));
  return g;
}

export function createCabinet(mats, w = 0.42, h = 1.15, d = 0.28, label = 'PWR') {
  const g = new THREE.Group();
  g.add(mesh(beveledBox(w, h, d, 0.01), mats.machineBlue, 0, h * 0.5, 0));
  g.add(mesh(beveledBox(w - 0.04, h - 0.12, 0.02, 0.004), mats.gunmetal, 0, h * 0.5, d * 0.5 - 0.01));
  const handle = mesh(new THREE.TorusGeometry(0.03, 0.007, 6, 12, Math.PI), mats.brushedMetal, w * 0.32, h * 0.55, d * 0.5);
  handle.rotation.y = Math.PI / 2;
  g.add(handle);
  const vents = [];
  for (let i = 0; i < 8; i++) {
    vents.push(mesh(beveledBox(w * 0.55, 0.012, 0.01, 0.002), mats.blackout, 0, 0.22 + i * 0.08, d * 0.5 + 0.004));
  }
  vents.forEach((v) => g.add(v));
  const lamp = mesh(new THREE.CircleGeometry(0.012, 10), mats.emissiveGreen, -w * 0.32, h - 0.1, d * 0.5 + 0.012);
  g.add(lamp);
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.16, 0.05),
    new THREE.MeshStandardMaterial({ map: makeLabelTexture(label, { w: 256, h: 80, bg: '#3a3a32', fg: '#d8d0b0' }), roughness: 0.6 }),
  );
  plate.position.set(0, h - 0.12, d * 0.5 + 0.014);
  g.add(plate);
  g.userData.kind = 'cabinet';
  return g;
}

export function createTank(mats, r = 0.16, h = 0.42) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(r, r, h, 18), mats.machineBlue, 0, h * 0.5, 0));
  g.add(mesh(new THREE.SphereGeometry(r, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mats.machineBlue, 0, h, 0));
  g.add(mesh(new THREE.TorusGeometry(r, 0.014, 8, 18), mats.gunmetal, 0, h * 0.35, 0, Math.PI / 2, 0, 0));
  g.add(mesh(new THREE.TorusGeometry(r, 0.014, 8, 18), mats.gunmetal, 0, h * 0.7, 0, Math.PI / 2, 0, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.08, 8), mats.pipe, 0, h + r * 0.4, 0));
  return g;
}

export function createFan(mats, r = 0.09) {
  const g = new THREE.Group();
  const housing = mesh(new THREE.CylinderGeometry(r + 0.012, r + 0.012, 0.04, 16, 1, true), mats.gunmetal);
  const grill = mesh(new THREE.TorusGeometry(r * 0.55, 0.006, 6, 16), mats.brushedMetal, 0, 0, 0.01, Math.PI / 2, 0, 0);
  const blades = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const b = mesh(beveledBox(r * 0.85, 0.018, 0.008, 0.002), mats.plastic);
    b.position.x = r * 0.32;
    const hold = new THREE.Group();
    hold.rotation.z = (i / 5) * Math.PI * 2;
    hold.add(b);
    blades.add(hold);
  }
  g.add(housing, grill, blades);
  g.userData.spin = blades;
  g.userData.kind = 'fan';
  return g;
}

export function createHeatExchanger(mats) {
  const g = new THREE.Group();
  g.add(mesh(beveledBox(0.22, 0.38, 0.18, 0.008), mats.machineBlue, 0, 0.2, 0));
  for (let i = 0; i < 9; i++) {
    g.add(mesh(beveledBox(0.2, 0.008, 0.2, 0.001), mats.brushedMetal, 0, 0.06 + i * 0.036, 0));
  }
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 10), mats.pipeCopper, 0.14, 0.34, 0, 0, 0, Math.PI / 2));
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 10), mats.pipeBlue, 0.14, 0.08, 0, 0, 0, Math.PI / 2));
  return g;
}

export function createJunctionBox(mats, w = 0.16, h = 0.12, d = 0.08) {
  const g = new THREE.Group();
  g.add(mesh(beveledBox(w, h, d, 0.006), mats.plastic));
  g.add(mesh(beveledBox(w * 0.7, 0.012, 0.01, 0.002), mats.brushedMetal, 0, h * 0.28, d * 0.5));
  return g;
}

export function createCableTray(mats, length = 2, width = 0.16) {
  const g = new THREE.Group();
  g.add(mesh(beveledBox(width, 0.016, length, 0.002), mats.gunmetal));
  g.add(mesh(beveledBox(0.012, 0.04, length, 0.002), mats.gunmetal, -width * 0.5, 0.02, 0));
  g.add(mesh(beveledBox(0.012, 0.04, length, 0.002), mats.gunmetal, width * 0.5, 0.02, 0));
  const cableMat = [mats.pipeCopper, mats.plastic, mats.pipe];
  for (let i = 0; i < 5; i++) {
    const c = mesh(new THREE.CylinderGeometry(0.012, 0.012, length * 0.96, 6), cableMat[i % 3], -width * 0.3 + i * 0.03, 0.02, 0, Math.PI / 2, 0, 0);
    g.add(c);
  }
  return g;
}

export function createHandrail(mats, length = 1.2) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.016, 0.016, length, 8), mats.brushedMetal, 0, 0, 0, Math.PI / 2, 0, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 8), mats.brushedMetal, 0, -0.14, -length * 0.4));
  g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 8), mats.brushedMetal, 0, -0.14, length * 0.4));
  return g;
}

export function createToolCabinet(mats) {
  const g = createCabinet(mats, 0.36, 0.95, 0.24, 'TOOLS');
  return g;
}

export function createSwitchBank(mats, count = 8) {
  const g = new THREE.Group();
  g.add(mesh(beveledBox(0.22, 0.08, 0.04, 0.004), mats.plastic));
  for (let i = 0; i < count; i++) {
    const x = -0.09 + (i % 4) * 0.06;
    const y = i < 4 ? 0.015 : -0.015;
    g.add(mesh(new THREE.BoxGeometry(0.016, 0.028, 0.02), mats.bakelite, x, y, 0.02));
  }
  return g;
}

export function colliderBox(colliders, x, y, z, w, h, d) {
  addCollider(colliders, x, y, z, w, h, d);
}

export { merge };
