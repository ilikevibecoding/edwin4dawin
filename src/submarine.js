import { CircleGeometry, CylinderGeometry, Group } from 'three';
import { LAYOUT, hullHalfWidthAt } from './seed.js';
import { addUv2, bulkheadPlate, invertNormals, roundedBox, tBeamRing, windowBulkhead } from './geom.js';
import { makeHatchDoor, makeLightFixture, makeWarningPlate, mesh } from './kit.js';
import { mergeStatic } from './batch.js';
import { CollisionWorld, wallCollidersForHull } from './collision.js';
import { buildControlRoom } from './controlRoom.js';
import { buildCorridor } from './corridor.js';
import { buildCrewQuarters } from './crewQuarters.js';
import { buildEngineRoom } from './engineRoom.js';

function createHullShell(mats) {
  const g = new Group();
  const len = LAYOUT.length;
  const r = LAYOUT.hullRadius;
  const hullLen = len - 0.55;
  const geo = new CylinderGeometry(r, r, hullLen, 48, 12, true);
  geo.rotateX(Math.PI * 0.5);
  invertNormals(geo);
  addUv2(geo);
  const shell = mesh(geo, mats.hull);
  shell.position.set(0, LAYOUT.hullCenterY, 0.55 + hullLen * 0.5);
  g.add(shell);

  const bowPlate = mesh(
    windowBulkhead(r - 0.01, 1.02, 0.64, 1.28 - LAYOUT.hullCenterY, 0.1),
    mats.chipped
  );
  bowPlate.position.set(0, LAYOUT.hullCenterY, 0.36);
  g.add(bowPlate);

  const stern = new CylinderGeometry(r * 0.7, r, 0.8, 32, 3, true);
  stern.rotateX(-Math.PI * 0.5);
  invertNormals(stern);
  const sternMesh = mesh(stern, mats.hull);
  sternMesh.position.set(0, LAYOUT.hullCenterY, len - 0.15);
  g.add(sternMesh);
  const sternCap = mesh(new CircleGeometry(r * 0.72, 28), mats.hull);
  sternCap.rotation.y = Math.PI;
  sternCap.position.set(0, LAYOUT.hullCenterY, len + 0.22);
  g.add(sternCap);

  return g;
}

function createDeck(mats) {
  const g = new Group();
  const len = LAYOUT.length - 0.3;
  const w = hullHalfWidthAt(0.02) * 2 - 0.04;
  const deck = mesh(roundedBox(w, 0.035, len, 0.006, 1), mats.deck);
  deck.position.set(0, 0.018, LAYOUT.length * 0.5);
  g.add(deck);

  const under = mesh(roundedBox(w * 0.96, 0.08, len, 0.004, 1), mats.oily);
  under.position.set(0, -0.04, LAYOUT.length * 0.5);
  g.add(under);

  const stringerL = mesh(roundedBox(0.04, 0.06, len, 0.006, 1), mats.chipped);
  stringerL.position.set(-w * 0.42, -0.01, LAYOUT.length * 0.5);
  const stringerR = stringerL.clone();
  stringerR.position.x = w * 0.42;
  g.add(stringerL, stringerR);
  return g;
}

function createLining(mats) {
  const g = new Group();
  const y = 1.08;
  const hw = Math.max(0.2, hullHalfWidthAt(y) - 0.04);
  const tilt = Math.atan2(y - LAYOUT.hullCenterY, hw);
  for (let z = 1.2; z < 15.6; z += 0.84) {
    if (Math.abs(z - 6.55) < 0.4 || Math.abs(z - 10.7) < 0.4) continue;
    const plate = mesh(roundedBox(0.38, 0.48, 0.03, 0.008, 1), mats.hullGreen);
    plate.position.set(-hw, y, z);
    plate.rotation.z = -tilt;
    g.add(plate);
    const plateR = plate.clone();
    plateR.position.x = hw;
    plateR.rotation.z = tilt;
    g.add(plateR);
  }
  return g;
}

function createRibs(mats) {
  const g = new Group();
  const r = LAYOUT.hullRadius - 0.02;
  for (let z = 0.7; z < LAYOUT.length - 0.4; z += 0.72) {
    const rib = mesh(tBeamRing(r, 0.04, 0.055, 0.014, 40, -0.02), mats.chipped);
    rib.position.set(0, LAYOUT.hullCenterY, z);
    g.add(rib);
  }
  return g;
}

function createBulkhead(mats, z, openSide = 1) {
  const g = new Group();
  const r = LAYOUT.hullRadius - 0.01;
  const plate = mesh(
    bulkheadPlate(r, LAYOUT.hatchWidth, LAYOUT.hatchHeight, LAYOUT.hatchSill - LAYOUT.hullCenterY + 0.08, 0.07),
    mats.hull
  );
  plate.position.set(0, LAYOUT.hullCenterY, z);
  g.add(plate);

  const frame = mesh(
    bulkheadPlate(r * 0.99, LAYOUT.hatchWidth - 0.04, LAYOUT.hatchHeight - 0.04, LAYOUT.hatchSill - LAYOUT.hullCenterY + 0.1, 0.03),
    mats.chipped
  );
  frame.position.set(0, LAYOUT.hullCenterY, z + 0.04);
  g.add(frame);

  const door = makeHatchDoor(mats, LAYOUT.hatchWidth, LAYOUT.hatchHeight);
  door.position.set(openSide * (LAYOUT.hatchWidth * 0.72), LAYOUT.hatchHeight * 0.48, z + 0.12);
  door.rotation.y = openSide * 1.35;
  g.add(door);

  const sill = mesh(roundedBox(LAYOUT.hatchWidth + 0.08, 0.05, 0.16, 0.01, 1), mats.chipped);
  sill.position.set(0, 0.03, z);
  g.add(sill);

  const label = makeWarningPlate(mats, 'WATERTIGHT', `FR ${Math.round(z)}`);
  label.position.set(-0.42, 1.72, z + 0.05);
  g.add(label);
  return g;
}

export function buildSubmarine(scene, mats) {
  const root = new Group();
  root.name = 'submarine';
  const collision = new CollisionWorld();

  root.add(createHullShell(mats));
  root.add(createDeck(mats));
  root.add(createRibs(mats));
  root.add(createLining(mats));

  const rooms = LAYOUT.rooms;
  root.add(createBulkhead(mats, rooms.control.z1, 1));
  root.add(createBulkhead(mats, rooms.corridor.z1, -1));
  root.add(createBulkhead(mats, rooms.crew.z1, 1));
  root.add(createBulkhead(mats, rooms.passage.z1, -1));

  wallCollidersForHull(collision, 0.1, LAYOUT.length - 0.2, LAYOUT.hullRadius, LAYOUT.hullCenterY, 0.1);
  collision.addBox(0, 1.1, -0.15, 2.4, 2.2, 0.3);
  collision.addBox(0, 1.1, LAYOUT.length + 0.05, 2.4, 2.2, 0.3);

  const interactables = [];
  const animators = [];

  const control = buildControlRoom(mats, collision, interactables, animators);
  const corridor = buildCorridor(mats, collision, interactables, animators);
  const crew = buildCrewQuarters(mats, collision, interactables, animators);
  const engine = buildEngineRoom(mats, collision, interactables, animators);
  root.add(control, corridor, crew, engine);

  for (const z of [1.4, 3.1, 5.5, 7.1, 9.4, 11.6, 14.4, 17.6, 19.8]) {
    const light = makeLightFixture(mats, 0.38);
    light.position.set(0, 2.08, z);
    root.add(light);
  }

  const skip = new Set(interactables);
  for (const a of animators) {
    if (a.object) skip.add(a.object);
    if (a.group) skip.add(a.group);
  }
  mergeStatic(root, skip);

  scene.add(root);
  return { root, collision, interactables, animators };
}
