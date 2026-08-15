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
    ambient: new AmbientLight(0x1c1a16, 0.12),
    hemi: new HemisphereLight(0x8a9aa0, 0x2a221c, 0.18),
    keyControl: spot(0xf0d8a8, 3.4, 8, 0.7, 0.45),
    fillControl: point(0x6aa0a8, 1.1, 6),
    windowFill: spot(0x4a8a92, 2.2, 7, 0.55, 0.5),
    corridorA: spot(0xe8c888, 2.1, 6, 0.55, 0.4),
    corridorB: spot(0xe8c888, 1.8, 6, 0.55, 0.4),
    crewWarm: spot(0xf0c890, 2.0, 6.5, 0.7, 0.5),
    crewRead: point(0xe8b86a, 0.55, 2.4),
    engineKey: spot(0xf2c070, 3.6, 9, 0.75, 0.4),
    engineFill: point(0x6a7a88, 1.3, 7),
    engineWork: spot(0xf0d090, 2.2, 5, 0.45, 0.35),
    restReds: [],
    instruments: [],
    floodL: spot(0x8ec8c4, 6.5, 28, 0.32, 0.35),
    floodR: spot(0x8ec8c4, 6.5, 28, 0.32, 0.35),
  };

  lights.keyControl.position.set(0.15, 2.05, 1.6);
  lights.keyControl.target.position.set(0.1, 0.9, 2.4);
  lights.keyControl.castShadow = true;
  lights.keyControl.shadow.mapSize.set(1024, 1024);
  lights.keyControl.shadow.bias = -0.00025;
  lights.keyControl.shadow.normalBias = 0.02;
  lights.keyControl.shadow.camera.near = 0.2;
  lights.keyControl.shadow.camera.far = 8;

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
  lights.engineKey.castShadow = true;
  lights.engineKey.shadow.mapSize.set(1024, 1024);
  lights.engineKey.shadow.bias = -0.0003;
  lights.engineKey.shadow.normalBias = 0.025;
  lights.engineKey.shadow.camera.near = 0.3;
  lights.engineKey.shadow.camera.far = 10;

  lights.engineFill.position.set(0.45, 1.4, 17.4);
  lights.engineWork.position.set(-0.35, 1.9, 19.8);
  lights.engineWork.target.position.set(0.1, 0.8, 20.4);

  lights.floodL.position.set(-0.55, 0.95, -0.15);
  lights.floodL.target.position.set(-1.4, -2.2, -8);
  lights.floodR.position.set(0.55, 0.95, -0.15);
  lights.floodR.target.position.set(1.4, -2.2, -8);

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
  scene.fog = new FogExp2(0x0a1214, 0.012);

  lights._base = {
    keyControl: 3.4,
    fillControl: 1.1,
    windowFill: 2.2,
    corridorA: 2.1,
    corridorB: 1.8,
    crewWarm: 2.0,
    crewRead: 0.55,
    engineKey: 3.6,
    engineFill: 1.3,
    engineWork: 2.2,
    ambient: 0.12,
    hemi: 0.18,
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
