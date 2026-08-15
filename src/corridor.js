import * as THREE from "three";
import { beveledBox, beveledPanel } from "./geom.js";
import {
  createPipeRun,
  createValveAssembly,
  createGauge,
  createCableTray,
  createJunctionBox,
  createVent,
  createAccessPanel,
  createWarningPlate,
  createHandrail,
  createLightFixture,
  createFlange,
} from "./machinery.js";
import { createLabelTexture } from "./materials.js";

export function buildCorridor(mats, collision, ctx) {
  const g = new THREE.Group();
  g.name = "corridor";

  const pipeA = new THREE.Mesh(
    createPipeRun(
      [
        [-0.92, 1.72, 4.7],
        [-0.92, 1.72, 6.2],
        [-0.92, 1.55, 7.1],
        [-0.92, 1.55, 8.05],
      ],
      0.038,
      8,
      24
    ),
    mats.paintedPipe
  );
  const pipeB = new THREE.Mesh(
    createPipeRun(
      [
        [0.95, 1.85, 4.7],
        [0.95, 1.85, 8.05],
      ],
      0.028,
      8,
      16
    ),
    mats.pipeBlue
  );
  const pipeC = new THREE.Mesh(
    createPipeRun(
      [
        [-0.78, 1.95, 4.7],
        [-0.78, 1.95, 8.05],
      ],
      0.022,
      7,
      16
    ),
    mats.pipeOrange
  );
  g.add(pipeA, pipeB, pipeC);

  for (const z of [5.2, 6.4, 7.5]) {
    const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.03), mats.brushedMetal);
    clamp.position.set(-0.92, 1.72, z);
    g.add(clamp);
    const clamp2 = clamp.clone();
    clamp2.position.set(0.95, 1.85, z);
    g.add(clamp2);
  }

  const valve = createValveAssembly(mats, 1.05, "paintedPipe");
  valve.position.set(-0.92, 1.55, 6.55);
  g.add(valve);
  const gauge = createGauge(mats, "HYD", 0.55);
  gauge.position.set(-0.78, 1.42, 6.55);
  gauge.rotation.y = Math.PI / 2;
  gauge.scale.setScalar(0.8);
  g.add(gauge);

  const flange = createFlange(0.038, mats.brushedMetal);
  flange.position.set(-0.92, 1.72, 5.6);
  g.add(flange);

  const tray = createCableTray(3.2, mats, 0.2);
  tray.position.set(0.42, 2.02, 6.35);
  g.add(tray);

  const box1 = createJunctionBox(mats, 0.24, 0.2, 0.09);
  box1.position.set(1.02, 1.25, 5.5);
  box1.rotation.y = -Math.PI / 2;
  g.add(box1);
  const box2 = createJunctionBox(mats, 0.2, 0.16, 0.08);
  box2.position.set(1.02, 1.15, 7.15);
  box2.rotation.y = -Math.PI / 2;
  g.add(box2);
  const box3 = createJunctionBox(mats, 0.18, 0.14, 0.07);
  box3.position.set(-1.02, 1.2, 7.4);
  box3.rotation.y = Math.PI / 2;
  g.add(box3);

  const vent = createVent(mats, 0.26, 0.14);
  vent.position.set(0.0, 2.05, 6.9);
  vent.rotation.x = Math.PI / 2;
  g.add(vent);

  const rail = createHandrail(2.8, mats);
  rail.position.set(-0.58, 0.9, 6.35);
  g.add(rail);
  collision.addAABB(-0.58, 0.7, 6.35, 0.06, 0.28, 2.8, "rail");

  const panel = createAccessPanel(mats, 0.3, 0.22);
  panel.position.set(-1.05, 0.85, 5.7);
  panel.rotation.y = Math.PI / 2;
  g.add(panel);

  const locker = new THREE.Mesh(beveledBox(0.28, 0.55, 0.22, 0.01), mats.hullGreen);
  locker.position.set(0.95, 0.32, 6.9);
  g.add(locker);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.02), mats.brushedMetal);
  handle.position.set(0.82, 0.32, 6.9);
  g.add(handle);
  collision.addAABB(0.95, 0.32, 6.9, 0.3, 0.55, 0.24, "locker");

  const label = createWarningPlate("AFT →\nMACHINERY", mats);
  label.position.set(0.5, 1.62, 7.95);
  g.add(label);
  const label2 = createWarningPlate("FWD →\nCONTROL", mats);
  label2.position.set(-0.5, 1.62, 4.72);
  g.add(label2);

  const stencil = new THREE.Mesh(
    beveledPanel(0.36, 0.1, 0.004, 0.006, 0.001),
    new THREE.MeshStandardMaterial({
      map: createLabelTexture("FRAME 12", { bg: "#6f7668", fg: "#e8e0cc", w: 256, h: 72, size: 28 }),
      roughness: 0.6,
    })
  );
  stencil.position.set(0.0, 1.85, 6.2);
  g.add(stencil);

  const fixture = createLightFixture(mats);
  fixture.position.set(0, 2.08, 5.4);
  g.add(fixture);
  const fixture2 = createLightFixture(mats);
  fixture2.position.set(0, 2.08, 7.2);
  g.add(fixture2);

  const porthole = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.028, 10, 20), mats.brushedMetal);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.06, 20), mats.glassThick);
  glass.rotation.x = Math.PI / 2;
  glass.userData.window = "porthole";
  const seal = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.01, 8, 18), mats.rubber);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.02, 6), mats.brushedMetal);
    bolt.rotation.x = Math.PI / 2;
    bolt.position.set(Math.cos(a) * 0.175, Math.sin(a) * 0.175, 0.02);
    porthole.add(bolt);
  }
  porthole.add(frame, glass, seal);
  porthole.position.set(1.18, 1.38, 6.55);
  porthole.rotation.y = -Math.PI / 2;
  g.add(porthole);

  const hole = new THREE.Mesh(
    new THREE.CircleGeometry(0.15, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide })
  );
  hole.position.set(1.22, 1.38, 6.55);
  hole.rotation.y = -Math.PI / 2;
  g.add(hole);

  const drain = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 10), mats.brushedMetal);
  drain.position.set(0.28, 0.02, 6.1);
  g.add(drain);

  const conduit = new THREE.Mesh(
    createPipeRun(
      [
        [0.88, 0.55, 4.75],
        [0.88, 0.55, 8.05],
      ],
      0.018,
      6,
      8
    ),
    mats.plastic
  );
  g.add(conduit);

  const electrical = buildElectricalPassage(mats, collision);
  g.add(electrical);

  ctx.rooms.corridor = g;
  return g;
}

function buildElectricalPassage(mats, collision) {
  const g = new THREE.Group();
  const cab = new THREE.Mesh(beveledBox(0.42, 1.25, 0.28, 0.012), mats.hullGreen);
  cab.position.set(-0.95, 0.68, 14.4);
  g.add(cab);
  const cab2 = cab.clone();
  cab2.position.set(-0.95, 0.68, 15.15);
  g.add(cab2);
  collision.addAABB(-0.95, 0.68, 14.4, 0.44, 1.25, 0.3, "elec-cab");
  collision.addAABB(-0.95, 0.68, 15.15, 0.44, 1.25, 0.3, "elec-cab");

  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.08), mats.emissiveGreen);
  lamp.position.set(-0.74, 1.2, 14.4);
  g.add(lamp);

  const pipes = new THREE.Mesh(
    createPipeRun(
      [
        [0.9, 1.7, 13.4],
        [0.9, 1.7, 16.0],
      ],
      0.04,
      8,
      12
    ),
    mats.pipeBlue
  );
  g.add(pipes);

  const tray = createCableTray(2.5, mats);
  tray.position.set(0.35, 2.02, 14.65);
  g.add(tray);

  const valve = createValveAssembly(mats, 1, "pipeBlue");
  valve.position.set(0.9, 1.55, 14.8);
  g.add(valve);

  const warn = createWarningPlate("HIGH\nVOLTAGE", mats);
  warn.position.set(-0.72, 1.45, 14.4);
  warn.rotation.y = Math.PI / 2;
  g.add(warn);

  const fixture = createLightFixture(mats);
  fixture.position.set(0, 2.08, 14.6);
  g.add(fixture);

  const rail = createHandrail(2.2, mats);
  rail.position.set(0.55, 0.9, 14.65);
  g.add(rail);

  return g;
}
