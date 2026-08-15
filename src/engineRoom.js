import * as THREE from "three";
import { beveledBox, beveledPanel, setShadow } from "./geom.js";
import {
  createMotorHousing,
  createPump,
  createCompressor,
  createCabinet,
  createPipeRun,
  createValveAssembly,
  createGauge,
  createCableTray,
  createFan,
  createFloorGrate,
  createUnderfloorPipes,
  createHandrail,
  createLightFixture,
  createWarningPlate,
  createAccessPanel,
  createJunctionBox,
  createSwitchBank,
} from "./machinery.js";
import { createDisplayTexture, createLabelTexture } from "./materials.js";

export function buildEngineRoom(mats, collision, ctx) {
  const g = new THREE.Group();
  g.name = "engineRoom";

  const motor = createMotorHousing(mats, 1.45, 0.4);
  motor.position.set(-0.72, 0.62, 19.35);
  motor.rotation.y = 0;
  g.add(motor);
  collision.addAABB(-0.72, 0.7, 19.35, 0.82, 1.15, 1.7, "motor");

  const gear = new THREE.Mesh(beveledBox(0.55, 0.42, 0.48, 0.02), mats.oilyMachinery);
  gear.position.set(-0.72, 0.38, 20.25);
  const gearLid = new THREE.Mesh(beveledPanel(0.4, 0.28, 0.02, 0.012, 0.004), mats.chippedPaint);
  gearLid.position.set(-0.72, 0.62, 20.25);
  gearLid.rotation.x = -Math.PI / 2;
  g.add(gear, gearLid);
  collision.addAABB(-0.72, 0.4, 20.25, 0.55, 0.5, 0.52, "gear");

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.9, 14), mats.brushedMetal);
  shaft.rotation.x = Math.PI / 2;
  shaft.position.set(-0.72, 0.38, 20.85);
  const bearing = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 12), mats.oilyMachinery);
  bearing.rotation.x = Math.PI / 2;
  bearing.position.set(-0.72, 0.38, 21.2);
  g.add(shaft, bearing);

  const pump1 = createPump(mats, 1.05);
  pump1.position.set(0.72, 0.28, 17.35);
  g.add(pump1);
  const pump2 = createPump(mats, 0.9);
  pump2.position.set(0.78, 0.26, 18.15);
  g.add(pump2);
  collision.addAABB(0.72, 0.35, 17.35, 0.5, 0.7, 0.45, "pump1");
  collision.addAABB(0.78, 0.32, 18.15, 0.45, 0.65, 0.4, "pump2");

  const comp = createCompressor(mats);
  comp.position.set(0.7, 0.0, 19.15);
  g.add(comp);
  collision.addAABB(0.7, 0.25, 19.15, 0.7, 0.55, 0.4, "comp");

  const cab1 = createCabinet(mats, 0.48, 1.2, 0.26);
  cab1.position.set(0.92, 0, 20.15);
  cab1.rotation.y = -0.15;
  g.add(cab1);
  const cab2 = createCabinet(mats, 0.42, 1.05, 0.24);
  cab2.position.set(0.88, 0, 20.75);
  g.add(cab2);
  collision.addAABB(0.9, 0.6, 20.4, 0.5, 1.25, 0.9, "cabs");

  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.7, 16), mats.hullGreen);
  tank.position.set(-0.95, 0.55, 17.15);
  const tankBand = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.015, 8, 16), mats.brushedMetal);
  tankBand.position.copy(tank.position);
  g.add(tank, tankBand);
  collision.addAABB(-0.95, 0.55, 17.15, 0.4, 0.8, 0.4, "tank");

  const hx = new THREE.Mesh(beveledBox(0.35, 0.32, 0.7, 0.015), mats.oilyMachinery);
  hx.position.set(-0.95, 0.85, 18.05);
  g.add(hx);
  for (let i = 0; i < 6; i++) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.62, 8), mats.pipeBlue);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(-1.05 + (i % 3) * 0.07, 0.78 + Math.floor(i / 3) * 0.12, 18.05);
    g.add(tube);
  }

  const pipes = [
    new THREE.Mesh(
      createPipeRun(
        [
          [-0.95, 1.15, 17.15],
          [-0.95, 1.55, 17.15],
          [-0.95, 1.7, 18.2],
          [-0.7, 1.75, 19.0],
          [-0.55, 1.15, 19.2],
        ],
        0.032,
        8,
        28
      ),
      mats.pipeBlue
    ),
    new THREE.Mesh(
      createPipeRun(
        [
          [0.72, 0.42, 17.35],
          [0.4, 0.55, 17.35],
          [0.2, 1.65, 17.4],
          [-0.2, 1.75, 18.5],
          [-0.45, 1.1, 19.0],
        ],
        0.028,
        8,
        28
      ),
      mats.pipeOrange
    ),
    new THREE.Mesh(
      createPipeRun(
        [
          [0.7, 0.35, 19.15],
          [0.2, 0.55, 19.4],
          [-0.2, 0.55, 19.6],
          [-0.45, 0.55, 19.7],
        ],
        0.025,
        7,
        20
      ),
      mats.paintedPipe
    ),
    new THREE.Mesh(
      createPipeRun(
        [
          [0.55, 1.85, 16.3],
          [0.55, 1.85, 21.3],
        ],
        0.04,
        8,
        16
      ),
      mats.pipeBlue
    ),
    new THREE.Mesh(
      createPipeRun(
        [
          [-0.7, 1.9, 16.3],
          [-0.7, 1.9, 21.3],
        ],
        0.022,
        7,
        14
      ),
      mats.paintedPipe
    ),
  ];
  pipes.forEach((p) => g.add(p));

  const v1 = createValveAssembly(mats, 1.1, "pipeBlue");
  v1.position.set(-0.95, 1.55, 17.6);
  g.add(v1);
  const v2 = createValveAssembly(mats, 1, "pipeOrange");
  v2.position.set(0.25, 1.55, 17.55);
  g.add(v2);
  const v3 = createValveAssembly(mats, 0.9, "paintedPipe");
  v3.position.set(0.15, 0.55, 19.45);
  g.add(v3);

  ["OIL", "HYD", "CW", "AIR", "LUBE"].forEach((label, i) => {
    const gg = createGauge(mats, label, 0.28 + i * 0.1);
    gg.position.set(-0.15 + (i % 3) * 0.16, 1.35 + Math.floor(i / 3) * 0.18, 18.55);
    gg.scale.setScalar(0.72);
    g.add(gg);
  });

  const tray = createCableTray(4.8, mats, 0.2);
  tray.position.set(0.28, 2.02, 18.8);
  g.add(tray);

  const fan1 = createFan(mats, 0.1);
  fan1.position.set(0.95, 1.55, 17.8);
  fan1.rotation.y = -Math.PI / 2;
  g.add(fan1);
  const fan2 = createFan(mats, 0.08);
  fan2.position.set(-1.05, 1.35, 20.4);
  fan2.rotation.y = Math.PI / 2;
  g.add(fan2);
  ctx.spinners.push(fan1, fan2, pump1, pump2);

  const catwalk = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 2.2), mats.antiSlip);
  catwalk.position.set(0.05, 0.42, 19.7);
  g.add(catwalk);
  const grate = createFloorGrate(0.62, 1.1, mats);
  grate.position.set(0.05, 0.03, 17.7);
  g.add(grate);
  const under = createUnderfloorPipes(0.62, 1.1, mats, 19);
  under.position.set(0.05, 0.0, 17.7);
  g.add(under);

  const railL = createHandrail(2.0, mats);
  railL.position.set(-0.28, 0.95, 19.7);
  const railR = createHandrail(2.0, mats);
  railR.position.set(0.38, 0.95, 19.7);
  g.add(railL, railR);
  collision.addAABB(-0.28, 0.8, 19.7, 0.06, 0.4, 2.0, "railL");
  collision.addAABB(0.38, 0.8, 19.7, 0.06, 0.4, 2.0, "railR");

  const step = new THREE.Mesh(beveledBox(0.55, 0.12, 0.28, 0.01), mats.chippedPaint);
  step.position.set(0.05, 0.08, 18.45);
  g.add(step);

  const tool = createCabinet(mats, 0.36, 0.85, 0.22);
  tool.position.set(-0.95, 0, 20.85);
  g.add(tool);
  collision.addAABB(-0.95, 0.45, 20.85, 0.38, 0.9, 0.24, "tools");

  const panel = new THREE.Group();
  const body = new THREE.Mesh(beveledBox(0.48, 0.62, 0.16, 0.012), mats.hullGreen);
  body.position.y = 0.95;
  panel.add(body);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.36, 0.2),
    new THREE.MeshStandardMaterial({
      map: ctx.displays.status.texture,
      emissive: 0x0a1c12,
      emissiveMap: ctx.displays.status.texture,
      emissiveIntensity: 0.5,
      roughness: 0.35,
    })
  );
  face.position.set(0, 1.08, 0.09);
  panel.add(face);
  const sw = createSwitchBank(mats, 7);
  sw.position.set(0, 0.82, 0.09);
  panel.add(sw);
  panel.position.set(0.55, 0, 16.55);
  panel.rotation.y = Math.PI;
  g.add(panel);

  const interact = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.7, 0.3),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  interact.position.set(0.55, 0.95, 16.55);
  interact.userData.interact = { id: "silentRunning", prompt: "E: Silent Running" };
  g.add(interact);
  ctx.interactables.push(interact);

  const beam = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.08), mats.brushedMetal);
  beam.position.set(0, 2.0, 18.4);
  g.add(beam);
  const beam2 = beam.clone();
  beam2.position.z = 20.2;
  g.add(beam2);

  const fix1 = createLightFixture(mats);
  fix1.position.set(0.15, 2.08, 17.4);
  const fix2 = createLightFixture(mats);
  fix2.position.set(-0.2, 2.08, 19.2);
  const fix3 = createLightFixture(mats);
  fix3.position.set(0.1, 2.08, 20.6);
  g.add(fix1, fix2, fix3);

  const warn = createWarningPlate("PROPULSION\nSPACE", mats);
  warn.position.set(-0.45, 1.7, 16.22);
  g.add(warn);

  const aftStack = new THREE.Mesh(beveledBox(1.6, 1.15, 0.45, 0.02), mats.oilyMachinery);
  aftStack.position.set(0.05, 0.7, 21.35);
  g.add(aftStack);
  collision.addAABB(0.05, 0.7, 21.35, 1.65, 1.2, 0.5, "aft-stack");

  const aftFan = createFan(mats, 0.12);
  aftFan.position.set(0.35, 1.25, 21.1);
  g.add(aftFan);
  ctx.spinners.push(aftFan);

  const jbox = createJunctionBox(mats, 0.22, 0.18, 0.08);
  jbox.position.set(-1.05, 1.25, 18.6);
  jbox.rotation.y = Math.PI / 2;
  g.add(jbox);

  const access = createAccessPanel(mats, 0.3, 0.22);
  access.position.set(-0.55, 0.85, 19.35);
  g.add(access);

  const drip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.01, 0.22), mats.wetMetal);
  drip.position.set(-0.55, 0.02, 19.7);
  g.add(drip);

  ctx.rooms.engine = g;
  return g;
}
