import * as THREE from 'three';
import { LAYOUT } from './layout.js';
import {
  boxGeo,
  mergeGroup,
  createPipeRun,
  createJunctionBox,
  createAccessPanel,
  beveledBox,
} from './kit.js';

/** Continuous construction detail so no centerline view is an empty tube. */
export function createHullDressing(mats) {
  const g = new THREE.Group();
  g.name = 'dressing';
  const z0 = LAYOUT.hullZMin + 0.4;
  const z1 = LAYOUT.hullZMax - 0.3;

  const panels = [];
  for (let z = z0; z < z1; z += 0.78) {
    panels.push(boxGeo(0.02, 0.55, 0.62, -0.68, 1.15, z + 0.39));
    panels.push(boxGeo(0.02, 0.55, 0.62, 0.68, 1.15, z + 0.39));
    panels.push(boxGeo(0.42, 0.02, 0.62, 0, 2.02, z + 0.39));
  }
  const panelMesh = mergeGroup(panels, mats.hullGreen);
  if (panelMesh) g.add(panelMesh);

  const pipeL = createPipeRun(
    [new THREE.Vector3(-0.62, 1.88, z1), new THREE.Vector3(-0.62, 1.88, z0)],
    0.032,
    mats.pipeWhite,
  );
  const pipeL2 = createPipeRun(
    [new THREE.Vector3(-0.54, 1.74, z1), new THREE.Vector3(-0.54, 1.74, z0)],
    0.02,
    mats.pipe,
  );
  const pipeR = createPipeRun(
    [new THREE.Vector3(0.6, 1.9, z1), new THREE.Vector3(0.6, 1.9, z0)],
    0.026,
    mats.pipeCopper,
  );
  const pipeR2 = createPipeRun(
    [new THREE.Vector3(0.52, 1.68, z1 - 0.4), new THREE.Vector3(0.52, 1.68, z0 + 0.4)],
    0.016,
    mats.oily,
  );
  g.add(pipeL, pipeL2, pipeR, pipeR2);

  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, z1 - z0), mats.steel);
  tray.position.set(0.08, 2.14, (z0 + z1) / 2);
  g.add(tray);
  const cables = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, z1 - z0 - 0.4), mats.plastic);
  cables.position.set(0.08, 2.17, (z0 + z1) / 2);
  g.add(cables);

  for (let z = z0 + 0.6; z < z1; z += 1.55) {
    const box = createJunctionBox(mats, 0.16, 0.13, 0.07);
    box.position.set(0.66, 1.42, z);
    box.rotation.y = -Math.PI / 2;
    g.add(box);
    const panel = createAccessPanel(0.2, 0.18, mats, 'SYS');
    panel.position.set(-0.66, 0.78, z + 0.4);
    panel.rotation.y = Math.PI / 2;
    g.add(panel);
    const clamp = new THREE.Mesh(beveledBox(0.07, 0.035, 0.03, 0.003), mats.steel);
    clamp.position.set(-0.62, 1.88, z);
    g.add(clamp);
  }

  const kickLights = [];
  for (let z = z0 + 0.8; z < z1; z += 1.2) {
    kickLights.push(boxGeo(0.04, 0.012, 0.08, -0.5, 0.07, z));
    kickLights.push(boxGeo(0.04, 0.012, 0.08, 0.5, 0.07, z));
  }
  const kick = mergeGroup(kickLights, mats.lightWarm);
  if (kick) g.add(kick);

  return g;
}
