import * as THREE from 'three';
import { ZONES } from './layout.js';
import { mesh, beveledBox, addCollider } from './geom.js';
import { createJunctionBox, createHandrail, createGauge } from './machinery.js';
import { valveOnPipe } from './pipes.js';
import { makeLabelTexture, makeStencil } from './textures.js';

export function buildCorridor(ctx) {
  const { mats, root, colliders, windows, animated } = ctx;
  const z0 = ZONES.corridor.z0;
  const z1 = ZONES.corridor.z1;

  for (let z = z0 + 0.35; z < z1 - 0.2; z += 0.55) {
    const panelL = mesh(beveledBox(0.04, 1.15, 0.48, 0.006), mats.hullGreen, -0.98, 1.05, z);
    const panelR = mesh(beveledBox(0.04, 1.15, 0.48, 0.006), mats.hullGreen, 0.98, 1.05, z);
    root.add(panelL, panelR);
  }

  for (let z = z0 + 0.5; z < z1; z += 1.1) {
    const box = createJunctionBox(mats, 0.16, 0.13, 0.08);
    box.position.set(0.96, 1.35, z);
    box.rotation.y = -Math.PI / 2;
    root.add(box);
    const box2 = createJunctionBox(mats, 0.12, 0.1, 0.06);
    box2.position.set(-0.96, 0.72, z + 0.3);
    box2.rotation.y = Math.PI / 2;
    root.add(box2);
  }

  const railL = createHandrail(mats, 3.6);
  railL.position.set(-0.52, 0.9, (z0 + z1) * 0.5);
  root.add(railL);
  const railR = createHandrail(mats, 3.6);
  railR.position.set(0.52, 0.9, (z0 + z1) * 0.5);
  root.add(railR);
  addCollider(colliders, -0.52, 0.9, (z0 + z1) * 0.5, 0.06, 0.12, 3.6);
  addCollider(colliders, 0.52, 0.9, (z0 + z1) * 0.5, 0.06, 0.12, 3.6);

  valveOnPipe(root, mats, 0.88, 1.15, -4.4, 0.9, -Math.PI / 2);
  valveOnPipe(root, mats, -0.88, 1.48, -3.2, 0.75, Math.PI / 2);
  const g = createGauge(mats, 71, 'AIR', 200);
  g.position.set(0.9, 1.55, -3.6);
  g.rotation.y = -Math.PI / 2;
  root.add(g);
  animated.push({ type: 'gauge', object: g.userData.needle, speed: 0.25 });

  buildPorthole(ctx, 0.99, 1.42, -4.85);

  const locker = mesh(beveledBox(0.22, 0.7, 0.38, 0.01), mats.hullGreen, -0.92, 0.4, -5.2);
  root.add(locker);
  root.add(mesh(new THREE.TorusGeometry(0.025, 0.006, 6, 10, Math.PI), mats.brushedMetal, -0.8, 0.42, -5.2, 0, Math.PI / 2, 0));
  addCollider(colliders, -0.92, 0.4, -5.2, 0.24, 0.72, 0.4);

  const extinguisher = mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.38, 12), mats.warning, 0.92, 0.55, -2.7);
  root.add(extinguisher);
  root.add(mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 10), mats.brushedMetal, 0.92, 0.78, -2.7));
  addCollider(colliders, 0.92, 0.55, -2.7, 0.12, 0.42, 0.12);

  const brace = mesh(beveledBox(1.7, 0.05, 0.06, 0.006), mats.gunmetal, 0, 2.05, -4.1);
  root.add(brace);

  const stencil = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.12),
    new THREE.MeshStandardMaterial({ map: makeStencil('MIND YOUR HEAD', '#b59a45'), transparent: true, roughness: 0.65 }),
  );
  stencil.position.set(0, 1.92, -3.4);
  stencil.rotation.x = -0.4;
  root.add(stencil);

  const warn = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.18),
    new THREE.MeshStandardMaterial({
      map: makeLabelTexture('!', { w: 128, h: 128, bg: '#b59a45', fg: '#1a1408', sub: 'HATCH' }),
      roughness: 0.5,
    }),
  );
  warn.position.set(-0.7, 1.55, -2.2);
  root.add(warn);

  for (let z = z0 + 0.25; z < z1; z += 0.9) {
    const light = mesh(beveledBox(0.16, 0.04, 0.22, 0.004), mats.lightWarm, 0, 2.12, z);
    root.add(light);
  }

  const conduit = mesh(new THREE.CylinderGeometry(0.02, 0.02, 3.8, 8), mats.plastic, 0.72, 1.82, (z0 + z1) * 0.5, Math.PI / 2, 0, 0);
  root.add(conduit);
  const conduit2 = mesh(new THREE.CylinderGeometry(0.016, 0.016, 3.8, 8), mats.pipeCopper, 0.78, 1.78, (z0 + z1) * 0.5, Math.PI / 2, 0, 0);
  root.add(conduit2);

  addCollider(colliders, -0.98, 1.05, (z0 + z1) * 0.5, 0.12, 1.4, z1 - z0);
  addCollider(colliders, 0.98, 1.05, (z0 + z1) * 0.5, 0.12, 1.4, z1 - z0);
}

function buildPorthole(ctx, x, y, z) {
  const { mats, root, windows } = ctx;
  const frame = mesh(new THREE.TorusGeometry(0.13, 0.022, 10, 20), mats.chippedPaint, x, y, z);
  frame.rotation.y = Math.PI / 2;
  const glass = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 20), mats.thickGlass, x, y, z, 0, 0, Math.PI / 2);
  const view = mesh(new THREE.CircleGeometry(0.105, 20), new THREE.MeshBasicMaterial({ color: 0x0a3040 }), x - 0.02, y, z);
  view.rotation.y = Math.PI / 2;
  const bolts = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    bolts.push(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.02, 6), mats.brushedMetal, x + 0.02, y + Math.sin(a) * 0.14, z + Math.cos(a) * 0.14, 0, 0, Math.PI / 2));
  }
  const cond = mesh(new THREE.CircleGeometry(0.108, 18), mats.condensation, x - 0.018, y, z);
  cond.rotation.y = Math.PI / 2;
  root.add(frame, glass, view, cond, ...bolts);
  windows.push({ mesh: view, kind: 'porthole' });
  ctx.portholeView = view;
}
