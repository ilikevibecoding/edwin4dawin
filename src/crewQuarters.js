import * as THREE from 'three';
import { ROOMS } from './layout.js';
import {
  beveledBox,
  createJunctionBox,
  createCableTray,
  createAccessPanel,
  createLightFixture,
  createVent,
  createWarning,
  markShadows,
} from './kit.js';
import { createWindowFrame } from './water.js';

export function createCrewQuarters(mats, collider) {
  const g = new THREE.Group();
  g.name = 'crewQuarters';
  const z0 = ROOMS.crew.z0;
  const z1 = ROOMS.crew.z1;

  const bunks = [];
  const bunkSpecs = [
    { x: -0.48, y: 0.48, z: 4.55, rot: 0.15 },
    { x: -0.48, y: 1.22, z: 4.55, rot: 0.15 },
    { x: -0.48, y: 0.48, z: 3.15, rot: 0.15 },
    { x: -0.48, y: 1.22, z: 3.15, rot: 0.15 },
  ];
  for (const spec of bunkSpecs) {
    const bunk = createBunk(mats);
    bunk.position.set(spec.x, spec.y, spec.z);
    bunk.rotation.y = spec.rot;
    g.add(bunk);
    bunks.push(bunk);
    collider.addBox(spec.x, spec.y + 0.08, spec.z, 0.55, 0.38, 1.05, 'bunk');
  }

  const interactBunk = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 1.1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
  interactBunk.position.set(-0.4, 0.85, 4.55);
  g.add(interactBunk);

  const lockers = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const locker = new THREE.Mesh(beveledBox(0.2, 0.85, 0.22, 0.008), mats.hullGreen);
    locker.position.set(0.55, 0.48, 4.7 - i * 0.28);
    lockers.add(locker);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.07, 0.015), mats.steel);
    handle.position.set(0.45, 0.5, 4.7 - i * 0.28);
    lockers.add(handle);
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.025), mats.plastic);
    tag.position.set(0.448, 0.78, 4.7 - i * 0.28);
    lockers.add(tag);
  }
  g.add(lockers);
  collider.addBox(0.55, 0.48, 4.25, 0.22, 0.9, 1.15, 'lockers');

  const table = createFoldTable(mats);
  table.position.set(0.42, 0.78, 2.55);
  g.add(table);
  collider.addBox(0.48, 0.55, 2.55, 0.36, 0.2, 0.36, 'table');

  const bench = new THREE.Mesh(beveledBox(0.22, 0.08, 0.55, 0.01), mats.leather);
  bench.position.set(0.42, 0.42, 2.35);
  g.add(bench);
  const benchLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.38, 0.5), mats.hullGreen);
  benchLeg.position.set(0.42, 0.2, 2.35);
  g.add(benchLeg);

  const galley = createGalley(mats);
  galley.position.set(-0.42, 0, 2.05);
  g.add(galley);
  collider.addBox(-0.42, 0.45, 2.05, 0.42, 0.9, 0.85, 'galley');

  const wash = createWashroom(mats);
  wash.position.set(0.42, 0, 1.55);
  g.add(wash);
  collider.addBox(0.5, 0.5, 1.55, 0.38, 1.0, 0.7, 'wash');

  const porthole = createWindowFrame(mats, 0.24, 0.24, 0.12);
  porthole.position.set(0.74, 1.38, 2.85);
  porthole.rotation.y = -Math.PI / 2;
  g.add(porthole);

  const lamp = createLightFixture(mats, 'warm');
  lamp.position.set(0.05, 2.08, 3.6);
  g.add(lamp);
  const lamp2 = createLightFixture(mats, 'warm');
  lamp2.position.set(0.1, 2.06, 2.2);
  g.add(lamp2);

  for (const z of [4.55, 3.15]) {
    const read = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.05, 8), mats.lightWarm);
    read.position.set(-0.22, 1.55, z);
    g.add(read);
  }

  const vent = createVent(mats, 0.22, 0.12);
  vent.position.set(0.15, 2.0, 4.9);
  g.add(vent);

  const tray = createCableTray(2.8, mats);
  tray.position.set(0.05, 2.12, 3.2);
  g.add(tray);

  const panel = createAccessPanel(0.2, 0.16, mats, 'HVAC');
  panel.position.set(0.6, 1.7, 3.8);
  panel.rotation.y = -1.2;
  g.add(panel);

  const box = createJunctionBox(mats, 0.16, 0.12, 0.06);
  box.position.set(-0.6, 1.55, 2.5);
  box.rotation.y = 1.1;
  g.add(box);

  const warn = createWarning(mats, 'HOT\nPLATE', '#c25a28');
  warn.position.set(-0.22, 1.35, 2.15);
  warn.rotation.y = 0.4;
  g.add(warn);

  const curtain = createCurtain(mats);
  curtain.position.set(-0.22, 1.35, 3.82);
  curtain.scale.set(0.7, 0.85, 1);
  g.add(curtain);

  markShadows(g);
  return { group: g, bunkTarget: interactBunk, bunks };
}

function createBunk(mats) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(beveledBox(0.52, 0.06, 1.02, 0.008), mats.steel);
  g.add(frame);
  const mattress = createSoftPad(0.48, 0.07, 0.96, mats.mattress, 4);
  mattress.position.y = 0.06;
  g.add(mattress);
  const blanket = createSoftPad(0.46, 0.035, 0.72, mats.fabric, 5);
  blanket.position.set(0.0, 0.1, -0.08);
  g.add(blanket);
  const fold = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.02, 0.12), mats.fabric);
  fold.position.set(0, 0.125, 0.28);
  fold.rotation.x = -0.35;
  g.add(fold);
  const pillow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), mats.mattress);
  pillow.scale.set(1.5, 0.55, 1.0);
  pillow.position.set(0, 0.12, 0.38);
  g.add(pillow);
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.012, 0.03), mats.rubber);
  strap.position.set(0, 0.13, -0.1);
  g.add(strap);
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.95, 8), mats.steel);
  rail.rotation.x = Math.PI / 2;
  rail.position.set(0.22, 0.12, 0);
  g.add(rail);
  return g;
}

function createSoftPad(w, h, d, material, segs) {
  const geo = new THREE.BoxGeometry(w, h, d, segs, 2, segs + 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = pos.getY(i);
    if (y > 0) {
      const wrinkle = Math.sin(x * 18 + z * 7) * 0.006 + Math.sin(z * 12) * 0.008;
      pos.setY(i, y + wrinkle);
    }
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createFoldTable(mats) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(beveledBox(0.48, 0.03, 0.36, 0.006), mats.chippedPaint);
  g.add(top);
  const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.02, 0.02), mats.steel);
  hinge.position.set(0, -0.01, 0.18);
  g.add(hinge);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.05, 10), mats.plastic);
  cup.position.set(0.12, 0.04, 0.04);
  g.add(cup);
  const cup2 = cup.clone();
  cup2.position.x = -0.1;
  g.add(cup2);
  return g;
}

function createGalley(mats) {
  const g = new THREE.Group();
  const counter = new THREE.Mesh(beveledBox(0.38, 0.08, 0.8, 0.01), mats.steel);
  counter.position.y = 0.86;
  g.add(counter);
  const cab = new THREE.Mesh(beveledBox(0.36, 0.78, 0.78, 0.01), mats.hullGreen);
  cab.position.y = 0.42;
  g.add(cab);
  const sink = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.18), mats.brushed);
  sink.position.set(0.0, 0.9, 0.18);
  g.add(sink);
  const basin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.14), mats.oily);
  basin.position.set(0.0, 0.88, 0.18);
  g.add(basin);
  const tap = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 10, Math.PI), mats.steel);
  tap.position.set(0.0, 0.96, 0.1);
  tap.rotation.x = Math.PI;
  g.add(tap);
  const hob = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 14), mats.oily);
  hob.position.set(0.0, 0.91, -0.18);
  g.add(hob);
  const hob2 = hob.clone();
  hob2.position.x = 0.1;
  hob2.scale.setScalar(0.85);
  g.add(hob2);
  const door = new THREE.Mesh(beveledBox(0.3, 0.32, 0.02, 0.004), mats.machine);
  door.position.set(0.18, 0.38, 0.0);
  g.add(door);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.08, 0.015), mats.steel);
  handle.position.set(0.2, 0.4, 0.12);
  g.add(handle);
  const tin = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.07, 10), mats.machine);
  tin.position.set(-0.08, 0.94, -0.02);
  g.add(tin);
  return g;
}

function createWashroom(mats) {
  const g = new THREE.Group();
  const wall = new THREE.Mesh(beveledBox(0.04, 1.4, 0.7, 0.006), mats.hullPaint);
  wall.position.set(-0.16, 0.75, 0);
  g.add(wall);
  const basin = new THREE.Mesh(beveledBox(0.28, 0.08, 0.24, 0.01), mats.brushed);
  basin.position.set(0.02, 0.92, 0.05);
  g.add(basin);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.06, 12), mats.steel);
  bowl.position.set(0.02, 0.88, 0.05);
  g.add(bowl);
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.22), mats.glass);
  mirror.position.set(0.02, 1.32, -0.12);
  g.add(mirror);
  const frame = new THREE.Mesh(beveledBox(0.22, 0.24, 0.02, 0.004), mats.steel);
  frame.position.set(0.02, 1.32, -0.13);
  g.add(frame);
  const towel = createSoftPad(0.12, 0.02, 0.22, mats.fabric, 3);
  towel.position.set(0.12, 1.05, -0.05);
  towel.rotation.z = 0.2;
  g.add(towel);
  const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.1, 8), mats.steel);
  tap.position.set(0.02, 1.0, -0.02);
  g.add(tap);
  return g;
}

function createCurtain(mats) {
  const geo = new THREE.PlaneGeometry(0.55, 0.7, 8, 8);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, Math.sin(x * 14) * 0.025 + Math.sin(y * 6) * 0.01);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mats.fabric);
  mesh.castShadow = true;
  return mesh;
}
