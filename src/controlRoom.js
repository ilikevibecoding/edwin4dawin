import { Group, MeshStandardMaterial } from 'three';
import { LAYOUT } from './seed.js';
import { box, cyl, roundedBox } from './geom.js';
import {
  makeAccessPanel,
  makeCableTray,
  makeFloorGrate,
  makeGauge,
  makeHandrail,
  makeJunctionBox,
  makeSeat,
  makeStraightPipe,
  makeSwitchBank,
  makeUnderfloor,
  makeVent,
  makeWarningPlate,
  mesh,
} from './kit.js';
import {
  makeCommTexture,
  makeDepthTexture,
  makeGaugeFace,
  makeHeadingTexture,
  makeNavMapTexture,
  makeSonarTexture,
  makeStatusPanelTexture,
} from './displays.js';

function screen(mats, tex, w, h) {
  const m = mats.plastic.clone();
  m.map = tex;
  m.color.set(0xffffff);
  m.emissiveMap = tex;
  m.emissive.set(0x6a8a70);
  m.emissiveIntensity = 0.85;
  m.roughness = 0.28;
  const panel = mesh(roundedBox(w, h, 0.03, 0.006, 1), m);
  return panel;
}

export function buildControlRoom(mats, collision, interactables, animators) {
  const g = new Group();
  g.name = 'controlRoom';
  const z0 = LAYOUT.rooms.control.z0;
  const z1 = LAYOUT.rooms.control.z1;
  const mid = (z0 + z1) * 0.5;

  const viewportFrame = mesh(roundedBox(1.08, 0.08, 0.14, 0.02, 1), mats.chipped);
  viewportFrame.position.set(0, 1.58, 0.38);
  g.add(viewportFrame);
  const frameBot = mesh(roundedBox(1.08, 0.08, 0.14, 0.02, 1), mats.chipped);
  frameBot.position.set(0, 0.98, 0.38);
  g.add(frameBot);
  const frameL = mesh(roundedBox(0.08, 0.68, 0.14, 0.02, 1), mats.chipped);
  frameL.position.set(-0.5, 1.28, 0.38);
  g.add(frameL);
  const frameR = frameL.clone();
  frameR.position.x = 0.5;
  g.add(frameR);
  const inner = mesh(roundedBox(0.9, 0.06, 0.06, 0.015, 1), mats.brushed);
  inner.position.set(0, 1.54, 0.36);
  g.add(inner);
  const glass = mesh(roundedBox(0.8, 0.48, 0.03, 0.01, 1), mats.glassThick);
  glass.position.set(0, 1.28, 0.34);
  glass.castShadow = false;
  g.add(glass);
  const glass2 = mesh(roundedBox(0.78, 0.46, 0.02, 0.008, 1), mats.glass);
  glass2.position.set(0, 1.28, 0.3);
  glass2.castShadow = false;
  g.add(glass2);
  const seal = mesh(roundedBox(0.9, 0.04, 0.04, 0.01, 1), mats.rubber);
  seal.position.set(0, 1.28, 0.34);
  g.add(seal);
  for (const [x, y] of [
    [-0.48, 1.55],
    [0.48, 1.55],
    [-0.48, 1.02],
    [0.48, 1.02],
    [0, 1.58],
    [0, 0.98],
  ]) {
    const bolt = mesh(cyl(0.012, 0.012, 0.03, 8), mats.brushed);
    bolt.rotation.x = Math.PI * 0.5;
    bolt.position.set(x, y, 0.38);
    g.add(bolt);
  }
  const brow = mesh(roundedBox(1.12, 0.08, 0.22, 0.02, 1), mats.hull);
  brow.position.set(0, 1.68, 0.32);
  g.add(brow);

  const helm = new Group();
  helm.add(mesh(roundedBox(0.72, 0.62, 0.48, 0.02, 2), mats.hullGreen));
  helm.position.set(0.36, 0.55, 1.55);
  const helmTop = mesh(roundedBox(0.7, 0.04, 0.46, 0.01, 1), mats.chipped);
  helmTop.position.set(0, 0.33, 0);
  helm.add(helmTop);
  const wheel = mesh(cyl(0.11, 0.11, 0.03, 16), mats.brushed);
  wheel.rotation.x = 1.15;
  wheel.position.set(0.08, 0.42, 0.16);
  helm.add(wheel);
  for (let i = 0; i < 6; i++) {
    const spoke = mesh(box(0.012, 0.1, 0.01), mats.brushed);
    spoke.position.set(0.08, 0.42, 0.16);
    spoke.rotation.z = (i / 6) * Math.PI * 2;
    spoke.rotation.x = 1.15;
    helm.add(spoke);
  }
  helm.add(makeSwitchBank(mats, 8));
  helm.children[helm.children.length - 1].position.set(-0.16, 0.36, 0.12);
  const heading = screen(mats, makeHeadingTexture(), 0.42, 0.12);
  heading.position.set(0.08, 0.38, -0.05);
  heading.rotation.x = -0.4;
  helm.add(heading);
  const depth = screen(mats, makeDepthTexture(), 0.16, 0.28);
  depth.position.set(0.26, 0.22, 0.08);
  depth.rotation.x = -0.15;
  helm.add(depth);
  g.add(helm);

  const nav = new Group();
  nav.add(mesh(roundedBox(0.58, 0.7, 0.42, 0.02, 2), mats.hull));
  nav.position.set(0.48, 0.58, 2.55);
  const map = screen(mats, makeNavMapTexture(), 0.42, 0.3);
  map.position.set(0, 0.22, 0.12);
  map.rotation.x = -0.35;
  nav.add(map);
  const status = screen(mats, makeStatusPanelTexture(), 0.36, 0.22);
  status.position.set(0, 0.02, 0.16);
  nav.add(status);
  nav.add(makeSwitchBank(mats, 6));
  nav.children[nav.children.length - 1].position.set(0, 0.38, 0.1);
  g.add(nav);

  const sonar = new Group();
  sonar.add(mesh(roundedBox(0.62, 0.78, 0.46, 0.02, 2), mats.hullGreen));
  sonar.position.set(-0.46, 0.62, 1.72);
  const sonarTex = makeSonarTexture();
  const sonarScreen = screen(mats, sonarTex, 0.42, 0.42);
  sonarScreen.position.set(0, 0.18, 0.14);
  sonarScreen.rotation.x = -0.28;
  sonar.add(sonarScreen);
  const comm = screen(mats, makeCommTexture(), 0.28, 0.16);
  comm.position.set(0.12, -0.12, 0.18);
  sonar.add(comm);
  sonar.add(makeSwitchBank(mats, 7));
  sonar.children[sonar.children.length - 1].position.set(-0.08, 0.42, 0.12);
  sonar.userData.interact = 'sonar';
  sonar.userData.prompt = 'E: Active Sonar Ping';
  sonar.userData.sonarTex = sonarTex;
  g.add(sonar);
  interactables.push(sonar);
  animators.push({
    type: 'sonar',
    tex: sonarTex,
    group: sonar,
  });

  const seat1 = makeSeat(mats);
  seat1.position.set(0.36, 0, 2.18);
  seat1.rotation.y = Math.PI;
  g.add(seat1);
  const seat2 = makeSeat(mats);
  seat2.position.set(-0.46, 0, 2.35);
  seat2.rotation.y = Math.PI + 0.15;
  g.add(seat2);

  const overhead = mesh(roundedBox(0.9, 0.08, 1.6, 0.015, 1), mats.chipped);
  overhead.position.set(0, 2.02, 2.1);
  g.add(overhead);
  for (let i = 0; i < 10; i++) {
    const sw = mesh(box(0.03, 0.02, 0.04), i % 4 === 0 ? mats.emissiveGreen : mats.bakelite);
    sw.position.set(-0.35 + (i % 5) * 0.16, 1.97, 1.6 + Math.floor(i / 5) * 0.35);
    g.add(sw);
  }

  const periscope = new Group();
  const column = mesh(cyl(0.055, 0.06, 1.1, 14), mats.brushed);
  column.position.y = 1.35;
  periscope.add(column);
  const head = mesh(roundedBox(0.16, 0.1, 0.22, 0.02, 2), mats.oily);
  head.position.set(0, 1.85, 0.04);
  periscope.add(head);
  const eyepiece = mesh(cyl(0.03, 0.03, 0.08, 10), mats.plastic);
  eyepiece.rotation.x = Math.PI * 0.5;
  eyepiece.position.set(0, 1.55, 0.1);
  periscope.add(eyepiece);
  periscope.position.set(0.42, 0, 1.12);
  g.add(periscope);

  for (const [x, y, z, label] of [
    [0.55, 1.35, 1.25, 'HYD'],
    [0.62, 1.15, 1.4, 'AIR'],
    [-0.62, 1.42, 2.4, 'PSI'],
    [0.58, 1.48, 2.15, 'V'],
  ]) {
    const gauge = makeGauge(mats, makeGaugeFace(label, 100, 40 + label.length * 3), 0.05);
    gauge.position.set(x, y, z);
    gauge.rotation.y = x > 0 ? -0.5 : 0.5;
    g.add(gauge);
  }

  g.add(makeStraightPipe(mats, -0.72, 1.85, mid, 3.2, 0.028, 'z', 'pipe'));
  g.add(makeStraightPipe(mats, -0.72, 1.72, mid, 3.2, 0.02, 'z', 'pipeBlue'));
  g.add(makeStraightPipe(mats, 0.74, 1.88, mid, 3.1, 0.025, 'z', 'pipeOrange'));
  const tray = makeCableTray(mats, 3.0, 0.18);
  tray.position.set(0.08, 2.05, mid);
  g.add(tray);

  const rail = makeHandrail(mats, 1.6, 0.88);
  rail.position.set(-0.62, 0, 2.6);
  g.add(rail);

  const grate = makeFloorGrate(mats, 0.42, 0.7);
  grate.position.set(0.02, 0.03, 3.2);
  g.add(grate);
  const under = makeUnderfloor(mats, 0.4, 0.66);
  under.position.set(0.02, 0, 3.2);
  g.add(under);

  const box1 = makeJunctionBox(mats, 0.16, 0.2, 0.07);
  box1.position.set(0.7, 1.35, 3.4);
  box1.rotation.y = -Math.PI * 0.5;
  g.add(box1);
  const panel = makeAccessPanel(mats, 0.24, 0.18);
  panel.position.set(-0.7, 0.85, 3.5);
  panel.rotation.y = Math.PI * 0.5;
  g.add(panel);
  const vent = makeVent(mats, 0.2, 0.08);
  vent.position.set(0.2, 1.95, 3.6);
  g.add(vent);
  const warn = makeWarningPlate(mats, 'CONTROL', 'DECK 1');
  warn.position.set(0.55, 1.72, 3.95);
  g.add(warn);

  const radio = mesh(roundedBox(0.2, 0.16, 0.16, 0.01, 1), mats.plastic);
  radio.position.set(-0.55, 1.15, 2.85);
  g.add(radio);
  for (let i = 0; i < 3; i++) {
    const kn = mesh(cyl(0.012, 0.012, 0.02, 8), mats.bakelite);
    kn.position.set(-0.6 + i * 0.04, 1.2, 2.93);
    g.add(kn);
  }

  collision.addBox(0.36, 0.45, 1.55, 0.62, 0.9, 0.48);
  collision.addBox(0.48, 0.5, 2.55, 0.5, 0.95, 0.4);
  collision.addBox(-0.46, 0.5, 1.72, 0.52, 1.0, 0.42);
  collision.addBox(0.36, 0.45, 2.18, 0.36, 0.9, 0.36);
  collision.addBox(-0.46, 0.45, 2.35, 0.36, 0.9, 0.36);
  collision.addBox(0.42, 1.0, 1.12, 0.16, 2.0, 0.2);
  collision.addBox(0, 1.2, 0.18, 1.1, 1.4, 0.16);

  return g;
}
