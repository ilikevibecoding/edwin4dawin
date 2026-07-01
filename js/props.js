import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { PropBody } from './physics.js';
import { mulberry32 } from './util.js';

// Every prop is a little group of primitives centered on its own origin, with
// a single box half-extent used by the physics solver.

const std = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts });

const MAT = {
  plate: std(0xf1ede2, { roughness: 0.3 }),
  plateRim: std(0xd8d2c2, { roughness: 0.3 }),
  cupA: std(0xd97757, { roughness: 0.5 }),
  cupB: std(0x6d8fb3, { roughness: 0.5 }),
  pizza: std(0xc9a36a, { roughness: 0.9 }),
  pizzaLabel: std(0xa33f2e, { roughness: 0.9 }),
  wrapA: std(0xdfe4ea, { roughness: 0.55, metalness: 0.35 }),
  wrapB: std(0xc8b7e6, { roughness: 0.55, metalness: 0.35 }),
  cushionA: std(0xc98046, { roughness: 1 }),
  cushionB: std(0x7d9c72, { roughness: 1 }),
  can: std(0xb8422f, { roughness: 0.35, metalness: 0.6 }),
  canTop: std(0xcfd4d8, { roughness: 0.3, metalness: 0.8 }),
  remote: std(0x26262c, { roughness: 0.6 }),
  remoteBtn: std(0x8a8f98, { roughness: 0.5 }),
  magazine: std(0xe8e3d8, { roughness: 0.85 }),
  magCover: std(0x4b79a8, { roughness: 0.85 }),
  magCover2: std(0xb85f7e, { roughness: 0.85 }),
  clothA: std(0x6f7fae, { roughness: 1 }),
  clothB: std(0xb0574a, { roughness: 1 }),
  clothC: std(0x8b9a7b, { roughness: 1 }),
  shoe: std(0x4a4640, { roughness: 0.9 }),
  shoeSole: std(0xd9d4c8, { roughness: 0.9 }),
  bookA: std(0x9c4034, { roughness: 0.85 }),
  bookB: std(0x33608c, { roughness: 0.85 }),
  bookC: std(0x497548, { roughness: 0.85 }),
  pages: std(0xf3efe2, { roughness: 0.95 }),
  towelA: std(0xa8cfd0, { roughness: 1 }),
  towelB: std(0xe2d7b8, { roughness: 1 }),
  bottleA: std(0x5aa1c9, { roughness: 0.3 }),
  bottleB: std(0xd9a0b4, { roughness: 0.3 }),
  cap: std(0xf2f2f0, { roughness: 0.4 }),
  tp: std(0xf5f2ea, { roughness: 0.95 }),
  tpCore: std(0xb99c72, { roughness: 0.95 }),
};

function mesh(geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
const box = (w, h, d, mat) => mesh(new THREE.BoxGeometry(w, h, d), mat);
const rbox = (w, h, d, r, mat) => mesh(new RoundedBoxGeometry(w, h, d, 2, r), mat);
const cyl = (rt, rb, h, mat, seg = 14) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);

// ---------------------------------------------------------------- builders
const BUILDERS = {
  plate(rng) {
    const g = new THREE.Group();
    const p = cyl(0.11, 0.085, 0.022, rng() > 0.5 ? MAT.plate : MAT.plateRim, 18);
    g.add(p);
    return { g, e: new THREE.Vector3(0.11, 0.013, 0.11), label: 'PLATE' };
  },
  cup(rng) {
    const g = new THREE.Group();
    g.add(cyl(0.042, 0.034, 0.105, rng() > 0.5 ? MAT.cupA : MAT.cupB, 14));
    const handle = box(0.016, 0.05, 0.03, MAT.plateRim);
    handle.position.set(0.052, 0, 0);
    g.add(handle);
    return { g, e: new THREE.Vector3(0.055, 0.053, 0.045), label: 'CUP' };
  },
  pizzaBox() {
    const g = new THREE.Group();
    g.add(box(0.34, 0.045, 0.34, MAT.pizza));
    const label = box(0.18, 0.004, 0.12, MAT.pizzaLabel);
    label.position.y = 0.025;
    g.add(label);
    return { g, e: new THREE.Vector3(0.17, 0.023, 0.17), label: 'PIZZA BOX' };
  },
  wrapper(rng) {
    const g = new THREE.Group();
    const m = rng() > 0.5 ? MAT.wrapA : MAT.wrapB;
    const w = box(0.11, 0.018, 0.055, m);
    w.rotation.z = (rng() - 0.5) * 0.5;
    g.add(w);
    const twistL = box(0.028, 0.012, 0.03, m);
    twistL.position.x = -0.068;
    const twistR = twistL.clone();
    twistR.position.x = 0.068;
    g.add(twistL, twistR);
    return { g, e: new THREE.Vector3(0.083, 0.014, 0.03), label: 'WRAPPER' };
  },
  cushion(rng) {
    const g = new THREE.Group();
    g.add(rbox(0.24, 0.09, 0.24, 0.035, rng() > 0.5 ? MAT.cushionA : MAT.cushionB));
    return { g, e: new THREE.Vector3(0.12, 0.045, 0.12), label: 'CUSHION' };
  },
  can(rng) {
    const g = new THREE.Group();
    g.add(cyl(0.031, 0.031, 0.115, rng() > 0.4 ? MAT.can : MAT.cupB, 12));
    const top = cyl(0.032, 0.032, 0.006, MAT.canTop, 12);
    top.position.y = 0.058;
    g.add(top);
    return { g, e: new THREE.Vector3(0.032, 0.061, 0.032), label: 'CAN' };
  },
  remote() {
    const g = new THREE.Group();
    g.add(rbox(0.05, 0.02, 0.16, 0.008, MAT.remote));
    for (let i = 0; i < 3; i++) {
      const b = box(0.012, 0.006, 0.012, MAT.remoteBtn);
      b.position.set(0, 0.012, -0.045 + i * 0.028);
      g.add(b);
    }
    return { g, e: new THREE.Vector3(0.025, 0.013, 0.08), label: 'REMOTE' };
  },
  magazine(rng) {
    const g = new THREE.Group();
    g.add(box(0.155, 0.012, 0.21, MAT.magazine));
    const cover = box(0.155, 0.004, 0.21, rng() > 0.5 ? MAT.magCover : MAT.magCover2);
    cover.position.y = 0.007;
    g.add(cover);
    const strip = box(0.11, 0.003, 0.05, MAT.pages);
    strip.position.set(0, 0.01, -0.055);
    g.add(strip);
    return { g, e: new THREE.Vector3(0.078, 0.008, 0.105), label: 'MAGAZINE' };
  },
  clothes(rng) {
    const g = new THREE.Group();
    const m = [MAT.clothA, MAT.clothB, MAT.clothC][Math.floor(rng() * 3)];
    const main = rbox(0.24, 0.05, 0.19, 0.02, m);
    g.add(main);
    const fold = rbox(0.13, 0.045, 0.1, 0.02, m);
    fold.position.set(0.05 * (rng() - 0.5), 0.035, 0.04 * (rng() - 0.5));
    fold.rotation.y = rng() * 0.8;
    g.add(fold);
    return { g, e: new THREE.Vector3(0.12, 0.045, 0.098), label: 'CLOTHES' };
  },
  shoe() {
    const g = new THREE.Group();
    const sole = rbox(0.085, 0.025, 0.22, 0.01, MAT.shoeSole);
    sole.position.y = -0.025;
    g.add(sole);
    const body = rbox(0.075, 0.05, 0.2, 0.02, MAT.shoe);
    body.position.set(0, 0.008, 0);
    g.add(body);
    const heel = rbox(0.07, 0.045, 0.07, 0.02, MAT.shoe);
    heel.position.set(0, 0.04, 0.065);
    g.add(heel);
    return { g, e: new THREE.Vector3(0.043, 0.045, 0.11), label: 'SHOE' };
  },
  book(rng) {
    const g = new THREE.Group();
    const m = [MAT.bookA, MAT.bookB, MAT.bookC][Math.floor(rng() * 3)];
    g.add(box(0.13, 0.03, 0.18, m));
    const pages = box(0.122, 0.02, 0.172, MAT.pages);
    pages.position.set(0.006, 0, 0);
    g.add(pages);
    return { g, e: new THREE.Vector3(0.065, 0.016, 0.09), label: 'BOOK' };
  },
  towel(rng) {
    const g = new THREE.Group();
    const m = rng() > 0.5 ? MAT.towelA : MAT.towelB;
    g.add(rbox(0.22, 0.055, 0.16, 0.022, m));
    const band = box(0.222, 0.012, 0.03, MAT.pages);
    band.position.set(0, 0, 0.045);
    g.add(band);
    return { g, e: new THREE.Vector3(0.11, 0.028, 0.08), label: 'TOWEL' };
  },
  bottle(rng) {
    const g = new THREE.Group();
    const m = rng() > 0.5 ? MAT.bottleA : MAT.bottleB;
    g.add(cyl(0.028, 0.028, 0.13, m, 12));
    const neck = cyl(0.014, 0.02, 0.03, m, 12);
    neck.position.y = 0.08;
    g.add(neck);
    const cap = cyl(0.015, 0.015, 0.02, MAT.cap, 12);
    cap.position.y = 0.104;
    g.add(cap);
    return { g, e: new THREE.Vector3(0.029, 0.057, 0.029), label: 'BOTTLE' };
  },
  tpRoll() {
    const g = new THREE.Group();
    g.add(cyl(0.052, 0.052, 0.1, MAT.tp, 16));
    const core = cyl(0.02, 0.02, 0.104, MAT.tpCore, 10);
    g.add(core);
    return { g, e: new THREE.Vector3(0.052, 0.052, 0.052), label: 'TP ROLL' };
  },
};

// room -> weighted spawn lists (roughly matching the brief's prop mix)
const ROOM_SPAWNS = {
  kitchen: ['plate', 'plate', 'plate', 'cup', 'cup', 'pizzaBox', 'wrapper', 'wrapper', 'wrapper'],
  living: ['cushion', 'cushion', 'can', 'can', 'can', 'remote', 'magazine', 'magazine'],
  bedroom: ['clothes', 'clothes', 'clothes', 'shoe', 'shoe', 'book', 'book', 'book'],
  bathroom: ['towel', 'towel', 'bottle', 'bottle', 'bottle', 'tpRoll', 'tpRoll'],
};

const ROOM_CENTERS = {
  kitchen: [-3, -3], living: [3, -3], bedroom: [-3, 3], bathroom: [3, 3],
};

// keep-out discs so props don't spawn inside furniture / the robot start
const KEEP_OUT = [
  { x: 0, z: 0, r: 1.15 },        // doorway hub
  { x: -2.4, z: -1.5, r: 0.85 },  // robot start
  { x: -5.5, z: -3.4, r: 1.0 },   // kitchen counter
  { x: -3.1, z: -5.6, r: 0.8 },   // stove
  { x: -5.5, z: -5.5, r: 0.8 },   // fridge
  { x: -0.85, z: -5.3, r: 0.7 },  // bin
  { x: -1.5, z: -4.55, r: 0.75 }, // kitchen table
  { x: 3.1, z: -5.4, r: 1.3 },    // couch
  { x: 3.1, z: -3.0, r: 0.85 },   // coffee table
  { x: 3.1, z: -0.45, r: 1.0 },   // tv stand
  { x: 5.7, z: -3.6, r: 0.7 },    // bookshelf
  { x: -5.1, z: 3.6, r: 1.35 },   // bed
  { x: -5.55, z: 5.1, r: 0.6 },   // nightstand
  { x: -2.2, z: 5.6, r: 1.0 },    // wardrobe
  { x: 5.0, z: 4.8, r: 1.2 },     // tub
  { x: 3.2, z: 5.5, r: 0.7 },     // bathroom sink
  { x: 4.6, z: 5.6, r: 0.65 },    // toilet
];

export function spawnProps(scene, world, seed = 20260701) {
  const rng = mulberry32(seed);
  const placed = [];

  for (const [room, list] of Object.entries(ROOM_SPAWNS)) {
    const [cx, cz] = ROOM_CENTERS[room];
    for (const kind of list) {
      const { g, e, label } = BUILDERS[kind](rng);
      let x = cx;
      let z = cz;
      for (let tries = 0; tries < 60; tries++) {
        x = cx + (rng() * 2 - 1) * 2.3;
        z = cz + (rng() * 2 - 1) * 2.3;
        let ok = true;
        for (const k of KEEP_OUT) {
          if ((x - k.x) ** 2 + (z - k.z) ** 2 < k.r * k.r) { ok = false; break; }
        }
        if (ok) {
          for (const q of placed) {
            if ((x - q.x) ** 2 + (z - q.z) ** 2 < 0.16) { ok = false; break; }
          }
        }
        if (ok) break;
      }
      placed.push({ x, z });

      g.position.set(x, e.y + 0.35 + rng() * 0.4, z);
      g.rotation.y = rng() * Math.PI * 2;
      if (rng() > 0.6) g.rotation.z = (rng() - 0.5) * 0.7;
      scene.add(g);

      const body = new PropBody(g, e, label, room);
      body.vel.set((rng() - 0.5) * 0.6, 0, (rng() - 0.5) * 0.6);
      body.angVel.set((rng() - 0.5) * 2, (rng() - 0.5) * 2, (rng() - 0.5) * 2);
      world.add(body);
    }
  }
  return world.props.length;
}
