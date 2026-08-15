import * as THREE from 'three';
import { LAYOUT, ROOMS, BULKHEADS, PALETTE } from './layout.js';
import {
  boxGeo,
  cylGeo,
  torusGeo,
  mergeGroup,
  createGrate,
  createHandrail,
  createAccessPanel,
  createWarning,
  markShadows,
  InstanceBatch,
  addBoltRing,
} from './kit.js';

export function createHull(mats, collider) {
  const root = new THREE.Group();
  root.name = 'hull';

  const R = LAYOUT.hullRadius;
  const cy = LAYOUT.hullCenterY;
  const len = LAYOUT.hullZMax - LAYOUT.hullZMin;
  const midZ = (LAYOUT.hullZMax + LAYOUT.hullZMin) / 2;

  const hullGeo = new THREE.CylinderGeometry(R, R, len, 56, 10, true);
  hullGeo.rotateX(Math.PI / 2);
  hullGeo.scale(-1, 1, 1);
  hullGeo.computeVertexNormals();
  const hull = new THREE.Mesh(hullGeo, mats.hullPaint);
  hull.position.set(0, cy, midZ);
  hull.receiveShadow = true;
  root.add(hull);

  const bow = new THREE.Mesh(
    new THREE.SphereGeometry(R, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.55),
    mats.hullPaint,
  );
  bow.rotation.x = Math.PI;
  bow.scale.set(-1, 1, 0.55);
  bow.position.set(0, cy, LAYOUT.hullZMax);
  root.add(bow);

  const stern = new THREE.Mesh(
    new THREE.SphereGeometry(R, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.5),
    mats.hullGreen,
  );
  stern.scale.set(-1, 1, 0.42);
  stern.position.set(0, cy, LAYOUT.hullZMin);
  root.add(stern);

  const ribGeos = [];
  for (let z = LAYOUT.hullZMin + 0.4; z < LAYOUT.hullZMax - 0.2; z += LAYOUT.ribSpacing) {
    ribGeos.push(torusGeo(R - 0.028, 0.032, 8, 40, 0, cy, z, 0, 0, 0));
    ribGeos.push(boxGeo(0.05, 0.08, 0.08, 0.62, 0.08, z));
    ribGeos.push(boxGeo(0.05, 0.08, 0.08, -0.62, 0.08, z));
  }
  const ribs = mergeGroup(ribGeos, mats.chippedPaint);
  if (ribs) root.add(ribs);

  const stringerGeos = [];
  for (const x of [-0.42, 0.42]) {
    stringerGeos.push(boxGeo(0.04, 0.05, len - 0.8, x, 2.05, midZ));
  }
  stringerGeos.push(boxGeo(0.06, 0.04, len - 0.8, 0, 2.14, midZ));
  const stringers = mergeGroup(stringerGeos, mats.steel);
  if (stringers) root.add(stringers);

  const deckSolid = new THREE.Mesh(
    new THREE.BoxGeometry(1.22, LAYOUT.deckThickness, len - 0.5),
    mats.deck,
  );
  deckSolid.position.set(0, -LAYOUT.deckThickness / 2, midZ);
  deckSolid.receiveShadow = true;
  root.add(deckSolid);

  const under = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, len - 0.8), mats.blackout);
  under.position.set(0, -0.16, midZ);
  root.add(under);

  const keel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, len - 0.6), mats.steel);
  keel.position.set(0, -0.12, midZ);
  root.add(keel);

  const grateZs = [10.4, 7.15, 3.4, -0.2, -4.6, -6.8];
  for (const z of grateZs) {
    const g = createGrate(0.62, 0.72, mats);
    if (g) {
      g.position.set(0.28, 0.01, z);
      root.add(g);
    }
    const cut = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 0.72), mats.blackout);
    cut.position.set(0.28, -0.01, z);
    root.add(cut);
  }

  const kickGeos = [
    boxGeo(0.04, 0.07, len - 0.6, 0.6, 0.03, midZ),
    boxGeo(0.04, 0.07, len - 0.6, -0.6, 0.03, midZ),
  ];
  const kicks = mergeGroup(kickGeos, mats.rubber);
  if (kicks) root.add(kicks);

  const bolts = new InstanceBatch(new THREE.CylinderGeometry(0.012, 0.012, 0.018, 6), mats.steel, 500);
  for (const z of BULKHEADS) {
    addBoltRing(bolts, new THREE.Vector3(0, cy, z + 0.05), 'z', R - 0.05, 14, 0.85);
  }

  for (const z of BULKHEADS) {
    root.add(createBulkhead(z, mats, collider, bolts));
  }

  bolts.finalize(root);

  const bowBulk = createEndBulkhead(LAYOUT.hullZMax - 0.12, mats, true);
  root.add(bowBulk);
  const sternBulk = createEndBulkhead(LAYOUT.hullZMin + 0.18, mats, false);
  root.add(sternBulk);

  collider.addBox(0, 1.1, LAYOUT.hullZMax - 0.05, 2.2, 2.2, 0.2, 'bow');
  collider.addBox(0, 1.1, LAYOUT.hullZMin + 0.1, 2.2, 2.2, 0.25, 'stern');

  markShadows(root);
  return root;
}

function createBulkhead(z, mats, collider, bolts) {
  const g = new THREE.Group();
  g.position.z = z;
  const R = LAYOUT.hullRadius;
  const cy = LAYOUT.hullCenterY;
  const plate = new THREE.Mesh(new THREE.CircleGeometry(R - 0.02, 40), mats.hullGreen);
  plate.position.y = cy;
  g.add(plate);
  const plateB = plate.clone();
  plateB.rotation.y = Math.PI;
  plateB.position.z = -0.03;
  g.add(plateB);

  const hole = new THREE.Mesh(new THREE.CircleGeometry(LAYOUT.hatchRadius + 0.02, 28), mats.blackout);
  hole.position.set(0, 0.92, 0.01);
  g.add(hole);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(LAYOUT.hatchRadius, 0.045, 10, 28), mats.steel);
  ring.position.set(0, 0.92, 0.02);
  g.add(ring);
  const ring2 = ring.clone();
  ring2.position.z = -0.04;
  g.add(ring2);

  const lip = new THREE.Mesh(
    new THREE.CylinderGeometry(LAYOUT.hatchRadius + 0.05, LAYOUT.hatchRadius + 0.05, 0.12, 24, 1, true),
    mats.chippedPaint,
  );
  lip.rotation.x = Math.PI / 2;
  lip.position.set(0, 0.92, -0.01);
  g.add(lip);

  const door = new THREE.Mesh(
    new THREE.CylinderGeometry(LAYOUT.hatchRadius - 0.02, LAYOUT.hatchRadius - 0.02, 0.04, 22),
    mats.hullPaint,
  );
  door.rotation.x = Math.PI / 2;
  door.position.set(-0.72, 0.92, 0.18);
  door.rotation.y = 1.15;
  g.add(door);

  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.016, 8, 16), mats.steel);
  wheel.position.set(0.38, 1.05, 0.08);
  g.add(wheel);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 8), mats.steel);
  hub.rotation.x = Math.PI / 2;
  hub.position.copy(wheel.position);
  g.add(hub);

  const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.06), mats.steel);
  hinge.position.set(-0.5, 0.92, 0.08);
  g.add(hinge);

  const sill = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.16), mats.chippedPaint);
  sill.position.set(0, 0.36, 0);
  g.add(sill);

  const label = createWarning(mats, ROOMSLabel(z), '#c4a032');
  label.position.set(0.42, 1.55, 0.04);
  g.add(label);

  collider.addBox(-0.85, 1.1, z, 0.55, 2.2, 0.12, 'bulk-side');
  collider.addBox(0.85, 1.1, z, 0.55, 2.2, 0.12, 'bulk-side');
  collider.addBox(0, 0.2, z, 1.4, 0.4, 0.16, 'sill');
  collider.addBox(0, 1.85, z, 1.6, 0.5, 0.12, 'bulk-top');

  return g;
}

function ROOMSLabel(z) {
  if (Math.abs(z - 9.15) < 0.05) return 'CONTROL';
  if (Math.abs(z - 5.35) < 0.05) return 'BERTH';
  if (Math.abs(z - 1.15) < 0.05) return 'ELEC';
  return 'MACH';
}

function createEndBulkhead(z, mats, bow) {
  const g = new THREE.Group();
  g.position.z = z;
  const R = LAYOUT.hullRadius;
  const plate = new THREE.Mesh(new THREE.CircleGeometry(R - 0.01, 36), mats.hullGreen);
  plate.position.y = LAYOUT.hullCenterY;
  g.add(plate);
  if (bow) {
    const opening = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.58), mats.blackout);
    opening.position.set(0, 1.28, 0.02);
    g.add(opening);
  }
  return g;
}

export function createSharedUtilities(mats, collider) {
  const g = new THREE.Group();
  g.name = 'utilities';

  const overhead = [];
  for (let z = LAYOUT.hullZMin + 0.6; z < LAYOUT.hullZMax - 0.4; z += 0.9) {
    overhead.push(boxGeo(0.7, 0.04, 0.06, 0, 2.08, z));
  }
  const braces = mergeGroup(overhead, mats.steel);
  if (braces) g.add(braces);

  const railL = createHandrail(20.4, mats);
  railL.position.set(-0.52, 0, 1.8);
  railL.scale.set(1, 0.92, 1);
  g.add(railL);
  collider.addBox(-0.52, 0.5, 1.8, 0.06, 1.0, 18, 'railL');

  return g;
}

export { PALETTE, ROOMS };
