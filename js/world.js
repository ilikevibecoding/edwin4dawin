import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { grassTexture, roadTexture, sidewalkTexture, skyTexture, mulberry32 } from './util.js';

// Everything outside the house: skydome, lawn, street with moving traffic,
// neighbor houses, trees, clouds. Pure set dressing — no colliders needed,
// the player can never leave the house.

const rng = mulberry32(424242);

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}
const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
const rbox = (w, h, d, r, mat) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, r), mat);

const M = {
  trunk: new THREE.MeshStandardMaterial({ color: 0x6e5138, roughness: 0.95 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x5d8a4a, roughness: 0.9 }),
  leafDark: new THREE.MeshStandardMaterial({ color: 0x4a7440, roughness: 0.9 }),
  leafYellow: new THREE.MeshStandardMaterial({ color: 0x8fa24e, roughness: 0.9 }),
  pine: new THREE.MeshStandardMaterial({ color: 0x3f6b4a, roughness: 0.9 }),
  bush: new THREE.MeshStandardMaterial({ color: 0x567f45, roughness: 0.95 }),
  fence: new THREE.MeshStandardMaterial({ color: 0xcfc4ac, roughness: 0.9 }),
  pole: new THREE.MeshStandardMaterial({ color: 0x555a5e, roughness: 0.6, metalness: 0.4 }),
  cloud: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xdfe9f2, emissiveIntensity: 0.35, fog: false }),
  glassDay: new THREE.MeshStandardMaterial({ color: 0x9fc4d8, roughness: 0.15, metalness: 0.6 }),
  doorA: new THREE.MeshStandardMaterial({ color: 0x77474a, roughness: 0.7 }),
  tire: new THREE.MeshStandardMaterial({ color: 0x1d1f21, roughness: 0.9 }),
  hub: new THREE.MeshStandardMaterial({ color: 0xc9ccd0, roughness: 0.3, metalness: 0.8 }),
  headlight: new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff2c0, emissiveIntensity: 1.4 }),
  taillight: new THREE.MeshStandardMaterial({ color: 0xd83a2c, emissive: 0xb42718, emissiveIntensity: 1.2 }),
  windowCar: new THREE.MeshStandardMaterial({ color: 0x2c3b46, roughness: 0.12, metalness: 0.7 }),
  mailbox: new THREE.MeshStandardMaterial({ color: 0x3c5a75, roughness: 0.5, metalness: 0.3 }),
};

// ------------------------------------------------------------- neighbor house
function neighborHouse(bodyColor, roofColor, w, d, h) {
  const g = new THREE.Group();
  const wallM = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.9 });
  const roofM = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.85 });
  const body = box(w, h, d, wallM);
  body.position.y = h / 2;
  body.castShadow = true;
  g.add(body);
  // hip roof: 4-sided cone rotated to align with the walls
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), roofM);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(w * 0.78, h * 0.6, d * 0.78);
  roof.position.y = h + h * 0.3;
  roof.castShadow = true;
  g.add(roof);
  // eaves board
  const eave = box(w * 1.08, 0.12, d * 1.08, roofM);
  eave.position.y = h + 0.02;
  g.add(eave);
  // door + windows on the front face (+z)
  const door = box(0.5, 1.0, 0.05, M.doorA);
  door.position.set(-w * 0.22, 0.5, d / 2 + 0.03);
  g.add(door);
  for (const wx of [w * 0.12, w * 0.32]) {
    const win = box(0.55, 0.5, 0.05, M.glassDay);
    win.position.set(wx, h * 0.55, d / 2 + 0.03);
    g.add(win);
    const winFrame = box(0.63, 0.58, 0.04, M.fence);
    winFrame.position.set(wx, h * 0.55, d / 2 + 0.02);
    g.add(winFrame);
  }
  const win2 = box(0.55, 0.5, 0.05, M.glassDay);
  win2.position.set(-w * 0.22, h * 0.62, d / 2 + 0.03);
  g.add(win2);
  // chimney
  if (rng() > 0.4) {
    const ch = box(0.3, h * 0.7, 0.3, roofM);
    ch.position.set(w * 0.3, h + h * 0.32, -d * 0.15);
    g.add(ch);
  }
  return g;
}

// ------------------------------------------------------------- trees & bushes
function roundTree(scale = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * scale, 0.14 * scale, 1.1 * scale, 8), M.trunk);
  trunk.position.y = 0.55 * scale;
  trunk.castShadow = true;
  g.add(trunk);
  const mats = [M.leaf, M.leafDark, M.leafYellow];
  const blobs = [
    [0, 1.45, 0, 0.62], [0.4, 1.2, 0.1, 0.42], [-0.38, 1.25, -0.08, 0.45], [0.05, 1.1, 0.4, 0.4],
  ];
  for (let i = 0; i < blobs.length; i++) {
    const [x, y, z, r] = blobs[i];
    const b = new THREE.Mesh(new THREE.SphereGeometry(r * scale, 10, 8), mats[i % mats.length]);
    b.position.set(x * scale, y * scale, z * scale);
    b.castShadow = true;
    g.add(b);
  }
  return g;
}

function pineTree(scale = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * scale, 0.11 * scale, 0.7 * scale, 8), M.trunk);
  trunk.position.y = 0.35 * scale;
  g.add(trunk);
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry((0.62 - i * 0.15) * scale, 0.8 * scale, 9), M.pine);
    c.position.y = (0.85 + i * 0.5) * scale;
    c.castShadow = true;
    g.add(c);
  }
  return g;
}

function bush(scale = 1) {
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.32 * scale, 9, 7), M.bush);
  b.scale.y = 0.72;
  b.position.y = 0.2 * scale;
  b.castShadow = true;
  return b;
}

// ------------------------------------------------------------- cars
const CAR_COLORS = [0xc0392b, 0x2f6f9f, 0xd9a13b, 0x5d8a56, 0xe8e5de, 0x424b52];

function makeCar(color) {
  const g = new THREE.Group();
  const bodyM = new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.5 });
  const len = 3.6 + rng() * 0.5;
  const body = rbox(len, 0.52, 1.62, 0.12, bodyM);
  body.position.y = 0.52;
  body.castShadow = true;
  g.add(body);
  const cabin = rbox(len * 0.52, 0.5, 1.44, 0.14, bodyM);
  cabin.position.set(-len * 0.06, 0.95, 0);
  cabin.castShadow = true;
  g.add(cabin);
  // glass band
  const glass = rbox(len * 0.52 - 0.1, 0.32, 1.48, 0.1, M.windowCar);
  glass.position.set(-len * 0.06, 0.98, 0);
  g.add(glass);
  // wheels — cylinders lying on their sides
  const wheels = [];
  for (const [wx, wz] of [[len * 0.32, 0.72], [len * 0.32, -0.72], [-len * 0.32, 0.72], [-len * 0.32, -0.72]]) {
    const wg = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.22, 14), M.tire);
    tire.rotation.x = Math.PI / 2;
    const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.24, 10), M.hub);
    hubCap.rotation.x = Math.PI / 2;
    wg.add(tire, hubCap);
    wg.position.set(wx, 0.3, wz);
    g.add(wg);
    wheels.push(wg);
  }
  // lights: front +x
  for (const s of [-1, 1]) {
    const hl = box(0.1, 0.12, 0.3, M.headlight);
    hl.position.set(len / 2 - 0.02, 0.56, s * 0.5);
    g.add(hl);
    const tl = box(0.08, 0.12, 0.34, M.taillight);
    tl.position.set(-len / 2 + 0.02, 0.58, s * 0.5);
    g.add(tl);
  }
  return { group: g, wheels, len };
}

// ============================================================ build
export function buildOutside(scene) {
  const g = new THREE.Group();
  scene.add(g);

  // ---- skydome ----
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(110, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false }),
  );
  sky.position.y = -6;
  g.add(sky);

  // ---- ground ----
  const grass = grassTexture();
  grass.repeat.set(34, 34);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220),
    new THREE.MeshStandardMaterial({ map: grass, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.03;
  ground.receiveShadow = true;
  g.add(ground);

  // ---- street along the north side (z negative) ----
  const roadT = roadTexture();
  roadT.repeat.set(16, 1);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(160, 6.4),
    new THREE.MeshStandardMaterial({ map: roadT, roughness: 0.95 }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, -0.01, -11.6);
  road.receiveShadow = true;
  g.add(road);

  const sideT = sidewalkTexture();
  sideT.repeat.set(52, 1);
  for (const z of [-7.9, -15.3]) {
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(160, 1.5),
      new THREE.MeshStandardMaterial({ map: sideT, roughness: 1 }));
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(0, 0.0, z);
    walk.receiveShadow = true;
    g.add(walk);
  }

  // ---- neighbor houses across the street ----
  const palette = [
    [0xd8b46a, 0x7e5a44], [0xa8bcc4, 0x54616b], [0xc98f7a, 0x74504a],
    [0xb9c49a, 0x6b7050], [0xd9cfc0, 0x8a7060],
  ];
  const northX = [-16, -8, 0, 8, 16];
  northX.forEach((x, i) => {
    const [bc, rc] = palette[i % palette.length];
    const house = neighborHouse(bc, rc, 4.2 + rng() * 1.4, 3.6 + rng(), 2.5 + rng() * 0.7);
    house.position.set(x + (rng() - 0.5), 0, -20 - rng() * 2.5);
    house.rotation.y = (rng() - 0.5) * 0.12;
    g.add(house);
  });
  // flanking houses east/west of the player's house
  const east = neighborHouse(0xc4a8b8, 0x6b5560, 4.4, 5.2, 2.8);
  east.position.set(15, 0, -1);
  east.rotation.y = -Math.PI / 2 * 0.92;
  g.add(east);
  const west = neighborHouse(0x9fb8a8, 0x51665a, 4.6, 5.0, 2.6);
  west.position.set(-15.5, 0, 2);
  west.rotation.y = Math.PI / 2 * 1.05;
  g.add(west);
  // houses behind the back yard (south)
  for (const x of [-10, 1, 11]) {
    const [bc, rc] = palette[Math.floor(rng() * palette.length)];
    const house = neighborHouse(bc, rc, 4 + rng() * 1.6, 3.8, 2.4 + rng() * 0.8);
    house.position.set(x + (rng() - 0.5) * 2, 0, 19 + rng() * 3);
    house.rotation.y = Math.PI + (rng() - 0.5) * 0.15;
    g.add(house);
  }

  // ---- trees, bushes, yard dressing ----
  const treeSpots = [
    [-10.5, -8.9, 'r'], [12.5, -9.1, 'r'], [4.5, -17.6, 'p'], [-4.8, -17.9, 'r'],
    [-13, -17.5, 'p'], [16.5, -17, 'r'], [-9.5, 9.5, 'r'], [9.5, 10.5, 'p'],
    [-16, 8.5, 'p'], [15.5, 7, 'r'], [-2.5, 13.5, 'r'], [5.5, 14.5, 'r'],
    [-18.5, -3, 'r'], [19, 2.5, 'p'], [-9.8, -4.4, 'r'], [-9.2, 3.8, 'p'],
    [9.8, 3.4, 'r'],
  ];
  for (const [x, z, kind] of treeSpots) {
    const t = kind === 'p' ? pineTree(1.3 + rng() * 0.8) : roundTree(1.25 + rng() * 0.7);
    t.position.set(x, 0, z);
    t.rotation.y = rng() * Math.PI * 2;
    g.add(t);
  }
  // bushes hugging the player's house
  const bushSpots = [
    [-4.8, -6.85], [-1.6, -6.85], [2.2, -6.85], [5.2, -6.85],
    [-6.9, -4.4], [-6.9, 1.6], [6.9, -1.8], [6.9, 4.2],
    [-4.2, 6.9], [0.8, 6.9], [4.8, 6.9],
  ];
  for (const [x, z] of bushSpots) {
    const b = bush(1 + rng() * 0.7);
    b.position.set(x, 0.02, z);
    g.add(b);
  }

  // ---- back yard fence ----
  const fenceY = 0.5;
  for (const seg of [
    { x0: -13, x1: 13, z: 13, axis: 'x' },
    { z0: 6.5, z1: 13, x: -13, axis: 'z' }, { z0: 6.5, z1: 13, x: 13, axis: 'z' },
  ]) {
    if (seg.axis === 'x') {
      for (const ry of [0.28, 0.72]) {
        const rail = box(seg.x1 - seg.x0, 0.09, 0.05, M.fence);
        rail.position.set((seg.x0 + seg.x1) / 2, fenceY * 2 * ry, seg.z);
        g.add(rail);
      }
      for (let x = seg.x0; x <= seg.x1; x += 2) {
        const post = box(0.12, 1.1, 0.12, M.fence);
        post.position.set(x, 0.55, seg.z);
        g.add(post);
      }
    } else {
      for (const ry of [0.28, 0.72]) {
        const rail = box(0.05, 0.09, seg.z1 - seg.z0, M.fence);
        rail.position.set(seg.x, fenceY * 2 * ry, (seg.z0 + seg.z1) / 2);
        g.add(rail);
      }
      for (let z = seg.z0; z <= seg.z1; z += 2) {
        const post = box(0.12, 1.1, 0.12, M.fence);
        post.position.set(seg.x, 0.55, z);
        g.add(post);
      }
    }
  }

  // ---- street furniture ----
  for (const x of [-7, 7]) {
    const lamp = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.4, 8), M.pole);
    pole.position.y = 1.7;
    const armC = box(0.9, 0.07, 0.07, M.pole);
    armC.position.set(0.4, 3.35, 0);
    const headC = box(0.5, 0.12, 0.2, M.pole);
    headC.position.set(0.8, 3.3, 0);
    const lens = box(0.4, 0.03, 0.14, M.headlight);
    lens.position.set(0.8, 3.23, 0);
    lamp.add(pole, armC, headC, lens);
    lamp.position.set(x, 0, -8.2);
    lamp.rotation.y = Math.PI / 2; // arm hangs over the road
    g.add(lamp);
  }
  const mb = new THREE.Group();
  const mpost = box(0.07, 1.0, 0.07, M.trunk);
  mpost.position.y = 0.5;
  const mboxx = rbox(0.5, 0.24, 0.24, 0.06, M.mailbox);
  mboxx.position.y = 1.06;
  mb.add(mpost, mboxx);
  mb.position.set(1.8, 0, -7.3);
  g.add(mb);

  // ---- clouds ----
  const clouds = [];
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Group();
    const n = 3 + Math.floor(rng() * 2);
    for (let k = 0; k < n; k++) {
      const s = 2.2 + rng() * 2.6;
      const puff = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), M.cloud);
      puff.scale.y = 0.45;
      puff.position.set(k * s * 1.1 - n * s * 0.4, (rng() - 0.5) * 0.8, (rng() - 0.5) * 2.5);
      c.add(puff);
    }
    c.position.set(-60 + rng() * 120, 26 + rng() * 9, -55 + rng() * 95);
    clouds.push(c);
    g.add(c);
  }

  // ---- traffic ----
  const cars = [];
  const lanes = [
    { z: -10.2, dir: 1 },  // east-bound
    { z: -13.0, dir: -1 }, // west-bound
  ];
  for (let i = 0; i < 6; i++) {
    const lane = lanes[i % 2];
    const car = makeCar(CAR_COLORS[i % CAR_COLORS.length]);
    car.dir = lane.dir;
    car.speed = 4.2 + rng() * 3.2;
    car.group.position.set(-40 + (i * 79) % 80 + rng() * 8, 0, lane.z);
    car.group.rotation.y = lane.dir > 0 ? 0 : Math.PI;
    g.add(car.group);
    cars.push(car);
  }
  // one parked car by the curb
  const parked = makeCar(0x8a93a8);
  parked.group.position.set(-6.5, 0, -9.1);
  g.add(parked.group);

  return {
    group: g,
    cars,
    update(dt) {
      for (const car of cars) {
        const p = car.group.position;
        p.x += car.dir * car.speed * dt;
        if (car.dir > 0 && p.x > 48) p.x = -48;
        if (car.dir < 0 && p.x < -48) p.x = 48;
        const spin = (car.speed / 0.3) * dt;
        for (const w of car.wheels) w.rotation.z -= spin;
      }
      for (const c of clouds) {
        c.position.x += dt * 0.55;
        if (c.position.x > 70) c.position.x = -70;
      }
    },
  };
}
