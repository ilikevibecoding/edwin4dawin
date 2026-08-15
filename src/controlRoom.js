import * as THREE from 'three';
import { ROOMS } from './layout.js';
import {
  beveledBox,
  createSwitchBank,
  createGauge,
  createJunctionBox,
  createCableBundle,
  createCableTray,
  createAccessPanel,
  createLightFixture,
  createVent,
  markShadows,
  invisibleHitbox,
  boxGeo,
  mergeGroup,
} from './kit.js';
import { createWindowFrame } from './water.js';
import {
  createSonarTexture,
  createNavTexture,
  createDepthTexture,
  createHeadingTexture,
  createStatusTexture,
  createMapTexture,
} from './displays.js';

export function createControlRoom(mats, collider) {
  const g = new THREE.Group();
  g.name = 'controlRoom';
  const z0 = ROOMS.control.z0;
  const z1 = ROOMS.control.z1;
  const mid = (z0 + z1) / 2;

  const viewport = createWindowFrame(mats, 0.92, 0.86, 0.24);
  viewport.position.set(0, 1.18, 12.32);
  g.add(viewport);

  const brow = new THREE.Mesh(beveledBox(1.1, 0.1, 0.18, 0.012), mats.steel);
  brow.position.set(0, 1.62, 12.22);
  g.add(brow);

  for (const [x, y] of [[-0.48, 1.55], [0.48, 1.55], [-0.48, 1.05], [0.48, 1.05]]) {
    const bezel = new THREE.Mesh(beveledBox(0.2, 0.16, 0.06, 0.006), mats.plastic);
    bezel.position.set(x, y, 12.18);
    g.add(bezel);
  }
  const sill = new THREE.Mesh(beveledBox(1.1, 0.08, 0.2, 0.01), mats.chippedPaint);
  sill.position.set(0, 0.96, 12.2);
  g.add(sill);

  const helm = buildConsole(mats, 0.84, 0.78, 0.52, 'HELM');
  helm.position.set(0.02, 0, 11.48);
  g.add(helm);
  collider.addBox(0.02, 0.4, 11.48, 0.88, 0.85, 0.56, 'helm');

  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 8, 18), mats.steel);
  wheel.position.set(0.02, 0.98, 11.32);
  wheel.rotation.x = 1.15;
  g.add(wheel);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.16, 8), mats.oily);
  col.position.set(0.02, 0.88, 11.36);
  g.add(col);

  const sonar = buildConsole(mats, 0.58, 0.86, 0.5, 'SONAR');
  sonar.position.set(-0.38, 0, 10.55);
  sonar.rotation.y = 0.28;
  g.add(sonar);
  collider.addBox(-0.38, 0.42, 10.55, 0.62, 0.9, 0.52, 'sonar');

  const nav = buildConsole(mats, 0.58, 0.82, 0.48, 'NAV');
  nav.position.set(0.4, 0, 10.5);
  nav.rotation.y = -0.32;
  g.add(nav);
  collider.addBox(0.4, 0.42, 10.5, 0.62, 0.88, 0.5, 'nav');

  const sonarScreen = createSonarTexture();
  const navScreen = createNavTexture();
  const depthScreen = createDepthTexture();
  const headingScreen = createHeadingTexture();
  const statusScreen = createStatusTexture();
  const mapTex = createMapTexture();

  const sonarPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), mats.screen(sonarScreen));
  sonarPanel.position.set(-0.38, 1.14, 10.32);
  sonarPanel.rotation.y = 0.28;
  sonarPanel.rotation.x = -0.18;
  g.add(sonarPanel);

  const navPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.24), mats.screen(navScreen));
  navPanel.position.set(0.4, 1.14, 10.28);
  navPanel.rotation.y = -0.32;
  navPanel.rotation.x = -0.16;
  g.add(navPanel);

  const depthPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.16), mats.screen(depthScreen));
  depthPanel.position.set(-0.2, 1.16, 11.28);
  depthPanel.rotation.x = -0.28;
  g.add(depthPanel);

  const hdgPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.16), mats.screen(headingScreen));
  hdgPanel.position.set(0.22, 1.16, 11.28);
  hdgPanel.rotation.x = -0.28;
  g.add(hdgPanel);

  const statusPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), mats.screen(statusScreen));
  statusPanel.position.set(0.02, 1.26, 11.24);
  statusPanel.rotation.x = -0.32;
  g.add(statusPanel);

  const map = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.28), mats.label(mapTex));
  map.position.set(-0.55, 1.55, 11.15);
  map.rotation.y = 0.55;
  g.add(map);
  const mapFrame = new THREE.Mesh(beveledBox(0.38, 0.32, 0.02, 0.004), mats.steel);
  mapFrame.position.copy(map.position);
  mapFrame.position.z -= 0.012;
  mapFrame.rotation.copy(map.rotation);
  g.add(mapFrame);

  for (const [x, y, z, lab, val] of [
    [-0.22, 1.02, 11.38, 'DEPTH', 0.62],
    [0.22, 1.02, 11.38, 'SPEED', 0.35],
    [-0.48, 1.0, 10.42, 'PING', 0.5],
    [0.52, 1.0, 10.38, 'GYRO', 0.44],
  ]) {
    const gauge = createGauge(mats, lab, val);
    gauge.position.set(x, y, z);
    g.add(gauge);
  }

  const switches = createSwitchBank(mats, 8);
  switches.position.set(0.02, 0.92, 11.38);
  switches.rotation.x = -0.5;
  g.add(switches);

  const overhead = new THREE.Mesh(beveledBox(0.9, 0.08, 1.4, 0.01), mats.machine);
  overhead.position.set(0, 2.02, 11.0);
  g.add(overhead);
  for (let i = 0; i < 10; i++) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.04), mats.bakelite);
    sw.position.set(-0.36 + (i % 5) * 0.16, 1.97, 10.6 + Math.floor(i / 5) * 0.28);
    g.add(sw);
  }

  const seatL = createSeat(mats);
  seatL.position.set(-0.22, 0, 10.95);
  g.add(seatL);
  const seatR = createSeat(mats);
  seatR.position.set(0.24, 0, 10.95);
  g.add(seatR);
  collider.addBox(-0.22, 0.28, 10.95, 0.32, 0.56, 0.32, 'seat');
  collider.addBox(0.24, 0.28, 10.95, 0.32, 0.56, 0.32, 'seat');

  const periscope = new THREE.Group();
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 1.1, 14), mats.brushed);
  tube.position.set(0.38, 1.55, 11.88);
  const head = new THREE.Mesh(beveledBox(0.16, 0.1, 0.18, 0.01), mats.steel);
  head.position.set(0.38, 2.05, 11.88);
  const eyepiece = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 12), mats.oily);
  eyepiece.rotation.x = Math.PI / 2;
  eyepiece.position.set(0.38, 1.42, 11.75);
  periscope.add(tube, head, eyepiece);
  g.add(periscope);

  const comms = createJunctionBox(mats, 0.2, 0.26, 0.1);
  comms.position.set(0.58, 1.35, 11.7);
  comms.rotation.y = -1.1;
  g.add(comms);
  const handset = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.03), mats.bakelite);
  handset.position.set(0.52, 1.22, 11.62);
  g.add(handset);
  const cord = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.006, 6, 10, Math.PI), mats.rubber);
  cord.position.set(0.5, 1.12, 11.6);
  g.add(cord);

  const tray = createCableTray(2.6, mats);
  tray.position.set(0.0, 2.12, 10.9);
  g.add(tray);
  const cables = createCableBundle(2.2, mats, 0.03);
  cables.position.set(0.0, 2.1, 10.9);
  g.add(cables);

  const panel = createAccessPanel(0.28, 0.22, mats, 'I/O');
  panel.position.set(-0.62, 0.72, 11.8);
  panel.rotation.y = 0.9;
  g.add(panel);

  const vent = createVent(mats, 0.24, 0.12);
  vent.position.set(0.5, 1.85, 12.05);
  vent.rotation.y = -0.4;
  g.add(vent);

  const helmFill = new THREE.PointLight(0xffe2b8, 1.8, 3.2, 2);
  helmFill.position.set(0.08, 1.55, 11.35);
  g.add(helmFill);
  const lamp = createLightFixture(mats, 'warm');
  lamp.position.set(0, 2.12, 11.15);
  g.add(lamp);
  const lamp2 = createLightFixture(mats, 'warm');
  lamp2.position.set(0.15, 2.1, 10.2);
  g.add(lamp2);

  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.1, 8), mats.steel);
  rail.rotation.x = Math.PI / 2;
  rail.position.set(-0.58, 0.92, 11.3);
  g.add(rail);

  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.18), mats.rubber);
  foot.position.set(0.02, 0.08, 11.28);
  g.add(foot);

  const sideCab = new THREE.Mesh(beveledBox(0.16, 0.7, 0.7, 0.01), mats.hullGreen);
  sideCab.position.set(0.62, 0.4, 11.7);
  g.add(sideCab);
  collider.addBox(0.62, 0.4, 11.7, 0.18, 0.7, 0.7, 'sideCab');

  const fire = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.32, 10), mats.machine);
  fire.material = mats.machine.clone();
  fire.material.color.set('#8a2a1c');
  fire.position.set(-0.6, 0.55, 9.55);
  g.add(fire);

  const extraSw = createSwitchBank(mats, 6);
  extraSw.position.set(-0.38, 0.9, 10.42);
  extraSw.rotation.x = -0.45;
  extraSw.rotation.y = 0.28;
  g.add(extraSw);
  const extraSw2 = createSwitchBank(mats, 6);
  extraSw2.position.set(0.4, 0.9, 10.38);
  extraSw2.rotation.x = -0.45;
  extraSw2.rotation.y = -0.32;
  g.add(extraSw2);

  const binoc = new THREE.Group();
  const barrelL = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.12, 10), mats.brushed);
  barrelL.rotation.x = Math.PI / 2;
  barrelL.position.set(-0.02, 0, 0);
  const barrelR = barrelL.clone();
  barrelR.position.x = 0.04;
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.02), mats.steel);
  binoc.add(barrelL, barrelR, bridge);
  binoc.position.set(0.18, 1.0, 11.22);
  binoc.rotation.x = -0.2;
  g.add(binoc);

  const clip = new THREE.Mesh(beveledBox(0.12, 0.16, 0.01, 0.002), mats.chippedPaint);
  clip.position.set(-0.18, 0.98, 11.22);
  clip.rotation.x = -0.5;
  g.add(clip);

  const interactSonar = invisibleHitbox(0.7, 0.8, 0.5);
  interactSonar.position.set(-0.38, 1.1, 10.4);
  g.add(interactSonar);

  const extras = mergeGroup([
    boxGeo(0.08, 0.04, 1.8, -0.55, 1.72, mid),
    boxGeo(0.06, 0.05, 1.5, 0.55, 1.78, mid),
  ], mats.pipe);
  if (extras) g.add(extras);

  markShadows(g);
  return {
    group: g,
    displays: [sonarScreen, navScreen, depthScreen, headingScreen, statusScreen],
    sonarTarget: interactSonar,
    sonarPanel,
  };
}

function buildConsole(mats, w, h, d) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(beveledBox(w, 0.72, d, 0.012), mats.hullGreen);
  base.position.y = 0.38;
  g.add(base);
  const desk = new THREE.Mesh(beveledBox(w + 0.04, 0.05, d + 0.04, 0.008), mats.chippedPaint);
  desk.position.y = 0.76;
  g.add(desk);
  const slope = new THREE.Mesh(beveledBox(w * 0.96, 0.28, 0.22, 0.008), mats.plastic);
  slope.position.set(0, 0.96, -d * 0.12);
  slope.rotation.x = -0.45;
  g.add(slope);
  const kick = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.08, 0.04), mats.rubber);
  kick.position.set(0, 0.08, d * 0.4);
  g.add(kick);
  return g;
}

function createSeat(mats) {
  const g = new THREE.Group();
  const pad = new THREE.Mesh(beveledBox(0.3, 0.08, 0.3, 0.012), mats.leather);
  pad.position.y = 0.44;
  const back = new THREE.Mesh(beveledBox(0.3, 0.36, 0.07, 0.012), mats.leather);
  back.position.set(0, 0.66, -0.13);
  back.rotation.x = -0.14;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.4, 8), mats.steel);
  post.position.y = 0.2;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.04, 10), mats.steel);
  base.position.y = 0.02;
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.015, 0.04), mats.rubber);
  belt.position.set(0, 0.46, 0.04);
  g.add(pad, back, post, base, belt);
  return g;
}
