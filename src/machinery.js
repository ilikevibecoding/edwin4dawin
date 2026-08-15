import * as THREE from 'three';
import {
  beveledBox,
  createValveAssembly,
  createGauge,
  createFan,
  createJunctionBox,
  markShadows,
  boxGeo,
  cylGeo,
  mergeGroup,
} from './kit.js';

export function createPropulsionMotor(mats) {
  const g = new THREE.Group();
  g.name = 'propMotor';

  const points = [
    new THREE.Vector2(0.0, -0.95),
    new THREE.Vector2(0.38, -0.95),
    new THREE.Vector2(0.42, -0.88),
    new THREE.Vector2(0.44, -0.7),
    new THREE.Vector2(0.46, -0.2),
    new THREE.Vector2(0.46, 0.35),
    new THREE.Vector2(0.43, 0.7),
    new THREE.Vector2(0.36, 0.86),
    new THREE.Vector2(0.22, 0.92),
    new THREE.Vector2(0.0, 0.92),
  ];
  const housing = new THREE.Mesh(new THREE.LatheGeometry(points, 28), mats.brushed);
  housing.rotation.z = Math.PI / 2;
  g.add(housing);

  const fins = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    fins.push(boxGeo(0.9, 0.018, 0.07, 0, Math.cos(a) * 0.47, Math.sin(a) * 0.47, 0, 0, a));
  }
  const finMesh = mergeGroup(fins, mats.oily);
  if (finMesh) g.add(finMesh);

  const end = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 22), mats.steel);
  end.rotation.z = Math.PI / 2;
  end.position.x = -0.98;
  g.add(end);
  const end2 = end.clone();
  end2.position.x = 0.9;
  g.add(end2);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.04, 6), mats.steel);
    bolt.rotation.z = Math.PI / 2;
    bolt.position.set(-1.03, Math.cos(a) * 0.32, Math.sin(a) * 0.32);
    g.add(bolt);
  }

  const plate = new THREE.Mesh(beveledBox(0.28, 0.22, 0.04, 0.006), mats.chippedPaint);
  plate.position.set(0.1, 0.42, 0);
  g.add(plate);
  const name = new THREE.Mesh(beveledBox(0.22, 0.08, 0.012, 0.002), mats.steel);
  name.position.set(0.1, 0.42, 0.03);
  g.add(name);

  const terminal = createJunctionBox(mats, 0.18, 0.14, 0.1);
  terminal.position.set(0.35, 0.38, 0.32);
  g.add(terminal);

  const mount = new THREE.Mesh(beveledBox(1.7, 0.12, 0.55, 0.012), mats.steel);
  mount.position.y = -0.52;
  g.add(mount);
  const feet = mergeGroup([
    boxGeo(0.16, 0.16, 0.16, -0.7, -0.62, 0.18),
    boxGeo(0.16, 0.16, 0.16, -0.7, -0.62, -0.18),
    boxGeo(0.16, 0.16, 0.16, 0.65, -0.62, 0.18),
    boxGeo(0.16, 0.16, 0.16, 0.65, -0.62, -0.18),
  ], mats.oily);
  if (feet) g.add(feet);

  g.userData.kind = 'motor';
  markShadows(g);
  return g;
}

export function createGearbox(mats) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(beveledBox(0.7, 0.62, 0.55, 0.02), mats.oily);
  g.add(body);
  const bulge = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.58, 18), mats.machine);
  bulge.rotation.z = Math.PI / 2;
  bulge.position.y = 0.12;
  g.add(bulge);
  const cover = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 16), mats.steel);
  cover.rotation.z = Math.PI / 2;
  cover.position.set(0.38, 0.12, 0);
  g.add(cover);
  const sight = new THREE.Mesh(new THREE.CircleGeometry(0.04, 12), mats.glass);
  sight.position.set(0.0, 0.18, 0.28);
  g.add(sight);
  markShadows(g);
  return g;
}

export function createPump(mats, scale = 1) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.12 * scale, 16, 12), mats.machine);
  g.add(body);
  const volute = new THREE.Mesh(new THREE.TorusGeometry(0.08 * scale, 0.035 * scale, 8, 16), mats.oily);
  volute.rotation.x = Math.PI / 2;
  g.add(volute);
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * scale, 0.07 * scale, 0.18 * scale, 12), mats.steel);
  motor.position.y = 0.16 * scale;
  g.add(motor);
  const inlet = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * scale, 0.03 * scale, 0.14 * scale, 8), mats.pipe);
  inlet.rotation.z = Math.PI / 2;
  inlet.position.x = -0.16 * scale;
  g.add(inlet);
  const fan = createFan(mats, 0.055 * scale);
  fan.rotation.x = Math.PI / 2;
  fan.position.y = 0.26 * scale;
  g.add(fan);
  g.userData.fans = [fan];
  markShadows(g);
  return g;
}

export function createCompressor(mats) {
  const g = new THREE.Group();
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.55, 16), mats.machine);
  tank.rotation.z = Math.PI / 2;
  g.add(tank);
  const head = new THREE.Mesh(beveledBox(0.22, 0.2, 0.18, 0.01), mats.oily);
  head.position.set(-0.18, 0.16, 0);
  g.add(head);
  const pulley = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 14), mats.steel);
  pulley.position.set(0.28, 0.05, 0);
  g.add(pulley);
  const gauge = createGauge(mats, 'AIR', 0.7);
  gauge.position.set(0.05, 0.2, 0.12);
  g.add(gauge);
  markShadows(g);
  return g;
}

export function createCabinet(mats, w = 0.36, h = 1.15, d = 0.28) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(beveledBox(w, h, d, 0.01), mats.machine);
  body.position.y = h / 2;
  g.add(body);
  for (let i = 0; i < 3; i++) {
    const door = new THREE.Mesh(beveledBox(w * 0.42, h * 0.28, 0.02, 0.004), mats.plastic);
    door.position.set(-w * 0.2 + (i % 2) * w * 0.4, h * (0.28 + Math.floor(i / 2) * 0.32), d * 0.5);
    g.add(door);
  }
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.04), mats.emissiveGreen);
  lamp.position.set(0, h - 0.08, d * 0.52);
  g.add(lamp);
  const vent = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.08, 0.02), mats.steel);
  vent.position.set(0, 0.12, d * 0.5);
  g.add(vent);
  markShadows(g);
  return g;
}

export function createHeatExchanger(mats) {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.7, 16), mats.machine);
  shell.rotation.z = Math.PI / 2;
  g.add(shell);
  for (let i = 0; i < 7; i++) {
    const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.012, 14), mats.steel);
    fin.rotation.z = Math.PI / 2;
    fin.position.x = -0.28 + i * 0.09;
    g.add(fin);
  }
  markShadows(g);
  return g;
}

export function createTank(mats, r = 0.16, h = 0.45) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), mats.machine);
  g.add(body);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), mats.steel);
  cap.position.y = h / 2;
  g.add(cap);
  const valve = createValveAssembly(mats, 0.05);
  valve.position.y = h / 2 + 0.12;
  g.add(valve);
  markShadows(g);
  return g;
}

export function createCatwalk(mats, length = 2.4) {
  const g = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, length), mats.deck);
  deck.position.y = 0.55;
  g.add(deck);
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, length, 8), mats.steel);
  rail.rotation.x = Math.PI / 2;
  rail.position.set(0.2, 0.95, 0);
  g.add(rail);
  for (const z of [-length * 0.4, 0, length * 0.4]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.4, 6), mats.steel);
    post.position.set(0.2, 0.75, z);
    g.add(post);
  }
  const stair = new THREE.Mesh(beveledBox(0.36, 0.04, 0.18, 0.004), mats.steel);
  stair.position.set(0, 0.28, length * 0.45);
  g.add(stair);
  const stair2 = stair.clone();
  stair2.position.y = 0.14;
  stair2.position.z = length * 0.52;
  g.add(stair2);
  markShadows(g);
  return g;
}

export { cylGeo };
