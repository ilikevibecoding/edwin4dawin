/**
 * Chapter 1 — a tower rooftop in the rain, twelve floors up.
 * Wet concrete, a smashed skylight, a city that never turns its lights off, and
 * a police drone circling with a searchlight.
 */
import * as THREE from 'three';
import { Sky, envPanel } from '../engine/sky';
import { WetGround } from '../engine/wetground';
import { Lightning, Rain } from '../engine/weather';
import { DustMotes, VolumeCone, glowSprite } from '../engine/volumetric';
import { dirLight, spotLight } from '../engine/lighting';
import { MAT, barricade, box, cyl, neonSign, puddle, railing, rooftopClutter, scatterDebris, skyline, streetLamp } from './kit';
import type { GameSet, SetContext } from './types';

export function buildRooftop(ctx: SetContext): GameSet {
  const { quality: q, renderer } = ctx;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.08, 600);

  /* ---------------------------------------------------------------- sky */
  const sky = new Sky({
    top: 0x03060c,
    horizon: 0x122436,
    ground: 0x05080c,
    clouds: 0.85,
    cloudColor: 0x1b2b3c,
    cityGlow: 0.85,
    cityGlowColor: 0x2f4a66,
    sun: new THREE.Vector3(-0.45, 0.22, -1),
    sunColor: 0x8fb4d8,
    sunSize: 0.03,
  });
  scene.add(sky.mesh);
  scene.fog = new THREE.FogExp2(0x0a1522, 0.019);

  const env = sky.buildEnvironment(renderer, [
    envPanel(0x2f79ff, 2.2, 40, 26, new THREE.Vector3(-40, 10, -30)),
    envPanel(0xff5a3c, 1.1, 30, 18, new THREE.Vector3(38, 8, 24)),
    envPanel(0x64e0ff, 1.4, 26, 14, new THREE.Vector3(6, 6, 40)),
  ]);
  scene.environment = env;
  scene.environmentIntensity = 0.85;

  /* -------------------------------------------------------------- ground */
  const ground = new WetGround({
    size: 62,
    resolution: q.reflectionScale,
    wetness: 0.95,
    reflectStrength: 0.75,
    texRepeat: 16,
    color: 0x8f979e,
  });
  scene.add(ground.mesh);

  // Roof edge: a low parapet all the way round with a gap for the drop.
  const parapetMat = MAT.concrete(3, 0.075);
  const roofHalf = 15;
  for (const [x, z, w, d] of [
    [0, -roofHalf, roofHalf * 2, 0.5],
    [-roofHalf, 0, 0.5, roofHalf * 2],
    [roofHalf, 0, 0.5, roofHalf * 2],
  ] as const) {
    scene.add(box(w, 1.0, d, parapetMat, [x, 0.5, z]));
  }
  // Front edge: broken parapet with a gap where the hostage stands.
  scene.add(box(11, 1.0, 0.5, parapetMat, [-9.5, 0.5, roofHalf]));
  scene.add(box(11, 1.0, 0.5, parapetMat, [9.5, 0.5, roofHalf]));
  scene.add(box(2.2, 0.34, 0.5, parapetMat, [0, 0.17, roofHalf]));

  scene.add(rooftopClutter(3, 11.5));
  scene.add(scatterDebris(24, 9, 12));

  // Smashed skylight / roof access.
  const accessMat = MAT.concrete(2, 0.06);
  const hut = new THREE.Group();
  hut.add(box(3.2, 2.6, 2.6, accessMat, [0, 1.3, 0]));
  hut.add(box(3.5, 0.16, 2.9, accessMat, [0, 2.66, 0]));
  const doorFrame = box(1.1, 2.05, 0.14, MAT.metal(1, 0.12), [0, 1.02, 1.32]);
  hut.add(doorFrame);
  const doorGlow = box(0.95, 1.9, 0.05, MAT.neon(0xffd9a8, 1.5), [0, 0.98, 1.4]);
  hut.add(doorGlow);
  hut.position.set(-7.5, 0, -6);
  hut.rotation.y = 0.3;
  scene.add(hut);
  const doorLight = new THREE.PointLight(0xffd9a8, 18, 9, 2);
  doorLight.position.set(-6.9, 1.4, -4.8);
  scene.add(doorLight);

  // Ventilation stacks with steam-lit tops.
  for (const [x, z, h] of [[6.5, -8, 2.6], [8.6, -6.2, 1.8], [-11, 3, 2.2]] as const) {
    scene.add(cyl(0.34, 0.4, h, MAT.metal(1, 0.2), [x, h / 2, z], 14));
    const cap = cyl(0.5, 0.5, 0.1, MAT.metal(1, 0.18), [x, h + 0.05, z], 14);
    scene.add(cap);
  }

  scene.add(railing(6, 1.05, 6).translateX(-12).translateZ(-11));

  // Puddles catching the sign light.
  for (const [x, z, r] of [[2.5, 6, 1.6], [-3.5, 9, 1.1], [5.5, 1.5, 0.9], [-8, 2, 1.3]] as const) {
    const p = puddle(r);
    p.position.set(x, 0.006, z);
    scene.add(p);
  }

  /* -------------------------------------------------------------- skyline */
  scene.add(skyline(46, 110, 17, { minH: 22, maxH: 96, lit: 0.4 }));

  // Big billboards below the roofline, motivating the coloured rim light.
  const signs: THREE.Group[] = [];
  const s1 = neonSign('CYBERLIFE', { color: 0x63e0ff, sub: 'THE FUTURE IS HERE', w: 16, h: 4.6, intensity: 2.6, glow: 0.6 });
  s1.position.set(-22, 9, 26);
  s1.rotation.y = 0.5;
  signs.push(s1);
  const s2 = neonSign('NEO-DETROIT', { color: 0xff5a3c, sub: 'DISTRICT 7', w: 12, h: 3.4, intensity: 2.2, glow: 0.5 });
  s2.position.set(26, 6, 20);
  s2.rotation.y = -0.7;
  signs.push(s2);
  const s3 = neonSign('EDEN', { color: 0xff9ad5, w: 4, h: 9, vertical: true, intensity: 2.4, glow: 0.55 });
  s3.position.set(14, 11, -24);
  s3.rotation.y = -2.4;
  signs.push(s3);
  for (const s of signs) scene.add(s);

  /* --------------------------------------------------------------- lights */
  const moon = dirLight(q, {
    color: 0x9fc0e8,
    intensity: 1.15,
    position: new THREE.Vector3(-16, 22, -20),
    target: new THREE.Vector3(0, 1, 4),
    area: 16,
    far: 70,
    radius: 3,
  });
  scene.add(moon, moon.target);

  // Cold key from the city glow behind the subjects.
  const cityKey = dirLight(q, {
    color: 0x6fb0ff,
    intensity: 1.15,
    position: new THREE.Vector3(10, 9, 26),
    target: new THREE.Vector3(0, 1.4, 8),
    shadow: false,
  });
  scene.add(cityKey, cityKey.target);

  // Warm bounce from the sign wall.
  const warmFill = new THREE.HemisphereLight(0x40597a, 0x181d24, 4.2);
  scene.add(warmFill);

  const signBounce = new THREE.PointLight(0xff7048, 22, 30, 2);
  signBounce.position.set(20, 5, 16);
  scene.add(signBounce);
  const signBounce2 = new THREE.PointLight(0x63e0ff, 28, 34, 2);
  signBounce2.position.set(-18, 7, 20);
  scene.add(signBounce2);

  // Practical lamp on the roof, close to the action: this is the key light.
  const lamp = streetLamp(4.6, 0xffd2a0, 70);
  lamp.group.position.set(-4.2, 0, 3.4);
  scene.add(lamp.group);
  const lampCone = new VolumeCone({ height: 5.2, radius: 2.6, color: 0xffd2a0, opacity: q.volumetrics ? 0.12 : 0.05 });
  lampCone.mesh.position.set(-4.2 + 0.0, 4.4, 3.4 + 0.84);
  scene.add(lampCone.mesh);

  const keySpot = spotLight(q, {
    color: 0xbcd8ff,
    intensity: 78,
    position: new THREE.Vector3(-3.4, 6.2, 9.5),
    target: new THREE.Vector3(0, 1.3, 11.5),
    angle: 0.62,
    penumbra: 0.75,
    distance: 26,
    radius: 3,
  });
  scene.add(keySpot, keySpot.target);

  /* --------------------------------------------------------------- drone */
  const drone = new THREE.Group();
  const droneBody = box(0.8, 0.22, 0.5, MAT.paint(0x14181d, 0.4), [0, 0, 0]);
  drone.add(droneBody);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const rotor = cyl(0.26, 0.26, 0.03, MAT.metal(1, 0.1), [sx * 0.42, 0.14, sz * 0.3], 12);
      drone.add(rotor);
    }
  }
  drone.add(glowSprite(0x4fc6ff, 0.6, 0.8).translateZ(0.3));
  const droneLight = spotLight(q, {
    color: 0xdff0ff,
    intensity: 110,
    position: new THREE.Vector3(0, 0, 0),
    target: new THREE.Vector3(0, -8, 2),
    angle: 0.3,
    penumbra: 0.5,
    distance: 30,
    shadow: false,
  });
  drone.add(droneLight, droneLight.target);
  const droneCone = new VolumeCone({
    height: 12,
    radius: 3.2,
    color: 0xdff0ff,
    opacity: q.volumetrics ? 0.1 : 0.04,
    noise: 0.5,
  });
  drone.add(droneCone.mesh);
  drone.position.set(6, 9, 14);
  scene.add(drone);

  /* -------------------------------------------------------------- weather */
  const rain = new Rain({
    count: q.rainCount,
    splashes: q.splashCount,
    radius: 22,
    height: 22,
    wind: new THREE.Vector2(1.7, 0.4),
    color: 0xc8e6ff,
    mist: q.volumetrics,
  });
  scene.add(rain.group);

  const lightning = new Lightning(0xd8ecff, 5.5);
  scene.add(lightning.light);

  const motes = q.volumetrics ? new DustMotes(320, new THREE.Vector3(20, 6, 20), 0xbfe0ff, 0.026) : null;
  if (motes) {
    motes.points.position.y = 1.2;
    scene.add(motes.points);
  }

  // A police barricade near the roof door, for the aftermath beat.
  const bar = barricade(2.6);
  bar.position.set(-6.4, 0, -3.2);
  bar.rotation.y = 0.35;
  scene.add(bar);

  /* --------------------------------------------------------------- marks */
  const marks: GameSet['marks'] = {
    entry: { pos: [-3.4, 0, -0.6], rotY: 0.35 },
    approach: { pos: [-1.6, 0, 6.2], rotY: 0.18 },
    negotiate: { pos: [-0.4, 0, 9.1], rotY: 0.05 },
    edgeDeviant: { pos: [0.5, 0, 13.1], rotY: Math.PI + 0.1 },
    edgeHostage: { pos: [-0.35, 0, 13.6], rotY: Math.PI - 0.15 },
    partner: { pos: [-4.6, 0, 2.2], rotY: 0.55 },
    wide: { pos: [-8, 0, 0], rotY: 0.6 },
    fallen: { pos: [0.2, 0, 12.4], rotY: 0.2 },
  };

  // The ledge itself is fenced off: the drop is a story beat, not a hazard.
  const bounds = { minX: -14.3, maxX: 14.3, minZ: -14.3, maxZ: 12.4 };
  const colliders: GameSet['colliders'] = [
    { min: [-9.4, -7.9], max: [-5.6, -4.1] },   // roof access hut
    { min: [6.0, -8.5], max: [7.0, -7.5] },     // vent stacks
    { min: [8.1, -6.7], max: [9.1, -5.7] },
    { min: [-11.5, 2.5], max: [-10.5, 3.5] },
    { min: [-7.7, -3.9], max: [-5.1, -2.5] },   // police barricade
    { min: [-4.45, 3.15], max: [-3.95, 3.65] }, // lamp post
  ];
  const interactables: GameSet['interactables'] = [
    {
      id: 'i_gun', at: [-3.9, 0.1, 5.1], label: 'EXAMINE THE SERVICE PISTOL', marker: true,
      think: 'DPD issue. Two rounds fired. The officer who owned it is downstairs on a stretcher.',
      flag: 'sawGun',
    },
    {
      id: 'i_blood', at: [-2.6, 0.05, 7.4], label: 'ANALYSE THE THIRIUM', marker: true,
      think: 'Thirium 310, six minutes old. He is losing pressure. He does not have long either.',
      flag: 'sawBlood',
    },
    {
      id: 'i_door', at: [-6.6, 1.2, -4.2], label: 'EXAMINE THE FORCED DOOR',
      think: 'The lock was sheared at two thousand newtons. He carried her up twelve flights.',
      flag: 'sawDoor',
    },
    {
      id: 'i_edge', at: [0.2, 0.6, 12.2], label: 'LOOK OVER THE EDGE', radius: 2.2,
      think: 'Twelve floors. Eighty-one kilometres per hour at impact. No survivable outcome.',
      flag: 'sawEdge',
    },
  ];

  const scanTargets: GameSet['scanTargets'] = [
    {
      id: 'blood',
      at: [-2.6, 0.05, 7.4],
      label: 'THIRIUM 310 — 6 MIN OLD',
      readout: ['SAMPLE: THIRIUM 310', 'EVAPORATION: 88%', 'SOURCE: PL-600 CHASSIS', 'CONCLUSION: SUSPECT IS DAMAGED'],
      flag: 'sawBlood',
    },
    {
      id: 'gun',
      at: [-3.9, 0.08, 5.1],
      label: 'SERVICE PISTOL — 2 ROUNDS FIRED',
      readout: ['MODEL: DPD ISSUE .40', 'ROUNDS EXPENDED: 2', 'REGISTERED: OFFICER D. MARSH', 'STATUS: OFFICER DOWN'],
      flag: 'sawGun',
    },
    {
      id: 'door',
      at: [-6.9, 1.5, -4.6],
      label: 'FORCED ACCESS DOOR',
      readout: ['LOCK: SHEARED', 'FORCE: 2100 N', 'HANDPRINT: SYNTHETIC SKIN', 'ENTRY TIME: 21:38'],
      flag: 'sawDoor',
    },
    {
      id: 'child',
      at: [-0.35, 1.1, 13.6],
      label: 'EMMA — 10 YEARS OLD',
      readout: ['HEART RATE: 148 BPM', 'HYPOTHERMIA RISK: MODERATE', 'RESTRAINT: LEFT ARM', 'PROBABILITY OF FALL: 34%'],
      flag: 'sawChild',
    },
  ];

  /* -------------------------------------------------------------- runtime */
  let droneAngle = 0;
  let lampFlicker = 0;
  const lights: GameSet['lights'] = { moon, cityKey, keySpot, lamp: lamp.light, drone: droneLight, doorLight, bolt: lightning.light };

  return {
    name: 'rooftop',
    scene,
    camera,
    marks,
    bounds,
    colliders,
    interactables,
    lights,
    scanTargets,
    wetGround: ground,
    rain,
    lightning,
    update(dt, time) {
      sky.update(time);
      ground.update(time);
      rain.update(dt, time, camera);
      lightning.update(dt);
      motes?.update(time);
      lampCone.update(time);
      droneCone.update(time);

      // The drone circles the roof, its beam sweeping the wet concrete.
      droneAngle += dt * 0.16;
      const r = 13;
      drone.position.set(Math.sin(droneAngle) * r * 0.8 + 2, 8.6 + Math.sin(time * 0.6) * 0.35, Math.cos(droneAngle) * r * 0.5 + 9);
      drone.rotation.y = -droneAngle + Math.PI;
      droneLight.target.position.set(drone.position.x * 0.2, 0, drone.position.z * 0.4 + 3);
      droneCone.mesh.rotation.set(0.28 * Math.cos(droneAngle), 0, 0.28 * Math.sin(droneAngle));

      // Failing roof lamp.
      lampFlicker = Math.max(0, lampFlicker - dt);
      if (lampFlicker <= 0 && Math.random() < dt * 0.25) lampFlicker = 0.12 + Math.random() * 0.2;
      lamp.light.intensity = lampFlicker > 0 ? 22 + Math.random() * 42 : 70;
    },
    prerender(r, cam) {
      ground.renderReflection(r, scene, cam);
    },
    applyLook(fx) {
      fx.wetLens = 0.3;
      fx.setBloom(0.17, 0.72, 1.95);
      fx.setStreak(0.16, new THREE.Vector3(0.4, 0.62, 1.0));
      fx.highlightCeiling = 6.5;
      fx.applyLook({
        uExposure: 1.8,
        uContrast: 1.1,
        uSaturation: 1.06,
        uSplit: 0.2,
        uVignette: 0.36,
        uGrain: 0.008,
        uHalation: 0.09,
        uShadowTint: new THREE.Vector3(0.3, 0.6, 0.95),
        uHighlightTint: new THREE.Vector3(1.0, 0.86, 0.7),
      });
    },
    dispose() {
      rain.dispose();
      ground.dispose();
    },
    actions: {
      droneBeam: (on) => {
        droneLight.intensity = on ? 110 : 0;
        droneCone.opacity = on ? (q.volumetrics ? 0.1 : 0.04) : 0;
      },
      redAlert: (on) => {
        keySpot.color.set(on ? 0xff5a55 : 0xbcd8ff);
        keySpot.intensity = on ? 96 : 78;
      },
    },
  };
}
