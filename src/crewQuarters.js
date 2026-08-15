import * as THREE from 'three';
import { ZONES } from './layout.js';
import { mesh, beveledBox, addCollider } from './geom.js';
import { createHandrail, createJunctionBox } from './machinery.js';
import { makeLabelTexture } from './textures.js';

export function buildCrewQuarters(ctx) {
  const { mats, root, colliders, interactables, windows } = ctx;

  const bunks = [
    { x: -0.78, y: 0.22, z: -1.15, id: 1 },
    { x: -0.78, y: 1.12, z: -1.15, id: 2 },
    { x: -0.78, y: 0.22, z: 0.55, id: 3 },
    { x: -0.78, y: 1.12, z: 0.55, id: 4 },
  ];
  bunks.forEach((b, i) => {
    const bunk = createBunk(mats, b.id, i === 0);
    bunk.position.set(b.x, b.y, b.z);
    root.add(bunk);
    addCollider(colliders, b.x, b.y + 0.18, b.z, 0.55, 0.42, 1.15);
    if (i === 0) {
      interactables.push({
        name: 'rest',
        object: bunk.userData.hit,
        prompt: 'E: Rest',
        position: new THREE.Vector3(b.x + 0.2, b.y + 0.35, b.z),
      });
    }
  });

  for (let i = 0; i < 4; i++) {
    const locker = createLocker(mats, `L${i + 1}`);
    locker.position.set(0.88, 0, -1.4 + i * 0.42);
    root.add(locker);
    addCollider(colliders, 0.88, 0.55, -1.4 + i * 0.42, 0.28, 1.1, 0.38);
  }

  const table = createFoldTable(mats);
  table.position.set(0.62, 0.72, 1.05);
  root.add(table);
  addCollider(colliders, 0.62, 0.72, 1.05, 0.42, 0.08, 0.32);

  const bench = mesh(beveledBox(0.28, 0.08, 0.42, 0.01), mats.leather, 0.72, 0.42, 1.05);
  root.add(bench);
  root.add(mesh(beveledBox(0.24, 0.36, 0.24, 0.008), mats.gunmetal, 0.72, 0.2, 1.05));
  addCollider(colliders, 0.72, 0.3, 1.05, 0.3, 0.5, 0.42);

  buildGalley(ctx, 0.72, 1.85);
  buildWashroom(ctx, -0.55, 1.85);

  const rail = createHandrail(mats, 1.4);
  rail.position.set(0.58, 0.88, -0.35);
  root.add(rail);

  const reading = mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.04, 10), mats.lightWarm, -0.55, 1.55, -1.15);
  root.add(reading);
  const reading2 = mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.04, 10), mats.lightWarm, -0.55, 1.55, 0.55);
  root.add(reading2);

  const porthole = buildCrewPorthole(ctx, 0.99, 1.48, 0.2);
  root.add(porthole);

  const vent = mesh(beveledBox(0.28, 0.08, 0.04, 0.004), mats.gunmetal, -0.2, 2.05, 0.2);
  root.add(vent);
  for (let i = 0; i < 5; i++) {
    root.add(mesh(beveledBox(0.24, 0.008, 0.008, 0.001), mats.blackout, -0.2, 2.05, 0.22, 0, 0, 0));
  }

  const mug = mesh(new THREE.CylinderGeometry(0.028, 0.024, 0.05, 10), mats.plastic, 0.58, 0.78, 0.95);
  root.add(mug);
  const mug2 = mesh(new THREE.CylinderGeometry(0.026, 0.022, 0.045, 10), mats.bakelite, 0.7, 0.78, 1.12);
  root.add(mug2);

  windows.push({ mesh: ctx.crewPorthole, kind: 'porthole' });
}

function createBunk(mats, id, interact) {
  const g = new THREE.Group();
  g.add(mesh(beveledBox(0.52, 0.06, 1.12, 0.008), mats.gunmetal, 0, 0.08, 0));
  const mattress = mesh(beveledBox(0.5, 0.1, 1.08, 0.024), mats.pillow, 0, 0.16, 0);
  wrinkle(mattress);
  g.add(mattress);
  const blanket = mesh(beveledBox(0.48, 0.05, 0.74, 0.02), mats.blanket, 0.01, 0.22, 0.12);
  wrinkle(blanket);
  g.add(blanket);
  const fold = mesh(beveledBox(0.46, 0.03, 0.16, 0.012), mats.fabric, 0.01, 0.255, 0.42);
  g.add(fold);
  const pillow = mesh(new THREE.CapsuleGeometry(0.09, 0.16, 6, 10), mats.pillow, 0, 0.24, -0.4, 0, 0, Math.PI / 2);
  g.add(pillow);
  const strap = mesh(beveledBox(0.48, 0.012, 0.03, 0.003), mats.warning, 0, 0.22, 0.05);
  g.add(strap);
  const curtain = mesh(beveledBox(0.02, 0.42, 0.7, 0.004), mats.blanket, 0.26, 0.32, 0.05);
  g.add(curtain);
  const light = mesh(new THREE.BoxGeometry(0.04, 0.02, 0.06), mats.lightWarm, 0.18, 0.42, -0.4);
  g.add(light);
  const tag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.1, 0.04),
    new THREE.MeshStandardMaterial({ map: makeLabelTexture(`B${id}`, { w: 128, h: 64, bg: '#3a4038', fg: '#d8d0b0' }), roughness: 0.6 }),
  );
  tag.position.set(0.2, 0.08, 0.5);
  g.add(tag);
  if (interact) {
    const hit = mesh(beveledBox(0.5, 0.2, 1.1, 0.01), mats.fabric, 0, 0.18, 0);
    hit.visible = false;
    g.add(hit);
    g.userData.hit = hit;
  }
  return g;
}

function wrinkle(m) {
  const geo = m.geometry;
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, pos.getY(i) + Math.sin(x * 28 + z * 18) * 0.004 + Math.sin(z * 40) * 0.003);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

function createLocker(mats, label) {
  const g = new THREE.Group();
  g.add(mesh(beveledBox(0.26, 1.08, 0.36, 0.01), mats.hullGreen, 0, 0.56, 0));
  g.add(mesh(beveledBox(0.22, 0.48, 0.02, 0.004), mats.chippedPaint, 0, 0.78, 0.18));
  g.add(mesh(beveledBox(0.22, 0.42, 0.02, 0.004), mats.chippedPaint, 0, 0.3, 0.18));
  g.add(mesh(new THREE.TorusGeometry(0.018, 0.005, 6, 10, Math.PI), mats.brushedMetal, 0.08, 0.78, 0.2, 0, 0, 0));
  g.add(mesh(new THREE.TorusGeometry(0.018, 0.005, 6, 10, Math.PI), mats.brushedMetal, 0.08, 0.3, 0.2));
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.1, 0.04),
    new THREE.MeshStandardMaterial({ map: makeLabelTexture(label, { w: 128, h: 64, bg: '#4a4030', fg: '#e8d8a0' }), roughness: 0.55 }),
  );
  plate.position.set(0, 1.02, 0.19);
  g.add(plate);
  return g;
}

function createFoldTable(mats) {
  const g = new THREE.Group();
  g.add(mesh(beveledBox(0.52, 0.03, 0.36, 0.008), mats.chippedPaint));
  g.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 8), mats.brushedMetal, 0, -0.35, 0.14));
  g.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 8), mats.brushedMetal, 0, -0.35, -0.14));
  return g;
}

function buildGalley(ctx, x, z) {
  const { mats, root, colliders } = ctx;
  const counter = mesh(beveledBox(0.42, 0.08, 0.7, 0.01), mats.wetSteel, x, 0.86, z);
  root.add(counter);
  root.add(mesh(beveledBox(0.4, 0.78, 0.68, 0.01), mats.hullGreen, x, 0.42, z));
  const sink = mesh(beveledBox(0.22, 0.05, 0.18, 0.01), mats.brushedMetal, x - 0.02, 0.9, z - 0.12);
  root.add(sink);
  root.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 8), mats.brushedMetal, x - 0.02, 0.98, z - 0.18));
  root.add(mesh(new THREE.CylinderGeometry(0.01, 0.008, 0.08, 8), mats.brushedMetal, x - 0.02, 0.96, z - 0.12, 0.8, 0, 0));
  for (let i = 0; i < 2; i++) {
    root.add(mesh(beveledBox(0.36, 0.28, 0.02, 0.004), mats.chippedPaint, x, 0.32 + i * 0.32, z + 0.34));
    root.add(mesh(new THREE.BoxGeometry(0.04, 0.02, 0.02), mats.brushedMetal, x + 0.12, 0.32 + i * 0.32, z + 0.36));
  }
  const fridge = mesh(beveledBox(0.28, 0.55, 0.28, 0.01), mats.machineBlue, x + 0.02, 1.22, z + 0.18);
  root.add(fridge);
  root.add(mesh(new THREE.BoxGeometry(0.03, 0.08, 0.02), mats.brushedMetal, x + 0.14, 1.22, z + 0.32));
  const cup = mesh(new THREE.CylinderGeometry(0.022, 0.02, 0.04, 8), mats.plastic, x + 0.1, 0.93, z + 0.18);
  root.add(cup);
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.16, 0.05),
    new THREE.MeshStandardMaterial({ map: makeLabelTexture('GALLEY', { w: 256, h: 72, bg: '#3a3830', fg: '#d8d0b8' }), roughness: 0.55 }),
  );
  plate.position.set(x, 1.55, z + 0.2);
  root.add(plate);
  addCollider(colliders, x, 0.7, z, 0.44, 1.4, 0.72);
}

function buildWashroom(ctx, x, z) {
  const { mats, root, colliders } = ctx;
  const wall = mesh(beveledBox(0.04, 1.7, 0.7, 0.006), mats.hullGreen, x + 0.28, 0.85, z);
  root.add(wall);
  const basin = mesh(beveledBox(0.28, 0.08, 0.22, 0.012), mats.brushedMetal, x, 0.92, z);
  root.add(basin);
  root.add(mesh(beveledBox(0.3, 0.7, 0.24, 0.01), mats.hullGreen, x, 0.5, z));
  root.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 8), mats.brushedMetal, x, 1.02, z - 0.06));
  const mirror = mesh(beveledBox(0.22, 0.28, 0.012, 0.004), mats.thickGlass, x, 1.42, z - 0.08);
  root.add(mirror);
  root.add(mesh(beveledBox(0.24, 0.3, 0.02, 0.004), mats.gunmetal, x, 1.42, z - 0.1));
  const towel = mesh(beveledBox(0.16, 0.22, 0.03, 0.01), mats.fabric, x + 0.18, 1.15, z + 0.15);
  root.add(towel);
  const curtain = mesh(beveledBox(0.02, 1.4, 0.55, 0.004), mats.blanket, x + 0.26, 0.85, z + 0.05);
  root.add(curtain);
  addCollider(colliders, x, 0.7, z, 0.36, 1.4, 0.4);
  addCollider(colliders, x + 0.28, 0.85, z, 0.08, 1.7, 0.7);
}

function buildCrewPorthole(ctx, x, y, z) {
  const { mats } = ctx;
  const g = new THREE.Group();
  g.add(mesh(new THREE.TorusGeometry(0.11, 0.02, 8, 18), mats.chippedPaint, x, y, z, 0, Math.PI / 2, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.04, 18), mats.thickGlass, x, y, z, 0, 0, Math.PI / 2));
  const view = mesh(new THREE.CircleGeometry(0.09, 18), new THREE.MeshBasicMaterial({ color: 0x0a3040 }), x - 0.02, y, z);
  view.rotation.y = Math.PI / 2;
  g.add(view);
  ctx.crewPorthole = view;
  return g;
}
