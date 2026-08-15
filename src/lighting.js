import * as THREE from 'three';
import { LAYOUT, ROOMS } from './layout.js';

export function createLighting(scene) {
  const group = new THREE.Group();
  group.name = 'lighting';

  const hemi = new THREE.HemisphereLight(0xb8c4c0, 0x1a1612, 0.18);
  group.add(hemi);

  const ambient = new THREE.AmbientLight(0x6a645c, 0.07);
  group.add(ambient);

  const keyControl = makeSpot(0xffe2b0, 7.5, 10, 0.55, 0.35);
  keyControl.position.set(0.15, 2.05, 11.1);
  keyControl.target.position.set(0, 0.9, 10.6);
  keyControl.castShadow = true;
  configureShadow(keyControl, 8, 1024);
  group.add(keyControl, keyControl.target);

  const keyEngine = makeSpot(0xffd6a0, 9.5, 12, 0.7, 0.4);
  keyEngine.position.set(-0.1, 2.08, -4.4);
  keyEngine.target.position.set(0.1, 0.7, -5.6);
  keyEngine.castShadow = true;
  configureShadow(keyEngine, 10, 1024);
  group.add(keyEngine, keyEngine.target);

  const fills = [];
  const practicals = [];
  const reds = [];
  const windowFills = [];

  const warmPoints = [
    [0, 2.0, 10.8, 1.15, 4.2],
    [0.35, 1.95, 7.2, 0.7, 3.4],
    [-0.1, 1.95, 6.2, 0.55, 3.2],
    [0.2, 1.92, 3.4, 0.85, 3.6],
    [0.15, 1.9, 2.2, 0.55, 3.0],
    [0, 1.98, -0.2, 0.6, 3.2],
    [0.25, 2.0, -3.2, 1.0, 4.0],
    [-0.2, 1.85, -6.2, 0.75, 3.6],
  ];
  for (const [x, y, z, i, dist] of warmPoints) {
    const p = new THREE.PointLight(0xffd4a4, i, dist, 2);
    p.position.set(x, y, z);
    group.add(p);
    practicals.push(p);
  }

  const cools = [
    [0, 1.2, 12.35, 0x6aa8b8, 0.85, 3.8],
    [0.55, 1.35, 7.55, 0x5a90a0, 0.35, 2.4],
    [0.55, 1.3, 3.15, 0x5a90a0, 0.28, 2.2],
  ];
  for (const [x, y, z, c, i, d] of cools) {
    const p = new THREE.PointLight(c, i, d, 2);
    p.position.set(x, y, z);
    group.add(p);
    windowFills.push(p);
  }

  const instrument = new THREE.PointLight(0x3d8a58, 0.35, 2.8, 2);
  instrument.position.set(-0.35, 1.15, 10.55);
  group.add(instrument);
  fills.push(instrument);

  const panelGlow = new THREE.PointLight(0xd09a28, 0.28, 2.4, 2);
  panelGlow.position.set(0.4, 1.05, -2.1);
  group.add(panelGlow);
  fills.push(panelGlow);

  for (const z of [11.4, 8.4, 6.4, 3.6, 0.2, -3.6, -6.6]) {
    const r = new THREE.PointLight(0x8a2a1c, 0.0, 3.2, 2);
    r.position.set(-0.45, 1.85, z);
    group.add(r);
    reds.push(r);
  }

  scene.add(group);

  const state = {
    group,
    hemi,
    ambient,
    keyControl,
    keyEngine,
    practicals,
    fills,
    reds,
    windowFills,
    instrument,
    mode: 'cruising',
    base: {
      hemi: 0.18,
      ambient: 0.07,
      keyC: 7.5,
      keyE: 9.5,
      practical: practicals.map((p) => p.intensity),
      window: windowFills.map((p) => p.intensity),
      instrument: 0.35,
    },
  };

  return state;
}

function makeSpot(color, intensity, distance, angle, penumbra) {
  const s = new THREE.SpotLight(color, intensity, distance, angle, penumbra, 1.6);
  return s;
}

function configureShadow(light, camSize, mapSize) {
  light.shadow.mapSize.set(mapSize, mapSize);
  light.shadow.bias = -0.00018;
  light.shadow.normalBias = 0.03;
  light.shadow.camera.near = 0.2;
  light.shadow.camera.far = 12;
  light.shadow.camera.left = -camSize / 2;
  light.shadow.camera.right = camSize / 2;
  light.shadow.camera.top = camSize / 2;
  light.shadow.camera.bottom = -camSize / 2;
}

export function applyLightState(lights, name) {
  const b = lights.base;
  lights.mode = name;
  const setPrac = (scale) => {
    lights.practicals.forEach((p, i) => {
      p.intensity = b.practical[i] * scale;
    });
  };
  const setRed = (v) => {
    lights.reds.forEach((p) => {
      p.intensity = v;
    });
  };

  if (name === 'cruising' || name === 'used' || name === 'clean') {
    lights.hemi.intensity = b.hemi;
    lights.ambient.intensity = b.ambient;
    lights.keyControl.intensity = b.keyC;
    lights.keyEngine.intensity = b.keyE;
    setPrac(1);
    setRed(0);
    lights.instrument.intensity = b.instrument;
    lights.windowFills.forEach((p, i) => {
      p.intensity = b.window[i];
    });
  } else if (name === 'restCycle') {
    lights.hemi.intensity = 0.06;
    lights.ambient.intensity = 0.03;
    lights.keyControl.intensity = 0.8;
    lights.keyEngine.intensity = 1.1;
    setPrac(0.18);
    setRed(0.22);
    lights.instrument.intensity = 0.2;
  } else if (name === 'silentRunning') {
    lights.hemi.intensity = 0.07;
    lights.ambient.intensity = 0.035;
    lights.keyControl.intensity = 1.6;
    lights.keyEngine.intensity = 1.4;
    setPrac(0.22);
    setRed(0.32);
    lights.instrument.intensity = 0.28;
  } else if (name === 'maintenanceLights') {
    lights.hemi.intensity = 0.22;
    lights.ambient.intensity = 0.1;
    lights.keyControl.intensity = 10;
    lights.keyEngine.intensity = 12;
    setPrac(1.25);
    setRed(0);
    lights.instrument.intensity = 0.4;
  }
}

export function roomIdForZ(z) {
  if (z >= ROOMS.control.z0) return 'control';
  if (z >= ROOMS.corridor.z0) return 'corridor';
  if (z >= ROOMS.crew.z0) return 'crew';
  if (z >= ROOMS.passage.z0) return 'passage';
  return 'engine';
}

export { LAYOUT };
