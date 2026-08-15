import * as THREE from "three";
import { PALETTE } from "./layout.js";

export function createReflectionEnv(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x14110e);

  const warm = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xffc888 })
  );
  warm.position.set(0, 4, 2);
  scene.add(warm);

  const cool = new THREE.Mesh(
    new THREE.SphereGeometry(3.5, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0x245060 })
  );
  cool.position.set(0, 1, -8);
  scene.add(cool);

  const dark = new THREE.Mesh(
    new THREE.BoxGeometry(4, 2, 3),
    new THREE.MeshBasicMaterial({ color: 0x15181c })
  );
  dark.position.set(3, 0, 6);
  scene.add(dark);

  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(6, 3, 1),
    new THREE.MeshBasicMaterial({ color: 0xc4bfb0 })
  );
  hull.position.set(-2, 2, 3);
  scene.add(hull);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(scene, 0.04, 0.1, 80).texture;
  pmrem.dispose();
  return tex;
}

export function buildLights(parent, ctx) {
  const lights = {
  hemi: new THREE.HemisphereLight(0xc8c2b0, 0x1a1612, 0.28),
  ambient: new THREE.AmbientLight(0x2a2620, 0.14),
    controlKey: new THREE.SpotLight(0xffd2a0, 11.5, 8.5, 0.78, 0.42, 1.05),
    controlFill: new THREE.PointLight(0x88c8d4, 3.6, 7.0, 1.2),
    corridorA: new THREE.PointLight(0xffd0a8, 5.2, 5.8, 1.15),
    corridorB: new THREE.PointLight(0xffd0a8, 5.0, 5.6, 1.15),
    corridorCool: new THREE.PointLight(0x6aa8b8, 2.4, 5.0, 1.3),
    crewKey: new THREE.SpotLight(0xffc890, 8.0, 7.0, 0.9, 0.48, 1.1),
    crewFill: new THREE.PointLight(0xffe0b8, 3.4, 6.0, 1.2),
    engineKey: new THREE.SpotLight(0xffc070, 13.0, 9.5, 0.7, 0.38, 1.0),
    engineFill: new THREE.PointLight(0x7aa0b0, 4.0, 7.5, 1.15),
    engineWork: new THREE.PointLight(0xffd090, 5.2, 6.0, 1.05),
    restReds: [],
  };

  lights.controlKey.position.set(0.1, 2.05, 2.3);
  lights.controlKey.target.position.set(0, 0.9, 1.3);
  lights.controlKey.castShadow = false;
  lights.controlKey.shadow.mapSize.set(512, 512);
  lights.controlKey.shadow.bias = -0.00025;
  lights.controlKey.shadow.normalBias = 0.03;
  lights.controlKey.shadow.camera.near = 0.2;
  lights.controlKey.shadow.camera.far = 8;

  lights.controlFill.position.set(0.0, 1.4, 0.55);

  lights.corridorA.position.set(0, 1.85, 5.7);
  lights.corridorB.position.set(0, 1.85, 7.15);
  const corridorFill = new THREE.PointLight(0xffe0c0, 4.2, 4.8, 1.1);
  corridorFill.position.set(0.1, 1.55, 6.2);
  parent.add(corridorFill);
  lights.corridorFill = corridorFill;
  lights.corridorCool.position.set(1.0, 1.4, 6.55);

  lights.crewKey.position.set(0.1, 2.05, 10.4);
  lights.crewKey.target.position.set(-0.2, 0.8, 10.6);
  lights.crewKey.castShadow = false;
  lights.crewKey.shadow.mapSize.set(256, 256);
  lights.crewKey.shadow.bias = -0.0003;
  lights.crewKey.shadow.normalBias = 0.035;

  lights.crewFill.position.set(0.8, 1.5, 12.0);

  lights.engineKey.position.set(0.15, 2.08, 18.6);
  lights.engineKey.target.position.set(-0.3, 0.7, 19.6);
  lights.engineKey.castShadow = true;
  lights.engineKey.shadow.mapSize.set(512, 512);
  lights.engineKey.shadow.bias = -0.00022;
  lights.engineKey.shadow.normalBias = 0.03;
  lights.engineKey.shadow.camera.far = 10;

  lights.engineFill.position.set(0.6, 1.2, 20.2);
  lights.engineWork.position.set(-0.4, 1.8, 17.6);

  for (const z of [2.2, 6.3, 10.5, 14.6, 18.8]) {
    const r = new THREE.PointLight(0xa03020, 0.0, 4.5, 1.6);
    r.position.set(0, 1.85, z);
    lights.restReds.push(r);
    parent.add(r);
  }

  Object.values(lights).forEach((l) => {
    if (l.isLight) parent.add(l);
    if (l.target) parent.add(l.target);
  });

  ctx.lights = lights;
  ctx.baseIntensities = {
    controlKey: 11.5,
    controlFill: 3.6,
    corridorA: 5.2,
    corridorB: 5.0,
    corridorCool: 2.4,
    corridorFill: 4.2,
    crewKey: 8.0,
    crewFill: 3.4,
    engineKey: 13.0,
    engineFill: 4.0,
    engineWork: 5.2,
    hemi: 0.28,
    ambient: 0.14,
  };

  return lights;
}

export function applyLightingState(ctx, state) {
  const L = ctx.lights;
  const B = ctx.baseIntensities;
  const set = (name, mul) => {
    if (L[name]) L[name].intensity = B[name] * mul;
  };

  L.restReds.forEach((r) => {
    r.intensity = 0;
  });

  if (state === "restCycle") {
    set("controlKey", 0.18);
    set("controlFill", 0.35);
    set("corridorA", 0.15);
    set("corridorB", 0.15);
    set("corridorCool", 0.25);
    set("crewKey", 0.22);
    set("crewFill", 0.2);
    set("engineKey", 0.16);
    set("engineFill", 0.25);
    set("engineWork", 0.12);
    set("hemi", 0.35);
    L.restReds.forEach((r) => {
      r.intensity = 1.15;
      r.color.setHex(0xa04018);
    });
  } else if (state === "silentRunning") {
    set("controlKey", 0.42);
    set("controlFill", 0.55);
    set("corridorA", 0.28);
    set("corridorB", 0.28);
    set("corridorCool", 0.4);
    set("crewKey", 0.35);
    set("crewFill", 0.3);
    set("engineKey", 0.22);
    set("engineFill", 0.45);
    set("engineWork", 0.12);
    set("hemi", 0.55);
    L.restReds.forEach((r) => {
      r.intensity = 0.85;
      r.color.setHex(0x8a2a14);
    });
  } else if (state === "maintenanceLights") {
    set("controlKey", 1.15);
    set("controlFill", 1.1);
    set("corridorA", 1.2);
    set("corridorB", 1.2);
    set("corridorCool", 0.7);
    set("crewKey", 1.15);
    set("crewFill", 1.1);
    set("engineKey", 1.2);
    set("engineFill", 1.1);
    set("engineWork", 1.25);
    set("hemi", 1.1);
  } else {
    Object.keys(B).forEach((k) => set(k, 1));
  }

  ctx.submarineState = state;
}

export function createInteriorFog() {
  return new THREE.FogExp2(0x0c0b0a, 0.018);
}
