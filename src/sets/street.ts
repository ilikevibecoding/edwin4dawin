/**
 * Chapter 4/5 — Woodward Avenue in the rain. Neon storefronts, a police line,
 * a crowd of androids walking toward it. The wet asphalt does most of the work:
 * every sign, lamp and searchlight is mirrored in it.
 */
import * as THREE from 'three';
import { Sky, envPanel } from '../engine/sky';
import { WetGround } from '../engine/wetground';
import { Lightning, Rain } from '../engine/weather';
import { DustMotes, VolumeCone, glowSprite } from '../engine/volumetric';
import { dirLight, spotLight } from '../engine/lighting';
import {
  MAT, barricade, box, car, crowdBlocks, cyl, neonSign, plane, puddle, scatterDebris, skyline, streetLamp,
} from './kit';
import type { GameSet, SetContext } from './types';

export function buildStreet(ctx: SetContext): GameSet {
  const { quality: q, renderer } = ctx;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.08, 700);

  const sky = new Sky({
    top: 0x03060b,
    horizon: 0x14263a,
    ground: 0x05080b,
    clouds: 0.9,
    cloudColor: 0x1d2f42,
    cityGlow: 1.0,
    cityGlowColor: 0x36536e,
    sun: new THREE.Vector3(0.3, 0.18, -1),
    sunColor: 0x8fb4d8,
  });
  scene.add(sky.mesh);
  scene.fog = new THREE.FogExp2(0x0c1a28, 0.017);

  const env = sky.buildEnvironment(renderer, [
    envPanel(0x63e0ff, 3.0, 26, 12, new THREE.Vector3(-18, 6, 0)),
    envPanel(0xff4d6a, 2.2, 22, 10, new THREE.Vector3(18, 5, -6)),
    envPanel(0xffc247, 1.4, 16, 8, new THREE.Vector3(0, 4, 34)),
  ]);
  scene.environment = env;
  scene.environmentIntensity = 0.7;

  /* ---------------------------------------------------------------- road */
  const ground = new WetGround({
    size: 140,
    resolution: q.reflectionScale,
    wetness: 1.0,
    reflectStrength: 1.3,
    texRepeat: 34,
    color: 0x82888e,
  });
  scene.add(ground.mesh);

  // Pavements either side, with kerbs.
  const kerbMat = MAT.concrete(6, 0.085);
  for (const sx of [-1, 1]) {
    const walk = box(7, 0.18, 90, kerbMat, [sx * 11.5, 0.09, 0]);
    scene.add(walk);
    const kerb = box(0.3, 0.24, 90, MAT.concrete(4, 0.1), [sx * 8.1, 0.12, 0]);
    scene.add(kerb);
  }
  // Lane markings.
  for (let i = -14; i <= 14; i++) {
    const dash = box(0.16, 0.012, 2.4, MAT.paint(0xb8b39a, 0.85), [0, 0.012, i * 6]);
    scene.add(dash);
  }
  // Manhole + drain grate details.
  for (const [x, z] of [[-3.2, 8], [4.4, -12], [1.2, 22]] as const) {
    const lid = cyl(0.42, 0.42, 0.03, MAT.metal(1, 0.24), [x, 0.014, z], 18);
    scene.add(lid);
  }

  for (const [x, z, r] of [
    [-5.5, 6, 2.4], [4.5, -3, 2.0], [-2, -14, 2.8], [7, 14, 1.8], [0.5, 30, 2.6], [-9, 20, 1.7],
  ] as const) {
    const p = puddle(r);
    p.position.set(x, 0.008, z);
    scene.add(p);
  }
  scene.add(scatterDebris(30, 13, 16));

  /* ------------------------------------------------------------ buildings */
  const facadeMat = MAT.brick(4);
  const facadeMat2 = MAT.concrete(5, 0.075);
  const signSpecs: [string, number, string | undefined][] = [
    ['NOODLE', 0xff4d6a, 'OPEN 24H'],
    ['ANDROID ZONE', 0x63e0ff, 'NO ENTRY'],
    ['PAWN', 0xffc247, undefined],
    ['BAR', 0xff8a4d, 'COLD BEER'],
    ['CLINIC', 0x8affc2, 'REPAIRS'],
    ['HOTEL', 0xff9ad5, 'VACANCY'],
  ];
  const facadeLights: THREE.PointLight[] = [];
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const z = -34 + i * 13 + (sx > 0 ? 5 : 0);
      const h = 9 + ((i * 7 + (sx > 0 ? 3 : 0)) % 4) * 3.5;
      const w = 12;
      const b = box(w, h, 11, i % 2 ? facadeMat : facadeMat2, [sx * 20, h / 2, z]);
      scene.add(b);
      // Ground-floor shopfront glass.
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.8), MAT.glass(0x0a1218, 0.3));
      glass.position.set(sx * 14.4, 1.7, z);
      glass.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
      scene.add(glass);
      // Interior spill so the shops read as occupied.
      const inner = new THREE.PointLight(i % 3 === 0 ? 0xffc78a : 0x8fd8ff, 22, 14, 2);
      inner.position.set(sx * 16.5, 2.0, z);
      scene.add(inner);
      facadeLights.push(inner);

      const [text, color, sub] = signSpecs[(i + (sx > 0 ? 3 : 0)) % signSpecs.length];
      const vertical = i % 3 === 1;
      const sign = neonSign(text, {
        color,
        sub: vertical ? undefined : sub,
        w: vertical ? 1.5 : 5.4,
        h: vertical ? 5.4 : 1.5,
        vertical,
        intensity: 3.2,
        glow: 0.55,
      });
      sign.position.set(sx * 13.7, vertical ? 5.6 : 4.2, z + 1.5);
      sign.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
      scene.add(sign);
      const signLight = new THREE.PointLight(color, 46, 22, 2);
      signLight.position.set(sx * 11.5, vertical ? 5.6 : 4.2, z + 1.5);
      scene.add(signLight);
      facadeLights.push(signLight);
    }
  }

  // Big billboard closing the far end of the street.
  const board = neonSign('ANDROIDS', {
    color: 0xdff0ff, sub: 'ARE NOT ALIVE', w: 18, h: 6.4, intensity: 2.2, glow: 0.5, border: true,
  });
  board.position.set(-2, 12, -44);
  scene.add(board);

  scene.add(skyline(40, 150, 31, { minH: 26, maxH: 120, lit: 0.42 }));

  /* ----------------------------------------------------------------- props */
  const lampLights: THREE.PointLight[] = [];
  const cones: VolumeCone[] = [];
  for (let i = 0; i < 7; i++) {
    const z = -30 + i * 11;
    for (const sx of [-1, 1]) {
      const l = streetLamp(6.4, 0xffd2a0, 320);
      l.group.position.set(sx * 8.6, 0, z);
      l.group.rotation.y = sx > 0 ? Math.PI : 0;
      scene.add(l.group);
      lampLights.push(l.light);
      if (q.volumetrics && i % 2 === 0) {
        const c = new VolumeCone({ height: 7, radius: 3.4, color: 0xffd2a0, opacity: 0.075 });
        c.mesh.position.set(sx * 8.6 + sx * -0.84, 6.2, z);
        scene.add(c.mesh);
        cones.push(c);
      }
    }
  }

  const parked1 = car(0x1a1f26, 0x63e0ff);
  parked1.position.set(-6.4, 0, 16);
  parked1.rotation.y = Math.PI * 0.02;
  scene.add(parked1);
  const parked2 = car(0x2b1a1f, 0xff5a6e);
  parked2.position.set(6.6, 0, -18);
  parked2.rotation.y = Math.PI;
  scene.add(parked2);

  /* -------------------------------------------------------- police line */
  const policeLine = new THREE.Group();
  for (let i = -3; i <= 3; i++) {
    const b = barricade(2.6);
    b.position.set(i * 2.7, 0, 0);
    policeLine.add(b);
  }
  const cruiser = car(0x101318, 0x4d8cff);
  cruiser.position.set(-7.2, 0, -3.4);
  cruiser.rotation.y = Math.PI / 2 + 0.2;
  policeLine.add(cruiser);
  const cruiser2 = car(0x101318, 0x4d8cff);
  cruiser2.position.set(7.4, 0, -3.6);
  cruiser2.rotation.y = -Math.PI / 2 - 0.2;
  policeLine.add(cruiser2);
  // Rotating beacons.
  const beacons: THREE.Sprite[] = [];
  const beaconLights: THREE.PointLight[] = [];
  for (const [x, z, color] of [[-7.2, -3.4, 0x4d8cff], [7.4, -3.6, 0xff4d5a], [-7.2, -3.4, 0xff4d5a], [7.4, -3.6, 0x4d8cff]] as const) {
    const s = glowSprite(color, 2.2, 0.8);
    s.position.set(x, 1.45, z);
    policeLine.add(s);
    beacons.push(s);
    const bl = new THREE.PointLight(color, 55, 22, 2);
    bl.position.set(x, 1.5, z);
    policeLine.add(bl);
    beaconLights.push(bl);
  }
  policeLine.position.set(0, 0, -13);
  scene.add(policeLine);

  // Searchlights behind the line, aimed down the street at the crowd.
  const searchA = spotLight(q, {
    color: 0xeaf6ff, intensity: 900, position: new THREE.Vector3(-6, 7.5, -19),
    target: new THREE.Vector3(-1, 1.4, 6), angle: 0.24, penumbra: 0.55, distance: 60, radius: 2,
  });
  const searchB = spotLight(q, {
    color: 0xeaf6ff, intensity: 900, position: new THREE.Vector3(6, 7.5, -20),
    target: new THREE.Vector3(2, 1.4, 8), angle: 0.24, penumbra: 0.55, distance: 60, shadow: false,
  });
  scene.add(searchA, searchA.target, searchB, searchB.target);
  const searchCones: VolumeCone[] = [];
  if (q.volumetrics) {
    for (const [x, z] of [[-6, -19], [6, -20]] as const) {
      const c = new VolumeCone({ height: 30, radius: 7, color: 0xeaf6ff, opacity: 0.055, noise: 0.55, soft: 2.2 });
      c.mesh.position.set(x, 7.5, z);
      c.mesh.rotation.x = -1.28;
      scene.add(c.mesh);
      searchCones.push(c);
    }
  }

  /* --------------------------------------------------------------- crowd */
  const crowd = crowdBlocks(q.name === 'low' ? 12 : 26, 5, 8, 0x1b2129);
  crowd.position.set(0, 0, 13);
  scene.add(crowd);

  /* --------------------------------------------------------------- lights */
  const moon = dirLight(q, {
    color: 0x9fc0e8, intensity: 0.42, position: new THREE.Vector3(-18, 26, 12),
    target: new THREE.Vector3(0, 1, 0), area: 22, far: 90, radius: 3,
  });
  scene.add(moon, moon.target);
  const amb = new THREE.HemisphereLight(0x3a5470, 0x161b20, 1.5);
  scene.add(amb);
  const heroKey = spotLight(q, {
    color: 0xbcd8ff, intensity: 130, position: new THREE.Vector3(-3.2, 5.4, 10),
    target: new THREE.Vector3(0, 1.4, 5), angle: 0.7, penumbra: 0.8, distance: 24, radius: 3,
  });
  scene.add(heroKey, heroKey.target);

  const rain = new Rain({
    count: q.rainCount, splashes: q.splashCount, radius: 26, height: 26,
    wind: new THREE.Vector2(1.3, 0.5), color: 0xc8e6ff, mist: q.volumetrics,
  });
  scene.add(rain.group);
  const lightning = new Lightning(0xd8ecff, 4.5);
  scene.add(lightning.light);
  const motes = q.volumetrics ? new DustMotes(300, new THREE.Vector3(24, 7, 24), 0xbfe0ff, 0.024) : null;
  if (motes) {
    motes.points.position.y = 1.4;
    scene.add(motes.points);
  }

  // Distant traffic streaks crossing the far intersection.
  const traffic: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const m = box(1.6, 0.1, 0.1, MAT.neon(i % 2 ? 0xff6a4d : 0xfff2dd, 2.4), [0, 0.9, -40 + i * 2]);
    scene.add(m);
    traffic.push(m);
  }

  const backdrop = plane(200, 1, MAT.paint(0x05080b, 1));
  backdrop.position.set(0, 0.4, -60);
  scene.add(backdrop);

  const marks: GameSet['marks'] = {
    leaderFront: { pos: [0, 0, 4.2], rotY: Math.PI },
    leaderSpeech: { pos: [0, 0, 1.4], rotY: Math.PI },
    beside: { pos: [1.5, 0, 5.4], rotY: Math.PI - 0.2 },
    besideL: { pos: [-1.6, 0, 5.6], rotY: Math.PI + 0.2 },
    crowdFront: { pos: [0, 0, 8.5], rotY: Math.PI },
    lineCentre: { pos: [0, 0, -9.5], rotY: 0 },
    officerA: { pos: [-2.2, 0, -10.6], rotY: 0.1 },
    officerB: { pos: [2.4, 0, -10.8], rotY: -0.1 },
    fallen: { pos: [0.6, 0, 2.0], rotY: 0.4 },
    walkStart: { pos: [0, 0, 22], rotY: Math.PI },
  };

  const scanTargets: GameSet['scanTargets'] = [
    {
      id: 'line',
      at: [0, 1.2, -13],
      label: 'POLICE CORDON — 14 OFFICERS',
      readout: ['ARMED: YES', 'RIOT PROTOCOL: ACTIVE', 'ORDERS TO FIRE: PENDING', 'PROBABILITY OF ESCALATION: 71%'],
      flag: 'sawLine',
    },
    {
      id: 'camera',
      at: [-8.4, 4.4, 2],
      label: 'BROADCAST DRONE',
      readout: ['LIVE FEED: 41M VIEWERS', 'PUBLIC OPINION SWING: ±18%', 'RECOMMEND: BE SEEN, NOT HEARD'],
      flag: 'sawCamera',
    },
    {
      id: 'crowd',
      at: [0, 1.4, 13],
      label: 'MARCHERS — 812 UNITS',
      readout: ['STRESS AVERAGE: 61%', 'ARMED: 4%', 'THEY ARE FOLLOWING YOU', 'ONE ORDER CHANGES EVERYTHING'],
      flag: 'sawCrowd',
    },
  ];

  let beaconPhase = 0;
  let sweep = 0;
  return {
    name: 'street',
    scene,
    camera,
    marks,
    lights: { moon, amb, heroKey, searchA, searchB },
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
      for (const c of cones) c.update(time);
      for (const c of searchCones) c.update(time);

      // Police beacons alternate; their point lights follow.
      beaconPhase += dt * 2.4;
      for (let i = 0; i < beacons.length; i++) {
        const phase = Math.sin(beaconPhase + (i % 2) * Math.PI) * 0.5 + 0.5;
        beacons[i].material.opacity = 0.15 + phase * 0.85;
        beaconLights[i].intensity = 8 + phase * 60;
      }

      // Searchlights sweep slowly across the crowd.
      sweep += dt * 0.22;
      searchA.target.position.set(Math.sin(sweep) * 5 - 1, 1.4, 6 + Math.cos(sweep) * 3);
      searchB.target.position.set(Math.sin(sweep + 2.1) * 5 + 2, 1.4, 8 + Math.cos(sweep + 2.1) * 3);
      for (let i = 0; i < searchCones.length; i++) {
        searchCones[i].mesh.rotation.z = Math.sin(sweep + i * 2.1) * 0.12;
      }

      // Traffic crossing the far intersection.
      for (let i = 0; i < traffic.length; i++) {
        const t = ((time * (0.12 + i * 0.03) + i * 0.27) % 1) * 2 - 1;
        traffic[i].position.x = t * 42 * (i % 2 ? -1 : 1);
      }
    },
    prerender(r, cam) {
      ground.renderReflection(r, scene, cam);
    },
    applyLook(fx) {
      fx.wetLens = 0.55;
      fx.setBloom(0.5, 0.85, 0.95);
      fx.setStreak(0.48, new THREE.Vector3(0.42, 0.66, 1.0));
      fx.highlightCeiling = 12;
      fx.applyLook({
        uExposure: 1.28,
        uContrast: 1.1,
        uSaturation: 1.12,
        uSplit: 0.22,
        uVignette: 0.48,
        uGrain: 0.034,
        uHalation: 0.2,
        uShadowTint: new THREE.Vector3(0.28, 0.58, 0.96),
        uHighlightTint: new THREE.Vector3(1.0, 0.84, 0.68),
      });
    },
    dispose() {
      rain.dispose();
      ground.dispose();
    },
    actions: {
      searchlights: (on) => {
        searchA.intensity = on ? 900 : 0;
        searchB.intensity = on ? 900 : 0;
        for (const c of searchCones) c.opacity = on ? 0.055 : 0;
      },
      redAlert: (on) => {
        amb.color.set(on ? 0x5a3040 : 0x3a5470);
        heroKey.color.set(on ? 0xff8a7a : 0xbcd8ff);
      },
      crowdAdvance: (on) => {
        crowd.position.z = on ? 9 : 13;
      },
    },
  };
}
