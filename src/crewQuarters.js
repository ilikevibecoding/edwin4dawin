import * as THREE from "three";
import { beveledBox, beveledPanel, setShadow } from "./geom.js";
import {
  createJunctionBox,
  createVent,
  createAccessPanel,
  createWarningPlate,
  createLightFixture,
  createCableTray,
  createHandrail,
} from "./machinery.js";
import { createLabelTexture } from "./materials.js";

function bunk(mats, occupiedFold = 0.15) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(beveledBox(0.72, 0.07, 1.85, 0.012), mats.chippedPaint);
  frame.position.y = 0.04;
  const mattress = new THREE.Mesh(beveledBox(0.68, 0.08, 1.78, 0.03), mats.fabric);
  mattress.position.y = 0.11;
  const blanket = new THREE.Mesh(beveledBox(0.64, 0.035, 1.15, 0.03), mats.fabricOlive);
  blanket.position.set(0.0, 0.15, 0.18);
  const fold = new THREE.Mesh(beveledBox(0.64, 0.05, 0.22, 0.03), mats.fabricOlive);
  fold.position.set(0.0, 0.17, -0.42);
  fold.rotation.x = occupiedFold;
  const pillow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), mats.fabric);
  pillow.scale.set(1.4, 0.55, 1.0);
  pillow.position.set(0.0, 0.18, -0.72);
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.012, 0.03), mats.rubber);
  strap.position.set(0, 0.19, 0.35);
  const curtain = new THREE.Mesh(beveledPanel(0.02, 0.42, 0.7, 0.02, 0.01), mats.fabric);
  curtain.position.set(0.36, 0.28, 0.1);
  const light = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.04, 10), mats.emissiveAmber);
  light.position.set(-0.28, 0.32, -0.7);
  g.add(frame, mattress, blanket, fold, pillow, strap, curtain, light);
  setShadow(mattress, true, true);
  return g;
}

function locker(mats, label) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(beveledBox(0.32, 1.05, 0.28, 0.01), mats.hullGreen);
  body.position.y = 0.54;
  const door = new THREE.Mesh(beveledPanel(0.28, 0.95, 0.012, 0.01, 0.003), mats.chippedPaint);
  door.position.set(0, 0.54, 0.15);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.07, 0.02), mats.brushedMetal);
  handle.position.set(0.1, 0.54, 0.17);
  const tag = new THREE.Mesh(
    beveledPanel(0.12, 0.04, 0.004, 0.004, 0.001),
    new THREE.MeshStandardMaterial({
      map: createLabelTexture(label, { bg: "#d8d0bc", fg: "#222", w: 128, h: 48, size: 22 }),
      roughness: 0.6,
    })
  );
  tag.position.set(0, 0.95, 0.16);
  g.add(body, door, handle, tag);
  return g;
}

function cup(mats, color) {
  const m = mats.plastic.clone();
  m.color = new THREE.Color(color);
  const g = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.022, 0.06, 10), m);
  return g;
}

export function buildCrewQuarters(mats, collision, ctx) {
  const g = new THREE.Group();
  g.name = "crewQuarters";

  const bunks = [
    [-0.85, 0.28, 9.35],
    [-0.85, 1.12, 9.35],
    [-0.85, 0.28, 11.35],
    [-0.85, 1.12, 11.35],
  ];
  bunks.forEach((p, i) => {
    const b = bunk(mats, i === 1 ? 0.4 : 0.12);
    b.position.set(p[0], p[1], p[2]);
    g.add(b);
    collision.addAABB(p[0], p[1] + 0.15, p[2], 0.78, 0.42, 1.85, "bunk");
  });

  const bunkInteract = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.7, 1.9),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  bunkInteract.position.set(-0.7, 0.55, 9.35);
  bunkInteract.userData.interact = { id: "rest", prompt: "E: Rest" };
  g.add(bunkInteract);
  ctx.interactables.push(bunkInteract);

  const l1 = locker(mats, "A. RHEE");
  l1.position.set(0.95, 0, 8.7);
  l1.rotation.y = -Math.PI / 2;
  g.add(l1);
  const l2 = locker(mats, "M. COLE");
  l2.position.set(0.95, 0, 9.1);
  l2.rotation.y = -Math.PI / 2;
  g.add(l2);
  const l3 = locker(mats, "J. VELEZ");
  l3.position.set(0.95, 0, 9.5);
  l3.rotation.y = -Math.PI / 2;
  g.add(l3);
  collision.addAABB(0.95, 0.54, 9.1, 0.3, 1.1, 1.0, "lockers");

  const table = new THREE.Mesh(beveledBox(0.7, 0.04, 0.42, 0.012), mats.chippedPaint);
  table.position.set(0.55, 0.78, 10.55);
  const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.03), mats.brushedMetal);
  hinge.position.set(0.72, 0.78, 10.55);
  const brace = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, 0.03), mats.brushedMetal);
  brace.position.set(0.35, 0.5, 10.55);
  g.add(table, hinge, brace);
  collision.addAABB(0.55, 0.5, 10.55, 0.72, 0.7, 0.44, "table");

  const bench = new THREE.Mesh(beveledBox(0.7, 0.08, 0.28, 0.015), mats.leather);
  bench.position.set(0.15, 0.42, 10.55);
  const benchLeg = new THREE.Mesh(beveledBox(0.62, 0.36, 0.22, 0.01), mats.chippedPaint);
  benchLeg.position.set(0.15, 0.2, 10.55);
  g.add(bench, benchLeg);

  const counter = new THREE.Mesh(beveledBox(0.85, 0.08, 0.42, 0.012), mats.chippedPaint);
  counter.position.set(0.72, 0.86, 12.15);
  const cab = new THREE.Mesh(beveledBox(0.85, 0.78, 0.4, 0.012), mats.hullGreen);
  cab.position.set(0.72, 0.42, 12.15);
  g.add(counter, cab);
  collision.addAABB(0.72, 0.5, 12.15, 0.88, 1.0, 0.46, "galley");

  const sink = new THREE.Mesh(beveledBox(0.28, 0.08, 0.22, 0.02), mats.brushedMetal);
  sink.position.set(0.55, 0.92, 12.05);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.06, 14), mats.brushedMetal);
  basin.position.set(0.55, 0.9, 12.05);
  const tap = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 10, Math.PI), mats.brushedMetal);
  tap.position.set(0.55, 0.98, 12.18);
  tap.rotation.x = Math.PI;
  g.add(sink, basin, tap);

  const fridge = new THREE.Mesh(beveledBox(0.32, 0.7, 0.32, 0.012), mats.hullGreen);
  fridge.position.set(0.95, 1.28, 12.2);
  const fridgeDoor = new THREE.Mesh(beveledPanel(0.28, 0.62, 0.012, 0.01, 0.003), mats.chippedPaint);
  fridgeDoor.position.set(0.78, 1.28, 12.2);
  g.add(fridge, fridgeDoor);

  const c1 = cup(mats, 0x6f7668);
  c1.position.set(0.85, 0.94, 12.0);
  const c2 = cup(mats, 0xc25a2a);
  c2.position.set(0.92, 0.94, 12.08);
  g.add(c1, c2);

  const kettle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.1, 12), mats.brushedMetal);
  kettle.position.set(0.7, 0.97, 12.28);
  g.add(kettle);

  const book = new THREE.Mesh(beveledBox(0.12, 0.02, 0.18, 0.004), mats.leather);
  book.position.set(0.48, 0.82, 10.5);
  book.rotation.y = 0.2;
  g.add(book);
  const photo = new THREE.Mesh(
    beveledPanel(0.08, 0.1, 0.004, 0.004, 0.001),
    new THREE.MeshStandardMaterial({
      map: createLabelTexture("HOME\nPORT", { bg: "#d2c4a0", fg: "#3a2a18", w: 128, h: 160, size: 22 }),
      roughness: 0.65,
    })
  );
  photo.position.set(0.82, 1.35, 8.7);
  photo.rotation.y = -Math.PI / 2;
  g.add(photo);

  const wash = new THREE.Group();
  const wall = new THREE.Mesh(beveledBox(0.08, 1.7, 1.05, 0.01), mats.hullPaint);
  wall.position.set(-0.55, 0.9, 12.55);
  const basin2 = new THREE.Mesh(beveledBox(0.32, 0.1, 0.28, 0.02), mats.brushedMetal);
  basin2.position.set(-0.32, 0.88, 12.55);
  const mirror = new THREE.Mesh(beveledPanel(0.22, 0.28, 0.012, 0.01, 0.003), mats.glass);
  mirror.position.set(-0.5, 1.45, 12.55);
  const towel = new THREE.Mesh(beveledPanel(0.18, 0.28, 0.02, 0.03, 0.01), mats.fabric);
  towel.position.set(-0.22, 1.2, 12.85);
  const toilet = new THREE.Mesh(beveledBox(0.28, 0.4, 0.32, 0.02), mats.plastic);
  toilet.position.set(-0.28, 0.22, 12.85);
  wash.add(wall, basin2, mirror, towel, toilet);
  g.add(wash);
  collision.addAABB(-0.62, 0.7, 12.6, 0.42, 1.5, 1.05, "washroom");

  const vent = createVent(mats, 0.24, 0.12);
  vent.position.set(0.2, 2.02, 10.2);
  vent.rotation.x = Math.PI / 2;
  g.add(vent);

  const tray = createCableTray(4.4, mats, 0.16);
  tray.position.set(0.4, 2.02, 10.7);
  g.add(tray);

  const fixture = createLightFixture(mats);
  fixture.position.set(0.05, 2.08, 9.6);
  g.add(fixture);
  const fixture2 = createLightFixture(mats);
  fixture2.position.set(0.05, 2.08, 11.6);
  g.add(fixture2);

  const porthole = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.022, 8, 18), mats.brushedMetal);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 18), mats.glassThick);
  glass.rotation.x = Math.PI / 2;
  const waterCard = new THREE.Mesh(
    new THREE.CircleGeometry(0.115, 18),
    new THREE.MeshBasicMaterial({ color: 0x082830, fog: false })
  );
  waterCard.position.z = -0.03;
  porthole.add(frame, waterCard, glass);
  porthole.position.set(1.2, 1.45, 10.8);
  porthole.rotation.y = -Math.PI / 2;
  g.add(porthole);

  const rail = createHandrail(1.8, mats);
  rail.position.set(0.35, 0.9, 11.4);
  g.add(rail);

  const warn = createWarningPlate("CREW\nBERTH", mats);
  warn.position.set(0.48, 1.7, 8.32);
  g.add(warn);

  const box = createJunctionBox(mats);
  box.position.set(1.05, 1.55, 11.7);
  box.rotation.y = -Math.PI / 2;
  g.add(box);

  const panel = createAccessPanel(mats);
  panel.position.set(-1.05, 0.7, 10.4);
  panel.rotation.y = Math.PI / 2;
  g.add(panel);

  ctx.rooms.crew = g;
  return g;
}
