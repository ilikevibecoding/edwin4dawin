import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { HULL, BULKHEADS, HATCH, ZONES, hullXAtY } from "./layout.js";
import { invertNormals, beveledPanel, setShadow } from "./geom.js";
import {
  createHandrail,
  createFloorGrate,
  createUnderfloorPipes,
  createAccessPanel,
  createWarningPlate,
  createLightFixture,
  createPipeRun,
  createCableTray,
  createJunctionBox,
  createValveAssembly,
} from "./machinery.js";

function makeHullSkin(mats) {
  const geo = new THREE.CylinderGeometry(
    HULL.radius,
    HULL.radius,
    HULL.length,
    56,
    10,
    true
  );
  geo.rotateX(Math.PI / 2);
  geo.translate(0, HULL.centerY, HULL.length * 0.5);
  invertNormals(geo);
  const mesh = new THREE.Mesh(geo, mats.hullPaint);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}

function makeRib(mats, z) {
  const g = new THREE.Group();
  const torus = new THREE.Mesh(
    new THREE.TorusGeometry(HULL.radius - 0.055, 0.028, 8, 40, Math.PI * 1.35),
    mats.chippedPaint
  );
  torus.position.set(0, HULL.centerY, z);
  torus.rotation.z = Math.PI * 0.325;
  const flange = new THREE.Mesh(
    new THREE.TorusGeometry(HULL.radius - 0.078, 0.012, 6, 40, Math.PI * 1.35),
    mats.brushedMetal
  );
  flange.position.copy(torus.position);
  flange.rotation.copy(torus.rotation);
  g.add(torus, flange);
  return g;
}

function makeStringer(mats, angle, z0, z1) {
  const r = HULL.radius - 0.08;
  const y = HULL.centerY + Math.sin(angle) * r;
  const x = Math.cos(angle) * r;
  const len = z1 - z0;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, len), mats.chippedPaint);
  bar.position.set(x, y, z0 + len * 0.5);
  bar.rotation.z = Math.atan2(y - HULL.centerY, x);
  return bar;
}

function makeBulkhead(mats, z, withHatch = true) {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.absarc(0, HULL.centerY, HULL.radius - 0.02, 0, Math.PI * 2, false);
  if (withHatch) {
    const hole = new THREE.Path();
    hole.absellipse(0, HATCH.centerY, HATCH.width * 0.5, HATCH.height * 0.5, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: HATCH.thickness,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.016,
    bevelSegments: 2,
    curveSegments: 40,
  });
  geo.translate(0, 0, -HATCH.thickness * 0.5);
  const wall = new THREE.Mesh(geo, mats.hullGreen);
  wall.position.z = z;
  wall.castShadow = true;
  wall.receiveShadow = true;
  g.add(wall);

  if (withHatch) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(HATCH.width * 0.52, 0.028, 8, 28),
      mats.brushedMetal
    );
    ring.position.set(0, HATCH.centerY, z);
    ring.scale.set(1, HATCH.height / HATCH.width, 1);
    g.add(ring);

    const door = new THREE.Group();
    const slab = new THREE.Mesh(
      new THREE.CylinderGeometry(HATCH.width * 0.48, HATCH.width * 0.48, 0.05, 24),
      mats.chippedPaint
    );
    slab.rotation.x = Math.PI / 2;
    slab.scale.set(1, 1, HATCH.height / HATCH.width);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.014, 8, 16), mats.brushedMetal);
    wheel.position.z = 0.04;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 10), mats.brushedMetal);
    hub.rotation.x = Math.PI / 2;
    hub.position.z = 0.04;
    door.add(slab, wheel, hub);
    door.position.set(HATCH.width * 0.72, HATCH.centerY, z);
    door.rotation.y = -0.15;
    g.add(door);

    const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, 0.05), mats.brushedMetal);
    hinge.position.set(HATCH.width * 0.52, HATCH.centerY, z);
    g.add(hinge);

    const sill = new THREE.Mesh(new THREE.BoxGeometry(HATCH.width * 0.9, 0.06, 0.22), mats.chippedPaint);
    sill.position.set(0, 0.04, z);
    g.add(sill);
  }
  return g;
}

function makeDeck(mats, z0, z1, grateCenters = []) {
  const g = new THREE.Group();
  const len = z1 - z0;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.04, len), mats.antiSlip);
  deck.position.set(0, -0.02, z0 + len * 0.5);
  deck.receiveShadow = true;
  g.add(deck);

  const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.035, len), mats.chippedPaint);
  const sideR = sideL.clone();
  sideL.position.set(-0.92, -0.018, z0 + len * 0.5);
  sideR.position.set(0.92, -0.018, z0 + len * 0.5);
  g.add(sideL, sideR);

  for (const zc of grateCenters) {
    const grate = createFloorGrate(0.62, 0.72, mats);
    grate.position.set(0, 0.01, zc);
    g.add(grate);
    const under = createUnderfloorPipes(0.62, 0.72, mats, (zc * 10) | 0);
    under.position.set(0, 0.0, zc);
    g.add(under);
  }

  const beamN = Math.max(2, Math.round(len / 0.9));
  for (let i = 0; i < beamN; i++) {
    const z = z0 + 0.2 + (i / Math.max(1, beamN - 1)) * (len - 0.4);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.05, 0.05), mats.brushedMetal);
    beam.position.set(0, -0.08, z);
    g.add(beam);
  }
  return g;
}

function makeBowCap(mats) {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.absarc(0, HULL.centerY, HULL.radius - 0.01, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absellipse(0, 1.28, 0.42, 0.32, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.025,
    bevelSegments: 2,
    curveSegments: 36,
  });
  const cap = new THREE.Mesh(geo, mats.hullGreen);
  cap.position.z = -0.02;
  g.add(cap);

  const frame = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.035, 10, 28), mats.brushedMetal);
  frame.position.set(0, 1.28, 0.1);
  frame.scale.set(1.12, 0.86, 1);
  g.add(frame);

  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.018, 8, 24), mats.chippedPaint);
  inner.position.set(0, 1.28, 0.14);
  inner.scale.set(1.12, 0.86, 1);
  g.add(inner);

  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 6), mats.brushedMetal);
    bolt.rotation.x = Math.PI / 2;
    bolt.position.set(Math.cos(a) * 0.4, 1.28 + Math.sin(a) * 0.3, 0.16);
    g.add(bolt);
  }

  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.07, 28), mats.glassThick);
  glass.rotation.x = Math.PI / 2;
  glass.scale.set(1.12, 1, 0.86);
  glass.position.set(0, 1.28, 0.02);
  glass.userData.window = "forward";
  g.add(glass);

  const seal = new THREE.Mesh(new THREE.TorusGeometry(0.355, 0.012, 8, 24), mats.rubber);
  seal.position.set(0, 1.28, 0.08);
  seal.scale.set(1.12, 0.86, 1);
  g.add(seal);

  return g;
}

function makeSternCap(mats) {
  const g = new THREE.Group();
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(HULL.radius, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
    mats.hullPaint
  );
  cap.rotation.x = Math.PI;
  cap.position.set(0, HULL.centerY, ZONES.stern.z1);
  invertNormals(cap.geometry);
  g.add(cap);
  return g;
}

export function buildSubmarine(mats, collision) {
  const root = new THREE.Group();
  root.name = "submarine";

  root.add(makeHullSkin(mats));
  root.add(makeBowCap(mats));
  root.add(makeSternCap(mats));

  for (let z = 0.7; z < HULL.length - 0.4; z += HULL.ribSpacing) {
    root.add(makeRib(mats, z));
  }

  const stringerAngles = [0.55, 2.6, -0.55, Math.PI - 0.55];
  for (const a of stringerAngles) {
    root.add(makeStringer(mats, a, 0.4, 21.4));
  }

  for (const z of BULKHEADS) {
    root.add(makeBulkhead(mats, z, true));
    collision.addAABB(-1.05, 1.05, z, 0.95, 2.1, 0.16, "bulkhead-port");
    collision.addAABB(1.05, 1.05, z, 0.95, 2.1, 0.16, "bulkhead-stbd");
    collision.addAABB(0, 2.08, z, 1.7, 0.32, 0.16, "bulkhead-top");
    collision.addAABB(0, 0.06, z, 1.15, 0.12, 0.2, "sill");
  }

  root.add(makeDeck(mats, 0.15, 4.5, [1.6, 3.2]));
  root.add(makeDeck(mats, 4.62, 8.08, [5.4, 6.6, 7.5]));
  root.add(makeDeck(mats, 8.22, 13.18, [9.4, 11.1, 12.4]));
  root.add(makeDeck(mats, 13.32, 15.98, [14.1, 15.2]));
  root.add(makeDeck(mats, 16.12, 21.55, [17.2, 18.6, 20.1]));

  collision.addAABB(0, -0.2, 11, 3.2, 0.4, 24, "deck");

  const wallInset = 1.18;
  for (let z = 1; z < 21; z += 1.2) {
    const x = hullXAtY(1.1, 0.08);
    collision.addAABB(-x - 0.15, 1.1, z, 0.4, 2.2, 1.3, "hull-port");
    collision.addAABB(x + 0.15, 1.1, z, 0.4, 2.2, 1.3, "hull-stbd");
  }
  collision.addAABB(0, 1.1, -0.15, 3.0, 2.4, 0.3, "bow");
  collision.addAABB(0, 1.1, 22.05, 3.0, 2.4, 0.3, "stern");
  collision.addAABB(0, 2.35, 11, 3.0, 0.3, 24, "ceiling");

  for (const z of [2.1, 6.2, 10.4, 14.6, 18.4]) {
    const rail = createHandrail(1.4, mats);
    rail.position.set(-0.62, 0.92, z);
    root.add(rail);
    const railR = createHandrail(1.4, mats);
    railR.position.set(0.62, 0.92, z);
    root.add(railR);
  }

  for (const z of [3.4, 7.1, 12.2, 17.6]) {
    const panel = createAccessPanel(mats);
    panel.position.set(-1.05, 1.15, z);
    panel.rotation.y = Math.PI / 2;
    root.add(panel);
  }

  const plate = createWarningPlate("WATCH\nSTEP", mats);
  plate.position.set(0.42, 1.55, 4.42);
  root.add(plate);

  const keel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 21.4), mats.oilyMachinery);
  keel.position.set(0, -0.16, 11);
  root.add(keel);

  const servicePipes = [
    new THREE.Mesh(
      createPipeRun(
        [
          [-1.05, 1.78, 0.6],
          [-1.05, 1.78, 21.2],
        ],
        0.034,
        8,
        20
      ),
      mats.paintedPipe
    ),
    new THREE.Mesh(
      createPipeRun(
        [
          [1.05, 1.88, 0.6],
          [1.05, 1.88, 21.2],
        ],
        0.026,
        7,
        18
      ),
      mats.pipeBlue
    ),
    new THREE.Mesh(
      createPipeRun(
        [
          [-0.88, 1.98, 0.6],
          [-0.88, 1.98, 21.2],
        ],
        0.018,
        6,
        16
      ),
      mats.pipeOrange
    ),
  ];
  servicePipes.forEach((p) => root.add(p));

  for (const z of [2.4, 6.3, 10.6, 14.5, 18.8]) {
    const tray = createCableTray(2.2, mats, 0.16);
    tray.position.set(0.48, 2.04, z);
    root.add(tray);
    const box = createJunctionBox(mats, 0.18, 0.14, 0.07);
    box.position.set(-1.08, 1.35, z);
    box.rotation.y = Math.PI / 2;
    root.add(box);
  }

  const midValve = createValveAssembly(mats, 1, "paintedPipe");
  midValve.position.set(-1.05, 1.62, 10.2);
  root.add(midValve);

  return root;
}

export function addSharedOverhead(parent, mats, z0, z1) {
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, z1 - z0), mats.chippedPaint);
  tray.position.set(-0.42, 2.02, (z0 + z1) * 0.5);
  parent.add(tray);
  const n = Math.round((z1 - z0) / 1.6);
  for (let i = 0; i < n; i++) {
    const z = z0 + 0.5 + i * 1.6;
    const fix = createLightFixture(mats);
    fix.position.set(0.0, 2.08, z);
    parent.add(fix);
  }
}
