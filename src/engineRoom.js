import * as THREE from 'three';
import { ROOMS } from './layout.js';
import {
  beveledBox,
  createPipeRun,
  createValveAssembly,
  createGauge,
  createFan,
  createJunctionBox,
  createCableTray,
  createCableBundle,
  createAccessPanel,
  createLightFixture,
  createWarning,
  createGrate,
  markShadows,
} from './kit.js';
import {
  createPropulsionMotor,
  createGearbox,
  createPump,
  createCompressor,
  createCabinet,
  createHeatExchanger,
  createTank,
  createCatwalk,
} from './machinery.js';
import { createMachineryPanel } from './displays.js';

export function createEngineRoom(mats, collider) {
  const g = new THREE.Group();
  g.name = 'engineRoom';
  const z0 = ROOMS.engine.z0;
  const z1 = ROOMS.engine.z1;
  const mid = (z0 + z1) / 2;

  const motor = createPropulsionMotor(mats);
  motor.position.set(0.08, 0.82, -6.2);
  motor.rotation.y = Math.PI / 2;
  motor.scale.setScalar(1.15);
  g.add(motor);
  const motorLamp = new THREE.PointLight(0xffe0b0, 2.4, 3.2, 2);
  motorLamp.position.set(0.25, 1.45, -5.55);
  g.add(motorLamp);
  collider.addBox(0.08, 0.7, -6.35, 1.15, 1.15, 2.1, 'motor');

  const gear = createGearbox(mats);
  gear.position.set(0.05, 0.72, -5.15);
  g.add(gear);
  collider.addBox(0.05, 0.7, -5.15, 0.75, 0.7, 0.6, 'gear');

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.6, 14), mats.brushed);
  shaft.rotation.x = Math.PI / 2;
  shaft.position.set(0.05, 0.78, -7.55);
  g.add(shaft);
  const coupling = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 12), mats.steel);
  coupling.rotation.x = Math.PI / 2;
  coupling.position.set(0.05, 0.78, -7.05);
  g.add(coupling);
  const bearing = new THREE.Mesh(beveledBox(0.22, 0.2, 0.18, 0.01), mats.oily);
  bearing.position.set(0.05, 0.55, -8.05);
  g.add(bearing);

  const pump1 = createPump(mats, 1.05);
  pump1.position.set(-0.42, 0.42, -3.55);
  g.add(pump1);
  const pump2 = createPump(mats, 0.9);
  pump2.position.set(-0.42, 0.4, -2.55);
  g.add(pump2);
  collider.addBox(-0.42, 0.4, -3.55, 0.4, 0.7, 0.4, 'pump');
  collider.addBox(-0.42, 0.4, -2.55, 0.36, 0.65, 0.36, 'pump');

  const comp = createCompressor(mats);
  comp.position.set(0.42, 0.38, -3.15);
  g.add(comp);
  collider.addBox(0.42, 0.4, -3.15, 0.6, 0.55, 0.35, 'comp');

  const hx = createHeatExchanger(mats);
  hx.position.set(0.4, 0.55, -4.15);
  g.add(hx);

  const tank = createTank(mats, 0.14, 0.42);
  tank.position.set(-0.48, 0.55, -4.45);
  g.add(tank);
  const tank2 = createTank(mats, 0.11, 0.34);
  tank2.position.set(0.5, 0.48, -6.95);
  g.add(tank2);

  const cab1 = createCabinet(mats, 0.34, 1.2, 0.26);
  cab1.position.set(0.52, 0, -2.05);
  g.add(cab1);
  const cab2 = createCabinet(mats, 0.32, 1.05, 0.24);
  cab2.position.set(-0.52, 0, -1.95);
  g.add(cab2);
  collider.addBox(0.52, 0.6, -2.05, 0.36, 1.2, 0.28, 'cab');
  collider.addBox(-0.52, 0.55, -1.95, 0.34, 1.1, 0.26, 'cab');

  const batt = new THREE.Mesh(beveledBox(0.7, 0.38, 0.42, 0.012), mats.plastic);
  batt.position.set(0.0, 0.22, -2.15);
  g.add(batt);
  const battTop = new THREE.Mesh(beveledBox(0.66, 0.04, 0.38, 0.006), mats.oily);
  battTop.position.set(0.0, 0.42, -2.15);
  g.add(battTop);
  collider.addBox(0, 0.22, -2.15, 0.72, 0.4, 0.44, 'batt');

  const walk = createCatwalk(mats, 2.6);
  walk.position.set(0.42, 0, -5.7);
  g.add(walk);
  collider.addBox(0.55, 0.75, -5.7, 0.12, 0.5, 2.4, 'rail');

  const tools = new THREE.Mesh(beveledBox(0.22, 0.7, 0.28, 0.01), mats.hullGreen);
  tools.position.set(-0.55, 0.4, -6.85);
  g.add(tools);
  collider.addBox(-0.55, 0.4, -6.85, 0.24, 0.7, 0.3, 'tools');

  const pipes = [
    createPipeRun([
      new THREE.Vector3(-0.42, 0.55, -3.55),
      new THREE.Vector3(-0.55, 0.85, -3.9),
      new THREE.Vector3(-0.55, 0.95, -5.2),
      new THREE.Vector3(-0.2, 1.05, -6.1),
      new THREE.Vector3(0.05, 0.95, -6.35),
    ], 0.028, mats.pipe),
    createPipeRun([
      new THREE.Vector3(0.42, 0.5, -3.15),
      new THREE.Vector3(0.55, 0.9, -3.6),
      new THREE.Vector3(0.55, 1.15, -5.0),
      new THREE.Vector3(0.35, 1.2, -6.0),
    ], 0.022, mats.pipeCopper),
    createPipeRun([
      new THREE.Vector3(-0.48, 0.75, -4.45),
      new THREE.Vector3(-0.2, 1.25, -4.6),
      new THREE.Vector3(0.2, 1.28, -5.2),
      new THREE.Vector3(0.35, 0.85, -5.15),
    ], 0.02, mats.pipeWhite),
    createPipeRun([
      new THREE.Vector3(0.4, 0.55, -4.15),
      new THREE.Vector3(0.15, 0.35, -4.8),
      new THREE.Vector3(0.1, 0.35, -6.0),
    ], 0.025, mats.pipe),
  ];
  pipes.forEach((p) => g.add(p));

  for (const [x, y, z] of [
    [-0.5, 1.05, -3.85],
    [0.48, 1.12, -4.55],
    [-0.22, 1.22, -5.55],
  ]) {
    const v = createValveAssembly(mats, 0.07);
    v.position.set(x, y, z);
    g.add(v);
  }

  for (const [x, y, z, lab, val] of [
    [-0.32, 1.15, -3.4, 'HYD', 0.48],
    [0.32, 1.05, -2.85, 'OIL', 0.62],
    [0.22, 1.25, -5.35, 'CW', 0.4],
    [-0.15, 0.95, -6.85, 'SHAFT', 0.33],
  ]) {
    const gauge = createGauge(mats, lab, val);
    gauge.position.set(x, y, z);
    g.add(gauge);
  }

  const fans = [];
  const fan1 = createFan(mats, 0.11);
  fan1.position.set(0.0, 1.85, -4.2);
  fan1.rotation.x = Math.PI / 2;
  g.add(fan1);
  fans.push(fan1);
  const fan2 = createFan(mats, 0.09);
  fan2.position.set(-0.5, 1.55, -2.35);
  fan2.rotation.y = Math.PI / 2;
  g.add(fan2);
  fans.push(fan2);
  if (pump1.userData.fans) fans.push(...pump1.userData.fans);
  if (pump2.userData.fans) fans.push(...pump2.userData.fans);

  const tray = createCableTray(5.2, mats);
  tray.position.set(0.0, 2.1, mid);
  g.add(tray);
  const cables = createCableBundle(4.8, mats, 0.04);
  cables.position.set(0.05, 2.08, mid);
  g.add(cables);
  const drop = createCableBundle(1.1, mats, 0.08);
  drop.rotation.x = Math.PI / 2;
  drop.position.set(0.35, 1.5, -2.05);
  g.add(drop);

  const panelTex = createMachineryPanel();
  const panel = new THREE.Mesh(beveledBox(0.42, 0.48, 0.1, 0.008), mats.plastic);
  panel.position.set(0.35, 1.15, -1.85);
  g.add(panel);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.3), mats.screen(panelTex));
  screen.position.set(0.35, 1.18, -1.79);
  g.add(screen);
  const interact = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.16), new THREE.MeshBasicMaterial({ visible: false }));
  interact.position.set(0.35, 1.15, -1.82);
  g.add(interact);

  for (const z of [-2.4, -4.4, -6.5]) {
    const lamp = createLightFixture(mats, 'warm');
    lamp.position.set(0.1, 2.1, z);
    g.add(lamp);
  }
  const work = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), mats.lightWarm);
  work.position.set(-0.2, 1.72, -5.8);
  g.add(work);

  const grate = createGrate(0.7, 1.1, mats);
  if (grate) {
    grate.position.set(0.15, 0.015, -4.7);
    g.add(grate);
  }
  const pit = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 1.1), mats.blackout);
  pit.position.set(0.15, -0.14, -4.7);
  g.add(pit);
  const underPipe = createPipeRun([
    new THREE.Vector3(-0.1, -0.12, -5.1),
    new THREE.Vector3(0.2, -0.12, -4.7),
    new THREE.Vector3(0.35, -0.1, -4.3),
  ], 0.03, mats.pipeCopper);
  g.add(underPipe);

  const beam = new THREE.Mesh(beveledBox(1.1, 0.08, 0.08, 0.008), mats.steel);
  beam.position.set(0, 1.95, -5.6);
  g.add(beam);
  const beam2 = beam.clone();
  beam2.position.z = -3.4;
  g.add(beam2);

  const warn = createWarning(mats, 'HIGH\nVOLT', '#c4a032');
  warn.position.set(0.52, 1.45, -2.05);
  warn.rotation.y = -0.4;
  g.add(warn);
  const warn2 = createWarning(mats, 'ROTATING\nGEAR', '#c25a28');
  warn2.position.set(-0.15, 1.35, -5.0);
  g.add(warn2);

  const panelAccess = createAccessPanel(0.24, 0.2, mats, 'LUBE');
  panelAccess.position.set(-0.6, 0.85, -5.55);
  panelAccess.rotation.y = Math.PI / 2;
  g.add(panelAccess);

  const box = createJunctionBox(mats, 0.18, 0.16, 0.08);
  box.position.set(0.58, 1.55, -4.85);
  box.rotation.y = -Math.PI / 2;
  g.add(box);

  const steam = new THREE.Points(
    new THREE.BufferGeometry().setAttribute(
      'position',
      new THREE.Float32BufferAttribute(new Array(60).fill(0).map((_, i) => (i % 3 === 1 ? Math.random() * 0.3 : (Math.random() - 0.5) * 0.15)), 3),
    ),
    new THREE.PointsMaterial({ color: 0xc8d0d4, size: 0.02, transparent: true, opacity: 0.25, depthWrite: false }),
  );
  steam.position.set(-0.2, 1.35, -4.5);
  g.add(steam);

  const passageCab = createCabinet(mats, 0.3, 1.1, 0.22);
  passageCab.position.set(0.5, 0, -0.35);
  g.add(passageCab);
  collider.addBox(0.5, 0.55, -0.35, 0.32, 1.1, 0.24, 'passcab');

  const passageBox = createJunctionBox(mats, 0.22, 0.3, 0.1);
  passageBox.position.set(-0.55, 1.2, -0.2);
  passageBox.rotation.y = Math.PI / 2;
  g.add(passageBox);

  markShadows(g);

  const anim = {
    fans,
    motor,
    steam,
    silent: false,
    speed: 1,
    setSilent(v) {
      this.silent = v;
      this.speed = v ? 0.28 : 1;
    },
    update(dt) {
      const s = this.speed;
      for (const fan of this.fans) {
        if (fan.userData.blades) fan.userData.blades.rotation.z += dt * 6 * s;
      }
      this.motor.position.y = 0.78 + Math.sin(performance.now() * 0.012 * s) * 0.0015 * s;
      this.steam.position.y += dt * 0.05 * s;
      if (this.steam.position.y > 1.6) this.steam.position.y = 1.3;
    },
  };

  return {
    group: g,
    silentTarget: interact,
    displays: [panelTex],
    anim,
  };
}
