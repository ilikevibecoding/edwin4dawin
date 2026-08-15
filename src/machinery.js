import { Group } from 'three';
import { box, cyl, motorHousing, pumpBody, roundedBox, sphere, torus } from './geom.js';
import {
  makeFan,
  makeGauge,
  makeJunctionBox,
  makeStraightPipe,
  makeValve,
  mesh,
} from './kit.js';
import { makeGaugeFace } from './displays.js';

export function makePropulsionMotor(mats) {
  const g = new Group();
  const housing = mesh(motorHousing(0.4, 1.35), mats.oily);
  housing.rotation.x = Math.PI * 0.5;
  housing.castShadow = true;
  g.add(housing);
  const nose = mesh(cyl(0.28, 0.38, 0.22, 24), mats.oily);
  nose.rotation.x = Math.PI * 0.5;
  nose.position.z = -0.76;
  g.add(nose);
  const tail = mesh(cyl(0.4, 0.22, 0.2, 24), mats.oily);
  tail.rotation.x = Math.PI * 0.5;
  tail.position.z = 0.76;
  g.add(tail);

  const finGroup = new Group();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const fin = mesh(roundedBox(0.018, 0.085, 0.7, 0.004, 1), mats.oily);
    fin.position.set(Math.cos(a) * 0.435, Math.sin(a) * 0.435, 0.02);
    fin.rotation.z = a;
    finGroup.add(fin);
  }
  g.add(finGroup);

  for (const z of [-0.55, 0.05, 0.48]) {
    const band = mesh(torus(0.43, 0.018, 8, 24), mats.brushed);
    band.position.z = z;
    g.add(band);
  }

  const plate = mesh(roundedBox(0.28, 0.18, 0.02, 0.006, 1), mats.chipped);
  plate.position.set(0, 0.32, 0.1);
  plate.rotation.x = -0.4;
  g.add(plate);

  const mount = mesh(roundedBox(0.7, 0.12, 1.4, 0.02, 1), mats.gunmetal ? mats.oily : mats.oily);
  mount.position.y = -0.48;
  g.add(mount);
  const footL = mesh(roundedBox(0.16, 0.1, 1.2, 0.015, 1), mats.chipped);
  footL.position.set(-0.32, -0.52, 0);
  const footR = footL.clone();
  footR.position.x = 0.32;
  g.add(footL, footR);

  const shaft = mesh(cyl(0.07, 0.07, 0.7, 16), mats.brushed);
  shaft.rotation.x = Math.PI * 0.5;
  shaft.position.z = 1.05;
  g.add(shaft);
  const coup = mesh(cyl(0.11, 0.11, 0.12, 12), mats.oily);
  coup.rotation.x = Math.PI * 0.5;
  coup.position.z = 0.78;
  g.add(coup);

  g.userData.vibrate = housing;
  return g;
}

export function makeGearHousing(mats) {
  const g = new Group();
  const caseA = mesh(roundedBox(0.62, 0.48, 0.55, 0.04, 2), mats.oily);
  g.add(caseA);
  const caseB = mesh(roundedBox(0.42, 0.36, 0.4, 0.03, 2), mats.oily);
  caseB.position.set(0, 0.12, 0.38);
  g.add(caseB);
  const cover = mesh(roundedBox(0.28, 0.28, 0.03, 0.01, 1), mats.brushed);
  cover.position.set(0.32, 0.05, 0);
  g.add(cover);
  const sight = mesh(cyl(0.04, 0.04, 0.02, 12), mats.glass);
  sight.rotation.z = Math.PI * 0.5;
  sight.position.set(0.34, 0.05, 0.12);
  g.add(sight);
  return g;
}

export function makePump(mats, scale = 1) {
  const g = new Group();
  const body = mesh(pumpBody(0.14 * scale, 0.32 * scale), mats.machineBlue ? mats.pipeBlue : mats.pipeBlue);
  body.rotation.z = Math.PI * 0.5;
  g.add(body);
  const volute = mesh(torus(0.1 * scale, 0.045 * scale, 10, 16), mats.oily);
  volute.position.x = 0.06 * scale;
  g.add(volute);
  const motor = mesh(cyl(0.08 * scale, 0.08 * scale, 0.2 * scale, 14), mats.oily);
  motor.rotation.z = Math.PI * 0.5;
  motor.position.x = -0.18 * scale;
  g.add(motor);
  const base = mesh(roundedBox(0.36 * scale, 0.05 * scale, 0.2 * scale, 0.01, 1), mats.chipped);
  base.position.y = -0.16 * scale;
  g.add(base);
  const inP = makeStraightPipe(mats, 0.16 * scale, 0.02, 0, 0.22 * scale, 0.03 * scale, 'z', 'pipe');
  g.add(inP);
  g.userData.spin = motor;
  return g;
}

export function makeCompressor(mats) {
  const g = new Group();
  const tank = mesh(cyl(0.11, 0.11, 0.55, 16), mats.pipeBlue);
  tank.rotation.z = Math.PI * 0.5;
  g.add(tank);
  const head = mesh(roundedBox(0.2, 0.18, 0.18, 0.02, 2), mats.oily);
  head.position.x = -0.28;
  g.add(head);
  const belt = mesh(cyl(0.07, 0.07, 0.03, 12), mats.rubber);
  belt.rotation.z = Math.PI * 0.5;
  belt.position.set(-0.38, 0.02, 0);
  g.add(belt);
  const base = mesh(roundedBox(0.7, 0.06, 0.24, 0.012, 1), mats.chipped);
  base.position.y = -0.16;
  g.add(base);
  return g;
}

export function makeElectricalCabinet(mats, w = 0.42, h = 1.15, d = 0.22) {
  const g = new Group();
  g.add(mesh(roundedBox(w, h, d, 0.012, 1), mats.hullGreen));
  const door = mesh(roundedBox(w * 0.9, h * 0.86, 0.02, 0.008, 1), mats.chipped);
  door.position.z = d * 0.5 + 0.008;
  g.add(door);
  for (let i = 0; i < 3; i++) {
    const vent = mesh(box(w * 0.7, 0.012, 0.01), mats.brushed);
    vent.position.set(0, h * 0.28 - i * 0.08, d * 0.5 + 0.02);
    g.add(vent);
  }
  const lamp = mesh(box(0.03, 0.03, 0.01), mats.emissiveGreen);
  lamp.position.set(w * 0.32, h * 0.38, d * 0.5 + 0.02);
  g.add(lamp);
  const handle = mesh(box(0.018, 0.1, 0.02), mats.brushed);
  handle.position.set(w * 0.36, 0, d * 0.5 + 0.02);
  g.add(handle);
  const plinth = mesh(roundedBox(w + 0.04, 0.06, d + 0.04, 0.01, 1), mats.oily);
  plinth.position.y = -h * 0.5 - 0.02;
  g.add(plinth);
  return g;
}

export function makeBatteryBank(mats) {
  const g = new Group();
  const rack = mesh(roundedBox(0.7, 0.62, 0.38, 0.012, 1), mats.oily);
  g.add(rack);
  for (let i = 0; i < 6; i++) {
    const cell = mesh(roundedBox(0.18, 0.16, 0.14, 0.01, 1), mats.plastic);
    cell.position.set(-0.2 + (i % 3) * 0.2, i < 3 ? 0.12 : -0.1, 0.08);
    g.add(cell);
    const post = mesh(cyl(0.012, 0.012, 0.03, 6), mats.brushed);
    post.position.copy(cell.position);
    post.position.y += 0.1;
    g.add(post);
  }
  return g;
}

export function makeHeatExchanger(mats) {
  const g = new Group();
  const shell = mesh(cyl(0.12, 0.12, 0.7, 16), mats.pipe);
  shell.rotation.z = Math.PI * 0.5;
  g.add(shell);
  for (let i = 0; i < 8; i++) {
    const disc = mesh(cyl(0.15, 0.15, 0.012, 14), mats.brushed);
    disc.rotation.z = Math.PI * 0.5;
    disc.position.x = -0.28 + i * 0.08;
    g.add(disc);
  }
  return g;
}

export function makeToolCabinet(mats) {
  const g = new Group();
  g.add(mesh(roundedBox(0.36, 0.7, 0.22, 0.01, 1), mats.hullGreen));
  for (let i = 0; i < 3; i++) {
    const drawer = mesh(roundedBox(0.32, 0.16, 0.02, 0.006, 1), mats.chipped);
    drawer.position.set(0, 0.2 - i * 0.2, 0.12);
    g.add(drawer);
    const handle = mesh(box(0.08, 0.012, 0.016), mats.brushed);
    handle.position.set(0, 0.2 - i * 0.2, 0.14);
    g.add(handle);
  }
  return g;
}

export function makeValveCluster(mats) {
  const g = new Group();
  const v1 = makeValve(mats, 0.03, 0.07);
  v1.position.set(-0.12, 0, 0);
  const v2 = makeValve(mats, 0.028, 0.06);
  v2.position.set(0.08, 0.02, 0.05);
  v2.rotation.y = 0.4;
  g.add(v1, v2);
  g.add(makeStraightPipe(mats, 0, 0, 0, 0.4, 0.028, 'x', 'pipeOrange'));
  const gauge = makeGauge(mats, makeGaugeFace('BAR', 40, 18), 0.045);
  gauge.position.set(0.16, 0.12, 0);
  g.add(gauge);
  return g;
}

export function makeExpansionTank(mats) {
  const g = new Group();
  const tank = mesh(sphere(0.16, 16, 12), mats.pipe);
  tank.scale.set(1, 1.15, 1);
  g.add(tank);
  const band = mesh(torus(0.16, 0.012, 8, 16), mats.brushed);
  g.add(band);
  const neck = mesh(cyl(0.03, 0.03, 0.1, 10), mats.brushed);
  neck.position.y = 0.2;
  g.add(neck);
  return g;
}

export function makeInspectionLamp(mats) {
  const g = new Group();
  const arm = mesh(cyl(0.01, 0.01, 0.28, 8), mats.brushed);
  arm.rotation.z = 0.6;
  g.add(arm);
  const head = mesh(sphere(0.035, 10, 8), mats.brushed);
  head.position.set(0.12, 0.1, 0);
  g.add(head);
  const lens = mesh(cyl(0.028, 0.028, 0.01, 10), mats.emissiveAmber);
  lens.position.set(0.14, 0.1, 0.02);
  lens.rotation.x = Math.PI * 0.5;
  g.add(lens);
  return g;
}

export function makeFanUnit(mats) {
  return makeFan(mats, 0.1);
}
