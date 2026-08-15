import { Group } from 'three';
import { LAYOUT, hullHalfWidthAt } from './seed.js';
import { roundedBox } from './geom.js';
import {
  makeAccessPanel,
  makeCableTray,
  makeClamp,
  makeFloorGrate,
  makeHandrail,
  makeJunctionBox,
  makePorthole,
  makeStraightPipe,
  makeUnderfloor,
  makeValve,
  makeVent,
  makeWarningPlate,
  mesh,
} from './kit.js';

export function buildCorridor(mats, collision, interactables, animators) {
  const g = new Group();
  g.name = 'corridor';
  const z0 = LAYOUT.rooms.corridor.z0;
  const z1 = LAYOUT.rooms.corridor.z1;
  const mid = (z0 + z1) * 0.5;
  const len = z1 - z0;

  g.add(makeStraightPipe(mats, -0.7, 1.82, mid, len - 0.2, 0.038, 'z', 'pipe'));
  g.add(makeStraightPipe(mats, -0.7, 1.62, mid, len - 0.2, 0.024, 'z', 'pipeBlue'));
  g.add(makeStraightPipe(mats, -0.68, 1.46, mid, len - 0.35, 0.018, 'z', 'pipe'));
  g.add(makeStraightPipe(mats, 0.7, 1.86, mid, len - 0.15, 0.03, 'z', 'pipeOrange'));
  g.add(makeStraightPipe(mats, 0.72, 1.66, mid, len - 0.25, 0.02, 'z', 'pipe'));
  g.add(makeStraightPipe(mats, 0.58, 2.0, mid, len - 0.3, 0.016, 'z', 'pipeBlue'));

  for (const z of [4.9, 5.8, 6.7, 7.5]) {
    const c1 = makeClamp(mats, 0.038);
    c1.position.set(-0.7, 1.82, z);
    const c2 = makeClamp(mats, 0.03);
    c2.position.set(0.7, 1.86, z);
    g.add(c1, c2);
  }

  const tray = makeCableTray(mats, len - 0.3, 0.2);
  tray.position.set(0.05, 2.06, mid);
  g.add(tray);
  const tray2 = makeCableTray(mats, len - 0.5, 0.12);
  tray2.position.set(-0.22, 2.04, mid + 0.1);
  g.add(tray2);

  const railL = makeHandrail(mats, len - 0.5, 0.9);
  railL.position.set(-0.48, 0, mid);
  g.add(railL);
  const railR = makeHandrail(mats, len - 0.5, 0.9);
  railR.position.set(0.48, 0, mid);
  g.add(railR);

  const porthole = makePorthole(mats, 0.15);
  porthole.position.set(0.78, 1.32, 6.55);
  porthole.rotation.y = -Math.PI * 0.5;
  g.add(porthole);

  const frame = mesh(roundedBox(0.12, 0.42, 0.42, 0.02, 2), mats.chipped);
  frame.position.set(0.72, 1.32, 6.55);
  g.add(frame);

  const grate1 = makeFloorGrate(mats, 0.5, 0.7);
  grate1.position.set(0, 0.03, 5.4);
  g.add(grate1);
  const under1 = makeUnderfloor(mats, 0.48, 0.66);
  under1.position.set(0, 0, 5.4);
  g.add(under1);
  const grate2 = makeFloorGrate(mats, 0.5, 0.55);
  grate2.position.set(0, 0.03, 7.15);
  g.add(grate2);

  const boxA = makeJunctionBox(mats, 0.18, 0.22, 0.08);
  boxA.position.set(0.68, 1.15, 5.15);
  boxA.rotation.y = -Math.PI * 0.5;
  g.add(boxA);
  const boxB = makeJunctionBox(mats, 0.16, 0.18, 0.07);
  boxB.position.set(-0.68, 1.22, 6.9);
  boxB.rotation.y = Math.PI * 0.5;
  g.add(boxB);

  const panelA = makeAccessPanel(mats, 0.26, 0.2);
  panelA.position.set(-0.7, 0.72, 5.5);
  panelA.rotation.y = Math.PI * 0.5;
  g.add(panelA);
  const panelB = makeAccessPanel(mats, 0.22, 0.16);
  panelB.position.set(0.7, 0.68, 7.4);
  panelB.rotation.y = -Math.PI * 0.5;
  g.add(panelB);

  const vent = makeVent(mats, 0.24, 0.09);
  vent.position.set(0.18, 1.92, 6.2);
  g.add(vent);

  const valve = makeValve(mats, 0.03, 0.07);
  valve.position.set(-0.62, 1.42, 6.2);
  valve.rotation.z = Math.PI * 0.5;
  g.add(valve);

  const locker = mesh(roundedBox(0.2, 0.55, 0.32, 0.012, 1), mats.hullGreen);
  locker.position.set(0.62, 0.32, 5.7);
  g.add(locker);
  const handle = mesh(roundedBox(0.02, 0.08, 0.02, 0.004, 1), mats.brushed);
  handle.position.set(0.52, 0.34, 5.7);
  g.add(handle);

  const warn1 = makeWarningPlate(mats, 'FWD', 'CONTROL');
  warn1.position.set(-0.42, 1.78, 4.55);
  g.add(warn1);
  const warn2 = makeWarningPlate(mats, 'AFT', 'CREW');
  warn2.position.set(0.42, 1.78, 7.95);
  g.add(warn2);
  const warn3 = makeWarningPlate(mats, 'KEEP CLEAR', 'HATCH');
  warn3.position.set(0.55, 0.95, 6.1);
  warn3.rotation.y = -Math.PI * 0.5;
  g.add(warn3);

  const drain = mesh(roundedBox(0.12, 0.01, 0.18, 0.003, 1), mats.oily);
  drain.position.set(0.28, 0.03, 6.4);
  g.add(drain);

  const brace = mesh(roundedBox(1.2, 0.04, 0.04, 0.008, 1), mats.brushed);
  brace.position.set(0, 1.98, 6.3);
  g.add(brace);

  collision.addBox(-0.48, 0.45, mid, 0.08, 0.9, len - 0.6);
  collision.addBox(0.48, 0.45, mid, 0.08, 0.9, len - 0.6);
  collision.addBox(0.62, 0.32, 5.7, 0.22, 0.6, 0.34);
  collision.addBox(0.78, 1.32, 6.55, 0.16, 0.5, 0.4);

  return g;
}
