import * as THREE from "three";
import { beveledBox, beveledPanel, setShadow } from "./geom.js";
import {
  createGauge,
  createSwitchBank,
  createCableTray,
  createJunctionBox,
  createVent,
  createAccessPanel,
  createWarningPlate,
  createHandrail,
  createLightFixture,
} from "./machinery.js";
import { createDisplayTexture, createLabelTexture } from "./materials.js";

function consoleBlock(mats, w, h, d) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(beveledBox(w, h, d, 0.016), mats.hullGreen);
  body.position.y = h * 0.5;
  setShadow(body);
  g.add(body);
  const top = new THREE.Mesh(beveledPanel(w * 0.94, d * 0.72, 0.03, 0.02, 0.008), mats.chippedPaint);
  top.rotation.x = -0.55;
  top.position.set(0, h * 0.78, d * 0.12);
  g.add(top);
  g.userData.face = top;
  return g;
}

function addDisplay(parent, display, w, h, mats) {
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({
      map: display.texture,
      emissive: 0x0a1c12,
      emissiveMap: display.texture,
      emissiveIntensity: 0.55,
      roughness: 0.35,
      metalness: 0.05,
    })
  );
  const bezel = new THREE.Mesh(beveledPanel(w + 0.04, h + 0.04, 0.016, 0.008, 0.003), mats.plastic);
  bezel.position.z = -0.01;
  parent.add(bezel, screen);
  return screen;
}

function seat(mats) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(beveledBox(0.38, 0.08, 0.38, 0.01), mats.chippedPaint);
  base.position.y = 0.22;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.28, 10), mats.brushedMetal);
  post.position.y = 0.38;
  const cushion = new THREE.Mesh(beveledBox(0.4, 0.07, 0.4, 0.02), mats.leather);
  cushion.position.y = 0.55;
  const back = new THREE.Mesh(beveledBox(0.4, 0.42, 0.07, 0.02), mats.leather);
  back.position.set(0, 0.78, -0.18);
  back.rotation.x = -0.12;
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.32), mats.rubber);
  belt.position.set(0.12, 0.59, 0.02);
  g.add(base, post, cushion, back, belt);
  return g;
}

export function buildControlRoom(mats, collision, ctx) {
  const g = new THREE.Group();
  g.name = "controlRoom";

  const helm = consoleBlock(mats, 0.72, 0.78, 0.48);
  helm.position.set(0.0, 0, 1.15);
  g.add(helm);
  const helmDisp = ctx.displays.helm;
  const helmFace = new THREE.Group();
  helmFace.position.set(0, 0.86, 1.28);
  helmFace.rotation.x = -0.5;
  addDisplay(helmFace, helmDisp, 0.28, 0.16, mats);
  const helmG1 = createGauge(mats, "SPD", 0.34);
  helmG1.position.set(-0.22, 0.02, 0.02);
  helmG1.scale.setScalar(0.7);
  const helmG2 = createGauge(mats, "HDG", 0.68);
  helmG2.position.set(0.22, 0.02, 0.02);
  helmG2.scale.setScalar(0.7);
  helmFace.add(helmG1, helmG2);
  g.add(helmFace);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.014, 8, 18), mats.brushedMetal);
  wheel.position.set(0, 0.72, 1.38);
  wheel.rotation.x = -0.9;
  g.add(wheel);
  const switches = createSwitchBank(mats, 8);
  switches.position.set(0, 0.68, 1.32);
  g.add(switches);

  const sonar = consoleBlock(mats, 0.7, 0.82, 0.5);
  sonar.position.set(-0.72, 0, 2.05);
  sonar.rotation.y = 0.18;
  g.add(sonar);
  const sonarFace = new THREE.Group();
  sonarFace.position.set(-0.68, 0.9, 2.18);
  sonarFace.rotation.set(-0.48, 0.18, 0);
  const sonarScreen = addDisplay(sonarFace, ctx.displays.sonar, 0.36, 0.22, mats);
  sonarScreen.name = "sonarScreen";
  const sonarSw = createSwitchBank(mats, 6);
  sonarSw.position.set(0, -0.16, 0.02);
  sonarFace.add(sonarSw);
  g.add(sonarFace);

  const interact = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.7, 0.55),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  interact.position.set(-0.7, 0.95, 2.1);
  interact.userData.interact = {
    id: "sonar",
    prompt: "E: Active Sonar Ping",
  };
  g.add(interact);
  ctx.interactables.push(interact);

  const nav = consoleBlock(mats, 0.68, 0.8, 0.48);
  nav.position.set(0.74, 0, 2.0);
  nav.rotation.y = -0.2;
  g.add(nav);
  const navFace = new THREE.Group();
  navFace.position.set(0.7, 0.88, 2.12);
  navFace.rotation.set(-0.48, -0.2, 0);
  addDisplay(navFace, ctx.displays.nav, 0.32, 0.18, mats);
  addDisplay(navFace, ctx.displays.depth, 0.2, 0.12, mats).position.set(0.0, -0.18, 0.01);
  g.add(navFace);

  const overhead = new THREE.Group();
  overhead.position.set(0, 2.02, 2.1);
  const ohPanel = new THREE.Mesh(beveledBox(1.15, 0.08, 0.7, 0.01), mats.chippedPaint);
  overhead.add(ohPanel);
  for (let i = 0; i < 10; i++) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.06), mats.bakelite);
    sw.position.set(-0.4 + (i % 5) * 0.18, -0.05, -0.18 + Math.floor(i / 5) * 0.22);
    overhead.add(sw);
    const led = new THREE.Mesh(
      new THREE.CircleGeometry(0.008, 8),
      i % 3 === 0 ? mats.emissiveAmber : mats.emissiveGreen
    );
    led.rotation.x = -Math.PI / 2;
    led.position.set(-0.4 + (i % 5) * 0.18, -0.042, -0.1 + Math.floor(i / 5) * 0.22);
    overhead.add(led);
  }
  g.add(overhead);

  const periscope = new THREE.Group();
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.7, 14), mats.oilyMachinery);
  column.position.set(0.42, 1.05, 0.72);
  const head = new THREE.Mesh(beveledBox(0.18, 0.12, 0.22, 0.01), mats.brushedMetal);
  head.position.set(0.42, 1.82, 0.72);
  const optic = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 12), mats.glass);
  optic.rotation.x = Math.PI / 2;
  optic.position.set(0.42, 1.82, 0.84);
  periscope.add(column, head, optic);
  g.add(periscope);

  const helmSeat = seat(mats);
  helmSeat.position.set(0, 0, 1.72);
  g.add(helmSeat);
  const sonarSeat = seat(mats);
  sonarSeat.position.set(-0.55, 0, 2.62);
  sonarSeat.rotation.y = 0.2;
  g.add(sonarSeat);
  const navSeat = seat(mats);
  navSeat.position.set(0.58, 0, 2.58);
  navSeat.rotation.y = -0.2;
  g.add(navSeat);

  const map = new THREE.Mesh(
    beveledPanel(0.42, 0.32, 0.01, 0.01, 0.002),
    new THREE.MeshStandardMaterial({
      map: createLabelTexture("NEREID-4\nPATROL BOX 7\nDEPTH 400m", {
        bg: "#d8c8a0",
        fg: "#2a2418",
        w: 320,
        h: 240,
        size: 28,
      }),
      roughness: 0.7,
    })
  );
  map.position.set(1.02, 1.45, 3.15);
  map.rotation.y = -Math.PI / 2;
  g.add(map);

  const comms = createJunctionBox(mats, 0.28, 0.22, 0.1);
  comms.position.set(-1.05, 1.45, 3.2);
  comms.rotation.y = Math.PI / 2;
  g.add(comms);

  const tray = createCableTray(3.6, mats, 0.18);
  tray.position.set(-0.55, 2.0, 2.4);
  g.add(tray);

  const vent = createVent(mats, 0.3, 0.14);
  vent.position.set(0.7, 2.0, 3.4);
  vent.rotation.x = Math.PI / 2;
  g.add(vent);

  const rail = createHandrail(1.6, mats);
  rail.position.set(-0.95, 0.9, 3.2);
  rail.rotation.y = Math.PI / 2;
  g.add(rail);

  const fixture = createLightFixture(mats);
  fixture.position.set(0, 2.08, 2.4);
  g.add(fixture);
  const fixture2 = createLightFixture(mats);
  fixture2.position.set(0, 2.08, 1.1);
  g.add(fixture2);

  const panel = createAccessPanel(mats, 0.28, 0.2);
  panel.position.set(1.08, 0.55, 3.4);
  panel.rotation.y = -Math.PI / 2;
  g.add(panel);

  const warn = createWarningPlate("FWD\nCONTROL", mats);
  warn.position.set(0.55, 1.72, 4.38);
  g.add(warn);

  for (let i = 0; i < 4; i++) {
    const gg = createGauge(mats, ["HYD", "AIR", "O2", "CO2"][i], 0.3 + i * 0.12);
    gg.position.set(-1.0, 1.15 + (i % 2) * 0.18, 1.4 + Math.floor(i / 2) * 0.22);
    gg.rotation.y = Math.PI / 2;
    gg.scale.setScalar(0.75);
    g.add(gg);
  }

  const foot = new THREE.Mesh(beveledBox(0.5, 0.06, 0.22, 0.01), mats.rubber);
  foot.position.set(0, 0.04, 1.42);
  g.add(foot);

  collision.addAABB(0, 0.4, 1.15, 0.78, 0.82, 0.52, "helm");
  collision.addAABB(-0.72, 0.42, 2.05, 0.74, 0.84, 0.54, "sonar");
  collision.addAABB(0.74, 0.42, 2.0, 0.72, 0.82, 0.52, "nav");
  collision.addAABB(0, 0.4, 1.72, 0.42, 0.8, 0.42, "helm-seat");
  collision.addAABB(-0.55, 0.4, 2.62, 0.42, 0.8, 0.42, "sonar-seat");
  collision.addAABB(0.58, 0.4, 2.58, 0.42, 0.8, 0.42, "nav-seat");
  collision.addAABB(0.42, 1.0, 0.72, 0.2, 1.8, 0.24, "periscope");

  for (let i = 0; i < 6; i++) {
    const bank = createSwitchBank(mats, 6);
    bank.position.set(-1.02, 0.72 + (i % 3) * 0.16, 2.6 + Math.floor(i / 3) * 0.35);
    bank.rotation.y = Math.PI / 2;
    g.add(bank);
  }
  const cable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 1.6, 6),
    mats.plastic
  );
  cable.rotation.x = Math.PI / 2;
  cable.position.set(-0.9, 1.85, 2.2);
  g.add(cable);

  const radio = new THREE.Mesh(beveledBox(0.28, 0.42, 0.22, 0.01), mats.hullGreen);
  radio.position.set(1.05, 1.15, 1.35);
  g.add(radio);
  for (let i = 0; i < 3; i++) {
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.01), mats.emissiveGreen);
    face.position.set(0.93, 1.02 + i * 0.1, 1.35);
    g.add(face);
  }
  collision.addAABB(1.05, 1.15, 1.35, 0.3, 0.45, 0.24, "radio");

  ctx.rooms.control = g;
  return g;
}
