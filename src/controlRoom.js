import * as THREE from 'three';
import { ZONES } from './layout.js';
import { mesh, beveledBox, roundedPanel, addCollider } from './geom.js';
import { createGauge, createSwitchBank, createHandrail, createJunctionBox } from './machinery.js';
import { makeDisplay, makeNavChart, makeLabelTexture } from './textures.js';
import { valveOnPipe } from './pipes.js';

export function buildControlRoom(ctx) {
  const { mats, root, colliders, interactables, animated } = ctx;
  const z0 = ZONES.control.z0;
  const z1 = ZONES.control.z1;
  const zMid = (z0 + z1) * 0.5;

  buildViewport(ctx, z0 + 0.22);

  const helm = buildHelmStation(ctx);
  helm.position.set(0.02, 0, -8.35);
  root.add(helm);
  addCollider(colliders, 0.02, 0.55, -8.35, 1.15, 1.1, 0.72);

  const sonar = buildSonarStation(ctx);
  sonar.position.set(0.72, 0, -7.55);
  root.add(sonar);
  addCollider(colliders, 0.78, 0.55, -7.55, 0.55, 1.15, 0.7);
  interactables.push({
    name: 'sonar',
    object: sonar.userData.hit,
    prompt: 'E: Active Sonar Ping',
    position: new THREE.Vector3(0.55, 1.15, -7.55),
  });

  const nav = buildNavStation(ctx);
  nav.position.set(-0.7, 0, -7.6);
  root.add(nav);
  addCollider(colliders, -0.7, 0.5, -7.6, 0.5, 1.05, 0.65);

  const overhead = buildOverhead(ctx);
  overhead.position.set(0, 2.02, -8.2);
  root.add(overhead);

  const seatL = buildSeat(mats);
  seatL.position.set(-0.38, 0, -7.95);
  seatL.rotation.y = 0.15;
  root.add(seatL);
  addCollider(colliders, -0.38, 0.35, -7.95, 0.38, 0.7, 0.38);

  const seatR = buildSeat(mats);
  seatR.position.set(0.4, 0, -7.95);
  seatR.rotation.y = -0.12;
  root.add(seatR);
  addCollider(colliders, 0.4, 0.35, -7.95, 0.38, 0.7, 0.38);

  const rail = createHandrail(mats, 1.1);
  rail.position.set(-0.95, 0.92, -8.6);
  rail.rotation.y = Math.PI / 2;
  root.add(rail);

  const chart = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.3),
    new THREE.MeshStandardMaterial({ map: makeNavChart(), roughness: 0.7, metalness: 0 }),
  );
  chart.position.set(-0.98, 1.35, -8.9);
  chart.rotation.y = Math.PI / 2;
  chart.rotation.x = -0.08;
  root.add(chart);

  const comms = mesh(beveledBox(0.22, 0.16, 0.18, 0.006), mats.plastic, -0.92, 1.05, -9.5);
  root.add(comms);
  root.add(mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.08, 10), mats.bakelite, -0.92, 1.18, -9.5));

  for (let i = 0; i < 3; i++) {
    const g = createGauge(mats, 30 + i, ['CAB', 'HYD', 'AIR'][i], [20, 400, 250][i]);
    g.position.set(-0.55 + i * 0.16, 1.72, -9.85);
    g.rotation.y = Math.PI;
    root.add(g);
    animated.push({ type: 'gauge', object: g.userData.needle, speed: 0.4 + i * 0.15 });
  }

  const box = createJunctionBox(mats, 0.18, 0.14, 0.08);
  box.position.set(0.95, 1.28, -9.2);
  box.rotation.y = -Math.PI / 2;
  root.add(box);

  valveOnPipe(root, mats, 0.92, 1.55, -6.7, 0.85, Math.PI / 2);

  const floorPanel = mesh(beveledBox(0.5, 0.02, 0.7, 0.003), mats.grate, 0, 0.012, zMid);
  root.add(floorPanel);
  for (let i = 0; i < 5; i++) {
    root.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 6), i % 2 ? mats.pipeCopper : mats.plastic, -0.28 + i * 0.04, 0.08, -8.9, 0.9, 0, 0.15));
  }
  root.add(mesh(beveledBox(0.18, 0.12, 0.08, 0.004), mats.plastic, 0.88, 1.72, -8.1));
  root.add(mesh(beveledBox(0.14, 0.22, 0.06, 0.004), mats.gunmetal, -0.95, 0.55, -9.1));

  ctx.control = { sonar, helm, nav };
}

function buildViewport(ctx, z) {
  const { mats, root, windows } = ctx;
  const frame = mesh(new THREE.TorusGeometry(0.42, 0.055, 14, 36), mats.chippedPaint, 0, 1.38, z);
  const outer = mesh(new THREE.TorusGeometry(0.48, 0.03, 10, 32), mats.gunmetal, 0, 1.38, z);
  const inner = mesh(new THREE.TorusGeometry(0.36, 0.02, 8, 28), mats.brushedMetal, 0, 1.38, z + 0.02);
  const glass = mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.06, 32), mats.thickGlass, 0, 1.38, z + 0.01, Math.PI / 2, 0, 0);
  const view = mesh(
    new THREE.CircleGeometry(0.355, 32),
    new THREE.MeshBasicMaterial({ color: 0x0a3040 }),
    0,
    1.38,
    z - 0.02,
  );
  view.rotation.y = Math.PI;
  const seal = mesh(new THREE.TorusGeometry(0.4, 0.012, 8, 28), mats.rubberFloor, 0, 1.38, z + 0.03);
  const bolts = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    bolts.push(mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 8), mats.brushedMetal, Math.cos(a) * 0.46, 1.38 + Math.sin(a) * 0.46, z + 0.03, Math.PI / 2, 0, 0));
  }
  const brow = mesh(beveledBox(1.05, 0.12, 0.18, 0.01), mats.hullGreen, 0, 1.88, z + 0.08);
  const sill = mesh(beveledBox(1.0, 0.1, 0.2, 0.01), mats.chippedPaint, 0, 0.92, z + 0.1);
  const cond = mesh(new THREE.CircleGeometry(0.37, 28), mats.condensation, 0, 1.38, z + 0.035);
  root.add(frame, outer, inner, glass, view, seal, brow, sill, cond, ...bolts);
  windows.push({ mesh: view, kind: 'forward' });
  ctx.forwardView = view;
}

function buildHelmStation(ctx) {
  const { mats, animated } = ctx;
  const g = new THREE.Group();
  g.add(mesh(beveledBox(1.12, 0.72, 0.58, 0.014), mats.hullGreen, 0, 0.42, 0));
  g.add(mesh(beveledBox(1.08, 0.06, 0.56, 0.006), mats.chippedPaint, 0, 0.8, 0.02));
  g.add(mesh(roundedPanel(1.0, 0.42, 0.04, 0.04), mats.plastic, 0, 1.12, 0.08, -0.35, 0, 0));

  const displays = ['heading', 'depth', 'status'];
  displays.forEach((kind, i) => {
    const d = makeDisplay(kind, 0, {});
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.17),
      new THREE.MeshStandardMaterial({ map: d.texture, emissive: 0x113322, emissiveIntensity: 0.35, roughness: 0.28, metalness: 0.1 }),
    );
    screen.position.set(-0.34 + i * 0.34, 1.16, 0.1);
    screen.rotation.x = -0.35;
    g.add(screen);
    animated.push({ type: 'display', kind, texture: d.texture, canvas: d.canvas, ctx: d.ctx, material: screen.material });
    g.add(mesh(beveledBox(0.3, 0.19, 0.03, 0.004), mats.gunmetal, -0.34 + i * 0.34, 1.16, 0.08, -0.35, 0, 0));
  });

  const wheel = mesh(new THREE.TorusGeometry(0.13, 0.016, 8, 20), mats.leather, 0, 0.95, 0.22, 0.55, 0, 0);
  for (let i = 0; i < 3; i++) {
    const spoke = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 6), mats.brushedMetal, 0, 0.95, 0.22);
    spoke.rotation.set(0.55, 0, (i / 3) * Math.PI);
    g.add(spoke);
  }
  g.add(wheel);
  g.add(mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.12, 10), mats.gunmetal, 0, 0.86, 0.16, 0.55, 0, 0));

  const throttle = mesh(beveledBox(0.16, 0.05, 0.22, 0.004), mats.plastic, 0.38, 0.84, 0.14);
  g.add(throttle);
  g.add(mesh(new THREE.BoxGeometry(0.02, 0.07, 0.02), mats.warning, 0.34, 0.9, 0.18));
  g.add(mesh(new THREE.BoxGeometry(0.02, 0.07, 0.02), mats.emissiveGreen, 0.42, 0.9, 0.12));

  const switches = createSwitchBank(mats, 8);
  switches.position.set(-0.36, 0.84, 0.2);
  g.add(switches);

  for (let i = 0; i < 6; i++) {
    const lite = mesh(new THREE.CircleGeometry(0.01, 8), i % 3 === 0 ? mats.emissiveAmber : mats.emissiveGreen, -0.4 + i * 0.08, 0.92, 0.28);
    g.add(lite);
  }

  g.add(mesh(beveledBox(0.7, 0.04, 0.28, 0.004), mats.gunmetal, 0, 0.22, 0.18));
  return g;
}

function buildSonarStation(ctx) {
  const { mats, animated } = ctx;
  const g = new THREE.Group();
  g.add(mesh(beveledBox(0.48, 0.95, 0.52, 0.012), mats.hullGreen, 0, 0.48, 0));
  g.add(mesh(roundedPanel(0.42, 0.3, 0.03, 0.03), mats.plastic, 0, 1.22, 0.12, -0.28, 0, 0));

  const sonar = makeDisplay('sonar', 0, {});
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.36, 0.22),
    new THREE.MeshStandardMaterial({ map: sonar.texture, emissive: 0x0a2818, emissiveIntensity: 0.45, roughness: 0.25 }),
  );
  screen.position.set(0, 1.24, 0.14);
  screen.rotation.x = -0.28;
  g.add(screen);
  animated.push({ type: 'sonarDisplay', texture: sonar.texture, canvas: sonar.canvas, ctx2d: sonar.ctx, material: screen.material });

  const hit = mesh(beveledBox(0.4, 0.28, 0.08, 0.004), mats.plastic, 0, 1.22, 0.16);
  hit.visible = false;
  g.add(hit);
  g.userData.hit = hit;
  g.userData.screen = screen;

  const sw = createSwitchBank(mats, 8);
  sw.position.set(0, 0.98, 0.22);
  g.add(sw);
  const g1 = createGauge(mats, 44, 'SNR', 20);
  g1.position.set(0.12, 0.78, 0.26);
  g.add(g1);
  g.add(mesh(new THREE.BoxGeometry(0.08, 0.05, 0.06), mats.bakelite, -0.12, 0.78, 0.26));
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2, 0.05),
    new THREE.MeshStandardMaterial({ map: makeLabelTexture('SONAR', { w: 256, h: 72, bg: '#243028', fg: '#9ee0b0' }), roughness: 0.5 }),
  );
  plate.position.set(0, 1.42, 0.18);
  g.add(plate);
  return g;
}

function buildNavStation(ctx) {
  const { mats, animated } = ctx;
  const g = new THREE.Group();
  g.add(mesh(beveledBox(0.46, 0.88, 0.5, 0.012), mats.hullGreen, 0, 0.45, 0));
  const nav = makeDisplay('nav', 0, {});
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.2),
    new THREE.MeshStandardMaterial({ map: nav.texture, emissive: 0x0a2218, emissiveIntensity: 0.4, roughness: 0.28 }),
  );
  screen.position.set(0, 1.18, 0.14);
  screen.rotation.x = -0.3;
  g.add(screen);
  animated.push({ type: 'display', kind: 'nav', texture: nav.texture, canvas: nav.canvas, ctx: nav.ctx, material: screen.material });
  const sw = createSwitchBank(mats, 8);
  sw.position.set(0, 0.92, 0.2);
  g.add(sw);
  return g;
}

function buildOverhead(ctx) {
  const { mats } = ctx;
  const g = new THREE.Group();
  g.add(mesh(beveledBox(1.5, 0.08, 1.6, 0.01), mats.hullGreen));
  for (let i = 0; i < 8; i++) {
    const x = -0.6 + (i % 4) * 0.4;
    const z = i < 4 ? -0.4 : 0.35;
    g.add(mesh(beveledBox(0.22, 0.04, 0.16, 0.004), mats.plastic, x, -0.05, z));
    g.add(mesh(new THREE.BoxGeometry(0.03, 0.025, 0.02), i % 2 ? mats.bakelite : mats.emissiveAmber, x - 0.05, -0.07, z));
    g.add(mesh(new THREE.BoxGeometry(0.03, 0.025, 0.02), mats.emissiveGreen, x + 0.05, -0.07, z));
  }
  g.add(mesh(new THREE.BoxGeometry(0.18, 0.04, 0.18), mats.lightWarm, 0, -0.06, 0));
  return g;
}

function buildSeat(mats) {
  const g = new THREE.Group();
  g.add(mesh(beveledBox(0.34, 0.07, 0.34, 0.01), mats.leather, 0, 0.46, 0));
  g.add(mesh(beveledBox(0.34, 0.32, 0.07, 0.01), mats.leather, 0, 0.64, -0.14));
  g.add(mesh(beveledBox(0.3, 0.42, 0.3, 0.008), mats.gunmetal, 0, 0.22, 0));
  g.add(mesh(beveledBox(0.22, 0.03, 0.16, 0.004), mats.chippedPaint, 0, 0.18, 0.16));
  g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), mats.brushedMetal, 0.14, 0.72, -0.12));
  return g;
}
