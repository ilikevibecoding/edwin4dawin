import * as THREE from 'three';
import { HULL, ZONES, BULKHEADS, HATCH, hullXAtY } from './layout.js';
import { mesh, beveledBox, addCollider, instanceBolts } from './geom.js';
import { buildOverheadPipeBank } from './pipes.js';
import { createCableTray, createJunctionBox, createFan } from './machinery.js';
import { makeStencil, makeLabelTexture } from './textures.js';
import { buildControlRoom } from './controlRoom.js';
import { buildCorridor } from './corridor.js';
import { buildCrewQuarters } from './crewQuarters.js';
import { buildEngineRoom } from './engineRoom.js';

export function buildSubmarine(ctx) {
  const root = new THREE.Group();
  root.name = 'submarine';
  ctx.root = root;
  ctx.animated = ctx.animated || [];
  ctx.colliders = ctx.colliders || [];
  ctx.interactables = ctx.interactables || [];
  ctx.windows = ctx.windows || [];

  buildHull(ctx);
  buildDeck(ctx);
  buildRibs(ctx);
  buildBulkheads(ctx);
  buildSharedUtilities(ctx);

  buildControlRoom(ctx);
  buildCorridor(ctx);
  buildCrewQuarters(ctx);
  buildEngineRoom(ctx);

  addRouteColliders(ctx);
  return root;
}

function buildHull(ctx) {
  const { mats, root, colliders } = ctx;
  const zMid = (ZONES.control.z0 + ZONES.engine.z1) * 0.5;
  const length = ZONES.engine.z1 - ZONES.control.z0;

  const shell = new THREE.CylinderGeometry(HULL.radius, HULL.radius, length, 56, 1, true);
  shell.rotateX(Math.PI / 2);
  shell.scale(-1, 1, 1);
  shell.computeVertexNormals();
  const hull = mesh(shell, mats.hullPaint, 0, HULL.centerY, zMid);
  hull.receiveShadow = true;
  hull.castShadow = false;
  root.add(hull);

  const liner = new THREE.CylinderGeometry(HULL.radius - 0.045, HULL.radius - 0.045, length, 48, 1, true);
  liner.rotateX(Math.PI / 2);
  liner.scale(-1, 1, 1);
  liner.computeVertexNormals();
  const inner = mesh(liner, mats.hullGreen, 0, HULL.centerY, zMid);
  inner.castShadow = false;
  root.add(inner);

  const fwdDome = new THREE.SphereGeometry(HULL.radius, 40, 18, 0, Math.PI * 2, 0, Math.PI * 0.52);
  fwdDome.scale(-1, 1, 1);
  fwdDome.computeVertexNormals();
  const dome = mesh(fwdDome, mats.hullPaint, 0, HULL.centerY, ZONES.control.z0 + 0.05);
  dome.rotation.x = Math.PI / 2;
  root.add(dome);

  const aftCap = mesh(beveledBox(HULL.radius * 1.7, HULL.radius * 1.7, 0.12, 0.02), mats.hullPaint, 0, HULL.centerY, ZONES.engine.z1 + 0.04);
  root.add(aftCap);

  addCollider(colliders, 0, -0.4, zMid, 4, 0.8, length + 1);
  addCollider(colliders, 0, 2.55, zMid, 4, 0.5, length + 1);
  addCollider(colliders, -1.28, 1.1, zMid, 0.28, 2.4, length);
  addCollider(colliders, 1.28, 1.1, zMid, 0.28, 2.4, length);
  addCollider(colliders, 0, 1.1, ZONES.control.z0 - 0.25, 3, 2.4, 0.4);
  addCollider(colliders, 0, 1.1, ZONES.engine.z1 + 0.2, 3, 2.4, 0.35);
}

function buildDeck(ctx) {
  const { mats, root } = ctx;
  const z0 = ZONES.control.z0;
  const z1 = ZONES.engine.z1;
  const length = z1 - z0;
  const zMid = (z0 + z1) * 0.5;

  const deck = mesh(beveledBox(2.15, HULL.deckThickness, length, 0.004), mats.deckCoat, 0, -HULL.deckThickness * 0.5, zMid);
  root.add(deck);

  const under = mesh(new THREE.BoxGeometry(2.0, 0.35, length), mats.blackout, 0, -0.28, zMid);
  under.castShadow = false;
  root.add(under);

  for (let z = z0 + 0.4; z < z1 - 0.3; z += 1.15) {
    if (isHatchZ(z)) continue;
    addGrate(ctx, 0, z, 0.72, 0.85);
  }

  const kickL = mesh(beveledBox(0.04, 0.08, length, 0.004), mats.chippedPaint, -0.98, 0.03, zMid);
  const kickR = mesh(beveledBox(0.04, 0.08, length, 0.004), mats.chippedPaint, 0.98, 0.03, zMid);
  root.add(kickL, kickR);

  for (let z = z0 + 0.6; z < z1; z += 2.2) {
    const drain = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 10), mats.brushedMetal, 0.72, 0.002, z);
    root.add(drain);
  }
}

function addGrate(ctx, x, z, w, d) {
  const { mats, root } = ctx;
  const frame = mesh(beveledBox(w + 0.04, 0.02, d + 0.04, 0.003), mats.gunmetal, x, 0.006, z);
  root.add(frame);
  const pit = mesh(new THREE.BoxGeometry(w, 0.28, d), mats.blackout, x, -0.16, z);
  pit.castShadow = false;
  root.add(pit);
  const underPipe = mesh(new THREE.CylinderGeometry(0.025, 0.025, d * 0.9, 8), mats.pipeCopper, x + 0.12, -0.14, z, Math.PI / 2, 0, 0);
  root.add(underPipe);
  const bars = 7;
  for (let i = 0; i < bars; i++) {
    const bz = -d * 0.45 + (i / (bars - 1)) * d * 0.9;
    root.add(mesh(beveledBox(w * 0.92, 0.012, 0.018, 0.002), mats.grate, x, 0.01, z + bz));
  }
  for (let i = 0; i < 3; i++) {
    const bx = -w * 0.3 + i * w * 0.3;
    root.add(mesh(beveledBox(0.016, 0.012, d * 0.92, 0.002), mats.grate, x + bx, 0.012, z));
  }
}

function isHatchZ(z) {
  return BULKHEADS.some((b) => Math.abs(z - b) < 0.45);
}

function buildRibs(ctx) {
  const { mats, root } = ctx;
  const z0 = ZONES.control.z0 + 0.35;
  const z1 = ZONES.engine.z1 - 0.2;
  let i = 0;
  for (let z = z0; z < z1; z += 0.68) {
    if (isHatchZ(z)) continue;
    const ring = mesh(
      new THREE.TorusGeometry(HULL.radius - 0.07, 0.028, 10, 48, Math.PI * 1.35),
      mats.chippedPaint,
      0,
      HULL.centerY,
      z,
    );
    ring.rotation.y = Math.PI / 2;
    ring.rotation.z = Math.PI * 0.325;
    root.add(ring);

    const flange = mesh(
      new THREE.TorusGeometry(HULL.radius - 0.11, 0.01, 6, 40, Math.PI * 1.2),
      mats.gunmetal,
      0,
      HULL.centerY,
      z + 0.03,
    );
    flange.rotation.y = Math.PI / 2;
    flange.rotation.z = Math.PI * 0.4;
    root.add(flange);

    if (i % 2 === 0) {
      const bolts = [];
      for (let k = 0; k < 10; k++) {
        const a = 0.45 + (k / 9) * 2.2;
        bolts.push({
          x: Math.cos(a) * (HULL.radius - 0.09),
          y: HULL.centerY + Math.sin(a) * (HULL.radius - 0.09),
          z,
          rx: 0,
          ry: 0,
          rz: a,
          s: 0.85,
        });
      }
      root.add(instanceBolts(bolts, mats.brushedMetal, 0.01, 0.014));
    }
    i++;
  }
}

function buildBulkheads(ctx) {
  const { mats, root, colliders } = ctx;
  BULKHEADS.forEach((z, idx) => {
    const frame = mesh(new THREE.TorusGeometry(0.62, 0.055, 12, 36), mats.chippedPaint, 0, 0.86, z);
    frame.rotation.y = Math.PI / 2;
    root.add(frame);

    const ringInner = mesh(new THREE.TorusGeometry(0.54, 0.018, 8, 28), mats.gunmetal, 0, 0.86, z);
    ringInner.rotation.y = Math.PI / 2;
    root.add(ringInner);

    const plateL = mesh(beveledBox(0.55, 2.05, 0.07, 0.01), mats.hullGreen, -0.72, 1.02, z);
    const plateR = mesh(beveledBox(0.55, 2.05, 0.07, 0.01), mats.hullGreen, 0.72, 1.02, z);
    const plateTop = mesh(beveledBox(0.9, 0.38, 0.07, 0.01), mats.hullGreen, 0, 1.95, z);
    const plateBot = mesh(beveledBox(0.9, 0.12, 0.07, 0.01), mats.hullGreen, 0, 0.04, z);
    root.add(plateL, plateR, plateTop, plateBot);

    const hatch = createHatch(mats, idx);
    hatch.position.set(0, 0.86, z);
    root.add(hatch);

    addCollider(colliders, -0.78, 1.05, z, 0.62, 2.1, 0.14);
    addCollider(colliders, 0.78, 1.05, z, 0.62, 2.1, 0.14);
    addCollider(colliders, 0, 2.02, z, 0.95, 0.42, 0.14);
    addCollider(colliders, 0, 0.04, z, 0.95, 0.1, 0.14);

    const stencil = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 0.1),
      new THREE.MeshStandardMaterial({
        map: makeStencil(zoneNameForBulkhead(idx), '#c4b06a'),
        transparent: true,
        roughness: 0.7,
        metalness: 0,
      }),
    );
    stencil.position.set(0.55, 1.72, z + 0.045);
    root.add(stencil);
  });
}

function zoneNameForBulkhead(idx) {
  return ['CTRL', 'CREW', 'ELEC', 'MACH'][idx] || 'DSV';
}

function createHatch(mats, idx) {
  const g = new THREE.Group();
  const door = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.045, 28), mats.chippedPaint, 0.52, 0, 0.02, 0, 0, Math.PI / 2);
  door.rotation.y = 0.15;
  const wheel = mesh(new THREE.TorusGeometry(0.11, 0.016, 8, 16), mats.warning, 0.18, 0.02, 0.06);
  const hub = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10), mats.brushedMetal, 0.18, 0.02, 0.06, Math.PI / 2, 0, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI;
    g.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 6), mats.brushedMetal, 0.18, 0.02, 0.06, 0, 0, a));
  }
  const hinge = mesh(beveledBox(0.06, 0.7, 0.05, 0.006), mats.gunmetal, 0.5, 0, 0);
  const dogs = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    dogs.push(mesh(beveledBox(0.05, 0.02, 0.03, 0.003), mats.brushedMetal, Math.cos(a) * 0.48, Math.sin(a) * 0.48, 0.03));
  }
  g.add(door, wheel, hub, hinge, ...dogs);
  g.userData.open = true;
  return g;
}

function buildSharedUtilities(ctx) {
  const { mats, root } = ctx;
  buildOverheadPipeBank(root, mats, ZONES.control.z0 + 0.4, ZONES.engine.z1 - 0.3, 0.58, 2.0);

  const tray1 = createCableTray(mats, 8.2, 0.15);
  tray1.position.set(-0.42, 2.08, -2.2);
  root.add(tray1);
  const tray2 = createCableTray(mats, 6.4, 0.13);
  tray2.position.set(0.38, 2.1, 4.2);
  root.add(tray2);

  for (let z = -9.2; z < 10.5; z += 2.4) {
    const box = createJunctionBox(mats, 0.14, 0.11, 0.07);
    box.position.set(-0.92, 1.55, z);
    box.rotation.y = Math.PI / 2;
    root.add(box);
    const fan = createFan(mats, 0.07);
    fan.position.set(0.9, 1.95, z + 0.7);
    fan.rotation.x = Math.PI / 2;
    root.add(fan);
    ctx.animated.push({ type: 'fan', object: fan.userData.spin, speed: 4.2 + (z % 3) * 0.3 });
  }

  const labels = [
    { t: 'FWD CONTROL', z: -8.8, x: -0.7 },
    { t: 'KEEP CLEAR', z: -4.1, x: 0.7 },
    { t: 'BERTHING', z: 0.1, x: -0.7 },
    { t: 'MACHINERY', z: 7.4, x: 0.7 },
  ];
  labels.forEach((l) => {
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.08),
      new THREE.MeshStandardMaterial({
        map: makeLabelTexture(l.t, { w: 320, h: 90, bg: '#5a4a20', fg: '#f0e0a8' }),
        roughness: 0.55,
      }),
    );
    p.position.set(l.x, 1.62, l.z);
    p.rotation.y = l.x > 0 ? -Math.PI / 2 : Math.PI / 2;
    root.add(p);
  });
}

function addRouteColliders(ctx) {
  const { colliders } = ctx;
  const zMid = (ZONES.control.z0 + ZONES.engine.z1) * 0.5;
  const length = ZONES.engine.z1 - ZONES.control.z0;
  addCollider(colliders, -1.12, 1.1, zMid, 0.16, 2.2, length);
  addCollider(colliders, 1.12, 1.1, zMid, 0.16, 2.2, length);
}

export function getWalkableHalfWidth(z) {
  if (z < ZONES.corridor.z1 && z > ZONES.corridor.z0) return 0.52;
  if (z > ZONES.engine.z0) return 0.48;
  return 0.7;
}

export { hullXAtY, HATCH };
