import * as THREE from 'three';
import { ZONES } from './layout.js';
import { mesh, beveledBox, addCollider } from './geom.js';
import {
  createMotor,
  createGearbox,
  createPump,
  createCompressor,
  createCabinet,
  createTank,
  createFan,
  createHeatExchanger,
  createToolCabinet,
  createGauge,
  createHandrail,
} from './machinery.js';
import { valveOnPipe, tubeAlong, runPipe } from './pipes.js';
import { makeLabelTexture, makeDisplay } from './textures.js';

export function buildEngineRoom(ctx) {
  const { mats, root, colliders, interactables, animated } = ctx;

  buildElectricalPassage(ctx);

  const motor = createMotor(mats);
  motor.position.set(0.12, 0.68, 9.15);
  motor.rotation.y = Math.PI / 2;
  motor.scale.setScalar(1.18);
  root.add(motor);
  addCollider(colliders, 0.12, 0.68, 9.15, 0.82, 1.25, 1.28);
  animated.push({ type: 'vibrate', object: motor, amp: 0.0012 });
  ctx.motor = motor;

  const gear = createGearbox(mats);
  gear.position.set(0.15, 0.55, 8.35);
  root.add(gear);
  addCollider(colliders, 0.15, 0.5, 8.35, 0.6, 0.7, 0.55);

  const shaft = mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 14), mats.brushedMetal, 0.15, 0.58, 10.15, Math.PI / 2, 0, 0);
  root.add(shaft);
  const gland = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.14, 14), mats.oilyMachine, 0.15, 0.58, 10.65, Math.PI / 2, 0, 0);
  root.add(gland);

  const pumpA = createPump(mats, 1.05);
  pumpA.position.set(-0.72, 0.42, 7.15);
  root.add(pumpA);
  addCollider(colliders, -0.72, 0.4, 7.15, 0.4, 0.7, 0.4);
  animated.push({ type: 'fan', object: pumpA.userData.spin, speed: 6 });
  ctx.pumps = [pumpA];

  const pumpB = createPump(mats, 0.9);
  pumpB.position.set(-0.72, 0.4, 8.05);
  root.add(pumpB);
  addCollider(colliders, -0.72, 0.38, 8.05, 0.38, 0.65, 0.36);
  animated.push({ type: 'fan', object: pumpB.userData.spin, speed: 5.2 });
  ctx.pumps.push(pumpB);

  const comp = createCompressor(mats);
  comp.position.set(0.78, 0.2, 6.55);
  comp.rotation.y = -0.4;
  root.add(comp);
  addCollider(colliders, 0.78, 0.35, 6.55, 0.5, 0.7, 0.4);
  animated.push({ type: 'fan', object: comp.userData.spin, speed: 8 });
  ctx.compressor = comp;

  const cab1 = createCabinet(mats, 0.4, 1.2, 0.28, 'BUS A');
  cab1.position.set(0.85, 0, 7.45);
  root.add(cab1);
  addCollider(colliders, 0.85, 0.6, 7.45, 0.42, 1.22, 0.3);

  const cab2 = createCabinet(mats, 0.4, 1.2, 0.28, 'BUS B');
  cab2.position.set(0.85, 0, 8.0);
  root.add(cab2);
  addCollider(colliders, 0.85, 0.6, 8.0, 0.42, 1.22, 0.3);

  const batt = createCabinet(mats, 0.46, 0.85, 0.36, 'BATT');
  batt.position.set(-0.78, 0, 9.15);
  root.add(batt);
  addCollider(colliders, -0.78, 0.42, 9.15, 0.48, 0.88, 0.38);

  const tank = createTank(mats, 0.14, 0.4);
  tank.position.set(-0.85, 0.02, 6.45);
  root.add(tank);
  addCollider(colliders, -0.85, 0.3, 6.45, 0.3, 0.6, 0.3);

  const hx = createHeatExchanger(mats);
  hx.position.set(0.72, 0.15, 8.75);
  root.add(hx);
  addCollider(colliders, 0.72, 0.35, 8.75, 0.28, 0.5, 0.24);

  const tools = createToolCabinet(mats);
  tools.position.set(-0.85, 0, 5.65);
  root.add(tools);
  addCollider(colliders, -0.85, 0.48, 5.65, 0.38, 0.98, 0.26);

  const fan1 = createFan(mats, 0.1);
  fan1.position.set(0.0, 1.95, 8.6);
  fan1.rotation.x = Math.PI / 2;
  root.add(fan1);
  animated.push({ type: 'fan', object: fan1.userData.spin, speed: 7, silentStop: true });
  ctx.fans = [fan1];

  const fan2 = createFan(mats, 0.08);
  fan2.position.set(-0.55, 1.88, 6.9);
  fan2.rotation.x = Math.PI / 2;
  root.add(fan2);
  animated.push({ type: 'fan', object: fan2.userData.spin, speed: 5.5, silentStop: true });
  ctx.fans.push(fan2);

  for (let i = 0; i < 4; i++) {
    const v = valveOnPipe(root, mats, -0.55 + (i % 2) * 0.25, 1.15 + Math.floor(i / 2) * 0.28, 6.2 + i * 0.15, 0.85, i * 0.4);
    ctx.valves = ctx.valves || [];
    ctx.valves.push(v);
  }
  valveOnPipe(root, mats, 0.55, 1.35, 9.8, 1.0, Math.PI / 2);
  valveOnPipe(root, mats, -0.4, 0.85, 10.4, 0.95, 0);

  ['OIL', 'HYD', 'SEA', 'AIR'].forEach((label, i) => {
    const g = createGauge(mats, 80 + i, label, [80, 250, 40, 180][i]);
    g.position.set(-0.35 + i * 0.18, 1.62, 7.55);
    root.add(g);
    animated.push({ type: 'gauge', object: g.userData.needle, speed: 0.3 + i * 0.1 });
  });

  tubeAlong(root, mats, [
    [-0.72, 0.55, 7.15],
    [-0.4, 0.7, 7.4],
    [-0.2, 0.75, 8.2],
    [0.0, 0.7, 8.9],
    [0.15, 0.55, 9.2],
  ], 0.028, mats.pipe);
  tubeAlong(root, mats, [
    [0.78, 0.4, 6.55],
    [0.5, 0.85, 6.9],
    [0.35, 1.15, 7.6],
    [0.3, 1.2, 8.4],
    [0.2, 0.95, 9.0],
  ], 0.022, mats.pipeBlue);
  tubeAlong(root, mats, [
    [-0.85, 0.45, 6.45],
    [-0.6, 1.4, 6.8],
    [-0.2, 1.7, 7.6],
    [0.4, 1.65, 8.5],
    [0.7, 1.2, 8.75],
  ], 0.018, mats.pipeCopper);
  runPipe(root, mats, { x: 0.55, y: 0.25, z: 9.6, length: 2.2, radius: 0.035, material: mats.pipeRed });

  buildCatwalk(ctx);
  buildAftPanel(ctx);
  buildAftFill(ctx);

  const lamp1 = mesh(beveledBox(0.12, 0.06, 0.18, 0.004), mats.lightWarm, -0.2, 2.08, 7.2);
  const lamp2 = mesh(beveledBox(0.12, 0.06, 0.18, 0.004), mats.lightWarm, 0.25, 2.08, 9.1);
  root.add(lamp1, lamp2);
  ctx.workLights = [lamp1, lamp2];

  root.add(mesh(beveledBox(0.7, 0.015, 2.8, 0.002), mats.yellow, 0.02, 0.018, 8.4));
  root.add(mesh(beveledBox(0.18, 0.22, 0.9, 0.008), mats.warning, 0.12, 0.22, 9.15));

  for (let i = 0; i < 6; i++) {
    root.add(mesh(beveledBox(0.08, 0.05, 0.1, 0.003), mats.gunmetal, -0.35 + (i % 3) * 0.12, 0.95 + Math.floor(i / 3) * 0.14, 8.95));
  }
  root.add(mesh(beveledBox(0.34, 0.16, 0.06, 0.006), mats.warning, 0.12, 1.05, 8.55));
  const motorTag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.07),
    new THREE.MeshStandardMaterial({
      map: makeLabelTexture('PROP MOTOR', { w: 320, h: 80, bg: '#3a3830', fg: '#e8d090' }),
      roughness: 0.5,
    }),
  );
  motorTag.position.set(0.12, 1.08, 8.59);
  root.add(motorTag);

  const stencil = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.12),
    new THREE.MeshStandardMaterial({
      map: makeLabelTexture('PROPULSION', { w: 360, h: 80, bg: '#4a3020', fg: '#e8c878' }),
      roughness: 0.55,
    }),
  );
  stencil.position.set(0, 1.95, 10.9);
  root.add(stencil);
}

function buildElectricalPassage(ctx) {
  const { mats, root, colliders } = ctx;
  const cab = createCabinet(mats, 0.38, 1.25, 0.26, 'DIST');
  cab.position.set(0.86, 0, 3.35);
  root.add(cab);
  addCollider(colliders, 0.86, 0.62, 3.35, 0.4, 1.28, 0.28);

  const cab2 = createCabinet(mats, 0.38, 1.15, 0.26, 'INV');
  cab2.position.set(0.86, 0, 3.95);
  root.add(cab2);
  addCollider(colliders, 0.86, 0.58, 3.95, 0.4, 1.18, 0.28);

  const cab3 = createCabinet(mats, 0.36, 1.05, 0.24, 'MCC');
  cab3.position.set(-0.86, 0, 3.6);
  root.add(cab3);
  addCollider(colliders, -0.86, 0.52, 3.6, 0.38, 1.08, 0.26);

  const rail = createHandrail(mats, 2.2);
  rail.position.set(0.48, 0.9, 3.7);
  root.add(rail);

  valveOnPipe(root, mats, -0.55, 1.4, 4.4, 0.8, 0.2);
}

function buildCatwalk(ctx) {
  const { mats, root, colliders } = ctx;
  const walk = mesh(beveledBox(0.42, 0.04, 2.4, 0.006), mats.grate, 0.02, 0.82, 8.55);
  root.add(walk);
  const stair = mesh(beveledBox(0.36, 0.04, 0.55, 0.006), mats.grate, 0.02, 0.42, 7.15, 0.55, 0, 0);
  root.add(stair);
  const railL = createHandrail(mats, 2.2);
  railL.position.set(-0.2, 1.22, 8.6);
  root.add(railL);
  const railR = createHandrail(mats, 2.2);
  railR.position.set(0.24, 1.22, 8.6);
  root.add(railR);
  addCollider(colliders, -0.22, 1.22, 8.6, 0.06, 0.16, 2.2);
  addCollider(colliders, 0.26, 1.22, 8.6, 0.06, 0.16, 2.2);
}

function buildAftPanel(ctx) {
  const { mats, root, colliders, interactables, animated } = ctx;
  const panel = mesh(beveledBox(0.42, 0.55, 0.12, 0.01), mats.plastic, 0.55, 1.15, 6.85);
  root.add(panel);
  const status = makeDisplay('status', 0, {});
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.18),
    new THREE.MeshStandardMaterial({ map: status.texture, emissive: 0x102010, emissiveIntensity: 0.4, roughness: 0.3 }),
  );
  screen.position.set(0.55, 1.22, 6.92);
  root.add(screen);
  animated.push({ type: 'display', kind: 'status', texture: status.texture, canvas: status.canvas, ctx: status.ctx, material: screen.material });

  const hit = mesh(beveledBox(0.4, 0.5, 0.1, 0.004), mats.plastic, 0.55, 1.15, 6.9);
  hit.visible = false;
  root.add(hit);
  interactables.push({
    name: 'silentRunning',
    object: hit,
    prompt: 'E: Silent Running',
    position: new THREE.Vector3(0.4, 1.15, 6.85),
  });
  addCollider(colliders, 0.55, 1.15, 6.85, 0.44, 0.56, 0.16);
  ctx.aftPanel = { screen, status };
}

function buildAftFill(ctx) {
  const { mats, root } = ctx;
  root.add(mesh(beveledBox(1.8, 1.6, 0.12, 0.01), mats.hullGreen, 0, 1.0, 11.25));
  root.add(mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 16), mats.oilyMachine, 0.15, 0.58, 10.95, Math.PI / 2, 0, 0));
  root.add(mesh(beveledBox(0.5, 0.7, 0.2, 0.01), mats.machineBlue, -0.55, 0.7, 11.05));
  root.add(mesh(beveledBox(0.4, 0.5, 0.18, 0.01), mats.gunmetal, 0.7, 0.55, 11.05));
  for (let i = 0; i < 5; i++) {
    root.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), mats.pipe, -0.7 + i * 0.12, 1.55, 11.1, 0.4, 0, 0));
  }
}
