import { Group } from 'three';
import { LAYOUT } from './seed.js';
import { box, cyl, roundedBox } from './geom.js';
import {
  makeAccessPanel,
  makeCableTray,
  makeFan,
  makeFloorGrate,
  makeGauge,
  makeHandrail,
  makeJunctionBox,
  makeStraightPipe,
  makeUnderfloor,
  makeValve,
  makeVent,
  makeWarningPlate,
  mesh,
} from './kit.js';
import {
  makeBatteryBank,
  makeCompressor,
  makeElectricalCabinet,
  makeExpansionTank,
  makeGearHousing,
  makeHeatExchanger,
  makeInspectionLamp,
  makePropulsionMotor,
  makePump,
  makeToolCabinet,
  makeValveCluster,
} from './machinery.js';
import { makeGaugeFace, makeMachineryPanelTexture } from './displays.js';

export function buildEngineRoom(mats, collision, interactables, animators) {
  const g = new Group();
  g.name = 'engineRoom';

  const passageMid = (LAYOUT.rooms.passage.z0 + LAYOUT.rooms.passage.z1) * 0.5;
  g.add(makeStraightPipe(mats, -0.7, 1.8, passageMid, 2.8, 0.034, 'z', 'pipe'));
  g.add(makeStraightPipe(mats, 0.7, 1.84, passageMid, 2.8, 0.028, 'z', 'pipeOrange'));
  g.add(makeStraightPipe(mats, -0.7, 1.58, passageMid, 2.6, 0.02, 'z', 'pipeBlue'));
  const trayP = makeCableTray(mats, 2.7, 0.18);
  trayP.position.set(0.05, 2.05, passageMid);
  g.add(trayP);
  const cab1 = makeElectricalCabinet(mats, 0.36, 1.05, 0.2);
  cab1.position.set(0.58, 0.62, 13.7);
  g.add(cab1);
  const cab2 = makeElectricalCabinet(mats, 0.32, 0.95, 0.18);
  cab2.position.set(0.6, 0.56, 14.35);
  g.add(cab2);
  const batt = makeBatteryBank(mats);
  batt.position.set(-0.48, 0.38, 14.6);
  g.add(batt);
  const jbox = makeJunctionBox(mats, 0.16, 0.2, 0.08);
  jbox.position.set(-0.7, 1.25, 13.9);
  jbox.rotation.y = Math.PI * 0.5;
  g.add(jbox);
  const warnP = makeWarningPlate(mats, 'HIGH VOLT', 'ISOLATE');
  warnP.position.set(0.48, 1.35, 13.7);
  warnP.rotation.y = -0.4;
  g.add(warnP);
  collision.addBox(0.58, 0.62, 13.7, 0.38, 1.1, 0.24);
  collision.addBox(0.6, 0.56, 14.35, 0.34, 1.0, 0.22);
  collision.addBox(-0.48, 0.38, 14.6, 0.72, 0.7, 0.4);

  const motor = makePropulsionMotor(mats);
  motor.position.set(0.28, 0.72, 19.85);
  g.add(motor);
  animators.push({ type: 'vibrate', object: motor, amp: 0.0012 });

  const gear = makeGearHousing(mats);
  gear.position.set(0.28, 0.55, 18.85);
  g.add(gear);

  const shaftCover = mesh(cyl(0.09, 0.09, 0.9, 14), mats.brushed);
  shaftCover.rotation.x = Math.PI * 0.5;
  shaftCover.position.set(0.28, 0.55, 20.85);
  g.add(shaftCover);
  const bearing = mesh(roundedBox(0.22, 0.18, 0.16, 0.02, 2), mats.oily);
  bearing.position.set(0.28, 0.42, 21.25);
  g.add(bearing);

  const pumpA = makePump(mats, 1.05);
  pumpA.position.set(-0.48, 0.38, 17.4);
  g.add(pumpA);
  animators.push({ type: 'spin', object: pumpA.userData.spin, speed: 8 });
  const pumpB = makePump(mats, 0.9);
  pumpB.position.set(-0.52, 0.36, 18.15);
  pumpB.rotation.y = 0.3;
  g.add(pumpB);
  animators.push({ type: 'spin', object: pumpB.userData.spin, speed: 6.5 });

  const comp = makeCompressor(mats);
  comp.position.set(-0.42, 0.4, 19.15);
  g.add(comp);

  const hx = makeHeatExchanger(mats);
  hx.position.set(0.55, 1.15, 17.6);
  g.add(hx);

  const tank = makeExpansionTank(mats);
  tank.position.set(-0.55, 1.35, 20.15);
  g.add(tank);

  const cab3 = makeElectricalCabinet(mats, 0.38, 1.2, 0.2);
  cab3.position.set(0.62, 0.68, 17.15);
  g.add(cab3);
  const tools = makeToolCabinet(mats);
  tools.position.set(0.6, 0.4, 16.55);
  g.add(tools);

  const cluster = makeValveCluster(mats);
  cluster.position.set(-0.55, 0.85, 17.85);
  g.add(cluster);
  const v2 = makeValve(mats, 0.034, 0.08);
  v2.position.set(-0.62, 1.15, 19.55);
  g.add(v2);
  const v3 = makeValve(mats, 0.03, 0.07);
  v3.position.set(0.58, 0.95, 19.35);
  g.add(v3);

  g.add(makeStraightPipe(mats, -0.62, 1.72, 18.8, 4.6, 0.04, 'z', 'pipe'));
  g.add(makeStraightPipe(mats, -0.62, 1.52, 18.9, 4.2, 0.026, 'z', 'pipeOrange'));
  g.add(makeStraightPipe(mats, 0.68, 1.78, 18.7, 4.4, 0.03, 'z', 'pipeBlue'));
  g.add(makeStraightPipe(mats, 0.48, 0.28, 19.2, 3.2, 0.032, 'z', 'pipeOrange'));
  g.add(makeStraightPipe(mats, -0.2, 0.22, 19.0, 2.8, 0.028, 'z', 'pipe'));
  const drop = makeStraightPipe(mats, -0.62, 1.1, 18.4, 0.9, 0.03, 'y', 'pipe');
  g.add(drop);

  const tray = makeCableTray(mats, 5.0, 0.2);
  tray.position.set(0.02, 2.06, 18.8);
  g.add(tray);

  const fan1 = makeFan(mats, 0.09);
  fan1.position.set(-0.15, 1.92, 17.8);
  fan1.rotation.x = Math.PI * 0.5;
  g.add(fan1);
  animators.push({ type: 'spin', object: fan1.userData.rotor, speed: 4.2 });
  const fan2 = makeFan(mats, 0.08);
  fan2.position.set(0.22, 1.9, 20.4);
  fan2.rotation.x = Math.PI * 0.5;
  g.add(fan2);
  animators.push({ type: 'spin', object: fan2.userData.rotor, speed: 3.6 });

  const catwalk = mesh(roundedBox(0.42, 0.04, 2.2, 0.01, 1), mats.grate);
  catwalk.position.set(-0.08, 0.92, 19.6);
  g.add(catwalk);
  const rail = makeHandrail(mats, 2.1, 0.42);
  rail.position.set(-0.26, 0.92, 19.6);
  g.add(rail);
  const rail2 = makeHandrail(mats, 2.1, 0.42);
  rail2.position.set(0.12, 0.92, 19.6);
  g.add(rail2);
  const stair = mesh(roundedBox(0.28, 0.08, 0.36, 0.01, 1), mats.chipped);
  stair.position.set(-0.08, 0.42, 18.35);
  g.add(stair);
  const stair2 = mesh(roundedBox(0.28, 0.08, 0.3, 0.01, 1), mats.chipped);
  stair2.position.set(-0.08, 0.68, 18.55);
  g.add(stair2);

  const grate = makeFloorGrate(mats, 0.55, 0.8);
  grate.position.set(-0.15, 0.03, 17.7);
  g.add(grate);
  const under = makeUnderfloor(mats, 0.52, 0.76);
  under.position.set(-0.15, 0, 17.7);
  g.add(under);
  const grate2 = makeFloorGrate(mats, 0.4, 0.55);
  grate2.position.set(-0.2, 0.03, 20.5);
  g.add(grate2);

  const panelTex = makeMachineryPanelTexture(false);
  const panelTexSilent = makeMachineryPanelTexture(true);
  const panelMat = mats.plastic.clone();
  panelMat.map = panelTex;
  panelMat.color.set(0xffffff);
  panelMat.emissiveMap = panelTex;
  panelMat.emissive.set(0x8a7040);
  panelMat.emissiveIntensity = 0.22;
  const panel = mesh(roundedBox(0.36, 0.28, 0.06, 0.01, 1), panelMat);
  const panelGroup = new Group();
  panelGroup.add(panel);
  const housing = mesh(roundedBox(0.4, 0.42, 0.12, 0.015, 1), mats.hullGreen);
  housing.position.z = -0.04;
  panelGroup.add(housing);
  panelGroup.position.set(-0.15, 1.25, 16.55);
  panelGroup.userData.interact = 'silentRunning';
  panelGroup.userData.prompt = 'E: Silent Running';
  panelGroup.userData.panelMat = panelMat;
  panelGroup.userData.panelTex = panelTex;
  panelGroup.userData.panelTexSilent = panelTexSilent;
  g.add(panelGroup);
  interactables.push(panelGroup);

  for (const [x, y, z, label] of [
    [-0.58, 1.05, 18.55, 'OIL'],
    [0.52, 1.05, 18.75, 'CW'],
    [-0.5, 0.72, 20.35, 'AIR'],
    [0.48, 0.85, 20.55, 'PSI'],
  ]) {
    const gauge = makeGauge(mats, makeGaugeFace(label, 80, 30), 0.045);
    gauge.position.set(x, y, z);
    g.add(gauge);
    animators.push({ type: 'needle', object: gauge.userData.needle, speed: 0.4 });
  }

  const lamp = makeInspectionLamp(mats);
  lamp.position.set(0.45, 1.35, 19.6);
  g.add(lamp);
  const vent = makeVent(mats, 0.22, 0.1);
  vent.position.set(0.1, 1.95, 18.9);
  g.add(vent);
  const access = makeAccessPanel(mats, 0.24, 0.18);
  access.position.set(0.7, 0.55, 20.15);
  access.rotation.y = -Math.PI * 0.5;
  g.add(access);
  const warn = makeWarningPlate(mats, 'PROPULSION', 'NO STEP');
  warn.position.set(0.15, 1.55, 21.15);
  g.add(warn);
  const warn2 = makeWarningPlate(mats, 'ROTATING', 'MACHINERY');
  warn2.position.set(-0.55, 1.55, 16.4);
  g.add(warn2);

  const beam = mesh(roundedBox(1.3, 0.06, 0.06, 0.01, 1), mats.oily);
  beam.position.set(0, 1.98, 18.4);
  g.add(beam);
  const beam2 = beam.clone();
  beam2.position.z = 20.2;
  g.add(beam2);

  const aftWall = mesh(roundedBox(1.6, 1.6, 0.12, 0.02, 1), mats.hull);
  aftWall.position.set(0, 0.9, 21.72);
  g.add(aftWall);
  const aftMach = makeElectricalCabinet(mats, 0.3, 0.8, 0.16);
  aftMach.position.set(-0.45, 0.5, 21.45);
  g.add(aftMach);

  collision.addBox(0.36, 0.7, 19.85, 0.62, 1.2, 1.7);
  collision.addBox(0.32, 0.55, 18.85, 0.58, 0.7, 0.6);
  collision.addBox(-0.48, 0.4, 17.4, 0.5, 0.55, 0.5);
  collision.addBox(-0.52, 0.4, 18.15, 0.45, 0.5, 0.45);
  collision.addBox(-0.42, 0.4, 19.15, 0.75, 0.5, 0.35);
  collision.addBox(0.62, 0.68, 17.15, 0.4, 1.25, 0.24);
  collision.addBox(0.6, 0.4, 16.55, 0.38, 0.75, 0.24);
  collision.addBox(0.18, 1.15, 19.6, 0.36, 0.5, 2.2);
  collision.addBox(0, 1.0, 21.72, 1.6, 1.8, 0.2);
  collision.addBox(-0.15, 1.1, 16.55, 0.42, 0.5, 0.16);

  return g;
}
