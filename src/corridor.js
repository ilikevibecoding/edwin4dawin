import * as THREE from 'three';
import { ROOMS } from './layout.js';
import {
  beveledBox,
  createPipeRun,
  createValveAssembly,
  createGauge,
  createJunctionBox,
  createCableTray,
  createCableBundle,
  createAccessPanel,
  createLightFixture,
  createVent,
  createWarning,
  createFan,
  markShadows,
  boxGeo,
  mergeGroup,
} from './kit.js';
import { createWindowFrame } from './water.js';

export function createCorridor(mats, collider) {
  const g = new THREE.Group();
  g.name = 'corridor';
  const z0 = ROOMS.corridor.z0;
  const z1 = ROOMS.corridor.z1;
  const mid = (z0 + z1) / 2;

  const pipeA = createPipeRun([
    new THREE.Vector3(-0.58, 1.85, z1 - 0.2),
    new THREE.Vector3(-0.58, 1.85, mid),
    new THREE.Vector3(-0.58, 1.85, z0 + 0.2),
  ], 0.035, mats.pipeWhite);
  const pipeB = createPipeRun([
    new THREE.Vector3(-0.5, 1.72, z1 - 0.15),
    new THREE.Vector3(-0.5, 1.72, mid + 0.4),
    new THREE.Vector3(-0.42, 1.55, mid - 0.2),
    new THREE.Vector3(-0.42, 1.55, z0 + 0.15),
  ], 0.022, mats.pipe);
  const pipeC = createPipeRun([
    new THREE.Vector3(0.55, 1.92, z1 - 0.1),
    new THREE.Vector3(0.55, 1.92, z0 + 0.15),
  ], 0.028, mats.pipeCopper);
  g.add(pipeA, pipeB, pipeC);

  for (const z of [8.4, 7.2, 6.1]) {
    const clamp = new THREE.Mesh(beveledBox(0.08, 0.04, 0.03, 0.004), mats.steel);
    clamp.position.set(-0.58, 1.85, z);
    g.add(clamp);
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.03), mats.steel);
    bracket.position.set(-0.62, 1.74, z);
    g.add(bracket);
  }

  const valve = createValveAssembly(mats, 0.08);
  valve.position.set(-0.5, 1.42, 7.55);
  valve.rotation.y = Math.PI / 2;
  g.add(valve);
  const gauge = createGauge(mats, 'AIR', 0.55);
  gauge.position.set(-0.48, 1.28, 7.35);
  gauge.rotation.y = 1.2;
  g.add(gauge);

  const tray = createCableTray(3.4, mats);
  tray.position.set(0.12, 2.1, mid);
  g.add(tray);
  const cables = createCableBundle(3.2, mats, 0.035);
  cables.position.set(0.12, 2.08, mid);
  g.add(cables);

  const box1 = createJunctionBox(mats, 0.2, 0.16, 0.08);
  box1.position.set(0.58, 1.35, 8.15);
  box1.rotation.y = -Math.PI / 2;
  g.add(box1);
  const box2 = createJunctionBox(mats, 0.24, 0.2, 0.09);
  box2.position.set(0.58, 1.15, 6.55);
  box2.rotation.y = -Math.PI / 2;
  g.add(box2);
  collider.addBox(0.62, 1.2, 8.15, 0.12, 0.4, 0.28, 'jbox');
  collider.addBox(0.62, 1.05, 6.55, 0.12, 0.45, 0.3, 'jbox');

  const panel = createAccessPanel(0.26, 0.32, mats, 'HULL');
  panel.position.set(-0.62, 0.85, 6.8);
  panel.rotation.y = Math.PI / 2;
  g.add(panel);

  const locker = new THREE.Mesh(beveledBox(0.2, 0.7, 0.42, 0.01), mats.hullGreen);
  locker.position.set(0.58, 0.4, 7.7);
  g.add(locker);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.02), mats.steel);
  handle.position.set(0.48, 0.42, 7.7);
  g.add(handle);
  collider.addBox(0.58, 0.4, 7.7, 0.22, 0.7, 0.44, 'locker');

  const porthole = createWindowFrame(mats, 0.28, 0.28, 0.14);
  porthole.position.set(0.72, 1.32, 7.55);
  porthole.rotation.y = -Math.PI / 2;
  g.add(porthole);
  const hullCut = new THREE.Mesh(new THREE.CircleGeometry(0.15, 20), mats.blackout);
  hullCut.position.set(0.78, 1.32, 7.55);
  hullCut.rotation.y = -Math.PI / 2;
  g.add(hullCut);

  for (const z of [8.55, 7.15, 5.85]) {
    const lamp = createLightFixture(mats, 'warm');
    lamp.position.set(0, 2.12, z);
    g.add(lamp);
  }

  const vent = createVent(mats, 0.3, 0.14);
  vent.position.set(0, 2.0, 6.4);
  vent.rotation.x = Math.PI / 2;
  g.add(vent);

  const fan = createFan(mats, 0.09);
  fan.position.set(0.5, 1.72, 8.6);
  fan.rotation.y = -Math.PI / 2;
  g.add(fan);

  const warn = createWarning(mats, 'LOW\nHEAD', '#c4a032');
  warn.position.set(0.0, 1.72, 8.95);
  g.add(warn);
  const warn2 = createWarning(mats, 'WATERTIGHT', '#c25a28');
  warn2.position.set(-0.35, 1.55, 5.55);
  warn2.rotation.y = 0.2;
  g.add(warn2);

  const drain = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 10), mats.steel);
  drain.position.set(-0.35, 0.02, 6.9);
  g.add(drain);
  const stain = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.3), mats.rust);
  stain.rotation.x = -Math.PI / 2;
  stain.position.set(-0.35, 0.012, 6.95);
  g.add(stain);

  const conduit = mergeGroup([
    boxGeo(0.03, 0.03, 3.5, 0.48, 1.62, mid),
    boxGeo(0.025, 0.025, 2.2, -0.36, 1.95, mid + 0.2),
  ], mats.oily);
  if (conduit) g.add(conduit);

  const ext = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.38, 10), mats.machine);
  ext.position.set(-0.58, 0.55, 8.3);
  g.add(ext);
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.12, 8), mats.steel);
  nozzle.rotation.z = 0.8;
  nozzle.position.set(-0.5, 0.62, 8.3);
  g.add(nozzle);

  const step = new THREE.Mesh(beveledBox(0.9, 0.04, 0.16, 0.006), mats.chippedPaint);
  step.position.set(0, 0.02, 9.05);
  g.add(step);

  const hose = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 8, 16), mats.rubber);
  hose.position.set(-0.58, 1.05, 8.05);
  hose.rotation.y = Math.PI / 2;
  g.add(hose);
  const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8), mats.steel);
  reel.rotation.z = Math.PI / 2;
  reel.position.set(-0.58, 1.05, 8.05);
  g.add(reel);

  const rack = new THREE.Mesh(beveledBox(0.08, 0.55, 0.36, 0.006), mats.machine);
  rack.position.set(-0.62, 0.72, 7.15);
  g.add(rack);
  for (let i = 0; i < 3; i++) {
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 8), mats.pipe);
    can.position.set(-0.58, 0.55 + i * 0.16, 7.05);
    g.add(can);
  }

  const phone = createJunctionBox(mats, 0.12, 0.18, 0.07);
  phone.position.set(0.58, 1.55, 7.35);
  phone.rotation.y = -Math.PI / 2;
  g.add(phone);
  const handset = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.025), mats.bakelite);
  handset.position.set(0.5, 1.48, 7.35);
  g.add(handset);

  const stencil = createWarning(mats, 'FWD', '#c4a032');
  stencil.position.set(0.0, 0.22, 7.85);
  stencil.rotation.x = -Math.PI / 2;
  g.add(stencil);

  markShadows(g);
  return { group: g, fans: [fan], porthole };
}
