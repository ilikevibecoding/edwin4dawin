import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ZONES } from './layout.js';

export function createEnvironment(renderer, scene, mats) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  tintRoom(room);
  const envTex = pmrem.fromScene(room, 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.42;
  room.dispose();

  scene.fog = new THREE.Fog(0x1a1c18, 9.5, 22);

  const lights = {
    ambient: new THREE.AmbientLight(0x3a3c36, 0.32),
    hemi: new THREE.HemisphereLight(0x8a8e80, 0x2a261e, 0.42),
    fixtures: [],
    windowSpill: null,
    work: [],
    rest: [],
    silent: [],
    instruments: [],
  };
  scene.add(lights.ambient, lights.hemi);

  addWarm(scene, lights, 0, 2.08, -8.3, 5.2, 5.2);
  addWarm(scene, lights, 0.15, 2.06, -4.1, 4.0, 4.6);
  addWarm(scene, lights, -0.1, 2.04, 0.2, 3.6, 4.2);
  addWarm(scene, lights, 0.1, 2.06, 3.6, 3.2, 4.0);
  addWarm(scene, lights, -0.15, 2.08, 7.3, 5.0, 5.0, true);
  addWarm(scene, lights, 0.2, 2.08, 9.2, 4.6, 4.8, true);

  const windowSpill = new THREE.PointLight(0x4aa0b0, 2.1, 6.2, 1.4);
  windowSpill.position.set(0, 1.4, -9.9);
  scene.add(windowSpill);
  lights.windowSpill = windowSpill;
  const viewportFill = new THREE.PointLight(0xffe0b4, 2.4, 4.5, 1.3);
  viewportFill.position.set(0.15, 1.7, -9.2);
  scene.add(viewportFill);
  lights.fixtures.push(viewportFill);

  const crewRead = new THREE.PointLight(0xffd0a0, 1.15, 3.2, 1.6);
  crewRead.position.set(-0.45, 1.45, -1.05);
  scene.add(crewRead);
  lights.fixtures.push(crewRead);
  const crewRead2 = new THREE.PointLight(0xffc890, 0.95, 3.0, 1.6);
  crewRead2.position.set(-0.45, 1.45, 0.55);
  scene.add(crewRead2);
  lights.fixtures.push(crewRead2);
  const galleyLight = new THREE.PointLight(0xffe0b8, 0.85, 2.8, 1.7);
  galleyLight.position.set(0.55, 1.7, 1.85);
  scene.add(galleyLight);
  lights.fixtures.push(galleyLight);

  const portholeSpill = new THREE.PointLight(0x3a8898, 0.55, 3.2, 1.8);
  portholeSpill.position.set(0.85, 1.42, -4.85);
  scene.add(portholeSpill);
  lights.fixtures.push(portholeSpill);

  const inst = new THREE.PointLight(0x3dff7a, 0.28, 2.4, 2);
  inst.position.set(0.7, 1.25, -7.5);
  scene.add(inst);
  lights.instruments.push(inst);

  const aftAmber = new THREE.PointLight(0xff7040, 0.0, 6, 1.6);
  aftAmber.position.set(0.1, 1.6, 8.2);
  scene.add(aftAmber);
  lights.silent.push(aftAmber);

  const rest1 = new THREE.PointLight(0xff6030, 0.0, 5, 1.8);
  rest1.position.set(0, 1.8, -1.0);
  scene.add(rest1);
  lights.rest.push(rest1);
  const rest2 = new THREE.PointLight(0xff7040, 0.0, 5, 1.8);
  rest2.position.set(0, 1.7, -8.0);
  scene.add(rest2);
  lights.rest.push(rest2);

  const keyShadow = new THREE.SpotLight(0xffe2b0, 7.2, 10, 0.78, 0.4, 1.1);
  keyShadow.position.set(0.2, 2.15, -7.4);
  keyShadow.target.position.set(0, 0.4, -8.4);
  keyShadow.castShadow = true;
  keyShadow.shadow.mapSize.set(1024, 1024);
  keyShadow.shadow.bias = -0.00025;
  keyShadow.shadow.normalBias = 0.03;
  keyShadow.shadow.camera.near = 0.3;
  keyShadow.shadow.camera.far = 8;
  scene.add(keyShadow, keyShadow.target);
  lights.fixtures.push(keyShadow);

  const machShadow = new THREE.SpotLight(0xffd8a0, 8.5, 11, 0.82, 0.38, 1.1);
  machShadow.position.set(-0.1, 2.16, 7.6);
  machShadow.target.position.set(0.1, 0.4, 9.0);
  machShadow.castShadow = true;
  machShadow.shadow.mapSize.set(1024, 1024);
  machShadow.shadow.bias = -0.00028;
  machShadow.shadow.normalBias = 0.035;
  scene.add(machShadow, machShadow.target);
  lights.work.push(machShadow);

  lights._warmBase = lights.fixtures.filter((l) => l.isPointLight || l.isSpotLight).map((l) => l.intensity);
  lights.keyShadow = keyShadow;
  lights.machShadow = machShadow;

  const states = {
    cruising: { warm: 1, rest: 0, silent: 0, work: 1, window: 1, ambient: 0.32 },
    restCycle: { warm: 0.22, rest: 0.6, silent: 0, work: 0.18, window: 0.7, ambient: 0.14 },
    silentRunning: { warm: 0.28, rest: 0.1, silent: 0.75, work: 0.16, window: 0.85, ambient: 0.16 },
    maintenanceLights: { warm: 1.25, rest: 0, silent: 0, work: 1.35, window: 1, ambient: 0.4 },
    clean: { warm: 1, rest: 0, silent: 0, work: 1, window: 1, ambient: 0.34 },
    used: { warm: 1, rest: 0, silent: 0, work: 1, window: 1, ambient: 0.32 },
  };

  function applyState(name, blend = 1) {
    const s = states[name] || states.cruising;
    lights.ambient.intensity = s.ambient;
    lights.fixtures.forEach((l) => {
      if (l === keyShadow) l.intensity = 7.2 * s.warm;
      else if (l.isPointLight) l.intensity = Math.max(0.05, l.userData.base * s.warm);
    });
    lights.work.forEach((l) => {
      l.intensity = (l === machShadow ? 8.5 : 3.4) * s.work;
    });
    lights.rest.forEach((l) => {
      l.intensity = 1.1 * s.rest;
    });
    lights.silent.forEach((l) => {
      l.intensity = 1.35 * s.silent;
    });
    if (lights.windowSpill) lights.windowSpill.intensity = 1.15 * s.window;
    scene.fog.far = name === 'restCycle' ? 16 : 22;
    scene.fog.color.set(name === 'silentRunning' ? 0x1c1412 : 0x1a1c18);
  }

  lights.fixtures.forEach((l) => {
    if (l.isPointLight) l.userData.base = l.intensity;
  });

  applyState('cruising');

  return { lights, applyState, envTex, pmrem };
}

function addWarm(scene, lights, x, y, z, intensity, distance, isWork = false) {
  const l = new THREE.PointLight(0xffd2a4, intensity * 0.38, distance, 1.45);
  l.position.set(x, y, z);
  scene.add(l);
  if (isWork) lights.work.push(l);
  else lights.fixtures.push(l);
}

function tintRoom(room) {
  room.traverse((o) => {
    if (o.isMesh && o.material) {
      if (o.material.color) {
        const c = o.material.color;
        c.offsetHSL(0.02, -0.15, -0.08);
      }
    }
  });
}

export function zoneAt(z) {
  if (z < ZONES.corridor.z0) return 'control';
  if (z < ZONES.crew.z0) return 'corridor';
  if (z < ZONES.electrical.z0) return 'crew';
  if (z < ZONES.engine.z0) return 'electrical';
  return 'engine';
}
