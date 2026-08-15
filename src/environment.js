import {
  AmbientLight,
  Color,
  DirectionalLight,
  HemisphereLight,
  PMREMGenerator,
  PointLight,
  Scene,
  SpotLight,
  Mesh,
  PlaneGeometry,
  MeshBasicMaterial,
  FogExp2,
} from 'three';
import { PALETTE } from './seed.js';

export function createPMREM(renderer) {
  const probe = new Scene();
  probe.background = new Color(0x1a1814);
  const warm = new Mesh(
    new PlaneGeometry(6, 2),
    new MeshBasicMaterial({ color: 0xe0c090 })
  );
  warm.position.set(0, 2.2, -1);
  const cool = new Mesh(
    new PlaneGeometry(4, 2.4),
    new MeshBasicMaterial({ color: 0x3a6a72 })
  );
  cool.position.set(0, 1.0, -4);
  const dark = new Mesh(
    new PlaneGeometry(3, 2),
    new MeshBasicMaterial({ color: 0x151820 })
  );
  dark.position.set(2.4, 0.4, 1);
  dark.rotation.y = -0.8;
  const hull = new Mesh(
    new PlaneGeometry(5, 3),
    new MeshBasicMaterial({ color: 0xc8c2b0 })
  );
  hull.position.set(-2.2, 1.2, 0.6);
  hull.rotation.y = 0.9;
  probe.add(warm, cool, dark, hull);
  const gen = new PMREMGenerator(renderer);
  const tex = gen.fromScene(probe, 0.04, 0.1, 100).texture;
  gen.dispose();
  return tex;
}

function spot(color, intensity, dist, angle, penumbra) {
  const l = new SpotLight(color, intensity, dist, angle, penumbra, 1.6);
  l.castShadow = false;
  return l;
}

function point(color, intensity, dist) {
  return new PointLight(color, intensity, dist, 2);
}

export function createLighting(scene) {
  const lights = {
    ambient: new AmbientLight(0x3a342c, 0.62),
    hemi: new HemisphereLight(0xc4d0cc, 0x3a3228, 0.82),
    keyControl: spot(0xf0d8a8, 11.5, 9, 0.9, 0.55),
    fillControl: point(0x9ac4c4, 4.6, 8),
    windowFill: spot(0x7ec4cc, 8.5, 8, 0.75, 0.55),
    corridorA: spot(0xf0d090, 8.4, 7, 0.75, 0.5),
    corridorB: spot(0xf0d090, 8.0, 7, 0.75, 0.5),
    crewWarm: spot(0xf4d0a0, 8.2, 7.5, 0.9, 0.55),
    crewRead: point(0xf0c878, 2.2, 3.4),
    engineKey: spot(0xf6d080, 12.5, 10, 0.95, 0.5),
    engineFill: point(0x9aaab4, 5.6, 8),
    engineWork: spot(0xf4d8a0, 8.2, 6, 0.6, 0.45),
    extraFill: point(0xe8d4b0, 3.4, 14),
    restReds: [],
    instruments: [],
    floodL: spot(0x8ec8c4, 14, 32, 0.38, 0.4),
    floodR: spot(0x8ec8c4, 14, 32, 0.38, 0.4),
  };

  lights.keyControl.position.set(0.15, 2.05, 1.6);
  lights.keyControl.target.position.set(0.1, 0.9, 2.4);
  lights.keyControl.castShadow = true;
  lights.keyControl.shadow.mapSize.set(512, 512);
  lights.keyControl.shadow.bias = -0.0004;
  lights.keyControl.shadow.normalBias = 0.04;
  lights.keyControl.shadow.camera.near = 0.3;
  lights.keyControl.shadow.camera.far = 7;

  lights.fillControl.position.set(-0.55, 1.35, 2.1);
  lights.windowFill.position.set(0, 1.25, 0.35);
  lights.windowFill.target.position.set(0, 1.0, 2.2);

  lights.corridorA.position.set(0, 2.02, 5.4);
  lights.corridorA.target.position.set(0, 0.8, 6.1);
  lights.corridorB.position.set(0, 2.02, 7.2);
  lights.corridorB.target.position.set(0, 0.8, 7.8);

  lights.crewWarm.position.set(0.1, 2.0, 10.2);
  lights.crewWarm.target.position.set(0, 0.9, 10.8);
  lights.crewRead.position.set(-0.55, 1.55, 9.3);

  lights.engineKey.position.set(-0.15, 2.08, 18.2);
  lights.engineKey.target.position.set(0.2, 0.7, 19.4);
  lights.engineKey.castShadow = false;

  lights.engineFill.position.set(0.45, 1.4, 17.4);
  lights.engineWork.position.set(-0.35, 1.9, 19.8);
  lights.engineWork.target.position.set(0.1, 0.8, 20.4);

  lights.floodL.position.set(-0.55, 0.95, -0.15);
  lights.floodL.target.position.set(-1.4, -2.2, -8);
  lights.floodR.position.set(0.55, 0.95, -0.15);
  lights.floodR.target.position.set(1.4, -2.2, -8);
  lights.extraFill.position.set(0, 1.4, 11);

  const restA = point(0xa04030, 0.0, 5);
  restA.position.set(0, 1.7, 2.4);
  const restB = point(0xa04030, 0.0, 5);
  restB.position.set(0, 1.7, 10.4);
  const restC = point(0xa04030, 0.0, 6);
  restC.position.set(0, 1.7, 18.6);
  lights.restReds.push(restA, restB, restC);

  for (const l of Object.values(lights)) {
    if (Array.isArray(l)) {
      l.forEach((x) => scene.add(x));
    } else {
      scene.add(l);
      if (l.target) scene.add(l.target);
    }
  }

  scene.background = new Color(PALETTE.waterDeep);
  scene.fog = new FogExp2(0x0c1618, 0.0025);

  lights._base = {
    keyControl: 11.5,
    fillControl: 4.6,
    windowFill: 8.5,
    corridorA: 8.4,
    corridorB: 8.0,
    crewWarm: 8.2,
    crewRead: 2.2,
    engineKey: 12.5,
    engineFill: 5.6,
    engineWork: 8.2,
    ambient: 0.62,
    hemi: 0.82,
    extraFill: 3.4,
  };

  applyLightingState(lights, 'cruising');
  return lights;
}

export function applyLightingState(lights, name) {
  const b = lights._base;
  const set = (key, mul, color) => {
    if (!lights[key]) return;
    lights[key].intensity = b[key] * mul;
    if (color) lights[key].color.set(color);
  };

  lights.restReds.forEach((l) => {
    l.intensity = 0;
  });

  if (name === 'restCycle') {
    set('keyControl', 0.18, 0xc07040);
    set('fillControl', 0.25);
    set('windowFill', 0.7);
    set('corridorA', 0.16, 0xc07040);
    set('corridorB', 0.14, 0xc07040);
    set('crewWarm', 0.22, 0xc87840);
    set('crewRead', 0.35);
    set('engineKey', 0.16, 0xb06038);
    set('engineFill', 0.2);
    set('engineWork', 0.08);
    set('ambient', 0.7);
    set('hemi', 0.45);
    lights.restReds.forEach((l) => {
      l.intensity = 0.55;
      l.color.set(0xa84830);
    });
  } else if (name === 'silentRunning') {
    set('keyControl', 0.35, 0xd8a060);
    set('fillControl', 0.45);
    set('windowFill', 0.85);
    set('corridorA', 0.28, 0xd09050);
    set('corridorB', 0.26, 0xd09050);
    set('crewWarm', 0.32, 0xd09050);
    set('crewRead', 0.4);
    set('engineKey', 0.22, 0xc07040);
    set('engineFill', 0.28);
    set('engineWork', 0.08);
    set('ambient', 0.85);
    set('hemi', 0.55);
    lights.restReds.forEach((l) => {
      l.intensity = 0.42;
      l.color.set(0xa05030);
    });
  } else if (name === 'maintenanceLights') {
    set('keyControl', 1.15, 0xf4e0b8);
    set('fillControl', 1.1);
    set('windowFill', 0.8);
    set('corridorA', 1.2, 0xf4e0b8);
    set('corridorB', 1.2, 0xf4e0b8);
    set('crewWarm', 1.15, 0xf4e0b8);
    set('engineKey', 1.2, 0xf4e0b8);
    set('engineFill', 1.1);
    set('engineWork', 1.3);
    set('ambient', 1.2);
    set('hemi', 1.1);
  } else {
    set('keyControl', 1, 0xf0d8a8);
    set('fillControl', 1);
    set('windowFill', 1);
    set('corridorA', 1, 0xe8c888);
    set('corridorB', 1, 0xe8c888);
    set('crewWarm', 1, 0xf0c890);
    set('crewRead', 1);
    set('engineKey', 1, 0xf2c070);
    set('engineFill', 1);
    set('engineWork', 1);
    set('ambient', 1);
    set('hemi', 1);
  }

  lights._state = name;
}

export function pulseInstruments(lights, amount) {
  lights.instruments.forEach((l) => {
    l.userData.base = l.userData.base ?? l.intensity;
    l.intensity = l.userData.base * (1 + amount);
  });
}
